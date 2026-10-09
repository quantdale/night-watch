// ---------------------------------------------------------------------------
// Nightwatch NW-AUD-007 — repository-local toolchain admission.
//
// `change:shadow` is documented as offline, but it bootstrapped its TypeScript
// compile through `npx tsc` — a local-or-remote package runner. A missing local
// dependency could therefore fetch and execute a compiler from a registry, with
// no no-install, offline, exact-package, or repository-local admission at all.
//
// This module is the admission authority. It resolves ONLY the
// repository-local `node_modules` install, refuses a missing install, a
// non-regular or linked compiler entry, and any version that disagrees with the
// lockfile pin, and hands the caller the exact process/argv pair to run. It
// never consults `PATH`, never invokes a package runner, never installs, and
// never contacts a registry: an unresolvable or unproven toolchain is a refusal,
// not a fallback.
//
// The caller compiles with `spawnSync(process.execPath, [compilerScript, ...])`,
// so the exact same Node runtime drives the exact repository-pinned compiler.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_TYPESCRIPT_PACKAGE = 'typescript' as const;
export const LOCAL_TYPESCRIPT_COMPILER_ENTRY = 'bin/tsc' as const;

export type LocalToolchainFailure =
  | 'REPOSITORY_ROOT_UNUSABLE'
  | 'PACKAGE_NOT_INSTALLED'
  | 'PACKAGE_METADATA_UNREADABLE'
  | 'PACKAGE_METADATA_MALFORMED'
  | 'COMPILER_ENTRY_MISSING'
  | 'COMPILER_ENTRY_SYMLINK'
  | 'COMPILER_ENTRY_NOT_A_FILE'
  | 'LOCKFILE_UNREADABLE'
  | 'LOCKFILE_MALFORMED'
  | 'LOCKFILE_PIN_MISSING'
  | 'LOCKFILE_VERSION_MISMATCH';

export type LocalToolchainResult =
  | { readonly ok: true; readonly toolchain: LocalTypeScriptToolchain }
  | { readonly ok: false; readonly failure: LocalToolchainFailure };

export interface LocalTypeScriptToolchain {
  /** Absolute path of the repository-local `node_modules/typescript` package root. */
  readonly packageRoot: string;
  /** Exact pinned version the admitted compiler reports. */
  readonly packageVersion: string;
  /** Absolute path of the repository-local compiler script. Never a PATH lookup. */
  readonly compilerScript: string;
  /** The exact argv prefix to run it, using the CURRENT Node runtime. */
  readonly argv: readonly string[];
}

const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/** The lockfile's pin for `node_modules/typescript`, or a categorical reason. */
export function readLockfileTypeScriptVersion(lockfileText: string): { readonly ok: true; readonly version: string } | { readonly ok: false; readonly failure: LocalToolchainFailure } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(lockfileText);
  } catch {
    return { ok: false, failure: 'LOCKFILE_MALFORMED' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, failure: 'LOCKFILE_MALFORMED' };
  const packages = (parsed as { packages?: unknown }).packages;
  if (packages === null || typeof packages !== 'object' || Array.isArray(packages)) return { ok: false, failure: 'LOCKFILE_MALFORMED' };
  const pinned = (packages as Record<string, unknown>)[`node_modules/${LOCAL_TYPESCRIPT_PACKAGE}`];
  if (pinned === null || typeof pinned !== 'object' || Array.isArray(pinned)) return { ok: false, failure: 'LOCKFILE_PIN_MISSING' };
  const version = (pinned as { version?: unknown }).version;
  if (typeof version !== 'string' || !VERSION_RE.test(version)) return { ok: false, failure: 'LOCKFILE_MALFORMED' };
  return { ok: true, version };
}

