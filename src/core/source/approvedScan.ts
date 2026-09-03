// Phase 25 — the owner-approved source scan configuration.
//
// This is data-only policy. It deliberately has no filesystem, process, or
// network authority; the sibling-source boundary performs all reads.
//
// C-05: the admitted SET is no longer decided here. It lives in
// `./universe.ts`, which is the single admission authority, and this module
// PROJECTS from it — adding only the per-repository scan budgets, which are
// operational limits rather than admission decisions.
//
// What changed behaviourally: admission used to be
// `RIPPLE_REPOSITORIES.filter(scope === 'IN_SCOPE')` INTERSECTED with a local
// roots literal, so a repository named in one record and absent from the other
// was silently not admitted. That is now `reconcileUniverseWithDependencyMap`,
// which THROWS on either direction of disagreement, because "the owner
// approved it and the map is stale" and "the map is right and the roots
// literal is stale" are not interchangeable and neither may be guessed.

import { RIPPLE_REPOSITORIES } from '../changeIntelligence/map';
import { createRealSourceScanConfig } from './scan';
import { approvedRootsFor, ownerApprovedRepositoryIds } from './universe';
import type { RealSourceScanConfig } from './scanTypes';

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

/**
 * Reconcile the admission authority against the change-intelligence map.
 *
 * Both records name repositories, for different reasons: the authority says
 * what may be READ, the map says what Nightwatch MODELS. They must agree, and
 * before C-05 a disagreement silently reduced the admitted set. Now each
 * direction is its own error, because the two mean opposite things:
 *
 *  - approved but not IN_SCOPE in the map: the owner approved a repository the
 *    model does not know about, so the map is stale;
 *  - IN_SCOPE in the map with no approved roots: the model claims a repository
 *    nothing may read, so one of the two records is wrong.
 *
 * Neither is guessable, so neither is guessed.
 */
function reconcileUniverseWithDependencyMap(): readonly string[] {
  const approved = ownerApprovedRepositoryIds();
  const inScope = RIPPLE_REPOSITORIES.filter((repository) => repository.scope === 'IN_SCOPE').map((repository) => repository.repoId);
  const inScopeSet = new Set(inScope);
  const missingFromMap = approved.filter((repoId) => !inScopeSet.has(repoId));
  if (missingFromMap.length > 0) {
    throw new Error(`REAL_SOURCE_SCAN_UNIVERSE_NOT_IN_DEPENDENCY_MAP:${missingFromMap.join(',')}`);
  }
  const approvedSet = new Set(approved);
  const missingFromUniverse = inScope.filter((repoId) => !approvedSet.has(repoId));
  if (missingFromUniverse.length > 0) {
    throw new Error(`REAL_SOURCE_SCAN_DEPENDENCY_MAP_NOT_IN_UNIVERSE:${missingFromUniverse.join(',')}`);
  }
  return approved;
}

/** The admitted set, projected from the single authority in `./universe.ts`. */
export const PHASE25_APPROVED_REPOSITORY_IDS = Object.freeze(reconcileUniverseWithDependencyMap());

/** Build the fixed initial Phase25 universe; arbitrary repositories are rejected. */
export function createApprovedRealSourceScanConfig(input: { readonly repositoryIds?: readonly string[] } = {}): RealSourceScanConfig {
  const requested = input.repositoryIds === undefined ? [...PHASE25_APPROVED_REPOSITORY_IDS] : [...new Set(input.repositoryIds)].sort();
  if (requested.length === 0 || requested.some((repoId) => !PHASE25_APPROVED_REPOSITORY_IDS.includes(repoId))) throw new Error('REAL_SOURCE_SCAN_APPROVED_UNIVERSE');
  const repositories = requested.map((repoId) => {
    const repository = RIPPLE_REPOSITORIES.find((candidate) => candidate.repoId === repoId);
    const roots = approvedRootsFor(repoId);
    if (repository === undefined || roots === null) throw new Error('REAL_SOURCE_SCAN_APPROVED_REPOSITORY');
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
