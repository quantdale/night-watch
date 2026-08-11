// ---------------------------------------------------------------------------
// Ripple lifecycle/replay diagnostics.
//
// This module joins the fixed-category page-init events and the pre-navigation
// CDP document events. It produces structural evidence only; it never reads
// application internals, bodies, DOM text, storage values, or arbitrary stack
// text. The readiness contract remains in readiness.ts and is not changed by
// this diagnostic layer.
// ---------------------------------------------------------------------------

import type { RunEvent } from '../../core/evidence/types';
import {
  classifyAuthReplayEffectiveness,
  type AuthReplayEffectiveness,
} from './bootstrapContract';
import {
  RIPPLE_SOURCE_ROUTER_CONTRACT,
  type RippleRootRenderBranch,
} from './readiness';

export type DocumentNavigationClassification =
  | 'SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD'
  | 'NIGHTWATCH_INITIATED_RELOAD'
  | 'SOURCE_PROVEN_AUTH_RELOAD'
  | 'SOURCE_PROVEN_ENVIRONMENT_RELOAD'
  | 'SERVER_REDIRECT'
  | 'BROWSER_RETRY'
  | 'RELOAD_CAUSE_UNRESOLVED'
  | 'NOT_APPLICABLE';

export type DocumentInitiatorCategory =
  | 'parser'
  | 'script'
  | 'meta-refresh'
  | 'form'
  | 'history'
  | 'anchor'
  | 'reload'
  | 'client-redirect'
  | 'browser'
  | 'other'
  | 'unknown';

export interface DocumentLoadDiagnostic {
  ordinal: number;
  origin: string | null;
  path: string | null;
  method: string;
  status: number | null;
  contentType: string | null;
  redirectChainPresent: boolean;
  redirectStatus: number | null;
  navigationInitiatorCategory: DocumentInitiatorCategory;
  navigationInitiatorSourcePath: string | null;
  frameIdClassification: 'main-frame';
  replacesMainDocument: boolean;
  requestSeq: number | null;
  responseSeq: number | null;
  requestAt: string | null;
  responseAt: string | null;
  navigationClassification: DocumentNavigationClassification;
}

export interface RouteHistoryDiagnostic {
  method: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'go' | 'unknown';
  path: string;
  seq: number;
  ts: string;
}

export interface BootstrapTargetLifecycleDiagnostic {
  bootstrapMountTargetSeen: boolean;
  bootstrapMountTargetFirstSeenMs: number | null;
  bootstrapMountTargetRemoved: boolean;
  bootstrapMountTargetRemovedMs: number | null;
}

export type SourceReloadSignalKind =
  | 'public-index-script-or-link-error'
  | 'auth-logout'
  | 'environment-selection'
  | 'nightwatch'
  | 'unknown';

export interface PostMountReplacementDiagnostic {
  vueInitialPatchObserved: boolean;
  replacementNodeType: 'element' | 'comment' | 'text' | 'none' | 'unknown';
  replacementTag: string | null;
  matchesLoadingWrapper: boolean;
  matchesAuthLayout: boolean;
  matchesDefaultLayout: boolean;
  matchesQLayout: boolean;
  rootBranch: RippleRootRenderBranch;
  firstSeenMs: number | null;
}

export interface RipplePostMountCheckpoints {
  vueInitialPatch: boolean;
  rootRenderBranch: RippleRootRenderBranch;
  routerMode: typeof RIPPLE_SOURCE_ROUTER_CONTRACT.mode;
  routerInitialized: 'NOT_DIRECTLY_OBSERVABLE';
  routeActivityObserved: boolean;
  initialRouteResolved: boolean;
  defaultLayoutRendered: boolean;
  qLayoutRendered: boolean;
  dashboardRouteActive: boolean;
  routeStable: boolean;
  routeStableMs: number;
  stabilityReached: boolean;
}

export interface BootstrapProgressDiagnostic {
  classification:
    | 'BOOTSTRAP_STALL_CANDIDATE'
    | 'VUE_INITIAL_PATCH_OBSERVED'
    | 'NO_MOUNT_PROGRESS'
    | 'PROGRESS_UNKNOWN';
  evidence: string;
}

