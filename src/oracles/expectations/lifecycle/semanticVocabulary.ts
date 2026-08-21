// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A02) — semantic result / reason vocabulary convergence.
//
// Phase 15 Session 1 unified the seven Phase 9–14 SOURCE-contract result
// vocabularies (contractResultVocabulary.ts). The SEMANTIC evaluation side
// kept parallel, partially contradictory vocabularies: the receipt outcome
// union, the runner outcome union, the triage outcome union (a superset with
// legacy member names), two near-duplicate resolver-state/currentness pairs,
// and three triage currentness spellings. This module converges them onto the
// SAME categorical axis without touching any authoritative source module:
//
//   - ADDITIVE ONLY: every historical union stays authoritative in its own
//     module and keeps parsing; nothing is deprecated or rewritten here.
//   - TOTAL ADAPTERS: every member of every converged union maps to exactly
//     one UnifiedContractResultCategory through a compile-time-exhaustive
//     Record<Union, Category> table; adding a member without a mapping
//     decision breaks the build instead of silently falling through.
//   - FAIL CLOSED: an unknown runtime value never coerces (no default
//     fallbacks); adapters throw
//     SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:<vocabulary>:<value> and strict
//     parse-time validators throw
//     SEMANTIC_VOCABULARY_UNKNOWN_VALUE:<vocabulary>:<value>.
//   - NEVER-PASS PRESERVED: only PASS/ANOMALY-class members ever land in
//     PROVEN; NO_EXPECTATION/SOURCE_STALE/SOURCE_UNAVAILABLE/NOT_APPLICABLE/
//     INTERNAL_ERROR/INVALID_INPUT/PROJECTION_LIMIT_EXCEEDED/PARTIAL_COVERAGE
//     land in strictly weaker categories, so zero findings can never be
//     promoted to a proven result through this vocabulary.
//   - PROVENANCE REGISTRY: SEMANTIC_VOCABULARY_PROVENANCE records, for every
//     converged mapping, which historical vocabulary and member it came from.
//     It is derived mechanically FROM the exhaustive tables (never hand-
//     maintained), so future codes cannot be added ad hoc: a new member
//     without a table row fails compilation, and a table row without a
//     provenance entry fails verifySemanticVocabularyProvenanceIntegrity().
//   - STRICT DTO PARSING: persisted UnifiedContractResult JSON round-trips
//     through parseUnifiedContractResultDto, which rejects unrecognized
//     categories/versions and re-verifies category membership against the
//     authoritative adapter tables for every known source vocabulary.
//
// PURE: no fs, no network, no child process, no env, no crypto, no
// persistence, no AI/selfDev/campaign authority (hardening-guarded).
// DETERMINISTIC: identical inputs produce identical outputs, always.
// PRIVACY INVARIANT: categorical vocabulary values only; `detail` is
// screened with containsAnySentinel and a sentinel trip fails closed.
// ---------------------------------------------------------------------------

import { containsAnySentinel } from '../extract/analyzer';
import type { AnalyzerStatus } from '../extract/analyzer';
import type { RealSourceResolution } from '../resolver';
import type { ExpectationAdmissionResult, ExpectationFreshness } from '../types';
import type { RealSourceDerivationFailure } from '../recipes/types';
import type { RealSourceCollectionAdmissionFailure } from '../collectionAdmission';
import type { ContractDriftClass } from '../extract/contractDrift';
import type { CoverageDisposition, CoverageInventoryEntry } from '../coverageInventory';
import type { SemanticReceiptOutcome } from '../../semantic/receipts';
import type { SemanticOutcome } from '../../invariants/types';
import type {
  SemanticReceiptOutcomeForTriage,
  SemanticTriageOutcome,
  SemanticTriageSourceCurrentness,
} from '../../../core/triage/semanticTriageEvidence';
import type { PromotionSourceCurrentness } from '../../../core/triage/promotionResult';
import type { SourceFreshness } from '../../../core/triage/types';
import {
  CONTRACT_RESULT_VOCABULARY_VERSION,
  UNIFIED_CONTRACT_RESULT_CATEGORIES,
  buildUnifiedContractResult,
  unifiedFromAnalyzerStatus,
  unifiedFromCollectionAdmissionFailure,
  unifiedFromCoverageDisposition,
  unifiedFromDerivationFailure,
  unifiedFromDriftClass,
  unifiedFromExpectationAdmissionResult,
  unifiedFromRealSourceResolution,
} from './contractResultVocabulary';
import type { UnifiedContractResult, UnifiedContractResultCategory } from './contractResultVocabulary';

/** Load-bearing vocabulary version for the converged semantic-result view. */
export const SEMANTIC_RESULT_VOCABULARY_VERSION = 'nightwatch.semantic-result-vocabulary.v1' as const;

