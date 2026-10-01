// M8 task 9.5 (NW-AUD-023 narrowed, R2-05/R2-28/R2-29) — the browser-context
// setup is transactional, the health poll is cleared on every exit path, popup
// acquisition is an awaited barrier with a deny-by-policy fallback, and close
// joins in-flight acquisitions.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROXY_LIVENESS_INITIAL,
  PROXY_LIVENESS_DEADLINE_MS,
  PROXY_LIVENESS_FAILURE_THRESHOLD,
  advanceProxyLiveness,
} from '../../src/browser/context';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_SOURCE = fs.readFileSync(path.join(REPO_ROOT, 'src', 'browser', 'context.ts'), 'utf8');

test.describe('browser context guard transaction integrity (9.5)', () => {
  test('a fallible setup stage rolls the context back instead of leaking it', () => {
    // The setup boundary exists and its rollback closes the context...
    expect(CONTEXT_SOURCE).toContain('const setupRollback = async (): Promise<void> => {');
    expect(CONTEXT_SOURCE).toMatch(/const setupRollback[\s\S]{0,400}await context\.close\(\)/);
    // ...and the boundary catches, rolls back and rethrows the original error.
    expect(CONTEXT_SOURCE).toMatch(/\} catch \(error\) \{\s*await setupRollback\(\);\s*throw error;\s*\}/);
    // The try opens AFTER context creation, so rollback always has a context.
    const newContextAt = CONTEXT_SOURCE.indexOf('const context = await browser.newContext({');
    const tryAt = CONTEXT_SOURCE.indexOf('  try {\n  if (traceOn) {');
    expect(newContextAt).toBeGreaterThan(0);
    expect(tryAt).toBeGreaterThan(newContextAt);
  });

  test('the health poll is tracked, cleared on the close path and cleared by rollback', () => {
    // The poll is assigned to a tracked variable, never a bare const that only
    // close() can see.
    expect(CONTEXT_SOURCE).toContain('proxyPoll = setInterval(');
    expect(CONTEXT_SOURCE).not.toContain('const proxyPoll = setInterval(');
    const clears = CONTEXT_SOURCE.match(/clearInterval\(proxyPoll\)/g) ?? [];
    // One clear in rollback and one in close.
    expect(clears.length).toBe(2);
    expect(CONTEXT_SOURCE).toMatch(/setupRollback[\s\S]{0,300}clearInterval\(proxyPoll\)/);
  });

  test('popup acquisition is an awaited barrier with a deny-by-policy fallback', () => {
    expect(CONTEXT_SOURCE).toContain('const pendingAcquisitions = new Set<Promise<void>>();');
    expect(CONTEXT_SOURCE).toContain('const awaitAcquisitions = async (): Promise<void> => {');
    // A guard that cannot be installed marks the page denied, never admitted.
    expect(CONTEXT_SOURCE).toMatch(/catch\(\(\) => \{[\s\S]{0,400}popupGuardBarrierDenied = true;/);
    expect(CONTEXT_SOURCE).toContain('deny by policy');
    // Every acquisition is tracked and removed exactly once.
    expect(CONTEXT_SOURCE).toMatch(/pendingAcquisitions\.add\(tracked\)/);
    expect(CONTEXT_SOURCE).toMatch(/pendingAcquisitions\.delete\(tracked\)/);
  });

  test('close joins every in-flight acquisition before tearing the context down', () => {
    const closeBody = CONTEXT_SOURCE.slice(CONTEXT_SOURCE.indexOf('const close = async (): Promise<void> => {'));
    const joinAt = closeBody.indexOf('await awaitAcquisitions();');
    const contextCloseAt = closeBody.indexOf('await context.close();');
    expect(joinAt).toBeGreaterThan(0);
    expect(contextCloseAt).toBeGreaterThan(joinAt);
    // A denied barrier is reported, not swallowed.
    expect(closeBody).toMatch(/popupGuardBarrierDenied[\s\S]{0,300}severity: 'error'/);
  });

  test('the acquisition guard is installed for the initial page and for every popup', () => {
    const initialInstall = CONTEXT_SOURCE.indexOf('await installFetchGuard(context, page, {');
    const popupInstall = CONTEXT_SOURCE.indexOf("context.on('page', (p: Page) => {");
    expect(initialInstall).toBeGreaterThan(0);
    expect(popupInstall).toBeGreaterThan(initialInstall);
    // The popup path installs the same guard, not a weaker one.
    const popupBody = CONTEXT_SOURCE.slice(popupInstall, popupInstall + 1200);
    expect(popupBody).toContain('installFetchGuard(context, p, {');
    expect(popupBody).toContain('admitRequest: network.admitRequest');
    expect(popupBody).toContain('bindRedirectFollowUp: network.bindRedirectFollowUp');
  });
});

// ---------------------------------------------------------------------------
// R4-15 / review-4 task 4.2 — proxy liveness tolerates transient misses.
//
// The poll is one-shot with a 1 s timeout every 100 ms, so a first failure
// used to be FATAL and a transient scheduling delay ended a legitimate run.
// The window is now: N consecutive failures OR a bounded deadline from the
// FIRST failure, whichever comes first, and a healthy probe resets it.
// ---------------------------------------------------------------------------

test.describe('proxy liveness window (R4-15)', () => {
  test('the declared bounds are the tolerance policy', () => {
    expect(PROXY_LIVENESS_FAILURE_THRESHOLD).toBe(3);
    expect(PROXY_LIVENESS_DEADLINE_MS).toBe(5000);
    expect(PROXY_LIVENESS_INITIAL).toEqual({ consecutiveFailures: 0, firstFailureAtMs: null });
  });

  test('a single missed probe is NOT fatal, and a success resets the window', () => {
    const first = advanceProxyLiveness(PROXY_LIVENESS_INITIAL, false, 1_000);
    expect(first.fatal).toBe(false);
    expect(first.state).toEqual({ consecutiveFailures: 1, firstFailureAtMs: 1_000 });
    // The next probe succeeds well inside the deadline: healthy, window reset.
    const recovered = advanceProxyLiveness(first.state, true, 1_400);
    expect(recovered).toEqual({ state: PROXY_LIVENESS_INITIAL, fatal: false });
    // A later miss starts a FRESH window rather than continuing the old one.
    const later = advanceProxyLiveness(recovered.state, false, 9_000);
    expect(later).toEqual({ state: { consecutiveFailures: 1, firstFailureAtMs: 9_000 }, fatal: false });
  });

  test('a sustained outage is fatal within the declared threshold or deadline', () => {
    let state = PROXY_LIVENESS_INITIAL;
    for (let index = 0; index < PROXY_LIVENESS_FAILURE_THRESHOLD - 1; index += 1) {
      const step = advanceProxyLiveness(state, false, 1_000 + index * 100);
      expect(step.fatal).toBe(false);
      state = step.state;
    }
    // The threshold probe is fatal even inside the deadline.
    expect(advanceProxyLiveness(state, false, 2_000).fatal).toBe(true);
    // The deadline is fatal on its own, however few probes were missed.
    const sparse = advanceProxyLiveness({ consecutiveFailures: 1, firstFailureAtMs: 1_000 }, false, 1_000 + PROXY_LIVENESS_DEADLINE_MS);
    expect(sparse.fatal).toBe(true);
    // Just inside the deadline is still tolerated.
    const inside = advanceProxyLiveness({ consecutiveFailures: 1, firstFailureAtMs: 1_000 }, false, 1_000 + PROXY_LIVENESS_DEADLINE_MS - 1);
    expect(inside.fatal).toBe(false);
  });
});
