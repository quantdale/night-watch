import { test, expect } from '@playwright/test';
import type { RunEvent } from '../../src/core/evidence/types';
import {
  buildRippleLifecycleDiagnostics,
  classifyAsyncBootstrapDependency,
} from '../../src/products/ripple/lifecycleDiagnostics';

let sequence = 0;
function event(type: RunEvent['type'], data: Record<string, unknown> = {}): RunEvent {
  return {
    seq: sequence++,
    ts: new Date(sequence * 1000).toISOString(),
    type,
    severity: 'info',
    message: 'synthetic',
    data,
  };
}

function documentEvent(phase: string, ordinal: number, extra: Record<string, unknown> = {}): RunEvent {
  return event('bootstrap', {
    category: 'document-lifecycle',
    phase,
    documentOrdinal: ordinal,
    frameIdClassification: 'main-frame',
    ...extra,
  });
}

function baseDocumentEvents(): RunEvent[] {
  return [
    event('navigation', { url: 'http://127.0.0.1:43111/ripple/' }),
    documentEvent('request', 1, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/',
      method: 'GET',
      navigationInitiatorCategory: 'browser',
      redirectChainPresent: false,
      replacesMainDocument: false,
    }),
    documentEvent('response', 1, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/',
      status: 200,
      contentType: 'text/html',
    }),
    documentEvent('domcontentloaded', 1),
    documentEvent('complete', 1),
    event('bootstrap', { category: 'bootstrap-target', phase: 'seen', elapsedMs: 5, path: '/ripple/' }),
  ];
}

function lifecycleInput(overrides: Record<string, unknown> = {}) {
  return {
    finalPath: '/ripple/',
    applicationEntryCompleted: true,
    storageStateLoadedBeforeNavigation: true,
    provenanceMatch: true,
    authRequiredStatePresent: true,
    renderedShellPresent: false,
    runtimeExceptionCount: 0,
    unhandledRejectionCount: 0,
    ...overrides,
  };
}

test('pre-mount target appears, is removed, shell appears, and authenticated route is confirmed structurally', () => {
  const events = [
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'route-transition', phase: 'pushState', path: '/ripple/dashboard' }),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 20, path: '/ripple/dashboard' }),
    event('bootstrap', { category: 'rendered-shell', phase: 'seen', elapsedMs: 22, path: '/ripple/dashboard' }),
  ];
  const diagnostics = buildRippleLifecycleDiagnostics(events, lifecycleInput({
    finalPath: '/ripple/dashboard',
    renderedShellPresent: true,
  }));
  expect(diagnostics.bootstrapTarget).toEqual({
    bootstrapMountTargetSeen: true,
    bootstrapMountTargetFirstSeenMs: 5,
    bootstrapMountTargetRemoved: true,
    bootstrapMountTargetRemovedMs: 20,
  });
  expect(diagnostics.renderedShellSeen).toBe(true);
  expect(diagnostics.routeTransitions).toMatchObject([{ method: 'pushState', path: '/ripple/dashboard' }]);
  expect(diagnostics.sourceDefinedAuthenticatedBootstrapBranchObserved).toBe(true);
  expect(diagnostics.authReplayEffectiveness).toBe('CONFIRMED');
});

test('target remains after complete entry with no error signal -> bootstrap stall candidate', () => {
  const diagnostics = buildRippleLifecycleDiagnostics(baseDocumentEvents(), lifecycleInput());
  expect(diagnostics.bootstrapProgress).toMatchObject({ classification: 'BOOTSTRAP_STALL_CANDIDATE' });
  expect(diagnostics.renderedShellSeen).toBe(false);
});

test('target never appears -> source/document mismatch candidate without readiness promotion', () => {
  const events = baseDocumentEvents().filter((item) => {
    const category = item.data?.category;
    return category !== 'bootstrap-target';
  });
  const diagnostics = buildRippleLifecycleDiagnostics(events, lifecycleInput());
  expect(diagnostics.bootstrapProgress.classification).toBe('NO_MOUNT_PROGRESS');
});

test('target removal without shell -> Vue initial patch observed, later branch unresolved', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 15, path: '/ripple/' }),
  ], lifecycleInput());
  expect(diagnostics.bootstrapProgress.classification).toBe('VUE_INITIAL_PATCH_OBSERVED');
  expect(diagnostics.postMountCheckpoints.vueInitialPatch).toBe(true);
  expect(diagnostics.postMountCheckpoints.initialRouteResolved).toBe(false);
  expect(diagnostics.postMountCheckpoints.qLayoutRendered).toBe(false);
});

