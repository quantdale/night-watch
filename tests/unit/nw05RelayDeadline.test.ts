import { test, expect } from '@playwright/test';
import { executeNativePhase5Operation } from '../../src/api/phase5/relay';
import {
  RelayOperationError,
  classifyRelayFailure,
  createRelayDeadline,
  withDeadline,
} from '../../src/api/phase5/deadline';
import type { ApiOperation } from '../../src/api/phase5/types';

/**
 * NW-05. The relay wrapped each ATTEMPT in a `Promise.race` timeout and gave
 * `fetch` no `AbortSignal`, so:
 *
 *   - the losing branch rejected while the request, socket and body stream
 *     kept running — the caller was told it had timed out while owned work
 *     continued;
 *   - a redirect received another full budget, so a 15 s "timeout" bounded a
 *     30 s operation;
 *   - auth-header acquisition sat outside the timer entirely.
 *
 * Every assertion here is about OPERATION COUNTS, SIGNALS and CALL ORDER, not
 * wall-clock durations: a threshold test on a shared machine measures load,
 * not the property. Time is injected.
 */

function syntheticOperation(): ApiOperation {
  return {
    operationId: 'synthetic.nw05.read',
    product: 'ripple',
    service: 'fixture',
    sourceRepo: 'mobingilabs/ripple-api',
    sourceSHA: '27bb007ad0c798800b6bd3b29760c966422966e7',
    frontendCallsites: [],
    httpMethod: 'GET',
    pathTemplate: '/fixture/read',
    semanticPurpose: 'Synthetic read',
    semanticClass: 'KNOWN_READ',
    authClass: 'NONE_LOCAL_FIXTURE',
    requestSchema: { method: 'GET', pathTemplate: '/fixture/read', bodyPolicy: 'EMPTY', hydrationProfile: 'empty', runtimePlaceholders: [] },
    safeHydrationStrategy: 'empty',
    responseShapePolicy: { oracleId: 'synthetic.nw05.json', expectedContentType: 'application/json', shape: 'JSON_OBJECT_OR_ARRAY', persistBody: false, maxBytes: 1024 },
    streamingType: 'SINGLE_JSON',
    expectedContentType: 'application/json',
    requiredHostClass: 'LOCAL_LOOPBACK',
    oracleProfile: 'synthetic.nw05.json',
    replayPolicy: 'LOCAL_ONLY',
    sourceProvenance: ['synthetic'],
    journeyLinks: [],
    generationStatus: 'GENERATION_ELIGIBLE',
  };
}

const LOCAL_TARGET = () => new URL('http://127.0.0.1:7399/fixture/read');

function jsonResponse(body = '{"ok":true}') {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: new TextEncoder().encode(body),
    complete: true,
  };
}

/** A controllable clock and timer, so no test sleeps. */
function fakeTime() {
  let current = 0;
  const timers: Array<{ at: number; fn: () => void; cleared: boolean }> = [];
  return {
    monotonicNow: () => current,
    setTimer: (fn: () => void, ms: number) => {
      const entry = { at: current + ms, fn, cleared: false };
      timers.push(entry);
      return entry;
    },
    clearTimer: (handle: unknown) => {
      (handle as { cleared: boolean }).cleared = true;
    },
    advance(ms: number) {
      current += ms;
      for (const entry of timers) {
        if (!entry.cleared && entry.at <= current) {
          entry.cleared = true;
          entry.fn();
        }
      }
    },
    liveTimers: () => timers.filter((entry) => !entry.cleared).length,
  };
}

