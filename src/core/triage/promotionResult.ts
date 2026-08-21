// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 2 (Workstream E) — unified semantic-aware
// promotion result DTO. One converged verdict per promoted cluster,
// unifying the parallel shapes previously scattered across clustering,
// replay evidence, minimization, confidence, dossier readiness, and
// source currentness.
//
// Safe categorical/control fields only; no raw customer values. Pure: no
// browser/network/fs/child-process/DB/AI/selfDev authority, no clock, no
// randomness. Deterministic output for identical inputs.
// ---------------------------------------------------------------------------

import type { SemanticTriageSourceCurrentness } from './semanticTriageEvidence';
import type { CampaignSemanticCurrentness } from '../campaign/campaignSemanticEvidence';
import type { SourceFreshness } from './types';

export const PROMOTION_RESULT_VERSION = 'nightwatch.promotion-result.private.v1' as const;

export type PromotionClusterKind = 'PROTOCOL' | 'SEMANTIC';

export type PromotionReplayEvidenceClass =
  | 'EXACT_REPLAY_REPRODUCED'
  | 'EXACT_REPLAY_NOT_REPRODUCED'
  | 'EXACT_REPLAY_INVALID'
  | 'REDUCED_REPLAY_SUPPORTED'
  | 'REDUCED_REPLAY_PRECONDITION_DIVERGENCE'
  | 'REPLAY_EVIDENCE_ABSENT';

export type PromotionMinimizationClass =
  | 'MINIMALITY_PROVEN'
  | 'MINIMALITY_NOT_PROVEN'
  | 'NO_REDUCIBLE_CANDIDATE'
  | 'REDUCTION_PRECONDITION_UNAVAILABLE'
  | 'MINIMIZATION_SKIPPED';

export type PromotionConfidenceClass = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export type PromotionReadinessVerdict = 'READY' | 'UNRESOLVED' | 'NOT_ELIGIBLE';

/**
 * Unified source-currentness vocabulary bridging the four divergent
 * currentness vocabularies in the repository (semantic triage evidence,
 * campaign semantic evidence, triage SourceFreshness, and this DTO).
 */
export type PromotionSourceCurrentness =
  | 'CURRENT'
  | 'LOCAL_TRACKING_ONLY'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export type PromotionDossierVersionTarget = 'nightwatch.bug-dossier.private.v1' | 'nightwatch.bug-dossier.private.v2';

export interface SemanticAwarePromotionResult {
  readonly promotionResultVersion: typeof PROMOTION_RESULT_VERSION;
  readonly clusterId: string;
  readonly clusterKind: PromotionClusterKind;
  readonly candidateId: string | null;
  readonly replayEvidence: PromotionReplayEvidenceClass;
  readonly minimization: PromotionMinimizationClass;
  readonly confidence: PromotionConfidenceClass;
  readonly confidenceBlockers: readonly string[];
  readonly readiness: PromotionReadinessVerdict;
  readonly readinessReasonCodes: readonly string[];
  readonly sourceCurrentness: PromotionSourceCurrentness;
  readonly dossierVersionTarget: PromotionDossierVersionTarget;
  readonly safeReasonCodes: readonly string[];
}

export interface SemanticAwarePromotionResultInput {
  readonly clusterId: string;
  readonly clusterKind: PromotionClusterKind;
  readonly candidateId?: string | null;
  /** Raw replay outcome pair; provide both fields or neither. */
  readonly replayStatus?: 'FAILURE' | 'PASS' | 'INVALID';
  readonly replayPhase?: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';
  readonly minimization: PromotionMinimizationClass;
  readonly confidence: PromotionConfidenceClass;
  readonly confidenceBlockers?: readonly string[];
  readonly readiness: PromotionReadinessVerdict;
  readonly readinessReasonCodes?: readonly string[];
  readonly sourceCurrentness: PromotionSourceCurrentness;
  readonly dossierVersionTarget: PromotionDossierVersionTarget;
  readonly safeReasonCodes?: readonly string[];
}

