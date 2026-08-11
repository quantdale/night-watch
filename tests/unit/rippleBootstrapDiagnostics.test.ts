// Synthetic Phase 2A bootstrap diagnostics. These fixtures contain only local
// URLs and structural metadata; no Alphaus traffic, response bodies, DOM, or
// authentication material is used.

import { test, expect } from '@playwright/test';
import {
  buildRippleBootstrapDiagnostics,
  classifyBootstrapEvidence,
  type BootstrapClassificationInput,
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
  return {
    seq: seq++,
    ts: new Date(seq * 1000).toISOString(),
    type,
    severity: 'info',
    message,
    data,
  };
}

function request(url: string, resourceType: string, extra: Record<string, unknown> = {}): RunEvent {
  return event('request', {
    method: 'GET',
    url,
    resourceType,
    verdict: 'allow',
    policyClassification: 'EXPECTED',
    policyHostClass: 'local',
    ...extra,
  });
}

function response(url: string, status: number, contentType: string, extra: Record<string, unknown> = {}): RunEvent {
  return event('response', {
    method: 'GET',
    url,
    resourceType: extra.resourceType ?? 'script',
    status,
    contentType,
    completed: true,
    ...extra,
  });
}

function documentAndEntry(entryResponse: RunEvent = response(
  'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js',
  200,
  'text/javascript',
)): RunEvent[] {
  const documentUrl = 'http://127.0.0.1:43111/ripple/';
  const entryUrl = 'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js';
  return [
    event('navigation', { url: documentUrl }),
    request(documentUrl, 'document'),
    response(documentUrl, 200, 'text/html', { resourceType: 'document' }),
    request(entryUrl, 'script'),
    entryResponse,
  ];
}

function final(overrides: Partial<Parameters<typeof buildRippleBootstrapDiagnostics>[1]> = {}) {
  return {
    renderedShellPresent: false,
    routeStable: false,
    routeStableMs: 0,
    stabilityReached: false,
    finalPath: '/ripple/',
    mainFrameNavigationCount: 1,
    ...overrides,
  };
}

function completeInput(overrides: Partial<BootstrapClassificationInput> = {}): BootstrapClassificationInput {
  return {
    documentLoaded: true,
    authState: 'unknown',
    applicationEntryCompleted: true,
    criticalAssetFailure: false,
    requiredResourceBlocked: false,
    runtimeExceptionCount: 0,
    unhandledRejectionCount: 0,
    cspViolationCount: 0,
    observerBlindSpot: false,
    routerBootstrap: 'started',
    renderedShellPresent: true,
    readinessConfirmed: true,
    routeTransitionObserved: true,
    authenticatedRouteReached: true,
    deploymentSourceDivergence: false,
    ...overrides,
  };
}

test('1. document and application entry execute with shell mount -> bootstrap success', () => {
  expect(classifyBootstrapEvidence(completeInput())).toBe('APPLICATION_BOOTSTRAP_CONFIRMED');
});

test('2. application entry 404 -> critical asset load failure', () => {
  const entryUrl = 'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    documentAndEntry(response(entryUrl, 404, 'text/html')),
    final(),
    coverage,
  );
  expect(diagnostics.documentLoaded).toBe(true);
  expect(diagnostics.applicationEntryObserved).toBe(true);
  expect(diagnostics.applicationEntryCompleted).toBe(false);
  expect(diagnostics.scriptFailureCount).toBe(1);
  expect(diagnostics.classification).toBe('CRITICAL_ASSET_LOAD_FAILURE');
});

test('3. application entry returns HTML with 200 -> wrong-content bootstrap failure', () => {
  const entryUrl = 'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    documentAndEntry(response(entryUrl, 200, 'text/html')),
    final(),
    coverage,
  );
  expect(diagnostics.applicationEntryCompleted).toBe(false);
  expect(diagnostics.failedCriticalResources[0]).toMatchObject({
    resourceKind: 'application-entry',
    status: 200,
    contentType: 'text/html',
    failureCategory: 'wrong-content-type',
    requestCompleted: true,
  });
  expect(diagnostics.classification).toBe('CRITICAL_ASSET_LOAD_FAILURE');
});

