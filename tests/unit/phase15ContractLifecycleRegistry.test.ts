// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream A — contract lifecycle registry
// (permanent unit proof).
//
// Pins the ONE Nightwatch-owned lifecycle registry: total/per-target family
// counts, EXACT historical/deep/collection/archived expectation identities,
// the fixed lineage chains (archived -> deep -> collection and
// shape -> collection), the pure validator's fail-closed error codes, the
// terminal-selection rules, uniform campaign eligibility, and the frozen
// version constants.
//
// Synthetic/local only. No DEV, no real product, no network.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  buildContractLifecycleRegistry,
  CONTRACT_LIFECYCLE_REGISTRY_VERSION,
  getContractFamily,
  getContractLifecycleRegistry,
  listContractFamiliesForTarget,
  MECHANICAL_ANALYZER_EVIDENCE_VERSION,
  SOURCE_EVIDENCE_DIGEST_VERSION,
  terminalContractFamilyForTarget,
  validateContractFamilies,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import type { ContractFamilyDescriptor } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import { isApprovedSemanticCampaignTarget } from '../../src/oracles/semantic/campaignTargetMapping';
import { REAL_SOURCE_COLLECTION_EXPECTATION_IDS } from '../../src/oracles/expectations/collectionAdmission';

const FID = (expectationId: string): string => `lifecycle:${expectationId}`;

const COMMON = 'ripple.common-exchange.read';
const PAYER = 'ripple.payer-exchange.read';
const ACCOUNT = 'ripple.account-inventory.read';
const BGX = 'ripple.billing-group-exchange.read';
const BGS = 'ripple.billing-groups.read';
const BGS_LEGACY = 'ripple.billing-groups-legacy.read';

const ACTIVE_EXPECTATION_IDS = [
  'ripple.common-exchange.read.real-source-deep',
  'ripple.payer-exchange.read.real-source-deep',
  'ripple.account-inventory.read.real-source-shape',
  'ripple.billing-group-exchange.read.real-source-shape',
] as const;

const COLLECTION_EXPECTATION_IDS = [
  'ripple.common-exchange.read.real-source-collection',
  'ripple.payer-exchange.read.real-source-collection',
  'ripple.account-inventory.read.real-source-collection',
  'ripple.billing-group-exchange.read.real-source-collection',
] as const;

const ARCHIVED_SHAPE_IDS = [
  'ripple.common-exchange.read.real-source-shape',
  'ripple.payer-exchange.read.real-source-shape',
] as const;

function requireFamily(familyId: string): ContractFamilyDescriptor {
  const family = getContractFamily(familyId);
  if (family === null) throw new Error(`family not found: ${familyId}`);
  return family;
}

function terminalFamilyOrThrow(targetId: string): ContractFamilyDescriptor {
  const outcome = terminalContractFamilyForTarget(targetId);
  if (!outcome.ok) throw new Error(`expected terminal family for ${targetId}, got ${outcome.reason}`);
  return outcome.family;
}

/** Fresh mutable deep copy of the built registry for corruption cases. */
function clonedRegistry(): ContractFamilyDescriptor[] {
  return JSON.parse(JSON.stringify(getContractLifecycleRegistry())) as ContractFamilyDescriptor[];
}

function byId(families: readonly ContractFamilyDescriptor[], familyId: string): ContractFamilyDescriptor {
  const family = families.find((candidate) => candidate.familyId === familyId);
  if (family === undefined) throw new Error(`family not found in corrupted set: ${familyId}`);
  return family;
}

function expectValidationError(families: readonly ContractFamilyDescriptor[], codePrefix: string): void {
  let message: string | null = null;
  try {
    validateContractFamilies(families);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message?.startsWith(codePrefix) ?? false).toBe(true);
}

// ---------------------------------------------------------------------------

