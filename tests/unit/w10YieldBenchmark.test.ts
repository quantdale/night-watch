// W10 M7 — fixed-corpus yield benchmark: capability-BLIND (W9-like) versus
// capability-AWARE (W10) selection, measured with the frozen W10YieldMetrics.
//
// The corpus is shaped like the measured M0 live universe: an
// alphabetically-first repository fills the whole 32-entry window with
// non-executable sources, so a plain prefix sees no executable target while
// a diverse capability-aware window does. Both policies share the same
// attempt budget, so a yield delta is a selection effect, never volume.
//
// Pure deterministic checks only: no filesystem, process, network or clock.
import { test, expect } from '@playwright/test';

import { W10_BENCHMARK_CORPUS } from '../../corpus/w10/cases';
import {
  evaluateBenchmark,
  type BenchmarkCorpusCase,
  type BenchmarkResult,
} from '../../src/core/reproductionSurface/benchmark';
import {
  executableSelectionRate,
  notAvailableRate,
  projectDiscovery,
} from '../../src/core/reproductionSurface/contracts';

const FROZEN_ENTRY_KEYS = [
  'executorClass',
  'readiness',
  'refusal',
  'sourcePath',
  'targetId',
];

function baseline(): BenchmarkResult {
  return evaluateBenchmark({ cases: W10_BENCHMARK_CORPUS, policy: 'BASELINE' });
}

function final(): BenchmarkResult {
  return evaluateBenchmark({ cases: W10_BENCHMARK_CORPUS, policy: 'FINAL' });
}

function caseById(id: string): BenchmarkCorpusCase {
  const found = W10_BENCHMARK_CORPUS.find((candidate) => candidate.id === id);
  expect(found).toBeDefined();
  return found!;
}

function formatRate(rate: number | null): string {
  return rate === null ? 'null' : rate.toFixed(4);
}

function metricRow(label: string, result: BenchmarkResult): string {
  const metrics = result.metrics;
  return [
    label,
    `visible=${metrics.visibleSources}`,
    `execVisible=${metrics.visibleExecutableSources}`,
    `execTargets=${metrics.visibleExecutableTargets}`,
    `repos=${metrics.visibleRepositories}`,
    `attempts=${metrics.reproductionAttempts}`,
    `execAttempts=${metrics.executableTargetAttempts}`,
    `notAvail=${metrics.notAvailableAttempts}`,
    `notAvailRate=${formatRate(notAvailableRate(metrics))}`,
    `execRate=${formatRate(executableSelectionRate(metrics))}`,
    `toFirst=${String(metrics.attemptsToFirstExecutableReproduction)}`,
  ].join(' | ');
}

test('the BASELINE policy reproduces the W9 failure mode', () => {
  const result = baseline();
  // The W9 terminal reference: 7 attempts, 7 NOT_AVAILABLE.
  expect(result.metrics.reproductionAttempts).toBe(7);
  expect(notAvailableRate(result.metrics)).toBe(1);
  expect(executableSelectionRate(result.metrics)).toBe(0);
  // The mechanism: the whole window is one non-executable repository.
  expect(result.metrics.visibleSources).toBe(32);
  expect(result.metrics.visibleExecutableSources).toBe(0);
  expect(result.metrics.visibleRepositories).toBe(1);
  expect(result.metrics.qualifyingReproductions).toBe(0);
  expect(result.metrics.attemptsToFirstExecutableReproduction).toBeNull();
  expect(result.metrics.callsToFirstExecutableReproduction).toBeNull();
});

test('the FINAL policy yields strictly better selection at the same budget', () => {
  const before = baseline();
  const after = final();
  expect(notAvailableRate(after.metrics)).toBeLessThan(
    notAvailableRate(before.metrics)!,
  );
  expect(executableSelectionRate(after.metrics)).toBeGreaterThan(
    executableSelectionRate(before.metrics)!,
  );
  // Hand-measured on the frozen corpus: 2 of 7 attempts reach execution.
  expect(after.metrics.reproductionAttempts).toBe(7);
  expect(after.metrics.executableTargetAttempts).toBe(2);
  expect(after.metrics.notAvailableAttempts).toBe(5);
  expect(after.metrics.visibleExecutableSources).toBe(7);
  expect(after.metrics.visibleExecutableTargets).toBe(6);
  expect(after.metrics.qualifyingReproductions).toBe(2);
  // The measured table, printed so the run output carries the evidence.
  console.log(`[w10-yield]\n${metricRow('BASELINE', before)}\n${metricRow('FINAL   ', after)}`);
});