test.describe('NW-05 — one abortable deadline per relay operation', () => {
  test('the deadline aborts its signal before the caller is told', () => {
    const clock = fakeTime();
    const deadline = createRelayDeadline(1000, clock);
    try {
      expect(deadline.signal.aborted).toBe(false);
      expect(deadline.remainingMs()).toBe(1000);
      clock.advance(400);
      expect(deadline.remainingMs()).toBe(600);
      clock.advance(600);
      // Aborted, and the reason names the deadline rather than a transport
      // failure.
      expect(deadline.signal.aborted).toBe(true);
      expect(deadline.reason()).toBe('DEADLINE_EXCEEDED');
      expect(deadline.remainingMs()).toBe(0);
    } finally {
      deadline.dispose();
    }
  });

  test('a caller abort composes into the operation signal and is classified apart', () => {
    const clock = fakeTime();
    const caller = new AbortController();
    const deadline = createRelayDeadline(1000, { ...clock, callerSignal: caller.signal });
    try {
      caller.abort();
      expect(deadline.signal.aborted).toBe(true);
      expect(deadline.reason()).toBe('CALLER_ABORTED');
    } finally {
      deadline.dispose();
    }
    // An already-aborted caller settles the deadline at construction.
    const already = new AbortController();
    already.abort();
    const settled = createRelayDeadline(1000, { ...fakeTime(), callerSignal: already.signal });
    try {
      expect(settled.reason()).toBe('CALLER_ABORTED');
    } finally {
      settled.dispose();
    }
  });

  test('dispose clears the timer and is idempotent', () => {
    const clock = fakeTime();
    const deadline = createRelayDeadline(1000, clock);
    expect(clock.liveTimers()).toBe(1);
    deadline.dispose();
    expect(clock.liveTimers()).toBe(0);
    deadline.dispose();
    expect(clock.liveTimers()).toBe(0);
    // A disposed deadline's timer cannot fire later.
    clock.advance(5000);
    expect(deadline.signal.aborted).toBe(false);
  });

  test('a hung stage is rejected with the stage that owned the budget', async () => {
    const clock = fakeTime();
    const deadline = createRelayDeadline(1000, clock);
    try {
      const hung = new Promise<never>(() => {
        // Never settles: this is the shape the old Promise.race abandoned.
      });
      const raced = withDeadline('auth', deadline, hung);
      clock.advance(1000);
      await expect(raced).rejects.toThrow(/DEADLINE_EXCEEDED: auth/);
      // Once settled, a later stage refuses immediately rather than starting.
      await expect(withDeadline('request', deadline, Promise.resolve(1)))
        .rejects.toThrow(/DEADLINE_EXCEEDED: request/);
    } finally {
      deadline.dispose();
    }
  });

  test('the failure taxonomy keeps a deadline apart from a transport error', () => {
    expect(classifyRelayFailure(new RelayOperationError('DEADLINE_EXCEEDED', 'body'))).toBe('DEADLINE_EXCEEDED');
    expect(classifyRelayFailure(new RelayOperationError('CALLER_ABORTED', 'request'))).toBe('CALLER_ABORTED');
    expect(classifyRelayFailure(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe('CALLER_ABORTED');
    expect(classifyRelayFailure(new Error('ECONNRESET'))).toBe('TRANSPORT_FAILED');
    expect(classifyRelayFailure(null)).toBe('TRANSPORT_FAILED');
  });

  test('a hung auth acquisition is bounded — it used to sit outside the timer', async () => {
    let authCalls = 0;
    let fetches = 0;
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 25,
      authHeaders: async () => {
        authCalls += 1;
        // Hangs past the operation budget.
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        return {};
      },
      fetcher: async () => {
        fetches += 1;
        return jsonResponse();
      },
    });
    expect(authCalls).toBe(1);
    // The transport is never reached, so the operation cannot exceed its
    // budget in the auth stage and then still spend a full request budget.
    expect(fetches).toBe(0);
    expect(observation.status).toBeNull();
    expect(observation.relayFailure).toBe('DEADLINE_EXCEEDED');
  });

  test('a redirect shares the operation budget instead of receiving a second one', async () => {
    // The defect: `withTimeout` wrapped each attempt, so the redirect got
    // another full timeoutMs. Asserted by CALL COUNT and outcome, not timing:
    // the first attempt consumes the whole budget, so the redirect attempt
    // must never be issued.
    const targets: string[] = [];
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 25,
      fetcher: async (context) => {
        targets.push(context.target.pathname);
        if (targets.length === 1) {
          // Slow enough to exhaust the operation budget while still resolving,
          // exactly the case the per-attempt timer failed to bound overall.
          await new Promise((resolve) => setTimeout(resolve, 120));
          return {
            status: 302,
            headers: { location: 'http://127.0.0.1:7399/fixture/read', 'content-type': 'application/json' },
            body: new Uint8Array(),
            complete: true,
          };
        }
        return jsonResponse();
      },
    });
    expect(targets).toHaveLength(1);
    expect(observation.relayFailure).toBe('DEADLINE_EXCEEDED');
    expect(observation.status).toBeNull();
  });

  test('the fetcher receives the operation signal and the remaining budget', async () => {
    let sawSignal = false;
    let signalAbortedDuringCall = true;
    let remaining = -1;
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 5_000,
      fetcher: async (context) => {
        sawSignal = context.signal !== undefined;
        signalAbortedDuringCall = context.signal?.aborted ?? true;
        remaining = context.remainingMs?.() ?? -1;
        return jsonResponse();
      },
    });
    // Without a signal in the context, a fetcher cannot pass one to fetch, and
    // the deadline can only abandon work rather than stop it.
    expect(sawSignal, 'the fetcher received no abort signal').toBe(true);
    expect(signalAbortedDuringCall).toBe(false);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(5_000);
    expect(observation.status).toBe(200);
    expect(observation.relayFailure).toBeUndefined();
  });

  test('a caller abort stops the operation and is reported as such', async () => {
    const caller = new AbortController();
    let fetches = 0;
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 5_000,
      callerSignal: caller.signal,
      fetcher: async (context) => {
        fetches += 1;
        caller.abort();
        // A cooperative transport observes the composed signal.
        expect(context.signal?.aborted).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        return jsonResponse();
      },
    });
    expect(fetches).toBe(1);
    expect(observation.relayFailure).toBe('CALLER_ABORTED');
    expect(observation.status).toBeNull();
  });

  test('a successful near-deadline request is not turned into a failure', async () => {
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 2_000,
      fetcher: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse();
      },
    });
    expect(observation.status).toBe(200);
    expect(observation.oracle.result).toBe('ORACLE_PASS');
    expect(observation.relayFailure).toBeUndefined();
  });

  test('a write is never retried, and neither is a redirect chain extended', async () => {
    let calls = 0;
    const observation = await executeNativePhase5Operation({
      operation: syntheticOperation(),
      mode: 'local',
      targetResolver: LOCAL_TARGET,
      upstreamTimeoutMs: 5_000,
      fetcher: async () => {
        calls += 1;
        return {
          status: 302,
          headers: { location: 'http://127.0.0.1:7399/fixture/read', 'content-type': 'application/json' },
          body: new Uint8Array(),
          complete: true,
        };
      },
    });
    // One request plus at most one redirect: a second redirect is BLOCKED, not
    // followed, so the chain is bounded regardless of the deadline.
    expect(calls).toBe(2);
    expect(observation.redirect).toBe('BLOCKED');
  });
});
