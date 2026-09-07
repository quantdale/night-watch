// W7 replay lane — historical product-path proof through the shared
// provider contract. Product and benchmark reproduction share
// createHistoricalLocalInvestigationContext + the session executor:
// file grounding precedes execution, environment-blocked mints no
// credit, and hidden coordinates never enter reasoner-visible bytes.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLocalInvestigationToolSession } from '../../src/core/localInvestigation/session';
import {
  createHistoricalLocalInvestigationContext,
  type HistoricalReplayAudit,
} from '../../src/core/localInvestigation/historical';
import {
  MINED_TEST_REPLAY_VERSION,
  parseMinedTestReplayDescriptor,
  type ContainedTestReplayResult,
} from '../../src/core/benchmark/containedTestReplay';

const FILE_CANARY = 'product-path-file-canary-m7q2';
const STDERR_CANARY = 'product-path-stderr-canary-t8w4';
const FIX_SHA = 'b'.repeat(40);

const replayRoots: string[] = [];
test.afterEach(() => {
  while (replayRoots.length > 0) {
    const root = replayRoots.pop();
    if (root !== undefined) fs.rmSync(root, { recursive: true, force: true });
  }
});

function replayRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-historical-product-'));
  fs.mkdirSync(path.join(root, 'example', 'ledger'), { recursive: true });
  replayRoots.push(root);
  return root;
}

function descriptor() {
  const parsed = parseMinedTestReplayDescriptor({
    schemaVersion: MINED_TEST_REPLAY_VERSION,
    repository: 'example/ledger',
    fixCommit: FIX_SHA,
    testPath: 'total.test.ts',
    packageDir: '.',
  });
  if (!parsed) throw new Error('descriptor must parse');
  return parsed;
}

function visible() {
  return { blobs: ['look', `--- total.ts\n${FILE_CANARY}\n`, 'observe'] };
}

function reproducedResult(): ContainedTestReplayResult {
  return {
    verdict: 'REPRODUCED',
    reason: 'PRE_FAIL_POST_PASS',
    preFix: { signal: 'FAIL', reason: 'PRE_FAIL', exitCode: 1, timedOut: false },
    postFix: { signal: 'PASS', reason: 'POST_PASS', exitCode: 0, timedOut: false },
    stderrHead: `--- FAIL: TestTotal (0.00s)\n    total.test.ts:9: ${STDERR_CANARY}\nFAIL`,
    durationMs: 11,
    skippedSubmodules: [],
  };
}

function blockedResult(): ContainedTestReplayResult {
  return {
    verdict: 'ENVIRONMENT_BLOCKED',
    reason: 'GO_TOOLCHAIN_MISSING',
    preFix: { signal: 'BLOCKED', reason: 'NO_GO', exitCode: null, timedOut: false },
    postFix: { signal: 'BLOCKED', reason: 'NO_GO', exitCode: null, timedOut: false },
    stderrHead: '',
    durationMs: 3,
    skippedSubmodules: [],
  };
}

