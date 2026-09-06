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

test('print adapter unwraps markdown-fenced JSON inside a text envelope', () => {
  const dir = scratchDir();
  try {
    const fake = path.join(dir, 'print.mjs');
    fs.writeFileSync(
      fake,
      [
        "const fence = '`'.repeat(3);",
        "const body = fence + 'json\\n' + JSON.stringify({",
        `  schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}',`,
        "  intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],",
        "  hypotheses: [],",
        "}) + '\\n' + fence;",
        'process.stdout.write(JSON.stringify({ text: body }));',
      ].join('\n'),
      { mode: 0o700 },
    );
    const request = {
      schemaVersion: REASONER_TURN_REQUEST_VERSION,
      campaignId: 'camp-print-fence',
      turnId: 'camp-print-fence:turn:1',
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

test('print adapter replaces __SESSION_ID__ with a UUID', () => {
  const dir = scratchDir();
  try {
    const fake = path.join(dir, 'print.mjs');
    fs.writeFileSync(
      fake,
      `
const id = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
  process.stderr.write('missing session id');
  process.exit(3);
}
process.stdout.write(JSON.stringify({
  text: JSON.stringify({
    schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}',
    intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
    hypotheses: [],
  }),
}));
`,
      { mode: 0o700 },
    );
    const request = {
      schemaVersion: REASONER_TURN_REQUEST_VERSION,
      campaignId: 'camp-print-session',
      turnId: 'camp-print-session:turn:1',
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
        NIGHTWATCH_PRINT_ARGS: JSON.stringify([fake, '__SESSION_ID__']),
      },
      timeout: 10_000,
      shell: false,
    });
    expect(result.status).toBe(0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('print adapter salvages FORM_HYPOTHESIS without evidenceRefs and drops unknown intents', () => {
  const dir = scratchDir();
  try {
    const fake = path.join(dir, 'print.mjs');
    fs.writeFileSync(
      fake,
      `
process.stdout.write(JSON.stringify({
  text: JSON.stringify({
    schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}',
    intents: [
      { kind: 'SHELL', command: 'rm -rf /' },
      { kind: 'FORM_HYPOTHESIS', hypothesisId: 'Hypothesis 1', statement: 'rounding drifts by a cent' },
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'c1' },
    ],
    hypotheses: 'not-an-array',
  }),
}));
`,
      { mode: 0o700 },
    );
    const request = {
      schemaVersion: REASONER_TURN_REQUEST_VERSION,
      campaignId: 'camp-print-salvage',
      turnId: 'camp-print-salvage:turn:1',
      observation: {
        phase: 'HYPOTHESIZE',
        untrusted: [],
        evidenceRefs: ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'],
        allowedToolIds: [],
        allowedIntentKinds: ['FORM_HYPOTHESIS', 'PROPOSE_CANDIDATE', 'TERMINATE'],
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
    const parsed = JSON.parse(result.stdout) as { intents: Array<{ kind: string; hypothesisId?: string; evidenceRefs?: string[] }>; hypotheses: unknown };
    expect(parsed.intents.map((intent) => intent.kind)).toEqual(['FORM_HYPOTHESIS', 'PROPOSE_CANDIDATE']);
    const [hypothesis, proposal] = parsed.intents;
    expect(hypothesis?.hypothesisId).toBe('Hypothesis-1');
    expect(proposal?.evidenceRefs).toEqual(['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa']);
    expect(parsed.hypotheses).toEqual([]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


