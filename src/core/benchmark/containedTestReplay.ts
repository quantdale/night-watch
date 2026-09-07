// ---------------------------------------------------------------------------
// Mined-case contained test replay. Gives a mined historical benchmark case
// a REAL, mechanically-proven reproduction: the fix commit's added test file
// is executed once against the pre-fix tree (first parent + added test) and
// once against the post-fix tree (the fix commit itself), inside disposable
// temp directories, with an explicitly offline vendored Go toolchain.
//
// Read-only-to-siblings: the sibling repository is touched only through
// `git -C <repo> rev-parse|ls-tree|show|cat-file` (argv arrays, shell:false,
// bounded timeouts). Trees are materialized blob-by-blob with `show` (one
// batched `cat-file` process per tree): `git archive` is deliberately NOT
// used because in-tree `.gitattributes` `export-ignore` rules silently drop
// build-essential files (observed live: ouchan's `go.mod`, `go.sum`,
// `pkg/`, and `services/` vanish from the archive). All writes land under
// os.tmpdir() and are removed in a `finally`. The sibling worktree is never
// checked out, configured, or written.
//
// Reasoner isolation: verdicts and the neutral observation string carry no
// file names, diffs, commit messages, or assertion text. The truncated
// stderr head in the result is HARNESS-SIDE audit material only and must
// never be forwarded into reasoner context, evidence refs, or dossiers.
// ---------------------------------------------------------------------------

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildChildEnvironment, buildGitChildEnvironment } from '../process/childEnvironment';

export const MINED_TEST_REPLAY_VERSION = 'nightwatch.mined-test-replay.v1' as const;

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;
const RELATIVE_PATH_RE = /^(?!\.)(?!-)(?!\/)[A-Za-z0-9._+/-]+$/;
/** Per-tree `go test` wall ceiling. The materialization ceiling is separate. */
export const CONTAINED_TEST_REPLAY_TIMEOUT_MS_DEFAULT = 180_000;
const CONTAINED_TEST_REPLAY_TIMEOUT_MS_MIN = 1_000;
const CONTAINED_TEST_REPLAY_TIMEOUT_MS_MAX = 1_800_000;
export const CONTAINED_TEST_REPLAY_MATERIALIZE_MS_DEFAULT = 600_000;
const CONTAINED_TEST_REPLAY_MATERIALIZE_MS_MIN = 30_000;
const CONTAINED_TEST_REPLAY_MATERIALIZE_MS_MAX = 1_800_000;
const GIT_LS_TREE_TIMEOUT_MS = 60_000;
const GIT_LS_TREE_MAX_BUFFER = 32 * 1024 * 1024;
const GIT_SHOW_TIMEOUT_MS = 30_000;
const GIT_SHOW_MAX_BUFFER = 1 * 1024 * 1024;
const STDOUT_CAP_BYTES = 64 * 1024;
const STDERR_CAP_BYTES = 64 * 1024;
export const REPLAY_STDERR_HEAD_CHARS = 2_000;

export type ContainedTestReplayVerdict =
  | 'REPRODUCED'
  | 'NOT_REPRODUCED'
  | 'INCONCLUSIVE'
  | 'ENVIRONMENT_BLOCKED';

/** Hidden-only replay coordinates. Never reasoner-visible. */
export interface MinedTestReplayDescriptor {
  readonly schemaVersion: typeof MINED_TEST_REPLAY_VERSION;
  /** Sibling repository id (`owner/name`), never an absolute path. */
  readonly repository: string;
  readonly fixCommit: string;
  /** Fix-added test file, relative to the repository root. */
  readonly testPath: string;
  /** Directory of the test package, relative to the root (`'.'` at root). */
  readonly packageDir: string;
}

/** Directory holding `testPath` (`'.'` when the test sits at the root). */
export function packageDirForTestPath(testPath: string): string {
  const dir = path.posix.dirname(testPath);
  return dir === '' || dir === '.' ? '.' : dir;
}

function safeRelative(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    RELATIVE_PATH_RE.test(value) &&
    !value.includes('..')
  );
}

