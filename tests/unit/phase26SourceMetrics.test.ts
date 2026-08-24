import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';

const SOURCE_SHA = '2'.repeat(40);

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase26-metrics-'));
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
    '"get:/unproven":',
    '  client: App\\Handler\\Reader',
    '  method: unproven',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Reader.php'), `<?php
function read() {
  return ['id' => 1, 'status' => 'safe'];
}
function unproven() {
  return $this->buildResponse();
}
`);
  return root;
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

test.describe('Phase 26 source proof-gap intelligence', () => {
  test('reports safe analyzer diagnostics and deterministic proof-gap counts', () => {
    const root = fixture();
    try {
      const access = createSiblingSourceAccess(root);
      const first = discoverSourceSurfaces({ access, config: config() });
      const second = discoverSourceSurfaces({ access, config: config() });
      expect(first).toEqual(second);
      expect(first.surfaces.find((surface) => surface.operation.routeTemplate === '/read')?.contract.responseProof).toBe('PROVEN');
      const unproven = first.surfaces.find((surface) => surface.operation.routeTemplate === '/unproven');
      expect(unproven?.contract.responseProof).toBe('UNSUPPORTED_REFERENCE');
      expect(unproven?.contract.responseAnalyzerDiagnostics.some((diagnostic) => diagnostic.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && diagnostic.rejectionCode !== null)).toBe(true);
      expect(first.counters.responseProofGapCounts).toEqual(expect.arrayContaining([{ code: 'RESPONSE_ANALYZER_BRANCH_SET_INCOMPLETE+UNSUPPORTED_SYNTAX', count: 1 }]));
      expect(first.counters.semanticProofGapCounts).toEqual(expect.arrayContaining([{ code: 'SEMANTIC_ANALYZER_BRANCH_SET_INCOMPLETE+UNSUPPORTED_SYNTAX', count: 1 }]));
      expect(first.counters.responseAnalyzerCounts).toEqual(expect.arrayContaining([
        { analyzerId: 'PHP_RETURN_FIELD_TYPE', proven: 2, rejected: 0 },
        { analyzerId: 'PHP_RETURN_OBJECT_FIELDS', proven: 1, rejected: 1 },
        { analyzerId: 'PHP_RETURN_ROOT_TYPE', proven: 1, rejected: 0 },
        { analyzerId: 'PHP_ROW_KEYS_PUSH', proven: 0, rejected: 2 },
      ]));
      expect(JSON.stringify(first)).not.toContain('$this->buildResponse');
      expect(JSON.stringify(first)).not.toContain("'safe'");
      expect(first.deterministicDigest).toBe(second.deterministicDigest);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
