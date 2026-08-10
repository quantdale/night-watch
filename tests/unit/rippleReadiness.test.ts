// Synthetic Ripple readiness contract tests. These use only local values and
// fake timing; no browser, Alphaus host, credentials, DOM, or response body is
// involved.

import { test, expect } from '@playwright/test';
import { waitForRippleStability } from '../../src/browser/observers/stability';
import {
  confirmsRippleTarget,
  classifyRippleReadiness,
  isRippleRoutePath,
  isRippleStructurallyReady,
  RIPPLE_APP_ROOT_SELECTOR,
  RIPPLE_SOURCE_ROOT_CONTRACT,
  type RippleStructuralState,
} from '../../src/products/ripple/readiness';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { selectEnvironment } from '../../src/core/environment';
import { RunMonitor } from '../../src/state/run';

function structural(documentReadyState: string, appRootPresent: boolean): RippleStructuralState {
  return { documentReadyState, appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent };
}

async function runStability(samples: Array<{ route: string; documentReadyState: string; appRootPresent: boolean; fatal?: boolean }>, timeoutMs = 500): Promise<boolean> {
  const first = samples[0];
  if (first === undefined) throw new Error('synthetic stability samples must not be empty');
  let now = 0;
  let index = 0;
  return waitForRippleStability({
    quietMs: 200,
    timeoutMs,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    sample: async () => {
      const current = samples[Math.min(index++, samples.length - 1)] ?? first;
      return { ...current, appRootSelector: RIPPLE_APP_ROOT_SELECTOR, fatal: current?.fatal ?? false };
    },
  });
}

test('source-backed Ripple target semantics allow the entry and authenticated route namespace', () => {
  expect(isRippleRoutePath('/ripple/', '/ripple/')).toBe(true);
  expect(isRippleRoutePath('/ripple/', '/ripple/dashboard')).toBe(true);
  expect(isRippleRoutePath('/ripple/', '/ripple/cost-finalization')).toBe(true);
  expect(isRippleRoutePath('/ripple/', '/rippled/dashboard')).toBe(false);
  expect(isRippleRoutePath('/ripple/', '/')).toBe(false);
  expect(isRippleRoutePath('/ripple/', '/unrelated-product')).toBe(false);
});

test('final target confirmation is origin-exact and does not accept an auth redirect as app readiness', () => {
  expect(confirmsRippleTarget('https://appdev.alphaus.cloud', '/ripple/', 'https://appdev.alphaus.cloud', '/ripple/dashboard')).toBe(true);
  expect(confirmsRippleTarget('https://appdev.alphaus.cloud', '/ripple/', 'https://logindev.alphaus.cloud', '/login')).toBe(false);
  expect(confirmsRippleTarget('https://appdev.alphaus.cloud', '/ripple/', 'https://appdev.alphaus.cloud', '/unrelated-product')).toBe(false);
});

test('production and unknown destinations remain policy-fatal independently of Ripple path readiness', () => {
  const env = selectEnvironment('dev');
  const policy = new OutboundPolicy(env);
  expect(policy.decide('https://app.alphaus.cloud/ripple/dashboard').verdict).toBe('deny');
  expect(policy.decide('https://unrelated.example.invalid/ripple/dashboard').verdict).toBe('deny');
});

test('the app-root marker is the source-backed shell mount and customer text is irrelevant', () => {
  expect(RIPPLE_APP_ROOT_SELECTOR).toBe('#app');
  expect(RIPPLE_SOURCE_ROOT_CONTRACT.status).toBe('CURRENT_SOURCE_STILL_USES_APP');
  expect(RIPPLE_SOURCE_ROOT_CONTRACT.ref).toBe('origin/dev');
  expect(RIPPLE_SOURCE_ROOT_CONTRACT.selector).toBe('#app');
  expect(isRippleStructurallyReady(structural('complete', true))).toBe(true);
  // A page can contain arbitrary/customer text while the source-backed shell
  // mount is absent; text is not an input to the readiness contract.
  const pageSignals = { ...structural('complete', false), textPresent: true };
  expect(isRippleStructurallyReady(pageSignals)).toBe(false);
  expect(isRippleStructurallyReady(structural('loading', true))).toBe(false);
  expect(isRippleStructurallyReady({ documentReadyState: 'complete', appRootSelector: '#wrong-root', appRootPresent: true })).toBe(false);
});

test('sanitized readiness diagnostics distinguish timing, frame, unavailable document, and unresolved source/runtime divergence', () => {
  const base = {
    targetConfirmed: true,
    bodyPresent: true,
    appRootFrameCount: 0,
    evaluationSucceeded: true,
    navigationInProgress: false,
    pageClosed: false,
    appRootSelector: RIPPLE_APP_ROOT_SELECTOR,
  };
  expect(classifyRippleReadiness({ ...base, documentReadyState: 'loading', appRootPresent: false })).toBe('EARLY_DOCUMENT_OR_NAVIGATION');
  expect(classifyRippleReadiness({ ...base, documentReadyState: 'complete', appRootPresent: false, appRootFrameCount: 1 })).toBe('ROOT_PRESENT_ONLY_IN_CHILD_FRAME');
  expect(classifyRippleReadiness({ ...base, documentReadyState: 'complete', appRootPresent: false, bodyPresent: false })).toBe('DOCUMENT_OR_PAGE_UNAVAILABLE');
  expect(classifyRippleReadiness({ ...base, documentReadyState: 'complete', appRootPresent: false })).toBe('SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED');
  expect(classifyRippleReadiness({ ...base, documentReadyState: 'complete', appRootPresent: true })).toBe('READY');
  expect(classifyRippleReadiness({ ...base, targetConfirmed: false, documentReadyState: 'complete', appRootPresent: true })).toBe('WRONG_DOCUMENT_OR_PAGE');
});

