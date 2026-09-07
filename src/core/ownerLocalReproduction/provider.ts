// ---------------------------------------------------------------------------
// W9 provider lane — owner-local deterministic current-source reproduction.
//
// WHAT THIS IS
// The REAL_LOCAL reproduction provider. It turns an approved source path
// (`repository:relative/path`, the ONLY thing the reasoner supplies) into a
// host-derived Go package target, executes it at least twice in fresh
// Nightwatch-owned disposable trees, and mints `REPRODUCED_CURRENT_FAILURE`
// only for a repeated, identical, pre-existing test failure with a stable
// sibling identity and a network-forbidding executor environment.
//
// AUTHORITY BOUNDARY (load-bearing)
// The request carries no command, argv, executable, environment, toolchain,
// URL, or Git operation — there is nowhere to put one. Every executable fact
// is derived by this module from repository metadata:
//   - admission from the single owner-approved universe (`../source/universe`)
//     and the confined sibling-source boundary (`../source/siblingSource`);
//   - the module/package layout from the sibling's own `go.mod` walk;
//   - argv as the fixed array `go test -mod=vendor -count=1 ./<package>`;
//   - the toolchain from the allowlisted resolution below (never downloaded);
//   - the environment from the fixed offline builder below.
// A second approval policy is deliberately NOT invented here: repository
// admission is `isOwnerApproved` + `approvedRootsFor`, and every source byte
// crosses `createSiblingSourceAccess`, which enforces its own admission set,
// symlink discipline, and regular-file-only reads.
//
// REUSE (not reinvention)
// Version parsing/comparison, cached-toolchain lookup, child environments,
// and secret scrubbing come from the existing engines
// (`../benchmark/containedTestReplay`, `../process/childEnvironment`).
// What is new here is required by the frozen W9 contract: seven distinct
// execution outcomes, failure fingerprints, sibling identity snapshots, and
// current-source proof minting — none of which the historical replay engine
// models (it replays pre/post trees; current source has no post-fix tree).
// ---------------------------------------------------------------------------

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  compareGoVersions,
  findCachedToolchain,
  parseGoModRequiredVersion,
  scrubReplaySecrets,
} from '../benchmark/containedTestReplay';
import { buildChildEnvironment, buildGitChildEnvironment } from '../process/childEnvironment';
import { sourceContentDigest } from '../source/scanTypes';
import {
  createSiblingSourceAccess,
  DEFAULT_SIBLING_ROOT,
} from '../source/siblingSource';
import {
  approvedRootsFor,
  isOwnerApproved,
  ownerApprovedRepositoryIds,
} from '../source/universe';
import { prefixedDigest24 } from '../identity/canonicalDigest';
import {
  FAILURE_FINGERPRINT_PREFIX,
  OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
} from '../localInvestigation/currentSourceProof';
import type {
  DeterministicReproductionProvider,
  LocalProviderResult,
  LocalReproductionProviderResult,
  LocalReproductionRequest,
  LocalReproductionSignal,
  LocalSourceDocument,
  LocalSourceProvider,
} from '../localInvestigation/types';
import {
  DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
  OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
  ownerLocalTargetDigest,
  type OwnerLocalEnvironmentBlock,
  type OwnerLocalExecutionOutcome,
  type OwnerLocalExecutionRecord,
  type OwnerLocalReproductionLimits,
  type OwnerLocalReproductionTarget,
  type OwnerLocalTargetDiscovery,
  type SiblingIdentitySnapshot,
} from './contracts';

/** Provider id minted into proofs, receipts, and evidence refs. */
export const OWNER_LOCAL_REPRODUCTION_PROVIDER_ID =
  'nightwatch.owner-local-current-source-reproduction.v1' as const;

/** Fixed-template reasoner-visible observation envelope. */
export const OWNER_LOCAL_REPRODUCTION_OBSERVATION_VERSION =
  'nightwatch.owner-local-reproduction-observation.v1' as const;

// ---------------------------------------------------------------------------
// Validation patterns.
// ---------------------------------------------------------------------------

const REPOSITORY_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RELATIVE_PATH_RE = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._+/-]{1,512}$/;
const FULL_SHA_RE = /^[0-9a-f]{40}$/;
const GO_VERSION_RE = /go(\d+)\.(\d+)(?:\.(\d+))?/;

// ---------------------------------------------------------------------------
// Limits.
// ---------------------------------------------------------------------------

/** Host-owned normalization: reasoner input can never widen these. */
export function normalizeOwnerLocalLimits(
  partial?: Partial<OwnerLocalReproductionLimits>,
): OwnerLocalReproductionLimits {
  const base = DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS;
  const pick = (value: unknown, fallback: number, min: number, max: number): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min) return fallback;
    return Math.min(value, max);
  };
  const rawExecutions = partial?.executions;
  // executions is floored at 2: a current-source proof is meaningless with
  // fewer than MIN_CURRENT_SOURCE_EXECUTIONS fresh runs.
  const executions =
    typeof rawExecutions === 'number' && Number.isInteger(rawExecutions)
      ? Math.min(Math.max(rawExecutions, 2), 8)
      : base.executions;
  return {
    materializeMs: pick(partial?.materializeMs, base.materializeMs, 1_000, base.materializeMs),
    executionMs: pick(partial?.executionMs, base.executionMs, 1_000, base.executionMs),
    capturedOutputBytes: pick(
      partial?.capturedOutputBytes,
      base.capturedOutputBytes,
      1_024,
      base.capturedOutputBytes,
    ),
    materializedFiles: pick(
      partial?.materializedFiles,
      base.materializedFiles,
      1,
      base.materializedFiles,
    ),
    materializedBytes: pick(
      partial?.materializedBytes,
      base.materializedBytes,
      1_048_576,
      base.materializedBytes,
    ),
    executions,
  };
}
// ---------------------------------------------------------------------------

export interface DecodedOwnerLocalSourcePath {
  readonly repository: string;
  readonly relativePath: string;
}

export function decodeOwnerLocalSourcePath(value: unknown): DecodedOwnerLocalSourcePath | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > 512) return null;
  if (value.includes('\0') || value.includes('\n') || value.includes('\r')) return null;
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return null;
  const repository = value.slice(0, separator);
  const relativePath = value.slice(separator + 1);
  if (!REPOSITORY_ID_RE.test(repository)) return null;
  if (!RELATIVE_PATH_RE.test(relativePath)) return null;
  if (relativePath.includes(':') || relativePath.includes('\\')) return null;
  const parts = relativePath.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..' || part === '.git')) {
    return null;
  }
  return { repository, relativePath };
}

// ---------------------------------------------------------------------------
// Symlink-safe path helpers (mechanism mirroring the sibling-source
// boundary; the admission POLICY itself is never reimplemented).
// ---------------------------------------------------------------------------

function isPathInside(candidate: string, parent: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedParent = path.resolve(parent);
  return (
    resolvedCandidate === resolvedParent ||
    resolvedCandidate.startsWith(`${resolvedParent}${path.sep}`)
  );
}

