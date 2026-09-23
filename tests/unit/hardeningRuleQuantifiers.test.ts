import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * G16.5 — quantifier truth.
 *
 * Every registered rule declares a quantifier. TOTALITY means "every
 * occurrence must satisfy the invariant", and a rule that promises it while
 * stopping at the first failing witness reports less than it claims: a
 * reviewer repairing the one reported failure discovers the next only on the
 * following run.
 *
 * Three rules did exactly that. Each opened
 * `for (const cone of cones) { if (missing) { fail(...); return; } }`, so the
 * FIRST missing cone abandoned the remaining cones AND every later assertion
 * in the rule. The cases below run the REAL rules against a disposable
 * repository whose cones are deliberately absent, and require EVERY failing
 * occurrence to be named.
 */

const ROOT = path.resolve(__dirname, '../..');

interface ListedRule {
  readonly name: string;
  readonly family: string;
  readonly quantifier: string;
  readonly subject: string;
  readonly probeCount: number;
}

/**
 * The registry as the ENGINE reports it. Read through `--list-rules` rather
 * than by importing the module, so this asserts the shipped enumeration
 * surface -- the one `--list-rules` and a plain run are required to agree on.
 */
function listedRules(): readonly ListedRule[] {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/hardening-check.mjs'), '--list-rules'], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`--list-rules failed: ${result.stderr}`);
  return (JSON.parse(result.stdout) as { rules: ListedRule[] }).rules;
}

const GIT_FLAGS = [
  '-c', 'user.name=Nightwatch Synthetic',
  '-c', 'user.email=synthetic@nightwatch.invalid',
  '-c', 'commit.gpgsign=false',
  '-c', 'init.defaultBranch=main',
];

/**
 * A disposable repository carrying the REAL rule engine over a synthetic
 * source tree. `gitFiles()` needs a real git index, so the tree is committed.
 */
function ruleRoot(files: Readonly<Record<string, string>>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-rules-'));
  fs.mkdirSync(path.join(directory, 'bin'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'bin/hardening-check.mjs'), path.join(directory, 'bin/hardening-check.mjs'));
  fs.copyFileSync(path.join(ROOT, 'bin/child-environment.mjs'), path.join(directory, 'bin/child-environment.mjs'));
  fs.cpSync(path.join(ROOT, 'bin/lib'), path.join(directory, 'bin/lib'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'config'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'config/hardening-rule-probes.v1.json'), path.join(directory, 'config/hardening-rule-probes.v1.json'));
  // The registry imports every rule module, and one of them imports
  // `typescript`. A symlink keeps the fixture cheap and shares the exact
  // dependency tree the real engine resolves against.
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(directory, 'package.json'), `${JSON.stringify({ name: 'nightwatch-rule-fixture', private: true, type: 'module' }, null, 2)}\n`);
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(directory, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }
  spawnSync('git', [...GIT_FLAGS, 'init'], { cwd: directory, encoding: 'utf8' });
  spawnSync('git', [...GIT_FLAGS, 'add', '.'], { cwd: directory, encoding: 'utf8' });
  spawnSync('git', [...GIT_FLAGS, 'commit', '-m', 'synthetic'], { cwd: directory, encoding: 'utf8' });
  return directory;
}

function runRule(directory: string, rule: string): { status: number | null; errors: string[] } {
  const result = spawnSync(process.execPath, [path.join(directory, 'bin/hardening-check.mjs'), `--only=${rule}`], {
    cwd: directory, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  });
  const errors = (result.stderr ?? '').split('\n').filter((line) => line.includes('ERROR:'));
  return { status: result.status, errors };
}

/** A cone file with no forbidden authority, so only ABSENCE is under test. */
const CLEAN_CONE = 'export const marker = 1;\n';

