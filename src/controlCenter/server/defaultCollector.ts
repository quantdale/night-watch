import { collectLocalReadinessInputFromRepo } from '../../core/readiness/repoState';
import { summarizeLocalReadiness } from '../../core/readiness/localReadiness';
import { projectMeta } from '../adapters/metaAdapter';
import { projectReadiness } from '../adapters/readinessAdapter';
import { DEFAULT_CONTROL_CENTER_SAFETY_INPUT, projectSafety } from '../adapters/safetyAdapter';
import { projectExecutionGraph } from '../adapters/executionGraphAdapter';
import { classifyRunStatus, projectRunDetail, projectRunList, projectTimeline } from '../adapters/runAdapter';
import { projectCampaignCoverage, projectCampaignSummary } from '../adapters/campaignAdapter';
import { projectSourceGraph, projectSourceSummary, projectSourceSurfaces, type SourceSummaryAuthorityInput } from '../adapters/sourceAdapter';
import { createRunEvidenceReader, type RunEvidenceReader, type RunEvidenceSnapshot } from '../authorities/runEvidenceReader';
import { createSourceAuthority, type SourceAuthority, type SourceAuthoritySnapshot } from '../authorities/sourceAuthority';
import { createCampaignAuthority, type CampaignAuthority, type CampaignAuthoritySnapshot } from '../authorities/campaignAuthority';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../contracts/health';
import type { ControlCenterCollector, ControlCenterListQuery } from './collector';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterRunDetailDto, ControlCenterTimelineDto } from '../contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../contracts/campaign';
import type { ControlCenterSourceGraphDto } from '../contracts/sourceGraph';
import type { ControlCenterFindingsDto } from '../contracts/findings';
import { CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION } from '../contracts/campaign';
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

function campaignFallback(snapshot: CampaignAuthoritySnapshot): ControlCenterCampaignSummaryDto {
  const blockerCodes = snapshot.blockerCodes.map((code) => asSafeControlCenterCode(code)).filter((code): code is NonNullable<ReturnType<typeof asSafeControlCenterCode>> => code !== null);
  const reasonCodes = [...new Set([
    ...snapshot.blockerCodes,
    snapshot.state === 'EMPTY' ? 'EMPTY_CAMPAIGN' : snapshot.state === 'BLOCKED' ? 'OWNER_POLICY_BLOCKED' : snapshot.state === 'UNKNOWN' ? 'CAMPAIGN_COMPOSITION_UNAVAILABLE' : 'SOURCE_UNAVAILABLE',
  ])].map((code) => asSafeControlCenterCode(code)).filter((code): code is NonNullable<ReturnType<typeof asSafeControlCenterCode>> => code !== null);
  return {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
    planState: snapshot.state,
    sourceCurrentness: snapshot.sourceCurrentness,
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    planDigest: null,
    coverageDigest: null,
    counts: { candidates: 0, selected: 0, excluded: 0, coveredContracts: 0, executionOnly: 0, oracleOnly: 0, replayGaps: 0, minimizationGaps: 0, staleSourceGaps: 0, semanticAuthorityGaps: 0, findings: 0 },
    blockerCodes,
    reasonCodes,
  };
}

