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
//   - real-source collection-admission derivation version,
//   - real-source coverage-inventory representation version,
//   - campaign checkpoint schema version (first-class classified slot),
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
 *
 * ENFORCED DELTA RULES (implemented by compare.ts):
 *   - Additive vs removal: additions to any set-valued section, lifecycle
 *     family registry, or adopted-case catalog classify COMPATIBLE_CHANGE;
 *     the corresponding removals classify INCOMPATIBLE_CHANGE. Single version
 *     slots have no additive case: replacement within the same `*.vN` slot
 *     family is SEMANTIC_CHANGE and a lower `.vN` on the same family is an
 *     INCOMPATIBLE_CHANGE downgrade.
 *   - Directionality of the first-class campaignCheckpointVersion slot:
 *     checkpoint-schema evolution (`...private.vN` -> higher `.vM`, or a
 *     different slot family) is SEMANTIC_CHANGE; a checkpoint-schema
 *     downgrade (`.vN` -> lower `.vM` on the same family) is
 *     INCOMPATIBLE_CHANGE because older persisted checkpoints can no longer
 *     be interpreted.
 *   - AUTHORITY_CHANGE has the highest precedence everywhere: owner-scope
 *     marker fields, the approved read-only target registry (expansion AND
 *     revocation), and the ownerScopePolicyVersion campaign-fingerprint key
 *     always classify AUTHORITY_CHANGE regardless of direction.
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
  /**
   * Real-source collection-admission derivation version. Optional; defaults
   * to the authoritative REAL_SOURCE_COLLECTION_DERIVATION_VERSION constant
   * imported from src/oracles/expectations/collectionAdmission.ts.
   */
  readonly collectionAdmissionVersion?: string;
  /**
   * Real-source coverage-inventory representation version. Optional; defaults
   * to PROJECT_SNAPSHOT_DEFAULT_COVERAGE_INVENTORY_VERSION. The Phase 12A
   * coverageInventory module declares no version constant of its own, so the
   * snapshot layer pins the identity for its report shape; callers override
   * explicitly if the owning module later declares one.
   */
  readonly coverageInventoryVersion?: string;
  /**
   * Campaign checkpoint schema version as a first-class compared slot.
   * Optional; defaults to the authoritative CAMPAIGN_CHECKPOINT_VERSION
   * constant imported from src/core/campaign/types.ts.
   */
  readonly campaignCheckpointVersion?: string;
  /** Campaign fingerprint fields (CampaignVersionFingerprint shape). */
  readonly campaignVersions: CampaignVersionFingerprint;
  /** Supported dossier versions (v1 + v2). */
  readonly dossierVersions: readonly string[];
  /** Frozen owner-scope marker constants. */
  readonly ownerScope: ProjectSnapshotOwnerScopeMarker;
  /**
   * Adopted-case catalog entries (integrity digest inputs). Feed the
   * generated pure-data array SELFDEV_ADOPTED_CASES from
   * src/core/selfDev/adoptedCaseCatalog.generated.ts verbatim; each entry is
   * digested individually (`projectSnapshotAdoptedCaseEntryDigest`) and the
   * sorted digest set forms the catalog integrity state.
   */
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
  /** Real-source collection-admission derivation version (normalized slot). */
  readonly collectionAdmissionVersion: string;
  /** Real-source coverage-inventory representation version (normalized slot). */
  readonly coverageInventoryVersion: string;
  /**
   * Campaign checkpoint schema version, compared as a first-class classified
   * slot: schema evolution = SEMANTIC_CHANGE, same-family downgrade =
   * INCOMPATIBLE_CHANGE (see the ENFORCED DELTA RULES above).
   */
  readonly campaignCheckpointVersion: string;
  readonly campaignVersions: CampaignVersionFingerprint;
  /** Sorted, unique. */
  readonly dossierVersions: readonly string[];
  readonly ownerScope: ProjectSnapshotOwnerScopeMarker;
  readonly adoptedCaseCatalog: {
    readonly entryCount: number;
    /**
     * Sorted per-entry digests (`pscase:sha256:<24>`), one per caller-supplied
     * catalog entry (e.g. each SELFDEV_ADOPTED_CASES element). Per-entry
     * digests keep catalog STATE explicit: a single mutated entry changes
     * exactly one digest.
     */
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
