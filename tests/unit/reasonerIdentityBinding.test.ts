// M5 task 6.4 (NW-AUD-044, C-05) — the reasoner identity binding.
// Deterministic fixtures only: a fake stdin/stdout reasoner, real digests of
// real files in a temp root, and a stored checkpoint flipped by the test.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  ReasonerExecutableError,
  resolveReasonerRuntimeIdentity,
} from '../../src/core/config/reasonerExecutable';
import {
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-reasoner-identity-'));
  roots.push(root);
  return root;
}

const PAUSE_SOURCE = `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  const turn = Number(String(request.turnId).split(':').at(-1));
  const intents = inv === 0 && turn <= 1
    ? [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'package.json' } }]
    : inv === 0
      ? [{ kind: 'PAUSE' }]
      : [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`;

function writePauseReasoner(root: string): string {
  const file = path.join(root, 'pause-reasoner.mjs');
  fs.writeFileSync(file, PAUSE_SOURCE, { mode: 0o700 });
  return file;
}

async function pauseCampaign(root: string, campaignId: string) {
  const stateDirectory = path.join(root, 'state');
  const reasonerIdentity = resolveReasonerRuntimeIdentity({
    executable: process.execPath,
    provider: 'deterministic-test-cli',
    model: 'identity-proof',
  });
  const paused = await runLocalCliCampaign({
    campaignId,
    ceilingName: 'HOUR_1',
    executable: process.execPath,
    reasonerIdentity: {
      path: reasonerIdentity.executablePath,
      digest: reasonerIdentity.executableDigest,
      provider: reasonerIdentity.provider,
      model: reasonerIdentity.model,
      identityDigest: reasonerIdentity.identityDigest,
    },
    args: [writePauseReasoner(root)],
    provider: reasonerIdentity.provider,
    model: reasonerIdentity.model,
    maxTurns: 6,
    stateDirectory,
  });
  expect(paused.terminationReason).toBe('PAUSED');
  return { stateDirectory, reasonerIdentity, args: [writePauseReasoner(root)] };
}

function outcomeFor(result: unknown): string {
  const value = result as { readonly reasonerIdentity?: { readonly identityDigest?: string | null } | null };
  return value.reasonerIdentity?.identityDigest ?? 'NONE';
}

