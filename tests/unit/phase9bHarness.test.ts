// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — local/synthetic harness matrix (SPEC §21).
//
//   1.  context semanticOracle is absent by default
//   2.  explicit semanticOracle is passed to the network observer
//   3.  Phase 9B launcher rejects env != dev
//   4.  launcher rejects unknown args
//   5.  launcher has no journey selector
//   6.  launcher fixes the common-exchange journey
//   7.  no expectation        => acceptance gate FAIL
//   8.  stale expectation     => gate FAIL
//   9.  unavailable source    => gate FAIL
//   10. internal semantic error => gate FAIL
//   11. projection-limit result => gate FAIL
//   12. PASS receipt          => eligible acceptance evidence
//   13. ANOMALY receipt       => eligible evaluation evidence, finding preserved
//   14. NOT_APPLICABLE-only   => acceptance NOT proven
//   15. source evidence digest missing => FAIL
//   16. synthetic expectation rebinding => FAIL
//   17. mutation endpoint cannot be selected
//   18. production target cannot be selected
//   19. replay semantic summary must agree
//   20. raw values absent from acceptance summary
//
// Fixture/local only; no GitHub dependency; CI-safe.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { RunMonitor } from '../../src/state/run';
import { createNetworkObserver } from '../../src/browser/observers/networkObserver';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import type { EndpointSemanticClassification } from '../../src/core/safety/endpointSemantics';
import { createRealSourceResolver, type RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { SemanticHookOracle } from '../../src/oracles/semantic';
import { evaluateSemanticHook } from '../../src/oracles/semantic/hook';
import { validateSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import {
  evaluatePhase9bAcceptance,
  comparePhase9bReplaySummaries,
  summarizePhase9bPass,
  type Phase9bSemanticSummary,
} from '../../src/core/phase9b/summary';
import { evaluatePhase9bPreflight } from '../../src/core/phase9b/preflight';
import type { Phase9bFreshnessVerdict } from '../../src/core/phase9b/freshness';
import {
  FIXTURE_REPO_A,
  FIXTURE_SHA_A,
  FIXTURE_SHA_B,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';
import { getRippleJourneyDefinition, buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import { getPhase5Operation } from '../../src/api/phase5/catalog';

const TARGET_ID = 'ripple.common-exchange.read';
const EXPECTATION_ID = 'ripple.common-exchange.read.real-source-shape';
const APPROVED_SHA = '1111111111111111111111111111111111111111';
const SENTINEL_BODY = 'PHASE_9B_SENTINEL_RAW_BODY_X9Q';

const root = path.resolve(__dirname, '..', '..');

function fixtureEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'Phase 9B harness fixture',
    uiBaseUrl: origin,
    apiHosts: [host],
    authHosts: [],
    allowedHosts: [host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  };
}

function fixtureOracle(): { oracle: SemanticHookOracle; resolution: RealSourceResolution } {
  const state = createFixtureSourceState();
  const { derivedA } = deriveFixtureExpectations(state);
  const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
  const resolution: RealSourceResolution = {
    kind: 'RESOLVED',
    expectation,
    sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
  };
  return { oracle: { resolve: () => resolution }, resolution };
}

async function startServer(body: string): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

function passSummary(overrides: Partial<Phase9bSemanticSummary>): Phase9bSemanticSummary {
  return {
    schemaVersion: 'nightwatch.phase9b-pass-summary.v1',
    passId: 'first',
    targetId: TARGET_ID,
    expectationId: EXPECTATION_ID,
    sourceRepoId: 'mobingilabs/ripple-api',
    sourceSha: APPROVED_SHA,
    evidenceDigest: 'ev:sha256:0123456789abcdef01234567',
    resolvedExpectationCount: 1,
    receiptCount: 1,
    passCount: 1,
    anomalyCount: 0,
    notApplicableCount: 0,
    noExpectationCount: 0,
    sourceStaleCount: 0,
    sourceUnavailableCount: 0,
    invalidInputCount: 0,
    projectionLimitExceededCount: 0,
    internalErrorCount: 0,
    findingCount: 0,
    findingFingerprints: [],
    findingCategories: [],
    invariantTotal: 2,
    invariantPassCount: 2,
    invariantNaCount: 0,
    invariantViolationCount: 0,
    decisiveEvaluationCount: 1,
    ledgerReceiptCount: 1,
    ledgerOverflow: false,
    ...overrides,
  };
}

function validFreshness(): Phase9bFreshnessVerdict {
  return { kind: 'REDERIVE_FRESH_SNAPSHOT', sha: APPROVED_SHA };
}

// ---------------------------------------------------------------------------
// 1-2. Context semantic-oracle wiring (observer seam + source-level).
// ---------------------------------------------------------------------------

test.describe('Phase 9B — context semantic-oracle wiring (SPEC §13, §21.1-2)', () => {
  test('1 — semanticOracle is absent by default: observer records no evaluations without it', async ({ browser }) => {
    const server = await startServer(JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 1 } }]));
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9b-default-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9b-default-absent',
    });
    const monitor = new RunMonitor(env.failOn);
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
    });
    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      await page.goto(`${server.origin}/api/conforming`);
      await page.waitForTimeout(200);
      expect(observer.semanticEvaluations()).toEqual([]);
      expect(observer.semanticEvaluationLedgerOverflow()).toBe(false);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('2 — explicit semanticOracle is passed to the network observer and evaluated', async ({ browser }) => {
    const server = await startServer(JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 1 } }]));
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9b-explicit-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9b-explicit-oracle',
    });
    const monitor = new RunMonitor(env.failOn);
    const { oracle } = fixtureOracle();
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
      semanticOracle: oracle,
    });
    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      await page.goto(`${server.origin}/api/conforming`);
      await page.waitForTimeout(200);
      const evaluations = observer.semanticEvaluations();
      expect(evaluations.length).toBe(1);
      for (const receipt of evaluations) validateSemanticEvaluationReceipt(receipt);
      expect(evaluations[0]?.outcome).toBe('PASS');
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('context.ts exposes the optional semanticOracle option and passes it through', () => {
    const contextSource = fs.readFileSync(path.join(root, 'src/browser/context.ts'), 'utf8');
    expect(contextSource).toContain('semanticOracle?: SemanticResponseOracle');
    expect(contextSource).toMatch(/semanticOracle: opts\.semanticOracle/);
    // No global default and no environment-variable-created semantic authority.
    expect(contextSource).not.toMatch(/process\.env\.[A-Z_]*SEMANTIC/);
  });
});

