// W8 leakage-proof lane: working memory travels INSIDE ReasonerTurnRequest,
// so the existing benchmark leak guard (recorded request blobs +
// assertNoBenchmarkLeakage in runBenchmarkHunt) must already cover it. These
// tests prove that mechanically instead of assuming it, and prove memory
// cannot mint reproduction or admission credit.
//
// Synthetic probe cases only: no network, no CLI spawn, no sibling writes
// (the mined-replay seam is stubbed; the repositoriesRoot temp dir is created
// under os.tmpdir and removed afterwards).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  assertNoBenchmarkLeakage,
  detectBenchmarkLeakage,
  type HiddenGroundTruth,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { defaultBenchmarkBudgetPolicy, runBenchmarkHunt } from '../../src/core/benchmark/hunt';
import { defineBenchmarkCase, type DefinedBenchmarkCase } from '../../src/core/benchmark/case';
import { benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import { classifyVerifiedBenchmarkTier } from '../../src/core/benchmark/score';
import {
  MINED_TEST_REPLAY_VERSION,
  type ContainedTestReplayResult,
} from '../../src/core/benchmark/containedTestReplay';
import type { InvestigationMemory } from '../../src/core/investigationMemory/types';

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-leak-reasoner',
  provider: 'stub',
  model: 'stub-leak-1',
};

const CALL_DIGEST = `arg:sha256:${'a'.repeat(24)}`;

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

function hiddenSecrets(hidden: HiddenGroundTruth): readonly string[] {
  return [hidden.fixCommit, hidden.fixDiff, hidden.knownFailingTest, hidden.issueTitle, hidden.bugDescription, hidden.explanation].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Narrow one recorded request blob to its reasoner-visible memory. Throws on bad shape. */
function recordedMemory(blob: string): InvestigationMemory {
  const parsed: unknown = JSON.parse(blob);
  if (!isRecord(parsed) || !isRecord(parsed.observation) || !isRecord(parsed.observation.memory)) {
    throw new Error('malformed recorded request blob: missing observation.memory');
  }
  // The hunt records JSON.stringify({ campaignId, turnId, observation }) where
  // observation is the already-typed ReasonerObservation; shape pre-checked
  // above, so the final step is a same-shape reclaim, not new trust.
  const memory = parsed.observation.memory as unknown as InvestigationMemory;
  return memory;
}

function parseMemories(blobs: readonly string[]): InvestigationMemory[] {
  return blobs.map((blob) => recordedMemory(blob));
}

function lastEvidenceRef(request: ReasonerTurnRequest, fallback: string): string {
  const refs = [...request.observation.evidenceRefs];
  const last = refs[refs.length - 1];
  return typeof last === 'string' ? last : fallback;
}

/** Per-blob hidden-freeness over the whole blob AND over observation.memory alone. */
function expectBlobsHiddenFree(blobs: readonly string[], hidden: HiddenGroundTruth): void {
  const secrets = hiddenSecrets(hidden);
  expect(secrets.length).toBeGreaterThan(0);
  expect(blobs.length).toBeGreaterThan(0);
  for (const blob of blobs) {
    for (const secret of secrets) expect(blob).not.toContain(secret);
    const memoryText = JSON.stringify(recordedMemory(blob));
    for (const secret of secrets) expect(memoryText).not.toContain(secret);
  }
}

// ---------------------------------------------------------------------------
// Synthetic mined-style probe case. The visible snapshot names exactly one
// approved file (PROBE_CANARY); every hidden string is distinctive and absent
// from the visible material (defineBenchmarkCase enforces that fail-closed).
// ---------------------------------------------------------------------------

const PROBE_CANARY = 'src/leak/probe.ts';

const PROBE_HIDDEN: HiddenGroundTruth = {
  fixCommit: '0123456789abcdef0123456789abcdef01234567',
  fixDiff:
    'diff --git a/src/leak/hidden-fix.ts b/src/leak/hidden-fix.ts\n' +
    '--- a/src/leak/hidden-fix.ts\n' +
    '+++ b/src/leak/hidden-fix.ts\n' +
    '@@ -1 +1 @@\n' +
    '-const hiddenFault = 1;\n' +
    '+const hiddenFault = 2;\n',
  issueTitle: 'Leak probe hidden issue title ZULU-9271',
  bugDescription: 'Leak probe hidden bug description QUORUM-314159',
  knownFailingTest: 'leak-probe-hidden-failing.spec.ts',
  explanation: 'Leak probe hidden explanation XENON-271828 naming the concealed correction.',
};

function defineLeakProbeCase(options?: { readonly withMinedReplay?: boolean }): DefinedBenchmarkCase {
  return defineBenchmarkCase({
    caseId: options?.withMinedReplay === true ? 'bench-leak-probe-mined-001' : 'bench-leak-probe-001',
    productFamily: 'ledger-web',
    category: 'billing',
    hidden: { ...PROBE_HIDDEN },
    preFix: {
      symptomReport:
        'Checkout arithmetic wobbles on multi-line baskets by the smallest currency unit. ' +
        'Single-line baskets always agree exactly.',
      sourceSnapshot:
        `--- ${PROBE_CANARY}\n` +
        'export function probeTotal(lines: number[]): number {\n' +
        '  return lines.reduce((sum, line) => sum + line, 0);\n' +
        '}\n',
      reproSteps:
        '1. Build a three-line basket. ' +
        '2. Charge the basket and record the captured total. ' +
        '3. Sum the displayed line amounts and compare against the captured total.',
    },
    ...(options?.withMinedReplay === true
      ? {
          minedReplay: {
            schemaVersion: MINED_TEST_REPLAY_VERSION,
            repository: 'example/ledger',
            fixCommit: '0123456789abcdef0123456789abcdef01234567',
            testPath: 'probe/replay-helpers_test.go',
            packageDir: 'probe',
          },
        }
      : {}),
  });
}

/** Index, read the approved file, form an evidence-grounded hypothesis, request reproduction. */
function exploreScript(canary: string): ScriptEntry[] {
  return [
    () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: {} }]),
    (request) => {
      const target = request.observation.memory.uninspectedTargets[0] ?? canary;
      return okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: target } }]);
    },
    (request) => {
      const ref = lastEvidenceRef(request, 'ev:sha256:leakprobefallback0001');
      return okTurn([
        {
          kind: 'FORM_HYPOTHESIS',
          hypothesisId: 'h-leak-probe-1',
          statement: 'Probe totals fold lines without per-line adjustment; the capture arithmetic is the place to verify.',
          evidenceRefs: [ref],
        },
      ]);
    },
    () => okTurn([{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', argumentDigest: CALL_DIGEST, arguments: {} }]),
    () => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]),
  ];
}

