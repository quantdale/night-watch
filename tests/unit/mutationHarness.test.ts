// R5-05 / review-5 task A4.3 — the behavioural mutation harness.
//
// The harness is the committed second detector for guards a text anchor cannot
// cover. These tests drive it against a SYNTHETIC repository (never the real
// tree) with injected detector commands, and prove its own teeth: a detected
// mutant, a survivor, a mutant detected only by hardening, a broken baseline, a
// drifted literal, an uncovered requirement and a vacuous registry each produce
// the verdict they must.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMutationHarness, validateMutantRegistry } from '../../bin/lib/hardening/mutation-harness.mjs';

const GUARD = 'guard.mjs';
const FOCUSED = 'focused.check.mjs';
const REGISTRY = 'registry.json';

interface Synthetic { readonly root: string; readonly files: string[] }

function synthetic(registry: unknown): Synthetic {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-harness-fixture-'));
  fs.writeFileSync(path.join(root, GUARD), "export const guard = 'ENFORCED';\nexport const other = 'ENFORCED-TOO';\n");
  // The "focused test": fails when the guard literal named on argv[2] is absent.
  fs.writeFileSync(path.join(root, FOCUSED), "import fs from 'node:fs';\nconst text = fs.readFileSync(process.argv[2], 'utf8');\nprocess.exit(text.includes(\"'ENFORCED';\") ? 0 : 1);\n");
  // The "hardening check": fails when the second literal is absent.
  fs.writeFileSync(path.join(root, 'hardening.check.mjs'), "import fs from 'node:fs';\nprocess.exit(fs.readFileSync('guard.mjs', 'utf8').includes(\"'ENFORCED-TOO'\") ? 0 : 1);\n");
  fs.writeFileSync(path.join(root, REGISTRY), JSON.stringify(registry, null, 2));
  return { root, files: [GUARD, FOCUSED, 'hardening.check.mjs', REGISTRY] };
}

function mutant(id: string, finding: string, search: string, replace: string) {
  return { id, finding, guard: `guard ${id}`, ops: [{ file: GUARD, search, replace }], focusedTests: [FOCUSED] };
}

async function drive(fixture: Synthetic, extra: { onlyMutant?: string } = {}) {
  const lines: string[] = [];
  const result = await runMutationHarness({
    root: fixture.root,
    registryPath: REGISTRY,
    trackedFiles: fixture.files,
    environment: { PATH: process.env.PATH ?? '' },
    testInvocation: (tests) => ({ command: process.execPath, args: [FOCUSED, GUARD, ...tests.map((test) => test.file)] }),
    hardeningInvocation: () => ({ command: process.execPath, args: ['hardening.check.mjs'] }),
    log: (line) => lines.push(line),
    ...extra,
  });
  return { result, lines };
}