test.describe('historical product path shares the provider contract', () => {
  test('grounded reproduction executes with neutral reasoner bytes only', async () => {
    const auditBox: { current: HistoricalReplayAudit | null } = { current: null };
    const context = createHistoricalLocalInvestigationContext({
      visible: visible(),
      caseId: 'hist-product-001',
      minedReplay: descriptor(),
      repositoriesRoot: replayRoot(),
      runReplay: async (request) => {
        expect(request.testPath).toBe('total.test.ts');
        expect(request.fixCommit).toBe(FIX_SHA);
        return reproducedResult();
      },
      auditBox,
    });
    expect(context.dataClass).toBe('REAL_HISTORICAL');
    const session = createLocalInvestigationToolSession(context);

    const index = await session.executor.execute({
      campaignId: 'c',
      turnId: 't0',
      toolId: 'INSPECT_SOURCE_SURFACE',
      arguments: {},
      argumentDigest: 'd0',
    });
    expect(index.ok).toBe(true);
    expect(index.resultClass).toBe('SOURCE_INDEX');

    const file = await session.executor.execute({
      campaignId: 'c',
      turnId: 't1',
      toolId: 'INSPECT_SOURCE_SURFACE',
      arguments: { path: 'total.ts' },
      argumentDigest: 'd1',
    });
    expect(file.ok).toBe(true);
    expect(file.resultClass).toBe('SOURCE_FILE');

    const history = session.snapshot();
    const inspected = history.inspectedSources.find((entry) => entry.path === 'total.ts');
    expect(inspected).toBeDefined();

    const rerun = await session.executor.execute({
      campaignId: 'c',
      turnId: 't2',
      toolId: 'RERUN_SAFE_REPRODUCTION',
      arguments: {
        reproductionId: 'historical-product-path-reproduced',
        sourcePath: 'total.ts',
        sourceEvidenceRef: inspected!.evidenceRef,
        observedEvidenceRefs: [],
      },
      argumentDigest: 'd2',
    });
    expect(rerun.ok).toBe(true);
    expect(rerun.resultClass).toBe('REPRODUCED');

    const bytes = rerun.untrusted.map((envelope) => envelope.bytes).join('\n');
    expect(bytes).toContain('REPRODUCED');
    expect(bytes).not.toContain('total.test.ts');
    expect(bytes).not.toContain(FIX_SHA);
    expect(bytes).not.toContain(FILE_CANARY);
    expect(bytes).not.toContain(STDERR_CANARY);

    const receipts = session.snapshot().reproductions;
    expect(receipts.filter((receipt) => receipt.verdict === 'REPRODUCED')).toHaveLength(1);
    expect(auditBox.current?.verdict).toBe('REPRODUCED');
    expect(auditBox.current?.stderrHead).toContain(STDERR_CANARY);
  });

  test('reproduction without file grounding is refused and mints no credit', async () => {
    let calls = 0;
    const context = createHistoricalLocalInvestigationContext({
      visible: visible(),
      caseId: 'hist-product-002',
      minedReplay: descriptor(),
      repositoriesRoot: replayRoot(),
      runReplay: async () => {
        calls += 1;
        return reproducedResult();
      },
    });
    const session = createLocalInvestigationToolSession(context);
    const rerun = await session.executor.execute({
      campaignId: 'c',
      turnId: 't1',
      toolId: 'RERUN_SAFE_REPRODUCTION',
      arguments: {},
      argumentDigest: 'd1',
    });
    expect(calls).toBe(0);
    expect(rerun.ok).toBe(false);
    expect(session.snapshot().reproductions.filter((receipt) => receipt.verdict === 'REPRODUCED')).toHaveLength(0);
  });

  test('environment-blocked replay mints no credit', async () => {
    const context = createHistoricalLocalInvestigationContext({
      visible: visible(),
      caseId: 'hist-product-003',
      minedReplay: descriptor(),
      repositoriesRoot: replayRoot(),
      runReplay: async () => blockedResult(),
    });
    const session = createLocalInvestigationToolSession(context);
    await session.executor.execute({
      campaignId: 'c',
      turnId: 't1',
      toolId: 'INSPECT_SOURCE_SURFACE',
      arguments: { path: 'total.ts' },
      argumentDigest: 'd1',
    });
    const inspected = session.snapshot().inspectedSources.find((entry) => entry.path === 'total.ts');
    expect(inspected).toBeDefined();
    const rerun = await session.executor.execute({
      campaignId: 'c',
      turnId: 't2',
      toolId: 'RERUN_SAFE_REPRODUCTION',
      arguments: {
        reproductionId: 'historical-product-path-blocked',
        sourcePath: 'total.ts',
        sourceEvidenceRef: inspected!.evidenceRef,
        observedEvidenceRefs: [],
      },
      argumentDigest: 'd2',
    });
    expect(rerun.resultClass).toBe('ENVIRONMENT_BLOCKED');
    expect(session.snapshot().reproductions.filter((receipt) => receipt.verdict === 'REPRODUCED')).toHaveLength(0);
  });
});
