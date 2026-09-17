// ---------------------------------------------------------------------------
// NW-PROJ-010 (Wave 2, stage 1) — test-oracle quality acceptance.
//
// Every test drives the REAL classifier (`testOracleQuality`) or spawns the
// REAL driver. Fixtures are synthetic PHP fragments shaped like the
// historically evidenced material; no product test executes.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { classifyPhpTestFile, runTestOracleQuality, TEST_ORACLE_QUALITY_SCHEMA } from '../../src/core/source/testOracleQuality';

const ROOT = path.resolve(__dirname, '..', '..');
const SHA = 'a'.repeat(40);
const REPO = 'mobingilabs/ripple-api';
const TARGET_PATH = 'tests/src/App/Handler/FixtureTest.php';

function php(className: string, methods: readonly string[], helpers: readonly string[] = []): string {
  return [
    '<?php',
    'namespace RippleTest\\Handler;',
    'use PHPUnit\\Framework\\TestCase;',
    `class ${className} extends TestCase`,
    '{',
    ...helpers,
    ...methods,
    '}',
    '',
  ].join('\n');
}

const MIRROR_TEST = php('MirrorTest', [
  '    public function testMirrorsTheGuard()',
  '    {',
  '        $this->assertTrue($this->shouldSkip(false, false));',
  '    }',
  // A doc-comment is NOT an invocation; the tokenizer drops comments.
  '    /**',
  '     * Mirrors Invoices::generateInvoice() instead of calling it.',
  '     */',
  '    private function shouldSkip(bool $a, bool $b): bool',
  '    {',
  '        return !$a && !$b;',
  '    }',
]);

const PROVEN_TEST = php('ProvenTest', [
  '    public function testGeneratesExactInvoice()',
  '    {',
  "        $this->assertSame(['total' => 100], Invoices::generateInvoice('2026-08', 'bg-1'));",
  '    }',
]);

const EXECUTING_TEST = php('ExecutingTest', [
  '    public function testRunsGeneration()',
  '    {',
  "        $invoice = Invoices::generateInvoice('2026-08', 'bg-1');",
  '        $this->assertNotNull($invoice);',
  '    }',
]);

const DECLARED_SKIP_TEST = php('DeclaredSkipTest', [
  '    public function testNeedsFixture()',
  '    {',
  "        $this->markTestIncomplete('requires a live account');",
  '    }',
]);

const UNDECLARED_SKIP_TEST = php('UndeclaredSkipTest', [
  '    public function testSkipped()',
  '    {',
  "        $this->markTestSkipped('not ready');",
  '    }',
]);

const EARLY_RETURN_TEST = php('EarlyReturnTest', [
  '    public function testDisabled()',
  '    {',
  '        return;',
  '        $this->assertTrue(true);',
  '    }',
]);

const NO_ASSERTION_TEST = php('NoAssertionTest', [
  '    public function testNothing()',
  '    {',
  '        $invoice = 1;',
  '        $invoice += 1;',
  '    }',
]);

const LIVE_INFRA_TEST = php('LiveInfraTest', [
  '    public function testCache()',
  '    {',
  '        $client = new Redis();',
  '        $client->set("k", "v");',
  '        $this->assertTrue(true);',
  '    }',
]);

const HELPER_FILE = php('FixtureHelpers', [], [
  '    private function makeRow(string $id): array',
  '    {',
  "        return ['id' => $id, 'value' => 'SENTINELCUSTOMER9'];",
  '    }',
]);

const EMPTY_FILE = php('EmptyClass', []);

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

function targetConfig(overrides: Record<string, unknown> = {}, declaredSkips: readonly Record<string, string>[] = []) {
  return {
    schemaVersion: TEST_ORACLE_QUALITY_SCHEMA,
    targets: [{
      repoId: REPO,
      sha: SHA,
      path: TARGET_PATH,
      declaredProductionSymbols: ['generateInvoice'],
      ...overrides,
    }],
    declaredSkips,
  };
}

function run(files: Readonly<Record<string, string>>, overrides: Record<string, unknown> = {}, declaredSkips: readonly Record<string, string>[] = []) {
  return runTestOracleQuality({ config: targetConfig(overrides, declaredSkips), ...accessFor(files) });
}

const FILE = `${REPO}:${TARGET_PATH}`;