test.describe('R5-05 mutation harness', () => {
  test('a mutant a focused test detects is DETECTED, one nothing detects is a SURVIVOR, one only hardening detects is DETECTED', async () => {
    const fixture = synthetic({
      behaviouralMutantRequirements: ['R5-05/N1', 'R5-05/N2', 'R5-05/N3'],
      behaviouralMutants: [
        mutant('BM-001', 'R5-05/N1', "'ENFORCED';", "'WEAKENED';"),
        mutant('BM-002', 'R5-05/N2', "export const other = 'ENFORCED-TOO';", "export const other = 'ENFORCED-TOO'; const unused = 1;"),
        mutant('BM-003', 'R5-05/N3', "'ENFORCED-TOO'", "'HARDENING-ONLY'"),
      ],
    });
    try {
      const { result, lines } = await drive(fixture);
      expect(result.ok).toBe(false);
      expect(result.mutants).toBe(3);
      expect(result.detected).toBe(2);
      expect(result.survived).toEqual(['BM-002']);
      expect(lines).toContain('[mutants] R5-05/N1 DETECTED_BY_TESTS BM-001 (guard BM-001)');
      expect(lines).toContain('[mutants] R5-05/N2 SURVIVED BM-002 (guard BM-002)');
      expect(lines).toContain('[mutants] R5-05/N3 DETECTED_BY_HARDENING BM-003 (guard BM-003)');
      // The mutation is applied to a SCRATCH copy only: the real files are untouched.
      expect(fs.readFileSync(path.join(fixture.root, GUARD), 'utf8')).toContain("'ENFORCED';");
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('every mutant detected passes the harness and --mutant narrows to one', async () => {
    const fixture = synthetic({
      behaviouralMutantRequirements: ['R5-05/N1'],
      behaviouralMutants: [mutant('BM-001', 'R5-05/N1', "'ENFORCED';", "'WEAKENED';")],
    });
    try {
      const all = await drive(fixture);
      expect(all.result).toMatchObject({ ok: true, mutants: 1, detected: 1, survived: [], errors: [] });
      const unknown = await drive(fixture, { onlyMutant: 'BM-999' });
      expect(unknown.result.ok).toBe(false);
      expect(unknown.result.errors).toContain('MUTANT_UNKNOWN: BM-999');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('a failing baseline invalidates the run instead of "detecting" every mutant', async () => {
    const fixture = synthetic({
      behaviouralMutantRequirements: ['R5-05/N1'],
      behaviouralMutants: [mutant('BM-001', 'R5-05/N1', "'ENFORCED';", "'WEAKENED';")],
    });
    try {
      // Break the UNMUTATED baseline: the focused test fails with no mutation applied
      // (the mutant's literal is still present, so only the baseline can object).
      fs.writeFileSync(path.join(fixture.root, FOCUSED), 'process.exit(1);\n');
      const { result } = await drive(fixture);
      expect(result.ok).toBe(false);
      expect(result.errors.some((error) => error.startsWith('MUTANT_BASELINE_TESTS_FAILED'))).toBe(true);
      expect(result.detected).toBe(0);
      // And a broken hardening baseline is refused the same way.
      fs.writeFileSync(path.join(fixture.root, FOCUSED), "process.exit(0);\n");
      fs.writeFileSync(path.join(fixture.root, 'hardening.check.mjs'), 'process.exit(1);\n');
      const hardening = await drive(fixture);
      expect(hardening.result.ok).toBe(false);
      expect(hardening.result.errors).toContain('MUTANT_BASELINE_HARDENING_FAILED');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('a drifted search literal, an uncovered requirement and a vacuous registry fail closed before any mutant runs', async () => {
    const drifted = synthetic({
      behaviouralMutantRequirements: ['R5-05/N1', 'R5-05/N9'],
      behaviouralMutants: [mutant('BM-001', 'R5-05/N1', "'NO-SUCH-LITERAL'", "'X'")],
    });
    try {
      const { result } = await drive(drifted);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(`MUTANT_SEARCH_NOT_UNIQUE: BM-001 ${GUARD} (0 occurrence(s))`);
      expect(result.errors).toContain('MUTANT_REQUIREMENT_UNCOVERED: R5-05/N9 has no registered behavioural mutant');
    } finally {
      fs.rmSync(drifted.root, { recursive: true, force: true });
    }
    const vacuous = synthetic({ behaviouralMutantRequirements: [], behaviouralMutants: [] });
    try {
      const { result } = await drive(vacuous);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('MUTANT_REGISTRY_VACUOUS: no behavioural mutant is registered');
    } finally {
      fs.rmSync(vacuous.root, { recursive: true, force: true });
    }
  });

  test('the registry validator rejects every malformed entry shape', () => {
    const tracked = new Set([GUARD, FOCUSED]);
    const read = (file: string) => (file === GUARD ? "a b a" : null);
    const verdict = validateMutantRegistry({
      behaviouralMutantRequirements: ['not-a-tag'],
      behaviouralMutants: [
        null,
        { id: 'bad', finding: 'R5-05/N1', guard: 'g', ops: [], focusedTests: [] },
        { id: 'BM-002', finding: 'R5-05/N1', guard: 'g', ops: [], focusedTests: [] },
        { id: 'BM-001', finding: 'nope', guard: '', ops: [{ file: GUARD, search: 'a', replace: 'a' }], focusedTests: [{ file: 'untracked.test.ts' }] },
        { id: 'BM-001', finding: 'R5-05/N1', guard: 'dup', ops: [{ file: 'untracked.mjs', search: 'x', replace: 'y' }], focusedTests: [{ file: FOCUSED, grep: '' }] },
      ],
    }, (file) => tracked.has(file), read);
    const text = verdict.errors.join('\n');
    for (const code of ['MUTANT_ENTRY_NOT_AN_OBJECT', 'MUTANT_ID_INVALID', 'MUTANT_OPS_MISSING', 'MUTANT_FOCUSED_TESTS_MISSING', 'MUTANT_FINDING_INVALID', 'MUTANT_GUARD_MISSING', 'MUTANT_OP_NOOP', 'MUTANT_SEARCH_NOT_UNIQUE', 'MUTANT_TEST_UNTRACKED', 'MUTANT_ID_DUPLICATE', 'MUTANT_FILE_UNTRACKED', 'MUTANT_TEST_GREP_INVALID', 'MUTANT_REQUIREMENT_INVALID']) {
      expect(text, code).toContain(code);
    }
    expect(validateMutantRegistry(null, () => true, () => '').errors).toEqual(['MUTANT_REGISTRY_UNREADABLE']);
  });
});
