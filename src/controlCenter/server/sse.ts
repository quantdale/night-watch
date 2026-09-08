import type { IncomingMessage, ServerResponse } from 'node:http';
import { sanitizeControlCenterEvent, type ControlCenterEventDto } from '../contracts/events';

const SSE_RETRY_MS = 2_000;
const DEFAULT_MAX_CLIENTS = 8;
const MAX_CLIENTS = 64;

// ---------------------------------------------------------------------------
// NW-12 — a fixed per-client queued-state bound.
//
// The client COUNT was capped, but `response.write`'s false return was
// ignored, so a consumer that stopped reading kept accumulating queued bytes
// in its socket buffer until it disconnected or the process came under
// pressure. One stalled dashboard tab was an unbounded memory sink.
//
// The policy, chosen explicitly rather than left implicit:
//
//   1. Invalidation events need not be lossless. Clients refetch a snapshot
//      when notified, so N pending notifications and one pending notification
//      lead to the same refetch. While a client is backpressured we therefore
//      retain exactly the NEWEST frame and drop the rest — the queued state
//      per client is one frame, by construction.
//   2. Heartbeats are not queued at all while backpressured. They carry no
//      information, and queuing them would defeat (1).
//   3. A client that never drains is disconnected. Two independent bounds,
//      whichever trips first: MAX_COALESCED_FRAMES replaced frames, and
//      MAX_STALL_MS backpressured. A slow client reconnects and refetches;
//      a permanently stalled one must not be carried forever.
//
// Healthy peers are unaffected: backpressure is per client, and a stalled
// client's frame is dropped rather than blocking the publish loop.
//
// Every listener and timer is owned. `drain` is attached ONCE per client, not
// per event, and removal detaches it, so cleanup leaves no registry entry,
// listener or timer behind.
// ---------------------------------------------------------------------------

/** Newest-only retention means one frame; this caps how long that can last. */
export const MAX_COALESCED_FRAMES = 32;
export const MAX_STALL_MS = 30_000;

export type SseDisconnectReason =
  | 'WRITE_FAILED'
  | 'COALESCE_LIMIT'
  | 'STALL_TIMEOUT'
  | 'HUB_CLOSED';

interface SseClient {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  /** True while the socket has told us to stop writing. */
  backpressured: boolean;
  /** The single newest frame awaiting drain, or null. */
  pendingFrame: string | null;
  /** How many frames have been dropped in favour of a newer one. */
  coalescedFrames: number;
  /** Monotonic-ish stamp of when backpressure began. */
  stalledSinceMs: number | null;
  onDrain: (() => void) | null;
  onClose: (() => void) | null;
  removed: boolean;
}

/** Bounded per-client observation. Counters only — never a frame or payload. */
export interface SseClientDiagnostics {
  readonly backpressured: boolean;
  readonly pendingFrames: number;
  readonly coalescedFrames: number;
}

/** Bounded notification channel. GET snapshots remain the only state authority. */
export class ControlCenterSseHub {
  private readonly clients = new Set<SseClient>();
  private readonly maxClients: number;
  private readonly now: () => number;
  private lastSequence = -1;
  private closed = false;
  private disconnects = new Map<SseDisconnectReason, number>();