test.describe('C8 test-oracle quality — static classifier', () => {
  test('the shipped config validates and carries the historical pilot', () => {
    const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'test-oracle-quality.v1.json'), 'utf8'));
    expect(shipped.schemaVersion).toBe(TEST_ORACLE_QUALITY_SCHEMA);
    expect(shipped.targets[0].path).toBe('tests/src/App/Handler/InvoicesVendorSkipGuardTest.php');
    expect(shipped.targets[0].declaredProductionSymbols).toEqual(['generateInvoice']);
  });

  test('a mirrored guard without a production invocation is MIRROR_ONLY', () => {
    const report = run({ [FILE]: MIRROR_TEST });
    const row = report.targets[0]!;
    expect(row.verdict).toBe('MIRROR_ONLY');
    expect(row.methods[0]!.classification).toBe('MIRROR_ONLY');
    expect(row.methods[0]!.reasonCodes).toContain('MIRROR_WITHOUT_PRODUCTION_SYMBOL');
  });

  test('a production invocation inside an assertion is DEFECT_ORACLE_PROVEN', () => {
    const report = run({ [FILE]: PROVEN_TEST });
    expect(report.targets[0]!.verdict).toBe('DEFECT_ORACLE_PROVEN');
  });

  test('a production invocation outside assertions is EXECUTING_BUT_ORACLE_UNPROVEN', () => {
    const report = run({ [FILE]: EXECUTING_TEST });
    expect(report.targets[0]!.verdict).toBe('EXECUTING_BUT_ORACLE_UNPROVEN');
  });

  test('a declared intentional skip is DECLARED_SKIP, never a defect', () => {
    const report = run({ [FILE]: DECLARED_SKIP_TEST }, {}, [
      { path: TARGET_PATH, symbol: 'testNeedsFixture', reason: 'owner-declared fixture dependency' },
    ]);
    expect(report.targets[0]!.verdict).toBe('DECLARED_SKIP');
  });

  test('an undeclared skip is UNDECLARED_SKIP', () => {
    const report = run({ [FILE]: UNDECLARED_SKIP_TEST });
    expect(report.targets[0]!.verdict).toBe('UNDECLARED_SKIP');
    expect(report.targets[0]!.methods[0]!.reasonCodes).toContain('SKIP_MARKER_UNDECLARED');
  });

  test('a first-statement return is EARLY_RETURN_DISABLED', () => {
    const report = run({ [FILE]: EARLY_RETURN_TEST });
    expect(report.targets[0]!.verdict).toBe('EARLY_RETURN_DISABLED');
  });

  test('an empty assertion surface is ASSERTION_SURFACE_ABSENT', () => {
    const report = run({ [FILE]: NO_ASSERTION_TEST });
    expect(report.targets[0]!.verdict).toBe('ASSERTION_SURFACE_ABSENT');
  });

  test('a live infrastructure client is LIVE_INFRA_DEPENDENCY', () => {
    const report = run({ [FILE]: LIVE_INFRA_TEST });
    expect(report.targets[0]!.verdict).toBe('LIVE_INFRA_DEPENDENCY');
  });

  test('a helper-only file is HELPER_OR_FIXTURE_ONLY, and an empty file is ambiguous', () => {
    const helper = run({ [FILE]: HELPER_FILE });
    expect(helper.targets[0]!.verdict).toBe('HELPER_OR_FIXTURE_ONLY');
    const empty = run({ [FILE]: EMPTY_FILE });
    expect(empty.targets[0]!.verdict).toBe('CLASSIFICATION_AMBIGUOUS');
  });

  test('an invalid declaration, a stale snapshot and an unavailable file are non-judged states', () => {
    const invalid = runTestOracleQuality({
      config: { schemaVersion: TEST_ORACLE_QUALITY_SCHEMA, targets: [{ repoId: 'mobingilabs/not-admitted', sha: SHA, path: TARGET_PATH, declaredProductionSymbols: [] }], declaredSkips: [] },
      ...accessFor({ [FILE]: MIRROR_TEST }),
    });
    expect(invalid.targets[0]!.verdict).toBe('DECLARATION_INVALID');
    const stale = runTestOracleQuality({ config: targetConfig({ sha: 'b'.repeat(40) }), ...accessFor({ [FILE]: MIRROR_TEST }) });
    expect(stale.targets[0]!.verdict).toBe('SOURCE_STALE');
    const unavailable = runTestOracleQuality({ config: targetConfig(), ...accessFor({}) });
    expect(unavailable.targets[0]!.verdict).toBe('SOURCE_UNAVAILABLE');
  });

  test('fixture literals and comments cannot reach the report', () => {
    const report = run({ [FILE]: MIRROR_TEST });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('SENTINELCUSTOMER9');
    expect(serialized).not.toContain('Mirrors Invoices');
    expect(serialized).toContain('generateInvoice');
  });

  test('near misses: comments and string literals cannot stand in for an invocation', () => {
    const commentBody = php('CommentBodyTest', [
      '    public function testMentions()',
      '    {',
      '        /* Invoices::generateInvoice() would go here */',
      '        $this->assertTrue(true);',
      '    }',
    ]);
    const stringBody = php('StringBodyTest', [
      '    public function testMentions()',
      '    {',
      '        $name = "generateInvoice";',
      '        $this->assertSame("generateInvoice", $name);',
      '    }',
    ]);
    expect(run({ [FILE]: commentBody }).targets[0]!.verdict).toBe('MIRROR_ONLY');
    expect(run({ [FILE]: stringBody }).targets[0]!.verdict).toBe('MIRROR_ONLY');
  });

  test('a target without declared symbols does not carry an unearned linkage reason', () => {
    const report = run({ [FILE]: NO_ASSERTION_TEST.replace('$invoice = 1;\n        $invoice += 1;', '$this->assertTrue(true);') }, { declaredProductionSymbols: [] });
    const row = report.targets[0]!;
    expect(row.verdict).toBe('EXECUTING_BUT_ORACLE_UNPROVEN');
    expect(row.methods[0]!.reasonCodes).toEqual([]);
  });

  test('a target repository outside the two C8 families and a cross-repo root are refused', () => {
    const wrongRepo = runTestOracleQuality({
      config: { schemaVersion: TEST_ORACLE_QUALITY_SCHEMA, targets: [{ repoId: 'mobingilabs/ouchan', sha: SHA, path: 'tests/App/Foo.php', declaredProductionSymbols: [] }], declaredSkips: [] },
      ...accessFor({}),
    });
    expect(wrongRepo.targets[0]!.verdict).toBe('DECLARATION_INVALID');
    // ripple-api target may not use ouchan's approved roots either.
    const crossRoot = runTestOracleQuality({
      config: { schemaVersion: TEST_ORACLE_QUALITY_SCHEMA, targets: [{ repoId: REPO, sha: SHA, path: 'services/App/Foo.php', declaredProductionSymbols: [] }], declaredSkips: [] },
      ...accessFor({}),
    });
    expect(crossRoot.targets[0]!.verdict).toBe('DECLARATION_INVALID');
  });

  test('classification is deterministic', () => {
    const first = run({ [FILE]: MIRROR_TEST });
    const second = run({ [FILE]: MIRROR_TEST });
    expect(second.reportDigest).toBe(first.reportDigest);
    expect(second.targets).toEqual(first.targets);
  });
});

