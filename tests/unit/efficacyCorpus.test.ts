// W8 efficacy depth: fixed-corpus before/after proof over the real local
// substrate harness. The same stateless simulated investigator runs against
// the W7-projected request surface and the live W8 request surface, so the
// delta isolates the reasoner-visible contract. Synthetic fixtures only:
// no network, no provider, no hidden truth in the driver.
import { test, expect } from '@playwright/test';
import type { ReasonerTurnRequest } from '../../src/core/agentProtocol/reasoner';
import {
  aggregateEfficacyMetrics,
  compareEfficacy,
  EFFICACY_CORPUS_ID,
  efficacyCorpus,
  MULTI_TARGET_EFFICACY_CASE_IDS,
  projectRequestToW7,
  runEfficacyCorpus,
  W7_OBSERVATION_FIELDS,
} from '../../src/core/efficacy';

test.describe('efficacy W7 projection is faithful', () => {
  test('projected observation carries exactly the W7 field set and no memory', () => {
    const request = {
      schemaVersion: 'nightwatch.reasoner-turn-request.v2',
      campaignId: 'efficacy-projection-probe',
      turnId: 'turn-1',
      budgetRemaining: { reasonerCalls: 10, toolActions: 10 },
      observation: {
        phase: 'DISCOVER',
        untrusted: [],
        evidenceRefs: [],
        allowedToolIds: ['INSPECT_SOURCE_SURFACE'],
        allowedIntentKinds: ['CALL_TOOL'],
        memory: {
          schemaVersion: 'nightwatch.investigation-memory.v1',
          investigationId: 'probe',
        },
      },
    } as unknown as ReasonerTurnRequest;
    const projected = projectRequestToW7(request) as unknown as Record<string, unknown>;
    const observation = projected['observation'] as Record<string, unknown>;
    expect(Object.keys(observation).sort()).toEqual([...W7_OBSERVATION_FIELDS].sort());
    expect('memory' in observation).toBe(false);
  });
});

test.describe('efficacy fixed corpus before/after', () => {
  test('corpus is fixed at v2 with the multi-target cases appended', () => {
    expect(EFFICACY_CORPUS_ID).toBe('nightwatch.efficacy-corpus.v2');
    const ids = efficacyCorpus().map((item) => item.caseId);
    expect(ids.length).toBe(13);
    for (const multiId of MULTI_TARGET_EFFICACY_CASE_IDS) {
      expect(ids).toContain(multiId);
    }
    expect(MULTI_TARGET_EFFICACY_CASE_IDS.length).toBe(4);
  });

  test('harness is deterministic across repeated W8 runs', async () => {
    const first = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    const second = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    expect(second.corpusIds).toEqual(first.corpusIds);
    expect(second.aggregate).toEqual(first.aggregate);
    expect(second.cases).toEqual(first.cases);
  });

  test('W8_MEMORY beats W7_BASELINE on the outcome metrics that matter', async () => {
    const baseline = await runEfficacyCorpus({ mode: 'W7_BASELINE' });
    const candidate = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    expect(baseline.corpusIds).toEqual(candidate.corpusIds);
    expect(candidate.aggregate.groundedHypotheses).toBeGreaterThan(baseline.aggregate.groundedHypotheses);
    expect(candidate.aggregate.verificationReadyHypotheses).toBeGreaterThan(
      baseline.aggregate.verificationReadyHypotheses,
    );
    expect(candidate.aggregate.groundedReproductionAttempts).toBeGreaterThan(
      baseline.aggregate.groundedReproductionAttempts,
    );
    expect(candidate.aggregate.mechanicalReproductions).toBeGreaterThan(
      baseline.aggregate.mechanicalReproductions,
    );
    expect(candidate.aggregate.candidatesAdmitted).toBeGreaterThan(baseline.aggregate.candidatesAdmitted);
  });

  test('exploring more does not buy false positives and never leaks', async () => {
    const baseline = await runEfficacyCorpus({ mode: 'W7_BASELINE' });
    const candidate = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    expect(candidate.aggregate.falsePositives).toBeLessThanOrEqual(baseline.aggregate.falsePositives);
    expect(baseline.aggregate.leakedCases).toBe(0);
    expect(candidate.aggregate.leakedCases).toBe(0);
    for (const item of [...baseline.cases, ...candidate.cases]) {
      expect(item.leaked).toEqual([]);
    }
  });

  test('multi-target cases diversify inspection without extra repeats', async () => {
    const baseline = await runEfficacyCorpus({ mode: 'W7_BASELINE' });
    const candidate = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    expect(MULTI_TARGET_EFFICACY_CASE_IDS.length).toBeGreaterThanOrEqual(4);
    for (const caseId of MULTI_TARGET_EFFICACY_CASE_IDS) {
      const base = baseline.cases.find((item) => item.caseId === caseId);
      const cand = candidate.cases.find((item) => item.caseId === caseId);
      expect(base).toBeDefined();
      expect(cand).toBeDefined();
      expect(cand?.uniqueSourceTargets).toBeGreaterThan(base?.uniqueSourceTargets ?? 0);
      expect(cand?.repeatTargetRate).toBeLessThanOrEqual(base?.repeatTargetRate ?? 0);
    }
  });

  test('negative controls stay clean in both modes', async () => {
    const baseline = await runEfficacyCorpus({ mode: 'W7_BASELINE' });
    const candidate = await runEfficacyCorpus({ mode: 'W8_MEMORY' });
    expect(baseline.aggregate.negativeControls).toBeGreaterThanOrEqual(2);
    expect(candidate.aggregate.negativeControls).toBeGreaterThanOrEqual(2);
    for (const report of [baseline, candidate]) {
      for (const item of report.cases.filter((entry) => entry.negativeControl)) {
        expect(item.candidatesAdmitted).toBe(0);
        expect(item.outcome).not.toBe('FALSE_POSITIVE');
        expect(item.falsePositive).toBe(false);
      }
    }
  });

  test('empty aggregates and comparisons stay sane', () => {
    const empty = aggregateEfficacyMetrics([]);
    expect(empty.cases).toBe(0);
    expect(empty.falsePositives).toBe(0);
    expect(empty.leakedCases).toBe(0);
    expect(empty.repeatTargetRate).toBe(0);
    expect(empty.stagnationRate).toBe(0);
    expect(empty.uniqueSourceTargets).toBe(0);
    const comparison = compareEfficacy(empty, empty);
    expect(comparison.groundedHypothesesDelta).toBe(0);
    expect(comparison.mechanicalReproductionsDelta).toBe(0);
    expect(comparison.candidatesAdmittedDelta).toBe(0);
    expect(comparison.falsePositivesDelta).toBe(0);
    expect(comparison.leakedCasesDelta).toBe(0);
    expect(comparison.exactRediscoveriesDelta).toBe(0);
  });
});
