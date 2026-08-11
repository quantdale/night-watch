// ---------------------------------------------------------------------------
// Ripple bootstrap diagnostics.
//
// This module consumes already-sanitized Nightwatch event metadata. It never
// reads a response body and never persists an arbitrary URL, query, DOM value,
// title, or storage value. The diagnostic result is deliberately separate from
// the readiness predicate: it explains an unsuccessful predicate without
// changing that predicate.
// ---------------------------------------------------------------------------

import type { RunEvent } from '../../core/evidence/types';
import {
  buildRippleLifecycleDiagnostics,
  type RippleLifecycleDiagnostics,
} from './lifecycleDiagnostics';
import type { AuthReplayEffectiveness } from './bootstrapContract';

export type BootstrapClassification =
  | 'AUTH_STATE_REPLAY_INEFFECTIVE'
  | 'ENTRY_DOCUMENT_WRONG_OR_UNEXPECTED'
  | 'CRITICAL_ASSET_LOAD_FAILURE'
  | 'JAVASCRIPT_BOOTSTRAP_EXCEPTION'
  | 'ROUTER_BOOTSTRAP_FAILURE'
  | 'EXPECTED_RESOURCE_BLOCK_CAUSED_BOOTSTRAP_FAILURE'
  | 'DEPLOYMENT_SOURCE_DIVERGENCE'
  | 'OBSERVER_BLIND_SPOT'
  | 'APPLICATION_BOOTSTRAP_CONFIRMED'
  | 'OTHER_UNRESOLVED';

export type BootstrapResourceKind =
  | 'document'
  | 'application-entry'
  | 'runtime-vendor'
  | 'chunk'
  | 'module'
  | 'stylesheet'
  | 'other';

export interface BootstrapFailureResource {
  resourceKind: BootstrapResourceKind;
  host: string;
  origin: string;
  path: string;
  method: string;
  status: number | null;
  contentType: string | null;
  blocked: boolean;
  allowed: boolean;
  policyClassification: string | null;
  policyDecision: string | null;
  policyReason: string | null;
  failureCategory: 'policy-block' | 'request-failed' | 'http-status' | 'wrong-content-type' | 'not-completed';
  requestCompleted: boolean;
  order: {
    requestSeq: number | null;
    responseSeq: number | null;
    failureSeq: number | null;
  };
  timing: {
    requestAt: string | null;
    completionAt: string | null;
  };
}

export interface BootstrapObserverCoverage {
  unhandledRejection: boolean;
  cspViolation: boolean;
  resourceLoadFailure: boolean;
  historyRouteTransition: boolean;
  requestFailureMetadata: boolean;
}

export interface RippleBootstrapDiagnostics {
  documentLoaded: boolean;
  documentRequestCount: number;
  documentCompletedCount: number;
  applicationEntryObserved: boolean;
  applicationEntryCompleted: boolean;
  runtimeVendorObserved: boolean;
  runtimeVendorCompleted: boolean;
  scriptRequestCount: number;
  scriptCompletedCount: number;
  scriptFailureCount: number;
  styleRequestCount: number;
  styleCompletedCount: number;
  styleFailureCount: number;
  chunkRequestCount: number;
  chunkCompletedCount: number;
  chunkFailureCount: number;
  moduleRequestCount: number;
  runtimeExceptionCount: number;
  unhandledRejectionCount: number;
  consoleErrorCount: number;
  consoleWarnCount: number;
  cspViolationCount: number;
  resourceLoadErrorEventCount: number;
  historyRouteTransitionCount: number;
  routeTransitionObserved: boolean;
  authenticatedRouteReached: boolean;
  routerBootstrap: 'started' | 'not-started' | 'unknown';
  mainFrameNavigationCount: number;
  renderedShellPresent: boolean;
  readinessConfirmed: boolean;
  observerCoverage: BootstrapObserverCoverage;
  failedCriticalResources: BootstrapFailureResource[];
  classification: BootstrapClassification;
  authReplayEffectiveness: AuthReplayEffectiveness;
  lifecycle: RippleLifecycleDiagnostics;
}

