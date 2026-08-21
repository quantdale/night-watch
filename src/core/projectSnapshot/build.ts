// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A12) — deterministic project snapshot
// builder.
//
// Builds a ProjectSnapshotManifest from EXPLICIT caller-supplied values
// (versions/registries as data — never live filesystem scans), normalizes it
// into a canonical form (sorted sets, sorted families, digests over the
// canonical serialization from src/core/identity/canonicalDigest.ts) and
// fails closed on invalid input. Three version slots (collectionAdmission,
// coverageInventory, campaignCheckpoint) are optional inputs that default to
// the authoritative owning-module constants exported above.
//
// Digest chain:
//   entry digest     = prefixedDigest24('pscase', catalogEntry)
//   catalog digest   = prefixedDigest24('pscat', sortedEntryDigests)
//   manifest digest  = prefixedDigest24('psnap', manifestWithoutManifestDigest)
//
// Pure: no fs/network/child-process/DB/AI/selfDev/persistence; no timestamps;
// no environment access.
// ---------------------------------------------------------------------------

import { prefixedDigest24, stableJsonSorted } from '../identity/canonicalDigest';
import { safeErrorDetail } from '../campaign/runtimeValidation';
import { CAMPAIGN_CHECKPOINT_VERSION } from '../campaign/types';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../oracles/expectations/collectionAdmission';
import {
  PROJECT_SNAPSHOT_VERSION,
  type ProjectSnapshotContractFamily,
  type ProjectSnapshotInput,
  type ProjectSnapshotManifest,
  type ProjectSnapshotOwnerScopeMarker,
} from './types';

export const PROJECT_SNAPSHOT_MANIFEST_DIGEST_PREFIX = 'psnap' as const;
export const PROJECT_SNAPSHOT_CATALOG_DIGEST_PREFIX = 'pscat' as const;
export const PROJECT_SNAPSHOT_ENTRY_DIGEST_PREFIX = 'pscase' as const;

/**
 * Authoritative default for the collectionAdmissionVersion slot: the owning
 * oracle constant (src/oracles/expectations/collectionAdmission.ts), imported
 * so the slot can never silently drift from admission behavior.
 */
export const PROJECT_SNAPSHOT_DEFAULT_COLLECTION_ADMISSION_VERSION = REAL_SOURCE_COLLECTION_DERIVATION_VERSION;

/**
 * Default for the coverageInventoryVersion slot. The Phase 12A
 * coverageInventory module declares no version constant of its own, so the
 * snapshot layer pins this identity for its report shape; callers override
 * explicitly when the owning module declares one.
 */
export const PROJECT_SNAPSHOT_DEFAULT_COVERAGE_INVENTORY_VERSION = 'nightwatch.real-source-coverage-inventory.v1';

/**
 * Authoritative default for the first-class campaignCheckpointVersion slot:
 * the owning campaign constant (src/core/campaign/types.ts). Compared as a
 * classified slot by compare.ts (evolution = SEMANTIC_CHANGE, same-family
 * downgrade = INCOMPATIBLE_CHANGE).
 */
export const PROJECT_SNAPSHOT_DEFAULT_CAMPAIGN_CHECKPOINT_VERSION = CAMPAIGN_CHECKPOINT_VERSION;

/** Same comparator family as stableJsonSorted (localeCompare key order). */
function byLocale(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Upper bound for every identifier/version string carried in a manifest. */
const MAX_IDENTIFIER_LENGTH = 200;

function requireNonEmptyString(field: string, value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error(`PROJECT_SNAPSHOT_INVALID_INPUT:${field}`);
  }
  // Architecture identifiers are bounded categorical values; an unbounded
  // free-text field would let raw payloads enter the durable manifest.
  if (value.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(`PROJECT_SNAPSHOT_IDENTIFIER_TOO_LONG:${field}`);
  }
  return value;
}

/** Sorted, unique, validated string set. Duplicates fail closed. */
function normalizedStringSet(field: string, values: readonly string[]): readonly string[] {
  if (!Array.isArray(values)) throw new Error(`PROJECT_SNAPSHOT_INVALID_INPUT:${field}`);
  const seen = new Set<string>();
  for (const value of values) {
    const v = requireNonEmptyString(field, value);
    if (seen.has(v)) throw new Error(`PROJECT_SNAPSHOT_DUPLICATE_SET_ENTRY:${field}:${safeErrorDetail(v)}`);
    seen.add(v);
  }
  return Object.freeze([...seen].sort(byLocale));
}

