// ---------------------------------------------------------------------------
// Nightwatch source/change correlation.
//
// Correlation produces source-change candidates only. It does not infer a
// deployed cause, read deployment state, or use datastore evidence.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { snapshotRepositories, type SnapshotOptions } from '../repositories/snapshotter';
import { RIPPLE_DEPENDENCY_EDGES, RIPPLE_REPOSITORIES } from '../changeIntelligence/map';
import type { ChangedFile, DependencyEdge, JourneyId, RepoDefinition } from '../changeIntelligence/types';
import type { SourceChangeCandidate, SourceCorrelationResult, SourceFreshness, TriageConfidence } from './types';

function canonicalPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function matches(edge: DependencyEdge, file: ChangedFile): boolean {
  const path = canonicalPath(file.path);
  const pattern = canonicalPath(edge.pathPattern);
  const previous = file.previousPath === undefined ? false : edge.match === 'EXACT'
    ? canonicalPath(file.previousPath) === pattern
    : canonicalPath(file.previousPath).startsWith(pattern);
  return edge.match === 'EXACT' ? path === pattern || previous : path.startsWith(pattern) || previous;
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex').slice(0, 24);
}

function relevanceFor(edge: DependencyEdge): SourceChangeCandidate['relevance'] {
  if (edge.impactClass === 'DIRECT_JOURNEY_CHANGE' || edge.impactClass === 'DIRECT_ROUTE_CHANGE' || edge.impactClass === 'DIRECT_API_CLIENT_CHANGE' || edge.impactClass === 'DIRECT_BACKEND_HANDLER_CHANGE') return 'DIRECT_CHANGE_RELEVANCE';
  if (edge.impactClass === 'SHARED_AUTH_CHANGE' || edge.impactClass === 'SHARED_ROUTER_CHANGE' || edge.impactClass === 'SHARED_LAYOUT_CHANGE' || edge.impactClass === 'SHARED_API_TRANSPORT_CHANGE' || edge.impactClass === 'SHARED_STATE_INITIALIZATION_CHANGE' || edge.impactClass === 'CONTRACT_CHANGE') return 'SHARED_CHANGE_RELEVANCE';
  if (edge.impactClass === 'TRANSITIVE_DEPENDENCY_CHANGE') return 'TRANSITIVE_CHANGE_RELEVANCE';
  return 'NO_CURRENT_CHANGE_RELEVANCE';
}

function confidenceFor(relevance: SourceChangeCandidate['relevance'], freshness: SourceFreshness, stale: boolean): TriageConfidence {
  if (freshness === 'UNKNOWN' || stale) return 'UNRESOLVED';
  return relevance === 'DIRECT_CHANGE_RELEVANCE' ? 'HIGH' : relevance === 'SHARED_CHANGE_RELEVANCE' ? 'MEDIUM' : 'LOW';
}

export interface SourceCorrelationInput {
  readonly journeyIds: readonly JourneyId[];
  readonly changedFiles: readonly ChangedFile[];
  readonly sourceFreshness: SourceFreshness;
  readonly sourceVersion?: string;
  readonly edges?: readonly DependencyEdge[];
  readonly repos?: readonly RepoDefinition[];
}

export function correlateSourceChanges(input: SourceCorrelationInput): SourceCorrelationResult {
  const edges = input.edges ?? RIPPLE_DEPENDENCY_EDGES;
  const repos = input.repos ?? RIPPLE_REPOSITORIES;
  const candidates: SourceChangeCandidate[] = [];
  for (const file of input.changedFiles) {
    const matchesForFile = edges.filter((edge) => (edge.journeyIds === 'ALL' || edge.journeyIds.some((journey) => input.journeyIds.includes(journey))) && edge.repoId === file.repoId && matches(edge, file));
    for (const edge of matchesForFile) {
      const repo = repos.find((candidate) => candidate.repoId === edge.repoId);
      const stale = repo === undefined || repo.sourceMapSha !== edge.sourceMapSha;
      const relevance = stale ? 'UNKNOWN' : relevanceFor(edge);
      candidates.push({
        repoId: file.repoId,
        path: canonicalPath(file.path),
        edgeId: edge.edgeId,
        relevance,
        confidence: confidenceFor(relevance, input.sourceFreshness, stale),
        sourceFreshness: input.sourceFreshness,
        reason: stale ? 'dependency edge/source map freshness is unresolved' : edge.evidence,
        claim: 'SOURCE_CHANGE_CANDIDATE',
      });
    }
  }
  const unique = [...new Map(candidates.map((candidate) => [`${candidate.repoId}:${candidate.path}:${candidate.edgeId ?? ''}`, candidate])).values()]
    .sort((a, b) => `${a.repoId}:${a.path}:${a.edgeId ?? ''}`.localeCompare(`${b.repoId}:${b.path}:${b.edgeId ?? ''}`));
  const overallRelevance: SourceCorrelationResult['overallRelevance'] = unique.some((item) => item.relevance === 'DIRECT_CHANGE_RELEVANCE')
    ? 'DIRECT_CHANGE_RELEVANCE'
    : unique.some((item) => item.relevance === 'SHARED_CHANGE_RELEVANCE')
      ? 'SHARED_CHANGE_RELEVANCE'
      : unique.some((item) => item.relevance === 'TRANSITIVE_CHANGE_RELEVANCE')
        ? 'TRANSITIVE_CHANGE_RELEVANCE'
        : unique.some((item) => item.relevance === 'UNKNOWN') ? 'UNKNOWN' : 'NO_CURRENT_CHANGE_RELEVANCE';
  return {
    sourceVersion: input.sourceVersion ?? `source-correlation:sha256:${digest({ journeyIds: [...input.journeyIds].sort(), changedFiles: input.changedFiles })}`,
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
    candidates: unique,
    overallRelevance,
    rootCauseClaim: 'NONE',
  };
}

export interface RelevantRepoBeforeState {
  readonly captured: true;
  readonly repos: readonly {
    readonly repoId: string;
    readonly branch: string;
    readonly headSha: string;
    readonly trackingRef: string | null;
    readonly dirtyFileCount: number;
  }[];
}

/**
 * Capture only the explicitly relevant Alphaus repositories. This is a
 * read-only before-state proof; it does not clean, reset, stash, fetch, or
 * otherwise mutate a worktree.
 */
export async function captureRelevantRepoBeforeState(options: SnapshotOptions & { readonly repoIds: readonly string[] }): Promise<RelevantRepoBeforeState> {
  const allowed = new Set(options.repoIds);
  const snapshots = await snapshotRepositories({ ...options, repos: options.repos.filter((repo) => allowed.has(repo)) });
  return {
    captured: true,
    repos: snapshots.map((snapshot) => ({
      repoId: snapshot.path,
      branch: snapshot.branch,
      headSha: snapshot.headSha,
      trackingRef: snapshot.upstream,
      dirtyFileCount: snapshot.dirtyFileCount,
    })),
  };
}

