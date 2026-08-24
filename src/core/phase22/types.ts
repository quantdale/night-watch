// ---------------------------------------------------------------------------
// Nightwatch Phase 22 — contained DEV semantic calibration.
//
// These are deliberately boring, data-only types.  A Phase 22 record is safe
// to pass between the source-admission, manifest, preflight, projection and
// owner-review boundaries because it contains identities and bounded classes,
// never an observation payload.
// ---------------------------------------------------------------------------

export const PHASE22_ELIGIBILITY_VERSION = 'nightwatch.phase22-real-eligibility.v1' as const;
export const PHASE22_SOURCE_FRESHNESS_VERSION = 'nightwatch.phase22-source-freshness.v1' as const;
export const PHASE22_DIFFERENTIAL_VERSION = 'nightwatch.phase22-real-differential-eligibility.v1' as const;
export const PHASE22_MANIFEST_VERSION = 'nightwatch.dev-semantic-acceptance-manifest.v1' as const;
export const PHASE22_PREFLIGHT_VERSION = 'nightwatch.dev-preflight-receipt.v2' as const;
export const PHASE22_PRIVACY_VERSION = 'nightwatch.real-observation-privacy.v1' as const;
export const PHASE22_REPLAY_VERSION = 'nightwatch.real-semantic-replay.v4' as const;
export const PHASE22_CALIBRATION_VERSION = 'nightwatch.real-semantic-calibration.v1' as const;
export const PHASE22_DOSSIER_VERSION = 'nightwatch.owner-dossier.v6' as const;
export const PHASE22_DRY_RUN_VERSION = 'nightwatch.dev-semantic-acceptance-dry-run.v1' as const;

export type Phase22EligibilityState =
  | 'SYNTHETIC_ONLY'
  | 'REAL_SOURCE_NO_RUNTIME_BINDING'
  | 'REAL_SOURCE_RUNTIME_BINDING_AVAILABLE'
  | 'REAL_SOURCE_RUNTIME_BINDING_STALE'
  | 'REAL_SOURCE_PROJECTION_UNAVAILABLE'
  | 'REAL_SOURCE_AUTHORITY_BLOCKED'
  | 'REAL_SOURCE_DEV_ACCEPTANCE_ELIGIBLE';

export const PHASE22_ELIGIBILITY_STATES: readonly Phase22EligibilityState[] = [
  'SYNTHETIC_ONLY',
  'REAL_SOURCE_NO_RUNTIME_BINDING',
  'REAL_SOURCE_RUNTIME_BINDING_AVAILABLE',
  'REAL_SOURCE_RUNTIME_BINDING_STALE',
  'REAL_SOURCE_PROJECTION_UNAVAILABLE',
  'REAL_SOURCE_AUTHORITY_BLOCKED',
  'REAL_SOURCE_DEV_ACCEPTANCE_ELIGIBLE',
];

export type Phase22SourceFreshnessState =
  | 'CURRENT_EXACT'
  | 'SOURCE_CHANGED_SEMANTICS_UNCHANGED'
  | 'REDERIVATION_REQUIRED'
  | 'CONTRACT_CHANGED'
  | 'CONTRACT_REMOVED'
  | 'SOURCE_UNAVAILABLE'
  | 'UNSUPPORTED_NOW';

export const PHASE22_SOURCE_FRESHNESS_STATES: readonly Phase22SourceFreshnessState[] = [
  'CURRENT_EXACT',
  'SOURCE_CHANGED_SEMANTICS_UNCHANGED',
  'REDERIVATION_REQUIRED',
  'CONTRACT_CHANGED',
  'CONTRACT_REMOVED',
  'SOURCE_UNAVAILABLE',
  'UNSUPPORTED_NOW',
];

export type Phase22DifferentialEligibility =
  | 'REAL_DIFFERENTIAL_ELIGIBLE'
  | 'NO_REAL_SECOND_SURFACE'
  | 'REAL_SECOND_SURFACE_STALE'
  | 'EQUIVALENCE_NOT_MECHANICALLY_PROVEN'
  | 'PROJECTION_UNAVAILABLE'
  | 'AUTHORITY_BLOCKED';

