// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1 (WORKSTREAM_B) — stable unified contract-result
// vocabulary + deterministic adapters from the historical phase-specific
// result vocabularies (Phases 9–14) into one categorical DTO.
//
// ADDITIVE ONLY: the historical vocabularies (AnalyzerStatus,
// RealSourceResolution, ExpectationAdmissionResult,
// RealSourceDerivationFailure, RealSourceCollectionAdmissionFailure,
// ContractDriftClass, CoverageDisposition) remain authoritative in their own
// modules and are neither modified nor deprecated here. This module is a pure
// categorical VIEW over them:
//
//   - PURE: no fs, no network, no child process, no env, no crypto, no
//     persistence, no AI/selfDev/campaign authority (hardening-guarded).
//   - DETERMINISTIC + TOTAL: every member of every source union maps to
//     exactly one unified category through a fixed table (compile-time
//     exhaustive Record<Union, Category>); an unknown runtime value fails
//     closed with UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE:<vocabulary>:<value>
//     — there are no default fallbacks.
//   - PRIVACY INVARIANT: a UnifiedContractResult carries categorical
//     vocabulary values only. It NEVER carries raw product/customer values:
//     no response bodies, no identifiers observed at runtime, no bearer
//     tokens, no credentials. `detail` is the only free-ish text surface and
//     it is restricted to sanitized categorical detail; it is mechanically
//     screened with containsAnySentinel and a sentinel trip fails closed with
//     UNIFIED_RESULT_PRIVACY_SENTINEL_REJECTED:<field>.
// ---------------------------------------------------------------------------

import { containsAnySentinel } from '../extract/analyzer';
import type { AnalyzerStatus } from '../extract/analyzer';
import type { RealSourceResolution } from '../resolver';
import type { ExpectationAdmissionResult } from '../types';
import type { RealSourceDerivationFailure } from '../recipes/types';
import type { RealSourceCollectionAdmissionFailure } from '../collectionAdmission';
import type { ContractDriftClass } from '../extract/contractDrift';
import type { CoverageDisposition } from '../coverageInventory';

/** Load-bearing vocabulary version for the unified contract-result DTO. */
export const CONTRACT_RESULT_VOCABULARY_VERSION = 'nightwatch.contract-result-vocabulary.v1' as const;

/** The single stable categorical vocabulary every adapter lands on. */
export type UnifiedContractResultCategory =
  | 'PROVEN'
  | 'AMBIGUOUS'
  | 'UNSUPPORTED'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'PARTIAL'
  | 'NOT_APPLICABLE';

export const UNIFIED_CONTRACT_RESULT_CATEGORIES: readonly UnifiedContractResultCategory[] = [
  'PROVEN',
  'AMBIGUOUS',
  'UNSUPPORTED',
  'STALE',
  'UNAVAILABLE',
  'PARTIAL',
  'NOT_APPLICABLE',
];

export interface UnifiedContractResult {
  readonly resultVersion: typeof CONTRACT_RESULT_VOCABULARY_VERSION;
  readonly category: UnifiedContractResultCategory;
  /** Which historical vocabulary this result was adapted from. */
  readonly sourceVocabulary: string;
  /** The original literal from that vocabulary, recorded verbatim. */
  readonly sourceValue: string;
  readonly targetId?: string;
  /** Sanitized categorical detail only (never raw product/customer values). */
  readonly detail?: string;
}

// ---------------------------------------------------------------------------
// Shared constructor (privacy gate + uniform version stamping).
// ---------------------------------------------------------------------------

/**
 * Single construction path for every UnifiedContractResult. Fails closed when
 * `detail` carries a privacy sentinel. Exported so later waves can build
 * aggregate-adjacent results through the same guarded path.
 */
export function buildUnifiedContractResult(input: {
  readonly category: UnifiedContractResultCategory;
  readonly sourceVocabulary: string;
  readonly sourceValue: string;
  readonly targetId?: string;
  readonly detail?: string;
}): UnifiedContractResult {
  const { category, sourceVocabulary, sourceValue, targetId, detail } = input;
  if (detail !== undefined && containsAnySentinel(detail)) {
    throw new Error('UNIFIED_RESULT_PRIVACY_SENTINEL_REJECTED:detail');
  }
  return {
    resultVersion: CONTRACT_RESULT_VOCABULARY_VERSION,
    category,
    sourceVocabulary,
    sourceValue,
    ...(targetId !== undefined ? { targetId } : {}),
    ...(detail !== undefined ? { detail } : {}),
  };
}

