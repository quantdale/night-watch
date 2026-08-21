// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A01) — unified contract lifecycle model
// (permanent unit proof).
//
// Pins the ONE composed lifecycle model over the Phase 15 Session-1 contract
// lifecycle registry: representative full-dimension derivations, historical-ID
// compatibility classes, active/superseded transitions against registry
// lineage, fail-closed rejection of unknown kinds/states/versions/targets and
// broken lineage, converged currentness composition, the historical-ID
// stability guard (never re-bind / never silently strengthen old durable IDs),
// and byte-level determinism across repeated builds.
//
// Synthetic/local only. No DEV, no real product, no network.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  getContractLifecycleRegistry,
  MECHANICAL_ANALYZER_EVIDENCE_VERSION,
  SOURCE_EVIDENCE_DIGEST_VERSION,
  terminalContractFamilyForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import type {
  CampaignEligibility,
  ContractFamilyDescriptor,
  ContractFamilyKind,
  ContractFamilyScope,
  CurrentnessRequirement,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import {
  assertHistoricalIdStability,
  buildContractLifecycleModel,
  composeLifecycleCurrentnessState,
  CONTRACT_LIFECYCLE_MODEL_VERSION,
  deriveContractLifecycleStates,
  getContractLifecycleState,
  getContractLifecycleStates,
  listContractLifecycleStatesForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleModel';
import type { ContractLifecycleState } from '../../src/oracles/expectations/lifecycle/contractLifecycleModel';
import { evaluateComposedCurrentness } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type { FamilyCurrentnessClass } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import {
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
} from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';

const FID = (expectationId: string): string => `lifecycle:${expectationId}`;

const COMMON = 'ripple.common-exchange.read';
const PAYER = 'ripple.payer-exchange.read';
const ACCOUNT = 'ripple.account-inventory.read';
const BGX = 'ripple.billing-group-exchange.read';
const BGS = 'ripple.billing-groups.read';
const BGS_LEGACY = 'ripple.billing-groups-legacy.read';
const ALL_TARGETS = [COMMON, PAYER, ACCOUNT, BGX, BGS, BGS_LEGACY] as const;

function requireState(familyId: string): ContractLifecycleState {
  const state = getContractLifecycleState(familyId);
  if (state === null) throw new Error(`lifecycle state not found: ${familyId}`);
  return state;
}

/** Fresh mutable deep copy of the built registry for corruption cases. */
function clonedRegistry(): ContractFamilyDescriptor[] {
  return JSON.parse(JSON.stringify(getContractLifecycleRegistry())) as ContractFamilyDescriptor[];
}

function corrupted(
  familyId: string,
  mutate: (family: ContractFamilyDescriptor) => void,
): ContractFamilyDescriptor[] {
  const clone = clonedRegistry();
  const family = clone.find((candidate) => candidate.familyId === familyId);
  if (family === undefined) throw new Error(`family not found in clone: ${familyId}`);
  mutate(family);
  return clone;
}

function expectModelError(families: readonly ContractFamilyDescriptor[], codePrefix: string): void {
  let message: string | null = null;
  try {
    deriveContractLifecycleStates(families);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message?.startsWith(codePrefix) ?? false).toBe(true);
}

function expectStabilityError(
  previous: readonly ContractLifecycleState[],
  current: readonly ContractLifecycleState[],
  codePrefix: string,
): void {
  let message: string | null = null;
  try {
    assertHistoricalIdStability(previous, current);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message?.startsWith(codePrefix) ?? false).toBe(true);
}

/** Manual successor walk over the raw registry (independent expected value). */
function walkRegistryTerminal(familyId: string): string {
  const byId = new Map(getContractLifecycleRegistry().map((family) => [family.familyId, family]));
  let current = byId.get(familyId);
  if (current === undefined) throw new Error(`family not found: ${familyId}`);
  while (current.successorFamilyId !== null) {
    const next = byId.get(current.successorFamilyId);
    if (next === undefined) throw new Error(`dangling successor from ${current.familyId}`);
    current = next;
  }
  return current.familyId;
}

// ---------------------------------------------------------------------------

test('lifecycle model builds exactly 16 states in registry order and is deterministic across repeated builds', () => {
  const first = buildContractLifecycleModel();
  const second = buildContractLifecycleModel();
  expect(first.length).toBe(16);
  expect(first).toEqual(second);
  // Byte-level determinism (repeat >= 2, deep-equal plus canonical form).
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));

  const registryIds = getContractLifecycleRegistry().map((family) => family.familyId);
  expect(first.map((state) => state.identity.familyId)).toEqual(registryIds);

  // Cached accessor returns the same frozen instance with frozen elements.
  expect(getContractLifecycleStates()).toBe(getContractLifecycleStates());
  expect(Object.isFrozen(getContractLifecycleStates())).toBe(true);
  const sample = requireState(FID(`${COMMON}.real-source-deep`));
  expect(Object.isFrozen(sample)).toBe(true);
  expect(Object.isFrozen(sample.identity)).toBe(true);
  expect(Object.isFrozen(sample.evidenceIdentity)).toBe(true);
  expect(buildContractLifecycleModel()).toEqual([...getContractLifecycleStates()]);
});