function lstatOrNull(target: string): fs.Stats | null {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

/**
 * Admit the repository-local TypeScript compiler.
 *
 * Every step is a refusal rather than a fallback. On success the returned
 * `argv` runs the exact repository-pinned compiler under the current Node
 * runtime, so the compile is a function of the repository's own lockfile and
 * nothing else.
 */
export function admitLocalTypeScriptCompiler(input: {
  readonly repositoryRoot: string;
  /** Already-read lockfile text. Omitted means the module reads `package-lock.json` itself. */
  readonly lockfileText?: string;
}): LocalToolchainResult {
  if (typeof input.repositoryRoot !== 'string' || input.repositoryRoot.length === 0) {
    return { ok: false, failure: 'REPOSITORY_ROOT_UNUSABLE' };
  }
  const rootStat = lstatOrNull(input.repositoryRoot);
  if (rootStat === null || rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    return { ok: false, failure: 'REPOSITORY_ROOT_UNUSABLE' };
  }

  const packageRoot = path.join(input.repositoryRoot, 'node_modules', LOCAL_TYPESCRIPT_PACKAGE);
  const packageStat = lstatOrNull(packageRoot);
  if (packageStat === null) return { ok: false, failure: 'PACKAGE_NOT_INSTALLED' };
  if (packageStat.isSymbolicLink()) return { ok: false, failure: 'COMPILER_ENTRY_SYMLINK' };
  if (!packageStat.isDirectory()) return { ok: false, failure: 'PACKAGE_NOT_INSTALLED' };

  const metadataPath = path.join(packageRoot, 'package.json');
  const metadataStat = lstatOrNull(metadataPath);
  if (metadataStat === null) return { ok: false, failure: 'PACKAGE_METADATA_UNREADABLE' };
  if (metadataStat.isSymbolicLink() || !metadataStat.isFile()) return { ok: false, failure: 'PACKAGE_METADATA_UNREADABLE' };
  let metadata: unknown;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    return { ok: false, failure: 'PACKAGE_METADATA_MALFORMED' };
  }
  const installedVersion = (metadata as { version?: unknown } | null)?.version;
  if (typeof installedVersion !== 'string' || !VERSION_RE.test(installedVersion)) {
    return { ok: false, failure: 'PACKAGE_METADATA_MALFORMED' };
  }

  // The lockfile pin is the authority for WHICH compiler may run. An installed
  // version that disagrees with it is a refusal, never a silent override.
  let lockfileText = input.lockfileText;
  if (lockfileText === undefined) {
    try {
      lockfileText = fs.readFileSync(path.join(input.repositoryRoot, 'package-lock.json'), 'utf8');
    } catch {
      return { ok: false, failure: 'LOCKFILE_UNREADABLE' };
    }
  }
  const pin = readLockfileTypeScriptVersion(lockfileText);
  if (!pin.ok) return { ok: false, failure: pin.failure };
  if (pin.version !== installedVersion) return { ok: false, failure: 'LOCKFILE_VERSION_MISMATCH' };

  const compilerScript = path.join(packageRoot, LOCAL_TYPESCRIPT_COMPILER_ENTRY);
  const compilerStat = lstatOrNull(compilerScript);
  if (compilerStat === null) return { ok: false, failure: 'COMPILER_ENTRY_MISSING' };
  if (compilerStat.isSymbolicLink()) return { ok: false, failure: 'COMPILER_ENTRY_SYMLINK' };
  if (!compilerStat.isFile()) return { ok: false, failure: 'COMPILER_ENTRY_NOT_A_FILE' };

  return {
    ok: true,
    toolchain: {
      packageRoot,
      packageVersion: installedVersion,
      compilerScript,
      argv: Object.freeze([compilerScript]),
    },
  };
}

/**
 * Refuse a package-runner invocation.
 *
 * The offline-runtime contract has no package-runner path: `npx`, `pnpm dlx`,
 * `yarn dlx` and friends are local-OR-REMOTE executors, so admitting one would
 * reintroduce registry acquisition under an "offline" label. This helper exists
 * so a caller (and a registry probe) has ONE place to test against rather than
 * repeating the vocabulary.
 */
export function isPackageRunnerInvocation(executable: string): boolean {
  const base = path.basename(executable).toLowerCase();
  if (base === 'npx' || base === 'npx.cmd' || base === 'pnpm' || base === 'yarn' || base === 'yarnpkg') return true;
  return /^npx(\.(cmd|exe|ps1))?$/i.test(base);
}
