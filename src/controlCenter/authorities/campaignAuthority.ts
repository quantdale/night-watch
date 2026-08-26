// ---------------------------------------------------------------------------
// Nightwatch Control Center — bounded Phase 24 / campaign-intelligence bridge.
//
// Phase 24 owns source-derived candidate selection. This module projects the
// selected bounded set into the existing campaign portfolio, impact, coverage,
// and plan contracts. It never executes a candidate, reads a CLI, starts a
// process, contacts a network, or persists an observation.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import { buildCampaignCoverageReportCached, buildCampaignImpactReportCached } from '../../core/campaignIntelligence/cache';
import { buildCampaignPlan } from '../../core/campaignIntelligence/planner';
import type {
  CampaignCandidateMetadata,
  CampaignCoverageReport,
  CampaignImpactBinding,
  CampaignPlan,
  CampaignReasonCode,
  CampaignSourceCurrentness,
} from '../../core/campaignIntelligence/types';
import type { Phase24CandidateDecision } from '../../core/phase24/types';
import { EMPTY_PORTFOLIO_YIELD, buildPortfolio, type PortfolioMemberInput } from '../../core/portfolio/types';
import type { SourceAuthority, SourceAuthoritySnapshot } from './sourceAuthority';

export const CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION = 'nightwatch.control-center-campaign-authority.v1' as const;

export type CampaignAuthorityState = 'AVAILABLE' | 'EMPTY' | 'BLOCKED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface CampaignAuthoritySnapshot {
  readonly schemaVersion: typeof CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION;
  readonly state: CampaignAuthorityState;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly plan: CampaignPlan | null;
  readonly coverage: CampaignCoverageReport | null;
  readonly findingCount: number;
  readonly blockerCodes: readonly string[];
  readonly sourceCurrentnessByMemberId: Readonly<Record<string, CampaignSourceCurrentness>>;
  readonly sourceGeneration: string | null;
  readonly generation: string | null;
}

export interface CampaignAuthority {
  /** An optional source snapshot lets the collector bind source/campaign generations. */
  readonly snapshot: (sourceSnapshot?: SourceAuthoritySnapshot) => CampaignAuthoritySnapshot;
}

const BRIDGE_DERIVATION_VERSION = 'nightwatch.phase24-campaign-bridge.v1';

