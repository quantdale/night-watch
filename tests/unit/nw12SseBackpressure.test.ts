import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { test, expect } from '@playwright/test';
import {
  ControlCenterSseHub,
  MAX_COALESCED_FRAMES,
  MAX_STALL_MS,
} from '../../src/controlCenter/server/sse';
import { CONTROL_CENTER_EVENT_SCHEMA_VERSION } from '../../src/controlCenter/contracts/events';

/**
 * NW-12. The client COUNT was capped but `response.write`'s false return was
 * ignored, so a consumer that stopped reading accumulated queued bytes until
 * it disconnected or the process came under pressure — one stalled dashboard
 * tab was an unbounded memory sink.
 *
 * Every case drives fake writables, so "never drains" is exact rather than
 * approximated by a slow socket, and time is injected so no case sleeps.
 */

/** A response whose backpressure and drain are under the test's control. */
class FakeResponse extends EventEmitter {
  readonly written: string[] = [];
  /** When true, every write reports backpressure and nothing ever drains. */
  stalled = false;
  destroyed = false;
  ended = false;
  throwOnWrite = false;
  headers: Record<string, string> | null = null;

  writeHead(_status: number, headers: Record<string, string>): this {
    this.headers = headers;
    return this;
  }

  write(frame: string): boolean {
    if (this.throwOnWrite) throw new Error('SYNTHETIC_SOCKET_GONE');
    this.written.push(frame);
    return !this.stalled;
  }

  end(): void {
    this.ended = true;
  }

  destroy(): void {
    this.destroyed = true;
  }

  /** Total bytes the hub has handed to this socket. */
  get bytes(): number {
    return this.written.reduce((total, frame) => total + Buffer.byteLength(frame, 'utf8'), 0);
  }

  drain(): void {
    this.stalled = false;
    this.emit('drain');
  }
}

function fakeRequest(): IncomingMessage {
  return new EventEmitter() as unknown as IncomingMessage;
}

function subscribe(hub: ControlCenterSseHub, response: FakeResponse): boolean {
  return hub.subscribe(fakeRequest(), response as unknown as ServerResponse);
}

let nextSequence = 0;
function event() {
  nextSequence += 1;
  return {
    schemaVersion: CONTROL_CENTER_EVENT_SCHEMA_VERSION,
    type: 'campaign.snapshot.changed' as const,
    entityId: null,
    sequence: nextSequence,
    snapshotDigest: null,
  };
}