// ---------------------------------------------------------------------------
// Deterministic total mapping tables.
//
// Each table is a compile-time-exhaustive Record<Union, Category>, so adding
// a member to a historical union without a mapping decision breaks the build
// instead of silently falling through. Runtime lookups go through a guarded
// Map get that throws on unknown values (no default fallback).
// ---------------------------------------------------------------------------

function tableOf(members: Record<string, UnifiedContractResultCategory>): ReadonlyMap<string, UnifiedContractResultCategory> {
  return new Map(Object.entries(members));
}

function categoryFor(
  table: ReadonlyMap<string, UnifiedContractResultCategory>,
  sourceVocabulary: string,
  sourceValue: string,
): UnifiedContractResultCategory {
  const mapped = table.get(sourceValue);
  if (mapped === undefined) {
    throw new Error(`UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE:${sourceVocabulary}:${sourceValue}`);
  }
  return mapped;
}

const ANALYZER_STATUS_VOCABULARY = 'analyzer-status';

const ANALYZER_STATUS_CATEGORY: Record<AnalyzerStatus, UnifiedContractResultCategory> = {
  PROVEN: 'PROVEN',
  AMBIGUOUS: 'AMBIGUOUS',
  UNSUPPORTED: 'UNSUPPORTED',
  UNAVAILABLE: 'UNAVAILABLE',
};

const ANALYZER_STATUS_TABLE = tableOf(ANALYZER_STATUS_CATEGORY);

const REAL_SOURCE_RESOLUTION_VOCABULARY = 'real-source-resolution';

const REAL_SOURCE_RESOLUTION_CATEGORY: Record<RealSourceResolution['kind'], UnifiedContractResultCategory> = {
  RESOLVED: 'PROVEN',
  NO_EXPECTATION: 'NOT_APPLICABLE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  SOURCE_STALE: 'STALE',
};

const REAL_SOURCE_RESOLUTION_TABLE = tableOf(REAL_SOURCE_RESOLUTION_CATEGORY);

const EXPECTATION_ADMISSION_VOCABULARY = 'expectation-admission';

const EXPECTATION_ADMISSION_CATEGORY: Record<ExpectationAdmissionResult, UnifiedContractResultCategory> = {
  EXPECTATION_ADMITTED: 'PROVEN',
  EXPECTATION_AMBIGUOUS: 'AMBIGUOUS',
  EXPECTATION_INVALID: 'UNSUPPORTED',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
};

const EXPECTATION_ADMISSION_TABLE = tableOf(EXPECTATION_ADMISSION_CATEGORY);

const DERIVATION_FAILURE_VOCABULARY = 'derivation-failure';

const DERIVATION_FAILURE_CATEGORY: Record<RealSourceDerivationFailure, UnifiedContractResultCategory> = {
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  TYPE_FLOW_AMBIGUOUS: 'AMBIGUOUS',
  SOURCE_PATH_MISSING: 'UNSUPPORTED',
  FUNCTION_NOT_FOUND: 'UNSUPPORTED',
  ACCUMULATOR_NOT_FOUND: 'UNSUPPORTED',
  NO_ROW_LITERAL: 'UNSUPPORTED',
  TOP_LEVEL_NOT_ARRAY: 'UNSUPPORTED',
  ITEM_KEYS_MISMATCH: 'UNSUPPORTED',
  ROUTE_NOT_FOUND: 'UNSUPPORTED',
  ROUTE_BINDING_MISMATCH: 'UNSUPPORTED',
  BUILDER_PUSH_NOT_FOUND: 'UNSUPPORTED',
  EXTRACTION_UNSUPPORTED: 'UNSUPPORTED',
  TYPE_FLOW_CONTRACT_MISMATCH: 'UNSUPPORTED',
  CONTRACT_MISMATCH: 'UNSUPPORTED',
};

const DERIVATION_FAILURE_TABLE = tableOf(DERIVATION_FAILURE_CATEGORY);