export interface BootstrapClassificationInput {
  documentLoaded: boolean;
  entryDocumentUnexpected?: boolean;
  authState: 'effective' | 'ineffective' | 'unknown';
  applicationEntryCompleted: boolean;
  criticalAssetFailure: boolean;
  requiredResourceBlocked: boolean;
  runtimeExceptionCount: number;
  unhandledRejectionCount: number;
  cspViolationCount: number;
  observerBlindSpot: boolean;
  routerBootstrap: 'started' | 'not-started' | 'unknown';
  renderedShellPresent: boolean;
  readinessConfirmed: boolean;
  routeTransitionObserved: boolean;
  authenticatedRouteReached: boolean;
  deploymentSourceDivergence: boolean;
}

interface SanitizedLocation {
  host: string;
  origin: string;
  path: string;
}

interface ResourceRecord {
  resourceKind: BootstrapResourceKind;
  method: string;
  url: string;
  location: SanitizedLocation;
  requestSeq: number | null;
  responseSeq: number | null;
  failureSeq: number | null;
  requestAt: string | null;
  completionAt: string | null;
  resourceType: string | null;
  status: number | null;
  contentType: string | null;
  verdict: string | null;
  policyClassification: string | null;
  policyHostClass: string | null;
  policyReason: string | null;
  failureCategory: string | null;
  requestCompleted: boolean;
}

interface FinalBootstrapState {
  renderedShellPresent: boolean;
  stabilityReached: boolean;
  finalPath: string | null;
  mainFrameNavigationCount: number;
}

export interface BootstrapLifecycleInput {
  authHosts?: readonly string[];
  storageStateLoadedBeforeNavigation: boolean;
  provenanceMatch: boolean;
  authRequiredStatePresent: boolean;
}

const JS_CONTENT_TYPE = /(java|ecma)script/i;
const CSS_CONTENT_TYPE = /css/i;
const HTML_CONTENT_TYPE = /html/i;
const JS_PATH = /\.m?js$/i;
const APP_ENTRY_PATH = /\/static\/js\/app(?:\.[^/]+)?\.js$/i;
const RUNTIME_VENDOR_PATH = /\/static\/js\/chunk-vendors(?:\.[^/]+)?\.js$/i;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function locationOf(rawUrl: string): SanitizedLocation | null {
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname.toLowerCase(),
      origin: url.origin,
      path: url.pathname || '/',
    };
  } catch {
    return null;
  }
}

function dataOf(event: RunEvent): Record<string, unknown> {
  return event.data ?? {};
}

function resourceKindOf(pathname: string, resourceType: string | null): BootstrapResourceKind {
  if (resourceType === 'document') return 'document';
  if (resourceType === 'stylesheet' || pathname.toLowerCase().endsWith('.css')) return 'stylesheet';
  // A third-party widget is also reported by Playwright as a script, but it
  // is not a Ripple application asset unless its sanitized path is a JS/MJS
  // bundle. Do not turn an optional blocked widget into a chunk failure.
  if (!JS_PATH.test(pathname)) return 'other';
  if (APP_ENTRY_PATH.test(pathname)) return 'application-entry';
  if (RUNTIME_VENDOR_PATH.test(pathname)) return 'runtime-vendor';
  if (resourceType === 'module' || pathname.toLowerCase().endsWith('.mjs')) return 'module';
  return 'chunk';
}

function isScriptKind(kind: BootstrapResourceKind): boolean {
  return kind === 'application-entry' || kind === 'runtime-vendor' || kind === 'chunk' || kind === 'module';
}

function isCriticalKind(kind: BootstrapResourceKind): boolean {
  return kind === 'document' || isScriptKind(kind) || kind === 'stylesheet';
}