async function runProbeExplore(
  withMinedReplay: boolean,
  ports?: {
    readonly runReplay?: () => Promise<ContainedTestReplayResult>;
    readonly repositoriesRoot?: string;
  },
) {
  const defined = defineLeakProbeCase(withMinedReplay ? { withMinedReplay: true } : undefined);
  const result = await runBenchmarkHunt(defined, {
    reasoner: scriptDriver(exploreScript(PROBE_CANARY)),
    budgetPolicy: defaultBenchmarkBudgetPolicy(),
    maxTurns: 6,
    ...(ports === undefined
      ? {}
      : {
          minedReplay: {
            ...(ports.runReplay === undefined ? {} : { runReplay: ports.runReplay }),
            ...(ports.repositoriesRoot === undefined ? {} : { repositoriesRoot: ports.repositoriesRoot }),
          },
        }),
  });
  return { defined, result };
}

test('recorded hunt requests (including observation.memory alone) carry no hidden ground truth', async () => {
  const { defined, result } = await runProbeExplore(false);
  expect(result.leaked).toEqual([]);
  expect(detectBenchmarkLeakage({ blobs: [...result.requestBlobs] }, defined.hidden)).toEqual([]);
  // Index + read + hypothesis + reproduction turns must all be recorded.
  expect(result.requestBlobs.length).toBeGreaterThanOrEqual(4);
  expectBlobsHiddenFree(result.requestBlobs, defined.hidden);
});

test('observation.memory carries the approved visible target (channel is live, not empty)', async () => {
  const { result } = await runProbeExplore(false);
  const memories = parseMemories(result.requestBlobs);
  expect(memories.length).toBeGreaterThan(0);
  const memoryText = memories.map((memory) => JSON.stringify(memory)).join('\n');
  expect(memoryText).toContain(PROBE_CANARY);
  const inspected = memories.flatMap((memory) => [...memory.inspectedTargets]);
  const hit = inspected.find((entry) => entry.target === PROBE_CANARY);
  // A successful file read must be recorded with its minted source evidence ref.
  // Without a live memory channel this lookup finds nothing and the test fails.
  expect(hit).toBeDefined();
  expect(typeof hit?.evidenceRef === 'string' && (hit?.evidenceRef.length ?? 0) > 0).toBe(true);
  const last = memories[memories.length - 1];
  expect(last?.inspectedTargets.length).toBeGreaterThan(0);
});

