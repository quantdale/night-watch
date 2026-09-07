// Mined-case contained test replay acceptance: deterministic, offline, no
// sibling repositories. Tiny throwaway git fixtures stand in for history;
// injected runners stand in for `go test` (one shell-script fake-`go`
// covers the real timeout path through the default runner).
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUG_ATLAS_RECORD_VERSION,
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  type BugAtlasRecord,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import {
  MINED_TEST_REPLAY_VERSION,
  classifyPackageRun,
  compareGoVersions,
  createPreFixViewExecutor,
  defaultBenchmarkBudgetPolicy,
  findCachedToolchain,
  packageDirForTestPath,
  parseGoModRequiredVersion,
  parseMinedTestReplayDescriptor,
  runBenchmarkHunt,
  runContainedTestReplay,
  scrubReplaySecrets,
  stringifyMinedReplayVerdict,
  tryDefineMinedBenchmarkCase,
  type ContainedPackageRun,
  type ContainedTestReplayResult,
  type PackageRunner,
} from '../../src/core/benchmark';

const FILE_CANARY = 'file-content-canary-zx9q2';
const STDERR_CANARY = 'stderr-canary-qw7m4';

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'git failed');
  return result.stdout.trim();
}

function initRepo(): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-replay-fixture-'));
  git(repo, ['init', '-b', 'main']);
  git(repo, ['config', 'user.email', 'nightwatch@example.invalid']);
  git(repo, ['config', 'user.name', 'Nightwatch Fixture']);
  return repo;
}

function commitAll(repo: string, files: Record<string, string>, message: string): void {
  for (const [name, body] of Object.entries(files)) {
    const dest = path.join(repo, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body);
  }
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-m', message]);
}

/** Minimal engine fixture: one flat file plus a fix-added test file. */
function engineFixture(): { repo: string; sha: string } {
  const repo = initRepo();
  try {
    commitAll(repo, { 'a.txt': 'v1\n' }, 'seed value');
    commitAll(repo, { 'a.txt': 'v2\n', 'added_test.go': 'package p\n' }, 'fix value and add test');
    return { repo, sha: git(repo, ['rev-parse', 'HEAD']) };
  } catch (error) {
    fs.rmSync(repo, { recursive: true, force: true });
    throw error;
  }
}

/** Mined-case fixture: total.ts fix plus an added total.test.ts. */
function minedFixture(root: string): { repo: string; sha: string } {
  const repo = path.join(root, 'example', 'ledger');
  fs.mkdirSync(repo, { recursive: true });
  git(repo, ['init', '-b', 'main']);
  git(repo, ['config', 'user.email', 'nightwatch@example.invalid']);
  git(repo, ['config', 'user.name', 'Nightwatch Fixture']);
  commitAll(repo, { 'total.ts': 'export const total = 101;\n' }, 'seed cart total');
  commitAll(
    repo,
    {
      'total.ts': 'export const total = 100;\n',
      'total.test.ts': `// ${FILE_CANARY}\nimport { total } from "./total";\nif (total !== 100) throw new Error("off-by-one");\n`,
    },
    'fix off-by-one cart total',
  );
  return { repo, sha: git(repo, ['rev-parse', 'HEAD']) };
}

function record(partial: Pick<BugAtlasRecord, 'bugId' | 'repository' | 'symptom' | 'provenance'>): BugAtlasRecord {
  return {
    schemaVersion: BUG_ATLAS_RECORD_VERSION,
    product: 'fixture',
    service: null,
    expected: null,
    actual: null,
    trigger: null,
    rootCause: null,
    fixLocator: null,
    testsAdded: [],
    violatedInvariant: null,
    detectionSignals: [],
    relatedBugIds: [],
    ...partial,
  };
}

function passRun(): ContainedPackageRun {
  return { exitCode: 0, timedOut: false, spawnFailed: null, stdout: 'ok\tpkg\t0.01s\n', stderr: '' };
}
function failRun(token = 'boom'): ContainedPackageRun {
  return {
    exitCode: 1,
    timedOut: false,
    spawnFailed: null,
    stdout: '--- FAIL: TestAdded (0.00s)\n',
    stderr: `    added_test.go:3: ${token}\nFAIL\tpkg\t0.01s\n`,
  };
}
function replayResult(partial: Partial<ContainedTestReplayResult> & { verdict: ContainedTestReplayResult['verdict'] }): ContainedTestReplayResult {
  return {
    reason: 'STUB',
    preFix: { signal: 'FAIL', reason: 'TESTS_FAILED', exitCode: 1, timedOut: false },
    postFix: { signal: 'PASS', reason: 'TESTS_PASSED', exitCode: 0, timedOut: false },
    stderrHead: '',
    durationMs: 7,
    skippedSubmodules: [],
    ...partial,
  };
}