test('4. application code throws before mount -> JavaScript bootstrap exception', () => {
  const diagnostics = buildRippleBootstrapDiagnostics(
    [...documentAndEntry(), event('pageerror', { category: 'uncaught-page-exception' })],
    final(),
    coverage,
  );
  expect(diagnostics.runtimeExceptionCount).toBe(1);
  expect(diagnostics.classification).toBe('JAVASCRIPT_BOOTSTRAP_EXCEPTION');
});

test('5. unhandled rejection before mount is captured as a sanitized runtime category', () => {
  const diagnostics = buildRippleBootstrapDiagnostics(
    [...documentAndEntry(), event('bootstrap', { category: 'unhandled-rejection' })],
    final(),
    coverage,
  );
  expect(diagnostics.unhandledRejectionCount).toBe(1);
  expect(diagnostics.classification).toBe('JAVASCRIPT_BOOTSTRAP_EXCEPTION');
});

test('6. CSP blocks the application entry and remains visible without content capture', () => {
  const entryUrl = 'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [...documentAndEntry().slice(0, 4), event('bootstrap', { category: 'csp-violation' })],
    final(),
    coverage,
  );
  expect(diagnostics.cspViolationCount).toBe(1);
  expect(diagnostics.applicationEntryObserved).toBe(true);
  expect(diagnostics.applicationEntryCompleted).toBe(false);
  expect(diagnostics.failedCriticalResources[0]?.path).toBe(new URL(entryUrl).pathname);
  expect(diagnostics.classification).toBe('CRITICAL_ASSET_LOAD_FAILURE');
});

test('7. base route remains because router never starts -> router bootstrap failure', () => {
  expect(classifyBootstrapEvidence(completeInput({
    applicationEntryCompleted: true,
    renderedShellPresent: false,
    readinessConfirmed: false,
    routeTransitionObserved: false,
    routerBootstrap: 'not-started',
  }))).toBe('ROUTER_BOOTSTRAP_FAILURE');
});

test('8. authenticated route redirects and shell mounts -> normal successful readiness', () => {
  const diagnostics = buildRippleBootstrapDiagnostics(
    [...documentAndEntry(), event('bootstrap', { category: 'route-transition' })],
    final({ renderedShellPresent: true, stabilityReached: true, finalPath: '/ripple/dashboard' }),
    coverage,
  );
  expect(diagnostics.routeTransitionObserved).toBe(true);
  expect(diagnostics.authenticatedRouteReached).toBe(true);
  expect(diagnostics.routerBootstrap).toBe('started');
  expect(diagnostics.renderedShellPresent).toBe(true);
  expect(diagnostics.readinessConfirmed).toBe(true);
  expect(diagnostics.classification).toBe('APPLICATION_BOOTSTRAP_CONFIRMED');
});

test('8a. shell at the base namespace is not authenticated readiness', () => {
  const diagnostics = buildRippleBootstrapDiagnostics(
    [...documentAndEntry(), event('bootstrap', { category: 'route-transition' })],
    final({ renderedShellPresent: true, stabilityReached: true, finalPath: '/ripple/' }),
    coverage,
  );
  expect(diagnostics.authenticatedRouteReached).toBe(false);
  expect(diagnostics.readinessConfirmed).toBe(false);
  expect(diagnostics.classification).toBe('OTHER_UNRESOLVED');
});

test('9. synthetic ineffective auth state is distinct from bootstrap failure', () => {
  expect(classifyBootstrapEvidence(completeInput({
    authState: 'ineffective',
    applicationEntryCompleted: true,
    renderedShellPresent: false,
    readinessConfirmed: false,
    routeTransitionObserved: false,
  }))).toBe('AUTH_STATE_REPLAY_INEFFECTIVE');
});

