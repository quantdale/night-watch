// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream A — contract lifecycle registry.
//
// ONE Nightwatch-owned registry enumerating every expectation-family identity
// for the approved read-only targets across their whole lifecycle:
//
//   ARCHIVED_HISTORICAL_SHAPE  (retired Phase 9A.1 v1 shape recipes; immutable)
//   HISTORICAL_SHAPE           (active v1 recipe-derived root-array contracts)
//   DEEP_TYPE                  (Phase 10A v2 recipe-derived item field types)
//   COLLECTION                 (Phase 11A.3 collection-wide transforms)
//   MECHANICAL_PROBE           (Phase 14A mechanical-contract analyzer probes)
//
// Every descriptor is DERIVED from the existing authoritative sources (recipe
// registry, admission versions, collection table, analyzer version, archived
// corpus) — no hand-typed expectation IDs where an import supplies them. The
// archived recipes are imported for IDENTITY metadata only: they become
// historical-immutable descriptors and never active/selectable families.
//
// This module is PURE: no fs, no network, no child processes, no environment
// access, no persistence (hardening guard). Deterministic output order.
// ---------------------------------------------------------------------------

import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../admission';
import {
  REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  REAL_SOURCE_COLLECTION_EXPECTATION_IDS,
} from '../collectionAdmission';
import { MECHANICAL_ANALYZER_VERSION } from '../extract/analyzer';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../recipes/registry';
import { isApprovedSemanticCampaignTarget } from '../../semantic/campaignTargetMapping';
import { ARCHIVED_V1_RECIPES } from '../../../../corpus/phase10/historical/archivedV1Recipes';

/** Registry identity version (load-bearing for later waves). */
export const CONTRACT_LIFECYCLE_REGISTRY_VERSION = 'nightwatch.contract-lifecycle-registry.v1' as const;

/** Evidence identity for recipe-derived families (source-evidence digest). */
export const SOURCE_EVIDENCE_DIGEST_VERSION = 'nightwatch.source-evidence-digest.v1' as const;

/** Evidence identity for mechanical-probe families (analyzer evidence). */
export const MECHANICAL_ANALYZER_EVIDENCE_VERSION = 'nightwatch.mechanical-analyzer-evidence.v1' as const;

export type ContractFamilyKind =
  | 'HISTORICAL_SHAPE'
  | 'DEEP_TYPE'
  | 'COLLECTION'
  | 'MECHANICAL_PROBE'
  | 'ARCHIVED_HISTORICAL_SHAPE';

export type ContractFamilyScope =
  | 'ROOT_ARRAY_SHAPE'
  | 'ITEM_FIELD_TYPE'
  | 'COLLECTION_WIDE'
  | 'ANALYZER_EVIDENCE';

export type CurrentnessRequirement = 'SNAPSHOT_SHA_EQUALITY' | 'ANALYZER_SOURCE_FRESHNESS';

export type CampaignEligibility = 'CAMPAIGN_ELIGIBLE' | 'NOT_CAMPAIGN_ELIGIBLE';

export interface ContractFamilyDescriptor {
  /** 'lifecycle:<expectationId>' for expectation families;
   *  'lifecycle:mechanical-probe:<targetId>' for probe families. */
  familyId: string;
  targetId: string;
  kind: ContractFamilyKind;
  scope: ContractFamilyScope;
  /** null only for MECHANICAL_PROBE. */
  expectationId: string | null;
  derivationVersion: string;
  /** SOURCE_EVIDENCE_DIGEST_VERSION or MECHANICAL_ANALYZER_EVIDENCE_VERSION. */
  evidenceVersion: string;
  currentnessRequirement: CurrentnessRequirement;
  campaignEligible: CampaignEligibility;
  predecessorFamilyId: string | null;
  successorFamilyId: string | null;
  /** true exactly for ARCHIVED_HISTORICAL_SHAPE. */
  historicalImmutable: boolean;
}

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

function campaignEligibilityFor(targetId: string): CampaignEligibility {
  return isApprovedSemanticCampaignTarget(targetId) ? 'CAMPAIGN_ELIGIBLE' : 'NOT_CAMPAIGN_ELIGIBLE';
}

function familyIdForExpectation(expectationId: string): string {
  return `lifecycle:${expectationId}`;
}

