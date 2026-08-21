// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A02, round 2) — triage-side result / reason vocabulary
// convergence.
//
// Round 2 of the semantic result-vocabulary convergence extends the unified
// categorical axis (UnifiedContractResultCategory, contractResultVocabulary.ts)
// onto the three result surfaces Session 1 did not cover:
//
//   - REPLAY RESULTS: the executeReplayPlanV2 outcome vocabulary
//     (CandidateReplayOutcome.status plus the CandidateGuardResult rejection
//     reasons it can carry, replayBinding.ts / triage/types.ts) and the
//     triage-evidence spelling of the same axis (TriageExactReplayStatus).
//   - DOSSIER READINESS: the dossierV2 readiness status surface and the
//     promotion readiness verdict union it feeds, plus the missingEvidence /
//     readiness-reason codes (MISSING_EVIDENCE_VOCABULARY plus the two reason
//     codes only isReadySemanticDossier derives).
//   - TRIAGE REJECTION REASONS: the promotion-result confidence-blocker /
//     rejection token vocabulary re-inlined across semanticConfidence.ts and
//     campaign/orchestrator.ts.
//
// Same invariants as semanticVocabulary.ts:
//   - ADDITIVE ONLY: every historical union stays authoritative in its own
//     module; nothing here rewrites or deprecates a source vocabulary.
//   - TOTAL ADAPTERS: every member maps through a compile-time-exhaustive
//     Record<Union, Category> table; adding a source member without a mapping
//     decision breaks the build instead of silently falling through.
//   - FAIL CLOSED: unknown runtime values never coerce. Adapters throw
//     SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:<vocabulary>:<value>; strict
//     parse-time validators throw SEMANTIC_VOCABULARY_UNKNOWN_VALUE:<vocabular
//     y>:<value>. This matters concretely for replay guard reasons: the
//     historical `validation.reason as CandidateGuardResult['reason']` cast in
//     replayBinding.ts is unsound at runtime (plan-validation reasons such as
//     REPLAY_PLAN_V2_ID_MISMATCH are not union members), so those values fail
//     closed here instead of masquerading as known guard codes.
//   - NEVER-PASS PRESERVED: only reproduction-confirming members land in
//     PROVEN (replay PASS / REPRODUCED / READY). Every gap, blocker, rejection,
//     non-reproduction, and not-evaluated code lands strictly below PROVEN, so
//     absence of evidence can never be promoted to a proven result through
//     this vocabulary.
//   - PROVENANCE REGISTRY: TRIAGE_RESULT_OWNED_TABLES is merged into
//     semanticVocabulary.ts OWNED_TABLES, so every member below automatically
//     receives a SEMANTIC_VOCABULARY_PROVENANCE entry and is re-verified by
//     parseUnifiedContractResultDto on round-trip.
//
// PURE: no fs, no network, no child process, no env, no crypto, no
// persistence, no AI/selfDev/campaign authority (hardening-guarded).
// DETERMINISTIC: identical inputs produce identical outputs, always.
// PRIVACY INVARIANT: categorical vocabulary values only; rejected values are
// echoed only through the bounded safeErrorDetail projection.
// ---------------------------------------------------------------------------

import { safeErrorDetail } from '../../../core/campaign/runtimeValidation';
import type { CandidateGuardResult, CandidateReplayOutcome } from '../../../core/triage/types';
import type { MissingEvidenceCode, TriageExactReplayStatus } from '../../../core/triage/semanticTriageEvidence';
import type { PromotionReadinessVerdict } from '../../../core/triage/promotionResult';
import type { BugDossierV2 } from '../../../core/triage/dossierV2';
import { buildUnifiedContractResult } from './contractResultVocabulary';
import type { UnifiedContractResult, UnifiedContractResultCategory } from './contractResultVocabulary';

// ---------------------------------------------------------------------------
// Guarded total-table machinery (same pattern as contractResultVocabulary /
// semanticVocabulary): compile-time-exhaustive Record tables, runtime lookups
// that throw on unknown values instead of coercing.
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
    throw new Error(`SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:${vocabulary}:${safeErrorDetail(value)}`);
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Axis 1 — REPLAY RESULTS (executeReplayPlanV2 outcome vocabulary).
// ---------------------------------------------------------------------------

/** Canonical replay-status vocabulary (triage/types.ts CandidateReplayOutcome). */
const REPLAY_STATUS_VOCABULARY = 'replay-status';

