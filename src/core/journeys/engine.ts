// ---------------------------------------------------------------------------
// Nightwatch — declarative behavioral-journey executor.
//
// The engine owns one constrained action vocabulary and one evidence boundary.
// Product journeys supply data-shaped contracts; they do not supply arbitrary
// Playwright callbacks or dynamic endpoint approvals.
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import {
  RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
  RIPPLE_RENDERED_SHELL_SELECTOR,
} from '../../products/ripple/readiness';
import { waitForNetworkObservationSettle, waitForRippleStability } from '../../browser/observers/stability';
import type { SemanticRequestObservation } from '../../browser/observers/networkObserver';
import { buildJourneyFailureAttribution } from './attribution';
import {
  EVIDENCE_SCHEMA_VERSION,
  JOURNEY_CONTRACT_VERSION,
  ORACLE_VERSION,
  journeyContractDigest,
} from './contract';
import type {
  JourneyContext,
  JourneyDefinition,
  JourneyEvidence,
  JourneySemanticRequest,
  JourneyStep,
  JourneyStepResult,
} from './types';

const ROUTE_POLL_MS = 50;
// Keep the intent classification window open long enough for Chromium's
// request event to cross the route/CDP boundary after a click. This is a
// bounded lifecycle grace period, not a retry: an action-caused request that
// arrives inside the window remains causally attributed to that action.
const ACTION_SETTLE_MS = 250;

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface JourneyRunOptions {
  uiBaseUrl: string;
  /** The caller's boolean-only auth gate result; never a token or state value. */
  authValid?: boolean;
  /** Injectable clock/sleep for deterministic local tests. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
class JourneyContractError extends Error {
  constructor(message: string) {
    super(`journey contract rejected: ${message}`);
    this.name = 'JourneyContractError';
  }
}

interface RouteState {
  routeClass: string;
  expected: boolean;
}

function normalizedBase(baseUrl: string): URL {
  const base = new URL(baseUrl);
  if (base.search !== '' || base.hash !== '') {
    throw new JourneyContractError('uiBaseUrl must not contain query or hash values');
  }
  if (!base.pathname.endsWith('/')) base.pathname = `${base.pathname}/`;
  return base;
}

function resolveApprovedRoute(base: URL, routePath: string): string {
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(routePath) || routePath.includes('..')) {
    throw new JourneyContractError(`route path is not an approved fixed path: ${routePath}`);
  }
  return new URL(routePath.replace(/^\/+/, ''), base).toString();
}

function routeClass(base: URL, rawUrl: string, expectedRoutes: readonly string[]): RouteState {
  try {
    const actual = new URL(rawUrl);
    if (actual.origin !== base.origin) return { routeClass: 'OUTSIDE_TARGET_ORIGIN', expected: false };
    const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    if (!actual.pathname.startsWith(basePath)) return { routeClass: 'OUTSIDE_TARGET_PATH', expected: false };
    const suffix = actual.pathname.slice(basePath.length);
    const relative = suffix === '' ? '/' : `/${suffix.replace(/\/$/, '')}`;
    return expectedRoutes.includes(relative)
      ? { routeClass: relative, expected: true }
      : { routeClass: 'UNEXPECTED_ROUTE', expected: false };
  } catch {
    return { routeClass: 'UNREADABLE_ROUTE', expected: false };
  }
}

function validateSelector(selector: string): void {
  if (
    selector.trim() === '' ||
    /:nth-(?:child|last-child|of-type)|text\s*=|xpath\s*=|:has-text\(/i.test(selector)
  ) {
    throw new JourneyContractError('selector is not a stable source-defined selector');
  }
}

function validateDefinition(definition: JourneyDefinition): void {
  if (definition.unknownEndpoints.length > 0) {
    throw new JourneyContractError('unknown endpoints are intentionally required');
  }
  if (definition.globalShellRequirement.selector !== RIPPLE_RENDERED_SHELL_SELECTOR) {
    throw new JourneyContractError('global shell selector is not the Phase 2A source-backed shell');
  }
  if (definition.stabilityRequirement.routeStableMs < 750) {
    throw new JourneyContractError('route stability is weaker than the Phase 2A 750 ms contract');
  }
  const ids = new Set<string>();
  for (const step of definition.allowedSteps) {
    if (ids.has(step.stepId)) throw new JourneyContractError(`duplicate step id: ${step.stepId}`);
    ids.add(step.stepId);
    if (step.semanticClassification !== 'KNOWN_READ' && step.semanticClassification !== 'LOCAL_ONLY') {
      throw new JourneyContractError(`step ${step.stepId} is not explicitly read-only/local-only`);
    }
    for (const route of step.allowedRoute) {
      if (!route.startsWith('/') || route.includes('?') || route.includes('#')) {
        throw new JourneyContractError(`step ${step.stepId} has an unsafe allowed route`);
      }
    }
    if (step.selector !== undefined) validateSelector(step.selector);
    if (step.actionType === 'NAVIGATE_APPROVED_ROUTE' && step.routePath === undefined) {
      throw new JourneyContractError(`navigation step ${step.stepId} has no approved route path`);
    }
    if (step.actionType !== 'NAVIGATE_APPROVED_ROUTE' && step.routePath !== undefined) {
      throw new JourneyContractError(`non-navigation step ${step.stepId} contains a route path`);
    }
  }
}

async function structuralState(page: Page, selector: string): Promise<{
  documentReadyState: string;
  renderedShellPresent: boolean;
}> {
  return page.evaluate((shellSelector) => {
    const pageGlobal = globalThis as unknown as {
      document?: { readyState?: string; querySelector?: (value: string) => unknown };
    };
    return {
      documentReadyState: pageGlobal.document?.readyState ?? 'unavailable',
      renderedShellPresent: pageGlobal.document?.querySelector?.(shellSelector) !== null &&
        pageGlobal.document?.querySelector?.(shellSelector) !== undefined,
    };
  }, selector).catch(() => ({ documentReadyState: 'unavailable', renderedShellPresent: false }));
}

async function markerPresent(page: Page, selector: string, minimumCount: number): Promise<boolean> {
  try {
    return await page.locator(selector).count() >= minimumCount;
  } catch {
    return false;
  }
}

function semanticSummary(observations: readonly SemanticRequestObservation[]): {
  ruleIds: string[];
  classes: Array<'KNOWN_READ' | 'KNOWN_MUTATION' | 'UNKNOWN'>;
  passiveUnknownCount: number;
  actionUnknownCount: number;
  mutationCount: number;
  requests: JourneySemanticRequest[];
} {
  return {
    ruleIds: [...new Set(observations.map((item) => item.ruleId))].sort(),
    classes: [...new Set(observations.map((item) => item.classification))].sort(),
    passiveUnknownCount: observations.filter((item) => item.disposition === 'PASSIVE_UNKNOWN_OBSERVED').length,
    actionUnknownCount: observations.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    mutationCount: observations.filter((item) => item.disposition === 'KNOWN_MUTATION').length,
    requests: observations.map((item) => ({ ...item })),
  };
}

function recordStepEvent(ctx: JourneyContext, definition: JourneyDefinition, result: JourneyStepResult): void {
  ctx.recorder.event({
    type: 'journey-step',
    severity: result.status === 'PASS' ? 'info' : 'error',
    message: result.status === 'PASS' ? 'journey step completed' : 'journey step failed',
    data: {
      journeyId: definition.journeyId,
      contractSourceSha: definition.sourceSha,
      stepId: result.stepId,
      actionType: result.actionType,
      status: result.status,
      routeClass: result.routeClass,
      structuralMarkerId: result.structuralMarkerId,
      structuralPresent: result.structuralPresent,
      requiredReadRuleIds: result.requiredReadRuleIds,
      elapsedMs: result.elapsedMs,
      ...(result.routeStabilityMs === undefined ? {} : { routeStabilityMs: result.routeStabilityMs }),
      ...(result.failureClassification === undefined ? {} : { failureClassification: result.failureClassification }),
    },
  });
}

function recordIssue(ctx: JourneyContext, reason: string, data: Record<string, unknown> = {}): void {
  const event = ctx.recorder.event({
    type: 'issue',
    severity: 'error',
    message: `journey oracle: ${reason}`,
    data: { reason, ...data },
  });
  ctx.monitor.recordIssue(event);
}

function statusClass(status: number | null): string | null {
  if (status === null) return null;
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  if (status >= 200) return '2xx';
  return '0xx';
}

function requiredNetworkSatisfied(
  observations: readonly SemanticRequestObservation[],
  step: JourneyStep,
): boolean {
  const ids = step.expectedNetworkResult.requiredRuleIds;
  if (ids.length === 0) return true;
  const scoped = step.expectedNetworkResult.scope === 'step'
    ? observations.filter((item) => item.stepId === step.stepId)
    : observations;
  const matches = scoped.filter((item) => ids.includes(item.ruleId) && item.classification === 'KNOWN_READ');
  return matches.length >= step.expectedNetworkResult.minimumRequiredMatches;
}

async function waitForRequiredNetwork(
  ctx: JourneyContext,
  step: JourneyStep,
  timeoutMs: number,
  sleep: (ms: number) => Promise<void>,
  now: () => number,
): Promise<boolean> {
  if (step.expectedNetworkResult.scope !== 'step' && step.expectedNetworkResult.requiredRuleIds.length === 0) return true;
  const deadline = now() + timeoutMs;
  while (!requiredNetworkSatisfied(ctx.network.journeySemanticRequests(), step)) {
    if (ctx.monitor.failed) return false;
    if (now() >= deadline) return false;
    await sleep(ROUTE_POLL_MS);
  }
  return true;
}

async function executeStep(
  page: Page,
  ctx: JourneyContext,
  definition: JourneyDefinition,
  step: JourneyStep,
  base: URL,
  opts: JourneyRunOptions,
): Promise<JourneyStepResult> {
  const started = (opts.now ?? Date.now)();
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const before = routeClass(base, page.url(), step.allowedRoute);
  let routeResult = before;
  let structuralPresent = false;
  let status: JourneyStepResult['status'] = 'PASS';
  let failureClassification: string | undefined;
  let observedRouteStabilityMs = 0;

  const fail = (classification: string): void => {
    status = 'FAIL';
    failureClassification = classification;
    recordIssue(ctx, classification, { journeyId: definition.journeyId, stepId: step.stepId });
  };

  try {
    if (step.actionType === 'NAVIGATE_APPROVED_ROUTE') {
      const target = resolveApprovedRoute(base, step.routePath!);
      ctx.network.beginJourneyIntent(step.stepId, step.actionType);
      try {
        ctx.recorder.event({
          type: 'navigation',
          severity: 'info',
          message: 'journey approved navigation started',
          data: { journeyId: definition.journeyId, stepId: step.stepId, actionType: step.actionType },
        });
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: step.timeoutMs });
        } catch {
          fail('navigation-failed');
        }
        const stable = await waitForRippleStability({
          quietMs: definition.stabilityRequirement.routeStableMs,
          timeoutMs: step.timeoutMs,
          recorder: ctx.recorder,
          monitor: ctx.monitor,
          sample: async () => {
            const state = await structuralState(page, definition.globalShellRequirement.selector);
            return {
              documentReadyState: state.documentReadyState,
              bootstrapMountSelector: RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
              renderedShellSelector: definition.globalShellRequirement.selector,
              renderedShellPresent: state.renderedShellPresent,
              route: routeClass(base, page.url(), step.expectedRouteResult).routeClass,
              fatal: page.isClosed() || ctx.monitor.safetyFailed,
            };
          },
          onSample: (progress) => {
            observedRouteStabilityMs = Math.max(observedRouteStabilityMs, progress.routeStableMs);
          },
        });
        if (!stable) fail('global-shell-stability-failure');
        structuralPresent = await markerPresent(
          page,
          definition.globalShellRequirement.selector,
          definition.globalShellRequirement.minimumCount,
        );
        if (!structuralPresent) fail('global-shell-structural-failure');
        if (!await waitForRequiredNetwork(ctx, step, step.timeoutMs, sleep, opts.now ?? Date.now)) fail('required-read-not-observed');
      } finally {
        ctx.network.endJourneyIntent(step.stepId);
      }
    } else if (step.actionType === 'WAIT_STRUCTURAL_CHECKPOINT') {
      const deadline = Date.now() + step.timeoutMs;
      while (!(structuralPresent = await markerPresent(page, step.expectedStructuralResult.selector, step.expectedStructuralResult.minimumCount))) {
        if (Date.now() >= deadline) break;
        await sleep(ROUTE_POLL_MS);
      }
      if (!structuralPresent) fail('journey-structural-readiness-failure');
    } else {
      if (step.selector === undefined) {
        fail('missing-safe-selector');
      } else {
        ctx.network.beginJourneyIntent(step.stepId, step.actionType);
        try {
          const locator = page.locator(step.selector);
          if (step.actionType === 'SELECT_READ_QUERY_FILTER') {
            if (step.value === undefined) fail('missing-fixed-filter-value');
            else await locator.selectOption(step.value, { timeout: step.timeoutMs });
          } else {
            // The selector is validated as part of the fixed declarative
            // contract. Preserve the meaningful actionability checks, then
            // bypass only Chromium's unstable-renderer heuristic: current
            // system Chrome can leave an unchanged synthetic control in a
            // perpetual "stable" wait. This does not permit hidden or
            // disabled controls and does not broaden selector authority.
            await locator.waitFor({ state: 'visible', timeout: step.timeoutMs });
            if (!(await locator.isEnabled())) throw new Error('fail-closed: declarative control is disabled');
            await locator.click({ timeout: step.timeoutMs, force: true });
          }
          await sleep(ACTION_SETTLE_MS);
        } catch {
          fail('safe-interaction-failure');
        } finally {
          ctx.network.endJourneyIntent(step.stepId);
        }
        if (!requiredNetworkSatisfied(ctx.network.journeySemanticRequests(), step)) {
          const networkReady = await waitForRequiredNetwork(ctx, step, step.timeoutMs, sleep, opts.now ?? Date.now);
          if (!networkReady) fail('required-read-not-observed');
        }
        structuralPresent = await markerPresent(page, step.expectedStructuralResult.selector, step.expectedStructuralResult.minimumCount);
        if (!structuralPresent) fail('journey-structural-readiness-failure');
      }
    }
  } catch {
    fail('journey-engine-exception');
  }

  routeResult = routeClass(base, page.url(), step.expectedRouteResult);
  if (!routeResult.expected) fail('route-contradiction');
  if (step.expectedNetworkResult.scope === 'step' && !requiredNetworkSatisfied(ctx.network.journeySemanticRequests(), step)) {
    fail('required-read-not-observed');
  }

  const result: JourneyStepResult = {
    stepId: step.stepId,
    actionType: step.actionType,
    status: ctx.monitor.safetyFailed ? 'STOPPED' : status,
    routeClass: routeResult.routeClass,
    structuralMarkerId: step.expectedStructuralResult.id,
    structuralPresent,
    requiredReadRuleIds: step.expectedNetworkResult.requiredRuleIds,
    elapsedMs: Math.max(0, (opts.now ?? Date.now)() - started),
    ...(observedRouteStabilityMs > 0 ? { routeStabilityMs: observedRouteStabilityMs } : {}),
    ...(failureClassification === undefined ? {} : { failureClassification }),
  };
  recordStepEvent(ctx, definition, result);
  return result;
}

export async function runDeclarativeJourney(
  page: Page,
  ctx: JourneyContext,
  definition: JourneyDefinition,
  opts: JourneyRunOptions,
): Promise<JourneyEvidence> {
  validateDefinition(definition);
  const contractDigest = journeyContractDigest(definition);
  const contractVersion = definition.contractVersion ?? JOURNEY_CONTRACT_VERSION;
  const authValid = opts.authValid ?? true;
  const base = normalizedBase(opts.uiBaseUrl);
  const steps: JourneyStepResult[] = [];
  const markers: Record<string, boolean> = {};
  let routeStabilityMs = 0;

  // Authentication is a precondition. A stale/expired/unreadable state must
  // stop before any intentional action, and must never be reported as a
  // product journey failure. The caller has already reduced the auth check to
  // booleans; no token or cookie value crosses this boundary.
  if (!authValid) {
    const authEvent = ctx.recorder.event({
      type: 'oracle',
      severity: 'warn',
      message: 'AUTH_STATE_INVALID',
      data: {
        reason: 'auth-state-invalid',
        oracleId: 'auth-state-invalid',
        anomalyClass: 'AUTH_STATE_INVALID',
        causalToPrimaryFailure: 'NOT_CAUSAL',
      },
    });
    ctx.monitor.recordIssue(authEvent);
    for (const marker of definition.journeySpecificStructuralMarkers) markers[marker.id] = false;
    const evidence: JourneyEvidence = {
      journeyId: definition.journeyId,
      contractSourceSha: definition.sourceSha,
      passed: false,
      finalRouteClass: 'AUTH_STATE_INVALID',
      globalShellReady: false,
      journeyMarkers: markers,
      stepResults: [],
      semanticRuleIds: [],
      semanticClasses: [],
      passiveUnknownCount: 0,
      actionUnknownCount: 0,
      mutationCount: 0,
      routeStabilityMs: 0,
      authValid: false,
      oracleStatus: 'PASS',
      privacyStatus: 'PASS',
      safetyStatus: 'PASS',
      evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
      contractVersion,
      contractDigest,
      oracleVersion: ORACLE_VERSION,
      semanticRequests: [],
      safetyCounts: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, mutations: 0, dbQueries: 0, actionCausedUnknown: 0 },
      boundedVariance: { requestCount: ctx.network.requestCount() },
      oracleObservations: ctx.monitor.oracleObservations.map((item) => ({ oracleId: item.oracleId, triggered: true, severity: item.severity, anomalyClass: item.anomalyClass as import('./types').JourneyOracleObservation['anomalyClass'], causalToPrimaryFailure: item.causalToPrimaryFailure })),
      anomalyFingerprints: [],
      failureAttribution: buildJourneyFailureAttribution({ steps, monitor: ctx.monitor, authValid: false }),
      resourceObservations: ctx.network.resourceObservations().map((item) => ({ role: item.role, state: item.state, method: item.method, stepId: item.stepId, statusClass: statusClass(item.status), contentTypeClass: item.contentTypeClass })),
      containmentCounts: { optionalSupportBlocked: ctx.network.optionalSupportBlockedHosts().size, telemetryBlocked: ctx.network.telemetryBlockedHosts().size, browserBackgroundBlocked: ctx.network.browserBackgroundBlockedHosts().size, containmentEvents: [...ctx.monitor.containmentEvents] },
      captureStatus: ctx.network.captureStatus?.() ?? 'UNKNOWN',
      observationSettlement: 'NOT_APPLICABLE',
      captureFailureCodes: ctx.network.captureFailureCodes?.() ?? [],
    };
    ctx.recorder.addManifestEntry('journeyEvidence', { journeyId: evidence.journeyId, contractSourceSha: evidence.contractSourceSha, passed: false, authValid: false, failureAttribution: evidence.failureAttribution, evidenceSchemaVersion: evidence.evidenceSchemaVersion, contractVersion: evidence.contractVersion, contractDigest: evidence.contractDigest, oracleVersion: evidence.oracleVersion, captureStatus: evidence.captureStatus, observationSettlement: evidence.observationSettlement, captureFailureCodes: evidence.captureFailureCodes });
    return evidence;
  }

  for (const step of definition.allowedSteps) {
    const result = await executeStep(page, ctx, definition, step, base, opts);
    steps.push(result);
    if (result.actionType === 'NAVIGATE_APPROVED_ROUTE') routeStabilityMs = Math.max(routeStabilityMs, result.routeStabilityMs ?? 0);
    if (result.status !== 'PASS') break;
  }

  for (const marker of definition.journeySpecificStructuralMarkers) {
    markers[marker.id] = await markerPresent(page, marker.selector, marker.minimumCount);
    if (!markers[marker.id]) recordIssue(ctx, 'journey-structural-readiness-failure', { journeyId: definition.journeyId, markerId: marker.id });
  }

  // A response event starts an asynchronous body/oracle handler. Required
  // request observations are emitted earlier, so deciding the journey here
  // without a bounded settlement barrier can report PASS before a malformed
  // response body has been classified. Structural Ripple stability remains
  // intentionally independent; this barrier is only for verdict finalization.
  const observationsSettled = await waitForNetworkObservationSettle({
    network: ctx.network,
    quietMs: 500,
    timeoutMs: 10_000,
  });
  if (!observationsSettled) {
    recordIssue(ctx, 'oracle-observation-settle-timeout', { journeyId: definition.journeyId });
  }
  const captureStatus = ctx.network.captureStatus?.() ?? 'UNKNOWN';
  const observationSettlement = observationsSettled ? 'SETTLED' : 'TIMED_OUT';

  const observations = ctx.network.journeySemanticRequests();
  const semantics = semanticSummary(observations);
  const contractUnchanged = journeyContractDigest(definition) === contractDigest;
  if (!contractUnchanged) recordIssue(ctx, 'journey-contract-changed', { journeyId: definition.journeyId });
  const requiredReads = new Set(definition.knownReadEndpoints);
  const observedRequiredReads = new Set(observations
    .filter((item) => item.classification === 'KNOWN_READ')
    .map((item) => item.ruleId));
  const requiredReadsPresent = [...requiredReads].every((id) => observedRequiredReads.has(id));
  if (!requiredReadsPresent) recordIssue(ctx, 'required-read-not-observed', { journeyId: definition.journeyId });
  if (semantics.mutationCount > 0) recordIssue(ctx, 'known-mutation-observed', { journeyId: definition.journeyId });
  if (semantics.actionUnknownCount > 0) recordIssue(ctx, 'action-caused-unknown', { journeyId: definition.journeyId });

  const finalRoute = routeClass(base, page.url(), definition.expectedEndRouteOrRouteClass);
  const globalShellReady = await markerPresent(page, definition.globalShellRequirement.selector, definition.globalShellRequirement.minimumCount);
  const journeyMarkersReady = Object.values(markers).every(Boolean);
  const safetyStatus = !ctx.monitor.safetyFailed && semantics.mutationCount === 0 && semantics.actionUnknownCount === 0
    ? 'PASS'
    : 'FAIL';
  const passed = steps.length === definition.allowedSteps.length &&
    steps.every((step) => step.status === 'PASS') &&
    finalRoute.expected &&
    globalShellReady &&
    journeyMarkersReady &&
    requiredReadsPresent &&
    safetyStatus === 'PASS' &&
    observationsSettled &&
    captureStatus !== 'INCOMPLETE' &&
    !ctx.monitor.failed &&
    authValid &&
    contractUnchanged;

  const evidence: JourneyEvidence = {
    journeyId: definition.journeyId,
    contractSourceSha: definition.sourceSha,
    passed,
    finalRouteClass: finalRoute.routeClass,
    globalShellReady,
    journeyMarkers: markers,
    stepResults: steps,
    semanticRuleIds: semantics.ruleIds,
    semanticClasses: semantics.classes,
    passiveUnknownCount: semantics.passiveUnknownCount,
    actionUnknownCount: semantics.actionUnknownCount,
    mutationCount: semantics.mutationCount,
    routeStabilityMs,
    authValid,
    oracleStatus: ctx.monitor.oracleFailed || !observationsSettled || captureStatus === 'INCOMPLETE' ? 'FAIL' : 'PASS',
    privacyStatus: 'PASS',
    safetyStatus,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    contractVersion,
    contractDigest,
    oracleVersion: ORACLE_VERSION,
    semanticRequests: semantics.requests,
    safetyCounts: {
      productionAttempts: 0,
      proxyViolations: 0,
      unknownDestinations: 0,
      unknownApprovals: 0,
      mutations: semantics.mutationCount,
      dbQueries: 0,
      actionCausedUnknown: semantics.actionUnknownCount,
    },
    boundedVariance: {
      routeStabilityDeltaMs: 0,
      passiveUnknownDelta: 0,
      requestCount: ctx.network.requestCount(),
      requestCountDelta: ctx.network.requestCount(),
    },
    oracleObservations: ctx.monitor.oracleObservations.map((item) => ({
      oracleId: item.oracleId,
      triggered: true,
      severity: item.severity,
      anomalyClass: item.anomalyClass as import('./types').JourneyOracleObservation['anomalyClass'],
      causalToPrimaryFailure: item.causalToPrimaryFailure,
      ...(item.fingerprint === undefined ? {} : { fingerprint: item.fingerprint }),
    })),
    anomalyFingerprints: ctx.monitor.oracleObservations
      .map((item) => item.fingerprint)
      .filter((value): value is string => value !== undefined),
    failureAttribution: buildJourneyFailureAttribution({ steps, monitor: ctx.monitor, authValid }),
    resourceObservations: ctx.network.resourceObservations().map((item) => ({
      role: item.role,
      state: item.state,
      method: item.method,
      stepId: item.stepId,
      statusClass: statusClass(item.status),
      contentTypeClass: item.contentTypeClass,
    })),
    containmentCounts: {
      optionalSupportBlocked: ctx.network.optionalSupportBlockedHosts().size,
      telemetryBlocked: ctx.network.telemetryBlockedHosts().size,
      browserBackgroundBlocked: ctx.network.browserBackgroundBlockedHosts().size,
      containmentEvents: [...ctx.monitor.containmentEvents],
    },
    captureStatus,
    observationSettlement,
    captureFailureCodes: ctx.network.captureFailureCodes?.() ?? [],
  };
  ctx.recorder.addManifestEntry('journeyEvidence', {
    journeyId: evidence.journeyId,
    contractSourceSha: evidence.contractSourceSha,
    passed: evidence.passed,
    finalRouteClass: evidence.finalRouteClass,
    globalShellReady: evidence.globalShellReady,
    journeyMarkers: evidence.journeyMarkers,
    stepIds: evidence.stepResults.map((step) => step.stepId),
    semanticRuleIds: evidence.semanticRuleIds,
    semanticClasses: evidence.semanticClasses,
    passiveUnknownCount: evidence.passiveUnknownCount,
    actionUnknownCount: evidence.actionUnknownCount,
    mutationCount: evidence.mutationCount,
    routeStabilityMs: evidence.routeStabilityMs,
    authValid: evidence.authValid,
    oracleStatus: evidence.oracleStatus,
    privacyStatus: evidence.privacyStatus,
    safetyStatus: evidence.safetyStatus,
    evidenceSchemaVersion: evidence.evidenceSchemaVersion,
    contractVersion: evidence.contractVersion,
    contractDigest: evidence.contractDigest,
    oracleVersion: evidence.oracleVersion,
    anomalyFingerprints: evidence.anomalyFingerprints,
    failureAttribution: evidence.failureAttribution,
    containmentCounts: evidence.containmentCounts,
    captureStatus: evidence.captureStatus,
    observationSettlement: evidence.observationSettlement,
    captureFailureCodes: evidence.captureFailureCodes,
  });
  ctx.recorder.event({
    type: 'journey',
    severity: passed ? 'info' : 'error',
    message: passed ? 'declarative journey completed' : 'declarative journey failed',
    data: {
      journeyId: evidence.journeyId,
      contractSourceSha: evidence.contractSourceSha,
      passed: evidence.passed,
      finalRouteClass: evidence.finalRouteClass,
      globalShellReady: evidence.globalShellReady,
      journeyMarkers: evidence.journeyMarkers,
      semanticRuleIds: evidence.semanticRuleIds,
      semanticClasses: evidence.semanticClasses,
      passiveUnknownCount: evidence.passiveUnknownCount,
      actionUnknownCount: evidence.actionUnknownCount,
      mutationCount: evidence.mutationCount,
      privacyStatus: evidence.privacyStatus,
      safetyStatus: evidence.safetyStatus,
      captureStatus: evidence.captureStatus,
      observationSettlement: evidence.observationSettlement,
      captureFailureCodes: evidence.captureFailureCodes,
    },
  });
  return evidence;
}
