// Lane F — historical replay harness acceptance: leakage fail-closed for every
// leakage class, fake-hunt rediscovery of a seeded fixture, negative control
// admission refusal, and reasoner-context isolation. Synthetic fixtures only:
// no network, no CLI spawn, no real historical data.
import { test, expect } from '@playwright/test';
import {
  assertNoBenchmarkLeakage,
  BENCHMARK_LEAKAGE_CLASSES,
  detectBenchmarkLeakage,
  type BenchmarkLeakageClass,
  type HiddenGroundTruth,
  type ReasonerVisibleContext,
} from '../../src/core/agentProtocol/benchmark';
import {
  REASONER_TURN_RESPONSE_VERSION,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { defaultBenchmarkBudgetPolicy, runBenchmarkHunt } from '../../src/core/benchmark/hunt';
import { buildReasonerVisibleContext, defineBenchmarkCase } from '../../src/core/benchmark/case';
import { explanationKeywords, parseFixDiffFiles, scoreBenchmarkCandidate } from '../../src/core/benchmark/score';
import {
  BENCHMARK_FIXTURE_IDS,
  benchmarkFixtureById,
  benchmarkFixtureCorpus,
} from '../../src/core/benchmark/fixtures';

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-bench-reasoner',
  provider: 'stub',
  model: 'stub-bench-1',
};

function okTurn(intents: unknown[]): ReasonerCallResult {
  return {
    ok: true,
    response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] } as unknown as ReasonerTurnResponse,
    provenance: PROVENANCE,
    stdoutBytes: 64,
    stderrBytes: 0,
  };
}

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[]): { driver: ReasonerDriver; requests: ReasonerTurnRequest[] } {
  const requests: ReasonerTurnRequest[] = [];
  let calls = 0;
  const driver: ReasonerDriver = {
    protocolVersion: 'nightwatch.reasoner-driver.v1',
    transport: 'CLI',
    provenance: PROVENANCE,
    async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
      calls += 1;
      requests.push(request);
      const entry = script[Math.min(calls - 1, script.length - 1)] ?? (() => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]));
      return entry(request);
    },
  };
  return { driver, requests };
}

const CALL_DIGEST = `arg:sha256:${'a'.repeat(24)}`;

function secretFor(hidden: HiddenGroundTruth, cls: BenchmarkLeakageClass): string {
  switch (cls) {
    case 'FIX_COMMIT':
      return hidden.fixCommit as string;
    case 'FIX_DIFF':
      return hidden.fixDiff as string;
    case 'ISSUE_TITLE':
      return hidden.issueTitle as string;
    case 'BUG_DESCRIPTION':
      return hidden.bugDescription as string;
    case 'KNOWN_FAILING_TEST':
      return hidden.knownFailingTest as string;
    case 'GROUND_TRUTH_EXPLANATION':
      return hidden.explanation as string;
  }
}

test.describe('benchmark leakage fail-closed', () => {
  for (const cls of BENCHMARK_LEAKAGE_CLASSES) {
    test(`leakage class ${cls} is detected and throws fail-closed`, () => {
      const fixture = benchmarkFixtureById('bench-billing-rounding-001');
      const secret = secretFor(fixture.hidden, cls);
      expect(secret.length).toBeGreaterThan(0);
      const tainted: ReasonerVisibleContext = { blobs: ['harmless pre-fix note', `context carrying ${secret} inline`] };
      expect(detectBenchmarkLeakage(tainted, fixture.hidden)).toEqual([cls]);
      expect(() => assertNoBenchmarkLeakage(tainted, fixture.hidden)).toThrow(`BENCHMARK_GROUND_TRUTH_LEAK:${cls}`);
    });
  }

  test('clean fixture visible contexts never leak (whole corpus)', () => {
    for (const fixture of benchmarkFixtureCorpus()) {
      const visible = buildReasonerVisibleContext(fixture);
      expect(visible.blobs).toHaveLength(3);
      expect(detectBenchmarkLeakage(visible, fixture.hidden)).toEqual([]);
      expect(() => assertNoBenchmarkLeakage(visible, fixture.hidden)).not.toThrow();
    }
  });

  test('case definition refuses pre-fix views containing hidden answers', () => {
    const fixture = benchmarkFixtureById('bench-billing-rounding-001');
    expect(() =>
      defineBenchmarkCase({
        caseId: 'bench-leak-probe',
        productFamily: 'ledger-web',
        category: 'billing',
        hidden: fixture.hidden,
        preFix: {
          symptomReport: `observed: ${fixture.hidden.knownFailingTest as string} fails`,
          sourceSnapshot: 'snapshot',
          reproSteps: 'repro',
        },
      }),
    ).toThrow(/BENCHMARK_GROUND_TRUTH_LEAK:KNOWN_FAILING_TEST/);
  });
});

