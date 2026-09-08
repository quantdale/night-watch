import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import { collectLocalReadinessInputFromRepo } from '../../core/readiness/repoState';
import { summarizeLocalReadiness } from '../../core/readiness/localReadiness';
import { projectMeta } from '../adapters/metaAdapter';
import { projectReadiness } from '../adapters/readinessAdapter';
import { DEFAULT_CONTROL_CENTER_SAFETY_INPUT, projectSafety } from '../adapters/safetyAdapter';
import { projectExecutionGraph } from '../adapters/executionGraphAdapter';
import { classifyRunStatus, projectRunDetail, projectRunList, projectTimeline } from '../adapters/runAdapter';
import { projectCampaignCoverage, projectCampaignSummary } from '../adapters/campaignAdapter';
import { projectSourceGraph, projectSourceSummary, projectSourceSurfaces, type SourceSummaryAuthorityInput } from '../adapters/sourceAdapter';
import { projectFindings } from '../adapters/findingsAdapter';
import { projectReviewer } from '../adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../authorities/reviewerAuthority';
import type { ControlCenterReviewAuthority } from '../authorities/reviewWriteAuthority';
import type { ControlCenterReviewDecisionResponse } from './server';
import { LEVEL_FOR_SEGMENT, QUERY_FOR_SEGMENT, systemMapInputFromDiscovery, systemMapLevel, systemMapQuery } from '../adapters/systemMapAdapter';
import { createRunEvidenceReader, type RunEvidenceReader, type RunEvidenceSnapshot } from '../authorities/runEvidenceReader';
import { createSourceAuthority, type SourceAuthority, type SourceAuthoritySnapshot } from '../authorities/sourceAuthority';
import { createCampaignAuthority, type CampaignAuthority, type CampaignAuthoritySnapshot } from '../authorities/campaignAuthority';
import { createFindingsAuthority, type FindingsAuthority, type FindingsAuthoritySnapshot } from '../authorities/findingsAuthority';
import { CONTROL_CENTER_SNAPSHOT_KEYS, ControlCenterSnapshotCoordinator } from './snapshotCoordinator';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../contracts/health';
import type { ControlCenterCollector, ControlCenterListQuery } from './collector';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterRunDetailDto, ControlCenterTimelineDto } from '../contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../contracts/campaign';
import type { ControlCenterSourceGraphDto } from '../contracts/sourceGraph';
import { CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION } from '../contracts/campaign';
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

/**
 * Safe local collector. It exposes current in-repository readiness, bounded
 * repository-owned run evidence, approved-source and campaign metadata, and
 * owner-local finding metadata; it never shells out or contacts a product
 * environment.
 */
