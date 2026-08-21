// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 — local project health / readiness model.
//
// ONE deterministic model (`LocalReadinessSummary`) summarizing the LOCAL
// readiness surface of the Nightwatch repository itself:
//
//   - source-contract health (contract lifecycle registry families),
//   - currentness categories (caller-supplied, categorical only),
//   - approved target coverage,
//   - campaign readiness (campaign version fingerprint inputs),
//   - checkpoint compatibility categories,
//   - unresolved blockers (categorical codes only),
//   - external CI state CATEGORY (never measured live; supplied by callers),
//   - owner-scope restrictions (frozen owner markers).
//
// The core is PURE: no fs, no network, no child processes, no environment
// access, no persistence, no timestamps in identity-bearing data. Callers
// supply what to summarize through `LocalReadinessInput`; both renderers
// (JSON and text) derive from the single summary model. Readiness categories
// never claim DEV or production readiness from local state: the only positive
// category is READY_LOCAL_SYNTHETIC and the ready claim is fixed to
// LOCAL_SYNTHETIC_ONLY.
// ---------------------------------------------------------------------------

/** Model identity version (load-bearing for later waves). */
export const LOCAL_READINESS_MODEL_VERSION = 'nightwatch.local-readiness.v1' as const;

/**
 * Exact readiness vocabulary. There is deliberately NO DEV/PRODUCTION-ready
 * category: local state can never authorize such a claim.
 */
export type LocalReadinessCategory =
  | 'READY_LOCAL_SYNTHETIC'
  | 'BLOCKED_SOURCE'
  | 'BLOCKED_VERSION'
  | 'BLOCKED_AUTHORITY'
  | 'BLOCKED_EXTERNAL_CI'
  | 'NOT_APPLICABLE';

/** Fixed scope marker carried by every summary. */
export type LocalReadinessScope = 'LOCAL_SYNTHETIC';

/** Fixed ready-claim marker: summaries are always scoped this narrowly. */
export type LocalReadinessReadyClaim = 'LOCAL_SYNTHETIC_ONLY';

/** Caller-supplied currentness categories per approved target. */
export type LocalReadinessCurrentness =
  | 'CURRENT'
  | 'STALE'
  | 'SOURCE_UNAVAILABLE'
  | 'NOT_EVALUATED';

export const LOCAL_READINESS_CURRENTNESS_VALUES: readonly LocalReadinessCurrentness[] = [
  'CURRENT',
  'STALE',
  'SOURCE_UNAVAILABLE',
  'NOT_EVALUATED',
];

/**
 * External CI state CATEGORY. Never a live measurement: the value is supplied
 * by callers (e.g. recorded from a prior GitHub Actions run they inspected).
 */
export type LocalReadinessExternalCi =
  | 'PASS'
  | 'FAIL'
  | 'UNKNOWN'
  | 'BLOCKED_EXTERNAL_CI';

export const LOCAL_READINESS_EXTERNAL_CI_VALUES: readonly LocalReadinessExternalCi[] = [
  'PASS',
  'FAIL',
  'UNKNOWN',
  'BLOCKED_EXTERNAL_CI',
];

/** Checkpoint compatibility categories (categorical; no checkpoint payloads). */
export type LocalReadinessCheckpointCompatibility =
  | 'CURRENT_SCHEMA'
  | 'LEGACY_PRE_S2_RUNTIME_CONTRACTS'
  | 'INCOMPATIBLE'
  | 'UNKNOWN';

export const LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES: readonly LocalReadinessCheckpointCompatibility[] = [
  'CURRENT_SCHEMA',
  'LEGACY_PRE_S2_RUNTIME_CONTRACTS',
  'INCOMPATIBLE',
  'UNKNOWN',
];

/**
 * Blocker kinds map 1:1 onto the blocking readiness categories. A blocker
 * that fits none of these kinds must be categorized by the caller; the core
 * fails closed on unknown kinds rather than guessing.
 */
export type LocalReadinessBlockerKind =
  | 'AUTHORITY'
  | 'SOURCE'
  | 'VERSION'
  | 'EXTERNAL_CI';

export const LOCAL_READINESS_BLOCKER_KINDS: readonly LocalReadinessBlockerKind[] = [
  'AUTHORITY',
  'SOURCE',
  'VERSION',
  'EXTERNAL_CI',
];

export interface LocalReadinessBlocker {
  /** Categorical code, /^[A-Z][A-Z0-9_]*$/ (no free text). */
  readonly code: string;
  readonly kind: LocalReadinessBlockerKind;
  /** Optional bounded categorical detail; privacy-screened (fail-closed). */
  readonly detail?: string;
}

/**
 * Privacy-safe projection of one contract lifecycle registry family. Only
 * structural flags cross the boundary — never recipe bodies, source values,
 * or evidence digests.
 */