const SAFE_ID_RE = /^[A-Za-z0-9._:/-]{1,200}$/;
const REASON_TOKEN_RE = /^[A-Z][A-Z0-9_]*$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'promotionResultVersion',
  'clusterId',
  'clusterKind',
  'candidateId',
  'replayEvidence',
  'minimization',
  'confidence',
  'confidenceBlockers',
  'readiness',
  'readinessReasonCodes',
  'sourceCurrentness',
  'dossierVersionTarget',
  'safeReasonCodes',
]);

const VALID_CLUSTER_KINDS: ReadonlySet<string> = new Set(['PROTOCOL', 'SEMANTIC']);
const VALID_REPLAY_CLASSES: ReadonlySet<string> = new Set([
  'EXACT_REPLAY_REPRODUCED',
  'EXACT_REPLAY_NOT_REPRODUCED',
  'EXACT_REPLAY_INVALID',
  'REDUCED_REPLAY_SUPPORTED',
  'REDUCED_REPLAY_PRECONDITION_DIVERGENCE',
  'REPLAY_EVIDENCE_ABSENT',
]);
const VALID_MINIMIZATION_CLASSES: ReadonlySet<string> = new Set([
  'MINIMALITY_PROVEN',
  'MINIMALITY_NOT_PROVEN',
  'NO_REDUCIBLE_CANDIDATE',
  'REDUCTION_PRECONDITION_UNAVAILABLE',
  'MINIMIZATION_SKIPPED',
]);
const VALID_CONFIDENCE_CLASSES: ReadonlySet<string> = new Set(['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED']);
const VALID_READINESS_VERDICTS: ReadonlySet<string> = new Set(['READY', 'UNRESOLVED', 'NOT_ELIGIBLE']);
const VALID_CURRENTNESS: ReadonlySet<string> = new Set(['CURRENT', 'LOCAL_TRACKING_ONLY', 'STALE', 'UNAVAILABLE', 'UNKNOWN']);
const VALID_DOSSIER_TARGETS: ReadonlySet<string> = new Set(['nightwatch.bug-dossier.private.v1', 'nightwatch.bug-dossier.private.v2']);

// Currentness values that by themselves block HIGH-confidence READY promotion.
// CURRENT and LOCAL_TRACKING_ONLY do not block here; LOCAL_TRACKING_ONLY
// still blocks via bundle-coherence checks performed by the caller (a
// locally-tracked ref alone is not proof that the remote source is fresh).
const CURRENTNESS_BLOCKING_HIGH_READINESS: ReadonlySet<string> = new Set(['STALE', 'UNAVAILABLE', 'UNKNOWN']);

function assertNoSentinels(value: unknown, path = 'promotionResult'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`PROMOTION_RESULT_PRIVACY_BLOCKED:${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSentinels(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${path}.${key}`);
  }
}

// --- Currentness bridges -----------------------------------------------------

export function currentnessFromSemanticTriage(value: SemanticTriageSourceCurrentness): PromotionSourceCurrentness {
  switch (value) {
    case 'CURRENT': return 'CURRENT';
    case 'LOCAL_TRACKING_ONLY': return 'LOCAL_TRACKING_ONLY';
    case 'STALE': return 'STALE';
    case 'UNAVAILABLE': return 'UNAVAILABLE';
    case 'UNKNOWN': return 'UNKNOWN';
  }
}

export function currentnessFromCampaignSemantic(value: CampaignSemanticCurrentness): PromotionSourceCurrentness {
  switch (value) {
    case 'CURRENT': return 'CURRENT';
    case 'LOCAL_TRACKING_ONLY': return 'LOCAL_TRACKING_ONLY';
    case 'STALE': return 'STALE';
    case 'UNAVAILABLE': return 'UNAVAILABLE';
    case 'UNKNOWN': return 'UNKNOWN';
  }
}