function unavailableCampaignCoverage(query: ControlCenterListQuery): ControlCenterCampaignCoverageDto {
  return { schemaVersion: CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, items: [], page: emptyPage(query.limit), fullyCoveredContractCount: 0 };
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
  readonly sourceAuthority?: SourceAuthority;
  readonly campaignAuthority?: CampaignAuthority;
  readonly runSnapshotTtlMs?: number;
  readonly sourceSnapshotTtlMs?: number;
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

function unavailableSourceSnapshot(): SourceAuthoritySnapshot {
  return {
    schemaVersion: 'nightwatch.control-center-source-authority.v1',
    state: 'UNKNOWN',
    inventoryDigest: null,
    repositoryCount: 0,
    repositoryStatuses: [],
    discovery: null,
    phase24: null,
    generation: null,
    reasonCodes: ['SOURCE_DISCOVERY_UNAVAILABLE'],
  };
}

function validSourceSnapshot(snapshot: SourceAuthoritySnapshot): boolean {
  return snapshot.schemaVersion === 'nightwatch.control-center-source-authority.v1'
    && ['AVAILABLE', 'EMPTY', 'STALE', 'UNAVAILABLE', 'UNKNOWN'].includes(snapshot.state)
    && (snapshot.inventoryDigest === null || typeof snapshot.inventoryDigest === 'string')
    && Number.isSafeInteger(snapshot.repositoryCount)
    && snapshot.repositoryCount >= 0
    && Array.isArray(snapshot.repositoryStatuses)
    && (snapshot.discovery === null || (typeof snapshot.discovery === 'object' && Array.isArray(snapshot.discovery.surfaces)))
    && (snapshot.phase24 === null || typeof snapshot.phase24 === 'object')
    && (snapshot.generation === null || typeof snapshot.generation === 'string')
    && Array.isArray(snapshot.reasonCodes);
}

function unavailableCampaignSnapshot(): CampaignAuthoritySnapshot {
  return {
    schemaVersion: 'nightwatch.control-center-campaign-authority.v1',
    state: 'UNKNOWN',
    sourceCurrentness: 'AMBIGUOUS',
    plan: null,
    coverage: null,
    findingCount: 0,
    blockerCodes: ['CAMPAIGN_COMPOSITION_UNAVAILABLE'],
    sourceCurrentnessByMemberId: {},
    sourceGeneration: null,
    generation: null,
  };
}

function validCampaignSnapshot(snapshot: CampaignAuthoritySnapshot): boolean {
  return snapshot.schemaVersion === 'nightwatch.control-center-campaign-authority.v1'
    && ['AVAILABLE', 'EMPTY', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN'].includes(snapshot.state)
    && ['CURRENT', 'STALE', 'UNAVAILABLE', 'AMBIGUOUS', 'MISSING', 'SYNTHETIC_ONLY'].includes(snapshot.sourceCurrentness)
    && (snapshot.plan === null || typeof snapshot.plan === 'object')
    && (snapshot.coverage === null || typeof snapshot.coverage === 'object')
    && Number.isSafeInteger(snapshot.findingCount)
    && snapshot.findingCount >= 0
    && Array.isArray(snapshot.blockerCodes)
    && typeof snapshot.sourceCurrentnessByMemberId === 'object'
    && snapshot.sourceCurrentnessByMemberId !== null
    && (snapshot.sourceGeneration === null || typeof snapshot.sourceGeneration === 'string')
    && (snapshot.generation === null || typeof snapshot.generation === 'string');
}

function sourceSummaryAuthority(snapshot: SourceAuthoritySnapshot): SourceSummaryAuthorityInput {
  return {
    state: snapshot.state,
    inventoryDigest: snapshot.inventoryDigest,
    repositoryCount: snapshot.repositoryCount,
    repositoryCurrentness: snapshot.repositoryStatuses.map((status) => status.currentness),
    reasonCodes: snapshot.reasonCodes,
  };
}

export function createDefaultControlCenterCollector(options: DefaultControlCenterCollectorOptions = {}): ControlCenterCollector {
  const runReader = options.runReader ?? createRunEvidenceReader();
  const sourceAuthority = options.sourceAuthority ?? createSourceAuthority();
  const campaignAuthority = options.campaignAuthority ?? createCampaignAuthority({ sourceAuthority });
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

  const sourceTtlMs = options.sourceSnapshotTtlMs === undefined
    ? 250
    : Number.isFinite(options.sourceSnapshotTtlMs) && options.sourceSnapshotTtlMs >= 0 && options.sourceSnapshotTtlMs <= 10_000
      ? options.sourceSnapshotTtlMs
      : 250;
  let cachedAuthoritySnapshot: { readonly capturedAt: number; readonly source: SourceAuthoritySnapshot; readonly campaign: CampaignAuthoritySnapshot } | null = null;
  const readAuthoritySnapshot = (): { readonly source: SourceAuthoritySnapshot; readonly campaign: CampaignAuthoritySnapshot } => {
    const capturedAt = now();
    if (cachedAuthoritySnapshot !== null && capturedAt - cachedAuthoritySnapshot.capturedAt <= sourceTtlMs) {
      return cachedAuthoritySnapshot;
    }
    let source: SourceAuthoritySnapshot;
    try {
      const candidate = sourceAuthority.snapshot();
      source = validSourceSnapshot(candidate) ? candidate : unavailableSourceSnapshot();
    } catch {
      source = unavailableSourceSnapshot();
    }
    let campaign: CampaignAuthoritySnapshot;
    try {
      const candidate = campaignAuthority.snapshot(source);
      campaign = validCampaignSnapshot(candidate) ? candidate : unavailableCampaignSnapshot();
    } catch {
      campaign = unavailableCampaignSnapshot();
    }
    cachedAuthoritySnapshot = { capturedAt, source, campaign };
    return cachedAuthoritySnapshot;
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
    campaignSummary: () => {
      const { campaign } = readAuthoritySnapshot();
      return campaign.plan !== null && campaign.coverage !== null && campaign.state === 'AVAILABLE'
        ? projectCampaignSummary({ plan: campaign.plan, coverage: campaign.coverage, findingCount: campaign.findingCount, blockerCodes: campaign.blockerCodes, sourceCurrentnessByMemberId: campaign.sourceCurrentnessByMemberId })
        : campaignFallback(campaign);
    },
    campaignCoverage: (query) => {
      const { campaign } = readAuthoritySnapshot();
      return campaign.plan !== null && campaign.coverage !== null && campaign.state === 'AVAILABLE'
        ? projectCampaignCoverage({ plan: campaign.plan, coverage: campaign.coverage, findingCount: campaign.findingCount, blockerCodes: campaign.blockerCodes, sourceCurrentnessByMemberId: campaign.sourceCurrentnessByMemberId }, query.limit)
        : unavailableCampaignCoverage(query);
    },
    sourceSummary: () => {
      const { source } = readAuthoritySnapshot();
      return projectSourceSummary(source.discovery?.surfaces ?? [], sourceSummaryAuthority(source));
    },
    sourceSurfaces: (query) => {
      const { source } = readAuthoritySnapshot();
      return projectSourceSurfaces(source.discovery?.surfaces ?? [], query.repositoryId === null ? undefined : query.repositoryId, query.limit);
    },
    sourceGraph: (surfaceId, depth): ControlCenterSourceGraphDto | null => {
      const { source } = readAuthoritySnapshot();
      return projectSourceGraph(source.discovery?.surfaces ?? [], surfaceId, depth);
    },
    findings: unavailableFindings,
  };
}
