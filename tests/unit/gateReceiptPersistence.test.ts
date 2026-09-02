// R-11 — durable quality-gate receipt persistence.
//
// The failure this suite exists to prevent is not hypothetical. During C-10.5
// a `gate:clean` run returned TEST_FAILURE and the per-group detail was
// UNRECOVERABLE, because the receipt existed only on stdout and the invocation
// piped it through a filter that printed `finalResult`. The cause of that
// failure had to be inferred later from an unrelated CI run.
//
// So the properties under test are: the gate writes the receipt itself; the
// written bytes are identical to the stdout bytes; failures are written too;
// the destination is confined and every unsafe destination is refused BEFORE
// any group runs; a partial or stale file is never accepted; and stdout — the
// channel that failed — can no longer influence what a consumer reads.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  GATE_RECEIPT_PATH_ENV,
  gateReceiptPermittedRoots,
  persistGateReceipt,
  readPersistedGateReceipt,
  resolveGateReceiptTarget,
} from '../../bin/lib/gate-receipt.mjs';

const ROOT = path.resolve(__dirname, '../..');
const GATE = path.join(ROOT, 'bin', 'quality-gate.mjs');
const RECEIPT_SCHEMA = 'nightwatch.quality-gate-receipt.v1';

function scratch(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-r11-${prefix}-`));
}

function syntheticReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: RECEIPT_SCHEMA,
    gateDefinitionDigest: `sha256:${'a'.repeat(64)}`,
    gitHead: 'b'.repeat(40),
    packageLockDigest: `sha256:${'c'.repeat(64)}`,
    nodeMajor: 20,
    environmentClass: 'CLEAN',
    receiptPersistenceRequested: true,
    groupIds: ['SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE'],
    groups: [
      {
        id: 'SEMANTIC_COMPATIBILITY',
        required: true,
        status: 'TEST_FAILURE',
        exitCode: 1,
        counts: { total: 1996, passed: 1982, skipped: 13, didNotRun: 0, failed: 1 },
        details: { failedLocations: ['tests/unit/phase24ProxyLifecycle.test.ts:105'], deepContainmentLane: 'NOT_EXERCISED_BWRAP_UNAVAILABLE' },
      },
      { id: 'OWNER_PROVENANCE', required: true, status: 'NOT_RUN', exitCode: null, counts: { total: null, passed: null, skipped: null, failed: null } },
    ],
    finalResult: 'TEST_FAILURE',
    receiptDigest: `receipt:sha256:${'0'.repeat(24)}`,
    ...overrides,
  };
}

test.describe('R-11 receipt destination confinement', () => {
  test('a permitted temporary root always exists and the repository is never one', () => {
    const roots = gateReceiptPermittedRoots({});
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(path.isAbsolute(root)).toBe(true);
      expect(fs.realpathSync(ROOT).startsWith(root === path.sep ? root : `${root}${path.sep}`)).toBe(false);
    }
  });

  test('an absent explicit path resolves to a confined per-mode, per-head default', () => {
    const target = resolveGateReceiptTarget({ environment: {}, repositoryRoot: ROOT, mode: 'local', gitHead: 'd'.repeat(40) });
    expect(target.error).toBeUndefined();
    expect(target.origin).toBe('DEFAULT');
    expect(path.isAbsolute(target.file as string)).toBe(true);
    // Durability is automatic, because the failure being eliminated was an
    // operator losing the only copy — a mechanism you must remember would not
    // have prevented OBS-C105-1.
    expect(path.basename(target.file as string)).toBe(`local-${'d'.repeat(12)}.json`);
    const roots = gateReceiptPermittedRoots({});
    expect(roots.some((root) => (target.file as string).startsWith(`${root}${path.sep}`))).toBe(true);
  });

  test('the default path distinguishes gate modes and heads so runs cannot overwrite each other', () => {
    const a = resolveGateReceiptTarget({ environment: {}, repositoryRoot: ROOT, mode: 'local', gitHead: 'e'.repeat(40) });
    const b = resolveGateReceiptTarget({ environment: {}, repositoryRoot: ROOT, mode: 'clean', gitHead: 'e'.repeat(40) });
    const c = resolveGateReceiptTarget({ environment: {}, repositoryRoot: ROOT, mode: 'local', gitHead: 'f'.repeat(40) });
    expect(new Set([a.file, b.file, c.file]).size).toBe(3);
  });

  for (const [label, requested, code] of [
    ['a relative path', 'receipts/gate.json', 'GATE_RECEIPT_PATH_NOT_ABSOLUTE'],
    ['a traversal segment', `${path.sep}tmp${path.sep}..${path.sep}etc${path.sep}gate.json`, 'GATE_RECEIPT_PATH_TRAVERSAL'],
    ['a directory-shaped request', `${os.tmpdir()}${path.sep}`, 'GATE_RECEIPT_PATH_NOT_A_FILE'],
  ] as const) {
    test(`${label} is refused with ${code}`, () => {
      const target = resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: requested },
        repositoryRoot: ROOT,
        mode: 'local',
        gitHead: 'a'.repeat(40),
      });
      expect(target.error).toBe(code);
      expect(target.file).toBeUndefined();
    });
  }

  test('a destination inside the repository is refused, so a receipt can never dirty a tracked tree', () => {
    const target = resolveGateReceiptTarget({
      environment: { [GATE_RECEIPT_PATH_ENV]: path.join(ROOT, 'artifacts', 'gate-receipt.json') },
      repositoryRoot: ROOT,
      mode: 'local',
      gitHead: 'a'.repeat(40),
    });
    expect(target.error).toBe('GATE_RECEIPT_PATH_INSIDE_REPOSITORY');
  });

  test('a destination outside every permitted temporary root is refused', () => {
    const target = resolveGateReceiptTarget({
      environment: { [GATE_RECEIPT_PATH_ENV]: path.join(os.homedir(), 'nightwatch-gate-receipt.json') },
      repositoryRoot: ROOT,
      mode: 'local',
      gitHead: 'a'.repeat(40),
    });
    expect(target.error).toBe('GATE_RECEIPT_PATH_UNCONFINED');
  });

  test('a missing or non-directory parent is refused', () => {
    const directory = scratch('parent');
    try {
      expect(resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: path.join(directory, 'absent', 'gate.json') },
        repositoryRoot: ROOT, mode: 'local', gitHead: 'a'.repeat(40),
      }).error).toBe('GATE_RECEIPT_PATH_PARENT_MISSING');

      const file = path.join(directory, 'not-a-directory');
      fs.writeFileSync(file, 'x', { mode: 0o600 });
      expect(resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: path.join(file, 'gate.json') },
        repositoryRoot: ROOT, mode: 'local', gitHead: 'a'.repeat(40),
      }).error).toBe('GATE_RECEIPT_PATH_PARENT_NOT_DIRECTORY');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a SYMLINKED parent is refused rather than followed', () => {
    const directory = scratch('parent-symlink');
    try {
      const real = path.join(directory, 'real');
      const link = path.join(directory, 'link');
      fs.mkdirSync(real, { mode: 0o700 });
      fs.symlinkSync(real, link);
      // Following it would let the destination be redirected out of the
      // permitted root after validation.
      expect(resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: path.join(link, 'gate.json') },
        repositoryRoot: ROOT, mode: 'local', gitHead: 'a'.repeat(40),
      }).error).toBe('GATE_RECEIPT_PATH_PARENT_SYMLINK');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a SYMLINK destination fails closed and its target is never written', () => {
    const directory = scratch('destination-symlink');
    try {
      const sentinelTarget = path.join(directory, 'sentinel');
      const link = path.join(directory, 'gate.json');
      fs.writeFileSync(sentinelTarget, 'R11_SENTINEL_UNTOUCHED', { mode: 0o600 });
      fs.symlinkSync(sentinelTarget, link);
      expect(resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: link },
        repositoryRoot: ROOT, mode: 'local', gitHead: 'a'.repeat(40),
      }).error).toBe('GATE_RECEIPT_PATH_DESTINATION_SYMLINK');
      expect(fs.readFileSync(sentinelTarget, 'utf8')).toBe('R11_SENTINEL_UNTOUCHED');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a destination that is a directory or device is refused', () => {
    const directory = scratch('destination-kind');
    try {
      const asDirectory = path.join(directory, 'gate.json');
      fs.mkdirSync(asDirectory, { mode: 0o700 });
      expect(resolveGateReceiptTarget({
        environment: { [GATE_RECEIPT_PATH_ENV]: asDirectory },
        repositoryRoot: ROOT, mode: 'local', gitHead: 'a'.repeat(40),
      }).error).toBe('GATE_RECEIPT_PATH_DESTINATION_NOT_FILE');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

test.describe('R-11 atomic persistence and fail-closed reads', () => {
  test('a receipt is written owner-only, is byte-exact, and leaves no temporary file', () => {
    const directory = scratch('persist');
    try {
      const file = path.join(directory, 'gate.json');
      const bytes = JSON.stringify(syntheticReceipt());
      expect(persistGateReceipt(file, bytes).status).toBe('WRITTEN');
      expect(fs.readFileSync(file, 'utf8')).toBe(bytes);
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
      // The atomic-rename temporary must not survive.
      expect(fs.readdirSync(directory)).toEqual(['gate.json']);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a repeated write replaces the receipt atomically without leaving debris', () => {
    const directory = scratch('replace');
    try {
      const file = path.join(directory, 'gate.json');
      persistGateReceipt(file, JSON.stringify(syntheticReceipt({ finalResult: 'PASS' })));
      const second = JSON.stringify(syntheticReceipt({ finalResult: 'TEST_FAILURE' }));
      expect(persistGateReceipt(file, second).status).toBe('WRITTEN');
      expect(fs.readFileSync(file, 'utf8')).toBe(second);
      expect(fs.readdirSync(directory)).toEqual(['gate.json']);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('an unwritable destination directory fails closed rather than silently skipping', () => {
    const directory = scratch('unwritable');
    try {
      fs.chmodSync(directory, 0o500);
      const result = persistGateReceipt(path.join(directory, 'gate.json'), '{}');
      expect(result.status).toBe('FAILED');
      expect(String(result.code)).toMatch(/^GATE_RECEIPT_WRITE_FAILED_/);
    } finally {
      fs.chmodSync(directory, 0o700);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a full TEST_FAILURE receipt round-trips with its failure location, didNotRun and containment lane intact', () => {
    const directory = scratch('failure-detail');
    try {
      const file = path.join(directory, 'gate.json');
      const receipt = syntheticReceipt();
      persistGateReceipt(file, JSON.stringify(receipt));
      const read = readPersistedGateReceipt(file, { gitHead: 'b'.repeat(40), environmentClass: 'CLEAN' });
      expect(read.status).toBe('READ');
      const value = read.receipt as typeof receipt;
      // Exactly the detail OBS-C105-1 lost.
      expect(value.finalResult).toBe('TEST_FAILURE');
      const groups = value.groups as Array<Record<string, any>>;
      expect(groups[0]!.status).toBe('TEST_FAILURE');
      expect(groups[0]!.details.failedLocations).toEqual(['tests/unit/phase24ProxyLifecycle.test.ts:105']);
      expect(groups[0]!.details.deepContainmentLane).toBe('NOT_EXERCISED_BWRAP_UNAVAILABLE');
      expect(groups[0]!.counts.didNotRun).toBe(0);
      expect(groups[0]!.counts.failed).toBe(1);
      // A cascade after the first required failure is retained, not dropped.
      expect(groups[1]!.status).toBe('NOT_RUN');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  for (const [label, contents, code] of [
    ['a truncated write', '{"schemaVersion":"nightwatch.quality-gate-rec', 'GATE_RECEIPT_FILE_MALFORMED'],
    ['an empty file', '', 'GATE_RECEIPT_FILE_MALFORMED'],
    ['a JSON array', '[]', 'GATE_RECEIPT_FILE_MALFORMED'],
    ['a JSON scalar', '"receipt"', 'GATE_RECEIPT_FILE_MALFORMED'],
    ['an unknown schema', '{"schemaVersion":"nightwatch.quality-gate-receipt.v2","finalResult":"PASS","receiptDigest":"receipt:sha256:000000000000000000000000"}', 'GATE_RECEIPT_SCHEMA_UNSUPPORTED'],
    ['a malformed digest', '{"schemaVersion":"nightwatch.quality-gate-receipt.v1","finalResult":"PASS","receiptDigest":"receipt:sha256:zzz"}', 'GATE_RECEIPT_DIGEST_MALFORMED'],
    ['a malformed final result', '{"schemaVersion":"nightwatch.quality-gate-receipt.v1","finalResult":"pass","receiptDigest":"receipt:sha256:000000000000000000000000"}', 'GATE_RECEIPT_FINAL_RESULT_MALFORMED'],
  ] as const) {
    test(`${label} is never accepted as a receipt (${code})`, () => {
      const directory = scratch('malformed');
      try {
        const file = path.join(directory, 'gate.json');
        fs.writeFileSync(file, contents, { mode: 0o600 });
        const read = readPersistedGateReceipt(file);
        expect(read.status).toBe('FAILED');
        expect(read.code).toBe(code);
        expect(read.receipt).toBeUndefined();
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    });
  }

  test('a missing file and a symlinked file both fail closed', () => {
    const directory = scratch('read-kind');
    try {
      expect(readPersistedGateReceipt(path.join(directory, 'absent.json')).code).toBe('GATE_RECEIPT_FILE_UNREADABLE');
      const real = path.join(directory, 'real.json');
      const link = path.join(directory, 'link.json');
      fs.writeFileSync(real, JSON.stringify(syntheticReceipt()), { mode: 0o600 });
      fs.symlinkSync(real, link);
      expect(readPersistedGateReceipt(link).code).toBe('GATE_RECEIPT_FILE_NOT_REGULAR');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a STALE receipt from another commit or gate mode cannot masquerade as this run', () => {
    const directory = scratch('stale');
    try {
      const file = path.join(directory, 'gate.json');
      persistGateReceipt(file, JSON.stringify(syntheticReceipt()));
      expect(readPersistedGateReceipt(file, { gitHead: '9'.repeat(40) }).code).toBe('GATE_RECEIPT_STALE_HEAD');
      expect(readPersistedGateReceipt(file, { environmentClass: 'CI' }).code).toBe('GATE_RECEIPT_ENVIRONMENT_MISMATCH');
      // And the matching expectation still reads.
      expect(readPersistedGateReceipt(file, { gitHead: 'b'.repeat(40), environmentClass: 'CLEAN' }).status).toBe('READ');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

test.describe('R-11 the gate itself persists its receipt', () => {
  // These spawn the REAL authoritative gate. The Node-major mismatch path is
  // used deliberately: it is a genuine gate refusal that produces a genuine
  // receipt without spending several minutes of test time, and an environment
  // rejection is exactly the sort of result worth persisting.
  const mismatchMode = Number(process.versions.node.split('.')[0]) === 20 ? null : 'ci';

  test('an unsafe receipt destination is refused BEFORE any group runs', () => {
    const started = Date.now();
    const result = spawnSync(process.execPath, [GATE, 'local'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, [GATE_RECEIPT_PATH_ENV]: path.join(ROOT, 'gate-receipt.json') },
      timeout: 120_000,
    });
    expect(result.status).toBe(2);
    expect(JSON.parse((result.stderr ?? '').trim())).toEqual({ status: 'CONFIG_INVALID', code: 'GATE_RECEIPT_PATH_INSIDE_REPOSITORY' });
    expect(result.stdout ?? '').toBe('');
    // Refused before running anything: the STATIC group alone takes far longer
    // than this. The bound is loose on purpose — the claim is "no groups ran",
    // not a performance measurement.
    expect(Date.now() - started).toBeLessThan(20_000);
    expect(fs.existsSync(path.join(ROOT, 'gate-receipt.json'))).toBe(false);
  });

  test('the persisted receipt is byte-identical to stdout, and stdout scraping can no longer be trusted over it', () => {
    test.skip(mismatchMode === null, 'requires a Node major other than the gate-required 20 to reach the fast refusal path');
    const directory = scratch('gate-run');
    try {
      const file = path.join(directory, 'gate.json');
      const result = spawnSync(process.execPath, [GATE, mismatchMode as string], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, [GATE_RECEIPT_PATH_ENV]: file },
        timeout: 120_000,
      });
      // A refused environment is still a receipt, and still persisted.
      expect(result.status).toBe(1);
      const stdout = (result.stdout ?? '').trim();
      expect(fs.existsSync(file)).toBe(true);
      const persisted = fs.readFileSync(file, 'utf8');
      expect(persisted).toBe(stdout);

      const fromFile = readPersistedGateReceipt(file);
      expect(fromFile.status).toBe('READ');
      const receipt = fromFile.receipt as Record<string, unknown>;
      expect(receipt.finalResult).toBe('ENVIRONMENT_MISMATCH');
      expect(receipt.receiptPersistenceRequested).toBe(true);
      expect(JSON.parse(stdout).receiptDigest).toBe(receipt.receiptDigest);

      // The OBS-C105-1 failure mode, directly: corrupt the stdout channel with
      // noise AND a forged receipt line. Scraping stdout yields the forgery;
      // reading the file the gate wrote still yields the truth.
      const forged = JSON.stringify({ ...receipt, finalResult: 'PASS', receiptDigest: `receipt:sha256:${'9'.repeat(24)}` });
      const polluted = `npm notice preamble\n${forged}\n${stdout}\nnpm notice trailer\n${forged}\n`;
      const scraped = polluted.split(/\r?\n/).reverse().find((line) => line.includes(RECEIPT_SCHEMA));
      expect(JSON.parse(scraped as string).finalResult).toBe('PASS');
      expect(readPersistedGateReceipt(file).receipt!.finalResult).toBe('ENVIRONMENT_MISMATCH');
      expect(fs.readFileSync(file, 'utf8')).toBe(stdout);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('the receipt destination is not inherited by gate children', () => {
    const runner = fs.readFileSync(GATE, 'utf8');
    // A child inheriting the destination could overwrite the parent's
    // authoritative receipt with its own.
    expect(runner).toMatch(/FORBIDDEN_ENVIRONMENT_KEYS[\s\S]{0,600}GATE_RECEIPT_PATH_ENV,/);
    expect(runner).toMatch(/for \(const key of FORBIDDEN_ENVIRONMENT_KEYS\) delete environment\[key\];/);
  });

  test('stdout carries the receipt and nothing else', () => {
    const runner = fs.readFileSync(GATE, 'utf8');
    expect((runner.match(/console\.log\(/g) ?? [])).toHaveLength(1);
    expect(runner).toMatch(/console\.log\(canonicalBytes\)/);
  });

  test('the clean-checkout gate consumes the structured file and fails closed on disagreement', () => {
    const clean = fs.readFileSync(path.join(ROOT, 'bin', 'quality-gate-clean.mjs'), 'utf8');
    expect(clean).toMatch(/readPersistedGateReceipt\(receiptFile/);
    expect(clean).toMatch(/GATE_RECEIPT_DIGEST_MISMATCH/);
    // The inner receipt must live outside the disposable clone, or writing it
    // would dirty the checkout the clean gate is measuring.
    expect(clean).toMatch(/mkdtempSync\(path\.join\(os\.tmpdir\(\), 'nightwatch-clean-gate-receipt-'\)\)/);
    expect(clean).toMatch(/gateReceiptSource/);
  });
});