test('lifecycle registry builds with exactly 16 families and stable per-target counts', () => {
  const registry = getContractLifecycleRegistry();
  expect(registry.length).toBe(16);

  expect(listContractFamiliesForTarget(COMMON).length).toBe(4); // archived + deep + collection + probe
  expect(listContractFamiliesForTarget(PAYER).length).toBe(4); // archived + deep + collection + probe
  expect(listContractFamiliesForTarget(ACCOUNT).length).toBe(3); // shape + collection + probe
  expect(listContractFamiliesForTarget(BGX).length).toBe(3); // shape + collection + probe
  expect(listContractFamiliesForTarget(BGS).length).toBe(1); // probe only
  expect(listContractFamiliesForTarget(BGS_LEGACY).length).toBe(1); // probe only

  const kinds = registry.map((family) => family.kind);
  expect(kinds.filter((kind) => kind === 'HISTORICAL_SHAPE').length).toBe(2);
  expect(kinds.filter((kind) => kind === 'DEEP_TYPE').length).toBe(2);
  expect(kinds.filter((kind) => kind === 'COLLECTION').length).toBe(4);
  expect(kinds.filter((kind) => kind === 'MECHANICAL_PROBE').length).toBe(6);
  expect(kinds.filter((kind) => kind === 'ARCHIVED_HISTORICAL_SHAPE').length).toBe(2);

  // A fresh build equals the cached registry structurally.
  expect(buildContractLifecycleRegistry()).toEqual([...registry]);
});

test('exact historical, deep, collection, and archived expectation identity pins', () => {
  for (const expectationId of ACTIVE_EXPECTATION_IDS) {
    expect(requireFamily(FID(expectationId)).expectationId).toBe(expectationId);
  }
  for (const expectationId of COLLECTION_EXPECTATION_IDS) {
    expect(requireFamily(FID(expectationId)).expectationId).toBe(expectationId);
    expect(requireFamily(FID(expectationId)).kind).toBe('COLLECTION');
  }
  for (const expectationId of ARCHIVED_SHAPE_IDS) {
    const family = requireFamily(FID(expectationId));
    expect(family.expectationId).toBe(expectationId);
    expect(family.kind).toBe('ARCHIVED_HISTORICAL_SHAPE');
    expect(family.historicalImmutable).toBe(true);
  }

  // The collection table itself is the authoritative source of the IDs.
  for (const [targetId, collectionExpectationId] of Object.entries(REAL_SOURCE_COLLECTION_EXPECTATION_IDS)) {
    expect(requireFamily(FID(collectionExpectationId)).targetId).toBe(targetId);
  }

  // Probe familyId convention.
  expect(requireFamily(`lifecycle:mechanical-probe:${BGS}`).expectationId).toBeNull();
  expect(requireFamily(`lifecycle:mechanical-probe:${BGS_LEGACY}`).expectationId).toBeNull();

  // Derivation/evidence/currentness metadata per kind.
  const deep = requireFamily(FID('ripple.common-exchange.read.real-source-deep'));
  expect(deep.scope).toBe('ITEM_FIELD_TYPE');
  expect(deep.evidenceVersion).toBe(SOURCE_EVIDENCE_DIGEST_VERSION);
  expect(deep.currentnessRequirement).toBe('SNAPSHOT_SHA_EQUALITY');
  const shape = requireFamily(FID('ripple.account-inventory.read.real-source-shape'));
  expect(shape.scope).toBe('ROOT_ARRAY_SHAPE');
  expect(shape.evidenceVersion).toBe(SOURCE_EVIDENCE_DIGEST_VERSION);
  const collection = requireFamily(FID('ripple.common-exchange.read.real-source-collection'));
  expect(collection.scope).toBe('COLLECTION_WIDE');
  const probe = requireFamily(`lifecycle:mechanical-probe:${COMMON}`);
  expect(probe.scope).toBe('ANALYZER_EVIDENCE');
  expect(probe.evidenceVersion).toBe(MECHANICAL_ANALYZER_EVIDENCE_VERSION);
  expect(probe.currentnessRequirement).toBe('ANALYZER_SOURCE_FRESHNESS');
});

