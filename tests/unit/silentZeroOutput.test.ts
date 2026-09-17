// ---------------------------------------------------------------------------
// NW-PROJ-003 (Wave 2, static precursor) — silent zero-output acceptance.
//
// Every test drives the REAL oracle (`silentZeroOutput`) or spawns the REAL
// driver. Fixtures are synthetic PHP fragments shaped like the historically
// evidenced family; no product code executes and no runtime claim is made.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runSilentZeroOutput, SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA } from '../../src/core/source/silentZeroOutput';

const ROOT = path.resolve(__dirname, '..', '..');
const SHA = 'a'.repeat(40);
const REPO = 'mobingilabs/ripple-api';
const TARGET_PATH = 'src/App/Handler/Fixture.php';

const PRE_FIX_SOURCE = [
  '<?php',
  'class Fixture',
  '{',
  '    private function generateInvoice(string $month, string $company_id, array $setting): void',
  '    {',
  '        if (empty($this->data_accts[$company_id])) {',
  '            $this->cleanUpVendorInvoiceData($month, $company_id);',
  '            return;',
  '        }',
  '        $this->insertTotal($setting);',
  '    }',
  '}',
  '',
].join('\n');

const CORRECTED_SOURCE = [
  '<?php',
  'class Fixture',
  '{',
  '    private function generateInvoice(string $month, string $company_id, array $setting): void',
  '    {',
  "        if (!empty($this->applied[$company_id]) || !empty($this->custom_service_ids['billinggroup']) || !empty($setting['additional_items'])) {",
  '            $this->logInfo("having bg fee or csdata");',
  '        } else {',
  '            if (is_null($this->chk_bg[$company_id])) {',
  '                $this->cleanUpVendorInvoiceData($month, $company_id);',
  '                return;',
  '            }',
  '        }',
  '        $this->insertTotal($setting);',
  '    }',
  '}',
  '',
].join('\n');

const NO_OUTPUT_SOURCE = [
  '<?php',
  'class Fixture',
  '{',
  '    private function generateSomething(string $id): void',
  '    {',
  '        if (empty($this->rows[$id])) {',
  '            return;',
  '        }',
  '        $this->logInfo("done");',
  '    }',
  '}',
  '',
].join('\n');

function handler(overrides: Record<string, unknown> = {}) {
  return {
    handlerId: 'fixture-handler',
    repoId: REPO,
    sha: SHA,
    roots: ['src'],
    paths: [TARGET_PATH],
    functions: ['generateInvoice'],
    requiredInputRoles: [
      { role: 'accounts', guardTokens: ['chk_bg', 'data_accts'] },
      { role: 'applied_fees', guardTokens: ['applied'] },
      { role: 'custom_services', guardTokens: ['custom_service_ids'] },
      { role: 'additional_items', guardTokens: ['additional_items'] },
    ],
    outputTokens: ['insertTotal'],
    legitimateSkipConditions: [],
    ...overrides,
  };
}

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

function run(files: Readonly<Record<string, string>>, overrides: Record<string, unknown> = {}) {
  return runSilentZeroOutput({
    config: { schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers: [handler(overrides)] },
    ...accessFor(files),
  });
}

const FILE = `${REPO}:${TARGET_PATH}`;

