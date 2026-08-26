import { collectLocalReadinessInputFromRepo } from '../../core/readiness/repoState';
import { summarizeLocalReadiness } from '../../core/readiness/localReadiness';
import { projectMeta } from '../adapters/metaAdapter';
import { projectReadiness } from '../adapters/readinessAdapter';
import { DEFAULT_CONTROL_CENTER_SAFETY_INPUT, projectSafety } from '../adapters/safetyAdapter';
import { projectExecutionGraph } from '../adapters/executionGraphAdapter';
import { classifyRunStatus, projectRunDetail, projectRunList, projectTimeline } from '../adapters/runAdapter';
import { createRunEvidenceReader, type RunEvidenceReader, type RunEvidenceSnapshot } from '../authorities/runEvidenceReader';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../contracts/health';
import type { ControlCenterCollector, ControlCenterListQuery, ControlCenterSourceSurfaceQuery } from './collector';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterRunDetailDto, ControlCenterTimelineDto } from '../contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../contracts/campaign';
import type { ControlCenterSourceGraphDto, ControlCenterSourceSummaryDto, ControlCenterSourceSurfacesDto } from '../contracts/sourceGraph';
import type { ControlCenterFindingsDto } from '../contracts/findings';
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
 * Safe local collector. It exposes current in-repository readiness, bounded
 * repository-owned run evidence, and explicit unavailable categories for
 * authority surfaces not yet wired to a local store; it never shells out or
 * contacts a product environment.
 */
export interface DefaultControlCenterCollectorOptions {
  /** Test/in-process seam only; the server never accepts a filesystem root. */
  readonly runReader?: RunEvidenceReader;
  readonly runSnapshotTtlMs?: number;
  readonly now?: () => number;
}

function unavailableRunSnapshot(): RunEvidenceSnapshot {
  return {
    state: 'UNAVAILABLE',
    records: [],
    generation: null,
    reasonCodes: ['RUN_EVIDENCE_ROOT_UNAVAILABLE'],
  };
}

function validSnapshot(snapshot: RunEvidenceSnapshot): boolean {
  return (snapshot.state === 'AVAILABLE' || snapshot.state === 'EMPTY' || snapshot.state === 'UNAVAILABLE' || snapshot.state === 'UNKNOWN')
    && Array.isArray(snapshot.records)
    && (snapshot.generation === null || typeof snapshot.generation === 'string')
    && Array.isArray(snapshot.reasonCodes);
}

export function createDefaultControlCenterCollector(options: DefaultControlCenterCollectorOptions = {}): ControlCenterCollector {
  const runReader = options.runReader ?? createRunEvidenceReader();
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.runSnapshotTtlMs === undefined
    ? 250
    : Number.isFinite(options.runSnapshotTtlMs) && options.runSnapshotTtlMs >= 0 && options.runSnapshotTtlMs <= 10_000
      ? options.runSnapshotTtlMs
      : 250;
  let cachedRunSnapshot: { readonly capturedAt: number; readonly snapshot: RunEvidenceSnapshot } | null = null;
  const readRunSnapshot = (): RunEvidenceSnapshot => {
    const capturedAt = now();
    if (cachedRunSnapshot !== null && capturedAt - cachedRunSnapshot.capturedAt <= ttlMs) return cachedRunSnapshot.snapshot;
    let snapshot: RunEvidenceSnapshot;
    try {
      const candidate = runReader.snapshot();
      snapshot = validSnapshot(candidate) ? candidate : unavailableRunSnapshot();
    } catch {
      snapshot = unavailableRunSnapshot();
    }
    cachedRunSnapshot = { capturedAt, snapshot };
    return snapshot;
  };

  return {
    health,
    meta: () => projectMeta(),
    readiness: () => projectReadiness(summarizeLocalReadiness(collectLocalReadinessInputFromRepo())),
    safety: () => projectSafety(DEFAULT_CONTROL_CENTER_SAFETY_INPUT),
    runs: (query) => {
      const snapshot = readRunSnapshot();
      return projectRunList(snapshot.records, query.limit, { state: snapshot.state, reasonCodes: snapshot.reasonCodes });
    },
    run: (runId): ControlCenterRunDetailDto | null => {
      const record = readRunSnapshot().records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectRunDetail(record);
    },
    timeline: (runId, afterSeq, limit): ControlCenterTimelineDto | null => {
      const record = readRunSnapshot().records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectTimeline(record, afterSeq, limit);
    },
    executionGraph: (runId): ControlCenterExecutionGraphDto | null => {
      const record = readRunSnapshot().records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectExecutionGraph({
        runId: record.summary.runId,
        status: classifyRunStatus(record.summary),
        events: record.events ?? [],
      });
    },
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