export const PHASE22_DIFFERENTIAL_STATES: readonly Phase22DifferentialEligibility[] = [
  'REAL_DIFFERENTIAL_ELIGIBLE',
  'NO_REAL_SECOND_SURFACE',
  'REAL_SECOND_SURFACE_STALE',
  'EQUIVALENCE_NOT_MECHANICALLY_PROVEN',
  'PROJECTION_UNAVAILABLE',
  'AUTHORITY_BLOCKED',
];

export type Phase22ReplayOutcome =
  | 'REPRODUCED_EXACT'
  | 'REPRODUCED_SEMANTIC_EQUIVALENT'
  | 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED'
  | 'PRECONDITION_DIVERGENCE'
  | 'OBSERVATION_DIVERGENCE'
  | 'SOURCE_STALE'
  | 'CONTRACT_CHANGED'
  | 'NONDETERMINISTIC'
  | 'NOT_REPRODUCED'
  | 'INVALID';

export const PHASE22_REPLAY_OUTCOMES: readonly Phase22ReplayOutcome[] = [
  'REPRODUCED_EXACT',
  'REPRODUCED_SEMANTIC_EQUIVALENT',
  'REPRESENTATION_CHANGED_CONTRACT_PRESERVED',
  'PRECONDITION_DIVERGENCE',
  'OBSERVATION_DIVERGENCE',
  'SOURCE_STALE',
  'CONTRACT_CHANGED',
  'NONDETERMINISTIC',
  'NOT_REPRODUCED',
  'INVALID',
];

export type Phase22CalibrationCategory =
  | 'SYNTHETIC_MODEL_CALIBRATED'
  | 'REAL_BEHAVIOR_BROADER_BUT_CONTRACT_VALID'
  | 'REAL_BEHAVIOR_NARROWER_BUT_CONTRACT_VALID'
  | 'PROJECTION_MODEL_INCOMPLETE'
  | 'CONTRACT_NOT_APPLICABLE_REAL'
  | 'SEMANTIC_MISMATCH'
  | 'INSUFFICIENT_EVIDENCE';

export const PHASE22_CALIBRATION_CATEGORIES: readonly Phase22CalibrationCategory[] = [
  'SYNTHETIC_MODEL_CALIBRATED',
  'REAL_BEHAVIOR_BROADER_BUT_CONTRACT_VALID',
  'REAL_BEHAVIOR_NARROWER_BUT_CONTRACT_VALID',
  'PROJECTION_MODEL_INCOMPLETE',
  'CONTRACT_NOT_APPLICABLE_REAL',
  'SEMANTIC_MISMATCH',
  'INSUFFICIENT_EVIDENCE',
];

export type Phase22Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';

export type Phase22AllowedObservationClass = 'READ_ONLY_API' | 'READ_ONLY_BROWSER' | 'READ_ONLY_API_AND_BROWSER';

export type Phase22SemanticMaterialClass =
  | 'COLLECTION'
  | 'MEMBERSHIP'
  | 'RELATIONAL'
  | 'DIFFERENTIAL'
  | 'SHAPE'
  | 'PROTOCOL';

export interface Phase22SourceIdentity {
  readonly repoId: string;
  readonly sha: string;
  readonly evidenceDigest: string;
}

export interface Phase22SourceFreshnessEvidence {
  readonly bound: Phase22SourceIdentity;
  readonly observed: Phase22SourceIdentity | null;
  readonly sourceAvailable: boolean;
  readonly contractPresent: boolean;
  readonly derivationSupported: boolean;
  readonly derivationEvidenceMatches: boolean;
  readonly semanticsUnchanged: boolean;
}

export interface Phase22ReplayExpectation {
  readonly required: true;
  readonly maxAdditionalContexts: 1;
  readonly freshContext: true;
  readonly allowedOutcomes: readonly Phase22ReplayOutcome[];
}

