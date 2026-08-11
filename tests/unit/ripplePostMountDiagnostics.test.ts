// Local-only post-mount/router/reload fixtures. These cases contain fixed
// structural metadata only; no Alphaus traffic, storage values, DOM text, or
// arbitrary runtime classes are used.

import { test, expect } from '@playwright/test';
import type { RunEvent } from '../../src/core/evidence/types';
import { validateRippleSemanticState } from '../../src/products/ripple/bootstrapContract';
import {
  buildRippleLifecycleDiagnostics,
  classifyDocumentNavigation,
  type BuildRippleLifecycleDiagnosticsInput,
} from '../../src/products/ripple/lifecycleDiagnostics';

let sequence = 10_000;
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

function documentEvents(): RunEvent[] {
  return [
    event('bootstrap', {
      category: 'document-lifecycle', phase: 'request', documentOrdinal: 1,
      origin: 'http://127.0.0.1:43111', path: '/ripple/', method: 'GET',
      navigationInitiatorCategory: 'browser', replacesMainDocument: false,
    }),
    event('bootstrap', {
      category: 'document-lifecycle', phase: 'response', documentOrdinal: 1,
      origin: 'http://127.0.0.1:43111', path: '/ripple/', status: 200, contentType: 'text/html',
    }),
    event('bootstrap', { category: 'document-lifecycle', phase: 'complete', documentOrdinal: 1 }),
    event('bootstrap', { category: 'bootstrap-target', phase: 'seen', elapsedMs: 10, path: '/ripple/' }),
  ];
}

function replacement(rootBranch: string, flags: Record<string, boolean> = {}): RunEvent {
  return event('bootstrap', {
    category: 'post-mount-structure',
    phase: 'replacement',
    elapsedMs: 20,
    vueInitialPatchObserved: true,
    replacementNodeType: rootBranch === 'comment-vnode' ? 'comment' : 'element',
    replacementTag: rootBranch === 'comment-vnode' ? undefined : 'DIV',
    rootBranch,
    ...flags,
  });
}

function lifecycleInput(overrides: Partial<BuildRippleLifecycleDiagnosticsInput> = {}): BuildRippleLifecycleDiagnosticsInput {
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

test('1. expected root element proves the Vue initial patch boundary without changing readiness', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('default-layout', { matchesDefaultLayout: true, matchesQLayout: true }),
  ], lifecycleInput());
  expect(diagnostics.postMountReplacement).toMatchObject({
    vueInitialPatchObserved: true,
    replacementNodeType: 'element',
    replacementTag: 'DIV',
    rootBranch: 'default-layout',
  });
  expect(diagnostics.bootstrapProgress.classification).toBe('VUE_INITIAL_PATCH_OBSERVED');
  expect(diagnostics.postMountCheckpoints.qLayoutRendered).toBe(true);
  expect(diagnostics.postMountCheckpoints.stabilityReached).toBe(false);
});

test('2. comment VNode is a real initial patch branch but not a rendered shell', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('comment-vnode'),
  ], lifecycleInput());
  expect(diagnostics.postMountReplacement).toMatchObject({
    vueInitialPatchObserved: true,
    replacementNodeType: 'comment',
    replacementTag: null,
    rootBranch: 'comment-vnode',
  });
  expect(diagnostics.postMountCheckpoints).toMatchObject({
    vueInitialPatch: true,
    initialRouteResolved: false,
    defaultLayoutRendered: false,
    qLayoutRendered: false,
  });
});

test('3. source-backed loading wrapper is distinguished from the authenticated layout', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('loading-wrapper', { matchesLoadingWrapper: true }),
  ], lifecycleInput());
  expect(diagnostics.postMountReplacement.rootBranch).toBe('loading-wrapper');
  expect(diagnostics.postMountReplacement.matchesLoadingWrapper).toBe(true);
  expect(diagnostics.postMountCheckpoints.defaultLayoutRendered).toBe(false);
  expect(diagnostics.postMountCheckpoints.qLayoutRendered).toBe(false);
});

test('4. source-proven dashboard route activity completes the route checkpoint', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('default-layout', { matchesDefaultLayout: true, matchesQLayout: true }),
    event('bootstrap', { category: 'rendered-shell', phase: 'seen', elapsedMs: 30, path: '/ripple/dashboard' }),
    event('bootstrap', { category: 'route-transition', phase: 'replaceState', path: '/ripple/dashboard' }),
  ], lifecycleInput({
    finalPath: '/ripple/dashboard',
    renderedShellPresent: true,
  }));
  expect(diagnostics.postMountCheckpoints).toMatchObject({
    initialRouteResolved: true,
    dashboardRouteActive: true,
    defaultLayoutRendered: true,
    qLayoutRendered: true,
  });
});

test('5. Vue patches while the router remains unresolved keeps route and layout checkpoints false', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('loading-wrapper', { matchesLoadingWrapper: true }),
  ], lifecycleInput());
  expect(diagnostics.postMountCheckpoints.vueInitialPatch).toBe(true);
  expect(diagnostics.postMountCheckpoints.initialRouteResolved).toBe(false);
  expect(diagnostics.postMountCheckpoints.dashboardRouteActive).toBe(false);
  expect(diagnostics.postMountCheckpoints.qLayoutRendered).toBe(false);
});