// ---------------------------------------------------------------------------
// 3-6. Launcher arg parser (pure; no journey selector, fixed journey).
// ---------------------------------------------------------------------------

test.describe('Phase 9B — launcher argument contract (SPEC §14, §21.3-6)', () => {
  async function parse(args: string[]): Promise<unknown> {
    const module = await import(pathToFileURL(path.join(root, 'bin', 'phase9b-launcher-args.mjs')).href) as {
      parsePhase9bLauncherArgs: (args: string[]) => { env: string; storageState: string; help: boolean };
    };
    return module.parsePhase9bLauncherArgs(args);
  }

  test('3 — launcher rejects env != dev (NEXT/production forbidden)', async () => {
    await expect(parse(['--env=next', '--storage-state=/tmp/state.json'])).rejects.toThrow(/requires exactly one --env=dev/);
    await expect(parse(['--env=production', '--storage-state=/tmp/state.json'])).rejects.toThrow(/requires exactly one --env=dev/);
    await expect(parse(['--storage-state=/tmp/state.json'])).rejects.toThrow(/--env=dev/);
  });

  test('4 — launcher rejects unknown args and missing storage state', async () => {
    await expect(parse(['--env=dev', '--bogus'])).rejects.toThrow(/does not accept option --bogus/);
    await expect(parse(['--env=dev'])).rejects.toThrow(/--storage-state/);
  });

  test('5 — launcher has no journey selector', async () => {
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--journey-id=ripple-payer-exchange-read'])).rejects.toThrow(/no journey selector/);
  });

  test('6 — launcher fixes the common-exchange journey (no selector in runner)', () => {
    const runner = fs.readFileSync(path.join(root, 'tests/manual/phase9b-contained-dev-semantic.ts'), 'utf8');
    expect(runner).toContain("const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'");
    expect(runner).toContain('getRippleJourneyDefinition(SELECTED_JOURNEY_ID)');
    expect(runner).toContain("const SELECTED_TARGET_ID = 'ripple.common-exchange.read'");
    expect(runner).not.toContain('NIGHTWATCH_PHASE_2B_JOURNEY_ID');
  });

  test('launcher accepts exactly env=dev + storage-state', async () => {
    const parsed = await parse(['--env=dev', '--storage-state=/tmp/nw-state.json']);
    expect(parsed).toEqual({ env: 'dev', storageState: '/tmp/nw-state.json', help: false });
    const help = await parse(['--help']);
    expect(help).toEqual({ env: '', storageState: '', help: true });
  });
});