const FAMILY_STRING_FIELDS = [
  'familyId',
  'targetId',
  'kind',
  'scope',
  'derivationVersion',
  'evidenceVersion',
  'currentnessRequirement',
  'campaignEligible',
] as const;

const FAMILY_NULLABLE_FIELDS = [
  'expectationId',
  'predecessorFamilyId',
  'successorFamilyId',
] as const;

function normalizeFamily(family: ProjectSnapshotContractFamily): ProjectSnapshotContractFamily {
  if (typeof family !== 'object' || family === null) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:contractFamilies');
  }
  for (const field of FAMILY_STRING_FIELDS) {
    requireNonEmptyString(`contractFamilies.${field}`, family[field]);
  }
  for (const field of FAMILY_NULLABLE_FIELDS) {
    const value = family[field];
    if (value !== null) requireNonEmptyString(`contractFamilies.${field}`, value);
  }
  if (typeof family.historicalImmutable !== 'boolean') {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:contractFamilies.historicalImmutable');
  }
  return Object.freeze({ ...family });
}

function normalizeOwnerScope(ownerScope: ProjectSnapshotOwnerScopeMarker): ProjectSnapshotOwnerScopeMarker {
  if (typeof ownerScope !== 'object' || ownerScope === null) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:ownerScope');
  }
  return Object.freeze({
    policyVersion: requireNonEmptyString('ownerScope.policyVersion', ownerScope.policyVersion),
    status: requireNonEmptyString('ownerScope.status', ownerScope.status),
    reason: requireNonEmptyString('ownerScope.reason', ownerScope.reason),
  });
}

function normalizeCampaignVersions(
  campaignVersions: ProjectSnapshotInput['campaignVersions'],
): ProjectSnapshotInput['campaignVersions'] {
  if (typeof campaignVersions !== 'object' || campaignVersions === null) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:campaignVersions');
  }
  for (const [key, value] of Object.entries(campaignVersions)) {
    requireNonEmptyString(`campaignVersions.${key}`, value);
  }
  return Object.freeze({ ...campaignVersions });
}

interface NormalizedCatalog {
  readonly entryCount: number;
  readonly entryDigests: readonly string[];
  readonly catalogDigest: string;
}

function normalizeCatalogEntries(entries: ProjectSnapshotInput['adoptedCaseCatalogEntries']): NormalizedCatalog {
  if (!Array.isArray(entries)) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:adoptedCaseCatalogEntries');
  }
  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`PROJECT_SNAPSHOT_INVALID_INPUT:adoptedCaseCatalogEntries[${String(index)}]`);
    }
    const digest = prefixedDigest24(PROJECT_SNAPSHOT_ENTRY_DIGEST_PREFIX, entry);
    if (seen.has(digest)) {
      throw new Error(`PROJECT_SNAPSHOT_DUPLICATE_CATALOG_ENTRY:${digest}`);
    }
    seen.add(digest);
  }
  const entryDigests = Object.freeze([...seen].sort(byLocale));
  return Object.freeze({
    entryCount: entries.length,
    entryDigests,
    catalogDigest: prefixedDigest24(PROJECT_SNAPSHOT_CATALOG_DIGEST_PREFIX, entryDigests),
  });
}

/**
 * Public per-entry catalog digest: the exact function
 * `buildProjectSnapshot` applies to each element of
 * `adoptedCaseCatalogEntries` (e.g. each SELFDEV_ADOPTED_CASES element from
 * src/core/selfDev/adoptedCaseCatalog.generated.ts, a pure declarative-data
 * module whose stable inputs make per-entry digests practical). Callers can
 * precompute or externally verify single-entry integrity without importing
 * digest internals.
 */
export function projectSnapshotAdoptedCaseEntryDigest(entry: Record<string, unknown>): string {
  return prefixedDigest24(PROJECT_SNAPSHOT_ENTRY_DIGEST_PREFIX, entry);
}

/**
 * Canonical digest payload of a manifest: the manifest WITHOUT its own
 * manifestDigest field. Exported so callers can re-verify the digest:
 * `prefixedDigest24('psnap', projectSnapshotDigestInput(manifest))`.
 */
