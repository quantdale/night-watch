import { assertNoRawArtifactFields, assertSourceIdentity, canonical, digest, invalid, sortedUnique } from './common';
import { buildPhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_SOURCE_ANALYSIS_VERSION,
  type Phase24CandidateInput,
  type Phase24SourceIdentity,
  type Phase24SourceSnapshotAnalysis,
} from './types';

function sameSource(left: Phase24SourceIdentity | null, right: Phase24SourceIdentity): boolean {
  return left !== null && canonical(left) === canonical(right);
}

/**
 * Convert one fixed, source-only surface inventory into the Phase 24 portfolio.
 * The adapter never reads source itself: an upstream bounded extractor supplies
 * route, contract, ownership, semantic, and safety facts at one exact SHA.
 * A surface from another snapshot is retained but excluded, never rebound.
 */
export function analyzePhase24SourceSnapshot(input: {
  readonly snapshot: Phase24SourceIdentity;
  readonly surfaces: readonly Phase24CandidateInput[];
}): Phase24SourceSnapshotAnalysis {
  assertNoRawArtifactFields(input);
  assertSourceIdentity(input.snapshot, 'SNAPSHOT');
  if (!Array.isArray(input.surfaces) || input.surfaces.length === 0 || input.surfaces.length > 128) invalid('SOURCE_SURFACE_COUNT');
  const surfaces = input.surfaces.map((surface) => ({
    ...surface,
    sourceSnapshotMatches: surface.source === null ? true : sameSource(surface.source, input.snapshot),
  }));
  const portfolio = buildPhase24CandidatePortfolio({ candidates: surfaces });
  const discoveredSurfaceKeys = sortedUnique(portfolio.candidates.map((candidate) => candidate.surfaceKey));
  const eligibleSurfaceKeys = sortedUnique(portfolio.candidates.filter((candidate) => candidate.eligibility === 'ELIGIBLE').map((candidate) => candidate.surfaceKey));
  const excludedSurfaceKeys = sortedUnique(portfolio.candidates.filter((candidate) => candidate.eligibility === 'EXCLUDED').map((candidate) => candidate.surfaceKey));
  const core = {
    schemaVersion: PHASE24_SOURCE_ANALYSIS_VERSION,
    snapshot: input.snapshot,
    portfolio,
    discoveredSurfaceKeys,
    eligibleSurfaceKeys,
    excludedSurfaceKeys,
    reasonCodeCoverage: portfolio.reasonCodeCoverage,
  };
  return { ...core, deterministicDigest: digest('source-analysis:', core) };
}

export function validatePhase24SourceSnapshotAnalysis(analysis: Phase24SourceSnapshotAnalysis): void {
  assertNoRawArtifactFields(analysis);
  if (analysis.schemaVersion !== PHASE24_SOURCE_ANALYSIS_VERSION) invalid('SOURCE_ANALYSIS_SCHEMA');
  assertSourceIdentity(analysis.snapshot, 'ANALYSIS_SNAPSHOT');
  const core = {
    schemaVersion: analysis.schemaVersion,
    snapshot: analysis.snapshot,
    portfolio: analysis.portfolio,
    discoveredSurfaceKeys: analysis.discoveredSurfaceKeys,
    eligibleSurfaceKeys: analysis.eligibleSurfaceKeys,
    excludedSurfaceKeys: analysis.excludedSurfaceKeys,
    reasonCodeCoverage: analysis.reasonCodeCoverage,
  };
  if (analysis.deterministicDigest !== digest('source-analysis:', core)) invalid('SOURCE_ANALYSIS_DIGEST');
}
