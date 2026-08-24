import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { compareSourceSurfaces } from '../../src/core/source/invalidation';

const SOURCE_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

function setup(): { readonly root: string; readonly repo: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-invalidation-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/master\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'master'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Schema'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/accts":',
    '  client: App\\Handler\\Account',
    '  method: getAccountVendor',
    '  request: src/App/Schema/AccountRequest.json',
    '  response: src/App/Schema/AccountResponse.json',
    '"post:/accts":',
    '  client: App\\Handler\\Account',
    '  method: updateAccount',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
`);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountRequest.json'), '{"type":"object","properties":{"page":{"type":"integer"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountResponse.json'), '{"type":"array","items":{"type":"object"}}\n');
  return { root, repo };
}

function config() {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: SOURCE_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml', '.ts'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
  });
}

function state(root: string) {
  const access = createSiblingSourceAccess(root);
  const discovery = discoverSourceSurfaces({ access, config: config() });
  return { discovery, portfolio: analyzeSourceSurfacesIntoPhase24({ access, config: config(), discovery, maxCandidates: 2 }).portfolio };
}

test.describe('Phase 25 incremental source invalidation', () => {
  test('does not invalidate candidates for an unrelated admitted file', () => {
    const { root, repo } = setup();
    try {
      const prior = state(root);
      fs.writeFileSync(path.join(repo, 'src', 'Unrelated.ts'), 'const unrelated = "safe";\n');
      const current = state(root);
      const report = compareSourceSurfaces({ prior, current });
      expect(report.addedFiles.map((file) => file.relativePath)).toEqual(['src/Unrelated.ts']);
      expect(report.changedFiles).toHaveLength(0);
      expect(report.changedOperations).toHaveLength(0);
      expect(report.invalidationLedger?.changedCandidateIds).toEqual([]);
      expect(report.invalidationLedger?.records.every((record) => record.state === 'CURRENT')).toBe(true);
      expect(report.unchangedSurfaceIds).toHaveLength(2);
      expect(report).toEqual(compareSourceSurfaces({ prior, current }));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('marks relevant same-SHA evidence changes and invalidates replay/dossier assumptions', () => {
    const { root, repo } = setup();
    try {
      const prior = state(root);
      fs.appendFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), '\n// bounded evidence change\n');
      const current = state(root);
      const report = compareSourceSurfaces({ prior, current });
      expect(report.changedFiles.map((file) => file.relativePath)).toEqual(['src/App/Handler/Account.php']);
      expect(report.changedHandlers.length).toBeGreaterThan(0);
      expect(report.changedResponseContracts).toEqual([]);
      expect(report.changedSemanticContracts).toEqual([]);
      expect(report.invalidationLedger?.records.some((record) => record.reasonCodes.includes('SOURCE_EVIDENCE_CHANGED'))).toBe(true);
      expect(report.invalidationLedger?.replayInvalidatedCandidateIds.length).toBeGreaterThan(0);
      expect(report.invalidationLedger?.dossierInvalidatedCandidateIds.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
