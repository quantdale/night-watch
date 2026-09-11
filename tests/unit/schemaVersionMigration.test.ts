// ---------------------------------------------------------------------------
// Schema version lifecycle — MIGRATE, resume explanations, terminal records
// and the bounded sanitized export.
//
// Proves the behaviours the disposition vocabulary claims:
//   - a migration validates the OLD record first and reports corrupt rather
//     than migrating it;
//   - the original bytes survive a failed write and a failed read-back, and a
//     same-path migration is refused up front;
//   - the registered agent-budget v1 -> v2 migration actually runs through the
//     REAL checkpoint parser;
//   - a refused resume explains its differing versions and completed work;
//   - an unconsumable ledger is marked terminal once and never re-evaluated;
//   - the export is redacted, path-scrubbed, bounded and written only outside
//     the repository.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  executeNonDestructiveMigration,
  runMigrationStep,
  buildSanitizedExport,
  serializeSanitizedExport,
  writeSanitizedExport,
  type MigrationStepPlan,
} from '../../src/core/schemaLifecycle';
import { RedactionLayer } from '../../src/core/safety/redaction';
import {
  AGENT_BUDGET_VERSION,
  AGENT_BUDGET_VERSION_V1,
  AGENT_CHECKPOINT_VERSION,
  AGENT_RUNTIME_STATE_VERSION,
  defaultAgentBudgetPolicy,
} from '../../src/core/agentProtocol';
import { parseCheckpoint, AgentCheckpointError } from '../../src/core/agentRuntime/checkpoint';
import { parseCheckpoint as parseCheckpointFromIndex } from '../../src/core/agentRuntime/checkpoint';
import {
  CampaignCheckpointStore,
  CampaignResumeTerminalError,
  explainCheckpointResume,
  validateCampaignResumeTerminalRecord,
} from '../../src/core/campaign/checkpoint';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  type CampaignManifest,
} from '../../src/core/campaign/types';
import { resumeCampaign } from '../../src/core/campaign/orchestrator';
import { PrivateArtifactStore } from '../../src/core/policy/privateArtifacts';

const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// 17.5 — MIGRATE: old validator first, deterministic transform, new validator
// ---------------------------------------------------------------------------

interface SyntheticV1 {
  readonly schemaVersion: 'nightwatch.synthetic-migration.v1';
  readonly value: number;
}

interface SyntheticV2 {
  readonly schemaVersion: 'nightwatch.synthetic-migration.v2';
  readonly value: number;
  readonly doubled: number;
}

function syntheticPlan(counter: { migrated: number }): MigrationStepPlan<SyntheticV1, SyntheticV2> {
  return {
    migrationId: 'synthetic-v1-to-v2',
    fromVersion: 1,
    toVersion: 2,
    validateOld: (input) => {
      const record = input as Partial<SyntheticV1>;
      if (record.schemaVersion !== 'nightwatch.synthetic-migration.v1' || typeof record.value !== 'number') throw new Error('OLD_INVALID');
      return record as SyntheticV1;
    },
    migrate: (old) => {
      counter.migrated += 1;
      return { schemaVersion: 'nightwatch.synthetic-migration.v2', value: old.value, doubled: old.value * 2 };
    },
    validateNew: (input) => {
      const record = input as Partial<SyntheticV2>;
      if (record.schemaVersion !== 'nightwatch.synthetic-migration.v2' || record.doubled !== (record.value as number) * 2) throw new Error('NEW_INVALID');
      return input as SyntheticV2;
    },
  };
}

