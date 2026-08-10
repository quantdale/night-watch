// Synthetic Ripple readiness contract tests. These use only local values and
// fake timing; no browser, Alphaus host, credentials, DOM, or response body is
// involved.

import { test, expect } from '@playwright/test';
import { waitForRippleStability } from '../../src/browser/observers/stability';
import {
  confirmsRippleTarget,
  isRippleRoutePath,
  isRippleStructurallyReady,
  RIPPLE_APP_ROOT_SELECTOR,
  type RippleStructuralState,
} from '../../src/products/ripple/readiness';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { selectEnvironment } from '../../src/core/environment';
import { RunMonitor } from '../../src/state/run';

function structural(documentReadyState: string, appRootPresent: boolean): RippleStructuralState {
  return { documentReadyState, appRootPresent };
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
      return { ...current, fatal: current?.fatal ?? false };
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
  expect(isRippleStructurallyReady(structural('complete', true))).toBe(true);
  // A page can contain arbitrary/customer text while the source-backed shell
  // mount is absent; text is not an input to the readiness contract.
  expect(isRippleStructurallyReady(structural('complete', false))).toBe(false);
  expect(isRippleStructurallyReady(structural('loading', true))).toBe(false);
});

test('structural Ripple stability tolerates benign recurring network activity', async () => {
  // NetworkObserver activity is intentionally not sampled by this contract.
  // A shell that remains structurally ready and on one route is stable even
  // while synthetic background reads continue.
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
  ])).resolves.toBe(true);
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

test('a disappearing shell root prevents structural stability', async () => {
  await expect(runStability([
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: true },
    { route: '/ripple/dashboard', documentReadyState: 'complete', appRootPresent: false },
  ])).resolves.toBe(false);
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