export function currentnessFromSourceFreshness(value: SourceFreshness): PromotionSourceCurrentness {
  switch (value) {
    case 'SOURCE_CURRENT_LOCALLY': return 'CURRENT';
    case 'LOCAL_TRACKING_REF_ONLY': return 'LOCAL_TRACKING_ONLY';
    case 'REMOTE_FRESHNESS_CONFIRMED': return 'CURRENT';
    case 'UNKNOWN': return 'UNKNOWN';
  }
}

export function currentnessBlocksHighReadiness(c: PromotionSourceCurrentness): boolean {
  return CURRENTNESS_BLOCKING_HIGH_READINESS.has(c);
}

// --- Derivation helpers ------------------------------------------------------

/**
 * Maps a raw replay outcome pair onto the unified replay evidence class.
 * Fresh exact replays map 1:1; a reduced-candidate replay supports minimality
 * only when it passes — any non-passing reduced outcome (failure or invalid
 * evaluation) is classified as precondition divergence, because the reduced
 * sequence is then no longer provably reproducing under its recorded
 * preconditions.
 */
export function promotionReplayEvidenceFromOutcome(
  status: 'FAILURE' | 'PASS' | 'INVALID',
  phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE',
): PromotionReplayEvidenceClass {
  if (phase === 'FRESH_EXACT_REPLAY') {
    if (status === 'PASS') return 'EXACT_REPLAY_REPRODUCED';
    if (status === 'FAILURE') return 'EXACT_REPLAY_NOT_REPRODUCED';
    return 'EXACT_REPLAY_INVALID';
  }
  if (status === 'PASS') return 'REDUCED_REPLAY_SUPPORTED';
  return 'REDUCED_REPLAY_PRECONDITION_DIVERGENCE';
}

export function dossierTargetForClusterKind(kind: PromotionClusterKind): PromotionDossierVersionTarget {
  return kind === 'SEMANTIC' ? 'nightwatch.bug-dossier.private.v2' : 'nightwatch.bug-dossier.private.v1';
}

// --- Authority invariant -----------------------------------------------------

/**
 * Authority invariant used by callers so STALE/UNAVAILABLE/UNKNOWN currentness,
 * unresolved confidence, and non-READY verdicts can never become an eligible
 * HIGH/READY promotion.
 */
export function semanticPromotionEligible(result: SemanticAwarePromotionResult): boolean {
  if (currentnessBlocksHighReadiness(result.sourceCurrentness)) return false;
  if (result.readiness !== 'READY') return false;
  if (result.confidence === 'UNRESOLVED') return false;
  return true;
}

// --- Builder -----------------------------------------------------------------

function normalizeCodeArray(codes: readonly string[] | undefined): readonly string[] {
  const seen = new Set<string>();
  for (const code of codes ?? []) {
    if (typeof code !== 'string' || !REASON_TOKEN_RE.test(code)) throw new Error(`PROMOTION_RESULT_REASON_TOKEN_INVALID:${String(code)}`);
    seen.add(code);
  }
  return [...seen].sort();
}

export function buildSemanticAwarePromotionResult(input: SemanticAwarePromotionResultInput): SemanticAwarePromotionResult {
  if ((input.replayStatus === undefined) !== (input.replayPhase === undefined)) {
    throw new Error('PROMOTION_RESULT_REPLAY_INPUT_PARTIAL');
  }
  const replayEvidence = input.replayStatus !== undefined && input.replayPhase !== undefined
    ? promotionReplayEvidenceFromOutcome(input.replayStatus, input.replayPhase)
    : 'REPLAY_EVIDENCE_ABSENT';
  const result: SemanticAwarePromotionResult = {
    promotionResultVersion: PROMOTION_RESULT_VERSION,
    clusterId: input.clusterId,
    clusterKind: input.clusterKind,
    candidateId: input.candidateId ?? null,
    replayEvidence,
    minimization: input.minimization,
    confidence: input.confidence,
    confidenceBlockers: normalizeCodeArray(input.confidenceBlockers),
    readiness: input.readiness,
    readinessReasonCodes: normalizeCodeArray(input.readinessReasonCodes),
    sourceCurrentness: input.sourceCurrentness,
    dossierVersionTarget: input.dossierVersionTarget,
    safeReasonCodes: normalizeCodeArray(input.safeReasonCodes),
  };
  validateSemanticAwarePromotionResult(result);
  return result;
}

