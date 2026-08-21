// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A01) — unified contract lifecycle model.
//
// ONE deterministic, composed lifecycle view over EVERY source-derived
// semantic-contract family in the Phase 15 Session-1 lifecycle registry,
// converging the dimensions that were previously interpreted separately
// across the platform modules:
//
//   contract identity            -> identity (familyId / targetId / expectationId)
//   historical ID compatibility  -> historicalIdCompatibility
//   active/superseded state      -> compatibilityState (+ supersededByFamilyId
//                                   + terminalFamilyId)
//   derivation version           -> derivationVersion, validated against the
//                                   authoritative version constants
//   evidence identity            -> evidenceIdentity (evidence version +
//                                   currentness requirement pairing)
//   collection scope             -> collectionScope
//   currentness state            -> static requirement here; dynamic per-family
//                                   classes collapse through
//                                   composeLifecycleCurrentnessState, which
//                                   REUSES sourceContractResolution's
//                                   evaluateComposedCurrentness (converged,
//                                   not duplicated)
//   admission state              -> admissionAuthority
//
// CONVERGENCE, NOT REPLACEMENT: this module composes contractLifecycleRegistry
// (the authoritative family descriptors), sourceContractResolution (the
// authoritative currentness-class vocabulary) and the admission / collection /
// analyzer version constants. None of them are modified; the public surface
// here is purely additive. Historical Phase 9/10/11/14 semantics are preserved
// exactly: archived historical IDs stay immutable, historical shape/deep
// identities are never re-bound, and no version constant is altered.
// assertHistoricalIdStability encodes those permanent rules mechanically over
// two model snapshots (identity bindings never move; archived families are
// fully frozen; legitimate active->archived retirement transitions stay
// possible without strengthening any old durable ID).
//
// Fail-closed everywhere: unknown kinds/scopes/states/versions/targets,
// broken lineage, duplicate identities, and any historical-ID rebind throw
// Error('LIFECYCLE_MODEL_...' / 'LIFECYCLE_...') — there are no default
// fallbacks.
//
// PURE: no fs, no network, no child processes, no environment access, no
// persistence, no wall-clock or randomness (hardening-guarded). Deterministic
// output order (input order).
// ---------------------------------------------------------------------------

import { MECHANICAL_ANALYZER_VERSION } from '../extract/analyzer';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../collectionAdmission';
import { APPROVED_READ_ONLY_TARGET_IDS } from '../recipes/registry';
import { stableJsonSorted } from '../../../core/identity/canonicalDigest';
import {
  getContractLifecycleRegistry,
  MECHANICAL_ANALYZER_EVIDENCE_VERSION,
  SOURCE_EVIDENCE_DIGEST_VERSION,
} from './contractLifecycleRegistry';
import type {
  CampaignEligibility,
  ContractFamilyDescriptor,
  ContractFamilyKind,
  ContractFamilyScope,
  CurrentnessRequirement,
} from './contractLifecycleRegistry';
import { evaluateComposedCurrentness } from './sourceContractResolution';
import type { FamilyCurrentnessClass } from './sourceContractResolution';

/** Load-bearing unified lifecycle-model version. */
export const CONTRACT_LIFECYCLE_MODEL_VERSION = 'nightwatch.contract-lifecycle-model.v1' as const;

/** How an expectation identity participates in historical compatibility. */
export type HistoricalIdCompatibility =
  | 'ACTIVE_IDENTITY'
  | 'HISTORICAL_IMMUTABLE_ID'
  | 'NO_EXPECTATION_ID';

/** Active/superseded compatibility state within a lineage component. */
export type CompatibilityState = 'ARCHIVED_HISTORICAL' | 'SUPERSEDED' | 'ACTIVE_TERMINAL';

/** Static admission dimension: expectation admission vs probe-only evidence. */
export type AdmissionAuthority = 'EXPECTATION_ADMISSION_REQUIRED' | 'ANALYZER_PROBE_EVIDENCE_ONLY';

/**
 * Composed currentness state over a family's dynamic classes. Extends the
 * FamilyCurrentnessClass vocabulary with the two composed outcomes:
 * MIXED_CURRENTNESS_BLOCKED (fail-closed disagreement) and NOT_EVALUATED
 * (no evaluable class this run).
 */
export type LifecycleCurrentnessState =
  | 'CURRENT'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE'
  | 'MIXED_CURRENTNESS_BLOCKED'
  | 'NOT_EVALUATED';