export interface DeploymentFingerprintDiagnostic {
  status: 'UNAVAILABLE';
  publicAssetUrlFingerprintObserved: boolean;
  comparison: 'UNAVAILABLE';
  reason: string;
}

export interface RippleLifecycleDiagnostics {
  documentLoads: DocumentLoadDiagnostic[];
  initialMainDocumentRequested: boolean;
  domContentLoadedCount: number;
  documentCompleteCount: number;
  subsequentFullDocumentNavigationCount: number;
  mainDocumentReplacedCount: number;
  bootstrapTarget: BootstrapTargetLifecycleDiagnostic;
  postMountReplacement: PostMountReplacementDiagnostic;
  postMountCheckpoints: RipplePostMountCheckpoints;
  renderedShellSeen: boolean;
  renderedShellFirstSeenMs: number | null;
  routeTransitions: RouteHistoryDiagnostic[];
  routeTransitionObserved: boolean;
  authHostNavigationSeen: boolean;
  sourceDefinedUnauthenticatedBranchObserved: boolean;
  sourceDefinedAuthenticatedBootstrapBranchObserved: boolean;
  authReplayEffectiveness: AuthReplayEffectiveness;
  documentNavigationClassifications: DocumentNavigationClassification[];
  sourceReloadSignalObserved: boolean;
  sourceReloadMarkerPresent: boolean;
  bootstrapProgress: BootstrapProgressDiagnostic;
  deploymentFingerprint: DeploymentFingerprintDiagnostic;
}

export type AsyncBootstrapDependencyState = 'pending' | 'resolved' | 'rejected';
export type AsyncBootstrapDependencyClassification =
  | 'BOOTSTRAP_STALL'
  | 'BOOTSTRAP_FAILURE_SWALLOWED'
  | 'BOOTSTRAP_FAILURE_UNHANDLED'
  | 'BOOTSTRAP_DEPENDENCY_RESOLVED';

export interface AsyncBootstrapDependencyDiagnostic {
  classification: AsyncBootstrapDependencyClassification;
  dependencyCategory: 'SOURCE_DEFINED_PRE_MOUNT_DEPENDENCY';
  timeoutConfigured: boolean;
  rejectionObserved: boolean;
  rejectionHandled: boolean;
}

/** Local/synthetic classifier for the two silent-async branches. */
export function classifyAsyncBootstrapDependency(input: {
  state: AsyncBootstrapDependencyState;
  timeoutConfigured: boolean;
  rejectionHandled: boolean;
}): AsyncBootstrapDependencyDiagnostic {
  if (input.state === 'pending') {
    return {
      classification: 'BOOTSTRAP_STALL',
      dependencyCategory: 'SOURCE_DEFINED_PRE_MOUNT_DEPENDENCY',
      timeoutConfigured: false,
      rejectionObserved: false,
      rejectionHandled: false,
    };
  }
  if (input.state === 'rejected') {
    return {
      classification: input.rejectionHandled ? 'BOOTSTRAP_FAILURE_SWALLOWED' : 'BOOTSTRAP_FAILURE_UNHANDLED',
      dependencyCategory: 'SOURCE_DEFINED_PRE_MOUNT_DEPENDENCY',
      timeoutConfigured: input.timeoutConfigured,
      rejectionObserved: true,
      rejectionHandled: input.rejectionHandled,
    };
  }
  return {
    classification: 'BOOTSTRAP_DEPENDENCY_RESOLVED',
    dependencyCategory: 'SOURCE_DEFINED_PRE_MOUNT_DEPENDENCY',
    timeoutConfigured: input.timeoutConfigured,
    rejectionObserved: false,
    rejectionHandled: false,
  };
}