function responseCompatible(record: ResourceRecord): boolean {
  if (record.status === null || record.status < 200 || record.status >= 300) return false;
  if (record.resourceKind === 'document') return record.contentType !== null && HTML_CONTENT_TYPE.test(record.contentType);
  if (record.resourceKind === 'stylesheet') return record.contentType !== null && CSS_CONTENT_TYPE.test(record.contentType);
  if (isScriptKind(record.resourceKind)) return record.contentType !== null && JS_CONTENT_TYPE.test(record.contentType);
  return true;
}

function failureCategoryOf(record: ResourceRecord): BootstrapFailureResource['failureCategory'] | null {
  if (!isCriticalKind(record.resourceKind)) return null;
  if (record.verdict !== null && record.verdict !== 'allow') {
    if (record.verdict === 'block-telemetry' || record.verdict === 'block-optional-support' || record.verdict === 'block-browser-background' || record.verdict === 'deny') {
      return 'policy-block';
    }
  }
  if (record.failureCategory !== null && record.failureCategory !== 'policy-block') return 'request-failed';
  if (record.responseSeq === null) return 'not-completed';
  if (record.status === null || record.status < 200 || record.status >= 300) return 'http-status';
  if (!responseCompatible(record)) return 'wrong-content-type';
  return null;
}

function recordFromEvent(event: RunEvent, resourceKind: BootstrapResourceKind | null, url: string, location: SanitizedLocation): ResourceRecord {
  const data = dataOf(event);
  const resourceType = stringValue(data.resourceType);
  return {
    resourceKind: resourceKind ?? resourceKindOf(location.path, resourceType),
    method: stringValue(data.method) ?? 'GET',
    url,
    location,
    requestSeq: event.type === 'request' ? event.seq : null,
    responseSeq: event.type === 'response' ? event.seq : null,
    failureSeq: event.type === 'requestfailed' ? event.seq : null,
    requestAt: event.type === 'request' ? event.ts : null,
    completionAt: event.type === 'response' ? event.ts : null,
    resourceType,
    status: numberValue(data.status),
    contentType: stringValue(data.contentType),
    verdict: stringValue(data.verdict),
    policyClassification: stringValue(data.policyClassification) ?? stringValue(data.classification),
    policyHostClass: stringValue(data.policyHostClass) ?? stringValue(data.hostClass),
    policyReason: stringValue(data.reason),
    failureCategory: stringValue(data.failureCategory),
    requestCompleted: event.type === 'response',
  };
}

function mergeRecord(target: ResourceRecord, event: RunEvent): void {
  const data = dataOf(event);
  if (event.type === 'response') {
    target.responseSeq = event.seq;
    target.completionAt = event.ts;
    target.status = numberValue(data.status);
    target.contentType = stringValue(data.contentType);
    target.resourceType = target.resourceType ?? stringValue(data.resourceType);
    target.requestCompleted = true;
  } else if (event.type === 'requestfailed') {
    target.failureSeq = event.seq;
    target.failureCategory = stringValue(data.failureCategory) ?? 'request-failed';
    target.verdict = target.verdict ?? stringValue(data.verdict);
    target.policyClassification = target.policyClassification ?? stringValue(data.policyClassification) ?? stringValue(data.classification);
    target.policyHostClass = target.policyHostClass ?? stringValue(data.policyHostClass) ?? stringValue(data.hostClass);
    target.policyReason = target.policyReason ?? stringValue(data.reason);
  }
}

function eventResourceKey(event: RunEvent): string | null {
  const url = stringValue(dataOf(event).url);
  const method = stringValue(dataOf(event).method) ?? 'GET';
  if (url === null || locationOf(url) === null) return null;
  return `${method}|${url}`;
}

function countCategory(events: readonly RunEvent[], category: string): number {
  return events.filter((event) => event.type === 'bootstrap' && dataOf(event).category === category).length;
}

function consoleCount(events: readonly RunEvent[], type: 'error' | 'warn'): number {
  return events.filter((event) => {
    if (event.type !== 'console') return false;
    const data = dataOf(event);
    if (data.category === 'EXPECTED_CONTAINMENT_EFFECT') return false;
    return data.category === `console-${type}` || data.type === type;
  }).length;
}

