// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — record-identity lane acceptance.
//
// Every test drives the REAL production modules (`recordIdentityShapes`,
// `recordIdentityStore` through the sequences, `recordIdentity` orchestration)
// or spawns the REAL driver. Fixtures are synthetic Go source fragments modeled
// on the historically evidenced families; no product code is executed and no
// datastore is contacted.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RECORD_IDENTITY_CONTRACTS_SCHEMA,
  validateRecordIdentityContractConfig,
} from '../../src/core/source/recordIdentityContract';
import { runRecordIdentityContracts } from '../../src/core/source/recordIdentity';
import { createSyntheticStore, syntheticStoreDigest } from '../../src/core/source/recordIdentityStore';

const ROOT = path.resolve(__dirname, '..', '..');
const SHA = 'a'.repeat(40);
const REPO = 'mobingilabs/ouchan';

const FIXTURE_DUAL = [
  'package fixture',
  'func CreateRecordA(id string, account string) string {',
  '  key := fmt.Sprintf("company_id|%s|account_id|%s", id, account)',
  '  return key',
  '}',
  'func CreateRecordB(id string, account string) string {',
  '  key := fmt.Sprintf("account_id|%s|company_id|%s", account, id)',
  '  return key',
  '}',
  '',
].join('\n');

const FIXTURE_GUARDED_SINGLE = [
  'package fixture',
  'func CreateGuarded(id string, account string) string {',
  '  _ = input.ConditionExpression',
  '  key := fmt.Sprintf("company_id|%s|account_id|%s", id, account)',
  '  return key',
  '}',
  '',
].join('\n');

const FIXTURE_CONDITIONAL = [
  'package fixture',
  'func CreateRecordC(id string, account string) string {',
  '  _ = input.ConditionExpression',
  '  key := fmt.Sprintf("company_id|%s|account_id|%s", id, account)',
  '  return key',
  '}',
  'func CreateRecordD(id string, account string) string {',
  '  key := fmt.Sprintf("account_id|%s|company_id|%s", account, id)',
  '  return key',
  '}',
  '',
].join('\n');

const FIXTURE_DELETE_COMPLETE = [
  'package fixture',
  'func DeleteParent(id string) {',
  '  _ = tables.PutItem("parent", id)',
  '  _ = tables.DeleteItem("T", id)',
  '  _ = tables.DeleteItem("D1", id)',
  '  _ = tables.DeleteItem("D2", id)',
  '}',
  '',
].join('\n');

const FIXTURE_DELETE_PARTIAL = [
  'package fixture',
  'func DeleteParentPartial(id string) {',
  '  _ = tables.DeleteItem("T", id)',
  '}',
  '',
].join('\n');

const FIXTURE_DELETE_BEST_EFFORT = [
  'package fixture',
  'func DeleteParentBestEffort(id string) {',
  '  _ = tables.DeleteItem("T", id)',
  '  if err != nil {',
  '    glog.Warningf("cleanup failed: %v", err)',
  '  }',
  '  _ = tables.DeleteItem("D1", id)',
  '  _ = tables.DeleteItem("D2", id)',
  '}',
  '',
].join('\n');

const FIXTURE_AMBIGUOUS = [
  'package fixture',
  'func BuildDynamic(f formatter, id string) string {',
  '  key := fmt.Sprintf(f.Template(), id)',
  '  return key',
  '}',
  '',
].join('\n');

const FIXTURE_SENTINEL = [
  'package fixture',
  'func CreateWithLog(id string) string {',
  '  glog.Infof(fmt.Sprintf("failed for customer SENTINELCUSTOMER9 at %s", id))',
  '  key := fmt.Sprintf("company_id|%s|customer_id|%s", id, "x")',
  '  return key',
  '}',
  '',
].join('\n');

function accessFor(files: Readonly<Record<string, string>>, sha = SHA) {
  return {
    reader: {
      readFile(repoId: string, relativePath: string): string | null {
        return files[`${repoId}:${relativePath}`] ?? null;
      },
    },
    currentness: {
      currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
        return repoId === REPO ? { repoId, sha } : null;
      },
    },
  };
}

function contract(overrides: Record<string, unknown> = {}) {
  return {
    contractId: 'fixture-one',
    repoId: REPO,
    sha: SHA,
    roots: ['services'],
    paths: ['services/fixture.go'],
    functions: ['CreateRecordA', 'CreateRecordB'],
    logicalIdentitySegments: ['company_id'],
    consistencyModel: 'EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE',
    expectedLifecycle: 'CREATE_ONCE_THEN_IDENTITY_STABLE',
    failureSemantics: 'NONE',
    derivedRecordCount: 0,
    exclusions: [],
    ...overrides,
  };
}

function run(files: Readonly<Record<string, string>>, overrides: Record<string, unknown> = {}, sha = SHA) {
  const config = { schemaVersion: RECORD_IDENTITY_CONTRACTS_SCHEMA, contracts: [contract(overrides)] };
  return runRecordIdentityContracts({ config, ...accessFor(files, sha) });
}

