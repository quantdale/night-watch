import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MAX_SIBLING_SOURCE_FILE_BYTES,
  createSiblingSourceAccess,
  resolveGitHead,
} from '../../src/core/source/siblingSource';

const SHA_MAIN = '1'.repeat(40);
const SHA_DEV = '2'.repeat(40);

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-source-'));
}

function makeDirectoryRepo(root: string, name = 'repo'): { root: string; repo: string; git: string } {
  const repo = path.join(root, name);
  const git = path.join(repo, '.git');
  fs.mkdirSync(git, { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), `ref: refs/heads/main\n`);
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SHA_MAIN}\n`);
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'safe.ts'), 'const safe = true;\n');
  return { root, repo, git };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

test.describe('Phase 25 source boundary and Git currentness', () => {
  test('reads a regular file through a normal loose-ref repository', () => {
    const root = tempRoot();
    try {
      makeDirectoryRepo(root);
      const access = createSiblingSourceAccess(root);
      expect(access.currentness.currentSnapshot('repo')).toEqual({ repoId: 'repo', sha: SHA_MAIN });
      expect(access.reader.readFile('repo', 'src/safe.ts')).toBe('const safe = true;\n');
    } finally {
      cleanup(root);
    }
  });

  test('packed refs resolve the exact HEAD ref rather than the first branch', () => {
    const root = tempRoot();
    try {
      const { git } = makeDirectoryRepo(root);
      fs.rmSync(path.join(git, 'refs'), { recursive: true, force: true });
      fs.writeFileSync(path.join(git, 'packed-refs'), [
        '# pack-refs with: peeled fully-peeled sorted',
        `${SHA_DEV} refs/heads/dev`,
        `${SHA_MAIN} refs/heads/main`,
        '',
      ].join('\n'));
      expect(resolveGitHead(path.join(root, 'repo'), root)).toBe(SHA_MAIN);
      expect(createSiblingSourceAccess(root).currentness.currentSnapshot('repo')?.sha).toBe(SHA_MAIN);
    } finally {
      cleanup(root);
    }
  });

  test('supports detached HEAD and safe .git-file worktree indirection', () => {
    const root = tempRoot();
    try {
      const detached = makeDirectoryRepo(root, 'detached');
      fs.writeFileSync(path.join(detached.git, 'HEAD'), `${SHA_DEV}\n`);
      expect(resolveGitHead(detached.repo, root)).toBe(SHA_DEV);

      const repo = path.join(root, 'worktree');
      const metadata = path.join(root, 'worktree-metadata');
      fs.mkdirSync(repo, { recursive: true });
      fs.mkdirSync(metadata, { recursive: true });
      fs.writeFileSync(path.join(repo, '.git'), 'gitdir: ../worktree-metadata\n');
      fs.writeFileSync(path.join(metadata, 'HEAD'), 'ref: refs/heads/main\n');
      fs.mkdirSync(path.join(metadata, 'refs', 'heads'), { recursive: true });
      fs.writeFileSync(path.join(metadata, 'refs', 'heads', 'main'), `${SHA_MAIN}\n`);
      expect(resolveGitHead(repo, root)).toBe(SHA_MAIN);
      expect(createSiblingSourceAccess(root).currentness.currentSnapshot('worktree')?.sha).toBe(SHA_MAIN);
    } finally {
      cleanup(root);
    }
  });

  test('fails closed for malformed, missing, unsafe, and symlinked Git metadata', () => {
    const root = tempRoot();
    try {
      const malformed = makeDirectoryRepo(root, 'malformed');
      fs.writeFileSync(path.join(malformed.git, 'HEAD'), 'ref: refs/heads/../main\n');
      expect(resolveGitHead(malformed.repo, root)).toBeNull();

      const missing = makeDirectoryRepo(root, 'missing');
      fs.rmSync(path.join(missing.git, 'refs', 'heads', 'main'));
      expect(resolveGitHead(missing.repo, root)).toBeNull();

      const unsafe = path.join(root, 'unsafe');
      const outside = path.join(path.dirname(root), `${path.basename(root)}-outside-git`);
      fs.mkdirSync(unsafe, { recursive: true });
      fs.mkdirSync(outside, { recursive: true });
      fs.writeFileSync(path.join(unsafe, '.git'), `gitdir: ${outside}\n`);
      fs.writeFileSync(path.join(outside, 'HEAD'), `${SHA_MAIN}\n`);
      expect(resolveGitHead(unsafe, root)).toBeNull();
      fs.rmSync(outside, { recursive: true, force: true });

      const symlinkGit = makeDirectoryRepo(root, 'symlink-git');
      const realGit = path.join(root, 'real-git');
      fs.renameSync(symlinkGit.git, realGit);
      fs.symlinkSync(realGit, symlinkGit.git, 'dir');
      expect(resolveGitHead(symlinkGit.repo, root)).toBeNull();
    } finally {
      cleanup(root);
    }
  });

  test('rejects repository-root, file, directory, nested, broken, loop, and relative symlinks', () => {
    const root = tempRoot();
    try {
      const real = makeDirectoryRepo(root, 'real');
      const outside = path.join(root, 'outside');
      fs.mkdirSync(path.join(outside, 'nested'), { recursive: true });
      fs.writeFileSync(path.join(outside, 'secret.ts'), 'not source authority');

      fs.symlinkSync(real.repo, path.join(root, 'repo-link'), 'dir');
      fs.symlinkSync(path.join(outside, 'secret.ts'), path.join(real.repo, 'src', 'file-link'));
      fs.symlinkSync(outside, path.join(real.repo, 'src', 'directory-link'), 'dir');
      fs.symlinkSync(path.join(real.repo, 'src'), path.join(real.repo, 'src', 'nested-link'), 'dir');
      fs.symlinkSync(path.join(outside, 'missing.ts'), path.join(real.repo, 'src', 'broken-link'));
      fs.symlinkSync('loop-b', path.join(real.repo, 'src', 'loop-a'));
      fs.symlinkSync('loop-a', path.join(real.repo, 'src', 'loop-b'));
      fs.symlinkSync('../safe.ts', path.join(real.repo, 'src', 'relative-link'));

      const access = createSiblingSourceAccess(root);
      expect(access.reader.readFile('repo-link', 'src/safe.ts')).toBeNull();
      expect(access.currentness.currentSnapshot('repo-link')).toBeNull();
      for (const relativePath of [
        'src/file-link',
        'src/directory-link/secret.ts',
        'src/nested-link/safe.ts',
        'src/broken-link',
        'src/loop-a/value.ts',
        'src/relative-link',
        'src/../src/safe.ts',
      ]) {
        expect(access.reader.readFile('real', relativePath), relativePath).toBeNull();
      }
    } finally {
      cleanup(root);
    }
  });

  test('rejects traversal, .git source paths, oversized files, and non-regular files', () => {
    const root = tempRoot();
    try {
      const repo = makeDirectoryRepo(root).repo;
      fs.writeFileSync(path.join(repo, 'src', 'large.ts'), 'x'.repeat(MAX_SIBLING_SOURCE_FILE_BYTES + 1));
      const access = createSiblingSourceAccess(root);
      expect(access.reader.readFile('repo', 'src/../src/safe.ts')).toBeNull();
      expect(access.reader.readFile('repo', '.git/HEAD')).toBeNull();
      expect(access.reader.readFile('repo', 'src/large.ts')).toBeNull();
      expect(access.reader.readFile('repo', 'src')).toBeNull();
      expect(access.reader.readFile('repo', '/etc/passwd')).toBeNull();
      expect(access.reader.readFile('repo', 'src\u0000safe.ts')).toBeNull();
    } finally {
      cleanup(root);
    }
  });

  test('rejects a configured sibling root that is itself a symlink', () => {
    const root = tempRoot();
    try {
      const realRoot = path.join(root, 'real-root');
      fs.mkdirSync(realRoot, { recursive: true });
      makeDirectoryRepo(realRoot);
      const linkRoot = path.join(root, 'link-root');
      fs.symlinkSync(realRoot, linkRoot, 'dir');
      const access = createSiblingSourceAccess(linkRoot);
      expect(access.reader.readFile('repo', 'src/safe.ts')).toBeNull();
      expect(access.currentness.currentSnapshot('repo')).toBeNull();
    } finally {
      cleanup(root);
    }
  });
});