export function projectSnapshotDigestInput(
  manifest: ProjectSnapshotManifest,
): Omit<ProjectSnapshotManifest, 'manifestDigest'> {
  return {
    snapshotSchemaVersion: manifest.snapshotSchemaVersion,
    contractRegistryVersion: manifest.contractRegistryVersion,
    contractFamilies: manifest.contractFamilies,
    recipeSchemaVersions: manifest.recipeSchemaVersions,
    derivationVersions: manifest.derivationVersions,
    approvedTargets: manifest.approvedTargets,
    analyzerVersion: manifest.analyzerVersion,
    replayPlanVersions: manifest.replayPlanVersions,
    semanticReceiptVersion: manifest.semanticReceiptVersion,
    collectionAdmissionVersion: manifest.collectionAdmissionVersion,
    coverageInventoryVersion: manifest.coverageInventoryVersion,
    campaignCheckpointVersion: manifest.campaignCheckpointVersion,
    campaignVersions: manifest.campaignVersions,
    dossierVersions: manifest.dossierVersions,
    ownerScope: manifest.ownerScope,
    adoptedCaseCatalog: manifest.adoptedCaseCatalog,
  };
}

/**
 * Build the deterministic manifest. Fails closed with
 * `PROJECT_SNAPSHOT_*` error codes on any invalid input.
 */
export function buildProjectSnapshot(input: ProjectSnapshotInput): ProjectSnapshotManifest {
  if (typeof input !== 'object' || input === null) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:input');
  }

  const contractRegistryVersion = requireNonEmptyString('contractRegistryVersion', input.contractRegistryVersion);

  if (!Array.isArray(input.contractFamilies)) {
    throw new Error('PROJECT_SNAPSHOT_INVALID_INPUT:contractFamilies');
  }
  const seenFamilyIds = new Set<string>();
  const families = input.contractFamilies.map(normalizeFamily);
  for (const family of families) {
    if (seenFamilyIds.has(family.familyId)) {
      throw new Error(`PROJECT_SNAPSHOT_DUPLICATE_FAMILY_ID:${safeErrorDetail(family.familyId)}`);
    }
    seenFamilyIds.add(family.familyId);
  }
  const contractFamilies = Object.freeze(families.sort((a, b) => byLocale(a.familyId, b.familyId)));

  const payload: Omit<ProjectSnapshotManifest, 'manifestDigest'> = {
    snapshotSchemaVersion: PROJECT_SNAPSHOT_VERSION,
    contractRegistryVersion,
    contractFamilies,
    recipeSchemaVersions: normalizedStringSet('recipeSchemaVersions', input.recipeSchemaVersions),
    derivationVersions: normalizedStringSet('derivationVersions', input.derivationVersions),
    approvedTargets: normalizedStringSet('approvedTargets', input.approvedTargets),
    analyzerVersion: requireNonEmptyString('analyzerVersion', input.analyzerVersion),
    replayPlanVersions: normalizedStringSet('replayPlanVersions', input.replayPlanVersions),
    semanticReceiptVersion: requireNonEmptyString('semanticReceiptVersion', input.semanticReceiptVersion),
    collectionAdmissionVersion: requireNonEmptyString(
      'collectionAdmissionVersion',
      input.collectionAdmissionVersion ?? PROJECT_SNAPSHOT_DEFAULT_COLLECTION_ADMISSION_VERSION,
    ),
    coverageInventoryVersion: requireNonEmptyString(
      'coverageInventoryVersion',
      input.coverageInventoryVersion ?? PROJECT_SNAPSHOT_DEFAULT_COVERAGE_INVENTORY_VERSION,
    ),
    campaignCheckpointVersion: requireNonEmptyString(
      'campaignCheckpointVersion',
      input.campaignCheckpointVersion ?? PROJECT_SNAPSHOT_DEFAULT_CAMPAIGN_CHECKPOINT_VERSION,
    ),
    campaignVersions: normalizeCampaignVersions(input.campaignVersions),
    dossierVersions: normalizedStringSet('dossierVersions', input.dossierVersions),
    ownerScope: normalizeOwnerScope(input.ownerScope),
    adoptedCaseCatalog: normalizeCatalogEntries(input.adoptedCaseCatalogEntries),
  };

  const manifest = Object.freeze({
    ...payload,
    manifestDigest: prefixedDigest24(PROJECT_SNAPSHOT_MANIFEST_DIGEST_PREFIX, payload),
  });
  return manifest;
}

/** Canonical serialization (stable JSON, recursively key-sorted). */
export function serializeProjectSnapshot(manifest: ProjectSnapshotManifest): string {
  return stableJsonSorted(manifest);
}