function dataOf(event: RunEvent): Record<string, unknown> {
  return event.data ?? {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function safeMethod(value: unknown): string {
  if (value === 'GET' || value === 'POST' || value === 'HEAD') return value;
  return 'OTHER';
}

function safePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  const raw = value.split(/[?#]/, 1)[0] ?? '/';
  const safeSegments = new Set([
    'ripple',
    'dashboard',
    'login',
    'saml',
    'change-password',
    'error',
    'error500',
    'error-access-deny',
    '<ID>',
  ]);
  return raw.split('/').slice(0, 12).map((segment) => {
    if (segment === '') return '';
    return safeSegments.has(segment) ? segment : '<ID>';
  }).join('/') || '/';
}

function safeInitiator(value: unknown): DocumentInitiatorCategory {
  const allowed: readonly DocumentInitiatorCategory[] = [
    'parser',
    'script',
    'meta-refresh',
    'form',
    'history',
    'anchor',
    'reload',
    'client-redirect',
    'browser',
    'other',
    'unknown',
  ];
  return typeof value === 'string' && allowed.includes(value as DocumentInitiatorCategory)
    ? value as DocumentInitiatorCategory
    : 'unknown';
}

function safeRouteMethod(value: unknown): RouteHistoryDiagnostic['method'] {
  const allowed: readonly RouteHistoryDiagnostic['method'][] = [
    'pushState',
    'replaceState',
    'popstate',
    'hashchange',
    'go',
    'unknown',
  ];
  return typeof value === 'string' && allowed.includes(value as RouteHistoryDiagnostic['method'])
    ? value as RouteHistoryDiagnostic['method']
    : 'unknown';
}

interface MutableDocumentLoad {
  ordinal: number;
  origin: string | null;
  path: string | null;
  method: string;
  status: number | null;
  contentType: string | null;
  redirectChainPresent: boolean;
  redirectStatus: number | null;
  navigationInitiatorCategory: DocumentInitiatorCategory;
  navigationInitiatorSourcePath: string | null;
  frameIdClassification: 'main-frame';
  replacesMainDocument: boolean;
  requestSeq: number | null;
  responseSeq: number | null;
  requestAt: string | null;
  responseAt: string | null;
  navigationClassification: DocumentNavigationClassification;
}

function newDocumentLoad(ordinal: number): MutableDocumentLoad {
  return {
    ordinal,
    origin: null,
    path: null,
    method: 'GET',
    status: null,
    contentType: null,
    redirectChainPresent: false,
    redirectStatus: null,
    navigationInitiatorCategory: 'unknown',
    navigationInitiatorSourcePath: null,
    frameIdClassification: 'main-frame',
    replacesMainDocument: ordinal > 1,
    requestSeq: null,
    responseSeq: null,
    requestAt: null,
    responseAt: null,
    navigationClassification: 'NOT_APPLICABLE',
  };
}

function lifecycleEvents(events: readonly RunEvent[]): RunEvent[] {
  return events.filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'document-lifecycle');
}

function buildDocumentLoads(events: readonly RunEvent[]): MutableDocumentLoad[] {
  const cdpEvents = lifecycleEvents(events);
  if (cdpEvents.some((event) => dataOf(event).phase === 'request')) {
    const loads = new Map<number, MutableDocumentLoad>();
    for (const event of cdpEvents) {
      const data = dataOf(event);
      const ordinal = numberValue(data.documentOrdinal);
      if (ordinal === null || ordinal < 1) continue;
      const current = loads.get(ordinal) ?? newDocumentLoad(ordinal);
      const phase = data.phase;
      if (phase === 'request') {
        current.origin = stringValue(data.origin);
        current.path = safePath(data.path);
        current.method = safeMethod(data.method);
        current.redirectChainPresent = boolValue(data.redirectChainPresent);
        current.redirectStatus = numberValue(data.redirectStatus);
        current.navigationInitiatorCategory = safeInitiator(data.navigationInitiatorCategory);
        current.navigationInitiatorSourcePath = safePath(data.navigationInitiatorSourcePath);
        current.replacesMainDocument = boolValue(data.replacesMainDocument) || ordinal > 1;
        current.requestSeq = event.seq;
        current.requestAt = event.ts;
      } else if (phase === 'response') {
        current.origin = stringValue(data.origin) ?? current.origin;
        current.path = safePath(data.path) ?? current.path;
        current.status = numberValue(data.status);
        current.contentType = stringValue(data.contentType);
        current.responseSeq = event.seq;
        current.responseAt = event.ts;
      }
      loads.set(ordinal, current);
    }
    return [...loads.values()].sort((a, b) => a.ordinal - b.ordinal);
  }

  // Compatibility fallback for pre-instrumentation artifacts and pure local
  // synthetic event fixtures. The future real observer uses the CDP branch.
  const loads: MutableDocumentLoad[] = [];
  const pending: MutableDocumentLoad[] = [];
  for (const event of events) {
    if (event.type !== 'request' && event.type !== 'response') continue;
    const data = dataOf(event);
    if (data.resourceType !== 'document') continue;
    if (event.type === 'request') {
      const load = newDocumentLoad(loads.length + 1);
      load.origin = stringValue(data.origin);
      load.path = safePath(data.path) ?? (() => {
        const rawUrl = stringValue(data.url);
        if (rawUrl === null) return null;
        try {
          return safePath(new URL(rawUrl).pathname);
        } catch {
          return null;
        }
      })();
      load.method = safeMethod(data.method);
      load.requestSeq = event.seq;
      load.requestAt = event.ts;
      load.navigationInitiatorCategory = safeInitiator(data.navigationInitiatorCategory);
      loads.push(load);
      pending.push(load);
    } else {
      const load = pending.find((candidate) => candidate.responseSeq === null);
      if (load === undefined) continue;
      load.status = numberValue(data.status);
      load.contentType = stringValue(data.contentType);
      load.responseSeq = event.seq;
      load.responseAt = event.ts;
    }
  }
  return loads;
}

function authHostMatches(origin: string | null, authHosts: readonly string[]): boolean {
  if (origin === null) return false;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return authHosts.some((entry) => {
      const normalized = entry.toLowerCase().replace(/^\*\./, '');
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

export interface DocumentNavigationClassificationInput {
  initiator: DocumentInitiatorCategory;
  serverRedirect: boolean;
  resourceErrorBefore: boolean;
  sourceBootstrapReloadSignalBefore: boolean;
  sourceAuthReloadSignal: boolean;
  sourceEnvironmentReloadSignal: boolean;
  nightwatchInitiated: boolean;
}

/**
 * Correlation is intentionally weaker than causation. A resource error before
 * a same-path reload is unresolved unless the fixed source reload signal was
 * also observed. This prevents the previous EXPECTED_BOOTSTRAP_RELOAD label
 * from being assigned from timing alone, and it means a bare prior request
 * failure can never earn BROWSER_RETRY (which has no source-proven observation
 * mechanism in the current Nightwatch model).
 */
export function classifyDocumentNavigation(
  input: DocumentNavigationClassificationInput,
): DocumentNavigationClassification {
  if (input.serverRedirect) return 'SERVER_REDIRECT';
  if (input.nightwatchInitiated) return 'NIGHTWATCH_INITIATED_RELOAD';
  if (input.sourceAuthReloadSignal) return 'SOURCE_PROVEN_AUTH_RELOAD';
  if (input.sourceEnvironmentReloadSignal) return 'SOURCE_PROVEN_ENVIRONMENT_RELOAD';
  if (
    (input.initiator === 'script' || input.initiator === 'reload') &&
    input.sourceBootstrapReloadSignalBefore
  ) {
    return 'SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD';
  }
  // A prior request failure correlated with a same-path reload is NOT proof of
  // a browser retry: browser-retry behavior has no source-proven signal in the
  // current model, and the relying code previously could over-claim causation
  // from timing alone. Such cases are honestly left UNRESOLVED.
  if (
    input.resourceErrorBefore &&
    (input.initiator === 'script' || input.initiator === 'reload')
  ) {
    return 'RELOAD_CAUSE_UNRESOLVED';
  }
  if (input.initiator === 'script' || input.initiator === 'reload' || input.initiator === 'meta-refresh') {
    return 'RELOAD_CAUSE_UNRESOLVED';
  }
  return 'RELOAD_CAUSE_UNRESOLVED';
}

function classifyDocumentLoads(
  loads: MutableDocumentLoad[],
  events: readonly RunEvent[],
): void {
  const resourceErrorSeqs = events
    .filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'resource-error-event')
    .map((event) => event.seq);
  const sourceBootstrapReloadSignalSeqs = events
    .filter((event) => event.type === 'bootstrap' &&
      dataOf(event).category === 'source-reload-signal' &&
      dataOf(event).phase === 'reload-trigger' &&
      dataOf(event).sourceReloadPath === 'public/index.html')
    .map((event) => event.seq);
  const sourceAuthReloadSignalSeqs = events
    .filter((event) => event.type === 'bootstrap' &&
      dataOf(event).category === 'source-reload-signal' &&
      dataOf(event).sourceReloadOwner === 'Ripple' &&
      dataOf(event).sourceReloadTrigger === 'auth-logout')
    .map((event) => event.seq);
  const sourceEnvironmentReloadSignalSeqs = events
    .filter((event) => event.type === 'bootstrap' &&
      dataOf(event).category === 'source-reload-signal' &&
      dataOf(event).sourceReloadOwner === 'Ripple' &&
      dataOf(event).sourceReloadTrigger === 'environment-selection')
    .map((event) => event.seq);
  const nightwatchReloadSignalSeqs = events
    .filter((event) => event.type === 'bootstrap' &&
      dataOf(event).category === 'source-reload-signal' &&
      dataOf(event).sourceReloadOwner === 'Nightwatch')
    .map((event) => event.seq);
  for (const load of loads) {
    if (load.ordinal === 1) {
      load.navigationClassification = 'NOT_APPLICABLE';
      continue;
    }
    const previous = loads.find((candidate) => candidate.ordinal === load.ordinal - 1);
    const previousSeq = previous?.requestSeq ?? -1;
    const beforeCurrentLoad = (seq: number): boolean =>
      seq > previousSeq && (load.requestSeq === null || seq < load.requestSeq);
    const resourceErrorBefore = resourceErrorSeqs.some(beforeCurrentLoad);
    const sourceBootstrapReloadSignalBefore = sourceBootstrapReloadSignalSeqs.some(beforeCurrentLoad);
    const sourceAuthReloadSignal = sourceAuthReloadSignalSeqs.some(beforeCurrentLoad);
    const sourceEnvironmentReloadSignal = sourceEnvironmentReloadSignalSeqs.some(beforeCurrentLoad);
    const nightwatchInitiated = nightwatchReloadSignalSeqs.some(beforeCurrentLoad);
    load.navigationClassification = classifyDocumentNavigation({
      initiator: load.navigationInitiatorCategory,
      serverRedirect: load.redirectChainPresent ||
        (load.redirectStatus !== null && load.redirectStatus >= 300 && load.redirectStatus < 400),
      resourceErrorBefore,
      sourceBootstrapReloadSignalBefore,
      sourceAuthReloadSignal,
      sourceEnvironmentReloadSignal,
      nightwatchInitiated,
    });
  }
}

function bootstrapTarget(events: readonly RunEvent[]): BootstrapTargetLifecycleDiagnostic {
  const targetEvents = events.filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'bootstrap-target');
  const seen = targetEvents.filter((event) => dataOf(event).phase === 'seen');
  const removed = targetEvents.filter((event) => dataOf(event).phase === 'removed');
  const firstSeen = seen.map((event) => numberValue(dataOf(event).elapsedMs)).filter((value): value is number => value !== null);
  const firstRemoved = removed.map((event) => numberValue(dataOf(event).elapsedMs)).filter((value): value is number => value !== null);
  return {
    bootstrapMountTargetSeen: seen.length > 0,
    bootstrapMountTargetFirstSeenMs: firstSeen.length > 0 ? Math.min(...firstSeen) : null,
    bootstrapMountTargetRemoved: removed.length > 0,
    bootstrapMountTargetRemovedMs: firstRemoved.length > 0 ? Math.min(...firstRemoved) : null,
  };
}

function safeReplacementNodeType(value: unknown): PostMountReplacementDiagnostic['replacementNodeType'] {
  const allowed: readonly PostMountReplacementDiagnostic['replacementNodeType'][] = [
    'element',
    'comment',
    'text',
    'none',
    'unknown',
  ];
  return typeof value === 'string' && allowed.includes(value as PostMountReplacementDiagnostic['replacementNodeType'])
    ? value as PostMountReplacementDiagnostic['replacementNodeType']
    : 'unknown';
}

function safeRootBranch(value: unknown): RippleRootRenderBranch {
  const allowed: readonly RippleRootRenderBranch[] = [
    'loading-wrapper',
    'auth-layout',
    'default-layout',
    'q-layout',
    'comment-vnode',
    'text-node',
    'none',
    'unknown-element',
    'unknown',
  ];
  return typeof value === 'string' && allowed.includes(value as RippleRootRenderBranch)
    ? value as RippleRootRenderBranch
    : 'unknown';
}

function safeReplacementTag(value: unknown): string | null {
  const allowed = new Set([
    'DIV',
    'SPAN',
    'P',
    'SECTION',
    'MAIN',
    'ASIDE',
    'HEADER',
    'FOOTER',
    'NAV',
    'UL',
    'LI',
  ]);
  return typeof value === 'string' && allowed.has(value) ? value : null;
}

function postMountReplacement(events: readonly RunEvent[]): PostMountReplacementDiagnostic {
  const replacement = events.find((event) =>
    event.type === 'bootstrap' &&
    dataOf(event).category === 'post-mount-structure' &&
    dataOf(event).phase === 'replacement',
  );
  if (replacement === undefined) {
    return {
      vueInitialPatchObserved: false,
      replacementNodeType: 'unknown',
      replacementTag: null,
      matchesLoadingWrapper: false,
      matchesAuthLayout: false,
      matchesDefaultLayout: false,
      matchesQLayout: false,
      rootBranch: 'unknown',
      firstSeenMs: null,
    };
  }
  const data = dataOf(replacement);
  const replacementTag = safeReplacementTag(data.replacementTag);
  return {
    vueInitialPatchObserved: data.vueInitialPatchObserved === true,
    replacementNodeType: safeReplacementNodeType(data.replacementNodeType),
    replacementTag,
    matchesLoadingWrapper: data.matchesLoadingWrapper === true,
    matchesAuthLayout: data.matchesAuthLayout === true,
    matchesDefaultLayout: data.matchesDefaultLayout === true,
    matchesQLayout: data.matchesQLayout === true,
    rootBranch: safeRootBranch(data.rootBranch),
    firstSeenMs: numberValue(data.elapsedMs),
  };
}

function isSourceApprovedRoute(path: string | null): boolean {
  return path === '/ripple/' ||
    path === '/ripple/dashboard' ||
    path === '/ripple/login' ||
    path === '/ripple/saml' ||
    path === '/ripple/change-password' ||
    path === '/ripple/error' ||
    path === '/ripple/error500' ||
    path === '/ripple/error-access-deny';
}

function isSourceResolvedRoute(path: string | null): boolean {
  return isSourceApprovedRoute(path) && path !== '/ripple/';
}

function postMountCheckpointsForLifecycle(input: {
  target: BootstrapTargetLifecycleDiagnostic;
  replacement: PostMountReplacementDiagnostic;
  renderedShellSeen: boolean;
  routeTransitions: RouteHistoryDiagnostic[];
  finalPath: string | null;
  routeStable: boolean;
  routeStableMs: number;
  stabilityReached: boolean;
}): RipplePostMountCheckpoints {
  const dashboardRouteActive = input.finalPath === '/ripple/dashboard' ||
    input.routeTransitions.some((route) => route.path === '/ripple/dashboard');
  const defaultLayoutRendered = input.replacement.matchesDefaultLayout || input.renderedShellSeen;
  const qLayoutRendered = input.replacement.matchesQLayout || input.renderedShellSeen;
  const vueInitialPatch = input.target.bootstrapMountTargetRemoved || input.replacement.vueInitialPatchObserved;
  return {
    vueInitialPatch,
    rootRenderBranch: input.replacement.rootBranch,
    routerMode: RIPPLE_SOURCE_ROUTER_CONTRACT.mode,
    routerInitialized: 'NOT_DIRECTLY_OBSERVABLE',
    routeActivityObserved: input.routeTransitions.length > 0 || dashboardRouteActive,
    initialRouteResolved: isSourceResolvedRoute(input.finalPath) || input.routeTransitions.some((route) => isSourceResolvedRoute(route.path)),
    defaultLayoutRendered,
    qLayoutRendered,
    dashboardRouteActive,
    routeStable: input.routeStable,
    routeStableMs: input.routeStableMs,
    stabilityReached: input.stabilityReached,
  };
}

function routes(events: readonly RunEvent[]): RouteHistoryDiagnostic[] {
  return events
    .filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'route-transition')
    .map((event): RouteHistoryDiagnostic | null => {
      const path = safePath(dataOf(event).path);
      if (path === null) return null;
      return { method: safeRouteMethod(dataOf(event).phase), path, seq: event.seq, ts: event.ts };
    })
    .filter((value): value is RouteHistoryDiagnostic => value !== null);
}

function bootstrapProgress(
  input: {
    documentComplete: boolean;
    applicationEntryCompleted: boolean;
    target: BootstrapTargetLifecycleDiagnostic;
    renderedShellSeen: boolean;
    runtimeExceptionCount: number;
    unhandledRejectionCount: number;
  },
): BootstrapProgressDiagnostic {
  if (
    input.documentComplete &&
    input.applicationEntryCompleted &&
    input.target.bootstrapMountTargetSeen &&
    !input.target.bootstrapMountTargetRemoved &&
    !input.renderedShellSeen &&
    input.runtimeExceptionCount === 0 &&
    input.unhandledRejectionCount === 0
  ) {
    return {
      classification: 'BOOTSTRAP_STALL_CANDIDATE',
      evidence: 'document complete and application entry completed, but the pre-mount target remained without a runtime error signal',
    };
  }
  if (input.target.bootstrapMountTargetRemoved) {
    return {
      classification: 'VUE_INITIAL_PATCH_OBSERVED',
      evidence: input.renderedShellSeen
        ? 'the pre-mount target was removed and a source-backed rendered shell was observed'
        : 'the pre-mount target was removed; complete root-branch and route progression remain unresolved',
    };
  }
  if (!input.target.bootstrapMountTargetSeen && !input.renderedShellSeen) {
    return {
      classification: 'NO_MOUNT_PROGRESS',
      evidence: 'neither the pre-mount target nor the rendered shell was observed',
    };
  }
  return { classification: 'PROGRESS_UNKNOWN', evidence: 'lifecycle signals are insufficient for a narrower branch' };
}

export interface BuildRippleLifecycleDiagnosticsInput {
  finalPath: string | null;
  applicationEntryCompleted: boolean;
  authHosts?: readonly string[];
  storageStateLoadedBeforeNavigation: boolean;
  provenanceMatch: boolean;
  authRequiredStatePresent: boolean;
  renderedShellPresent: boolean;
  runtimeExceptionCount: number;
  unhandledRejectionCount: number;
  /** Readiness samples are passed through as bounded scalar evidence only. */
  routeStable?: boolean;
  routeStableMs?: number;
  stabilityReached?: boolean;
}

export function buildRippleLifecycleDiagnostics(
  events: readonly RunEvent[],
  input: BuildRippleLifecycleDiagnosticsInput,
): RippleLifecycleDiagnostics {
  const loads = buildDocumentLoads(events);
  classifyDocumentLoads(loads, events);
  const target = bootstrapTarget(events);
  const replacement = postMountReplacement(events);
  const routeTransitions = routes(events);
  const finalPath = safePath(input.finalPath);
  const routePaths = routeTransitions.map((route) => route.path);
  const sourceDefinedUnauthenticatedBranchObserved = routePaths.includes('/ripple/login') || finalPath === '/ripple/login';
  const sourceDefinedAuthenticatedBootstrapBranchObserved = routePaths.includes('/ripple/dashboard') || finalPath === '/ripple/dashboard';
  const authHostNavigationSeen = loads.some((load) => authHostMatches(load.origin, input.authHosts ?? []));
  const renderedShellEvents = events.filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'rendered-shell' && dataOf(event).phase === 'seen');
  const shellTimings = renderedShellEvents.map((event) => numberValue(dataOf(event).elapsedMs)).filter((value): value is number => value !== null);
  const renderedShellSeen = renderedShellEvents.length > 0 || input.renderedShellPresent;
  const routeStableMs = numberValue(input.routeStableMs) === null
    ? 0
    : Math.max(0, Math.min(120_000, Math.round(numberValue(input.routeStableMs) ?? 0)));
  const routeStable = input.routeStable === true;
  const stabilityReached = input.stabilityReached === true;
  const postMountCheckpoints = postMountCheckpointsForLifecycle({
    target,
    replacement,
    renderedShellSeen,
    routeTransitions,
    finalPath,
    routeStable,
    routeStableMs,
    stabilityReached,
  });
  const sourceReloadSignalObserved = events.some((event) =>
    event.type === 'bootstrap' &&
    dataOf(event).category === 'source-reload-signal' &&
    dataOf(event).phase === 'reload-trigger',
  );
  const sourceReloadMarkerPresent = events.some((event) =>
    event.type === 'bootstrap' &&
    dataOf(event).category === 'source-reload-signal' &&
    dataOf(event).phase === 'marker-present' &&
    dataOf(event).sourceReloadMarkerPresent === true,
  );
  const documentCompleteKeys = new Set(
    lifecycleEvents(events)
      .filter((event) => dataOf(event).phase === 'complete' && (numberValue(dataOf(event).documentOrdinal) ?? 0) > 0)
      .map((event) => `${String(dataOf(event).documentOrdinal)}|complete`),
  );
  const lifecycleReplaced = lifecycleEvents(events).filter((event) => dataOf(event).phase === 'replaced' && dataOf(event).replacesMainDocument === true).length;
  const documentNavigationClassifications = loads
    .filter((load) => load.ordinal > 1)
    .map((load) => load.navigationClassification);
  const firstAssetFingerprintObserved = events.some((event) => {
    if (event.type !== 'request' && event.type !== 'response') return false;
    const data = dataOf(event);
    if (data.resourceType !== 'script') return false;
    const url = stringValue(data.url);
    return url !== null && /\/static\/js\/(?:app|chunk-vendors)\.[^/?]+\.js$/i.test(url);
  });
  const lifecycle: RippleLifecycleDiagnostics = {
    documentLoads: loads,
    initialMainDocumentRequested: loads.some((load) => load.ordinal === 1 && load.requestSeq !== null),
    domContentLoadedCount: new Set(
      lifecycleEvents(events)
        .filter((event) => dataOf(event).phase === 'domcontentloaded' && (numberValue(dataOf(event).documentOrdinal) ?? 0) > 0)
        .map((event) => String(dataOf(event).documentOrdinal)),
    ).size,
    documentCompleteCount: documentCompleteKeys.size,
    subsequentFullDocumentNavigationCount: loads.filter((load) => load.ordinal > 1).length,
    mainDocumentReplacedCount: lifecycleReplaced > 0 ? lifecycleReplaced : Math.max(0, loads.filter((load) => load.ordinal > 1).length),
    bootstrapTarget: target,
    postMountReplacement: replacement,
    postMountCheckpoints,
    renderedShellSeen,
    renderedShellFirstSeenMs: shellTimings.length > 0 ? Math.min(...shellTimings) : null,
    routeTransitions,
    routeTransitionObserved: routeTransitions.length > 0,
    authHostNavigationSeen,
    sourceDefinedUnauthenticatedBranchObserved,
    sourceDefinedAuthenticatedBootstrapBranchObserved,
    authReplayEffectiveness: classifyAuthReplayEffectiveness({
      storageStateLoadedBeforeNavigation: input.storageStateLoadedBeforeNavigation,
      provenanceMatch: input.provenanceMatch,
      authRequiredStatePresent: input.authRequiredStatePresent,
      authHostNavigationSeen,
      sourceDefinedUnauthenticatedBranchObserved,
      sourceDefinedAuthenticatedBootstrapBranchObserved,
    }),
    documentNavigationClassifications,
    sourceReloadSignalObserved,
    sourceReloadMarkerPresent,
    bootstrapProgress: bootstrapProgress({
      documentComplete: documentCompleteKeys.size > 0,
      applicationEntryCompleted: input.applicationEntryCompleted,
      target,
      renderedShellSeen,
      runtimeExceptionCount: input.runtimeExceptionCount,
      unhandledRejectionCount: input.unhandledRejectionCount,
    }),
    deploymentFingerprint: {
      status: 'UNAVAILABLE',
      publicAssetUrlFingerprintObserved: firstAssetFingerprintObserved,
      comparison: 'UNAVAILABLE',
      reason: 'public bundle URL basenames are observable, but the checked-out Ripple repository has no defensible committed deployment-manifest/build comparison for this run',
    },
  };
  return lifecycle;
}
