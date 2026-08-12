import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { createNightwatchContext } from '../../src/browser/context';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import {
  buildRippleJourneyEndpointRegistry,
  getRippleJourneyDefinition,
} from '../../src/products/ripple/journeyContracts';
import {
  runDeclarativeJourney,
} from '../../src/core/journeys/engine';
import { compareJourneyReplay } from '../../src/core/journeys/replay';
import type { JourneyDefinition, JourneyStep } from '../../src/core/journeys/types';
import {
  startJourneyFixtureServer,
  type JourneyFixtureHandle,
  type JourneyFixtureVariant,
} from '../../src/browser/fixtures/journeyFixtureServer';

function fixtureEnvironment(server: JourneyFixtureHandle): EnvironmentConfig {
  return {
    name: 'local',
    label: 'Phase 2B journey fixture',
    uiBaseUrl: server.origin,
    apiHosts: [server.host],
    authHosts: [],
    allowedHosts: [server.host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: ['sentry.example.invalid'],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [
      'hard-failure',
      'pageerror',
      'console-error',
      'request-failed',
      'malformed-json',
      'malformed-ndjson',
      'navigation-failed',
      'stability-timeout',
    ],
  };
}

async function runFixture(
  browser: import('@playwright/test').Browser,
  variant: JourneyFixtureVariant,
  definition: JourneyDefinition = getRippleJourneyDefinition('ripple-payer-exchange-read'),
  authenticated = false,
): Promise<{
  evidence: Awaited<ReturnType<typeof runDeclarativeJourney>>;
  recorder: RunRecorder;
  server: JourneyFixtureHandle;
  monitorFailed: boolean;
}> {
  const server = await startJourneyFixtureServer(variant);
  const env = fixtureEnvironment(server);
  const recorder = new RunRecorder({
    runId: `journey-fixture-${variant}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: `phase-2b-journey-${variant}`,
    authenticated,
  });
  const ctx = await createNightwatchContext(browser, {
    env,
    recorder,
    uiBaseUrl: server.origin,
    trace: 'off',
    endpointRegistry: buildRippleJourneyEndpointRegistry(env),
  });
  let evidence: Awaited<ReturnType<typeof runDeclarativeJourney>>;
  try {
    evidence = await runDeclarativeJourney(
      ctx.page,
      { recorder, monitor: ctx.monitor, network: ctx.network },
      definition,
      { uiBaseUrl: server.origin },
    );
    await recorder.finalize({ passed: evidence.passed });
  } finally {
    const monitorFailed = ctx.monitor.failed;
    await ctx.close();
    await server.close();
    return { evidence: evidence!, recorder, server, monitorFailed };
  }
}

function interactionDefinition(base: JourneyDefinition): JourneyDefinition {
  const interaction: JourneyStep = {
    stepId: 'synthetic-safe-control',
    purpose: 'Synthetic control used only to prove the action mutation tripwire.',
    actionType: 'CLICK_READ_ONLY_CONTROL',
    sourceProof: 'synthetic fixture fixed data-nw-control selector; test-only safety probe',
    semanticClassification: 'KNOWN_READ',
    allowedRoute: ['/payer-exchange-rate-v2'],
    expectedRouteResult: ['/payer-exchange-rate-v2'],
    expectedStructuralResult: base.globalShellRequirement,
    expectedNetworkResult: {
      scope: 'step',
      requiredRuleIds: [],
      allowedClassifications: ['KNOWN_READ'],
      minimumRequiredMatches: 0,
    },
    timeoutMs: 5_000,
    privacyConstraint: 'fixed selector and metadata-only evidence',
    failureClassification: 'SYNTHETIC_TRIPWIRE_PROBE',
    selector: '[data-nw-control="safe-read-control"]',
  };
  return { ...base, allowedSteps: [...base.allowedSteps, interaction] };
}

test('real declarative engine runs the source-shaped read journey and distinguishes passive UNKNOWN', async ({ browser }) => {
  const run = await runFixture(browser, 'good');
  expect(run.evidence.passed).toBe(true);
  expect(run.evidence.semanticRuleIds).toContain('ripple.payer-exchange.read');
  expect(run.evidence.passiveUnknownCount).toBeGreaterThan(0);
  expect(run.evidence.actionUnknownCount).toBe(0);
  expect(run.evidence.mutationCount).toBe(0);
  expect(run.evidence.safetyStatus).toBe('PASS');
});

test('route mismatch and missing structural selector are journey oracle failures', async ({ browser }) => {
  const mismatch = await runFixture(browser, 'route-mismatch');
  expect(mismatch.evidence.passed).toBe(false);
  expect(mismatch.evidence.finalRouteClass).toBe('UNEXPECTED_ROUTE');

  const missing = await runFixture(browser, 'missing-selector');
  expect(missing.evidence.passed).toBe(false);
  expect(missing.evidence.journeyMarkers.PAYER_EXCHANGE_DATA_TABLE).toBe(false);
});

test('known mutation caused by an interaction is blocked and fails safety', async ({ browser }) => {
  const definition = interactionDefinition(getRippleJourneyDefinition('ripple-payer-exchange-read'));
  const run = await runFixture(browser, 'mutation-action', definition);
  expect(run.evidence.passed).toBe(false);
  expect(run.evidence.mutationCount).toBeGreaterThan(0);
  expect(run.evidence.safetyStatus).toBe('FAIL');
  expect(run.monitorFailed).toBe(true);
});

test('unknown request caused by an interaction is not dynamically blessed', async ({ browser }) => {
  const definition = interactionDefinition(getRippleJourneyDefinition('ripple-payer-exchange-read'));
  const run = await runFixture(browser, 'unknown-action', definition);
  expect(run.evidence.passed).toBe(false);
  expect(run.evidence.actionUnknownCount).toBeGreaterThan(0);
  expect(run.evidence.mutationCount).toBe(0);
  expect(run.evidence.safetyStatus).toBe('FAIL');
});

test('runtime, malformed protocol metadata, and client cancellation remain distinct outcomes', async ({ browser }) => {
  const runtime = await runFixture(browser, 'runtime-exception');
  expect(runtime.evidence.passed).toBe(false);
  expect(runtime.evidence.oracleStatus).toBe('FAIL');

  const malformed = await runFixture(browser, 'malformed-json');
  expect(malformed.evidence.passed).toBe(false);
  expect(malformed.evidence.oracleStatus).toBe('FAIL');

  const cancellation = await runFixture(browser, 'cancellation');
  expect(cancellation.evidence.passed).toBe(true);
  expect(cancellation.evidence.safetyStatus).toBe('PASS');
});

test('production and unknown destinations fail closed in the real engine', async ({ browser }) => {
  const production = await runFixture(browser, 'production-destination');
  expect(production.evidence.passed).toBe(false);
  expect(production.evidence.safetyStatus).toBe('FAIL');

  const unknown = await runFixture(browser, 'unknown-destination');
  expect(unknown.evidence.passed).toBe(false);
  expect(unknown.evidence.safetyStatus).toBe('FAIL');
});

test('authenticated evidence remains metadata-only for fake secret traffic', async ({ browser }) => {
  const run = await runFixture(browser, 'privacy-secret', undefined, true);
  const files = fs.readdirSync(run.recorder.dir).map((file) => path.join(run.recorder.dir, file));
  const text = files
    .filter((file) => fs.statSync(file).isFile() && !file.endsWith('.zip'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  expect(text).not.toContain('SYNTHETIC_FAKE_SECRET');
  expect(run.evidence.passed).toBe(true);
});

test('fresh replay comparator accepts bounded timing/request variance', () => {
  const definition = getRippleJourneyDefinition('ripple-payer-exchange-read');
  const base = {
    journeyId: definition.journeyId,
    contractSourceSha: definition.sourceSha,
    passed: true,
    finalRouteClass: '/payer-exchange-rate-v2',
    globalShellReady: true,
    journeyMarkers: { PAYER_EXCHANGE_PAGE: true, PAYER_EXCHANGE_DATA_TABLE: true },
    stepResults: [
      { stepId: 'payer-navigate', actionType: 'NAVIGATE_APPROVED_ROUTE' as const, status: 'PASS' as const, routeClass: '/payer-exchange-rate-v2', structuralMarkerId: 'GLOBAL_RIPPLE_AUTHENTICATED_SHELL', structuralPresent: true, requiredReadRuleIds: ['ripple.payer-exchange.read'], elapsedMs: 100 },
      { stepId: 'payer-structural-checkpoint', actionType: 'WAIT_STRUCTURAL_CHECKPOINT' as const, status: 'PASS' as const, routeClass: '/payer-exchange-rate-v2', structuralMarkerId: 'PAYER_EXCHANGE_DATA_TABLE', structuralPresent: true, requiredReadRuleIds: [], elapsedMs: 10 },
    ],
    semanticRuleIds: ['ripple.payer-exchange.read'],
    semanticClasses: ['KNOWN_READ'] as const,
    passiveUnknownCount: 2,
    actionUnknownCount: 0,
    mutationCount: 0,
    routeStabilityMs: 750,
    authValid: true,
    oracleStatus: 'PASS' as const,
    privacyStatus: 'PASS' as const,
    safetyStatus: 'PASS' as const,
  };
  const first = { ...base };
  const replay = { ...base, routeStabilityMs: 812, passiveUnknownCount: 3 };
  const comparison = compareJourneyReplay(first, replay);
  expect(comparison.passed).toBe(true);
  expect(comparison.strictInvariantMismatches).toEqual([]);
  expect(comparison.categories).toContain('EXPECTED_TIMING_VARIANCE');
  expect(comparison.categories).toContain('EXPECTED_REQUEST_COUNT_VARIANCE');
});

test('fresh replay comparator rejects structural divergence', () => {
  const definition = getRippleJourneyDefinition('ripple-payer-exchange-read');
  const first = {
    journeyId: definition.journeyId,
    contractSourceSha: definition.sourceSha,
    passed: true,
    finalRouteClass: '/payer-exchange-rate-v2',
    globalShellReady: true,
    journeyMarkers: { PAYER_EXCHANGE_DATA_TABLE: true },
    stepResults: [],
    semanticRuleIds: ['ripple.payer-exchange.read'],
    semanticClasses: ['KNOWN_READ'] as const,
    passiveUnknownCount: 0,
    actionUnknownCount: 0,
    mutationCount: 0,
    routeStabilityMs: 750,
    authValid: true,
    oracleStatus: 'PASS' as const,
    privacyStatus: 'PASS' as const,
    safetyStatus: 'PASS' as const,
  };
  const replay = { ...first, journeyMarkers: { PAYER_EXCHANGE_DATA_TABLE: false } };
  const comparison = compareJourneyReplay(first, replay);
  expect(comparison.passed).toBe(false);
  expect(comparison.strictInvariantMismatches).toContain('structural-checkpoints');
  expect(comparison.categories).toContain('STRUCTURAL_DIVERGENCE');
});