test('structural Ripple stability tolerates benign recurring network activity', async () => {
  // NetworkObserver activity is intentionally not sampled by this contract.
  // A shell that remains structurally ready and on one route is stable even
  // while synthetic background reads continue.
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
  ])).resolves.toBe(true);
});

test('document loading does not reach structural stability', async () => {
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'loading', appRootPresent: true },
  ])).resolves.toBe(false);
});

test('blocked telemetry, Pylon support, and browser-background traffic do not create fake instability', async () => {
  const env = selectEnvironment('dev');
  const policy = new OutboundPolicy(env);
  expect(policy.decide('https://www.google.com/collect').verdict).toBe('block-telemetry');
  expect(policy.decide('https://widget.usepylon.com/widget/synthetic').verdict).toBe('block-optional-support');
  expect(policy.decide('https://redirector.gvt1.com/service/synthetic').verdict).toBe('block-browser-background');
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
  ])).resolves.toBe(true);
});

test('a malformed-json oracle remains evidence and does not become a fatal stability signal', async () => {
  const monitor = new RunMonitor(['malformed-json']);
  let time = 0;
  monitor.recordIssue({
    seq: 1,
    ts: new Date(0).toISOString(),
    type: 'oracle',
    severity: 'warn',
    message: 'malformed-json: synthetic',
    data: { reason: 'malformed-json' },
  });
  expect(monitor.safetyFailed).toBe(false);
  expect(monitor.oracleFailed).toBe(true);
  await expect(waitForRippleStability({
    quietMs: 200,
    timeoutMs: 500,
    now: () => time,
    sleep: async (ms) => { time += ms; },
    sample: async () => ({
      route: '/ripple/dashboard',
      documentReadyState: 'complete',
      appRootSelector: RIPPLE_APP_ROOT_SELECTOR,
      appRootPresent: true,
      // The authenticated runner derives fatal only from safety/pageerror,
      // not from ordinary oracle findings such as malformed-json.
      fatal: monitor.safetyFailed || monitor.issues.some((event) => event.data?.reason === 'pageerror'),
    }),
  })).resolves.toBe(true);
});

test('route changes prevent structural stability', async () => {
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootPresent: true },
  ])).resolves.toBe(false);
});

test('structural stability progress exposes route changes and bounded route time', async () => {
  let now = 0;
  let index = 0;
  const progress: Array<{ routeStable: boolean; routeStableMs: number; structurallyReady: boolean }> = [];
  await expect(waitForRippleStability({
    quietMs: 200,
    timeoutMs: 500,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    onSample: (sample) => progress.push(sample),
    sample: async () => {
      const samples = [
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
        { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
        { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
        { route: '/ripple/cost-finalization', documentReadyState: 'complete', appRootSelector: RIPPLE_APP_ROOT_SELECTOR, appRootPresent: true, fatal: false },
      ];
      return samples[Math.min(index++, samples.length - 1)]!;
    },
  })).resolves.toBe(false);
  expect(progress[0]).toMatchObject({ routeStable: true, routeStableMs: 0, structurallyReady: true });
  expect(progress[1]).toMatchObject({ routeStable: false, routeStableMs: 0, structurallyReady: true });
});

test('a disappearing shell root prevents structural stability', async () => {
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: false },
  ])).resolves.toBe(false);
});

test('a shell root that disappears and reappears must regain continuous stability', async () => {
  let now = 0;
  let index = 0;
  await expect(waitForRippleStability({
    quietMs: 200,
    timeoutMs: 700,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    sample: async () => {
      const samples = [
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true, fatal: false },
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: false, fatal: false },
        { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true, fatal: false },
      ];
      return { ...samples[Math.min(index++, samples.length - 1)]!, appRootSelector: RIPPLE_APP_ROOT_SELECTOR };
    },
  })).resolves.toBe(true);
  // The result requires the post-reappearance 200 ms window; it cannot pass
  // immediately by reusing the pre-disappearance route timer.
  expect(now).toBeGreaterThanOrEqual(400);
});

test('fatal page/browser state prevents structural stability', async () => {
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true, fatal: true },
  ])).resolves.toBe(false);
});

test('target confirmation is independent from structural stability', async () => {
  // Same structural contract, but an unrelated same-host path: stability may
  // be true, while final target confirmation remains false.
  expect(confirmsRippleTarget('https://appdev.alphaus.cloud', '/ripple/', 'https://appdev.alphaus.cloud', '/unrelated-product')).toBe(false);
  await expect(runStability([
    { route: '/unrelated-product', documentReadyState: 'complete', appRootPresent: true },
  ])).resolves.toBe(true);
});

test('missing app root is the upstream cause of a structural stability failure', async () => {
  expect(isRippleStructurallyReady(structural('complete', false))).toBe(false);
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: false },
  ])).resolves.toBe(false);
});
