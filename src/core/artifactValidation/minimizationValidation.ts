// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11 round 2) — strict validator for the durable
// minimization-record artifact: triage/types.MinimizationResult as produced by
// triage/minimizer.minimizeFailure.
//
// COMPOSITION, NOT FORKING:
// - schema/model version and budget policy identity reuse the owning module's
//   constants verbatim (FAILURE_MINIMIZATION_VERSION, the MinimizationBudget
//   policyVersion literal);
// - the order-preservation check composes the EXPORTED
//   triage/replayPlan.isOrderPreservingSubsequence over the result's own
//   action-id sequences;
// - every cross-field rule below is a mechanically derivable implication of
//   minimizeFailure/resultBase/classifyReductionEvidence/confidenceFor —
//   none re-derives minimality or confidence from scratch, and none narrows
//   what the producer can emit.
//
// Identity note: the minimizer exposes NO digest/id builder for results (the
// record carries no digest field), so there is deliberately no identity
// recomposition here.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import { FAILURE_MINIMIZATION_VERSION } from '../triage/types';
import { isOrderPreservingSubsequence } from '../triage/replayPlan';
import {
  assertBoolean,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
} from '../campaign/runtimeValidation';

const RESULT_KEYS = [
  'schemaVersion', 'status', 'originalSequence', 'minimalReproducingSequence',
  'removedActions', 'reproductionCount', 'anomalyFingerprint', 'modelVersion',
  'catalogVersion', 'sourceVersion', 'confidence', 'minimalityGuarantee',
  'reductionEvidenceClass', 'budget', 'replayCount', 'candidateEvaluationCount',
  'candidateEvaluations', 'invalidCandidateCount', 'safetyRejectionCount',
  'freshExactReplay',
] as const;

const STATUSES = ['MINIMIZED', 'UNCHANGED', 'NO_REPRODUCTION', 'BOUNDED_BUDGET_EXHAUSTED', 'INVALID_ORIGINAL'] as const;
const FRESH_OUTCOMES = ['REPRODUCED', 'NOT_REPRODUCED', 'INVALID'] as const;
const GUARANTEES = ['1-MINIMAL', 'BOUNDED_MINIMAL', 'NONE'] as const;
const EVIDENCE_CLASSES = ['MINIMALITY_PROVEN', 'MINIMALITY_NOT_PROVEN', 'NO_REDUCIBLE_CANDIDATE', 'REDUCTION_PRECONDITION_UNAVAILABLE'] as const;
const CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'] as const;
const DISPOSITIONS = ['REPRODUCES', 'DOES_NOT_REPRODUCE', 'INVALID', 'NOT_EVALUATED_BUDGET'] as const;

const BUDGET_POLICY_VERSION = 'nightwatch.minimization-budget.private.v1' as const;