// ---------------------------------------------------------------------------
// 7-16. Acceptance gate (pure).
// ---------------------------------------------------------------------------

test.describe('Phase 9B — acceptance gate (SPEC §21.7-16, §25)', () => {
  test('7 — no expectation => acceptance gate FAIL', () => {
    const summary = passSummary({ resolvedExpectationCount: 0, receiptCount: 1, passCount: 0, decisiveEvaluationCount: 0 });
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('resolved expectations < 1');
    // Preflight also fails with zero derived expectations.
    const preflight = evaluatePhase9bPreflight({
      nightwatchHeadClean: true,
      implementationCiGreen: true,
      freshness: validFreshness(),
      targetId: TARGET_ID,
      derivedExpectationCount: 0,
      resolvedExpectationCount: 0,
      devReachable: true,
      knownRead: true,
      mutationStepCount: 0,
      authStructuralPass: true,
      proxyHealthy: true,
      targetExact: true,
      tracesEnabled: false,
      screenshotsEnabled: false,
    });
    expect(preflight.pass).toBe(false);
    expect(preflight.checks.find((c) => c.name === 'real-expectation-derived')?.status).toBe('FAIL');
  });

  test('8 — stale expectation => gate FAIL (resolver SOURCE_STALE + preflight)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.setSha(FIXTURE_REPO_A, 'cccccccccccccccccccccccccccccccccccccccc');
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: derivedA,
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    const resolution = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_STALE');
    const preflight = evaluatePhase9bPreflight({
      nightwatchHeadClean: true,
      implementationCiGreen: true,
      freshness: validFreshness(),
      targetId: TARGET_ID,
      derivedExpectationCount: 1,
      resolvedExpectationCount: 0,
      devReachable: true,
      knownRead: true,
      mutationStepCount: 0,
      authStructuralPass: true,
      proxyHealthy: true,
      targetExact: true,
      tracesEnabled: false,
      screenshotsEnabled: false,
    });
    expect(preflight.checks.find((c) => c.name === 'real-expectation-current')?.status).toBe('FAIL');
  });

  test('9 — unavailable source => gate FAIL (resolver SOURCE_UNAVAILABLE + freshness BLOCK)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.removeRepo(FIXTURE_REPO_A);
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: derivedA,
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    expect(resolver.resolve({ targetId: 'fixture-a.common-exchange.read' }).kind).toBe('SOURCE_UNAVAILABLE');
    const preflight = evaluatePhase9bPreflight({
      nightwatchHeadClean: true,
      implementationCiGreen: true,
      freshness: { kind: 'BLOCK', reason: 'SOURCE_FRESHNESS_UNRESOLVED' },
      targetId: TARGET_ID,
      derivedExpectationCount: 1,
      resolvedExpectationCount: 1,
      devReachable: true,
      knownRead: true,
      mutationStepCount: 0,
      authStructuralPass: true,
      proxyHealthy: true,
      targetExact: true,
      tracesEnabled: false,
      screenshotsEnabled: false,
    });
    expect(preflight.checks.find((c) => c.name === 'source-freshness')?.status).toBe('FAIL');
  });

  test('10 — internal semantic error => gate FAIL', () => {
    const result = evaluatePhase9bAcceptance(passSummary({ internalErrorCount: 1, passCount: 0 }), { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('INTERNAL_ERROR count 1 != 0');
  });

  test('11 — projection-limit result => gate FAIL', () => {
    const result = evaluatePhase9bAcceptance(passSummary({ projectionLimitExceededCount: 1, passCount: 0 }), { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('PROJECTION_LIMIT_EXCEEDED count 1 != 0');
  });

  test('12 — PASS receipt => eligible acceptance evidence', () => {
    const result = evaluatePhase9bAcceptance(passSummary({}), { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test('13 — ANOMALY receipt => eligible evaluation evidence but the finding is preserved', () => {
    const summary = passSummary({
      anomalyCount: 1,
      passCount: 0,
      findingCount: 1,
      findingFingerprints: ['fp:sha256:0123456789abcdef0123456789abcdef01234567'],
      findingCategories: ['SOURCE_EXPECTATION_MISMATCH'],
      invariantViolationCount: 1,
    });
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(true); // decisive via ANOMALY; evaluation evidence eligible
    expect(result.failures).toEqual([]);
    // The finding must NOT be suppressed just because acceptance passes.
    expect(summary.findingCount).toBe(1);
    expect(summary.findingFingerprints).toHaveLength(1);
  });

  test('14 — NOT_APPLICABLE-only => acceptance NOT proven', () => {
    const result = evaluatePhase9bAcceptance(
      passSummary({ passCount: 0, notApplicableCount: 1, decisiveEvaluationCount: 0, invariantPassCount: 0, invariantNaCount: 1 }),
      { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA }
    );
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('decisive evaluations < 1');
  });

  test('15 — source evidence digest missing => FAIL', () => {
    const result = evaluatePhase9bAcceptance(passSummary({ evidenceDigest: null }), { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('evidence digest'))).toBe(true);
    // Resolver-level: an expectation without an evidence digest is never
    // current (REAL_SOURCE_EXPECTATION_PROOF_MISSING semantics).
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.targetId === 'fixture-a.common-exchange.read')!;
    const withoutDigest = { ...expectation, sourceProvenance: { ...expectation.sourceProvenance, evidenceDigest: undefined } };
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [withoutDigest],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    expect(resolver.resolve({ targetId: 'fixture-a.common-exchange.read' }).kind).toBe('SOURCE_STALE');
  });

  test('16 — synthetic expectation rebinding => FAIL (never RESOLVED, never PASS)', () => {
    // A synthetic fixture expectation whose provenance SHA is relabeled to a
    // real-looking SHA must never resolve: the resolver's currentness SHAs
    // disagree with the bound SHA (SOURCE_STALE), and a forged digest that
    // does not match the real source re-extraction is SOURCE_STALE too.
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.targetId === 'fixture-a.common-exchange.read')!;
    const rebound = {
      ...expectation,
      sourceProvenance: {
        ...expectation.sourceProvenance,
        sha: FIXTURE_SHA_B, // synthetic relabeling with another real-looking SHA
        evidenceDigest: 'ev:sha256:ffffffffffffffffffffffffffffffffffffffff',
      },
    };
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [rebound],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    // (a) bound SHA (B) != current SHA (A) -> SOURCE_STALE.
    const resolution = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_STALE');
    // (b) even with matching SHAs, a forged digest fails the mechanical
    // re-extraction -> SOURCE_STALE.
    state.map.setSha(FIXTURE_REPO_A, FIXTURE_SHA_B);
    const sameSha = {
      ...rebound,
      sourceProvenance: { ...rebound.sourceProvenance, sha: FIXTURE_SHA_B },
    };
    const resolver2 = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [sameSha],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    expect(resolver2.resolve({ targetId: 'fixture-a.common-exchange.read' }).kind).toBe('SOURCE_STALE');
  });
});

// ---------------------------------------------------------------------------
// 17-18. Mutation / production exclusion (source-level + registry).
// ---------------------------------------------------------------------------

test.describe('Phase 9B — mutation and production exclusion (SPEC §21.17-18, §39)', () => {
  test('17 — mutation endpoint cannot be selected: write rule is KNOWN_MUTATION and the journey has zero mutation steps', () => {
    const env = { apiHosts: ['dev-api.example.invalid'] };
    const rules = buildRippleJourneyEndpointRegistry(env);
    const write = rules.find((rule) => rule.id === 'ripple.common-exchange.write');
    expect(write?.classification).toBe('KNOWN_MUTATION');
    const definition = getRippleJourneyDefinition('ripple-common-exchange-read');
    expect(definition.allowedSteps.every((step) => step.semanticClassification === 'KNOWN_READ' || step.semanticClassification === 'LOCAL_ONLY')).toBe(true);
    // The selected read target is a Phase 5 KNOWN_READ operation.
    expect(getPhase5Operation('ripple.common-exchange.read').semanticClass).toBe('KNOWN_READ');
  });

  test('18 — production target cannot be selected: launcher rejects URL overrides and the canonical target is exact', () => {
    // The parser rejects any --ui-url override.
    // (parser behavior covered in the launcher contract describe; here the
    // runner source-level proof that NIGHTWATCH_UI_URL is refused)
    const runner = fs.readFileSync(path.join(root, 'tests/manual/phase9b-contained-dev-semantic.ts'), 'utf8');
    expect(runner).toContain('NIGHTWATCH_UI_URL is not accepted');
    expect(runner).toContain('validateUiUrl(env, env.uiBaseUrl)');
    const preflight = evaluatePhase9bPreflight({
      nightwatchHeadClean: true,
      implementationCiGreen: true,
      freshness: validFreshness(),
      targetId: TARGET_ID,
      derivedExpectationCount: 1,
      resolvedExpectationCount: 1,
      devReachable: true,
      knownRead: true,
      mutationStepCount: 0,
      authStructuralPass: true,
      proxyHealthy: true,
      targetExact: false,
      tracesEnabled: false,
      screenshotsEnabled: false,
    });
    expect(preflight.checks.find((c) => c.name === 'canonical-dev-target-exact')?.status).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------
// 19-20. Replay comparison + raw-value absence (pure).
// ---------------------------------------------------------------------------

test.describe('Phase 9B — replay comparison and raw-value absence (SPEC §21.19-20, §36)', () => {
  test('19 — replay semantic summary must agree (and disagree only on real divergence)', () => {
    const first = passSummary({ passId: 'first' });
    const replay = passSummary({ passId: 'replay' });
    expect(comparePhase9bReplaySummaries(first, replay).pass).toBe(true);
    const divergent = comparePhase9bReplaySummaries(first, passSummary({ passId: 'replay', passCount: 0, anomalyCount: 1, findingCount: 1, findingFingerprints: ['fp:sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcd'], findingCategories: ['SOURCE_EXPECTATION_MISMATCH'], invariantViolationCount: 1 }));
    expect(divergent.pass).toBe(false);
    expect(divergent.mismatches.some((m) => m.includes('PASS count'))).toBe(true);
  });

  test('20 — raw values are absent from the acceptance summary (sentinel leak check)', () => {
    // Build receipts from a REAL hook evaluation over a sentinel-bearing raw
    // body: the receipts are safe by construction and the summary carries
    // only counts/provenance — the sentinel must never appear anywhere.
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
    const resolution: RealSourceResolution = { kind: 'RESOLVED', expectation, sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A } };
    const oracle: SemanticHookOracle = { resolve: () => resolution };
    const hookResult = evaluateSemanticHook({
      oracle,
      rawText: JSON.stringify([{ month: SENTINEL_BODY, exchange_rate: { jpy: 1 } }]),
      status: 200,
      contentType: 'application/json',
      url: 'https://apidev.alphaus.cloud/m/ripple/exchange_rate/global/aws',
      method: 'GET',
      targetId: 'fixture-a.common-exchange.read',
      journeyId: 'ripple-common-exchange-read',
    });
    expect(hookResult.receipt).not.toBeNull();
    const summary = summarizePhase9bPass({
      passId: 'first',
      receipts: hookResult.receipt === null ? [] : [hookResult.receipt],
      ledgerReceiptCount: 1,
      ledgerOverflow: false,
      findings: [...hookResult.findings],
      targetId: 'fixture-a.common-exchange.read',
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain(SENTINEL_BODY);
    expect(serialized).not.toContain('jpy');
    expect(serialized).not.toContain('apidev.alphaus.cloud/m/ripple');
  });
});