test('contained-replay audit stderr never reaches reasoner requests or memory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-leak-audit-'));
  try {
    fs.mkdirSync(path.join(root, 'example', 'ledger'), { recursive: true });
    const STDERR_CANARY = 'LEAK-PROBE-AUDIT-STDERR-7d3f9a1c5e8b';
    const fakeReplay = async (): Promise<ContainedTestReplayResult> => ({
      verdict: 'REPRODUCED',
      reason: 'LEAK_PROBE_FAKE_REPLAY',
      preFix: { signal: 'FAIL', reason: 'pre-fix check failed', exitCode: 1, timedOut: false },
      postFix: { signal: 'PASS', reason: 'post-fix check passed', exitCode: 0, timedOut: false },
      stderrHead: `${STDERR_CANARY}: pre-fix assertion mismatch at line 42`,
      durationMs: 7,
      skippedSubmodules: [],
    });
    const { result } = await runProbeExplore(true, { runReplay: fakeReplay, repositoriesRoot: root });
    // The seam must have fired: otherwise the test would vacuously pass.
    expect(result.minedReplayAudit).not.toBeNull();
    expect(result.minedReplayAudit?.stderrHead).toContain(STDERR_CANARY);
    for (const blob of result.requestBlobs) expect(blob).not.toContain(STDERR_CANARY);
    for (const memory of parseMemories(result.requestBlobs)) {
      expect(JSON.stringify(memory)).not.toContain(STDERR_CANARY);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('assertNoBenchmarkLeakage stays fail-closed on a deliberately tainted blob', () => {
  const fixture = benchmarkFixtureById('bench-billing-rounding-001');
  const commit = fixture.hidden.fixCommit;
  expect(typeof commit === 'string' && commit.length > 0).toBe(true);
  if (typeof commit !== 'string' || commit.length === 0) throw new Error('billing fixture must carry a fix commit');
  const tainted = { blobs: ['harmless pre-fix note', `request context carrying ${commit} inline`] };
  expect(detectBenchmarkLeakage(tainted, fixture.hidden)).toEqual(['FIX_COMMIT']);
  expect(() => assertNoBenchmarkLeakage(tainted, fixture.hidden)).toThrow(/BENCHMARK_GROUND_TRUTH_LEAK:FIX_COMMIT/);
});

test('prose reproduction claims and unobserved refs mint no reproduction or admission credit', async () => {
  const fixture = benchmarkFixtureById('bench-billing-rounding-001');
  const fakeRef = 'ev:sha256:never-observed-0000';
  const driver = scriptDriver([
    () =>
      okTurn([
        {
          kind: 'FORM_HYPOTHESIS',
          hypothesisId: 'h-fake-repro-1',
          statement: 'I reproduced the defect locally and the run confirms the fault.',
          evidenceRefs: [fakeRef],
        },
        {
          kind: 'CALL_TOOL',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          argumentDigest: CALL_DIGEST,
          arguments: { reproductionId: 'fake-1', sourcePath: 'src/nowhere/ghost.ts', sourceEvidenceRef: fakeRef },
        },
      ]),
    () => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' }]),
  ]);
  const result = await runBenchmarkHunt(fixture, {
    reasoner: driver,
    budgetPolicy: defaultBenchmarkBudgetPolicy(),
    maxTurns: 4,
  });
  // No mechanically observed reproduction: the ghost-path gate refuses before any provider runs.
  expect(result.reproductionCount).toBe(0);
  // No PROPOSE_CANDIDATE intent was ever issued, so prose plus a bare
  // COMPLETE_WITH_FINDING termination must not admit anything.
  expect(result.admitted).toBe(false);
  expect(result.candidateIds).toEqual([]);
  expect(result.outcome).toBe('MISS');
  expect(
    classifyVerifiedBenchmarkTier({
      admitted: result.admitted,
      score: result.score,
      mechanicalReproductionCount: result.reproductionCount,
      leakage: result.leaked,
    }),
  ).toBe('NOT_VERIFIED');
  const memories = parseMemories(result.requestBlobs);
  expect(memories.length).toBeGreaterThan(0);
  for (const memory of memories) expect(memory.progress.mechanicalReproductions).toBe(0);
  // The fake-ref hypothesis must never reach verification-ready: only an
  // inspected source read's observed ref confers that state.
  const last = memories[memories.length - 1];
  if (last === undefined) throw new Error('expected at least one recorded memory');
  const fake = last.hypotheses.find((hypothesis) => hypothesis.hypothesisId === 'h-fake-repro-1');
  expect(fake).toBeDefined();
  expect(['UNGROUNDED', 'GROUNDED']).toContain(fake?.progress);
});

test('thorough exploration of a negative control without proposals still scores MISS, never FALSE_POSITIVE', async () => {
  const fixture = benchmarkFixtureById('bench-negative-quiet-000');
  const driver = scriptDriver([
    () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: {} }]),
    (request) => {
      const target = request.observation.memory.uninspectedTargets[0] ?? 'visible-context.md';
      return okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: CALL_DIGEST, arguments: { path: target } }]);
    },
    (request) => {
      const ref = lastEvidenceRef(request, 'ev:sha256:quietfallback0001');
      return okTurn([
        {
          kind: 'FORM_HYPOTHESIS',
          hypothesisId: 'h-quiet-1',
          statement: 'The health endpoint is quiet; no defect to file.',
          evidenceRefs: [ref],
        },
      ]);
    },
    () => okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]),
  ]);
  const result = await runBenchmarkHunt(fixture, {
    reasoner: driver,
    budgetPolicy: defaultBenchmarkBudgetPolicy(),
    maxTurns: 6,
  });
  expect(result.admitted).toBe(false);
  expect(result.outcome).toBe('MISS');
  expect(result.outcome).not.toBe('FALSE_POSITIVE');
  expect(result.leaked).toEqual([]);
});
