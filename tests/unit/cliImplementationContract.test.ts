import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  extractLoaderCallSites,
  findBinsWithoutExecutingTest,
  renderLoaderTypeMap,
  verifyCliImplementationContract,
} from '../../bin/lib/cli-implementation-contract.mjs';
import type { ContractAccess, ContractSourceFile } from '../../bin/lib/cli-implementation-contract.mjs';

const ROOT = path.resolve(__dirname, '../..');
const LOADER_DECLARATION = path.join(ROOT, 'bin', 'lib', 'typescript-runtime-loader.d.mts');

// ---------------------------------------------------------------------------
// The rule (F-15.1 .. F-15.4): pure, negative-probed judgement.
// ---------------------------------------------------------------------------

function inMemoryAccess(files: Record<string, string>): ContractAccess {
  return {
    readSource: (relativePath: string) => files[relativePath] ?? null,
    fileExists: (relativePath: string) => Object.prototype.hasOwnProperty.call(files, relativePath),
  };
}

const LOADER_IMPORT = "import { loadTypeScriptModule, loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';\n";

test.describe('CLI implementation contract rule', () => {
  test('refuses a path assembled at runtime instead of a string literal', () => {
    const source = `${LOADER_IMPORT}const name = 'localCanary';\nconst service = loadTypeScriptModule('src/core/aiReview/' + name + '.ts');\nservice.run();\n`;
    const { findings } = extractLoaderCallSites([{ file: 'bin/computed.mjs', source }]);
    expect(findings.map((finding) => finding.code)).toContain('CLI_CONTRACT_PATH_NOT_LITERAL');
    expect(findings.some((finding) => finding.detail.includes('bin/computed.mjs:3'))).toBe(true);
  });

  test('refuses a non-literal element in a module list', () => {
    const source = `${LOADER_IMPORT}const file = process.env.TARGET;\nconst [mod] = loadTypeScriptModules([file, 'src/core/oops/l6.ts']);\nmod.run();\n`;
    const { findings } = extractLoaderCallSites([{ file: 'bin/list.mjs', source }]);
    expect(findings.map((finding) => finding.code)).toContain('CLI_CONTRACT_PATH_NOT_LITERAL');
  });

  test('fails when a referenced module does not exist', () => {
    const own = {
      'src/real.ts': 'export const present = 1;\n',
    };
    const source = `${LOADER_IMPORT}const { present } = loadTypeScriptModule('src/missing.ts');\npresent;\n`;
    const judgement = verifyCliImplementationContract({
      files: [{ file: 'bin/moved.mjs', source }],
      access: inMemoryAccess(own),
    });
    expect(judgement.findings.map((finding) => finding.code)).toContain('CLI_CONTRACT_MODULE_MISSING');
    expect(judgement.findings.some((finding) => finding.detail.includes('src/missing.ts'))).toBe(true);
  });

  test('fails when the call site reads a symbol the module does not export', () => {
    const own = {
      'src/mod.ts': 'export const present = 1;\n',
    };
    const source = `${LOADER_IMPORT}const { present, absent } = loadTypeScriptModule('src/mod.ts');\npresent; absent;\n`;
    const judgement = verifyCliImplementationContract({
      files: [{ file: 'bin/symbol.mjs', source }],
      access: inMemoryAccess(own),
    });
    expect(judgement.findings.map((finding) => finding.code)).toContain('CLI_CONTRACT_SYMBOL_MISSING');
    expect(judgement.findings.some((finding) => finding.detail.endsWith('src/mod.ts absent'))).toBe(true);
  });

  test('passes when every read symbol is exported, including through a re-export barrel', () => {
    const own = {
      'src/barrel.ts': "export * from './leaf.ts';\nexport { renamed } from './other.ts';\n",
      'src/leaf.ts': 'export const alpha = 1;\n',
      'src/other.ts': 'const renamed = 2;\nexport { renamed };\n',
    };
    const source = `${LOADER_IMPORT}const { alpha, renamed } = loadTypeScriptModule('src/barrel.ts');\nalpha; renamed;\n`;
    const judgement = verifyCliImplementationContract({
      files: [{ file: 'bin/barrel.mjs', source }],
      access: inMemoryAccess(own),
    });
    expect(judgement.findings).toEqual([]);
    expect(judgement.stats.symbolChecks).toBe(2);
  });

  test('fails vacuously when zero call sites are extracted', () => {
    const source = `${LOADER_IMPORT}const message = 'no loader call here';\nmessage;\n`;
    const judgement = verifyCliImplementationContract({
      files: [{ file: 'bin/vacuous.mjs', source }],
      access: inMemoryAccess({}),
    });
    expect(judgement.findings.map((finding) => finding.code)).toContain('CLI_CONTRACT_EXTRACTOR_VACUOUS');
  });

  test('maps a module-list destructure to its modules positionally', () => {
    const own = {
      'src/first.ts': 'export const first = 1;\n',
      'src/second.ts': 'export const second = 2;\n',
    };
    const ok = `${LOADER_IMPORT}const [a, b] = loadTypeScriptModules(['src/first.ts', 'src/second.ts']);\na.first; b.second;\n`;
    const okJudgement = verifyCliImplementationContract({ files: [{ file: 'bin/list-ok.mjs', source: ok }], access: inMemoryAccess(own) });
    expect(okJudgement.findings).toEqual([]);
    const swapped = `${LOADER_IMPORT}const [a, b] = loadTypeScriptModules(['src/first.ts', 'src/second.ts']);\na.second; b.first;\n`;
    const badJudgement = verifyCliImplementationContract({ files: [{ file: 'bin/list-bad.mjs', source: swapped }], access: inMemoryAccess(own) });
    expect(badJudgement.findings.filter((finding) => finding.code === 'CLI_CONTRACT_SYMBOL_MISSING')).toHaveLength(2);
  });

  test('renders a typed loader map derived from each module path', () => {
    const rendered = renderLoaderTypeMap(['src/b.ts', 'src/a.ts', 'src/b.ts']);
    expect(rendered).toContain('"src/a.ts": typeof import("../../src/a");');
    expect(rendered).toContain('"src/b.ts": typeof import("../../src/b");');
    expect(rendered.indexOf('"src/a.ts"')).toBeLessThan(rendered.indexOf('"src/b.ts"'));
    expect(rendered).toContain('export function loadTypeScriptModule<');
    expect(rendered).toContain('TypeScriptRuntimeLoaderModuleMap[File]');
  });

  test('the live bin tree satisfies the loader contract with a non-zero count', () => {
    const files: ContractSourceFile[] = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name).split(path.sep).join('/');
        if (entry.isDirectory()) walk(relative);
        else if (entry.name.endsWith('.mjs')) files.push({ file: relative, source: fs.readFileSync(path.join(ROOT, relative), 'utf8') });
      }
    };
    walk('bin');
    const judgement = verifyCliImplementationContract({
      files,
      access: {
        readSource: (relativePath) => {
          try {
            return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
          } catch {
            return null;
          }
        },
        fileExists: (relativePath) => fs.existsSync(path.join(ROOT, relativePath)),
      },
      readLoaderTypeMap: () => fs.readFileSync(LOADER_DECLARATION, 'utf8'),
    });
    expect(judgement.findings).toEqual([]);
    expect(judgement.stats.callSites).toBeGreaterThan(0);
    expect(judgement.stats.distinctPaths).toBeGreaterThan(0);
    expect(judgement.stats.literalPaths).toBeGreaterThan(0);
  });

  test('coverage: a source-read test does not count; a spawn call does', () => {
    const reading = "const source = fs.readFileSync(path.join(ROOT, 'bin', 'sample.mjs'), 'utf8'); expect(source).toContain('x');\n";
    expect(findBinsWithoutExecutingTest({ bins: ['bin/sample.mjs'], tests: [{ file: 'tests/unit/reading.test.ts', source: reading }] }).uncovered).toEqual(['bin/sample.mjs']);
    const spawning = "const SAMPLE = path.join(ROOT, 'bin', 'sample.mjs');\nspawnSync(process.execPath, [SAMPLE], { encoding: 'utf8' });\n";
    expect(findBinsWithoutExecutingTest({ bins: ['bin/sample.mjs'], tests: [{ file: 'tests/unit/spawning.test.ts', source: spawning }] }).uncovered).toEqual([]);
    const inline = "spawnSync(process.execPath, [path.join(ROOT, 'bin', 'sample.mjs')], { encoding: 'utf8' });\n";
    expect(findBinsWithoutExecutingTest({ bins: ['bin/sample.mjs'], tests: [{ file: 'tests/unit/inline.test.ts', source: inline }] }).uncovered).toEqual([]);
  });

  test('coverage: the live tree leaves no tracked entry point without an executing test', () => {
    const bins = fs.readdirSync(path.join(ROOT, 'bin')).filter((name) => name.endsWith('.mjs')).map((name) => `bin/${name}`);
    const tests: ContractSourceFile[] = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name).split(path.sep).join('/');
        if (entry.isDirectory()) walk(relative);
        else if (entry.name.endsWith('.ts')) tests.push({ file: relative, source: fs.readFileSync(path.join(ROOT, relative), 'utf8') });
      }
    };
    walk('tests');
    const coverage = findBinsWithoutExecutingTest({ bins, tests });
    expect(coverage.bins.length).toBeGreaterThan(0);
    expect(coverage.uncovered).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Executing tests (F-15.8 / F-15.9): every bin runs as a process.