export interface Phase22ObservationPolicy {
  readonly allowedObservationClass: Phase22AllowedObservationClass;
  readonly mutationAllowed: false;
  readonly maxFirstObservations: 1;
  readonly maxReplayObservations: 1;
  readonly dynamicTargetDiscovery: false;
}

export interface Phase22ManifestTarget {
  readonly targetId: string;
  readonly product: string;
  readonly journeyOrApiAdapter: string;
  readonly semanticContractId: string;
  readonly expectationId: string;
  readonly source: Phase22SourceIdentity;
  readonly projectionIdentity: string;
  readonly differentialPairId: string | null;
  readonly replay: Phase22ReplayExpectation;
  readonly observation: Phase22ObservationPolicy;
  readonly anticipatedInvariantCount: number;
  readonly requiredPreflightChecks: readonly string[];
  readonly materialClass: Phase22SemanticMaterialClass;
  readonly historicalDevEvidence: boolean;
  readonly selectionPriority: number;
}

export interface Phase22ManifestExclusion {
  readonly targetId: string;
  readonly eligibility: Phase22EligibilityState;
  readonly reasonCode: string;
}

export interface Phase22DevAcceptanceManifest {
  readonly schemaVersion: typeof PHASE22_MANIFEST_VERSION;
  readonly manifestId: string;
  readonly nightwatchSha: string;
  readonly environment: 'DEV';
  readonly maxTargets: 6;
  readonly maxObservationContexts: 12;
  readonly frozen: true;
  readonly targets: readonly Phase22ManifestTarget[];
  readonly exclusions: readonly Phase22ManifestExclusion[];
  readonly deterministicDigest: string;
}

export interface Phase22PreflightCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly required: true;
}

export interface Phase22PreflightReceipt {
  readonly schemaVersion: typeof PHASE22_PREFLIGHT_VERSION;
  readonly receiptId: string;
  readonly environment: 'DEV';
  readonly passed: boolean;
  readonly checks: readonly Phase22PreflightCheck[];
  readonly targetCount: number;
  readonly plannedObservationContexts: number;
  readonly manifestDigest: string;
  readonly deterministicDigest: string;
}

export type Phase22Presence = 'PRESENT' | 'ABSENT';
export type Phase22TypeClass = 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY' | 'UNKNOWN';
export type Phase22CardinalityClass = 'EMPTY' | 'SINGLE' | 'FEW' | 'MANY' | 'UNKNOWN';
export type Phase22MembershipOutcome = 'MEMBER' | 'NOT_MEMBER' | 'NOT_APPLICABLE' | 'UNKNOWN';
export type Phase22RelationOutcome = 'HOLDS' | 'VIOLATED' | 'NOT_APPLICABLE' | 'UNKNOWN';
export type Phase22DifferentialOutcome = 'EXACT_EQUIVALENT' | 'SEMANTICALLY_EQUIVALENT' | 'EXPECTED_DIFFERENCE' | 'CONTRACT_VIOLATION' | 'NOT_APPLICABLE' | 'UNKNOWN';
export type Phase22OrderingCategory = 'STABLE' | 'CHANGED' | 'NOT_APPLICABLE' | 'UNKNOWN';

export interface Phase22SafeObservation {
  readonly schemaVersion: typeof PHASE22_PRIVACY_VERSION;
  readonly presence?: Phase22Presence;
  readonly typeClass?: Phase22TypeClass;
  readonly cardinalityClass?: Phase22CardinalityClass;
  readonly membershipOutcome?: Phase22MembershipOutcome;
  readonly relationOutcome?: Phase22RelationOutcome;
  readonly differentialOutcome?: Phase22DifferentialOutcome;
  readonly orderingCategory?: Phase22OrderingCategory;
  readonly inspectedItemCount?: number;
  readonly violatingItemCount?: number;
  readonly projectionDigest?: string;
  readonly evidenceDigest?: string;
}