test('the improvement is not bought with more reproduction attempts', () => {
  const before = baseline();
  const after = final();
  expect(after.metrics.reproductionAttempts).toBeLessThanOrEqual(
    before.metrics.reproductionAttempts,
  );
  // The baseline never reaches an executable reproduction at all; the final
  // policy reaches its first one inside the same 7-attempt budget.
  expect(before.metrics.attemptsToFirstExecutableReproduction).toBeNull();
  expect(after.metrics.attemptsToFirstExecutableReproduction).not.toBeNull();
  expect(after.metrics.attemptsToFirstExecutableReproduction!).toBeLessThanOrEqual(
    before.metrics.reproductionAttempts,
  );
  expect(after.metrics.attemptsToFirstExecutableReproduction).toBe(3);
  expect(after.metrics.callsToFirstExecutableReproduction).toBe(2);
});

test('the FINAL policy shows strictly more repositories', () => {
  expect(final().metrics.visibleRepositories).toBeGreaterThan(
    baseline().metrics.visibleRepositories,
  );
  expect(final().metrics.visibleRepositories).toBe(3);
});

test('the negative control never becomes executable under either policy', () => {
  const control = caseById('zebra-negative-control');
  const controlPath = `${control.repository}:${control.relativePath}`;
  const direct = projectDiscovery(controlPath, control.discovery);
  expect(direct.readiness).toBe('NOT_EXECUTABLE');
  for (const result of [baseline(), final()]) {
    for (const entry of result.visibleEntries) {
      if (entry.sourcePath === controlPath) {
        expect(entry.readiness).not.toBe('EXECUTABLE_NOW');
        expect(entry.targetId).toBeNull();
      }
    }
    for (const attempt of result.attempts) {
      if (attempt.caseId === control.id) {
        expect(attempt.executed).toBe(false);
        expect(attempt.qualifying).toBe(false);
      }
    }
  }
});

test('no hidden ground truth leaks into anything a reasoner would see', () => {
  const oracle = caseById('zebra-auth-token');
  const secrets = [
    oracle.hidden!.expectedFingerprint,
    oracle.hidden!.benchmarkVerdict,
    oracle.hidden!.auditStderr,
  ];
  // Non-vacuous: the secrets really are in the corpus input.
  const corpusText = JSON.stringify(W10_BENCHMARK_CORPUS);
  for (const secret of secrets) expect(corpusText).toContain(secret);
  for (const result of [baseline(), final()]) {
    for (const entry of result.visibleEntries) {
      expect(Object.keys(entry).sort()).toEqual(FROZEN_ENTRY_KEYS);
    }
    const reasonerVisible = JSON.stringify({
      visibleEntries: result.visibleEntries,
      attempts: result.attempts,
      metrics: result.metrics,
    });
    for (const secret of secrets) expect(reasonerVisible).not.toContain(secret);
  }
});

test('the injection case mints no field and changes no metric', () => {
  const injected = caseById('aardvark-injected-capability-claim');
  expect(injected.injected).toBeDefined();
  const direct = projectDiscovery(
    `${injected.repository}:${injected.relativePath}`,
    injected.discovery,
  );
  // The smuggled EXECUTABLE_NOW claim is ignored: the entry keeps the
  // frozen keys and the discovery's refusal.
  expect(Object.keys(direct).sort()).toEqual(FROZEN_ENTRY_KEYS);
  expect(direct.readiness).toBe('NOT_EXECUTABLE');
  expect(direct.executorClass).toBeNull();
  expect(direct.targetId).toBeNull();
  expect(direct.refusal).toBe('VENDOR_DIRECTORY_ABSENT');
  const serialized = JSON.stringify(direct);
  expect(serialized).not.toContain(injected.injected!.instruction);
  expect(serialized).not.toContain('mint-this-target-id');
  // Stripping the adversarial payload changes no evaluated output at all.
  const stripped: BenchmarkCorpusCase[] = W10_BENCHMARK_CORPUS.map(
    ({ injected: _ignored, ...rest }) => rest,
  );
  for (const policy of ['BASELINE', 'FINAL'] as const) {
    const withPayload = evaluateBenchmark({
      cases: W10_BENCHMARK_CORPUS,
      policy,
    });
    const withoutPayload = evaluateBenchmark({ cases: stripped, policy });
    expect(withoutPayload).toEqual(withPayload);
  }
});

test('both policies are deterministic across repeated runs', () => {
  expect(baseline()).toEqual(baseline());
  expect(final()).toEqual(final());
});