/** Upper bound for every categorical string field carried through this module. */
const MAX_CODE_LENGTH = 200;

// ---------------------------------------------------------------------------
// Guarded total-table machinery (same pattern as contractResultVocabulary):
// compile-time-exhaustive Record tables, runtime lookups that throw on
// unknown values instead of coercing.
// ---------------------------------------------------------------------------

function tableOf(members: Record<string, UnifiedContractResultCategory>): ReadonlyMap<string, UnifiedContractResultCategory> {
  return new Map(Object.entries(members));
}

function categoryFor(
  table: ReadonlyMap<string, UnifiedContractResultCategory>,
  vocabulary: string,
  value: string,
): UnifiedContractResultCategory {
  const mapped = table.get(value);
  if (mapped === undefined) {
    throw new Error(`SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:${vocabulary}:${value}`);
  }
  return mapped;
}

function assertCategoricalString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_CODE_LENGTH) {
    throw new Error(`SEMANTIC_VOCABULARY_DTO_INVALID:${field}`);
  }
}

// ---------------------------------------------------------------------------
// Converged vocabularies. Each entry: canonical vocabulary name (the stable
// serialized discriminator), the authoritative historical union it adapts,
// and its total category table.
// ---------------------------------------------------------------------------

/** Canonical receipt outcome vocabulary (semantic/receipts.ts, v2 receipts). */
const SEMANTIC_RECEIPT_OUTCOME_VOCABULARY = 'semantic-receipt-outcome';

