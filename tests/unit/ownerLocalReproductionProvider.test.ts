// W9 provider lane — fabricated owner-local reproduction tests.
//
// Hermetic by construction: fabricated sibling trees under temp directories
// plus injected ports (fake git identity, fake go runs, fake toolchain).
// No network, no real toolchain, no real git. These tests assert semantic
// outcomes, proof validity, temp cleanup, and identity behavior — never
// source text.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { sourceContentDigest } from '../../src/core/source/scanTypes';
import { validateCurrentSourceProof } from '../../src/core/localInvestigation/currentSourceProof';
import type {
  LocalProviderResult,
  LocalReproductionProviderResult,
  LocalReproductionRequest,
  LocalSourceDocument,
  LocalSourceIndex,
  LocalSourceProvider,
} from '../../src/core/localInvestigation/types';
import { ownerLocalTargetDigest } from '../../src/core/ownerLocalReproduction/contracts';
import {
  OWNER_LOCAL_REPRODUCTION_PROVIDER_ID,
  createOwnerLocalReproductionProvider,
  discoverOwnerLocalTarget,
  type OwnerLocalClosureListInput,
  type OwnerLocalGitRunner,
  type OwnerLocalGoRunInput,
  type OwnerLocalGoRunResult,
  type OwnerLocalReproductionPorts,
} from '../../src/core/ownerLocalReproduction/provider';
const HEAD_SHA = '0123456789abcdef0123456789abcdef01234567';
const REPO = 'mobingilabs/ouchan';
const SOURCE_REL = 'pkg/gcsv/info.go';
const SOURCE_PATH = `${REPO}:${SOURCE_REL}`;
const SOURCE_EVIDENCE_REF = 'srcobs:sha256:0123456789abcdef01234567';

const FOO_GO = 'package gcsv\n\nfunc Info() string { return "info" }\n';
const FOO_TEST_GO =
  'package gcsv\n\nimport "testing"\n\nfunc TestInfo(t *testing.T) { if Info() != "info" { t.Fatal("bad") } }\n';
const GO_MOD = 'module github.com/mobingilabs/ouchan\n\ngo 1.23.0\n';
const MODULES_TXT = '# github.com/mobingilabs/ouchan v1.0.0\n## explicit; go 1.23.0\n';

const FAIL_RUN: OwnerLocalGoRunResult = {
  exitCode: 1,
  stdout:
    '=== RUN   TestInfo\n--- FAIL: TestInfo (0.00s)\n    info_test.go:7: bad\nFAIL\nFAIL\tgithub.com/mobingilabs/ouchan/pkg/gcsv\t0.012s\n',
  stderr: '',
  timedOut: false,
  truncated: false,
  spawnFailed: null,
};
const PASS_RUN: OwnerLocalGoRunResult = {
  exitCode: 0,
  stdout: 'ok  \tgithub.com/mobingilabs/ouchan/pkg/gcsv\t0.012s\n',
  stderr: '',
  timedOut: false,
  truncated: false,
  spawnFailed: null,
};
const BUILD_RUN: OwnerLocalGoRunResult = {
  exitCode: 1,
  stdout:
    '# github.com/mobingilabs/ouchan/pkg/gcsv\npkg/gcsv/info.go:3:6: undefined: Info2\nFAIL\tgithub.com/mobingilabs/ouchan/pkg/gcsv [build failed]\n',
  stderr: '',
  timedOut: false,
  truncated: false,
  spawnFailed: null,
};
const TIMEOUT_RUN: OwnerLocalGoRunResult = {
  exitCode: null,
  stdout: '=== RUN   TestSlow\n',
  stderr: '',
  timedOut: true,
  truncated: false,
  spawnFailed: null,
};

function writeFakeRepo(
  siblingRoot: string,
  repoId: string,
  files: Readonly<Record<string, string>>,
): string {
  const repo = path.join(siblingRoot, ...repoId.split('/'));
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

function stubSourceProvider(entries: ReadonlyMap<string, string>): LocalSourceProvider {
  return {
    providerId: 'test-owner-local-source',
    async index(): Promise<LocalProviderResult<LocalSourceIndex>> {
      return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'test-stub-no-index' };
    },
    async read(requestPath: string): Promise<LocalProviderResult<LocalSourceDocument>> {
      const text = entries.get(requestPath);
      if (text === undefined) {
        return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'test-stub-unknown-path' };
      }
      return {
        status: 'AVAILABLE',
        value: {
          path: requestPath,
          repository: REPO,
          relativePath: SOURCE_REL,
          sourceSha: HEAD_SHA,
          language: 'GO',
          byteCount: Buffer.byteLength(text, 'utf8'),
          contentDigest: sourceContentDigest(text),
          text,
        },
      };
    },
  };
}

