// M10 long-run resilience proofs for a reproduction-capable campaign.
//
// TEST-ONLY lane (nightwatch-w10-resilience-lane-v1): no src/** change here.
// Every proof drives the EXISTING runtime, campaign, checkpoint, reasoner and
// budget machinery with the established harness patterns from
// localCampaign.test.ts, campaignStrategyMemory.test.ts, byteAccounting.test.ts,
// localCampaignByteAccounting.test.ts, agentRuntimeW9.test.ts and
// reasonerCli.test.ts. Deterministic and offline: stub drivers/executors with
// fixed byte counts, out-of-process fake CLI reasoners over a synthetic
// in-test investigation context, a manual clock wherever wall time is
// asserted, and no network, no sibling writes, no credentials.
//
// What is proven (observable consumer behaviour, never mere absence of throw):
//  1. campaign pause/resume preserves campaign strategy across the boundary,
//     for a campaign whose reproduction provider actually executes;
//  2. a W9-era checkpoint (no W10 fields) still loads and resumes, and older
//     pre-W9/pre-W8 shapes resume with honest legacy carry;
//  3. a transient failure's retry budget is NOT reset by a resume;
//  4. a deterministic refusal stays exhausted across a resume and does not spin;
//  5. cancellation during tool execution is honoured promptly, cleans up its
//     in-flight marker, and reaps the tool process tree;
//  6. a tool timeout kills its process tree and leaves a reusable driver;
//  7. cumulative byte/call/action/wall budgets are exact across pause-resume;
//  8. sibling repositories are never mutated (per-test before/after identity
//     guard plus an explicit campaign-level proof).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { liveSourceTestRoot } from '../helpers/liveSourceTestAuthority';
import {
  REASONER_TURN_RESPONSE_VERSION,
  TRANSIENT_ACTION_RETRY_BUDGET,
  UNTRUSTED_ENVELOPE_VERSION,
  chargedInputBytes,
  chargedOutputBytes,
  chargedToolPayloadBytes,
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentCheckpoint,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
  type UntrustedEnvelope,
} from '../../src/core/agentProtocol';
import {
  REASONER_STDERR_BYTE_CAP,
  REASONER_STDOUT_BYTE_CAP,
  REASONER_TURN_REQUEST_VERSION,
  type ReasonerCallOptions,
} from '../../src/core/agentProtocol/reasoner';
import {
  AGENT_RUNTIME_STATE_VERSION,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol/runtime';
import { AgentRuntime, parseCheckpoint } from '../../src/core/agentRuntime';
import type {
  AgentRuntimeDeps,
  AgentToolCall,
  AgentToolExecutor,
  AgentToolResult,
} from '../../src/core/agentRuntime';
import {
  CAMPAIGN_STAGNATION_LIMIT,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
  type LocalCampaignInput,
} from '../../src/core/agentRuntime/localCampaign';
import {
  createCliReasonerDriver,
  type CliReasonerConfig,
} from '../../src/core/reasoner/cliReasoner';
import { deriveInvestigationMemory } from '../../src/core/investigationMemory/derive';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
  type DeterministicReproductionProvider,
  type LocalInvestigationContext,
} from '../../src/core/localInvestigation/types';
import { sourceContentDigest } from '../../src/core/source/scanTypes';
import {
  resolveGitHead,
} from '../../src/core/source/siblingSource';
import { PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';

const NODE = process.execPath;
const V = REASONER_TURN_RESPONSE_VERSION;

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-reasoner',
  provider: 'stub',
  model: 'stub-1',
};

// ---------------------------------------------------------------------------
// Sibling-identity guard: read-only, offline, deterministic. Every test in
// this file snapshots the sibling root before it runs and compares after.
// ---------------------------------------------------------------------------

function snapshotSiblingIdentity(): string {
  const snapshot: Record<string, unknown> = { root: liveSourceTestRoot() };
  let entries: string[];
  try {
    entries = fs.readdirSync(liveSourceTestRoot()).sort();
  } catch {
    return JSON.stringify({ ...snapshot, exists: false });
  }
  const heads: Record<string, string> = {};
  for (const repoId of PHASE25_APPROVED_REPOSITORY_IDS) {
    const repoRoot = path.join(liveSourceTestRoot(), ...repoId.split('/'));
    if (!fs.existsSync(repoRoot)) {
      heads[repoId] = 'ABSENT';
      continue;
    }
    heads[repoId] = resolveGitHead(repoRoot) ?? 'NO_HEAD';
  }
  return JSON.stringify({ ...snapshot, exists: true, entries, heads });
}

let scratchDirs: string[] = [];
let siblingBefore: string | null = null;

test.beforeEach(() => {
  siblingBefore = snapshotSiblingIdentity();
});

test.afterEach(() => {
  expect(snapshotSiblingIdentity()).toBe(siblingBefore);
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

// ---------------------------------------------------------------------------
// Runtime harness (byteAccounting.test.ts / agentRuntimeW9.test.ts pattern).
// ---------------------------------------------------------------------------

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[]) {
  const requests: ReasonerTurnRequest[] = [];
  let calls = 0;
  return {
    requests,
    get calls() {
      return calls;
    },
    driver: {
      protocolVersion: 'nightwatch.reasoner-driver.v1',
      transport: 'CLI',
      provenance: PROVENANCE,
      async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
        calls += 1;
        requests.push(request);
        const entry = script[Math.min(calls - 1, script.length - 1)]!;
        return entry(request);
      },
    } as AgentRuntimeDeps['reasoner'],
  };
}

function stubTools(
  behavior: (call: AgentToolCall) => AgentToolResult,
): AgentToolExecutor & { calls: AgentToolCall[] } {
  const calls: AgentToolCall[] = [];
  return {
    calls,
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      calls.push(call);
      return behavior(call);
    },
  };
}

