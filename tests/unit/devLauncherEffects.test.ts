// R5-06 / review-5 task A5.1 — the DEV-launcher effect analysis, by AST.
//
// The R3-12/R4-09 scan matched call shapes; twelve equivalent spellings evaded it
// (an IIFE, destructured/aliased/namespace/named bindings, `.call` and
// `Reflect.apply`, a function expression, `globalThis.fetch`, a `let` arrow, an
// effect placed before the guard). These tests drive the production analysis over
// each spelling as a synthetic launcher, over declared-but-not-run function
// bodies (which must NOT be reported) and over every real tracked launcher.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEV_LAUNCHER_MUTANT_SAMPLES,
  analyzeDevLauncher,
  composeSyntheticLauncher,
  devLauncherAnalysisSelfTest,
} from '../../bin/lib/dev-launcher-effects.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');

test.describe('R5-06 DEV-launcher effect analysis', () => {
  for (const sample of DEV_LAUNCHER_MUTANT_SAMPLES) {
    test(`${sample.id}: ${sample.name} is reported`, () => {
      const analysis = analyzeDevLauncher(composeSyntheticLauncher(sample));
      expect(analysis.guardFound).toBe(true);
      expect(analysis.shortCircuitFound).toBe(true);
      const region = sample.expectRegion ?? 'BEFORE_SHORT_CIRCUIT';
      expect(analysis.effects.some((effect) => effect.region === region), JSON.stringify(analysis.effects)).toBe(true);
    });
  }

  test('a clean launcher — including declared-but-never-called function bodies — reports nothing', () => {
    const analysis = analyzeDevLauncher(composeSyntheticLauncher({
      between: [
        'const helper = () => { fs.rmSync(scratch); };',
        'function other() { spawnSync("/bin/true"); }',
        'class Holder { run() { fs.rmSync(scratch); } }',
        "const data = JSON.parse('{}');",
        'const joined = [scratch, root].map((entry) => entry.length);',
      ].join('\n'),
    }));
    expect(analysis.effects).toEqual([]);
    expect(analysis.problems).toEqual([]);
  });

  test('a promise continuation and a read-only fs call are not load-time effects, but a mutation in an invoked callback body is', () => {
    expect(analyzeDevLauncher(composeSyntheticLauncher({ between: "const text = fs.readFileSync(scratch, 'utf8'); const present = fs.existsSync(scratch);" })).effects).toEqual([]);
    expect(analyzeDevLauncher(composeSyntheticLauncher({ between: '(function () { fs.rmSync(scratch); })();' })).effects.length).toBeGreaterThan(0);
    expect(analyzeDevLauncher(composeSyntheticLauncher({ between: '(async () => { await fs.promises.rm(scratch); })();' })).effects.length).toBeGreaterThan(0);
  });

  test('the effects carry their region and source line', () => {
    const analysis = analyzeDevLauncher(composeSyntheticLauncher({ before: 'fs.rmSync(scratch);', between: 'fs.unlinkSync(scratch);' }));
    expect(analysis.effects.map((effect) => effect.region).sort()).toEqual(['BEFORE_GUARD', 'BEFORE_SHORT_CIRCUIT']);
    for (const effect of analysis.effects) expect(effect.line).toBeGreaterThan(0);
  });

  test('a launcher with no guard, no shared parser or no short-circuit is a structural problem', () => {
    expect(analyzeDevLauncher('const x = 1;\n').problems.join('|')).toContain('DEV_LAUNCHER_NO_GUARD');
    const noCli = "import { guardDevLane } from './lib/dev-lane-precondition.mjs';\nguardDevLane({ root: '/x' });\n";
    expect(analyzeDevLauncher(noCli).problems.join('|')).toContain('DEV_LAUNCHER_NO_OPERATOR_CLI');
    const noStop = `${noCli}import { defineOperatorCli } from './lib/operator-cli.mjs';\nconst cli = defineOperatorCli(META);\nconsole.log(cli);\n`;
    expect(analyzeDevLauncher(noStop).problems.join('|')).toContain('DEV_LAUNCHER_NO_SHORT_CIRCUIT');
  });

  test('declared pure locals are exempt, an undeclared local callable is not', () => {
    const source = composeSyntheticLauncher({ between: 'function normalize(value) { return value; }\nnormalize(scratch);' });
    expect(analyzeDevLauncher(source).effects.length).toBeGreaterThan(0);
    expect(analyzeDevLauncher(source, 'launcher.mjs', { pureLocals: new Set(['normalize']) }).effects).toEqual([]);
  });

  test('the built-in self-test reports no finding', () => {
    expect(devLauncherAnalysisSelfTest()).toEqual([]);
  });

  test('every real tracked DEV launcher runs nothing before its guard and nothing effectful before its short-circuit', () => {
    const tracked = execFileSync('git', ['ls-files', '-z', 'bin'], { cwd: REPO_ROOT, encoding: 'utf8' }).split('\0').filter((file) => /^bin\/[^/]+\.mjs$/.test(file));
    let launchers = 0;
    for (const file of tracked) {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      if (!source.includes('guardDevLane(')) continue;
      launchers += 1;
      const analysis = analyzeDevLauncher(source, file);
      expect(analysis.problems, file).toEqual([]);
      expect(analysis.effects, file).toEqual([]);
      expect(analysis.guardFound && analysis.shortCircuitFound, file).toBe(true);
    }
    expect(launchers).toBeGreaterThanOrEqual(13);
  });
});

