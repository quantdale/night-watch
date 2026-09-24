import { RIPPLE_REPOSITORIES } from '../../src/core/changeIntelligence/map';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
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
  const configured = environment['NIGHTWATCH_REPOS_ROOT'] ?? environment['NIGHTWATCH_SIBLING_ROOT'];
  const trimmed = configured?.trim();
  return trimmed === undefined || trimmed === '' ? DEFAULT_SIBLING_ROOT : trimmed;
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