test.describe('reasoner runtime identity (6.4)', () => {
  test('digests the executable, adapter, print CLI and PRINT_ARGS, and content-addresses the whole identity', () => {
    const root = scratch();
    const adapter = path.join(root, 'adapter.mjs');
    fs.writeFileSync(adapter, 'export const adapter = 1;\n', { mode: 0o700 });

    const base = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: adapter,
      printCli: process.execPath,
      printArgs: '--model=gpt-x --print',
      provider: 'openai',
      model: 'gpt-x',
    });
    const again = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: adapter,
      printCli: process.execPath,
      printArgs: '--model=gpt-x --print',
      provider: 'openai',
      model: 'gpt-x',
    });
    expect(base.identityDigest).toBe(again.identityDigest);
    expect(base.identityDigest).toMatch(/^rid:sha256:[0-9a-f]{24}$/);
    expect(base.printArgsDigest).toMatch(/^rpa:sha256:[0-9a-f]{24}$/);
    expect(base.executableDigest).toBe(again.executableDigest);

    // Every dimension moves the identity.
    const changedModel = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: adapter,
      printCli: process.execPath,
      printArgs: '--model=gpt-x --print',
      provider: 'openai',
      model: 'gpt-y',
    });
    expect(changedModel.identityDigest).not.toBe(base.identityDigest);

    const changedArgs = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: adapter,
      printCli: process.execPath,
      printArgs: '--model=gpt-x --print --verbose',
      provider: 'openai',
      model: 'gpt-x',
    });
    expect(changedArgs.identityDigest).not.toBe(base.identityDigest);
    expect(changedArgs.printArgsDigest).not.toBe(base.printArgsDigest);

    fs.writeFileSync(adapter, 'export const adapter = 2;\n', { mode: 0o700 });
    const changedAdapter = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: adapter,
      printCli: process.execPath,
      printArgs: '--model=gpt-x --print',
      provider: 'openai',
      model: 'gpt-x',
    });
    expect(changedAdapter.identityDigest).not.toBe(base.identityDigest);

    // An unresolvable component is reported as absent, never faked.
    const missing = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      adapterPath: path.join(root, 'does-not-exist.mjs'),
      printCli: 'definitely-not-installed-cli',
      printArgs: null,
      provider: null,
      model: null,
    });
    expect(missing.adapterDigest).toBeNull();
    expect(missing.printCliDigest).toBeNull();
    expect(missing.printArgsDigest).toBeNull();
    expect(missing.provider).toBe('configured');
    expect(missing.model).toBe('configured');

    // A label that cannot be represented refuses before any process exists.
    expect(() =>
      resolveReasonerRuntimeIdentity({ executable: process.execPath, model: 'has spaces' }),
    ).toThrow(ReasonerExecutableError);
  });

  test('a resume under a changed identity refuses before any turn', async () => {
    const root = scratch();
    const campaignId = 'camp-identity-binding';
    const { stateDirectory, args } = await pauseCampaign(root, campaignId);

    const changed = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      provider: 'deterministic-test-cli',
      model: 'different-model',
    });
    await expect(
      resumeLocalCliCampaign({
        campaignId,
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        reasonerIdentity: {
          path: changed.executablePath,
          digest: changed.executableDigest,
          model: changed.model,
          identityDigest: changed.identityDigest,
        },
        args,
        provider: changed.provider,
        model: changed.model,
        maxTurns: 6,
        stateDirectory,
      }),
    ).rejects.toThrow(/REASONER_IDENTITY_MISMATCH/);

    // A resume that carries no identity at all against a bound checkpoint is
    // refused too: the campaign would otherwise run unattributable.
    await expect(
      resumeLocalCliCampaign({
        campaignId,
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args,
        provider: 'deterministic-test-cli',
        model: 'identity-proof',
        maxTurns: 6,
        stateDirectory,
      }),
    ).rejects.toThrow(/REASONER_IDENTITY_MISMATCH/);

    // The refusal left the checkpoint intact for the correct identity.
    const stored = JSON.parse(
      fs.readFileSync(path.join(stateDirectory, `${campaignId}.checkpoint.json`), 'utf8'),
    ) as { readonly campaignProgress?: { readonly reasonerIdentity?: unknown } };
    expect(stored.campaignProgress?.reasonerIdentity).toBeTruthy();
  });

  test('a resume under the identical identity continues the campaign', async () => {
    const root = scratch();
    const campaignId = 'camp-identity-same';
    const { stateDirectory, reasonerIdentity, args } = await pauseCampaign(root, campaignId);

    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      reasonerIdentity: {
        path: reasonerIdentity.executablePath,
        digest: reasonerIdentity.executableDigest,
        provider: reasonerIdentity.provider,
        model: reasonerIdentity.model,
        identityDigest: reasonerIdentity.identityDigest,
      },
      args,
      provider: reasonerIdentity.provider,
      model: reasonerIdentity.model,
      maxTurns: 6,
      stateDirectory,
    });
    expect(['NO_PROGRESS', 'PAUSED']).toContain(resumed.terminationReason);
    // The resumed investigation paused again under its own script — the point
    // is that it RAN (a turn was absorbed) instead of being refused.
    expect(resumed.terminationCounts.PAUSED).toBeGreaterThanOrEqual(1);
  });

  test('a legacy checkpoint binds only the path and digest it recorded', async () => {
    const root = scratch();
    const campaignId = 'camp-identity-legacy';
    const { stateDirectory, reasonerIdentity, args } = await pauseCampaign(root, campaignId);

    // Legacy shape: campaignProgress.reasonerIdentity carries only path+digest.
    const file = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    const document = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const progress = document.campaignProgress as Record<string, unknown>;
    progress.reasonerIdentity = {
      path: reasonerIdentity.executablePath,
      digest: reasonerIdentity.executableDigest,
    };
    fs.writeFileSync(file, JSON.stringify(document, null, 2));

    const differentModel = resolveReasonerRuntimeIdentity({
      executable: process.execPath,
      provider: 'deterministic-test-cli',
      model: 'some-other-model',
    });
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      reasonerIdentity: {
        path: differentModel.executablePath,
        digest: differentModel.executableDigest,
        model: differentModel.model,
        identityDigest: differentModel.identityDigest,
      },
      args,
      provider: differentModel.provider,
      model: differentModel.model,
      maxTurns: 6,
      stateDirectory,
    });
    expect(['NO_PROGRESS', 'PAUSED']).toContain(resumed.terminationReason);

    // …but a DIFFERENT executable digest is still refused.
    await expect(
      resumeLocalCliCampaign({
        campaignId,
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        reasonerIdentity: { path: process.execPath, digest: `sha256:${'0'.repeat(64)}` },
        args,
        provider: 'deterministic-test-cli',
        model: 'identity-proof',
        maxTurns: 6,
        stateDirectory,
      }),
    ).rejects.toThrow(/REASONER_IDENTITY_MISMATCH/);
  });
});