/**
 * PASS certifies anomaly reproduction: a decisive completed evaluation whose
 * polarity stays verbatim on sourceValue, so it lands in PROVEN exactly like
 * the ANOMALY receipt outcome. FAILURE is equally decisive about the run but
 * evidences the ABSENCE of reproduction, so it lands strictly below PROVEN
 * (PARTIAL): a non-reproducing run must never be promotable to a proven
 * finding through this vocabulary. INVALID evaluations are UNSUPPORTED.
 */
const REPLAY_STATUS_CATEGORY: Record<CandidateReplayOutcome['status'], UnifiedContractResultCategory> = {
  PASS: 'PROVEN',
  FAILURE: 'PARTIAL',
  INVALID: 'UNSUPPORTED',
};

const REPLAY_STATUS_TABLE = tableOf(REPLAY_STATUS_CATEGORY);

/** Guard/policy rejection reasons carried by an INVALID replay outcome
 *  (triage/types.ts CandidateGuardResult). */
export type ReplayGuardReason = NonNullable<CandidateGuardResult['reason']>;

const REPLAY_GUARD_REASON_VOCABULARY = 'replay-guard-reason';

/**
 * Every guard or policy rejection refuses the evaluation before evidence can
 * be certified -> UNSUPPORTED. The one exception is PRECONDITION_DIVERGENCE,
 * where the run diverged from its recorded preconditions and the outcome is
 * genuinely undecidable rather than refused -> AMBIGUOUS.
 */
const REPLAY_GUARD_REASON_CATEGORY: Record<ReplayGuardReason, UnifiedContractResultCategory> = {
  ACTION_NOT_IN_ORIGINAL: 'UNSUPPORTED',
  ACTION_NOT_APPROVED: 'UNSUPPORTED',
  PRECONDITION_DIVERGENCE: 'AMBIGUOUS',
  DEV_GATE_FAILED: 'UNSUPPORTED',
  AUTH_GATE_FAILED: 'UNSUPPORTED',
  OUTBOUND_POLICY_FAILED: 'UNSUPPORTED',
  SEMANTIC_POLICY_FAILED: 'UNSUPPORTED',
  MUTATION_TRIPWIRE: 'UNSUPPORTED',
  UNKNOWN_TRIPWIRE: 'UNSUPPORTED',
  ROUTE_ENVELOPE_FAILED: 'UNSUPPORTED',
  PRIVACY_POLICY_FAILED: 'UNSUPPORTED',
  SAFETY_VECTOR_NONZERO: 'UNSUPPORTED',
};

const REPLAY_GUARD_REASON_TABLE = tableOf(REPLAY_GUARD_REASON_CATEGORY);

/** Triage-evidence spelling of the replay axis
 *  (triage/semanticTriageEvidence.ts TriageExactReplayStatus). */
const TRIAGE_EXACT_REPLAY_STATUS_VOCABULARY = 'triage-exact-replay-status';

/**
 * Same polarity decisions as replay-status, plus NOT_EVALUATED: no evaluation
 * ran at all -> NOT_APPLICABLE (the floor), never PROVEN.
 */
const TRIAGE_EXACT_REPLAY_STATUS_CATEGORY: Record<TriageExactReplayStatus, UnifiedContractResultCategory> = {
  REPRODUCED: 'PROVEN',
  NOT_REPRODUCED: 'PARTIAL',
  INVALID: 'UNSUPPORTED',
  NOT_EVALUATED: 'NOT_APPLICABLE',
};

const TRIAGE_EXACT_REPLAY_STATUS_TABLE = tableOf(TRIAGE_EXACT_REPLAY_STATUS_CATEGORY);

export function unifiedFromReplayStatus(
  status: CandidateReplayOutcome['status'],
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(REPLAY_STATUS_TABLE, REPLAY_STATUS_VOCABULARY, status),
    sourceVocabulary: REPLAY_STATUS_VOCABULARY,
    sourceValue: status,
    targetId: opts?.targetId,
  });
}

export function unifiedFromReplayGuardReason(
  reason: ReplayGuardReason,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(REPLAY_GUARD_REASON_TABLE, REPLAY_GUARD_REASON_VOCABULARY, reason),
    sourceVocabulary: REPLAY_GUARD_REASON_VOCABULARY,
    sourceValue: reason,
    targetId: opts?.targetId,
  });
}

