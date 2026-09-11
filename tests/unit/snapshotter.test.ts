// ---------------------------------------------------------------------------
// Nightwatch — snapshotter unit tests.
// Fixture git repos live under <nightwatch>/.tmp-nightwatch/test/snapshotter
// and are created/cleaned per test. Git identity comes from -c flags so the
// global git config is never consulted.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { snapshotRepositories, discoverRepositories } from '../../src/core/repositories/snapshotter';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';
import { resolveScratchPath } from '../../src/core/workspace/ephemeralLayout';

const TMP_ROOT = path.join(__dirname, '..', '..', resolveScratchPath('test', 'snapshotter'));
const FIXED = '2026-08-09T02:42:50.000Z';
const fixedNow = () => new Date(FIXED);
const GIT_FLAGS = ['-c', 'commit.gpgsign=false', '-c', 'user.email=test@test', '-c', 'user.name=test'];

const gitAvailable = (() => {
  try {
    const res = spawnSync('git', ['--version'], { encoding: 'utf8' });
    return res.status === 0;
  } catch {
    return false;
  }
})();

test.skip(!gitAvailable, 'git CLI is unavailable; snapshotter tests skipped');

function git(args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const res = spawnSync('git', [...GIT_FLAGS, ...args], { cwd, encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(res.stderr ?? '').trim()}`);
  }
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/** Create a repo with two commits ('one' and 'two') and return its path. */
function createRepo(name: string): string {
  const dir = path.join(TMP_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });
  git(['init', '-b', 'main'], dir);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  git(['add', '.'], dir);
  git(['commit', '-m', 'one'], dir);
  fs.writeFileSync(path.join(dir, 'b.txt'), 'world\n');
  git(['add', '.'], dir);
  git(['commit', '-m', 'two'], dir);
  return dir;
}

async function snap(name: string): Promise<RepoSnapshotRecord> {
  const [rec] = await snapshotRepositories({ reposRoot: TMP_ROOT, repos: [name], now: fixedNow });
  if (!rec) throw new Error(`no snapshot returned for ${name}`);
  return rec;
}

test.beforeEach(() => {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
});

test.afterEach(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test.describe('snapshotRepositories', () => {
  test('basic snapshot fields', async () => {
    const repo = createRepo('basic');
    const rec = await snap('basic');
    expect(rec.path).toBe('basic');
    expect(rec.branch).toBe('main');
    expect(rec.headSha).toBe(git(['rev-parse', 'HEAD'], repo).stdout.trim());
    expect(rec.upstream).toBeNull();
    expect(rec.aheadBehind).toBeNull();
    expect(rec.dirty).toBe(false);
    expect(rec.dirtyFileCount).toBe(0);
    expect(rec.ok).toBe(true);
    expect(rec.error).toBeUndefined();
    expect(rec.lastCommit).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(rec.timestamp).toBe(FIXED);
  });

  test('upstream and ahead/behind counts', async () => {
    const repo = createRepo('upstream-repo');
    const remote = path.join(TMP_ROOT, 'remote.git');
    fs.mkdirSync(remote, { recursive: true });
    git(['init', '--bare'], remote);
    git(['remote', 'add', 'origin', remote], repo);
    git(['push', '-u', 'origin', 'main'], repo);

    let rec = await snap('upstream-repo');
    expect(rec.upstream).toBe('origin/main');
    expect(rec.aheadBehind).toEqual({ ahead: 0, behind: 0 });

    // One more local commit -> ahead 1.
    fs.writeFileSync(path.join(repo, 'c.txt'), 'third\n');
    git(['add', '.'], repo);
    git(['commit', '-m', 'three'], repo);
    rec = await snap('upstream-repo');
    expect(rec.upstream).toBe('origin/main');
    expect(rec.aheadBehind).toEqual({ ahead: 1, behind: 0 });
  });

  test('dirty detection (untracked + modified)', async () => {
    const repo = createRepo('dirty-repo');
    fs.writeFileSync(path.join(repo, 'u.txt'), 'untracked\n');
    let rec = await snap('dirty-repo');
    expect(rec.dirty).toBe(true);
    expect(rec.dirtyFileCount).toBe(1);

    fs.appendFileSync(path.join(repo, 'a.txt'), 'modified\n');
    rec = await snap('dirty-repo');
    expect(rec.dirty).toBe(true);
    expect(rec.dirtyFileCount).toBe(2);
  });

  test('detached HEAD', async () => {
    const repo = createRepo('detached-repo');
    const firstSha = git(['rev-parse', 'HEAD~1'], repo).stdout.trim();
    git(['checkout', firstSha], repo);
    const rec = await snap('detached-repo');
    expect(rec.branch).toBe('HEAD (detached)');
    expect(rec.headSha).toBe(firstSha);
  });

  test('read-only guarantee: repo state unchanged by snapshots', async () => {
    const repo = createRepo('ro-repo');
    const probe = () => ({
      status: git(['status', '--porcelain'], repo).stdout,
      head: git(['rev-parse', 'HEAD'], repo).stdout,
      untracked: git(['ls-files', '--others', '--exclude-standard'], repo).stdout,
      refs: git(['for-each-ref'], repo).stdout,
      aTxt: fs.readFileSync(path.join(repo, 'a.txt'), 'utf8'),
    });
    const before = probe();

    await snapshotRepositories({ reposRoot: TMP_ROOT, repos: ['ro-repo'] });
    await snapshotRepositories({ reposRoot: TMP_ROOT, repos: ['ro-repo'] });

    expect(probe()).toEqual(before);
  });

  test('non-repo path yields ok:false with a truncated error', async () => {
    const rec = await snap('nonexistent');
    expect(rec.ok).toBe(false);
    expect(rec.error).toBeDefined();
    expect(rec.error!.length).toBeGreaterThan(0);
    expect(rec.error!.length).toBeLessThanOrEqual(300);
  });
});

test.describe('discoverRepositories', () => {
  test('finds git repos, ignores plain dirs and hidden entries, sorted', () => {
    const root = path.join(TMP_ROOT, 'discovery');
    for (const name of ['repo-b', 'repo-a']) {
      const dir = path.join(root, name);
      fs.mkdirSync(dir, { recursive: true });
      git(['init', '-b', 'main'], dir);
      fs.writeFileSync(path.join(dir, 'x.txt'), 'x\n');
      git(['add', '.'], dir);
      git(['commit', '-m', 'x'], dir);
    }
    fs.mkdirSync(path.join(root, 'plain'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plain', 'f.txt'), 'f\n');
    fs.mkdirSync(path.join(root, '.hidden'), { recursive: true });
    fs.writeFileSync(path.join(root, '.hidden', 'g.txt'), 'g\n');

    expect(discoverRepositories(root)).toEqual(['repo-a', 'repo-b']);
  });

  test('detects git worktrees via the .git pointer file', () => {
    const main = createRepo('wt-main');
    const wt = path.join(TMP_ROOT, 'wt-checkout');
    git(['worktree', 'add', '-b', 'wt-branch', wt], main);
    expect(fs.statSync(path.join(wt, '.git')).isFile()).toBe(true);

    const found = discoverRepositories(TMP_ROOT);
    expect(found).toEqual(['wt-checkout', 'wt-main']);
  });
});
