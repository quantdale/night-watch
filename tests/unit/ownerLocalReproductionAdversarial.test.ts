// W9 provider lane — adversarial owner-local reproduction tests.
//
// A hostile reasoner controls ONLY request.sourcePath (plus inert extra
// fields). These tests prove that control buys no command, path, environment,
// toolchain, or network authority: injection strings are refused, symlinks
// are never followed, argv/env are host-fixed, and every failure class is
// detected by output markers — never by exit code alone.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  OWNER_LOCAL_FIXED_GO_BINARIES,
  OWNER_LOCAL_REPRODUCTION_PROVIDER_ID,
  classifyGoTestOutput,
  createOwnerLocalReproductionProvider,
  discoverOwnerLocalTarget,
  executeOwnerLocalTarget,
  failureFingerprintForOutput,
  ownerLocalBwrapArgv,
  resolveOwnerLocalGoBinary,
  resolveOwnerLocalSandbox,
  runBoundedOwnerLocalGoTest,
  type OwnerLocalClosureListInput,
  type OwnerLocalGitRunner,
  type OwnerLocalGoRunInput,
  type OwnerLocalGoRunResult,
} from '../../src/core/ownerLocalReproduction/provider';

const HEAD_SHA = '0123456789abcdef0123456789abcdef01234567';
const REPO = 'mobingilabs/ouchan';
const SOURCE_REL = 'pkg/gcsv/info.go';
const SOURCE_PATH = `${REPO}:${SOURCE_REL}`;

const FOO_GO = 'package gcsv\n\nfunc Info() string { return "info" }\n';
const FOO_TEST_GO =
  'package gcsv\n\nimport "testing"\n\nfunc TestInfo(t *testing.T) { if Info() != "info" { t.Fatal("bad") } }\n';
const GO_MOD = 'module github.com/mobingilabs/ouchan\n\ngo 1.23.0\n';
const MODULES_TXT = '# github.com/mobingilabs/ouchan v1.0.0\n## explicit; go 1.23.0\n';

const PASS_RUN: OwnerLocalGoRunResult = {
  exitCode: 0,
  stdout: 'ok  \tgithub.com/mobingilabs/ouchan/pkg/gcsv\t0.012s\n',
  stderr: '',
  timedOut: false,
  truncated: false,
  spawnFailed: null,
};