// --- Validation --------------------------------------------------------------

function validateCodeArray(codes: unknown, field: string): void {
  if (!Array.isArray(codes)) throw new Error(`PROMOTION_RESULT_CODE_ARRAY_INVALID:${field}`);
  const seen = new Set<string>();
  for (const code of codes) {
    if (typeof code !== 'string' || !REASON_TOKEN_RE.test(code)) throw new Error(`PROMOTION_RESULT_CODE_TOKEN_INVALID:${field}:${String(code)}`);
    if (seen.has(code)) throw new Error(`PROMOTION_RESULT_CODE_DUPLICATE:${field}:${code}`);
    seen.add(code);
  }
  const sorted = [...codes].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== codes[i]) throw new Error(`PROMOTION_RESULT_CODE_ARRAY_NOT_SORTED:${field}`);
  }
}

function assertSafeId(value: unknown, field: 'CLUSTER_ID' | 'CANDIDATE_ID'): void {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value) || SENTINEL_RE.test(value)) {
    throw new Error(`PROMOTION_RESULT_${field}_INVALID`);
  }
}

export function validateSemanticAwarePromotionResult(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('PROMOTION_RESULT_NOT_OBJECT');
  const result = value as SemanticAwarePromotionResult;
  if (result.promotionResultVersion !== PROMOTION_RESULT_VERSION) throw new Error('PROMOTION_RESULT_VERSION_INVALID');
  for (const key of Object.keys(result)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`PROMOTION_RESULT_UNKNOWN_FIELD:${key}`);
  }
  assertNoSentinels(result);
  assertSafeId(result.clusterId, 'CLUSTER_ID');
  if (result.candidateId !== null) assertSafeId(result.candidateId, 'CANDIDATE_ID');
  if (!VALID_CLUSTER_KINDS.has(result.clusterKind)) throw new Error('PROMOTION_RESULT_CLUSTER_KIND_INVALID');
  if (!VALID_REPLAY_CLASSES.has(result.replayEvidence)) throw new Error('PROMOTION_RESULT_REPLAY_EVIDENCE_INVALID');
  if (!VALID_MINIMIZATION_CLASSES.has(result.minimization)) throw new Error('PROMOTION_RESULT_MINIMIZATION_INVALID');
  if (!VALID_CONFIDENCE_CLASSES.has(result.confidence)) throw new Error('PROMOTION_RESULT_CONFIDENCE_INVALID');
  if (!VALID_READINESS_VERDICTS.has(result.readiness)) throw new Error('PROMOTION_RESULT_READINESS_INVALID');
  if (!VALID_CURRENTNESS.has(result.sourceCurrentness)) throw new Error('PROMOTION_RESULT_CURRENTNESS_INVALID');
  if (!VALID_DOSSIER_TARGETS.has(result.dossierVersionTarget)) throw new Error('PROMOTION_RESULT_DOSSIER_TARGET_INVALID');
  validateCodeArray(result.confidenceBlockers, 'confidenceBlockers');
  validateCodeArray(result.readinessReasonCodes, 'readinessReasonCodes');
  validateCodeArray(result.safeReasonCodes, 'safeReasonCodes');
}

// --- Deterministic canonical JSON -------------------------------------------

export function stablePromotionResultJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'undefined') return 'null';
  if (Array.isArray(value)) return `[${value.map(stablePromotionResultJson).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(String(value));
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stablePromotionResultJson(child)}`)
    .join(',')}}`;
}