function failedResource(record: ResourceRecord): BootstrapFailureResource | null {
  const failureCategory = failureCategoryOf(record);
  if (failureCategory === null) return null;
  return {
    resourceKind: record.resourceKind,
    host: record.location.host,
    origin: record.location.origin,
    path: record.location.path,
    method: record.method,
    status: record.status,
    contentType: record.contentType,
    blocked: record.verdict !== null && record.verdict !== 'allow',
    allowed: record.verdict === 'allow',
    policyClassification: record.policyClassification,
    policyDecision: record.verdict,
    policyReason: record.policyReason,
    failureCategory,
    requestCompleted: record.requestCompleted,
    order: {
      requestSeq: record.requestSeq,
      responseSeq: record.responseSeq,
      failureSeq: record.failureSeq,
    },
    timing: {
      requestAt: record.requestAt,
      completionAt: record.completionAt,
    },
  };
}

function classifyRecords(records: readonly ResourceRecord[]): {
  documentRequestCount: number;
  documentCompletedCount: number;
  applicationEntryObserved: boolean;
  applicationEntryCompleted: boolean;
  runtimeVendorObserved: boolean;
  runtimeVendorCompleted: boolean;
  scriptRequestCount: number;
  scriptCompletedCount: number;
  scriptFailureCount: number;
  styleRequestCount: number;
  styleCompletedCount: number;
  styleFailureCount: number;
  chunkRequestCount: number;
  chunkCompletedCount: number;
  chunkFailureCount: number;
  moduleRequestCount: number;
  documentLoaded: boolean;
  failedCriticalResources: BootstrapFailureResource[];
  requiredResourceBlocked: boolean;
  criticalAssetFailure: boolean;
} {
  const docs = records.filter((record) => record.resourceKind === 'document');
  const entries = records.filter((record) => record.resourceKind === 'application-entry');
  const vendors = records.filter((record) => record.resourceKind === 'runtime-vendor');
  const scripts = records.filter((record) => isScriptKind(record.resourceKind));
  const styles = records.filter((record) => record.resourceKind === 'stylesheet');
  const chunks = records.filter((record) => record.resourceKind === 'chunk');
  const modules = records.filter((record) => record.resourceKind === 'module');
  const failures = records.map(failedResource).filter((value): value is BootstrapFailureResource => value !== null);
  const scriptFailures = scripts.filter((record) => failureCategoryOf(record) !== null).length;
  const styleFailures = styles.filter((record) => failureCategoryOf(record) !== null).length;
  const chunkFailures = chunks.filter((record) => failureCategoryOf(record) !== null).length;
  return {
    documentRequestCount: docs.length,
    documentCompletedCount: docs.filter((record) => record.requestCompleted).length,
    applicationEntryObserved: entries.length > 0,
    applicationEntryCompleted: entries.some(responseCompatible),
    runtimeVendorObserved: vendors.length > 0,
    runtimeVendorCompleted: vendors.some(responseCompatible),
    scriptRequestCount: scripts.length,
    scriptCompletedCount: scripts.filter(responseCompatible).length,
    scriptFailureCount: scriptFailures,
    styleRequestCount: styles.length,
    styleCompletedCount: styles.filter(responseCompatible).length,
    styleFailureCount: styleFailures,
    chunkRequestCount: chunks.length,
    chunkCompletedCount: chunks.filter(responseCompatible).length,
    chunkFailureCount: chunkFailures,
    moduleRequestCount: modules.length,
    documentLoaded: docs.some((record) => responseCompatible(record)),
    failedCriticalResources: failures,
    requiredResourceBlocked: failures.some((failure) => failure.failureCategory === 'policy-block' && isScriptKind(failure.resourceKind)),
    criticalAssetFailure: failures.length > 0,
  };
}

