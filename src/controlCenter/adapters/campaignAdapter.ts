import type {
  CampaignCoverageReport,
  CampaignPlan,
} from '../../core/campaignIntelligence/types';
import { asSafeControlCenterCode, asSafeControlCenterLabel } from '../contracts/common';
import type {
  ControlCenterCampaignCoverageDto,
  ControlCenterCampaignCoverageRowDto,
  ControlCenterCampaignPlanState,
  ControlCenterCampaignSourceCurrentness,
  ControlCenterCampaignSummaryDto,
} from '../contracts/campaign';
import {
  CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION,
  CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
} from '../contracts/campaign';
import type { SafeControlCenterCode } from '../contracts/common';
import { boundedCollection, boundedCount, safePublicDigest, safePublicId, sortedUniqueCodes } from './common';

export interface CampaignAuthorityInput {
  readonly plan: CampaignPlan;
  readonly coverage: CampaignCoverageReport;
  readonly findingCount?: number;
  readonly blockerCodes?: readonly string[];
  readonly sourceCurrentnessByMemberId?: Readonly<Record<string, ControlCenterCampaignSourceCurrentness>>;
}

function sourceCurrentness(value: CampaignPlan['sourceCurrentness']): ControlCenterCampaignSourceCurrentness {
  return value;
}

function planState(input: CampaignAuthorityInput): ControlCenterCampaignPlanState {
  if (input.plan.ownerScopeStatus !== 'FROZEN_BY_OWNER' || input.plan.ownerScopeReason !== 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE') return 'BLOCKED';
  if (input.plan.emptyCampaign || input.plan.items.length === 0) return 'EMPTY';
  return 'AVAILABLE';
}

function allReasons(input: CampaignAuthorityInput): readonly SafeControlCenterCode[] {
  const reasons = [
    ...(input.blockerCodes ?? []),
    ...input.plan.items.flatMap((item) => [...item.selectionReasons, ...item.exclusionReasons]),
    ...input.coverage.rows.flatMap((row) => [...row.gapReasons, ...row.stages.flatMap((stage) => stage.reasons)]),
  ];
  return sortedUniqueCodes(reasons);
}

export function projectCampaignSummary(input: CampaignAuthorityInput): ControlCenterCampaignSummaryDto {
  return {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
    planState: planState(input),
    sourceCurrentness: sourceCurrentness(input.plan.sourceCurrentness),
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    planDigest: safePublicDigest(input.plan.deterministicDigest),
    coverageDigest: safePublicDigest(input.coverage.deterministicDigest),
    counts: {
      candidates: boundedCount(input.plan.items.length),
      selected: boundedCount(input.plan.selectedItems.length),
      excluded: boundedCount(input.plan.excludedItems.length),
      coveredContracts: boundedCount(input.coverage.fullyCoveredContractCount),
      executionOnly: boundedCount(input.coverage.executionOnlyCount),
      oracleOnly: boundedCount(input.coverage.oracleOnlyCount),
      replayGaps: boundedCount(input.coverage.replayGapCount),
      minimizationGaps: boundedCount(input.coverage.minimizationGapCount),
      staleSourceGaps: boundedCount(input.coverage.staleSourceGapCount),
      semanticAuthorityGaps: boundedCount(input.coverage.semanticAuthorityGapCount),
      findings: boundedCount(input.findingCount ?? 0),
    },
    blockerCodes: sortedUniqueCodes(input.blockerCodes ?? []),
    reasonCodes: allReasons(input),
  };
}

function coverageRow(row: CampaignCoverageReport['rows'][number], input: CampaignAuthorityInput): ControlCenterCampaignCoverageRowDto | null {
  const memberId = safePublicId(row.memberId, 'cc-campaign-member');
  const contractId = safePublicId(row.semanticContractId, 'cc-contract');
  const stages = row.stages.map((stage) => ({
    stageCode: asSafeControlCenterCode(stage.stage) ?? asSafeControlCenterCode('UNKNOWN_STAGE')!,
    state: stage.state,
    reasonCodes: sortedUniqueCodes(stage.reasons),
  }));
  const rowCurrentness = input.sourceCurrentnessByMemberId?.[row.memberId]
    ?? (row.stages.some((stage) => stage.state === 'STALE')
      ? 'STALE'
      : row.stages.some((stage) => stage.state === 'UNSUPPORTED')
        ? 'UNAVAILABLE'
        : row.stages.length === 0
          ? 'MISSING'
          : sourceCurrentness(input.plan.sourceCurrentness));
  return {
    memberId,
    product: asSafeControlCenterLabel(row.product),
    surface: asSafeControlCenterLabel(row.surface),
    contractId,
    sourceCurrentness: rowCurrentness,
    stages,
    gapReasons: sortedUniqueCodes(row.gapReasons),
    fullyCovered: row.fullyCovered,
  };
}

export function projectCampaignCoverage(input: CampaignAuthorityInput, requestedLimit?: unknown): ControlCenterCampaignCoverageDto {
  const rows = input.coverage.rows
    .map((row) => coverageRow(row, input))
    .filter((row): row is ControlCenterCampaignCoverageRowDto => row !== null)
    .sort((left, right) => `${left.contractId}:${left.memberId}`.localeCompare(`${right.contractId}:${right.memberId}`));
  const collection = boundedCollection(rows, requestedLimit);
  return {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION,
    ...collection,
    fullyCoveredContractCount: boundedCount(input.coverage.fullyCoveredContractCount),
  };
}