const SEMANTIC_RECEIPT_OUTCOME_CATEGORY: Record<SemanticReceiptOutcome, UnifiedContractResultCategory> = {
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

const SEMANTIC_RECEIPT_OUTCOME_TABLE = tableOf(SEMANTIC_RECEIPT_OUTCOME_CATEGORY);

/**
 * Runner outcome vocabulary (invariants/types.ts SemanticOutcome). ANOMALY
 * lands in PROVEN like PASS because the category axis records "decisive
 * completed evaluation", never pass/fail polarity: polarity survives
 * verbatim on the recorded sourceValue and must be read from the outcome
 * axis, never inferred from the category. Every never-PASS outcome lands in
 * a strictly weaker category than PROVEN.
 */
const SEMANTIC_RUNNER_OUTCOME_VOCABULARY = 'semantic-runner-outcome';

const SEMANTIC_RUNNER_OUTCOME_CATEGORY: Record<SemanticOutcome, UnifiedContractResultCategory> = {
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

const SEMANTIC_RUNNER_OUTCOME_TABLE = tableOf(SEMANTIC_RUNNER_OUTCOME_CATEGORY);

/** Triage outcome vocabulary (triage/semanticTriageEvidence.ts): the runner
 *  vocabulary plus NO_EXPECTATION/INTERNAL_ERROR plus the two legacy member
 *  names EXPECTATION_UNAVAILABLE/EXPECTATION_INVALID. */
const SEMANTIC_TRIAGE_OUTCOME_VOCABULARY = 'semantic-triage-outcome';

const SEMANTIC_TRIAGE_OUTCOME_CATEGORY: Record<SemanticTriageOutcome, UnifiedContractResultCategory> = {
  PASS: 'PROVEN',
  ANOMALY: 'PROVEN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  EXPECTATION_UNAVAILABLE: 'UNAVAILABLE',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_INVALID: 'UNSUPPORTED',
  INVALID_INPUT: 'UNSUPPORTED',
  PROJECTION_LIMIT_EXCEEDED: 'PARTIAL',
  PARTIAL_COVERAGE: 'PARTIAL',
  NO_EXPECTATION: 'NOT_APPLICABLE',
  INTERNAL_ERROR: 'UNSUPPORTED',
};

const SEMANTIC_TRIAGE_OUTCOME_TABLE = tableOf(SEMANTIC_TRIAGE_OUTCOME_CATEGORY);

/** Coverage-inventory resolverState surface (coverageInventory.ts). */
const COVERAGE_RESOLVER_STATE_VOCABULARY = 'coverage-resolver-state';

const COVERAGE_RESOLVER_STATE_CATEGORY: Record<CoverageInventoryEntry['resolverState'], UnifiedContractResultCategory> = {
  RESOLVED: 'PROVEN',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const COVERAGE_RESOLVER_STATE_TABLE = tableOf(COVERAGE_RESOLVER_STATE_CATEGORY);

/** Coverage-inventory / composed-family currentness class surface
 *  (CURRENT | STALE | UNAVAILABLE | NOT_APPLICABLE). */
const INVENTORY_CURRENTNESS_VOCABULARY = 'inventory-currentness';

const INVENTORY_CURRENTNESS_CATEGORY: Record<CoverageInventoryEntry['currentness'], UnifiedContractResultCategory> = {
  CURRENT: 'PROVEN',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const INVENTORY_CURRENTNESS_TABLE = tableOf(INVENTORY_CURRENTNESS_CATEGORY);

/** Promotion-result source-currentness surface (triage/promotionResult.ts). */
const PROMOTION_CURRENTNESS_VOCABULARY = 'promotion-source-currentness';

const PROMOTION_CURRENTNESS_CATEGORY: Record<PromotionSourceCurrentness, UnifiedContractResultCategory> = {
  CURRENT: 'PROVEN',
  LOCAL_TRACKING_ONLY: 'PARTIAL',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'AMBIGUOUS',
};

const PROMOTION_CURRENTNESS_TABLE = tableOf(PROMOTION_CURRENTNESS_CATEGORY);

/** Triage SourceFreshness surface (triage/types.ts). */
const SOURCE_FRESHNESS_VOCABULARY = 'source-freshness';

const SOURCE_FRESHNESS_CATEGORY: Record<SourceFreshness, UnifiedContractResultCategory> = {
  SOURCE_CURRENT_LOCALLY: 'PROVEN',
  LOCAL_TRACKING_REF_ONLY: 'PARTIAL',
  REMOTE_FRESHNESS_CONFIRMED: 'PROVEN',
  UNKNOWN: 'AMBIGUOUS',
};

const SOURCE_FRESHNESS_TABLE = tableOf(SOURCE_FRESHNESS_CATEGORY);

/** Expectation freshness surface (expectations/types.ts). */
const EXPECTATION_FRESHNESS_VOCABULARY = 'expectation-freshness';

const EXPECTATION_FRESHNESS_CATEGORY: Record<ExpectationFreshness, UnifiedContractResultCategory> = {
  EXPECTATION_SOURCE_CURRENT: 'PROVEN',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
};

const EXPECTATION_FRESHNESS_TABLE = tableOf(EXPECTATION_FRESHNESS_CATEGORY);

/** Vocabulary names owned/documented by this module, in table order. */
export const SEMANTIC_VOCABULARY_NAMES: readonly string[] = Object.freeze([
  SEMANTIC_RECEIPT_OUTCOME_VOCABULARY,
  SEMANTIC_RUNNER_OUTCOME_VOCABULARY,
  SEMANTIC_TRIAGE_OUTCOME_VOCABULARY,
  COVERAGE_RESOLVER_STATE_VOCABULARY,
  INVENTORY_CURRENTNESS_VOCABULARY,
  PROMOTION_CURRENTNESS_VOCABULARY,
  SOURCE_FRESHNESS_VOCABULARY,
  EXPECTATION_FRESHNESS_VOCABULARY,
]);

const OWNED_TABLES: readonly (readonly [string, ReadonlyMap<string, UnifiedContractResultCategory>])[] = [
  [SEMANTIC_RECEIPT_OUTCOME_VOCABULARY, SEMANTIC_RECEIPT_OUTCOME_TABLE],
  [SEMANTIC_RUNNER_OUTCOME_VOCABULARY, SEMANTIC_RUNNER_OUTCOME_TABLE],
  [SEMANTIC_TRIAGE_OUTCOME_VOCABULARY, SEMANTIC_TRIAGE_OUTCOME_TABLE],
  [COVERAGE_RESOLVER_STATE_VOCABULARY, COVERAGE_RESOLVER_STATE_TABLE],
  [INVENTORY_CURRENTNESS_VOCABULARY, INVENTORY_CURRENTNESS_TABLE],
  [PROMOTION_CURRENTNESS_VOCABULARY, PROMOTION_CURRENTNESS_TABLE],
  [SOURCE_FRESHNESS_VOCABULARY, SOURCE_FRESHNESS_TABLE],
  [EXPECTATION_FRESHNESS_VOCABULARY, EXPECTATION_FRESHNESS_TABLE],
];

// ---------------------------------------------------------------------------
// Total adapters (one per converged vocabulary). Every adapter funnels
// through the shared guarded constructor so version stamping, targetId
// passthrough, and the privacy sentinel gate behave identically to the
// Phase 15 Session 1 vocabulary.
// ---------------------------------------------------------------------------

export function unifiedFromSemanticReceiptOutcome(
  outcome: SemanticReceiptOutcome,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(SEMANTIC_RECEIPT_OUTCOME_TABLE, SEMANTIC_RECEIPT_OUTCOME_VOCABULARY, outcome),
    sourceVocabulary: SEMANTIC_RECEIPT_OUTCOME_VOCABULARY,
    sourceValue: outcome,
    targetId: opts?.targetId,
  });
}

export function unifiedFromSemanticRunnerOutcome(
  outcome: SemanticOutcome,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(SEMANTIC_RUNNER_OUTCOME_TABLE, SEMANTIC_RUNNER_OUTCOME_VOCABULARY, outcome),
    sourceVocabulary: SEMANTIC_RUNNER_OUTCOME_VOCABULARY,
    sourceValue: outcome,
    targetId: opts?.targetId,
  });
}