/** Fake read-only git: fixed HEAD/toplevel, scripted porcelain per status call. */
function stubGit(repoRoot: string, porcelains: readonly string[]): OwnerLocalGitRunner {
  let statusCalls = 0;
  return async (args: readonly string[]) => {
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
      return { stdout: `${HEAD_SHA}\n`, stderr: '' };
    }
    if (args[0] === 'rev-parse') {
      return { stdout: `${repoRoot}\n`, stderr: '' };
    }
    statusCalls += 1;
    const porcelain = porcelains[Math.min(statusCalls - 1, porcelains.length - 1)] ?? '';
    return { stdout: porcelain, stderr: '' };
  };
}

function stubToolchain(): OwnerLocalReproductionPorts['resolveGoBinary'] {
  return () => ({ status: 'RESOLVED', binary: '/fake/go', version: '1.23.0' });
}

function scriptedGo(
  runs: readonly OwnerLocalGoRunResult[],
  seen: OwnerLocalGoRunInput[],
): OwnerLocalReproductionPorts['runGoTest'] {
  let calls = 0;
  return async (input: OwnerLocalGoRunInput) => {
    seen.push(input);
    calls += 1;
    return runs[Math.min(calls - 1, runs.length - 1)] ?? TIMEOUT_RUN;
  };
}

function requestFor(
  sourcePath: string = SOURCE_PATH,
  sourceEvidenceRef: string = SOURCE_EVIDENCE_REF,
): LocalReproductionRequest {
  return {
    reproductionId: 'rep-1',
    candidateId: 'cand-1',
    sourcePath,
    sourceEvidenceRef,
    observedEvidenceRefs: [],
  };
}

function auditField(value: LocalReproductionProviderResult, field: string): unknown {
  const audit: unknown = value.audit;
  if (typeof audit === 'object' && audit !== null && field in audit) {
    const record = audit as Record<string, unknown>;
    return record[field];
  }
  return undefined;
}

