import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { compareSourceSurfaces } from '../../src/core/source/invalidation';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';

const SOURCE_SHA = '3'.repeat(40);

function setup(): { readonly root: string; readonly repo: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase26-invalidation-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/read":',
    '  client: App\\Handler\\Reader',
    '  method: read',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Reader.php'), `<?php
function read() {
  return ['id' => 1];
}
`);
  return { root, repo };
}

function config() {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.yaml'],
      maxFiles: 32,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
}

function state(root: string) {
  const access = createSiblingSourceAccess(root);
  const scanConfig = config();
  const discovery = discoverSourceSurfaces({ access, config: scanConfig });
  const portfolio = analyzeSourceSurfacesIntoPhase24({ access, config: scanConfig, discovery, maxCandidates: 1 }).portfolio;
  return { discovery, portfolio };
}

test.describe('Phase 26 response/semantic invalidation', () => {
  test('invalidates dependent response and semantic proof after a same-SHA shape change', () => {
    const { root, repo } = setup();
    try {
      const prior = state(root);
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Reader.php'), `<?php
function read() {
  return ['id' => 1, 'status' => 'safe'];
}
`);
      const current = state(root);
      const report = compareSourceSurfaces({ prior, current });
      expect(report.changedFiles.map((file) => file.relativePath)).toEqual(['src/App/Handler/Reader.php']);
      expect(report.changedHandlers).toHaveLength(1);
      expect(report.changedResponseContracts).toHaveLength(1);
      expect(report.changedSemanticContracts).toHaveLength(1);
      expect(report.unchangedSurfaceIds).toEqual([]);
      expect(report.invalidationLedger?.records.some((record) => record.reasonCodes.includes('CONTRACT_IDENTITY_CHANGED'))).toBe(true);
      expect(report.invalidationLedger?.records.some((record) => record.state === 'CONTRACT_CHANGED' || record.state === 'SOURCE_CHANGED')).toBe(true);
      expect(report.invalidationLedger?.replayInvalidatedCandidateIds.length).toBeGreaterThan(0);
      expect(report.invalidationLedger?.dossierInvalidatedCandidateIds.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('preserves unaffected surface identity for an unrelated admitted file', () => {
    const { root, repo } = setup();
    try {
      const prior = state(root);
      fs.writeFileSync(path.join(repo, 'src', 'Unrelated.php'), '<?php function unrelated() { return []; }\n');
      const current = state(root);
      const report = compareSourceSurfaces({ prior, current });
      expect(report.addedFiles.map((file) => file.relativePath)).toEqual(['src/Unrelated.php']);
      expect(report.changedResponseContracts).toEqual([]);
      expect(report.changedSemanticContracts).toEqual([]);
      expect(report.unchangedSurfaceIds).toHaveLength(1);
      expect(report).toEqual(compareSourceSurfaces({ prior, current }));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
