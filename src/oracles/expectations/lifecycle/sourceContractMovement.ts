// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A03) — composed source-contract MOVEMENT
// classification: resolution x currentness x drift convergence.
//
// ONE pure entry point classifies a (previous, current) observation pair over
// the same contract identity into a semantically meaningful movement class,
// converging the three existing authoritative surfaces (none of which are
// modified):
//
//   resolver currentness        -> STALE / UNAVAILABLE can never pass
//                                  (fail-closed ceiling, Phase 9A.1/10A)
//   normalized evidence         -> identical evidence across a moved SHA is
//                                  SEMANTICALLY_STABLE, never "drifted"
//                                  (Phase 14 EVIDENCE_UNCHANGED_SHA_MOVED)
//   derivation-version identity -> version movement splits even at an
//                                  identical SHA and identical evidence
//                                  (Phase 14 DERIVATION_VERSION_CHANGED)
//
// Fail-closed everywhere:
//   - a STALE or UNAVAILABLE observation on EITHER side caps the whole pair
//     at SOURCE_STALE / SOURCE_UNAVAILABLE — a pair spanning a stale or
//     unavailable interval is never certified stable or current (re-admission
//     authority lives only in fresh derivation, never in this classifier);
//   - malformed snapshot SHAs / evidence digests / unknown currentness values
//     are rejected before any evaluation;
//   - caller-supplied free-text derivation versions are privacy-screened
//     before they may travel into any emitted surface;
//   - composition reuses evaluateComposedCurrentness (the exact agreement
//     engine of resolveSourceContract): disagreeing member currentness stays
//     MIXED_CURRENTNESS_BLOCKED with a STALE overall.
//
// PURE: no fs, no network, no child process, no env, no persistence
// (hardening-guarded). Deterministic output. Raw product/customer values
// never enter any emitted DTO.
// ---------------------------------------------------------------------------

import { containsAnySentinel } from '../extract/analyzer';
import type { ContractAnalysis } from '../extract/analyzer';
import { classifyContractDrift } from '../extract/contractDrift';
import type { ContractDriftClass, ContractDriftClassification } from '../extract/contractDrift';
import {
  buildUnifiedContractResult,
  aggregateUnifiedContractResults,
} from './contractResultVocabulary';
import type { UnifiedContractResult, UnifiedContractResultCategory } from './contractResultVocabulary';
import { evaluateComposedCurrentness } from './sourceContractResolution';
import type { FamilyCurrentnessClass, FamilyResolutionRecord } from './sourceContractResolution';
import { isEvidenceDigest, isSourceSha } from '../../../core/identity/canonicalDigest';

/** Load-bearing composed-movement version. */
export const SOURCE_CONTRACT_MOVEMENT_VERSION = 'nightwatch.source-contract-movement.v1' as const;

/** The single currentness vocabulary shared with composed resolution. */
export type ObservationCurrentness = FamilyCurrentnessClass;

/**
 * One captured observation of a source contract identity: WHERE the source
 * was (sha), WHAT the normalized evidence was (digest), HOW it was derived
 * (version), and the currentness ceiling observed at capture time.
 * All fields are categorical/safe identifiers — never raw source or customer
 * values.
 */
export interface SourceContractObservation {
  readonly targetId: string;
  /** Exact source snapshot SHA at capture (40-hex), or null when the
   *  snapshot was unavailable. */
  readonly sourceSha: string | null;
  /** Normalized evidence digest (ev:sha256:<24>), or null when nothing was
   *  derivable/provable at capture. */
  readonly evidenceDigest: string | null;
  /** Derivation/analyzer version that produced the evidence digest. */
  readonly derivationVersion: string | null;
  /** Currentness ceiling observed at capture time. */
  readonly currentness: ObservationCurrentness;
  /** Optional full analyzer analysis enabling BREAKING vs COMPATIBLE
   *  refinement and PROVABILITY_LOST/GAINED detection (Phase 14 parity). */
  readonly analysis?: ContractAnalysis | null;
}

/** Composed semantic movement vocabulary (the converged view). */
export type SourceContractMovementClass =
  | 'SEMANTICALLY_STABLE'
  | 'EVIDENCE_DRIFTED_COMPATIBLE'
  | 'EVIDENCE_DRIFTED_BREAKING'
  | 'PROVABILITY_LOST'
  | 'PROVABILITY_GAINED'
  | 'DERIVATION_VERSION_MOVED'
  | 'SOURCE_STALE'
  | 'SOURCE_UNAVAILABLE'
  | 'NO_EVALUABLE_CONTRACT';