test('6. a cancelled initial guard is distinguishable from script failure by clean patch evidence', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('comment-vnode'),
  ], lifecycleInput({ finalPath: '/ripple/' }));
  expect(diagnostics.bootstrapProgress.classification).toBe('VUE_INITIAL_PATCH_OBSERVED');
  expect(diagnostics.postMountCheckpoints.initialRouteResolved).toBe(false);
  expect(diagnostics.postMountCheckpoints.routerInitialized).toBe('NOT_DIRECTLY_OBSERVABLE');
  expect(diagnostics.bootstrapProgress.classification).toBe('VUE_INITIAL_PATCH_OBSERVED');
});

test('7. semantic auth/environment checks remain booleans even when all keys are present', () => {
  const presence = { authTokenPresent: true, apiTypePresent: true, appTypePresent: true };
  const semantic = validateRippleSemanticState({
    ...presence,
    authTokenStructurallyNonEmpty: true,
    apiTypeMatchesSelectedEnvironment: false,
    appTypeMatchesRippleApplication: false,
  });
  expect(presence).toEqual({ authTokenPresent: true, apiTypePresent: true, appTypePresent: true });
  expect(semantic).toEqual({
    authTokenStructurallyNonEmpty: true,
    environmentStateMatchesSelectedDev: false,
    applicationStateMatchesRipple: false,
    requiredBootstrapStateSemanticallyValid: false,
  });
  expect(JSON.stringify(semantic)).not.toContain('synthetic');
});

test('8 and 10. same-path reload is proven only with a source signal; timing correlation alone stays unresolved', () => {
  expect(classifyDocumentNavigation({
    initiator: 'reload',
    serverRedirect: false,
    resourceErrorBefore: true,
    sourceBootstrapReloadSignalBefore: true,
    sourceAuthReloadSignal: false,
    sourceEnvironmentReloadSignal: false,
    nightwatchInitiated: false,
    priorRequestFailure: false,
  })).toBe('SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD');
  expect(classifyDocumentNavigation({
    initiator: 'reload',
    serverRedirect: false,
    resourceErrorBefore: true,
    sourceBootstrapReloadSignalBefore: false,
    sourceAuthReloadSignal: false,
    sourceEnvironmentReloadSignal: false,
    nightwatchInitiated: false,
    priorRequestFailure: false,
  })).toBe('RELOAD_CAUSE_UNRESOLVED');
});

test('9. Nightwatch reload evidence has priority over application-resource correlation', () => {
  expect(classifyDocumentNavigation({
    initiator: 'reload',
    serverRedirect: false,
    resourceErrorBefore: true,
    sourceBootstrapReloadSignalBefore: true,
    sourceAuthReloadSignal: false,
    sourceEnvironmentReloadSignal: false,
    nightwatchInitiated: true,
    priorRequestFailure: false,
  })).toBe('NIGHTWATCH_INITIATED_RELOAD');
});

test('11. an expected blocked background resource does not become a reload cause by itself', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'resource-error-event', phase: 'resource-error', resourceKind: 'script' }),
  ], lifecycleInput());
  expect(diagnostics.sourceReloadSignalObserved).toBe(false);
  expect(diagnostics.documentNavigationClassifications).toEqual([]);
});

test('12. complete source-backed progression includes continuous stability metadata', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', { category: 'bootstrap-target', phase: 'removed', elapsedMs: 21 }),
    replacement('default-layout', { matchesDefaultLayout: true, matchesQLayout: true }),
    event('bootstrap', { category: 'rendered-shell', phase: 'seen', elapsedMs: 30, path: '/ripple/dashboard' }),
    event('bootstrap', { category: 'route-transition', phase: 'replaceState', path: '/ripple/dashboard' }),
  ], lifecycleInput({
    finalPath: '/ripple/dashboard',
    renderedShellPresent: true,
    routeStable: true,
    routeStableMs: 750,
    stabilityReached: true,
  }));
  expect(diagnostics.postMountCheckpoints).toMatchObject({
    vueInitialPatch: true,
    rootRenderBranch: 'default-layout',
    initialRouteResolved: true,
    defaultLayoutRendered: true,
    qLayoutRendered: true,
    dashboardRouteActive: true,
    routeStable: true,
    routeStableMs: 750,
    stabilityReached: true,
  });
});

test('13. structural diagnostics use only the approved vocabulary and persist no arbitrary values', () => {
  const diagnostics = buildRippleLifecycleDiagnostics([
    ...documentEvents(),
    event('bootstrap', {
      category: 'post-mount-structure', phase: 'replacement',
      vueInitialPatchObserved: true, replacementNodeType: 'element', replacementTag: 'customer-secret-tag',
      rootBranch: 'default-layout', matchesDefaultLayout: true, matchesQLayout: true,
      arbitraryClassName: 'customer-secret-class', textContent: 'customer-secret-text',
    }),
  ], lifecycleInput());
  const serialized = JSON.stringify(diagnostics);
  expect(serialized).not.toContain('customer-secret');
  expect(diagnostics.postMountReplacement).toMatchObject({
    replacementNodeType: 'element', replacementTag: null, rootBranch: 'default-layout',
  });
});