function familyIdForProbe(targetId: string): string {
  return `lifecycle:mechanical-probe:${targetId}`;
}

function link(predecessor: ContractFamilyDescriptor, successor: ContractFamilyDescriptor): void {
  predecessor.successorFamilyId = successor.familyId;
  successor.predecessorFamilyId = predecessor.familyId;
}

/**
 * Build the full lifecycle registry from the authoritative sources, apply the
 * fixed lineage rules, validate, and return the deterministic descriptor list.
 * Throws Error('CODE:<detail>') on any invariant violation (fail-closed).
 */
export function buildContractLifecycleRegistry(): readonly ContractFamilyDescriptor[] {
  const families: ContractFamilyDescriptor[] = [];

  // Recipe-derived families (v1 -> HISTORICAL_SHAPE, v2 -> DEEP_TYPE).
  for (const recipe of REAL_SOURCE_EXPECTATION_RECIPES) {
    const isDeep = recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2';
    families.push({
      familyId: familyIdForExpectation(recipe.blueprint.expectationId),
      targetId: recipe.targetId,
      kind: isDeep ? 'DEEP_TYPE' : 'HISTORICAL_SHAPE',
      scope: isDeep ? 'ITEM_FIELD_TYPE' : 'ROOT_ARRAY_SHAPE',
      expectationId: recipe.blueprint.expectationId,
      derivationVersion: isDeep ? REAL_SOURCE_DERIVATION_VERSION_V2 : REAL_SOURCE_DERIVATION_VERSION,
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
      campaignEligible: campaignEligibilityFor(recipe.targetId),
      predecessorFamilyId: null,
      successorFamilyId: null,
      historicalImmutable: false,
    });
  }

  // Collection families (fixed target -> collection-expectation table).
  for (const [targetId, collectionExpectationId] of Object.entries(REAL_SOURCE_COLLECTION_EXPECTATION_IDS)) {
    families.push({
      familyId: familyIdForExpectation(collectionExpectationId),
      targetId,
      kind: 'COLLECTION',
      scope: 'COLLECTION_WIDE',
      expectationId: collectionExpectationId,
      derivationVersion: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
      campaignEligible: campaignEligibilityFor(targetId),
      predecessorFamilyId: null,
      successorFamilyId: null,
      historicalImmutable: false,
    });
  }

  // Mechanical-probe families: exactly one per approved target.
  for (const targetId of APPROVED_READ_ONLY_TARGET_IDS) {
    families.push({
      familyId: familyIdForProbe(targetId),
      targetId,
      kind: 'MECHANICAL_PROBE',
      scope: 'ANALYZER_EVIDENCE',
      expectationId: null,
      derivationVersion: MECHANICAL_ANALYZER_VERSION,
      evidenceVersion: MECHANICAL_ANALYZER_EVIDENCE_VERSION,
      currentnessRequirement: 'ANALYZER_SOURCE_FRESHNESS',
      campaignEligible: campaignEligibilityFor(targetId),
      predecessorFamilyId: null,
      successorFamilyId: null,
      historicalImmutable: false,
    });
  }

  // Archived historical-shape families: identity metadata ONLY — never active,
  // never selectable, permanently immutable.
  for (const archived of ARCHIVED_V1_RECIPES) {
    families.push({
      familyId: familyIdForExpectation(archived.blueprint.expectationId),
      targetId: archived.targetId,
      kind: 'ARCHIVED_HISTORICAL_SHAPE',
      scope: 'ROOT_ARRAY_SHAPE',
      expectationId: archived.blueprint.expectationId,
      derivationVersion: REAL_SOURCE_DERIVATION_VERSION,
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
      campaignEligible: campaignEligibilityFor(archived.targetId),
      predecessorFamilyId: null,
      successorFamilyId: null,
      historicalImmutable: true,
    });
  }

  applyLineage(families);
  validateContractFamilies(families);
  return families;
}

/**
 * Fixed lineage rules, derived mechanically from per-target family presence:
 *   - archived + deep present        -> archived -> deep -> collection
 *   - otherwise shape + collection   -> shape    -> collection
 *   - probe families                 -> never linked
 */