test.describe('schema version lifecycle — MIGRATE', () => {
  test('a record failing the OLD validator is reported corrupt and never migrated', () => {
    const counter = { migrated: 0 };
    const outcome = runMigrationStep({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 'not-a-number' }, syntheticPlan(counter));
    expect(outcome.status).toBe('REFUSED_CORRUPT');
    expect(counter.migrated).toBe(0);
  });

  test('a valid old record migrates deterministically and is re-validated', () => {
    const counter = { migrated: 0 };
    const outcome = runMigrationStep({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 21 }, syntheticPlan(counter));
    expect(outcome.status).toBe('MIGRATED');
    expect(counter.migrated).toBe(1);
    if (outcome.status === 'MIGRATED') {
      expect(outcome.value.doubled).toBe(42);
      expect(outcome.value.schemaVersion).toBe('nightwatch.synthetic-migration.v2');
    }
  });

  test('a migration that produces an invalid new shape is refused, not written', () => {
    const counter = { migrated: 0 };
    const plan = { ...syntheticPlan(counter), migrate: (old: SyntheticV1): SyntheticV2 => ({ schemaVersion: 'nightwatch.synthetic-migration.v2', value: old.value, doubled: old.value + 1 }) };
    const outcome = runMigrationStep({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 2 }, plan);
    expect(outcome.status).toBe('REFUSED_MIGRATION_FAILED');
  });

  test('a failed write leaves the original readable and writes no new record', () => {
    const counter = { migrated: 0 };
    const original = JSON.stringify({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 7 });
    let written: string | null = null;
    const result = executeNonDestructiveMigration({
      originalPath: '/tmp/original.json',
      newPath: '/tmp/migrated.json',
      plan: syntheticPlan(counter),
      parse: (text) => JSON.parse(text) as unknown,
      serialize: (value) => JSON.stringify(value),
      io: {
        readOriginal: () => original,
        writeNew: () => {
          throw new Error('DISK_FULL');
        },
        readNew: () => written,
      },
    });
    expect(result.status).toBe('REFUSED_WRITE');
    expect(result.originalRetained).toBe(true);
    expect(written).toBeNull();
    expect(original).toBe(JSON.stringify({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 7 }));
  });

  test('a failed read-back leaves the original readable and reports the new record unproven', () => {
    const counter = { migrated: 0 };
    const original = JSON.stringify({ schemaVersion: 'nightwatch.synthetic-migration.v1', value: 7 });
    let written: string | null = null;
    const result = executeNonDestructiveMigration({
      originalPath: '/tmp/original.json',
      newPath: '/tmp/migrated.json',
      plan: syntheticPlan(counter),
      parse: (text) => JSON.parse(text) as unknown,
      serialize: (value) => JSON.stringify(value),
      io: {
        readOriginal: () => original,
        writeNew: (bytes) => {
          written = `${bytes.slice(0, Math.max(0, bytes.length - 1))}`;
        },
        readNew: () => written,
      },
    });
    expect(result.status).toBe('REFUSED_READBACK');
    expect(result.originalRetained).toBe(true);
  });

  test('writing the migrated record back over the original path is refused up front', () => {
    const counter = { migrated: 0 };
    const result = executeNonDestructiveMigration({
      originalPath: '/tmp/same.json',
      newPath: '/tmp/same.json',
      plan: syntheticPlan(counter),
      parse: (text) => JSON.parse(text) as unknown,
      serialize: (value) => JSON.stringify(value),
      io: { readOriginal: () => '{}', writeNew: () => undefined, readNew: () => null },
    });
    expect(result.status).toBe('REFUSED_WRITE');
    expect(result.reason).toBe('NEW_PATH_EQUALS_ORIGINAL_PATH');
    expect(counter.migrated).toBe(0);
  });

  test('the registered agent-budget v1 -> v2 migration runs through the real checkpoint parser', () => {
    const policy = defaultAgentBudgetPolicy('HOUR_1');
    const { toolPayloadBytes: _v2ToolCeiling, ...v1PolicyBase } = policy;
    const raw = {
      schemaVersion: AGENT_CHECKPOINT_VERSION,
      campaignId: 'campaign.test-migration',
      resumeCursor: 'campaign.test-migration:turn:1',
      state: {
        schemaVersion: AGENT_RUNTIME_STATE_VERSION,
        campaignId: 'campaign.test-migration',
        status: 'PAUSED',
        phase: 'PLAN',
        hypotheses: [],
        actionLog: [],
        evidenceRefs: [],
        candidateIds: [],
        terminationReason: null,
        budget: {
          policy: { ...v1PolicyBase, schemaVersion: AGENT_BUDGET_VERSION_V1, outputBytes: 4096 },
          usage: { wallTimeMs: 1, reasonerCalls: 1, inputBytes: 10, outputBytes: 1234, toolActions: 1, candidateCount: 0, retries: 0, consecutiveFailures: 0, providerFailures: 0 },
        },
      },
    };
    const parsed = parseCheckpoint(raw);
    expect(parsed.state.budget.policy.schemaVersion).toBe(AGENT_BUDGET_VERSION);
    expect(parsed.state.budget.policy.toolPayloadBytes).toBe(policy.toolPayloadBytes);
    expect(parsed.state.budget.usage.outputBytes).toBe(0);
    expect(parsed.state.budget.usage.toolPayloadBytes).toBe(1234);
    expect(parsed.state.byteLedger).toBeDefined();
    // Same reader through the package index, so the proof does not depend on
    // one import spelling.
    expect(parseCheckpointFromIndex(raw).state.budget.usage.toolPayloadBytes).toBe(1234);
  });

  test('the agent checkpoint reader reports VERSION_UNSUPPORTED with the found version, not CORRUPT', () => {
    let error: unknown;
    try {
      parseCheckpoint({ schemaVersion: 'nightwatch.agent-checkpoint.v9', campaignId: 'c', resumeCursor: 'c:turn:1', state: {} });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCheckpointError);
    expect((error as AgentCheckpointError).code).toBe('VERSION_UNSUPPORTED');
    expect((error as Error).message).toContain('nightwatch.agent-checkpoint.v9');
  });
});