/** False when any existing component is a symlink (or is missing). */
function hasNoSymlinkPath(target: string): boolean {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function isRegularDirectoryNoFollow(target: string): boolean {
  try {
    return fs.lstatSync(target).isDirectory() && hasNoSymlinkPath(target);
  } catch {
    return false;
  }
}

function isRegularFileNoFollow(target: string): boolean {
  try {
    return fs.lstatSync(target).isFile() && hasNoSymlinkPath(target);
  } catch {
    return false;
  }
}

/** Resolve `<siblingRoot>/<repository>` with containment + symlink checks. */
export function resolveOwnerLocalRepositoryRoot(
  siblingRoot: string,
  repository: string,
): string | null {
  const resolvedRoot = path.resolve(siblingRoot);
  if (!isRegularDirectoryNoFollow(resolvedRoot)) return null;
  const parts = repository.split('/');
  if (parts.length === 0 || parts.some((part) => part.length === 0 || part === '.' || part === '..')) {
    return null;
  }
  const candidate = path.resolve(resolvedRoot, ...parts);
  if (!isPathInside(candidate, resolvedRoot)) return null;
  if (!isRegularDirectoryNoFollow(candidate)) return null;
  return candidate;
}

function readBoundedTextNoFollow(file: string, maxBytes: number): string | null {
  try {
    const stats = fs.lstatSync(file);
    if (stats.isSymbolicLink() || !stats.isFile() || stats.size > maxBytes) return null;
    if (!hasNoSymlinkPath(file)) return null;
    return fs.readFileSync(file, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

/** Nearest ancestor (from the package dir up to the repo root) holding go.mod. */
function findModuleRoot(repoRoot: string, packageDirAbs: string): string | null {
  let dir = path.resolve(packageDirAbs);
  const root = path.resolve(repoRoot);
  if (!isPathInside(dir, root)) return null;
  for (let depth = 0; depth < 64; depth += 1) {
    if (isRegularFileNoFollow(path.join(dir, 'go.mod'))) return dir;
    if (dir === root) return null;
    const parent = path.dirname(dir);
    if (parent === dir || !isPathInside(parent, root)) return null;
    dir = parent;
  }
  return null;
}

function toPosixRelative(from: string, to: string): string {
  const relative = path.relative(from, to);
  if (relative === '') return '.';
  return relative.split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Target discovery.
// ---------------------------------------------------------------------------

export interface DiscoverOwnerLocalTargetInput {
  readonly sourcePath: string;
  readonly siblingRoot?: string;
  readonly repositoryIds?: readonly string[];
  readonly limits?: Partial<OwnerLocalReproductionLimits>;
  /**
   * Host-bound content digest from the source-provider re-read. When present,
   * the fresh sibling bytes must agree with it exactly; otherwise discovery
   * refuses with SOURCE_NOT_CURRENT instead of minting a target off a
   * sibling-only read. Absent only on the test-only path (production always
   * configures `sourceProvider`, which supplies this binding).
   */
  readonly sourceContentDigest?: string;
}

export function discoverOwnerLocalTarget(
  input: DiscoverOwnerLocalTargetInput,
): OwnerLocalTargetDiscovery {
  const decoded = decodeOwnerLocalSourcePath(input.sourcePath);
  if (decoded === null) {
    return { status: 'UNSUPPORTED', refusal: 'PATH_MALFORMED' };
  }
  const { repository, relativePath } = decoded;
  const admitted: readonly string[] = input.repositoryIds ?? ownerApprovedRepositoryIds();
  if (!isOwnerApproved(repository) || !admitted.includes(repository)) {
    return { status: 'UNSUPPORTED', refusal: 'PATH_NOT_APPROVED' };
  }
  const roots = approvedRootsFor(repository);
  if (
    roots === null ||
    !roots.some((root) =>
      root === '' ? true : relativePath === root || relativePath.startsWith(`${root}/`),
    )
  ) {
    return { status: 'UNSUPPORTED', refusal: 'PATH_NOT_APPROVED' };
  }
  if (!relativePath.endsWith('.go')) {
    return { status: 'UNSUPPORTED', refusal: 'NO_SUPPORTED_EXECUTOR' };
  }
  const siblingRoot =
    input.siblingRoot ?? process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;
  const access = createSiblingSourceAccess(siblingRoot, {
    admittedRepositoryIds: [...admitted],
  });
  // Every source byte crosses the confined boundary: admission refusal,
  // symlink rejection, and regular-file-only reads are enforced there.
  const sourceText = access.reader.readFile(repository, relativePath);
  if (sourceText === null) {
    return { status: 'UNSUPPORTED', refusal: 'SOURCE_NOT_CURRENT' };
  }
  // A sibling-only read never binds the proof digest on its own: when the
  // provider re-read the path through the host source provider, the fresh
  // bytes must agree with that binding exactly.
  const freshDigest = sourceContentDigest(sourceText);
  const boundDigest = input.sourceContentDigest;
  if (boundDigest !== undefined) {
    if (typeof boundDigest !== 'string' || boundDigest.length === 0 || boundDigest !== freshDigest) {
      return { status: 'UNSUPPORTED', refusal: 'SOURCE_NOT_CURRENT' };
    }
  }
  const snapshot = access.currentness.currentSnapshot(repository);
  if (snapshot === null || !FULL_SHA_RE.test(snapshot.sha)) {
    return { status: 'UNSUPPORTED', refusal: 'SOURCE_NOT_CURRENT' };
  }
  const repoRoot = resolveOwnerLocalRepositoryRoot(siblingRoot, repository);
  if (repoRoot === null) {
    return { status: 'UNSUPPORTED', refusal: 'SOURCE_NOT_CURRENT' };
  }
  const sourceAbs = path.resolve(repoRoot, ...relativePath.split('/'));
  if (!isPathInside(sourceAbs, repoRoot) || !isRegularFileNoFollow(sourceAbs)) {
    return { status: 'UNSUPPORTED', refusal: 'SOURCE_NOT_CURRENT' };
  }
  const packageDirAbs = path.dirname(sourceAbs);
  const moduleRoot = findModuleRoot(repoRoot, packageDirAbs);
  if (moduleRoot === null) {
    return { status: 'UNSUPPORTED', refusal: 'MODULE_ROOT_NOT_FOUND' };
  }
  if (!isRegularFileNoFollow(path.join(moduleRoot, 'vendor', 'modules.txt'))) {
    return { status: 'UNSUPPORTED', refusal: 'VENDOR_DIRECTORY_ABSENT' };
  }
  let hasTestFile = false;
  try {
    const entries = fs.readdirSync(packageDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.name.endsWith('_test.go')) continue;
      const candidate = path.join(packageDirAbs, entry.name);
      try {
        const stats = fs.lstatSync(candidate);
        if (!stats.isSymbolicLink() && stats.isFile() && hasNoSymlinkPath(candidate)) {
          hasTestFile = true;
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return { status: 'UNSUPPORTED', refusal: 'PACKAGE_TEST_FILES_ABSENT' };
  }
  if (!hasTestFile) {
    return { status: 'UNSUPPORTED', refusal: 'PACKAGE_TEST_FILES_ABSENT' };
  }
  const limits = normalizeOwnerLocalLimits(input.limits);
  return {
    status: 'SUPPORTED',
    target: {
      schemaVersion: OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
      repository,
      sourcePath: input.sourcePath,
      sourceRelativePath: relativePath,
      sourceContentDigest: boundDigest ?? freshDigest,
      moduleRelativePath: toPosixRelative(repoRoot, moduleRoot),
      packageRelativePath: toPosixRelative(moduleRoot, packageDirAbs),
      executor: 'GO_VENDORED_PACKAGE_TEST',
      repositoryHeadSha: snapshot.sha,
      // Structural prerequisites verified above. TOOLCHAIN_BINARY and
      // TOOLCHAIN_VERSION_SATISFIED are appended by the provider only after
      // the allowlisted toolchain resolution succeeds; NETWORK_DISABLED is
      // the executor invariant (fixed offline env, never a request field).
      prerequisites: ['MODULE_MANIFEST', 'VENDOR_DIRECTORY', 'PACKAGE_TEST_FILES', 'NETWORK_DISABLED'],
      limits,
    },
  };
}

/** Absolute module root for a discovered target (containment-checked). */
export function ownerLocalModuleRoot(
  siblingRoot: string,
  target: OwnerLocalReproductionTarget,
): string | null {
  const repoRoot = resolveOwnerLocalRepositoryRoot(siblingRoot, target.repository);
  if (repoRoot === null) return null;
  const moduleRoot =
    target.moduleRelativePath === '.'
      ? repoRoot
      : path.resolve(repoRoot, ...target.moduleRelativePath.split('/'));
  if (!isPathInside(moduleRoot, repoRoot) || !isRegularDirectoryNoFollow(moduleRoot)) return null;
  return moduleRoot;
}

/** Host-derived `go test` package selector (`./<package>`). */
export function ownerLocalPackageSelector(target: OwnerLocalReproductionTarget): string {
  return target.packageRelativePath === '.' ? '.' : `./${target.packageRelativePath}`;
}

/** Package path relative to the repository root (for proof minting). */
export function ownerLocalRepositoryPackagePath(target: OwnerLocalReproductionTarget): string {
  if (target.moduleRelativePath === '.' || target.moduleRelativePath === '') {
    return target.packageRelativePath;
  }
  if (target.packageRelativePath === '.' || target.packageRelativePath === '') {
    return target.moduleRelativePath;
  }
  return `${target.moduleRelativePath}/${target.packageRelativePath}`;
}

// ---------------------------------------------------------------------------
// Sibling identity snapshot (read-only Git only; fixed argv).
// ---------------------------------------------------------------------------

/** The only Git operations this lane may ever run. Mutation is absent by construction. */
export const OWNER_LOCAL_GIT_HEAD_ARGV = Object.freeze(['rev-parse', 'HEAD'] as const);
export const OWNER_LOCAL_GIT_STATUS_ARGV = Object.freeze(['status', '--porcelain'] as const);
export const OWNER_LOCAL_GIT_TOPLEVEL_ARGV = Object.freeze(['rev-parse', '--show-toplevel'] as const);

const GIT_SNAPSHOT_TIMEOUT_MS = 15_000;
const GIT_SNAPSHOT_MAX_BUFFER = 1_024 * 1_024;

export type OwnerLocalGitRunner = (
  args: readonly string[],
  cwd: string,
) => Promise<{ readonly stdout: string; readonly stderr: string } | null>;

async function defaultGitRunner(
  args: readonly string[],
  cwd: string,
): Promise<{ readonly stdout: string; readonly stderr: string } | null> {
  try {
    const result = spawnSync('git', [...args], {
      cwd,
      env: buildGitChildEnvironment(),
      timeout: GIT_SNAPSHOT_TIMEOUT_MS,
      maxBuffer: GIT_SNAPSHOT_MAX_BUFFER,
      encoding: 'utf8',
      shell: false,
    });
    if (result.error !== undefined || result.status !== 0) return null;
    return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  } catch {
    return null;
  }
}

/**
 * Identity observation: the frozen snapshot plus the worktree root. The extra
 * field lives here (not in `contracts.ts`, which stays frozen) so the
 * equality check also pins the checkout location, not just its content.
 */
export interface SiblingIdentityObservation extends SiblingIdentitySnapshot {
  readonly worktreeRoot: string;
}

export interface SnapshotSiblingIdentityInput {
  readonly siblingRoot?: string;
  readonly repository: string;
  readonly runGit?: OwnerLocalGitRunner;
}

export async function snapshotSiblingIdentity(
  input: SnapshotSiblingIdentityInput,
): Promise<SiblingIdentityObservation | null> {
  const siblingRoot =
    input.siblingRoot ?? process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;
  const repoRoot = resolveOwnerLocalRepositoryRoot(siblingRoot, input.repository);
  if (repoRoot === null) return null;
  const runGit = input.runGit ?? defaultGitRunner;
  let head: { readonly stdout: string; readonly stderr: string } | null;
  let status: { readonly stdout: string; readonly stderr: string } | null;
  let toplevel: { readonly stdout: string; readonly stderr: string } | null;
  try {
    head = await runGit([...OWNER_LOCAL_GIT_HEAD_ARGV], repoRoot);
    status = await runGit([...OWNER_LOCAL_GIT_STATUS_ARGV], repoRoot);
    toplevel = await runGit([...OWNER_LOCAL_GIT_TOPLEVEL_ARGV], repoRoot);
  } catch {
    return null;
  }
  if (head === null || status === null || toplevel === null) return null;
  const headSha = head.stdout.trim();
  if (!FULL_SHA_RE.test(headSha)) return null;
  const worktreeRoot = path.resolve(toplevel.stdout.trim());
  if (worktreeRoot.length === 0 || !isPathInside(worktreeRoot, path.resolve(siblingRoot))) {
    return null;
  }
  const porcelainLines = status.stdout
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.length > 0)
    .sort();
  return {
    repository: input.repository,
    headSha,
    statusDigest: prefixedDigest24('sibstatus', porcelainLines),
    worktreeRoot,
  };
}

export function siblingIdentityStable(
  before: SiblingIdentityObservation,
  after: SiblingIdentityObservation,
): boolean {
  return (
    before.repository === after.repository &&
    before.headSha === after.headSha &&
    before.statusDigest === after.statusDigest &&
    path.resolve(before.worktreeRoot) === path.resolve(after.worktreeRoot)
  );
}

// ---------------------------------------------------------------------------
// Toolchain resolution (allowlisted binaries only; never downloads).
// ---------------------------------------------------------------------------

export type OwnerLocalToolchainResolution =
  | { readonly status: 'RESOLVED'; readonly binary: string; readonly version: string | null }
  | {
      readonly status: 'BLOCKED';
      readonly block: Extract<
        OwnerLocalEnvironmentBlock,
        'TOOLCHAIN_UNAVAILABLE' | 'TOOLCHAIN_VERSION_UNSATISFIED'
      >;
    };

export interface ResolveOwnerLocalGoBinaryInput {
  readonly requiredVersion: string | null;
  readonly explicitBinary?: string;
  readonly moduleCacheDir?: string;
  readonly resolveHook?: (
    requiredVersion: string | null,
  ) => OwnerLocalToolchainResolution;
}

function isUsableGoBinary(candidate: string): boolean {
  try {
    const stats = fs.lstatSync(candidate);
    if (stats.isSymbolicLink() || !stats.isFile()) return false;
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function goVersionOf(binary: string): string | null {
  try {
    const result = spawnSync(binary, ['version'], {
      encoding: 'utf8',
      env: { ...buildChildEnvironment(), GOTOOLCHAIN: 'local' },
      timeout: GIT_SNAPSHOT_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      shell: false,
    });
    if (result.error !== undefined || result.status !== 0) return null;
    const match = GO_VERSION_RE.exec(String(result.stdout ?? ''));
    if (match === null || match[1] === undefined || match[2] === undefined) return null;
    return `${match[1]}.${match[2]}.${match[3] ?? '0'}`;
  } catch {
    return null;
  }
}

function findAmbientGoBinaries(): readonly string[] {
  const found: string[] = [];
  const goroot = process.env['GOROOT'];
  if (typeof goroot === 'string' && goroot.length > 0) {
    found.push(path.join(goroot, 'bin', 'go'));
  }
  const pathVar = process.env['PATH'] ?? '';
  for (const dir of pathVar.split(':')) {
    if (dir.length === 0 || !path.isAbsolute(dir)) continue;
    found.push(path.join(dir, 'go'));
  }
  return [...new Set(found)];
}

function defaultModuleCacheDir(): string {
  const override = process.env['GOMODCACHE'];
  if (typeof override === 'string' && override.length > 0) return override;
  return path.join(os.homedir(), 'go', 'pkg', 'mod');
}

export function resolveOwnerLocalGoBinary(
  input: ResolveOwnerLocalGoBinaryInput,
): OwnerLocalToolchainResolution {
  if (input.resolveHook !== undefined) {
    return input.resolveHook(input.requiredVersion);
  }
  const required = input.requiredVersion;
  const satisfies = (version: string | null): boolean => {
    if (required === null) return version !== null;
    if (version === null) return false;
    return compareGoVersions(version, required) >= 0;
  };
  if (typeof input.explicitBinary === 'string' && input.explicitBinary.length > 0) {
    if (!isUsableGoBinary(input.explicitBinary)) {
      return { status: 'BLOCKED', block: 'TOOLCHAIN_UNAVAILABLE' };
    }
    const version = goVersionOf(input.explicitBinary);
    if (!satisfies(version)) {
      return {
        status: 'BLOCKED',
        block: version === null ? 'TOOLCHAIN_UNAVAILABLE' : 'TOOLCHAIN_VERSION_UNSATISFIED',
      };
    }
    return { status: 'RESOLVED', binary: input.explicitBinary, version };
  }
  let sawOlder = false;
  for (const candidate of findAmbientGoBinaries()) {
    if (!isUsableGoBinary(candidate)) continue;
    const version = goVersionOf(candidate);
    if (version === null) continue;
    if (required === null || compareGoVersions(version, required) >= 0) {
      return { status: 'RESOLVED', binary: candidate, version };
    }
    sawOlder = true;
  }
  if (required !== null) {
    const moduleCacheDir =
      typeof input.moduleCacheDir === 'string' && input.moduleCacheDir.length > 0
        ? input.moduleCacheDir
        : defaultModuleCacheDir();
    const cached = findCachedToolchain(moduleCacheDir, required);
    if (cached !== null && isUsableGoBinary(cached)) {
      const version = goVersionOf(cached);
      if (version !== null && compareGoVersions(version, required) >= 0) {
        return { status: 'RESOLVED', binary: cached, version };
      }
    }
    // Offline by policy: a newer toolchain that is not already cached is
    // reported, never fetched (every go invocation sets GOTOOLCHAIN=local).
    return { status: 'BLOCKED', block: sawOlder ? 'TOOLCHAIN_VERSION_UNSATISFIED' : 'TOOLCHAIN_UNAVAILABLE' };
  }
  return { status: 'BLOCKED', block: 'TOOLCHAIN_UNAVAILABLE' };
}

/** Highest `go`/`toolchain` version the module tree requires (null = unknown). */
export function requiredGoVersionForModule(moduleRoot: string): string | null {
  const text = readBoundedTextNoFollow(path.join(moduleRoot, 'go.mod'), 64 * 1024);
  if (text === null) return null;
  return parseGoModRequiredVersion(text);
}

// ---------------------------------------------------------------------------
// Materialization (sibling reads; Nightwatch-owned temp writes; finally cleanup).
// ---------------------------------------------------------------------------

export class OwnerLocalMaterializationError extends Error {
  readonly block: OwnerLocalEnvironmentBlock;
  constructor(
    block: Extract<
      OwnerLocalEnvironmentBlock,
      'MATERIALIZATION_LIMIT_EXCEEDED' | 'MATERIALIZATION_FAILED' | 'WORKSPACE_UNAVAILABLE'
    >,
    detail: string,
  ) {
    super(`OWNER_LOCAL_MATERIALIZE_${block}:${detail}`.slice(0, 300));
    this.name = 'OwnerLocalMaterializationError';
    this.block = block;
  }
}

export interface MaterializeOwnerLocalClosureInput {
  readonly moduleRoot: string;
  readonly limits: OwnerLocalReproductionLimits;
  readonly tempRoot?: string;
}

export interface MaterializedOwnerLocalClosure {
  readonly execRoot: string;
  readonly fileCount: number;
  readonly byteCount: number;
  readonly cleanup: () => void;
}

function removeTreeBestEffort(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort; the OS reclaims tmp on reboot.
  }
}

export function materializeOwnerLocalClosure(
  input: MaterializeOwnerLocalClosureInput,
): MaterializedOwnerLocalClosure {
  const moduleRoot = path.resolve(input.moduleRoot);
  if (!isRegularDirectoryNoFollow(moduleRoot)) {
    throw new OwnerLocalMaterializationError('WORKSPACE_UNAVAILABLE', 'MODULE_ROOT_UNREADABLE');
  }
  const destParent =
    typeof input.tempRoot === 'string' && input.tempRoot.length > 0
      ? path.resolve(input.tempRoot)
      : os.tmpdir();
  let dest: string;
  try {
    fs.mkdirSync(destParent, { recursive: true });
    dest = fs.mkdtempSync(path.join(destParent, 'nw-owner-local-'));
  } catch {
    throw new OwnerLocalMaterializationError('WORKSPACE_UNAVAILABLE', 'TEMP_CREATE_FAILED');
  }
  const deadline = Date.now() + input.limits.materializeMs;
  let fileCount = 0;
  let byteCount = 0;
  let checked = 0;
  try {
    const stack: string[] = [moduleRoot];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (dir === undefined) break;
      let entries: readonly fs.Dirent[];
      try {
        entries = fs
          .readdirSync(dir, { withFileTypes: true })
          .sort((left, right) => left.name.localeCompare(right.name));
      } catch {
        throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'ENUMERATE_FAILED');
      }
      for (const entry of entries) {
        if (entry.name === '.git') continue;
        const src = path.join(dir, entry.name);
        const relative = path.relative(moduleRoot, src);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'PATH_ESCAPE');
        }
        const dst = path.join(dest, relative);
        if (!isPathInside(dst, dest)) {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'PATH_ESCAPE');
        }
        let stats: fs.Stats;
        try {
          stats = fs.lstatSync(src);
        } catch {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'STAT_FAILED');
        }
        // Fail closed on symlinks: never follow, hardlink, or recreate them.
        if (stats.isSymbolicLink()) {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'SYMLINK_REJECTED');
        }
        if (stats.isDirectory()) {
          try {
            fs.mkdirSync(dst, { recursive: true });
          } catch {
            throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'MKDIR_FAILED');
          }
          stack.push(src);
        } else if (stats.isFile()) {
          fileCount += 1;
          byteCount += stats.size;
          if (fileCount > input.limits.materializedFiles || byteCount > input.limits.materializedBytes) {
            throw new OwnerLocalMaterializationError(
              'MATERIALIZATION_LIMIT_EXCEEDED',
              'CLOSURE_TOO_LARGE',
            );
          }
          try {
            fs.mkdirSync(path.dirname(dst), { recursive: true });
            fs.copyFileSync(src, dst);
          } catch {
            throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'COPY_FAILED');
          }
        } else {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'NOT_REGULAR');
        }
        checked += 1;
        if (checked % 128 === 0 && Date.now() > deadline) {
          throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'MATERIALIZE_TIMEOUT');
        }
      }
    }
  } catch (error) {
    removeTreeBestEffort(dest);
    if (error instanceof OwnerLocalMaterializationError) throw error;
    throw new OwnerLocalMaterializationError('MATERIALIZATION_FAILED', 'UNEXPECTED');
  }
  return {
    execRoot: dest,
    fileCount,
    byteCount,
    cleanup: () => removeTreeBestEffort(dest),
  };
}

