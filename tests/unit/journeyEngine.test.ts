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
      'critical-resource-status',
      'known-read-status',
      'critical-resource-content-type',
      'known-read-content-type',
      'unhandled-rejection',
      'csp-failure',
    ],
  };
}

async function runFixture(
  browser: import('@playwright/test').Browser,
  variant: JourneyFixtureVariant,
  definition: JourneyDefinition = getRippleJourneyDefinition('ripple-payer-exchange-read'),
  authenticated = false,
  authValid = true,
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
    bootstrapDiagnostics: true,
    endpointRegistry: buildRippleJourneyEndpointRegistry(env),
    journeyId: definition.journeyId,
  });
  let evidence: Awaited<ReturnType<typeof runDeclarativeJourney>>;
  try {
    evidence = await runDeclarativeJourney(
      ctx.page,
      { recorder, monitor: ctx.monitor, network: ctx.network },
      definition,
      { uiBaseUrl: server.origin, authValid },
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

test('late responses retain the action that initiated the request', async ({ browser }) => {
  const first = await runFixture(browser, 'late-response');
  const replay = await runFixture(browser, 'late-response');
  expect(first.evidence.resourceObservations).toEqual(expect.arrayContaining([
    expect.objectContaining({
      role: 'API_KNOWN_READ',
      state: 'COMPLETED',
      stepId: 'payer-navigate',
    }),
  ]));
  expect(first.evidence.oracleStatus).toBe('FAIL');
  expect(first.evidence.oracleObservations?.find((item) => item.oracleId === 'malformed-json')?.fingerprint)
    .toBe(replay.evidence.oracleObservations?.find((item) => item.oracleId === 'malformed-json')?.fingerprint);
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

test('expired or page-unreadable auth is an auth-state result before any journey action', async ({ browser }) => {
  const run = await runFixture(browser, 'good', undefined, false, false);
  expect(run.evidence.passed).toBe(false);
  expect(run.evidence.authValid).toBe(false);
  expect(run.evidence.finalRouteClass).toBe('AUTH_STATE_INVALID');
  expect(run.evidence.failureAttribution?.primaryFailure).toBe('AUTH_STATE_INVALID');
  expect(run.evidence.oracleObservations?.map((item) => item.anomalyClass)).toContain('AUTH_STATE_INVALID');
  expect(run.server.requests.filter((item) => item.url.includes('/m/'))).toHaveLength(0);
});

// R4-14 / review-4 task 4.1 — D-149's refusal count belongs to the RECORDED run
// summary on every exit path. The assertion reads the recorder's own manifest
// and event stream, never the observer: a summary that omits the counts is a
// lost-oracle-coverage claim the operator cannot see.
test('the recorded run summary carries captureFailureCounts on both exit paths', async ({ browser }) => {
  const readRecorded = (directory: string) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')) as Record<string, unknown>;
    const entry = manifest.journeyEvidence as Record<string, unknown> | undefined;
    const events = fs.readFileSync(path.join(directory, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((line) => JSON.parse(line) as { type?: string; data?: Record<string, unknown> });
    // The LAST 'journey'-typed event is the engine's completion event; the
    // observer also emits a journey-scoped event earlier in the stream.
    const journey = events.filter((event) => event.type === 'journey').at(-1);
    return { entry, journey };
  };
  const main = await runFixture(browser, 'good');
  const mainRecorded = readRecorded(main.recorder.dir);
  expect(mainRecorded.entry).toBeDefined();
  expect(Object.prototype.hasOwnProperty.call(mainRecorded.entry, 'captureFailureCounts')).toBe(true);
  expect(typeof mainRecorded.entry!.captureFailureCounts).toBe('object');
  expect(mainRecorded.journey).toBeDefined();
  expect(Object.prototype.hasOwnProperty.call(mainRecorded.journey!.data, 'captureFailureCounts')).toBe(true);
  // The auth-invalid early return records the counts too, on its own manifest
  // entry.
  const invalid = await runFixture(browser, 'good', undefined, false, false);
  const invalidRecorded = readRecorded(invalid.recorder.dir);
  expect(invalidRecorded.entry).toBeDefined();
  expect(invalidRecorded.entry!.authValid).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(invalidRecorded.entry, 'captureFailureCounts')).toBe(true);
});

// R5-10 / review-5 task A8.1 — the previous test only checked that the key EXISTS, so a
// hard-coded `{}` passed it. A real refusal must reach the RECORDED summary as a non-zero count.
test('a real body-read refusal reaches the recorded run summary as a non-zero BODY_READ_ACQUISITION_BOUND count', async ({ browser }) => {
  const run = await runFixture(browser, 'response-burst');
  const manifest = JSON.parse(fs.readFileSync(path.join(run.recorder.dir, 'manifest.json'), 'utf8')) as Record<string, unknown>;
  const entry = manifest.journeyEvidence as { captureFailureCounts?: Record<string, number>; captureFailureCodes?: string[]; captureStatus?: string } | undefined;
  expect(entry).toBeDefined();
  expect(entry!.captureStatus).toBe('INCOMPLETE');
  expect(entry!.captureFailureCodes).toContain('BODY_READ_ACQUISITION_BOUND');
  expect(entry!.captureFailureCounts?.['BODY_READ_ACQUISITION_BOUND'] ?? 0).toBeGreaterThanOrEqual(1);
  const events = fs.readFileSync(path.join(run.recorder.dir, 'events.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((line) => JSON.parse(line) as { type?: string; data?: { captureFailureCounts?: Record<string, number> } });
  const completion = events.filter((event) => event.type === 'journey').at(-1);
  expect(completion?.data?.captureFailureCounts?.['BODY_READ_ACQUISITION_BOUND'] ?? 0).toBeGreaterThanOrEqual(1);
  // The evidence the engine returns carries the same count (one source of truth).
  expect(run.evidence.captureFailureCounts?.['BODY_READ_ACQUISITION_BOUND'] ?? 0).toBe(entry!.captureFailureCounts?.['BODY_READ_ACQUISITION_BOUND']);
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

test('Phase 2C real observer matrix separates critical, asset, optional, and protocol failures', async ({ browser }) => {
  const critical = await runFixture(browser, 'critical-js-500');
  expect(critical.evidence.passed).toBe(false);
  expect(critical.evidence.oracleStatus).toBe('FAIL');
  expect(critical.evidence.resourceObservations).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: 'APPLICATION_ENTRY', state: 'HTTP_FAILED' }),
  ]));
  expect(critical.evidence.oracleObservations?.map((item) => item.oracleId)).toContain('critical-resource-status');

  const font = await runFixture(browser, 'font-502');
  expect(font.evidence.passed).toBe(true);
  expect(font.monitorFailed).toBe(false);
  expect(font.evidence.resourceObservations).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: 'FONT', state: 'HTTP_FAILED' }),
  ]));
  expect(font.evidence.oracleObservations?.map((item) => item.oracleId)).toContain('unexpected-status');
  expect(font.evidence.oracleObservations?.map((item) => item.anomalyClass)).toContain('DEV_INFRA_TRANSIENT');

  const optionalImage = await runFixture(browser, 'optional-image-failure');
  expect(optionalImage.evidence.passed).toBe(true);
  expect(optionalImage.monitorFailed).toBe(false);
  expect(optionalImage.evidence.resourceObservations).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: 'IMAGE', state: 'HTTP_FAILED' }),
  ]));

  const wrongContent = await runFixture(browser, 'js-html');
  expect(wrongContent.evidence.passed).toBe(false);
  expect(wrongContent.evidence.oracleObservations?.map((item) => item.oracleId)).toContain('critical-resource-content-type');
});

test('Phase 2C runtime/security oracles are admitted separately from warnings', async ({ browser }) => {
  const rejection = await runFixture(browser, 'unhandled-rejection');
  expect(rejection.evidence.passed).toBe(false);
  expect(rejection.evidence.oracleObservations?.map((item) => item.oracleId)).toContain('unhandled-rejection');

  const csp = await runFixture(browser, 'csp-block');
  expect(csp.evidence.passed).toBe(false);
  expect(csp.evidence.oracleObservations?.map((item) => item.oracleId)).toContain('csp-failure');

  const warning = await runFixture(browser, 'console-warning');
  expect(warning.evidence.passed).toBe(true);
  expect(warning.monitorFailed).toBe(false);
  expect(warning.evidence.oracleObservations?.map((item) => item.oracleId)).not.toContain('console-warning');
});