// ---------------------------------------------------------------------------
// 17.12 / 17.13 — a refused resume explains itself; terminal is not pending
// ---------------------------------------------------------------------------

const CAMPAIGN_ID = `campaign:sha256:${'a'.repeat(24)}`;

function fakeManifest(): Pick<CampaignManifest, 'campaignId' | 'manifestFingerprint' | 'versions'> {
  return {
    campaignId: CAMPAIGN_ID,
    manifestFingerprint: `sha256:${'b'.repeat(64)}`,
    versions: {
      campaignFingerprint: 'nightwatch.campaign.private.v1',
      replayPlan: 'nightwatch.triage-replay-plan.private.v2',
      semanticBundle: 'nightwatch.semantic-campaign-bundle.private.v1',
      dossierV2: 'nightwatch.bug-dossier.private.v2',
      expectationDerivation: 'nightwatch.real-source-expectation-derivation.v2',
    },
  } as unknown as Pick<CampaignManifest, 'campaignId' | 'manifestFingerprint' | 'versions'>;
}

test.describe('checkpoint resume — explanation and terminal marking', () => {
  test('a refused resume names the differing versions and the completed work items', () => {
    const manifest = fakeManifest();
    const raw = {
      schemaVersion: 'nightwatch.campaign-checkpoint.private.v0',
      campaignId: manifest.campaignId,
      manifestFingerprint: manifest.manifestFingerprint,
      completedWorkItemIds: ['work:2', 'work:1'],
      remainingWorkItemIds: ['work:3'],
    };
    const explanation = explainCheckpointResume(raw, manifest);
    expect(explanation.campaignIdentity).toBe(manifest.campaignId);
    expect(explanation.differingVersions.some((entry) => entry.component === 'schemaVersion')).toBe(true);
    expect(explanation.completedWorkItems).toEqual(['work:1', 'work:2']);
    expect(explanation.completedWorkItemCount).toBe(2);
    expect(explanation.remainingWorkItemCount).toBe(1);
    expect(explanation.restartConsumable).toBe(false);
    expect(explanation.terminal).toBe(true);
  });

  test('a ledger that stays readable under changed runtime contracts is reported consumable', () => {
    const manifest = fakeManifest();
    const current = CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED;
    const raw = {
      schemaVersion: CAMPAIGN_CHECKPOINT_VERSION,
      campaignId: manifest.campaignId,
      manifestFingerprint: manifest.manifestFingerprint,
      runtimeContractVersions: {
        candidateLifecycle: 'nightwatch.candidate-lifecycle.private.v0',
        replayBinding: current.replayBinding,
        promotionResult: current.promotionResult,
      },
      completedWorkItemIds: ['work:1'],
      remainingWorkItemIds: [],
    };
    const explanation = explainCheckpointResume(raw, manifest);
    expect(explanation.restartConsumable).toBe(true);
    expect(explanation.terminal).toBe(false);
    expect(explanation.differingVersions.some((entry) => entry.component === 'candidateLifecycle')).toBe(true);
    expect(explanation.completedWorkItems).toEqual(['work:1']);
  });

  test('an unconsumable campaign is marked terminal once and never re-evaluated as pending', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-schema-terminal-'));
    const store = new CampaignCheckpointStore(new PrivateArtifactStore({ root: tempRoot }));
    const manifest = fakeManifest();
    const paths = store.paths(manifest.campaignId);
    fs.writeFileSync(paths.checkpoint, JSON.stringify({ status: 'READY', checkpoint: {
      schemaVersion: 'nightwatch.campaign-checkpoint.private.v0',
      campaignId: manifest.campaignId,
      manifestFingerprint: manifest.manifestFingerprint,
      completedWorkItemIds: ['work:1'],
      remainingWorkItemIds: ['work:2'],
    } }), { mode: 0o600 });

    let first: unknown;
    try {
      await resumeCampaign(manifest as never, {} as never, { checkpointStore: store });
      first = null;
    } catch (error) {
      first = error;
    }
    expect(first).toBeInstanceOf(CampaignResumeTerminalError);
    const recorded = store.readResumeTerminal(manifest.campaignId);
    expect(recorded).not.toBeNull();
    expect(() => validateCampaignResumeTerminalRecord(recorded)).not.toThrow();
    expect(recorded?.completedWorkItemCount).toBe(1);
    expect(recorded?.restartConsumable).toBe(false);

    let second: unknown;
    try {
      await resumeCampaign(manifest as never, {} as never, { checkpointStore: store });
      second = null;
    } catch (error) {
      second = error;
    }
    expect(second).toBeInstanceOf(CampaignResumeTerminalError);
    expect((second as CampaignResumeTerminalError).message).toContain('CAMPAIGN_RESUME_TERMINAL');
    expect((second as CampaignResumeTerminalError).terminal.campaignId).toBe(manifest.campaignId);
  });
});

