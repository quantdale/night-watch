import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import type {
  ChangeSet,
  ChangedFile,
  ChangeSource,
  CommitMetadata,
  DirtyFile,
  RepoBaseline,
} from './types';
import { CHANGE_INTELLIGENCE_SCHEMA_VERSION, SELECTOR_VERSION } from './types';
import { changesetId } from './selection';
import { buildGitChildEnvironment } from '../process/childEnvironment';

interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runGit(repoPath: string, args: readonly string[]): GitResult {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    env: buildGitChildEnvironment(),
    timeout: 10_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { status: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function requireSha(value: string, label: string): string {
  if (!/^[0-9a-f]{7,64}$/i.test(value)) throw new Error(`${label} must be a hexadecimal commit SHA`);
  return value;
}

function requireGit(result: GitResult, command: readonly string[]): string {
  if (result.status !== 0) {
    const detail = (result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`).slice(0, 300);
    throw new Error(`git ${command.join(' ')} failed: ${detail}`);
  }
  return result.stdout;
}

function verifyCommit(repoPath: string, sha: string, label: string): void {
  requireGit(runGit(repoPath, ['cat-file', '-e', `${requireSha(sha, label)}^{commit}`]), ['cat-file', '-e', '<commit>^{commit}']);
}

function mergeBase(repoPath: string, baseSha: string, headSha: string): string | null {
  const result = runGit(repoPath, ['merge-base', baseSha, headSha]);
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

function parseNulFields(output: string): string[] {
  return output.split('\0').filter((field) => field.length > 0);
}

function parseNameStatus(repoId: string, output: string): ChangedFile[] {
  const fields = parseNulFields(output);
  const files: ChangedFile[] = [];
  let index = 0;
  while (index < fields.length) {
    const statusField = fields[index++];
    if (!statusField) continue;
    const code = statusField[0];
    if (code === 'R' || code === 'C') {
      const previousPath = fields[index++];
      const nextPath = fields[index++];
      if (!previousPath || !nextPath) throw new Error('malformed rename/copy name-status output');
      files.push({ repoId, path: nextPath, previousPath, status: code === 'R' ? 'rename' : 'add' });
      continue;
    }
    const path = fields[index++];
    if (!path) throw new Error('malformed name-status output');
    const status: ChangedFile['status'] = code === 'A' ? 'add' : code === 'D' ? 'delete' : 'modify';
    files.push({ repoId, path, status });
  }
  return files;
}

function parseDirtyStatus(repoId: string, output: string): DirtyFile[] {
  const fields = parseNulFields(output);
  const files: DirtyFile[] = [];
  let index = 0;
  while (index < fields.length) {
    const record = fields[index++];
    if (!record) continue;
    const code = record.slice(0, 2).trim();
    const firstPath = record.slice(3);
    if (code.startsWith('R') || code.startsWith('C')) {
      const nextPath = fields[index++];
      if (!nextPath) throw new Error('malformed dirty rename status output');
      files.push({ repoId, path: nextPath, previousPath: firstPath, status: code.startsWith('R') ? 'rename' : 'add' });
    } else {
      const status: DirtyFile['status'] = code === 'A' || code.includes('?') ? 'add' : code === 'D' ? 'delete' : 'modify';
      files.push({ repoId, path: firstPath, status });
    }
  }
  return files;
}

function parseCommits(output: string): CommitMetadata[] {
  const fields = parseNulFields(output);
  const commits: CommitMetadata[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const sha = fields[index];
    const timestamp = fields[index + 1];
    if (sha && timestamp) commits.push({ sha, timestamp });
  }
  return commits.sort((a, b) => a.sha.localeCompare(b.sha));
}

export interface CollectOptions {
  repoPath: string;
  repoId: string;
  baseSha: string;
  headSha: string;
  source?: Exclude<ChangeSource, 'DIRTY_WORKTREE_CHANGE'>;
  generatedAt?: Date;
  sourceWindow?: ChangeSet['sourceWindow'];
}

export function collectChangeset(options: CollectOptions): ChangeSet {
  const baseSha = requireSha(options.baseSha, 'baseSha');
  const headSha = requireSha(options.headSha, 'headSha');
  verifyCommit(options.repoPath, baseSha, 'baseSha');
  verifyCommit(options.repoPath, headSha, 'headSha');
  const files = parseNameStatus(options.repoId, requireGit(runGit(options.repoPath, ['diff', '--name-status', '--find-renames', '-z', baseSha, headSha, '--']), ['diff', '--name-status']));
  const dirtyFiles = parseDirtyStatus(options.repoId, requireGit(runGit(options.repoPath, ['status', '--porcelain=v1', '-z']), ['status', '--porcelain=v1']));
  const commits = parseCommits(requireGit(runGit(options.repoPath, ['log', '--format=%H%x00%cI', `${baseSha}..${headSha}`]), ['log', '--format=<sha><timestamp>', '<range>']));
  const baseline: RepoBaseline = {
    repoId: options.repoId,
    baseSha,
    headSha,
    mergeBase: mergeBase(options.repoPath, baseSha, headSha),
    rangeSemantics: 'BASE_SHA_TO_HEAD_SHA',
    source: options.source ?? 'COMMITTED_UPSTREAM_CHANGE',
    dirtyExcluded: true,
  };
  const partial: Omit<ChangeSet, 'changesetId'> = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    repoBaselines: [baseline],
    changedRepos: [options.repoId],
    changedFiles: files,
    commits,
    dirtyFiles,
    sourceWindow: options.sourceWindow ?? 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  return { ...partial, changesetId: changesetId({ ...partial, selectorVersion: SELECTOR_VERSION }) };
}

export interface MultiRepoCollectionInput extends CollectOptions {
  repoId: string;
}

export function combineChangesets(changesets: readonly ChangeSet[], generatedAt = new Date()): ChangeSet {
  const baselines = [...changesets].flatMap((changeset) => changeset.repoBaselines).sort((a, b) => a.repoId.localeCompare(b.repoId));
  const changedFiles = [...changesets].flatMap((changeset) => changeset.changedFiles).sort((a, b) => `${a.repoId}:${a.path}`.localeCompare(`${b.repoId}:${b.path}`));
  const dirtyFiles = [...changesets].flatMap((changeset) => changeset.dirtyFiles).sort((a, b) => `${a.repoId}:${a.path}`.localeCompare(`${b.repoId}:${b.path}`));
  const commits = [...changesets].flatMap((changeset) => changeset.commits).sort((a, b) => a.sha.localeCompare(b.sha));
  const partial: Omit<ChangeSet, 'changesetId'> = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    generatedAt: generatedAt.toISOString(),
    repoBaselines: baselines,
    changedRepos: [...new Set(baselines.map((baseline) => baseline.repoId))].sort(),
    changedFiles,
    commits: [...new Map(commits.map((commit) => [commit.sha, commit])).values()],
    dirtyFiles,
    sourceWindow: changesets.some((changeset) => changeset.sourceWindow === 'LOCAL_DEVELOPMENT_SHADOW_MODE') ? 'LOCAL_DEVELOPMENT_SHADOW_MODE' : 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  return { ...partial, changesetId: changesetId({ ...partial, selectorVersion: SELECTOR_VERSION }) };
}

export function syntheticChangeset(input: {
  repoId: string;
  baseSha?: string;
  headSha?: string;
  files: readonly ChangedFile[];
  source?: ChangeSource;
  generatedAt?: Date;
}): ChangeSet {
  const baseSha = input.baseSha ?? '0000000000000000000000000000000000000001';
  const headSha = input.headSha ?? '0000000000000000000000000000000000000002';
  const partial: Omit<ChangeSet, 'changesetId'> = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    generatedAt: (input.generatedAt ?? new Date('2026-08-12T00:00:00.000Z')).toISOString(),
    repoBaselines: [{ repoId: input.repoId, baseSha, headSha, mergeBase: baseSha, rangeSemantics: 'BASE_SHA_TO_HEAD_SHA', source: input.source ?? 'COMMITTED_UPSTREAM_CHANGE', dirtyExcluded: true }],
    changedRepos: [input.repoId],
    changedFiles: [...input.files],
    commits: [],
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  return { ...partial, changesetId: changesetId({ ...partial, selectorVersion: SELECTOR_VERSION }) };
}

export function addDirtyDevelopmentShadow(changeset: ChangeSet, dirtyFiles: readonly DirtyFile[]): ChangeSet {
  const changedFiles: ChangedFile[] = dirtyFiles.map((file) => ({ ...file }));
  const partial: Omit<ChangeSet, 'changesetId'> = { ...changeset, changedFiles: [...changeset.changedFiles, ...changedFiles], dirtyFiles, sourceWindow: 'LOCAL_DEVELOPMENT_SHADOW_MODE' };
  return { ...partial, changesetId: changesetId(partial) };
}

export function committedChangesetIdentity(changeset: ChangeSet): string {
  return crypto.createHash('sha256').update(JSON.stringify({ schemaVersion: changeset.schemaVersion, selectorVersion: changeset.selectorVersion, repoBaselines: changeset.repoBaselines, changedFiles: changeset.changedFiles })).digest('hex');
}
