import type { IncomingMessage, ServerResponse } from 'node:http';
import { sanitizeControlCenterEvent, type ControlCenterEventDto } from '../contracts/events';

const SSE_RETRY_MS = 2_000;
const DEFAULT_MAX_CLIENTS = 8;
const MAX_CLIENTS = 64;

interface SseClient {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
}

/** Bounded notification channel. GET snapshots remain the only state authority. */
export class ControlCenterSseHub {
  private readonly clients = new Set<SseClient>();
  private readonly maxClients: number;
  private lastSequence = -1;
  private closed = false;

  constructor(maxClients = 8) {
    this.maxClients = Number.isSafeInteger(maxClients) && maxClients >= 0 && maxClients <= MAX_CLIENTS ? maxClients : DEFAULT_MAX_CLIENTS;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  subscribe(request: IncomingMessage, response: ServerResponse): boolean {
    if (this.closed || this.clients.size >= this.maxClients) return false;
    const client: SseClient = { request, response };
    this.clients.add(client);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    });
    response.write(`: nightwatch-control-center\nretry: ${SSE_RETRY_MS}\n\n`);
    const remove = () => {
      this.clients.delete(client);
    };
    request.once('close', remove);
    response.once('close', remove);
    return true;
  }

  publish(event: ControlCenterEventDto): void {
    const safeEvent = sanitizeControlCenterEvent(event);
    if (safeEvent === null || safeEvent.sequence <= this.lastSequence) return;
    this.lastSequence = safeEvent.sequence;
    const frame = `event: ${safeEvent.type}\nid: ${safeEvent.sequence}\ndata: ${JSON.stringify(safeEvent)}\n\n`;
    for (const client of [...this.clients]) {
      try {
        client.response.write(frame);
      } catch {
        this.clients.delete(client);
        client.response.destroy();
      }
    }
  }

  heartbeat(): void {
    if (this.closed) return;
    for (const client of [...this.clients]) {
      try {
        client.response.write(': heartbeat\n\n');
      } catch {
        this.clients.delete(client);
        client.response.destroy();
      }
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const client of [...this.clients]) {
      this.clients.delete(client);
      client.response.end();
    }
  }
}
