// M5 task 6.5 (NW-AUD-045, C-06, C-14) — resumed budget conservation and the
// persisted per-investigation turn limit.
//
// Deterministic fake reasoners only. Each fake appends the turn request it
// received to a capture file (argv[2]), exactly like the real-path harness, so
// the budget the runtime was measured against is observable.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REASONER_TURN_RESPONSE_VERSION,
  chargedInputBytes,
  chargedOutputBytes,
  chargedToolPayloadBytes,
  defaultAgentBudgetPolicy,
} from '../../src/core/agentProtocol';
import {
  budgetConservation,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-budget-conservation-'));
  roots.push(root);
  return root;
}

/** Writes each turn request to argv[2]; `body` decides the intents. */
function reasonerSource(body: string): string {
  return `
import fs from 'node:fs';
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  fs.appendFileSync(process.argv[2], raw + '\\n');
  const intents = (${body})(request);
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`;
}

function writeCapture(root: string, name: string, body: string): { readonly script: string; readonly capture: string } {
  const script = path.join(root, `${name}.mjs`);
  const capture = path.join(root, `${name}.jsonl`);
  fs.writeFileSync(script, reasonerSource(body), { mode: 0o700 });
  return { script, capture };
}

interface TurnRequest {
  readonly turnId: string;
  readonly campaignId: string;
  readonly budgetRemaining: {
    readonly policy: Record<string, number>;
    readonly usage: Record<string, number>;
  };
}

function requests(capture: string): TurnRequest[] {
  if (!fs.existsSync(capture)) return [];
  return fs
    .readFileSync(capture, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TurnRequest);
}

const PAUSE_BODY = `(request) => {
  const turn = Number(String(request.turnId).split(':').at(-1));
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  if (inv !== 0) return [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  if (turn === 1) return [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'package.json' } }];
  return [{ kind: 'PAUSE' }];
}`;

/**
 * Never terminates the resumed investigation: only the runtime's turn limit
 * can stop it, so the number of requests measures the limit that applied.
 */
const CONTINUE_BODY = `(request) => {
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  if (inv !== 0) return [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  return [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'package.json' } }];
}`;

test.describe('resumed budget conservation (6.5)', () => {
  test('the resumed investigation is measured against the campaign remainder, not against it twice', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const campaignId = 'camp-budget-conservation';
    const first = writeCapture(root, 'phase-a', PAUSE_BODY);

    const paused = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [first.script, first.capture],
      provider: 'deterministic-test-cli',
      model: 'budget-proof',
      maxTurns: 4,
      stateDirectory,
    });
    expect(paused.terminationReason).toBe('PAUSED');
    const pausedRequests = requests(first.capture);
    expect(pausedRequests.length).toBe(2);
    const totals = pausedRequests[0]?.budgetRemaining.policy as Record<string, number>;
    expect(pausedRequests[0]?.budgetRemaining.usage.reasonerCalls).toBe(0);

    // Phase B: the resume. The runtime restores the paused investigation's own
    // usage, so the policy it sees must be the CAMPAIGN remainder — the
    // in-flight usage must not be subtracted a second time.
    const second = writeCapture(root, 'phase-b', CONTINUE_BODY);
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [second.script, second.capture],
      provider: 'deterministic-test-cli',
      model: 'budget-proof',
      maxTurns: 4,
      stateDirectory,
    });
    expect(['PAUSED', 'NO_PROGRESS']).toContain(resumed.terminationReason);
    const resumedRequests = requests(second.capture);
    expect(resumedRequests.length).toBeGreaterThan(0);
    const firstResumed = resumedRequests[0] as TurnRequest;
    expect(firstResumed.budgetRemaining.usage.reasonerCalls).toBe(2);

    const campaignConsumedBeforeResume = {
      reasonerCalls: paused.reasonerCalls,
      toolActions: paused.toolActionCount,
      inputBytes: chargedInputBytes(paused.byteLedger),
      outputBytes: chargedOutputBytes(paused.byteLedger),
    };
    expect(campaignConsumedBeforeResume.reasonerCalls).toBe(0);
    for (const dimension of ['reasonerCalls', 'toolActions', 'inputBytes', 'outputBytes'] as const) {
      // policy(remaining) + campaign consumed = the campaign total, exactly.
      expect(
        (firstResumed.budgetRemaining.policy[dimension] ?? 0) + (campaignConsumedBeforeResume[dimension] ?? 0),
      ).toBe(totals[dimension]);
    }

    // And the per-dimension conservation arithmetic holds against the policy.
    const policy = defaultAgentBudgetPolicy('HOUR_1');
    const rows = budgetConservation(policy, {
      wallTimeMs: resumed.wallTimeMs,
      reasonerCalls: resumed.reasonerCalls,
      inputBytes: chargedInputBytes(resumed.byteLedger),
      outputBytes: chargedOutputBytes(resumed.byteLedger),
      toolPayloadBytes: chargedToolPayloadBytes(resumed.byteLedger),
      toolActions: resumed.toolActionCount,
      candidateCount: resumed.candidateIds.length,
      failures: 0,
      consecutiveFailures: 0,
      providerFailures: resumed.providerFailures,
    });
    for (const row of rows) {
      expect(row.conserved, `${row.dimension} conservation`).toBe(true);
      expect(row.withinPolicy, `${row.dimension} within policy`).toBe(true);
    }
  });

  test('the persisted per-investigation turn limit wins over the caller at resume', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const campaignId = 'camp-max-turns';
    const first = writeCapture(root, 'limited', PAUSE_BODY);

    const paused = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [first.script, first.capture],
      provider: 'deterministic-test-cli',
      model: 'budget-proof',
      maxTurns: 2,
      stateDirectory,
    });
    expect(paused.terminationReason).toBe('PAUSED');
    const checkpoint = JSON.parse(
      fs.readFileSync(path.join(stateDirectory, `${campaignId}.checkpoint.json`), 'utf8'),
    ) as { readonly campaignProgress?: { readonly maxTurns?: number | null } };
    expect(checkpoint.campaignProgress?.maxTurns).toBe(2);

    // Resume asking for 50 turns: the persisted limit (2, already spent by the
    // prefix) still governs, so no further turn is granted.
    const second = writeCapture(root, 'resume-asks-50', CONTINUE_BODY);
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [second.script, second.capture],
      provider: 'deterministic-test-cli',
      model: 'budget-proof',
      maxTurns: 50,
      stateDirectory,
    });
    // The resumed investigation ran under the PERSISTED limit (2), not the
    // 50 the caller asked for: a caller-supplied limit can never widen the
    // budget a prefix was already counted against.
    const resumedInvestigationTurns = requests(second.capture).filter((request) =>
      String(request.turnId).startsWith(`${campaignId}:inv:0:`),
    );
    expect(resumedInvestigationTurns.length).toBe(2);
    expect(resumed.terminationReason).toBe('NO_PROGRESS');
    // The limited investigation consumed exactly its two persisted turns; the
    // later investigations terminated on their own (no finding).
    expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBeGreaterThanOrEqual(2);
  });
});
