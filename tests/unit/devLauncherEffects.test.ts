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