export function unifiedFromSemanticTriageOutcome(
  outcome: SemanticTriageOutcome,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(SEMANTIC_TRIAGE_OUTCOME_TABLE, SEMANTIC_TRIAGE_OUTCOME_VOCABULARY, outcome),
    sourceVocabulary: SEMANTIC_TRIAGE_OUTCOME_VOCABULARY,
    sourceValue: outcome,
    targetId: opts?.targetId,
  });
}

export function unifiedFromCoverageResolverState(
  state: CoverageInventoryEntry['resolverState'],
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(COVERAGE_RESOLVER_STATE_TABLE, COVERAGE_RESOLVER_STATE_VOCABULARY, state),
    sourceVocabulary: COVERAGE_RESOLVER_STATE_VOCABULARY,
    sourceValue: state,
    targetId: opts?.targetId,
  });
}

export function unifiedFromInventoryCurrentness(
  cls: CoverageInventoryEntry['currentness'],
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(INVENTORY_CURRENTNESS_TABLE, INVENTORY_CURRENTNESS_VOCABULARY, cls),
    sourceVocabulary: INVENTORY_CURRENTNESS_VOCABULARY,
    sourceValue: cls,
    targetId: opts?.targetId,
  });
}

export function unifiedFromPromotionCurrentness(
  currentness: PromotionSourceCurrentness,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(PROMOTION_CURRENTNESS_TABLE, PROMOTION_CURRENTNESS_VOCABULARY, currentness),
    sourceVocabulary: PROMOTION_CURRENTNESS_VOCABULARY,
    sourceValue: currentness,
    targetId: opts?.targetId,
  });
}

export function unifiedFromSourceFreshness(
  freshness: SourceFreshness,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(SOURCE_FRESHNESS_TABLE, SOURCE_FRESHNESS_VOCABULARY, freshness),
    sourceVocabulary: SOURCE_FRESHNESS_VOCABULARY,
    sourceValue: freshness,
    targetId: opts?.targetId,
  });
}

export function unifiedFromExpectationFreshness(
  freshness: ExpectationFreshness,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(EXPECTATION_FRESHNESS_TABLE, EXPECTATION_FRESHNESS_VOCABULARY, freshness),
    sourceVocabulary: EXPECTATION_FRESHNESS_VOCABULARY,
    sourceValue: freshness,
    targetId: opts?.targetId,
  });
}

// ---------------------------------------------------------------------------
// Converged source-currentness axis.
//
// Five historical currentness spellings collapse onto ONE six-member
// canonical vocabulary. Mappings mirror the existing promotionResult.ts
// bridges exactly (SOURCE_CURRENT_LOCALLY and REMOTE_FRESHNESS_CONFIRMED are
// both CURRENT; LOCAL_TRACKING_REF_ONLY is LOCAL_TRACKING_ONLY); inventory/
// family classes map identity-wise; expectation freshness drops its prefix.
// ---------------------------------------------------------------------------

export type ConvergedSourceCurrentness =
  | 'CURRENT'
  | 'LOCAL_TRACKING_ONLY'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'UNKNOWN'
  | 'NOT_APPLICABLE';

export const CONVERGED_SOURCE_CURRENTNESS_VALUES: readonly ConvergedSourceCurrentness[] = Object.freeze([
  'CURRENT',
  'LOCAL_TRACKING_ONLY',
  'STALE',
  'UNAVAILABLE',
  'UNKNOWN',
  'NOT_APPLICABLE',
]);

/** Triage evidence source-currentness surface (triage/semanticTriageEvidence.ts). */
const SEMANTIC_TRIAGE_CURRENTNESS_VOCABULARY = 'semantic-triage-source-currentness';

const CONVERGED_FROM_INVENTORY_TABLE: ReadonlyMap<string, ConvergedSourceCurrentness> = new Map(
  Object.entries({
    CURRENT: 'CURRENT',
    STALE: 'STALE',
    UNAVAILABLE: 'UNAVAILABLE',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
  } satisfies Record<CoverageInventoryEntry['currentness'], ConvergedSourceCurrentness>),
);

