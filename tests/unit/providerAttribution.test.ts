// M5 task 6.6 (C-04) — provider failure is never reported as budget
// exhaustion or as zero yield.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import {
  attributeProviderFailures,
  providerFailureClasses,
} from '../../src/core/agentRuntime/providerAttribution';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-provider-attribution-'));
  roots.push(root);
  return root;
}

function writeScript(root: string, name: string, source: string): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

test.describe('provider failure attribution (6.6)', () => {
  test('the pure attribution tallies persisted per-call classes and derives the class', () => {
    const log = [
      { intentKind: 'REASONER_CALL', resultClass: 'REASONER_CLI_CRASH' },
      { intentKind: 'REASONER_CALL', resultClass: 'DRIVER_THROW' },
      { intentKind: 'REASONER_CALL', resultClass: 'REASONER_TIMEOUT' },
      { intentKind: 'CALL_TOOL', resultClass: 'OK' },
    ];
    expect(providerFailureClasses(log)).toEqual({ CLI_CRASH: 1, DRIVER_THROW: 1, TIMEOUT: 1 });

    // Every paid call failed and no source action ran: BLOCKED, never
    // "zero yield" or "budget exhausted".
    const blocked = attributeProviderFailures({ actionLog: log.slice(0, 3), reasonerCalls: 3, providerFailures: 3 });
    expect(blocked.terminationClass).toBe('PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION');
    expect(blocked.completedCalls).toBe(0);
    expect(blocked.sourceActions).toBe(0);

    // A source action happened: DEGRADED.
    const degraded = attributeProviderFailures({ actionLog: log, reasonerCalls: 4, providerFailures: 3 });
    expect(degraded.terminationClass).toBe('PROVIDER_DEGRADED');
    expect(degraded.sourceActions).toBe(1);

    // No failure at all: a valid provider run.
    const valid = attributeProviderFailures({
      actionLog: [{ intentKind: 'REASONER_CALL', resultClass: 'OK' }, { intentKind: 'CALL_TOOL', resultClass: 'OK' }],
      reasonerCalls: 2,
      providerFailures: 0,
    });
    expect(valid.terminationClass).toBe('VALID_PROVIDER_RUN');
    expect(valid.byClass).toEqual({});

    // A success with no source action is not "blocked": the provider answered.
    const answered = attributeProviderFailures({ actionLog: [], reasonerCalls: 2, providerFailures: 1 });
    expect(answered.terminationClass).toBe('PROVIDER_DEGRADED');
  });

  test('a dead provider is PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION, not budget exhaustion', async () => {
    const root = scratch();
    const dead = writeScript(root, 'dead-provider.mjs', 'process.stderr.write("ERESOLVE provider unreachable\\n");\nprocess.exit(7);\n');
    const result = await runLocalCliCampaign({
      campaignId: 'camp-dead-provider',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [dead],
      provider: 'dead-provider',
      model: 'dead-model',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state'),
    });

    expect(result.providerFailures).toBeGreaterThan(0);
    expect(result.terminationClass).toBe('PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION');
    expect(result.providerAttribution.sourceActions).toBe(0);
    expect(result.providerAttribution.completedCalls).toBe(0);
    expect(Object.keys(result.providerAttribution.byClass)).toContain('NONZERO_EXIT');
    // Never budget exhaustion, never a zero-yield hunt.
    expect(result.terminationReason).toBe('REASONER_FAILURE');
    expect(result.yieldMetrics.reproductionAttempts).toBe(0);
    expect(result.terminationCounts.BUDGET_EXHAUSTED).toBe(0);

    // The checkpoint (kept for the failure) carries the same judgement.
    const checkpointFile = path.join(root, 'state', 'camp-dead-provider.checkpoint.json');
    if (fs.existsSync(checkpointFile)) {
      const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) as {
        readonly campaignProgress?: { readonly providerAttribution?: { readonly terminationClass?: string } };
      };
      expect(document.campaignProgress?.providerAttribution).toBeTruthy();
      expect(document.campaignProgress?.providerAttribution?.terminationClass).toBe(
        'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION',
      );
    }
  });

  test('a degraded provider is reported as degraded and a healthy run as valid', async () => {
    const root = scratch();
    // Turn 1 fails; every later turn answers and inspects one source path.
    const flaky = writeScript(
      root,
      'flaky-provider.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const turn = Number(String(request.turnId).split(':').at(-1));
  if (turn === 1) {
    process.stderr.write('transient provider error\\n');
    process.exit(9);
  }
  const intents = turn === 2
    ? [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'package.json' } }]
    : [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`,
    );
    const degraded = await runLocalCliCampaign({
      campaignId: 'camp-flaky-provider',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [flaky],
      provider: 'flaky-provider',
      model: 'flaky-model',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state-degraded'),
    });
    expect(degraded.providerFailures).toBeGreaterThan(0);
    expect(degraded.terminationClass).toBe('PROVIDER_DEGRADED');
    expect(degraded.providerAttribution.sourceActions).toBeGreaterThan(0);

    const healthy = writeScript(
      root,
      'healthy-provider.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const valid = await runLocalCliCampaign({
      campaignId: 'camp-healthy-provider',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [healthy],
      provider: 'healthy-provider',
      model: 'healthy-model',
      maxTurns: 2,
      stateDirectory: path.join(root, 'state-valid'),
    });
    expect(valid.providerFailures).toBe(0);
    expect(valid.terminationClass).toBe('VALID_PROVIDER_RUN');
    expect(valid.providerAttribution.byClass).toEqual({});
  });
});
