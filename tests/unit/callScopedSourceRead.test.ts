import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCallScopedSourceReadView } from '../../src/core/source/callScopedRead';
import { createSiblingSourceAccess, type SiblingSourceAccess } from '../../src/core/source/siblingSource';
import { scanSource, createRealSourceScanConfig } from '../../src/core/source/scan';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';

const REPOSITORY = 'synthetic/ripple-api';
const OTHER_REPOSITORY = 'synthetic/other-api';
const SOURCE_SHA = 'a'.repeat(40);
const OTHER_SOURCE_SHA = 'b'.repeat(40);

function makeRepository(root: string, repoId: string, sha: string, files: Readonly<Record<string, string>>): void {
  const repo = path.join(root, ...repoId.split('/'));
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${sha}\n`);
  for (const [relativePath, source] of Object.entries(files)) {
    const file = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  }
}

function config(repositories: readonly { readonly repoId: string; readonly expectedSourceSha: string }[]) {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: repositories.map((repository) => ({
      ...repository,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.yaml'],
      maxFiles: 32,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    })),
  });
}

function counted(access: SiblingSourceAccess): { readonly access: SiblingSourceAccess; readonly count: (repoId: string, relativePath: string) => number } {
  const reads = new Map<string, number>();
  const count = (repoId: string, relativePath: string) => reads.get(`${repoId}\u0000${relativePath}`) ?? 0;
  return {
    access: {
      ...access,
      reader: {
        readFile(repoId, relativePath) {
          const key = `${repoId}\u0000${relativePath}`;
          reads.set(key, (reads.get(key) ?? 0) + 1);
          return access.reader.readFile(repoId, relativePath);
        },
      },
    },
    count,
  };
}

function fixture(): { readonly root: string; readonly file: string; readonly otherFile: string; readonly access: SiblingSourceAccess; readonly dispose: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-call-scoped-read-'));
  makeRepository(root, REPOSITORY, SOURCE_SHA, {
    'src/Routing.yaml': '"get:/read":\n  client: App\\Handler\\Reader\n  method: read\n',
    'src/shared.php': '<?php function read() { return ["safe" => true]; }\n',
    'src/unsupported.txt': 'synthetic unsupported text\n',
  });
  makeRepository(root, OTHER_REPOSITORY, OTHER_SOURCE_SHA, {
    'src/shared.php': '<?php function other() { return ["other" => true]; }\n',
  });
  return {
    root,
    file: path.join(root, ...REPOSITORY.split('/'), 'src/shared.php'),
    otherFile: path.join(root, ...OTHER_REPOSITORY.split('/'), 'src/shared.php'),
    access: createSiblingSourceAccess(root),
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test.describe('call-scoped source read reuse', () => {
  test('reuses only exact repo, snapshot, path, and content identities', () => {
    const input = fixture();
    try {
      const base = counted(input.access);
      const discoveryConfig = config([{ repoId: REPOSITORY, expectedSourceSha: SOURCE_SHA }]);
      const discovery = discoverSourceSurfaces({ access: base.access, config: discoveryConfig });
      expect(discovery.operations).toHaveLength(1);
      expect(base.count(REPOSITORY, 'src/shared.php')).toBe(2);

      const inventory = scanSource({ access: base.access, config: config([
        { repoId: REPOSITORY, expectedSourceSha: SOURCE_SHA },
        { repoId: OTHER_REPOSITORY, expectedSourceSha: OTHER_SOURCE_SHA },
      ]) });
      const view = createCallScopedSourceReadView({ access: base.access, inventory });

      expect(view.access.reader.readFile(REPOSITORY, 'src/shared.php')).not.toBeNull();
      expect(view.access.reader.readFile(REPOSITORY, 'src/shared.php')).not.toBeNull();
      expect(view.access.reader.readFile(OTHER_REPOSITORY, 'src/shared.php')).not.toBeNull();
      expect(view.stats()).toEqual({ sourceReads: 2, cacheHits: 1, cachedEntries: 2, digestMismatches: 0, uncachedEntries: 0 });
      expect(base.count(REPOSITORY, 'src/shared.php')).toBe(4);
      expect(base.count(OTHER_REPOSITORY, 'src/shared.php')).toBe(2);
      expect(JSON.stringify(inventory)).not.toContain('function read');
    } finally {
      input.dispose();
    }
  });

  test('returns a changed same-mtime read without caching a digest mismatch', () => {
    const input = fixture();
    try {
      const base = counted(input.access);
      const inventory = scanSource({ access: base.access, config: config([{ repoId: REPOSITORY, expectedSourceSha: SOURCE_SHA }]) });
      const view = createCallScopedSourceReadView({ access: base.access, inventory });
      const originalStat = fs.statSync(input.file);
      fs.writeFileSync(input.file, '<?php function read() { return ["changed" => true]; }\n');
      fs.utimesSync(input.file, originalStat.atime, originalStat.mtime);

      const first = view.access.reader.readFile(REPOSITORY, 'src/shared.php');
      const second = view.access.reader.readFile(REPOSITORY, 'src/shared.php');
      expect(first).toContain('changed');
      expect(second).toContain('changed');
      expect(view.stats()).toEqual({ sourceReads: 2, cacheHits: 0, cachedEntries: 0, digestMismatches: 2, uncachedEntries: 0 });
      expect(base.count(REPOSITORY, 'src/shared.php')).toBe(3);
    } finally {
      input.dispose();
    }
  });

  test('falls back for rejected and unavailable identities without creating hits', () => {
    const input = fixture();
    try {
      const base = counted(input.access);
      const inventory = scanSource({ access: base.access, config: config([{ repoId: REPOSITORY, expectedSourceSha: SOURCE_SHA }]) });
      const view = createCallScopedSourceReadView({ access: base.access, inventory });

      expect(view.access.reader.readFile(REPOSITORY, 'src/unsupported.txt')).toContain('unsupported');
      expect(view.access.reader.readFile(REPOSITORY, 'src/unsupported.txt')).toContain('unsupported');
      expect(view.access.reader.readFile(REPOSITORY, 'src/missing.php')).toBeNull();
      expect(view.access.reader.readFile(REPOSITORY, 'src/missing.php')).toBeNull();
      expect(view.stats()).toEqual({ sourceReads: 0, cacheHits: 0, cachedEntries: 0, digestMismatches: 0, uncachedEntries: 0 });
      expect(base.count(REPOSITORY, 'src/unsupported.txt')).toBe(2);
      expect(base.count(REPOSITORY, 'src/missing.php')).toBe(2);
    } finally {
      input.dispose();
    }
  });

  test('does not alias a new same-path snapshot across separate views', () => {
    const input = fixture();
    try {
      const base = counted(input.access);
      const firstInventory = scanSource({ access: base.access, config: config([{ repoId: REPOSITORY, expectedSourceSha: SOURCE_SHA }]) });
      const firstView = createCallScopedSourceReadView({ access: base.access, inventory: firstInventory });
      expect(firstView.access.reader.readFile(REPOSITORY, 'src/shared.php')).not.toBeNull();

      fs.writeFileSync(input.file, '<?php function read() { return ["new" => true]; }\n');
      fs.writeFileSync(path.join(input.root, ...REPOSITORY.split('/'), '.git', 'refs', 'heads', 'main'), `${'c'.repeat(40)}\n`);
      const secondInventory = scanSource({ access: base.access, config: config([{ repoId: REPOSITORY, expectedSourceSha: 'c'.repeat(40) }]) });
      const secondView = createCallScopedSourceReadView({ access: base.access, inventory: secondInventory });
      expect(secondView.access.reader.readFile(REPOSITORY, 'src/shared.php')).toContain('new');
      expect(secondView.stats()).toMatchObject({ sourceReads: 1, cacheHits: 0, cachedEntries: 1 });
      expect(firstView.stats()).toMatchObject({ sourceReads: 1, cacheHits: 0, cachedEntries: 1 });
    } finally {
      input.dispose();
    }
  });
});
