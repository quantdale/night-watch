import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { buildReadOnlyCandidateCensus } from '../../src/core/source/readonlyCandidateCensus';

const SOURCE_SHA = '3'.repeat(40);

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-readonly-candidates-'));
}

function makeRepo(root: string): void {
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/pure":',
    '  client: App\\Handler\\Pure',
    '  method: pure',
    '"get:/call":',
    '  client: App\\Handler\\Pure',
    '  method: call',
    '"get:/writer":',
    '  client: App\\Handler\\Pure',
    '  method: writer',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Pure.php'), `<?php
function pure() { return ['READONLY_CANDIDATE_SENTINEL']; }
function call() { return readFromService(); }
function writer() { $value = ['WRITE_CANDIDATE_SENTINEL']; return $value; }
`);
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
      maxFileBytes: 32_000,
      maxTotalBytes: 100_000,
    }],
  });
}

test('candidate census distinguishes pure literals from calls, writes, and GET-only signals', () => {
  const root = tempRoot();
  try {
    makeRepo(root);
    const access = createSiblingSourceAccess(root);
    const discovery = discoverSourceSurfaces({ access, config: config() });
    const first = buildReadOnlyCandidateCensus({ access, discovery });
    const second = buildReadOnlyCandidateCensus({ access, discovery });
    expect(first).toEqual(second);
    const direct = first.familyMeasurements.find((measurement) => measurement.family === 'DIRECT_PURE_RETURN_HANDLER');
    expect(direct).toMatchObject({
      population: 1,
      mechanicallyCompletePopulation: 1,
      positiveReadEvidencePopulation: 0,
      currentPhase24EligiblePopulation: 0,
      admission: 'NOT_ADMITTED_NO_READ_EVIDENCE',
    });
    expect(direct?.rejectionCounts).toEqual(expect.arrayContaining([
      { code: 'NON_LITERAL_RETURN_EXPRESSION', count: 1 },
      { code: 'NON_RETURN_BODY_SYNTAX', count: 1 },
    ]));
    const getOnly = first.familyMeasurements.find((measurement) => measurement.family === 'HTTP_GET_ONLY_NEGATIVE_CONTROL');
    expect(getOnly).toMatchObject({ population: 3, positiveReadEvidencePopulation: 0, admission: 'NEGATIVE_CONTROL_ONLY' });
    expect(JSON.stringify(first)).not.toContain('READONLY_CANDIDATE_SENTINEL');
    expect(JSON.stringify(first)).not.toContain('WRITE_CANDIDATE_SENTINEL');
    expect(first.deterministicDigest).toMatch(/^source-readonly-candidate-census:sha256:[0-9a-f]{24}$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