// ---------------------------------------------------------------------------
// Offline `go test` execution (argv array only; detached group; group kill).
// ---------------------------------------------------------------------------

export interface OwnerLocalGoRunInput {
  readonly binary: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly outputCapBytes: number;
}

export interface OwnerLocalGoRunResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly truncated: boolean;
  readonly spawnFailed: string | null;
}

/** Fixed offline environment. Proxy variables never enter: the module may not dial out. */
export function ownerLocalGoEnv(execRoot: string): NodeJS.ProcessEnv {
  const cacheDir = path.join(execRoot, '.nightwatch-gocache');
  const homeDir = path.join(execRoot, '.nightwatch-gohome');
  const tmpDir = path.join(execRoot, '.nightwatch-gotmp');
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  } catch {
    // The go invocation surfaces an unwritable cache honestly inside the run.
  }
  return {
    ...buildChildEnvironment(),
    GOFLAGS: '-mod=vendor',
    GOPROXY: 'off',
    GOSUMDB: 'off',
    GONOSUMDB: '*',
    GONOSUMCHECK: '1',
    // The resolved binary already satisfies the tree's go.mod, so no
    // toolchain switch can trigger (and GOPROXY=off forbids downloads).
    GOTOOLCHAIN: 'local',
    GOCACHE: cacheDir,
    GOMODCACHE: path.join(homeDir, 'go', 'pkg', 'mod'),
    GOTMPDIR: tmpDir,
    HOME: homeDir,
  };
}