function generousPolicy(): AgentBudgetPolicy {
  return {
    ...defaultAgentBudgetPolicy('HOUR_1'),
    wallTimeMs: 600_000,
    reasonerCalls: 50,
    inputBytes: 50_000_000,
    outputBytes: 50_000_000,
    toolActions: 50,
    candidateCap: 20,
    retries: 20,
    consecutiveFailures: 20,
    providerFailures: 20,
  };
}

function depsFor(
  campaignId: string,
  driver: AgentRuntimeDeps['reasoner'],
  tools: AgentToolExecutor,
  policy?: AgentBudgetPolicy,
  now?: () => number,
): AgentRuntimeDeps {
  return {
    campaignId,
    budgetPolicy: policy ?? generousPolicy(),
    reasoner: driver,
    tools,
    ...(now === undefined ? {} : { now }),
  };
}

function envelopeWith(bytes: string): UntrustedEnvelope {
  return {
    schemaVersion: UNTRUSTED_ENVELOPE_VERSION,
    trust: 'UNTRUSTED',
    source: 'SOURCE_CODE',
    digest: 'untrusted:sha256:0123456789abcdef01234567',
    bytes,
  };
}

function okResponse(intents: unknown[]): ReasonerTurnResponse {
  return {
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: intents as AgentIntent[],
    hypotheses: [],
  };
}

function terminateResponse(): ReasonerTurnResponse {
  return okResponse([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]);
}

function pauseTurn(): ScriptEntry {
  return () => ({
    ok: true,
    response: okResponse([{ kind: 'PAUSE' }]),
    provenance: PROVENANCE,
    stdoutBytes: 60,
    stderrBytes: 5,
  });
}

const REPRO_ARGS = {
  sourcePath: 'src/same.ts',
  sourceEvidenceRef: 'ev:sha256:same',
};

function reproTurn(): ScriptEntry {
  return () => ({
    ok: true,
    response: okResponse([
      { kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: { ...REPRO_ARGS } },
    ]),
    provenance: PROVENANCE,
    stdoutBytes: 120,
    stderrBytes: 4,
  });
}

function completeTurn(): ScriptEntry {
  return () => ({
    ok: true,
    response: terminateResponse(),
    provenance: PROVENANCE,
    stdoutBytes: 70,
    stderrBytes: 8,
  });
}

// ---------------------------------------------------------------------------
// Campaign harness (campaignStrategyMemory.test.ts pattern): fake CLI
// reasoners plus a synthetic reproduction-capable investigation context.
// ---------------------------------------------------------------------------

/** Stateless responder: `decide(req)` returns the response object. */
function decideScript(dir: string, name: string, decide: string): string {
  return writeFake(
    dir,
    name,
    `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const req = JSON.parse(raw);
  const decide = ${decide};
  process.stdout.write(JSON.stringify(decide(req)));
});
`,
  );
}

/**
 * Stateless responder that also appends every received turn request (one JSON
 * object per line) to `captureFile`, so the test can read back exactly what
 * working memory each investigation observed.
 */
function captureDecideScript(
  dir: string,
  name: string,
  captureFile: string,
  decide: string,
): string {
  return writeFake(
    dir,
    name,
    `
import fs from 'node:fs';
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  fs.appendFileSync(${JSON.stringify(captureFile)}, raw + '\\n');
  const req = JSON.parse(raw);
  const decide = ${decide};
  process.stdout.write(JSON.stringify(decide(req)));
});
`,
  );
}

