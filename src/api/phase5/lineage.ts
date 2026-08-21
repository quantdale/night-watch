import { DEPENDENCY_MAP_VERSION, RIPPLE_DEPENDENCY_EDGES, RIPPLE_REPOSITORIES } from '../../core/changeIntelligence/map';
import type { ChangedFile, RepoDefinition } from '../../core/changeIntelligence/types';
import type { ApiOperation, JourneyLink } from './types';

// Phase 15P A15 convergence: staleness/lineage shapes are module-private; no
// external callers remain (grep-proven across src/tests/bin/corpus/config).
type ApiStaleness = 'FRESH' | 'SOURCE_STALE' | 'REVIEW_REQUIRED';

interface ApiLineage {
  operationId: string;
  journeyLinks: readonly JourneyLink[];
  sourceRepos: readonly string[];
  dependencyMapVersion: string;
  staleness: ApiStaleness;
  reasons: readonly string[];
}

function sourcePath(provenance: string): string | undefined {
  const marker = provenance.indexOf(':');
  if (marker < 0) return undefined;
  const path = provenance.slice(marker + 1).split(' ')[0];
  return path !== undefined && path.includes('/') ? path : undefined;
}

function sourceRepoId(provenance: string): string | undefined {
  const marker = provenance.indexOf('@');
  if (marker < 0) return undefined;
  return provenance.slice(0, marker);
}

function pathMatches(pattern: string, path: string): boolean {
  return pattern.endsWith('/') ? path.startsWith(pattern) : path === pattern;
}

function repoSnapshot(repoId: string, repos: readonly RepoDefinition[]): RepoDefinition | undefined {
  return repos.find((repo) => repo.repoId === repoId);
}

export function evaluateApiLineage(operation: ApiOperation, repos: readonly RepoDefinition[] = RIPPLE_REPOSITORIES): ApiLineage {
  const reasons: string[] = [];
  const sourceRepo = repoSnapshot(operation.sourceRepo, repos);
  if (sourceRepo === undefined) reasons.push(`source repo ${operation.sourceRepo} is not in the Phase 3 snapshot`);
  else if (sourceRepo.checkedOutSha !== operation.sourceSHA) reasons.push(`operation source ${operation.sourceSHA} differs from checked-out ${sourceRepo.checkedOutSha}`);

  const edges = RIPPLE_DEPENDENCY_EDGES.filter((edge) => operation.journeyLinks.some((journey) => edge.journeyIds === 'ALL' || edge.journeyIds.includes(journey)));
  for (const edge of edges) {
    const repo = repoSnapshot(edge.repoId, repos);
    if (repo === undefined || repo.checkedOutSha !== edge.sourceMapSha) reasons.push(`Phase 3 edge ${edge.edgeId} is stale`);
  }
  const sourceStale = sourceRepo === undefined || sourceRepo.checkedOutSha !== operation.sourceSHA;
  const edgeStale = reasons.some((reason) => reason.includes('edge') && reason.includes('stale'));
  const sourceRepos = [...new Set([operation.sourceRepo, ...operation.sourceProvenance.map(sourceRepoId).filter((value): value is string => value !== undefined)])].sort();
  return {
    operationId: operation.operationId,
    journeyLinks: operation.journeyLinks,
    sourceRepos,
    dependencyMapVersion: DEPENDENCY_MAP_VERSION,
    staleness: sourceStale ? 'SOURCE_STALE' : edgeStale ? 'REVIEW_REQUIRED' : 'FRESH',
    reasons,
  };
}

export function apiOperationAffectedByChange(operation: ApiOperation, changedFiles: readonly ChangedFile[]): boolean {
  const operationPaths = new Set(operation.sourceProvenance.map(sourcePath).filter((value): value is string => value !== undefined));
  const operationRepos = new Set([operation.sourceRepo, ...operation.sourceProvenance.map(sourceRepoId).filter((value): value is string => value !== undefined)]);
  for (const file of changedFiles) {
    if (operationRepos.has(file.repoId) && [...operationPaths].some((pattern) => pathMatches(pattern, file.path) || (file.previousPath !== undefined && pathMatches(pattern, file.previousPath)))) return true;
    if (operation.journeyLinks.length > 0 && RIPPLE_DEPENDENCY_EDGES.some((edge) => edge.repoId === file.repoId && operation.journeyLinks.some((journey) => edge.journeyIds === 'ALL' || edge.journeyIds.includes(journey)) && pathMatches(edge.pathPattern, file.path))) return true;
  }
  return false;
}

export function assertApiOperationFresh(operation: ApiOperation, repos?: readonly RepoDefinition[]): void {
  const lineage = evaluateApiLineage(operation, repos);
  if (lineage.staleness !== 'FRESH') throw new Error(`SOURCE_STALE: ${operation.operationId}: ${lineage.reasons.join('; ')}`);
}