test.describe('C1 silent zero-output — static precursor', () => {
  test('the shipped contract validates and declares the corrected invoice guard', () => {
    const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'silent-zero-output-contracts.v1.json'), 'utf8'));
    expect(shipped.schemaVersion).toBe(SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA);
    expect(shipped.handlers[0].functions).toEqual(['generateInvoice']);
    expect(shipped.handlers[0].requiredInputRoles.length).toBe(4);
  });

  test('the pre-fix guard shape is a STATIC_ZERO_OUTPUT_PRECURSOR with the missing roles named', () => {
    const report = run({ [FILE]: PRE_FIX_SOURCE });
    const row = report.handlers[0]!;
    expect(row.verdict).toBe('STATIC_ZERO_OUTPUT_PRECURSOR');
    expect(row.reasonCodes).toContain('GUARD_MISSING_REQUIRED_ROLE');
    expect(row.missingRoles).toEqual(['additional_items', 'applied_fees', 'custom_services']);
    expect(report.runtimeFailureClaim).toBe('NONE');
  });

  test('the corrected guard consults every declared role and is NO_PRECURSOR', () => {
    const report = run({ [FILE]: CORRECTED_SOURCE });
    const row = report.handlers[0]!;
    expect(row.verdict).toBe('NO_PRECURSOR');
    expect(row.reasonCodes).toContain('GUARD_CONSULTS_ALL_REQUIRED_ROLES');
    expect(row.missingRoles).toEqual([]);
  });

  test('a handler whose output role cannot be identified is non-judged, never a precursor', () => {
    const report = run({ [FILE]: NO_OUTPUT_SOURCE }, { functions: ['generateSomething'], outputTokens: ['insertTotal'] });
    expect(report.handlers[0]!.verdict).toBe('OUTPUT_ROLE_NOT_IDENTIFIED');
    expect(report.handlers[0]!.reasonCodes).toContain('OUTPUT_TOKEN_NOT_FOUND');
  });

  test('a function with no skip return before the output is NO_PRECURSOR', () => {
    const noSkip = CORRECTED_SOURCE.replace('                return;\n', '');
    const report = run({ [FILE]: noSkip });
    expect(report.handlers[0]!.verdict).toBe('NO_PRECURSOR');
  });

  test('a missing function, an invalid declaration, stale and unavailable sources are fail-closed', () => {
    const missing = run({ [FILE]: CORRECTED_SOURCE }, { functions: ['doesNotExist'] });
    expect(missing.handlers[0]!.verdict).toBe('EXTRACTION_AMBIGUOUS');
    const invalid = runSilentZeroOutput({
      config: { schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers: [handler({ repoId: 'mobingilabs/not-admitted' })] },
      ...accessFor({ [FILE]: CORRECTED_SOURCE }),
    });
    expect(invalid.handlers[0]!.verdict).toBe('DECLARATION_INVALID');
    const stale = runSilentZeroOutput({
      config: { schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers: [handler({ sha: 'b'.repeat(40) })] },
      ...accessFor({ [FILE]: CORRECTED_SOURCE }),
    });
    expect(stale.handlers[0]!.verdict).toBe('SOURCE_STALE');
    const unavailable = runSilentZeroOutput({
      config: { schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers: [handler()] },
      ...accessFor({}),
    });
    expect(unavailable.handlers[0]!.verdict).toBe('SOURCE_UNAVAILABLE');
  });

  test('fixture literals cannot reach the report and classification is deterministic', () => {
    const first = run({ [FILE]: PRE_FIX_SOURCE });
    const second = run({ [FILE]: PRE_FIX_SOURCE });
    expect(second.reportDigest).toBe(first.reportDigest);
    expect(second.handlers).toEqual(first.handlers);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('cleanUpVendorInvoiceData');
    expect(serialized).not.toContain('having bg fee');
    expect(serialized).toMatch(/^.*szo:sha256:[0-9a-f]{24}.*$/s);
  });
});

test.describe('C1 silent zero-output — driver', () => {
  test('the driver reports the fixture precursor and writes the report', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-szo-driver-'));
    try {
      const siblingRoot = path.join(sandbox, 'siblings');
      const repoDir = path.join(siblingRoot, 'mobingilabs', 'ripple-api');
      fs.mkdirSync(path.join(repoDir, 'src', 'App', 'Handler'), { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'src', 'App', 'Handler', 'Fixture.php'), PRE_FIX_SOURCE, 'utf8');
      const git = (args: string[]) => spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
      git(['init', '-q', '-b', 'master']);
      git(['add', '.']);
      git(['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-qm', 'fixture']);
      const sha = git(['rev-parse', 'HEAD']).stdout.trim();
      const configPath = path.join(sandbox, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers: [handler({ sha })] }), 'utf8');
      const outPath = path.join(sandbox, 'report.json');
      const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'silent-zero-output.mjs'), '--config', configPath, '--out', outPath], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_REPOS_ROOT: siblingRoot },
      });
      expect(result.status).toBe(1);
      const report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      expect(report.handlers[0].verdict).toBe('STATIC_ZERO_OUTPUT_PRECURSOR');
      expect(report.runtimeFailureClaim).toBe('NONE');
      expect(report.reportDigest).toMatch(/^szo:sha256:[0-9a-f]{24}$/);
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('a missing config is refused before any read', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'silent-zero-output.mjs'), '--config', path.join(os.tmpdir(), 'does-not-exist-szo.json')], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('CONFIG_UNREADABLE');
  });
});
