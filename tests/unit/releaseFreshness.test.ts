// ---------------------------------------------------------------------------
// NW-HIST-008 — RELEASE_BRANCH_FRESHNESS tests.
//
// Pure truth table over the real classifier with an injected ancestry oracle
// (no process involved), plus a real driver integration against tiny local
// fixture repositories created under .tmp-nightwatch/ and removed afterwards.
// Product repositories are never used as fixtures and are never modified.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  classifyReleaseFreshness,
  releaseFreshnessReport,
  RELEASE_FRESHNESS_REASON_CODES,
  RELEASE_FRESHNESS_VERDICTS,
  type ReleaseAncestryOracle,
} from '../../src/core/changeIntelligence/releaseFreshness';
import {
  RELEASE_REF_SCHEMA,
  validateReleaseRefInventory,
  type ReleaseRefRow,
} from '../../src/core/changeIntelligence/releaseFreshnessInventory';
import { resolveScratchPath } from '../../src/core/workspace/ephemeralLayout';

const ROOT = path.join(__dirname, '..', '..');
const TMP_ROOT = path.join(ROOT, resolveScratchPath('test', 'release-freshness'));
const REPOS_ROOT = path.join(TMP_ROOT, 'repos');
const FIXTURE_A = path.join(REPOS_ROOT, 'mobingilabs', 'ouchan');
const FIXTURE_B = path.join(REPOS_ROOT, 'mobingilabs', 'wave-api');

const fixSha = 'a'.repeat(40);
const tipSha = 'b'.repeat(40);
const row: ReleaseRefRow = {
  rowId: 'synthetic-service',
  repoId: 'mobingilabs/ouchan',
  fixSha,
  integrationRef: 'refs/heads/master',
  releaseRefs: ['refs/heads/next', 'refs/heads/production'],
  servicePaths: ['services/synthetic'],
  exclusions: [],
  deployFromIntegration: false,
  cherryPickModel: false,
};

