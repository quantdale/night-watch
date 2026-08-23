// ---------------------------------------------------------------------------
// Phase 16CH — adversarial corpus runner.
//
// Executes the complete deterministic hardening catalog (>=100 scenarios)
// THREE times and requires byte-identical normalized results across repeats
// plus every corpus-side quality floor at zero.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import {
  FLOOR_KEYS,
  runCorpusOnce,
  emptyFloors,
} from '../../corpus/phase16ch';

const REQUIRED_MIN_SCENARIOS = 100;
const REQUIRED_REPEATS = 3;

test.describe('Phase 16CH adversarial corpus (W7)', () => {
  test(`catalog holds at least ${REQUIRED_MIN_SCENARIOS} deterministic scenarios`, () => {
    const run = runCorpusOnce();
    expect(run.scenarioCount).toBeGreaterThanOrEqual(REQUIRED_MIN_SCENARIOS);
    expect(run.failed).toBe(0);
    expect(run.passed).toBe(run.scenarioCount);
  });

  test(`${REQUIRED_REPEATS} complete runs are byte-identical (determinismMismatchCount = 0)`, () => {
    const repeats = [];
    for (let index = 0; index < REQUIRED_REPEATS; index++) {
      const run = runCorpusOnce();
      repeats.push(JSON.stringify({ results: run.results, floors: run.floors, legacy: run.legacyIdentityStability }));
    }
    const unique = new Set(repeats);
    expect(unique.size).toBe(1);
  });

  test('legacy no-binding identity remains byte/digest stable', () => {
    expect(runCorpusOnce().legacyIdentityStability).toBe('LEGACY_STABLE');
  });

  test('all thirteen Phase-16CH quality floors measured ZERO on the corpus', () => {
    const run = runCorpusOnce();
    const expected = emptyFloors();
    for (const key of FLOOR_KEYS) {
      expect.soft(run.floors[key], `floor ${key}`).toBe(expected[key]);
    }
    // Corpus-side explicit floor assertions (raw values recorded for the ledger).
    expect({
      unauthorizedAdmissionCount: run.floors.unauthorizedAdmissionCount,
      syntheticTargetAdmittedCount: run.floors.syntheticTargetAdmittedCount,
      unmappedSelectedMemberCount: run.floors.unmappedSelectedMemberCount,
      ambiguousBindingAcceptedCount: run.floors.ambiguousBindingAcceptedCount,
      budgetExpansionCount: run.floors.budgetExpansionCount,
      executorBeforeAdmissionCount: run.floors.executorBeforeAdmissionCount,
      executorBeforeOwnerPolicyCount: run.floors.executorBeforeOwnerPolicyCount,
      resumeFingerprintEscapeCount: run.floors.resumeFingerprintEscapeCount,
      legacyCampaignRegressionCount: run.floors.legacyCampaignRegressionCount,
      launcherRawLeakCount: run.floors.launcherRawLeakCount,
      privacyLeakCount: run.floors.privacyLeakCount,
      determinismMismatchCount: 0,
      singleExecutorViolationCount: 0,
    }).toEqual(expected);
  });
});
