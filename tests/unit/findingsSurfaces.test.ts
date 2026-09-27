// M5 task 6.14 (C-12/C-13/B-12) — the findings and status surfaces report
// MEASURED state from persisted records, never a constant zero.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFindingStore } from '../../src/core/localInvestigation/agentFindingStore';
import { deriveAgentFindingRecord } from '../../src/core/localInvestigation/agentFindingRecord';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENT_CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-agent.mjs');
const DISPATCHER = path.join(REPO_ROOT, 'bin', 'nightwatch.mjs');

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-findings-surface-'));
  roots.push(root);
  return root;
}

/** Seed one valid persisted record into a temporary private store root. */
function seedRecord(privateStateDir: string, campaignId: string): string {
  const store = new AgentFindingStore({ root: privateStateDir });
  const record = deriveAgentFindingRecord({
    campaignId,
    candidateId: 'candidate-surface',
    receipts: [
      {
        schemaVersion: 'nightwatch.local-reproduction-receipt.v1',
        providerId: 'synthetic-provider',
        reproductionId: 'rep-surface-1',
        candidateId: 'candidate-surface',
        sourcePath: 'example/ledger:src/total.ts',
        sourceEvidenceRef: 'ev:source',
        evidenceRef: 'ev:repro',
        verdict: 'REPRODUCED',
        preFix: 'FAIL',
        postFix: 'PASS',
        provenanceRefs: ['repro-provider:rep-surface-1'],
      },
    ],
  });
  store.persist(record);
  return record.dossierId;
}

function runCli(entry: string, args: string[], privateStateDir: string, extraEnv: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateStateDir, ...extraEnv },
    shell: false,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** The operator CLIs print a one-line header before the JSON document. */
function jsonOf(stdout: string): unknown {
  const start = stdout.indexOf('{');
  if (start === -1) throw new Error(`no JSON document in output: ${stdout.slice(0, 120)}`);
  return JSON.parse(stdout.slice(start));
}

test.describe('findings surfaces (6.14)', () => {
  test('nightwatch findings reports the measured count from the owner-local store', () => {
    const root = scratch();
    const emptyStore = path.join(root, 'empty');
    const empty = runCli(DISPATCHER, ['findings'], emptyStore);
    expect(empty.status).toBe(0);
    const emptyPayload = jsonOf(empty.stdout) as { readonly actionableFindings?: number; readonly storeRoot?: string };
    expect(emptyPayload.actionableFindings).toBe(0);
    expect(emptyPayload.storeRoot).toBe(path.join(emptyStore, 'agent-findings'));

    const seeded = path.join(root, 'seeded');
    const dossierId = seedRecord(seeded, 'camp-surface');
    const populated = runCli(DISPATCHER, ['findings'], seeded);
    expect(populated.status).toBe(0);
    const payload = jsonOf(populated.stdout) as {
      readonly actionableFindings?: number;
      readonly perCampaign?: readonly { readonly campaignId?: string; readonly admissions?: number }[];
      readonly records?: readonly { readonly dossierId?: string }[];
    };
    // Never a constant zero: the count is what the store holds.
    expect(payload.actionableFindings).toBe(1);
    expect(payload.perCampaign?.[0]?.campaignId).toBe('camp-surface');
    expect(payload.perCampaign?.[0]?.admissions).toBe(1);
    expect(payload.records?.[0]?.dossierId).toBe(dossierId);
  });

  test('campaign findings reports per-campaign rows from persisted records', () => {
    const root = scratch();
    const privateStateDir = path.join(root, 'private');
    const dossierId = seedRecord(privateStateDir, 'camp-rows');
    const result = runCli(AGENT_CLI, ['campaign', 'findings'], privateStateDir);
    expect(result.status).toBe(0);
    const payload = jsonOf(result.stdout) as {
      readonly actionableFindings?: number;
      readonly rows?: readonly {
        readonly campaignId?: string;
        readonly admissionState?: string;
        readonly persistedAdmissions?: number;
        readonly dossierIds?: readonly string[];
      }[];
    };
    expect(payload.actionableFindings).toBe(1);
    const row = payload.rows?.find((entry) => entry.campaignId === 'camp-rows');
    expect(row).toBeTruthy();
    expect(row?.admissionState).toBe('ADMITTED_PERSISTED');
    expect(row?.persistedAdmissions).toBe(1);
    expect(row?.dossierIds).toEqual([dossierId]);
  });

  test('agent status reports measured state', () => {
    const root = scratch();
    const privateStateDir = path.join(root, 'private');
    seedRecord(privateStateDir, 'camp-status');

    const withoutReasoner = runCli(AGENT_CLI, ['status'], privateStateDir);
    expect(withoutReasoner.status).toBe(0);
    const payload = jsonOf(withoutReasoner.stdout) as {
      readonly measured?: {
        readonly persistedFindings?: number;
        readonly storedCampaigns?: number;
        readonly reasonerConfigured?: boolean;
        readonly findingStoreRoot?: string | null;
      };
    };
    expect(payload.measured?.persistedFindings).toBe(1);
    expect(typeof payload.measured?.storedCampaigns).toBe('number');
    expect(payload.measured?.reasonerConfigured).toBe(false);
    expect(payload.measured?.findingStoreRoot).toBe(path.join(privateStateDir, 'agent-findings'));

    const withReasoner = runCli(AGENT_CLI, ['status'], privateStateDir, {
      NIGHTWATCH_REASONER_CLI: process.execPath,
    });
    const configured = jsonOf(withReasoner.stdout) as { readonly measured?: { readonly reasonerConfigured?: boolean } };
    expect(configured.measured?.reasonerConfigured).toBe(true);
  });
});
