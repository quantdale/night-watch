import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { resumeLocalCliCampaign, runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import {
  RUNTIME_BUDGET_ENVELOPE_FIELDS,
  RUNTIME_BUDGET_ENVELOPE_VERSION,
  checkRuntimeBudgetEnvelope,
  deriveRuntimeBudgetEnvelope,
  type RuntimeBudgetEnvelope,
} from '../../src/core/agentRuntime/runtimeBudgetEnvelope';

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w13-envelope-'));
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

function writeMarkerExecutable(dir: string, marker: string): string {
  const file = path.join(dir, 'marker-provider.mjs');
  fs.writeFileSync(file, `
import fs from 'node:fs';
fs.writeFileSync(${JSON.stringify(marker)}, 'spawned');
process.exit(1);
`, { mode: 0o700 });
  return file;
}

const terminateResponse = {
  schemaVersion: REASONER_TURN_RESPONSE_VERSION,
  intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
  hypotheses: [],
};

const pauseResponse = {
  schemaVersion: REASONER_TURN_RESPONSE_VERSION,
  intents: [{ kind: 'PAUSE' }],
  hypotheses: [],
};

test.describe('W13 runtime budget envelope single authority', () => {
  test('the derived HOUR_1 envelope is the engine policy, field for field', () => {
    const derived = deriveRuntimeBudgetEnvelope('HOUR_1');
    expect(derived).toEqual({
      schemaVersion: RUNTIME_BUDGET_ENVELOPE_VERSION,
      ceilingName: 'HOUR_1',
      reasonerCalls: 200,
      toolActions: 400,
      inputBytes: 5_000_000,
      outputBytes: 160_000,
      toolPayloadBytes: 64_000_000,
      retries: 8,
      consecutiveFailures: 6,
      providerFailures: 8,
    });
  });

  test('every bound field is compared, so a mutation of any one fails closed', () => {
    const derived = deriveRuntimeBudgetEnvelope('HOUR_1');
    expect(checkRuntimeBudgetEnvelope(derived, derived).ok).toBe(true);
    for (const field of RUNTIME_BUDGET_ENVELOPE_FIELDS) {
      if (field === 'ceilingName') continue;
      const mutated = { ...derived, [field]: (derived[field] as number) + 1 };
      const checked = checkRuntimeBudgetEnvelope(mutated, derived);
      expect(checked.ok).toBe(false);
      if (!checked.ok && checked.code === 'RUNTIME_BUDGET_ENVELOPE_MISMATCH') {
        expect(checked.mismatches.map((item) => item.field)).toContain(field);
      } else {
        throw new Error(`expected a mismatch for ${field}`);
      }
    }
  });

  test('a declared envelope equal to the engine is accepted on a fresh run', async () => {
    const dir = scratchDir();
    try {
      const result = await runLocalCliCampaign({
        campaignId: 'w13-envelope-accepted',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeReasoner(dir, 'terminate.mjs', terminateResponse)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
        declaredBudgetEnvelope: deriveRuntimeBudgetEnvelope('HOUR_1'),
      });
      expect(result.investigationsCompleted).toBeGreaterThan(0);
      expect(['NO_PROGRESS', 'COMPLETE_NO_FINDING']).toContain(result.terminationReason);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the historical W12 supplemental envelope is rejected before any provider call', async () => {
    const dir = scratchDir();
    const marker = path.join(dir, 'provider-spawned');
    try {
      const w12Supplemental: RuntimeBudgetEnvelope = {
        ...deriveRuntimeBudgetEnvelope('HOUR_1'),
        providerFailures: 3,
        consecutiveFailures: 3,
      };
      await expect(runLocalCliCampaign({
        campaignId: 'w13-envelope-w12-supplemental',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeMarkerExecutable(dir, marker)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
        declaredBudgetEnvelope: w12Supplemental,
      })).rejects.toThrow(/RUNTIME_BUDGET_ENVELOPE_MISMATCH.*consecutiveFailures.*providerFailures/s);
      expect(fs.existsSync(marker)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a divergent declared envelope fails a resume closed before the provider is spawned', async () => {
    const dir = scratchDir();
    const marker = path.join(dir, 'provider-spawned');
    try {
      const paused = await runLocalCliCampaign({
        campaignId: 'w13-envelope-resume',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeReasoner(dir, 'pause.mjs', pauseResponse)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
      });
      expect(paused.terminationReason).toBe('PAUSED');

      await expect(resumeLocalCliCampaign({
        campaignId: 'w13-envelope-resume',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeMarkerExecutable(dir, marker)],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
        declaredBudgetEnvelope: { ...deriveRuntimeBudgetEnvelope('HOUR_1'), providerFailures: 3 },
      })).rejects.toThrow(/RUNTIME_BUDGET_ENVELOPE_MISMATCH.*providerFailures/s);
      expect(fs.existsSync(marker)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a malformed or unknown-field envelope fails closed as malformed', () => {
    const derived = deriveRuntimeBudgetEnvelope('HOUR_1');
    expect(checkRuntimeBudgetEnvelope({ ...derived, extra: 1 }, derived)).toMatchObject({
      ok: false,
      code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED',
    });
    const { retries: _retries, ...missing } = derived;
    expect(checkRuntimeBudgetEnvelope(missing, derived)).toMatchObject({
      ok: false,
      code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED',
    });
    expect(checkRuntimeBudgetEnvelope({ ...derived, providerFailures: '8' }, derived)).toMatchObject({
      ok: false,
      code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED',
    });
    expect(checkRuntimeBudgetEnvelope({ ...derived, schemaVersion: 'nightwatch.other' }, derived)).toMatchObject({
      ok: false,
      code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED',
    });
  });

  test('a declared envelope for another ceiling is reported by field', () => {
    const derived = deriveRuntimeBudgetEnvelope('HOUR_1');
    const otherCeiling = { ...deriveRuntimeBudgetEnvelope('HOUR_4'), ceilingName: 'HOUR_1' as const };
    const checked = checkRuntimeBudgetEnvelope(otherCeiling, derived);
    expect(checked.ok).toBe(false);
    if (!checked.ok && checked.code === 'RUNTIME_BUDGET_ENVELOPE_MISMATCH') {
      expect(checked.mismatches.map((item) => item.field)).not.toHaveLength(0);
    } else {
      throw new Error('expected a mismatch');
    }
  });
});