test.describe('G16.5 — a TOTALITY rule reports EVERY failing occurrence', () => {
  test('every registered rule declares a quantifier from the minimum vocabulary', () => {
    // The vocabulary is deliberately the smallest that describes the live rule
    // set; a new value here would be ceremony unless a real rule needs it.
    const allowed = new Set(['EXISTENCE', 'TOTALITY']);
    const rules = listedRules();
    const undeclared = rules.filter((rule) => !allowed.has(rule.quantifier));
    expect(undeclared.map((rule) => rule.name)).toEqual([]);
    expect(rules).toHaveLength(85);
    expect(rules.filter((rule) => rule.quantifier === 'TOTALITY')).toHaveLength(62);
    expect(rules.filter((rule) => rule.quantifier === 'EXISTENCE')).toHaveLength(23);
    for (const rule of rules) {
      expect(rule.subject.trim().length, `${rule.name} has no recorded subject`).toBeGreaterThanOrEqual(8);
      // Non-vacuity: a rule with no recorded probe cannot be shown to detect
      // anything, and the campaign is now gate-authoritative.
      expect(rule.probeCount, `${rule.name} has no recorded negative probe`).toBeGreaterThan(0);
    }
  });

  test('AH-1: BOTH missing cones are reported, not only the first', () => {
    const directory = ruleRoot({ 'placeholder.ts': CLEAN_CONE });
    try {
      const { errors } = runRule(directory, 'checkAlphausHandoffBoundary');
      const missing = errors.filter((line) => line.includes('cone is missing'));
      expect(missing.some((line) => line.includes('src/core/alphausHandoff'))).toBe(true);
      expect(missing.some((line) => line.includes('src/core/c12Readiness'))).toBe(true);
      expect(missing).toHaveLength(2);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('AH-1: a valid FIRST cone does not hide a missing SECOND cone', () => {
    // Occurrence 1 valid, occurrence 2 invalid -- the shape an existence-style
    // implementation passes and a totality rule must not.
    const directory = ruleRoot({ 'src/core/alphausHandoff/index.ts': CLEAN_CONE });
    try {
      const { errors } = runRule(directory, 'checkAlphausHandoffBoundary');
      const missing = errors.filter((line) => line.includes('cone is missing'));
      expect(missing).toHaveLength(1);
      expect(missing[0]).toContain('src/core/c12Readiness');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('FC-1: BOTH missing cones are reported', () => {
    const directory = ruleRoot({ 'placeholder.ts': CLEAN_CONE });
    try {
      const { errors } = runRule(directory, 'checkFindingFrontierBoundary');
      const missing = errors.filter((line) => line.includes('cone is missing'));
      expect(missing.some((line) => line.includes('src/core/findingReview'))).toBe(true);
      expect(missing.some((line) => line.includes('src/core/findingIntel'))).toBe(true);
      expect(missing).toHaveLength(2);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('C-15b: a valid first module and TWO missing later modules both report', () => {
    // The exact case G16.5 names: occurrence 1 valid, occurrences 2 and 3
    // invalid, and BOTH invalid ones must be named.
    //
    // Note the reporting path. C-15b wraps its read in a try/catch that would
    // report "the system map module X is missing", but `readIncludingComments`
    // catches the ENOENT itself, reports `cannot read X` and returns ''. The
    // rule's own catch branch is therefore unreachable -- a dead branch, not a
    // weakened invariant: the accessor reports EVERY unreadable module, so the
    // rule stays total. What matters here is that both later modules are named
    // and the first is not.
    const directory = ruleRoot({ 'src/core/systemMap/model.ts': CLEAN_CONE });
    try {
      const { errors } = runRule(directory, 'checkC15bSystemMapBoundary');
      const unreadable = new Set(errors
        .filter((line) => line.includes('cannot read src/core/systemMap/'))
        .map((line) => /cannot read (\S+?):/.exec(line)?.[1] ?? ''));
      expect([...unreadable].sort()).toEqual([
        'src/core/systemMap/layout.ts',
        'src/core/systemMap/projections.ts',
      ]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('C-15b: the assertions BELOW the loop still run after a missing module', () => {
    // The `return` did not merely skip the remaining modules; it abandoned
    // every assertion below the loop too.
    const directory = ruleRoot({ 'placeholder.ts': CLEAN_CONE });
    try {
      const { errors } = runRule(directory, 'checkC15bSystemMapBoundary');
      const unreadable = new Set(errors
        .filter((line) => line.includes('cannot read src/core/systemMap/'))
        .map((line) => /cannot read (\S+?):/.exec(line)?.[1] ?? ''));
      expect([...unreadable].sort()).toEqual([
        'src/core/systemMap/layout.ts',
        'src/core/systemMap/model.ts',
        'src/core/systemMap/projections.ts',
      ]);
      // Invariants declared AFTER the loop are reached and reported.
      expect(errors.some((line) => line.includes('weakerFactCategory'))).toBe(true);
      expect(errors.some((line) => line.includes('ProjectionBound must carry'))).toBe(true);
      expect(errors.some((line) => line.includes('coverage vocabulary'))).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
