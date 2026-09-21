import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { countCampaignToolActions, runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import {
  classifyRunProviderOutcome,
  validateAdmissionRecords,
  validateAggregateCompleteness,
  YIELD_AGGREGATE_SCHEMA_VERSION,
} from '../../src/core/currentSourceYield/aggregation';

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w13-fake-progress-'));
}

function writeFailingProvider(dir: string): string {
  const file = path.join(dir, 'failing-provider.mjs');
  fs.writeFileSync(file, `
process.stderr.write('provider temporarily unavailable\\n');
process.exit(1);
`, { mode: 0o700 });
  return file;
}

test.describe('W13 candidate/admission invariant', () => {
  test('a self-declared admitted record with no mechanical artifacts is rejected', () => {
    const fixture = {
      schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION,
      metrics: {},
      admissionRecords: [{ candidateId: 'c1', admitted: true }],
    };
    const checked = validateAggregateCompleteness(fixture);
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.violations.map((violation) => violation.code)).toContain('YIELD_ADMISSION_WITHOUT_REPRODUCTION_RECEIPT');
    }
    const partial = validateAdmissionRecords([{ candidateId: 'c1', admitted: true, reproductionReceipt: 'repro-1' }]);
    expect(partial.ok).toBe(false);
    if (!partial.ok) {
      expect(partial.violations[0]?.detail).toContain('evidenceRefs');
      expect(partial.violations[0]?.detail).toContain('dossierIdentity');
    }
  });

  test('a complete mechanical admission record and a non-admitted record both pass', () => {
    expect(validateAdmissionRecords([
      { candidateId: 'c1', admitted: true, reproductionReceipt: 'repro-1', evidenceRefs: ['ev-1'], dossierIdentity: 'dossier-1' },
      { candidateId: 'c2', admitted: false },
    ]).ok).toBe(true);
  });
});

test.describe('W13 failed-provider fake-progress guard', () => {
  test('a failed provider call mints no action, target, hypothesis, candidate, admission, or dossier', async () => {
    const dir = scratchDir();
    try {
      const result = await runLocalCliCampaign({
        campaignId: 'w13-fake-progress',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeFailingProvider(dir)],
        provider: 'failing-test-provider',
        model: 'failing-test-model',
        maxTurns: 2,
        stateDirectory: dir,
      });

      expect(result.providerFailures).toBeGreaterThan(0);
      expect(result.byteLedger.providerResponseBytes).toBe(0);
      // Every recorded action is a failed reasoner call; no tool action exists.
      expect(result.actionCount).toBe(result.providerFailures);
      expect(result.candidateIds).toEqual([]);
      expect(result.findingAdmissions).toEqual([]);
      expect(result.reproductionCount).toBe(0);
      expect(result.dossierStatus).toBe('NONE');
      expect(result.yieldMetrics.reproductionAttempts).toBe(0);
      expect(result.yieldMetrics.qualifyingReproductions).toBe(0);
      expect(result.yieldMetrics.distinctAttemptedTargets).toBe(0);

      const checkpoints = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
      expect(checkpoints.length).toBeGreaterThan(0);
      const checkpointName = checkpoints[0];
      if (checkpointName === undefined) throw new Error('no checkpoint written');
      const document = JSON.parse(fs.readFileSync(path.join(dir, checkpointName), 'utf8')) as {
        state?: { actionLog?: { intentKind: string; resultClass: string | null }[]; hypotheses?: unknown[]; candidateIds?: unknown[] };
        campaignProgress?: { strategy?: unknown };
      };
      const actionLog = document.state?.actionLog ?? [];
      expect(actionLog.length).toBeGreaterThan(0);
      for (const record of actionLog) {
        expect(record.intentKind).not.toBe('CALL_TOOL');
        expect(record.resultClass ?? '').toMatch(/^REASONER_/);
      }
      expect(document.state?.hypotheses ?? []).toEqual([]);
      expect(document.state?.candidateIds ?? []).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('repeated provider failure is provider-blocked, never a valid zero-yield result', async () => {
    const dir = scratchDir();
    try {
      const result = await runLocalCliCampaign({
        campaignId: 'w13-fake-progress-outcome',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [writeFailingProvider(dir)],
        provider: 'failing-test-provider',
        model: 'failing-test-model',
        maxTurns: 2,
        stateDirectory: dir,
      });
      const outcome = classifyRunProviderOutcome({
        validProviderResponses: 0,
        providerResponseBytes: result.byteLedger.providerResponseBytes,
        sourceActions: result.actionCount,
      });
      expect(outcome).toBe('PROVIDER_BLOCKED');
      expect(result.terminationReason).not.toBe('COMPLETE_NO_FINDING');

      const validFixture = classifyRunProviderOutcome({ validProviderResponses: 1, providerResponseBytes: 128, sourceActions: 1 });
      expect(validFixture).toBe('VALID_PROVIDER_RUN');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the tool-action count is durable in the campaign result (W13-DEF-02)', async () => {
    const records = [
      { intentKind: 'CALL_TOOL' },
      { intentKind: 'REASONER_CALL' },
      { intentKind: 'CALL_TOOL' },
      { intentKind: 'FORM_HYPOTHESIS' },
    ] as never;
    expect(countCampaignToolActions(records)).toBe(2);

    const dir = scratchDir();
    try {
      const response = {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{
          kind: 'CALL_TOOL',
          toolId: 'INSPECT_SOURCE_SURFACE',
          arguments: { path: 'mobingilabs/ouchan:pkg/almcreds/creds.go' },
        }],
        hypotheses: [],
      };
      const file = path.join(dir, 'tool-provider.mjs');
      fs.writeFileSync(file, `
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  process.stdout.write(${JSON.stringify(JSON.stringify(response))});
});
`, { mode: 0o700 });
      const result = await runLocalCliCampaign({
        campaignId: 'w13-def02-tool-count',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [file],
        provider: 'test-provider',
        model: 'test-model',
        maxTurns: 1,
        stateDirectory: dir,
      });
      expect(result.toolActionCount).toBeGreaterThan(0);
      expect(result.actionCount).toBeGreaterThanOrEqual(result.toolActionCount);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a valid fake response still produces no dossier without mechanical reproduction', async () => {
    const dir = scratchDir();
    try {
      const response = {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
        hypotheses: [],
      };
      const file = path.join(dir, 'valid-provider.mjs');
      fs.writeFileSync(file, `
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  process.stdout.write(${JSON.stringify(JSON.stringify(response))});
});
`, { mode: 0o700 });
      const result = await runLocalCliCampaign({
        campaignId: 'w13-fake-progress-valid',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [file],
        provider: 'valid-test-provider',
        model: 'valid-test-model',
        maxTurns: 1,
        stateDirectory: dir,
      });
      expect(result.byteLedger.providerResponseBytes).toBeGreaterThan(0);
      expect(result.candidateIds).toEqual([]);
      expect(result.dossierStatus).toBe('NONE');
      expect(result.findingAdmissions).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