// ---------------------------------------------------------------------------
// 17.11 — bounded sanitized export
// ---------------------------------------------------------------------------

test.describe('schema version lifecycle — sanitized export', () => {
  test('secrets, secret-shaped keys and absolute private paths never reach the export', () => {
    const redaction = new RedactionLayer();
    redaction.addSecret('SUPER_SECRET_VALUE_123');
    const exported = buildSanitizedExport({
      store: 'reviews',
      redaction,
      records: [
        {
          authorization: 'Bearer abcdefghijklmnopqrstuvwxyz',
          api_key: 'plain-key-value',
          note: 'registered SUPERSECRET at /home/owner/.nightwatch/findings/review.json',
          nested: { cookie: 'session=abc', kept: 'safe-value' },
        },
      ],
    });
    const text = serializeSanitizedExport(exported);
    expect(text).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(text).not.toContain('plain-key-value');
    expect(text).not.toContain('/home/owner/.nightwatch');
    expect(text).not.toContain('session=abc');
    expect(text).toContain('safe-value');
    expect(exported.recordCount).toBe(1);
  });

  test('the export is bounded and its envelope is versioned', () => {
    const redaction = new RedactionLayer();
    const exported = buildSanitizedExport({
      store: 'reviews',
      redaction,
      records: [{ deep: { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: 1 } } } } } } } } } } } } } }],
    });
    const text = JSON.stringify(exported);
    expect(text).toContain('TRUNCATED:depth');
    expect(exported.schemaVersion).toBe('nightwatch.schema-export.v1');
  });

  test('a destination inside the repository is refused; an outside destination is written owner-only', () => {
    const content = '{"schemaVersion":"nightwatch.schema-export.v1"}\n';
    expect(() => writeSanitizedExport({ destination: path.join(ROOT, 'schema-export.json'), repositoryRoot: ROOT, content }))
      .toThrow(/SCHEMA_EXPORT_DESTINATION_INSIDE_REPOSITORY/);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-schema-export-'));
    const destination = path.join(outside, 'export.json');
    const written = writeSanitizedExport({ destination, repositoryRoot: ROOT, content });
    expect(written).toBe(destination);
    expect(fs.readFileSync(destination, 'utf8')).toBe(content);
    expect(fs.lstatSync(destination).mode & 0o777).toBe(0o600);
  });

  test('the export command writes a sanitized file outside the repository without echoing private paths', () => {
    const storeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-schema-export-store-'));
    fs.writeFileSync(
      path.join(storeRoot, `review.${'a'.repeat(12)}.${'b'.repeat(24)}.json`),
      JSON.stringify({ schemaVersion: 'nightwatch.review-store.v1', note: 'stored at /home/owner/.nightwatch/findings' }),
      { mode: 0o600 },
    );
    const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-schema-export-out-'));
    const out = path.join(outRoot, 'export.json');
    const result = spawnSync(process.execPath, [
      path.join(ROOT, 'bin', 'schema-lifecycle.mjs'),
      'export',
      `--out=${out}`,
      `--root=${storeRoot}`,
    ], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('/home/owner');
    const text = fs.readFileSync(out, 'utf8');
    expect(text).not.toContain('/home/owner');
    const exported = JSON.parse(text) as { schemaVersion: string; recordCount: number };
    expect(exported.schemaVersion).toBe('nightwatch.schema-export.v1');
    expect(exported.recordCount).toBe(1);
    expect(fs.lstatSync(out).mode & 0o777).toBe(0o600);
  });
});