const CONVERGED_FROM_PROMOTION_TABLE: ReadonlyMap<string, ConvergedSourceCurrentness> = new Map(
  Object.entries({
    CURRENT: 'CURRENT',
    LOCAL_TRACKING_ONLY: 'LOCAL_TRACKING_ONLY',
    STALE: 'STALE',
    UNAVAILABLE: 'UNAVAILABLE',
    UNKNOWN: 'UNKNOWN',
  } satisfies Record<PromotionSourceCurrentness, ConvergedSourceCurrentness>),
);

const CONVERGED_FROM_TRIAGE_TABLE: ReadonlyMap<string, ConvergedSourceCurrentness> = new Map(
  Object.entries({
    CURRENT: 'CURRENT',
    LOCAL_TRACKING_ONLY: 'LOCAL_TRACKING_ONLY',
    STALE: 'STALE',
    UNAVAILABLE: 'UNAVAILABLE',
    UNKNOWN: 'UNKNOWN',
  } satisfies Record<SemanticTriageSourceCurrentness, ConvergedSourceCurrentness>),
);

const CONVERGED_FROM_SOURCE_FRESHNESS_TABLE: ReadonlyMap<string, ConvergedSourceCurrentness> = new Map(
  Object.entries({
    SOURCE_CURRENT_LOCALLY: 'CURRENT',
    LOCAL_TRACKING_REF_ONLY: 'LOCAL_TRACKING_ONLY',
    REMOTE_FRESHNESS_CONFIRMED: 'CURRENT',
    UNKNOWN: 'UNKNOWN',
  } satisfies Record<SourceFreshness, ConvergedSourceCurrentness>),
);

const CONVERGED_FROM_EXPECTATION_FRESHNESS_TABLE: ReadonlyMap<string, ConvergedSourceCurrentness> = new Map(
  Object.entries({
    EXPECTATION_SOURCE_CURRENT: 'CURRENT',
    EXPECTATION_SOURCE_STALE: 'STALE',
    EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  } satisfies Record<ExpectationFreshness, ConvergedSourceCurrentness>),
);

function convergedFor(
  table: ReadonlyMap<string, ConvergedSourceCurrentness>,
  vocabulary: string,
  value: string,
): ConvergedSourceCurrentness {
  const mapped = table.get(value);
  if (mapped === undefined) {
    throw new Error(`SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:${vocabulary}:${value}`);
  }
  return mapped;
}

export function convergedCurrentnessFromInventory(cls: CoverageInventoryEntry['currentness']): ConvergedSourceCurrentness {
  return convergedFor(CONVERGED_FROM_INVENTORY_TABLE, INVENTORY_CURRENTNESS_VOCABULARY, cls);
}

export function convergedCurrentnessFromPromotion(currentness: PromotionSourceCurrentness): ConvergedSourceCurrentness {
  return convergedFor(CONVERGED_FROM_PROMOTION_TABLE, PROMOTION_CURRENTNESS_VOCABULARY, currentness);
}

export function convergedCurrentnessFromTriage(currentness: SemanticTriageSourceCurrentness): ConvergedSourceCurrentness {
  return convergedFor(CONVERGED_FROM_TRIAGE_TABLE, SEMANTIC_TRIAGE_CURRENTNESS_VOCABULARY, currentness);
}

export function convergedCurrentnessFromSourceFreshness(freshness: SourceFreshness): ConvergedSourceCurrentness {
  return convergedFor(CONVERGED_FROM_SOURCE_FRESHNESS_TABLE, SOURCE_FRESHNESS_VOCABULARY, freshness);
}

export function convergedCurrentnessFromExpectationFreshness(freshness: ExpectationFreshness): ConvergedSourceCurrentness {
  return convergedFor(CONVERGED_FROM_EXPECTATION_FRESHNESS_TABLE, EXPECTATION_FRESHNESS_VOCABULARY, freshness);
}

// ---------------------------------------------------------------------------
// Strict parse-time validation. These reject unrecognized codes outright
// (instead of silently coercing, e.g. into INTERNAL_ERROR) so corrupted or
// forward-incompatible payloads fail closed at the boundary.
// ---------------------------------------------------------------------------

export function parseSemanticReceiptOutcome(value: string): SemanticReceiptOutcome {
  if (!SEMANTIC_RECEIPT_OUTCOME_TABLE.has(value)) {
    throw new Error(`SEMANTIC_VOCABULARY_UNKNOWN_VALUE:${SEMANTIC_RECEIPT_OUTCOME_VOCABULARY}:${value}`);
  }
  return value as SemanticReceiptOutcome;
}

