import type {
  SafeControlCenterCode,
  SafeControlCenterLabel,
  SafeControlCenterId,
  SafeControlCenterTimestamp,
} from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_READINESS_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.readiness.v1` as const;

export type ControlCenterReadinessCategory =
  | 'READY_LOCAL_SYNTHETIC'
  | 'BLOCKED_SOURCE'
  | 'BLOCKED_VERSION'
  | 'BLOCKED_ANALYZER'
  | 'BLOCKED_AUTHORITY'
  | 'BLOCKED_EXTERNAL_CI'
  | 'NOT_APPLICABLE';

export type ControlCenterReadinessCurrentness = 'CURRENT' | 'STALE' | 'SOURCE_UNAVAILABLE' | 'NOT_EVALUATED';
export type ControlCenterReadinessExternalCi = 'PASS' | 'FAIL' | 'UNKNOWN' | 'BLOCKED_EXTERNAL_CI';
export type ControlCenterReadinessExternalCiClassification =
  | 'EXECUTED_PASS'
  | 'EXECUTED_FAIL'
  | 'UNMEASURED_UNKNOWN'
  | 'EXTERNALLY_BLOCKED';
export type ControlCenterReadinessCheckpoint =
  | 'CURRENT_SCHEMA'
  | 'LEGACY_PRE_S2_RUNTIME_CONTRACTS'
  | 'INCOMPATIBLE'
  | 'UNKNOWN';
export type ControlCenterReadinessBlockerKind = 'AUTHORITY' | 'SOURCE' | 'VERSION' | 'ANALYZER' | 'EXTERNAL_CI';
export type ControlCenterReadinessAnalyzerAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_EVALUATED';
export type ControlCenterReadinessVerificationState = 'DEFERRED_TO_HARDENING' | 'NOT_MEASURED';
export type ControlCenterReadinessAuthState =
  | 'VALID'
  | 'EXPIRED'
  | 'WRONG_ENVIRONMENT'
  | 'UNKNOWN_AGE'
  | 'MISSING'
  | 'UNREADABLE'
  | 'NOT_EVALUATED';
export type ControlCenterReadinessAuthEpistemicClass = 'FACT' | 'UNKNOWN';
export type ControlCenterReadinessAuthValidityBand =
  | 'NONE'
  | 'UNDER_1H'
  | 'UNDER_6H'
  | 'UNDER_12H'
  | 'AT_LEAST_12H'
  | 'UNKNOWN';

export interface ControlCenterReadinessBlockerDto {
  readonly code: SafeControlCenterCode;
  readonly kind: ControlCenterReadinessBlockerKind;
  readonly detailCode: SafeControlCenterCode | null;
}

export interface ControlCenterReadinessContractHealthDto {
  readonly totalFamilies: number;
  readonly activeFamilies: number;
  readonly archivedFamilies: number;
  readonly familiesByKind: readonly { readonly kind: SafeControlCenterCode; readonly count: number }[];
  readonly approvedTargets: number;
  readonly targetsWithActiveFamily: number;
  readonly targetsMissingActiveFamily: readonly SafeControlCenterId[];
  readonly unknownFamilyTargets: readonly SafeControlCenterId[];
  readonly campaignEligibleExpectationFamilies: number;
  readonly currentnessCounts: Readonly<Record<ControlCenterReadinessCurrentness, number>>;
  readonly currentnessUnevaluatedTargets: readonly SafeControlCenterId[];
  readonly staleTargets: readonly SafeControlCenterId[];
  readonly unavailableTargets: readonly SafeControlCenterId[];
}

export type ControlCenterReadinessTargetCoverage = 'COVERED' | 'PARTIAL' | 'MISSING';

export interface ControlCenterReadinessTargetCoverageDto {
  readonly targetId: SafeControlCenterId;
  readonly coverage: ControlCenterReadinessTargetCoverage;
  readonly activeFamilies: number;
  readonly currentness: ControlCenterReadinessCurrentness;
}

export interface ControlCenterReadinessCampaignDto {
  readonly category: 'PINNED_CONSISTENT' | 'DRIFT_DETECTED' | 'UNMEASURED';
  readonly comparedKeys: readonly SafeControlCenterId[];
  readonly driftKeys: readonly SafeControlCenterId[];
  readonly unmeasured: boolean;
}

export interface ControlCenterReadinessAnalyzerDto {
  readonly pinnedVersion: SafeControlCenterLabel;
  readonly observedVersion: SafeControlCenterLabel | null;
  readonly availability: ControlCenterReadinessAnalyzerAvailability;
  readonly versionConsistent: boolean | null;
  readonly blocked: boolean;
}

export interface ControlCenterReadinessVerificationDto {
  readonly statesByDimension: Readonly<Record<'TESTING' | 'TYPECHECK' | 'HARDENING', ControlCenterReadinessVerificationState>>;
  readonly deferredDimensions: readonly ('TESTING' | 'TYPECHECK' | 'HARDENING')[];
  readonly notMeasuredDimensions: readonly ('TESTING' | 'TYPECHECK' | 'HARDENING')[];
  readonly allDeferredToHardening: boolean;
}

export interface ControlCenterReadinessAuthCapabilityEntryDto {
  readonly environment: SafeControlCenterId;
  readonly present: boolean;
  readonly state: ControlCenterReadinessAuthState;
  readonly epistemicClass: ControlCenterReadinessAuthEpistemicClass;
  readonly captureInstant: SafeControlCenterTimestamp | null;
  readonly declaredValidUntil: SafeControlCenterTimestamp | null;
  readonly remainingValidityBand: ControlCenterReadinessAuthValidityBand;
  readonly refusalCode: SafeControlCenterCode | null;
  readonly blockedLanes: readonly SafeControlCenterId[];
}

export interface ControlCenterReadinessAuthCapabilityDto {
  readonly entries: readonly ControlCenterReadinessAuthCapabilityEntryDto[];
  readonly presentAndExpiredEnvironments: readonly SafeControlCenterId[];
  readonly aggregateState: 'VALID' | 'ATTENTION' | 'UNKNOWN';
}

export interface ControlCenterReadinessOwnerScopeDto {
  readonly status: 'FROZEN_BY_OWNER';
  readonly reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  readonly frozenOperationCount: number;
  readonly matchesFrozenMarkers: boolean;
}

export interface ControlCenterReadinessDto {
  readonly schemaVersion: typeof CONTROL_CENTER_READINESS_SCHEMA_VERSION;
  readonly scope: 'LOCAL_SYNTHETIC';
  readonly readyClaim: 'LOCAL_SYNTHETIC_ONLY';
  readonly category: ControlCenterReadinessCategory;
  readonly state: 'READY' | 'BLOCKED' | 'UNKNOWN' | 'NOT_APPLICABLE';
  readonly applies: boolean;
  readonly sourceContracts: ControlCenterReadinessContractHealthDto;
  readonly approvedTargetCoverage: readonly ControlCenterReadinessTargetCoverageDto[];
  readonly campaign: ControlCenterReadinessCampaignDto;
  readonly checkpointCompatibility: ControlCenterReadinessCheckpoint;
  readonly analyzer: ControlCenterReadinessAnalyzerDto;
  readonly verification: ControlCenterReadinessVerificationDto;
  readonly authCapability: ControlCenterReadinessAuthCapabilityDto;
  readonly unresolvedBlockers: readonly ControlCenterReadinessBlockerDto[];
  readonly externalCi: ControlCenterReadinessExternalCi;
  readonly externalCiClassification: ControlCenterReadinessExternalCiClassification;
  readonly ownerScope: ControlCenterReadinessOwnerScopeDto;
}
