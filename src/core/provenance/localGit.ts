// ---------------------------------------------------------------------------
// Nightwatch Phase 8A.1 — narrow local source/Git provenance boundary.
//
// This is the only runtime module allowed to inspect the Nightwatch checkout
// through child_process. It uses fixed argv, no shell, a minimal environment,
// fixed authoritative paths, and read-only Git verbs. The selfDev evaluator
// imports none of this module and remains deterministic/pure.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { selfDevContractDigest } from '../../core/selfDev/contract';
import { sha256LengthPrefixedEntries } from '../../core/selfDev/canonical';
import { SELFDEV_AUTHORITATIVE_PATHS, SELFDEV_SOURCE_BUNDLE_ALGORITHM, SELFDEV_SOURCE_BUNDLE_MANIFEST_VERSION } from '../../core/selfDev/provenanceManifest';
import {
  SELFDEV_PROVENANCE_SCHEMA_VERSION,
  SELFDEV_REPLAY_ALGORITHM_VERSION,
  type SelfDevProvenance,
} from '../../core/selfDev/types';

export type LocalProvenanceErrorCode =
  | 'PROVENANCE_UNAVAILABLE'
  | 'NON_GIT_ROOT'
  | 'GIT_COMMAND_FAILED'
  | 'AUTHORITATIVE_SOURCE_DIRTY'
  | 'AUTHORITATIVE_SOURCE_UNTRACKED'
  | 'AUTHORITATIVE_FILE_UNSAFE'
  | 'AUTHORITATIVE_FILE_MISSING'
  | 'SOURCE_BUNDLE_TOO_LARGE'
  | 'BASELINE_NOT_FOUND';

export class LocalProvenanceError extends Error {
  constructor(readonly code: LocalProvenanceErrorCode, message: string = code) {
    super(`SELFDEV_${code}:${message}`);
    this.name = 'LocalProvenanceError';
  }
}

export interface LocalProvenanceOptions {
  readonly repositoryRoot?: string;
  readonly nodeVersion?: string;
}

export interface LocalCheckoutState {
  readonly repositoryRoot: string;
  readonly gitHeadSha: string;
  readonly currentHeadSha: string;
  readonly sourceBundleDigest: string;
  readonly contractDigest: string;
  readonly authoritativeSourceState: 'CLEAN';
  isAncestor(baseSha: string): boolean;
}

const MAX_SOURCE_BUNDLE_BYTES = 5 * 1024 * 1024;
const SAFE_NODE_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA_RE = /^[0-9a-f]{40}$/;

function fixedChildEnvironment(): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    LANG: 'C',
    LC_ALL: 'C',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
  };
}

function canonicalRoot(root: string): string {
  if (!path.isAbsolute(root)) throw new LocalProvenanceError('PROVENANCE_UNAVAILABLE', 'PROVENANCE_ROOT_NOT_ABSOLUTE');
  try {
    return fs.realpathSync(root);
  } catch {
    throw new LocalProvenanceError('PROVENANCE_UNAVAILABLE', 'PROVENANCE_ROOT_UNAVAILABLE');
  }
}

function runGit(root: string, args: readonly string[], allowStatuses: readonly number[] = [0]): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  if (args.some((arg) => arg.includes('\0'))) throw new LocalProvenanceError('PROVENANCE_UNAVAILABLE', 'GIT_ARGUMENT_INVALID');
  const result = spawnSync('git', [...args], {
    cwd: root,
    env: fixedChildEnvironment(),
    shell: false,
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 512 * 1024,
    windowsHide: true,
  });
  const status = typeof result.status === 'number' ? result.status : -1;
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  if (!allowStatuses.includes(status)) throw new LocalProvenanceError('GIT_COMMAND_FAILED', `${args[0] ?? 'git'}_${status}`);
  return { status, stdout, stderr };
}

function requireHead(root: string): string {
  const top = runGit(root, ['rev-parse', '--show-toplevel']).stdout.trim();
  if (!top || canonicalRoot(top) !== root) throw new LocalProvenanceError('NON_GIT_ROOT');
  const head = runGit(root, ['rev-parse', 'HEAD']).stdout.trim();
  if (!SHA_RE.test(head)) throw new LocalProvenanceError('BASELINE_NOT_FOUND');
  return head;
}