function killProcessGroup(pid: number | undefined, child: ChildProcess): void {
  if (pid !== undefined) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Fall through to the direct kill below.
    }
  }
  try {
    child.kill('SIGKILL');
  } catch {
    // Already exited; nothing to terminate.
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

export function runBoundedOwnerLocalGoTest(
  input: OwnerLocalGoRunInput,
): Promise<OwnerLocalGoRunResult> {
  const { promise, resolve } = Promise.withResolvers<OwnerLocalGoRunResult>();
  let settled = false;
  const done = (run: OwnerLocalGoRunResult): void => {
    if (!settled) {
      settled = true;
      resolve(run);
    }
  };
  let child: ChildProcess;
  try {
    child = spawn(input.binary, [...input.args], {
      cwd: input.cwd,
      env: input.env,
      shell: false,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    done({
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      truncated: false,
      spawnFailed: errorText(error),
    });
    return promise;
  }
  let stdout = '';
  let stderr = '';
  let truncated = false;
  let timedOut = false;
  const combinedLength = (): number => stdout.length + stderr.length;
  const appendCapped = (current: string, chunk: Buffer | string): string => {
    if (combinedLength() >= input.outputCapBytes) return current;
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    return (current + text).slice(0, Math.max(0, input.outputCapBytes - (combinedLength() - current.length)));
  };
  const onData = (which: 'stdout' | 'stderr') => (chunk: Buffer) => {
    if (which === 'stdout') stdout = appendCapped(stdout, chunk);
    else stderr = appendCapped(stderr, chunk);
    if (combinedLength() >= input.outputCapBytes && !truncated) {
      truncated = true;
      // Oversize output: reap the whole tree rather than letting a verbose
      // child run unbounded.
      killProcessGroup(child.pid, child);
    }
  };
  child.stdout?.on('data', onData('stdout'));
  child.stderr?.on('data', onData('stderr'));
  child.on('error', (error) => {
    clearTimeout(timer);
    done({
      exitCode: null,
      stdout,
      stderr,
      timedOut: false,
      truncated,
      spawnFailed: errorText(error),
    });
  });
  const timer = setTimeout(() => {
    timedOut = true;
    killProcessGroup(child.pid, child);
  }, input.timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();
  child.on('close', (code) => {
    clearTimeout(timer);
    done({ exitCode: code, stdout, stderr, timedOut, truncated, spawnFailed: null });
  });
  return promise;
}

// ---------------------------------------------------------------------------
// Output classification. A generic nonzero exit is NEVER a reproduced bug:
// TEST_FAILURE requires actual Go test assertion/panic markers.
// ---------------------------------------------------------------------------

const NO_TESTS_RE = /no test files|no tests to run|no tests found|no tests matched/i;
// Real test-assertion evidence: a named `--- FAIL:` line, a Go panic, a fatal
// runtime error, a testify error trace, a `_test.go:<line>` site, or a race.
const TEST_FAILURE_RE = /--- FAIL:|panic:|fatal error:|Error Trace:|_test\.go:\d+|DATA RACE/i;
// Build/toolchain breakage: compiler errors, missing modules, vendor drift,
// toolchain gates, and vet failures. Checked only AFTER test markers, so a
// run where a test genuinely failed is never demoted to a build failure.
const BUILD_FAILURE_RE =
  /\[build failed\]|build failed|missing vendor|inconsistent vendoring|cannot find|cannot load|no required module|go\.mod not found|requires go >=|updates to go\.mod needed|missing go\.sum entry|explicitly disabled by GOPROXY|module lookup disabled|undefined:|declared and not used|import cycle|vet failed|\(vet\)|^# \S+/im;

export interface ClassifiableOwnerLocalRun {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly spawnFailed: string | null;
}

export function classifyGoTestOutput(run: ClassifiableOwnerLocalRun): OwnerLocalExecutionOutcome {
  if (run.spawnFailed !== null) return 'ENVIRONMENT_BLOCKED';
  if (run.timedOut) return 'TIMEOUT';
  const combined = `${run.stdout}\n${run.stderr}`;
  if (NO_TESTS_RE.test(combined)) return 'NO_TESTS';
  if (run.exitCode === 0) return 'TEST_PASS';
  if (run.exitCode === null) return 'PROCESS_FAILURE';
  if (TEST_FAILURE_RE.test(combined)) return 'TEST_FAILURE';
  if (BUILD_FAILURE_RE.test(combined)) return 'BUILD_FAILURE';
  return 'PROCESS_FAILURE';
}

/**
 * Stable digest over the normalized failing-check identity set: sorted
 * unique `--- FAIL:` test names plus the first normalized panic line
 * (addresses/goroutine ids redacted — they vary run to run). Null when the
 * output names no failing check at all.
 */
export function failureFingerprintForOutput(stdout: string, stderr: string): string | null {
  const combined = `${stdout}\n${stderr}`;
  const names = new Set<string>();
  const failRe = /--- FAIL:\s+(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = failRe.exec(combined)) !== null) {
    const name = (match[1] ?? '').trim();
    if (name.length === 0 || name.startsWith('(')) continue;
    names.add(name);
  }
  const panicMatch = /^panic:\s*(.*)$/m.exec(combined);
  const panicLine =
    panicMatch?.[1] === undefined
      ? null
      : panicMatch[1]
          .replace(/0x[0-9a-f]+/gi, '0xADDR')
          .replace(/goroutine \d+/g, 'goroutine N')
          .trim()
          .slice(0, 300);
  if (names.size === 0 && (panicLine === null || panicLine.length === 0)) return null;
  return prefixedDigest24(FAILURE_FINGERPRINT_PREFIX, {
    names: [...names].sort(),
    panic: panicLine !== null && panicLine.length > 0 ? panicLine : null,
  });
}

// ---------------------------------------------------------------------------
// Single fresh execution (materialize + run + record; cleanup in finally).
// ---------------------------------------------------------------------------

export interface OwnerLocalReproductionPorts {
  readonly runGit?: OwnerLocalGitRunner;
  readonly runGoTest?: (input: OwnerLocalGoRunInput) => Promise<OwnerLocalGoRunResult>;
  readonly resolveGoBinary?: (
    requiredVersion: string | null,
  ) => OwnerLocalToolchainResolution;
}

export interface ExecuteOwnerLocalTargetInput {
  readonly target: OwnerLocalReproductionTarget;
  readonly siblingRoot: string;
  readonly attempt: number;
  readonly goBinary: string;
  readonly limits: OwnerLocalReproductionLimits;
  readonly tempRoot?: string;
  readonly ports?: OwnerLocalReproductionPorts;
}

export interface OwnerLocalSingleExecution {
  readonly record: OwnerLocalExecutionRecord;
  readonly stdoutHead: string;
  readonly stderrHead: string;
}

export async function executeOwnerLocalTarget(
  input: ExecuteOwnerLocalTargetInput,
): Promise<OwnerLocalSingleExecution> {
  const started = Date.now();
  const moduleRoot = ownerLocalModuleRoot(input.siblingRoot, input.target);
  if (moduleRoot === null) {
    throw new OwnerLocalMaterializationError('WORKSPACE_UNAVAILABLE', 'MODULE_ROOT_UNRESOLVED');
  }
  const closure = materializeOwnerLocalClosure({
    moduleRoot,
    limits: input.limits,
    tempRoot: input.tempRoot,
  });
  try {
    const selector = ownerLocalPackageSelector(input.target);
    // Host-derived argv only: `go test -mod=vendor -count=1 ./<package>`.
    const args = ['test', '-mod=vendor', '-count=1', selector] as const;
    const env = ownerLocalGoEnv(closure.execRoot);
    let run: OwnerLocalGoRunResult;
    try {
      run =
        input.ports?.runGoTest !== undefined
          ? await input.ports.runGoTest({
              binary: input.goBinary,
              args: [...args],
              cwd: closure.execRoot,
              env,
              timeoutMs: input.limits.executionMs,
              outputCapBytes: input.limits.capturedOutputBytes,
            })
          : await runBoundedOwnerLocalGoTest({
              binary: input.goBinary,
              args: [...args],
              cwd: closure.execRoot,
              env,
              timeoutMs: input.limits.executionMs,
              outputCapBytes: input.limits.capturedOutputBytes,
            });
    } catch (error) {
      run = {
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: false,
        truncated: false,
        spawnFailed: errorText(error),
      };
    }
    const outcome = classifyGoTestOutput(run);
    const record: OwnerLocalExecutionRecord = {
      attempt: input.attempt,
      outcome,
      exitCode: run.exitCode,
      durationMs: Date.now() - started,
      timedOut: run.timedOut,
      failureFingerprint:
        outcome === 'TEST_FAILURE' ? failureFingerprintForOutput(run.stdout, run.stderr) : null,
      capturedBytes: Buffer.byteLength(run.stdout, 'utf8') + Buffer.byteLength(run.stderr, 'utf8'),
      truncated: run.truncated,
    };
    return {
      record,
      stdoutHead: scrubReplaySecrets(run.stdout),
      stderrHead: scrubReplaySecrets(run.stderr),
    };
  } finally {
    closure.cleanup();
  }
}

// ---------------------------------------------------------------------------
// Provider.
// ---------------------------------------------------------------------------

export interface OwnerLocalReproductionProviderOptions {
  readonly siblingRoot?: string;
  readonly repositoryIds?: readonly string[];
  readonly limits?: Partial<OwnerLocalReproductionLimits>;
  readonly providerId?: string;
  /**
   * Host-only source provider (the same instance the investigation context
   * uses for source). Before any discovery or execution, run() re-reads
   * request.sourcePath through it: a BLOCKED re-read propagates (SOURCE_STALE
   * stays transient), a content mismatch or evidence mismatch refuses with
   * SOURCE_STALE, and the returned contentDigest — never a sibling-only
   * read — binds the proof digest. Absent only on the test-only path.
   */
  readonly sourceProvider?: LocalSourceProvider;
  /** Host-pinned toolchain override. Never taken from the request. */
  readonly goBinary?: string;
  readonly tempRoot?: string;
  readonly ports?: OwnerLocalReproductionPorts;
}

type OwnerLocalDisposition =
  | 'DETERMINISTIC_TERMINAL'
  | 'ENVIRONMENT_BLOCKED'
  | 'TRANSIENT_RETRYABLE';

function blocked(
  cls: 'NOT_CONFIGURED' | 'DATA_BLOCKED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' | 'UNSAFE_INPUT',
  reason: string,
): LocalProviderResult<LocalReproductionProviderResult> {
  return { status: 'BLOCKED', class: cls, reason };
}

function observation(
  verdict: LocalReproductionProviderResult['verdict'],
  packagePath: string,
  executions: number,
  failureClass: string | null,
): unknown {
  return {
    harness: OWNER_LOCAL_REPRODUCTION_OBSERVATION_VERSION,
    outcome: verdict,
    package: packagePath,
    executions,
    failureClass,
  };
}

export function createOwnerLocalReproductionProvider(
  options: OwnerLocalReproductionProviderOptions = {},
): DeterministicReproductionProvider {
  const providerId =
    typeof options.providerId === 'string' && options.providerId.length > 0
      ? options.providerId
      : OWNER_LOCAL_REPRODUCTION_PROVIDER_ID;
  const siblingRoot =
    options.siblingRoot ?? process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;
  const repositoryIds = options.repositoryIds ?? ownerApprovedRepositoryIds();
  const limits = normalizeOwnerLocalLimits(options.limits);
  const ports = options.ports ?? {};
  const tempRoot = options.tempRoot;
  const explicitGoBinary = options.goBinary;

  return Object.freeze({
    providerId,
    async run(
      request: LocalReproductionRequest,
    ): Promise<LocalProviderResult<LocalReproductionProviderResult>> {
      const started = Date.now();
      try {
        const sourcePath = typeof request.sourcePath === 'string' ? request.sourcePath : '';
        const sourceEvidenceRef =
          typeof request.sourceEvidenceRef === 'string' ? request.sourceEvidenceRef : '';
        if (sourcePath.length === 0 || sourceEvidenceRef.length === 0) {
          return blocked('UNSAFE_INPUT', 'MISSING_SOURCE_GROUNDING');
        }
        // Host-bound source gate: the proof digest comes from the source
        // provider's re-read, and the fresh sibling bytes must still agree
        // with it at discovery time. Any divergence means the reasoner's
        // grounding no longer describes current source: no execution.
        let boundContentDigest: string | undefined;
        if (options.sourceProvider !== undefined) {
          let reRead: LocalProviderResult<LocalSourceDocument>;
          try {
            reRead = await options.sourceProvider.read(sourcePath);
          } catch {
            return blocked('SOURCE_UNAVAILABLE', 'SOURCE_REREAD_FAILED');
          }
          if (reRead.status === 'BLOCKED') {
            return blocked(reRead.class, reRead.reason);
          }
          const document = reRead.value;
          if (
            typeof document.contentDigest !== 'string' ||
            document.contentDigest.length === 0 ||
            document.contentDigest.length > 128 ||
            sourceContentDigest(document.text) !== document.contentDigest
          ) {
            return blocked('SOURCE_STALE', 'SOURCE_CONTENT_DRIFTED_AFTER_INSPECTION');
          }
          // Opportunistic evidence binding: the session already gates
          // (path, evidenceRef) pairs (UNSAFE_INTENT), and documents carry no
          // evidenceRef field — but when a read result DOES carry one, it must
          // equal the request's, or the grounding is stale.
          const returnedRef: unknown =
            typeof document === 'object' && document !== null && 'evidenceRef' in document
              ? document.evidenceRef
              : undefined;
          if (
            typeof returnedRef === 'string' &&
            returnedRef.length > 0 &&
            returnedRef !== sourceEvidenceRef
          ) {
            return blocked('SOURCE_STALE', 'SOURCE_EVIDENCE_MISMATCH');
          }
          boundContentDigest = document.contentDigest;
        }
        const discovery = discoverOwnerLocalTarget({
          sourcePath,
          siblingRoot,
          repositoryIds,
          limits,
          sourceContentDigest: boundContentDigest,
        });
        if (discovery.status === 'UNSUPPORTED') {
          if (discovery.refusal === 'PATH_MALFORMED' || discovery.refusal === 'PATH_NOT_APPROVED') {
            return blocked('UNSAFE_INPUT', 'UNKNOWN_SOURCE_PATH');
          }
          // The source provider bound this path to a digest the sibling no
          // longer matches: transient staleness, not a terminal verdict.
          if (boundContentDigest !== undefined && discovery.refusal === 'SOURCE_NOT_CURRENT') {
            return blocked('SOURCE_STALE', 'SOURCE_CONTENT_DRIFTED_AFTER_INSPECTION');
          }
          const value: LocalReproductionProviderResult = {
            verdict: 'NOT_AVAILABLE',
            reasonerVisible: observation('NOT_AVAILABLE', '', 0, null),
            evidenceRef: null,
            provenanceRefs: [],
            preFix: 'NOT_RUN',
            postFix: 'NOT_RUN',
            currentSourceProof: null,
            audit: {
              providerId,
              refusal: discovery.refusal,
              disposition: 'DETERMINISTIC_TERMINAL' satisfies OwnerLocalDisposition,
              durationMs: Date.now() - started,
            },
          };
          return { status: 'AVAILABLE', value };
        }

        // Toolchain (host-resolved, allowlisted, never downloaded).
        const moduleRoot = ownerLocalModuleRoot(siblingRoot, discovery.target);
        if (moduleRoot === null) {
          return availableBlocked(
            providerId,
            discovery.target,
            'WORKSPACE_UNAVAILABLE',
            'NOT_RUN',
            started,
          );
        }
        const requiredVersion = requiredGoVersionForModule(moduleRoot);
        const toolchain = resolveOwnerLocalGoBinary({
          requiredVersion,
          explicitBinary: explicitGoBinary,
          resolveHook: ports.resolveGoBinary,
        });
        if (toolchain.status === 'BLOCKED') {
          return availableBlocked(
            providerId,
            discovery.target,
            toolchain.block,
            'NOT_RUN',
            started,
          );
        }
        const target: OwnerLocalReproductionTarget = {
          ...discovery.target,
          prerequisites: [
            ...discovery.target.prerequisites,
            'TOOLCHAIN_BINARY',
            'TOOLCHAIN_VERSION_SATISFIED',
          ],
        };

        const identityBefore = await snapshotSiblingIdentity({
          siblingRoot,
          repository: target.repository,
          runGit: ports.runGit,
        });
        if (identityBefore === null) {
          return availableBlocked(
            providerId,
            target,
            'WORKSPACE_UNAVAILABLE',
            'NOT_RUN',
            started,
          );
        }

        const records: OwnerLocalExecutionRecord[] = [];
        const heads: Array<{ readonly stdoutHead: string; readonly stderrHead: string }> = [];
        for (let attempt = 1; attempt <= limits.executions; attempt += 1) {
          try {
            const execution = await executeOwnerLocalTarget({
              target,
              siblingRoot,
              attempt,
              goBinary: toolchain.binary,
              limits,
              tempRoot,
              ports,
            });
            records.push(execution.record);
            heads.push({
              stdoutHead: execution.stdoutHead,
              stderrHead: execution.stderrHead,
            });
          } catch (error) {
            const block =
              error instanceof OwnerLocalMaterializationError
                ? error.block
                : 'MATERIALIZATION_FAILED';
            return availableBlocked(providerId, target, block, 'NOT_RUN', started, {
              identityBefore,
              records,
            });
          }
        }

        const identityAfter = await snapshotSiblingIdentity({
          siblingRoot,
          repository: target.repository,
          runGit: ports.runGit,
        });
        const stable =
          identityAfter !== null && siblingIdentityStable(identityBefore, identityAfter);
        if (!stable) {
          return availableBlocked(
            providerId,
            target,
            identityAfter === null ? 'WORKSPACE_UNAVAILABLE' : 'SIBLING_IDENTITY_DRIFT',
            preFixForRecords(records),
            started,
            { identityBefore, identityAfter, records },
          );
        }

        return mintAttemptResult({
          providerId,
          target,
          records,
          heads,
          identityBefore,
          identityAfter,
          started,
        });
      } catch (error) {
        const value: LocalReproductionProviderResult = {
          verdict: 'ENVIRONMENT_BLOCKED',
          reasonerVisible: observation('ENVIRONMENT_BLOCKED', '', 0, null),
          evidenceRef: null,
          provenanceRefs: [],
          preFix: 'NOT_RUN',
          postFix: 'NOT_RUN',
          currentSourceProof: null,
          audit: {
            providerId,
            block: 'WORKSPACE_UNAVAILABLE',
            reason: 'PROVIDER_EXCEPTION',
            detail: errorText(error),
            disposition: 'ENVIRONMENT_BLOCKED' satisfies OwnerLocalDisposition,
            durationMs: Date.now() - started,
          },
        };
        return { status: 'AVAILABLE', value };
      }
    },
  });
}

function preFixForRecords(records: readonly OwnerLocalExecutionRecord[]): LocalReproductionSignal {
  if (records.some((record) => record.outcome === 'TEST_FAILURE')) return 'FAIL';
  if (records.length > 0 && records.every((record) => record.outcome === 'TEST_PASS')) return 'PASS';
  return 'NOT_RUN';
}

function availableBlocked(
  providerId: string,
  target: OwnerLocalReproductionTarget,
  block: OwnerLocalEnvironmentBlock,
  preFix: LocalReproductionSignal,
  started: number,
  extra?: {
    readonly identityBefore?: unknown;
    readonly identityAfter?: unknown;
    readonly records?: readonly OwnerLocalExecutionRecord[];
  },
): LocalProviderResult<LocalReproductionProviderResult> {
  const value: LocalReproductionProviderResult = {
    verdict: 'ENVIRONMENT_BLOCKED',
    reasonerVisible: observation(
      'ENVIRONMENT_BLOCKED',
      ownerLocalRepositoryPackagePath(target),
      extra?.records?.length ?? 0,
      null,
    ),
    evidenceRef: null,
    provenanceRefs: [],
    preFix,
    postFix: 'NOT_RUN',
    currentSourceProof: null,
    audit: {
      providerId,
      targetDigest: ownerLocalTargetDigest(target),
      block,
      siblingIdentityStable: null,
      networkDisabled: true,
      records: extra?.records ?? [],
      identityBefore: extra?.identityBefore ?? null,
      identityAfter: extra?.identityAfter ?? null,
      disposition: 'ENVIRONMENT_BLOCKED' satisfies OwnerLocalDisposition,
      durationMs: Date.now() - started,
    },
  };
  return { status: 'AVAILABLE', value };
}

function mintAttemptResult(input: {
  readonly providerId: string;
  readonly target: OwnerLocalReproductionTarget;
  readonly records: readonly OwnerLocalExecutionRecord[];
  readonly heads: ReadonlyArray<{ readonly stdoutHead: string; readonly stderrHead: string }>;
  readonly identityBefore: SiblingIdentityObservation;
  readonly identityAfter: SiblingIdentityObservation;
  readonly started: number;
}): LocalProviderResult<LocalReproductionProviderResult> {
  const { providerId, target, records } = input;
  const targetDigest = ownerLocalTargetDigest(target);
  const packagePath = ownerLocalRepositoryPackagePath(target);
  const baseAudit = {
    providerId,
    targetDigest,
    siblingIdentityStable: true,
    networkDisabled: true,
    records: records.map((record, index) => ({
      ...record,
      stdoutHead: input.heads[index]?.stdoutHead ?? '',
      stderrHead: input.heads[index]?.stderrHead ?? '',
    })),
    identityBefore: input.identityBefore,
    identityAfter: input.identityAfter,
    durationMs: Date.now() - input.started,
  };
  const provenanceBase = [`repo:${target.repository}`, `sha:${input.identityAfter.headSha}`];

  const allTestFailure =
    records.length >= 2 && records.every((record) => record.outcome === 'TEST_FAILURE');
  if (allTestFailure) {
    const fingerprints = records.map((record) => record.failureFingerprint);
    const first = fingerprints[0] ?? null;
    if (
      first !== null &&
      fingerprints.every((fingerprint) => fingerprint !== null && fingerprint === first)
    ) {
      const proof = {
        schemaVersion: OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
        proofKind: 'CURRENT_SOURCE_REPEATED_TEST_FAILURE',
        mintedBy: providerId,
        repository: target.repository,
        packageRelativePath: packagePath,
        repositoryHeadSha: input.identityAfter.headSha,
        sourcePath: target.sourcePath,
        sourceContentDigest: target.sourceContentDigest,
        targetDigest,
        failureFingerprint: first,
        executionCount: records.length,
        failureClass: 'TEST_ASSERTION_FAILURE',
        discriminatorOrigin: 'PRE_EXISTING_REPOSITORY_TEST',
        siblingIdentityStable: true,
        networkDisabled: true,
      } as const;
      const value: LocalReproductionProviderResult = {
        verdict: 'REPRODUCED_CURRENT_FAILURE',
        reasonerVisible: observation(
          'REPRODUCED_CURRENT_FAILURE',
          packagePath,
          records.length,
          'TEST_ASSERTION_FAILURE',
        ),
        evidenceRef: prefixedDigest24('ev', {
          provider: providerId,
          target: targetDigest,
          fingerprint: first,
          executions: records.length,
        }),
        provenanceRefs: [...provenanceBase, targetDigest],
        preFix: 'FAIL',
        postFix: 'NOT_RUN',
        currentSourceProof: { ...proof },
        audit: { ...baseAudit, disposition: 'DETERMINISTIC_TERMINAL' satisfies OwnerLocalDisposition },
      };
      return { status: 'AVAILABLE', value };
    }
  }

  if (records.length > 0 && records.every((record) => record.outcome === 'TEST_PASS')) {
    const value: LocalReproductionProviderResult = {
      verdict: 'NOT_REPRODUCED',
      reasonerVisible: observation('NOT_REPRODUCED', packagePath, records.length, null),
      evidenceRef: prefixedDigest24('ev', {
        provider: providerId,
        target: targetDigest,
        pass: true,
        executions: records.length,
      }),
      provenanceRefs: [...provenanceBase, targetDigest],
      preFix: 'PASS',
      postFix: 'NOT_RUN',
      currentSourceProof: null,
      audit: { ...baseAudit, disposition: 'DETERMINISTIC_TERMINAL' satisfies OwnerLocalDisposition },
    };
    return { status: 'AVAILABLE', value };
  }

  if (
    records.length > 0 &&
    records.every((record) => record.outcome === 'ENVIRONMENT_BLOCKED')
  ) {
    return availableBlocked(providerId, target, 'WORKSPACE_UNAVAILABLE', 'NOT_RUN', input.started, {
      identityBefore: input.identityBefore,
      identityAfter: input.identityAfter,
      records,
    });
  }

  const transient = records.some(
    (record) => record.outcome === 'TIMEOUT' || record.outcome === 'PROCESS_FAILURE',
  );
  const value: LocalReproductionProviderResult = {
    verdict: 'INCONCLUSIVE',
    reasonerVisible: observation('INCONCLUSIVE', packagePath, records.length, null),
    evidenceRef: null,
    provenanceRefs: [...provenanceBase],
    preFix: preFixForRecords(records),
    postFix: 'NOT_RUN',
    currentSourceProof: null,
    audit: {
      ...baseAudit,
      disposition: (transient
        ? 'TRANSIENT_RETRYABLE'
        : 'DETERMINISTIC_TERMINAL') satisfies OwnerLocalDisposition,
    },
  };
  return { status: 'AVAILABLE', value };
}