test('lineage: archived -> deep -> collection chain for common-exchange and payer-exchange', () => {
  for (const target of [COMMON, PAYER]) {
    const archived = requireFamily(FID(`${target}.real-source-shape`));
    const deep = requireFamily(FID(`${target}.real-source-deep`));
    const collection = requireFamily(FID(`${target}.real-source-collection`));

    expect(archived.kind).toBe('ARCHIVED_HISTORICAL_SHAPE');
    expect(archived.predecessorFamilyId).toBeNull();
    expect(archived.successorFamilyId).toBe(deep.familyId);

    expect(deep.kind).toBe('DEEP_TYPE');
    expect(deep.predecessorFamilyId).toBe(archived.familyId);
    expect(deep.successorFamilyId).toBe(collection.familyId);

    expect(collection.kind).toBe('COLLECTION');
    expect(collection.predecessorFamilyId).toBe(deep.familyId);
    expect(collection.successorFamilyId).toBeNull();
  }
});

test('lineage: shape -> collection chain for account-inventory and billing-group-exchange', () => {
  for (const target of [ACCOUNT, BGX]) {
    const shape = requireFamily(FID(`${target}.real-source-shape`));
    const collection = requireFamily(FID(`${target}.real-source-collection`));

    expect(shape.kind).toBe('HISTORICAL_SHAPE');
    expect(shape.predecessorFamilyId).toBeNull();
    expect(shape.successorFamilyId).toBe(collection.familyId);

    expect(collection.kind).toBe('COLLECTION');
    expect(collection.predecessorFamilyId).toBe(shape.familyId);
    expect(collection.successorFamilyId).toBeNull();
  }
});

test('mechanical-probe families carry no lineage', () => {
  for (const target of [COMMON, PAYER, ACCOUNT, BGX, BGS, BGS_LEGACY]) {
    const probe = requireFamily(`lifecycle:mechanical-probe:${target}`);
    expect(probe.kind).toBe('MECHANICAL_PROBE');
    expect(probe.predecessorFamilyId).toBeNull();
    expect(probe.successorFamilyId).toBeNull();
  }
});

test('validateContractFamilies rejects duplicate family ids', () => {
  const corrupted = [...clonedRegistry(), { ...byId(clonedRegistry(), `lifecycle:mechanical-probe:${BGS}`) }];
  expectValidationError(corrupted, 'REGISTRY_DUPLICATE_FAMILY_ID:');
});

test('validateContractFamilies rejects duplicate expectation ids', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, FID('ripple.payer-exchange.read.real-source-deep')).expectationId =
    'ripple.common-exchange.read.real-source-deep';
  expectValidationError(corrupted, 'REGISTRY_DUPLICATE_EXPECTATION_ID:ripple.common-exchange.read.real-source-deep');
});

test('validateContractFamilies rejects non-archived target/kind collisions', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, FID('ripple.payer-exchange.read.real-source-collection')).kind = 'DEEP_TYPE';
  expectValidationError(corrupted, 'REGISTRY_TARGET_COLLISION:ripple.payer-exchange.read');
});

test('validateContractFamilies rejects branching successor chains', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, FID('ripple.account-inventory.read.real-source-shape')).successorFamilyId =
    FID('ripple.common-exchange.read.real-source-collection');
  expectValidationError(corrupted, 'REGISTRY_AMBIGUOUS_SUCCESSOR_CHAIN:');
});

test('validateContractFamilies rejects unknown derivation versions', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, `lifecycle:mechanical-probe:${BGS}`).derivationVersion = 'nightwatch.bogus-derivation.v9';
  expectValidationError(corrupted, 'REGISTRY_UNKNOWN_DERIVATION_VERSION:nightwatch.bogus-derivation.v9');
});

test('validateContractFamilies rejects unapproved targets', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, `lifecycle:mechanical-probe:${BGS}`).targetId = 'ripple.unapproved-target.read';
  expectValidationError(corrupted, 'REGISTRY_UNKNOWN_TARGET:ripple.unapproved-target.read');
});

test('validateContractFamilies rejects dangling predecessors', () => {
  const corrupted = clonedRegistry();
  // A probe is never referenced by any other family, so the dangling
  // predecessor is the first lineage violation encountered.
  byId(corrupted, `lifecycle:mechanical-probe:${BGS}`).predecessorFamilyId = 'lifecycle:does-not-exist';
  expectValidationError(corrupted, 'REGISTRY_INVALID_LINEAGE:dangling-predecessor:');
});