export interface SourceContractMovementClassification {
  readonly movementVersion: typeof SOURCE_CONTRACT_MOVEMENT_VERSION;
  readonly targetId: string;
  readonly movementClass: SourceContractMovementClass;
  /** Underlying Phase-14 drift classification (full traceability). */
  readonly drift: ContractDriftClassification;
  /** The fail-closed ceiling that governed this pair: the worse of the two
   *  sides' captured currentness. */
  readonly currentnessCeiling: ObservationCurrentness;
  readonly previous: SourceContractObservation;
  readonly current: SourceContractObservation;
}

// ---------------------------------------------------------------------------
// Fixed total mapping tables (compile-time exhaustive; additions to a source
// union without a decision here break the build).
// ---------------------------------------------------------------------------

/** Movement class -> unified category. Severity-aligned with the Phase-14
 *  drift table in contractResultVocabulary. */
const MOVEMENT_CLASS_CATEGORY: Record<SourceContractMovementClass, UnifiedContractResultCategory> = {
  SEMANTICALLY_STABLE: 'PROVEN',
  PROVABILITY_GAINED: 'PROVEN',
  EVIDENCE_DRIFTED_COMPATIBLE: 'PARTIAL',
  DERIVATION_VERSION_MOVED: 'PARTIAL',
  PROVABILITY_LOST: 'AMBIGUOUS',
  EVIDENCE_DRIFTED_BREAKING: 'UNSUPPORTED',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NO_EVALUABLE_CONTRACT: 'NOT_APPLICABLE',
};

/** Unified severity order (mirrors contractResultVocabulary aggregation). */
const MOVEMENT_CLASS_SEVERITY: Record<SourceContractMovementClass, number> = {
  NO_EVALUABLE_CONTRACT: 0,
  SEMANTICALLY_STABLE: 1,
  PROVABILITY_GAINED: 1,
  EVIDENCE_DRIFTED_COMPATIBLE: 2,
  DERIVATION_VERSION_MOVED: 2,
  PROVABILITY_LOST: 3,
  EVIDENCE_DRIFTED_BREAKING: 4,
  SOURCE_STALE: 5,
  SOURCE_UNAVAILABLE: 6,
};

/** Currentness ceiling severity for pair capping. */
const CURRENTNESS_CEILING_SEVERITY: Record<ObservationCurrentness, number> = {
  NOT_APPLICABLE: 0,
  CURRENT: 1,
  STALE: 2,
  UNAVAILABLE: 3,
};

const CURRENTNESS_MEMBERS: readonly ObservationCurrentness[] = [
  'CURRENT',
  'STALE',
  'UNAVAILABLE',
  'NOT_APPLICABLE',
];

/** Total drift-class -> movement-class map (Phase-14 traceability). */
const DRIFT_TO_MOVEMENT: Record<ContractDriftClass, SourceContractMovementClass> = {
  EVIDENCE_UNCHANGED_SHA_MOVED: 'SEMANTICALLY_STABLE',
  EVIDENCE_CHANGED_COMPATIBLE: 'EVIDENCE_DRIFTED_COMPATIBLE',
  EVIDENCE_CHANGED_BREAKING: 'EVIDENCE_DRIFTED_BREAKING',
  CONTRACT_BECAME_AMBIGUOUS: 'PROVABILITY_LOST',
  CONTRACT_BECAME_PROVABLE: 'PROVABILITY_GAINED',
  DERIVATION_VERSION_CHANGED: 'DERIVATION_VERSION_MOVED',
  SOURCE_STALE: 'SOURCE_STALE',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  NO_APPROVED_TARGET: 'NO_EVALUABLE_CONTRACT',
};

// ---------------------------------------------------------------------------
// Fail-closed helpers.
// ---------------------------------------------------------------------------

/** Privacy gate over every free-text surface this module emits or attaches. */
function screenText(field: string, value: string): string {
  if (containsAnySentinel(value)) {
    throw new Error(`MOVEMENT_PRIVACY_SENTINEL_REJECTED:${field}`);
  }
  return value;
}