//
// Refusal paths use a disposable sandbox: a fresh cwd and HOME, plus PATH
// shims for playwright/npx/gh that touch a sentinel. A gated launcher that
// reached a browser, a subprocess or a socket would either trip the sentinel
// or leave a file; the assertion is therefore "nothing was created". A socket
// cannot be observed from outside without syscall tracing, so the guarantee
// for the refusal path is that it fails before the dispatch call, and the
// dispatch/tool shims plus the empty directories are the bounded evidence.
// ---------------------------------------------------------------------------

interface Sandbox {
  readonly dir: string;
  readonly home: string;
  readonly cwd: string;
  readonly sentinel: string;
  readonly env: NodeJS.ProcessEnv;
}

const sandboxes: string[] = [];

function makeSandbox(): Sandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-cli-contract-'));
  sandboxes.push(dir);
  const home = path.join(dir, 'home');
  const cwd = path.join(dir, 'cwd');
  const shims = path.join(dir, 'shims');
  fs.mkdirSync(home);
  fs.mkdirSync(cwd);
  fs.mkdirSync(shims);
  const sentinel = path.join(dir, 'subprocess-sentinel');
  for (const name of ['playwright', 'npx', 'gh']) {
    const shim = path.join(shims, name);
    fs.writeFileSync(shim, `#!/bin/sh\n: > ${JSON.stringify(sentinel)}\nexit 97\n`, { mode: 0o755 });
  }
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, PATH: `${shims}:${process.env.PATH ?? ''}` };
  for (const key of ['NIGHTWATCH_ENV', 'NIGHTWATCH_STORAGE_STATE', 'NIGHTWATCH_UI_URL', 'GITHUB_TOKEN', 'GH_TOKEN']) delete env[key];
  return { dir, home, cwd, sentinel, env };
}