  constructor(maxClients = 8, options: { readonly now?: () => number } = {}) {
    this.maxClients = Number.isSafeInteger(maxClients) && maxClients >= 0 && maxClients <= MAX_CLIENTS ? maxClients : DEFAULT_MAX_CLIENTS;
    this.now = options.now ?? Date.now;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  /** Bounded per-client counters, in subscribe order. For tests and operators. */
  clientDiagnostics(): readonly SseClientDiagnostics[] {
    return [...this.clients].map((client) => ({
      backpressured: client.backpressured,
      pendingFrames: client.pendingFrame === null ? 0 : 1,
      coalescedFrames: client.coalescedFrames,
    }));
  }

  /** How many clients were dropped, by reason. Counters only. */
  disconnectCounts(): Readonly<Record<string, number>> {
    return Object.fromEntries([...this.disconnects.entries()].sort(([left], [right]) => left.localeCompare(right)));
  }

  subscribe(request: IncomingMessage, response: ServerResponse): boolean {
    if (this.closed || this.clients.size >= this.maxClients) return false;
    const client: SseClient = {
      request,
      response,
      backpressured: false,
      pendingFrame: null,
      coalescedFrames: 0,
      stalledSinceMs: null,
      onDrain: null,
      onClose: null,
      removed: false,
    };
    this.clients.add(client);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    });
    // One drain listener per CLIENT, not per event: attaching per write is how
    // a listener leak starts.
    client.onDrain = () => this.onClientDrain(client);
    response.on('drain', client.onDrain);
    client.onClose = () => this.removeClient(client);
    request.once('close', client.onClose);
    response.once('close', client.onClose);
    this.writeToClient(client, `: nightwatch-control-center\nretry: ${SSE_RETRY_MS}\n\n`);
    return true;
  }

  publish(event: ControlCenterEventDto): void {
    const safeEvent = sanitizeControlCenterEvent(event);
    if (safeEvent === null || safeEvent.sequence <= this.lastSequence) return;
    this.lastSequence = safeEvent.sequence;
    const frame = `event: ${safeEvent.type}\nid: ${safeEvent.sequence}\ndata: ${JSON.stringify(safeEvent)}\n\n`;
    for (const client of [...this.clients]) {
      this.enqueue(client, frame);
    }
  }

  heartbeat(): void {
    if (this.closed) return;
    for (const client of [...this.clients]) {
      // Never queued: a heartbeat carries no information, and queuing it
      // would displace the newest real invalidation.
      if (client.backpressured) {
        this.enforceStallBounds(client);
        continue;
      }
      this.writeToClient(client, ': heartbeat\n\n');
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const client of [...this.clients]) {
      this.detach(client);
      this.clients.delete(client);
      this.countDisconnect('HUB_CLOSED');
      client.response.end();
    }
  }

  // -------------------------------------------------------------------------
  // per-client write path
  // -------------------------------------------------------------------------

  private enqueue(client: SseClient, frame: string): void {
    if (client.removed) return;
    if (client.backpressured) {
      // Newest-only retention: the queued state stays exactly one frame.
      if (client.pendingFrame !== null) client.coalescedFrames += 1;
      client.pendingFrame = frame;
      this.enforceStallBounds(client);
      return;
    }
    this.writeToClient(client, frame);
  }

  private writeToClient(client: SseClient, frame: string): void {
    if (client.removed) return;
    let accepted: boolean;
    try {
      accepted = client.response.write(frame);
    } catch {
      this.disconnect(client, 'WRITE_FAILED');
      return;
    }
    if (accepted === false) {
      // THE defect: this return value was ignored, so a stalled consumer's
      // queued bytes grew without bound.
      client.backpressured = true;
      client.stalledSinceMs = this.now();
    }
  }

  private onClientDrain(client: SseClient): void {
    if (client.removed) return;
    client.backpressured = false;
    client.stalledSinceMs = null;
    client.coalescedFrames = 0;
    const pending = client.pendingFrame;
    client.pendingFrame = null;
    if (pending !== null) this.writeToClient(client, pending);
  }

  private enforceStallBounds(client: SseClient): void {
    if (client.coalescedFrames >= MAX_COALESCED_FRAMES) {
      this.disconnect(client, 'COALESCE_LIMIT');
      return;
    }
    const since = client.stalledSinceMs;
    if (since !== null && this.now() - since >= MAX_STALL_MS) {
      this.disconnect(client, 'STALL_TIMEOUT');
    }
  }

  private disconnect(client: SseClient, reason: SseDisconnectReason): void {
    if (client.removed) return;
    this.removeClient(client);
    this.countDisconnect(reason);
    try {
      client.response.destroy();
    } catch {
      // The client is already gone; there is nothing further to release.
    }
  }

  private removeClient(client: SseClient): void {
    if (client.removed) return;
    client.removed = true;
    client.pendingFrame = null;
    this.detach(client);
    this.clients.delete(client);
  }

  private detach(client: SseClient): void {
    if (client.onDrain !== null) {
      client.response.removeListener('drain', client.onDrain);
      client.onDrain = null;
    }
    if (client.onClose !== null) {
      client.request.removeListener('close', client.onClose);
      client.response.removeListener('close', client.onClose);
      client.onClose = null;
    }
  }

  private countDisconnect(reason: SseDisconnectReason): void {
    this.disconnects.set(reason, (this.disconnects.get(reason) ?? 0) + 1);
  }
}