function applyLineage(families: ContractFamilyDescriptor[]): void {
  const activeByTargetKind = new Map<string, ContractFamilyDescriptor>();
  const archivedByTarget = new Map<string, ContractFamilyDescriptor>();
  for (const family of families) {
    if (family.kind === 'MECHANICAL_PROBE') continue;
    if (family.kind === 'ARCHIVED_HISTORICAL_SHAPE') {
      archivedByTarget.set(family.targetId, family);
      continue;
    }
    activeByTargetKind.set(`${family.targetId}\u0000${family.kind}`, family);
  }

  for (const targetId of APPROVED_READ_ONLY_TARGET_IDS) {
    const deep = activeByTargetKind.get(`${targetId}\u0000DEEP_TYPE`) ?? null;
    const shape = activeByTargetKind.get(`${targetId}\u0000HISTORICAL_SHAPE`) ?? null;
    const collection = activeByTargetKind.get(`${targetId}\u0000COLLECTION`) ?? null;
    const archived = archivedByTarget.get(targetId) ?? null;

    if (archived !== null && deep !== null) link(archived, deep);
    if (deep !== null && collection !== null) {
      link(deep, collection);
    } else if (shape !== null && collection !== null) {
      link(shape, collection);
    }
  }
}

/**
 * Pure validator over a candidate descriptor set. Throws Error with EXACT
 * codes:
 *   REGISTRY_DUPLICATE_FAMILY_ID:<familyId>
 *   REGISTRY_DUPLICATE_EXPECTATION_ID:<expectationId>
 *   REGISTRY_TARGET_COLLISION:<targetId>
 *   REGISTRY_AMBIGUOUS_SUCCESSOR_CHAIN:<familyId>
 *   REGISTRY_UNKNOWN_DERIVATION_VERSION:<v>
 *   REGISTRY_UNKNOWN_TARGET:<targetId>
 *   REGISTRY_INVALID_LINEAGE:<detail>
 * plus REGISTRY_INVALID_DESCRIPTOR:<detail> for malformed descriptor fields.
 */
