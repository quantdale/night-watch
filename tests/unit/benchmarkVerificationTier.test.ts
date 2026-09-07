// W7 admission lane — additive verified benchmark tier acceptance.
// Strict EXACT scoring is locked; the verified tier is purely additive.
import { test, expect } from '@playwright/test';

import { benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import {
  BENCHMARK_EXACT_MIN_FILE_RECALL,
  BENCHMARK_EXACT_MIN_KEYWORD_RECALL,
  BENCHMARK_PARTIAL_MIN_FILE_RECALL,
  BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL,
  BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL_WITH_FILES,
  BENCHMARK_ROOT_CAUSE_MIN_KEYWORD_RECALL,
  classifyVerifiedBenchmarkTier,
  scoreBenchmarkCandidate,
} from '../../src/core/benchmark/score';
import type { BenchmarkScore } from '../../src/core/benchmark/score';

const hidden = benchmarkFixtureById('bench-billing-rounding-001').hidden;

const EXACT_STATEMENT =
  "Root cause in src/billing/invoice.ts: per-line banker's rounding accumulated a one-cent error across order " +
  'lines, so the charged total drifts from the displayed line arithmetic; rounding once over the order total ' +
  'removes the drift. Captured by invoice-totals-rounding.spec.ts.';

function scoreOf(outcome: BenchmarkScore['outcome']): BenchmarkScore {
  return {
    outcome,
    testMatch: outcome === 'EXACT_REDISCOVERY' || outcome === 'PARTIAL_REDISCOVERY',
    fileHits: outcome === 'MISS' || outcome === 'FALSE_POSITIVE' ? 0 : 1,
    fileTotal: 1,
    fileRecall: outcome === 'MISS' || outcome === 'FALSE_POSITIVE' ? 0 : 1,
    keywordRecall: outcome === 'MISS' || outcome === 'FALSE_POSITIVE' ? 0 : 0.5,
    keywordTotal: 4,
  };
}

test.describe('strict EXACT scoring is unchanged', () => {
  test('EXACT threshold constants are frozen', () => {
    expect(BENCHMARK_EXACT_MIN_FILE_RECALL).toBe(0.5);
    expect(BENCHMARK_EXACT_MIN_KEYWORD_RECALL).toBe(0.5);
    expect(BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL).toBe(0.5);
    expect(BENCHMARK_PARTIAL_MIN_FILE_RECALL).toBe(0.5);
    expect(BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL_WITH_FILES).toBe(0.25);
    expect(BENCHMARK_ROOT_CAUSE_MIN_KEYWORD_RECALL).toBe(0.25);
  });

  test('known billing statement still scores EXACT_REDISCOVERY', () => {
    const score = scoreBenchmarkCandidate(EXACT_STATEMENT, hidden);
    expect(score.outcome).toBe('EXACT_REDISCOVERY');
    expect(score.testMatch).toBe(true);
    expect(score.fileRecall).toBe(1);
  });

  test('existing tier boundaries still hold', () => {
    expect(
      scoreBenchmarkCandidate(
        'Reproduced by invoice-totals-rounding.spec.ts; underlying cause still under investigation in an unrelated module.',
        hidden,
      ).outcome,
    ).toBe('PARTIAL_REDISCOVERY');
    expect(
      scoreBenchmarkCandidate('Suspicious summation inside src/billing/invoice.ts merits a closer look.', hidden)
        .outcome,
    ).toBe('SAME_ROOT_CAUSE_ALTERNATE');
    expect(scoreBenchmarkCandidate('Weather patterns suggest no defect in the export pipeline.', hidden).outcome).toBe(
      'MISS',
    );
    expect(scoreBenchmarkCandidate('   ', hidden).outcome).toBe('MISS');
  });
});

test.describe('verified benchmark tier', () => {
  test('admitted root-cause score with mechanical reproduction and zero leakage verifies', () => {
    for (const outcome of [
      'EXACT_REDISCOVERY',
      'PARTIAL_REDISCOVERY',
      'SAME_ROOT_CAUSE_ALTERNATE',
    ] as const) {
      expect(
        classifyVerifiedBenchmarkTier({
          admitted: true,
          score: scoreOf(outcome),
          mechanicalReproductionCount: 1,
          leakage: [],
        }),
      ).toBe('VERIFIED_ROOT_CAUSE_REDISCOVERY');
    }
  });

  test('real billing EXACT score verifies through the tier gate', () => {
    const score = scoreBenchmarkCandidate(EXACT_STATEMENT, hidden);
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score,
        mechanicalReproductionCount: 1,
        leakage: [],
      }),
    ).toBe('VERIFIED_ROOT_CAUSE_REDISCOVERY');
  });

  test('MISS never verifies even when admitted with reproduction', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score: scoreOf('MISS'),
        mechanicalReproductionCount: 1,
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('FALSE_POSITIVE never verifies', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score: scoreOf('FALSE_POSITIVE'),
        mechanicalReproductionCount: 1,
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('unadmitted candidates never verify', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: false,
        score: scoreOf('SAME_ROOT_CAUSE_ALTERNATE'),
        mechanicalReproductionCount: 1,
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('unproven reproduction (zero mechanical count) cannot upgrade tier', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score: scoreOf('SAME_ROOT_CAUSE_ALTERNATE'),
        mechanicalReproductionCount: 0,
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score: scoreOf('PARTIAL_REDISCOVERY'),
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('unrelated reproduction without admission cannot upgrade tier', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: false,
        score: scoreOf('EXACT_REDISCOVERY'),
        mechanicalReproductionCount: 3,
        leakage: [],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('any ground-truth leakage blocks verification', () => {
    expect(
      classifyVerifiedBenchmarkTier({
        admitted: true,
        score: scoreOf('EXACT_REDISCOVERY'),
        mechanicalReproductionCount: 1,
        leakage: ['KNOWN_FAILING_TEST'],
      }),
    ).toBe('NOT_VERIFIED');
  });

  test('classifier is deterministic and fail-closed on malformed input', () => {
    const input = {
      admitted: true,
      score: scoreOf('SAME_ROOT_CAUSE_ALTERNATE'),
      mechanicalReproductionCount: 1,
      leakage: [],
    } as const;
    expect(classifyVerifiedBenchmarkTier(input)).toBe(
      classifyVerifiedBenchmarkTier({ ...input }),
    );
    expect(classifyVerifiedBenchmarkTier(null)).toBe('NOT_VERIFIED');
    expect(classifyVerifiedBenchmarkTier(undefined)).toBe('NOT_VERIFIED');
  });
});
