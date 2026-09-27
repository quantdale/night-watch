// M9 tasks 10.1/10.2 (X-12 / A-12) — every tracked bin/*.mjs file carries
// exactly ONE declared disposition in the operator-CLI surface registry, and
// every bin that claims the operator contract actually declares it.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'config', 'operator-cli-surface.v1.json');
const REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')) as {
  schemaVersion: string;
  bins: { file: string; disposition: string; reason?: string }[];
  counts: { total: number; operatorCli: number; libraryRetained: number; pending: number };
};

const BIN_FILES = fs.readdirSync(path.join(REPO_ROOT, 'bin')).filter((name) => name.endsWith('.mjs')).map((name) => `bin/${name}`).sort();

test.describe('operator CLI surface registry (10.1/10.2)', () => {
  test('every tracked bin file is declared exactly once with a known disposition', () => {
    expect(REGISTRY.schemaVersion).toBe('nightwatch.operator-cli-surface.v1');
    const declared = REGISTRY.bins.map((entry) => entry.file).sort();
    expect(declared).toEqual(BIN_FILES);
    expect(new Set(declared).size).toBe(declared.length);
    const known = new Set(['OPERATOR_CLI', 'LIBRARY_RETAINED', 'PENDING_OPERATOR_CLI']);
    for (const entry of REGISTRY.bins) {
      expect(known.has(entry.disposition), `${entry.file}: ${entry.disposition}`).toBe(true);
    }
  });

  test('a LIBRARY_RETAINED bin is genuinely not an entry point and states why', () => {
    for (const entry of REGISTRY.bins.filter((item) => item.disposition === 'LIBRARY_RETAINED')) {
      const source = fs.readFileSync(path.join(REPO_ROOT, entry.file), 'utf8');
      expect(source, entry.file).not.toContain('process.argv');
      expect(source, entry.file).not.toContain('defineOperatorCli');
      expect(typeof entry.reason, entry.file).toBe('string');
      expect((entry.reason ?? '').length, entry.file).toBeGreaterThan(20);
    }
  });

  test('every OPERATOR_CLI bin really declares the contract, and every pending one does not claim it', () => {
    for (const entry of REGISTRY.bins.filter((item) => item.disposition === 'OPERATOR_CLI')) {
      const source = fs.readFileSync(path.join(REPO_ROOT, entry.file), 'utf8');
      expect(source, entry.file).toContain('OPERATOR_CLI_SCHEMA');
      expect(source, entry.file).toContain('defineOperatorCli(');
    }
    for (const entry of REGISTRY.bins.filter((item) => item.disposition === 'PENDING_OPERATOR_CLI')) {
      const source = fs.readFileSync(path.join(REPO_ROOT, entry.file), 'utf8');
      expect(source, entry.file).not.toContain('OPERATOR_CLI_SCHEMA');
    }
  });

  test('the recorded counts match the registry exactly', () => {
    const byDisposition = (disposition: string) => REGISTRY.bins.filter((entry) => entry.disposition === disposition).length;
    expect(REGISTRY.counts.total).toBe(REGISTRY.bins.length);
    expect(REGISTRY.counts.total).toBe(BIN_FILES.length);
    expect(REGISTRY.counts.operatorCli).toBe(byDisposition('OPERATOR_CLI'));
    expect(REGISTRY.counts.libraryRetained).toBe(byDisposition('LIBRARY_RETAINED'));
    expect(REGISTRY.counts.pending).toBe(byDisposition('PENDING_OPERATOR_CLI'));
    // The remaining migration is a COUNTED fact, not an unstated gap.
    expect(REGISTRY.counts.operatorCli + REGISTRY.counts.libraryRetained + REGISTRY.counts.pending).toBe(REGISTRY.counts.total);
  });

  test('a migrated bin answers --help and --print-metadata without executing', () => {
    const migrated = REGISTRY.bins.filter((entry) => entry.disposition === 'OPERATOR_CLI').map((entry) => entry.file);
    for (const file of ['bin/phase2b-real.mjs', 'bin/phase22-real.mjs', 'bin/observe-canary.mjs']) {
      expect(migrated).toContain(file);
      const metadata = spawnSync(process.execPath, [path.join(REPO_ROOT, file), '--print-metadata'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_DEV_LANE_OWNER_TOKEN: '' },
      });
      expect(metadata.status, `${file} --print-metadata`).toBe(0);
      const parsed = JSON.parse(metadata.stdout) as { schemaVersion: string; name: string; entry: string; flags: { name: string }[] };
      expect(parsed.schemaVersion).toBe('nightwatch.operator-cli.v1');
      expect(parsed.entry).toBe(file);
      expect(parsed.flags.length).toBeGreaterThan(0);
      const help = spawnSync(process.execPath, [path.join(REPO_ROOT, file), '--help'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_DEV_LANE_OWNER_TOKEN: '' },
      });
      expect(help.status, `${file} --help`).toBe(0);
      expect(`${help.stdout}${help.stderr}`).toContain('--env');
    }
  });

  test('a migrated bin still refuses an unknown option through the shared parser', () => {
    const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'phase2b-real.mjs'), '--not-a-declared-option'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, NIGHTWATCH_DEV_LANE_OWNER_TOKEN: '' },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/CLI_UNKNOWN_ARGUMENT|does not accept option/);
  });
});