function replayDirs(): Set<string> {
  return new Set(fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('nightwatch-replay-')));
}

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-replay-reasoner',
  provider: 'stub',
  model: 'stub-replay-1',
};

function okTurn(intents: unknown[]): ReasonerCallResult {
  return {
    ok: true,
    response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] } as unknown as ReasonerTurnResponse,
    provenance: PROVENANCE,
    stdoutBytes: 64,
    stderrBytes: 0,
  };
}

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[]): ReasonerDriver {
  let calls = 0;
  return {
    protocolVersion: REASONER_DRIVER_VERSION,
    transport: 'CLI',
    provenance: PROVENANCE,
    async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
      calls += 1;
      const entry = script[Math.min(calls - 1, script.length - 1)] ?? (() => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]));
      return entry(request);
    },
  };
}

const CALL_DIGEST = `arg:sha256:${'b'.repeat(24)}`;

test.describe('contained test replay engine', () => {
  test('pre/post trees match parent+test and fix; pre-fail plus post-pass reproduces', async () => {
    const { repo, sha } = engineFixture();
    try {
      const seen: Record<string, { a: string; test: string }> = {};
      const runner: PackageRunner = async ({ treeDir }) => {
        const a = fs.readFileSync(path.join(treeDir, 'a.txt'), 'utf8');
        const added = fs.readFileSync(path.join(treeDir, 'added_test.go'), 'utf8');
        const side = a === 'v1\n' ? 'pre' : 'post';
        seen[side] = { a, test: added };
        return side === 'pre' ? failRun() : passRun();
      };
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: runner,
      });
      expect(result.verdict).toBe('REPRODUCED');
      expect(result.reason).toBe('PRE_FAIL_POST_PASS');
      expect(seen.pre?.a).toBe('v1\n');
      expect(seen.pre?.test).toBe('package p\n');
      expect(seen.post?.a).toBe('v2\n');
      expect(seen.post?.test).toBe('package p\n');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('pre pass yields NOT_REPRODUCED', async () => {
    const { repo, sha } = engineFixture();
    try {
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => passRun(),
      });
      expect(result.verdict).toBe('NOT_REPRODUCED');
      expect(result.reason).toBe('PRE_PASS');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('both fail yields INCONCLUSIVE', async () => {
    const { repo, sha } = engineFixture();
    try {
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => failRun(),
      });
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.reason).toBe('BOTH_FAIL');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('post blocked after a real pre failure stays INCONCLUSIVE', async () => {
    const { repo, sha } = engineFixture();
    try {
      const runner: PackageRunner = async ({ treeDir }) => {
        const a = fs.readFileSync(path.join(treeDir, 'a.txt'), 'utf8');
        if (a === 'v1\n') return failRun();
        return {
          exitCode: 1,
          timedOut: false,
          spawnFailed: null,
          stdout: '',
          stderr: 'go: missing vendor/modules.txt (vendoring inconsistent)\nFAIL\tpkg [build failed]\n',
        };
      };
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: runner,
      });
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.reason).toBe('POST_BUILD_OR_VENDOR_ERROR');
      expect(result.postFix.signal).toBe('BLOCKED');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('pre spawn failure yields ENVIRONMENT_BLOCKED', async () => {
    const { repo, sha } = engineFixture();
    try {
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => ({ exitCode: null, timedOut: false, spawnFailed: 'spawn go ENOENT', stdout: '', stderr: '' }),
      });
      expect(result.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(result.reason).toBe('PRE_SPAWN_FAILED');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('invalid fix SHA is ENVIRONMENT_BLOCKED and leaves no temp trees', async () => {
    const { repo } = engineFixture();
    try {
      const before = replayDirs();
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: 'not-a-sha',
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => passRun(),
      });
      expect(result.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(result.reason).toBe('INVALID_INPUT');
      expect(replayDirs()).toEqual(before);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('timeout terminates the runaway package and yields INCONCLUSIVE', async () => {
    const { repo, sha } = engineFixture();
    const bindir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-fakego-'));
    try {
      const fakeGo = path.join(bindir, 'go-fake');
      fs.writeFileSync(fakeGo, '#!/bin/sh\nsleep 30\n');
      fs.chmodSync(fakeGo, 0o755);
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        timeoutMs: 2000,
        goBinary: fakeGo,
      });
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.reason).toBe('TIMEOUT_PRE');
      expect(result.preFix.timedOut).toBe(true);
      // Two 2s ceilings plus materialization: a failed kill would take 60s+.
      expect(result.durationMs).toBeLessThan(60_000);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(bindir, { recursive: true, force: true });
    }
  });

  test('temp trees are removed even when the runner throws', async () => {
    const { repo, sha } = engineFixture();
    try {
      const before = replayDirs();
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => {
          throw new Error('boom');
        },
      });
      expect(result.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(result.reason).toBe('RUNNER_FAILED');
      expect(replayDirs()).toEqual(before);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('sibling fixture repo is byte-identical after replay', async () => {
    const { repo, sha } = engineFixture();
    try {
      const headBefore = git(repo, ['rev-parse', 'HEAD']);
      const porcelainBefore = git(repo, ['status', '--porcelain']);
      const indexBefore = git(repo, ['ls-files', '-s']);
      const worktreesBefore = git(repo, ['worktree', 'list']);
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async () => passRun(),
      });
      expect(result.verdict).toBe('NOT_REPRODUCED');
      expect(git(repo, ['rev-parse', 'HEAD'])).toBe(headBefore);
      expect(git(repo, ['status', '--porcelain'])).toBe(porcelainBefore);
      expect(git(repo, ['ls-files', '-s'])).toBe(indexBefore);
      expect(git(repo, ['worktree', 'list'])).toBe(worktreesBefore);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('materialization includes export-ignored files that git archive drops', async () => {
    const repo = initRepo();
    try {
      commitAll(repo, { 'app.txt': 'v1\n', '.gitattributes': 'app.txt export-ignore\n' }, 'seed app');
      commitAll(repo, { 'app.txt': 'v2\n', 'added_test.go': 'package p\n' }, 'fix app and add test');
      const sha = git(repo, ['rev-parse', 'HEAD']);
      // Prove the fixture exercises the hole: the export-ignored file is
      // absent from `git archive` output (best-effort; tar may be missing).
      try {
        const archived = spawnSync('git', ['-C', repo, 'archive', sha], {
          encoding: 'buffer',
          maxBuffer: 4 * 1024 * 1024,
          shell: false,
        });
        const listed = spawnSync('tar', ['-t'], {
          input: archived.stdout,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
          shell: false,
        });
        if (listed.status === 0) expect(String(listed.stdout)).not.toContain('app.txt');
      } catch {
        // tar unavailable: the engine assertions below still prove the point.
      }
      const seen: Record<string, string> = {};
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        runPackage: async ({ treeDir }) => {
          const app = fs.readFileSync(path.join(treeDir, 'app.txt'), 'utf8');
          seen[app] = treeDir;
          return app === 'v1\n' ? failRun() : passRun();
        },
      });
      expect(seen['v1\n']).toMatch(/nightwatch-replay-pre-/);
      expect(seen['v2\n']).toMatch(/nightwatch-replay-post-/);
      expect(result.verdict).toBe('REPRODUCED');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });
});

test.describe('package run classification', () => {
  test('pass, fail, build-blocked, vacuous-pass, timeout, and spawn failure', () => {
    expect(classifyPackageRun(passRun()).signal).toBe('PASS');
    expect(classifyPackageRun(failRun()).signal).toBe('FAIL');
    expect(
      classifyPackageRun({
        exitCode: 1,
        timedOut: false,
        spawnFailed: null,
        stdout: '',
        stderr: '# pkg\n./a.go:3: undefined: X\nFAIL\tpkg [build failed]\n',
      }).reason,
    ).toBe('BUILD_OR_VENDOR_ERROR');
    // A zero exit that ran no tests proves nothing: BLOCKED, never a pass.
    expect(
      classifyPackageRun({
        exitCode: 0,
        timedOut: false,
        spawnFailed: null,
        stdout: '?\t \tpkg [no test files]\n',
        stderr: '',
      }).signal,
    ).toBe('BLOCKED');
    expect(
      classifyPackageRun({ exitCode: null, timedOut: true, spawnFailed: null, stdout: '', stderr: '' }).signal,
    ).toBe('TIMED_OUT');
    expect(
      classifyPackageRun({ exitCode: null, timedOut: false, spawnFailed: 'spawn go ENOENT', stdout: '', stderr: '' })
        .reason,
    ).toBe('SPAWN_FAILED');
    // Vendor/network failure without a test-failure marker is environmental.
    expect(
      classifyPackageRun({
        exitCode: 1,
        timedOut: false,
        spawnFailed: null,
        stdout: '',
        stderr: 'go: GOPROXY=off but vendor is inconsistent\n',
      }).signal,
    ).toBe('BLOCKED');
  });
});

test.describe('go toolchain selection', () => {
  test('go.mod requirement parsing and version comparison', () => {
    expect(parseGoModRequiredVersion('module m\n\ngo 1.25.8\n')).toBe('1.25.8');
    expect(parseGoModRequiredVersion('module m\n\ngo 1.21\n')).toBe('1.21');
    expect(parseGoModRequiredVersion('module m\n\ngo 1.25.8\ntoolchain go1.26.0\n')).toBe('1.26.0');
    expect(parseGoModRequiredVersion('module m\n')).toBeNull();
    expect(parseGoModRequiredVersion('')).toBeNull();
    expect(compareGoVersions('1.25.8', '1.25.8')).toBe(0);
    expect(compareGoVersions('1.26', '1.25.8')).toBe(1);
    expect(compareGoVersions('1.25.3', '1.25.8')).toBe(-1);
    expect(compareGoVersions('2.0', '1.99.99')).toBe(1);
  });

  function platformSuffix(): string {
    // Mirrors the engine's platform mapping; a mapping change breaks this
    // test loudly, which is the point (selection must match the platform).
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
    const arch = process.arch === 'x64' ? 'amd64' : process.arch === 'arm64' ? 'arm64' : process.arch;
    return `.${os}-${arch}`;
  }

  function fakeCache(versions: string[]): string {
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-modcache-'));
    for (const version of versions) {
      const bin = path.join(cache, 'golang.org', `toolchain@v0.0.1-go${version}${platformSuffix()}`, 'bin');
      fs.mkdirSync(bin, { recursive: true });
      const go = path.join(bin, 'go');
      fs.writeFileSync(go, `#!/bin/sh\necho "go version go${version} test/test"\n`);
      fs.chmodSync(go, 0o755);
    }
    return cache;
  }

  test('cached toolchain lookup prefers the lowest satisfying version', () => {
    const cache = fakeCache(['1.24.0', '1.25.8', '1.26.0']);
    try {
      const picked = findCachedToolchain(cache, '1.25.8');
      expect(picked).not.toBeNull();
      expect(picked ?? '').toContain('toolchain@v0.0.1-go1.25.8');
      expect(findCachedToolchain(cache, '1.26')).toContain('toolchain@v0.0.1-go1.26.0');
      expect(findCachedToolchain(cache, '9.99')).toBeNull();
      expect(findCachedToolchain(path.join(cache, 'absent'), '1.25.8')).toBeNull();
    } finally {
      fs.rmSync(cache, { recursive: true, force: true });
    }
  });

  test('engine selects a cached toolchain above the system one', async () => {
    const repo = initRepo();
    const cache = fakeCache(['99.1.0']);
    try {
      // Rewrite the fake toolchain as a pwd-aware go test double.
      const fakeGo = path.join(
        cache,
        'golang.org',
        `toolchain@v0.0.1-go99.1.0${platformSuffix()}`,
        'bin',
        'go',
      );
      fs.writeFileSync(
        fakeGo,
        '#!/bin/sh\nif [ "$1" = "version" ]; then echo "go version go99.1.0 test/test"; exit 0; fi\n' +
          'case "$(pwd)" in *nightwatch-replay-pre-*) echo "--- FAIL: TestX (0.00s)"; echo "FAIL"; exit 1;; *) echo "ok pkg"; exit 0;; esac\n',
      );
      fs.chmodSync(fakeGo, 0o755);
      commitAll(repo, { 'go.mod': 'module fixture\n\ngo 99.1\n', 'a.txt': 'v1\n' }, 'seed module');
      commitAll(repo, { 'a.txt': 'v2\n', 'added_test.go': 'package p\n' }, 'fix and add test');
      const sha = git(repo, ['rev-parse', 'HEAD']);
      let usedGo = '';
      const result = await runContainedTestReplay({
        repoPath: repo,
        fixCommit: sha,
        testPath: 'added_test.go',
        packageDir: '.',
        moduleCacheDir: cache,
        runPackage: async (input) => {
          usedGo = input.goBinary;
          const ran = spawnSync(input.goBinary, ['test', '-count=1', '.'], {
            cwd: input.treeDir,
            env: input.env,
            encoding: 'utf8',
            shell: false,
          });
          return {
            exitCode: ran.status,
            timedOut: false,
            spawnFailed: null,
            stdout: String(ran.stdout ?? ''),
            stderr: String(ran.stderr ?? ''),
          };
        },
      });
      // The fabricated cache (not the system go) satisfied go 99.1.
      expect(usedGo).toBe(fakeGo);
      expect(result.verdict).toBe('REPRODUCED');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(cache, { recursive: true, force: true });
    }
  });
});

test.describe('descriptor parsing and secret scrubbing', () => {
  test('valid descriptor parses; malformed descriptors are rejected', () => {
    const valid = {
      schemaVersion: MINED_TEST_REPLAY_VERSION,
      repository: 'mobingilabs/ouchan',
      fixCommit: '5985281b43cd',
      testPath: 'services/billingd/services/billingsvc/childbillinggroup_test.go',
      packageDir: 'services/billingd/services/billingsvc',
    };
    const parsed = parseMinedTestReplayDescriptor(valid);
    expect(parsed).not.toBeNull();
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(packageDirForTestPath('total.test.ts')).toBe('.');
    for (const bad of [
      null,
      {},
      { ...valid, schemaVersion: 'nightwatch.other.v1' },
      { ...valid, repository: 'not-a-repo-id' },
      { ...valid, fixCommit: 'xyz' },
      { ...valid, testPath: '/absolute/path_test.go', packageDir: '/absolute' },
      { ...valid, testPath: '../escape_test.go', packageDir: '..' },
      { ...valid, packageDir: 'some/other/dir' },
    ]) {
      expect(parseMinedTestReplayDescriptor(bad)).toBeNull();
    }
  });

  test('stderr scrubbing redacts secrets, strips color, and truncates', () => {
    const scrubbed = scrubReplaySecrets('token=abc123\nbearer=xyz\n\u001b[31mred\u001b[0m\n' + 'x'.repeat(5000));
    expect(scrubbed).not.toContain('abc123');
    expect(scrubbed).not.toContain('=xyz');
    expect(scrubbed).toContain('token=[REDACTED]');
    expect(scrubbed).toContain('bearer=[REDACTED]');
    expect(scrubbed).not.toContain('[31m');
    expect(scrubbed.length).toBeLessThanOrEqual(2000);
  });
});

test.describe('mined replay executor wiring', () => {
  function descriptor() {
    const parsed = parseMinedTestReplayDescriptor({
      schemaVersion: MINED_TEST_REPLAY_VERSION,
      repository: 'example/ledger',
      fixCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      testPath: 'total.test.ts',
      packageDir: '.',
    });
    if (!parsed) throw new Error('fixture descriptor must parse');
    return parsed;
  }

  function repoRoot(): { root: string; repo: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-replay-root-'));
    const repo = path.join(root, 'example', 'ledger');
    fs.mkdirSync(repo, { recursive: true });
    return { root, repo };
  }

  test('grounded replay returns the neutral verdict bytes', async () => {
    const { root, repo } = repoRoot();
    try {
      const audit: { current: null } = { current: null };
      let calls = 0;
      const executor = createPreFixViewExecutor(
        { blobs: ['look', '--- total.ts\nx\n', 'observe'] },
        'exec-grounded-001',
        null,
        {
          minedReplay: descriptor(),
          repositoriesRoot: root,
          hasGrounding: () => true,
          runReplay: async (request) => {
            calls += 1;
            expect(request.repoPath).toBe(repo);
            expect(request.testPath).toBe('total.test.ts');
            return replayResult({ verdict: 'REPRODUCED', reason: 'PRE_FAIL_POST_PASS', stderrHead: '--- FAIL: TestTotal' });
          },
          audit: audit as { current: null },
        },
      );
      const result = await executor.execute({
        campaignId: 'c',
        turnId: 't1',
        toolId: 'RERUN_SAFE_REPRODUCTION',
        arguments: {},
        argumentDigest: CALL_DIGEST,
      });
      expect(calls).toBe(1);
      expect(result.resultClass).toBe('REPRODUCED');
      expect(result.evidenceRefs).toEqual(['bench:exec-grounded-001:repro:1']);
      expect(result.untrusted).toHaveLength(1);
      expect(result.untrusted[0]?.bytes).toBe(stringifyMinedReplayVerdict('REPRODUCED'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ungrounded replay is refused without executing', async () => {
    const { root } = repoRoot();
    try {
      const audit: { current: null } = { current: null };
      let calls = 0;
      const executor = createPreFixViewExecutor(
        { blobs: ['look', '--- total.ts\nx\n', 'observe'] },
        'exec-ungrounded-001',
        null,
        {
          minedReplay: descriptor(),
          repositoriesRoot: root,
          hasGrounding: () => false,
          runReplay: async () => {
            calls += 1;
            return replayResult({ verdict: 'REPRODUCED' });
          },
          audit: audit as { current: null },
        },
      );
      const result = await executor.execute({
        campaignId: 'c',
        turnId: 't1',
        toolId: 'RERUN_SAFE_REPRODUCTION',
        arguments: {},
        argumentDigest: CALL_DIGEST,
      });
      expect(calls).toBe(0);
      expect(result.resultClass).toBe('NOT_AVAILABLE');
      expect(result.evidenceRefs).toEqual([]);
      expect(result.untrusted).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('blocked and inconclusive replays map to the frozen vocabulary', async () => {
    const { root } = repoRoot();
    try {
      for (const [verdict, mapped] of [
        ['ENVIRONMENT_BLOCKED', 'ENVIRONMENT_BLOCKED'],
        ['INCONCLUSIVE', 'NOT_REPRODUCED'],
        ['NOT_REPRODUCED', 'NOT_REPRODUCED'],
      ] as const) {
        const executor = createPreFixViewExecutor(
          { blobs: ['look', '--- total.ts\nx\n', 'observe'] },
          'exec-mapping-001',
          null,
          {
            minedReplay: descriptor(),
            repositoriesRoot: root,
            hasGrounding: () => true,
            runReplay: async () => replayResult({ verdict }),
          },
        );
        const result = await executor.execute({
          campaignId: 'c',
          turnId: 't1',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          arguments: {},
          argumentDigest: CALL_DIGEST,
        });
        expect(result.resultClass).toBe(mapped);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('mined replay hunt isolation', () => {
  function defineMinedCase(root: string) {
    const { repo, sha } = minedFixture(root);
    const defined = tryDefineMinedBenchmarkCase(
      record({
        bugId: 'FIXTURE-REPLAY-001',
        repository: 'example/ledger',
        symptom: 'cart total anomaly fixture alpha',
        provenance: {
          category: 'OBSERVATION',
          repository: 'example/ledger',
          sourceSha: sha,
          locator: null,
          confidence: 'LOW',
        },
      }),
      repo,
    );
    if (!defined) throw new Error('mined fixture case must define');
    return { defined, repo, sha };
  }

  test('grounded RERUN reproduces without leaking the hidden test path', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-minedroot-'));
    try {
      const { defined, sha } = defineMinedCase(root);
      expect(defined.minedReplay?.testPath).toBe('total.test.ts');
      const caseId = defined.caseId;
      const driver = scriptDriver([
        () =>
          okTurn([
            { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: 'total.ts' } },
          ]),
        () =>
          okTurn([
            {
              kind: 'FORM_HYPOTHESIS',
              hypothesisId: 'h1',
              statement: 'rounding looks wrong in total.ts',
              evidenceRefs: [`bench:${caseId}:file:total.ts`],
            },
          ]),
        () => okTurn([{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', argumentDigest: CALL_DIGEST, arguments: {} }]),
        () =>
          okTurn([
            { kind: 'PROPOSE_CANDIDATE', candidateId: 'c-mined-replay', evidenceRefs: [`bench:${caseId}:repro:1`] },
            { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
          ]),
      ]);
      const result = await runBenchmarkHunt(
        defined,
        {
          reasoner: driver,
          budgetPolicy: defaultBenchmarkBudgetPolicy(),
          maxTurns: 5,
          minedReplay: {
            repositoriesRoot: root,
            runReplay: async (request) => {
              expect(request.testPath).toBe('total.test.ts');
              expect(request.fixCommit).toBe(sha);
              return replayResult({
                verdict: 'REPRODUCED',
                reason: 'PRE_FAIL_POST_PASS',
                stderrHead: `--- FAIL: TestTotal (0.00s)\n    total.test.ts:9: ${STDERR_CANARY}\nFAIL`,
                durationMs: 11,
              });
            },
          },
        },
      );
      expect(result.leaked).toEqual([]);
      expect(result.reproductionCount).toBe(1);
      expect(result.admitted).toBe(true);
      const traffic = result.requestBlobs.join('\n');
      // The hidden test path, fix SHA, and both canaries (file content and
      // harness-side stderr) must never reach the reasoner through replay.
      expect(traffic).not.toContain('total.test.ts');
      expect(traffic).not.toContain(sha);
      expect(traffic).not.toContain(FILE_CANARY);
      expect(traffic).not.toContain(STDERR_CANARY);
      // The only replay bytes the reasoner ever sees are the neutral fixed
      // template (parsed out of the JSON-escaped request envelopes).
      const replayBytes = result.requestBlobs.flatMap((blob) => {
        const parsed: unknown = JSON.parse(blob);
        if (typeof parsed !== 'object' || parsed === null || !('observation' in parsed)) return [];
        const observation: unknown = parsed.observation;
        if (typeof observation !== 'object' || observation === null || !('untrusted' in observation)) return [];
        const untrusted: unknown = observation.untrusted;
        if (!Array.isArray(untrusted)) return [];
        const bytes: string[] = [];
        for (const envelope of untrusted) {
          if (typeof envelope === 'object' && envelope !== null && 'bytes' in envelope && typeof envelope.bytes === 'string') {
            bytes.push(envelope.bytes);
          }
        }
        return bytes;
      });
      expect(replayBytes).toContain(stringifyMinedReplayVerdict('REPRODUCED'));
      // Harness-side audit retains the evidence the reasoner never sees.
      expect(result.minedReplayAudit?.verdict).toBe('REPRODUCED');
      expect(result.minedReplayAudit?.stderrHead).toContain(STDERR_CANARY);
      // Neutral dossier: no hidden strings in title or actual.
      expect(result.dossier).not.toBeNull();
      expect(result.dossier?.actual).toBe(stringifyMinedReplayVerdict('REPRODUCED'));
      for (const secret of [defined.hidden.fixCommit, defined.hidden.knownFailingTest, FILE_CANARY, STDERR_CANARY]) {
        if (typeof secret === 'string' && secret.length > 0) {
          expect(result.dossier?.title ?? '').not.toContain(secret);
          expect(result.dossier?.actual ?? '').not.toContain(secret);
        }
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('RERUN before any file grounding is NOT_AVAILABLE and mints no credit', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-minedroot-'));
    try {
      const { defined } = defineMinedCase(root);
      let calls = 0;
      const driver = scriptDriver([
        () => okTurn([{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', argumentDigest: CALL_DIGEST, arguments: {} }]),
        () => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]),
      ]);
      const result = await runBenchmarkHunt(
        defined,
        {
          reasoner: driver,
          budgetPolicy: defaultBenchmarkBudgetPolicy(),
          maxTurns: 4,
          minedReplay: {
            repositoriesRoot: root,
            runReplay: async () => {
              calls += 1;
              return replayResult({ verdict: 'REPRODUCED' });
            },
          },
        },
      );
      expect(calls).toBe(0);
      expect(result.leaked).toEqual([]);
      expect(result.reproductionCount).toBe(0);
      expect(result.minedReplayAudit?.reason).toBe('GATE_REFUSED_NO_FILE_GROUNDING');
      expect(result.dossier).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
