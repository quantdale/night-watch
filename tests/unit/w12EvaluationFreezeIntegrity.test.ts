import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { resumeLocalCliCampaign, runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';

const ROOT = path.resolve(__dirname, '..', '..');
const FREEZE_PATH = path.join(
  ROOT,
  '.agent/tasks/nightwatch-current-source-unknown-yield-w12-v1/evaluation-freeze.json',
);
const PROBE_PATH = path.join(
  ROOT,
  '.agent/tasks/nightwatch-current-source-unknown-yield-w12-v1/evidence/integrity-negative-probes.json',
);

function fingerprint(value: Record<string, unknown>): string {
  const copy = structuredClone(value);
  delete copy.freezeFingerprint;
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex').slice(0, 24)}`;
}

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w12-freeze-'));
}

function writeReasoner(dir: string, name: string, response: unknown): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  process.stdout.write(${JSON.stringify(JSON.stringify(response))});
});
`, { mode: 0o700 });
  return file;
}

test.describe('W12 evaluation freeze integrity', () => {
  test('the committed freeze fingerprint and mutation receipt agree', () => {
    const freeze = JSON.parse(fs.readFileSync(FREEZE_PATH, 'utf8')) as Record<string, unknown>;
    const probes = JSON.parse(fs.readFileSync(PROBE_PATH, 'utf8')) as {
      recomputedFingerprintExcludingSelf: string;
      baseFingerprintMatches: boolean;
      mutationProbes: Record<string, { changed: boolean }>;
    };

    expect(fingerprint(freeze)).toBe('sha256:8ea18e4fe5e9315271dd55df');
    expect(fingerprint(freeze)).toBe(probes.recomputedFingerprintExcludingSelf);
    expect(probes.baseFingerprintMatches).toBe(true);
    for (const mutation of Object.values(probes.mutationProbes)) {
      expect(mutation.changed).toBe(true);
    }
    expect((freeze.universe as { repositoryOrder: string[] }).repositoryOrder).toHaveLength(8);
    expect((freeze.matrix as unknown[])).toHaveLength(9);
  });

  test('a scoped campaign cannot resume widened to the full approved universe', async () => {
    const dir = scratchDir();
    try {
      const pausedResponse = {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{ kind: 'PAUSE' }],
        hypotheses: [],
      };
      const paused = await runLocalCliCampaign({
        campaignId: 'w12-integrity-scope-resume',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeReasoner(dir, 'pause.mjs', pausedResponse)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
        investigationScope: ['mobingilabs/wave-api'],
      });
      expect(paused.terminationReason).toBe('PAUSED');

      const terminatedResponse = {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
        hypotheses: [],
      };
      await expect(resumeLocalCliCampaign({
        campaignId: 'w12-integrity-scope-resume',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeReasoner(dir, 'terminate.mjs', terminatedResponse)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
      })).rejects.toMatchObject({ code: 'CAMPAIGN_SCOPE_MISMATCH' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