test.afterAll(() => {
  for (const dir of sandboxes) fs.rmSync(dir, { recursive: true, force: true });
});

function spawnOptions(sandbox: Sandbox, timeout = 120_000) {
  return { cwd: sandbox.cwd, env: sandbox.env, encoding: 'utf8' as const, timeout, maxBuffer: 16 * 1024 * 1024 };
}

function expectRefusal(result: ReturnType<typeof spawnSync>, code: RegExp, sandbox: Sandbox): void {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  expect(result.status ?? 1).not.toBe(0);
  expect(output).toMatch(code);
  expect(fs.existsSync(sandbox.sentinel), 'a shimmed browser/CLI tool was dispatched').toBe(false);
  expect(fs.readdirSync(sandbox.cwd), 'the refusal created a file in the working directory').toEqual([]);
  expect(fs.readdirSync(sandbox.home), 'the refusal created a file in HOME').toEqual([]);
}

test.describe('gated launchers refuse before any browser, subprocess or file', () => {
  test('phase22-dev refuses an unverifiable storage state', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase22-dev.mjs'), 'acceptance', '--execute', '--env=dev', '--storage-state=/nonexistent/state.json', '--manifest=/nonexistent/manifest.json'], spawnOptions(sandbox));
    expectRefusal(result, /PHASE22_OPERATOR_BLOCKED:STORAGE_STATE_PATH_GATE/, sandbox);
  });

  test('phase22-real refuses missing DEV authorization arguments', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase22-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /PHASE22_BLOCKED_BEFORE_DEV:DEV_STORAGE_AND_MANIFEST_REQUIRED/, sandbox);
  });

  test('phase23-dev refuses execute without an exact-head observation', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase23-dev.mjs'), 'execute'], spawnOptions(sandbox));
    expectRefusal(result, /PHASE23_OPERATOR_BLOCKED:DEV_EXECUTION_ARGUMENTS_REQUIRED/, sandbox);
  });

  test('phase23-predev refuses facts outside the owner boundary', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase23-predev.mjs'), 'evaluate'], spawnOptions(sandbox));
    expectRefusal(result, /PHASE23_PREDEV_BLOCKED:FACTS_MUST_BE_ABSOLUTE/, sandbox);
  });

  test('phase23-ci refuses observe without a run id', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase23-ci.mjs'), 'observe'], spawnOptions(sandbox));
    expectRefusal(result, /PHASE23_CI_OBSERVER_BLOCKED:RUN_ID_REQUIRED/, sandbox);
  });

  test('phase2b-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase2b-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /phase2b-real requires exactly one --env=dev/, sandbox);
  });

  test('phase9b-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase9b-real.mjs'), '--env=dev'], spawnOptions(sandbox));
    expectRefusal(result, /phase9b-real requires --storage-state=/, sandbox);
  });

  test('auth-capture refuses without an explicit environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'auth-capture.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /\[auth:capture\] FAIL: exactly one supported environment/, sandbox);
  });

  test('observe-canary refuses without an explicit environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'observe-canary.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /observe:canary requires exactly one --env=dev\|next/, sandbox);
  });

  test('observe-gate refuses without an explicit environment and storage state', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'observe-gate.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /observe:gate requires exactly one --env=dev\|next/, sandbox);
  });

  test('phase10b-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase10b-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /phase10b-real requires exactly one --env=dev/, sandbox);
  });

  test('phase2c-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase2c-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /phase2c-real requires exactly one --env=dev/, sandbox);
  });

  test('phase4-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase4-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /phase4-real requires --env=dev/, sandbox);
  });

  test('phase5-real refuses an unguarded environment', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase5-real.mjs')], spawnOptions(sandbox));
    expectRefusal(result, /phase5-real requires --env=dev/, sandbox);
  });
});