const FILE = `${REPO}:services/fixture.go`;

test.describe('C5 record identity — declared lane', () => {
  test('the shipped registry validates and declares exactly two families', () => {
    const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'record-identity-contracts.v1.json'), 'utf8'));
    const validation = validateRecordIdentityContractConfig(shipped);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.config.contracts.map((entry) => entry.contractId)).toEqual([
        'azure-marketplace-dual-identity',
        'billingd-derived-record-cleanup',
      ]);
    }
  });

  test('an unknown repository is DECLARATION_INVALID before any read', () => {
    const config = { schemaVersion: RECORD_IDENTITY_CONTRACTS_SCHEMA, contracts: [contract({ repoId: 'mobingilabs/not-admitted' })] };
    const report = runRecordIdentityContracts({ config, ...accessFor({}) });
    expect(report.contracts[0]!.verdict).toBe('DECLARATION_INVALID');
    expect(report.reportDigest).toMatch(/^rid:sha256:[0-9a-f]{24}$/);
  });

  test('dual physical shapes under the declared eventual model reproduce a duplicate', () => {
    const report = run({ [FILE]: FIXTURE_DUAL });
    const row = report.contracts[0]!;
    expect(row.verdict).toBe('DUPLICATE_IDENTITY_REPRODUCED');
    expect(row.reasonCodes).toContain('DUAL_PHYSICAL_SHAPES');
    const sequenceA = row.sequences.find((entry) => entry.sequenceId === 'A')!;
    expect(sequenceA.outcome).toBe('DUPLICATE_IDENTITY_REPRODUCED');
    expect(sequenceA.stateDigest).toMatch(/^rst:sha256:[0-9a-f]{24}$/);
    const sequenceC = row.sequences.find((entry) => entry.sequenceId === 'C')!;
    expect(sequenceC.outcome).toBe('DUPLICATE_IDENTITY_REPRODUCED');
  });

  test('a conditional guard on a single canonical shape keeps the contract', () => {
    const report = run({ [FILE]: FIXTURE_GUARDED_SINGLE }, { functions: ['CreateGuarded'] });
    const row = report.contracts[0]!;
    expect(row.verdict).toBe('IDENTITY_CONTRACT_PRESERVED');
    expect(row.functions.some((facts) => facts.conditionalGuard === 'PRESENT')).toBe(true);
    const sequenceA = row.sequences.find((entry) => entry.sequenceId === 'A')!;
    expect(sequenceA.outcome).toBe('PRESERVED');
    const sequenceC = row.sequences.find((entry) => entry.sequenceId === 'C')!;
    expect(sequenceC.outcome).toBe('PRESERVED');
  });

  test('a guard on competing distinct shapes cannot block the duplicate', () => {
    const report = run({ [FILE]: FIXTURE_CONDITIONAL }, { functions: ['CreateRecordC', 'CreateRecordD'] });
    const row = report.contracts[0]!;
    expect(row.verdict).toBe('DUPLICATE_IDENTITY_REPRODUCED');
    expect(row.reasonCodes).toContain('DUAL_PHYSICAL_SHAPES');
    expect(row.functions.some((facts) => facts.conditionalGuard === 'PRESENT')).toBe(true);
  });

  test('a complete delete cascade preserves the contract', () => {
    const report = run({ [FILE]: FIXTURE_DELETE_COMPLETE }, {
      functions: ['DeleteParent'],
      consistencyModel: 'DELETE_CASCADE_EXPECTED',
      expectedLifecycle: 'CREATE_UPDATE_DELETE_RECREATE',
      failureSemantics: 'NONE',
      derivedRecordCount: 2,
    });
    expect(report.contracts[0]!.verdict).toBe('IDENTITY_CONTRACT_PRESERVED');
  });

  test('an incomplete delete cascade reproduces a surviving derived record', () => {
    const report = run({ [FILE]: FIXTURE_DELETE_PARTIAL }, {
      functions: ['DeleteParentPartial'],
      consistencyModel: 'DELETE_CASCADE_EXPECTED',
      expectedLifecycle: 'CREATE_UPDATE_DELETE_RECREATE',
      failureSemantics: 'NONE',
      derivedRecordCount: 2,
    });
    const row = report.contracts[0]!;
    expect(row.verdict).toBe('DERIVED_RECORD_ORPHAN_REPRODUCED');
    expect(row.reasonCodes).toContain('DERIVED_CLEANUP_INCOMPLETE');
  });

  test('declared best-effort cleanup failure reproduces the historical escape class', () => {
    const report = run({ [FILE]: FIXTURE_DELETE_BEST_EFFORT }, {
      functions: ['DeleteParentBestEffort'],
      consistencyModel: 'DELETE_CASCADE_EXPECTED',
      expectedLifecycle: 'CREATE_UPDATE_DELETE_RECREATE',
      failureSemantics: 'BEST_EFFORT_WARNING',
      derivedRecordCount: 2,
    });
    const row = report.contracts[0]!;
    expect(row.verdict).toBe('DERIVED_RECORD_ORPHAN_REPRODUCED');
    expect(row.reasonCodes).toContain('BEST_EFFORT_CLEANUP_FAILURE');
    expect(row.functions[0]!.warningOnFailure).toBe(true);
  });

  test('a dynamic key construction fails closed as EXTRACTION_AMBIGUOUS', () => {
    const report = run({ [FILE]: FIXTURE_AMBIGUOUS }, { functions: ['BuildDynamic'] });
    expect(report.contracts[0]!.verdict).toBe('EXTRACTION_AMBIGUOUS');
    expect(report.contracts[0]!.sequences).toEqual([]);
  });

  test('a missing function fails closed as EXTRACTION_AMBIGUOUS', () => {
    const report = run({ [FILE]: FIXTURE_DUAL }, { functions: ['DoesNotExist'] });
    expect(report.contracts[0]!.verdict).toBe('EXTRACTION_AMBIGUOUS');
    expect(report.contracts[0]!.reasonCodes).toContain('FUNCTION_NOT_FOUND');
  });

  test('a stale snapshot and an unavailable repository are non-judged states', () => {
    const stale = run({ [FILE]: FIXTURE_DUAL }, { sha: 'b'.repeat(40) });
    expect(stale.contracts[0]!.verdict).toBe('SOURCE_STALE');
    expect(stale.contracts[0]!.snapshotSha).toBe(SHA);
    const missing = runRecordIdentityContracts({ config: { schemaVersion: RECORD_IDENTITY_CONTRACTS_SCHEMA, contracts: [contract()] }, ...accessFor({ [FILE]: FIXTURE_DUAL }, '') });
    expect(missing.contracts[0]!.verdict).toBe('SOURCE_UNAVAILABLE');
  });

  test('a declared exclusion removes exactly the excluded shape digest', () => {
    const first = run({ [FILE]: FIXTURE_DUAL });
    const digests = first.contracts[0]!.functions.flatMap((facts) => facts.shapes.map((entry) => entry.digest));
    expect(new Set(digests).size).toBe(2);
    const second = run({ [FILE]: FIXTURE_DUAL }, { exclusions: [digests[1]!] });
    expect(second.contracts[0]!.verdict).toBe('IDENTITY_CONTRACT_PRESERVED');
  });

  test('value-like message literals cannot reach the report', () => {
    const report = run({ [FILE]: FIXTURE_SENTINEL }, { functions: ['CreateWithLog'] });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('SENTINELCUSTOMER9');
    expect(report.contracts[0]!.functions[0]!.nonKeyFormats).toBeGreaterThanOrEqual(1);
  });

  test('repeated evaluation produces identical digests', () => {
    const first = run({ [FILE]: FIXTURE_DUAL });
    const second = run({ [FILE]: FIXTURE_DUAL });
    expect(second.reportDigest).toBe(first.reportDigest);
    expect(second.contracts[0]!.sequences).toEqual(first.contracts[0]!.sequences);
    const storeA = createSyntheticStore();
    storeA.put('k', 'v');
    const storeB = createSyntheticStore();
    storeB.put('k', 'v');
    expect(syntheticStoreDigest(storeB)).toBe(syntheticStoreDigest(storeA));
  });
});