test('10. optional blocked support resource does not fail a successful bootstrap', () => {
  const optionalUrl = 'http://widget.synthetic.invalid/widget/synthetic';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      ...documentAndEntry(),
      request(optionalUrl, 'script', {
        verdict: 'block-optional-support',
        policyClassification: 'OPTIONAL_THIRD_PARTY_SUPPORT',
        policyHostClass: 'optional-third-party-support',
      }),
      event('requestfailed', {
        method: 'GET',
        url: optionalUrl,
        resourceType: 'script',
        verdict: 'block-optional-support',
        policyClassification: 'OPTIONAL_THIRD_PARTY_SUPPORT',
        failureCategory: 'policy-block',
      }),
      event('bootstrap', { category: 'route-transition' }),
    ],
    final({ renderedShellPresent: true, stabilityReached: true, finalPath: '/ripple/dashboard' }),
    coverage,
  );
  expect(diagnostics.scriptFailureCount).toBe(0);
  expect(diagnostics.failedCriticalResources).toHaveLength(0);
  expect(diagnostics.classification).toBe('APPLICATION_BOOTSTRAP_CONFIRMED');
});

test('11. a required synthetic resource blocked by policy remains a bootstrap failure', () => {
  const entryUrl = 'http://127.0.0.1:43111/ripple/static/js/app.synthetic.js';
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      event('navigation', { url: 'http://127.0.0.1:43111/ripple/' }),
      request('http://127.0.0.1:43111/ripple/', 'document'),
      response('http://127.0.0.1:43111/ripple/', 200, 'text/html', { resourceType: 'document' }),
      request(entryUrl, 'script', {
        verdict: 'block-telemetry',
        policyClassification: 'TELEMETRY',
        policyHostClass: 'telemetry',
      }),
      event('requestfailed', {
        method: 'GET',
        url: entryUrl,
        resourceType: 'script',
        verdict: 'block-telemetry',
        policyClassification: 'TELEMETRY',
        policyHostClass: 'telemetry',
        failureCategory: 'policy-block',
      }),
    ],
    final(),
    coverage,
  );
  expect(diagnostics.failedCriticalResources[0]).toMatchObject({
    resourceKind: 'application-entry',
    blocked: true,
    policyClassification: 'TELEMETRY',
    failureCategory: 'policy-block',
  });
  expect(diagnostics.classification).toBe('EXPECTED_RESOURCE_BLOCK_CAUSED_BOOTSTRAP_FAILURE');
});

test('12. complete document/body without app bootstrap never counts as readiness', () => {
  const diagnostics = buildRippleBootstrapDiagnostics(
    [
      event('navigation', { url: 'http://127.0.0.1:43111/ripple/' }),
      request('http://127.0.0.1:43111/ripple/', 'document'),
      response('http://127.0.0.1:43111/ripple/', 200, 'text/html', { resourceType: 'document' }),
    ],
    final(),
    coverage,
  );
  expect(diagnostics.documentLoaded).toBe(true);
  expect(diagnostics.applicationEntryObserved).toBe(false);
  expect(diagnostics.renderedShellPresent).toBe(false);
  expect(diagnostics.readinessConfirmed).toBe(false);
  expect(diagnostics.classification).toBe('OTHER_UNRESOLVED');
});

test('observer coverage gaps are explicitly classified without changing readiness', () => {
  expect(classifyBootstrapEvidence(completeInput({ observerBlindSpot: true }))).toBe('OBSERVER_BLIND_SPOT');
  expect(classifyBootstrapEvidence(completeInput({ deploymentSourceDivergence: true }))).toBe('DEPLOYMENT_SOURCE_DIVERGENCE');
  expect(classifyBootstrapEvidence(completeInput({ entryDocumentUnexpected: true }))).toBe('ENTRY_DOCUMENT_WRONG_OR_UNEXPECTED');
});