test('representative derivations pin every lifecycle dimension exactly', () => {
  // Archived historical shape (common-exchange): fully frozen chain head.
  expect(requireState(FID(`${COMMON}.real-source-shape`))).toEqual({
    modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
    identity: {
      familyId: FID(`${COMMON}.real-source-shape`),
      targetId: COMMON,
      expectationId: `${COMMON}.real-source-shape`,
    },
    kind: 'ARCHIVED_HISTORICAL_SHAPE',
    collectionScope: 'ROOT_ARRAY_SHAPE',
    derivationVersion: REAL_SOURCE_DERIVATION_VERSION,
    evidenceIdentity: {
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    },
    historicalIdCompatibility: 'HISTORICAL_IMMUTABLE_ID',
    compatibilityState: 'ARCHIVED_HISTORICAL',
    supersededByFamilyId: FID(`${COMMON}.real-source-deep`),
    terminalFamilyId: FID(`${COMMON}.real-source-collection`),
    admissionAuthority: 'EXPECTATION_ADMISSION_REQUIRED',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
  });

  // Deep type (common-exchange): active identity superseded by collection.
  expect(requireState(FID(`${COMMON}.real-source-deep`))).toEqual({
    modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
    identity: {
      familyId: FID(`${COMMON}.real-source-deep`),
      targetId: COMMON,
      expectationId: `${COMMON}.real-source-deep`,
    },
    kind: 'DEEP_TYPE',
    collectionScope: 'ITEM_FIELD_TYPE',
    derivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
    evidenceIdentity: {
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    },
    historicalIdCompatibility: 'ACTIVE_IDENTITY',
    compatibilityState: 'SUPERSEDED',
    supersededByFamilyId: FID(`${COMMON}.real-source-collection`),
    terminalFamilyId: FID(`${COMMON}.real-source-collection`),
    admissionAuthority: 'EXPECTATION_ADMISSION_REQUIRED',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
  });

  // Collection (payer-exchange): active terminal of its chain.
  expect(requireState(FID(`${PAYER}.real-source-collection`))).toEqual({
    modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
    identity: {
      familyId: FID(`${PAYER}.real-source-collection`),
      targetId: PAYER,
      expectationId: `${PAYER}.real-source-collection`,
    },
    kind: 'COLLECTION',
    collectionScope: 'COLLECTION_WIDE',
    derivationVersion: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
    evidenceIdentity: {
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    },
    historicalIdCompatibility: 'ACTIVE_IDENTITY',
    compatibilityState: 'ACTIVE_TERMINAL',
    supersededByFamilyId: null,
    terminalFamilyId: FID(`${PAYER}.real-source-collection`),
    admissionAuthority: 'EXPECTATION_ADMISSION_REQUIRED',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
  });

  // Mechanical probe (billing-groups): probe-only singleton component.
  expect(requireState(`lifecycle:mechanical-probe:${BGS}`)).toEqual({
    modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
    identity: {
      familyId: `lifecycle:mechanical-probe:${BGS}`,
      targetId: BGS,
      expectationId: null,
    },
    kind: 'MECHANICAL_PROBE',
    collectionScope: 'ANALYZER_EVIDENCE',
    derivationVersion: MECHANICAL_ANALYZER_VERSION,
    evidenceIdentity: {
      evidenceVersion: MECHANICAL_ANALYZER_EVIDENCE_VERSION,
      currentnessRequirement: 'ANALYZER_SOURCE_FRESHNESS',
    },
    historicalIdCompatibility: 'NO_EXPECTATION_ID',
    compatibilityState: 'ACTIVE_TERMINAL',
    supersededByFamilyId: null,
    terminalFamilyId: `lifecycle:mechanical-probe:${BGS}`,
    admissionAuthority: 'ANALYZER_PROBE_EVIDENCE_ONLY',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
  });
});