/** Strict parser: malformed descriptors are rejected (never defaulted). */
export function parseMinedTestReplayDescriptor(value: unknown): MinedTestReplayDescriptor | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== MINED_TEST_REPLAY_VERSION) return null;
  if (typeof record.repository !== 'string' || !REPO_ID_RE.test(record.repository)) return null;
  if (typeof record.fixCommit !== 'string' || !SHA_RE.test(record.fixCommit)) return null;
  if (!safeRelative(record.testPath)) return null;
  if (typeof record.packageDir !== 'string') return null;
  if (record.packageDir !== packageDirForTestPath(record.testPath)) return null;
  if (record.packageDir !== '.' && !safeRelative(record.packageDir)) return null;
  return Object.freeze({
    schemaVersion: MINED_TEST_REPLAY_VERSION,
    repository: record.repository,
    fixCommit: record.fixCommit,
    testPath: record.testPath,
    packageDir: record.packageDir,
  });
}

export interface ContainedPackageRun {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  /** OS/spawn failure text (e.g. ENOENT); null when the process launched. */
  readonly spawnFailed: string | null;
  readonly stdout: string;
  readonly stderr: string;
}

export type PackageRunner = (input: {
  readonly treeDir: string;
  readonly packageDir: string;
  readonly timeoutMs: number;
  readonly goBinary: string;
  readonly env: NodeJS.ProcessEnv;
}) => Promise<ContainedPackageRun>;

export interface ContainedTestReplayRequest {
  readonly repoPath: string;
  readonly fixCommit: string;
  readonly testPath: string;
  readonly packageDir: string;
  readonly timeoutMs?: number;
  readonly materializeTimeoutMs?: number;
  /** Explicit `go` binary (wins over automatic selection). */
  readonly goBinary?: string;
  /** Override for the read-mostly module cache (toolchain lookup). */
  readonly moduleCacheDir?: string;
  /** Injectable package executor (tests). Defaults to the real `go test`. */
  readonly runPackage?: PackageRunner;
}
export type PackageSignal = 'PASS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT';

export interface ContainedTreeOutcome {
  readonly signal: PackageSignal;
  readonly reason: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
}

export interface ContainedTestReplayResult {
  readonly verdict: ContainedTestReplayVerdict;
  readonly reason: string;
  readonly preFix: ContainedTreeOutcome;
  readonly postFix: ContainedTreeOutcome;
  /** Truncated, secret-scrubbed stderr head. Harness-side audit only. */
  readonly stderrHead: string;
  readonly durationMs: number;
  /** Submodule paths skipped during materialization (absent from both trees). */
  readonly skippedSubmodules: readonly string[];
}

/**
 * Fixed-template neutral observation for reasoner context. Carries the
 * verdict token only — structurally incapable of leaking file names,
 * diffs, commit messages, or assertion text.
 */
export function stringifyMinedReplayVerdict(
  resultClass: 'REPRODUCED' | 'NOT_REPRODUCED' | 'NOT_AVAILABLE',
): string {
  return JSON.stringify({ harness: MINED_TEST_REPLAY_VERSION, replay: resultClass });
}

