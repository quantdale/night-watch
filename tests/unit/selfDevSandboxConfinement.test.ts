import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  SELFDEV_SANDBOX_ROOT_BASE,
  setSandboxBaseOverrideForTests,
  ensurePrivateSandboxBase,
  createSandboxMirror,
  cleanupSandboxMirror,
} from '../../src/core/selfDevSandbox/sandboxMirror';

// Phase 8B.0.1 sandbox-base confinement matrix. Every case runs against a
// temporary private-parent/base hierarchy via the test-only base override
// (never the real $HOME/.nightwatch/selfdev-sandboxes), with the canonical
// repository read-only.

const REPOSITORY_ROOT = process.cwd();

function freshParent(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-sbx-conf-parent-'));
}

function modeOf(target: string): number {
  return fs.lstatSync(target).mode & 0o7777;
}

function isPrivateDirectory(target: string): boolean {
  const stat = fs.lstatSync(target);
  return stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0;
}

test.describe('Phase 8B.0.1 sandbox base confinement', () => {
  test.afterEach(() => {
    setSandboxBaseOverrideForTests(null);
  });

  test('A: a missing base beneath a validated private parent is created 0700 and the sandbox succeeds without unexpected path mutation', () => {
    const parent = freshParent();
    const base = path.join(parent, 'selfdev-sandboxes');
    setSandboxBaseOverrideForTests(base);
    expect(fs.existsSync(base)).toBe(false);

    const mirror = createSandboxMirror(REPOSITORY_ROOT);
    try {
      expect(isPrivateDirectory(base)).toBe(true);
      expect(modeOf(base)).toBe(0o700);
      expect(mirror.copiedPaths.length).toBeGreaterThan(0);
    } finally {
      expect(cleanupSandboxMirror(mirror)).toBe('PASS');
    }
    // The mirror was removed; the base remains, containing nothing else.
    expect(fs.existsSync(mirror.root)).toBe(false);
    expect(fs.readdirSync(base)).toEqual([]);
  });

  test('H: a created sandbox instance is a private non-symlink directory strictly beneath the validated real base', () => {
    const parent = freshParent();
    const base = path.join(parent, 'base');
    setSandboxBaseOverrideForTests(base);

    const mirror = createSandboxMirror(REPOSITORY_ROOT);
    try {
      const rootStat = fs.lstatSync(mirror.root);
      expect(rootStat.isDirectory()).toBe(true);
      expect(rootStat.isSymbolicLink()).toBe(false);
      expect(modeOf(mirror.root)).toBe(0o700);
      const resolvedBase = fs.realpathSync(base);
      const resolvedRoot = fs.realpathSync(mirror.root);
      expect(resolvedRoot.startsWith(resolvedBase + path.sep)).toBe(true);
      expect(resolvedRoot).not.toBe(resolvedBase);
    } finally {
      cleanupSandboxMirror(mirror);
    }
  });

  test('B: a valid existing private base is accepted without any mode repair', () => {
    const parent = freshParent();
    const base = path.join(parent, 'base');
    fs.mkdirSync(base, { mode: 0o700 });
    setSandboxBaseOverrideForTests(base);
    const before = modeOf(base);

    const mirror = createSandboxMirror(REPOSITORY_ROOT);
    try {
      expect(modeOf(base)).toBe(before);
    } finally {
      cleanupSandboxMirror(mirror);
    }
  });

  test('C: a preexisting base symlink is rejected BEFORE chmod/mkdtemp/write; the symlink target is untouched', () => {
    const parent = freshParent();
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-sbx-conf-ext-'));
    fs.chmodSync(external, 0o755);
    fs.writeFileSync(path.join(external, 'sentinel.txt'), 'unchanged');
    const base = path.join(parent, 'base');
    fs.symlinkSync(external, base, 'dir');
    setSandboxBaseOverrideForTests(base);
    const beforeMode = modeOf(external);

    expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_BASE_SYMLINK/);
    expect(modeOf(external)).toBe(beforeMode);
    expect(fs.readdirSync(external)).toEqual(['sentinel.txt']);
    expect(fs.readFileSync(path.join(external, 'sentinel.txt'), 'utf8')).toBe('unchanged');
  });

  test('D: a symlinked private parent is rejected before sandbox-base creation; the target is untouched', () => {
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-sbx-conf-ext-'));
    fs.writeFileSync(path.join(external, 'sentinel.txt'), 'unchanged');
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-sbx-conf-parent-'));
    fs.rmSync(parent, { recursive: true, force: true });
    fs.symlinkSync(external, parent, 'dir');
    const base = path.join(parent, 'selfdev-sandboxes');
    setSandboxBaseOverrideForTests(base);

    expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_BASE_SYMLINK/);
    expect(fs.readdirSync(external)).toEqual(['sentinel.txt']);
    expect(fs.existsSync(path.join(external, 'selfdev-sandboxes'))).toBe(false);
    expect(fs.readFileSync(path.join(external, 'sentinel.txt'), 'utf8')).toBe('unchanged');
  });

  test('E: a base that is a regular file fails closed', () => {
    const parent = freshParent();
    const base = path.join(parent, 'base');
    fs.writeFileSync(base, 'not a directory');
    setSandboxBaseOverrideForTests(base);

    expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_BASE_NOT_DIRECTORY/);
    expect(fs.readFileSync(base, 'utf8')).toBe('not a directory');
  });

  test('F: a base whose mode is too open fails closed (no chmod repair of an existing base)', () => {
    const parent = freshParent();
    const base = path.join(parent, 'base');
    fs.mkdirSync(base, { mode: 0o755 });
    setSandboxBaseOverrideForTests(base);

    expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_BASE_UNSAFE_PERMISSIONS_UNSAFE/);
    expect(modeOf(base)).toBe(0o755);
  });

  test('G: a base owned by another uid fails closed where uid semantics and chown permit the setup', () => {
    const getuid = process.getuid;
    const getgid = process.getgid;
    if (getuid === undefined || getgid === undefined) {
      test.skip();
      return;
    }
    const parent = freshParent();
    const base = path.join(parent, 'base');
    fs.mkdirSync(base, { mode: 0o700 });
    let chownAvailable = true;
    try {
      fs.chownSync(base, getuid() + 1, getgid());
    } catch {
      chownAvailable = false;
    }
    if (!chownAvailable) {
      test.skip();
      return;
    }
    try {
      setSandboxBaseOverrideForTests(base);
      expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_BASE_UNSAFE_OWNER/);
    } finally {
      setSandboxBaseOverrideForTests(null);
      try {
        fs.chownSync(base, getuid(), getgid());
      } catch {
        // Best-effort restore of the throwaway temp directory.
      }
    }
  });

  test('existing-parent policy: a missing private parent is created 0700 non-recursively beneath a validated ancestor', () => {
    const root = freshParent();
    const base = path.join(root, 'nested', 'base');
    setSandboxBaseOverrideForTests(base);

    ensurePrivateSandboxBase();
    expect(modeOf(path.join(root, 'nested'))).toBe(0o700);
    expect(modeOf(base)).toBe(0o700);
  });

  test('existing-parent policy: an over-open validated private parent is tightened to 0700 (established convention), never loosened', () => {
    const root = freshParent();
    const parentDir = path.join(root, 'private');
    fs.mkdirSync(parentDir, { mode: 0o755 });
    const base = path.join(parentDir, 'base');
    setSandboxBaseOverrideForTests(base);
    const beforeParent = modeOf(parentDir);
    expect(beforeParent).toBe(0o755);

    ensurePrivateSandboxBase();
    expect(modeOf(parentDir)).toBe(0o700);
    expect(modeOf(base)).toBe(0o700);
  });

  test('I: a forged base inside the canonical repository is rejected (path escape)', () => {
    const scratch = path.join(REPOSITORY_ROOT, '.tmp-nightwatch', 'phase8b01-confinement');
    fs.rmSync(scratch, { recursive: true, force: true });
    fs.mkdirSync(scratch, { recursive: true, mode: 0o700 });
    const base = path.join(scratch, 'forged-base');
    setSandboxBaseOverrideForTests(base);
    try {
      expect(() => createSandboxMirror(REPOSITORY_ROOT)).toThrow(/SELFDEV_SANDBOX_ROOT_UNSAFE/);
    } finally {
      setSandboxBaseOverrideForTests(null);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  test('J: cleanup refuses the base itself, any path outside the validated base, and a symlink root; outside content is untouched', () => {
    const parent = freshParent();
    const base = path.join(parent, 'base');
    setSandboxBaseOverrideForTests(base);
    ensurePrivateSandboxBase();

    // The base itself must never be deleted by cleanup.
    expect(cleanupSandboxMirror({ root: base, copiedPaths: [] })).toBe('FAIL');
    expect(fs.existsSync(base)).toBe(true);

    // A mirror root outside the validated base must be refused untouched.
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-sbx-conf-outside-'));
    fs.writeFileSync(path.join(outside, 'keep.txt'), 'keep');
    expect(cleanupSandboxMirror({ root: outside, copiedPaths: [] })).toBe('FAIL');
    expect(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8')).toBe('keep');

    // A symlink mirror root resolving outside the base must be refused.
    const linkRoot = path.join(parent, 'link-root');
    fs.symlinkSync(outside, linkRoot, 'dir');
    expect(cleanupSandboxMirror({ root: linkRoot, copiedPaths: [] })).toBe('FAIL');
    expect(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8')).toBe('keep');

    // A legitimate mirror beneath the validated base is removed; the base remains.
    const mirror = createSandboxMirror(REPOSITORY_ROOT);
    expect(cleanupSandboxMirror(mirror)).toBe('PASS');
    expect(fs.existsSync(mirror.root)).toBe(false);
    expect(fs.existsSync(base)).toBe(true);
  });

  test('the production sandbox base constant remains the code-defined private location and is never an input', () => {
    expect(SELFDEV_SANDBOX_ROOT_BASE).toMatch(/[\\/]\.nightwatch[\\/]selfdev-sandboxes$/);
    expect(SELFDEV_SANDBOX_ROOT_BASE).not.toContain('REPOSITORIES');
  });
});