test('historical-ID compatibility classes partition the registry exactly', () => {
  const states = getContractLifecycleStates();
  const byCompatibility = (compatibility: string) =>
    states.filter((state) => state.historicalIdCompatibility === compatibility);

  expect(byCompatibility('HISTORICAL_IMMUTABLE_ID').length).toBe(2);
  expect(byCompatibility('ACTIVE_IDENTITY').length).toBe(8);
  expect(byCompatibility('NO_EXPECTATION_ID').length).toBe(6);

  // Historical-immutable IDs are EXACTLY the two archived Phase 9A.1 shape IDs.
  expect(byCompatibility('HISTORICAL_IMMUTABLE_ID').map((state) => state.identity.expectationId).sort())
    .toEqual([`${COMMON}.real-source-shape`, `${PAYER}.real-source-shape`].sort());
  for (const state of byCompatibility('HISTORICAL_IMMUTABLE_ID')) {
    expect(state.kind).toBe('ARCHIVED_HISTORICAL_SHAPE');
    expect(state.compatibilityState).toBe('ARCHIVED_HISTORICAL');
  }

  // NO_EXPECTATION_ID iff mechanical probe; ACTIVE_IDENTITY covers the rest.
  for (const state of states) {
    expect(state.historicalIdCompatibility === 'NO_EXPECTATION_ID').toBe(state.kind === 'MECHANICAL_PROBE');
    if (state.historicalIdCompatibility === 'ACTIVE_IDENTITY') {
      expect(['DEEP_TYPE', 'HISTORICAL_SHAPE', 'COLLECTION']).toContain(state.kind);
    }
  }
});

test('active/superseded transitions match registry lineage for every family', () => {
  const descriptors = new Map(getContractLifecycleRegistry().map((family) => [family.familyId, family]));
  for (const state of getContractLifecycleStates()) {
    const family = descriptors.get(state.identity.familyId);
    if (family === undefined) throw new Error(`registry lost ${state.identity.familyId}`);

    const expectedCompatibility =
      family.historicalImmutable === true
        ? 'ARCHIVED_HISTORICAL'
        : family.successorFamilyId !== null
          ? 'SUPERSEDED'
          : 'ACTIVE_TERMINAL';
    expect(state.compatibilityState).toBe(expectedCompatibility);
    expect(state.supersededByFamilyId).toBe(family.successorFamilyId);
    expect(state.terminalFamilyId).toBe(walkRegistryTerminal(family.familyId));
    expect(state.campaignEligible).toBe(family.campaignEligible);
  }

  const compatibilityCounts = (value: string) =>
    getContractLifecycleStates().filter((state) => state.compatibilityState === value).length;
  expect(compatibilityCounts('ARCHIVED_HISTORICAL')).toBe(2);
  expect(compatibilityCounts('SUPERSEDED')).toBe(4); // 2 deep + 2 active shapes
  expect(compatibilityCounts('ACTIVE_TERMINAL')).toBe(10); // 4 collections + 6 probes
});

test('terminal resolution agrees with terminalContractFamilyForTarget everywhere', () => {
  for (const targetId of ALL_TARGETS) {
    const outcome = terminalContractFamilyForTarget(targetId);
    if (!outcome.ok) throw new Error(`expected terminal family for ${targetId}`);
    for (const state of listContractLifecycleStatesForTarget(targetId)) {
      if (state.kind === 'MECHANICAL_PROBE') {
        // The probe is always the terminal of its OWN singleton component.
        expect(state.terminalFamilyId).toBe(state.identity.familyId);
      } else {
        // Every expectation-family member resolves to the target terminal.
        expect(state.terminalFamilyId).toBe(outcome.family.familyId);
      }
    }
  }
});

test('exactly one ACTIVE_TERMINAL expectation family per recipe target; probes terminate themselves', () => {
  for (const targetId of [COMMON, PAYER, ACCOUNT, BGX]) {
    const terminalExpectationStates = listContractLifecycleStatesForTarget(targetId).filter(
      (state) =>
        state.admissionAuthority === 'EXPECTATION_ADMISSION_REQUIRED' &&
        state.compatibilityState === 'ACTIVE_TERMINAL',
    );
    expect(terminalExpectationStates.length).toBe(1);
    expect(terminalExpectationStates[0]?.kind).toBe('COLLECTION');
  }
  for (const targetId of [BGS, BGS_LEGACY]) {
    expect(listContractLifecycleStatesForTarget(targetId).length).toBe(1);
    const probe = requireState(`lifecycle:mechanical-probe:${targetId}`);
    expect(probe.compatibilityState).toBe('ACTIVE_TERMINAL');
    expect(probe.admissionAuthority).toBe('ANALYZER_PROBE_EVIDENCE_ONLY');
  }
});