export function classifyBootstrapEvidence(input: BootstrapClassificationInput): BootstrapClassification {
  if (input.authState === 'ineffective') return 'AUTH_STATE_REPLAY_INEFFECTIVE';
  if (input.observerBlindSpot) return 'OBSERVER_BLIND_SPOT';
  if (input.deploymentSourceDivergence) return 'DEPLOYMENT_SOURCE_DIVERGENCE';
  if (input.entryDocumentUnexpected) return 'ENTRY_DOCUMENT_WRONG_OR_UNEXPECTED';
  if (input.requiredResourceBlocked) return 'EXPECTED_RESOURCE_BLOCK_CAUSED_BOOTSTRAP_FAILURE';
  if (input.criticalAssetFailure) return 'CRITICAL_ASSET_LOAD_FAILURE';
  if (input.runtimeExceptionCount > 0 || input.unhandledRejectionCount > 0) return 'JAVASCRIPT_BOOTSTRAP_EXCEPTION';
  if (input.cspViolationCount > 0 && !input.applicationEntryCompleted) return 'CRITICAL_ASSET_LOAD_FAILURE';
  if (input.routerBootstrap === 'not-started') return 'ROUTER_BOOTSTRAP_FAILURE';
  if (input.renderedShellPresent && input.readinessConfirmed &&
    input.routeTransitionObserved && input.authenticatedRouteReached) {
    return 'APPLICATION_BOOTSTRAP_CONFIRMED';
  }
  if (!input.documentLoaded || !input.applicationEntryCompleted) return 'OTHER_UNRESOLVED';
  return 'OTHER_UNRESOLVED';
}

function firstNavigationPath(events: readonly RunEvent[]): string | null {
  const navigation = events.find((event) => event.type === 'navigation');
  const url = navigation === undefined ? null : stringValue(dataOf(navigation).url);
  return url === null ? null : locationOf(url)?.path ?? null;
}

