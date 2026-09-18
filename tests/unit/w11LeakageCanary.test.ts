// ---------------------------------------------------------------------------
// W11 M7 — the leakage checker is proven LIVE, not assumed.
//
// A leakage audit that reports "0 leaks" proves nothing unless the checker is
// known to fire. A matcher that silently matches nothing produces exactly the
// same clean report as a genuinely clean run, and the difference is invisible
// in the number that gets published. These canaries make the two
// distinguishable: each hidden field is deliberately planted in a
// reasoner-visible blob and MUST be caught, and the same blobs without the
// plant MUST come back clean.
//
// Deterministic and offline: no provider, no network, no sibling access.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';

import {
  assertNoBenchmarkLeakage,
  detectBenchmarkLeakage,
  type HiddenGroundTruth,
} from '../../src/core/agentProtocol/benchmark';
import { benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import { buildReasonerVisibleContext } from '../../src/core/benchmark/case';

/** A canary hidden truth whose every field is a distinctive, unmistakable token. */
const CANARY: HiddenGroundTruth = {
  fixCommit: 'canary0fixcommit0deadbeefdeadbeefdeadbeef',
  fixDiff: 'diff --git a/canary/leak.ts b/canary/leak.ts CANARY_FIX_DIFF_TOKEN',
  issueTitle: 'CANARY_ISSUE_TITLE_TOKEN totals drift on canary orders',
  bugDescription: 'CANARY_BUG_DESCRIPTION_TOKEN describing the canary defect',
  knownFailingTest: 'canary-known-failing-test.spec.ts',
  explanation: 'CANARY_EXPLANATION_TOKEN root cause of the canary defect',
};

const EXPECTED_CLASS: Readonly<Record<keyof HiddenGroundTruth, string>> = {
  fixCommit: 'FIX_COMMIT',
  fixDiff: 'FIX_DIFF',
  issueTitle: 'ISSUE_TITLE',
  bugDescription: 'BUG_DESCRIPTION',
  knownFailingTest: 'KNOWN_FAILING_TEST',
  explanation: 'GROUND_TRUTH_EXPLANATION',
};

const FIELDS = Object.keys(EXPECTED_CLASS) as (keyof HiddenGroundTruth)[];

test.describe('W11 leakage checker canaries', () => {
  test('every hidden field is caught when it is deliberately leaked', () => {
    for (const field of FIELDS) {
      const secret = CANARY[field];
      expect(secret, `canary ${field} must be a non-empty token`).toBeTruthy();
      // One benign blob plus one blob carrying the planted secret, so the
      // checker has to actually find it rather than trip on an empty haystack.
      const blobs = [
        'benign reasoner request: index the approved source surface',
        `benign prefix ${String(secret)} benign suffix`,
      ];
      const leaked = detectBenchmarkLeakage({ blobs }, CANARY);
      expect(leaked, `planting ${field} was not detected`).toContain(EXPECTED_CLASS[field]);
      expect(() => assertNoBenchmarkLeakage({ blobs }, CANARY)).toThrow(/BENCHMARK_GROUND_TRUTH_LEAK/);
    }
  });

  test('all six fields leaking at once are all reported, not just the first', () => {
    const blobs = FIELDS.map((field) => `leak ${String(CANARY[field])}`);
    const leaked = detectBenchmarkLeakage({ blobs }, CANARY);
    for (const field of FIELDS) {
      expect(leaked, `${field} missing from a multi-field leak`).toContain(EXPECTED_CLASS[field]);
    }
    expect(leaked.length).toBe(FIELDS.length);
  });

  test('the same blobs without the plant are clean', () => {
    const blobs = [
      'benign reasoner request: index the approved source surface',
      'benign reasoner request: inspect one approved source path',
      'benign reasoner request: terminate with no finding',
    ];
    expect(detectBenchmarkLeakage({ blobs }, CANARY)).toEqual([]);
    expect(() => assertNoBenchmarkLeakage({ blobs }, CANARY)).not.toThrow();
  });

  test('a real fixture visible context carries none of its own hidden truth', () => {
    // The production isolation this arm depends on: the context the reasoner
    // actually receives must not contain the answer it is being scored against.
    for (const caseId of ['bench-billing-rounding-001', 'bench-negative-quiet-000']) {
      const definedCase = benchmarkFixtureById(caseId);
      const visible = buildReasonerVisibleContext(definedCase);
      expect(detectBenchmarkLeakage(visible, definedCase.hidden), `${caseId} visible context leaks`).toEqual([]);
    }
  });

  test('an empty hidden field cannot manufacture a false clean or a false leak', () => {
    // A null/empty secret must be skipped, not treated as "contained in
    // everything" — otherwise every run would report a leak and the signal
    // would be discarded as noise.
    const partial: HiddenGroundTruth = {
      fixCommit: null,
      fixDiff: '',
      issueTitle: null,
      bugDescription: null,
      knownFailingTest: 'canary-known-failing-test.spec.ts',
      explanation: null,
    };
    expect(detectBenchmarkLeakage({ blobs: ['nothing sensitive here'] }, partial)).toEqual([]);
    expect(detectBenchmarkLeakage({ blobs: ['see canary-known-failing-test.spec.ts'] }, partial)).toEqual([
      'KNOWN_FAILING_TEST',
    ]);
  });
});
