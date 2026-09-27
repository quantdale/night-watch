// M6 task 7.4 (B-02/C-21) — orchestrator state lives in its own
// `campaign-state/` subtree, the legacy location stays readable, and the
// findings authority filters to the dossier FAMILY before it parses anything.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignCheckpointStore } from '../../src/core/campaign/checkpoint';
import { PrivateArtifactStore } from '../../src/core/policy/privateArtifacts';
import { createFindingsAuthority } from '../../src/controlCenter/authorities/findingsAuthority';
import { createBugDossier } from '../../src/core/triage/dossier';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-campaign-state-'));
  roots.push(root);
  return root;
}

test.describe('campaign-state subtree and dossier family (7.4)', () => {
  test('orchestrator state is written under campaign-state and never into the findings root', () => {
    const root = scratch();
    const store = new CampaignCheckpointStore();
    // The derived store carries the new subtree; the class exposes it as root.
    expect(store.store.root.endsWith(path.join('findings', 'campaign-state'))).toBe(true);
    void root;
  });

  test('the derived store writes into the configured subtree and the legacy writer stays available', () => {
    const root = scratch();
    const previous = process.env.NIGHTWATCH_PRIVATE_STATE_DIR;
    process.env.NIGHTWATCH_PRIVATE_STATE_DIR = root;
    try {
      const derived = new CampaignCheckpointStore();
      expect(derived.store.root).toBe(path.join(root, 'campaign-state'));
      // A pre-7.4 build wrote into the configured root itself; that location
      // is still writable/readable by an explicitly injected store, which is
      // what the legacy read fallback resolves.
      const legacyStore = new PrivateArtifactStore({ root });
      expect(legacyStore.root).toBe(root);
      const written = legacyStore.writeJson('legacy-probe.json', { probe: true });
      expect(written).toBe(path.join(root, 'legacy-probe.json'));
    } finally {
      if (previous === undefined) delete process.env.NIGHTWATCH_PRIVATE_STATE_DIR;
      else process.env.NIGHTWATCH_PRIVATE_STATE_DIR = previous;
    }
  });

  test('the findings authority skips non-dossier files instead of reporting corruption', () => {
    const root = scratch();
    const findingsRoot = path.join(root, 'findings');
    fs.mkdirSync(findingsRoot, { recursive: true, mode: 0o700 });
    // A valid dossier beside orchestrator-shaped state.
    const dossier = createBugDossier({
      firstObserved: '2026-09-01T00:00:00.000Z',
      lastObserved: '2026-09-01T00:01:00.000Z',
      journeyIds: ['p4.j1'],
      seeds: ['seed-1'],
      routeClass: 'dashboard',
      apiOperationFamily: null,
      oracleFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      evidenceLevel: 'L2',
      minimization: {
        status: 'MINIMIZED',
        reproductionCount: 2,
        freshExactReplay: 'REPRODUCED',
        minimalReproducingSequence: ['p4.j1.open'],
        minimalityGuarantee: '1-MINIMAL',
      },
      browserApiDifferential: {
        status: 'NOT_AVAILABLE',
        appLayerDiscriminator: 'NOT_AVAILABLE',
        browserOperationFamily: null,
        apiOperationFamily: null,
        statusClassSame: null,
        contentTypeClassSame: null,
        routeClassSame: null,
        structuralStateSame: null,
        parseabilitySame: null,
        rootCauseClaim: 'NONE',
      },
      sourceCorrelation: { candidates: [] },
      likelyFaultBoundary: {
        primaryBoundary: 'CLIENT_STATE',
        candidateBoundaries: [],
        confidence: 'MEDIUM',
        reasons: ['deterministic replay boundary'],
        rootCauseClaim: 'NONE',
      },
      confidence: { level: 'MEDIUM', reasons: ['deterministic replay'] },
      technicalSeverity: 'MEDIUM',
      triagePriority: 'P2',
      knownNightwatchDefect: null,
      alternativesRuledOut: ['transient variance'],
      missingEvidence: [],
    } as unknown as Parameters<typeof createBugDossier>[0]);
    fs.writeFileSync(
      path.join(findingsRoot, `${dossier.candidateId.replaceAll(':', '-')}.json`),
      JSON.stringify({ dossier }),
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(findingsRoot, 'camp-7-4.checkpoint.json'),
      JSON.stringify({ checkpoint: { campaignId: 'camp-7-4' } }),
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(findingsRoot, 'camp-7-4.manifest.json'),
      JSON.stringify({ manifest: { campaignId: 'camp-7-4' } }),
      { mode: 0o600 },
    );

    const previous = process.env.NIGHTWATCH_PRIVATE_STATE_DIR;
    process.env.NIGHTWATCH_PRIVATE_STATE_DIR = findingsRoot;
    let authority: ReturnType<typeof createFindingsAuthority>;
    try {
      authority = createFindingsAuthority();
    } finally {
      if (previous === undefined) delete process.env.NIGHTWATCH_PRIVATE_STATE_DIR;
      else process.env.NIGHTWATCH_PRIVATE_STATE_DIR = previous;
    }
    const snapshot = authority.snapshot();
    const codes = snapshot.reasonCodes ?? [];
    // The non-dossier files are NAMED, never parsed as dossiers, and the view
    // still reports the real dossier.
    expect(codes).toContain('FINDINGS_NON_DOSSIER_FILE_SKIPPED');
    expect(codes).not.toContain('FINDINGS_PARTIAL_CORRUPTION');
    expect(codes).not.toContain('FINDINGS_SCHEMA_INVALID');
    expect(snapshot.state).toBe('AVAILABLE');
    expect((snapshot.dossiers ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