export function unifiedFromTriageExactReplayStatus(
  status: TriageExactReplayStatus,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(TRIAGE_EXACT_REPLAY_STATUS_TABLE, TRIAGE_EXACT_REPLAY_STATUS_VOCABULARY, status),
    sourceVocabulary: TRIAGE_EXACT_REPLAY_STATUS_VOCABULARY,
    sourceValue: status,
    targetId: opts?.targetId,
  });
}

// ---------------------------------------------------------------------------
// Axis 2 — DOSSIER READINESS (dossierV2 verdict + missingEvidence reasons).
// ---------------------------------------------------------------------------

/** Dossier v2 status surface (triage/dossierV2.ts BugDossierV2['status']). */
const DOSSIER_STATUS_VOCABULARY = 'dossier-status';

const DOSSIER_STATUS_CATEGORY: Record<BugDossierV2['status'], UnifiedContractResultCategory> = {
  READY: 'PROVEN',
  UNRESOLVED: 'PARTIAL',
};

const DOSSIER_STATUS_TABLE = tableOf(DOSSIER_STATUS_CATEGORY);

/** Promotion readiness verdict union (triage/promotionResult.ts), which the
 *  dossier status surface feeds into. */
const READINESS_VERDICT_VOCABULARY = 'readiness-verdict';

/**
 * READY is the only member that ever lands in PROVEN. UNRESOLVED means
 * evidence gaps keep the finding unproven -> PARTIAL. NOT_ELIGIBLE means a
 * standing gate (cluster kind, known defect) refuses eligibility outright ->
 * UNSUPPORTED.
 */
const READINESS_VERDICT_CATEGORY: Record<PromotionReadinessVerdict, UnifiedContractResultCategory> = {
  READY: 'PROVEN',
  UNRESOLVED: 'PARTIAL',
  NOT_ELIGIBLE: 'UNSUPPORTED',
};

const READINESS_VERDICT_TABLE = tableOf(READINESS_VERDICT_CATEGORY);

/**
 * Total identity-preserving bridge from the dossier status surface onto the
 * promotion readiness verdict union it historically feeds ('READY' and
 * 'UNRESOLVED' are members verbatim). Compile-time-exhaustive both ways, so
 * either union growing without a bridge decision breaks the build.
 */
const READINESS_VERDICT_FROM_DOSSIER_STATUS: ReadonlyMap<string, PromotionReadinessVerdict> = new Map(
  Object.entries({
    READY: 'READY',
    UNRESOLVED: 'UNRESOLVED',
  } satisfies Record<BugDossierV2['status'], PromotionReadinessVerdict>),
);

export function readinessVerdictFromDossierStatus(status: BugDossierV2['status']): PromotionReadinessVerdict {
  const mapped = READINESS_VERDICT_FROM_DOSSIER_STATUS.get(status);
  if (mapped === undefined) {
    throw new Error(`SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:${DOSSIER_STATUS_VOCABULARY}:${safeErrorDetail(status)}`);
  }
  return mapped;
}

/**
 * Dossier readiness-reason vocabulary: the canonical declarable gaps
 * (MISSING_EVIDENCE_VOCABULARY in semanticTriageEvidence.ts) plus the two
 * derived reason codes ONLY isReadySemanticDossier emits (dossierV2.ts),
 * which are deliberately absent from the declarable vocabulary because they
 * are computed verdicts, not declarable gap codes.
 */
export type DossierReadinessReasonCode =
  | MissingEvidenceCode
  | 'NON_ANOMALY_OUTCOME'
  | 'REPRODUCTION_EVIDENCE_MISSING';

const DOSSIER_READINESS_REASON_VOCABULARY = 'dossier-readiness-reason';

/**
 * Readiness-gap codes describe INCOMPLETE or REFUSED evidence, so none can
 * ever land in PROVEN. Grouping follows the nature of each gap:
 * incomplete proof -> PARTIAL; undecidable recorded state -> AMBIGUOUS;
 * safety/identity refusals -> UNSUPPORTED; unavailable surfaces ->
 * UNAVAILABLE; permanent owner-scope facts and "no finding to assess" ->
 * NOT_APPLICABLE.
 */
