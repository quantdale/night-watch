import type { LocalReadinessSummary } from '../../core/readiness/types';
import {
  asSafeControlCenterCode,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  readinessStateForCategory,
} from '../contracts/common';
import type { SafeControlCenterId, SafeControlCenterLabel } from '../contracts/common';
import type {
  ControlCenterReadinessAnalyzerDto,
  ControlCenterReadinessBlockerDto,
  ControlCenterReadinessCampaignDto,
  ControlCenterReadinessCategory,
  ControlCenterReadinessContractHealthDto,
  ControlCenterReadinessDto,
  ControlCenterReadinessTargetCoverageDto,
  ControlCenterReadinessVerificationDto,
} from '../contracts/readiness';
import { CONTROL_CENTER_READINESS_SCHEMA_VERSION } from '../contracts/readiness';
import { boundedCount, safePublicId, safePublicCode } from './common';

function safeLabelOrUnknown(value: unknown): SafeControlCenterLabel {
  return asSafeControlCenterLabel(value) ?? asSafeControlCenterLabel('UNKNOWN')!;
}

function safeIdList(values: readonly string[]): readonly SafeControlCenterId[] {
  return [...new Set(values.map((value) => asSafeControlCenterId(value)).filter((value): value is NonNullable<typeof value> => value !== null))]
    .sort((left, right) => left.localeCompare(right));
}

function contractHealth(summary: LocalReadinessSummary): ControlCenterReadinessContractHealthDto {
  const currentness = summary.sourceContracts.currentnessCounts;
  const familiesByKind = Object.entries(summary.sourceContracts.familiesByKind)
    .map(([kind, count]) => ({ kind: safePublicCode(kind, 'UNKNOWN_FAMILY_KIND'), count: boundedCount(count) }))
    .sort((left, right) => left.kind.localeCompare(right.kind));
  return {
    totalFamilies: boundedCount(summary.sourceContracts.totalFamilies),
    activeFamilies: boundedCount(summary.sourceContracts.activeFamilies),
    archivedFamilies: boundedCount(summary.sourceContracts.archivedFamilies),
    familiesByKind,
    approvedTargets: boundedCount(summary.sourceContracts.approvedTargets),
    targetsWithActiveFamily: boundedCount(summary.sourceContracts.targetsWithActiveFamily),
    targetsMissingActiveFamily: safeIdList(summary.sourceContracts.targetsMissingActiveFamily),
    unknownFamilyTargets: safeIdList(summary.sourceContracts.unknownFamilyTargets),
    campaignEligibleExpectationFamilies: boundedCount(summary.sourceContracts.campaignEligibleExpectationFamilies),
    currentnessCounts: {
      CURRENT: boundedCount(currentness.CURRENT),
      STALE: boundedCount(currentness.STALE),
      SOURCE_UNAVAILABLE: boundedCount(currentness.SOURCE_UNAVAILABLE),
      NOT_EVALUATED: boundedCount(currentness.NOT_EVALUATED),
    },
    currentnessUnevaluatedTargets: safeIdList(summary.sourceContracts.currentnessUnevaluatedTargets),
    staleTargets: safeIdList(summary.sourceContracts.staleTargets),
    unavailableTargets: safeIdList(summary.sourceContracts.unavailableTargets),
  };
}

function targetCoverage(summary: LocalReadinessSummary): readonly ControlCenterReadinessTargetCoverageDto[] {
  return summary.approvedTargetCoverage
    .map((entry) => {
      const targetId = asSafeControlCenterId(entry.targetId);
      if (targetId === null) return null;
      const coverage = entry.coverage === 'COVERED' || entry.coverage === 'PARTIAL' || entry.coverage === 'MISSING'
        ? entry.coverage
        : 'MISSING';
      const currentness = entry.currentness === 'CURRENT' || entry.currentness === 'STALE' || entry.currentness === 'SOURCE_UNAVAILABLE' || entry.currentness === 'NOT_EVALUATED'
        ? entry.currentness
        : 'NOT_EVALUATED';
      return {
        targetId,
        coverage,
        activeFamilies: boundedCount(entry.activeFamilies),
        currentness,
      } satisfies ControlCenterReadinessTargetCoverageDto;
    })
    .filter((entry): entry is ControlCenterReadinessTargetCoverageDto => entry !== null)
    .sort((left, right) => left.targetId.localeCompare(right.targetId));
}