test.describe('C8 test-oracle quality — driver', () => {
  test('the driver classifies a fixture test file and writes the report', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-toq-driver-'));
    try {
      const siblingRoot = path.join(sandbox, 'siblings');
      const repoDir = path.join(siblingRoot, 'mobingilabs', 'ripple-api');
      fs.mkdirSync(path.join(repoDir, 'tests', 'src', 'App', 'Handler'), { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'tests', 'src', 'App', 'Handler', 'FixtureTest.php'), MIRROR_TEST, 'utf8');
      const git = (args: string[]) => spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
      git(['init', '-q', '-b', 'master']);
      git(['add', '.']);
      git(['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-qm', 'fixture']);
      const sha = git(['rev-parse', 'HEAD']).stdout.trim();
      const configPath = path.join(sandbox, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(targetConfig({ sha })), 'utf8');
      const outPath = path.join(sandbox, 'report.json');
      const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'test-oracle-quality.mjs'), '--config', configPath, '--out', outPath], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_REPOS_ROOT: siblingRoot },
      });
      expect(result.status).toBe(1);
      const report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      expect(report.targets[0].verdict).toBe('MIRROR_ONLY');
      expect(report.finding).toBe('NONE');
      expect(report.reportDigest).toMatch(/^tqa:sha256:[0-9a-f]{24}$/);
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('a missing config is refused before any read', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'test-oracle-quality.mjs'), '--config', path.join(os.tmpdir(), 'does-not-exist-toq.json')], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('CONFIG_UNREADABLE');
  });
});
