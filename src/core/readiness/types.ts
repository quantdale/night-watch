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
//   - external CI state CATEGORY (never measured live; supplied by callers)
//     enriched by a table-driven classification separating executed-FAIL from
//     UNMEASURED_UNKNOWN and EXTERNALLY_BLOCKED,
//   - mechanical-analyzer status section (pinned MECHANICAL_ANALYZER_VERSION +
//     caller-supplied availability category) with its own blocker kind and
//     blocking category when unavailable or version-drifted,
//   - deferred verification state (testing/typecheck/hardening as categorical
//     DEFERRED_TO_HARDENING / NOT_MEASURED values — never fabricated PASS/FAIL),
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
  | 'BLOCKED_ANALYZER'
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

/**
 * External-CI classification vocabulary. Three very different non-PASS states
 * are deliberately kept apart:
 *   - EXECUTED_FAIL      the CI ran and was red (a real executed failure);
 *   - UNMEASURED_UNKNOWN no recorded run exists at all (honest unknown — never
 *                        a failure and never a pass);
 *   - EXTERNALLY_BLOCKED the run could not execute (blocked outside this
 *                        repository's control).
 */
export type LocalReadinessExternalCiClassification =
  | 'EXECUTED_PASS'
  | 'EXECUTED_FAIL'
  | 'UNMEASURED_UNKNOWN'
  | 'EXTERNALLY_BLOCKED';

/** One table row of the documented external-CI classification derivation. */
export interface LocalReadinessExternalCiClassificationRule {
  readonly ci: LocalReadinessExternalCi;
  readonly classification: LocalReadinessExternalCiClassification;
  /** Whether this classification blocks the readiness category. */
  readonly blocksCategory: boolean;
}

/**
 * Table-driven external-CI classification (the ONLY place CI value semantics
 * live). Every ExternalCi value must own exactly one row; classification and
 * blocking behavior are read from this table, never re-branched inline.
 */
export const LOCAL_READINESS_EXTERNAL_CI_CLASSIFICATION_TABLE: readonly LocalReadinessExternalCiClassificationRule[] = Object.freeze([
  { ci: 'PASS', classification: 'EXECUTED_PASS', blocksCategory: false },
  { ci: 'FAIL', classification: 'EXECUTED_FAIL', blocksCategory: true },
  { ci: 'UNKNOWN', classification: 'UNMEASURED_UNKNOWN', blocksCategory: false },
  { ci: 'BLOCKED_EXTERNAL_CI', classification: 'EXTERNALLY_BLOCKED', blocksCategory: true },
]);

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
 * Blocker kinds map 1:1 onto the blocking readiness categories (see
 * LOCAL_READINESS_BLOCKER_KIND_CATEGORIES). A blocker that fits none of these
 * kinds must be categorized by the caller; the core fails closed on unknown
 * kinds rather than guessing.
 */
export type LocalReadinessBlockerKind =
  | 'AUTHORITY'
  | 'SOURCE'
  | 'VERSION'
  | 'ANALYZER'
  | 'EXTERNAL_CI';

export const LOCAL_READINESS_BLOCKER_KINDS: readonly LocalReadinessBlockerKind[] = [
  'AUTHORITY',
  'SOURCE',
  'VERSION',
  'ANALYZER',
  'EXTERNAL_CI',
];

/**
 * Table-driven blocker-kind -> blocking-category mapping (the ONLY place this
 * mapping lives). Compile-time exhaustive over blocker kinds, so a new kind
 * cannot silently lack a category.
 */
export const LOCAL_READINESS_BLOCKER_KIND_CATEGORIES: Readonly<
  Record<LocalReadinessBlockerKind, Exclude<LocalReadinessCategory, 'READY_LOCAL_SYNTHETIC' | 'NOT_APPLICABLE'>>
> = Object.freeze({
  AUTHORITY: 'BLOCKED_AUTHORITY',
  SOURCE: 'BLOCKED_SOURCE',
  VERSION: 'BLOCKED_VERSION',
  ANALYZER: 'BLOCKED_ANALYZER',
  EXTERNAL_CI: 'BLOCKED_EXTERNAL_CI',
});

// --- mechanical-analyzer status section -------------------------------------

/** Caller-supplied mechanical-analyzer availability category. */
export type LocalReadinessAnalyzerAvailability =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'NOT_EVALUATED';

