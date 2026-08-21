// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A02) — permanent unit tests for the semantic result /
// reason vocabulary convergence
// (src/oracles/expectations/lifecycle/semanticVocabulary.ts).
//
// Coverage:
//   - total-adapter matrices: EVERY member of every converged historical
//     union (receipt outcomes, runner outcomes, triage outcomes, coverage
//     resolver states, inventory currentness, promotion currentness, source
//     freshness, expectation freshness) adapts to its specified unified
//     category with verbatim provenance fields;
//   - never-PASS invariant: only PASS/ANOMALY-class members land in PROVEN;
//     every non-pass outcome lands strictly weaker;
//   - duplicate-vocabulary bridges (triage receipt-outcome duplicate,
//     triage outcome superset) converge mechanically;
//   - strict unknown-value rejection (parse-time validation instead of
//     silent coercion), including the strict replacement for the hook's
//     silent-default outcome mapping;
//   - serialized-compatibility round-trips of representative historical
//     payloads (every adapter family + aggregate + a real v2 receipt);
//   - provenance registry completeness and determinism;
//   - converged source-currentness axis agreement with the existing
//     promotionResult.ts bridges.
//
// Synthetic fake values only; no raw product/customer values (privacy model).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  CONVERGED_SOURCE_CURRENTNESS_VALUES,
  SEMANTIC_RESULT_VOCABULARY_VERSION,
  SEMANTIC_VOCABULARY_NAMES,
  SEMANTIC_VOCABULARY_PROVENANCE,
  canonicalReceiptOutcomeFromTriageOutcome,
  convergedCurrentnessFromExpectationFreshness,
  convergedCurrentnessFromInventory,
  convergedCurrentnessFromPromotion,
  convergedCurrentnessFromSourceFreshness,
  convergedCurrentnessFromTriage,
  isKnownContractResultVocabularyName,
  parseConvergedSourceCurrentness,
  parseSemanticReceiptOutcome,
  parseSemanticTriageOutcome,
  parseUnifiedContractResultDto,
  receiptOutcomeForTriage,
  strictSemanticOutcomeToReceiptOutcome,
  unifiedFromCoverageResolverState,
  unifiedFromExpectationFreshness,
  unifiedFromInventoryCurrentness,
  unifiedFromPromotionCurrentness,
  unifiedFromSemanticReceiptOutcome,
  unifiedFromSemanticRunnerOutcome,
  unifiedFromSemanticTriageOutcome,
  unifiedFromSourceFreshness,
  validateUnifiedContractResultDto,
  verifySemanticVocabularyProvenanceIntegrity,
} from '../../src/oracles/expectations/lifecycle/semanticVocabulary';
import type { ConvergedSourceCurrentness } from '../../src/oracles/expectations/lifecycle/semanticVocabulary';
import {
  CONTRACT_RESULT_VOCABULARY_VERSION,
  aggregateUnifiedContractResults,
  unifiedFromAnalyzerStatus,
  unifiedFromCollectionAdmissionFailure,
  unifiedFromCoverageDisposition,
  unifiedFromDerivationFailure,
  unifiedFromDriftClass,
  unifiedFromExpectationAdmissionResult,
  unifiedFromRealSourceResolution,
  type UnifiedContractResult,
  type UnifiedContractResultCategory,
} from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { SemanticReceiptOutcome } from '../../src/oracles/semantic/receipts';
import { buildSemanticEvaluationReceipt, validateSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import type { SemanticOutcome } from '../../src/oracles/invariants/types';
import { semanticOutcomeToReceiptOutcome } from '../../src/oracles/semantic/hook';
import type {
  SemanticReceiptOutcomeForTriage,
  SemanticTriageOutcome,
} from '../../src/core/triage/semanticTriageEvidence';
import type { PromotionSourceCurrentness } from '../../src/core/triage/promotionResult';
import { currentnessFromSourceFreshness } from '../../src/core/triage/promotionResult';
import type { SourceFreshness } from '../../src/core/triage/types';
import type { ExpectationFreshness } from '../../src/oracles/expectations/types';

// ---------------------------------------------------------------------------
// Member rosters. Each roster is checked with `satisfies Record<Union, true>`,
// so a missing or misspelled member breaks compilation — the runtime matrices
// below can never silently drift from the source unions.
// ---------------------------------------------------------------------------

const RECEIPT_OUTCOME_MEMBERS = Object.keys({
  PASS: true,
  ANOMALY: true,
  NOT_APPLICABLE: true,
  NO_EXPECTATION: true,
  EXPECTATION_SOURCE_STALE: true,
  EXPECTATION_SOURCE_UNAVAILABLE: true,
  INVALID_INPUT: true,
  PROJECTION_LIMIT_EXCEEDED: true,
  INTERNAL_ERROR: true,
  PARTIAL_COVERAGE: true,
} satisfies Record<SemanticReceiptOutcome, true>) as SemanticReceiptOutcome[];

const RUNNER_OUTCOME_MEMBERS = Object.keys({
  PASS: true,
  ANOMALY: true,
  NOT_APPLICABLE: true,
  EXPECTATION_UNAVAILABLE: true,
  EXPECTATION_SOURCE_STALE: true,
  EXPECTATION_INVALID: true,
  INVALID_INPUT: true,
  PROJECTION_LIMIT_EXCEEDED: true,
  PARTIAL_COVERAGE: true,
} satisfies Record<SemanticOutcome, true>) as SemanticOutcome[];

const TRIAGE_OUTCOME_MEMBERS = Object.keys({
  PASS: true,
  ANOMALY: true,
  NOT_APPLICABLE: true,
  EXPECTATION_UNAVAILABLE: true,
  EXPECTATION_SOURCE_STALE: true,
  EXPECTATION_INVALID: true,
  INVALID_INPUT: true,
  PROJECTION_LIMIT_EXCEEDED: true,
  PARTIAL_COVERAGE: true,
  NO_EXPECTATION: true,
  INTERNAL_ERROR: true,
} satisfies Record<SemanticTriageOutcome, true>) as SemanticTriageOutcome[];

const RESOLVER_STATE_MEMBERS = Object.keys({
  RESOLVED: true,
  SOURCE_STALE: true,
  SOURCE_UNAVAILABLE: true,
  NOT_APPLICABLE: true,
}) as ('RESOLVED' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE' | 'NOT_APPLICABLE')[];

const INVENTORY_CURRENTNESS_MEMBERS = Object.keys({
  CURRENT: true,
  STALE: true,
  UNAVAILABLE: true,
  NOT_APPLICABLE: true,
}) as ('CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_APPLICABLE')[];

const PROMOTION_CURRENTNESS_MEMBERS = Object.keys({
  CURRENT: true,
  LOCAL_TRACKING_ONLY: true,
  STALE: true,
  UNAVAILABLE: true,
  UNKNOWN: true,
} satisfies Record<PromotionSourceCurrentness, true>) as PromotionSourceCurrentness[];

const SOURCE_FRESHNESS_MEMBERS = Object.keys({
  SOURCE_CURRENT_LOCALLY: true,
  LOCAL_TRACKING_REF_ONLY: true,
  REMOTE_FRESHNESS_CONFIRMED: true,
  UNKNOWN: true,
} satisfies Record<SourceFreshness, true>) as SourceFreshness[];

const EXPECTATION_FRESHNESS_MEMBERS = Object.keys({
  EXPECTATION_SOURCE_CURRENT: true,
  EXPECTATION_SOURCE_STALE: true,
  EXPECTATION_SOURCE_UNAVAILABLE: true,
} satisfies Record<ExpectationFreshness, true>) as ExpectationFreshness[];

/** Receipt outcomes that must NEVER be mistaken for a passing evaluation
 *  (mirrors receipts.ts SEMANTIC_RECEIPT_NON_PASS_OUTCOMES). */
const NON_PASS_RECEIPT_OUTCOMES: readonly SemanticReceiptOutcome[] =
  RECEIPT_OUTCOME_MEMBERS.filter((outcome) => outcome !== 'PASS' && outcome !== 'ANOMALY');

// ---------------------------------------------------------------------------
// Specified mappings (mirror of the convergence tables under test).
// ---------------------------------------------------------------------------

const EXPECTED_RECEIPT_OUTCOME: Record<SemanticReceiptOutcome, UnifiedContractResultCategory> = {
  PASS: 'PROVEN',
  ANOMALY: 'PROVEN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NO_EXPECTATION: 'NOT_APPLICABLE',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  INVALID_INPUT: 'UNSUPPORTED',
  PROJECTION_LIMIT_EXCEEDED: 'PARTIAL',
  INTERNAL_ERROR: 'UNSUPPORTED',
  PARTIAL_COVERAGE: 'PARTIAL',
};

const EXPECTED_RUNNER_OUTCOME: Record<SemanticOutcome, UnifiedContractResultCategory> = {
  PASS: 'PROVEN',
  ANOMALY: 'PROVEN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  EXPECTATION_UNAVAILABLE: 'UNAVAILABLE',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_INVALID: 'UNSUPPORTED',
  INVALID_INPUT: 'UNSUPPORTED',
  PROJECTION_LIMIT_EXCEEDED: 'PARTIAL',
  PARTIAL_COVERAGE: 'PARTIAL',
};

const EXPECTED_TRIAGE_OUTCOME: Record<SemanticTriageOutcome, UnifiedContractResultCategory> = {
  ...EXPECTED_RUNNER_OUTCOME,
  NO_EXPECTATION: 'NOT_APPLICABLE',
  INTERNAL_ERROR: 'UNSUPPORTED',
};

const EXPECTED_RESOLVER_STATE: Record<(typeof RESOLVER_STATE_MEMBERS)[number], UnifiedContractResultCategory> = {
  RESOLVED: 'PROVEN',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const EXPECTED_INVENTORY_CURRENTNESS: Record<(typeof INVENTORY_CURRENTNESS_MEMBERS)[number], UnifiedContractResultCategory> = {
  CURRENT: 'PROVEN',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const EXPECTED_PROMOTION_CURRENTNESS: Record<PromotionSourceCurrentness, UnifiedContractResultCategory> = {
  CURRENT: 'PROVEN',
  LOCAL_TRACKING_ONLY: 'PARTIAL',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'AMBIGUOUS',
};

const EXPECTED_SOURCE_FRESHNESS: Record<SourceFreshness, UnifiedContractResultCategory> = {
  SOURCE_CURRENT_LOCALLY: 'PROVEN',
  LOCAL_TRACKING_REF_ONLY: 'PARTIAL',
  REMOTE_FRESHNESS_CONFIRMED: 'PROVEN',
  UNKNOWN: 'AMBIGUOUS',
};

const EXPECTED_EXPECTATION_FRESHNESS: Record<ExpectationFreshness, UnifiedContractResultCategory> = {
  EXPECTATION_SOURCE_CURRENT: 'PROVEN',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
};

test('phase15p semantic vocabulary: version constant and vocabulary roster are exact', () => {
  expect(SEMANTIC_RESULT_VOCABULARY_VERSION).toBe('nightwatch.semantic-result-vocabulary.v1');
  expect([...SEMANTIC_VOCABULARY_NAMES]).toEqual([
    'semantic-receipt-outcome',
    'semantic-runner-outcome',
    'semantic-triage-outcome',
    'coverage-resolver-state',
    'inventory-currentness',
    'promotion-source-currentness',
    'source-freshness',
    'expectation-freshness',
  ]);
});

test('phase15p semantic vocabulary: receipt outcomes map totally onto their specified categories', () => {
  expect(RECEIPT_OUTCOME_MEMBERS).toHaveLength(10);
  for (const outcome of RECEIPT_OUTCOME_MEMBERS) {
    const result = unifiedFromSemanticReceiptOutcome(outcome);
    expect(result.category).toBe(EXPECTED_RECEIPT_OUTCOME[outcome]);
    expect(result.sourceVocabulary).toBe('semantic-receipt-outcome');
    expect(result.sourceValue).toBe(outcome);
    expect(result.resultVersion).toBe(CONTRACT_RESULT_VOCABULARY_VERSION);
  }
});

test('phase15p semantic vocabulary: runner outcomes map totally onto their specified categories', () => {
  expect(RUNNER_OUTCOME_MEMBERS).toHaveLength(9);
  for (const outcome of RUNNER_OUTCOME_MEMBERS) {
    const result = unifiedFromSemanticRunnerOutcome(outcome);
    expect(result.category).toBe(EXPECTED_RUNNER_OUTCOME[outcome]);
    expect(result.sourceVocabulary).toBe('semantic-runner-outcome');
    expect(result.sourceValue).toBe(outcome);
  }
});

test('phase15p semantic vocabulary: triage outcomes map totally onto their specified categories', () => {
  expect(TRIAGE_OUTCOME_MEMBERS).toHaveLength(11);
  for (const outcome of TRIAGE_OUTCOME_MEMBERS) {
    const result = unifiedFromSemanticTriageOutcome(outcome);
    expect(result.category).toBe(EXPECTED_TRIAGE_OUTCOME[outcome]);
    expect(result.sourceVocabulary).toBe('semantic-triage-outcome');
    expect(result.sourceValue).toBe(outcome);
  }
});

test('phase15p semantic vocabulary: coverage resolver states and inventory currentness map totally', () => {
  expect(RESOLVER_STATE_MEMBERS).toHaveLength(4);
  for (const state of RESOLVER_STATE_MEMBERS) {
    const result = unifiedFromCoverageResolverState(state);
    expect(result.category).toBe(EXPECTED_RESOLVER_STATE[state]);
    expect(result.sourceVocabulary).toBe('coverage-resolver-state');
    expect(result.sourceValue).toBe(state);
  }
  expect(INVENTORY_CURRENTNESS_MEMBERS).toHaveLength(4);
  for (const cls of INVENTORY_CURRENTNESS_MEMBERS) {
    const result = unifiedFromInventoryCurrentness(cls);
    expect(result.category).toBe(EXPECTED_INVENTORY_CURRENTNESS[cls]);
    expect(result.sourceVocabulary).toBe('inventory-currentness');
    expect(result.sourceValue).toBe(cls);
  }
});

test('phase15p semantic vocabulary: promotion currentness and freshness surfaces map totally', () => {
  expect(PROMOTION_CURRENTNESS_MEMBERS).toHaveLength(5);
  for (const currentness of PROMOTION_CURRENTNESS_MEMBERS) {
    const result = unifiedFromPromotionCurrentness(currentness);
    expect(result.category).toBe(EXPECTED_PROMOTION_CURRENTNESS[currentness]);
    expect(result.sourceVocabulary).toBe('promotion-source-currentness');
    expect(result.sourceValue).toBe(currentness);
  }
  expect(SOURCE_FRESHNESS_MEMBERS).toHaveLength(4);
  for (const freshness of SOURCE_FRESHNESS_MEMBERS) {
    const result = unifiedFromSourceFreshness(freshness);
    expect(result.category).toBe(EXPECTED_SOURCE_FRESHNESS[freshness]);
    expect(result.sourceVocabulary).toBe('source-freshness');
    expect(result.sourceValue).toBe(freshness);
  }
  expect(EXPECTATION_FRESHNESS_MEMBERS).toHaveLength(3);
  for (const freshness of EXPECTATION_FRESHNESS_MEMBERS) {
    const result = unifiedFromExpectationFreshness(freshness);
    expect(result.category).toBe(EXPECTED_EXPECTATION_FRESHNESS[freshness]);
    expect(result.sourceVocabulary).toBe('expectation-freshness');
    expect(result.sourceValue).toBe(freshness);
  }
});

test('phase15p semantic vocabulary: targetId passthrough works on every adapter family', () => {
  const adapted = [
    unifiedFromSemanticReceiptOutcome('PASS', { targetId: 'fixture-a.common-exchange.read' }),
    unifiedFromSemanticRunnerOutcome('ANOMALY', { targetId: 'fixture-b.account-inventory.read' }),
    unifiedFromCoverageResolverState('RESOLVED', { targetId: 'fixture-c.billing-groups.read' }),
    unifiedFromSourceFreshness('REMOTE_FRESHNESS_CONFIRMED', { targetId: 'fixture-d.users.read' }),
  ];
  for (const result of adapted) expect(result.targetId).toMatch(/^fixture-/);
  expect(unifiedFromSemanticReceiptOutcome('PASS').targetId).toBeUndefined();
});

test('phase15p semantic vocabulary: only PASS/ANOMALY ever land in PROVEN across all outcome vocabularies', () => {
  // The never-PASS guarantee is structural: every non-pass outcome lands in a
  // strictly weaker category than PROVEN, so zero findings can never be
  // promoted to a proven result through this vocabulary.
  for (const outcome of NON_PASS_RECEIPT_OUTCOMES) {
    expect(unifiedFromSemanticReceiptOutcome(outcome).category).not.toBe('PROVEN');
  }
  for (const outcome of RUNNER_OUTCOME_MEMBERS) {
    if (outcome !== 'PASS' && outcome !== 'ANOMALY') {
      expect(unifiedFromSemanticRunnerOutcome(outcome).category).not.toBe('PROVEN');
    }
  }
  for (const outcome of TRIAGE_OUTCOME_MEMBERS) {
    if (outcome !== 'PASS' && outcome !== 'ANOMALY') {
      expect(unifiedFromSemanticTriageOutcome(outcome).category).not.toBe('PROVEN');
    }
  }
  expect(unifiedFromSemanticReceiptOutcome('PASS').category).toBe('PROVEN');
  expect(unifiedFromSemanticReceiptOutcome('ANOMALY').category).toBe('PROVEN');
});

test('phase15p semantic vocabulary: NO_EXPECTATION/STALE/UNAVAILABLE/N-A/INTERNAL_ERROR keep their historical pairings', () => {
  // Cross-vocabulary agreement with the Phase 15 Session 1 mappings.
  expect(unifiedFromSemanticReceiptOutcome('NO_EXPECTATION').category)
    .toBe(unifiedFromRealSourceResolution({ kind: 'NO_EXPECTATION' }).category);
  expect(unifiedFromSemanticReceiptOutcome('EXPECTATION_SOURCE_STALE').category)
    .toBe(unifiedFromExpectationAdmissionResult('EXPECTATION_SOURCE_STALE').category);
  expect(unifiedFromSemanticReceiptOutcome('EXPECTATION_SOURCE_UNAVAILABLE').category)
    .toBe(unifiedFromExpectationAdmissionResult('EXPECTATION_SOURCE_UNAVAILABLE').category);
  expect(unifiedFromSemanticTriageOutcome('INTERNAL_ERROR').category)
    .toBe(unifiedFromDerivationFailure('CONTRACT_MISMATCH').category);
});

test('phase15p semantic vocabulary: duplicate receipt-outcome vocabulary is pinned identical to the canonical one', () => {
  for (const outcome of RECEIPT_OUTCOME_MEMBERS) {
    expect(receiptOutcomeForTriage(outcome)).toBe(outcome as SemanticReceiptOutcomeForTriage);
  }
});

test('phase15p semantic vocabulary: triage outcome superset converges onto canonical receipt outcomes', () => {
  expect(TRIAGE_OUTCOME_MEMBERS.length).toBeGreaterThan(RECEIPT_OUTCOME_MEMBERS.length);
  for (const outcome of TRIAGE_OUTCOME_MEMBERS) {
    const canonical = canonicalReceiptOutcomeFromTriageOutcome(outcome);
    expect(RECEIPT_OUTCOME_MEMBERS).toContain(canonical);
    // Convergence is category-preserving.
    expect(unifiedFromSemanticReceiptOutcome(canonical).category)
      .toBe(unifiedFromSemanticTriageOutcome(outcome).category);
  }
  // Legacy names converge mechanically.
  expect(canonicalReceiptOutcomeFromTriageOutcome('EXPECTATION_UNAVAILABLE')).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
  expect(canonicalReceiptOutcomeFromTriageOutcome('EXPECTATION_INVALID')).toBe('INTERNAL_ERROR');
});

test('phase15p semantic vocabulary: strict parsers accept every member and reject unknown codes fail-closed', () => {
  for (const outcome of RECEIPT_OUTCOME_MEMBERS) {
    expect(parseSemanticReceiptOutcome(outcome)).toBe(outcome);
  }
  for (const outcome of TRIAGE_OUTCOME_MEMBERS) {
    expect(parseSemanticTriageOutcome(outcome)).toBe(outcome);
  }
  for (const value of CONVERGED_SOURCE_CURRENTNESS_VALUES) {
    expect(parseConvergedSourceCurrentness(value)).toBe(value);
  }
  expect(() => parseSemanticReceiptOutcome('MAYBE')).toThrow(
    'SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-receipt-outcome:MAYBE',
  );
  expect(() => parseSemanticTriageOutcome('SOURCE_STALE')).toThrow(
    'SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-triage-outcome:SOURCE_STALE',
  );
  expect(() => parseConvergedSourceCurrentness('CURRENTISH')).toThrow(
    'SEMANTIC_VOCABULARY_UNKNOWN_VALUE:converged-source-currentness:CURRENTISH',
  );
  // Empty string is not a member anywhere.
  expect(() => parseSemanticReceiptOutcome('')).toThrow('SEMANTIC_VOCABULARY_UNKNOWN_VALUE');
});

test('phase15p semantic vocabulary: unknown runtime values fail closed on every adapter family', () => {
  expect(() => unifiedFromSemanticReceiptOutcome('TOTALLY_UNKNOWN' as SemanticReceiptOutcome)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:semantic-receipt-outcome:TOTALLY_UNKNOWN',
  );
  expect(() => unifiedFromSemanticRunnerOutcome('BOGUS' as SemanticOutcome)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:semantic-runner-outcome:BOGUS',
  );
  expect(() => unifiedFromSemanticTriageOutcome('NOPE' as SemanticTriageOutcome)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:semantic-triage-outcome:NOPE',
  );
  expect(() => unifiedFromCoverageResolverState('WEIRD' as 'RESOLVED')).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:coverage-resolver-state:WEIRD',
  );
  expect(() => unifiedFromInventoryCurrentness('FRESH' as 'CURRENT')).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:inventory-currentness:FRESH',
  );
  expect(() => unifiedFromPromotionCurrentness('MYSTERY' as PromotionSourceCurrentness)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:promotion-source-currentness:MYSTERY',
  );
  expect(() => unifiedFromSourceFreshness('SORT_OF_CURRENT' as SourceFreshness)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:source-freshness:SORT_OF_CURRENT',
  );
  expect(() => unifiedFromExpectationFreshness('EXPECTATION_SOURCE_ANCIENT' as ExpectationFreshness)).toThrow(
    'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:expectation-freshness:EXPECTATION_SOURCE_ANCIENT',
  );
});

test('phase15p semantic vocabulary: strict runner bridge agrees with the hook mapping on every defined member', () => {
  for (const outcome of RUNNER_OUTCOME_MEMBERS) {
    expect(strictSemanticOutcomeToReceiptOutcome(outcome)).toBe(semanticOutcomeToReceiptOutcome(outcome));
  }
  // Historical behavior preserved verbatim for the legacy names.
  expect(strictSemanticOutcomeToReceiptOutcome('EXPECTATION_INVALID')).toBe('INTERNAL_ERROR');
  expect(strictSemanticOutcomeToReceiptOutcome('EXPECTATION_UNAVAILABLE')).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
});

test('phase15p semantic vocabulary: strict runner bridge rejects unknown values instead of silently coercing to INTERNAL_ERROR', () => {
  // The hook's default branch silently coerces ANY unknown string to
  // INTERNAL_ERROR; the strict bridge fails closed at the same boundary.
  expect(semanticOutcomeToReceiptOutcome('GARBAGE')).toBe('INTERNAL_ERROR');
  expect(() => strictSemanticOutcomeToReceiptOutcome('GARBAGE')).toThrow(
    'SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-runner-outcome:GARBAGE',
  );
});

test('phase15p semantic vocabulary: converged currentness axis covers all five historical spellings', () => {
  expect([...CONVERGED_SOURCE_CURRENTNESS_VALUES].sort()).toEqual([
    'CURRENT',
    'LOCAL_TRACKING_ONLY',
    'NOT_APPLICABLE',
    'STALE',
    'UNAVAILABLE',
    'UNKNOWN',
  ]);
  expect(convergedCurrentnessFromInventory('CURRENT')).toBe('CURRENT');
  expect(convergedCurrentnessFromInventory('NOT_APPLICABLE')).toBe('NOT_APPLICABLE');
  expect(convergedCurrentnessFromPromotion('LOCAL_TRACKING_ONLY')).toBe('LOCAL_TRACKING_ONLY');
  expect(convergedCurrentnessFromTriage('UNKNOWN')).toBe('UNKNOWN');
  expect(convergedCurrentnessFromSourceFreshness('SOURCE_CURRENT_LOCALLY')).toBe('CURRENT');
  expect(convergedCurrentnessFromSourceFreshness('REMOTE_FRESHNESS_CONFIRMED')).toBe('CURRENT');
  expect(convergedCurrentnessFromSourceFreshness('LOCAL_TRACKING_REF_ONLY')).toBe('LOCAL_TRACKING_ONLY');
  expect(convergedCurrentnessFromExpectationFreshness('EXPECTATION_SOURCE_CURRENT')).toBe('CURRENT');
  expect(convergedCurrentnessFromExpectationFreshness('EXPECTATION_SOURCE_UNAVAILABLE')).toBe('UNAVAILABLE');
});

test('phase15p semantic vocabulary: source-freshness convergence agrees with the existing promotionResult bridge', () => {
  for (const freshness of SOURCE_FRESHNESS_MEMBERS) {
    expect(convergedCurrentnessFromSourceFreshness(freshness))
      .toBe(currentnessFromSourceFreshness(freshness) as ConvergedSourceCurrentness);
  }
});

test('phase15p semantic vocabulary: provenance registry mechanically covers every owned member exactly once', () => {
  verifySemanticVocabularyProvenanceIntegrity(); // must not throw
  const expectedTotal =
    RECEIPT_OUTCOME_MEMBERS.length +
    RUNNER_OUTCOME_MEMBERS.length +
    TRIAGE_OUTCOME_MEMBERS.length +
    RESOLVER_STATE_MEMBERS.length +
    INVENTORY_CURRENTNESS_MEMBERS.length +
    PROMOTION_CURRENTNESS_MEMBERS.length +
    SOURCE_FRESHNESS_MEMBERS.length +
    EXPECTATION_FRESHNESS_MEMBERS.length;
  expect(SEMANTIC_VOCABULARY_PROVENANCE).toHaveLength(expectedTotal);
  const seen = new Set<string>();
  for (const entry of SEMANTIC_VOCABULARY_PROVENANCE) {
    const key = `${entry.historicalVocabulary}:${entry.historicalMember}`;
    expect(seen.has(key)).toBe(false);
    seen.add(key);
    expect(SEMANTIC_VOCABULARY_NAMES).toContain(entry.historicalVocabulary);
  }
  // Spot-check documented provenance for representative members.
  expect(SEMANTIC_VOCABULARY_PROVENANCE).toContainEqual({
    historicalVocabulary: 'semantic-receipt-outcome',
    historicalMember: 'EXPECTATION_SOURCE_STALE',
    unifiedCategory: 'STALE',
  });
  expect(SEMANTIC_VOCABULARY_PROVENANCE).toContainEqual({
    historicalVocabulary: 'semantic-triage-outcome',
    historicalMember: 'EXPECTATION_UNAVAILABLE',
    unifiedCategory: 'UNAVAILABLE',
  });
});

test('phase15p semantic vocabulary: provenance entries agree with the actual adapter outputs', () => {
  for (const entry of SEMANTIC_VOCABULARY_PROVENANCE) {
    let category: UnifiedContractResultCategory | undefined;
    switch (entry.historicalVocabulary) {
      case 'semantic-receipt-outcome':
        category = unifiedFromSemanticReceiptOutcome(parseSemanticReceiptOutcome(entry.historicalMember)).category;
        break;
      case 'semantic-runner-outcome':
        category = unifiedFromSemanticRunnerOutcome(entry.historicalMember as SemanticOutcome).category;
        break;
      case 'semantic-triage-outcome':
        category = unifiedFromSemanticTriageOutcome(parseSemanticTriageOutcome(entry.historicalMember)).category;
        break;
      case 'coverage-resolver-state':
        category = unifiedFromCoverageResolverState(entry.historicalMember as 'RESOLVED').category;
        break;
      case 'inventory-currentness':
        category = unifiedFromInventoryCurrentness(entry.historicalMember as 'CURRENT').category;
        break;
      case 'promotion-source-currentness':
        category = unifiedFromPromotionCurrentness(entry.historicalMember as PromotionSourceCurrentness).category;
        break;
      case 'source-freshness':
        category = unifiedFromSourceFreshness(entry.historicalMember as SourceFreshness).category;
        break;
      case 'expectation-freshness':
        category = unifiedFromExpectationFreshness(entry.historicalMember as ExpectationFreshness).category;
        break;
      default:
        throw new Error(`unexpected provenance vocabulary: ${entry.historicalVocabulary}`);
    }
    expect(category).toBe(entry.unifiedCategory);
  }
});

test('phase15p semantic vocabulary: adapters and provenance are deterministic across repeated calls', () => {
  const sample = RECEIPT_OUTCOME_MEMBERS.map((outcome) => unifiedFromSemanticReceiptOutcome(outcome, { targetId: 'fixture-a' }));
  for (let round = 0; round < 3; round++) {
    expect(RECEIPT_OUTCOME_MEMBERS.map((outcome) => unifiedFromSemanticReceiptOutcome(outcome, { targetId: 'fixture-a' })))
      .toEqual(sample);
    expect(JSON.stringify([...SEMANTIC_VOCABULARY_PROVENANCE]))
      .toBe(JSON.stringify([...SEMANTIC_VOCABULARY_PROVENANCE]));
  }
});

// ---------------------------------------------------------------------------
// Serialized-compatibility round-trips of representative historical payloads.
// ---------------------------------------------------------------------------

/** One representative payload per adapter family that ever persisted a
 *  UnifiedContractResult (the seven Session 1 vocabularies, the aggregate,
 *  and the new A02 families). */
function representativeHistoricalPayloads(): readonly { readonly dto: UnifiedContractResult }[] {
  return [
    { dto: unifiedFromAnalyzerStatus('AMBIGUOUS', { blockerCode: 'PARTIAL_PROOF_ONLY', targetId: 'ripple.common-exchange.read' }) },
    { dto: unifiedFromRealSourceResolution({ kind: 'RESOLVED' } as unknown as RealSourceResolution, { targetId: 'ripple.payer-exchange.read' }) },
    { dto: unifiedFromExpectationAdmissionResult('EXPECTATION_ADMITTED') },
    { dto: unifiedFromDerivationFailure('TYPE_FLOW_AMBIGUOUS') },
    { dto: unifiedFromCollectionAdmissionFailure('COLLECTION_ADMISSION_NOT_DERIVED') },
    { dto: unifiedFromDriftClass('EVIDENCE_CHANGED_COMPATIBLE') },
    { dto: unifiedFromCoverageDisposition('APPROVED_AND_ADMITTED_COLLECTION') },
    { dto: aggregateUnifiedContractResults([
        unifiedFromDerivationFailure('TYPE_FLOW_AMBIGUOUS'),
        unifiedFromCoverageDisposition('APPROVED_NOT_ADMITTED_AMBIGUOUS'),
      ]) },
    { dto: unifiedFromSemanticReceiptOutcome('EXPECTATION_SOURCE_STALE', { targetId: 'ripple.common-exchange.read' }) },
    { dto: unifiedFromSemanticRunnerOutcome('PARTIAL_COVERAGE') },
    { dto: unifiedFromSemanticTriageOutcome('NO_EXPECTATION') },
    { dto: unifiedFromCoverageResolverState('SOURCE_UNAVAILABLE') },
    { dto: unifiedFromInventoryCurrentness('CURRENT') },
    { dto: unifiedFromPromotionCurrentness('LOCAL_TRACKING_ONLY') },
    { dto: unifiedFromSourceFreshness('REMOTE_FRESHNESS_CONFIRMED') },
    { dto: unifiedFromExpectationFreshness('EXPECTATION_SOURCE_STALE') },
  ];
}

test('phase15p serialized compat: every representative historical payload round-trips byte-stable through strict parsing', () => {
  for (const { dto } of representativeHistoricalPayloads()) {
    const serialized = JSON.stringify(dto);
    const parsed = parseUnifiedContractResultDto(serialized);
    expect(parsed).toEqual(dto);
    expect(JSON.stringify(parsed)).toBe(serialized);
    validateUnifiedContractResultDto(parsed); // must not throw
  }
});

test('phase15p serialized compat: a real v2 receipt payload keeps parsing and converges onto the unified category', () => {
  const receipt = buildSemanticEvaluationReceipt({
    oracleId: 'real-source-semantic-hook',
    outcome: 'EXPECTATION_SOURCE_STALE',
    targetId: 'fixture-a.common-exchange.read',
    expectationId: 'fixture-a.common-exchange.read.real-source-shape',
    projectionDigests: ['proj:sha256:0123456789abcdef01234567'],
    invariantTotal: 2,
    invariantPassCount: 0,
    invariantNaCount: 2,
    invariantViolationCount: 0,
    findingCount: 0,
  });
  // Historical payload stays valid under its own validator...
  const reparsed = JSON.parse(JSON.stringify(receipt)) as typeof receipt;
  expect(() => validateSemanticEvaluationReceipt(reparsed)).not.toThrow();
  // ...and its discriminator converges through the strict boundary.
  const outcome = parseSemanticReceiptOutcome(reparsed.outcome);
  const unified = unifiedFromSemanticReceiptOutcome(outcome, { targetId: reparsed.targetId });
  expect(unified.category).toBe('STALE');
  expect(unified.sourceValue).toBe('EXPECTATION_SOURCE_STALE');
  expect(parseUnifiedContractResultDto(JSON.stringify(unified))).toEqual(unified);
});

test('phase15p serialized compat: corrupted DTOs fail closed with precise codes', () => {
  const good = JSON.stringify(unifiedFromDerivationFailure('CONTRACT_MISMATCH'));
  // Not JSON / not an object.
  expect(() => parseUnifiedContractResultDto('{nope')).toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:not-json');
  expect(() => parseUnifiedContractResultDto('42')).toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:not-object');
  expect(() => parseUnifiedContractResultDto('[]')).toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:not-object');
  // Unknown or missing fields.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"STALE","sourceVocabulary":"derivation-failure","sourceValue":"CONTRACT_MISMATCH","raw":"x"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:unknown-field:raw');
  expect(() => parseUnifiedContractResultDto('{"category":"STALE","sourceVocabulary":"derivation-failure","sourceValue":"CONTRACT_MISMATCH"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:resultVersion');
  // Wrong version.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v999","category":"STALE","sourceVocabulary":"derivation-failure","sourceValue":"CONTRACT_MISMATCH"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:resultVersion');
  // Unknown category.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"FINE","sourceVocabulary":"derivation-failure","sourceValue":"CONTRACT_MISMATCH"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:category');
  // Known vocabulary with a non-member sourceValue re-derives fail-closed.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"STALE","sourceVocabulary":"derivation-failure","sourceValue":"BOGUS_FAILURE"}'))
    .toThrow('UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE:derivation-failure:BOGUS_FAILURE');
  // Category contradicting the table for a known member.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"PROVEN","sourceVocabulary":"derivation-failure","sourceValue":"CONTRACT_MISMATCH"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:category-mismatch');
  // Privacy sentinel in detail.
  expect(() => parseUnifiedContractResultDto('{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"AMBIGUOUS","sourceVocabulary":"analyzer-status","sourceValue":"AMBIGUOUS","detail":"Bearer abc"}'))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:detail-sentinel');
  // Oversized categorical field.
  expect(() => parseUnifiedContractResultDto(`{"resultVersion":"nightwatch.contract-result-vocabulary.v1","category":"STALE","sourceVocabulary":"derivation-failure","sourceValue":"${'X'.repeat(201)}"}`))
    .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:sourceValue');
});

test('phase15p serialized compat: unknown vocabulary names stay opaque but structurally validated', () => {
  // Forward-compatible vocabulary names parse when structurally sound...
  const forward = {
    resultVersion: CONTRACT_RESULT_VOCABULARY_VERSION,
    category: 'STALE',
    sourceVocabulary: 'some-future-vocabulary',
    sourceValue: 'SOME_FUTURE_CODE',
  };
  expect(() => validateUnifiedContractResultDto(forward)).not.toThrow();
  // ...but are not claimed as mechanically known.
  expect(isKnownContractResultVocabularyName('some-future-vocabulary')).toBe(false);
  for (const name of [...SEMANTIC_VOCABULARY_NAMES, 'unified-aggregate']) {
    expect(isKnownContractResultVocabularyName(name)).toBe(true);
  }
  for (const name of ['analyzer-status', 'real-source-resolution', 'expectation-admission', 'derivation-failure', 'collection-admission-failure', 'contract-drift-class', 'coverage-disposition']) {
    expect(isKnownContractResultVocabularyName(name)).toBe(true);
  }
  expect(isKnownContractResultVocabularyName('')).toBe(false);
});