export interface Phase22PrivacyReceipt {
  readonly schemaVersion: typeof PHASE22_PRIVACY_VERSION;
  readonly receiptId: string;
  readonly approvedCategoryCount: number;
  readonly rejectedEventCount: number;
  readonly rawPersistenceCount: 0;
  readonly deterministicDigest: string;
}

export interface Phase22RealTargetResult {
  readonly targetId: string;
  readonly expectationId: string;
  readonly materialClass: Phase22SemanticMaterialClass;
  readonly collectionEvaluated: boolean;
  readonly membershipEvaluated: boolean;
  readonly sourceCurrent: boolean;
  readonly expectationResolved: boolean;
  readonly firstOutcome: 'PASS' | 'ANOMALY' | 'PARTIAL' | 'NOT_APPLICABLE' | 'INTERNAL_ERROR';
  readonly replayOutcome: Phase22ReplayOutcome;
  readonly semanticDeterministic: boolean;
  readonly differentialOutcome: Phase22DifferentialOutcome | null;
  readonly coverage: 'FULL' | 'PARTIAL' | 'NOT_APPLICABLE';
  readonly projectionSucceeded: boolean;
  readonly privacyPassed: boolean;
  readonly protocolPassed: boolean;
  readonly findingCount: number;
  readonly calibration: Phase22CalibrationCategory;
  readonly confidence: Phase22Confidence;
}

export interface Phase22CalibrationMetrics {
  readonly schemaVersion: typeof PHASE22_CALIBRATION_VERSION;
  readonly targetsConsidered: number;
  readonly targetsEligible: number;
  readonly targetsAdmitted: number;
  readonly targetsObserved: number;
  readonly expectationsResolved: number;
  readonly decisiveEvaluations: number;
  readonly partialEvaluations: number;
  readonly notApplicableEvaluations: number;
  readonly semanticViolations: number;
  readonly protocolViolations: number;
  readonly exactReproductions: number;
  readonly semanticEquivalentReproductions: number;
  readonly divergentReplays: number;
  readonly realDifferentialPairsEvaluated: number;
  readonly membershipEvaluations: number;
  readonly collectionEvaluations: number;
  readonly productMismatches: number;
  readonly privacyEvents: number;
  readonly safetyEvents: number;
  readonly deterministicDigest: string;
}

export interface Phase22DryRunResult {
  readonly schemaVersion: typeof PHASE22_DRY_RUN_VERSION;
  readonly manifestDigest: string;
  readonly targetCount: number;
  readonly firstObservationCount: number;
  readonly replayObservationCount: number;
  readonly observationContextCount: number;
  readonly externalContact: false;
  readonly mutationCount: 0;
  readonly privacyReceipt: Phase22PrivacyReceipt;
  readonly preflightPassed: true;
  readonly deterministicDigest: string;
}

export const PHASE22_REQUIRED_PREFLIGHT_CHECKS: readonly string[] = [
  'environment_dev',
  'production_rejected',
  'next_rejected',
  'l0_cdp_guard_active',
  'l1_route_guard_active',
  'l2_websocket_guard_active',
  'l3_worker_containment_active',
  'l4_unrouted_detection_active',
  'l5_loopback_proxy_active',
  'quic_disabled',
  'non_proxied_webrtc_disabled',
  'trace_disabled',
  'screenshots_disabled',
  'raw_response_persistence_disabled',
  'raw_dom_persistence_disabled',
  'mutation_registry_active',
  'storage_state_external',
  'storage_state_regular_file',
  'storage_state_no_symlink',
  'storage_state_restrictive_permissions',
  'auth_structurally_valid',
  'auth_unexpired',
  'auth_page_readable',
  'source_current',
  'expectation_resolved',
  'journey_api_adapter_current',
  'owner_policy_allows',
  'no_database_or_infra_path',
  'clean_nightwatch_git_state',
  'manifest_frozen',
  'dry_run_passed',
];