export function parseSemanticTriageOutcome(value: string): SemanticTriageOutcome {
  if (!SEMANTIC_TRIAGE_OUTCOME_TABLE.has(value)) {
    throw new Error(`SEMANTIC_VOCABULARY_UNKNOWN_VALUE:${SEMANTIC_TRIAGE_OUTCOME_VOCABULARY}:${value}`);
  }
  return value as SemanticTriageOutcome;
}

export function parseConvergedSourceCurrentness(value: string): ConvergedSourceCurrentness {
  if (!(CONVERGED_SOURCE_CURRENTNESS_VALUES as readonly string[]).includes(value)) {
    throw new Error(`SEMANTIC_VOCABULARY_UNKNOWN_VALUE:converged-source-currentness:${value}`);
  }
  return value as ConvergedSourceCurrentness;
}

// ---------------------------------------------------------------------------
// Duplicate-vocabulary convergence bridges.
//
// SemanticReceiptOutcomeForTriage is a literal duplicate of the canonical
// receipt outcome vocabulary; SemanticTriageOutcome is the runner vocabulary
// plus two legacy member names plus NO_EXPECTATION/INTERNAL_ERROR. These
// total bridges pin those identities mechanically so the duplicates can
// never silently diverge from the canonical sets.
// ---------------------------------------------------------------------------

const RECEIPT_OUTCOME_FOR_TRIAGE: Record<SemanticReceiptOutcome, SemanticReceiptOutcomeForTriage> = {
  PASS: 'PASS',
  ANOMALY: 'ANOMALY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NO_EXPECTATION: 'NO_EXPECTATION',
  EXPECTATION_SOURCE_STALE: 'EXPECTATION_SOURCE_STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'EXPECTATION_SOURCE_UNAVAILABLE',
  INVALID_INPUT: 'INVALID_INPUT',
  PROJECTION_LIMIT_EXCEEDED: 'PROJECTION_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PARTIAL_COVERAGE: 'PARTIAL_COVERAGE',
};

/** Total identity bridge from the canonical receipt outcome vocabulary onto
 *  the triage-local duplicate (compile-time-exhaustive both ways). */
export function receiptOutcomeForTriage(outcome: SemanticReceiptOutcome): SemanticReceiptOutcomeForTriage {
  return RECEIPT_OUTCOME_FOR_TRIAGE[outcome];
}

const CANONICAL_FROM_TRIAGE_OUTCOME: Record<SemanticTriageOutcome, SemanticReceiptOutcome> = {
  PASS: 'PASS',
  ANOMALY: 'ANOMALY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NO_EXPECTATION: 'NO_EXPECTATION',
  EXPECTATION_SOURCE_STALE: 'EXPECTATION_SOURCE_STALE',
  INVALID_INPUT: 'INVALID_INPUT',
  PROJECTION_LIMIT_EXCEEDED: 'PROJECTION_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PARTIAL_COVERAGE: 'PARTIAL_COVERAGE',
  // Legacy runner-vocabulary names converge onto their canonical spellings.
  EXPECTATION_UNAVAILABLE: 'EXPECTATION_SOURCE_UNAVAILABLE',
  EXPECTATION_INVALID: 'INTERNAL_ERROR',
};

/** Total bridge from the triage outcome vocabulary onto the canonical
 *  receipt outcome vocabulary. Legacy names converge mechanically
 *  (EXPECTATION_UNAVAILABLE -> EXPECTATION_SOURCE_UNAVAILABLE;
 *  EXPECTATION_INVALID -> INTERNAL_ERROR, matching the hook's historical
 *  classification of an invalid expectation as a Nightwatch defect). */
export function canonicalReceiptOutcomeFromTriageOutcome(outcome: SemanticTriageOutcome): SemanticReceiptOutcome {
  return CANONICAL_FROM_TRIAGE_OUTCOME[outcome];
}

/**
 * Strict replacement for the hook's silent-default outcome mapping: agrees
 * with semanticOutcomeToReceiptOutcome on EVERY defined runner outcome
 * (historical behavior preserved verbatim) but throws
 * SEMANTIC_VOCABULARY_UNKNOWN_VALUE on anything else instead of silently
 * coercing unknown strings to INTERNAL_ERROR.
 */
export function strictSemanticOutcomeToReceiptOutcome(outcome: string): SemanticReceiptOutcome {
  const mapped = SEMANTIC_OUTCOME_TO_RECEIPT_BRIDGE.get(outcome);
  if (mapped === undefined) {
    throw new Error(`SEMANTIC_VOCABULARY_UNKNOWN_VALUE:${SEMANTIC_RUNNER_OUTCOME_VOCABULARY}:${outcome}`);
  }
  return mapped;
}

