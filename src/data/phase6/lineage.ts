import { PHASE5_API_CATALOG } from '../../api/phase5/catalog';
import { apiOperationAffectedByChange, evaluateApiLineage } from '../../api/phase5/lineage';
import type { ChangedFile, RepoDefinition } from '../../core/changeIntelligence/types';
import { RIPPLE_REPOSITORIES } from '../../core/changeIntelligence/map';
import type { DataOracleSpec, DataOracleCatalog, SourceProvenance } from './types';

export type DataOracleStaleness = 'FRESH' | 'SOURCE_STALE' | 'REVIEW_REQUIRED';

export interface DataOracleLineageStatus {
  readonly oracleId: string;
  readonly apiOperationIds: readonly string[];
  readonly sourceRepos: readonly string[];
  readonly staleness: DataOracleStaleness;
  readonly reasons: readonly string[];
}

function repoIdFromSource(source: SourceProvenance): string {
  return source.repoId;
}

function sourcePath(source: SourceProvenance): string {
  return source.path;
}

function pathMatches(pattern: string, path: string): boolean {
  return pattern.endsWith('/') ? path.startsWith(pattern) : path === pattern;
}

function operationById(operationId: string) {
  return PHASE5_API_CATALOG.operations.find((operation) => operation.operationId === operationId);
}

export function evaluateDataOracleLineage(
  oracle: DataOracleSpec,
  repos: readonly RepoDefinition[] = RIPPLE_REPOSITORIES,
): DataOracleLineageStatus {
  const reasons: string[] = [];
  for (const operationId of oracle.apiOperationIds) {
    const operation = operationById(operationId);
    if (operation === undefined) {
      reasons.push(`API operation ${operationId} is absent from the Phase 5 catalog`);
      continue;
    }
    const apiLineage = evaluateApiLineage(operation, repos);
    if (apiLineage.staleness !== 'FRESH') reasons.push(...apiLineage.reasons.map((reason) => `${operationId}: ${reason}`));
  }
  for (const source of oracle.sourceLineage) {
    const repo = repos.find((candidate) => candidate.repoId === source.repoId);
    if (repo === undefined) reasons.push(`source repo ${source.repoId} is absent from the Phase 3 snapshot`);
    else if (repo.checkedOutSha !== source.sourceSHA) reasons.push(`${source.repoId}:${source.path} source ${source.sourceSHA} differs from checked-out ${repo.checkedOutSha}`);
  }
  const sourceRepos = [...new Set(oracle.sourceLineage.map(repoIdFromSource))].sort();
  const sourceStale = reasons.some((reason) => reason.includes('differs from checked-out') || reason.includes('absent from the Phase 3 snapshot'));
  const review = reasons.length > 0;
  return {
    oracleId: oracle.oracleId,
    apiOperationIds: oracle.apiOperationIds,
    sourceRepos,
    staleness: sourceStale ? 'SOURCE_STALE' : review ? 'REVIEW_REQUIRED' : 'FRESH',
    reasons,
  };
}

export function dataOracleAffectedByChange(oracle: DataOracleSpec, changedFiles: readonly ChangedFile[]): boolean {
  for (const operationId of oracle.apiOperationIds) {
    const operation = operationById(operationId);
    if (operation !== undefined && apiOperationAffectedByChange(operation, changedFiles)) return true;
  }
  return changedFiles.some((file) => oracle.sourceLineage.some((source) => source.repoId === file.repoId && (pathMatches(sourcePath(source), file.path) || (file.previousPath !== undefined && pathMatches(sourcePath(source), file.previousPath)))));
}

export function evaluateDataCatalogLineage(
  catalog: DataOracleCatalog,
  repos: readonly RepoDefinition[] = RIPPLE_REPOSITORIES,
): readonly DataOracleLineageStatus[] {
  return catalog.oracles.map((oracle) => evaluateDataOracleLineage(oracle, repos));
}
