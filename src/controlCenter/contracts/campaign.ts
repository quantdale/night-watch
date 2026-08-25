import type {
  ControlCenterCollection,
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterLabel,
} from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.campaign.v1` as const;
export const CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.campaign-coverage.v1` as const;

export type ControlCenterCampaignSourceCurrentness =
  | 'CURRENT'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'AMBIGUOUS'
  | 'MISSING'
  | 'SYNTHETIC_ONLY';
export type ControlCenterCampaignPlanState = 'AVAILABLE' | 'EMPTY' | 'BLOCKED' | 'UNAVAILABLE' | 'UNKNOWN';
export type ControlCenterCampaignCoverageState = 'PROVEN' | 'AVAILABLE' | 'PARTIAL' | 'GAP' | 'STALE' | 'UNSUPPORTED' | 'NOT_APPLICABLE';

export interface ControlCenterCampaignCountsDto {
  readonly candidates: number;
  readonly selected: number;
  readonly excluded: number;
  readonly coveredContracts: number;
  readonly executionOnly: number;
  readonly oracleOnly: number;
  readonly replayGaps: number;
  readonly minimizationGaps: number;
  readonly staleSourceGaps: number;
  readonly semanticAuthorityGaps: number;
  readonly findings: number;
}

export interface ControlCenterCampaignSummaryDto {
  readonly schemaVersion: typeof CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION;
  readonly planState: ControlCenterCampaignPlanState;
  readonly sourceCurrentness: ControlCenterCampaignSourceCurrentness;
  readonly ownerScopeStatus: 'FROZEN_BY_OWNER';
  readonly ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  readonly planDigest: SafeControlCenterDigest | null;
  readonly coverageDigest: SafeControlCenterDigest | null;
  readonly counts: ControlCenterCampaignCountsDto;
  readonly blockerCodes: readonly SafeControlCenterCode[];
  readonly reasonCodes: readonly SafeControlCenterCode[];
}

export interface ControlCenterCampaignCoverageRowDto {
  readonly memberId: SafeControlCenterId;
  readonly product: SafeControlCenterLabel | null;
  readonly surface: SafeControlCenterLabel | null;
  readonly contractId: SafeControlCenterId;
  readonly sourceCurrentness: ControlCenterCampaignSourceCurrentness;
  readonly stages: readonly {
    readonly stageCode: SafeControlCenterCode;
    readonly state: ControlCenterCampaignCoverageState;
    readonly reasonCodes: readonly SafeControlCenterCode[];
  }[];
  readonly gapReasons: readonly SafeControlCenterCode[];
  readonly fullyCovered: boolean;
}

export interface ControlCenterCampaignCoverageDto extends ControlCenterCollection<ControlCenterCampaignCoverageRowDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION;
  readonly fullyCoveredContractCount: number;
}