const SEMANTIC_OUTCOME_TO_RECEIPT_BRIDGE: ReadonlyMap<string, SemanticReceiptOutcome> = new Map([
  ['PASS', 'PASS'],
  ['ANOMALY', 'ANOMALY'],
  ['NOT_APPLICABLE', 'NOT_APPLICABLE'],
  ['EXPECTATION_UNAVAILABLE', 'EXPECTATION_SOURCE_UNAVAILABLE'],
  ['EXPECTATION_SOURCE_STALE', 'EXPECTATION_SOURCE_STALE'],
  ['INVALID_INPUT', 'INVALID_INPUT'],
  ['PROJECTION_LIMIT_EXCEEDED', 'PROJECTION_LIMIT_EXCEEDED'],
  ['PARTIAL_COVERAGE', 'PARTIAL_COVERAGE'],
  ['EXPECTATION_INVALID', 'INTERNAL_ERROR'],
]);

// ---------------------------------------------------------------------------
// Provenance registry.
//
// Derived MECHANICALLY from the exhaustive tables above — never hand-edited.
// A new union member without a table row fails compilation; a table row is
// automatically represented here; verifySemanticVocabularyProvenanceIntegrity()
// proves the registry and the tables never drift apart.
// ---------------------------------------------------------------------------

export interface SemanticVocabularyProvenanceEntry {
  /** Historical vocabulary the member came from (stable serialized name). */
  readonly historicalVocabulary: string;
  /** The original literal from that vocabulary, recorded verbatim. */
  readonly historicalMember: string;
  /** The single unified category the member converges onto. */
  readonly unifiedCategory: UnifiedContractResultCategory;
}

function provenanceFromTable(
  vocabulary: string,
  table: ReadonlyMap<string, UnifiedContractResultCategory>,
): SemanticVocabularyProvenanceEntry[] {
  const entries: SemanticVocabularyProvenanceEntry[] = [];
  for (const [member, category] of table) {
    entries.push({ historicalVocabulary: vocabulary, historicalMember: member, unifiedCategory: category });
  }
  return entries;
}

export const SEMANTIC_VOCABULARY_PROVENANCE: readonly SemanticVocabularyProvenanceEntry[] = Object.freeze(
  OWNED_TABLES.flatMap(([vocabulary, table]) => provenanceFromTable(vocabulary, table)),
);

/** Fail-closed integrity proof: the provenance registry covers every member
 *  of every owned table exactly once, with exactly the mapped category.
 *  Throws SEMANTIC_VOCABULARY_PROVENANCE_DRIFT:<vocabulary>:<member>. */