function oracle(overrides: Partial<ReleaseAncestryOracle> = {}): ReleaseAncestryOracle {
  return {
    pin: () => ({ state: 'AVAILABLE', sha: fixSha }),
    ref: () => ({ state: 'AVAILABLE', sha: tipSha }),
    ancestor: () => 'CONTAINED',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure classifier truth table (invokes the production module directly).
// ---------------------------------------------------------------------------

test.describe('C6 classifier (pure, injected oracle)', () => {
  test('contained fix is fresh, deterministic, and the vocabulary cannot express deployment', () => {
    const input = { schemaVersion: RELEASE_REF_SCHEMA, rows: [row] };
    const first = releaseFreshnessReport(input, oracle());
    expect(first.rows[0]?.verdict).toBe('RELEASE_BRANCH_FRESH');
    expect(first.rows[0]?.containment).toEqual([
      { ref: 'refs/heads/master', sha: tipSha, state: 'CONTAINED' },
      { ref: 'refs/heads/next', sha: tipSha, state: 'CONTAINED' },
      { ref: 'refs/heads/production', sha: tipSha, state: 'CONTAINED' },
    ]);
    expect(first.reportDigest).toMatch(/^rfr:sha256:[0-9a-f]{24}$/);
    expect(first).toEqual(releaseFreshnessReport(input, oracle()));
    expect(first.freshness).toBe('LOCAL_TRACKING_REF_ONLY');
    expect(first.deploymentClaim).toBe('NONE');
    expect(Object.keys(first).sort()).toEqual(['schemaVersion', 'freshness', 'deploymentClaim', 'inventoryDigest', 'rows', 'reportDigest'].sort());
    expect(Object.keys(first.rows[0] ?? {}).sort()).toEqual(['rowId', 'repoId', 'fixSha', 'integrationRef', 'releaseRefs', 'servicePaths', 'containment', 'verdict', 'reasonCodes'].sort());

    // Policy: the executable vocabulary is closed and cannot express a
    // deployment assurance. This fails if a deployment-status concept is ever
    // introduced into the result surface.
    expect(RELEASE_FRESHNESS_VERDICTS).toEqual([
      'RELEASE_BRANCH_FRESH',
      'RELEASE_BRANCH_STALE',
      'REF_UNAVAILABLE',
      'PIN_UNAVAILABLE',
      'FIX_NOT_ON_INTEGRATION',
      'NOT_APPLICABLE_DECLARED',
      'INVENTORY_INVALID',
      'GIT_ERROR',
      'SERVICE_PATH_MISSING',
    ]);
    for (const verdict of RELEASE_FRESHNESS_VERDICTS) {
      expect(verdict).not.toMatch(/DEPLOY|RELEASED|IN_PRODUCTION/);
    }
    expect(RELEASE_FRESHNESS_REASON_CODES).toEqual(['MISSING_FROM_RELEASE_REF']);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toMatch(/\b(?:DEPLOYED|NOT_DEPLOYED|IN_PRODUCTION|NOT_IN_PRODUCTION|RELEASED|NOT_RELEASED)\b/);
    expect(serialized).not.toContain('deploymentStatus');
  });

  test('stale requires resolved refs, integration containment, and a concrete reason code', () => {
    const observed = oracle({
      ref: (_repo, ref) => ({ state: 'AVAILABLE', sha: ref === row.integrationRef ? fixSha : tipSha }),
      ancestor: (_repo, _fix, tip) => (tip === fixSha ? 'CONTAINED' : 'NOT_CONTAINED'),
    });
    const result = classifyReleaseFreshness(row, observed);
    expect(result.verdict).toBe('RELEASE_BRANCH_STALE');
    expect(result.reasonCodes).toEqual(['MISSING_FROM_RELEASE_REF']);
    expect(result.containment).toEqual([
      { ref: 'refs/heads/master', sha: fixSha, state: 'CONTAINED' },
      { ref: 'refs/heads/next', sha: tipSha, state: 'NOT_CONTAINED' },
      { ref: 'refs/heads/production', sha: tipSha, state: 'NOT_CONTAINED' },
    ]);
  });

  test('a missing release ref prevents STALE even when another ref lacks the fix', () => {
    let ancestryCalls = 0;
    const result = classifyReleaseFreshness(row, oracle({
      ref: (_repo, ref) => (ref.endsWith('/production') ? { state: 'UNAVAILABLE' } : { state: 'AVAILABLE', sha: tipSha }),
      ancestor: () => (++ancestryCalls === 1 ? 'CONTAINED' : 'NOT_CONTAINED'),
    }));
    expect(result.verdict).toBe('REF_UNAVAILABLE');
    expect(result.reasonCodes).toEqual([]);
    expect(ancestryCalls).toBe(1);
  });

  test('a declared model does not suppress an unavailable ref (rule 5 before rules 6/7)', () => {
    const unavailable = oracle({ ref: (_repo, ref) => (ref.endsWith('/next') ? { state: 'UNAVAILABLE' } : { state: 'AVAILABLE', sha: tipSha }) });
    expect(classifyReleaseFreshness({ ...row, cherryPickModel: true }, unavailable).verdict).toBe('REF_UNAVAILABLE');
    expect(classifyReleaseFreshness({ ...row, deployFromIntegration: true }, unavailable).verdict).toBe('REF_UNAVAILABLE');
  });

  for (const field of ['deployFromIntegration', 'cherryPickModel'] as const) {
    test(`a declared ${field} model is not applicable, never stale`, () => {
      const result = classifyReleaseFreshness({ ...row, [field]: true }, oracle({
        ref: (_repo, ref) => ({ state: 'AVAILABLE', sha: ref === row.integrationRef ? fixSha : tipSha }),
        ancestor: (_repo, _fix, tip) => (tip === fixSha ? 'CONTAINED' : 'NOT_CONTAINED'),
      }));
      expect(result.verdict).toBe('NOT_APPLICABLE_DECLARED');
      expect(result.reasonCodes).toEqual([]);
      // The release refs were observed (the model does not hide their state)...
      expect(result.containment).toHaveLength(3);
      // ...but no ancestry verdict was taken from them.
      expect(result.containment.every((entry) => entry.state !== 'NOT_CONTAINED')).toBe(true);
    });
  }

  test('an excluded-everything row is not applicable, never a vacuous fresh', () => {
    const result = classifyReleaseFreshness({ ...row, exclusions: [...row.releaseRefs] }, oracle());
    expect(result.verdict).toBe('NOT_APPLICABLE_DECLARED');
    expect(result.containment).toHaveLength(1);
  });

  test('unavailable pin, integration and containment fail closed', () => {
    expect(classifyReleaseFreshness(row, oracle({ pin: () => ({ state: 'UNAVAILABLE' }) })).verdict).toBe('PIN_UNAVAILABLE');
    expect(classifyReleaseFreshness(row, oracle({ pin: () => ({ state: 'ERROR' }) })).verdict).toBe('GIT_ERROR');
    expect(classifyReleaseFreshness(row, oracle({ ref: () => ({ state: 'UNAVAILABLE' }) })).verdict).toBe('REF_UNAVAILABLE');
    expect(classifyReleaseFreshness(row, oracle({ ancestor: () => 'NOT_CONTAINED' })).verdict).toBe('FIX_NOT_ON_INTEGRATION');
    expect(classifyReleaseFreshness(row, oracle({ ancestor: () => 'ERROR' })).verdict).toBe('GIT_ERROR');
    expect(classifyReleaseFreshness(row, oracle({ ancestor: (_repo, _fix, tip) => (tip === tipSha ? 'ERROR' : 'CONTAINED') })).verdict).toBe('GIT_ERROR');
    expect(classifyReleaseFreshness({ ...row, servicePaths: [] }, oracle()).verdict).toBe('SERVICE_PATH_MISSING');
    expect(classifyReleaseFreshness(row, oracle({ pin: () => { throw new Error('oracle exploded'); } })).verdict).toBe('GIT_ERROR');
  });

  test('an invalid inventory performs zero observation calls', () => {
    let calls = 0;
    const refused = () => {
      calls += 1;
      throw new Error('unexpected oracle call');
    };
    const probe = { pin: refused, ref: refused, ancestor: refused };
    const invalidRows = [
      { ...row, repoId: 'unapproved/repo' },
      { ...row, integrationRef: 'refs/heads/../../escape' },
      { ...row, integrationRef: 'refs/heads/master\n--upload-pack=evil' },
      { ...row, fixSha: 'not-a-sha' },
      { ...row, releaseRefs: ['refs/heads/next', 'refs/heads/next'] },
      { ...row, servicePaths: ['services/../../etc'] },
      { ...row, extra: true },
      { ...row, deployFromIntegration: 'yes' },
    ];
    for (const invalid of invalidRows) {
      expect(classifyReleaseFreshness(invalid, probe).verdict).toBe('INVENTORY_INVALID');
      const report = releaseFreshnessReport({ schemaVersion: RELEASE_REF_SCHEMA, rows: [invalid] }, probe);
      expect(report.rows[0]?.verdict).toBe('INVENTORY_INVALID');
      expect(report.rows[0]?.containment).toEqual([]);
    }
    expect(calls).toBe(0);
    expect(validateReleaseRefInventory({ schemaVersion: RELEASE_REF_SCHEMA, rows: Array(65).fill(row) }).ok).toBe(false);
    expect(validateReleaseRefInventory({ schemaVersion: 'nightwatch.release-refs.v2', rows: [row] }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Driver integration against tiny local fixture repositories.
// ---------------------------------------------------------------------------

function git(cwd: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 512 * 1024,
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`fixture git ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').slice(0, 200)}`);
  }
  return result.stdout ?? '';
}

function initFixtureRepo(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, ['init', '--quiet']);
  git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/master']);
  git(dir, ['config', 'user.name', 'Nightwatch Fixture']);
  git(dir, ['config', 'user.email', 'fixture@example.invalid']);
}

function commit(dir: string, message: string, fileName: string, content: string): string {
  const absolute = path.join(dir, fileName);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, 'utf8');
  git(dir, ['add', '-A']);
  const date = '2026-01-02T03:04:05Z';
  git(dir, ['commit', '--quiet', '-m', message], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  return git(dir, ['rev-parse', 'HEAD']).trim();
}

function runDriver(inventoryPath: string): { status: number | null; report: any; written: any } {
  const outPath = path.join(TMP_ROOT, 'report.json');
  fs.rmSync(outPath, { force: true });
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'release-freshness.mjs'), '--inventory', inventoryPath, '--out', outPath, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NIGHTWATCH_REPOS_ROOT: REPOS_ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  const written = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  return { status: result.status, report, written };
}

let fixtureAFix = '';
let fixtureAOther = '';
let fixtureBFix = '';
let fixtureBOther = '';

test.describe('C6 read-only driver (local Git fixtures)', () => {
  test.beforeAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    initFixtureRepo(FIXTURE_A);
    const aBase = commit(FIXTURE_A, 'base', 'services/app/base.txt', 'base\n');
    git(FIXTURE_A, ['checkout', '--quiet', '-b', 'feature']);
    fixtureAFix = commit(FIXTURE_A, 'fix', 'services/app/fix.txt', 'fix\n');
    git(FIXTURE_A, ['checkout', '--quiet', 'master']);
    git(FIXTURE_A, ['merge', '--no-ff', '--quiet', '-m', 'merge fix', 'feature']);
    git(FIXTURE_A, ['branch', 'next', aBase]);
    git(FIXTURE_A, ['branch', 'production', aBase]);
    fixtureAOther = commit(FIXTURE_A, 'unrelated', 'services/app/other.txt', 'other\n');

    initFixtureRepo(FIXTURE_B);
    commit(FIXTURE_B, 'base', 'src/app.php', '<?php\n');
    fixtureBFix = commit(FIXTURE_B, 'fix', 'src/fix.php', '<?php\n');
    git(FIXTURE_B, ['branch', 'next', fixtureBFix]);
    git(FIXTURE_B, ['branch', 'production', fixtureBFix]);
    const bBase = git(FIXTURE_B, ['rev-parse', 'HEAD~1']).trim();
    git(FIXTURE_B, ['checkout', '--quiet', '-b', 'other', bBase]);
    fixtureBOther = commit(FIXTURE_B, 'other', 'src/other.php', '<?php\n');
    git(FIXTURE_B, ['checkout', '--quiet', 'master']);
  });

  test.afterAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  test('every designed verdict is produced by the real classifier and driver', () => {
    const inventory = {
      schemaVersion: RELEASE_REF_SCHEMA,
      rows: [
        { rowId: 'stale-next-and-production', repoId: 'mobingilabs/ouchan', fixSha: fixtureAFix, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next', 'refs/heads/production'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: false, cherryPickModel: false },
        { rowId: 'cherry-pick-declared', repoId: 'mobingilabs/ouchan', fixSha: fixtureAFix, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next', 'refs/heads/production'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: false, cherryPickModel: true },
        { rowId: 'deploy-from-integration', repoId: 'mobingilabs/ouchan', fixSha: fixtureAFix, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next', 'refs/heads/production'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: true, cherryPickModel: false },
        { rowId: 'release-ref-unavailable', repoId: 'mobingilabs/ouchan', fixSha: fixtureAFix, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next', 'refs/heads/absent'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: false, cherryPickModel: false },
        { rowId: 'pin-unavailable', repoId: 'mobingilabs/ouchan', fixSha: 'c'.repeat(40), integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: false, cherryPickModel: false },
        { rowId: 'contained-everywhere', repoId: 'mobingilabs/wave-api', fixSha: fixtureBFix, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next', 'refs/heads/production'], servicePaths: ['src/app.php'], exclusions: [], deployFromIntegration: false, cherryPickModel: false },
        { rowId: 'fix-not-on-integration', repoId: 'mobingilabs/wave-api', fixSha: fixtureBOther, integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next'], servicePaths: ['src/app.php'], exclusions: [], deployFromIntegration: false, cherryPickModel: false },
      ],
    };
    const inventoryPath = path.join(TMP_ROOT, 'inventory.json');
    fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

    const first = runDriver(inventoryPath);
    expect(first.status).toBe(1);
    const rowIds = first.report.rows.map((entry: any) => entry.rowId);
    expect(rowIds).toEqual([...rowIds].sort());
    const byId = new Map<string, any>();
    for (const entry of first.report.rows as any[]) byId.set(String(entry.rowId), entry);
    expect(byId.get('stale-next-and-production').verdict).toBe('RELEASE_BRANCH_STALE');
    expect(byId.get('cherry-pick-declared').verdict).toBe('NOT_APPLICABLE_DECLARED');
    expect(byId.get('deploy-from-integration').verdict).toBe('NOT_APPLICABLE_DECLARED');
    expect(byId.get('release-ref-unavailable').verdict).toBe('REF_UNAVAILABLE');
    expect(byId.get('pin-unavailable').verdict).toBe('PIN_UNAVAILABLE');
    expect(byId.get('contained-everywhere').verdict).toBe('RELEASE_BRANCH_FRESH');
    expect(byId.get('fix-not-on-integration').verdict).toBe('FIX_NOT_ON_INTEGRATION');
    expect(byId.get('stale-next-and-production').reasonCodes).toEqual(['MISSING_FROM_RELEASE_REF']);
    expect(byId.get('stale-next-and-production').containment).toEqual([
      { ref: 'refs/heads/master', sha: expect.stringMatching(/^[0-9a-f]{40}$/), state: 'CONTAINED' },
      { ref: 'refs/heads/next', sha: expect.stringMatching(/^[0-9a-f]{40}$/), state: 'NOT_CONTAINED' },
      { ref: 'refs/heads/production', sha: expect.stringMatching(/^[0-9a-f]{40}$/), state: 'NOT_CONTAINED' },
    ]);
    expect(byId.get('release-ref-unavailable').containment).toEqual([
      { ref: 'refs/heads/master', sha: expect.stringMatching(/^[0-9a-f]{40}$/), state: 'CONTAINED' },
      { ref: 'refs/heads/absent', sha: null, state: 'UNAVAILABLE' },
      { ref: 'refs/heads/next', sha: expect.stringMatching(/^[0-9a-f]{40}$/), state: 'NOT_CHECKED' },
    ]);
    expect(first.report.freshness).toBe('LOCAL_TRACKING_REF_ONLY');
    expect(first.report.deploymentClaim).toBe('NONE');
    expect(first.report.reportDigest).toMatch(/^rfr:sha256:[0-9a-f]{24}$/);
    expect(first.written).toEqual(first.report);

    // Repeat-run identity: identical report and digest from a fresh process.
    const second = runDriver(inventoryPath);
    expect(second.status).toBe(1);
    expect(second.report).toEqual(first.report);
    expect(second.report.reportDigest).toBe(first.report.reportDigest);

    // Same fixture, one unrelated row removed: no STALE remains, exit 0, and
    // the remaining rows' digests are unchanged by the removal of another row
    // only in the sense that the report is still deterministic.
    const cleanInventory = { ...inventory, rows: inventory.rows.filter((entry) => entry.rowId !== 'stale-next-and-production') };
    const cleanPath = path.join(TMP_ROOT, 'inventory-clean.json');
    fs.writeFileSync(cleanPath, `${JSON.stringify(cleanInventory, null, 2)}\n`, 'utf8');
    const clean = runDriver(cleanPath);
    expect(clean.status).toBe(0);
    expect(clean.report.rows.some((entry: any) => entry.verdict === 'RELEASE_BRANCH_STALE')).toBe(false);
  });

  test('an invalid inventory is refused with no ref observations', () => {
    const inventoryPath = path.join(TMP_ROOT, 'inventory-invalid.json');
    fs.writeFileSync(inventoryPath, `${JSON.stringify({
      schemaVersion: RELEASE_REF_SCHEMA,
      rows: [{ rowId: 'unapproved', repoId: 'mobingilabs/secret-repo', fixSha: 'd'.repeat(40), integrationRef: 'refs/heads/master', releaseRefs: ['refs/heads/next'], servicePaths: ['services/app'], exclusions: [], deployFromIntegration: false, cherryPickModel: false }],
    }, null, 2)}\n`, 'utf8');
    const result = runDriver(inventoryPath);
    expect(result.status).toBe(2);
    expect(result.report.rows).toHaveLength(1);
    expect(result.report.rows[0].verdict).toBe('INVENTORY_INVALID');
    expect(result.report.rows[0].containment).toEqual([]);
    expect(result.report.rows[0].rowId).toBeNull();
  });
});