test.describe('W9 owner-local reproduction provider (fabricated)', () => {
  test('discovers a supported target with host-derived facts', () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    try {
      writeFakeRepo(siblingRoot, REPO, fullTree());
      const discovery = discoverOwnerLocalTarget({ sourcePath: SOURCE_PATH, siblingRoot });
      expect(discovery.status).toBe('SUPPORTED');
      if (discovery.status !== 'SUPPORTED') return;
      expect(discovery.target.repository).toBe(REPO);
      expect(discovery.target.sourcePath).toBe(SOURCE_PATH);
      expect(discovery.target.moduleRelativePath).toBe('.');
      expect(discovery.target.packageRelativePath).toBe('pkg/gcsv');
      expect(discovery.target.executor).toBe('GO_VENDORED_PACKAGE_TEST');
      expect(discovery.target.sourceContentDigest).toBe(sourceContentDigest(FOO_GO));
      expect(discovery.target.repositoryHeadSha).toBe(HEAD_SHA);
      // Deterministic: the same source always yields the same target digest.
      const again = discoverOwnerLocalTarget({ sourcePath: SOURCE_PATH, siblingRoot });
      expect(again.status).toBe('SUPPORTED');
      if (again.status !== 'SUPPORTED') return;
      expect(ownerLocalTargetDigest(again.target)).toBe(ownerLocalTargetDigest(discovery.target));
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
    }
  });

  test('refuses malformed, unapproved, and unsupported paths', () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-refuse-'));
    try {
      writeFakeRepo(siblingRoot, REPO, fullTree());
      const cases: ReadonlyArray<readonly [string, string]> = [
        ['no-colon-here', 'PATH_MALFORMED'],
        [`${REPO}:`, 'PATH_MALFORMED'],
        [`:${SOURCE_REL}`, 'PATH_MALFORMED'],
        ['evil/corp:pkg/x.go', 'PATH_NOT_APPROVED'],
        [`${REPO}:src/app/x.go`, 'PATH_NOT_APPROVED'],
        [`${REPO}:pkg/gcsv/info.txt`, 'NO_SUPPORTED_EXECUTOR'],
        [`${REPO}:pkg/gcsv/../gcsv/info.go`, 'PATH_MALFORMED'],
        [`${REPO}:/abs.go`, 'PATH_MALFORMED'],
        [`${REPO}:.git/config`, 'PATH_MALFORMED'],
        [`${REPO}:pkg/gcsv/missing.go`, 'SOURCE_NOT_CURRENT'],
      ];
      for (const [sourcePath, refusal] of cases) {
        const discovery = discoverOwnerLocalTarget({ sourcePath, siblingRoot });
        expect(discovery.status).toBe('UNSUPPORTED');
        if (discovery.status === 'UNSUPPORTED') expect(discovery.refusal).toBe(refusal);
      }
      // Structural refusals, each against its own fabricated tree.
      const structural: ReadonlyArray<readonly [string, Readonly<Record<string, string>>]> = [
        ['MODULE_ROOT_NOT_FOUND', { 'vendor/modules.txt': MODULES_TXT, [SOURCE_REL]: FOO_GO, 'pkg/gcsv/info_test.go': FOO_TEST_GO }],
        ['VENDOR_DIRECTORY_ABSENT', { 'go.mod': GO_MOD, [SOURCE_REL]: FOO_GO, 'pkg/gcsv/info_test.go': FOO_TEST_GO }],
        ['PACKAGE_TEST_FILES_ABSENT', { 'go.mod': GO_MOD, 'vendor/modules.txt': MODULES_TXT, [SOURCE_REL]: FOO_GO }],
      ];
      for (const [refusal, files] of structural) {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-struct-'));
        try {
          // Hand-crafted git shape so the boundary admits the checkout.
          const repo = path.join(root, ...REPO.split('/'));
          fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
          fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
          fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${HEAD_SHA}\n`);
          for (const [relative, content] of Object.entries(files)) {
            const dest = path.join(repo, ...relative.split('/'));
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, content);
          }
          const discovery = discoverOwnerLocalTarget({ sourcePath: SOURCE_PATH, siblingRoot: root });
          expect(discovery.status).toBe('UNSUPPORTED');
          if (discovery.status === 'UNSUPPORTED') expect(discovery.refusal).toBe(refusal);
        } finally {
          fs.rmSync(root, { recursive: true, force: true });
        }
      }
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
    }
  });

  test('mints a qualifying proof for a repeated identical test failure', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([FAIL_RUN, FAIL_RUN], seen),
          resolveGoBinary: stubToolchain(),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('REPRODUCED_CURRENT_FAILURE');
      expect(result.value.preFix).toBe('FAIL');
      expect(result.value.postFix).toBe('NOT_RUN');
      const proof = result.value.currentSourceProof;
      expect(proof).not.toBeNull();
      if (proof === null || proof === undefined) return;
      expect(
        validateCurrentSourceProof(proof, {
          providerId: OWNER_LOCAL_REPRODUCTION_PROVIDER_ID,
          sourcePath: SOURCE_PATH,
        }),
      ).toBeNull();
      expect(proof.executionCount).toBe(2);
      expect(proof.failureClass).toBe('TEST_ASSERTION_FAILURE');
      expect(proof.siblingIdentityStable).toBe(true);
      expect(proof.networkDisabled).toBe(true);
      expect(typeof result.value.evidenceRef === 'string').toBe(true);
      // Two fresh executions ran, and the temp tree is gone afterwards.
      expect(seen.length).toBe(2);
      expect(seen[0]?.cwd).not.toBe(seen[1]?.cwd);
      expect(fs.readdirSync(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('reports NOT_REPRODUCED for passing tests', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([PASS_RUN, PASS_RUN], seen),
          resolveGoBinary: stubToolchain(),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('NOT_REPRODUCED');
      expect(result.value.preFix).toBe('PASS');
      expect(result.value.postFix).toBe('NOT_RUN');
      expect(result.value.currentSourceProof).toBeNull();
      expect(seen.length).toBe(2);
      expect(fs.readdirSync(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('reports INCONCLUSIVE for build failures', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([BUILD_RUN, BUILD_RUN], []),
          resolveGoBinary: stubToolchain(),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('INCONCLUSIVE');
      expect(result.value.currentSourceProof).toBeNull();
      expect(result.value.evidenceRef).toBeNull();
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('reports INCONCLUSIVE with transient disposition on timeout', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([TIMEOUT_RUN, TIMEOUT_RUN], []),
          resolveGoBinary: stubToolchain(),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('INCONCLUSIVE');
      expect(auditField(result.value, 'disposition')).toBe('TRANSIENT_RETRYABLE');
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('reports ENVIRONMENT_BLOCKED without a toolchain and never executes', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([FAIL_RUN, FAIL_RUN], seen),
          resolveGoBinary: () => ({ status: 'BLOCKED', block: 'TOOLCHAIN_UNAVAILABLE' }),
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(result.value.currentSourceProof).toBeNull();
      expect(seen.length).toBe(0);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('refuses execution when sibling identity drifts', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(new Map([[SOURCE_PATH, FOO_GO]])),
        ports: {
          runGit: stubGit(repoRoot, ['', ' M pkg/gcsv/info.go\n']),
          runGoTest: scriptedGo([FAIL_RUN, FAIL_RUN], []),
          resolveGoBinary: stubToolchain(),
          resolveSandbox: () => ({ status: 'RESOLVED', binary: '/fake/bwrap' }),
          listClosurePackages: async (input: OwnerLocalClosureListInput) => [
            path.join(input.moduleRoot, 'pkg', 'gcsv'),
          ],
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(result.value.verdict).toBe('ENVIRONMENT_BLOCKED');
      expect(result.value.currentSourceProof).toBeNull();
      expect(auditField(result.value, 'block')).toBe('SIBLING_IDENTITY_DRIFT');
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('refuses stale source binding without executing', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      // The source provider binds a DIFFERENT text than the sibling holds.
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stubSourceProvider(
          new Map([[SOURCE_PATH, 'package gcsv\n\nfunc Info() string { return "moved" }\n']]),
        ),
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([FAIL_RUN, FAIL_RUN], seen),
          resolveGoBinary: stubToolchain(),
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('BLOCKED');
      if (result.status !== 'BLOCKED') return;
      expect(result.class).toBe('SOURCE_STALE');
      expect(seen.length).toBe(0);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('propagates a blocked source re-read without executing', async () => {
    const siblingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-sib-'));
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prov-tmp-'));
    try {
      const repoRoot = writeFakeRepo(siblingRoot, REPO, fullTree());
      const seen: OwnerLocalGoRunInput[] = [];
      const stale: LocalSourceProvider = {
        providerId: 'test-stale-source',
        async index(): Promise<LocalProviderResult<LocalSourceIndex>> {
          return { status: 'BLOCKED', class: 'SOURCE_STALE', reason: 'test-stale' };
        },
        async read(): Promise<LocalProviderResult<LocalSourceDocument>> {
          return { status: 'BLOCKED', class: 'SOURCE_STALE', reason: 'test-stale-read' };
        },
      };
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot,
        tempRoot,
        sourceProvider: stale,
        ports: {
          runGit: stubGit(repoRoot, ['', '']),
          runGoTest: scriptedGo([FAIL_RUN, FAIL_RUN], seen),
          resolveGoBinary: stubToolchain(),
        },
      });
      const result = await provider.run(requestFor());
      expect(result.status).toBe('BLOCKED');
      if (result.status !== 'BLOCKED') return;
      expect(result.class).toBe('SOURCE_STALE');
      expect(seen.length).toBe(0);
    } finally {
      fs.rmSync(siblingRoot, { recursive: true, force: true });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects missing grounding and unapproved paths at the gate', async () => {
    const provider = createOwnerLocalReproductionProvider({
      siblingRoot: path.join(os.tmpdir(), 'nw-prov-unused'),
    });
    const missing = await provider.run(requestFor('', ''));
    expect(missing.status).toBe('BLOCKED');
    if (missing.status === 'BLOCKED') expect(missing.class).toBe('UNSAFE_INPUT');
    const unapproved = await provider.run(requestFor('evil/corp:pkg/x.go'));
    expect(unapproved.status).toBe('BLOCKED');
    if (unapproved.status === 'BLOCKED') expect(unapproved.class).toBe('UNSAFE_INPUT');
  });
});