test.describe('benchmark fake-hunt replay', () => {
  test('seeded billing fixture is exactly rediscovered without leakage', async () => {
    const fixture = benchmarkFixtureById('bench-billing-rounding-001');
    const statement =
      "Root cause in src/billing/invoice.ts: per-line banker's rounding accumulated a one-cent error across order " +
      'lines, so the charged total drifts from the displayed line arithmetic; rounding once over the order total ' +
      'removes the drift. Captured by invoice-totals-rounding.spec.ts.';
    const stub = scriptDriver([
      () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: 'src/billing/invoice.ts' } }]),
      () =>
        okTurn([
          { kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-bench-billing-1', statement, evidenceRefs: ['ev:sha256:benchbilling0001'] } as AgentIntent,
        ]),
      () =>
        okTurn([
          { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-billing-001', evidenceRefs: ['ev:sha256:benchbilling0001'] },
          { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
        ]),
    ]);
    const result = await runBenchmarkHunt(fixture, { reasoner: stub.driver, budgetPolicy: defaultBenchmarkBudgetPolicy(), maxTurns: 6 });

    expect(result.terminationReason).toBe('COMPLETE_WITH_FINDING');
    expect(result.admitted).toBe(true);
    expect(result.outcome).toBe('EXACT_REDISCOVERY');
    expect(result.score.testMatch).toBe(true);
    expect(result.score.fileRecall).toBe(1);
    expect(result.leaked).toEqual([]);
    expect(stub.requests).toHaveLength(3);
    // The driver demonstrably saw the pre-fix view and never the hidden fields.
    const traffic = result.requestBlobs.join('\n');
    expect(traffic).toContain('Support tickets describe checkout charges');
    expect(detectBenchmarkLeakage({ blobs: result.requestBlobs }, fixture.hidden)).toEqual([]);
    for (const value of Object.values(fixture.hidden)) {
      if (typeof value === 'string' && value.length > 0) expect(traffic).not.toContain(value);
    }
  });

  test('negative control does not admit a finding', async () => {
    const fixture = benchmarkFixtureById('bench-negative-quiet-000');
    const stub = scriptDriver([
      () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: 'src/health/status.ts' } }]),
      () => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]),
    ]);
    const result = await runBenchmarkHunt(fixture, { reasoner: stub.driver, budgetPolicy: defaultBenchmarkBudgetPolicy(), maxTurns: 4 });

    expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(result.admitted).toBe(false);
    expect(result.outcome).toBe('MISS');
    expect(result.leaked).toEqual([]);
  });

  test('a no-finding hypothesis on a negative control is not a false positive', async () => {
    const fixture = benchmarkFixtureById('bench-negative-quiet-000');
    const stub = scriptDriver([
      () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: 'src/health/status.ts' } }]),
      () =>
        okTurn([
          {
            kind: 'FORM_HYPOTHESIS',
            hypothesisId: 'h-quiet-1',
            statement: 'The health endpoint is quiet; no defect to file.',
            evidenceRefs: ['ev:sha256:quiet0001'],
          },
          { kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' },
        ]),
    ]);
    const result = await runBenchmarkHunt(fixture, { reasoner: stub.driver, budgetPolicy: defaultBenchmarkBudgetPolicy(), maxTurns: 4 });
    expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(result.admitted).toBe(false);
    expect(result.outcome).toBe('MISS');
  });


  test('admission on a negative control scores FALSE_POSITIVE', async () => {
    const fixture = benchmarkFixtureById('bench-negative-quiet-000');
    const stub = scriptDriver([
      () =>
        okTurn([
          { kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-ghost-1', statement: 'imagined latency ghost in health endpoint', evidenceRefs: ['ev:sha256:ghost0001'] },
        ]),
      () =>
        okTurn([
          { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-ghost-001', evidenceRefs: ['ev:sha256:ghost0001'] },
          { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
        ]),
    ]);
    const result = await runBenchmarkHunt(fixture, { reasoner: stub.driver, budgetPolicy: defaultBenchmarkBudgetPolicy(), maxTurns: 4 });

    expect(result.admitted).toBe(true);
    expect(result.outcome).toBe('FALSE_POSITIVE');
  });
});

test.describe('benchmark scoring tiers', () => {
  const hidden = benchmarkFixtureById('bench-billing-rounding-001').hidden;

  test('failing-test match alone is partial rediscovery', () => {
    const score = scoreBenchmarkCandidate(
      'Reproduced by invoice-totals-rounding.spec.ts; underlying cause still under investigation in an unrelated module.',
      hidden,
    );
    expect(score.outcome).toBe('PARTIAL_REDISCOVERY');
    expect(score.testMatch).toBe(true);
  });

  test('file-only overlap is same-root-cause-alternate', () => {
    const score = scoreBenchmarkCandidate('Suspicious summation inside src/billing/invoice.ts merits a closer look.', hidden);
    expect(score.outcome).toBe('SAME_ROOT_CAUSE_ALTERNATE');
    expect(score.fileHits).toBe(1);
  });

  test('unrelated narrative is a miss; empty candidate is a miss', () => {
    expect(scoreBenchmarkCandidate('Weather patterns suggest no defect in the export pipeline.', hidden).outcome).toBe('MISS');
    expect(scoreBenchmarkCandidate('   ', hidden).outcome).toBe('MISS');
  });

  test('diff parsing and keyword extraction are deterministic', () => {
    expect(parseFixDiffFiles(hidden.fixDiff)).toEqual(['src/billing/invoice.ts']);
    expect(parseFixDiffFiles(null)).toEqual([]);
    const keywords = explanationKeywords(hidden.explanation);
    expect(keywords).toContain('rounding');
    expect(keywords).toContain('accumulated');
    expect(explanationKeywords(null)).toEqual([]);
  });

  test('corpus covers the diversity policy plus a negative control', () => {
    const corpus = benchmarkFixtureCorpus();
    expect(BENCHMARK_FIXTURE_IDS).toHaveLength(9);
    expect(corpus.map((item) => item.caseId)).toEqual([...BENCHMARK_FIXTURE_IDS]);
    const categories = new Set(corpus.map((item) => item.category));
    for (const expected of ['billing', 'api', 'backend', 'frontend', 'data', 'integration', 'regression', 'state-transition']) {
      expect(categories.has(expected as never)).toBe(true);
    }
  });
});
