// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A12) — deterministic project snapshot
// manifest types.
//
// The manifest is a PRIVATE-SAFE, DETERMINISTIC representation of important
// Nightwatch architecture state:
//
//   - contract versions (lifecycle registry version + families, recipe schema
//     versions, derivation versions),
//   - the approved read-only target registry,
//   - analyzer version (MECHANICAL_ANALYZER_VERSION),
//   - replay plan versions (TRIAGE_REPLAY_PLAN_VERSION / _V2_VERSION),
//   - semantic evaluation receipt version,
//   - campaign fingerprint fields (CampaignVersionFingerprint shape),
//   - dossier versions (v1/v2),
//   - owner-scope policy marker (frozen marker constants only),
//   - adopted-case catalog integrity digest inputs.
//
// CONSTRUCTION IS PURE AND EXPLICIT: `buildProjectSnapshot` takes every
// version/registry as caller-supplied VALUES. It never scans the filesystem,
// never imports live registries, and never reads the environment — callers
// decide what to include, which keeps the manifest deterministic and testable.
//
// PRIVACY CONTRACT: no runtime/customer data, no timestamps in identity-bearing
// data, no secrets/auth paths/raw bodies. Only architecture identifiers
// (version strings, target/expectation IDs, digests) may enter a manifest.
//
// Pure: no fs/network/child-process/DB/AI/selfDev/persistence.
// ---------------------------------------------------------------------------

import type { CampaignVersionFingerprint } from '../campaign/types';

export type { CampaignVersionFingerprint };

/** Manifest identity version. A mismatch makes two manifests incomparable. */
export const PROJECT_SNAPSHOT_VERSION = 'nightwatch.project-snapshot.v1' as const;

/**
 * The EXACT comparison vocabulary. Nothing else may be emitted.
 *
 * Mapping (documented contract, enforced by compare.ts):
 *   UNCHANGED           — identical inputs.
 *   COMPATIBLE_CHANGE   — additive versions/entries only (new recipe schema
 *                         or derivation version, new lifecycle family, new
 *                         adopted-case entry, new replay/dossier plan version).
 *   SEMANTIC_CHANGE     — changed semantic contracts: lifecycle family field
 *                         drift, registry/analyzer/receipt version replacement,
 *                         campaign fingerprint drift.
 *   AUTHORITY_CHANGE    — owner-scope policy marker change or any change to the
 *                         approved read-only target registry (expansion or
 *                         revocation is an authority event, never merely
 *                         compatible).
 *   INCOMPATIBLE_CHANGE — removals and incompatible version downgrades
 *                         (`.vN` -> lower `.vM` on the same slot prefix), plus
 *                         snapshot schema-version mismatch.
 */
export type ProjectSnapshotDiffClassification =
  | 'UNCHANGED'
  | 'COMPATIBLE_CHANGE'
  | 'SEMANTIC_CHANGE'
  | 'AUTHORITY_CHANGE'
  | 'INCOMPATIBLE_CHANGE';

/** Owner-scope frozen marker values (from src/core/policy/ownerScope.ts). */
export interface ProjectSnapshotOwnerScopeMarker {
  readonly policyVersion: string;
  readonly status: string;
  readonly reason: string;
}

/**
 * Structural lifecycle-family record. Deliberately decoupled from the
 * ContractFamilyDescriptor type: fields align by name so callers can feed
 * registry descriptors directly, but this module owns its own identity.
 */
export interface ProjectSnapshotContractFamily {
  readonly familyId: string;
  readonly targetId: string;
  readonly kind: string;
  readonly scope: string;
  readonly expectationId: string | null;
  readonly derivationVersion: string;
  readonly evidenceVersion: string;
  readonly currentnessRequirement: string;
  readonly campaignEligible: string;
  readonly predecessorFamilyId: string | null;
  readonly successorFamilyId: string | null;
  readonly historicalImmutable: boolean;
}

/** Explicit construction input: everything the manifest represents. */
export interface ProjectSnapshotInput {
  /** CONTRACT_LIFECYCLE_REGISTRY_VERSION value. */
  readonly contractRegistryVersion: string;
  /** Lifecycle registry families (caller-supplied descriptor values). */
  readonly contractFamilies: readonly ProjectSnapshotContractFamily[];
  /** Active recipe schema versions (e.g. real-source-expectation-recipe v1/v2). */
  readonly recipeSchemaVersions: readonly string[];
  /** Derivation versions (admission v1/v2, collection, analyzer). */
  readonly derivationVersions: readonly string[];
  /** Approved read-only target registry values. */
  readonly approvedTargets: readonly string[];
  /** MECHANICAL_ANALYZER_VERSION value. */
  readonly analyzerVersion: string;
  /** Replay plan versions (v1 + v2). */
  readonly replayPlanVersions: readonly string[];
  /** Current semantic evaluation receipt version. */
  readonly semanticReceiptVersion: string;
  /** Campaign fingerprint fields (CampaignVersionFingerprint shape). */
  readonly campaignVersions: CampaignVersionFingerprint;
  /** Supported dossier versions (v1 + v2). */
  readonly dossierVersions: readonly string[];
  /** Frozen owner-scope marker constants. */
  readonly ownerScope: ProjectSnapshotOwnerScopeMarker;
  /** Adopted-case catalog entries (integrity digest inputs). */
  readonly adoptedCaseCatalogEntries: readonly Record<string, unknown>[];
}

/** Deterministic manifest produced by buildProjectSnapshot. */
export interface ProjectSnapshotManifest {
  readonly snapshotSchemaVersion: typeof PROJECT_SNAPSHOT_VERSION;
  readonly contractRegistryVersion: string;
  /** Sorted by familyId; records copied and frozen. */
  readonly contractFamilies: readonly ProjectSnapshotContractFamily[];
  /** Sorted, unique. */
  readonly recipeSchemaVersions: readonly string[];
  /** Sorted, unique. */
  readonly derivationVersions: readonly string[];
  /** Sorted, unique. */
  readonly approvedTargets: readonly string[];
  readonly analyzerVersion: string;
  /** Sorted, unique. */
  readonly replayPlanVersions: readonly string[];
  readonly semanticReceiptVersion: string;
  readonly campaignVersions: CampaignVersionFingerprint;
  /** Sorted, unique. */
  readonly dossierVersions: readonly string[];
  readonly ownerScope: ProjectSnapshotOwnerScopeMarker;
  readonly adoptedCaseCatalog: {
    readonly entryCount: number;
    /** Sorted per-entry digests (`pscase:sha256:<24>`). */
    readonly entryDigests: readonly string[];
    /** Combined integrity digest over the sorted entry digests. */
    readonly catalogDigest: string;
  };
  /** `psnap:sha256:<24>` over the canonical serialization of everything above. */
  readonly manifestDigest: string;
}

/** One concrete delta between two manifests. Details carry identifiers only. */
export interface ProjectSnapshotDiffFinding {
  readonly section: string;
  readonly kind: 'ADDED' | 'REMOVED' | 'CHANGED' | 'SCHEMA_MISMATCH';
  readonly classification: ProjectSnapshotDiffClassification;
  readonly detail: string;
}

/** Deterministic comparison result. */
export interface ProjectSnapshotDiff {
  readonly classification: ProjectSnapshotDiffClassification;
  readonly findings: readonly ProjectSnapshotDiffFinding[];
}