const DOSSIER_READINESS_REASON_CATEGORY: Record<DossierReadinessReasonCode, UnifiedContractResultCategory> = {
  // Incomplete-proof gaps.
  EXACT_REPLAY_REQUIRED: 'PARTIAL',
  PARTIAL_COLLECTION_COVERAGE: 'PARTIAL',
  MINIMIZATION_BUDGET_EXHAUSTED: 'PARTIAL',
  REPRODUCTION_EVIDENCE_MISSING: 'PARTIAL',
  // Undecidable recorded states.
  SOURCE_CURRENTNESS_UNRESOLVED: 'AMBIGUOUS',
  SEMANTIC_EXPECTATION_UNRESOLVED: 'AMBIGUOUS',
  SOURCE_CHANGE_RELEVANCE_UNRESOLVED: 'AMBIGUOUS',
  ORACLE_RELIABILITY_UNRESOLVED: 'AMBIGUOUS',
  REPLAY_FINGERPRINT_MISMATCH: 'AMBIGUOUS',
  COVERAGE_STATE_UNRESOLVED: 'AMBIGUOUS',
  // Safety/privacy/identity refusals.
  SAFETY_PRIVACY_NONZERO: 'UNSUPPORTED',
  KNOWN_FALSE_POSITIVE_PRESENT: 'UNSUPPORTED',
  SEMANTIC_IDENTITY_MISSING: 'UNSUPPORTED',
  // Unavailable surfaces.
  BROWSER_API_DIFFERENTIAL_UNAVAILABLE: 'UNAVAILABLE',
  // Permanent owner-scope facts are not closable gaps.
  DEPLOYMENT_STATUS_UNRESOLVED: 'NOT_APPLICABLE',
  DATASTORE_EVIDENCE_OUT_OF_SCOPE_BY_OWNER: 'NOT_APPLICABLE',
  // Derived verdict: the evaluated outcome was not an anomaly, so there is
  // no finding for readiness to assess.
  NON_ANOMALY_OUTCOME: 'NOT_APPLICABLE',
};

const DOSSIER_READINESS_REASON_TABLE = tableOf(DOSSIER_READINESS_REASON_CATEGORY);

export function unifiedFromDossierStatus(
  status: BugDossierV2['status'],
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(DOSSIER_STATUS_TABLE, DOSSIER_STATUS_VOCABULARY, status),
    sourceVocabulary: DOSSIER_STATUS_VOCABULARY,
    sourceValue: status,
    targetId: opts?.targetId,
  });
}

export function unifiedFromReadinessVerdict(
  verdict: PromotionReadinessVerdict,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(READINESS_VERDICT_TABLE, READINESS_VERDICT_VOCABULARY, verdict),
    sourceVocabulary: READINESS_VERDICT_VOCABULARY,
    sourceValue: verdict,
    targetId: opts?.targetId,
  });
}

export function unifiedFromDossierReadinessReason(
  code: DossierReadinessReasonCode,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(DOSSIER_READINESS_REASON_TABLE, DOSSIER_READINESS_REASON_VOCABULARY, code),
    sourceVocabulary: DOSSIER_READINESS_REASON_VOCABULARY,
    sourceValue: code,
    targetId: opts?.targetId,
  });
}

// ---------------------------------------------------------------------------
// Canonical reason-code constants (duplicate-string convergence).
//
// These are the single canonical spellings for reason-code sets that are
// currently re-inlined as raw string literals in foreign modules. This round
// adds the constants WITHOUT editing those modules; their swap sites are
// recorded for the integration pass:
//   - DOSSIER_READINESS_CRITICAL_REASON_CODES mirrors the private
//     READINESS_CRITICAL_CODES set inlined in dossierV2.ts (isReadySemantic-
//     Dossier declared-gap screen).
//   - PROMOTION_REJECTION_REASON_CODES converges the confidence-blocker
//     tokens pushed in semanticConfidence.ts rankSemanticConfidence (+ its
//     DECLARED_MISSING_BLOCKERS value range) and the BUNDLE_COHERENCE_FAILURE
//     demotion code added in campaign/orchestrator.ts.
// ---------------------------------------------------------------------------

/** Sorted canonical dossier readiness-reason roster (17 members). */
export const DOSSIER_READINESS_REASON_CODES: readonly DossierReadinessReasonCode[] = Object.freeze(
  Object.keys(DOSSIER_READINESS_REASON_CATEGORY).sort() as DossierReadinessReasonCode[],
);

/**
 * The readiness-critical subset: a dossier declaring any of these in
 * missingEvidence can never be READY. Membership-equal to the private
 * READINESS_CRITICAL_CODES set inlined in dossierV2.ts; swap site noted above.
 */
