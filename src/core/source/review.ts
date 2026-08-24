// Phase 25 — explainable local review queue over the existing Phase24 choice.

import { safeSemanticDigest } from '../semanticCoverage/types';
import type { Phase24CandidatePortfolio, Phase24PortfolioSelection } from '../phase24/types';
import type { SourceSurfaceDiscovery } from './surfaces';
import type { SourceSurfaceChangeReport } from './surfaceTypes';

export const REAL_SOURCE_REVIEW_QUEUE_VERSION = 'nightwatch.real-source-review-queue.v1' as const;

export interface SourceReviewQueueRow {
  readonly surfaceId: string;
  readonly targetId: string;
  readonly eligibility: 'ELIGIBLE' | 'EXCLUDED';
  readonly score: number;
  readonly rank: number | null;
  readonly selected: boolean;
  readonly componentState: string;
  readonly runtimeBinding: string;
  readonly lifecycle: string;
  readonly reasons: readonly string[];
  readonly priorityFactors: readonly string[];
  readonly explanation: readonly string[];
}

export interface SourceReviewQueue {
  readonly schemaVersion: typeof REAL_SOURCE_REVIEW_QUEUE_VERSION;
  readonly rows: readonly SourceReviewQueueRow[];
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly selectedCount: number;
  readonly deterministicDigest: string;
}

function explanation(input: { readonly row: SourceReviewQueueRow; readonly surface: SourceSurfaceDiscovery['surfaces'][number] }): readonly string[] {
  const values: string[] = [...input.row.priorityFactors];
  if (input.surface.operation.runtimeBinding === 'RUNTIME_BOUND_EXACT') values.push('RUNTIME_BOUND_EXACT');
  else values.push(`RUNTIME_${input.surface.operation.runtimeBinding}`);
  if (input.surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY') values.push('READ_ONLY_PROVEN');
  else values.push(`READ_ONLY_${input.surface.operation.readOnlyClassification}`);
  if (input.surface.contract.semanticProof === 'PROVEN') values.push('SEMANTIC_CONTRACT_PROVEN');
  else values.push('SEMANTIC_CONTRACT_UNPROVEN');
  if (input.surface.replayCapability === 'SUPPORTED') values.push('REPLAY_SUPPORTED');
  if (input.row.componentState === 'EXACT_COMPONENT') values.push('COMPONENT_EXACT');
  if (input.row.selected) values.push(`PHASE24_SELECTED_${input.row.rank ?? 'UNRANKED'}`);
  if (input.row.eligibility === 'EXCLUDED') values.push(...input.row.reasons.map((reason) => `EXCLUDED_${reason}`));
  return [...new Set(values)].sort();
}

/** Rank/explain without changing the Phase24 planner's authority or score. */
export function buildSourceReviewQueue(input: { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio; readonly selection: Phase24PortfolioSelection; readonly changeReport?: SourceSurfaceChangeReport }): SourceReviewQueue {
  const selectionByCandidate = new Map(input.selection.rows.map((row) => [row.candidateId, row]));
  const rows = input.discovery.surfaces.map((surface) => {
    const candidate = input.portfolio.candidates.find((entry) => entry.surfaceKey === surface.surfaceId);
    if (candidate === undefined) throw new Error('REAL_SOURCE_REVIEW_CANDIDATE_MISSING');
    const selected = selectionByCandidate.get(candidate.candidateId);
    const row: SourceReviewQueueRow = {
      surfaceId: surface.surfaceId,
      targetId: candidate.targetId,
      eligibility: candidate.eligibility,
      score: selected?.score ?? 0,
      rank: selected?.rank ?? null,
      selected: selected?.selected ?? false,
      componentState: surface.componentProvenance.state,
      runtimeBinding: surface.operation.runtimeBinding,
      lifecycle: surface.lifecycle,
      reasons: [...new Set([...surface.exclusionReasons, ...candidate.reasonCodes])].sort(),
      priorityFactors: priorityFactors(surface, input.changeReport),
      explanation: [],
    };
    return { ...row, explanation: explanation({ row, surface }) };
  }).sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) || right.score - left.score || left.surfaceId.localeCompare(right.surfaceId));
  const core = { schemaVersion: REAL_SOURCE_REVIEW_QUEUE_VERSION, rows, eligibleCount: input.portfolio.eligibleCount, excludedCount: input.portfolio.excludedCount, selectedCount: input.selection.selectedCandidateIds.length };
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-review-queue') };
}

function stableSurfaceKey(surface: SourceSurfaceDiscovery['surfaces'][number]): string {
  const operation = surface.operation;
  return `${operation.repository}:${operation.sourcePath}:${operation.method}:${operation.routeTemplate}:${operation.handlerPath ?? ''}:${operation.handlerSymbol ?? ''}`;
}

function priorityFactors(surface: SourceSurfaceDiscovery['surfaces'][number], changeReport?: SourceSurfaceChangeReport): readonly string[] {
  const operation = surface.operation;
  const surfaceKey = stableSurfaceKey(surface);
  const provenJoins = surface.joins.filter((join) => join.state === 'PROVEN').length;
  const proofDepth = [
    operation.routeProof === 'PROVEN',
    provenJoins > 0,
    surface.contract.requestProof === 'PROVEN',
    surface.contract.responseProof === 'PROVEN',
    surface.contract.semanticProof === 'PROVEN',
    operation.readOnlyClassification === 'PROVEN_READ_ONLY',
    operation.runtimeBinding === 'RUNTIME_BOUND_EXACT',
    surface.componentProvenance.state === 'EXACT_COMPONENT',
    surface.replayCapability === 'SUPPORTED',
  ].filter(Boolean).length;
  const factors = [
    operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' ? 'RUNTIME_BOUND' : 'SOURCE_ONLY_OR_UNRESOLVED',
    operation.readOnlyClassification === 'PROVEN_READ_ONLY' ? 'READ_ONLY_CONFIDENCE_HIGH' : 'READ_ONLY_CONFIDENCE_INCOMPLETE',
    surface.contract.semanticProof === 'PROVEN' ? 'SEMANTIC_DEPTH_PROVEN' : 'SEMANTIC_GAP_PRESENT',
    surface.componentProvenance.state === 'EXACT_COMPONENT' ? 'COMPONENT_CONFIDENCE_EXACT' : 'COMPONENT_CONFIDENCE_INCOMPLETE',
    surface.replayCapability === 'SUPPORTED' ? 'REPLAY_SUPPORTED' : 'REPLAY_NOT_READY',
    `MECHANICAL_PROOF_DEPTH_${proofDepth}`,
  ];
  if (changeReport !== undefined && [...changeReport.changedOperations, ...changeReport.changedHandlers, ...changeReport.changedRequestContracts, ...changeReport.changedResponseContracts, ...changeReport.changedSemanticContracts].includes(surfaceKey)) factors.push('SOURCE_CHANGED_REVIEW_PRIORITY');
  return [...new Set(factors)].sort();
}

export function explainSourceSurface(input: { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio; readonly selection: Phase24PortfolioSelection; readonly surfaceId: string; readonly changeReport?: SourceSurfaceChangeReport }): SourceReviewQueueRow | null {
  return buildSourceReviewQueue({ discovery: input.discovery, portfolio: input.portfolio, selection: input.selection, changeReport: input.changeReport }).rows.find((row) => row.surfaceId === input.surfaceId) ?? null;
}