export interface ContractLifecycleIdentity {
  readonly familyId: string;
  readonly targetId: string;
  /** null exactly for mechanical-probe families. */
  readonly expectationId: string | null;
}

export interface ContractEvidenceIdentity {
  readonly evidenceVersion: string;
  readonly currentnessRequirement: CurrentnessRequirement;
}

/** The single composed lifecycle model for one contract family. */
export interface ContractLifecycleState {
  readonly modelVersion: typeof CONTRACT_LIFECYCLE_MODEL_VERSION;
  readonly identity: ContractLifecycleIdentity;
  readonly kind: ContractFamilyKind;
  readonly collectionScope: ContractFamilyScope;
  readonly derivationVersion: string;
  readonly evidenceIdentity: ContractEvidenceIdentity;
  readonly historicalIdCompatibility: HistoricalIdCompatibility;
  readonly compatibilityState: CompatibilityState;
  /** Immediate successor familyId when SUPERSEDED, else null. */
  readonly supersededByFamilyId: string | null;
  /** Chain-end familyId of this family's lineage component (itself when terminal). */
  readonly terminalFamilyId: string | null;
  readonly admissionAuthority: AdmissionAuthority;
  readonly campaignEligible: CampaignEligibility;
}

// ---------------------------------------------------------------------------
// Closed vocabularies (mirrors of the authoritative unions; kept in lockstep
// with contractLifecycleRegistry's own member tables).
// ---------------------------------------------------------------------------

const KNOWN_KINDS: readonly ContractFamilyKind[] = [
  'HISTORICAL_SHAPE',
  'DEEP_TYPE',
  'COLLECTION',
  'MECHANICAL_PROBE',
  'ARCHIVED_HISTORICAL_SHAPE',
];

const KNOWN_SCOPES: readonly ContractFamilyScope[] = [
  'ROOT_ARRAY_SHAPE',
  'ITEM_FIELD_TYPE',
  'COLLECTION_WIDE',
  'ANALYZER_EVIDENCE',
];

const KNOWN_CURRENTNESS_REQUIREMENTS: readonly CurrentnessRequirement[] = [
  'SNAPSHOT_SHA_EQUALITY',
  'ANALYZER_SOURCE_FRESHNESS',
];

const KNOWN_CAMPAIGN_ELIGIBILITIES: readonly CampaignEligibility[] = [
  'CAMPAIGN_ELIGIBLE',
  'NOT_CAMPAIGN_ELIGIBLE',
];

/** The derivation-version constants the authoritative sources define. */
const KNOWN_DERIVATION_VERSIONS: readonly string[] = [
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
  REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_ANALYZER_VERSION,
];

/** Exact kind -> scope pairing as built by the registry. */
const SCOPE_BY_KIND: Record<ContractFamilyKind, ContractFamilyScope> = {
  HISTORICAL_SHAPE: 'ROOT_ARRAY_SHAPE',
  DEEP_TYPE: 'ITEM_FIELD_TYPE',
  COLLECTION: 'COLLECTION_WIDE',
  MECHANICAL_PROBE: 'ANALYZER_EVIDENCE',
  ARCHIVED_HISTORICAL_SHAPE: 'ROOT_ARRAY_SHAPE',
};

/** Exact kind -> derivation-version pairing as built by the registry. */
const DERIVATION_VERSION_BY_KIND: Record<ContractFamilyKind, string> = {
  HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
  DEEP_TYPE: REAL_SOURCE_DERIVATION_VERSION_V2,
  COLLECTION: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_PROBE: MECHANICAL_ANALYZER_VERSION,
  ARCHIVED_HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
};

const FAMILY_CURRENTNESS_CLASS_MEMBERS: readonly FamilyCurrentnessClass[] = [
  'CURRENT',
  'STALE',
  'UNAVAILABLE',
  'NOT_APPLICABLE',
];

// ---------------------------------------------------------------------------
// Fail-closed descriptor validation (self-contained; error codes owned here).
// ---------------------------------------------------------------------------