// ---------------------------------------------------------------------------
// Campaign 15.A — the guard-try evasion class and the lexical-scope repair.
//
// Every real DEV launcher wraps its guard in `try { guardDevLane(...) } catch { … }`.
// The symbol table bound only TOP-LEVEL declarations, so a binding made INSIDE
// that try block (or any other nested block) was never resolved and any effect
// placed there was invisible. Five registered mutants exploited exactly this
// (BM-026/029/030/034/035) and survived the whole campaign. The analysis now
// resolves bindings through the module's lexical scopes.
// ---------------------------------------------------------------------------
test.describe('15.A the guard-try evasion class is closed', () => {
  /** A launcher with the same shape the real ones have: the guard inside a try block. */
  const guardedTryShape = (insideTryCode: string) => [
    "import { spawnSync } from 'node:child_process';",
    "import fs from 'node:fs';",
    "import { guardDevLane } from './lib/dev-lane-precondition.mjs';",
    "import { defineOperatorCli } from './lib/operator-cli.mjs';",
    "const root = '/x';",
    'try {',
    "  guardDevLane({ root, launcher: 'x.mjs', args: process.argv.slice(2) });",
    insideTryCode,
    '} catch (error) {',
    '  console.error(String(error));',
    '  process.exit(3);',
    '}',
    'const cli = defineOperatorCli(META, { entryUrl: import.meta.url });',
    'if (cli.stop) {',
    '} else {',
    "  spawnSync('/bin/true', []);",
    '  fs.rmSync(root);',
    '}',
    '',
  ].join('\n');

  test('an effect injected inside the guard try block is reported', () => {
    for (const code of [
      "const { rmSync } = fs; rmSync(root);",
      "const run = spawnSync; run('/bin/true');",
      "const helper = function () { fs.rmSync(root); }; helper();",
      'let go = () => fs.rmSync(root); go();',
      "function localFn() { fs.rmSync(root); }\n  localFn.call(null);",
      "if (root) { spawnSync('/bin/true'); }",
      'for (const item of [root]) { fs.rmSync(item); }',
      "try { fs.rmSync(root); } catch { /* bounded */ }",
    ]) {
      const analysis = analyzeDevLauncher(guardedTryShape(code), 'x.mjs');
      expect(analysis.guardFound, code).toBe(true);
      expect(analysis.shortCircuitFound, code).toBe(true);
      expect(analysis.problems, code).toEqual([]);
      expect(analysis.effects.some((effect) => effect.region === 'BEFORE_SHORT_CIRCUIT'), code).toBe(true);
    }
  });

  test('a declared-but-never-called binding inside the guard try block is still NOT reported', () => {
    // The repair must not turn declarations into effects: the guarantee the clean
    // launcher relies on survives the scope change.
    const analysis = analyzeDevLauncher(guardedTryShape([
      'const helper = () => { fs.rmSync(root); };',
      'function other() { spawnSync("/bin/true"); }',
      'class Holder { run() { fs.rmSync(root); } }',
      "const data = JSON.parse('{}');",
    ].join('\n')), 'x.mjs');
    expect(analysis.effects).toEqual([]);
    expect(analysis.problems).toEqual([]);
  });

  test('a block-scoped binding that shadows an effect-module import resolves to the shadow', () => {
    // Lexical scoping, not a module-wide table: a `const fs = {...}` declared inside
    // the guard block must shadow the module import there, and the same member use
    // outside it must still be reported. A flat table would report both.
    const a = analyzeDevLauncher(guardedTryShape("const fs = { rmSync: (t) => String(t) };\n  fs.rmSync(root);"), 'x.mjs');
    expect(a.effects).toEqual([]);
    const b = analyzeDevLauncher(guardedTryShape('fs.rmSync(root);'), 'x.mjs');
    expect(b.effects.some((effect) => effect.region === 'BEFORE_SHORT_CIRCUIT')).toBe(true);
  });

  test('the five surviving mutants are dead over the real launcher they targeted', () => {
    // The behavioural proof of the repair: apply each registered mutation to the
    // real tracked launcher it names and require the analysis to report it.
    const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'hardening-rule-probes.v1.json'), 'utf8')) as { behaviouralMutants?: Array<{ id: string; ops: Array<{ file: string; search: string; replace: string }> }> };
    const targetFile = 'bin/observe-gate.mjs';
    const source = fs.readFileSync(path.join(REPO_ROOT, targetFile), 'utf8');
    const survivors = ['BM-026', 'BM-029', 'BM-030', 'BM-034', 'BM-035'];
    for (const id of survivors) {
      const mutant = (registry.behaviouralMutants ?? []).find((entry) => entry.id === id);
      expect(mutant, id).toBeDefined();
      const op = mutant?.ops[0];
      expect(op?.file, id).toBe(targetFile);
      expect(source.split(op?.search ?? '').length - 1, `${id} search literal must be unique`).toBe(1);
      const mutated = source.replace(op?.search ?? '', () => op?.replace ?? '');
      expect(mutated, `${id} must actually change the launcher`).not.toBe(source);
      const analysis = analyzeDevLauncher(mutated, targetFile);
      expect(analysis.effects.length, `${id} must be killed`).toBeGreaterThan(0);
      expect(analysis.effects[0]?.region, `${id} region`).toBe('BEFORE_SHORT_CIRCUIT');
    }
  });

  test('the unmutated launchers stay clean, so the repair added no false positives', () => {
    for (const file of ['bin/observe-gate.mjs', 'bin/phase2c-real.mjs', 'bin/phase4-real.mjs', 'bin/phase7-real.mjs', 'bin/devtools-start.mjs']) {
      const absolute = path.join(REPO_ROOT, file);
      if (!fs.existsSync(absolute)) continue;
      const source = fs.readFileSync(absolute, 'utf8');
      if (!source.includes('guardDevLane(')) continue;
      const analysis = analyzeDevLauncher(source, file);
      expect(analysis.problems, file).toEqual([]);
      expect(analysis.effects, file).toEqual([]);
    }
  });

  test('the registered mutant universe is unchanged — nothing was removed to make the gate pass', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'hardening-rule-probes.v1.json'), 'utf8')) as { behaviouralMutants?: Array<{ id: string }> };
    const ids = (registry.behaviouralMutants ?? []).map((entry) => entry.id);
    expect(ids.length).toBe(116);
    expect(new Set(ids).size).toBe(ids.length);
    // The five previously-surviving mutants are all still registered.
    for (const id of ['BM-026', 'BM-029', 'BM-030', 'BM-034', 'BM-035']) expect(ids).toContain(id);
    // Every mutant still targets a real search literal in a tracked file.
    const registry2 = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'hardening-rule-probes.v1.json'), 'utf8')) as { behaviouralMutants?: Array<{ id: string; ops: Array<{ file: string; search: string }> }> };
    for (const mutant of registry2.behaviouralMutants ?? []) {
      for (const op of mutant.ops) {
        const absolute = path.join(REPO_ROOT, op.file);
        expect(fs.existsSync(absolute), `${mutant.id} names ${op.file}`).toBe(true);
        const occurrences = fs.readFileSync(absolute, 'utf8').split(op.search).length - 1;
        expect(occurrences, `${mutant.id} search literal in ${op.file}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
