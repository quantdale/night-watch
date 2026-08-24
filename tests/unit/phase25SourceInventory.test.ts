import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig, scanSource } from '../../src/core/source/scan';
import type { RealSourceScanConfig } from '../../src/core/source/scanTypes';

const SHA_MAIN = '1'.repeat(40);
const SHA_OTHER = '2'.repeat(40);

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-inventory-'));
}

function makeRepo(root: string): string {
  const repo = path.join(root, 'repo');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SHA_MAIN}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'nested'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'z.ts'), 'const z = "safe-z";\n');
  fs.writeFileSync(path.join(repo, 'src', 'a.php'), '<?php return ["safe-a" => true];\n');
  fs.writeFileSync(path.join(repo, 'src', 'nested', 'b.md'), 'unsupported markdown\n');
  fs.writeFileSync(path.join(repo, 'docs', 'readme.txt'), 'outside extension allowlist\n');
  fs.mkdirSync(path.join(repo, 'src', 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'node_modules', 'hidden.ts'), 'const hidden = true;\n');
  return repo;
}

function config(overrides: Partial<RealSourceScanConfig['approvedRepositories'][number]> = {}): RealSourceScanConfig {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple.synthetic',
    approvedRepositories: [{
      repoId: 'repo',
      expectedSourceSha: SHA_MAIN,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.ts'],
      maxFiles: 64,
      maxFileBytes: 4096,
      maxTotalBytes: 64_000,
      ...overrides,
    }],
  });
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

test.describe('Phase 25 bounded source inventory', () => {
  test('is deterministic, content-aware, bounded to approved roots, and raw-source-free', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.symlinkSync(path.join(repo, 'docs'), path.join(repo, 'src', 'nested', 'docs-link'), 'dir');
      const access = createSiblingSourceAccess(root);
      const first = scanSource({ access, config: config() });
      const second = scanSource({ access, config: config() });
      expect(first).toEqual(second);
      expect(first.files.map((file) => file.relativePath)).toEqual([...first.files].map((file) => file.relativePath).sort());
      expect(first.files.some((file) => file.relativePath === 'src/z.ts' && file.status === 'ELIGIBLE')).toBe(true);
      expect(first.files.some((file) => file.relativePath === 'src/a.php' && file.status === 'ELIGIBLE')).toBe(true);
      expect(first.files.find((file) => file.relativePath === 'src/nested/b.md')?.rejectionReason).toBe('SOURCE_LANGUAGE_UNSUPPORTED');
      expect(first.files.find((file) => file.relativePath === 'src/nested/docs-link')?.rejectionReason).toBe('SOURCE_SYMLINK_REJECTED');
      expect(first.counters.symlinkRejections).toBe(1);
      expect(first.counters.filesRead).toBe(2);
      expect(first.snapshotDigest).toMatch(/^srcsnapshot:sha256:[0-9a-f]{24}$/);
      expect(first.configDigest).toMatch(/^srcconfig:sha256:[0-9a-f]{24}$/);
      const serialized = JSON.stringify(first);
      expect(serialized).not.toContain('const z');
      expect(serialized).not.toContain('safe-a');

      fs.writeFileSync(path.join(repo, 'src', 'z.ts'), 'const z = "changed-same-sha";\n');
      const changed = scanSource({ access, config: config() });
      expect(changed.repositories[0]?.sourceSha).toBe(SHA_MAIN);
      expect(changed.files.find((file) => file.relativePath === 'src/z.ts')?.contentDigest).not.toBe(first.files.find((file) => file.relativePath === 'src/z.ts')?.contentDigest);
      expect(changed.snapshotDigest).not.toBe(first.snapshotDigest);
    } finally {
      cleanup(root);
    }
  });

  test('fails closed for stale source identity and enforces file/byte budgets', () => {
    const root = tempRoot();
    try {
      makeRepo(root);
      const access = createSiblingSourceAccess(root);
      const stale = scanSource({ access, config: config({ expectedSourceSha: SHA_OTHER }) });
      expect(stale.repositories).toEqual([expect.objectContaining({ repoId: 'repo', sourceSha: SHA_MAIN, status: 'SOURCE_STALE' })]);
      expect(stale.files).toEqual([]);
      expect(stale.counters.filesRead).toBe(0);

      const budgeted = scanSource({ access, config: config({ maxFiles: 2, maxFileBytes: 8, maxTotalBytes: 12 }) });
      expect(budgeted.counters.filesRead).toBe(0);
      expect(budgeted.counters.filesRejected).toBeGreaterThan(0);
      expect(budgeted.files.some((file) => file.rejectionReason === 'SOURCE_FILE_TOO_LARGE' || file.rejectionReason === 'SOURCE_TOTAL_BUDGET_EXCEEDED')).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('rejects executable configuration, unsafe roots, overlap, and duplicate repositories', () => {
    expect(() => createRealSourceScanConfig({
      runtimeMappingNamespace: 'ripple',
      approvedRepositories: [{ repoId: 'repo', expectedSourceSha: null, allowlistedRoots: ['src/../secret'], allowedExtensions: ['.ts'], maxFiles: 1, maxFileBytes: 1, maxTotalBytes: 1 }],
    })).toThrow(/ROOT_PATH/);
    expect(() => createRealSourceScanConfig({
      runtimeMappingNamespace: 'ripple',
      approvedRepositories: [{ repoId: 'repo', expectedSourceSha: null, allowlistedRoots: ['src', 'src/nested'], allowedExtensions: ['.ts'], maxFiles: 1, maxFileBytes: 1, maxTotalBytes: 1 }],
    })).toThrow(/OVERLAPPING_ROOTS/);
    expect(() => createRealSourceScanConfig({
      runtimeMappingNamespace: 'ripple',
      approvedRepositories: [
        { repoId: 'repo', expectedSourceSha: null, allowlistedRoots: ['src'], allowedExtensions: ['.ts'], maxFiles: 1, maxFileBytes: 1, maxTotalBytes: 1 },
        { repoId: 'repo', expectedSourceSha: null, allowlistedRoots: ['src'], allowedExtensions: ['.ts'], maxFiles: 1, maxFileBytes: 1, maxTotalBytes: 1 },
      ],
    })).toThrow(/DUPLICATE_REPOSITORY/);
  });
});
