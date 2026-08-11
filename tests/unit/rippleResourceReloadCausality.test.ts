// Phase G resource/reload causality regressions.
//
// These classify the B-phase causal taxonomy locally and synthetically:
// CHUNK_FAILURE_TRIGGERED_SOURCE_RELOAD,
// SOURCE_RELOAD_CANCELED_INFLIGHT_CHUNKS, and MIXED_RESOURCE_FAILURE_AND_RELOAD.
// Only sanitized local URLs and structural metadata are used; no response
// bodies, DOM, auth material, or production traffic.

import { test, expect } from '@playwright/test';
import {
  buildRippleBootstrapDiagnostics,
  type BootstrapObserverCoverage,
} from '../../src/products/ripple/bootstrapDiagnostics';
import type { RunEvent } from '../../src/core/evidence/types';

const coverage: BootstrapObserverCoverage = {
  unhandledRejection: true,
  cspViolation: true,
  resourceLoadFailure: true,
  historyRouteTransition: true,
  requestFailureMetadata: true,
};

let seq = 0;
function event(type: RunEvent['type'], data: Record<string, unknown> = {}, message = 'synthetic'): RunEvent {
  return { seq: seq++, ts: new Date(seq * 1000).toISOString(), type, severity: 'info', message, data };
}
function request(url: string, resourceType = 'script', verdict = 'allow'): RunEvent {
  return event('request', { method: 'GET', url, resourceType, verdict, policyClassification: 'EXPECTED', policyHostClass: 'local' });
}
function response(url: string, status = 200, contentType = 'text/javascript', resourceType = 'script'): RunEvent {
  return event('response', { method: 'GET', url, resourceType, status, contentType, completed: true });
}
function requestfailed(url: string, category: string, method = 'GET', resourceType = 'script'): RunEvent {
  return event('requestfailed', { method, url, resourceType, completed: false, failureCategory: category });
}
function docEvent(phase: string, ordinal: number, extra: Record<string, unknown> = {}): RunEvent {
  return event('bootstrap', { category: 'document-lifecycle', phase, documentOrdinal: ordinal, frameIdClassification: 'main-frame', ...extra });
}
function reloadSignal(): RunEvent {
  return event('bootstrap', {
    category: 'source-reload-signal', phase: 'reload-trigger',
    sourceReloadOwner: 'Ripple', sourceReloadPath: 'public/index.html',
    sourceReloadTrigger: 'script-or-link-error', path: '/ripple/',
  });
}
function documentOne(url: string): RunEvent[] {
  return [
    event('navigation', { url }),
    docEvent('request', 1, { origin: 'http://127.0.0.1:43111', path: '/ripple/', method: 'GET', navigationInitiatorCategory: 'browser', replacesMainDocument: false }),
    docEvent('response', 1, { origin: 'http://127.0.0.1:43111', path: '/ripple/', status: 200, contentType: 'text/html' }),
  ];
}
function documentTwo(reloadInit: RunEvent, initiator = 'reload'): RunEvent[] {
  return [
    docEvent('request', 2, { origin: 'http://127.0.0.1:43111', path: '/ripple/', method: 'GET', navigationInitiatorCategory: initiator, replacesMainDocument: true, documentUrlPresent: true }),
    docEvent('response', 2, { origin: 'http://127.0.0.1:43111', path: '/ripple/', status: 200, contentType: 'text/html' }),
  ];
}
const entry = (): RunEvent[] => [
  request('http://127.0.0.1:43111/ripple/static/js/app.synthetic.js'),
  response('http://127.0.0.1:43111/ripple/static/js/app.synthetic.js'),
];
function final(overrides: Record<string, unknown> = {}) {
  return { renderedShellPresent: false, routeStable: false, routeStableMs: 0, stabilityReached: false, finalPath: '/ripple/', mainFrameNavigationCount: 2, ...overrides };
}

test('genuine chunk failure followed by a source reload stays CRITICAL with a source-proven reload', () => {
  // CHUNK_FAILURE_TRIGGERED_SOURCE_RELOAD (local model): a required chunk fails
  // (requestfailed transport-failure), Ripple reloads from its index.html
  // handler, and the reload is source-proven. The genuine failure must survive
  // as CRITICAL_ASSET_LOAD_FAILURE while the doc-2 navigation is classified
  // SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD.
  const chunk = 'http://127.0.0.1:43111/ripple/static/js/chunk-needful.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      ...documentOne('http://127.0.0.1:43111/ripple/'),
      ...entry(),
      request(chunk),
      requestfailed(chunk, 'transport-failure'),
      reloadSignal(),
      ...documentTwo(reloadSignal()),
    ],
    final(),
    coverage,
  );
  expect(diagnostics.chunkRequestCount).toBe(1);
  expect(diagnostics.chunkFailureCount).toBe(1);
  expect(diagnostics.failedCriticalResources).toHaveLength(1);
  expect(diagnostics.failedCriticalResources[0]).toMatchObject({ resourceKind: 'chunk', failureCategory: 'request-failed' });
  expect(diagnostics.classification).toBe('CRITICAL_ASSET_LOAD_FAILURE');
  expect(diagnostics.lifecycle.documentNavigationClassifications).toEqual(['SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD']);
});