function validateDescriptor(family: ContractFamilyDescriptor): void {
  if (typeof family.familyId !== 'string' || family.familyId.length === 0) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:family-id-empty:${String(family.familyId)}`);
  }
  if (!family.familyId.startsWith('lifecycle:')) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:family-id-prefix:${family.familyId}`);
  }
  if (!KNOWN_KINDS.includes(family.kind)) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-kind:${String(family.kind)}`);
  }
  if (!KNOWN_SCOPES.includes(family.scope)) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-scope:${String(family.scope)}`);
  }
  if (family.scope !== SCOPE_BY_KIND[family.kind]) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:scope-kind-mismatch:${family.kind}:${String(family.scope)}`,
    );
  }
  if (!APPROVED_READ_ONLY_TARGET_IDS.includes(family.targetId)) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-target:${family.targetId}`);
  }
  if (family.expectationId !== null && typeof family.expectationId !== 'string') {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:expectation-id-shape:${family.familyId}`);
  }
  if (family.kind === 'MECHANICAL_PROBE' && family.expectationId !== null) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:probe-with-expectation-id:${family.familyId}`);
  }
  if (family.kind !== 'MECHANICAL_PROBE' && family.expectationId === null) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:non-probe-without-expectation-id:${family.familyId}`);
  }
  if (
    typeof family.expectationId === 'string' &&
    !family.expectationId.startsWith(`${family.targetId}.`)
  ) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:expectation-target-mismatch:${family.targetId}:${family.expectationId}`,
    );
  }
  if (!KNOWN_DERIVATION_VERSIONS.includes(family.derivationVersion)) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-derivation-version:${family.derivationVersion}`);
  }
  if (family.derivationVersion !== DERIVATION_VERSION_BY_KIND[family.kind]) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:derivation-version-kind-mismatch:${family.kind}:${family.derivationVersion}`,
    );
  }
  const expectedEvidenceVersion =
    family.kind === 'MECHANICAL_PROBE' ? MECHANICAL_ANALYZER_EVIDENCE_VERSION : SOURCE_EVIDENCE_DIGEST_VERSION;
  if (family.evidenceVersion !== expectedEvidenceVersion) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:evidence-version-mismatch:${family.familyId}`);
  }
  if (!KNOWN_CURRENTNESS_REQUIREMENTS.includes(family.currentnessRequirement)) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-currentness-requirement:${String(family.currentnessRequirement)}`,
    );
  }
  const expectedCurrentnessRequirement =
    family.kind === 'MECHANICAL_PROBE' ? 'ANALYZER_SOURCE_FRESHNESS' : 'SNAPSHOT_SHA_EQUALITY';
  if (family.currentnessRequirement !== expectedCurrentnessRequirement) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:currentness-requirement-mismatch:${family.familyId}`,
    );
  }
  if (!KNOWN_CAMPAIGN_ELIGIBILITIES.includes(family.campaignEligible)) {
    throw new Error(
      `LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-campaign-eligibility:${String(family.campaignEligible)}`,
    );
  }
  for (const linkedField of ['predecessorFamilyId', 'successorFamilyId'] as const) {
    const linked = family[linkedField];
    if (linked !== null && (typeof linked !== 'string' || !linked.startsWith('lifecycle:'))) {
      throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:lineage-id-shape:${family.familyId}:${String(linked)}`);
    }
  }
  if (family.historicalImmutable !== (family.kind === 'ARCHIVED_HISTORICAL_SHAPE')) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_DESCRIPTOR:historical-immutable-coherence:${family.familyId}`);
  }
}

// ---------------------------------------------------------------------------
// Lineage integrity + terminal resolution over a candidate descriptor set.
// ---------------------------------------------------------------------------

function validateLineage(families: readonly ContractFamilyDescriptor[]): void {
  const byFamilyId = new Map<string, ContractFamilyDescriptor>();
  for (const family of families) {
    if (byFamilyId.has(family.familyId)) {
      throw new Error(`LIFECYCLE_MODEL_DUPLICATE_FAMILY_ID:${family.familyId}`);
    }
    byFamilyId.set(family.familyId, family);
  }

  for (const family of families) {
    if (family.predecessorFamilyId !== null && !byFamilyId.has(family.predecessorFamilyId)) {
      throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:dangling-predecessor:${family.familyId}`);
    }
    if (family.successorFamilyId !== null && !byFamilyId.has(family.successorFamilyId)) {
      throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:dangling-successor:${family.familyId}`);
    }
    if (family.predecessorFamilyId !== null) {
      const predecessor = byFamilyId.get(family.predecessorFamilyId);
      if (predecessor !== undefined && predecessor.successorFamilyId !== family.familyId) {
        throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:asymmetric-predecessor:${family.familyId}`);
      }
    }
    if (family.successorFamilyId !== null) {
      const successor = byFamilyId.get(family.successorFamilyId);
      if (successor !== undefined && successor.predecessorFamilyId !== family.familyId) {
        throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:asymmetric-successor:${family.familyId}`);
      }
    }
  }

  // Branching successors can never resolve to one terminal — reject early.
  const successorCounts = new Map<string, number>();
  for (const family of families) {
    if (family.successorFamilyId === null) continue;
    successorCounts.set(family.successorFamilyId, (successorCounts.get(family.successorFamilyId) ?? 0) + 1);
  }
  for (const [familyId, count] of successorCounts) {
    if (count >= 2) {
      throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:ambiguous-successor:${familyId}`);
    }
  }

  // Cycles: bounded successor walk per family.
  for (const family of families) {
    const visited = new Set<string>([family.familyId]);
    let current: ContractFamilyDescriptor | undefined = family;
    while (current !== undefined && current.successorFamilyId !== null) {
      const next = byFamilyId.get(current.successorFamilyId);
      if (next === undefined) break; // dangling already reported above
      if (visited.has(next.familyId)) {
        throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:cycle:${family.familyId}:${next.familyId}`);
      }
      visited.add(next.familyId);
      current = next;
    }
  }
}

function terminalFamilyIdOf(
  family: ContractFamilyDescriptor,
  byFamilyId: ReadonlyMap<string, ContractFamilyDescriptor>,
): string {
  const visited = new Set<string>([family.familyId]);
  let current: ContractFamilyDescriptor | undefined = family;
  while (current !== undefined && current.successorFamilyId !== null) {
    const next = byFamilyId.get(current.successorFamilyId);
    if (next === undefined || visited.has(next.familyId)) {
      throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:unresolvable-terminal:${family.familyId}`);
    }
    visited.add(next.familyId);
    current = next;
  }
  if (current === undefined) {
    throw new Error(`LIFECYCLE_MODEL_INVALID_LINEAGE:unresolvable-terminal:${family.familyId}`);
  }
  return current.familyId;
}