test('source reload proof is distinct from resource-error correlation and server redirect', () => {
  const expectedEvents = [
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'resource-error-event', phase: 'resource-error', resourceKind: 'script', path: '/ripple/' }),
    event('bootstrap', {
      category: 'source-reload-signal',
      phase: 'reload-trigger',
      sourceReloadOwner: 'Ripple',
      sourceReloadPath: 'public/index.html',
      sourceReloadTrigger: 'script-or-link-error',
    }),
    documentEvent('request', 2, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/',
      method: 'GET',
      navigationInitiatorCategory: 'script',
      redirectChainPresent: false,
      replacesMainDocument: true,
    }),
    documentEvent('response', 2, { origin: 'http://127.0.0.1:43111', path: '/ripple/', status: 200, contentType: 'text/html' }),
  ];
  const expected = buildRippleLifecycleDiagnostics(expectedEvents, lifecycleInput());
  expect(expected.documentNavigationClassifications).toEqual(['SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD']);

  const correlatedOnly = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'resource-error-event', phase: 'resource-error', resourceKind: 'script', path: '/ripple/' }),
    documentEvent('request', 2, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/',
      method: 'GET',
      navigationInitiatorCategory: 'script',
      redirectChainPresent: false,
      replacesMainDocument: true,
    }),
  ], lifecycleInput());
  expect(correlatedOnly.documentNavigationClassifications).toEqual(['RELOAD_CAUSE_UNRESOLVED']);

  const noSignal = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    documentEvent('request', 2, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/',
      method: 'GET',
      navigationInitiatorCategory: 'script',
      redirectChainPresent: false,
      replacesMainDocument: true,
    }),
  ], lifecycleInput());
  expect(noSignal.documentNavigationClassifications).toEqual(['RELOAD_CAUSE_UNRESOLVED']);

  const serverRedirect = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    documentEvent('request', 2, {
      origin: 'http://127.0.0.1:43111',
      path: '/ripple/dashboard',
      method: 'GET',
      navigationInitiatorCategory: 'browser',
      redirectChainPresent: true,
      redirectStatus: 302,
      replacesMainDocument: true,
    }),
  ], lifecycleInput({ finalPath: '/ripple/dashboard' }));
  expect(serverRedirect.documentNavigationClassifications).toEqual(['SERVER_REDIRECT']);
});

test('history-mode router observation is fixed-primitive only and does not claim initialization', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'route-transition', phase: 'replaceState', path: '/ripple/dashboard' }),
    event('bootstrap', { category: 'post-mount-structure', phase: 'replacement', elapsedMs: 12,
      vueInitialPatchObserved: true, replacementNodeType: 'element', replacementTag: 'DIV',
      matchesDefaultLayout: true, matchesQLayout: true, rootBranch: 'default-layout' }),
    event('bootstrap', { category: 'rendered-shell', phase: 'seen', elapsedMs: 14, path: '/ripple/dashboard' }),
  ], lifecycleInput({
    finalPath: '/ripple/dashboard',
    renderedShellPresent: true,
    routeStable: true,
    routeStableMs: 900,
    stabilityReached: true,
  }));
  expect(diagnostics.postMountCheckpoints).toMatchObject({
    routerMode: 'history',
    routerInitialized: 'NOT_DIRECTLY_OBSERVABLE',
    initialRouteResolved: true,
    dashboardRouteActive: true,
    defaultLayoutRendered: true,
    qLayoutRendered: true,
    routeStable: true,
    routeStableMs: 900,
    stabilityReached: true,
  });
});

test('required auth state absent plus source login branch is ineffective, not merely unresolved', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...baseDocumentEvents(),
    event('bootstrap', { category: 'route-transition', phase: 'pushState', path: '/ripple/login' }),
  ], lifecycleInput({ authRequiredStatePresent: false, finalPath: '/ripple/login' }));
  expect(diagnostics.sourceDefinedUnauthenticatedBranchObserved).toBe(true);
  expect(diagnostics.authReplayEffectiveness).toBe('INEFFECTIVE');
});

test('silent async branches retain only fixed classification metadata', () => {
  expect(classifyAsyncBootstrapDependency({ state: 'pending', timeoutConfigured: false, rejectionHandled: false })).toMatchObject({
    classification: 'BOOTSTRAP_STALL',
    dependencyCategory: 'SOURCE_DEFINED_PRE_MOUNT_DEPENDENCY',
  });
  expect(classifyAsyncBootstrapDependency({ state: 'rejected', timeoutConfigured: false, rejectionHandled: true })).toMatchObject({
    classification: 'BOOTSTRAP_FAILURE_SWALLOWED',
    rejectionObserved: true,
    rejectionHandled: true,
  });
  expect(JSON.stringify(classifyAsyncBootstrapDependency({ state: 'rejected', timeoutConfigured: false, rejectionHandled: true })))
    .not.toContain('synthetic-secret');
});

test('lifecycle output does not retain query strings or opaque route values', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    event('bootstrap', { category: 'document-lifecycle', phase: 'request', documentOrdinal: 1, origin: 'http://127.0.0.1:43111', path: '/ripple/<ID>?token=synthetic-secret' }),
  ], lifecycleInput());
  const serialized = JSON.stringify(diagnostics);
  expect(serialized).not.toContain('synthetic-secret');
  expect(serialized).not.toContain('?');
  expect(diagnostics.documentLoads[0]?.path).toBe('/ripple/<ID>');
});
