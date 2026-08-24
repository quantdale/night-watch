// Phase 25 — fixed owner-approved source scan universe.
//
// This is data-only policy. It deliberately has no filesystem, process, or
// network authority; the sibling-source boundary performs all reads.

import { RIPPLE_REPOSITORIES } from '../changeIntelligence/map';
import { createRealSourceScanConfig } from './scan';
import type { RealSourceScanConfig } from './scanTypes';

const APPROVED_ROOTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'mobingilabs/ripple-ui': ['src'],
  'mobingilabs/ripple-api': ['src'],
  'mobingilabs/ouchan': ['services', 'pkg'],
  'alphauslabs/blueapi': ['billing'],
  'alphauslabs/blue-sdk-go': ['billing'],
  'alphauslabs/grpc-chunk-parser': ['src'],
});

const APPROVED_EXTENSIONS = ['.php', '.ts', '.tsx', '.js', '.jsx', '.go', '.json', '.yaml', '.yml'] as const;

export const PHASE25_APPROVED_REPOSITORY_IDS = Object.freeze(
  RIPPLE_REPOSITORIES.filter((repository) => repository.scope === 'IN_SCOPE' && APPROVED_ROOTS[repository.repoId] !== undefined).map((repository) => repository.repoId).sort(),
);

/** Build the fixed initial Phase25 universe; arbitrary repositories are rejected. */
export function createApprovedRealSourceScanConfig(input: { readonly repositoryIds?: readonly string[] } = {}): RealSourceScanConfig {
  const requested = input.repositoryIds === undefined ? [...PHASE25_APPROVED_REPOSITORY_IDS] : [...new Set(input.repositoryIds)].sort();
  if (requested.length === 0 || requested.some((repoId) => !PHASE25_APPROVED_REPOSITORY_IDS.includes(repoId))) throw new Error('REAL_SOURCE_SCAN_APPROVED_UNIVERSE');
  const repositories = requested.map((repoId) => {
    const repository = RIPPLE_REPOSITORIES.find((candidate) => candidate.repoId === repoId);
    const roots = APPROVED_ROOTS[repoId];
    if (repository === undefined || roots === undefined) throw new Error('REAL_SOURCE_SCAN_APPROVED_REPOSITORY');
    return {
      repoId,
      expectedSourceSha: repository.checkedOutSha,
      allowlistedRoots: roots,
      allowedExtensions: APPROVED_EXTENSIONS,
      maxFiles: 1024,
      maxFileBytes: 2_000_000,
      maxTotalBytes: 16_000_000,
    } as const;
  });
  return createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: repositories });
}