export const LOCAL_READINESS_ANALYZER_AVAILABILITY_VALUES: readonly LocalReadinessAnalyzerAvailability[] = [
  'AVAILABLE',
  'UNAVAILABLE',
  'NOT_EVALUATED',
];

export interface LocalReadinessAnalyzerInput {
  /**
   * Availability category supplied by the caller; absent = NOT_EVALUATED
   * (honest unknown). UNAVAILABLE blocks with blocker kind ANALYZER.
   */
  readonly availability?: LocalReadinessAnalyzerAvailability;
  /**
   * Analyzer version actually observed by the caller (e.g. stamped on derived
   * artifacts); null = unmeasured. Never defaulted to the pinned constant —
   * claiming an unmeasured match would fabricate verification evidence.
   */
  readonly observedVersion: string | null;
}

/** First-class analyzer status section of the summary model. */
export interface LocalReadinessAnalyzerSection {
  /** Authoritative pinned constant MECHANICAL_ANALYZER_VERSION. */
  readonly pinnedVersion: string;
  /** Caller-observed version; null = unmeasured (never fabricated). */
  readonly observedVersion: string | null;
  /** Normalized availability; never undefined in the summary. */
  readonly availability: LocalReadinessAnalyzerAvailability;
  /** null = comparison unmeasured; otherwise observedVersion === pinnedVersion. */
  readonly versionConsistent: boolean | null;
  /** true exactly when availability is UNAVAILABLE or versions drift. */
  readonly blocked: boolean;
}

// --- deferred verification state section ------------------------------------

/** Verification dimensions tracked by the readiness surface. */
export type LocalReadinessVerificationDimension = 'TESTING' | 'TYPECHECK' | 'HARDENING';

export const LOCAL_READINESS_VERIFICATION_DIMENSIONS: readonly LocalReadinessVerificationDimension[] = [
  'TESTING',
  'TYPECHECK',
  'HARDENING',
];

/**
 * Categorical verification state. There is deliberately NO PASS/FAIL value:
 * this surface never fabricates verification results. DEFERRED_TO_HARDENING
 * records an explicit owner-direction deferment (validation intentionally not
 * run here); NOT_MEASURED records absence of any measurement or directive.
 */
export type LocalReadinessDeferredVerification = 'DEFERRED_TO_HARDENING' | 'NOT_MEASURED';

export const LOCAL_READINESS_DEFERRED_VERIFICATION_VALUES: readonly LocalReadinessDeferredVerification[] = [
  'DEFERRED_TO_HARDENING',
  'NOT_MEASURED',
];

export interface LocalReadinessVerificationInput {
  /**
   * State per dimension; absent dimensions default to NOT_MEASURED. Unknown
   * dimensions or states fail closed. Categorical values only — never a
   * fabricated PASS/FAIL.
   */
  readonly statesByDimension?: Readonly<
    Partial<Record<LocalReadinessVerificationDimension, LocalReadinessDeferredVerification>>
  >;
}

/** Deferred-verification section of the summary model (never blocks). */
export interface LocalReadinessVerificationSection {
  /** Fully populated state record, canonical dimension order. */
  readonly statesByDimension: Readonly<
    Record<LocalReadinessVerificationDimension, LocalReadinessDeferredVerification>
  >;
  /** Dimensions in DEFERRED_TO_HARDENING, canonical order. */
  readonly deferredDimensions: readonly LocalReadinessVerificationDimension[];
  /** Dimensions in NOT_MEASURED, canonical order. */
  readonly notMeasuredDimensions: readonly LocalReadinessVerificationDimension[];
  readonly allDeferredToHardening: boolean;
}

// --- authenticated capability lifecycle section (F-21) ----------------------
//
// The authenticated lanes depend on an external, human-led capture that
// expires. This section makes the artefact's lifecycle state visible on the
// local readiness surface WITHOUT flipping the local-synthetic category:
// present-and-expired is a different fact from absent, and both differ from
// unknown, so the state vocabulary keeps them apart. Inputs are normalized
// facts collected elsewhere; the core stays pure.

export type LocalReadinessAuthCapabilityState =
  | 'VALID'
  | 'EXPIRED'
  | 'WRONG_ENVIRONMENT'
  | 'UNKNOWN_AGE'
  | 'MISSING'
  | 'UNREADABLE'
  | 'NOT_EVALUATED';

