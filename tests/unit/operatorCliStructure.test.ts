// R5-08 / review-5 task A6.2 — the operator-CLI structure analysis, by AST.
//
// The 10.3 rule matched `/cli\.stop/` over the whole file, so a comment, a string
// or a dead branch satisfied it. These tests drive the production analysis over
// each form (and each text-only imposter), and over every registered bin.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeOperatorCliStructure } from '../../bin/lib/operator-cli-structure.mjs';

const ROOT = path.join(__dirname, '..', '..');
const parse = (code: string) => analyzeOperatorCliStructure(code, 'entry.mjs');

test.describe('R5-08 operator-CLI structure', () => {
  test('the real gating forms are recognised', () => {
    const forms = [
      'const cli = defineOperatorCli(CLI_METADATA);\nif (cli.stop) {} else { work(); }\n',
      'const cli = defineOperatorCli(CLI_METADATA);\nif (cli.ok !== true || cli.stop === true) return;\n',
      "const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, {}) : { stop: true };\nif (!cli.stop) { work(); }\n",
      'const cli = defineOperatorCli(CLI_METADATA);\nconst halted = cli.ok !== true || cli.stop === true;\nif (!halted) { work(); }\n',
      'const cli = defineOperatorCli(CLI_METADATA);\n!cli.stop && work();\n',
      'if (defineOperatorCli(CLI_METADATA).stop) { process.exit(0); }\n',
    ];
    for (const code of forms) {
      const structure = parse(code);
      expect(structure.callsDefine, code).toBe(true);
      expect(structure.passesOwnMetadata, code).toBe(true);
      expect(structure.stopGated, code).toBe(true);
    }
  });

  test('a declaration-only entry (parser behind a direct-invocation check) is recognised', () => {
    const structure = parse("if (process.argv[1]?.endsWith('x.mjs')) {\n  defineOperatorCli(CLI_METADATA);\n}\n");
    expect(structure).toMatchObject({ callsDefine: true, passesOwnMetadata: true, declarationOnly: true });
  });

  test('text-only imposters do NOT satisfy the gate: a comment, a string, an unused read, a foreign object', () => {
    const imposters = [
      '// cli.stop is checked below\nconst cli = defineOperatorCli(CLI_METADATA);\nwork();\n',
      "const cli = defineOperatorCli(CLI_METADATA);\nconst note = 'cli.stop';\nwork();\n",
      'const cli = defineOperatorCli(CLI_METADATA);\nconst unusedStop = cli.stop;\nwork();\n',
      'const cli = defineOperatorCli(CLI_METADATA);\nconst other = { stop: true };\nif (other.stop) { work(); }\n',
      'const cli = defineOperatorCli(CLI_METADATA);\nwork(cli);\n',
    ];
    for (const code of imposters) expect(parse(code).stopGated, code).toBe(false);
  });

  test('an entry that never calls the parser, or calls it with foreign metadata, is reported', () => {
    expect(parse('work();\n')).toMatchObject({ callsDefine: false, passesOwnMetadata: false, stopGated: false });
    expect(parse('const cli = defineOperatorCli(SOMETHING_ELSE);\nif (cli.stop) return;\n')).toMatchObject({ callsDefine: true, passesOwnMetadata: false, stopGated: true });
    expect(parse("const text = 'defineOperatorCli(CLI_METADATA)';\nwork();\n").callsDefine).toBe(false);
  });

  test('every registered OPERATOR_CLI bin (enumerated from git ls-files) is structurally sound', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'operator-cli-surface.v1.json'), 'utf8')) as { bins: Array<{ file: string; disposition: string }> };
    const tracked = new Set(execFileSync('git', ['ls-files', '-z', 'bin'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((file) => /^bin\/[^/]+\.mjs$/.test(file)));
    let operators = 0;
    for (const bin of registry.bins) {
      expect(tracked.has(bin.file), bin.file).toBe(true);
      if (bin.disposition !== 'OPERATOR_CLI') continue;
      operators += 1;
      const structure = analyzeOperatorCliStructure(fs.readFileSync(path.join(ROOT, bin.file), 'utf8'), bin.file);
      expect(structure.callsDefine && structure.passesOwnMetadata && (structure.stopGated || structure.declarationOnly), bin.file).toBe(true);
    }
    expect(operators).toBeGreaterThanOrEqual(72);
    expect([...tracked].every((file) => registry.bins.some((bin) => bin.file === file))).toBe(true);
  });
});
