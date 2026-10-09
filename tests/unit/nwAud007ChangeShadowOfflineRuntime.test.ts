// ---------------------------------------------------------------------------
// NW-AUD-007 — the change-shadow offline runtime is total.
//
// `change:shadow` is documented as offline, but it bootstrapped its TypeScript
// compile through `npx tsc` — a local-or-remote package runner. A missing local
// dependency could therefore fetch and execute a compiler from a registry, with
// no no-install, offline, exact-package, or repository-local admission at all.
//
// These tests prove the admission authority that replaces it: the compiler may
// come only from the repository's own `node_modules`, only when its installed
// version matches the lockfile pin, and only as an exact absolute argv run by
// the current Node runtime. `PATH` is never consulted, no package runner is
// ever named, and every unresolvable or unproven case is a refusal rather than
// a fallback.
//
// A repository-local lockfile census also pins the current state: the shadow
// entrypoint must not spawn a package runner.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  admitLocalTypeScriptCompiler,
  isPackageRunnerInvocation,
  readLockfileTypeScriptVersion,
} from '../../src/core/policy/localToolchain';

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');
const PINNED_VERSION = '5.9.3';

function freshRepository(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-aud007-${prefix}-`));
}

function lockfile(version: string | null): string {
  return `${JSON.stringify({
    name: 'synthetic',
    lockfileVersion: 3,
    packages: version === null ? {} : {
      'node_modules/typescript': { version, resolved: 'https://registry.invalid/typescript', integrity: 'sha512-synthetic' },
    },
  }, null, 2)}\n`;
}

function installToolchain(root: string, options: { readonly version?: string; readonly compiler?: 'file' | 'symlink' | 'directory' | 'missing' | 'metadataMissing' | 'metadataMalformed' | 'metadataSymlink' } = {}): void {
  const packageRoot = path.join(root, 'node_modules', 'typescript');
  const version = options.version ?? PINNED_VERSION;
  if (options.compiler !== 'metadataMissing') {
    fs.mkdirSync(packageRoot, { recursive: true });
    if (options.compiler === 'metadataMalformed') {
      fs.writeFileSync(path.join(packageRoot, 'package.json'), '{ not json\n', 'utf8');
    } else if (options.compiler === 'metadataSymlink') {
      const external = path.join(root, 'external-package.json');
      fs.writeFileSync(external, `${JSON.stringify({ name: 'typescript', version })}\n`, 'utf8');
      fs.symlinkSync(external, path.join(packageRoot, 'package.json'));
    } else {
      fs.writeFileSync(path.join(packageRoot, 'package.json'), `${JSON.stringify({ name: 'typescript', version, bin: { tsc: './bin/tsc' } }, null, 2)}\n`, 'utf8');
    }
  }
  const compiler = path.join(packageRoot, 'bin', 'tsc');
  if (options.compiler === 'missing') return;
  if (options.compiler === 'symlink') {
    fs.mkdirSync(path.dirname(compiler), { recursive: true });
    const external = path.join(root, 'external-tsc');
    fs.writeFileSync(external, '#!/usr/bin/env node\n', 'utf8');
    fs.symlinkSync(external, compiler);
    return;
  }
  if (options.compiler === 'directory') {
    fs.mkdirSync(compiler, { recursive: true });
    return;
  }
  fs.mkdirSync(path.dirname(compiler), { recursive: true });
  fs.writeFileSync(compiler, '#!/usr/bin/env node\n', { mode: 0o755 });
}

test.describe('NW-AUD-007 the offline runtime admits only the repository-local toolchain', () => {
  test('the lockfile pin is read exactly, and a malformed or absent pin is a refusal', () => {
    expect(readLockfileTypeScriptVersion(lockfile(PINNED_VERSION))).toEqual({ ok: true, version: PINNED_VERSION });
    expect(readLockfileTypeScriptVersion(lockfile('5.9.4'))).toEqual({ ok: true, version: '5.9.4' });
    expect(readLockfileTypeScriptVersion(lockfile(null))).toEqual({ ok: false, failure: 'LOCKFILE_PIN_MISSING' });
    expect(readLockfileTypeScriptVersion('{ not json')).toEqual({ ok: false, failure: 'LOCKFILE_MALFORMED' });
    expect(readLockfileTypeScriptVersion('[]')).toEqual({ ok: false, failure: 'LOCKFILE_MALFORMED' });
    expect(readLockfileTypeScriptVersion(JSON.stringify({ packages: 'nope' }))).toEqual({ ok: false, failure: 'LOCKFILE_MALFORMED' });
    expect(readLockfileTypeScriptVersion(JSON.stringify({ packages: { 'node_modules/typescript': { version: 'not-a-version' } } }))).toEqual({ ok: false, failure: 'LOCKFILE_MALFORMED' });
  });

  test('a repository-local install whose version matches the lockfile is admitted as an exact argv', () => {
    const root = freshRepository('admitted');
    installToolchain(root);
    const admitted = admitLocalTypeScriptCompiler({ repositoryRoot: root, lockfileText: lockfile(PINNED_VERSION) });
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;

    expect(admitted.toolchain.packageVersion).toBe(PINNED_VERSION);
    // The argv is the exact absolute repository-local compiler script, run by
    // the CURRENT Node runtime. There is no PATH lookup and no shim.
    expect(admitted.toolchain.argv).toEqual([path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')]);
    expect(path.isAbsolute(admitted.toolchain.compilerScript)).toBe(true);
    expect(admitted.toolchain.compilerScript.startsWith(`${root}${path.sep}`)).toBe(true);
    expect(admitted.toolchain.compilerScript).toContain('typescript');
    // The compiler is a regular file, not a symlink.
    const stat = fs.lstatSync(admitted.toolchain.compilerScript);
    expect(stat.isFile()).toBe(true);
    expect(stat.isSymbolicLink()).toBe(false);
  });

  test('the repository compiles through its own admitted toolchain', async () => {
    // The real checkout is the strongest available evidence: the shipped
    // repository-local compiler is admitted against its own lockfile.
    const admitted = admitLocalTypeScriptCompiler({ repositoryRoot: REPOSITORY_ROOT });
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    expect(admitted.toolchain.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(admitted.toolchain.compilerScript).toBe(path.join(REPOSITORY_ROOT, 'node_modules', 'typescript', 'bin', 'tsc'));
    // The admitted argv really runs: the compiler answers `--version`.
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, [...admitted.toolchain.argv, '--version'], { encoding: 'utf8', timeout: 60_000 });
    expect(result.status).toBe(0);
    // tsc prints `Version <x.y.z>`; the admitted pin must be exactly that.
    expect((result.stdout ?? '').trim()).toBe(`Version ${admitted.toolchain.packageVersion}`);
  });

  test('a missing local install is a refusal, never a registry fallback', () => {
    const root = freshRepository('absent');
    const result = admitLocalTypeScriptCompiler({ repositoryRoot: root, lockfileText: lockfile(PINNED_VERSION) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toBe('PACKAGE_NOT_INSTALLED');
    // Nothing was created and nothing was fetched.
    expect(fs.existsSync(path.join(root, 'node_modules'))).toBe(false);
  });

  test('a linked, non-regular or missing compiler entry is refused', () => {
    for (const [compiler, expected] of [
      ['symlink', 'COMPILER_ENTRY_SYMLINK'],
      ['directory', 'COMPILER_ENTRY_NOT_A_FILE'],
      ['missing', 'COMPILER_ENTRY_MISSING'],
      ['metadataMissing', 'PACKAGE_METADATA_UNREADABLE'],
      ['metadataMalformed', 'PACKAGE_METADATA_MALFORMED'],
      ['metadataSymlink', 'PACKAGE_METADATA_UNREADABLE'],
    ] as const) {
      const root = freshRepository(compiler);
      installToolchain(root, { compiler });
      const result = admitLocalTypeScriptCompiler({ repositoryRoot: root, lockfileText: lockfile(PINNED_VERSION) });
      expect(result.ok, `${compiler} must be refused`).toBe(false);
      if (!result.ok) expect(result.failure).toBe(expected);
    }
  });

  test('a version disagreement with the lockfile is refused, and an unreadable lockfile is a refusal', () => {
    const mismatch = freshRepository('mismatch');
    installToolchain(mismatch, { version: '5.8.0' });
    const mismatched = admitLocalTypeScriptCompiler({ repositoryRoot: mismatch, lockfileText: lockfile(PINNED_VERSION) });
    expect(mismatched.ok).toBe(false);
    if (!mismatched.ok) expect(mismatched.failure).toBe('LOCKFILE_VERSION_MISMATCH');

    const unreadable = freshRepository('nolock');
    installToolchain(unreadable);
    const missingLockfile = admitLocalTypeScriptCompiler({ repositoryRoot: unreadable });
    expect(missingLockfile.ok).toBe(false);
    if (!missingLockfile.ok) expect(missingLockfile.failure).toBe('LOCKFILE_UNREADABLE');

    const noPin = freshRepository('nopin');
    installToolchain(noPin);
    const unpinned = admitLocalTypeScriptCompiler({ repositoryRoot: noPin, lockfileText: lockfile(null) });
    expect(unpinned.ok).toBe(false);
    if (!unpinned.ok) expect(unpinned.failure).toBe('LOCKFILE_PIN_MISSING');
  });

  test('an unusable repository root is a refusal', () => {
    const emptyRoot = admitLocalTypeScriptCompiler({ repositoryRoot: '' });
    expect(emptyRoot.ok).toBe(false);
    if (!emptyRoot.ok) expect(emptyRoot.failure).toBe('REPOSITORY_ROOT_UNUSABLE');
    const absentRoot = admitLocalTypeScriptCompiler({ repositoryRoot: path.join(os.tmpdir(), 'nightwatch-aud007-does-not-exist') });
    expect(absentRoot.ok).toBe(false);
    if (!absentRoot.ok) expect(absentRoot.failure).toBe('REPOSITORY_ROOT_UNUSABLE');
    const root = freshRepository('fileroot');
    const file = path.join(root, 'file.txt');
    fs.writeFileSync(file, 'not a directory\n', 'utf8');
    const fileRoot = admitLocalTypeScriptCompiler({ repositoryRoot: file });
    expect(fileRoot.ok).toBe(false);
    if (!fileRoot.ok) expect(fileRoot.failure).toBe('REPOSITORY_ROOT_UNUSABLE');
  });

  test('no package runner is ever an admissible offline runtime', () => {
    // The offline contract has no package-runner path: npx and its peers are
    // local-OR-REMOTE executors, so admitting one would reintroduce registry
    // acquisition under an "offline" label.
    for (const executable of ['npx', 'npx.cmd', '/usr/local/bin/npx', 'pnpm', 'yarn', 'yarnpkg']) {
      expect(isPackageRunnerInvocation(executable), executable).toBe(true);
    }
    for (const executable of [process.execPath, 'node', 'tsc', path.join(REPOSITORY_ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), 'git']) {
      expect(isPackageRunnerInvocation(executable), executable).toBe(false);
    }
  });

  test('the shadow entrypoint spells no package runner', () => {
    // The offline contract has no package-runner path, and the compile no
    // longer spawns the `node_modules/.bin/tsc` PATH shim either: the only
    // admitted runtime is the repository's own pinned compiler, run by the
    // current Node runtime through the local-toolchain authority.
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, 'bin', 'change-intelligence.mjs'), 'utf8');
    expect(source).not.toMatch(/\bnpx\b/);
    expect(source).not.toMatch(/'node_modules',\s*'\.bin',\s*'tsc'/);
    expect(source).not.toMatch(/spawnSync\('npm'|spawnSync\('npx'|--yes|--package/);
    // The compiler is admitted by the authority, and the admitted argv runs
    // under the CURRENT Node runtime.
    expect(source).toContain("loadTypeScriptModule('src/core/policy/localToolchain.ts'");
    expect(source).toMatch(/admitLocalTypeScriptCompiler\(\{ repositoryRoot: nightwatchRoot \}\)/);
    expect(source).toMatch(/run\(process\.execPath, \[\s*\.\.\.admitted\.toolchain\.argv/);
    // The shadow report is published through the governed local-report
    // boundary rather than a direct truncating write.
    expect(source).toContain("loadTypeScriptModule('src/core/policy/localReportPublication.ts'");
    expect(source).toMatch(/publishLocalReport\(\{/);
  });

  test('a mismatched repository-local compiler is refused before anything is compiled or published', () => {
    // A structurally complete fake repository whose OWN install disagrees with
    // its OWN lockfile: the shadow entrypoint must fail closed on admission,
    // with a non-zero exit, before it creates, compiles or publishes anything.
    const fake = freshRepository('shadow-mismatch');
    try {
      const packageRoot = path.join(fake, 'node_modules', 'typescript');
      fs.mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
      fs.writeFileSync(path.join(packageRoot, 'package.json'), `${JSON.stringify({ name: 'typescript', version: '5.8.0', bin: { tsc: './bin/tsc' } }, null, 2)}\n`, 'utf8');
      fs.writeFileSync(path.join(packageRoot, 'bin', 'tsc'), '#!/usr/bin/env node\n', { mode: 0o755 });
      fs.writeFileSync(path.join(fake, 'package-lock.json'), lockfile(PINNED_VERSION), 'utf8');
      // The entrypoint and the authority it loads are the repository's own
      // copies; only the install and the lockfile are synthetic.
      fs.mkdirSync(path.join(fake, 'bin', 'lib'), { recursive: true });
      fs.mkdirSync(path.join(fake, 'src', 'core', 'policy'), { recursive: true });
      for (const [from, to] of [
        [path.join('bin', 'change-intelligence.mjs'), path.join('bin', 'change-intelligence.mjs')],
        [path.join('bin', 'child-environment.mjs'), path.join('bin', 'child-environment.mjs')],
        [path.join('bin', 'lib', 'operator-cli.mjs'), path.join('bin', 'lib', 'operator-cli.mjs')],
        [path.join('bin', 'lib', 'typescript-runtime-loader.mjs'), path.join('bin', 'lib', 'typescript-runtime-loader.mjs')],
        [path.join('src', 'core', 'policy', 'localToolchain.ts'), path.join('src', 'core', 'policy', 'localToolchain.ts')],
      ] as const) {
        fs.copyFileSync(path.join(REPOSITORY_ROOT, from), path.join(fake, to));
      }

      // Run from the real repository so the runtime loader resolves the real
      // TypeScript it transpiles the authority with; the fake root is reached
      // through the entrypoint's own location.
      const result = spawnSync(process.execPath, [path.join(fake, 'bin', 'change-intelligence.mjs')], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('LOCAL_TOOLCHAIN_ADMISSION_FAILED:LOCKFILE_VERSION_MISMATCH');
      // Refused before anything is created, compiled or published.
      expect(fs.existsSync(path.join(fake, '.tmp-nightwatch'))).toBe(false);
      expect(fs.existsSync(path.join(fake, 'artifacts'))).toBe(false);
    } finally {
      fs.rmSync(fake, { recursive: true, force: true });
    }
  });
});