test.describe('NW-12 — per-client SSE state is bounded', () => {
  /**
   * The discriminating measurement, using ONLY the pre-repair public surface —
   * `subscribe`, `publish` and the socket's own byte count. The other cases in
   * this file assert `clientDiagnostics()` and `disconnectCounts()`, which did
   * not exist before the repair, so against the old hub they would fail for
   * the wrong reason. This one fails for the RIGHT reason: unbounded growth.
   */
  test('bytes handed to a stalled socket stop growing (API-free measurement)', () => {
    const hub = new ControlCenterSseHub(4);
    const stalled = new FakeResponse();
    subscribe(hub, stalled);
    stalled.stalled = true;

    hub.publish(event());
    const afterDiscovery = stalled.bytes;
    const framesAfterDiscovery = stalled.written.length;

    for (let index = 0; index < 200; index += 1) hub.publish(event());

    // Pre-repair every publish was written, so 200 more frames reached the
    // socket's queue. The bound is that NOTHING further reaches it.
    expect(stalled.bytes, 'queued bytes grew without bound').toBe(afterDiscovery);
    expect(stalled.written.length, 'frames were written to a stalled socket').toBe(framesAfterDiscovery);
  });

  test('a stalled client retains exactly one frame, however many are published', () => {
    const hub = new ControlCenterSseHub(4);
    const stalled = new FakeResponse();
    expect(subscribe(hub, stalled)).toBe(true);
    // The greeting was accepted; now the socket stops accepting.
    const greetingBytes = stalled.bytes;
    stalled.stalled = true;
    // One write to discover backpressure, then everything is coalesced.
    hub.publish(event());
    const afterFirst = stalled.bytes;

    for (let index = 0; index < 10; index += 1) hub.publish(event());

    // Nothing further reached the socket, and the retained state is ONE frame.
    expect(stalled.bytes).toBe(afterFirst);
    expect(afterFirst).toBeGreaterThan(greetingBytes);
    const [diagnostics] = hub.clientDiagnostics();
    expect(diagnostics?.backpressured).toBe(true);
    expect(diagnostics?.pendingFrames).toBe(1);
    expect(diagnostics?.coalescedFrames).toBe(9);
    expect(hub.clientCount).toBe(1);
  });

  test('on drain the newest frame is delivered and the older ones are not', () => {
    const hub = new ControlCenterSseHub(4);
    const client = new FakeResponse();
    subscribe(hub, client);
    client.stalled = true;
    hub.publish(event());
    const firstFrame = client.written[client.written.length - 1] ?? '';
    for (let index = 0; index < 5; index += 1) hub.publish(event());
    const newestSequence = nextSequence;

    client.drain();

    const delivered = client.written[client.written.length - 1] ?? '';
    expect(delivered).toContain(`id: ${newestSequence}`);
    expect(delivered).not.toBe(firstFrame);
    // Exactly one frame was released, not the whole backlog.
    const [diagnostics] = hub.clientDiagnostics();
    expect(diagnostics?.pendingFrames).toBe(0);
    expect(diagnostics?.coalescedFrames).toBe(0);
    expect(diagnostics?.backpressured).toBe(false);
  });

  test('a client that never drains is disconnected at the coalesce bound', () => {
    const hub = new ControlCenterSseHub(4);
    const stalled = new FakeResponse();
    subscribe(hub, stalled);
    stalled.stalled = true;
    // One discovery write, then MAX_COALESCED_FRAMES replacements.
    for (let index = 0; index < MAX_COALESCED_FRAMES + 2; index += 1) hub.publish(event());
    expect(hub.clientCount).toBe(0);
    expect(stalled.destroyed).toBe(true);
    expect(hub.disconnectCounts()).toMatchObject({ COALESCE_LIMIT: 1 });
  });

  test('a client backpressured past the stall bound is disconnected on the next event', () => {
    let clock = 1_000;
    const hub = new ControlCenterSseHub(4, { now: () => clock });
    const stalled = new FakeResponse();
    subscribe(hub, stalled);
    stalled.stalled = true;
    hub.publish(event());
    expect(hub.clientCount).toBe(1);
    // Well short of the coalesce bound, so only the time bound can act.
    clock += MAX_STALL_MS + 1;
    hub.publish(event());
    expect(hub.clientCount).toBe(0);
    expect(hub.disconnectCounts()).toMatchObject({ STALL_TIMEOUT: 1 });
    expect(stalled.destroyed).toBe(true);
  });

  test('a heartbeat is never queued, and it enforces the stall bound', () => {
    let clock = 1_000;
    const hub = new ControlCenterSseHub(4, { now: () => clock });
    const stalled = new FakeResponse();
    subscribe(hub, stalled);
    stalled.stalled = true;
    // The FIRST write after the socket stalls still reaches it — that write is
    // how backpressure is discovered. The second publish is the one that lands
    // in the pending slot, which the heartbeats must not displace.
    hub.publish(event());
    hub.publish(event());
    const bytesAfterEvent = stalled.bytes;
    expect(hub.clientDiagnostics()[0]?.pendingFrames).toBe(1);

    for (let index = 0; index < 50; index += 1) hub.heartbeat();
    // Heartbeats carry no information; queuing them would displace the newest
    // real invalidation, so none reach the socket or the pending slot.
    expect(stalled.bytes).toBe(bytesAfterEvent);
    expect(hub.clientDiagnostics()[0]?.pendingFrames).toBe(1);

    clock += MAX_STALL_MS + 1;
    hub.heartbeat();
    expect(hub.clientCount).toBe(0);
    expect(hub.disconnectCounts()).toMatchObject({ STALL_TIMEOUT: 1 });
  });

  test('one stalled client does not degrade a healthy peer', () => {
    const hub = new ControlCenterSseHub(4);
    const stalled = new FakeResponse();
    const healthy = new FakeResponse();
    subscribe(hub, stalled);
    subscribe(hub, healthy);
    stalled.stalled = true;

    const published = 12;
    for (let index = 0; index < published; index += 1) hub.publish(event());

    // The healthy peer received every frame; the stalled one holds at most one.
    const healthyFrames = healthy.written.filter((frame) => frame.startsWith('event: '));
    expect(healthyFrames).toHaveLength(published);
    expect(hub.clientDiagnostics().find((entry) => entry.backpressured)?.pendingFrames).toBe(1);
    expect(hub.clientCount).toBe(2);
  });

  test('a write that throws removes the client and leaves no listeners', () => {
    const hub = new ControlCenterSseHub(4);
    const broken = new FakeResponse();
    subscribe(hub, broken);
    expect(broken.listenerCount('drain')).toBe(1);
    broken.throwOnWrite = true;
    hub.publish(event());
    expect(hub.clientCount).toBe(0);
    expect(broken.destroyed).toBe(true);
    expect(hub.disconnectCounts()).toMatchObject({ WRITE_FAILED: 1 });
    // Deterministic cleanup: no registry entry, no listener.
    expect(broken.listenerCount('drain')).toBe(0);
    expect(broken.listenerCount('close')).toBe(0);
  });

  test('cleanup on close leaves no listener or registry entry', () => {
    const hub = new ControlCenterSseHub(4);
    const first = new FakeResponse();
    const second = new FakeResponse();
    subscribe(hub, first);
    subscribe(hub, second);
    expect(first.listenerCount('drain')).toBe(1);
    hub.close();
    expect(hub.clientCount).toBe(0);
    for (const client of [first, second]) {
      expect(client.ended).toBe(true);
      expect(client.listenerCount('drain')).toBe(0);
      expect(client.listenerCount('close')).toBe(0);
    }
    expect(hub.disconnectCounts()).toMatchObject({ HUB_CLOSED: 2 });
    // A closed hub accepts nothing further.
    expect(subscribe(hub, new FakeResponse())).toBe(false);
  });

  test('a client closing its own connection is removed exactly once', () => {
    const hub = new ControlCenterSseHub(4);
    const client = new FakeResponse();
    const request = fakeRequest();
    expect(hub.subscribe(request, client as unknown as ServerResponse)).toBe(true);
    // Both the request and the response can emit close; removal must be
    // idempotent and must not double-count.
    (request as unknown as EventEmitter).emit('close');
    client.emit('close');
    expect(hub.clientCount).toBe(0);
    expect(hub.disconnectCounts().WRITE_FAILED ?? 0).toBe(0);
    expect(client.listenerCount('drain')).toBe(0);
  });

  test('the client cap still holds, and a burst after drain resumes normally', () => {
    const hub = new ControlCenterSseHub(2);
    const first = new FakeResponse();
    const second = new FakeResponse();
    expect(subscribe(hub, first)).toBe(true);
    expect(subscribe(hub, second)).toBe(true);
    expect(subscribe(hub, new FakeResponse())).toBe(false);

    first.stalled = true;
    for (let index = 0; index < 4; index += 1) hub.publish(event());
    first.drain();
    const before = first.bytes;
    hub.publish(event());
    // Back to normal delivery once the socket accepts writes again.
    expect(first.bytes).toBeGreaterThan(before);
    expect(hub.clientDiagnostics()[0]?.backpressured).toBe(false);
  });
});