/** Strip ANSI escapes and redact `key=value` secret shapes, then truncate. */
export function scrubReplaySecrets(value: string): string {
  return value
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(
      /(api[_-]?key|bearer|token|secret|password|passwd|authorization)\s*[:=]\s*[^\s"']+/gi,
      '$1=[REDACTED]',
    )
    .slice(0, REPLAY_STDERR_HEAD_CHARS);
}

function normalizeTimeout(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < CONTAINED_TEST_REPLAY_TIMEOUT_MS_MIN ||
    value > CONTAINED_TEST_REPLAY_TIMEOUT_MS_MAX
  ) {
    return CONTAINED_TEST_REPLAY_TIMEOUT_MS_DEFAULT;
  }
  return value;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

function invalidRequest(request: ContainedTestReplayRequest): string | null {
  if (typeof request.repoPath !== 'string' || request.repoPath.length === 0) return 'REPO_PATH_MISSING';
  try {
    const stat = fs.lstatSync(request.repoPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return 'REPO_PATH_INVALID';
  } catch {
    return 'REPO_PATH_UNREADABLE';
  }
  if (typeof request.fixCommit !== 'string' || !SHA_RE.test(request.fixCommit)) return 'FIX_SHA_INVALID';
  if (!safeRelative(request.testPath)) return 'TEST_PATH_INVALID';
  if (
    typeof request.packageDir !== 'string' ||
    request.packageDir !== packageDirForTestPath(request.testPath) ||
    (request.packageDir !== '.' && !safeRelative(request.packageDir))
  ) {
    return 'PACKAGE_DIR_INVALID';
  }
  if (request.goBinary !== undefined && (typeof request.goBinary !== 'string' || request.goBinary.length === 0)) {
    return 'GO_BINARY_INVALID';
  }
  return null;
}

function blockedOutcome(reason: string): ContainedTreeOutcome {
  return { signal: 'BLOCKED', reason, exitCode: null, timedOut: false };
}

function blockedResult(
  reason: string,
  detail: string,
  started: number,
  stderrHead = '',
): ContainedTestReplayResult {
  return {
    verdict: 'ENVIRONMENT_BLOCKED',
    reason,
    preFix: blockedOutcome(detail),
    postFix: blockedOutcome(detail),
    stderrHead: scrubReplaySecrets(stderrHead),
    durationMs: Date.now() - started,
    skippedSubmodules: [],
  };
}

/** Read-only `git -C <repo> rev-parse --verify <sha>^`. Null on any failure. */
function gitParentSha(repoPath: string, fixCommit: string): string | null {
  const result = spawnSync('git', ['-C', repoPath, 'rev-parse', '--verify', `${fixCommit}^`], {
    encoding: 'utf8',
    env: buildGitChildEnvironment(),
    timeout: GIT_SHOW_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
    shell: false,
  });
  if (result.error || result.status !== 0) return null;
  const sha = String(result.stdout ?? '').trim();
  return SHA_RE.test(sha) ? sha : null;
}

/** Read-only `git -C <repo> show <sha>:<file>` as bytes. Null when absent. */
function gitShowFile(repoPath: string, sha: string, file: string): Buffer | null {
  const result = spawnSync('git', ['-C', repoPath, 'show', `${sha}:${file}`], {
    encoding: 'buffer',
    env: buildGitChildEnvironment(),
    timeout: GIT_SHOW_TIMEOUT_MS,
    maxBuffer: GIT_SHOW_MAX_BUFFER,
    shell: false,
  } as Parameters<typeof spawnSync>[2]);
  if (result.error || result.status !== 0) return null;
  const stdout = result.stdout;
  if (!Buffer.isBuffer(stdout) || stdout.length === 0) return null;
  return stdout;
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

interface LsTreeEntry {
  readonly mode: string;
  readonly kind: 'blob' | 'tree' | 'commit';
  readonly path: string;
}

/** Decode `git ls-tree` C-quoting (`"a\nb"` style). Plain names pass through. */
function unquoteLsTreePath(raw: string): string {
  if (raw.length < 2 || !raw.startsWith('"') || !raw.endsWith('"')) return raw;
  return raw
    .slice(1, -1)
    .replace(/\\\\/g, '\0')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\0/g, '\\');
}

/** Read-only `git -C <repo> ls-tree -r <sha>`. Null on any failure. */
function gitLsTreeEntries(repoPath: string, sha: string): LsTreeEntry[] | null {
  const result = spawnSync('git', ['-C', repoPath, 'ls-tree', '-r', sha], {
    encoding: 'utf8',
    env: buildGitChildEnvironment(),
    timeout: GIT_LS_TREE_TIMEOUT_MS,
    maxBuffer: GIT_LS_TREE_MAX_BUFFER,
    shell: false,
  });
  if (result.error || result.status !== 0) return null;
  const entries: LsTreeEntry[] = [];
  for (const line of String(result.stdout ?? '').split('\n')) {
    if (line.length === 0) continue;
    const match = /^(\d{6}) (blob|tree|commit) [0-9a-f]{40}\t(.*)$/.exec(line);
    if (!match) return null;
    entries.push({ mode: match[1] ?? '', kind: match[2] as LsTreeEntry['kind'], path: unquoteLsTreePath(match[3] ?? '') });
  }
  return entries;
}

function normalizeMaterializeTimeout(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < CONTAINED_TEST_REPLAY_MATERIALIZE_MS_MIN ||
    value > CONTAINED_TEST_REPLAY_MATERIALIZE_MS_MAX
  ) {
    return CONTAINED_TEST_REPLAY_MATERIALIZE_MS_DEFAULT;
  }
  return value;
}

/** A materialized entry still awaiting its batch response (order-preserved). */
interface PendingBlob {
  readonly path: string;
  readonly symlink: boolean;
  readonly executable: boolean;
}

const BATCH_SINGLE_FILE_BYTES_MAX = 256 * 1024 * 1024;

/**
 * Materialize one commit tree blob-by-blob through a single
 * `git -C <repo> cat-file --batch` process (batched `show` reads over the
 * same read-only objects). `git archive` is not used: in-tree
 * `export-ignore` attributes silently drop build-essential files.
 * Executable bits and symlinks are recreated; submodules are skipped and
 * reported. Resolves false on any failure or timeout.
 */
function materializeTreeViaBatch(
  repoPath: string,
  sha: string,
  destDir: string,
  entries: readonly LsTreeEntry[],
  deadlineMs: number,
): Promise<{ ok: boolean; skippedSubmodules: string[] }> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: { ok: boolean; skippedSubmodules: string[] }): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const skippedSubmodules: string[] = [];
    const pending: PendingBlob[] = [];
    const requests: string[] = [];
    for (const entry of entries) {
      if (entry.kind === 'commit') {
        skippedSubmodules.push(entry.path);
        continue;
      }
      if (entry.kind !== 'blob') continue;
      if (entry.path.length === 0 || entry.path.includes('\0')) {
        done({ ok: false, skippedSubmodules });
        return;
      }
      pending.push({
        path: entry.path,
        symlink: entry.mode === '120000',
        executable: entry.mode === '100755',
      });
      requests.push(`${sha}:${entry.path}\n`);
    }
    if (pending.length === 0) {
      done({ ok: false, skippedSubmodules });
      return;
    }
    let child;
    try {
      child = spawn('git', ['-C', repoPath, 'cat-file', '--batch'], {
        env: buildGitChildEnvironment(),
        shell: false,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      done({ ok: false, skippedSubmodules });
      return;
    }
    const timer = setTimeout(() => {
      killProcessGroup(child.pid, child);
      done({ ok: false, skippedSubmodules });
    }, Math.max(1000, deadlineMs - Date.now()));
    if (typeof timer.unref === 'function') timer.unref();
    const fail = (): void => {
      clearTimeout(timer);
      killProcessGroup(child.pid, child);
      done({ ok: false, skippedSubmodules });
    };
    child.on('error', fail);
    for (const stream of [child.stdout, child.stderr, child.stdin]) {
      stream?.on('error', () => {});
    }
    let received = 0;
    let buffer = Buffer.alloc(0);
    const writeDest = (item: PendingBlob, content: Buffer): boolean => {
      const dest = path.join(destDir, ...item.path.split('/'));
      const relative = path.relative(destDir, dest);
      if (relative.startsWith('..') || path.isAbsolute(relative) || relative.length === 0) return false;
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (item.symlink) {
          fs.symlinkSync(content.toString('utf8'), dest);
        } else {
          fs.writeFileSync(dest, content);
          if (item.executable) fs.chmodSync(dest, 0o755);
        }
      } catch {
        return false;
      }
      return true;
    };
    const pump = (): void => {
      while (received < pending.length) {
        const newline = buffer.indexOf(0x0a);
        if (newline < 0) return;
        const header = buffer.toString('utf8', 0, newline);
        const match = / (missing|blob|tree|commit)( (\d+))?$/.exec(header);
        if (!match) {
          fail();
          return;
        }
        const item = pending[received];
        if (item === undefined || match[1] !== 'blob' || match[3] === undefined) {
          fail();
          return;
        }
        const size = Number(match[3]);
        if (!Number.isInteger(size) || size < 0 || size > BATCH_SINGLE_FILE_BYTES_MAX) {
          fail();
          return;
        }
        if (buffer.length < newline + 1 + size + 1) return;
        const content = buffer.subarray(newline + 1, newline + 1 + size);
        buffer = buffer.subarray(newline + 1 + size + 1);
        received += 1;
        if (!writeDest(item, Buffer.from(content))) {
          fail();
          return;
        }
      }
      if (received >= pending.length) {
        clearTimeout(timer);
        try {
          child.stdin?.end();
        } catch {
          // Already closed; the exit below still settles the result.
        }
      }
    };
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      pump();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ ok: code === 0 && received >= pending.length, skippedSubmodules });
    });
    try {
      const body = requests.join('');
      if (!child.stdin.write(body)) {
        child.stdin.once('drain', () => {
          try {
            child.stdin?.end();
          } catch {
            // Close races a failed child; `close` still settles below.
          }
        });
      } else {
        child.stdin.end();
      }
    } catch {
      fail();
    }
  });
}