export interface DefaultControlCenterCollectorOptions {
  /** Test/in-process seam only; the server never accepts a filesystem root. */
  readonly runReader?: RunEvidenceReader;
  readonly sourceAuthority?: SourceAuthority;
  readonly campaignAuthority?: CampaignAuthority;
  readonly findingsAuthority?: FindingsAuthority;
  /**
   * The owner-local review authority. OPT-IN: without it the reviewer surface
   * reports NO_LOCAL_REVIEW_STORE for every finding, which is what it did
   * before persistence existed and remains the truthful answer.
   */
  readonly reviewAuthority?: ControlCenterReviewAuthority;
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

function unavailableFindingsSnapshot(): FindingsAuthoritySnapshot {
  return {
    schemaVersion: 'nightwatch.control-center-findings-authority.v1',
    state: 'UNAVAILABLE',
    dossiers: [],
    generation: null,
    reasonCodes: ['FINDINGS_ROOT_UNAVAILABLE'],
  };
}

interface ControlCenterAuthoritySnapshot {
  readonly source: SourceAuthoritySnapshot;
  readonly campaign: CampaignAuthoritySnapshot;
  readonly findings: FindingsAuthoritySnapshot;
  readonly generation: string | null;
}

function authorityGeneration(snapshot: Pick<ControlCenterAuthoritySnapshot, 'source' | 'campaign' | 'findings'>): string | null {
  const identities = {
    source: snapshot.source.generation,
    campaign: snapshot.campaign.generation,
    findings: snapshot.findings.generation,
  };
  if (identities.source === null && identities.campaign === null && identities.findings === null) return null;
  return prefixedDigest24('cc-authority-generation', identities);
}

function unavailableAuthoritySnapshot(): ControlCenterAuthoritySnapshot {
  const source = unavailableSourceSnapshot();
  const campaign = unavailableCampaignSnapshot();
  const findings = unavailableFindingsSnapshot();
  return { source, campaign, findings, generation: authorityGeneration({ source, campaign, findings }) };
}

function validFindingsMetadata(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const dossier = value as Record<string, unknown>;
  const reproduction = dossier.reproduction;
  const confidence = dossier.confidence;
  return !('privacy' in dossier)
    && typeof dossier.schemaVersion === 'string'
    && (dossier.status === 'READY' || dossier.status === 'INCOMPLETE')
    && typeof dossier.candidateId === 'string'
    && (dossier.title === null || typeof dossier.title === 'string')
    && (dossier.firstObserved === null || typeof dossier.firstObserved === 'string')
    && (dossier.lastObserved === null || typeof dossier.lastObserved === 'string')
    && (dossier.routeClass === null || typeof dossier.routeClass === 'string')
    && typeof dossier.oracleFingerprint === 'string'
    && typeof dossier.evidenceLevel === 'string'
    && reproduction !== null
    && typeof reproduction === 'object'
    && !Array.isArray(reproduction)
    && typeof (reproduction as Record<string, unknown>).result === 'string'
    && Number.isSafeInteger((reproduction as Record<string, unknown>).count)
    && confidence !== null
    && typeof confidence === 'object'
    && !Array.isArray(confidence)
    && typeof (confidence as Record<string, unknown>).level === 'string'
    && typeof dossier.technicalSeverity === 'string'
    && typeof dossier.triagePriority === 'string'
    && (dossier.sourceCurrentness === 'CURRENT' || dossier.sourceCurrentness === 'SOURCE_STALE' || dossier.sourceCurrentness === 'SOURCE_UNAVAILABLE')
    && typeof dossier.semanticFinding === 'boolean';
}

function validFindingsSnapshot(snapshot: FindingsAuthoritySnapshot): boolean {
  return snapshot.schemaVersion === 'nightwatch.control-center-findings-authority.v1'
    && ['AVAILABLE', 'EMPTY', 'UNAVAILABLE', 'UNKNOWN'].includes(snapshot.state)
    && Array.isArray(snapshot.dossiers)
    && snapshot.dossiers.every(validFindingsMetadata)
    && (snapshot.generation === null || typeof snapshot.generation === 'string')
    && Array.isArray(snapshot.reasonCodes);
}

function sourceSummaryAuthority(snapshot: SourceAuthoritySnapshot): SourceSummaryAuthorityInput {
  return {
    state: snapshot.state,
    inventoryDigest: snapshot.inventoryDigest,
    repositoryCount: snapshot.repositoryCount,
    repositoryCurrentness: snapshot.repositoryStatuses.map((status) => status.currentness),
    reasonCodes: snapshot.reasonCodes,
    operationCompleteness: snapshot.discovery?.operationCompleteness ?? null,
    inventoryCompleteness: snapshot.discovery?.inventory.completeness ?? null,
  };
}

/** The read surface and, when a review authority is configured, the write one. */
export interface ControlCenterServices {
  readonly collector: ControlCenterCollector;
  /** null when no review authority was supplied; the route then does not exist. */
  readonly reviewDecision: ((request: unknown) => Promise<ControlCenterReviewDecisionResponse>) | null;
}

/**
 * The collector and the review write handler, built together.
 *
 * Together on purpose. Both need the campaign identity that a review binding
 * is derived from, and they must obtain it the SAME way. Reading it
 * separately is not a style question: the reviewer path takes the campaign
 * snapshot through validation with a fallback to an unavailable snapshot,
 * so a raw read in the write path can produce a different campaign id for
 * the very same state — and every write would then be refused as
 * BINDING_MISMATCH, with the surface offering no way to tell that the
 * refusal came from the server disagreeing with itself.
 *
 * That defect was real, and it was found by the browser workflow rather than
 * by any unit test, because both halves were individually correct.
 */
export function createControlCenterServices(options: DefaultControlCenterCollectorOptions = {}): ControlCenterServices {
  const runReader = options.runReader ?? createRunEvidenceReader();
  const sourceAuthority = options.sourceAuthority ?? createSourceAuthority();
  const campaignAuthority = options.campaignAuthority ?? createCampaignAuthority({ sourceAuthority });
  const findingsAuthority = options.findingsAuthority ?? createFindingsAuthority();
  // OPT-IN. Without a review authority the reviewer surface reports
  // NO_LOCAL_REVIEW_STORE for every finding, exactly as it did before
  // persistence existed.
  const reviewAuthority = options.reviewAuthority ?? null;
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.runSnapshotTtlMs === undefined
    ? 250
    : Number.isFinite(options.runSnapshotTtlMs) && options.runSnapshotTtlMs >= 0 && options.runSnapshotTtlMs <= 10_000
      ? options.runSnapshotTtlMs
      : 250;
  const sourceTtlMs = options.sourceSnapshotTtlMs === undefined
    ? 250
    : Number.isFinite(options.sourceSnapshotTtlMs) && options.sourceSnapshotTtlMs >= 0 && options.sourceSnapshotTtlMs <= 10_000
      ? options.sourceSnapshotTtlMs
      : 250;
  const snapshots = new ControlCenterSnapshotCoordinator({ maxEntries: 2, now });
  const readRunSnapshot = async (): Promise<RunEvidenceSnapshot> => {
    const result = await snapshots.read<RunEvidenceSnapshot>({
      key: CONTROL_CENTER_SNAPSHOT_KEYS.RUN_EVIDENCE,
      ttlMs,
      refresh: () => {
        const candidate = runReader.snapshot();
        if (!validSnapshot(candidate)) throw new Error('CONTROL_CENTER_RUN_SNAPSHOT_INVALID');
        return candidate;
      },
      fallback: unavailableRunSnapshot,
      generation: (snapshot) => snapshot.generation,
    });
    return result.value;
  };

  const readAuthoritySnapshot = async (): Promise<ControlCenterAuthoritySnapshot> => {
    const result = await snapshots.read<ControlCenterAuthoritySnapshot>({
      key: CONTROL_CENTER_SNAPSHOT_KEYS.AUTHORITY,
      ttlMs: sourceTtlMs,
      refresh: () => {
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
        let findings: FindingsAuthoritySnapshot;
        try {
          const candidate = findingsAuthority.snapshot();
          findings = validFindingsSnapshot(candidate) ? candidate : unavailableFindingsSnapshot();
        } catch {
          findings = unavailableFindingsSnapshot();
        }
        return { source, campaign, findings, generation: authorityGeneration({ source, campaign, findings }) };
      },
      fallback: unavailableAuthoritySnapshot,
      generation: (snapshot) => snapshot.generation,
    });
    return result.value;
  };

  const collector: ControlCenterCollector = {
    health,
    meta: () => projectMeta(),
    readiness: () => projectReadiness(summarizeLocalReadiness(collectLocalReadinessInputFromRepo())),
    safety: () => projectSafety(DEFAULT_CONTROL_CENTER_SAFETY_INPUT),
    runs: async (query) => {
      const snapshot = await readRunSnapshot();
      return projectRunList(snapshot.records, query.limit, { state: snapshot.state, reasonCodes: snapshot.reasonCodes }, query.cursor);
    },
    run: async (runId): Promise<ControlCenterRunDetailDto | null> => {
      const record = (await readRunSnapshot()).records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectRunDetail(record);
    },
    timeline: async (runId, afterSeq, limit): Promise<ControlCenterTimelineDto | null> => {
      const record = (await readRunSnapshot()).records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectTimeline(record, afterSeq, limit);
    },
    executionGraph: async (runId): Promise<ControlCenterExecutionGraphDto | null> => {
      const record = (await readRunSnapshot()).records.find((candidate) => candidate.summary.runId === runId);
      return record === undefined ? null : projectExecutionGraph({
        runId: record.summary.runId,
        status: classifyRunStatus(record.summary),
        events: record.events ?? [],
      });
    },
    campaignSummary: async () => {
      const { campaign } = await readAuthoritySnapshot();
      return campaign.plan !== null && campaign.coverage !== null && campaign.state === 'AVAILABLE'
        ? projectCampaignSummary({ plan: campaign.plan, coverage: campaign.coverage, findingCount: campaign.findingCount, blockerCodes: campaign.blockerCodes, sourceCurrentnessByMemberId: campaign.sourceCurrentnessByMemberId })
        : campaignFallback(campaign);
    },
    campaignCoverage: async (query) => {
      const { campaign } = await readAuthoritySnapshot();
      return campaign.plan !== null && campaign.coverage !== null && campaign.state === 'AVAILABLE'
        ? projectCampaignCoverage({ plan: campaign.plan, coverage: campaign.coverage, findingCount: campaign.findingCount, blockerCodes: campaign.blockerCodes, sourceCurrentnessByMemberId: campaign.sourceCurrentnessByMemberId }, query.limit, query.cursor)
        : unavailableCampaignCoverage(query);
    },
    sourceSummary: async () => {
      const { source } = await readAuthoritySnapshot();
      return projectSourceSummary(source.discovery?.surfaces ?? [], {
        ...sourceSummaryAuthority(source),
        proofChain: source.phase24?.eligibilityCensus ?? null,
      });
    },
    sourceSurfaces: async (query) => {
      const { source } = await readAuthoritySnapshot();
      return projectSourceSurfaces(source.discovery?.surfaces ?? [], query.repositoryId === null ? undefined : query.repositoryId, query.limit, query.cursor);
    },
    sourceGraph: async (surfaceId, depth): Promise<ControlCenterSourceGraphDto | null> => {
      const { source } = await readAuthoritySnapshot();
      return projectSourceGraph(source.discovery?.surfaces ?? [], surfaceId, depth);
    },
    // C-15c. Each level is projected and laid out on the SERVER, and only the
    // requested level crosses the wire.
    systemMapLevel: async (segment, focusId) => {
      const { source } = await readAuthoritySnapshot();
      const level = LEVEL_FOR_SEGMENT[segment];
      if (level === undefined) return null;
      return systemMapLevel(systemMapInputFromDiscovery(source.discovery as never), level, focusId);
    },
    systemMapQuery: async (segment, focusId) => {
      const { source } = await readAuthoritySnapshot();
      const query = QUERY_FOR_SEGMENT[segment];
      if (query === undefined) return null;
      return systemMapQuery(systemMapInputFromDiscovery(source.discovery as never), query, focusId);
    },
    findings: async (query) => {
      const { findings } = await readAuthoritySnapshot();
      return projectFindings({
        dossiers: findings.dossiers,
        state: findings.state,
        available: findings.state !== 'UNAVAILABLE',
      }, query.limit, query.cursor);
    },
    reviewer: async (query) => {
      const { findings, campaign } = await readAuthoritySnapshot();
      if (findings.state === 'UNAVAILABLE') return projectReviewer({ findings: [], available: false }, query.limit, query.cursor);
      // The limit is passed to the AUTHORITY, not only to the projection:
      // that is what keeps a 10,000-finding corpus from computing whole-corpus
      // intelligence to render one bounded page (M4/M5).
      return projectReviewer(
        reviewerInputsFromFindings({
          dossiers: findings.dossiers,
          campaignId: campaign.generation,
          limit: query.limit,
          // NW-10. The CURSOR goes to the authority for the same reason the
          // limit does: the authority chooses the page, so a cursor that
          // reached only the projection would have had nothing left to
          // select from.
          cursor: query.cursor,
          // Page-bounded by construction: the authority invokes this only for
          // the rows it selected, so a 10,000-finding corpus costs one store
          // listing per finding rendered, not one per finding held.
          ...(reviewAuthority === null
            ? {}
            : {
                localReviewLookup: reviewAuthority.localReviewLookup({ campaignId: campaign.generation }),
                reviewIdentityFor: (dossier) => reviewAuthority.identityFor(dossier, { campaignId: campaign.generation }),
              }),
        }),
        query.limit,
        query.cursor
      );
    },
  };

  /**
   * The review write handler, over the SAME snapshot seam as the reviewer
   * read above. The snapshot is read fresh for each decision, so a dossier
   * regenerated between render and click makes the submitted identity stop
   * matching and the write is refused — which is the intended refusal,
   * unlike the one the shared seam removes.
   */
  const reviewDecision = reviewAuthority === null
    ? null
    : async (request: unknown): Promise<ControlCenterReviewDecisionResponse> => {
        const body = request !== null && typeof request === 'object' && !Array.isArray(request)
          ? (request as Record<string, unknown>)
          : {};
        const { findings, campaign } = await readAuthoritySnapshot();
        const outcome = reviewAuthority.decide(
          {
            findingId: typeof body.findingId === 'string' ? body.findingId : '',
            reviewIdentity: typeof body.reviewIdentity === 'string' ? body.reviewIdentity : '',
            decision: typeof body.decision === 'string' ? body.decision : '',
            ...(typeof body.rationale === 'string' ? { rationale: body.rationale } : {}),
            ...(typeof body.reasonCode === 'string' ? { reasonCode: body.reasonCode } : {}),
          },
          { dossiers: findings.dossiers, campaignId: campaign.generation }
        );
        return {
          schemaVersion: 'nightwatch.control-center.review-decision.v1',
          result: outcome.result,
          reviewIdentity: outcome.reviewIdentity,
          organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
        };
      };

  return { collector, reviewDecision };
}

/** Backwards-compatible accessor for callers that need only the read surface. */
export function createDefaultControlCenterCollector(options: DefaultControlCenterCollectorOptions = {}): ControlCenterCollector {
  return createControlCenterServices(options).collector;
}