export interface LocalReadinessContractFamily {
  readonly familyId: string;
  readonly targetId: string;
  /** Registry family kind verbatim (summarized by count, never branched on). */
  readonly kind: string;
  readonly hasExpectationId: boolean;
  readonly campaignEligible: boolean;
  readonly historicalImmutable: boolean;
}

export interface LocalReadinessSourceContractsInput {
  readonly approvedTargetIds: readonly string[];
  readonly families: readonly LocalReadinessContractFamily[];
  /** Currentness categories for known targets; absent means NOT_EVALUATED. */
  readonly currentnessByTargetId: Readonly<Record<string, LocalReadinessCurrentness>>;
}

export interface LocalReadinessCampaignInput {
  /** Version fingerprint keys pinned by authoritative source constants. */
  readonly pinnedVersions: Readonly<Record<string, string>>;
  /** Runtime-observed versions when actually measured; null = unmeasured. */
  readonly observedVersions: Readonly<Record<string, string>> | null;
}

export interface LocalReadinessOwnerScopeInput {
  readonly status: string;
  readonly reason: string;
  readonly frozenOperationCount: number;
}

export interface LocalReadinessInput {
  /** false short-circuits the verdict to NOT_APPLICABLE (still summarized). */
  readonly applies: boolean;
  readonly sourceContracts: LocalReadinessSourceContractsInput;
  readonly campaign: LocalReadinessCampaignInput;
  readonly checkpointCompatibility: LocalReadinessCheckpointCompatibility;
  readonly unresolvedBlockers: readonly LocalReadinessBlocker[];
  readonly externalCi: LocalReadinessExternalCi;
  readonly ownerScope: LocalReadinessOwnerScopeInput;
}

// --- summary model (the ONE model both renderers derive from) --------------

export interface LocalReadinessContractHealth {
  readonly totalFamilies: number;
  readonly activeFamilies: number;
  readonly archivedFamilies: number;
  /** Kind -> count, keys sorted ascending. */
  readonly familiesByKind: Readonly<Record<string, number>>;
  readonly approvedTargets: number;
  readonly targetsWithActiveFamily: number;
  /** Approved targets with zero active families, sorted. */
  readonly targetsMissingActiveFamily: readonly string[];
  /** Family targetIds not in approvedTargetIds, sorted, deduplicated. */
  readonly unknownFamilyTargets: readonly string[];
  /** Active, expectation-bearing, campaign-eligible families. */
  readonly campaignEligibleExpectationFamilies: number;
  readonly currentnessCounts: Readonly<Record<LocalReadinessCurrentness, number>>;
  /** Approved targets without a currentness entry, sorted. */
  readonly currentnessUnevaluatedTargets: readonly string[];
  readonly staleTargets: readonly string[];
  readonly unavailableTargets: readonly string[];
}

export type LocalReadinessTargetCoverage = 'COVERED' | 'PARTIAL' | 'MISSING';

export interface LocalReadinessTargetCoverageEntry {
  readonly targetId: string;
  readonly coverage: LocalReadinessTargetCoverage;
  readonly activeFamilies: number;
  readonly currentness: LocalReadinessCurrentness;
}

export interface LocalReadinessCampaignSummary {
  readonly category: 'PINNED_CONSISTENT' | 'DRIFT_DETECTED' | 'UNMEASURED';
  /** Keys compared between pinned and observed, sorted. */
  readonly comparedKeys: readonly string[];
  /** Keys present on both sides with different values, sorted. */
  readonly driftKeys: readonly string[];
  readonly unmeasured: boolean;
}

export interface LocalReadinessOwnerScopeSummary {
  readonly status: string;
  readonly reason: string;
  readonly frozenOperationCount: number;
  /** true exactly when status/reason/count match the frozen policy markers. */
  readonly matchesFrozenMarkers: boolean;
}

export interface LocalReadinessSummary {
  readonly modelVersion: typeof LOCAL_READINESS_MODEL_VERSION;
  readonly scope: LocalReadinessScope;
  readonly readyClaim: LocalReadinessReadyClaim;
  readonly category: LocalReadinessCategory;
  readonly applies: boolean;
  readonly sourceContracts: LocalReadinessContractHealth;
  /** One entry per approved target, sorted by targetId. */
  readonly approvedTargetCoverage: readonly LocalReadinessTargetCoverageEntry[];
  readonly campaign: LocalReadinessCampaignSummary;
  readonly checkpointCompatibility: LocalReadinessCheckpointCompatibility;
  /** Normalized blockers, sorted by kind order then code. */
  readonly unresolvedBlockers: readonly LocalReadinessBlocker[];
  readonly externalCi: LocalReadinessExternalCi;
  readonly ownerScope: LocalReadinessOwnerScopeSummary;
}
