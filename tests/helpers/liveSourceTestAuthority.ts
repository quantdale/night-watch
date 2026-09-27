import { RIPPLE_REPOSITORIES } from '../../src/core/changeIntelligence/map';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { resolveSiblingRoot } from '../../src/core/policy/sourceTopology';
import { ownerApprovedRepositoryIds } from '../../src/core/source/universe';

export type LiveSourceTestStateKind = 'CURRENT' | 'STALE' | 'UNAVAILABLE';

export interface LiveSourceRepoState {
  readonly repoId: string;
  readonly kind: LiveSourceTestStateKind;
  readonly expectedSha: string;
  readonly observedSha: string | null;
}

export interface LiveSourceTestState {
  readonly kind: LiveSourceTestStateKind;
  readonly root: string;
  readonly repositories: readonly LiveSourceRepoState[];
}

const EXPECTED_SHA_BY_REPO: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  RIPPLE_REPOSITORIES.map((repository) => [repository.repoId, repository.checkedOutSha]),
));

export function liveSourceTestRoot(environment: NodeJS.ProcessEnv = process.env): string {
  // M6 (7.8/B-10): tests resolve the root through the SAME authority as
  // production, so a relocated sibling universe is honoured identically.
  return resolveSiblingRoot({ environment });
}

export function classifyLiveSourceTestState(input: {
  readonly root?: string;
  readonly repositoryIds?: readonly string[];
} = {}): LiveSourceTestState {
  const root = input.root ?? liveSourceTestRoot();
  const repositoryIds = [...(input.repositoryIds ?? ownerApprovedRepositoryIds())].sort();
  if (repositoryIds.length === 0) throw new Error('LIVE_SOURCE_TEST_REPOSITORIES_EMPTY');
  const access = createSiblingSourceAccess(root, { admittedRepositoryIds: repositoryIds });
  const repositories = repositoryIds.map((repoId): LiveSourceRepoState => {
    const expectedSha = EXPECTED_SHA_BY_REPO[repoId];
    if (expectedSha === undefined) throw new Error('LIVE_SOURCE_TEST_EXPECTED_SHA_MISSING');
    const observedSha = access.currentness.currentSnapshot(repoId)?.sha ?? null;
    const kind: LiveSourceTestStateKind = observedSha === null
      ? 'UNAVAILABLE'
      : observedSha === expectedSha ? 'CURRENT' : 'STALE';
    return { repoId, kind, expectedSha, observedSha };
  });
  const kind: LiveSourceTestStateKind = repositories.some((entry) => entry.kind === 'UNAVAILABLE')
    ? 'UNAVAILABLE'
    : repositories.some((entry) => entry.kind === 'STALE') ? 'STALE' : 'CURRENT';
  return { kind, root, repositories };
}