export function validateContractFamilies(families: readonly ContractFamilyDescriptor[]): void {
  // --- descriptor field shapes -------------------------------------------
  for (const family of families) {
    if (!KNOWN_KINDS.includes(family.kind)) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:unknown-kind:${String(family.kind)}`);
    }
    if (!KNOWN_SCOPES.includes(family.scope)) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:unknown-scope:${String(family.scope)}`);
    }
    if (!KNOWN_CURRENTNESS_REQUIREMENTS.includes(family.currentnessRequirement)) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:unknown-currentness:${String(family.currentnessRequirement)}`);
    }
    if (!KNOWN_CAMPAIGN_ELIGIBILITIES.includes(family.campaignEligible)) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:unknown-campaign-eligibility:${String(family.campaignEligible)}`);
    }
    if (family.kind === 'MECHANICAL_PROBE' && family.expectationId !== null) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:probe-with-expectation-id:${family.familyId}`);
    }
    if (family.kind !== 'MECHANICAL_PROBE' && family.expectationId === null) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:non-probe-without-expectation-id:${family.familyId}`);
    }
    if (family.kind === 'ARCHIVED_HISTORICAL_SHAPE' && !family.historicalImmutable) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:archived-not-immutable:${family.familyId}`);
    }
    if (family.kind !== 'ARCHIVED_HISTORICAL_SHAPE' && family.historicalImmutable) {
      throw new Error(`REGISTRY_INVALID_DESCRIPTOR:non-archived-immutable:${family.familyId}`);
    }
  }

  // --- duplicate identities ----------------------------------------------
  const seenFamilyIds = new Set<string>();
  for (const family of families) {
    if (seenFamilyIds.has(family.familyId)) {
      throw new Error(`REGISTRY_DUPLICATE_FAMILY_ID:${family.familyId}`);
    }
    seenFamilyIds.add(family.familyId);
  }
  const seenExpectationIds = new Set<string>();
  for (const family of families) {
    if (family.expectationId === null) continue;
    if (seenExpectationIds.has(family.expectationId)) {
      throw new Error(`REGISTRY_DUPLICATE_EXPECTATION_ID:${family.expectationId}`);
    }
    seenExpectationIds.add(family.expectationId);
  }

  // --- target/kind collisions (archived families exempt) ------------------
  const seenTargetKinds = new Set<string>();
  for (const family of families) {
    if (family.kind === 'ARCHIVED_HISTORICAL_SHAPE') continue;
    const key = `${family.targetId}\u0000${family.kind}`;
    if (seenTargetKinds.has(key)) {
      throw new Error(`REGISTRY_TARGET_COLLISION:${family.targetId}`);
    }
    seenTargetKinds.add(key);
  }

  // --- known derivation versions -----------------------------------------
  for (const family of families) {
    if (!KNOWN_DERIVATION_VERSIONS.includes(family.derivationVersion)) {
      throw new Error(`REGISTRY_UNKNOWN_DERIVATION_VERSION:${family.derivationVersion}`);
    }
  }

  // --- approved targets ----------------------------------------------------
  for (const family of families) {
    if (!APPROVED_READ_ONLY_TARGET_IDS.includes(family.targetId)) {
      throw new Error(`REGISTRY_UNKNOWN_TARGET:${family.targetId}`);
    }
  }

  // --- successor ambiguity -------------------------------------------------
  const successorCounts = new Map<string, number>();
  for (const family of families) {
    if (family.successorFamilyId === null) continue;
    successorCounts.set(family.successorFamilyId, (successorCounts.get(family.successorFamilyId) ?? 0) + 1);
  }
  for (const [familyId, count] of successorCounts) {
    if (count >= 2) {
      throw new Error(`REGISTRY_AMBIGUOUS_SUCCESSOR_CHAIN:${familyId}`);
    }
  }

  // --- lineage integrity ---------------------------------------------------
  const byFamilyId = new Map<string, ContractFamilyDescriptor>();
  for (const family of families) byFamilyId.set(family.familyId, family);

  for (const family of families) {
    if (family.predecessorFamilyId !== null && !byFamilyId.has(family.predecessorFamilyId)) {
      throw new Error(`REGISTRY_INVALID_LINEAGE:dangling-predecessor:${family.familyId}:${family.predecessorFamilyId}`);
    }
    if (family.successorFamilyId !== null && !byFamilyId.has(family.successorFamilyId)) {
      throw new Error(`REGISTRY_INVALID_LINEAGE:dangling-successor:${family.familyId}:${family.successorFamilyId}`);
    }
    if (family.predecessorFamilyId !== null) {
      const predecessor = byFamilyId.get(family.predecessorFamilyId);
      if (predecessor !== undefined && predecessor.successorFamilyId !== family.familyId) {
        throw new Error(`REGISTRY_INVALID_LINEAGE:asymmetric-predecessor:${family.familyId}:${predecessor.familyId}`);
      }
    }
    if (family.successorFamilyId !== null) {
      const successor = byFamilyId.get(family.successorFamilyId);
      if (successor !== undefined && successor.predecessorFamilyId !== family.familyId) {
        throw new Error(`REGISTRY_INVALID_LINEAGE:asymmetric-successor:${family.familyId}:${successor.familyId}`);
      }
    }
  }

  for (const family of families) {
    const visited = new Set<string>([family.familyId]);
    let current: ContractFamilyDescriptor | undefined = family;
    while (current !== undefined && current.successorFamilyId !== null) {
      const next = byFamilyId.get(current.successorFamilyId);
      if (next === undefined) break; // dangling already reported above
      if (visited.has(next.familyId)) {
        throw new Error(`REGISTRY_INVALID_LINEAGE:cycle:${family.familyId}:${next.familyId}`);
      }
      visited.add(next.familyId);
      current = next;
    }
  }

  // --- expectation/target coherence ---------------------------------------
  for (const family of families) {
    if (family.expectationId === null) continue;
    if (!family.expectationId.startsWith(`${family.targetId}.`)) {
      throw new Error(`REGISTRY_INVALID_LINEAGE:expectation-target-mismatch:${family.familyId}:${family.expectationId}`);
    }
  }
}

let cachedRegistry: readonly ContractFamilyDescriptor[] | null = null;

/** Cached, frozen result of buildContractLifecycleRegistry(). */
export function getContractLifecycleRegistry(): readonly ContractFamilyDescriptor[] {
  if (cachedRegistry === null) {
    cachedRegistry = Object.freeze(buildContractLifecycleRegistry().map((family) => Object.freeze({ ...family })));
  }
  return cachedRegistry;
}

/** Look up one family by its exact familyId, or null. */
export function getContractFamily(familyId: string): ContractFamilyDescriptor | null {
  return getContractLifecycleRegistry().find((family) => family.familyId === familyId) ?? null;
}

/** All families bound to one target (any kind), in registry order. */
export function listContractFamiliesForTarget(targetId: string): readonly ContractFamilyDescriptor[] {
  return getContractLifecycleRegistry().filter((family) => family.targetId === targetId);
}

export type TerminalContractFamilyOutcome =
  | { ok: true; family: ContractFamilyDescriptor }
  | { ok: false; reason: 'UNKNOWN_TARGET' | 'AMBIGUOUS_TARGET_SELECTION' | 'NO_ACTIVE_FAMILY' };

/**
 * Terminal (current-selection) family for an approved target: start from the
 * target's earliest ACTIVE ancestor (active = not ARCHIVED_HISTORICAL_SHAPE)
 * and follow successor links to the chain end.
 *
 * The mechanical-probe family is a standalone singleton component: it is
 * terminal only when the target has NO lineage-linked expectation chain
 * (e.g. billing-groups / billing-groups-legacy). When a linked chain exists,
 * it is the selection component and the probe never participates.
 *
 * UNKNOWN_TARGET when the target is not approved; NO_ACTIVE_FAMILY when the
 * target has no active family; AMBIGUOUS_TARGET_SELECTION when the start or
 * the chain end cannot be determined uniquely (two+ start candidates, two+
 * ends, or a branched component).
 */
export function terminalContractFamilyForTarget(targetId: string): TerminalContractFamilyOutcome {
  if (!APPROVED_READ_ONLY_TARGET_IDS.includes(targetId)) {
    return { ok: false, reason: 'UNKNOWN_TARGET' };
  }
  const active = listContractFamiliesForTarget(targetId).filter(
    (family) => family.kind !== 'ARCHIVED_HISTORICAL_SHAPE',
  );
  if (active.length === 0) {
    return { ok: false, reason: 'NO_ACTIVE_FAMILY' };
  }

  const byFamilyId = new Map<string, ContractFamilyDescriptor>();
  for (const family of getContractLifecycleRegistry()) byFamilyId.set(family.familyId, family);

  const linked = active.filter(
    (family) => family.predecessorFamilyId !== null || family.successorFamilyId !== null,
  );

  let start: ContractFamilyDescriptor;
  if (linked.length > 0) {
    // Chain start: a linked active family whose predecessor is absent or is
    // itself an archived (inactive) family.
    const starts = linked.filter((family) => {
      if (family.predecessorFamilyId === null) return true;
      const predecessor = byFamilyId.get(family.predecessorFamilyId);
      return predecessor !== undefined && predecessor.kind === 'ARCHIVED_HISTORICAL_SHAPE';
    });
    if (starts.length !== 1) {
      return { ok: false, reason: 'AMBIGUOUS_TARGET_SELECTION' };
    }
    const onlyStart = starts[0];
    if (onlyStart === undefined) {
      return { ok: false, reason: 'AMBIGUOUS_TARGET_SELECTION' };
    }
    start = onlyStart;
  } else {
    // No lineage-linked family at all: every active family is a singleton;
    // the terminal is unique only when exactly one exists (the probe).
    if (active.length !== 1) {
      return { ok: false, reason: 'AMBIGUOUS_TARGET_SELECTION' };
    }
    const only = active[0];
    if (only === undefined) {
      return { ok: false, reason: 'NO_ACTIVE_FAMILY' };
    }
    start = only;
  }

  // Follow successors to the chain end (bounded walk; cycles cannot survive
  // build validation but never loop forever here regardless).
  const visited = new Set<string>([start.familyId]);
  let current: ContractFamilyDescriptor = start;
  while (current.successorFamilyId !== null) {
    const next = byFamilyId.get(current.successorFamilyId);
    if (next === undefined || next.kind === 'ARCHIVED_HISTORICAL_SHAPE' || visited.has(next.familyId)) {
      return { ok: false, reason: 'AMBIGUOUS_TARGET_SELECTION' };
    }
    visited.add(next.familyId);
    current = next;
  }
  return { ok: true, family: current };
}
