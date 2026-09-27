// M5 task 6.11 (X-05) — reproduction materializes from the Git object store at
// the recorded HEAD, so a dirty sibling working tree cannot change the bytes a
// reproduction executed.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { materializeOwnerLocalClosure } from '../../src/core/ownerLocalReproduction/provider';
import { normalizeOwnerLocalLimits } from '../../src/core/ownerLocalReproduction/provider';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-git-materialize-'));
  roots.push(root);
  return root;
}

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim();
}

interface Fixture {
  readonly repoRoot: string;
  readonly moduleRoot: string;
  readonly packageDirAbs: string;
  readonly headSha: string;
}

function makeFixture(): Fixture {
  const repoRoot = scratch();
  git(repoRoot, ['init', '--quiet', '-b', 'main']);
  git(repoRoot, ['config', 'user.email', 'synthetic@example.invalid']);
  git(repoRoot, ['config', 'user.name', 'Synthetic Fixture']);
  const moduleRoot = path.join(repoRoot, 'module');
  const packageDirAbs = path.join(moduleRoot, 'pkg');
  fs.mkdirSync(path.join(moduleRoot, 'vendor'), { recursive: true });
  fs.mkdirSync(packageDirAbs, { recursive: true });
  fs.writeFileSync(path.join(moduleRoot, 'go.mod'), 'module synthetic.example/module\n\ngo 1.21\n');
  fs.writeFileSync(path.join(moduleRoot, 'vendor', 'modules.txt'), '# synthetic vendor manifest\n');
  fs.writeFileSync(path.join(packageDirAbs, 'foo.go'), 'package pkg\n\nconst Marker = "HEAD BYTES"\n');
  fs.writeFileSync(path.join(packageDirAbs, 'foo_test.go'), 'package pkg\n\nimport "testing"\n\nfunc TestMarker(t *testing.T) {}\n');
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic base']);
  const headSha = git(repoRoot, ['rev-parse', 'HEAD']);
  return { repoRoot, moduleRoot, packageDirAbs, headSha };
}

function materialize(fixture: Fixture) {
  return materializeOwnerLocalClosure({
    moduleRoot: fixture.moduleRoot,
    packageDirAbs: fixture.packageDirAbs,
    closureDirs: [fixture.packageDirAbs],
    limits: normalizeOwnerLocalLimits({}),
    repositoryRoot: fixture.repoRoot,
    headSha: fixture.headSha,
  });
}

test.describe('HEAD-bound materialization (6.11)', () => {
  test('a modified tracked file contributes its HEAD bytes, not the dirty bytes', async () => {
    const fixture = makeFixture();
    const foo = path.join(fixture.packageDirAbs, 'foo.go');
    // Dirty the working tree AFTER the commit.
    fs.writeFileSync(foo, 'package pkg\n\nconst Marker = "DIRTY BYTES"\n');
    expect(git(fixture.repoRoot, ['status', '--porcelain'])).toContain('foo.go');

    const closure = await materialize(fixture);
    try {
      const materialized = fs.readFileSync(path.join(closure.execRoot, 'pkg', 'foo.go'), 'utf8');
      expect(materialized).toContain('HEAD BYTES');
      expect(materialized).not.toContain('DIRTY BYTES');
      expect(closure.fileCount).toBeGreaterThan(0);
    } finally {
      closure.cleanup();
    }
  });

  test('a deleted tracked file is still materialized from HEAD, and untracked files are skipped', async () => {
    const fixture = makeFixture();
    fs.rmSync(path.join(fixture.packageDirAbs, 'foo_test.go'));
    fs.writeFileSync(path.join(fixture.packageDirAbs, 'untracked.go'), 'package pkg\n\nconst Untracked = true\n');

    const closure = await materialize(fixture);
    try {
      // The deleted file is present with its HEAD bytes: the closure is the
      // recorded revision, not the working tree.
      expect(fs.existsSync(path.join(closure.execRoot, 'pkg', 'foo_test.go'))).toBe(true);
      // The untracked file is absent: the closure is the recorded tree.
      expect(fs.existsSync(path.join(closure.execRoot, 'pkg', 'untracked.go'))).toBe(false);
    } finally {
      closure.cleanup();
    }
  });

  test('the recorded HEAD is required', async () => {
    const fixture = makeFixture();
    await expect(
      materializeOwnerLocalClosure({
        moduleRoot: fixture.moduleRoot,
        packageDirAbs: fixture.packageDirAbs,
        closureDirs: [fixture.packageDirAbs],
        limits: normalizeOwnerLocalLimits({}),
        repositoryRoot: fixture.repoRoot,
        headSha: 'not-a-sha',
      }),
    ).rejects.toThrow(/HEAD_BINDING_MISSING/);
  });

  test('cleanup removes the materialized tree', async () => {
    const fixture = makeFixture();
    const closure = await materialize(fixture);
    expect(fs.existsSync(closure.execRoot)).toBe(true);
    closure.cleanup();
    expect(fs.existsSync(closure.execRoot)).toBe(false);
  });
});