test('composeLifecycleCurrentnessState collapses deterministically and converges with evaluateComposedCurrentness', () => {
  const matrix: readonly FamilyCurrentnessClass[][] = [
    [],
    ['NOT_APPLICABLE'],
    ['CURRENT'],
    ['CURRENT', 'CURRENT'],
    ['STALE'],
    ['UNAVAILABLE'],
    ['CURRENT', 'CURRENT', 'CURRENT'],
    ['CURRENT', 'STALE'],
    ['CURRENT', 'UNAVAILABLE'],
    ['STALE', 'UNAVAILABLE'],
    ['CURRENT', 'NOT_APPLICABLE'],
    ['CURRENT', 'STALE', 'NOT_APPLICABLE', 'UNAVAILABLE'],
  ];
  for (const classes of matrix) {
    const composed = evaluateComposedCurrentness(classes);
    const expected: string = !composed.ok
      ? composed.reason === 'MIXED_CURRENTNESS'
        ? 'MIXED_CURRENTNESS_BLOCKED'
        : 'NOT_EVALUATED'
      : composed.agreed;
    // Deterministic: repeated evaluation is deep-equal.
    expect(composeLifecycleCurrentnessState(classes)).toBe(expected);
    expect(composeLifecycleCurrentnessState(classes)).toBe(composeLifecycleCurrentnessState(classes));
  }

  // Spot pins for the two composed outcomes.
  expect(composeLifecycleCurrentnessState([])).toBe('NOT_EVALUATED');
  expect(composeLifecycleCurrentnessState(['CURRENT', 'STALE'])).toBe('MIXED_CURRENTNESS_BLOCKED');
  expect(composeLifecycleCurrentnessState(['CURRENT'])).toBe('CURRENT');
});

