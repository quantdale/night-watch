import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REASONER_TURN_REQUEST_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  defaultAgentBudgetPolicy,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';

const NODE = process.execPath;
const SHIM = path.resolve('bin/nightwatch-reasoner-print.mjs');

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-print-'));
}

test('print adapter unwraps a text envelope into a Nightwatch turn response', () => {
  const dir = scratchDir();
  try {
    const fake = path.join(dir, 'print.mjs');
    fs.writeFileSync(
      fake,
      `
const body = JSON.stringify({
  schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}',
  intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
  hypotheses: [],
});
process.stdout.write(JSON.stringify({ text: body }));
`,
      { mode: 0o700 },
    );
    const request = {
      schemaVersion: REASONER_TURN_REQUEST_VERSION,
      campaignId: 'camp-print',
      turnId: 'camp-print:turn:1',
      observation: {
        phase: 'PLAN',
        untrusted: [],
        evidenceRefs: [],
        allowedToolIds: [],
        allowedIntentKinds: ['TERMINATE'],
      },
      budgetRemaining: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
    };
    const result = spawnSync(NODE, [SHIM], {
      encoding: 'utf8',
      input: JSON.stringify(request),
      env: {
        ...process.env,
        NIGHTWATCH_PRINT_CLI: NODE,
        NIGHTWATCH_PRINT_ARGS: JSON.stringify([fake]),
      },
      timeout: 10_000,
      shell: false,
    });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.schemaVersion).toBe(REASONER_TURN_RESPONSE_VERSION);
    expect(parsed.intents).toEqual([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('campaign run through the print adapter admits no finding', async () => {
  const dir = scratchDir();
  const previousCli = process.env.NIGHTWATCH_PRINT_CLI;
  const previousArgs = process.env.NIGHTWATCH_PRINT_ARGS;
  try {
    const fake = path.join(dir, 'print.mjs');
    fs.writeFileSync(
      fake,
      `
const body = JSON.stringify({
  schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}',
  intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
  hypotheses: [],
});
process.stdout.write(JSON.stringify({ text: body }));
`,
      { mode: 0o700 },
    );
    process.env.NIGHTWATCH_PRINT_CLI = NODE;
    process.env.NIGHTWATCH_PRINT_ARGS = JSON.stringify([fake]);
    const result = await runLocalCliCampaign({
      campaignId: 'camp-print-run',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [SHIM],
      provider: 'test-provider',
      model: 'fake-print',
      maxTurns: 3,
      stateDirectory: dir,
    });
    expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(result.candidateIds).toEqual([]);
  } finally {
    if (previousCli === undefined) delete process.env.NIGHTWATCH_PRINT_CLI;
    else process.env.NIGHTWATCH_PRINT_CLI = previousCli;
    if (previousArgs === undefined) delete process.env.NIGHTWATCH_PRINT_ARGS;
    else process.env.NIGHTWATCH_PRINT_ARGS = previousArgs;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