function sortedCodes(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sourceCurrentnessFor(state: SourceAuthoritySnapshot['state']): CampaignSourceCurrentness {
  switch (state) {
    case 'AVAILABLE': return 'CURRENT';
    case 'STALE': return 'STALE';
    case 'UNAVAILABLE': return 'UNAVAILABLE';
    case 'EMPTY': return 'MISSING';
    case 'UNKNOWN': return 'AMBIGUOUS';
  }
}

function stateForSource(source: SourceAuthoritySnapshot): CampaignAuthorityState {
  switch (source.state) {
    case 'AVAILABLE': return 'AVAILABLE';
    case 'EMPTY': return 'EMPTY';
    case 'STALE': return 'BLOCKED';
    case 'UNAVAILABLE': return 'UNAVAILABLE';
    case 'UNKNOWN': return 'UNKNOWN';
  }
}

function sourceReasonFor(source: SourceAuthoritySnapshot): string {
  if (source.state === 'STALE') return 'CAMPAIGN_SOURCE_STALE';
  if (source.state === 'UNAVAILABLE') return 'CAMPAIGN_SOURCE_UNAVAILABLE';
  if (source.state === 'EMPTY') return 'CAMPAIGN_SOURCE_EMPTY';
  if (source.state === 'UNKNOWN') return 'CAMPAIGN_SOURCE_UNKNOWN';
  return 'CAMPAIGN_COMPOSITION_UNAVAILABLE';
}

function materialDepth(candidate: Phase24CandidateDecision): PortfolioMemberInput['depthClass'] {
  switch (candidate.materialClass) {
    case 'COLLECTION': return 'COLLECTION';
    case 'SHAPE': return 'SHAPE';
    case 'MEMBERSHIP':
    case 'RELATIONAL':
    case 'DIFFERENTIAL':
    case 'PROTOCOL': return 'TYPE';
  }
}

function costClass(candidate: Phase24CandidateDecision): PortfolioMemberInput['executionCostClass'] {
  if (candidate.expectedEvidenceValue === 'HIGH') return 'LOW';
  if (candidate.expectedEvidenceValue === 'MEDIUM') return 'MEDIUM';
  return 'HIGH';
}

function replayable(candidate: Phase24CandidateDecision): boolean {
  return candidate.replay?.strategy === 'DETERMINISTIC_FIXTURE' || candidate.replay?.strategy === 'FIRST_REPLAY';
}

function contractId(candidate: Phase24CandidateDecision): string {
  return candidate.contract?.contractId ?? candidate.semanticExpectationId;
}

function candidateCurrentness(candidate: Phase24CandidateDecision, source: SourceAuthoritySnapshot): CampaignSourceCurrentness {
  if (source.state === 'STALE') return 'STALE';
  if (source.state === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (source.state === 'UNKNOWN') return 'AMBIGUOUS';
  if (source.state === 'EMPTY') return 'MISSING';
  if (candidate.sourceVersion === 'CURRENT' && candidate.sourceAvailable) return 'CURRENT';
  if (candidate.sourceVersion === 'DRIFTED') return 'STALE';
  return 'UNAVAILABLE';
}

function memberInput(candidate: Phase24CandidateDecision, source: SourceAuthoritySnapshot): PortfolioMemberInput {
  const currentness = candidateCurrentness(candidate, source);
  return {
    targetId: candidate.targetId,
    journeyId: null,
    kind: 'API',
    semanticScope: candidate.semanticExpectationId,
    currentness: currentness === 'CURRENT' ? 'CURRENT' : currentness === 'STALE' ? 'STALE' : currentness === 'UNAVAILABLE' ? 'SOURCE_UNAVAILABLE' : 'NOT_EVALUATED',
    sourceSha: candidate.source?.sha ?? null,
    evidenceDigest: candidate.source?.evidenceDigest ?? null,
    derivationVersion: BRIDGE_DERIVATION_VERSION,
    contractVersion: candidate.contract?.version ?? null,
    depthClass: materialDepth(candidate),
    replayable: replayable(candidate),
    executionCostClass: costClass(candidate),
    starvationAgeBuckets: 0,
    historicalYield: EMPTY_PORTFOLIO_YIELD,
    ownerBlockedOperations: [],
    phaseFrozen: false,
  };
}

function campaignReasonFor(candidate: Phase24CandidateDecision): CampaignReasonCode[] {
  const reasons: CampaignReasonCode[] = [];
  for (const exclusion of candidate.exclusionReasons) {
    switch (exclusion.code) {
      case 'SOURCE_UNAVAILABLE':
      case 'SOURCE_IDENTITY_MISSING':
      case 'SOURCE_SHA_INVALID':
      case 'SOURCE_EVIDENCE_INVALID': reasons.push('SOURCE_UNAVAILABLE'); break;
      case 'SOURCE_VERSION_DRIFT': reasons.push('CURRENTNESS_STALE'); break;
      case 'REPLAY_UNSUPPORTED':
      case 'REPLAY_UNBOUNDED': reasons.push('NO_DETERMINISTIC_REPLAY'); break;
      case 'PROJECTION_UNSAFE': reasons.push('UNSUPPORTED_SURFACE'); break;
      case 'ROUTE_IDENTITY_UNPROVEN':
      case 'CONTRACT_IDENTITY_UNPROVEN':
      case 'SEMANTIC_CONTRACT_UNPROVEN': reasons.push('SEMANTIC_COVERAGE_DEFICIT'); break;
      default: reasons.push('EVIDENCE_NOT_EVALUATED'); break;
    }
  }
  return [...new Set(reasons)].sort((left, right) => left.localeCompare(right));
}

function candidateMetadata(candidate: Phase24CandidateDecision, memberId: string, selected: boolean): CampaignCandidateMetadata {
  const phase24Eligible = candidate.eligibility === 'ELIGIBLE';
  const supported = selected && phase24Eligible && candidate.readOnlySuitable && candidate.projectionSafe;
  return {
    memberId,
    product: candidate.product,
    surface: candidate.surfaceKey,
    journeyClass: candidate.targetId,
    apiClass: candidate.route?.method ?? null,
    semanticContractId: contractId(candidate),
    oracleFamilies: [candidate.materialClass],
    applicable: supported,
    supported,
    provenance: selected ? ['PHASE24_SOURCE_ANALYSIS', 'PHASE24_SELECTION'] : ['PHASE24_SOURCE_ANALYSIS'],
    semanticGapReasons: campaignReasonFor(candidate),
  };
}

function coverageFact(candidate: Phase24CandidateDecision, memberId: string, sourceCurrentness: CampaignSourceCurrentness): Parameters<typeof buildCampaignCoverageReportCached>[0]['facts'][number] {
  const supported = candidate.eligibility === 'ELIGIBLE' && candidate.readOnlySuitable && candidate.projectionSafe;
  const hasReplay = replayable(candidate);
  return {
    memberId,
    product: candidate.product,
    surface: candidate.surfaceKey,
    semanticContractId: contractId(candidate),
    expectationId: candidate.semanticExpectationId,
    sourceCurrentness,
    sourceSurfaceExists: true,
    sourceMechanicallyUnderstood: supported && candidate.routeIdentityProven && candidate.contractIdentityProven,
    semanticContractAdmitted: supported && candidate.semanticContractProven,
    syntheticDetectionProven: false,
    scenarioExercisesContract: false,
    replayAvailable: hasReplay,
    replayReproduces: false,
    minimizationSupported: false,
    triageClassifiable: false,
    dossierExplainable: false,
    unsupported: !supported,
    reasons: campaignReasonFor(candidate),
  };
}

function impactBinding(candidate: Phase24CandidateDecision, memberId: string, sourceCurrentness: CampaignSourceCurrentness): CampaignImpactBinding {
  const prefixes = candidate.relevantFiles.length > 0 ? candidate.relevantFiles : ['src'];
  return {
    memberId,
    product: candidate.product,
    surface: candidate.surfaceKey,
    journeyClass: candidate.targetId,
    semanticContractId: contractId(candidate),
    expectationIds: [candidate.semanticExpectationId],
    scenarioIds: [],
    affectedPathPrefixes: prefixes.slice(0, 32),
    sourceSha: candidate.source?.sha ?? null,
    evidenceDigest: candidate.source?.evidenceDigest ?? null,
    sourceCurrentness,
    supported: candidate.eligibility === 'ELIGIBLE',
    impactClasses: ['COVERAGE_ONLY'],
  };
}

function emptySnapshot(source: SourceAuthoritySnapshot, state: CampaignAuthorityState, sourceCurrentness: CampaignSourceCurrentness, blockerCodes: readonly string[]): CampaignAuthoritySnapshot {
  const normalizedBlockers = sortedCodes(blockerCodes);
  const generation = prefixedDigest24('cc-campaign-generation', {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION,
    sourceGeneration: source.generation,
    state,
    sourceCurrentness,
    blockerCodes: normalizedBlockers,
  });
  return {
    schemaVersion: CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION,
    state,
    sourceCurrentness,
    plan: null,
    coverage: null,
    findingCount: 0,
    blockerCodes: normalizedBlockers,
    sourceCurrentnessByMemberId: {},
    sourceGeneration: source.generation,
    generation,
  };
}

function compose(source: SourceAuthoritySnapshot): CampaignAuthoritySnapshot {
  const sourceCurrentness = sourceCurrentnessFor(source.state);
  if (source.phase24 === null) return emptySnapshot(source, stateForSource(source), sourceCurrentness, [sourceReasonFor(source), ...source.reasonCodes]);

  const selectedIds = new Set(source.phase24.selection.selectedCandidateIds);
  const selectedCandidates = source.phase24.portfolio.candidates
    .filter((candidate) => selectedIds.has(candidate.candidateId))
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  if (selectedCandidates.length === 0) return emptySnapshot(source, 'EMPTY', sourceCurrentness, ['EMPTY_CAMPAIGN', ...source.reasonCodes]);

  try {
    const approvedTargets = [...new Set(selectedCandidates.map((candidate) => candidate.targetId))].sort((left, right) => left.localeCompare(right));
    const memberInputs = selectedCandidates.map((candidate) => memberInput(candidate, source));
    const portfolio = buildPortfolio({ approvedTargets, memberInputs });
    const memberByTargetAndScope = new Map(portfolio.members.map((member) => [`${member.input.targetId}|${member.input.semanticScope}`, member.memberId]));
    const memberIdFor = (candidate: Phase24CandidateDecision): string => {
      const memberId = memberByTargetAndScope.get(`${candidate.targetId}|${candidate.semanticExpectationId}`);
      if (memberId === undefined) throw new Error('CAMPAIGN_PORTFOLIO_MEMBER_MISSING');
      return memberId;
    };
    const metadata = selectedCandidates.map((candidate) => candidateMetadata(candidate, memberIdFor(candidate), true));
    const facts = selectedCandidates.map((candidate) => coverageFact(candidate, memberIdFor(candidate), candidateCurrentness(candidate, source)));
    const bindings = selectedCandidates.map((candidate) => impactBinding(candidate, memberIdFor(candidate), candidateCurrentness(candidate, source)));
    const coverage = buildCampaignCoverageReportCached({ facts }).value;
    const impact = buildCampaignImpactReportCached({
      sourceCurrentness,
      changedFiles: [],
      bindings,
      knownExpectationIds: selectedCandidates.map((candidate) => candidate.semanticExpectationId),
      selection: null,
    }).value;
    // Phase 24 has already selected the complete input portfolio. The planner
    // materializes the existing campaign contract with a cap equal to that
    // source-authorized set; it cannot select another candidate.
    const plan = buildCampaignPlan({
      portfolio,
      sourceCurrentness,
      impact,
      coverage,
      candidates: metadata,
      maxSelectedItems: portfolio.members.length,
    });
    const expectedMemberIds = new Set(portfolio.members.map((member) => member.memberId));
    const actualMemberIds = new Set(plan.selectedItems.map((item) => item.memberId));
    if (expectedMemberIds.size !== actualMemberIds.size || [...expectedMemberIds].some((memberId) => !actualMemberIds.has(memberId))) {
      return emptySnapshot(source, 'UNKNOWN', sourceCurrentness, ['CAMPAIGN_SELECTOR_DRIFT']);
    }
    const sourceCurrentnessByMemberId = Object.fromEntries(selectedCandidates.map((candidate) => [memberIdFor(candidate), candidateCurrentness(candidate, source)]));
    const blockerCodes = sortedCodes(source.reasonCodes);
    const generation = prefixedDigest24('cc-campaign-generation', {
      schemaVersion: CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION,
      sourceGeneration: source.generation,
      state: 'AVAILABLE',
      sourceCurrentness,
      phase24Digest: source.phase24.deterministicDigest,
      planDigest: plan.deterministicDigest,
      coverageDigest: coverage.deterministicDigest,
      blockerCodes,
    });
    return {
      schemaVersion: CONTROL_CENTER_CAMPAIGN_AUTHORITY_VERSION,
      state: 'AVAILABLE',
      sourceCurrentness,
      plan,
      coverage,
      findingCount: 0,
      blockerCodes,
      sourceCurrentnessByMemberId,
      sourceGeneration: source.generation,
      generation,
    };
  } catch {
    return emptySnapshot(source, 'UNKNOWN', sourceCurrentness, ['CAMPAIGN_COMPOSITION_UNAVAILABLE']);
  }
}

/** Create the normal in-process campaign authority over the source bridge. */
export function createCampaignAuthority(input: { readonly sourceAuthority: SourceAuthority }): CampaignAuthority {
  return {
    snapshot: (sourceSnapshot) => compose(sourceSnapshot ?? input.sourceAuthority.snapshot()),
  };
}

/** Test-only in-process seam for synthetic campaign fixtures. */
export function createCampaignAuthorityForTests(
  value: CampaignAuthoritySnapshot | ((sourceSnapshot?: SourceAuthoritySnapshot) => CampaignAuthoritySnapshot),
): CampaignAuthority {
  return {
    snapshot: (sourceSnapshot) => typeof value === 'function' ? value(sourceSnapshot) : value,
  };
}
