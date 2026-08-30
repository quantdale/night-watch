// Bounded observation-settlement tests. These exercise only the local timing
// contract; no browser target, credentials, or external host is contacted.

import { expect, test } from '@playwright/test';
import { waitForNetworkObservationSettle } from '../../src/browser/observers/stability';

test('settlement waits for pending handlers and the quiet interval (active requests are not required to drain)', async () => {
  let now = 0;
  let active = 1;
  let pending = 1;
  let lastActivity = 0;
  let completed = false;

  const settled = await waitForNetworkObservationSettle({
    network: {
      activeRequests: () => active,
      pendingResponseHandlers: () => pending,
      lastActivityAt: () => lastActivity,
    },
    quietMs: 200,
    timeoutMs: 1_000,
    now: () => now,
    sleep: async (ms) => {
      now += ms;
      if (now >= 100 && !completed) {
        active = 1; // background polling may remain in-flight; settlement ignores it
        pending = 0;
        lastActivity = now;
        completed = true;
      }
    },
  });

  expect(settled).toBe(true);
  expect(now).toBeGreaterThanOrEqual(300);
});

test('settlement times out instead of certifying a pending observation', async () => {
  let now = 0;
  const settled = await waitForNetworkObservationSettle({
    network: {
      activeRequests: () => 0,
      pendingResponseHandlers: () => 1,
      lastActivityAt: () => 0,
    },
    quietMs: 100,
    timeoutMs: 250,
    now: () => now,
    sleep: async (ms) => { now += ms; },
  });

  expect(settled).toBe(false);
  expect(now).toBeGreaterThanOrEqual(250);
});

test('settlement ignores in-flight requests when no pending handler remains', async () => {
  let now = 350;
  const settled = await waitForNetworkObservationSettle({
    network: {
      activeRequests: () => 1,
      pendingResponseHandlers: () => 0,
      lastActivityAt: () => 0,
    },
    quietMs: 100,
    timeoutMs: 250,
    now: () => now,
    sleep: async (ms) => { now += ms; },
  });

  expect(settled).toBe(true);
});
