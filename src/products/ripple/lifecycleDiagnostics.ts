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

export type DocumentNavigationClassification =
  | 'EXPECTED_BOOTSTRAP_RELOAD'
  | 'AUTH_STATE_BRANCH_RELOAD'
  | 'APP_INITIATED_RELOAD'
  | 'SERVER_REDIRECT'
  | 'BROWSER_RETRY'
  | 'UNKNOWN';

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

export interface BootstrapProgressDiagnostic {
  classification:
    | 'BOOTSTRAP_STALL_CANDIDATE'
    | 'POST_MOUNT_RENDER_FAILURE_CANDIDATE'
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
  renderedShellSeen: boolean;
  renderedShellFirstSeenMs: number | null;
  routeTransitions: RouteHistoryDiagnostic[];
  routeTransitionObserved: boolean;
  authHostNavigationSeen: boolean;
  sourceDefinedUnauthenticatedBranchObserved: boolean;
  sourceDefinedAuthenticatedBootstrapBranchObserved: boolean;
  authReplayEffectiveness: AuthReplayEffectiveness;
  documentNavigationClassifications: DocumentNavigationClassification[];
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
    navigationClassification: 'UNKNOWN',
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

function classifyDocumentLoads(
  loads: MutableDocumentLoad[],
  events: readonly RunEvent[],
  authRequiredStatePresent: boolean,
): void {
  const resourceErrorSeqs = events
    .filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'resource-error-event')
    .map((event) => event.seq);
  const requestFailureSeqs = events
    .filter((event) => event.type === 'requestfailed')
    .map((event) => event.seq);
  for (const load of loads) {
    if (load.ordinal === 1) {
      load.navigationClassification = 'UNKNOWN';
      continue;
    }
    if (load.redirectChainPresent || (load.redirectStatus !== null && load.redirectStatus >= 300 && load.redirectStatus < 400)) {
      load.navigationClassification = 'SERVER_REDIRECT';
      continue;
    }
    const previous = loads.find((candidate) => candidate.ordinal === load.ordinal - 1);
    const previousSeq = previous?.requestSeq ?? -1;
    const resourceErrorBefore = resourceErrorSeqs.some((seq) =>
      seq > previousSeq &&
      (load.requestSeq === null || seq < load.requestSeq || load.responseSeq === null || seq < load.responseSeq),
    );
    if (load.path === '/ripple/login' && !authRequiredStatePresent) {
      load.navigationClassification = 'AUTH_STATE_BRANCH_RELOAD';
      continue;
    }
    if (
      load.navigationInitiatorCategory === 'meta-refresh' ||
      ((load.navigationInitiatorCategory === 'script' || load.navigationInitiatorCategory === 'reload') && resourceErrorBefore)
    ) {
      load.navigationClassification = 'EXPECTED_BOOTSTRAP_RELOAD';
      continue;
    }
    if (load.navigationInitiatorCategory === 'script' || load.navigationInitiatorCategory === 'reload') {
      load.navigationClassification = 'APP_INITIATED_RELOAD';
      continue;
    }
    const priorFailure = requestFailureSeqs.some((seq) => seq > previousSeq && load.requestSeq !== null && seq < load.requestSeq);
    if (priorFailure && (load.navigationInitiatorCategory === 'other' || load.navigationInitiatorCategory === 'unknown')) {
      load.navigationClassification = 'BROWSER_RETRY';
      continue;
    }
    load.navigationClassification = 'UNKNOWN';
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
  if (input.target.bootstrapMountTargetRemoved && !input.renderedShellSeen) {
    return {
      classification: 'POST_MOUNT_RENDER_FAILURE_CANDIDATE',
      evidence: 'the pre-mount target was removed, but the source-backed rendered shell was not observed',
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
}

export function buildRippleLifecycleDiagnostics(
  events: readonly RunEvent[],
  input: BuildRippleLifecycleDiagnosticsInput,
): RippleLifecycleDiagnostics {
  const loads = buildDocumentLoads(events);
  classifyDocumentLoads(loads, events, input.authRequiredStatePresent);
  const target = bootstrapTarget(events);
  const routeTransitions = routes(events);
  const finalPath = safePath(input.finalPath);
  const routePaths = routeTransitions.map((route) => route.path);
  const sourceDefinedUnauthenticatedBranchObserved = routePaths.includes('/ripple/login') || finalPath === '/ripple/login';
  const sourceDefinedAuthenticatedBootstrapBranchObserved = routePaths.includes('/ripple/dashboard') || finalPath === '/ripple/dashboard';
  const authHostNavigationSeen = loads.some((load) => authHostMatches(load.origin, input.authHosts ?? []));
  const renderedShellEvents = events.filter((event) => event.type === 'bootstrap' && dataOf(event).category === 'rendered-shell' && dataOf(event).phase === 'seen');
  const shellTimings = renderedShellEvents.map((event) => numberValue(dataOf(event).elapsedMs)).filter((value): value is number => value !== null);
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
    renderedShellSeen: renderedShellEvents.length > 0,
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
    bootstrapProgress: bootstrapProgress({
      documentComplete: documentCompleteKeys.size > 0,
      applicationEntryCompleted: input.applicationEntryCompleted,
      target,
      renderedShellSeen: renderedShellEvents.length > 0 || input.renderedShellPresent,
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
