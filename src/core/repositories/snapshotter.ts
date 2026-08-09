// ---------------------------------------------------------------------------
// Nightwatch — repository snapshotter (READ-ONLY git collector).
//
// Captures the git state of local repositories without modifying them:
// branch, HEAD SHA, upstream tracking ref, ahead/behind counts, dirty status
// and last-commit time. Only read-only plumbing commands are ever run:
//
//   git rev-parse, git rev-list, git status --porcelain, git log
//
// NEVER fetch/pull/checkout/reset/stash/clean/commit/push — nothing that
// writes refs, the reflog, or the working tree. One benign side effect:
// `git status` may refresh the index stat cache (git-internal bookkeeping in
// .git/index); that never changes branch, HEAD, refs, or working-tree files.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { RepoSnapshotRecord } from '../evidence/types';

export interface SnapshotOptions {
  /** Root directory containing the repositories (each repo is one subdir). */
  reposRoot: string;
  /** Repo directory names relative to reposRoot, in snapshot order. */
  repos: string[];
  /** Injectable clock (determinism in tests); defaults to new Date(). */
  now?: () => Date;
}

interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Max length of the error detail recorded on a failed snapshot. */
const MAX_ERROR_LENGTH = 300;

function runGit(abs: string, args: string[]): GitResult {
  const res = spawnSync('git', ['-C', abs, ...args], { encoding: 'utf8' });
  if (res.error) throw res.error; // spawn failure (e.g. git missing)
  return { status: res.status ?? -1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function failDetail(res: GitResult, args: string[]): string {
  const detail = (res.stderr.trim() || res.stdout.trim() || `exit code ${res.status}`).slice(
    0,
    MAX_ERROR_LENGTH
  );
  return `git ${args.join(' ')} failed: ${detail}`;
}

function snapshotOne(abs: string, repo: string, now: () => Date): RepoSnapshotRecord {
  const record: RepoSnapshotRecord = {
    path: repo,
    branch: '',
    headSha: '',
    upstream: null,
    aheadBehind: null,
    dirty: false,
    dirtyFileCount: 0,
    lastCommit: '',
    timestamp: now().toISOString(),
    ok: true,
  };
  try {
    const branch = runGit(abs, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch.status !== 0) throw new Error(failDetail(branch, ['rev-parse', '--abbrev-ref', 'HEAD']));
    const branchName = branch.stdout.trim();
    record.branch = branchName === 'HEAD' ? 'HEAD (detached)' : branchName;

    const head = runGit(abs, ['rev-parse', 'HEAD']);
    if (head.status !== 0) throw new Error(failDetail(head, ['rev-parse', 'HEAD']));
    record.headSha = head.stdout.trim();

    // Upstream probe: no upstream is a normal state, not a snapshot failure.
    const up = runGit(abs, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    if (up.status === 0 && up.stdout.trim() !== '') {
      record.upstream = up.stdout.trim();
      const ab = runGit(abs, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
      if (ab.status === 0) {
        const m = /^(\d+)\t(\d+)$/.exec(ab.stdout.trim());
        if (m && m[1] !== undefined && m[2] !== undefined) {
          record.aheadBehind = { ahead: Number(m[1]), behind: Number(m[2]) };
        }
      }
    }

    const st = runGit(abs, ['status', '--porcelain']);
    if (st.status !== 0) throw new Error(failDetail(st, ['status', '--porcelain']));
    record.dirty = st.stdout.length > 0;
    record.dirtyFileCount = st.stdout.split('\n').filter((l) => l.length > 0).length;

    const log = runGit(abs, ['log', '-1', '--format=%cI']);
    if (log.status !== 0) throw new Error(failDetail(log, ['log', '-1', '--format=%cI']));
    record.lastCommit = log.stdout.trim();

    return record;
  } catch (err) {
    record.ok = false;
    record.error = String(err instanceof Error ? err.message : err).slice(0, MAX_ERROR_LENGTH);
    return record;
  }
}

/** Snapshot every repo in opts.repos, preserving order. */
export async function snapshotRepositories(opts: SnapshotOptions): Promise<RepoSnapshotRecord[]> {
  const now = opts.now ?? (() => new Date());
  return opts.repos.map((repo) => snapshotOne(path.join(opts.reposRoot, repo), repo, now));
}

/**
 * List repo directory names under reposRoot: every subdirectory (hidden ones
 * excluded) whose .git is either a directory or a worktree pointer file
 * whose first line contains 'gitdir:'. Sorted ascending.
 */
export function discoverRepositories(reposRoot: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(reposRoot)) {
    if (entry.startsWith('.')) continue;
    const abs = path.join(reposRoot, entry);
    if (!fs.statSync(abs).isDirectory()) continue;
    const gitPath = path.join(abs, '.git');
    let isRepo = false;
    if (fs.existsSync(gitPath)) {
      const st = fs.statSync(gitPath);
      if (st.isDirectory()) {
        isRepo = true;
      } else if (st.isFile()) {
        // Worktree pointer file: first line is 'gitdir: <path>'.
        try {
          const firstLine = fs.readFileSync(gitPath, 'utf8').split('\n')[0] ?? '';
          if (firstLine.includes('gitdir:')) isRepo = true;
        } catch {
          isRepo = false;
        }
      }
    }
    if (isRepo) found.push(entry);
  }
  found.sort();
  return found;
}
