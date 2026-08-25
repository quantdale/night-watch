import { collectLocalReadinessInputFromRepo } from '../../core/readiness/repoState';
import { summarizeLocalReadiness } from '../../core/readiness/localReadiness';
import { projectMeta } from '../adapters/metaAdapter';
import { projectReadiness } from '../adapters/readinessAdapter';
import { DEFAULT_CONTROL_CENTER_SAFETY_INPUT, projectSafety } from '../adapters/safetyAdapter';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../contracts/health';
import type { ControlCenterCollector, ControlCenterListQuery, ControlCenterSourceSurfaceQuery } from './collector';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterRunListDto, ControlCenterRunDetailDto, ControlCenterTimelineDto } from '../contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../contracts/campaign';
import type { ControlCenterSourceGraphDto, ControlCenterSourceSummaryDto, ControlCenterSourceSurfacesDto } from '../contracts/sourceGraph';
import type { ControlCenterFindingsDto } from '../contracts/findings';
import { CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION } from '../contracts/runs';
import { CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION } from '../contracts/campaign';
import { CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION, CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION, CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION } from '../contracts/sourceGraph';
import { CONTROL_CENTER_FINDINGS_SCHEMA_VERSION } from '../contracts/findings';
import { asSafeControlCenterCode } from '../contracts/common';

function emptyPage(limit: number) {
  return { limit, nextCursor: null, truncated: false } as const;
}

function health(): ControlCenterHealthDto {
  return {
    schemaVersion: CONTROL_CENTER_HEALTH_SCHEMA_VERSION,
    status: 'UP',
    scope: 'LOCAL_LOOPBACK_ONLY',
    readOnly: true,
    productReadiness: 'NOT_REPORTED',
  };
}

function emptyRuns(query: ControlCenterListQuery): ControlCenterRunListDto {
  return { schemaVersion: CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION, items: [], page: emptyPage(query.limit) };
}

function unavailableCampaign(): ControlCenterCampaignSummaryDto {
  return {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
    planState: 'UNAVAILABLE',
    sourceCurrentness: 'UNAVAILABLE',
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    planDigest: null,
    coverageDigest: null,
    counts: { candidates: 0, selected: 0, excluded: 0, coveredContracts: 0, executionOnly: 0, oracleOnly: 0, replayGaps: 0, minimizationGaps: 0, staleSourceGaps: 0, semanticAuthorityGaps: 0, findings: 0 },
    blockerCodes: [asSafeControlCenterCode('CAMPAIGN_SOURCE_UNAVAILABLE')!],
    reasonCodes: [asSafeControlCenterCode('SOURCE_UNAVAILABLE')!],
  };
}

function unavailableCampaignCoverage(query: ControlCenterListQuery): ControlCenterCampaignCoverageDto {
  return { schemaVersion: CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, items: [], page: emptyPage(query.limit), fullyCoveredContractCount: 0 };
}

function unavailableSourceSummary(): ControlCenterSourceSummaryDto {
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION,
    state: 'UNAVAILABLE',
    inventoryDigest: null,
    repositoryCount: 0,
    surfaceCount: 0,
    currentness: [],
    lifecycle: [],
    proof: [],
    capabilities: [],
    gapReasons: [asSafeControlCenterCode('SOURCE_REPOSITORY_UNAVAILABLE')!],
  };
}

function unavailableSourceSurfaces(query: ControlCenterSourceSurfaceQuery): ControlCenterSourceSurfacesDto {
  return { schemaVersion: CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION, items: [], page: emptyPage(query.limit), repositoryFilter: query.repositoryId };
}

function unavailableFindings(query: ControlCenterListQuery): ControlCenterFindingsDto {
  return { schemaVersion: CONTROL_CENTER_FINDINGS_SCHEMA_VERSION, state: 'UNAVAILABLE', items: [], page: emptyPage(query.limit) };
}

/**
 * Safe local starter collector. It exposes current in-repository readiness and
 * explicit unavailable categories for authority surfaces not yet wired to a
 * local store; it never shells out or contacts a product environment.
 */
export function createDefaultControlCenterCollector(): ControlCenterCollector {
  return {
    health,
    meta: () => projectMeta(),
    readiness: () => projectReadiness(summarizeLocalReadiness(collectLocalReadinessInputFromRepo())),
    safety: () => projectSafety(DEFAULT_CONTROL_CENTER_SAFETY_INPUT),
    runs: (query) => emptyRuns(query),
    run: (_runId): ControlCenterRunDetailDto | null => null,
    timeline: (_runId, _afterSeq, _limit): ControlCenterTimelineDto | null => null,
    executionGraph: (_runId): ControlCenterExecutionGraphDto | null => null,
    campaignSummary: unavailableCampaign,
    campaignCoverage: unavailableCampaignCoverage,
    sourceSummary: unavailableSourceSummary,
    sourceSurfaces: unavailableSourceSurfaces,
    sourceGraph: (_surfaceId, _depth): ControlCenterSourceGraphDto | null => ({
      schemaVersion: CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION,
      surfaceId: null,
      depth: 0,
      nodes: [],
      edges: [],
      nodeLimit: 250,
      edgeLimit: 500,
      truncated: false,
    }),
    findings: unavailableFindings,
  };
}