function assertAuthoritativePathsSafe(root: string): { readonly path: string; readonly bytes: Buffer }[] {
  let total = 0;
  const entries: { readonly path: string; readonly bytes: Buffer }[] = [];
  for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
    if (relative.startsWith('/') || relative.includes('..') || path.normalize(relative) !== relative) {
      throw new LocalProvenanceError('AUTHORITATIVE_FILE_UNSAFE');
    }
    const absolute = path.join(root, relative);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(absolute);
    } catch {
      throw new LocalProvenanceError('AUTHORITATIVE_FILE_MISSING', relative);
    }
    if (stat.isSymbolicLink() || !stat.isFile()) throw new LocalProvenanceError('AUTHORITATIVE_FILE_UNSAFE', relative);
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(absolute);
    } catch {
      throw new LocalProvenanceError('PROVENANCE_UNAVAILABLE', relative);
    }
    total += bytes.byteLength;
    if (total > MAX_SOURCE_BUNDLE_BYTES) throw new LocalProvenanceError('SOURCE_BUNDLE_TOO_LARGE');
    entries.push({ path: relative, bytes });
  }
  return entries;
}

function assertClean(root: string): void {
  const paths = [...SELFDEV_AUTHORITATIVE_PATHS];
  const unstaged = runGit(root, ['diff', '--quiet', '--', ...paths], [0, 1]);
  const staged = runGit(root, ['diff', '--cached', '--quiet', '--', ...paths], [0, 1]);
  if (unstaged.status === 1 || staged.status === 1) throw new LocalProvenanceError('AUTHORITATIVE_SOURCE_DIRTY');

  // The digest list is fixed, but an untracked file under the authoritative
  // selfDev/provenance roots could still affect module loading. Check those
  // exact code-defined roots without recursively hashing arbitrary content.
  const untracked = runGit(root, [
    'ls-files', '--others', '--exclude-standard', '--',
    'src/core/selfDev', 'src/core/selfDevSandbox', 'src/core/provenance', 'src/core/policy/ownerScope.ts',
    'src/core/policy/privateArtifacts.ts', 'bin/selfdev-provenance.mjs',
    'bin/selfdev-synthetic.mjs', 'bin/selfdev-verify.mjs', 'bin/selfdev-adopt-sandbox.mjs',
    'package.json', 'package-lock.json', 'tsconfig.json',
  ]).stdout.trim();
  if (untracked !== '') throw new LocalProvenanceError('AUTHORITATIVE_SOURCE_UNTRACKED');
}

export function sourceBundleDigest(repositoryRoot: string): string {
  return sha256LengthPrefixedEntries(assertAuthoritativePathsSafe(canonicalRoot(repositoryRoot)));
}

export function currentCheckoutState(options: LocalProvenanceOptions = {}): LocalCheckoutState {
  const root = canonicalRoot(options.repositoryRoot ?? path.resolve(__dirname, '../../..'));
  const gitHeadSha = requireHead(root);
  assertClean(root);
  const sourceBundleDigestValue = sha256LengthPrefixedEntries(assertAuthoritativePathsSafe(root));
  const contractDigest = selfDevContractDigest();
  return {
    repositoryRoot: root,
    gitHeadSha,
    currentHeadSha: gitHeadSha,
    sourceBundleDigest: sourceBundleDigestValue,
    contractDigest,
    authoritativeSourceState: 'CLEAN',
    isAncestor(baseSha: string): boolean {
      if (!SHA_RE.test(baseSha)) return false;
      return runGit(root, ['merge-base', '--is-ancestor', baseSha, gitHeadSha], [0, 1]).status === 0;
    },
  };
}

export function readLocalNightwatchProvenance(options: LocalProvenanceOptions = {}): SelfDevProvenance {
  const state = currentCheckoutState(options);
  const runtimeNodeVersion = options.nodeVersion ?? process.versions.node;
  if (!SAFE_NODE_VERSION_RE.test(runtimeNodeVersion)) throw new LocalProvenanceError('PROVENANCE_UNAVAILABLE', 'NODE_VERSION_UNSAFE');
  return {
    schemaVersion: SELFDEV_PROVENANCE_SCHEMA_VERSION,
    gitHeadSha: state.gitHeadSha,
    sourceBundleDigest: state.sourceBundleDigest,
    contractDigest: state.contractDigest,
    algorithmVersion: SELFDEV_REPLAY_ALGORITHM_VERSION,
    authoritativeSourceState: state.authoritativeSourceState,
    runtimeNodeVersion,
    provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
  };
}

export function provenanceManifestSummary(): { readonly manifestVersion: string; readonly algorithm: string; readonly pathCount: number } {
  return {
    manifestVersion: SELFDEV_SOURCE_BUNDLE_MANIFEST_VERSION,
    algorithm: SELFDEV_SOURCE_BUNDLE_ALGORITHM,
    pathCount: SELFDEV_AUTHORITATIVE_PATHS.length,
  };
}