function readRequests(captureFile: string): any[] {
  if (!fs.existsSync(captureFile)) return [];
  return fs
    .readFileSync(captureFile, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function invOf(req: any): number {
  return Number(String(req.campaignId).split(':inv:')[1]);
}

/** All requests for one investigation index, in execution order. */
function requestsForInv(requests: any[], inv: number): any[] {
  return requests.filter((req) => invOf(req) === inv);
}

const TEST_FILES: Record<string, string> = {
  'alpha.ts':
    'export function alpha(input: number): number {\n  const adjustment = 1;\n  return input - adjustment;\n}\n',
  'beta.ts':
    'export function beta(input: number): number {\n  const factor = 2;\n  return input * factor + 1;\n}\n',
  'gamma.ts':
    'export function gamma(items: string[]): string {\n  return items.join(",");\n}\n',
};

interface ReproCapableHandles {
  context: LocalInvestigationContext;
  /** Every source read path, in order. Proves no re-execution across resume. */
  sourceReads: string[];
  /** Every reproduction request received. Proves the provider really ran. */
  reproCalls: unknown[];
}

/**
 * Synthetic reproduction-capable context: a fixed multi-file source index
 * plus a deterministic reproduction provider that records every call it
 * receives. Every other provider is an explicit NOT_CONFIGURED block.
 */
function makeReproCapableContext(
  files: Record<string, string> = TEST_FILES,
): ReproCapableHandles {
  const entries = Object.entries(files).map(([filePath, text]) => ({
    path: filePath,
    repository: 'test-repo',
    relativePath: filePath,
    sourceSha: 'a'.repeat(40),
    language: 'TYPESCRIPT' as const,
    byteCount: Buffer.byteLength(text, 'utf8'),
    contentDigest: sourceContentDigest(text),
  }));
  const blocked = (reason: string) =>
    ({ status: 'BLOCKED' as const, class: 'NOT_CONFIGURED' as const, reason });
  const sourceReads: string[] = [];
  const reproCalls: unknown[] = [];
  const reproduction: DeterministicReproductionProvider = {
    providerId: 'stub-w10-reproduction',
    async run(request) {
      reproCalls.push(request);
      return {
        status: 'AVAILABLE',
        value: {
          verdict: 'NOT_REPRODUCED',
          reasonerVisible: {
            template: 'REPRODUCTION_OBSERVED',
            reproductionId: request.reproductionId,
          },
          evidenceRef: 'ev:stub-w10-alpha',
          provenanceRefs: [request.sourceEvidenceRef],
          preFix: 'NOT_RUN',
          postFix: 'NOT_RUN',
          // Harness-side only: never crosses to the reasoner (session drops
          // it before the envelope). Synthetic marker, no secrets.
          audit: { note: 'stub-w10-synthetic' },
        },
      };
    },
  };
  const context: LocalInvestigationContext = {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass: 'SYNTHETIC_TEST',
    source: {
      providerId: 'test-source',
      async index() {
        return {
          status: 'AVAILABLE' as const,
          value: { entries, total: entries.length, truncated: false },
        };
      },
      async read(target: string) {
        sourceReads.push(target);
        const text = files[target];
        if (text === undefined) return blocked('unknown test path: ' + target);
        const entry = entries.find((item) => item.path === target);
        if (entry === undefined) return blocked('unknown test path: ' + target);
        return { status: 'AVAILABLE' as const, value: { ...entry, text } };
      },
    },
    systemMap: {
      providerId: 'test-system-map',
      async load() {
        return blocked('test context has no system map');
      },
    },
    bugAtlas: {
      providerId: 'test-bug-atlas',
      async load() {
        return blocked('test context has no bug atlas');
      },
    },
    systemAtlas: {
      providerId: 'test-system-atlas',
      async load() {
        return blocked('test context has no system atlas');
      },
    },
    evidence: {
      providerId: 'test-evidence',
      async get() {
        return blocked('test context has no evidence provider');
      },
    },
    reproduction,
  };
  return { context, sourceReads, reproCalls };
}

function campaignInput(
  dir: string,
  campaignId: string,
  script: string,
  extra: Partial<LocalCampaignInput> = {},
): LocalCampaignInput {
  return {
    campaignId,
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [script],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 6,
    stateDirectory: dir,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tool-substrate harness (reasonerCli.test.ts pattern): the real CLI driver
// against deterministic fake CLIs. This is the campaign's per-turn tool
// execution layer: cancellation and timeout must reap the whole process tree.
// ---------------------------------------------------------------------------

function driverFor(
  script: string,
  extraArgs: readonly string[] = [],
  overrides: Partial<CliReasonerConfig> = {},
): ReturnType<typeof createCliReasonerDriver> {
  return createCliReasonerDriver({
    executable: NODE,
    args: [script, ...extraArgs],
    provider: 'test-provider',
    model: 'fake-1',
    killGraceMs: 100,
    stdioGraceMs: 300,
    validationContext: { authorizedEnvironments: [] },
    ...overrides,
  });
}

function callOptions(overrides: Partial<ReasonerCallOptions> = {}): ReasonerCallOptions {
  return {
    timeoutMs: 5_000,
    stdoutByteCap: REASONER_STDOUT_BYTE_CAP,
    stderrByteCap: REASONER_STDERR_BYTE_CAP,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function makeDriverRequest(): ReasonerTurnRequest {
  return {
    schemaVersion: REASONER_TURN_REQUEST_VERSION,
    campaignId: 'camp-w10-resilience',
    turnId: 'turn-0001',
    observation: {
      phase: 'PLAN',
      untrusted: [],
      evidenceRefs: [],
      allowedToolIds: [],
      allowedIntentKinds: [],
      memory: deriveInvestigationMemory({
        schemaVersion: AGENT_RUNTIME_STATE_VERSION,
        campaignId: 'camp-w10-resilience',
        status: 'RUNNING',
        phase: 'PLAN',
        hypotheses: [],
        actionLog: [],
        evidenceRefs: [],
        candidateIds: [],
        knownTargets: [],
        budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
        terminationReason: null,
      }),
    },
    budgetRemaining: {
      policy: defaultAgentBudgetPolicy('HOUR_1'),
      usage: ZERO_AGENT_BUDGET_USAGE,
    },
  };
}

/** Heartbeats stop only when the whole tree is dead; survivors keep writing. */
async function waitForHeartbeatStable(file: string, timeoutMs = 5_000): Promise<number> {
  const start = Date.now();
  let last: number | null = null;
  let stable = 0;
  for (;;) {
    let value: number | null = null;
    try {
      const raw = fs.readFileSync(file, 'utf8').trim();
      const parsed = Number(raw);
      if (Number.isInteger(parsed)) value = parsed;
    } catch {
      value = null;
    }
    if (value !== null && value === last) {
      stable += 1;
      if (stable >= 5) return value;
    } else {
      stable = 0;
      last = value;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`heartbeat never stabilized (last=${last}); the tree survived`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** A heartbeat grandchild plus a parent that spawns it and then sleeps. */
function heartbeatTree(dir: string): { parent: string; heartbeat: string } {
  const heartbeat = path.join(dir, 'tree.hb');
  const sleeper = writeFake(
    dir,
    'sleeper.cjs',
    `
const fs = require('node:fs');
const hb = process.argv[2];
fs.writeFileSync(hb, '0');
let n = 0;
const timer = setInterval(() => { n += 1; try { fs.writeFileSync(hb, String(n)); } catch {} }, 100);
setTimeout(() => { clearInterval(timer); }, 30000);
`,
  );
  const parent = writeFake(
    dir,
    'tree-parent.cjs',
    `
const { spawn } = require('node:child_process');
spawn(process.execPath, ['${sleeper.replace(/\\/g, '\\\\')}', '${heartbeat.replace(/\\/g, '\\\\')}']);
setTimeout(()=>{},30000);
`,
  );
  return { parent, heartbeat };
}

// ---------------------------------------------------------------------------
// 1. Campaign pause/resume preserves strategy for a reproduction-capable
//    campaign: the resumed hunt keeps the pre-pause targets, the pre-pause
//    reproduction is not replayed, and the resumed investigation observes the
//    carried strategy in its own reasoner-visible memory.
// ---------------------------------------------------------------------------

test('campaign pause and resume preserves strategy across the boundary', async () => {
  const dir = scratchDir('nw-w10-strategy-');
  const captureA = path.join(dir, 'requests-a.jsonl');
  const captureB = path.join(dir, 'requests-b.jsonl');
  const handles = makeReproCapableContext();
  // Phase A: inv0 inspects alpha, reproduces it through the real provider,
  // then completes; inv1 inspects beta and pauses on its second turn.
  const phaseA = `(req) => {
    const V = ${JSON.stringify(V)};
    const inv = Number(String(req.campaignId).split(':inv:')[1]);
    const turn = Number(String(req.turnId).split(':turn:')[1]);
    if (inv === 0 && turn === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'alpha.ts' } },
      ] };
    }
    if (inv === 0 && turn === 2) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
          reproductionId: 'w10-repro-alpha-1',
          sourcePath: 'alpha.ts',
          sourceEvidenceRef: req.observation.evidenceRefs[0],
        } },
      ] };
    }
    if (inv === 0) {
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
    }
    if (inv === 1 && turn === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'beta.ts' } },
      ] };
    }
    if (inv === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'PAUSE' }] };
    }
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
  }`;
  const paused = await runLocalCliCampaign(
    campaignInput(dir, 'w10-resilience-strategy', captureDecideScript(dir, 'phase-a.mjs', captureA, phaseA), {
      investigationContext: handles.context,
    }),
  );

  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpointFile).toBeTruthy();
  expect(paused.investigationsStarted).toBe(2);
  expect(paused.investigationsCompleted).toBe(1);
  expect(paused.terminationCounts.PAUSED).toBe(1);
  // The pre-pause strategy already carries the finished investigation, and the
  // reproduction provider genuinely executed once for the grounded target.
  expect(paused.campaignStrategy.inspectedTargets).toContain('alpha.ts');
  expect(paused.campaignStrategy.inspectedTargets).not.toContain('beta.ts');
  expect(paused.campaignStrategy.investigationsCompleted).toBe(1);
  // The NOT_REPRODUCED verdict closed alpha as verified-unproductive: it was
  // inspected and run against the provider, but nothing reproduced, and no
  // hypothesis or candidate was grounded on it. Only REPRODUCED verdicts
  // populate reproducedTargets.
  expect(paused.campaignStrategy.unproductiveTargets).toContain('alpha.ts');
  expect(paused.campaignStrategy.reproducedTargets).not.toContain('alpha.ts');
  expect(handles.reproCalls).toHaveLength(1);
  expect((handles.reproCalls[0] as { sourcePath: string }).sourcePath).toBe('alpha.ts');
  expect(handles.sourceReads.filter((entry) => entry === 'alpha.ts')).toHaveLength(1);
  expect(handles.sourceReads.filter((entry) => entry === 'beta.ts')).toHaveLength(1);

  // Phase B: the resumed investigation finishes, then empty runs stagnate.
  const phaseB = `(req) => {
    const V = ${JSON.stringify(V)};
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
  }`;
  const resumed = await resumeLocalCliCampaign(
    campaignInput(dir, 'w10-resilience-strategy', captureDecideScript(dir, 'phase-b.mjs', captureB, phaseB), {
      maxTurns: 4,
      investigationContext: handles.context,
    }),
  );

  expect(resumed.terminationReason).toBe('NO_PROGRESS');
  // The resumed slot is not recounted as a new start: 2 pre-pause starts plus
  // inv2/3/4, with all five completed.
  expect(resumed.investigationsStarted).toBe(5);
  expect(resumed.investigationsCompleted).toBe(5);
  expect(resumed.terminationCounts.PAUSED).toBe(1);
  expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBe(5);
  // Pre-pause history survived the resume and the resumed work folded in.
  expect(resumed.campaignStrategy.inspectedTargets).toContain('alpha.ts');
  expect(resumed.campaignStrategy.inspectedTargets).toContain('beta.ts');
  expect(resumed.campaignStrategy.investigationsCompleted).toBe(5);
  // The verdict accounting also crossed the boundary precisely: alpha stays
  // closed as unproductive, beta (inspected but never run against the
  // provider) is not smeared into it, and nothing reproduced.
  expect(resumed.campaignStrategy.unproductiveTargets).toContain('alpha.ts');
  expect(resumed.campaignStrategy.unproductiveTargets).not.toContain('beta.ts');
  expect(resumed.campaignStrategy.reproducedTargets).toEqual([]);
  // Nothing was replayed across the boundary: the provider ran once for
  // alpha and beta was read exactly once.
  expect(handles.reproCalls).toHaveLength(1);
  expect(handles.sourceReads.filter((entry) => entry === 'beta.ts')).toHaveLength(1);

  // The resumed investigation itself observed the pre-pause strategy in its
  // reasoner-visible memory.
  const resumedRequests = readRequests(captureB);
  const resumedInv1 = requestsForInv(resumedRequests, 1);
  expect(resumedInv1.length).toBeGreaterThanOrEqual(1);
  expect(resumedInv1[0].observation.memory.campaign.inspectedTargets).toContain('alpha.ts');
  expect(resumedInv1[0].observation.memory.campaign.investigationsCompleted).toBe(1);
});

// ---------------------------------------------------------------------------
// 2a. A W9-era checkpoint (no W10 fields) still loads and resumes. New
//     additive W10 state must never strand an older checkpoint, so the oldest
//     loadable shape is exercised verbatim: any future surface/reproduction
//     keys are stripped when present and the resume must still terminate with
//     its pre-boundary history intact.
// ---------------------------------------------------------------------------

const W10_CANDIDATE_STATE_KEYS = [
  'reproductionSurface',
  'reproductionSurfaceMap',
  'surfaceReadiness',
  'surfaceEntries',
  'surfaceTargets',
  'reproductionCapability',
  'w10YieldMetrics',
  'w10',
] as const;

function stripW10CandidateFields(checkpoint: AgentCheckpoint): number {
  const state = checkpoint.state as unknown as Record<string, unknown>;
  let stripped = 0;
  for (const key of W10_CANDIDATE_STATE_KEYS) {
    if (key in state) {
      delete state[key];
      stripped += 1;
    }
  }
  return stripped;
}


test('a W9-era checkpoint without W10 fields still loads and resumes', async () => {
  const first = scriptDriver([
    () => ({
      ok: true,
      response: okResponse([
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/r.ts' } },
      ]),
      provenance: PROVENANCE,
      stdoutBytes: 400,
      stderrBytes: 20,
    }),
    pauseTurn(),
  ]);
  const executor = stubTools(() => ({
    ok: true,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: ['ev:sha256:w10-era'],
    outputBytes: 250,
    untrusted: [envelopeWith('abc')],
  }));
  const runtime = new AgentRuntime(depsFor('w10-era-checkpoint', first.driver, executor));
  const paused = await runtime.run({ maxTurns: 4 });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpoint).not.toBeNull();

  // Rewind to the W9-era shape: whatever W10 additive state a future codec
  // adds is absent here, and the resume must not need it.
  const era = JSON.parse(JSON.stringify(paused.checkpoint)) as unknown as AgentCheckpoint;
  stripW10CandidateFields(era);
  const parsed = parseCheckpoint(era);
  expect(parsed.state.actionLog).toHaveLength(2);
  expect(parsed.state.evidenceRefs).toContain('ev:sha256:w10-era');

  const second = scriptDriver([completeTurn()]);
  const resumed = AgentRuntime.resumeFromCheckpoint(parsed, depsFor('w10-era-checkpoint', second.driver, executor));
  const finished = await resumed.run({ maxTurns: 4 });
  expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
  // Pre-boundary history is intact and the run continued, not restarted.
  expect(finished.state.actionLog.map((item) => item.resultClass)).toEqual([
    'SOURCE_FILE',
    'PAUSED',
    'TERMINATED_COMPLETE_NO_FINDING',
  ]);
  expect(finished.state.evidenceRefs).toContain('ev:sha256:w10-era');
  expect(second.calls).toBe(1);
});

// ---------------------------------------------------------------------------
// 2b. Older still: a pre-W9/pre-W8 checkpoint (no ledger, no target ledger,
//     no dispositions) resumes with honest legacy carry instead of stranding.
// ---------------------------------------------------------------------------

test('a pre-W9 checkpoint without ledger or dispositions resumes with legacy carry', async () => {
  const first = scriptDriver([
    () => ({
      ok: true,
      response: okResponse([
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/r.ts' } },
      ]),
      provenance: PROVENANCE,
      stdoutBytes: 400,
      stderrBytes: 20,
    }),
    pauseTurn(),
  ]);
  const executor = stubTools(() => ({
    ok: true,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: ['ev:sha256:w10-legacy'],
    outputBytes: 250,
    untrusted: [envelopeWith('abc')],
  }));
  const runtime = new AgentRuntime(depsFor('w10-legacy-checkpoint', first.driver, executor));
  const paused = await runtime.run({ maxTurns: 4 });
  expect(paused.checkpoint).not.toBeNull();
  const usageBefore = { ...paused.state.budget.usage };

  const legacy = JSON.parse(JSON.stringify(paused.checkpoint)) as unknown as Record<string, unknown>;
  const legacyState = legacy['state'] as Record<string, unknown>;
  delete legacyState['byteLedger'];
  delete legacyState['knownTargets'];
  for (const entry of legacyState['actionLog'] as Record<string, unknown>[]) {
    delete entry['target'];
    delete entry['salient'];
    delete entry['disposition'];
  }
  const parsed = parseCheckpoint(legacy);
  expect(parsed.state.byteLedger).toBeUndefined();

  const second = scriptDriver([completeTurn()]);
  const resumed = AgentRuntime.resumeFromCheckpoint(
    parsed,
    depsFor('w10-legacy-checkpoint', second.driver, executor),
  );
  const restored = resumed.snapshot().byteLedger!;
  // Unattributable pre-W9 consumption is carried as legacy, never invented as
  // provider or tool components, and the cumulative totals survive.
  expect(restored.legacyInputBytes).toBe(usageBefore.inputBytes);
  expect(restored.legacyOutputBytes).toBe(usageBefore.outputBytes);
  expect(restored.legacyToolPayloadBytes).toBe(usageBefore.toolPayloadBytes);
  expect(restored.renderedInputBytes).toBe(0);
  expect(restored.toolResultBytes).toBe(0);
  expect(chargedInputBytes(restored)).toBe(usageBefore.inputBytes);
  expect(chargedOutputBytes(restored)).toBe(usageBefore.outputBytes);
  expect(chargedToolPayloadBytes(restored)).toBe(usageBefore.toolPayloadBytes);

  const finished = await resumed.run({ maxTurns: 4 });
  expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
  expect(finished.state.evidenceRefs).toContain('ev:sha256:w10-legacy');
  expect(finished.state.budget.usage.inputBytes).toBe(chargedInputBytes(finished.state.byteLedger!));
  expect(finished.state.budget.usage.outputBytes).toBe(chargedOutputBytes(finished.state.byteLedger!));
});

// ---------------------------------------------------------------------------
// 3. A transient failure's retry budget is NOT reset by a resume: the
//    per-action digest budget survives the boundary, so the same fingerprint
//    exhausts at TRANSIENT_ACTION_RETRY_BUDGET total attempts, not per run.
// ---------------------------------------------------------------------------

test('a transient retry budget survives the pause-resume boundary', async () => {
  const transient = stubTools(() => ({
    ok: false,
    resultClass: 'TRANSIENT_RACE',
    evidenceRefs: [],
    outputBytes: 8,
    untrusted: [],
    disposition: 'TRANSIENT_RETRYABLE',
  }));
  const first = scriptDriver([reproTurn(), pauseTurn()]);
  const runtime = new AgentRuntime(depsFor('w10-transient-budget', first.driver, transient));
  const paused = await runtime.run({ maxTurns: 4 });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpoint).not.toBeNull();
  expect(transient.calls).toHaveLength(1);

  const second = scriptDriver([reproTurn(), reproTurn(), reproTurn(), completeTurn()]);
  const resumed = AgentRuntime.resumeFromCheckpoint(
    paused.checkpoint,
    depsFor('w10-transient-budget', second.driver, transient),
  );
  const finished = await resumed.run({ maxTurns: 6 });

  // Exactly one more execution after the resume: the budget counted the
  // pre-pause attempt, so the third same-fingerprint request is discarded.
  expect(transient.calls).toHaveLength(TRANSIENT_ACTION_RETRY_BUDGET);
  expect(finished.state.actionLog.map((item) => item.resultClass)).toEqual([
    'TOOL_ERROR',
    'PAUSED',
    'TOOL_ERROR',
    'DEDUPED_REPEAT',
    'DEDUPED_REPEAT',
    'TERMINATED_COMPLETE_NO_FINDING',
  ]);
  expect(finished.state.actionLog[0]!.disposition).toBe('TRANSIENT_RETRYABLE');
  expect(finished.state.actionLog[2]!.disposition).toBe('TRANSIENT_RETRYABLE');
  expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
});

// ---------------------------------------------------------------------------
// 4. A deterministic refusal stays exhausted across a resume: one execution,
//    then every repeat is discarded, and the run still reaches its terminal
//    intent instead of spinning on the refused action.
// ---------------------------------------------------------------------------

test('a deterministic refusal stays exhausted across a resume and does not spin', async () => {
  const refused = stubTools(() => ({
    ok: false,
    resultClass: 'REPRODUCTION_REFUSED',
    evidenceRefs: [],
    outputBytes: 8,
    untrusted: [],
  }));
  const first = scriptDriver([reproTurn(), pauseTurn()]);
  const runtime = new AgentRuntime(depsFor('w10-refusal-budget', first.driver, refused));
  const paused = await runtime.run({ maxTurns: 4 });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpoint).not.toBeNull();
  expect(refused.calls).toHaveLength(1);
  expect(paused.state.actionLog[0]!.disposition).toBeUndefined();

  const second = scriptDriver([reproTurn(), reproTurn(), completeTurn()]);
  const resumed = AgentRuntime.resumeFromCheckpoint(
    paused.checkpoint,
    depsFor('w10-refusal-budget', second.driver, refused),
  );
  const finished = await resumed.run({ maxTurns: 6 });

  // No second execution happened after the resume, and the run terminated
  // through its own TERMINATE intent: three post-resume turns, no spin.
  expect(refused.calls).toHaveLength(1);
  expect(second.calls).toBe(3);
  expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
  expect(finished.state.actionLog.map((item) => item.resultClass)).toEqual([
    'TOOL_ERROR',
    'PAUSED',
    'DEDUPED_REPEAT',
    'DEDUPED_REPEAT',
    'TERMINATED_COMPLETE_NO_FINDING',
  ]);
});

// ---------------------------------------------------------------------------
// 5a. Cancellation during tool execution: the run reports CANCELLED with no
//     checkpoint, the in-flight tool cleans up its marker, and the completed
//     work is charged exactly once (no phantom record, no dropped charge).
// ---------------------------------------------------------------------------

test('cancellation during tool execution cleans up and leaves no residue', async () => {
  const dir = scratchDir('nw-w10-cancel-');
  const marker = path.join(dir, 'tool-inflight.marker');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered = false;
  const driver = {
    protocolVersion: 'nightwatch.reasoner-driver.v1',
    transport: 'CLI',
    provenance: PROVENANCE,
    async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
      const turn = request.turnId.match(/:turn:(\d+)$/)?.[1] ?? '1';
      if (turn === '1') {
        return {
          ok: true,
          response: okResponse([
            { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } },
          ]),
          provenance: PROVENANCE,
          stdoutBytes: 100,
          stderrBytes: 0,
        };
      }
      return {
        ok: true,
        response: terminateResponse(),
        provenance: PROVENANCE,
        stdoutBytes: 50,
        stderrBytes: 0,
      };
    },
  } as AgentRuntimeDeps['reasoner'];
  const tools: AgentToolExecutor = {
    async execute(): Promise<AgentToolResult> {
      entered = true;
      fs.writeFileSync(marker, 'inflight');
      try {
        await gate;
        return {
          ok: true,
          resultClass: 'SOURCE_FILE',
          evidenceRefs: ['ev:sha256:cancelled'],
          outputBytes: 10,
          untrusted: [],
        };
      } finally {
        fs.rmSync(marker, { force: true });
      }
    },
  };
  const runtime = new AgentRuntime(depsFor('w10-cancel-cleanup', driver, tools));
  const running = runtime.run({ maxTurns: 4 });
  const deadline = Date.now() + 5_000;
  while (!entered && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  expect(entered).toBe(true);
  runtime.cancel();
  release();
  const result = await running;

  expect(result.terminationReason).toBe('CANCELLED');
  expect(result.checkpoint).toBeNull();
  expect(result.state.status).toBe('TERMINATED');
  // The in-flight tool settled and cleaned up: its marker is gone and its
  // completed work is recorded exactly once.
  expect(fs.existsSync(marker)).toBe(false);
  expect(result.state.actionLog.map((item) => item.resultClass)).toEqual(['SOURCE_FILE']);
  expect(result.state.budget.usage.toolActions).toBe(1);
  expect(result.state.budget.usage.retries).toBe(0);
  expect(result.state.budget.usage.consecutiveFailures).toBe(0);
  // Cancellation is terminal with no resume path: running again fails closed.
  await expect(runtime.run()).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// 5b. Cancellation mid-flight reaps the whole tool process tree: the turn
//     reports CANCELLED and the heartbeat grandchild stops writing.
// ---------------------------------------------------------------------------

test('cancellation mid-flight reaps the tool process tree', async () => {
  const dir = scratchDir('nw-w10-cancel-tree-');
  const { parent, heartbeat } = heartbeatTree(dir);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 500);
  const result = await driverFor(parent).complete(
    makeDriverRequest(),
    callOptions({ timeoutMs: 10_000, signal: controller.signal }),
  );
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('CANCELLED');
  // The grandchild stopped heartbeating: SIGTERM reached the process group.
  expect(await waitForHeartbeatStable(heartbeat)).toBeGreaterThanOrEqual(0);
});

// ---------------------------------------------------------------------------
// 6. A tool timeout kills its process tree and cleans up: the turn reports
//    TIMEOUT, the heartbeat grandchild stops, and the same driver still
//    serves a later fast turn (no wedged internal state).
// ---------------------------------------------------------------------------

test('a tool timeout kills its process tree and cleans up', async () => {
  const dir = scratchDir('nw-w10-timeout-tree-');
  const heartbeat = path.join(dir, 'tree.hb');
  const control = path.join(dir, 'mode.txt');
  const responseFile = path.join(dir, 'response.json');
  fs.writeFileSync(control, 'slow');
  fs.writeFileSync(
    responseFile,
    JSON.stringify({
      schemaVersion: REASONER_TURN_RESPONSE_VERSION,
      intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
      hypotheses: [],
    }),
  );
  const sleeper = writeFake(
    dir,
    'sleeper.cjs',
    `
const fs = require('node:fs');
const hb = process.argv[2];
fs.writeFileSync(hb, '0');
let n = 0;
const timer = setInterval(() => { n += 1; try { fs.writeFileSync(hb, String(n)); } catch {} }, 100);
setTimeout(() => { clearInterval(timer); }, 30000);
`,
  );
  const switchable = writeFake(
    dir,
    'tree-mode.cjs',
    `
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const control = process.argv[2];
const hb = process.argv[3];
const responseFile = process.argv[4];
const sleeper = process.argv[5];
if (fs.readFileSync(control, 'utf8').trim() === 'slow') {
  spawn(process.execPath, [sleeper, hb]);
  setTimeout(()=>{},30000);
} else {
  process.stdout.write(fs.readFileSync(responseFile, 'utf8'));
}
`,
  );
  const driver = driverFor(switchable, [control, heartbeat, responseFile, sleeper]);

  const timedOut = await driver.complete(makeDriverRequest(), callOptions({ timeoutMs: 300 }));
  expect(timedOut.ok).toBe(false);
  if (timedOut.ok) return;
  expect(timedOut.class).toBe('TIMEOUT');
  // The timed-out grandchildren stopped heartbeating: the tree is dead.
  expect(await waitForHeartbeatStable(heartbeat)).toBeGreaterThanOrEqual(0);

  // The driver is still usable: internal timers and handles were cleaned up.
  fs.writeFileSync(control, 'fast');
  const recovered = await driver.complete(makeDriverRequest(), callOptions({ timeoutMs: 5_000 }));
  expect(recovered.ok).toBe(true);
  if (!recovered.ok) return;
  expect(recovered.response.intents[0]).toMatchObject({
    kind: 'TERMINATE',
    reason: 'COMPLETE_NO_FINDING',
  });
});

// ---------------------------------------------------------------------------
// 7. Cumulative byte/call/action/wall budgets are exact across pause-resume:
//    the ledger after resume equals the ledger before plus the new work, with
//    no double counting and no reset. The manual clock makes wall time exact.
// ---------------------------------------------------------------------------

test('cumulative budgets remain exact across a pause-resume cycle', async () => {
  let nowMs = 1_000_000;
  const now = () => nowMs;
  const first = scriptDriver([
    () => {
      nowMs += 100;
      return {
        ok: true,
        response: okResponse([
          { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } },
        ]),
        provenance: PROVENANCE,
        stdoutBytes: 400,
        stderrBytes: 20,
      };
    },
    () => {
      nowMs += 100;
      return {
        ok: true,
        response: okResponse([{ kind: 'PAUSE' }]),
        provenance: PROVENANCE,
        stdoutBytes: 60,
        stderrBytes: 5,
      };
    },
  ]);
  const executor = stubTools(() => ({
    ok: true,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: [],
    outputBytes: 250,
    untrusted: [envelopeWith('abc')],
  }));
  const runtime = new AgentRuntime(depsFor('w10-exact-ledger', first.driver, executor, generousPolicy(), now));
  const paused = await runtime.run({ maxTurns: 4 });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpoint).not.toBeNull();
  const usageBefore = { ...paused.state.budget.usage };
  const ledgerBefore = { ...paused.state.byteLedger! };
  expect(usageBefore.wallTimeMs).toBe(200);
  expect(usageBefore.reasonerCalls).toBe(2);
  expect(usageBefore.toolActions).toBe(1);
  expect(usageBefore.inputBytes).toBe(chargedInputBytes(ledgerBefore));
  expect(usageBefore.outputBytes).toBe(chargedOutputBytes(ledgerBefore));
  expect(usageBefore.toolPayloadBytes).toBe(chargedToolPayloadBytes(ledgerBefore));
  expect(parseCheckpoint(JSON.parse(JSON.stringify(paused.checkpoint))).state.byteLedger).toEqual(
    ledgerBefore,
  );

  const second = scriptDriver([
    () => {
      nowMs += 100;
      return {
        ok: true,
        response: terminateResponse(),
        provenance: PROVENANCE,
        stdoutBytes: 70,
        stderrBytes: 8,
      };
    },
  ]);
  const resumed = AgentRuntime.resumeFromCheckpoint(
    paused.checkpoint,
    depsFor('w10-exact-ledger', second.driver, executor, generousPolicy(), now),
  );
  const finished = await resumed.run({ maxTurns: 4 });
  expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
  const usageAfter = finished.state.budget.usage;
  const ledgerAfter = finished.state.byteLedger!;

  // Calls and actions: exactly the new work added, nothing replayed.
  expect(usageAfter.reasonerCalls).toBe(usageBefore.reasonerCalls + 1);
  expect(usageAfter.toolActions).toBe(usageBefore.toolActions);
  expect(usageAfter.candidateCount).toBe(usageBefore.candidateCount);
  expect(usageAfter.retries).toBe(usageBefore.retries);
  // Wall time: the pre-pause base plus the resumed run, exactly.
  expect(usageAfter.wallTimeMs).toBe(300);
  // Byte components: provider deltas fold in, tool components are untouched,
  // legacy carry stays zero throughout (no invented attribution).
  expect(ledgerAfter.providerResponseBytes).toBe(ledgerBefore.providerResponseBytes + 70);
  expect(ledgerAfter.providerStderrBytes).toBe(ledgerBefore.providerStderrBytes + 8);
  expect(ledgerAfter.toolResultBytes).toBe(ledgerBefore.toolResultBytes);
  expect(ledgerAfter.toolEnvelopeBytes).toBe(ledgerBefore.toolEnvelopeBytes);
  expect(ledgerAfter.renderedInputBytes).toBeGreaterThan(ledgerBefore.renderedInputBytes);
  expect(ledgerAfter.legacyInputBytes).toBe(0);
  expect(ledgerAfter.legacyOutputBytes).toBe(0);
  expect(ledgerAfter.legacyToolPayloadBytes).toBe(0);
  // The frozen totals always reconcile with the component ledger.
  expect(usageAfter.inputBytes).toBe(chargedInputBytes(ledgerAfter));
  expect(usageAfter.outputBytes).toBe(chargedOutputBytes(ledgerAfter));
  expect(usageAfter.toolPayloadBytes).toBe(chargedToolPayloadBytes(ledgerAfter));
});

// ---------------------------------------------------------------------------
// 8. A reproduction-capable campaign never mutates sibling repositories: the
//    sibling identity (top-level entries plus the read-only HEAD of every
//    approved checkout present) is identical before and after the run.
// ---------------------------------------------------------------------------

test('a reproduction-capable campaign leaves sibling repositories untouched', async () => {
  const dir = scratchDir('nw-w10-sibling-');
  const before = snapshotSiblingIdentity();
  const handles = makeReproCapableContext();
  // Only inv0 works; later investigations terminate at once so the campaign
  // reaches stagnation deterministically.
  const decide = `(req) => {
    const V = ${JSON.stringify(V)};
    const inv = Number(String(req.campaignId).split(':inv:')[1]);
    const turn = Number(String(req.turnId).split(':turn:')[1]);
    if (inv === 0 && turn === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'alpha.ts' } },
      ] };
    }
    if (inv === 0 && turn === 2) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
          reproductionId: 'w10-repro-sibling-1',
          sourcePath: 'alpha.ts',
          sourceEvidenceRef: req.observation.evidenceRefs[0],
        } },
      ] };
    }
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
  }`;
  const result = await runLocalCliCampaign(
    campaignInput(dir, 'w10-resilience-sibling', decideScript(dir, 'decide.mjs', decide), {
      investigationContext: handles.context,
    }),
  );

  // The campaign genuinely ran source inspection and reproduction work.
  // inv0 produced new evidence (inspect + reproduction), so stagnation only
  // trips after three further empty investigations: 4 started, 4 completed.
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(CAMPAIGN_STAGNATION_LIMIT + 1);
  expect(result.investigationsCompleted).toBe(CAMPAIGN_STAGNATION_LIMIT + 1);
  expect(result.terminationCounts.COMPLETE_NO_FINDING).toBe(CAMPAIGN_STAGNATION_LIMIT + 1);
  expect(handles.sourceReads).toContain('alpha.ts');
  expect(handles.reproCalls).toHaveLength(1);
  // And the sibling universe is byte-identical to before the run.
  const after = snapshotSiblingIdentity();
  expect(after).toBe(before);
  expect(JSON.parse(after).root).toBe(liveSourceTestRoot());
});