/**
 * Highest `go`/`toolchain` version required by a go.mod file (`toolchain`
 * directives carry a `go` prefix: `toolchain go1.26.0`). Best-effort:
 * unparseable files yield null and the replay falls back honestly.
 */
export function parseGoModRequiredVersion(goModText: string): string | null {
  if (typeof goModText !== 'string') return null;
  let required: string | null = null;
  for (const line of goModText.split('\n')) {
    const match = /^(?:go|toolchain)\s+(?:go)?(\d+\.\d+(?:\.\d+)?)\b/.exec(line.trim());
    if (!match) continue;
    const version = match[1] as string;
    if (required === null || compareGoVersions(version, required) > 0) required = version;
  }
  return required;
}

/** Numeric dotted-version comparison (missing components count as zero). */
export function compareGoVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const first = pa[i] ?? 0;
    const second = pb[i] ?? 0;
    if (first === second) continue;
    return first > second ? 1 : -1;
  }
  return 0;
}

function platformToolchainSuffix(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch =
    process.arch === 'x64' ? 'amd64' : process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : '';
  return `.${os}-${arch}`;
}

/**
 * Lowest cached `golang.org/toolchain` satisfying `required` (offline:
 * directory scan only, never a download). Returns the toolchain `go`
 * binary path, or null when the cache cannot satisfy the requirement.
 */
