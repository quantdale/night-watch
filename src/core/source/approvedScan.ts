// Phase 25 — fixed owner-approved source scan universe.
//
// This is data-only policy. It deliberately has no filesystem, process, or
// network authority; the sibling-source boundary performs all reads.

import { RIPPLE_REPOSITORIES } from '../changeIntelligence/map';
import { createRealSourceScanConfig } from './scan';
import type { RealSourceScanConfig } from './scanTypes';

// Owner-approved roots. C-02a adds `openapiv2` to the already-admitted
// `alphauslabs/blueapi` repository: a per-root change inside an existing
// member of the universe, not a new repository admission. `blueinternal` is
// deliberately absent — it is not a member of RIPPLE_REPOSITORIES at all and
// its admission is a REPOSITORY admission blocked behind C-05.
//
// C-03 admits the remaining `alphauslabs/blueapi` proto roots and the matching
// `alphauslabs/blue-sdk-go` roots. Both are per-root changes inside
// repositories that are already members of the universe, which is the same
// class of change C-02a made when it admitted `openapiv2` — not a repository
// admission. The owner authorized the blueapi roots directly; the SDK roots
// are mechanically required by the join, because ouchan registers through the
// generated SDK and the SDK's `ServiceName` constant is what proves the
// binding.
const SERVICE_ROOTS = Object.freeze([
  'admin', 'billing', 'cost', 'cover', 'flags', 'flow', 'gc', 'iam', 'luster',
  'operations', 'org', 'preferences', 'pricing', 'prism', 'vortex',
]);

const APPROVED_ROOTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'mobingilabs/ripple-ui': ['src'],
  'mobingilabs/ripple-api': ['src'],
  'mobingilabs/ouchan': ['services', 'pkg'],
  'alphauslabs/blueapi': [...SERVICE_ROOTS, 'openapiv2'],
  'alphauslabs/blue-sdk-go': [...SERVICE_ROOTS],
  'alphauslabs/grpc-chunk-parser': ['src'],
});

/** Per-repository file ceilings. `mobingilabs/ouchan` needs more than the
 * shared default: the enumeration walk counts every considered directory
 * entry, and `pkg` sorts before `services`, so at 1,024 the budget was spent
 * before a single registration daemon was reached — C-03 had literally no
 * input. 4,096 is the existing `MAX_SIBLING_SOURCE_SCAN_FILES` contract
 * ceiling and is NOT raised here; ouchan therefore stays truthfully TRUNCATED
 * and no whole-repository completeness is ever claimed for it. */
const REPOSITORY_MAX_FILES: Readonly<Record<string, number>> = Object.freeze({
  'mobingilabs/ouchan': 4096,
  // C-04. `ripple-ui` `src` holds 1,329 files and the walk charges every
  // considered directory entry, so at 1,024 it stopped after 773 — before
  // `src/vuex/api/`, which is where almost every HTTP call site lives. The
  // measured yield at the old budget was ONE edge.
  'mobingilabs/ripple-ui': 4096,
});

/** The enumeration walk charges bytes as well as entries, so a file ceiling
 * alone does not buy reach: at 16,000,000 bytes ouchan's walk still aborted
 * with `SOURCE_TOTAL_BUDGET_EXCEEDED` before any registration daemon. Its
 * admitted extensions total 29,893,105 bytes, so 48,000,000 leaves headroom
 * while staying under the 64,000,000 `MAX_SIBLING_SOURCE_SCAN_BYTES` contract
 * ceiling, which is NOT raised. */
const REPOSITORY_MAX_TOTAL_BYTES: Readonly<Record<string, number>> = Object.freeze({
  'mobingilabs/ouchan': 48_000_000,
});

const DEFAULT_MAX_FILES = 1024;
const DEFAULT_MAX_TOTAL_BYTES = 16_000_000;

// C-02b adds `.proto`. No root and no repository is added: the protobuf
// source it admits already lived inside `alphauslabs/blueapi` `billing` and
// `mobingilabs/ouchan` `pkg`, both approved since Phase 25.
const APPROVED_EXTENSIONS = ['.php', '.ts', '.tsx', '.js', '.jsx', '.go', '.json', '.yaml', '.yml', '.proto', '.vue'] as const;

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
      maxFiles: REPOSITORY_MAX_FILES[repoId] ?? DEFAULT_MAX_FILES,
      maxFileBytes: 2_000_000,
      maxTotalBytes: REPOSITORY_MAX_TOTAL_BYTES[repoId] ?? DEFAULT_MAX_TOTAL_BYTES,
    } as const;
  });
  return createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: repositories });
}