/** Build metadata-only bootstrap evidence from the recorder's sanitized events. */
export function buildRippleBootstrapDiagnostics(
  events: readonly RunEvent[],
  finalState: FinalBootstrapState,
  observerCoverage: BootstrapObserverCoverage,
  lifecycleInput: BootstrapLifecycleInput = {
    storageStateLoadedBeforeNavigation: false,
    provenanceMatch: false,
    authRequiredStatePresent: false,
  },
): RippleBootstrapDiagnostics {
  const records: ResourceRecord[] = [];
  const pending = new Map<string, ResourceRecord[]>();
  for (const event of events) {
    if (event.type !== 'request' && event.type !== 'response' && event.type !== 'requestfailed') continue;
    const url = stringValue(dataOf(event).url);
    const location = url === null ? null : locationOf(url);
    if (url === null || location === null) continue;
    const key = eventResourceKey(event);
    if (key === null) continue;
    if (event.type === 'request') {
      const record = recordFromEvent(event, null, url, location);
      records.push(record);
      const queue = pending.get(key) ?? [];
      queue.push(record);
      pending.set(key, queue);
      continue;
    }
    const queue = pending.get(key);
    const record = queue?.find((candidate) => candidate.responseSeq === null && candidate.failureSeq === null);
    if (record !== undefined) {
      mergeRecord(record, event);
    } else {
      records.push(recordFromEvent(event, null, url, location));
    }
  }

  const classified = classifyRecords(records);
  const unhandledRejectionCount = countCategory(events, 'unhandled-rejection');
  const cspViolationCount = countCategory(events, 'csp-violation');
  const resourceLoadErrorEventCount = countCategory(events, 'resource-error-event');
  const historyRouteTransitionCount = countCategory(events, 'route-transition');
  const initialPath = firstNavigationPath(events);
  const routeTransitionObserved = historyRouteTransitionCount > 0 ||
    (initialPath !== null && finalState.finalPath !== null && initialPath !== finalState.finalPath);
  const authenticatedRouteReached = finalState.finalPath === '/ripple/dashboard';
  // Absence of a transition is not proof that the router failed: a direct
  // dashboard navigation can legitimately start the router without changing
  // history. Keep that branch unknown rather than guessing.
  const routerBootstrap: RippleBootstrapDiagnostics['routerBootstrap'] =
    routeTransitionObserved || authenticatedRouteReached ? 'started' : 'unknown';
  const observerBlindSpot = Object.values(observerCoverage).some((covered) => !covered);
  const readinessConfirmed = authenticatedRouteReached &&
    finalState.renderedShellPresent && finalState.stabilityReached;
  const lifecycle = buildRippleLifecycleDiagnostics(events, {
    finalPath: finalState.finalPath,
    applicationEntryCompleted: classified.applicationEntryCompleted,
    authHosts: lifecycleInput.authHosts,
    storageStateLoadedBeforeNavigation: lifecycleInput.storageStateLoadedBeforeNavigation,
    provenanceMatch: lifecycleInput.provenanceMatch,
    authRequiredStatePresent: lifecycleInput.authRequiredStatePresent,
    renderedShellPresent: finalState.renderedShellPresent,
    runtimeExceptionCount: events.filter((event) => event.type === 'pageerror').length,
    unhandledRejectionCount,
  });
  const authState = lifecycle.authReplayEffectiveness === 'CONFIRMED'
    ? 'effective'
    : lifecycle.authReplayEffectiveness === 'INEFFECTIVE'
      ? 'ineffective'
      : 'unknown';
  const classification = classifyBootstrapEvidence({
    documentLoaded: classified.documentLoaded,
    authState,
    applicationEntryCompleted: classified.applicationEntryCompleted,
    criticalAssetFailure: classified.criticalAssetFailure,
    requiredResourceBlocked: classified.requiredResourceBlocked,
    runtimeExceptionCount: events.filter((event) => event.type === 'pageerror').length,
    unhandledRejectionCount,
    cspViolationCount,
    observerBlindSpot,
    routerBootstrap,
    renderedShellPresent: finalState.renderedShellPresent,
    readinessConfirmed,
    routeTransitionObserved,
    authenticatedRouteReached,
    deploymentSourceDivergence: false,
  });

  return {
    documentLoaded: classified.documentLoaded,
    documentRequestCount: classified.documentRequestCount,
    documentCompletedCount: classified.documentCompletedCount,
    applicationEntryObserved: classified.applicationEntryObserved,
    applicationEntryCompleted: classified.applicationEntryCompleted,
    runtimeVendorObserved: classified.runtimeVendorObserved,
    runtimeVendorCompleted: classified.runtimeVendorCompleted,
    scriptRequestCount: classified.scriptRequestCount,
    scriptCompletedCount: classified.scriptCompletedCount,
    scriptFailureCount: classified.scriptFailureCount,
    styleRequestCount: classified.styleRequestCount,
    styleCompletedCount: classified.styleCompletedCount,
    styleFailureCount: classified.styleFailureCount,
    chunkRequestCount: classified.chunkRequestCount,
    chunkCompletedCount: classified.chunkCompletedCount,
    chunkFailureCount: classified.chunkFailureCount,
    moduleRequestCount: classified.moduleRequestCount,
    runtimeExceptionCount: events.filter((event) => event.type === 'pageerror').length,
    unhandledRejectionCount,
    consoleErrorCount: consoleCount(events, 'error'),
    consoleWarnCount: consoleCount(events, 'warn'),
    cspViolationCount,
    resourceLoadErrorEventCount,
    historyRouteTransitionCount,
    routeTransitionObserved,
    authenticatedRouteReached,
    routerBootstrap,
    mainFrameNavigationCount: finalState.mainFrameNavigationCount,
    renderedShellPresent: finalState.renderedShellPresent,
    readinessConfirmed,
    observerCoverage,
    failedCriticalResources: classified.failedCriticalResources,
    classification,
    authReplayEffectiveness: lifecycle.authReplayEffectiveness,
    lifecycle,
  };
}