// ---------------------------------------------------------------------------
// Derivation entry points.
// ---------------------------------------------------------------------------

/**
 * Derive the composed lifecycle model for every descriptor in `families`
 * (input order preserved). Fails closed with LIFECYCLE_MODEL_* codes on any
 * unknown kind/state/version/target, duplicate identity, or broken lineage.
 */
export function deriveContractLifecycleStates(
  families: readonly ContractFamilyDescriptor[],
): readonly ContractLifecycleState[] {
  for (const family of families) validateDescriptor(family);
  validateLineage(families);

  const byFamilyId = new Map<string, ContractFamilyDescriptor>();
  for (const family of families) byFamilyId.set(family.familyId, family);

  return families.map((family): ContractLifecycleState => {
    const historicalIdCompatibility: HistoricalIdCompatibility =
      family.kind === 'MECHANICAL_PROBE'
        ? 'NO_EXPECTATION_ID'
        : family.historicalImmutable
          ? 'HISTORICAL_IMMUTABLE_ID'
          : 'ACTIVE_IDENTITY';
    const compatibilityState: CompatibilityState = family.historicalImmutable
      ? 'ARCHIVED_HISTORICAL'
      : family.successorFamilyId !== null
        ? 'SUPERSEDED'
        : 'ACTIVE_TERMINAL';
    return Object.freeze({
      modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
      identity: Object.freeze({
        familyId: family.familyId,
        targetId: family.targetId,
        expectationId: family.expectationId,
      }),
      kind: family.kind,
      collectionScope: family.scope,
      derivationVersion: family.derivationVersion,
      evidenceIdentity: Object.freeze({
        evidenceVersion: family.evidenceVersion,
        currentnessRequirement: family.currentnessRequirement,
      }),
      historicalIdCompatibility,
      compatibilityState,
      supersededByFamilyId: family.successorFamilyId,
      terminalFamilyId: terminalFamilyIdOf(family, byFamilyId),
      admissionAuthority:
        family.kind === 'MECHANICAL_PROBE' ? 'ANALYZER_PROBE_EVIDENCE_ONLY' : 'EXPECTATION_ADMISSION_REQUIRED',
      campaignEligible: family.campaignEligible,
    });
  });
}

let cachedModel: readonly ContractLifecycleState[] | null = null;

/** Composed lifecycle model over the cached registry (deterministic order). */
export function buildContractLifecycleModel(): readonly ContractLifecycleState[] {
  return deriveContractLifecycleStates(getContractLifecycleRegistry());
}

/** Cached, frozen result of buildContractLifecycleModel(). */
export function getContractLifecycleStates(): readonly ContractLifecycleState[] {
  if (cachedModel === null) {
    cachedModel = Object.freeze(buildContractLifecycleModel());
  }
  return cachedModel;
}