export const DOSSIER_READINESS_CRITICAL_REASON_CODES: readonly DossierReadinessReasonCode[] = Object.freeze([
  'EXACT_REPLAY_REQUIRED',
  'SOURCE_CURRENTNESS_UNRESOLVED',
  'SEMANTIC_EXPECTATION_UNRESOLVED',
  'PARTIAL_COLLECTION_COVERAGE',
  'SAFETY_PRIVACY_NONZERO',
  'KNOWN_FALSE_POSITIVE_PRESENT',
  'ORACLE_RELIABILITY_UNRESOLVED',
  'SEMANTIC_IDENTITY_MISSING',
  'REPLAY_FINGERPRINT_MISMATCH',
  'COVERAGE_STATE_UNRESOLVED',
] as DossierReadinessReasonCode[]);

/** Sorted canonical promotion rejection/blocker token roster (19 members). */
export const PROMOTION_REJECTION_REASON_CODES = Object.freeze([
  'BUNDLE_COHERENCE_FAILURE',
  'COVERAGE_STATE_UNRESOLVED',
  'EXACT_REPLAY_NOT_REPRODUCED',
  'EXPECTATION_SOURCE_STALE',
  'EXPECTATION_SOURCE_UNAVAILABLE',
  'INTERNAL_ERROR',
  'INVALID_INPUT',
  'KNOWN_FALSE_POSITIVE',
  'MINIMIZATION_BUDGET_EXHAUSTED',
  'NO_EXPECTATION',
  'NON_ANOMALY_OUTCOME',
  'ORACLE_RELIABILITY_UNRESOLVED',
  'PARTIAL_COVERAGE',
  'PRIVACY_FAILURE',
  'PROJECTION_LIMIT_EXCEEDED',
  'REPLAY_FINGERPRINT_MISMATCH',
  'SAFETY_NONZERO',
  'SEMANTIC_IDENTITY_MISSING',
  'SOURCE_CURRENTNESS_UNRESOLVED',
] as const);

export type PromotionRejectionReasonCode = typeof PROMOTION_REJECTION_REASON_CODES[number];

const PROMOTION_REJECTION_REASON_VOCABULARY = 'promotion-rejection-reason';

/**
 * Blocker/rejection tokens describe why HIGH confidence or READY readiness is
 * withheld, so none can ever land in PROVEN. Members whose names coincide
 * with receipt-outcome members keep that vocabulary's exact mapping; replay-
 * derived blockers follow the replay-status mapping; the rest classify by the
 * same incomplete/undecidable/refused grouping as the dossier axis.
 */
const PROMOTION_REJECTION_REASON_CATEGORY: Record<PromotionRejectionReasonCode, UnifiedContractResultCategory> = {
  // Receipt-outcome-coincident members: exact historical mapping preserved.
  NO_EXPECTATION: 'NOT_APPLICABLE',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  INVALID_INPUT: 'UNSUPPORTED',
  PROJECTION_LIMIT_EXCEEDED: 'PARTIAL',
  INTERNAL_ERROR: 'UNSUPPORTED',
  PARTIAL_COVERAGE: 'PARTIAL',
  // Replay-derived blockers follow the replay-status mapping.
  EXACT_REPLAY_NOT_REPRODUCED: 'PARTIAL',
  NON_ANOMALY_OUTCOME: 'NOT_APPLICABLE',
  REPLAY_FINGERPRINT_MISMATCH: 'AMBIGUOUS',
  MINIMIZATION_BUDGET_EXHAUSTED: 'PARTIAL',
  // Undecidable coherence/currentness states.
  SOURCE_CURRENTNESS_UNRESOLVED: 'AMBIGUOUS',
  COVERAGE_STATE_UNRESOLVED: 'AMBIGUOUS',
  ORACLE_RELIABILITY_UNRESOLVED: 'AMBIGUOUS',
  BUNDLE_COHERENCE_FAILURE: 'AMBIGUOUS',
  // Safety/privacy/identity refusals.
  SAFETY_NONZERO: 'UNSUPPORTED',
  PRIVACY_FAILURE: 'UNSUPPORTED',
  KNOWN_FALSE_POSITIVE: 'UNSUPPORTED',
  SEMANTIC_IDENTITY_MISSING: 'UNSUPPORTED',
};

const PROMOTION_REJECTION_REASON_TABLE = tableOf(PROMOTION_REJECTION_REASON_CATEGORY);

export function unifiedFromPromotionRejectionReason(
  code: PromotionRejectionReasonCode,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: categoryFor(PROMOTION_REJECTION_REASON_TABLE, PROMOTION_REJECTION_REASON_VOCABULARY, code),
    sourceVocabulary: PROMOTION_REJECTION_REASON_VOCABULARY,
    sourceValue: code,
    targetId: opts?.targetId,
  });
}