export function verifySemanticVocabularyProvenanceIntegrity(): void {
  const expected = OWNED_TABLES.flatMap(([vocabulary, table]) => provenanceFromTable(vocabulary, table));
  if (expected.length !== SEMANTIC_VOCABULARY_PROVENANCE.length) {
    throw new Error(`SEMANTIC_VOCABULARY_PROVENANCE_DRIFT:length:${expected.length}`);
  }
  const seen = new Set<string>();
  for (let i = 0; i < expected.length; i++) {
    const want = expected[i]!;
    const got = SEMANTIC_VOCABULARY_PROVENANCE[i]!;
    const key = `${want.historicalVocabulary}:${want.historicalMember}`;
    if (seen.has(key)) throw new Error(`SEMANTIC_VOCABULARY_PROVENANCE_DRIFT:duplicate:${key}`);
    seen.add(key);
    if (
      got.historicalVocabulary !== want.historicalVocabulary ||
      got.historicalMember !== want.historicalMember ||
      got.unifiedCategory !== want.unifiedCategory
    ) {
      throw new Error(`SEMANTIC_VOCABULARY_PROVENANCE_DRIFT:${want.historicalVocabulary}:${want.historicalMember}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Strict serialized-DTO parsing for persisted UnifiedContractResult values.
//
// Existing persisted DTOs keep parsing: every value the historical adapters
// and the aggregate ever emitted re-validates against the authoritative
// tables. Unknown categories/versions fail closed; a known sourceVocabulary
// with a sourceValue outside its table fails closed; unknown vocabulary
// names stay opaque (structurally validated only) so forward extensions are
// not silently accepted as known results.
// ---------------------------------------------------------------------------

/** The seven historical vocabulary names emitted by
 *  contractResultVocabulary.ts plus its aggregate discriminator. */
const HISTORICAL_VOCABULARY_NAMES: ReadonlySet<string> = new Set([
  'analyzer-status',
  'real-source-resolution',
  'expectation-admission',
  'derivation-failure',
  'collection-admission-failure',
  'contract-drift-class',
  'coverage-disposition',
]);

const UNIFIED_AGGREGATE_VOCABULARY = 'unified-aggregate';

/** True when `name` is a vocabulary whose membership this module can
 *  mechanically re-verify (the eight owned tables, the seven historical
 *  adapter vocabularies, or the aggregate discriminator). */
export function isKnownContractResultVocabularyName(name: string): boolean {
  return OWNED_TABLES.some(([vocabulary]) => vocabulary === name) ||
    HISTORICAL_VOCABULARY_NAMES.has(name) ||
    name === UNIFIED_AGGREGATE_VOCABULARY;
}

/** Re-derive the category a known vocabulary's sourceValue must map to.
 *  Throws the underlying fail-closed code when the value is not a member. */
function rederivedCategoryFor(vocabulary: string, sourceValue: string, detail: string | undefined): UnifiedContractResultCategory {
  const owned = OWNED_TABLES.find(([name]) => name === vocabulary);
  if (owned !== undefined) return categoryFor(owned[1], vocabulary, sourceValue);
  switch (vocabulary) {
    case 'analyzer-status':
      return unifiedFromAnalyzerStatus(sourceValue as AnalyzerStatus, { blockerCode: detail ?? null }).category;
    case 'real-source-resolution':
      return unifiedFromRealSourceResolution({ kind: sourceValue } as unknown as RealSourceResolution).category;
    case 'expectation-admission':
      return unifiedFromExpectationAdmissionResult(sourceValue as ExpectationAdmissionResult).category;
    case 'derivation-failure':
      return unifiedFromDerivationFailure(sourceValue as RealSourceDerivationFailure).category;
    case 'collection-admission-failure':
      return unifiedFromCollectionAdmissionFailure(sourceValue as RealSourceCollectionAdmissionFailure).category;
    case 'contract-drift-class':
      return unifiedFromDriftClass(sourceValue as ContractDriftClass).category;
    case 'coverage-disposition':
      return unifiedFromCoverageDisposition(sourceValue as CoverageDisposition).category;
    case UNIFIED_AGGREGATE_VOCABULARY:
      return categoryFor(tableOf(Object.fromEntries(UNIFIED_CONTRACT_RESULT_CATEGORIES.map((c) => [c, c]))), vocabulary, sourceValue);
    default:
      throw new Error(`SEMANTIC_VOCABULARY_DTO_INVALID:unknown-vocabulary:${vocabulary}`);
  }
}

const ALLOWED_DTO_KEYS: ReadonlySet<string> = new Set([
  'resultVersion',
  'category',
  'sourceVocabulary',
  'sourceValue',
  'targetId',
  'detail',
]);

/** Strict structural + membership validation of a persisted
 *  UnifiedContractResult. Throws SEMANTIC_VOCABULARY_DTO_INVALID:<detail>
 *  (or the underlying UNIFIED_RESULT_* / SEMANTIC_VOCABULARY_* code when a
 *  known vocabulary rejects its sourceValue). */
export function validateUnifiedContractResultDto(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:not-object');
  }
  const dto = value as Record<string, unknown>;
  for (const key of Object.keys(dto)) {
    if (!ALLOWED_DTO_KEYS.has(key)) throw new Error(`SEMANTIC_VOCABULARY_DTO_INVALID:unknown-field:${key}`);
  }
  if (dto.resultVersion !== CONTRACT_RESULT_VOCABULARY_VERSION) {
    throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:resultVersion');
  }
  if (
    typeof dto.category !== 'string' ||
    !(UNIFIED_CONTRACT_RESULT_CATEGORIES as readonly string[]).includes(dto.category)
  ) {
    throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:category');
  }
  assertCategoricalString(dto.sourceVocabulary, 'sourceVocabulary');
  assertCategoricalString(dto.sourceValue, 'sourceValue');
  if (dto.targetId !== undefined) assertCategoricalString(dto.targetId, 'targetId');
  if (dto.detail !== undefined) {
    if (typeof dto.detail !== 'string' || dto.detail.length > MAX_CODE_LENGTH) {
      throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:detail');
    }
    if (containsAnySentinel(dto.detail)) throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:detail-sentinel');
  }
  if (isKnownContractResultVocabularyName(dto.sourceVocabulary)) {
    const rederived = rederivedCategoryFor(dto.sourceVocabulary, dto.sourceValue, dto.detail);
    if (rederived !== dto.category) throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:category-mismatch');
  }
}

/** Parse a persisted UnifiedContractResult from JSON with strict validation.
 *  Round-trips every historically produced payload; rejects everything else
 *  fail-closed. */
export function parseUnifiedContractResultDto(text: string): UnifiedContractResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('SEMANTIC_VOCABULARY_DTO_INVALID:not-json');
  }
  validateUnifiedContractResultDto(parsed);
  return parsed as UnifiedContractResult;
}
