// Sanitized monitor taxonomy tests. Inputs are synthetic policy/lifecycle
// events only; no browser target or external host is contacted.

import { test, expect } from '@playwright/test';
import { RunMonitor, type SafetyMonitorReason } from '../../src/state/run';
import type { RunEvent } from '../../src/core/evidence/types';

function event(data: Record<string, unknown>): RunEvent {
  return {
    seq: 0,
    ts: '2026-01-01T00:00:00.000Z',
    type: 'hard-failure',
    severity: 'fatal',
    message: 'synthetic hard failure',
    data,
  };
}

function record(data: Record<string, unknown>): SafetyMonitorReason {
  const monitor = new RunMonitor(['hard-failure']);
  monitor.recordHardFailure(event(data), {
    url: typeof data.url === 'string' ? data.url : 'about:blank',
    verdict: 'deny',
    hostClass: typeof data.hostClass === 'string' ? data.hostClass : 'external',
    reason: 'synthetic policy reason',
  });
  return monitor.primaryFailure()?.reason ?? 'OTHER';
}

test('hard-failure paths have distinct sanitized safety-monitor reasons', () => {
  const cases: Array<[string, Record<string, unknown>, SafetyMonitorReason]> = [
    ['proxy unknown', { path: 'outer-proxy', url: 'https://example.invalid/', hostClass: 'external' }, 'UNKNOWN_DESTINATION'],
    ['proxy production', { path: 'outer-proxy', url: 'https://app.alphaus.cloud/', hostClass: 'production' }, 'PRODUCTION_DESTINATION_ATTEMPT'],
    ['guard alarm', { path: 'service-worker', hostClass: 'unknown-alphaus' }, 'GUARD_ALARM'],
    ['websocket', { protocol: 'websocket', hostClass: 'unknown-alphaus' }, 'WEBSOCKET_POLICY_VIOLATION'],
    ['worker', { resourceType: 'worker', hostClass: 'unknown-alphaus' }, 'WORKER_POLICY_VIOLATION'],
    ['unrouted', { path: 'unrouted-observation', hostClass: 'external' }, 'UNROUTED_REQUEST'],
    ['general policy', { path: 'browser-route', hostClass: 'local' }, 'POLICY_VIOLATION'],
    ['proxy liveness', { path: 'outer-proxy-runtime', hostClass: 'external' }, 'PROXY_LIVENESS_FAILED'],
    ['proxy process exit', { path: 'outer-proxy-runtime', monitorReason: 'PROXY_PROCESS_EXITED', hostClass: 'external' }, 'PROXY_PROCESS_EXITED'],
  ];

  for (const [label, input, expected] of cases) {
    expect(record(input), label).toBe(expected);
  }
});

test('lifecycle and monitor-internal failures retain exact safe categories', () => {
  const monitor = new RunMonitor(['hard-failure']);
  const lifecycle = event({ path: 'browser-lifecycle', monitorReason: 'CONTEXT_CLOSED' });
  monitor.recordHardFailure(lifecycle, {
    url: 'about:blank',
    verdict: 'deny',
    hostClass: 'external',
    reason: 'synthetic lifecycle failure',
    monitorReason: 'CONTEXT_CLOSED',
    lifecycleEvent: 'context-closed',
  });
  expect(monitor.primaryFailure()).toMatchObject({
    reason: 'CONTEXT_CLOSED',
    lifecycleEvent: 'context-closed',
  });

  const internal = new RunMonitor(['hard-failure']);
  internal.recordInternalFailure('synthetic-monitor-error');
  expect(internal.primaryFailure()).toMatchObject({
    reason: 'MONITOR_INTERNAL_ERROR',
    issueCategory: 'synthetic-monitor-error',
  });
});
