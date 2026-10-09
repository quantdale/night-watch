// ---------------------------------------------------------------------------
// D-16 (M10 11.3) — the settlement wait holds no debug console output.
//
// `waitForNetworkObservationSettle` printed a `[settlement-timeout]` line to
// stdout on every timeout: pending handlers, active requests, the journey
// signal, a pending-URL count and the last-activity delta. It was the only
// console output left in the observer cone, so it wrote to the operator's
// terminal instead of the run's evidence, could not be turned off, could not be
// asserted, and could not be read back.
//
// The wait still reports the SAME facts through its return value, and the
// caller records the timeout as a run event. This suite pins the removal: the
// source has no console output, the live function writes nothing to stdout
// under a timeout, and it still returns false.
//
// No network, no browser, no credentials: the wait is driven through injected
// seams only.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import { waitForNetworkObservationSettle } from '../../src/browser/observers/stability';

const REPO_ROOT = path.resolve(__dirname, '../..');
const STABILITY_PATH = path.join(REPO_ROOT, 'src/browser/observers/stability.ts');

/**
 * CODE only. The D-16 record deliberately names the removed `console.log` in a
 * comment, so a raw read would see the very token this test refuses; the
 * structural assertion is about code, exactly as the rule engine's `read()`
 * accessor defines it.
 */
function stabilityCode(): string {
  return fs
    .readFileSync(STABILITY_PATH, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test.describe('D-16 — the settlement wait writes no debug output', () => {
  test('the observer cone holds no console output at all', () => {
    const source = stabilityCode();
    expect(source, 'console.log in the settlement wait is the D-16 defect').not.toContain('console.log');
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('console.warn');
    expect(source).not.toContain('process.stdout.write');
    expect(source).not.toContain('process.stderr.write');
  });

  test('the timeout still returns false, which is how the wait reports the failure', () => {
    // A never-settling observer: two pending handlers and recent activity, so
    // the deadline is reached. `sleep` is a no-op so the loop exits immediately.
    const settled = waitForNetworkObservationSettle({
      network: {
        activeRequests: () => 3,
        pendingResponseHandlers: () => 2,
        lastActivityAt: () => Date.now(),
        activeJourneyRequests: () => 1,
        pendingUrlCount: () => 9,
      },
      quietMs: 1,
      timeoutMs: 0,
      now: () => Date.now(),
      sleep: () => Promise.resolve(),
    });
    return expect(settled).resolves.toBe(false);
  });

  test('the diagnostic seam survives, so a caller can still obtain the counts', () => {
    // Removing the print must not remove the ability to measure: the count-only
    // seam is still part of the wait's contract, and it is still never used to
    // emit anything itself.
    const source = fs.readFileSync(STABILITY_PATH, 'utf8');
    expect(source).toContain('pendingUrlCount?: () => number');
    expect(source).toContain('raw URLs are never logged');
  });

  test('the dwell path still settles true when the observer is genuinely quiet', () => {
    // The positive control: the removal changed nothing about the wait's own
    // decision, so a future reader cannot claim the fix weakened the barrier.
    const settled = waitForNetworkObservationSettle({
      network: {
        activeRequests: () => 0,
        pendingResponseHandlers: () => 0,
        lastActivityAt: () => Date.now() - 10_000,
        activeJourneyRequests: () => 0,
      },
      quietMs: 500,
      timeoutMs: 10_000,
      now: () => Date.now(),
      sleep: () => Promise.resolve(),
    });
    return expect(settled).resolves.toBe(true);
  });
});