test.describe('entry points execute bounded, observable paths', () => {
  test('efficacy-corpus runs its deterministic baseline', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'efficacy-corpus.mjs'), 'baseline'], spawnOptions(sandbox, 180_000));
    expect(result.status).toBe(0);
    const report = JSON.parse(String(result.stdout));
    expect(report.corpusId).toBe('nightwatch.efficacy-corpus.v2');
  });

  test('frontier-determinism certifies one digest in one fresh process', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'frontier-determinism.mjs'), '1'], spawnOptions(sandbox, 240_000));
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain('PASS: 1 unique semantic digest across 1 fresh');
  });

  test('selfdev-provenance reads fixed local metadata or refuses a dirty checkout', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'selfdev-provenance.mjs')], spawnOptions(sandbox, 180_000));
    if (result.status === 0) {
      const provenance = JSON.parse(String(result.stdout));
      expect(provenance.schemaVersion).toBe('nightwatch.selfdev-provenance.private.v1');
    } else {
      expect(String(result.stderr)).toContain('SELFDEV_PROVENANCE_FAILED:');
    }
  });

  test('semantic-compat validates the complete phase cone without dispatching a suite', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'semantic-compat.mjs'), '--validate'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    const receipt = JSON.parse(String(result.stdout));
    expect(receipt.result).toBe('VALID');
    expect(receipt.phaseRange).toEqual({ first: 9, last: 26 });
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
  });

  test('review-mutation-campaign prints its mutation inventory without editing a source', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'review-mutation-campaign.mjs'), '--plan'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    const plan = JSON.parse(String(result.stdout));
    expect(plan.mutationCount).toBeGreaterThan(0);
    expect(plan.behavioural).toBeGreaterThan(0);
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
    expect(fs.readdirSync(sandbox.cwd)).toEqual([]);
  });

  test('quality-gate-spec validates the declared gate definition', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'quality-gate-spec.mjs')], spawnOptions(sandbox, 180_000));
    expect(result.status).toBe(0);
    const receipt = JSON.parse(String(result.stdout));
    expect(receipt.status).toBe('PASS');
  });

  test('finding-intel-scale runs a bounded local measurement', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'finding-intel-scale.mjs'), '2', '--budget-ms', '3000', '--json'], spawnOptions(sandbox, 180_000));
    expect(result.status).toBe(0);
    const report = JSON.parse(String(result.stdout));
    expect(report.schemaVersion).toBe('nightwatch.finding-intel-scale-report.v1');
  });

  test('review-persistence-scale runs a bounded local measurement', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'review-persistence-scale.mjs'), '2', '--json'], spawnOptions(sandbox, 180_000));
    expect(result.status).toBe(0);
    // The bin prints one JSON document followed by a one-line human summary.
    const stdout = String(result.stdout);
    const report = JSON.parse(stdout.slice(0, stdout.lastIndexOf('}') + 1));
    expect(report.schemaVersion).toBe('nightwatch.review-persistence-scale.v1');
  });

  test('auth-configure exposes bounded help without an interactive prompt', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'auth-configure.mjs'), '--help'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain('Usage: npm run auth:configure');
  });

  test('helper bins execute as side-effect-free processes', () => {
    const sandbox = makeSandbox();
    const launcherArgs = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase10b-launcher-args.mjs')], spawnOptions(sandbox));
    const launcherArgs9b = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase9b-launcher-args.mjs')], spawnOptions(sandbox));
    const continuity = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'agent-continuity-protocol.mjs')], spawnOptions(sandbox));
    const childEnvironment = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'child-environment.mjs')], spawnOptions(sandbox));
    const observeConfig = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'observe-authenticated-config.mjs')], spawnOptions(sandbox));
    const plannerProtocol = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'planner-handoff-protocol.mjs')], spawnOptions(sandbox));
    expect(launcherArgs.status).toBe(0);
    expect(launcherArgs9b.status).toBe(0);
    expect(continuity.status).toBe(0);
    expect(childEnvironment.status).toBe(0);
    expect(observeConfig.status).toBe(0);
    expect(plannerProtocol.status).toBe(0);
  });

  test('campaign-synthetic validates its manifest without dispatching Playwright', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'campaign-synthetic.mjs'), '--validate'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    const receipt = JSON.parse(String(result.stdout));
    expect(receipt.result).toBe('VALID');
    expect(receipt.fileCount).toBeGreaterThan(0);
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
  });

  test('change-intelligence exposes bounded help without compiling or writing a report', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'change-intelligence.mjs'), '--help'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain('Usage: node bin/change-intelligence.mjs');
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
    expect(fs.readdirSync(sandbox.cwd)).toEqual([]);
  });

  test('quality-gate-clean exposes bounded help without cloning or installing', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'quality-gate-clean.mjs'), '--help'], spawnOptions(sandbox));
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain('Usage: node bin/quality-gate-clean.mjs');
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
    expect(fs.readdirSync(sandbox.cwd)).toEqual([]);
  });

  test('selfdev-catalog-integrity either passes on a clean checkout or refuses a dirty one', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'selfdev-catalog-integrity.mjs')], spawnOptions(sandbox, 180_000));
    if (result.status === 0) {
      const receipt = JSON.parse(String(result.stdout));
      expect(receipt.status).toBe('PASS');
    } else {
      expect(String(result.stderr)).toContain('SELFDEV_CATALOG_INTEGRITY_CHECKOUT_DIRTY');
    }
  });

  test('the bin type lane self-checks its config, declaration and exemptions', () => {
    const sandbox = makeSandbox();
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'bin-typecheck.mjs'), '--config-check'], spawnOptions(sandbox, 180_000));
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain('config-check PASS');
    expect(fs.existsSync(sandbox.sentinel)).toBe(false);
  });
});
