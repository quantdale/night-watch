import { test, expect } from '@playwright/test';
import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  assertNoBenchmarkLeakage,
  detectBenchmarkLeakage,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerTurnRequest,
} from '../../src/core/agentProtocol';
import { mineLocalGitHistory } from '../../src/core/bugAtlas';
import {
  BENCHMARK_CORPUS_CATEGORIES,
  benchmarkFixtureById,
  defineBenchmarkCase,
  runBenchmarkHunt,
} from '../../src/core/benchmark';

/**
 * Corpus selection policy (Wave 4):
 * - Always run the frozen synthetic fixture covering billing (seeded positive).
 * - Optionally mine sibling git read-only. Each mined record becomes a case
 *   only when pre-fix text can be formed without embedding hidden fix SHA /
 *   locator strings. Hidden ground truth is the commit SHA only.
 * - Diversity of BENCHMARK_CORPUS_CATEGORIES is represented by the fixture
 *   corpus; mined cases are extra isolation checks, never cherry-picked after
 *   seeing scores.
 * - A blind reasoner (COMPLETE_NO_FINDING) must not admit mined cases.
 * - Real rediscovery of a previously unknown product bug is not claimed here.
 */

const BLIND: ReasonerDriver = {
  protocolVersion: REASONER_DRIVER_VERSION,
  transport: 'CLI',
  provenance: { transport: 'CLI', executableBasename: 'blind', provider: 'fixture', model: 'blind' },
  async complete(_request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
    void _request;
    return {
      ok: true,
      response: {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
        hypotheses: [],
      },
      provenance: { transport: 'CLI', executableBasename: 'blind', provider: 'fixture', model: 'blind' },
      stdoutBytes: 32,
      stderrBytes: 0,
    };
  },
};

test.describe('Wave 4 historical rediscovery isolation', () => {
  test('corpus policy enumerates all eight families', () => {
    expect([...BENCHMARK_CORPUS_CATEGORIES]).toEqual([
      'billing', 'api', 'backend', 'frontend', 'data', 'integration', 'regression', 'state-transition',
    ]);
  });

  test('seeded billing fixture is present in the frozen corpus', () => {
    const defined = benchmarkFixtureById('bench-billing-rounding-001');
    expect(defined.category).toBe('billing');
    expect(defined.hidden.fixCommit).toBeTruthy();
  });

  test('mined sibling records never leak fix SHAs into reasoner-visible blobs', () => {
    const report = mineLocalGitHistory({ maxRepos: 4, maxCommitsPerRepo: 20 });
    if (report.status !== 'MINED') {
      expect(report.status).toBe('DATA_BLOCKED');
      return;
    }
    expect(report.records.length).toBeGreaterThan(0);
    let isolated = 0;
    for (const record of report.records) {
      const sha = record.provenance.sourceSha;
      if (typeof sha !== 'string' || sha.length < 7) continue;
      const locator = record.fixLocator ?? '';
      const symptom = record.symptom ?? 'observed anomaly in mined history';
      const expected = record.expected ?? 'behaviour matches the pre-fix snapshot';
      const actual = record.actual ?? 'behaviour diverges from the pre-fix snapshot';
      const hidden = {
        fixCommit: sha,
        fixDiff: locator.length > 0 ? locator : null,
        issueTitle: null,
        bugDescription: null,
        knownFailingTest: null,
        explanation: null,
      };
      const preFix = { symptomReport: symptom, sourceSnapshot: expected, reproSteps: actual };
      const haystack = `${symptom}\n${expected}\n${actual}`;
      if (haystack.includes(sha) || (locator.length > 0 && haystack.includes(locator))) continue;
      const defined = defineBenchmarkCase({
        caseId: `mined-${record.bugId}`.slice(0, 80),
        productFamily: record.product ?? 'unknown',
        category: 'backend',
        hidden,
        preFix,
      });
      expect(() => assertNoBenchmarkLeakage({ blobs: [preFix.symptomReport, preFix.sourceSnapshot, preFix.reproSteps] }, hidden)).not.toThrow();
      expect(detectBenchmarkLeakage({ blobs: [JSON.stringify(defined.preFix)] }, hidden)).toEqual([]);
      isolated += 1;
    }
    expect(isolated).toBeGreaterThan(0);
  });

  test('blind hunt on an isolated mined case does not admit a finding and does not leak', async () => {
    const report = mineLocalGitHistory({ maxRepos: 2, maxCommitsPerRepo: 15 });
    test.skip(report.status !== 'MINED' || report.records.length === 0, 'sibling historical data unavailable');
    const record = report.records[0]!;
    const sha = record.provenance.sourceSha;
    test.skip(typeof sha !== 'string' || sha.length < 7, 'record has no source SHA');
    const symptom = (record.symptom ?? 'anomaly').includes(sha!) ? 'anomaly without locator' : (record.symptom ?? 'anomaly');
    test.skip(symptom.includes(sha!), 'cannot isolate this record');
    const defined = defineBenchmarkCase({
      caseId: 'mined-blind-1',
      productFamily: 'mined',
      category: 'regression',
      hidden: {
        fixCommit: sha!,
        fixDiff: null,
        issueTitle: null,
        bugDescription: null,
        knownFailingTest: null,
        explanation: null,
      },
      preFix: {
        symptomReport: symptom,
        sourceSnapshot: 'pre-fix snapshot withheld from hidden fields',
        reproSteps: 'observe the pre-fix surface only',
      },
    });
    const result = await runBenchmarkHunt(defined, { reasoner: BLIND, maxTurns: 3 });
    expect(result.leaked).toEqual([]);
    expect(result.admitted).toBe(false);
    expect(result.outcome === 'MISS' || result.outcome === 'FALSE_POSITIVE').toBe(true);
    expect(result.requestBlobs.join('\n')).not.toContain(sha!);
  });
});