test.describe('C5 record identity — driver', () => {
  test('the driver reproduces a fixture family and writes a sanitized report', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-ri-driver-'));
    try {
      const siblingRoot = path.join(sandbox, 'siblings');
      const repoDir = path.join(siblingRoot, 'mobingilabs', 'ouchan');
      fs.mkdirSync(path.join(repoDir, 'services'), { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'services', 'fixture.go'), FIXTURE_DUAL, 'utf8');
      const git = (args: string[]) => spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
      git(['init', '-q', '-b', 'master']);
      git(['add', '.']);
      git(['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-qm', 'fixture']);
      const sha = git(['rev-parse', 'HEAD']).stdout.trim();
      const configPath = path.join(sandbox, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ schemaVersion: RECORD_IDENTITY_CONTRACTS_SCHEMA, contracts: [contract({ sha })] }), 'utf8');
      const outPath = path.join(sandbox, 'report.json');
      const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'record-identity.mjs'), '--config', configPath, '--out', outPath], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_REPOS_ROOT: siblingRoot },
      });
      expect(result.status).toBe(1);
      const report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      expect(report.contracts[0].verdict).toBe('DUPLICATE_IDENTITY_REPRODUCED');
      expect(report.productionStateClaim).toBe('NONE');
      expect(report.reportDigest).toMatch(/^rid:sha256:[0-9a-f]{24}$/);
      expect(JSON.stringify(report)).not.toContain('SENTINELCUSTOMER9');
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('a missing config is refused before any source read', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'record-identity.mjs'), '--config', path.join(os.tmpdir(), 'does-not-exist-ri.json')], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('CONFIG_UNREADABLE');
  });
});
