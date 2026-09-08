import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONTROL_CENTER_REQUEST_DEADLINE_MS,
  CONTROL_CENTER_SNAPSHOT_CONTRACTS,
  loadReviewer,
  subscribeToControlCenterEvents,
} from './api';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  private readonly listeners = new Map<string, EventListener[]>();
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }

  close(): void {
    this.closed = true;
  }
}

describe('Control Center advisory event client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeEventSource.instances = [];
  });

  it('only invalidates authoritative GET state and closes cleanly', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const invalidate = vi.fn();
    const close = subscribeToControlCenterEvents(invalidate);
    const source = FakeEventSource.instances[0]!;
    expect(source.url).toBe('/api/v1/events');
    source.emit('run.updated');
    expect(invalidate).toHaveBeenCalledTimes(1);
    close();
    expect(source.closed).toBe(true);
    source.emit('run.completed');
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

/**
 * NW-11. Three defects on one trust boundary.
 *
 * `fetchSnapshot` accepted any object whose `schemaVersion` merely STARTED
 * WITH `nightwatch.control-center.` and then cast the payload to the
 * requested type, so a findings response satisfied a reviewer read and a
 * `.v1` payload satisfied a `.v3` reader. Fetches carried no signal and no
 * deadline, so a superseded or hung request kept running. And every
 * notification invalidated directly, so a burst of N events cost N refreshes
 * of the overview plus the current view.
 */
describe('NW-11 — the client validates, bounds, and coalesces', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    FakeEventSource.instances = [];
  });

  const reviewerPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    schemaVersion: 'nightwatch.control-center.reviewer.v1',
    state: 'AVAILABLE',
    items: [],
    page: { limit: 50, nextCursor: null, truncated: false },
    finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    ...overrides,
  });

  const jsonResponse = (payload: unknown): Response => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  }) as unknown as Response;

  it('accepts the exact contract, including a field the server added later', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(reviewerPayload({ aFieldFromAFutureServer: 7 })))));
    // Forward compatibility is deliberate: an ADDED field must not break a
    // reader that does not know about it.
    const snapshot = await loadReviewer();
    expect(snapshot.state).toBe('AVAILABLE');
  });

  it('rejects a payload from a different endpoint that shares the namespace', async () => {
    const findingsPayload = {
      schemaVersion: 'nightwatch.control-center.findings.v1',
      state: 'AVAILABLE',
      items: [],
      page: { limit: 50, nextCursor: null, truncated: false },
    };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(findingsPayload))));
    await expect(loadReviewer()).rejects.toThrow('CONTROL_CENTER_INVALID_RESPONSE_ERROR');
  });

  it('rejects an older version of its own endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(reviewerPayload({ schemaVersion: 'nightwatch.control-center.reviewer.v0' })))));
    await expect(loadReviewer()).rejects.toThrow('CONTROL_CENTER_INVALID_RESPONSE_ERROR');
  });

  it('rejects a payload missing a field this client reads', async () => {
    for (const field of CONTROL_CENTER_SNAPSHOT_CONTRACTS.reviewer.required) {
      const payload = reviewerPayload();
      delete payload[field];
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(payload))));
      await expect(loadReviewer(), `missing ${field} must be refused`).rejects.toThrow('CONTROL_CENTER_INVALID_RESPONSE_ERROR');
    }
  });

  it('does not accept an inherited field as one the server sent', async () => {
    // `in` would have accepted these. Own-key membership does not.
    const prototype = { items: [], page: { limit: 50, nextCursor: null, truncated: false } };
    const payload = Object.create(prototype) as Record<string, unknown>;
    payload.schemaVersion = 'nightwatch.control-center.reviewer.v1';
    payload.state = 'AVAILABLE';
    payload.finalVerdictAuthority = 'HUMAN_ORGANIZATIONAL';
    payload.organizationalAuthority = 'NONE_LOCAL_REVIEW_ONLY';
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(payload))));
    await expect(loadReviewer()).rejects.toThrow('CONTROL_CENTER_INVALID_RESPONSE_ERROR');
  });

  it('rejects a non-object and an array outright', async () => {
    for (const payload of [null, 42, 'nightwatch.control-center.reviewer.v1', [reviewerPayload()]]) {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(payload))));
      await expect(loadReviewer()).rejects.toThrow('CONTROL_CENTER_INVALID_RESPONSE_ERROR');
    }
  });

  it('passes an abort signal to fetch and reports an aborted request as such', async () => {
    const seen: (AbortSignal | undefined)[] = [];
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init?.signal ?? undefined);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }));
    const controller = new AbortController();
    const pending = loadReviewer(50, null, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow('CONTROL_CENTER_ABORTED_ERROR');
    // The signal reached the transport, which is what the defect lacked: the
    // old cleanup suppressed the result and left the request running.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(AbortSignal);
  });

  it('refuses immediately when the caller signal is already aborted', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(reviewerPayload())));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    await expect(loadReviewer(50, null, controller.signal)).rejects.toThrow('CONTROL_CENTER_ABORTED_ERROR');
    // No request is made at all for work that is already obsolete.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ends a hung request at the deadline rather than waiting forever', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    const pending = loadReviewer();
    const assertion = expect(pending).rejects.toThrow('CONTROL_CENTER_TIMEOUT_ERROR');
    await vi.advanceTimersByTimeAsync(CONTROL_CENTER_REQUEST_DEADLINE_MS + 1);
    await assertion;
  });

  it('disposes the deadline timer on a successful request', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(reviewerPayload()))));
    await loadReviewer();
    // A timer left armed would fire an abort against a completed operation.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces an invalidation burst of any size into at most two refreshes', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
    const invalidate = vi.fn();
    const close = subscribeToControlCenterEvents(invalidate, { windowMs: 250 });
    const source = FakeEventSource.instances[0]!;

    for (const burst of [1, 100, 1000]) {
      invalidate.mockClear();
      for (let index = 0; index < burst; index += 1) source.emit('run.updated');
      // Leading edge: the UI stays responsive.
      expect(invalidate, `burst of ${burst}`).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(250);
      // Everything else in the window collapsed into ONE follow-up — and a
      // burst of one has nothing to follow up.
      expect(invalidate.mock.calls.length, `burst of ${burst} after the window`).toBe(burst === 1 ? 1 : 2);
      // The follow-up window closes without further work.
      vi.advanceTimersByTime(1000);
      expect(invalidate.mock.calls.length, `burst of ${burst} after settling`).toBe(burst === 1 ? 1 : 2);
    }
    close();
  });

  it('a steady stream costs one refresh per window, not one per event', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
    const invalidate = vi.fn();
    const close = subscribeToControlCenterEvents(invalidate, { windowMs: 100 });
    const source = FakeEventSource.instances[0]!;
    // Ten events per window over five windows: fifty events.
    for (let window = 0; window < 5; window += 1) {
      for (let index = 0; index < 10; index += 1) source.emit('run.updated');
      vi.advanceTimersByTime(100);
    }
    expect(invalidate.mock.calls.length).toBeLessThanOrEqual(6);
    expect(invalidate.mock.calls.length).toBeGreaterThan(0);
    close();
  });

  it('unsubscribing disposes the pending window timer', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
    const invalidate = vi.fn();
    const close = subscribeToControlCenterEvents(invalidate, { windowMs: 250 });
    const source = FakeEventSource.instances[0]!;
    source.emit('run.updated');
    source.emit('run.updated');
    expect(invalidate).toHaveBeenCalledTimes(1);
    close();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    // The queued follow-up must not fire after unsubscribe.
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