/** Structural validation of one observation (fail fast, fail closed). */
function validateObservation(side: 'previous' | 'current', observation: SourceContractObservation): SourceContractObservation {
  if (typeof observation.targetId !== 'string' || observation.targetId.length === 0) {
    throw new Error(`MOVEMENT_INVALID_TARGET_ID:${side}`);
  }
  if (observation.sourceSha !== null && !isSourceSha(observation.sourceSha)) {
    throw new Error(`MOVEMENT_INVALID_SOURCE_SHA:${side}`);
  }
  if (observation.evidenceDigest !== null && !isEvidenceDigest(observation.evidenceDigest)) {
    throw new Error(`MOVEMENT_INVALID_EVIDENCE_DIGEST:${side}`);
  }
  if (!CURRENTNESS_MEMBERS.includes(observation.currentness)) {
    throw new Error(`MOVEMENT_UNKNOWN_CURRENTNESS:${String(observation.currentness)}`);
  }
  if (observation.derivationVersion !== null) {
    // Versions travel into emitted detail surfaces downstream; screen them
    // like every other caller-supplied free text.
    screenText(`${side}.derivationVersion`, observation.derivationVersion);
  }
  return observation;
}

/** Drift status contributed by one observation. An attached analysis speaks
 *  for itself (Phase-14 parity); otherwise CURRENT means provable and
 *  NOT_APPLICABLE means nothing was evaluable. STALE/UNAVAILABLE never reach
 *  content classification (the ceiling gates return first). */
function statusFor(observation: SourceContractObservation): string | null {
  if (observation.analysis !== undefined && observation.analysis !== null) {
    return observation.analysis.status;
  }
  return observation.currentness === 'CURRENT' ? 'PROVEN' : null;
}

// ---------------------------------------------------------------------------
// Pair classification entry point.
// ---------------------------------------------------------------------------

/**
 * Classify one (previous, current) observation pair into a semantic movement
 * class. Deterministic and total over valid inputs.
 *
 * Precedence (fail-closed ceiling first, then Phase-14 content semantics):
 *   1. either side UNAVAILABLE -> SOURCE_UNAVAILABLE;
 *   2. either side STALE       -> SOURCE_STALE (even with identical evidence
 *      and an upgraded-looking current side — never becomes current);
 *   3. otherwise the Phase-14 classifier decides on normalized evidence +
 *      derivation-version identity:
 *      identical evidence + same version -> SEMANTICALLY_STABLE (regardless
 *      of SHA movement); version movement wins over stability; changed
 *      evidence splits into BREAKING/COMPATIBLE/BECAME_* classes.
 */
export function classifySourceContractMovement(params: {
  previous: SourceContractObservation;
  current: SourceContractObservation;
}): SourceContractMovementClassification {
  const previous = validateObservation('previous', params.previous);
  const current = validateObservation('current', params.current);
  if (previous.targetId !== current.targetId) {
    throw new Error('MOVEMENT_TARGET_MISMATCH');
  }

  const ceiling =
    CURRENTNESS_CEILING_SEVERITY[previous.currentness] >= CURRENTNESS_CEILING_SEVERITY[current.currentness]
      ? previous.currentness
      : current.currentness;

  const drift = classifyContractDrift({
    targetId: current.targetId,
    prevDigest: previous.evidenceDigest,
    currDigest: current.evidenceDigest,
    prevStatus: statusFor(previous),
    currStatus: statusFor(current),
    prevVersion: previous.derivationVersion,
    currVersion: current.derivationVersion,
    sourceAvailable: ceiling !== 'UNAVAILABLE',
    sourceStale: ceiling === 'STALE',
    prevAnalysis: previous.analysis ?? null,
    currAnalysis: current.analysis ?? null,
  });

  // Total mapping; the ceiling gates above guarantee the mapped class never
  // rises above SOURCE_STALE / SOURCE_UNAVAILABLE when either side is stale
  // or unavailable (classifyContractDrift returns those classes first).
  const movementClass = DRIFT_TO_MOVEMENT[drift.driftClass];

  return {
    movementVersion: SOURCE_CONTRACT_MOVEMENT_VERSION,
    targetId: current.targetId,
    movementClass,
    drift,
    currentnessCeiling: ceiling,
    previous,
    current,
  };
}

// ---------------------------------------------------------------------------
// Composition.
// ---------------------------------------------------------------------------