test('source reload canceling healthy in-flight chunks is NOT a critical failure', () => {
  // SOURCE_RELOAD_CANCELED_INFLIGHT_CHUNKS: doc-1 requests chunks that are
  // canceled by the reload navigation (no response, no requestfailed); the
  // reload is source-proven. The unterminated chunks must NOT drive CRITICAL.
  const chunkA = 'http://127.0.0.1:43111/ripple/static/js/chunk-a.synthetic.js';
  const chunkB = 'http://127.0.0.1:43111/ripple/static/js/chunk-b.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      ...documentOne('http://127.0.0.1:43111/ripple/'),
      ...entry(),
      // doc-1 in-flight requests (canceled on navigation)
      request(chunkA),
      request(chunkB),
      reloadSignal(),
      ...documentTwo(reloadSignal()),
      // doc-2 re-requests and completes both
      request(chunkA),
      response(chunkA),
      request(chunkB),
      response(chunkB),
    ],
    final(),
    coverage,
  );
  expect(diagnostics.scriptFailureCount).toBe(0);
  expect(diagnostics.failedCriticalResources).toHaveLength(0);
  expect(diagnostics.classification).not.toBe('CRITICAL_ASSET_LOAD_FAILURE');
  expect(diagnostics.lifecycle.documentNavigationClassifications).toEqual(['SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD']);
});

test('mixed genuine failure and navigation-canceled resource keeps only the genuine failure', () => {
  // MIXED_RESOURCE_FAILURE_AND_RELOAD: one chunk fails for real; a second is
  // navigation-canceled. Only the genuine failure surfaces as CRITICAL; the
  // canceled one is unterminated, not failed.
  const failed = 'http://127.0.0.1:43111/ripple/static/js/chunk-mixed.synthetic.js';
  const canceled = 'http://127.0.0.1:43111/ripple/static/js/chunk-canceled-2.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      ...documentOne('http://127.0.0.1:43111/ripple/'),
      ...entry(),
      request(failed),
      requestfailed(failed, 'tls-failure'),
      request(canceled), // in flight, canceled by the reload below
      reloadSignal(),
      ...documentTwo(reloadSignal()),
      request(canceled),
      response(canceled),
    ],
    final(),
    coverage,
  );
  expect(diagnostics.chunkFailureCount).toBe(1);
  // The canceled chunk's doc-2 re-request may be left as not-completed by the
  // URL-key matcher (a known per-document attribution limitation), but it must
  // never be a genuine failure and never join failedCriticalResources.
  expect(diagnostics.failedCriticalResources).toHaveLength(1);
  expect(diagnostics.failedCriticalResources[0]?.path).toContain('chunk-mixed');
  expect(diagnostics.classification).toBe('CRITICAL_ASSET_LOAD_FAILURE');
});

test('document-dependent state is evaluated independently after a same-path reload', () => {
  // Doc-1 never reaches a shell; doc-2 reaches it (final document evaluated
  // independently). The current diagnostic must reflect the FINAL document's
  // shell presence, not the first document's stall.
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      ...documentOne('http://127.0.0.1:43111/ripple/'),
      ...entry(),
      reloadSignal(),
      ...documentTwo(reloadSignal()),
    ],
    final({ renderedShellPresent: true, routeStable: true, routeStableMs: 900, stabilityReached: true, finalPath: '/ripple/dashboard' }),
    coverage,
  );
  // Shell presence and stability are supplied from the final document sample;
  // the diagnostic reports the final state while the same-path reload remains
  // source-proven, not an unexplained second document.
  expect(diagnostics.renderedShellPresent).toBe(true);
  expect(diagnostics.lifecycle.postMountCheckpoints.stabilityReached).toBe(true);
  expect(diagnostics.lifecycle.documentNavigationClassifications).toEqual(['SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD']);
  expect(diagnostics.lifecycle.mainDocumentReplacedCount).toBe(1);
});