test('composeLifecycleCurrentnessState fails closed on unknown currentness classes', () => {
  const bogus = ['BOGUS_CLASS'] as unknown as FamilyCurrentnessClass[];
  let message: string | null = null;
  try {
    composeLifecycleCurrentnessState(bogus);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe('LIFECYCLE_MODEL_UNKNOWN_CURRENTNESS_CLASS:BOGUS_CLASS');

  const mixedBogus = ['CURRENT', 'BOGUS_CLASS'] as unknown as FamilyCurrentnessClass[];
  message = null;
  try {
    composeLifecycleCurrentnessState(mixedBogus);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe('LIFECYCLE_MODEL_UNKNOWN_CURRENTNESS_CLASS:BOGUS_CLASS');
});

test('derivation fails closed on unknown kinds/states/versions/targets', () => {
  expectModelError(corrupted(FID(`${COMMON}.real-source-deep`), (family) => {
    family.kind = 'TOTALLY_UNKNOWN' as ContractFamilyKind;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-kind:');

  expectModelError(corrupted(FID(`${ACCOUNT}.real-source-shape`), (family) => {
    family.scope = 'MYSTERY_SCOPE' as ContractFamilyScope;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-scope:');

  expectModelError(corrupted(FID(`${COMMON}.real-source-deep`), (family) => {
    family.scope = 'ROOT_ARRAY_SHAPE'; // known scope, wrong for DEEP_TYPE
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:scope-kind-mismatch:');

  expectModelError(corrupted(`lifecycle:mechanical-probe:${BGS}`, (family) => {
    family.derivationVersion = 'nightwatch.bogus-derivation.v9';
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-derivation-version:');

  expectModelError(corrupted(FID(`${COMMON}.real-source-deep`), (family) => {
    family.derivationVersion = REAL_SOURCE_DERIVATION_VERSION; // known but wrong for kind
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:derivation-version-kind-mismatch:');

  expectModelError(corrupted(FID(`${ACCOUNT}.real-source-shape`), (family) => {
    family.evidenceVersion = MECHANICAL_ANALYZER_EVIDENCE_VERSION;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:evidence-version-mismatch:');

  expectModelError(corrupted(`lifecycle:mechanical-probe:${BGS_LEGACY}`, (family) => {
    family.currentnessRequirement = 'SNAPSHOT_SHA_EQUALITY' as CurrentnessRequirement;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:currentness-requirement-mismatch:');

  expectModelError(corrupted(FID(`${PAYER}.real-source-collection`), (family) => {
    family.campaignEligible = 'SOMETIMES_ELIGIBLE' as CampaignEligibility;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-campaign-eligibility:');

  expectModelError(corrupted(`lifecycle:mechanical-probe:${BGS}`, (family) => {
    family.expectationId = `${BGS}.unexpected`;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:probe-with-expectation-id:');

  expectModelError(corrupted(FID(`${COMMON}.real-source-shape`), (family) => {
    family.historicalImmutable = false;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:historical-immutable-coherence:');

  expectModelError(corrupted(`lifecycle:mechanical-probe:${BGS}`, (family) => {
    family.targetId = 'ripple.unapproved-target.read';
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-target:');

  expectModelError(corrupted(FID(`${ACCOUNT}.real-source-collection`), (family) => {
    family.expectationId = 'elsewhere.target.real-source-collection';
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:expectation-target-mismatch:');

  expectModelError(corrupted(FID(`${BGX}.real-source-shape`), (family) => {
    family.familyId = `no-prefix:${BGX}.real-source-shape`;
  }), 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:family-id-prefix:');
});

test('derivation fails closed on duplicate identities and broken lineage', () => {
  const clone = clonedRegistry();
  const probe = clone.find((candidate) => candidate.familyId === `lifecycle:mechanical-probe:${BGS}`);
  if (probe === undefined) throw new Error('probe missing in clone');
  expectModelError([...clone, JSON.parse(JSON.stringify(probe)) as ContractFamilyDescriptor],
    'LIFECYCLE_MODEL_DUPLICATE_FAMILY_ID:lifecycle:mechanical-probe:ripple.billing-groups.read');

  expectModelError(corrupted(`lifecycle:mechanical-probe:${BGS}`, (family) => {
    family.successorFamilyId = 'lifecycle:ghost-family';
  }), 'LIFECYCLE_MODEL_INVALID_LINEAGE:dangling-successor:');

  expectModelError(corrupted(FID(`${ACCOUNT}.real-source-shape`), (family) => {
    family.successorFamilyId = null; // leaves the collection predecessor asymmetric
  }), 'LIFECYCLE_MODEL_INVALID_LINEAGE:asymmetric-predecessor:');

  // A symmetric two-family cycle (shape <-> collection) with no branching.
  const cyclic = clonedRegistry();
  const shape = cyclic.find((candidate) => candidate.familyId === FID(`${ACCOUNT}.real-source-shape`));
  const collection = cyclic.find((candidate) => candidate.familyId === FID(`${ACCOUNT}.real-source-collection`));
  if (shape === undefined || collection === undefined) throw new Error('account families missing in clone');
  collection.successorFamilyId = shape.familyId;
  shape.predecessorFamilyId = collection.familyId;
  expectModelError(cyclic, `LIFECYCLE_MODEL_INVALID_LINEAGE:cycle:${FID(`${ACCOUNT}.real-source-shape`)}`);
});

test('assertHistoricalIdStability accepts identical snapshots and additive growth', () => {
  const snapshot = getContractLifecycleStates();
  expect(() => assertHistoricalIdStability(snapshot, snapshot)).not.toThrow();
  expect(() => assertHistoricalIdStability(buildContractLifecycleModel(), buildContractLifecycleModel())).not.toThrow();

  // Additive growth: a brand-new synthetic family may appear.
  const futureState: ContractLifecycleState = {
    modelVersion: CONTRACT_LIFECYCLE_MODEL_VERSION,
    identity: {
      familyId: 'lifecycle:synthetic.future-target.read.real-source-future',
      targetId: 'synthetic.future-target.read',
      expectationId: 'synthetic.future-target.read.real-source-future',
    },
    kind: 'HISTORICAL_SHAPE',
    collectionScope: 'ROOT_ARRAY_SHAPE',
    derivationVersion: REAL_SOURCE_DERIVATION_VERSION,
    evidenceIdentity: {
      evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION,
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    },
    historicalIdCompatibility: 'ACTIVE_IDENTITY',
    compatibilityState: 'ACTIVE_TERMINAL',
    supersededByFamilyId: null,
    terminalFamilyId: 'lifecycle:synthetic.future-target.read.real-source-future',
    admissionAuthority: 'EXPECTATION_ADMISSION_REQUIRED',
    campaignEligible: 'NOT_CAMPAIGN_ELIGIBLE',
  };
  expect(() => assertHistoricalIdStability(snapshot, [...snapshot, futureState])).not.toThrow();
});

test('assertHistoricalIdStability fails closed on removals, identity moves, and historical mutations', () => {
  const snapshot = getContractLifecycleStates();
  const archivedId = FID(`${COMMON}.real-source-shape`);
  const deepId = FID(`${COMMON}.real-source-deep`);

  // A historical-immutable ID can never be dropped silently.
  expectStabilityError(
    snapshot,
    snapshot.filter((state) => state.identity.familyId !== archivedId),
    `LIFECYCLE_IDENTITY_REBIND:${archivedId}:removed`,
  );

  // An expectation identity can never move to another binding.
  const movedDeep = requireState(deepId);
  const movedSnapshot = snapshot.map((state) =>
    state.identity.familyId === deepId
      ? { ...movedDeep, identity: { ...movedDeep.identity, expectationId: 'ripple.other-target.read.real-source-deep' } }
      : state,
  );
  expectStabilityError(snapshot, movedSnapshot, `LIFECYCLE_IDENTITY_REBIND:${deepId}:identity-moved`);

  // Never silently strengthen an old durable ID (v1 -> v2 derivation).
  const strengthened = snapshot.map((state) =>
    state.identity.familyId === archivedId ? { ...state, derivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2 } : state,
  );
  expectStabilityError(snapshot, strengthened, `LIFECYCLE_HISTORICAL_REBIND:${archivedId}:immutable-state-changed`);

  // Any other immutable-state mutation (kind, terminal link) rebinds too.
  const relabeled = snapshot.map((state) =>
    state.identity.familyId === archivedId ? { ...state, kind: 'DEEP_TYPE' as ContractFamilyKind } : state,
  );
  expectStabilityError(snapshot, relabeled, `LIFECYCLE_HISTORICAL_REBIND:${archivedId}:immutable-state-changed`);

  const relinked = snapshot.map((state) =>
    state.identity.familyId === archivedId
      ? { ...state, terminalFamilyId: FID(`${PAYER}.real-source-collection`) }
      : state,
  );
  expectStabilityError(snapshot, relinked, `LIFECYCLE_HISTORICAL_REBIND:${archivedId}:immutable-state-changed`);
});

test('legitimate retirement transition is allowed without strengthening old durable IDs', () => {
  const snapshot = getContractLifecycleStates();
  const shapeId = FID(`${ACCOUNT}.real-source-shape`);

  // An ACTIVE shape legitimately retires into the archived-historical state
  // (same identity binding; compatibility classes evolve additively).
  const retiredSnapshot = snapshot.map((state) =>
    state.identity.familyId === shapeId
      ? {
          ...state,
          kind: 'ARCHIVED_HISTORICAL_SHAPE' as ContractFamilyKind,
          historicalIdCompatibility: 'HISTORICAL_IMMUTABLE_ID' as const,
          compatibilityState: 'ARCHIVED_HISTORICAL' as const,
        }
      : state,
  );
  expect(() => assertHistoricalIdStability(snapshot, retiredSnapshot)).not.toThrow();

  // Active <-> superseded evolution on a non-historical family is allowed.
  const promotedSnapshot = snapshot.map((state) =>
    state.identity.familyId === FID(`${BGX}.real-source-shape`)
      ? { ...state, compatibilityState: 'ACTIVE_TERMINAL' as const, supersededByFamilyId: null }
      : state,
  );
  expect(() => assertHistoricalIdStability(snapshot, promotedSnapshot)).not.toThrow();
});

test('version constant is pinned verbatim and stamped on every state; lookups behave', () => {
  expect(CONTRACT_LIFECYCLE_MODEL_VERSION).toBe('nightwatch.contract-lifecycle-model.v1');
  for (const state of getContractLifecycleStates()) {
    expect(state.modelVersion).toBe('nightwatch.contract-lifecycle-model.v1');
  }
  expect(getContractLifecycleState('lifecycle:does-not-exist')).toBeNull();
  expect(listContractLifecycleStatesForTarget('ripple.unapproved-target.read')).toEqual([]);
  const shape = getContractLifecycleState(FID(`${ACCOUNT}.real-source-shape`));
  expect(shape?.identity.familyId).toBe(FID(`${ACCOUNT}.real-source-shape`));
  expect(shape?.historicalIdCompatibility).toBe('ACTIVE_IDENTITY');
});