test('validateContractFamilies rejects predecessor/successor cycles', () => {
  const corrupted = clonedRegistry();
  const deep = byId(corrupted, FID('ripple.common-exchange.read.real-source-deep'));
  const collection = byId(corrupted, FID('ripple.common-exchange.read.real-source-collection'));
  byId(corrupted, FID('ripple.common-exchange.read.real-source-shape')).successorFamilyId = null;
  collection.successorFamilyId = deep.familyId;
  deep.predecessorFamilyId = collection.familyId;
  expectValidationError(corrupted, 'REGISTRY_INVALID_LINEAGE:cycle:');
});

test('validateContractFamilies rejects probes carrying an expectation id', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, `lifecycle:mechanical-probe:${BGS}`).expectationId = 'ripple.billing-groups.read.probe-x';
  expectValidationError(corrupted, 'REGISTRY_INVALID_DESCRIPTOR:probe-with-expectation-id:');
});

test('validateContractFamilies rejects expectation ids not prefixed by their target', () => {
  const corrupted = clonedRegistry();
  byId(corrupted, FID('ripple.account-inventory.read.real-source-collection')).expectationId =
    'elsewhere.target.real-source-collection';
  expectValidationError(corrupted, 'REGISTRY_INVALID_LINEAGE:expectation-target-mismatch:');
});

test('terminal selection: collection terminates admitted expectation chains', () => {
  expect(terminalFamilyOrThrow(COMMON).familyId).toBe(FID('ripple.common-exchange.read.real-source-collection'));
  expect(terminalFamilyOrThrow(PAYER).familyId).toBe(FID('ripple.payer-exchange.read.real-source-collection'));
  expect(terminalFamilyOrThrow(ACCOUNT).familyId).toBe(FID('ripple.account-inventory.read.real-source-collection'));
  expect(terminalFamilyOrThrow(BGX).familyId).toBe(FID('ripple.billing-group-exchange.read.real-source-collection'));

  // Archived families are never terminal anywhere.
  for (const target of [COMMON, PAYER, ACCOUNT, BGX, BGS, BGS_LEGACY]) {
    expect(terminalFamilyOrThrow(target).kind).not.toBe('ARCHIVED_HISTORICAL_SHAPE');
  }
});

test('terminal selection: probe-only targets terminate at their mechanical probe', () => {
  expect(terminalFamilyOrThrow(BGS).familyId).toBe(`lifecycle:mechanical-probe:${BGS}`);
  expect(terminalFamilyOrThrow(BGS_LEGACY).familyId).toBe(`lifecycle:mechanical-probe:${BGS_LEGACY}`);
});

test('terminal selection fails closed for unknown targets', () => {
  expect(terminalContractFamilyForTarget('ripple.does-not-exist.read')).toEqual({
    ok: false,
    reason: 'UNKNOWN_TARGET',
  });
});

test('campaign eligibility mirrors isApprovedSemanticCampaignTarget for every family', () => {
  for (const family of getContractLifecycleRegistry()) {
    expect(family.campaignEligible === 'CAMPAIGN_ELIGIBLE').toBe(isApprovedSemanticCampaignTarget(family.targetId));
  }
});

test('version constants are pinned verbatim and the cached registry is frozen', () => {
  expect(CONTRACT_LIFECYCLE_REGISTRY_VERSION).toBe('nightwatch.contract-lifecycle-registry.v1');
  expect(SOURCE_EVIDENCE_DIGEST_VERSION).toBe('nightwatch.source-evidence-digest.v1');
  expect(MECHANICAL_ANALYZER_EVIDENCE_VERSION).toBe('nightwatch.mechanical-analyzer-evidence.v1');

  expect(getContractLifecycleRegistry()).toBe(getContractLifecycleRegistry());
  expect(Object.isFrozen(getContractLifecycleRegistry())).toBe(true);
});