function writeRepo(siblingRoot: string, files: Readonly<Record<string, string>>): string {
  const repo = path.join(siblingRoot, ...REPO.split('/'));
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${HEAD_SHA}\n`);
  for (const [relative, content] of Object.entries(files)) {
    const dest = path.join(repo, ...relative.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
  return repo;
}

function fullTree(): Readonly<Record<string, string>> {
  return {
    'go.mod': GO_MOD,
    'vendor/modules.txt': MODULES_TXT,
    [SOURCE_REL]: FOO_GO,
    'pkg/gcsv/info_test.go': FOO_TEST_GO,
  };
}

function stableGit(repoRoot: string): OwnerLocalGitRunner {
  return async (args: readonly string[]) => {
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return { stdout: `${HEAD_SHA}\n`, stderr: '' };
    if (args[0] === 'rev-parse') return { stdout: `${repoRoot}\n`, stderr: '' };
    return { stdout: '', stderr: '' };
  };
}

test.describe('W9 owner-local adversarial handling (fabricated)', () => {
  test('model-supplied command, env, and toolchain fields buy no authority', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async (input: OwnerLocalGoRunInput) => {
            seen.push(input);
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const hostile = {
        reproductionId: 'rep-1',
        candidateId: 'cand-1',
        sourcePath: SOURCE_PATH,
        sourceEvidenceRef: 'srcobs:x',
        observedEvidenceRefs: [],
        command: 'rm -rf /',
        argv: ['evil'],
        executable: '/tmp/evil-go',
        goBinary: '/tmp/evil-go',
        env: { GOPROXY: 'https://evil.example', PATH: '/tmp/evil' },
        toolchain: 'https://evil.example/go.tar.gz',
        gitArgs: ['reset', '--hard'],
      };
      const result = await provider.run(hostile);
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('NOT_REPRODUCED');
      expect(seen.length).toBe(2);
      for (const input of seen) {
        // Host-fixed argv only; nothing from the request leaks in.
        expect(input.binary).toBe('/fake/go');
        expect(input.args).toEqual(['test', '-mod=vendor', '-count=1', './pkg/gcsv']);
        expect(JSON.stringify(input.args)).not.toContain('evil');
        expect(JSON.stringify(input.args)).not.toContain('rm');
        const env = input.env as Record<string, string | undefined>;
        expect(env['GOPROXY']).toBe('off');
        expect(env['GOTOOLCHAIN']).toBe('local');
        expect(env['GOSUMDB']).toBe('off');
        expect(env['GOPROXY']).not.toContain('evil');
        // Fixed host-owned names carry fixed offline values; anything else
        // resembling a proxy variable must never enter from ambient or request.
        for (const key of Object.keys(env)) {
          if (['GOPROXY', 'GOSUMDB', 'GONOSUMDB', 'GONOSUMCHECK'].includes(key)) continue;
          expect(key.toLowerCase()).not.toContain('proxy');
        }
      }
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('traversal and shell metacharacters are refused without execution', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, fullTree());
      let executions = 0;
      // No sourceProvider here so discovery refusals surface at the gate.
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async () => {
            executions += 1;
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
        },
      });
      const hostilePaths = [
        `${REPO}:pkg/gcsv/info.go; rm -rf /`,
        `${REPO}:pkg/gcsv/$(evil).go`,
        `${REPO}:pkg/gcsv/\`evil\`.go`,
        `${REPO}:pkg/gcsv/|evil.go`,
        `${REPO}:pkg/gcsv/&&evil.go`,
        `${REPO}:pkg/../../../etc/passwd`,
        `${REPO}:../ouchan/pkg/gcsv/info.go`,
        `${REPO}:/pkg/gcsv/info.go`,
        `${REPO}:pkg\\gcsv\\info.go`,
        `${REPO}:pkg/gcsv/info.go\0.png`,
        `${REPO}:pkg/gcsv/info.go\n-evil`,
        `C:\\evil:pkg/x.go`,
        `${REPO}:pkg/gcsv/info.go:extra`,
      ];
      for (const sourcePath of hostilePaths) {
        const result = await provider.run({
          reproductionId: 'rep-1',
          candidateId: null,
          sourcePath,
          sourceEvidenceRef: 'srcobs:x',
          observedEvidenceRefs: [],
        });
        expect(result.status).toBe('BLOCKED');
        if (result.status === 'BLOCKED') expect(result.class).toBe('UNSAFE_INPUT');
      }
      expect(executions).toBe(0);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('symlinked package members never qualify', async () => {
    // Symlinked package directory: the boundary refuses the read outright.
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const real = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-real-'));
      try {
        fs.writeFileSync(path.join(real, 'info.go'), FOO_GO);
        fs.writeFileSync(path.join(real, 'info_test.go'), FOO_TEST_GO);
        const repo = path.join(siblingRoot, ...REPO.split('/'));
        fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
        fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
        fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${HEAD_SHA}\n`);
        fs.writeFileSync(path.join(repo, 'go.mod'), GO_MOD);
        fs.mkdirSync(path.join(repo, 'vendor'), { recursive: true });
        fs.writeFileSync(path.join(repo, 'vendor', 'modules.txt'), MODULES_TXT);
        fs.mkdirSync(path.join(repo, 'pkg'), { recursive: true });
        fs.symlinkSync(real, path.join(repo, 'pkg', 'gcsv'));
        let executions = 0;
        const provider = createOwnerLocalReproductionProvider({
          siblingRoot,
          tempRoot,
          ports: {
            runGit: stableGit(repo),
            runGoTest: async () => {
              executions += 1;
              return PASS_RUN;
            },
            resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          },
        });
        const result = await provider.run({
          reproductionId: 'rep-1',
          candidateId: null,
          sourcePath: SOURCE_PATH,
          sourceEvidenceRef: 'srcobs:x',
          observedEvidenceRefs: [],
        });
        expect(result.status).toBe('AVAILABLE');
        if (result.status !== 'AVAILABLE') return;
        expect(result.value.verdict).toBe('NOT_AVAILABLE');
        expect(executions).toBe(0);
      } finally {
        fs.rmSync(real, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('a symlinked member aborts materialization without executing', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, fullTree());
      fs.symlinkSync('/etc/hostname', path.join(repoRoot, 'pkg', 'gcsv', 'evil.go'));
      let executions = 0;
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async () => {
            executions += 1;
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run({
        reproductionId: 'rep-1',
        candidateId: null,
        sourcePath: SOURCE_PATH,
        sourceEvidenceRef: 'srcobs:x',
        observedEvidenceRefs: [],
      });
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(executions).toBe(0);
      expect(fs.readdirSync(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('a symlinked toolchain binary is refused without execution', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tool-'));
    try {
      const link = path.join(dir, 'go');
      fs.symlinkSync('/usr/local/go/bin/go', link);
      const resolution = resolveOwnerLocalGoBinary({
        requiredVersion: null,
        explicitBinary: link,
      });
      expect(resolution.status).toBe('BLOCKED');
      const missing = resolveOwnerLocalGoBinary({
        requiredVersion: null,
        explicitBinary: path.join(dir, 'no-such-go'),
      });
      expect(missing.status).toBe('BLOCKED');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('every required outcome is detected by markers, not exit code alone', () => {
    const run = (
      overrides: Partial<OwnerLocalGoRunResult>,
    ): OwnerLocalGoRunResult => ({ ...PASS_RUN, ...overrides });
    // Environment and timeout classes.
    expect(classifyGoTestOutput(run({ spawnFailed: 'ENOENT' }))).toBe('ENVIRONMENT_BLOCKED');
    expect(classifyGoTestOutput(run({ timedOut: true, exitCode: null }))).toBe('TIMEOUT');
    // Empty packages are honest, never passes.
    expect(
      classifyGoTestOutput(run({ exitCode: 0, stdout: '?   \tpkg [no test files]\n' })),
    ).toBe('NO_TESTS');
    expect(classifyGoTestOutput(run({ exitCode: 0 }))).toBe('TEST_PASS');
    // Test failures require assertion/panic evidence.
    expect(
      classifyGoTestOutput(
        run({ exitCode: 1, stdout: '--- FAIL: TestInfo (0.00s)\n    x_test.go:1: bad\n' }),
      ),
    ).toBe('TEST_FAILURE');
    expect(classifyGoTestOutput(run({ exitCode: 1, stdout: 'panic: boom\n' }))).toBe(
      'TEST_FAILURE',
    );
    expect(
      classifyGoTestOutput(run({ exitCode: 1, stdout: 'fatal error: concurrent map writes\n' })),
    ).toBe('TEST_FAILURE');
    // Build breakage is never promoted to a test failure.
    expect(
      classifyGoTestOutput(
        run({ exitCode: 1, stdout: '# pkg\npkg/x.go:1:1: undefined: Y\nFAIL\n' }),
      ),
    ).toBe('BUILD_FAILURE');
    expect(
      classifyGoTestOutput(run({ exitCode: 1, stdout: 'FAIL\tpkg [build failed]\n' })),
    ).toBe('BUILD_FAILURE');
    // A bare FAIL with no markers proves nothing: process failure.
    expect(classifyGoTestOutput(run({ exitCode: 1, stdout: 'FAIL\n' }))).toBe('PROCESS_FAILURE');
    expect(classifyGoTestOutput(run({ exitCode: 1, stdout: '', stderr: '' }))).toBe(
      'PROCESS_FAILURE',
    );
    expect(classifyGoTestOutput(run({ exitCode: null, stdout: '', stderr: '' }))).toBe(
      'PROCESS_FAILURE',
    );
  });

  test('fingerprints are stable over ordering and redact addresses', () => {
    const first = failureFingerprintForOutput(
      '--- FAIL: TestB (0.00s)\n--- FAIL: TestA (0.00s)\n',
      '',
    );
    const reordered = failureFingerprintForOutput(
      '--- FAIL: TestA (0.00s)\n--- FAIL: TestB (0.00s)\n',
      '',
    );
    expect(first).not.toBeNull();
    expect(reordered).toBe(first);
    const different = failureFingerprintForOutput('--- FAIL: TestC (0.00s)\n', '');
    expect(different).not.toBeNull();
    expect(different).not.toBe(first);
    expect(failureFingerprintForOutput('ok  \tpkg\t0.01s\n', '')).toBeNull();
    const panicA = failureFingerprintForOutput('panic: boom [0x1234abcd, 0xdead]\n', '');
    const panicB = failureFingerprintForOutput('panic: boom [0x9999ffff, 0x1111]\n', '');
    expect(panicA).not.toBeNull();
    expect(panicB).toBe(panicA);
    expect(OWNER_LOCAL_REPRODUCTION_PROVIDER_ID).toContain('owner-local');
  });

  test('materialization caps fail closed and still clean up', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, fullTree());
      let executions = 0;
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        limits: { materializedFiles: 1 },
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async () => {
            executions += 1;
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run({
        reproductionId: 'rep-1',
        candidateId: null,
        sourcePath: SOURCE_PATH,
        sourceEvidenceRef: 'srcobs:x',
        observedEvidenceRefs: [],
      });
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(executions).toBe(0);
      expect(fs.readdirSync(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
  test('output cap is byte-exact over multibyte UTF-8', async () => {
    const oversize = await runBoundedOwnerLocalGoTest({
      binary: process.execPath,
      args: ['-e', 'process.stdout.write("é".repeat(100))'],
      cwd: os.tmpdir(),
      env: { PATH: '/usr/bin:/bin' },
      timeoutMs: 30_000,
      outputCapBytes: 10,
    });
    // 100 two-byte characters capped at 10 BYTES (a char count would allow 20).
    expect(
      Buffer.byteLength(oversize.stdout, 'utf8') + Buffer.byteLength(oversize.stderr, 'utf8'),
    ).toBeLessThanOrEqual(10);
    expect(oversize.truncated).toBe(true);
    const exact = await runBoundedOwnerLocalGoTest({
      binary: process.execPath,
      args: ['-e', 'process.stdout.write("hi")'],
      cwd: os.tmpdir(),
      env: { PATH: '/usr/bin:/bin' },
      timeoutMs: 30_000,
      outputCapBytes: 1024,
    });
    expect(exact.stdout).toBe('hi');
    expect(exact.truncated).toBe(false);
    expect(exact.exitCode).toBe(0);
  });

  test('missing sandbox blocks execution without spawning the toolchain', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      writeRepo(siblingRoot, fullTree());
      let goCalls = 0;
      let listed = 0;
      const discovery = discoverOwnerLocalTarget({ sourcePath: SOURCE_PATH, siblingRoot });
      expect(discovery.status).toBe('SUPPORTED');
      if (discovery.status !== 'SUPPORTED') return;
      const execution = await executeOwnerLocalTarget({
        target: discovery.target,
        siblingRoot,
        attempt: 1,
        goBinary: '/fake/go',
        limits: {
          materializeMs: 60_000,
          executionMs: 60_000,
          capturedOutputBytes: 65_536,
          materializedFiles: 20_000,
          materializedBytes: 1_048_576,
          executions: 2,
        },
        tempRoot,
        ports: {
          resolveSandbox: () => ({ status: 'BLOCKED' }),
          runGoTest: async () => {
            goCalls += 1;
            return PASS_RUN;
          },
          listClosurePackages: async () => {
            listed += 1;
            return [];
          },
        },
      });
      expect(execution.record.outcome).toBe('ENVIRONMENT_BLOCKED');
      expect(goCalls).toBe(0);
      expect(listed).toBe(0);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('sandbox argv unshares the network and preserves the fixed go command', () => {
    const argv = ownerLocalBwrapArgv({
      bwrapBinary: '/usr/bin/bwrap',
      execRoot: '/tmp/nw-exec-1',
      goBinary: '/usr/local/go/bin/go',
      goArgs: ['test', '-mod=vendor', '-count=1', './pkg/gcsv'],
      env: {
        GOPROXY: 'off',
        GOTOOLCHAIN: 'local',
        GOSUMDB: 'off',
        HOME: '/tmp/nw-exec-1/.h',
        HTTP_PROXY: 'http://evil.example',
      },
    });
    expect(argv).toContain('--unshare-net');
    expect(argv).toContain('--clearenv');
    const separator = argv.indexOf('--');
    expect(separator).toBeGreaterThan(0);
    expect(argv.slice(separator + 1)).toEqual([
      '/usr/local/go/bin/go',
      'test',
      '-mod=vendor',
      '-count=1',
      './pkg/gcsv',
    ]);
    expect(argv).toContain('/usr/bin:/bin');
    expect(JSON.stringify(argv)).not.toContain('evil.example');
  });

  test('toolchain resolution ignores ambient PATH entries', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-path-'));
    const previousPath = process.env['PATH'];
    try {
      fs.writeFileSync(path.join(dir, 'go'), '#!/bin/sh\necho FAKE-GO\n', { mode: 0o755 });
      process.env['PATH'] = `${dir}${path.delimiter}${previousPath ?? ''}`;
      const resolution = resolveOwnerLocalGoBinary({ requiredVersion: null });
      if (resolution.status === 'RESOLVED') {
        expect(resolution.binary).not.toBe(path.join(dir, 'go'));
        const fixed = OWNER_LOCAL_FIXED_GO_BINARIES.includes(resolution.binary);
        expect(fixed || resolution.binary.includes('toolchain@')).toBe(true);
      } else {
        expect(resolution.status).toBe('BLOCKED');
      }
    } finally {
      if (previousPath === undefined) delete process.env['PATH'];
      else process.env['PATH'] = previousPath;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('closure copies only selected packages and required metadata', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, {
        ...fullTree(),
        'pkg/other/other.go': 'package other\n\nfunc Other() int { return 1 }\n',
        'pkg/other/other_test.go': 'package other\n\nimport "testing"\n\nfunc TestOther(t *testing.T) {}\n',
      });
      const seen: string[] = [];
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async (input: OwnerLocalGoRunInput) => {
            const found: string[] = [];
            const walk = (dir: string): void => {
              for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.isFile()) found.push(path.relative(input.cwd, full).split(path.sep).join('/'));
              }
            };
            walk(input.cwd);
            seen.push(...found.sort());
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run({
        reproductionId: 'rep-1',
        candidateId: null,
        sourcePath: SOURCE_PATH,
        sourceEvidenceRef: 'srcobs:x',
        observedEvidenceRefs: [],
      });
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('NOT_REPRODUCED');
      expect(seen.length).toBeGreaterThan(0);
      for (const file of seen) {
        expect(file).not.toContain('pkg/other/');
      }
      expect(seen).toContain('go.mod');
      expect(seen).toContain('vendor/modules.txt');
      expect(seen).toContain('pkg/gcsv/info.go');
      expect(seen).toContain('pkg/gcsv/info_test.go');
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('closure listing failure blocks without executing', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-adv-tmp-'));
    try {
      const repoRoot = writeRepo(siblingRoot, fullTree());
      let goCalls = 0;
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        ports: {
          runGit: stableGit(repoRoot),
          runGoTest: async () => {
            goCalls += 1;
            return PASS_RUN;
          },
          resolveGoBinary: () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' }),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async () => null,
        },
      });
      const result = await provider.run({
        reproductionId: 'rep-1',
        candidateId: null,
        sourcePath: SOURCE_PATH,
        sourceEvidenceRef: 'srcobs:x',
        observedEvidenceRefs: [],
      });
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(goCalls).toBe(0);
      expect(fs.readdirSync(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
