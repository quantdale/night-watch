// ---------------------------------------------------------------------------
// Nightwatch Phase 10B — local/synthetic deep-acceptance harness matrix
// (authorization §11, §12).
//
//   1.  Phase 9B historical harness still selects the shape expectation
//   2.  Phase 10B selects the deep expectation (and never the shape one)
//   3.  Phase 10B cannot select any other journey
//   4.  Phase 10B cannot select payer / account-inventory (target + expectation
//       selectors rejected)
//   5.  Phase 10B rejects env != dev (NEXT/production forbidden)
//   6.  arbitrary target URL rejected
//   7.  deep expectation absent        => FAIL
//   8.  old shape expectation resolved instead => FAIL
//   9.  source stale                   => FAIL
//   10. source unavailable             => FAIL
//   11. deep expectation with the expected type invariant missing => FAIL
//   12. clean full deep-invariant PASS => eligible
//   13. root-only PASS + item N/A      => NOT eligible (deep invariant not
//       observed)
//   14. any INTERNAL_ERROR             => FAIL
//   15. projection limit               => FAIL
//   16. protocol failure (no receipts) => FAIL
//   17. mutation target impossible
//   18. production target impossible
//   19. FIRST/REPLAY full-deep summaries deterministic
//   20. safe summary contains no raw runtime values
//   21. (extra) a deep item-type violation is decisive: ANOMALY +
//       TYPE_CONTRADICTED finding, deep acceptance FAIL — the L3 contract
//       itself is load-bearing
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
  comparePhase9bReplaySummaries,
  summarizePhase9bPass,
  type Phase9bSemanticSummary,
} from '../../src/core/phase9b/summary';
import { evaluatePhase9bPreflight } from '../../src/core/phase9b/preflight';
import type { Phase9bFreshnessVerdict } from '../../src/core/phase9b/freshness';
import {
  assertDeepTypeContract,
  evaluatePhase10bDeepAcceptance,
  expectedInvariantTotalFor,
  phase10bFreshnessBlockToken,
  PHASE_10B_DEEP_TYPE_CONTRACT,
} from '../../src/core/phase10b/deepAcceptance';
import { evaluateContainedDevDeepAcceptance } from '../../src/core/semanticAcceptance';
import {
  createPhase10FixtureState,
  derivePhase10FixtureExpectations,
  PHASE10_FIXTURE_REPO,
  PHASE10_FIXTURE_SHA,
} from '../../corpus/phase10/source-fixture/phase10Fixtures';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import { getRippleJourneyDefinition, buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import { getPhase5Operation } from '../../src/api/phase5/catalog';

const TARGET_ID = 'ripple.common-exchange.read';
const DEEP_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-deep';
const SHAPE_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-shape';
const APPROVED_SHA = '1111111111111111111111111111111111111111';
const SENTINEL_BODY = 'PHASE_10B_SENTINEL_RAW_BODY_X9Q';

const root = path.resolve(__dirname, '..', '..');

function fixtureEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'Phase 10B harness fixture',
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

/** The fixture deep expectation (CI-safe; mirrors the current real registry
 *  v2 common-exchange recipe). */
function fixtureDeepExpectation(): ReturnType<typeof derivePhase10FixtureExpectations>['derived'][number]['expectation'] {
  const report = derivePhase10FixtureExpectations();
  const found = report.derived.find((d) => d.expectation.expectationId === 'fixture-10.common-exchange.read.real-source-deep');
  expect(found).toBeDefined();
  return found!.expectation;
}

function fixtureDigest(): string {
  const report = derivePhase10FixtureExpectations();
  const found = report.derived.find((d) => d.expectation.expectationId === 'fixture-10.common-exchange.read.real-source-deep');
  expect(found).toBeDefined();
  return found!.evidenceDigest;
}

function fixtureDeepOracle(): { oracle: SemanticHookOracle; resolution: RealSourceResolution } {
  const expectation = fixtureDeepExpectation();
  const resolution: RealSourceResolution = {
    kind: 'RESOLVED',
    expectation,
    sourceSnapshot: { repoId: PHASE10_FIXTURE_REPO, sha: PHASE10_FIXTURE_SHA },
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
    expectationId: DEEP_EXPECTATION_ID,
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
    partialCoverageCount: 0,
    findingCount: 0,
    findingFingerprints: [],
    findingCategories: [],
    evidenceAcceptanceClasses: ['LOCAL_SYNTHETIC'],
    invariantTotal: 4,
    invariantPassCount: 4,
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

function deepExpectationArg(): { expectationId: string; approvedSha: string; expectedInvariantTotal: number } {
  return { expectationId: DEEP_EXPECTATION_ID, approvedSha: APPROVED_SHA, expectedInvariantTotal: 4 };
}

// ---------------------------------------------------------------------------
// 1-2. Fixed identity: historical shape preserved, deep selected.
// ---------------------------------------------------------------------------

test.describe('Phase 10B — fixed identity (authorization §5, §6, §12)', () => {
  test('1 — Phase 9B historical harness still selects the shape expectation', () => {
    const phase9bRunner = fs.readFileSync(path.join(root, 'tests/manual/phase9b-contained-dev-semantic.ts'), 'utf8');
    expect(phase9bRunner).toContain("const SELECTED_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-shape'");
    // The historical runner must NOT silently select the deep identity.
    expect(phase9bRunner).not.toContain('real-source-deep');
    // The Phase 10B runner must NOT silently select the shape identity.
    const phase10bRunner = fs.readFileSync(path.join(root, 'tests/manual/phase10b-contained-dev-deep-semantic.ts'), 'utf8');
    expect(phase10bRunner).not.toContain("const SELECTED_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-shape'");
  });

  test('2 — Phase 10B selects the deep expectation (runner + resolver level)', () => {
    const runner = fs.readFileSync(path.join(root, 'tests/manual/phase10b-contained-dev-deep-semantic.ts'), 'utf8');
    expect(runner).toContain("const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'");
    expect(runner).toContain('getRippleJourneyDefinition(SELECTED_JOURNEY_ID)');
    expect(runner).toContain("const SELECTED_TARGET_ID = 'ripple.common-exchange.read'");
    expect(runner).toContain("const SELECTED_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-deep'");
    expect(runner).not.toContain('NIGHTWATCH_PHASE_2B_JOURNEY_ID');
    // The fixture deep expectation derives with the exact deep identity and
    // carries the L3 item type contract (expected total derived, not
    // hard-coded independently).
    const expectation = fixtureDeepExpectation();
    expect(expectation.expectationId).toBe('fixture-10.common-exchange.read.real-source-deep');
    expect(expectedInvariantTotalFor(expectation)).toBe(4);
    expect(() => assertDeepTypeContract(expectation, PHASE_10B_DEEP_TYPE_CONTRACT)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3-6. Launcher argument contract (pure; no selectors).
// ---------------------------------------------------------------------------

test.describe('Phase 10B — launcher argument contract (authorization §6, §27)', () => {
  async function parse(args: string[]): Promise<unknown> {
    const module = await import(pathToFileURL(path.join(root, 'bin', 'phase10b-launcher-args.mjs')).href) as {
      parsePhase10bLauncherArgs: (args: string[]) => { env: string; storageState: string; help: boolean };
    };
    return module.parsePhase10bLauncherArgs(args);
  }

  test('3 — launcher has no journey selector', async () => {
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--journey-id=ripple-payer-exchange-read'])).rejects.toThrow(/no journey selector/);
  });

  test('4 — launcher cannot select payer / account-inventory (target + expectation selectors rejected)', async () => {
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--target-id=ripple.payer-exchange.read'])).rejects.toThrow(/no target selector/);
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--target-id=ripple.account-inventory.read'])).rejects.toThrow(/no target selector/);
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--expectation-id=ripple.payer-exchange.read.real-source-deep'])).rejects.toThrow(/no expectation selector/);
  });

  test('5 — launcher rejects env != dev (NEXT/production forbidden)', async () => {
    await expect(parse(['--env=next', '--storage-state=/tmp/state.json'])).rejects.toThrow(/requires exactly one --env=dev/);
    await expect(parse(['--env=production', '--storage-state=/tmp/state.json'])).rejects.toThrow(/requires exactly one --env=dev/);
    await expect(parse(['--storage-state=/tmp/state.json'])).rejects.toThrow(/--env=dev/);
    // Exact accepted surface: env=dev + storage-state only.
    const parsed = await parse(['--env=dev', '--storage-state=/tmp/nw-state.json']);
    expect(parsed).toEqual({ env: 'dev', storageState: '/tmp/nw-state.json', help: false });
  });

  test('6 — arbitrary target URL rejected', async () => {
    await expect(parse(['--env=dev', '--storage-state=/tmp/state.json', '--ui-url=https://example.com'])).rejects.toThrow(/no --ui-url override/);
    const runner = fs.readFileSync(path.join(root, 'tests/manual/phase10b-contained-dev-deep-semantic.ts'), 'utf8');
    expect(runner).toContain('NIGHTWATCH_UI_URL is not accepted');
    expect(runner).toContain('validateUiUrl(env, env.uiBaseUrl)');
  });
});

// ---------------------------------------------------------------------------
// 7-16. Deep acceptance gate (pure).
// ---------------------------------------------------------------------------

test.describe('Phase 10B — deep acceptance gate (authorization §8, §9, §31)', () => {
  test('7 — deep expectation absent => FAIL', () => {
    const summary = passSummary({ resolvedExpectationCount: 0, receiptCount: 1, passCount: 0, decisiveEvaluationCount: 0 });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('resolved expectations < 1');
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
    expect(preflight.checks.find((c) => c.name === 'real-expectation-derived')?.status).toBe('FAIL');
  });

  test('8 — old shape expectation resolved instead => FAIL', () => {
    const summary = passSummary({ expectationId: SHAPE_EXPECTATION_ID });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes(`expectationId ${SHAPE_EXPECTATION_ID} != ${DEEP_EXPECTATION_ID}`))).toBe(true);
  });

  test('9 — source stale => FAIL (resolver SOURCE_STALE + summary)', () => {
    const state = createPhase10FixtureState();
    const map = createMapSource([{ repoId: PHASE10_FIXTURE_REPO, sha: PHASE10_FIXTURE_SHA, files: state.files }]);
    const report = derivePhase10FixtureExpectations();
    map.setSha(PHASE10_FIXTURE_REPO, 'dddddddddddddddddddddddddddddddddddddddd');
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: report.derived.map((d) => d.expectation),
      reader: map.reader,
      currentness: map.currentness,
    });
    expect(resolver.resolve({ targetId: 'fixture-10.common-exchange.read' }).kind).toBe('SOURCE_STALE');
    const summary = passSummary({ sourceStaleCount: 1, passCount: 0, decisiveEvaluationCount: 0 });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('SOURCE_STALE count 1 != 0');
  });

  test('10 — source unavailable => FAIL (resolver SOURCE_UNAVAILABLE + summary)', () => {
    const state = createPhase10FixtureState();
    const map = createMapSource([{ repoId: PHASE10_FIXTURE_REPO, sha: PHASE10_FIXTURE_SHA, files: state.files }]);
    const report = derivePhase10FixtureExpectations();
    map.removeRepo(PHASE10_FIXTURE_REPO);
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: report.derived.map((d) => d.expectation),
      reader: map.reader,
      currentness: map.currentness,
    });
    expect(resolver.resolve({ targetId: 'fixture-10.common-exchange.read' }).kind).toBe('SOURCE_UNAVAILABLE');
    const summary = passSummary({ sourceUnavailableCount: 1, passCount: 0, decisiveEvaluationCount: 0 });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('SOURCE_UNAVAILABLE count 1 != 0');
    // Freshness BLOCK mapping carries the exact Phase 10B tokens.
    expect(phase10bFreshnessBlockToken('REAL_SOURCE_CONTRACT_DRIFT')).toBe('PHASE_10B_BLOCKED_REAL_SOURCE_DEEP_CONTRACT_DRIFT');
    expect(phase10bFreshnessBlockToken('JOURNEY_SOURCE_DRIFT')).toBe('PHASE_10B_BLOCKED_JOURNEY_SOURCE_DRIFT');
    expect(phase10bFreshnessBlockToken('SOURCE_FRESHNESS_UNRESOLVED')).toBe('PHASE_10B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED');
  });

  test('11 — deep expectation with the expected type invariant missing => FAIL', () => {
    const expectation = fixtureDeepExpectation();
    expect(() => assertDeepTypeContract(expectation, PHASE_10B_DEEP_TYPE_CONTRACT)).not.toThrow();
    const withoutDeep = {
      ...expectation,
      invariantDefinitions: expectation.invariantDefinitions.filter(
        (i) => !(i.kind === 'TYPE_MATCH' && i.path.length === 2 && i.path[0] === '0' && i.path[1] === 'exchange_rate'),
      ),
    };
    expect(() => assertDeepTypeContract(withoutDeep, PHASE_10B_DEEP_TYPE_CONTRACT)).toThrow(/PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT/);
  });

  test('12 — clean full deep-invariant PASS => eligible', () => {
    const result = evaluatePhase10bDeepAcceptance(passSummary({}), deepExpectationArg());
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test('13 — root-only PASS + item N/A => NOT eligible (deep invariant not observed)', () => {
    const summary = passSummary({
      invariantTotal: 1,
      invariantPassCount: 1,
      invariantNaCount: 3,
      decisiveEvaluationCount: 1,
      notApplicableCount: 1,
    });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED'))).toBe(true);
  });

  test('14 — any INTERNAL_ERROR => FAIL', () => {
    const result = evaluatePhase10bDeepAcceptance(passSummary({ internalErrorCount: 1, passCount: 0, decisiveEvaluationCount: 0 }), deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('INTERNAL_ERROR count 1 != 0');
  });

  test('15 — projection limit => FAIL', () => {
    const result = evaluatePhase10bDeepAcceptance(passSummary({ projectionLimitExceededCount: 1, passCount: 0, decisiveEvaluationCount: 0 }), deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('PROJECTION_LIMIT_EXCEEDED count 1 != 0');
  });

  test('16 — protocol failure (no semantic receipts) => FAIL', () => {
    // A non-2xx response never enters the semantic channel (protocol failure
    // short-circuits at the observer); the resulting pass has zero receipts.
    const summary = summarizePhase9bPass({
      passId: 'first',
      receipts: [],
      ledgerReceiptCount: 0,
      ledgerOverflow: false,
      findings: [],
      targetId: TARGET_ID,
    });
    const result = evaluatePhase10bDeepAcceptance(summary, deepExpectationArg());
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('semantic receipts < 1');
  });
});

// ---------------------------------------------------------------------------
// 17-18. Mutation / production exclusion.
// ---------------------------------------------------------------------------

test.describe('Phase 10B — mutation and production exclusion (authorization §19, §38)', () => {
  test('17 — mutation target impossible: write rule is KNOWN_MUTATION and the journey has zero mutation steps', () => {
    const env = { apiHosts: ['dev-api.example.invalid'] };
    const rules = buildRippleJourneyEndpointRegistry(env);
    const write = rules.find((rule) => rule.id === 'ripple.common-exchange.write');
    expect(write?.classification).toBe('KNOWN_MUTATION');
    const definition = getRippleJourneyDefinition('ripple-common-exchange-read');
    expect(definition.allowedSteps.every((step) => step.semanticClassification === 'KNOWN_READ' || step.semanticClassification === 'LOCAL_ONLY')).toBe(true);
    expect(getPhase5Operation('ripple.common-exchange.read').semanticClass).toBe('KNOWN_READ');
  });

  test('18 — production target impossible: launcher env rejection + canonical target exactness gate', () => {
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
// 19-21. Replay comparison, raw-value absence, decisive deep violation.
// ---------------------------------------------------------------------------

test.describe('Phase 10B — replay determinism, privacy, decisive deep contract (authorization §8, §30, §35, §39)', () => {
  test('19 — FIRST/REPLAY full-deep summaries deterministic', () => {
    const first = passSummary({ passId: 'first' });
    const replay = passSummary({ passId: 'replay' });
    expect(comparePhase9bReplaySummaries(first, replay).pass).toBe(true);
    const divergent = comparePhase9bReplaySummaries(first, passSummary({ passId: 'replay', passCount: 0, anomalyCount: 1, findingCount: 1, findingFingerprints: ['fp:sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcd'], findingCategories: ['TYPE_CONTRADICTED'], invariantViolationCount: 1 }));
    expect(divergent.pass).toBe(false);
    expect(divergent.mismatches.some((m) => m.includes('PASS count'))).toBe(true);
  });

  test('20 — safe summary contains no raw runtime values (sentinel leak check)', async () => {
    const { oracle } = fixtureDeepOracle();
    const hookResult = evaluateSemanticHook({
      oracle,
      rawText: JSON.stringify([{ month: SENTINEL_BODY, exchange_rate: { jpy: 1 } }]),
      status: 200,
      contentType: 'application/json',
      url: 'https://apidev.alphaus.cloud/m/ripple/exchange_rate/global/aws',
      method: 'GET',
      targetId: 'fixture-10.common-exchange.read',
      journeyId: 'ripple-common-exchange-read',
    });
    expect(hookResult.receipt).not.toBeNull();
    if (hookResult.receipt === null) return;
    validateSemanticEvaluationReceipt(hookResult.receipt);
    const summary = summarizePhase9bPass({
      passId: 'first',
      receipts: [hookResult.receipt],
      ledgerReceiptCount: 1,
      ledgerOverflow: false,
      findings: [...hookResult.findings],
      targetId: 'fixture-10.common-exchange.read',
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain(SENTINEL_BODY);
    expect(serialized).not.toContain('jpy');
    expect(serialized).not.toContain('apidev.alphaus.cloud/m/ripple');
  });

  test('21 — a deep item-type violation is decisive: ANOMALY + TYPE_CONTRADICTED finding, deep acceptance FAIL', async () => {
    const { oracle } = fixtureDeepOracle();
    // The current deep contract requires exchange_rate at item [0] to be an
    // OBJECT; a STRING violates the L3 item type invariant itself.
    const hookResult = evaluateSemanticHook({
      oracle,
      rawText: JSON.stringify([{ month: '2026-01', exchange_rate: 'not-an-object' }]),
      status: 200,
      contentType: 'application/json',
      url: 'https://apidev.alphaus.cloud/m/ripple/exchange_rate/global/aws',
      method: 'GET',
      targetId: 'fixture-10.common-exchange.read',
      journeyId: 'ripple-common-exchange-read',
    });
    expect(hookResult.receipt?.outcome).toBe('ANOMALY');
    expect(hookResult.receipt?.invariantViolationCount).toBe(1);
    expect(hookResult.receipt?.invariantTotal).toBe(4);
    expect(hookResult.findings.length).toBe(1);
    // Established Phase 10A finding vocabulary: TYPE_MATCH violations carry
    // observedClass TYPE_CONTRADICTED under the coarse category
    // SOURCE_EXPECTATION_MISMATCH (see phase10CorpusPrecision.test.ts).
    expect(hookResult.findings[0]?.category).toBe('SOURCE_EXPECTATION_MISMATCH');
    expect(hookResult.findings[0]?.expectedClass).toBe('TYPE_MATCH');
    expect(hookResult.findings[0]?.observedClass).toBe('TYPE_CONTRADICTED');
    const summary = summarizePhase9bPass({
      passId: 'first',
      receipts: hookResult.receipt === null ? [] : [hookResult.receipt],
      ledgerReceiptCount: 1,
      ledgerOverflow: false,
      findings: [...hookResult.findings],
      targetId: 'fixture-10.common-exchange.read',
    });
    const result = evaluatePhase10bDeepAcceptance(summary, {
      expectationId: 'fixture-10.common-exchange.read.real-source-deep',
      approvedSha: PHASE10_FIXTURE_SHA,
      expectedInvariantTotal: 4,
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('findingCount 1 != 0'))).toBe(true);
    expect(result.failures.some((f) => f.includes('invariantViolationCount 1 != 0'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Observer seam + runner source (context wiring and one-shot gate).
// ---------------------------------------------------------------------------

test.describe('Phase 10B — observer seam and runner gate', () => {
  test('context semanticOracle wiring is the same validated Phase 9B seam', () => {
    const contextSource = fs.readFileSync(path.join(root, 'src/browser/context.ts'), 'utf8');
    expect(contextSource).toContain('semanticOracle?: SemanticResponseOracle');
    expect(contextSource).toMatch(/semanticOracle: opts\.semanticOracle/);
  });

  test('runner requires the one-shot gate and rejects arbitrary journeys', () => {
    const runner = fs.readFileSync(path.join(root, 'tests/manual/phase10b-contained-dev-deep-semantic.ts'), 'utf8');
    expect(runner).toContain('NIGHTWATCH_PHASE_10B_REAL');
    // The env one-shot gate message lives in the gated launcher (the runner
    // additionally asserts DEV via assertSupportedEnvironment + its own
    // fail-closed message).
    const launcher = fs.readFileSync(path.join(root, 'bin/phase10b-real.mjs'), 'utf8');
    expect(launcher).toContain('phase10b-real requires exactly one --env=dev');
  });

  test('deep acceptance is evaluated end-to-end through the observer (fixture)', async ({ browser }) => {
    const server = await startServer(JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 1 } }]));
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase10b-observer-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase10b-observer-deep',
    });
    const monitor = new RunMonitor(env.failOn);
    const { oracle } = fixtureDeepOracle();
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
      expect(evaluations[0]?.invariantTotal).toBe(4);
      expect(evaluations[0]?.invariantPassCount).toBe(4);
      expect(evaluations[0]?.invariantNaCount).toBe(0);
      expect(evaluations[0]?.invariantViolationCount).toBe(0);
    } finally {
      await context.close();
      await server.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Group 11 (F-10) — the deep gate separates local synthetic from DEV.
// ---------------------------------------------------------------------------

test.describe('Group 11 — contained DEV deep acceptance', () => {
  test('a local synthetic deep pass never satisfies the DEV deep acceptance assertion', () => {
    const expected = deepExpectationArg();
    // The raw deep mechanics gate passes over the synthetic fixture ...
    expect(evaluatePhase10bDeepAcceptance(passSummary({}), expected).pass).toBe(true);
    // ... and the DEV deep assertion refuses it by construction.
    const dev = evaluateContainedDevDeepAcceptance(passSummary({}), expected);
    expect(dev.pass).toBe(false);
    expect(dev.failures.join(' ')).toContain('SEMANTIC_ACCEPTANCE_LOCAL_SYNTHETIC_NEVER_SATISFIES_DEV');
    // CONTAINED_DEV evidence is the only class it accepts.
    expect(evaluateContainedDevDeepAcceptance(passSummary({ evidenceAcceptanceClasses: ['CONTAINED_DEV'] }), expected).pass).toBe(true);
  });
});