/** Look up one composed lifecycle state by its exact familyId, or null. */
export function getContractLifecycleState(familyId: string): ContractLifecycleState | null {
  return getContractLifecycleStates().find((state) => state.identity.familyId === familyId) ?? null;
}

/** All composed lifecycle states bound to one target, in registry order. */
export function listContractLifecycleStatesForTarget(targetId: string): readonly ContractLifecycleState[] {
  return getContractLifecycleStates().filter((state) => state.identity.targetId === targetId);
}

// ---------------------------------------------------------------------------
// Dynamic currentness composition (converged on sourceContractResolution).
// ---------------------------------------------------------------------------

/**
 * Collapse one family's dynamic currentness classes into the single composed
 * LifecycleCurrentnessState. Delegates the agreement decision to the
 * authoritative evaluateComposedCurrentness (no duplicated interpretation):
 * MIXED_CURRENTNESS becomes MIXED_CURRENTNESS_BLOCKED, EMPTY becomes
 * NOT_EVALUATED, and an agreed class passes through verbatim. Unknown class
 * strings fail closed with LIFECYCLE_MODEL_UNKNOWN_CURRENTNESS_CLASS.
 */
export function composeLifecycleCurrentnessState(
  classes: readonly FamilyCurrentnessClass[],
): LifecycleCurrentnessState {
  for (const cls of classes) {
    if (!FAMILY_CURRENTNESS_CLASS_MEMBERS.includes(cls)) {
      throw new Error(`LIFECYCLE_MODEL_UNKNOWN_CURRENTNESS_CLASS:${String(cls)}`);
    }
  }
  const composed = evaluateComposedCurrentness(classes);
  if (!composed.ok) {
    return composed.reason === 'MIXED_CURRENTNESS' ? 'MIXED_CURRENTNESS_BLOCKED' : 'NOT_EVALUATED';
  }
  return composed.agreed;
}

// ---------------------------------------------------------------------------
// Historical-ID stability guard (permanent Phase 9/10 rules, mechanically).
// ---------------------------------------------------------------------------

/**
 * Fail-closed comparison of two lifecycle-model snapshots. Encodes exactly
 * the permanent convergence rules:
 *
 *   - every previously known familyId must persist and keep its exact
 *     targetId+expectationId binding (never re-bind an ID to another target
 *     or drop it silently) -> LIFECYCLE_IDENTITY_REBIND:<familyId>:<detail>;
 *   - a HISTORICAL_IMMUTABLE_ID family must be byte-meaning identical across
 *     snapshots (never silently strengthen or relabel an old durable ID)
 *     -> LIFECYCLE_HISTORICAL_REBIND:<familyId>:immutable-state-changed;
 *   - everything else (new families, active<->superseded transitions, and
 *     the legitimate ACTIVE_IDENTITY -> HISTORICAL_IMMUTABLE_ID retirement
 *     transition) is allowed: additive evolution only.
 *
 * Pure and deterministic; compares canonical stableJsonSorted forms.
 */
export function assertHistoricalIdStability(
  previous: readonly ContractLifecycleState[],
  current: readonly ContractLifecycleState[],
): void {
  const previousById = new Map<string, ContractLifecycleState>();
  for (const state of previous) {
    if (previousById.has(state.identity.familyId)) {
      throw new Error(`LIFECYCLE_MODEL_DUPLICATE_FAMILY_ID:${state.identity.familyId}`);
    }
    previousById.set(state.identity.familyId, state);
  }
  const currentById = new Map<string, ContractLifecycleState>();
  for (const state of current) {
    if (currentById.has(state.identity.familyId)) {
      throw new Error(`LIFECYCLE_MODEL_DUPLICATE_FAMILY_ID:${state.identity.familyId}`);
    }
    currentById.set(state.identity.familyId, state);
  }

  for (const [familyId, before] of previousById) {
    const after = currentById.get(familyId);
    if (after === undefined) {
      throw new Error(`LIFECYCLE_IDENTITY_REBIND:${familyId}:removed`);
    }
    if (
      after.identity.targetId !== before.identity.targetId ||
      after.identity.expectationId !== before.identity.expectationId
    ) {
      throw new Error(`LIFECYCLE_IDENTITY_REBIND:${familyId}:identity-moved`);
    }
    if (
      before.historicalIdCompatibility === 'HISTORICAL_IMMUTABLE_ID' &&
      stableJsonSorted(before) !== stableJsonSorted(after)
    ) {
      throw new Error(`LIFECYCLE_HISTORICAL_REBIND:${familyId}:immutable-state-changed`);
    }
  }
}