/**
 * Fail-closed binding proof (same pattern as semanticConfidence.ts
 * verifyDeclaredMissingBlockersBoundToVocabulary): every readiness-critical
 * code must remain a member of the converged dossier readiness-reason table.
 */
export function verifyDossierReadinessCriticalCodesBoundToVocabulary(): void {
  for (const code of DOSSIER_READINESS_CRITICAL_REASON_CODES) {
    if (!DOSSIER_READINESS_REASON_TABLE.has(code)) {
      throw new Error(`SEMANTIC_VOCABULARY_CRITICAL_CODE_UNKNOWN:${code}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Strict parse-time validation. Unknown codes are rejected outright (never
// coerced) so corrupted or forward-incompatible payloads fail closed at the
// boundary.
// ---------------------------------------------------------------------------

function parseFromTable<T>(table: ReadonlyMap<string, UnifiedContractResultCategory>, vocabulary: string, value: string): T {
  if (!table.has(value)) {
    throw new Error(`SEMANTIC_VOCABULARY_UNKNOWN_VALUE:${vocabulary}:${safeErrorDetail(value)}`);
  }
  return value as T;
}

export function parseReplayStatus(value: string): CandidateReplayOutcome['status'] {
  return parseFromTable(REPLAY_STATUS_TABLE, REPLAY_STATUS_VOCABULARY, value);
}

export function parseReplayGuardReason(value: string): ReplayGuardReason {
  return parseFromTable(REPLAY_GUARD_REASON_TABLE, REPLAY_GUARD_REASON_VOCABULARY, value);
}

export function parseTriageExactReplayStatus(value: string): TriageExactReplayStatus {
  return parseFromTable(TRIAGE_EXACT_REPLAY_STATUS_TABLE, TRIAGE_EXACT_REPLAY_STATUS_VOCABULARY, value);
}

export function parseDossierStatus(value: string): BugDossierV2['status'] {
  return parseFromTable(DOSSIER_STATUS_TABLE, DOSSIER_STATUS_VOCABULARY, value);
}

export function parseReadinessVerdict(value: string): PromotionReadinessVerdict {
  return parseFromTable(READINESS_VERDICT_TABLE, READINESS_VERDICT_VOCABULARY, value);
}

export function parseDossierReadinessReason(value: string): DossierReadinessReasonCode {
  return parseFromTable(DOSSIER_READINESS_REASON_TABLE, DOSSIER_READINESS_REASON_VOCABULARY, value);
}

export function parsePromotionRejectionReason(value: string): PromotionRejectionReasonCode {
  return parseFromTable(PROMOTION_REJECTION_REASON_TABLE, PROMOTION_REJECTION_REASON_VOCABULARY, value);
}

// ---------------------------------------------------------------------------
// Registry merge surface. semanticVocabulary.ts folds these pairs into its
// OWNED_TABLES / SEMANTIC_VOCABULARY_NAMES, which mechanically extends
// SEMANTIC_VOCABULARY_PROVENANCE and the strict DTO parser's membership
// re-derivation to every table above.
// ---------------------------------------------------------------------------

export const TRIAGE_RESULT_OWNED_TABLES: readonly (readonly [string, ReadonlyMap<string, UnifiedContractResultCategory>])[] = Object.freeze([
  [REPLAY_STATUS_VOCABULARY, REPLAY_STATUS_TABLE],
  [REPLAY_GUARD_REASON_VOCABULARY, REPLAY_GUARD_REASON_TABLE],
  [TRIAGE_EXACT_REPLAY_STATUS_VOCABULARY, TRIAGE_EXACT_REPLAY_STATUS_TABLE],
  [DOSSIER_STATUS_VOCABULARY, DOSSIER_STATUS_TABLE],
  [READINESS_VERDICT_VOCABULARY, READINESS_VERDICT_TABLE],
  [DOSSIER_READINESS_REASON_VOCABULARY, DOSSIER_READINESS_REASON_TABLE],
  [PROMOTION_REJECTION_REASON_VOCABULARY, PROMOTION_REJECTION_REASON_TABLE],
]);

export const TRIAGE_RESULT_VOCABULARY_NAMES: readonly string[] = Object.freeze(
  TRIAGE_RESULT_OWNED_TABLES.map(([name]) => name),
);