export function findCachedToolchain(moduleCacheDir: string, required: string): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(path.join(moduleCacheDir, 'golang.org'));
  } catch {
    return null;
  }
  const suffix = platformToolchainSuffix();
  const versions: string[] = [];
  for (const entry of entries) {
    if (!entry.startsWith('toolchain@v0.0.1-go') || !entry.endsWith(suffix)) continue;
    const version = entry.slice('toolchain@v0.0.1-go'.length, entry.length - suffix.length);
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) continue;
    if (compareGoVersions(version, required) >= 0) versions.push(version);
  }
  versions.sort(compareGoVersions);
  for (const version of versions) {
    const binary = path.join(moduleCacheDir, 'golang.org', `toolchain@v0.0.1-go${version}${suffix}`, 'bin', 'go');
    try {
      fs.accessSync(binary, fs.constants.X_OK);
      return binary;
    } catch {
      continue;
    }
  }
  return null;
}

function systemGoVersion(goBinary: string): string | null {
  const result = spawnSync(goBinary, ['version'], {
    encoding: 'utf8',
    env: buildChildEnvironment(),
    timeout: 15_000,
    maxBuffer: 64 * 1024,
    shell: false,
  });
  if (result.error || result.status !== 0) return null;
  const match = /go(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(result.stdout ?? ''));
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3] ?? '0'}`;
}

function readGoModRequired(goModPath: string): string | null {
  try {
    const text = fs.readFileSync(goModPath, 'utf8').slice(0, 64 * 1024);
    return parseGoModRequiredVersion(text);
  } catch {
    return null;
  }
}

/** Nearest go.mod walking up from the package dir to the tree root. */
function findGoModPath(treeDir: string, packageDir: string): string | null {
  // packageDir is pre-validated safe-relative, so the walk stays in-tree.
  const root = path.resolve(treeDir);
  let dir = packageDir === '.' ? root : path.resolve(root, ...packageDir.split('/'));
  for (;;) {
    try {
      if (fs.statSync(path.join(dir, 'go.mod')).isFile()) return path.join(dir, 'go.mod');
    } catch {
      // Absent here; keep walking up.
    }
    if (dir === root) return null;
    const parent = path.dirname(dir);
    if (parent === dir || path.relative(root, parent).startsWith('..')) return null;
    dir = parent;
  }
}
function selectGoBinary(
  explicit: string | undefined,
  treeDir: string,
  packageDir: string,
  moduleCacheDir: string,
): string {
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  const goModPath = findGoModPath(treeDir, packageDir);
  const required = goModPath === null ? null : readGoModRequired(goModPath);
  if (required === null) return 'go';
  const system = systemGoVersion('go');
  if (system !== null && compareGoVersions(system, required) >= 0) return 'go';
  return findCachedToolchain(moduleCacheDir, required) ?? 'go';
}

function containedGoEnvironment(treeDir: string, moduleCacheDir: string): NodeJS.ProcessEnv {
  const cacheDir = path.join(treeDir, '.nightwatch-gocache');
  const homeDir = path.join(treeDir, '.nightwatch-gohome');
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
  } catch {
    // The go invocation will surface an unwritable cache as BLOCKED output.
  }
  return {
    ...buildChildEnvironment(),
    GOFLAGS: '-mod=vendor',
    GOPROXY: 'off',
    GOSUMDB: 'off',
    GONOSUMDB: '*',
    GONOSUMCHECK: '1',
    // The selected binary already satisfies the tree's go.mod, so no
    // toolchain switch can trigger (and GOPROXY=off forbids downloads).
    GOTOOLCHAIN: 'local',
    GOCACHE: cacheDir,
    // Read-mostly module cache for cached-toolchain execution. Vendor mode
    // performs no downloads; a cache miss fails honestly inside the run.
    GOMODCACHE: moduleCacheDir,
    HOME: homeDir,
  };
}

function appendCapped(current: string, chunk: Buffer | string, cap: number): string {
  if (current.length >= cap) return current;
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  return (current + text).slice(0, cap);
}

/** Bounded argv-array execution with process-group termination on timeout. */
function runBounded(
  file: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<ContainedPackageRun> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (run: ContainedPackageRun): void => {
      if (!settled) {
        settled = true;
        resolve(run);
      }
    };
    let child;
    try {
      child = spawn(file, [...args], {
        cwd,
        env,
        shell: false,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      done({ exitCode: null, timedOut: false, spawnFailed: errorText(error), stdout: '', stderr: '' });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = appendCapped(stdout, chunk, STDOUT_CAP_BYTES);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = appendCapped(stderr, chunk, STDERR_CAP_BYTES);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      done({ exitCode: null, timedOut: false, spawnFailed: errorText(error), stdout, stderr });
    });
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child.pid, child);
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
    let timedOut = false;
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ exitCode: code, timedOut, spawnFailed: null, stdout, stderr });
    });
  });
}

/** Default package executor: offline vendored `go test -count=1`. */
async function runGoTestPackage(input: {
  readonly treeDir: string;
  readonly packageDir: string;
  readonly timeoutMs: number;
  readonly goBinary: string;
  readonly env: NodeJS.ProcessEnv;
}): Promise<ContainedPackageRun> {
  const target = input.packageDir === '.' ? '.' : `./${input.packageDir}`;
  return runBounded(input.goBinary, ['test', '-count=1', target], input.treeDir, input.env, input.timeoutMs);
}

const NO_TESTS_RE = /no test files|no tests to run|no tests found/i;
const BUILD_ENV_RE =
  /\[build failed\]|build failed|missing vendor|inconsistent vendoring|cannot find|cannot load|no required module|go\.mod not found|GOPROXY|GOTOOLCHAIN|requires go >=|network is unreachable|dial tcp|tls handshake|certificate|\(vet\)|vet failed/i;
const TEST_FAILURE_RE = /--- FAIL:|^=== FAIL|panic: |fatal error: |DATA RACE/i;

/**
 * Classify one package run. A non-zero exit with build/vendor/network
 * markers and no test-failure marker is an environment failure, not a test
 * signal. A zero exit that executed no tests is BLOCKED, never a pass: a
 * vacuous pass must not mint NOT_REPRODUCED credit.
 */
export function classifyPackageRun(run: ContainedPackageRun): ContainedTreeOutcome {
  const combined = `${run.stdout}\n${run.stderr}`;
  if (run.timedOut) return { signal: 'TIMED_OUT', reason: 'TIMEOUT', exitCode: run.exitCode, timedOut: true };
  if (run.spawnFailed !== null) {
    return { signal: 'BLOCKED', reason: 'SPAWN_FAILED', exitCode: run.exitCode, timedOut: false };
  }
  if (NO_TESTS_RE.test(combined)) {
    return { signal: 'BLOCKED', reason: 'NO_TESTS_FOUND', exitCode: run.exitCode, timedOut: false };
  }
  if (run.exitCode === 0) {
    return { signal: 'PASS', reason: 'TESTS_PASSED', exitCode: 0, timedOut: false };
  }
  const testFailure = TEST_FAILURE_RE.test(combined);
  const buildEnv = BUILD_ENV_RE.test(combined);
  if (buildEnv && !testFailure) {
    return { signal: 'BLOCKED', reason: 'BUILD_OR_VENDOR_ERROR', exitCode: run.exitCode, timedOut: false };
  }
  return { signal: 'FAIL', reason: 'TESTS_FAILED', exitCode: run.exitCode, timedOut: false };
}

/**
 * Run the contained pre/post replay. Never throws for invalid input or
 * failed tooling (those become ENVIRONMENT_BLOCKED); never writes inside
 * the sibling repository; always removes its temp trees.
 */
export async function runContainedTestReplay(
  request: ContainedTestReplayRequest,
): Promise<ContainedTestReplayResult> {
  const started = Date.now();
  const invalid = invalidRequest(request);
  if (invalid !== null) return blockedResult('INVALID_INPUT', invalid, started);

  const timeoutMs = normalizeTimeout(request.timeoutMs);
  const materializeMs = normalizeMaterializeTimeout(request.materializeTimeoutMs);
  const parentSha = gitParentSha(request.repoPath, request.fixCommit);
  if (parentSha === null) return blockedResult('PARENT_UNAVAILABLE', 'PARENT_UNAVAILABLE', started);
  const preEntries = gitLsTreeEntries(request.repoPath, parentSha);
  if (preEntries === null) return blockedResult('MATERIALIZE_FAILED', 'MATERIALIZE_PRE_LIST_FAILED', started);
  const postEntries = gitLsTreeEntries(request.repoPath, request.fixCommit);
  if (postEntries === null) return blockedResult('MATERIALIZE_FAILED', 'MATERIALIZE_POST_LIST_FAILED', started);

  let preDir: string | null = null;
  let postDir: string | null = null;
  try {
    preDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-replay-pre-'));
    postDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-replay-post-'));

    const preTree = await materializeTreeViaBatch(request.repoPath, parentSha, preDir, preEntries, started + materializeMs);
    if (!preTree.ok) {
      return blockedResult('MATERIALIZE_FAILED', 'MATERIALIZE_PRE_FAILED', started);
    }
    const postTree = await materializeTreeViaBatch(
      request.repoPath,
      request.fixCommit,
      postDir,
      postEntries,
      started + materializeMs,
    );
    if (!postTree.ok) {
      return blockedResult('MATERIALIZE_FAILED', 'MATERIALIZE_POST_FAILED', started);
    }
    const skippedSubmodules = [...new Set([...preTree.skippedSubmodules, ...postTree.skippedSubmodules])].sort();
    const testBytes = gitShowFile(request.repoPath, request.fixCommit, request.testPath);
    if (testBytes === null) {
      return blockedResult('TEST_FILE_UNAVAILABLE', 'TEST_FILE_UNAVAILABLE', started);
    }
    const testDest = path.join(preDir, ...request.testPath.split('/'));
    if (path.relative(preDir, testDest).startsWith('..') || path.isAbsolute(path.relative(preDir, testDest))) {
      return blockedResult('TEST_PATH_INVALID', 'TEST_PATH_ESCAPES_TREE', started);
    }
    try {
      fs.mkdirSync(path.dirname(testDest), { recursive: true });
      fs.writeFileSync(testDest, testBytes);
    } catch (error) {
      return blockedResult('TREE_WRITE_FAILED', 'TREE_WRITE_FAILED', started, errorText(error));
    }

    const moduleCacheDir =
      typeof request.moduleCacheDir === 'string' && request.moduleCacheDir.length > 0
        ? request.moduleCacheDir
        : (process.env.GOMODCACHE ?? path.join(os.homedir(), 'go', 'pkg', 'mod'));
    const selectedGo = selectGoBinary(request.goBinary, postDir, request.packageDir, moduleCacheDir);
    const runner = request.runPackage ?? runGoTestPackage;
    let preRun: ContainedPackageRun;
    let postRun: ContainedPackageRun;
    try {
      preRun = await runner({
        treeDir: preDir,
        packageDir: request.packageDir,
        timeoutMs,
        goBinary: selectedGo,
        env: containedGoEnvironment(preDir, moduleCacheDir),
      });
      postRun = await runner({
        treeDir: postDir,
        packageDir: request.packageDir,
        timeoutMs,
        goBinary: selectedGo,
        env: containedGoEnvironment(postDir, moduleCacheDir),
      });
    } catch (error) {
      return blockedResult('RUNNER_FAILED', 'RUNNER_FAILED', started, errorText(error));
    }

    const preFix = classifyPackageRun(preRun);
    const postFix = classifyPackageRun(postRun);
    const stderrHead = scrubReplaySecrets(
      [preRun.spawnFailed ?? '', preRun.stderr, postRun.spawnFailed ?? '', postRun.stderr]
        .filter((part) => part.length > 0)
        .join('\n'),
    );

    const finish = (
      verdict: ContainedTestReplayVerdict,
      reason: string,
    ): ContainedTestReplayResult => ({
      verdict,
      reason,
      preFix,
      postFix,
      stderrHead,
      durationMs: Date.now() - started,
      skippedSubmodules,
    });

    if (preFix.signal === 'TIMED_OUT' || postFix.signal === 'TIMED_OUT') {
      return finish('INCONCLUSIVE', preFix.signal === 'TIMED_OUT' ? 'TIMEOUT_PRE' : 'TIMEOUT_POST');
    }
    if (preFix.signal === 'BLOCKED') return finish('ENVIRONMENT_BLOCKED', `PRE_${preFix.reason}`);
    if (preFix.signal === 'PASS') return finish('NOT_REPRODUCED', 'PRE_PASS');
    if (postFix.signal === 'PASS') return finish('REPRODUCED', 'PRE_FAIL_POST_PASS');
    if (postFix.signal === 'FAIL') return finish('INCONCLUSIVE', 'BOTH_FAIL');
    return finish('INCONCLUSIVE', `POST_${postFix.reason}`);
  } finally {
    for (const dir of [preDir, postDir]) {
      if (dir !== null) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {
          // Best-effort cleanup; the OS reclaims tmp on reboot.
        }
      }
    }
  }
}