function campaign(summary: LocalReadinessSummary): ControlCenterReadinessCampaignDto {
  return {
    category: summary.campaign.category,
    comparedKeys: summary.campaign.comparedKeys.map((key) => safePublicId(key, 'cc-campaign-key')),
    driftKeys: summary.campaign.driftKeys.map((key) => safePublicId(key, 'cc-campaign-drift')),
    unmeasured: summary.campaign.unmeasured,
  };
}

function analyzer(summary: LocalReadinessSummary): ControlCenterReadinessAnalyzerDto {
  const availability = summary.analyzer.availability === 'AVAILABLE' || summary.analyzer.availability === 'UNAVAILABLE' || summary.analyzer.availability === 'NOT_EVALUATED'
    ? summary.analyzer.availability
    : 'NOT_EVALUATED';
  return {
    pinnedVersion: safeLabelOrUnknown(summary.analyzer.pinnedVersion),
    observedVersion: summary.analyzer.observedVersion === null ? null : asSafeControlCenterLabel(summary.analyzer.observedVersion),
    availability,
    versionConsistent: summary.analyzer.versionConsistent,
    blocked: summary.analyzer.blocked,
  };
}

function verification(summary: LocalReadinessSummary): ControlCenterReadinessVerificationDto {
  return {
    statesByDimension: {
      TESTING: summary.verification.statesByDimension.TESTING,
      TYPECHECK: summary.verification.statesByDimension.TYPECHECK,
      HARDENING: summary.verification.statesByDimension.HARDENING,
    },
    deferredDimensions: [...summary.verification.deferredDimensions],
    notMeasuredDimensions: [...summary.verification.notMeasuredDimensions],
    allDeferredToHardening: summary.verification.allDeferredToHardening,
  };
}

function blockers(summary: LocalReadinessSummary): readonly ControlCenterReadinessBlockerDto[] {
  return summary.unresolvedBlockers
    .map((blocker) => {
      const kind = blocker.kind === 'AUTHORITY' || blocker.kind === 'SOURCE' || blocker.kind === 'VERSION' || blocker.kind === 'ANALYZER' || blocker.kind === 'EXTERNAL_CI'
        ? blocker.kind
        : 'AUTHORITY';
      const code = asSafeControlCenterCode(blocker.code) ?? safePublicCode('UNCLASSIFIED_BLOCKER', 'UNCLASSIFIED_BLOCKER');
      return {
        code,
        kind,
        detailCode: blocker.detail === undefined ? null : asSafeControlCenterCode(blocker.detail),
      } satisfies ControlCenterReadinessBlockerDto;
    })
    .sort((left, right) => `${left.kind}:${left.code}`.localeCompare(`${right.kind}:${right.code}`));
}

/** Project the existing deterministic readiness summary into the public V1 DTO. */
export function projectReadiness(summary: LocalReadinessSummary): ControlCenterReadinessDto {
  const category = summary.category as ControlCenterReadinessCategory;
  return {
    schemaVersion: CONTROL_CENTER_READINESS_SCHEMA_VERSION,
    scope: 'LOCAL_SYNTHETIC',
    readyClaim: 'LOCAL_SYNTHETIC_ONLY',
    category,
    state: readinessStateForCategory(category),
    applies: summary.applies,
    sourceContracts: contractHealth(summary),
    approvedTargetCoverage: targetCoverage(summary),
    campaign: campaign(summary),
    checkpointCompatibility: summary.checkpointCompatibility,
    analyzer: analyzer(summary),
    verification: verification(summary),
    unresolvedBlockers: blockers(summary),
    externalCi: summary.externalCi,
    externalCiClassification: summary.externalCiClassification,
    ownerScope: {
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      frozenOperationCount: boundedCount(summary.ownerScope.frozenOperationCount),
      matchesFrozenMarkers: summary.ownerScope.matchesFrozenMarkers,
    },
  };
}