const COLLECTION_ADMISSION_FAILURE_VOCABULARY = 'collection-admission-failure';

const COLLECTION_ADMISSION_FAILURE_CATEGORY: Record<RealSourceCollectionAdmissionFailure, UnifiedContractResultCategory> = {
  COLLECTION_ADMISSION_PROOF_MISSING: 'UNSUPPORTED',
  COLLECTION_ADMISSION_UNKNOWN_TARGET: 'NOT_APPLICABLE',
  COLLECTION_ADMISSION_NOT_DERIVED: 'UNAVAILABLE',
  COLLECTION_ADMISSION_TARGET_MISMATCH: 'UNSUPPORTED',
  COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH: 'UNSUPPORTED',
  COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT: 'UNSUPPORTED',
  COLLECTION_ADMISSION_INVALID: 'UNSUPPORTED',
  COLLECTION_ADMISSION_DUPLICATE_ID: 'UNSUPPORTED',
};

const COLLECTION_ADMISSION_FAILURE_TABLE = tableOf(COLLECTION_ADMISSION_FAILURE_CATEGORY);

const CONTRACT_DRIFT_CLASS_VOCABULARY = 'contract-drift-class';

const CONTRACT_DRIFT_CLASS_CATEGORY: Record<ContractDriftClass, UnifiedContractResultCategory> = {
  EVIDENCE_UNCHANGED_SHA_MOVED: 'PROVEN',
  CONTRACT_BECAME_PROVABLE: 'PROVEN',
  EVIDENCE_CHANGED_COMPATIBLE: 'PARTIAL',
  DERIVATION_VERSION_CHANGED: 'PARTIAL',
  CONTRACT_BECAME_AMBIGUOUS: 'AMBIGUOUS',
  EVIDENCE_CHANGED_BREAKING: 'UNSUPPORTED',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NO_APPROVED_TARGET: 'NOT_APPLICABLE',
};

const CONTRACT_DRIFT_CLASS_TABLE = tableOf(CONTRACT_DRIFT_CLASS_CATEGORY);

const COVERAGE_DISPOSITION_VOCABULARY = 'coverage-disposition';

const COVERAGE_DISPOSITION_CATEGORY: Record<CoverageDisposition, UnifiedContractResultCategory> = {
  APPROVED_AND_ADMITTED: 'PROVEN',
  APPROVED_AND_ADMITTED_COLLECTION: 'PROVEN',
  APPROVED_NOT_ADMITTED_AMBIGUOUS: 'AMBIGUOUS',
  APPROVED_NOT_OBSERVABLE: 'UNSUPPORTED',
  APPROVED_NO_MECHANICAL_CONTRACT: 'UNSUPPORTED',
  APPROVED_SOURCE_STALE: 'STALE',
  APPROVED_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPROVED_OUT_OF_SCOPE: 'NOT_APPLICABLE',
};

const COVERAGE_DISPOSITION_TABLE = tableOf(COVERAGE_DISPOSITION_CATEGORY);

// ---------------------------------------------------------------------------
// Adapters (one per historical vocabulary).
// ---------------------------------------------------------------------------

export function unifiedFromAnalyzerStatus(
  status: AnalyzerStatus,
  opts?: { blockerCode?: string | null; targetId?: string },
): UnifiedContractResult {
  const blockerCode = opts?.blockerCode ?? null;
  // Fixed exception: an AMBIGUOUS analysis carrying the bounded
  // PARTIAL_PROOF_ONLY blocker is a PARTIAL result, not a full AMBIGUOUS one.
  // Every other status maps purely by table (the blocker never upgrades or
  // downgrades a non-AMBIGUOUS status).
  const category =
    status === 'AMBIGUOUS' && blockerCode === 'PARTIAL_PROOF_ONLY'
      ? 'PARTIAL'
      : categoryFor(ANALYZER_STATUS_TABLE, ANALYZER_STATUS_VOCABULARY, status);
  return buildUnifiedContractResult({
    category,
    sourceVocabulary: ANALYZER_STATUS_VOCABULARY,
    sourceValue: status,
    targetId: opts?.targetId,
    detail: blockerCode ?? undefined,
  });
}

