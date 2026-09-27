// M6 task 7.6 (C-20/B-12) — the read-only agent-campaign view: measured rows
// from the durable owner-local store, identities and counts only, and never a
// filesystem path.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFindingStore } from '../../src/core/localInvestigation/agentFindingStore';
import { deriveAgentFindingRecord } from '../../src/core/localInvestigation/agentFindingRecord';
import {
  createAgentCampaignAuthorityForTests,
} from '../../src/controlCenter/authorities/agentCampaignAuthority';
import { projectAgentCampaigns } from '../../src/controlCenter/adapters/agentCampaignsAdapter';
import { parseControlCenterPath } from '../../src/controlCenter/server/router';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-agent-campaigns-'));
  roots.push(root);
  return root;
}

function seed(privateStateDir: string, campaignId: string, candidateId: string, reproductionId: string): string {
  const store = new AgentFindingStore({ root: privateStateDir });
  const record = deriveAgentFindingRecord({
    campaignId,
    candidateId,
    receipts: [
      {
        schemaVersion: 'nightwatch.local-reproduction-receipt.v1',
        providerId: 'synthetic-provider',
        reproductionId,
        candidateId,
        sourcePath: 'example/ledger:src/total.ts',
        sourceEvidenceRef: 'ev:source',
        evidenceRef: `ev:repro:${reproductionId}`,
        verdict: 'REPRODUCED',
        preFix: 'FAIL',
        postFix: 'PASS',
        provenanceRefs: [`repro-provider:${reproductionId}`],
      },
    ],
  });
  store.persist(record);
  return record.dossierId;
}

test.describe('agent-campaign view (7.6)', () => {
  test('an empty store reports an explicit empty view', () => {
    const root = scratch();
    const snapshot = createAgentCampaignAuthorityForTests(root).snapshot();
    expect(snapshot.state).toBe('EMPTY');
    expect(snapshot.rows).toEqual([]);
    expect(snapshot.actionableFindings).toBe(0);
    expect(snapshot.reasonCodes).toContain('AGENT_FINDINGS_EMPTY');
  });

  test('an unreadable store reports UNAVAILABLE, never a silent empty view', () => {
    const root = scratch();
    const blocked = path.join(root, 'blocked');
    fs.writeFileSync(blocked, 'not a directory\n');
    const snapshot = createAgentCampaignAuthorityForTests(blocked).snapshot();
    expect(snapshot.state).toBe('UNAVAILABLE');
    expect(snapshot.reasonCodes).toContain('AGENT_FINDINGS_UNAVAILABLE');
  });

  test('rows are measured per campaign and carry identities, never paths', () => {
    const root = scratch();
    const first = seed(root, 'camp-alpha', 'candidate-alpha', 'rep-alpha');
    const second = seed(root, 'camp-beta', 'candidate-beta', 'rep-beta');
    const dto = projectAgentCampaigns(createAgentCampaignAuthorityForTests(root).snapshot());

    expect(dto.state).toBe('AVAILABLE');
    expect(dto.actionableFindings).toBe(2);
    expect(dto.rows.map((row) => row.campaignId)).toEqual(['camp-alpha', 'camp-beta']);
    for (const row of dto.rows) {
      expect(row.admissionState).toBe('ADMITTED_PERSISTED');
      expect(row.persistedAdmissions).toBe(1);
      expect(row.candidateIds).toHaveLength(1);
      expect(row.dossierIds).toHaveLength(1);
      expect(row.dossierIds[0]).toMatch(/^afr:sha256:[0-9a-f]{24}$/);
    }
    expect(dto.rows[0]?.dossierIds).toEqual([first]);
    expect(dto.rows[1]?.dossierIds).toEqual([second]);

    // NO PATHS: the serialized view carries no filesystem-shaped value.
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain(root);
    expect(serialized).not.toContain('.nightwatch');
    expect(serialized).not.toContain('findings');
    expect(serialized).not.toContain('/');
    expect(serialized).not.toContain('\\');
  });

  test('the route and the collector serve the view', async () => {
    const parsed = parseControlCenterPath('/api/v1/agent/campaigns');
    expect(parsed).toEqual({ kind: 'route', route: { kind: 'agentCampaigns' } });

    const root = scratch();
    seed(root, 'camp-served', 'candidate-served', 'rep-served');
    const collector = createDefaultControlCenterCollector({
      agentCampaignAuthority: createAgentCampaignAuthorityForTests(root),
    });
    const dto = await collector.agentCampaigns();
    expect(dto.state).toBe('AVAILABLE');
    expect(dto.actionableFindings).toBe(1);
    expect(dto.rows[0]?.campaignId).toBe('camp-served');
  });
});
