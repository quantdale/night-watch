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
import { waitForRippleStability } from '../../browser/observers/stability';
import type { SemanticRequestObservation } from '../../browser/observers/networkObserver';
import type {
  JourneyContext,
  JourneyDefinition,
  JourneyEvidence,
  JourneyStep,
  JourneyStepResult,
} from './types';

const ROUTE_POLL_MS = 50;
const ACTION_SETTLE_MS = 75;

export interface JourneyRunOptions {
  uiBaseUrl: string;
  /** The caller's boolean-only auth gate result; never a token or state value. */
  authValid?: boolean;
  /** Injectable clock/sleep for deterministic local tests. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class JourneyContractError extends Error {
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
} {
  return {
    ruleIds: [...new Set(observations.map((item) => item.ruleId))].sort(),
    classes: [...new Set(observations.map((item) => item.classification))].sort(),
    passiveUnknownCount: observations.filter((item) => item.disposition === 'PASSIVE_UNKNOWN_OBSERVED').length,
    actionUnknownCount: observations.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    mutationCount: observations.filter((item) => item.disposition === 'KNOWN_MUTATION').length,
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

function requiredNetworkSatisfied(
  observations: readonly SemanticRequestObservation[],
  step: JourneyStep,
): boolean {
  const ids = step.expectedNetworkResult.requiredRuleIds;
  if (ids.length === 0) return true;
  const matches = observations.filter((item) => ids.includes(item.ruleId) && item.classification === 'KNOWN_READ');
  return matches.length >= step.expectedNetworkResult.minimumRequiredMatches;
}

async function waitForRequiredNetwork(
  ctx: JourneyContext,
  step: JourneyStep,
  timeoutMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  if (step.expectedNetworkResult.scope !== 'step' && step.expectedNetworkResult.requiredRuleIds.length === 0) return true;
  const deadline = Date.now() + timeoutMs;
  while (!requiredNetworkSatisfied(ctx.network.semanticRequests(), step)) {
    if (Date.now() >= deadline) return false;
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
        });
        if (!stable) fail('global-shell-stability-failure');
        structuralPresent = await markerPresent(
          page,
          definition.globalShellRequirement.selector,
          definition.globalShellRequirement.minimumCount,
        );
        if (!structuralPresent) fail('global-shell-structural-failure');
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
            await locator.click({ timeout: step.timeoutMs });
          }
          await sleep(ACTION_SETTLE_MS);
        } catch {
          fail('safe-interaction-failure');
        } finally {
          ctx.network.endJourneyIntent(step.stepId);
        }
        if (!requiredNetworkSatisfied(ctx.network.semanticRequests(), step)) {
          const networkReady = await waitForRequiredNetwork(ctx, step, step.timeoutMs, sleep);
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
  if (step.expectedNetworkResult.scope === 'step' && !requiredNetworkSatisfied(ctx.network.semanticRequests(), step)) {
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
  const base = normalizedBase(opts.uiBaseUrl);
  const steps: JourneyStepResult[] = [];
  const markers: Record<string, boolean> = {};
  let routeStabilityMs = 0;

  for (const step of definition.allowedSteps) {
    const result = await executeStep(page, ctx, definition, step, base, opts);
    steps.push(result);
    if (result.actionType === 'NAVIGATE_APPROVED_ROUTE') routeStabilityMs = Math.max(routeStabilityMs, definition.stabilityRequirement.routeStableMs);
    if (result.status !== 'PASS') break;
  }

  for (const marker of definition.journeySpecificStructuralMarkers) {
    markers[marker.id] = await markerPresent(page, marker.selector, marker.minimumCount);
    if (!markers[marker.id]) recordIssue(ctx, 'journey-structural-readiness-failure', { journeyId: definition.journeyId, markerId: marker.id });
  }

  const observations = ctx.network.semanticRequests();
  const semantics = semanticSummary(observations);
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
    !ctx.monitor.failed;

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
    authValid: opts.authValid ?? true,
    oracleStatus: ctx.monitor.oracleFailed ? 'FAIL' : 'PASS',
    privacyStatus: 'PASS',
    safetyStatus,
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
    },
  });
  return evidence;
}