export function unifiedFromRealSourceResolution(
  resolution: RealSourceResolution,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(REAL_SOURCE_RESOLUTION_TABLE, REAL_SOURCE_RESOLUTION_VOCABULARY, resolution.kind),
    sourceVocabulary: REAL_SOURCE_RESOLUTION_VOCABULARY,
    sourceValue: resolution.kind,
    targetId: opts?.targetId,
  });
}

export function unifiedFromExpectationAdmissionResult(
  result: ExpectationAdmissionResult,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(EXPECTATION_ADMISSION_TABLE, EXPECTATION_ADMISSION_VOCABULARY, result),
    sourceVocabulary: EXPECTATION_ADMISSION_VOCABULARY,
    sourceValue: result,
    targetId: opts?.targetId,
  });
}

export function unifiedFromDerivationFailure(
  failure: RealSourceDerivationFailure,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(DERIVATION_FAILURE_TABLE, DERIVATION_FAILURE_VOCABULARY, failure),
    sourceVocabulary: DERIVATION_FAILURE_VOCABULARY,
    sourceValue: failure,
    targetId: opts?.targetId,
  });
}

export function unifiedFromCollectionAdmissionFailure(
  failure: RealSourceCollectionAdmissionFailure,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(COLLECTION_ADMISSION_FAILURE_TABLE, COLLECTION_ADMISSION_FAILURE_VOCABULARY, failure),
    sourceVocabulary: COLLECTION_ADMISSION_FAILURE_VOCABULARY,
    sourceValue: failure,
    targetId: opts?.targetId,
  });
}

export function unifiedFromDriftClass(
  driftClass: ContractDriftClass,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(CONTRACT_DRIFT_CLASS_TABLE, CONTRACT_DRIFT_CLASS_VOCABULARY, driftClass),
    sourceVocabulary: CONTRACT_DRIFT_CLASS_VOCABULARY,
    sourceValue: driftClass,
    targetId: opts?.targetId,
  });
}

export function unifiedFromCoverageDisposition(
  disposition: CoverageDisposition,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(COVERAGE_DISPOSITION_TABLE, COVERAGE_DISPOSITION_VOCABULARY, disposition),
    sourceVocabulary: COVERAGE_DISPOSITION_VOCABULARY,
    sourceValue: disposition,
    targetId: opts?.targetId,
  });
}

// ---------------------------------------------------------------------------
// Aggregation.
//
// Severity ranking (highest wins): UNAVAILABLE > STALE > UNSUPPORTED >
// AMBIGUOUS > PARTIAL > PROVEN > NOT_APPLICABLE. NOT_APPLICABLE is the floor,
// so "highest severity present" automatically ignores it whenever any other
// category is present; an all-NOT_APPLICABLE input aggregates to
// NOT_APPLICABLE.
// ---------------------------------------------------------------------------

const CATEGORY_SEVERITY: Record<UnifiedContractResultCategory, number> = {
  NOT_APPLICABLE: 0,
  PROVEN: 1,
  PARTIAL: 2,
  AMBIGUOUS: 3,
  UNSUPPORTED: 4,
  STALE: 5,
  UNAVAILABLE: 6,
};

export function aggregateUnifiedContractResults(results: readonly UnifiedContractResult[]): UnifiedContractResult {
  if (results.length === 0) {
    throw new Error('UNIFIED_RESULT_AGGREGATION_EMPTY');
  }
  let winner: UnifiedContractResult = results[0]!;
  for (let i = 1; i < results.length; i++) {
    const candidate = results[i]!;
    if (CATEGORY_SEVERITY[candidate.category] > CATEGORY_SEVERITY[winner.category]) {
      winner = candidate;
    }
  }
  // Common targetId survives ONLY when every input carries one and they are
  // all equal; otherwise the aggregate omits it entirely.
  let commonTargetId: string | undefined = results[0]!.targetId;
  for (let i = 1; i < results.length; i++) {
    const candidateTargetId = results[i]!.targetId;
    if (commonTargetId === undefined || candidateTargetId === undefined || candidateTargetId !== commonTargetId) {
      commonTargetId = undefined;
      break;
    }
  }
  return buildUnifiedContractResult({
    category: winner.category,
    sourceVocabulary: 'unified-aggregate',
    sourceValue: winner.category,
    targetId: commonTargetId,
  });
}