export interface ComposedSourceContractMovement {
  readonly movementVersion: typeof SOURCE_CONTRACT_MOVEMENT_VERSION;
  readonly kind: 'COMPOSED' | 'MIXED_CURRENTNESS_BLOCKED';
  /** null exactly when kind is MIXED_CURRENTNESS_BLOCKED. */
  readonly movementClass: SourceContractMovementClass | null;
  readonly overall: UnifiedContractResult;
}

/**
 * Compose per-family/per-target movement classifications into one overall
 * movement. Uses the SAME agreement engine as resolveSourceContract
 * (evaluateComposedCurrentness) over the members' currentness ceilings:
 * disagreeing ceilings stay blocked (MIXED_CURRENTNESS_BLOCKED with a STALE
 * overall — never success-looking); an empty or all-NOT_APPLICABLE
 * participation composes to the NO_EVALUABLE_CONTRACT floor; agreeing
 * members compose to their highest-severity movement class.
 */
export function composeSourceContractMovements(
  movements: readonly SourceContractMovementClassification[],
): ComposedSourceContractMovement {
  const agreement = evaluateComposedCurrentness(movements.map((movement) => movement.currentnessCeiling));

  if (!agreement.ok && agreement.reason === 'MIXED_CURRENTNESS') {
    return {
      movementVersion: SOURCE_CONTRACT_MOVEMENT_VERSION,
      kind: 'MIXED_CURRENTNESS_BLOCKED',
      movementClass: null,
      // Mirror resolveSourceContract's mixed guard: forced-STALE overall.
      overall: buildUnifiedContractResult({
        category: 'STALE',
        sourceVocabulary: 'real-source-resolution',
        sourceValue: 'SOURCE_STALE',
      }),
    };
  }

  if (!agreement.ok || movements.length === 0) {
    // EMPTY participation (no members, or every member NOT_APPLICABLE).
    return {
      movementVersion: SOURCE_CONTRACT_MOVEMENT_VERSION,
      kind: 'COMPOSED',
      movementClass: 'NO_EVALUABLE_CONTRACT',
      overall: unifiedFromMovementClass('NO_EVALUABLE_CONTRACT'),
    };
  }

  let winner = movements[0]!;
  for (let i = 1; i < movements.length; i++) {
    const candidate = movements[i]!;
    if (
      MOVEMENT_CLASS_SEVERITY[candidate.movementClass] > MOVEMENT_CLASS_SEVERITY[winner.movementClass]
    ) {
      winner = candidate;
    }
  }

  return {
    movementVersion: SOURCE_CONTRACT_MOVEMENT_VERSION,
    kind: 'COMPOSED',
    movementClass: winner.movementClass,
    overall: aggregateUnifiedContractResults(movements.map((movement) => unifiedFromMovementClass(movement.movementClass))),
  };
}

/** Unified-vocabulary adapter for one movement class (fixed table). */
export function unifiedFromMovementClass(
  movementClass: SourceContractMovementClass,
  opts?: { targetId?: string },
): UnifiedContractResult {
  return buildUnifiedContractResult({
    category: MOVEMENT_CLASS_CATEGORY[movementClass],
    sourceVocabulary: 'source-contract-movement',
    sourceValue: movementClass,
    ...(opts?.targetId !== undefined ? { targetId: opts.targetId } : {}),
  });
}

// ---------------------------------------------------------------------------
// Bridge from composed resolution records.
// ---------------------------------------------------------------------------

/**
 * Build an observation from one FamilyResolutionRecord of
 * resolveSourceContract plus the snapshot SHA that resolution ran against
 * (null when there was no snapshot). Fail-closed on a malformed SHA.
 */
export function observationFromFamilyRecord(params: {
  record: FamilyResolutionRecord;
  sourceSha: string | null;
}): SourceContractObservation {
  const { record, sourceSha } = params;
  if (sourceSha !== null && !isSourceSha(sourceSha)) {
    throw new Error('MOVEMENT_INVALID_SOURCE_SHA:record');
  }
  if (record.evidenceDigest !== null && !isEvidenceDigest(record.evidenceDigest)) {
    throw new Error('MOVEMENT_INVALID_EVIDENCE_DIGEST:record');
  }
  screenText('record.derivationVersion', record.derivationVersion);
  return {
    targetId: record.familyId,
    sourceSha,
    evidenceDigest: record.evidenceDigest,
    derivationVersion: record.derivationVersion,
    currentness: record.currentnessClass,
  };
}