export const LOCAL_READINESS_AUTH_CAPABILITY_STATES: readonly LocalReadinessAuthCapabilityState[] = [
  'VALID',
  'EXPIRED',
  'WRONG_ENVIRONMENT',
  'UNKNOWN_AGE',
  'MISSING',
  'UNREADABLE',
  'NOT_EVALUATED',
];

export type LocalReadinessAuthEpistemicClass = 'FACT' | 'UNKNOWN';

/**
 * Coarse remaining-validity band. Deliberately categorical: a readiness
 * snapshot is compared byte-for-byte between runs, and an exact millisecond
 * countdown would make every snapshot different for a reason that carries no
 * operator information. Exact remaining validity is reported by the
 * observe:preflight and c12:preflight surfaces.
 */
export type LocalReadinessAuthValidityBand =
  | 'NONE'
  | 'UNDER_1H'
  | 'UNDER_6H'
  | 'UNDER_12H'
  | 'AT_LEAST_12H'
  | 'UNKNOWN';

export const LOCAL_READINESS_AUTH_VALIDITY_BANDS: readonly LocalReadinessAuthValidityBand[] = [
  'NONE',
  'UNDER_1H',
  'UNDER_6H',
  'UNDER_12H',
  'AT_LEAST_12H',
  'UNKNOWN',
];

export interface LocalReadinessAuthCapabilityEntryInput {
  readonly environment: string;
  readonly present: boolean;
  readonly state: LocalReadinessAuthCapabilityState;
  readonly captureInstant?: string | null;
  readonly declaredValidUntil?: string | null;
  readonly remainingValidityMs?: number | null;
  readonly refusalCode?: string | null;
  readonly blockedLanes?: readonly string[];
}

export interface LocalReadinessAuthCapabilityInput {
  readonly entries: readonly LocalReadinessAuthCapabilityEntryInput[];
}

export interface LocalReadinessAuthCapabilityEntry {
  readonly environment: string;
  readonly present: boolean;
  readonly state: LocalReadinessAuthCapabilityState;
  readonly epistemicClass: LocalReadinessAuthEpistemicClass;
  readonly captureInstant: string | null;
  readonly declaredValidUntil: string | null;
  readonly remainingValidityBand: LocalReadinessAuthValidityBand;
  readonly refusalCode: string | null;
  readonly blockedLanes: readonly string[];
}

export interface LocalReadinessAuthCapabilitySection {
  /** One entry per known environment, sorted by environment. */
  readonly entries: readonly LocalReadinessAuthCapabilityEntry[];
  /** Environments whose artefact exists but is EXPIRED (present ≠ absent). */
  readonly presentAndExpiredEnvironments: readonly string[];
  /** VALID when every entry is valid; ATTENTION on any non-valid fact; UNKNOWN when no entry was supplied. */
  readonly aggregateState: 'VALID' | 'ATTENTION' | 'UNKNOWN';
}

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
  /** Optional analyzer status; absent = honest NOT_EVALUATED unknowns. */
  readonly analyzer?: LocalReadinessAnalyzerInput;
  /**
   * Optional deferred-verification state; absent dimensions default to
   * NOT_MEASURED (never fabricated PASS/FAIL).
   */
  readonly verification?: LocalReadinessVerificationInput;
  /**
   * Optional authenticated-capability facts. Absent = no environment was
   * evaluated (UNKNOWN section), never a fabricated VALID.
   */
  readonly authCapability?: LocalReadinessAuthCapabilityInput;
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
  /** Analyzer status section (pinned constant + caller-supplied availability). */
  readonly analyzer: LocalReadinessAnalyzerSection;
  /** Deferred verification state (categorical; never fabricated PASS/FAIL). */
  readonly verification: LocalReadinessVerificationSection;
  /**
   * Authenticated capability lifecycle state per environment. Present-and-
   * expired is NOT normalized into absent: the epistemic distinction is the
   * operator's answer to "do I need to re-capture, or is the lane simply
   * unavailable?".
   */
  readonly authCapability: LocalReadinessAuthCapabilitySection;
  /** Normalized blockers, sorted by kind order then code. */
  readonly unresolvedBlockers: readonly LocalReadinessBlocker[];
  readonly externalCi: LocalReadinessExternalCi;
  /** Table-derived CI classification (EXECUTED_FAIL vs UNKNOWN vs blocked). */
  readonly externalCiClassification: LocalReadinessExternalCiClassification;
  readonly ownerScope: LocalReadinessOwnerScopeSummary;
}