// Same fingerprint idiom as observationClusterValidation.ts (from
// triage/clustering.ts); same generic-version bound as triage/replayPlan.ts.
const FINGERPRINT_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const CONTRACT_IDENTITY_RE = /^sci:sha256:[a-f0-9]{24}$/;
const VERSION_STRING_MAX = 200;
// Action ids are length-bounded like the modules' ACTION_ID_RE, but their
// charset is deliberately NOT enforced here: an INVALID_ORIGINAL result
// persists ids that failed their own guards and were never pattern-checked.
const ACTION_ID_MAX_LENGTH = 120;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_MINIMIZATION_INVALID:${reason}`);
}

/** The found version, only when it is a bounded safe identifier. */
function foundVersion(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(value) ? value : 'UNRECOGNISED';
}

function assertActionIdList(value: unknown, code: string): void {
  const ids = requireRuntimeArray(value, `ARTIFACT_MINIMIZATION_INVALID:${code}`);
  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0 || id.length > ACTION_ID_MAX_LENGTH) invalid(`${code}_ITEM`);
  }
}

/**
 * Strict validation of one persisted MinimizationResult. Throws
 * ARTIFACT_MINIMIZATION_INVALID:* on any violation.
 */
export function validateMinimizationResultArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const result = requireRuntimeRecord(value, 'ARTIFACT_MINIMIZATION_INVALID');
  assertExactKeys(result, RESULT_KEYS, 'ARTIFACT_MINIMIZATION_INVALID', ['minimalReproducingOccurrenceOrdinals']);
  if (result.schemaVersion !== FAILURE_MINIMIZATION_VERSION || result.modelVersion !== FAILURE_MINIMIZATION_VERSION) {
    invalid(`SCHEMA_VERSION_UNSUPPORTED:schema=${foundVersion(result.schemaVersion)}:model=${foundVersion(result.modelVersion)}`);
  }
  if (!(STATUSES as readonly string[]).includes(result.status as string)) invalid('STATUS');
  if (!(FRESH_OUTCOMES as readonly string[]).includes(result.freshExactReplay as string)) invalid('FRESH_EXACT_REPLAY');
  if (!(GUARANTEES as readonly string[]).includes(result.minimalityGuarantee as string)) invalid('MINIMALITY_GUARANTEE');
  if (!(EVIDENCE_CLASSES as readonly string[]).includes(result.reductionEvidenceClass as string)) invalid('REDUCTION_EVIDENCE_CLASS');
  if (!(CONFIDENCES as readonly string[]).includes(result.confidence as string)) invalid('CONFIDENCE');

  assertString(result.anomalyFingerprint, 'ARTIFACT_MINIMIZATION_INVALID:FINGERPRINT');
  if (!FINGERPRINT_RE.test(result.anomalyFingerprint)) invalid('FINGERPRINT_PATTERN');
  for (const key of ['catalogVersion', 'sourceVersion'] as const) {
    assertString(result[key], `ARTIFACT_MINIMIZATION_INVALID:${key.toUpperCase()}`);
    if ((result[key] as string).length === 0 || (result[key] as string).length > VERSION_STRING_MAX) invalid(`${key.toUpperCase()}`);
  }

  // Budget identity + the module's own MINIMIZATION_BUDGET_INVALID rules.
  const budget = requireRuntimeRecord(result.budget, 'ARTIFACT_MINIMIZATION_INVALID:BUDGET');
  assertExactKeys(budget, ['policyVersion', 'maxCandidateEvaluations', 'maxTotalReplays'], 'ARTIFACT_MINIMIZATION_INVALID:BUDGET');
  if (budget.policyVersion !== BUDGET_POLICY_VERSION) invalid('BUDGET_POLICY_VERSION');
  assertNonNegativeInteger(budget.maxCandidateEvaluations, 'ARTIFACT_MINIMIZATION_INVALID:BUDGET_MAX_CANDIDATES');
  assertNonNegativeInteger(budget.maxTotalReplays, 'ARTIFACT_MINIMIZATION_INVALID:BUDGET_MAX_REPLAYS');
  if ((budget.maxTotalReplays as number) < 1) invalid('BUDGET_MAX_REPLAYS_BELOW_ONE');
  if ((budget.maxTotalReplays as number) < (budget.maxCandidateEvaluations as number)) invalid('BUDGET_TOTALS_BELOW_CANDIDATES');

  for (const key of ['originalSequence', 'minimalReproducingSequence', 'removedActions'] as const) {
    assertActionIdList(result[key], key.toUpperCase());
  }

  for (const key of ['reproductionCount', 'replayCount', 'candidateEvaluationCount', 'invalidCandidateCount', 'safetyRejectionCount'] as const) {
    assertNonNegativeInteger(result[key], `ARTIFACT_MINIMIZATION_INVALID:${key.toUpperCase()}`);
  }
  if ((result.reproductionCount as number) > (result.replayCount as number)) invalid('REPRODUCTIONS_EXCEED_REPLAYS');
  if ((result.candidateEvaluationCount as number) > (requireRuntimeArray(result.candidateEvaluations, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATIONS') as readonly unknown[]).length) {
    invalid('EVALUATION_COUNT_EXCEEDS_RECORDS');
  }

  const evaluations = requireRuntimeArray(result.candidateEvaluations, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATIONS');
  if (result.minimalReproducingOccurrenceOrdinals !== undefined) {
    const ordinals = requireRuntimeArray(result.minimalReproducingOccurrenceOrdinals, 'ARTIFACT_MINIMIZATION_INVALID:MINIMAL_OCCURRENCES');
    if (ordinals.length !== (result.minimalReproducingSequence as readonly unknown[]).length) invalid('MINIMAL_OCCURRENCE_COUNT');
    const seen = new Set<number>();
    for (const ordinal of ordinals) {
      if (typeof ordinal !== 'number' || !Number.isInteger(ordinal) || ordinal < 0 || ordinal > 999_999 || seen.has(ordinal)) invalid('MINIMAL_OCCURRENCE_INVALID');
      seen.add(ordinal);
    }
    for (let index = 1; index < ordinals.length; index += 1) if ((ordinals[index - 1] as number) >= (ordinals[index] as number)) invalid('MINIMAL_OCCURRENCE_ORDER');
  }
  for (const item of evaluations) {
    const evaluation = requireRuntimeRecord(item, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION');
    assertExactKeys(evaluation, ['sequence', 'disposition', 'reason', 'fingerprintMatch'], 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION', ['occurrenceOrdinals', 'semanticFindingFingerprint', 'semanticContractIdentity']);
    assertActionIdList(evaluation.sequence, 'EVALUATION_SEQUENCE');
    if (evaluation.occurrenceOrdinals !== undefined) {
      const ordinals = requireRuntimeArray(evaluation.occurrenceOrdinals, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION_OCCURRENCES');
      if (ordinals.length !== (evaluation.sequence as readonly unknown[]).length) invalid('EVALUATION_OCCURRENCE_COUNT');
      const seen = new Set<number>();
      for (const ordinal of ordinals) {
        if (typeof ordinal !== 'number' || !Number.isInteger(ordinal) || ordinal < 0 || ordinal > 999_999 || seen.has(ordinal)) invalid('EVALUATION_OCCURRENCE_INVALID');
        seen.add(ordinal);
      }
      for (let index = 1; index < ordinals.length; index += 1) if ((ordinals[index - 1] as number) >= (ordinals[index] as number)) invalid('EVALUATION_OCCURRENCE_ORDER');
    }
    if (!(DISPOSITIONS as readonly string[]).includes(evaluation.disposition as string)) invalid('EVALUATION_DISPOSITION');
    assertString(evaluation.reason, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION_REASON');
    assertBoolean(evaluation.fingerprintMatch, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION_MATCH');
    if (evaluation.semanticFindingFingerprint !== undefined) {
      assertString(evaluation.semanticFindingFingerprint, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION_SEMANTIC_FINGERPRINT');
      if (!FINGERPRINT_RE.test(evaluation.semanticFindingFingerprint as string)) invalid('EVALUATION_SEMANTIC_FINGERPRINT_PATTERN');
    }
    if (evaluation.semanticContractIdentity !== undefined) {
      assertString(evaluation.semanticContractIdentity, 'ARTIFACT_MINIMIZATION_INVALID:EVALUATION_CONTRACT_IDENTITY');
      if (!CONTRACT_IDENTITY_RE.test(evaluation.semanticContractIdentity as string)) invalid('EVALUATION_CONTRACT_IDENTITY_PATTERN');
    }
  }

  // --- mechanically derivable coherence (see header) ------------------------
  const fresh = result.freshExactReplay as string;
  const status = result.status as string;
  const guarantee = result.minimalityGuarantee as string;
  const evidenceClass = result.reductionEvidenceClass as string;

  // resultBase fills the survivor/removed lists only on a reproduced fresh replay.
  if (fresh !== 'REPRODUCED') {
    if ((result.minimalReproducingSequence as string[]).length > 0 || (result.removedActions as string[]).length > 0) {
      invalid('UNREPRODUCED_WITH_SURVIVOR_SEQUENCE');
    }
    if (guarantee !== 'NONE') invalid('UNREPRODUCED_WITH_GUARANTEE');
    if ((result.confidence as string) !== 'UNRESOLVED') invalid('UNREPRODUCED_WITH_CONFIDENCE');
  } else if ((result.reproductionCount as number) < 1) {
    invalid('REPRODUCED_FRESH_WITHOUT_REPRODUCTION_COUNT');
  }
  if (guarantee === 'NONE' && fresh === 'REPRODUCED') invalid('REPRODUCED_WITHOUT_GUARANTEE');

  // The minimal survivor is an order-preserving subsequence of the original
  // (composed over the exported triage/replayPlan helper). Occurrence-count
  // identity (resultBase/removedActionIds): retained and removed occurrences
  // partition the original exactly — per action id, minimalCount + removedCount
  // === originalCount. Checked only on a reproduced fresh replay, the only
  // case where resultBase fills both lists.
  if (!isOrderPreservingSubsequence(result.originalSequence as string[], result.minimalReproducingSequence as string[])) {
    invalid('SURVIVOR_NOT_SUBSEQUENCE');
  }
  if (fresh === 'REPRODUCED') {
    const countOf = (ids: readonly string[]): Map<string, number> => {
      const counts = new Map<string, number>();
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      return counts;
    };
    const originalCounts = countOf(result.originalSequence as string[]);
    const minimalCounts = countOf(result.minimalReproducingSequence as string[]);
    const removedCounts = countOf(result.removedActions as string[]);
    const allIds = new Set([...originalCounts.keys(), ...minimalCounts.keys(), ...removedCounts.keys()]);
    for (const id of allIds) {
      if (((minimalCounts.get(id) ?? 0) + (removedCounts.get(id) ?? 0)) !== (originalCounts.get(id) ?? 0)) {
        invalid('OCCURRENCE_PARTITION_MISMATCH');
      }
    }
  }

  // Single-site producer implications (minimizeFailure early returns).
  if (status === 'INVALID_ORIGINAL' && fresh !== 'INVALID') invalid('INVALID_ORIGINAL_FRESH_MISMATCH');
  if (status === 'INVALID_ORIGINAL' && evidenceClass !== 'REDUCTION_PRECONDITION_UNAVAILABLE') invalid('INVALID_ORIGINAL_EVIDENCE_MISMATCH');
  if (status === 'NO_REPRODUCTION' && evidenceClass !== 'NO_REDUCIBLE_CANDIDATE') invalid('NO_REPRODUCTION_EVIDENCE_MISMATCH');
  if (fresh === 'INVALID' && status !== 'NO_REPRODUCTION' && status !== 'INVALID_ORIGINAL') invalid('INVALID_FRESH_STATUS_MISMATCH');

  // classifyReductionEvidence: budget exhaustion blocks a proven claim, and a
  // proven claim requires the 1-MINIMAL guarantee.
  if (evidenceClass === 'MINIMALITY_PROVEN' && guarantee !== '1-MINIMAL') invalid('PROVEN_WITHOUT_ONE_DELETION_PROOF');
  if (status === 'BOUNDED_BUDGET_EXHAUSTED' && evidenceClass === 'MINIMALITY_PROVEN') invalid('BUDGET_EXHAUSTED_BUT_PROVEN');
}
