// Campaign strategy memory: a fresh investigation must not start as if the
// campaign had never investigated anything before.
//
// Drives runLocalCliCampaign/resumeLocalCliCampaign with out-of-process fake
// CLI reasoners and an injected in-test LocalInvestigationContext whose source
// provider serves a fixed multi-file index (every other provider is an
// explicit NOT_CONFIGURED block). Deterministic fakes only: no subscription,
// no network, no sibling writes.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REASONER_TURN_RESPONSE_VERSION,
  type AgentCheckpoint,
} from '../../src/core/agentProtocol';
import { assertCheckpointHasNoSecrets } from '../../src/core/agentRuntime/checkpoint';
import {
  loadLocalCampaignCheckpoint,
  runLocalCliCampaign,
  resumeLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
  type LocalInvestigationContext,
} from '../../src/core/localInvestigation/types';
import { sourceContentDigest } from '../../src/core/source/scanTypes';
import {
  CAMPAIGN_STRATEGY_STATE_VERSION,
  MEMORY_CAPS,
} from '../../src/core/investigationMemory/types';
import {
  emptyCampaignStrategyState,
  parseCampaignStrategyState,
} from '../../src/core/investigationMemory/derive';

const NODE = process.execPath;
const V = REASONER_TURN_RESPONSE_VERSION;

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-campaign-strategy-'));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

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
function captureDecideScript(dir: string, name: string, captureFile: string, decide: string): string {
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

/** First request observed for each investigation index, in execution order. */
function firstByInv(requests: any[]): Map<number, any> {
  const out = new Map<number, any>();
  for (const req of requests) {
    const inv = invOf(req);
    if (!out.has(inv)) out.set(inv, req);
  }
  return out;
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

/**
 * Minimal createLocalInvestigationToolSession-compatible context: a fixed
 * multi-file source index plus one approved bounded file per path; every
 * other provider is an explicit NOT_CONFIGURED block.
 */
function makeTestContext(files: Record<string, string> = TEST_FILES): LocalInvestigationContext {
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
  return {
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
    reproduction: {
      providerId: 'test-reproduction',
      async run() {
        return blocked('test context has no reproduction provider');
      },
    },
  };
}

function inspectThenTerminate(targetForInv: string): string {
  return `(req) => {
    const V = ${JSON.stringify(V)};
    const inv = Number(String(req.campaignId).split(':inv:')[1]);
    const turn = Number(String(req.turnId).split(':turn:')[1]);
    const table = ${targetForInv};
    const target = table[String(inv)] ?? null;
    if (target !== null && turn === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: target } },
      ] };
    }
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
  }`;
}

test('second investigation receives campaign memory and the strategy accumulates', async () => {
  const dir = scratchDir();
  const capture = path.join(dir, 'requests.jsonl');
  // inv0 inspects alpha, inv1 inspects beta, the rest terminate empty: two
  // evidence-bearing investigations followed by exactly three empties, so the
  // campaign stops at NO_PROGRESS after five investigations.
  const decide = inspectThenTerminate(`{ '0': 'alpha.ts', '1': 'beta.ts' }`);
  const result = await runLocalCliCampaign({
    campaignId: 'camp-strategy-handover',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [captureDecideScript(dir, 'reasoner.mjs', capture, decide)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: makeTestContext(),
  });

  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(5);
  expect(result.investigationsCompleted).toBe(5);

  // The accumulated strategy is observable on the result itself.
  const strategy = result.campaignStrategy;
  expect(strategy.schemaVersion).toBe(CAMPAIGN_STRATEGY_STATE_VERSION);
  expect(strategy.campaignId).toBe('camp-strategy-handover');
  expect(strategy.investigationsCompleted).toBe(5);
  expect(strategy.inspectedTargets).toContain('alpha.ts');
  expect(strategy.inspectedTargets).toContain('beta.ts');
  expect(strategy.inspectedTargets.length).toBeLessThanOrEqual(MEMORY_CAPS.campaignTargets);
  expect(strategy.priorOutcomes.length).toBeLessThanOrEqual(MEMORY_CAPS.priorInvestigations);
  expect(strategy.candidateIds.length).toBeLessThanOrEqual(MEMORY_CAPS.candidateIds);

  // Prior outcomes carry the real termination reasons and the per-run yield.
  expect(strategy.priorOutcomes).toHaveLength(5);
  for (const outcome of strategy.priorOutcomes) {
    expect(outcome.terminationReason).toBe('COMPLETE_NO_FINDING');
  }
  expect(strategy.priorOutcomes[0]?.investigationId).toContain(':inv:0');
  expect(strategy.priorOutcomes[0]?.newEvidence).toBe(1);
  expect(strategy.priorOutcomes[1]?.newEvidence).toBe(1);
  expect(strategy.priorOutcomes[2]?.newEvidence).toBe(0);
  expect(strategy.priorOutcomes[2]?.newCandidates).toBe(0);

  // Only the three consecutive empty investigations count as stagnant: the
  // two evidence-bearing runs reset the streak.
  expect(strategy.stagnantInvestigations).toBe(3);

  // The fake recorded every turn request: prove what each fresh investigation
  // actually observed in its reasoner-visible memory.
  const requests = readRequests(capture);
  expect(requests.length).toBeGreaterThan(5);
  const first = firstByInv(requests);

  const inv0 = first.get(0);
  expect(inv0.observation.memory.campaign.investigationsCompleted).toBe(0);
  expect(inv0.observation.memory.campaign.inspectedTargets).toEqual([]);

  const inv1 = first.get(1);
  expect(inv1.observation.memory.campaign.investigationsCompleted).toBe(1);
  expect(inv1.observation.memory.campaign.inspectedTargets).toContain('alpha.ts');
  expect(inv1.observation.memory.campaign.inspectedTargets).not.toContain('beta.ts');
  expect(inv1.observation.memory.campaign.priorOutcomes).toHaveLength(1);
  expect(inv1.observation.memory.campaign.priorOutcomes[0].terminationReason).toBe(
    'COMPLETE_NO_FINDING',
  );

  // Investigation-local ledgers stay separate from campaign-level history: a
  // fresh investigation has seen nothing itself even though the campaign has.
  const localTargets = (inv1.observation.memory.inspectedTargets as any[]).map(
    (item) => item.target,
  );
  expect(localTargets).not.toContain('alpha.ts');

  // Stagnation as observed by later investigations: inv2 still sees a clean
  // streak (inv1 gained evidence), then the empty runs accumulate.
  expect(first.get(2).observation.memory.campaign.stagnantInvestigations).toBe(0);
  expect(first.get(3).observation.memory.campaign.stagnantInvestigations).toBe(1);
  expect(first.get(4).observation.memory.campaign.stagnantInvestigations).toBe(2);
});

test('a deliberate revisit of a campaign-inspected target still executes', async () => {
  const dir = scratchDir();
  const capture = path.join(dir, 'requests.jsonl');
  // Both investigations inspect the SAME target: campaign memory will name
  // alpha.ts as already inspected, and the second run must still execute.
  const decide = inspectThenTerminate(`{ '0': 'alpha.ts', '1': 'alpha.ts' }`);
  const result = await runLocalCliCampaign({
    campaignId: 'camp-strategy-revisit',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [captureDecideScript(dir, 'reasoner.mjs', capture, decide)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: makeTestContext(),
  });

  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.terminationCounts.SAFETY_BLOCKED ?? 0).toBe(0);
  expect(result.campaignStrategy.inspectedTargets).toContain('alpha.ts');

  const requests = readRequests(capture);
  const first = firstByInv(requests);
  // Guidance was present: the second investigation could see alpha.ts in its
  // campaign history before choosing to re-inspect it.
  expect(first.get(1).observation.memory.campaign.inspectedTargets).toContain('alpha.ts');

  // The revisit executed normally instead of being host-blocked: the next
  // turn of the same investigation observes fresh evidence and a grounded
  // local ledger entry for the revisited target.
  const inv1Turns = requestsForInv(requests, 1);
  expect(inv1Turns.length).toBeGreaterThanOrEqual(2);
  const afterRevisit = inv1Turns[1];
  expect((afterRevisit.observation.evidenceRefs as unknown[]).length).toBeGreaterThan(0);
  const revisited = (afterRevisit.observation.memory.inspectedTargets as any[]).find(
    (item) => item.target === 'alpha.ts',
  );
  expect(revisited).toBeTruthy();
  expect(typeof revisited.evidenceRef).toBe('string');
  expect(revisited.evidenceRef).not.toBeNull();
});

test('pause and resume preserves the campaign strategy without double counting', async () => {
  const dir = scratchDir();
  const captureA = path.join(dir, 'requests-a.jsonl');
  const captureB = path.join(dir, 'requests-b.jsonl');
  // Phase A: inv0 inspects alpha and completes; inv1 inspects beta, then
  // pauses on its second turn.
  const phaseA = `(req) => {
    const V = ${JSON.stringify(V)};
    const inv = Number(String(req.campaignId).split(':inv:')[1]);
    const turn = Number(String(req.turnId).split(':turn:')[1]);
    if (inv === 0) {
      if (turn === 1) {
        return { schemaVersion: V, hypotheses: [], intents: [
          { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'alpha.ts' } },
        ] };
      }
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
  const paused = await runLocalCliCampaign({
    campaignId: 'camp-strategy-pause',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [captureDecideScript(dir, 'phase-a.mjs', captureA, phaseA)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 5,
    stateDirectory: dir,
    investigationContext: makeTestContext(),
  });

  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpointFile).toBeTruthy();
  // The paused investigation counts as started but not completed.
  expect(paused.investigationsStarted).toBe(2);
  expect(paused.investigationsCompleted).toBe(1);
  expect(paused.terminationCounts.PAUSED).toBe(1);
  // The pre-pause strategy already carries the finished investigation.
  expect(paused.campaignStrategy.inspectedTargets).toContain('alpha.ts');
  expect(paused.campaignStrategy.investigationsCompleted).toBe(1);

  // Phase B: the resumed investigation finishes, then empty runs stagnate.
  const phaseB = `(req) => {
    const V = ${JSON.stringify(V)};
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
  }`;
  const resumed = await resumeLocalCliCampaign({
    campaignId: 'camp-strategy-pause',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [captureDecideScript(dir, 'phase-b.mjs', captureB, phaseB)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: makeTestContext(),
  });

  expect(resumed.terminationReason).toBe('NO_PROGRESS');
  // The resumed slot is not recounted as a new start: 2 pre-pause starts plus
  // inv2/3/4, with all five completed.
  expect(resumed.investigationsStarted).toBe(5);
  expect(resumed.investigationsCompleted).toBe(5);
  expect(resumed.terminationCounts.PAUSED).toBe(1);
  // inv0 completed pre-pause, so its COMPLETE_NO_FINDING counts as well.
  expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBe(5);
  // Pre-pause history survived the resume and the resumed work folded in.
  expect(resumed.campaignStrategy.inspectedTargets).toContain('alpha.ts');
  expect(resumed.campaignStrategy.inspectedTargets).toContain('beta.ts');
  expect(resumed.campaignStrategy.investigationsCompleted).toBe(5);

  // The resumed investigation itself observed the pre-pause strategy in its
  // reasoner-visible memory.
  const resumedRequests = readRequests(captureB);
  const resumedInv1 = requestsForInv(resumedRequests, 1);
  expect(resumedInv1.length).toBeGreaterThanOrEqual(1);
  expect(resumedInv1[0].observation.memory.campaign.inspectedTargets).toContain('alpha.ts');
  expect(resumedInv1[0].observation.memory.campaign.investigationsCompleted).toBe(1);
});

test('a corrupt persisted strategy resumes with an empty strategy instead of throwing', async () => {
  const corruptions: ReadonlyArray<{ readonly name: string; readonly mutate: (strategy: any) => void }> = [
    {
      name: 'wrong schemaVersion',
      mutate: (strategy: any) => {
        strategy.schemaVersion = 'nightwatch.campaign-strategy-state.v999';
      },
    },
    {
      name: 'mismatched campaignId',
      mutate: (strategy: any) => {
        strategy.campaignId = 'some-other-campaign';
      },
    },
    {
      name: 'over-cap inspectedTargets',
      mutate: (strategy: any) => {
        strategy.inspectedTargets = Array.from(
          { length: MEMORY_CAPS.campaignTargets + 1 },
          (_, index) => 'file-' + index + '.ts',
        );
      },
    },
  ];

  let variant = 0;
  for (const corruption of corruptions) {
    const dir = scratchDir();
    const campaignId = 'camp-strategy-corrupt-' + variant;
    variant += 1;

    // Phase A: inv0 inspects alpha and completes; inv1 pauses immediately so
    // the persisted strategy is exactly the finished inv0 (non-empty).
    const phaseA = `(req) => {
      const V = ${JSON.stringify(V)};
      const inv = Number(String(req.campaignId).split(':inv:')[1]);
      const turn = Number(String(req.turnId).split(':turn:')[1]);
      if (inv === 0 && turn === 1) {
        return { schemaVersion: V, hypotheses: [], intents: [
          { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'alpha.ts' } },
        ] };
      }
      if (inv === 0) {
        return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
      }
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'PAUSE' }] };
    }`;
    const paused = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [decideScript(dir, 'phase-a-' + campaignId + '.mjs', phaseA)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 3,
      stateDirectory: dir,
      investigationContext: makeTestContext(),
    });
    expect(paused.terminationReason).toBe('PAUSED');
    expect(paused.checkpointFile).toBeTruthy();
    expect(paused.campaignStrategy.inspectedTargets).toContain(
      'alpha.ts',
    );

    // Corrupt only the strategy inside the persisted resume envelope.
    const checkpointFile = paused.checkpointFile as string;
    const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
    corruption.mutate(document.campaignProgress.strategy);
    fs.writeFileSync(checkpointFile, JSON.stringify(document));
    expect(
      parseCampaignStrategyState(document.campaignProgress.strategy, campaignId),
      corruption.name,
    ).toBeNull();

    // Resume must not throw and must not inject the unvalidated state: every
    // post-resume investigation terminates empty, so a discarded pre-pause
    // strategy leaves the final inspected ledger empty of alpha.ts.
    const capture = path.join(dir, 'requests-resume.jsonl');
    const phaseB = `(req) => {
      const V = ${JSON.stringify(V)};
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
    }`;
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [captureDecideScript(dir, 'phase-b-' + campaignId + '.mjs', capture, phaseB)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 2,
      stateDirectory: dir,
      investigationContext: makeTestContext(),
    });

    expect(resumed.terminationReason, corruption.name).toBe('NO_PROGRESS');
    // Campaign counters are preserved through the progress envelope even
    // though the strategy itself restarted: inv0 pre-pause plus the three
    // post-resume empties (inv1-resumed is the first of the three
    // consecutive empties that trip stagnation).
    expect(resumed.investigationsStarted).toBe(4);
    expect(resumed.investigationsCompleted).toBe(4);
    expect(resumed.campaignStrategy.inspectedTargets, corruption.name).not.toContain('alpha.ts');
    expect(resumed.campaignStrategy.inspectedTargets, corruption.name).toEqual([]);
    // Three post-resume completions folded into a strategy that restarted at
    // zero (the corrupt pre-pause entry was dropped, not injected).
    expect(resumed.campaignStrategy.investigationsCompleted).toBe(3);
    expect(resumed.campaignStrategy.priorOutcomes).toHaveLength(3);

    const resumedRequests = readRequests(capture);
    const resumedInv1 = requestsForInv(resumedRequests, 1);
    expect(resumedInv1.length, corruption.name).toBeGreaterThanOrEqual(1);
    expect(
      resumedInv1[0].observation.memory.campaign.inspectedTargets,
      corruption.name,
    ).toEqual([]);
    expect(
      resumedInv1[0].observation.memory.campaign.investigationsCompleted,
      corruption.name,
    ).toBe(0);
  }
});

test('secret-shaped strategy material is rejected fail-closed', async () => {
  const AKIA = 'AKIAIOSFODNN7EXAMPLE';
  const clean = {
    schemaVersion: 'nightwatch.agent-checkpoint.v1',
    campaignId: 'camp-secret-guard',
    state: { candidateIds: ['c1'] },
    resumeCursor: 'camp-secret-guard:turn:0',
  };

  // A clean checkpoint passes the guard.
  expect(() =>
    assertCheckpointHasNoSecrets(clean as unknown as AgentCheckpoint),
  ).not.toThrow();

  // Secret-shaped values anywhere in the serialized checkpoint are rejected,
  // including inside a campaign-strategy-shaped nested envelope (the shape
  // buildCampaignCheckpoint persists alongside the strategy).
  expect(() =>
    assertCheckpointHasNoSecrets(
      { ...clean, state: { candidateIds: [AKIA] } } as unknown as AgentCheckpoint,
    ),
  ).toThrow(/SECRET_DETECTED/);
  expect(() =>
    assertCheckpointHasNoSecrets(
      {
        ...clean,
        campaignProgress: {
          version: 'nightwatch.local-cli-campaign-progress.v1',
          strategy: {
            ...emptyCampaignStrategyState('camp-secret-guard'),
            candidateIds: [AKIA],
          },
        },
      } as unknown as AgentCheckpoint,
    ),
  ).toThrow(/SECRET_DETECTED/);

  // And the strategy parser itself degrades secret-shaped entries to "no
  // strategy" rather than injecting them into a reasoner request.
  expect(
    parseCampaignStrategyState(
      { ...emptyCampaignStrategyState('camp-secret-guard'), candidateIds: [AKIA] },
      'camp-secret-guard',
    ),
  ).toBeNull();
  expect(
    parseCampaignStrategyState(
      {
        ...emptyCampaignStrategyState('camp-secret-guard'),
        inspectedTargets: ['Bearer abcdefghij1234567890'],
      },
      'camp-secret-guard',
    ),
  ).toBeNull();

  // End to end: secret-shaped model output never reaches persisted state.
  // The transport classifies the smuggling turn as SECRET_ECHO before any
  // intent is recorded, so the candidate is never admitted and the campaign
  // pauses cleanly with a secret-free checkpoint and strategy.
  const dir = scratchDir();
  const smuggle = `(req) => {
    const V = ${JSON.stringify(V)};
    const turn = Number(String(req.turnId).split(':turn:')[1]);
    if (turn === 1) {
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'PROPOSE_CANDIDATE', candidateId: ${JSON.stringify(AKIA)}, evidenceRefs: ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'] },
      ] };
    }
    return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'PAUSE' }] };
  }`;
  const result = await runLocalCliCampaign({
    campaignId: 'camp-strategy-secret-e2e',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [decideScript(dir, 'smuggle.mjs', smuggle)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: makeTestContext(),
  });
  expect(result.terminationReason).toBe('PAUSED');
  expect(result.checkpointFile).toBeTruthy();
  // The smuggled candidate was never admitted anywhere.
  expect(result.candidateIds).not.toContain(AKIA);
  expect(JSON.stringify(result.campaignStrategy)).not.toContain(AKIA);
  expect(result.campaignStrategy.candidateIds).toEqual([]);
  // The persisted checkpoint carries no secret bytes either, and loading it
  // re-validates: a secret-bearing file would throw here.
  const rawCheckpoint = fs.readFileSync(result.checkpointFile as string, 'utf8');
  expect(rawCheckpoint).not.toContain(AKIA);
  expect(() =>
    loadLocalCampaignCheckpoint('camp-strategy-secret-e2e', dir),
  ).not.toThrow();
});
