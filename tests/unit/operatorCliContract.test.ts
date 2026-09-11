import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  OPERATOR_CLI_EXIT,
  OPERATOR_CLI_SCHEMA,
  defineOperatorCli,
  emitOperatorJson,
  parseOperatorCli,
  renderOperatorHelp,
  scanOperatorOutputForLeaks,
  validateOperatorMetadata,
} from '../../bin/lib/operator-cli.mjs';
import {
  collectOperatorCommandMetadata,
  discoverOperatorBins,
  operatorCommandListing,
  renderOperatorCommandListing,
  sourceDeclaresOperatorMetadata,
} from '../../bin/lib/operator-command-listing.mjs';
import type { OperatorCliMetadata } from '../../bin/lib/operator-cli.mjs';
import type { OperatorCommandEntry } from '../../bin/lib/operator-command-listing.mjs';

const ROOT = path.resolve(__dirname, '../..');

function metadata(overrides: Partial<OperatorCliMetadata> = {}): OperatorCliMetadata {
  return {
    schemaVersion: OPERATOR_CLI_SCHEMA,
    name: 'example-tool',
    entry: 'bin/example-tool.mjs',
    purpose: 'Exercise the shared operator CLI contract in a test.',
    group: 'internal-tooling',
    commands: [
      { name: 'run', summary: 'Run the thing' },
      { name: 'inspect', summary: 'Inspect the thing' },
    ],
    commandRequired: true,
    flags: [
      { name: '--count', shape: 'integer', summary: 'how many times' },
      { name: '--root', shape: 'path', summary: 'where to look' },
      { name: '--mode', shape: 'enum', values: ['fast', 'slow'], summary: 'how to run' },
    ],
    json: true,
    authorization: 'LOCAL_ONLY',
    artifacts: [],
    ...overrides,
  };
}

function capture() {
  const lines: string[] = [];
  return {
    lines,
    stream: { write: (chunk: string) => { lines.push(chunk); return true; } },
  };
}

function usageErrorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code ?? 'NO_CODE';
  }
  return 'NO_ERROR';
}

// ---------------------------------------------------------------------------
// The shared parser (4.1): declared metadata, help, strict refusal, codes.
// ---------------------------------------------------------------------------

test.describe('shared operator CLI parser', () => {
  test('renders help with usage, commands, flags, exit codes and authorization', () => {
    const help = renderOperatorHelp(metadata());
    expect(help).toContain('Usage:');
    expect(help).toContain('Run the thing');
    expect(help).toContain('--count=<integer>');
    expect(help).toContain('--mode=<fast|slow>');
    expect(help).toContain('Exit codes: 0 success, 1 failure, 2 usage error, 3 fail-closed refusal, 4 external block.');
    expect(help).toContain('Authorization: LOCAL_ONLY.');
  });

  test('--help anywhere wins over execution and returns the help stop state', () => {
    const stdout = capture();
    const stderr = capture();
    const exits: number[] = [];
    const result = defineOperatorCli(metadata(), {
      argv: ['run', '--count=3', '--help'],
      stdout: stdout.stream,
      stderr: stderr.stream,
      exit: (code) => exits.push(code),
    });
    expect(result.ok).toBe(true);
    expect(result.stop).toBe(true);
    expect(exits).toEqual([OPERATOR_CLI_EXIT.SUCCESS]);
    expect(stdout.lines.join('')).toContain('Usage:');
    expect(stderr.lines).toEqual([]);
    expect(parseOperatorCli(metadata(), ['-h']).ok).toBe(true);
  });

  test('--print-metadata answers with one JSON document before any parse refusal', () => {
    const stdout = capture();
    const exits: number[] = [];
    const result = defineOperatorCli(metadata(), {
      argv: ['--not-a-real-flag', '--print-metadata'],
      stdout: stdout.stream,
      stderr: { write: () => true },
      exit: (code) => exits.push(code),
    });
    expect(result.stop).toBe(true);
    expect(exits).toEqual([OPERATOR_CLI_EXIT.SUCCESS]);
    const parsed = JSON.parse(stdout.lines.join('')) as { schemaVersion: string; name: string };
    expect(parsed.schemaVersion).toBe(OPERATOR_CLI_SCHEMA);
    expect(parsed.name).toBe('example-tool');
  });

  test('refuses an unknown flag with CLI_UNKNOWN_ARGUMENT and a close match', () => {
    const stderr = capture();
    const exits: number[] = [];
    defineOperatorCli(metadata(), {
      argv: ['run', '--coutn=3'],
      stdout: { write: () => true },
      stderr: stderr.stream,
      exit: (code) => exits.push(code),
    });
    const text = stderr.lines.join('');
    expect(text).toContain('CLI_UNKNOWN_ARGUMENT');
    expect(text).toContain('--coutn');
    expect(text).toContain('did you mean --count?');
    expect(exits).toEqual([OPERATOR_CLI_EXIT.USAGE]);
  });

  test('refuses a missing or malformed value with CLI_ARGUMENT_INVALID', () => {
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['run', '--count']))).toBe('CLI_ARGUMENT_INVALID');
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['run', '--count=abc']))).toBe('CLI_ARGUMENT_INVALID');
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['run', '--mode=turbo']))).toBe('CLI_ARGUMENT_INVALID');
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['--root']))).toBe('CLI_ARGUMENT_INVALID');
  });

  test('refuses conflicting repeats rather than last-wins, and allows identical repeats', () => {
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['run', '--count=1', '--count=2']))).toBe('CLI_ARGUMENT_CONFLICT');
    const same = parseOperatorCli(metadata(), ['run', '--count=2', '--count=2']);
    expect(same.ok).toBe(true);
    if (same.ok) expect(same.flags['--count']).toBe(2);
  });

  test('refuses an unexpected positional and an unknown subcommand', () => {
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['run', 'extra']))).toBe('CLI_UNEXPECTED_POSITIONAL');
    expect(usageErrorCode(() => parseOperatorCli(metadata(), ['rnu']))).toBe('CLI_UNKNOWN_COMMAND');
    expect(usageErrorCode(() => parseOperatorCli(metadata(), []))).toBe('CLI_ARGUMENT_MISSING');
  });

  test('accepts declared forms and keeps --json as a known built-in', () => {
    const parsed = parseOperatorCli(metadata(), ['inspect', '--count', '4', '--mode=fast', '--json']);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.command).toBe('inspect');
      expect(parsed.flags['--count']).toBe(4);
      expect(parsed.json).toBe(true);
    }
  });

  test('a declared trailing contract forwards instead of refusing, and says so', () => {
    const trailing = metadata({ trailing: { summary: 'playwright arguments' } });
    const parsed = parseOperatorCli(trailing, ['run', '--forwarded=1', 'file.spec.ts']);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.trailing).toEqual(['--forwarded=1', 'file.spec.ts']);
    expect(renderOperatorHelp(trailing)).toContain('playwright arguments');
  });

  test('fails closed on invalid metadata and on an entry/name mismatch', () => {
    expect(validateOperatorMetadata({ schemaVersion: OPERATOR_CLI_SCHEMA })).not.toEqual([]);
    expect(validateOperatorMetadata(metadata())).toEqual([]);
    const exits: number[] = [];
    const result = defineOperatorCli(metadata({ name: 'Bad Name' }), {
      argv: [],
      stdout: { write: () => true },
      stderr: { write: () => true },
      exit: (code) => exits.push(code),
    });
    expect(result.stop).toBe(true);
    expect(result.ok).toBe(false);
    expect(exits).toEqual([OPERATOR_CLI_EXIT.USAGE]);
    const mismatch = defineOperatorCli(metadata(), {
      argv: [],
      entryUrl: 'file:///somewhere/else.mjs',
      stdout: { write: () => true },
      stderr: { write: () => true },
      exit: (code) => exits.push(code),
    });
    expect(mismatch.stop).toBe(true);
    expect(exits).toEqual([OPERATOR_CLI_EXIT.USAGE, OPERATOR_CLI_EXIT.USAGE]);
  });

  test('emits exactly one JSON document on the given stdout', () => {
    const stdout = capture();
    emitOperatorJson({ status: 'PASS', value: 1 }, stdout.stream);
    const text = stdout.lines.join('');
    expect(text.split('\n').filter((line) => line.length > 0)).toHaveLength(1);
    expect(JSON.parse(text)).toEqual({ status: 'PASS', value: 1 });
  });

  test('leak scan catches credentials and absolute paths outside the checkout', () => {
    expect(scanOperatorOutputForLeaks('Usage: node bin/tool.mjs')).toEqual([]);
    expect(scanOperatorOutputForLeaks('wrote /home/someone/secret/state.json')).toContain('ABSOLUTE_PATH:/home/someone/secret/state.json');
    expect(scanOperatorOutputForLeaks('Authorization: Bearer ghp_aaaaaaaaaaaaaaaaaaaaaaaa')).toContain('CREDENTIAL_SHAPED_TOKEN');
  });

  test('refusal and external block use exit 3 and 4 in a real process', () => {
    const script = (kind: string): string =>
      `import { refuseOperatorCli, blockOperatorCli } from ${JSON.stringify(path.join(ROOT, 'bin', 'lib', 'operator-cli.mjs'))};\n` +
      (kind === 'refuse'
        ? `refuseOperatorCli('tool', 'OWNER_POLICY_BLOCKED', 'no');\n`
        : `blockOperatorCli('tool', 'CAPABILITY_UNAVAILABLE', 'no');\n`);
    const refused = spawnSync(process.execPath, ['--input-type=module', '-e', script('refuse')], { encoding: 'utf8' });
    const blocked = spawnSync(process.execPath, ['--input-type=module', '-e', script('block')], { encoding: 'utf8' });
    expect(refused.status).toBe(OPERATOR_CLI_EXIT.REFUSAL);
    expect(blocked.status).toBe(OPERATOR_CLI_EXIT.EXTERNAL_BLOCK);
  });
});

// ---------------------------------------------------------------------------
// The listing is derived from declared metadata (4.9).
// ---------------------------------------------------------------------------

function entry(bin: string, name: string, group: string): OperatorCommandEntry {
  return {
    bin,
    declared: true,
    metadata: metadata({ name, entry: bin, group }),
    error: null,
  };
}

test.describe('derived operator command listing', () => {
  test('a newly declared entry appears without editing a list; an undeclared one is visible', () => {
    const rendered = renderOperatorCommandListing([
      entry('bin/alpha.mjs', 'alpha', 'validate'),
      { bin: 'bin/undeclared.mjs', declared: false, metadata: null, error: 'OPERATOR_CLI_METADATA_NOT_DECLARED' },
    ]);
    expect(rendered).toContain('alpha');
    expect(rendered).toContain('Validate:');
    expect(rendered).toContain('bin/undeclared.mjs');
    expect(rendered).toContain('Undeclared metadata (1)');
  });

  test('the static declaration detector is the structural fact', () => {
    expect(sourceDeclaresOperatorMetadata("import { defineOperatorCli } from './lib/operator-cli.mjs';\ndefineOperatorCli({});")).toBe(true);
    expect(sourceDeclaresOperatorMetadata('const x = 1;')).toBe(false);
  });

  test('the live listing includes the first migrated commands, derived not hand-written', () => {
    const listing = operatorCommandListing(ROOT, {
      run: (absolute) => {
        const result = spawnSync(process.execPath, [absolute, '--print-metadata'], { encoding: 'utf8', timeout: 10_000 });
        return result;
      },
    });
    expect(listing.bins.length).toBeGreaterThan(50);
    expect(listing.text).toContain('quality-gate');
    expect(listing.text).toContain('nightwatch');
    expect(listing.text).toContain('Undeclared metadata');
  });
});

// ---------------------------------------------------------------------------
// The exhaustive sweep (4.2, 4.3, 4.6, 4.7, 4.8): every bin, not a sample.
// ---------------------------------------------------------------------------

const SWEEP_TIMEOUT_MS = 300_000;
const REPO_WALK_SKIP = new Set(['.git', 'node_modules', 'test-results', 'dist', 'playwright-report']);

function treeSignature(root: string, relative = ''): Map<string, string> {
  const signature = new Map<string, string>();
  const absolute = path.join(root, relative);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absolute, { withFileTypes: true });
  } catch {
    return signature;
  }
  for (const item of entries) {
    if (REPO_WALK_SKIP.has(item.name)) continue;
    const child = relative.length === 0 ? item.name : `${relative}/${item.name}`;
    if (item.isDirectory()) {
      for (const [key, value] of treeSignature(root, child)) signature.set(key, value);
    } else if (item.isFile()) {
      const stat = fs.statSync(path.join(root, child));
      signature.set(child, `${stat.size}:${stat.mtimeMs}`);
    }
  }
  return signature;
}

function signatureDiff(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed: string[] = [];
  for (const [key, value] of after) if (before.get(key) !== value) changed.push(key);
  for (const key of before.keys()) if (!after.has(key)) changed.push(key);
  return changed.sort((left, right) => left.localeCompare(right));
}

interface SweepSandbox {
  readonly dir: string;
  readonly home: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}

function makeSweepSandbox(): SweepSandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-operator-cli-sweep-'));
  const home = path.join(dir, 'home');
  const cwd = path.join(dir, 'cwd');
  fs.mkdirSync(home);
  fs.mkdirSync(cwd);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, NO_COLOR: '1' };
  for (const key of ['NIGHTWATCH_ENV', 'NIGHTWATCH_STORAGE_STATE', 'NIGHTWATCH_UI_URL', 'GITHUB_TOKEN', 'GH_TOKEN']) delete env[key];
  return { dir, home, cwd, env };
}

test.describe('exhaustive operator CLI sweep', () => {
  test('every discovered bin declares a contract or is reported; help is measured side-effect free', () => {
    test.setTimeout(SWEEP_TIMEOUT_MS);
    const bins = discoverOperatorBins(ROOT);
    // FIRST assertion: a generator that stops finding bins must fail loudly.
    expect(bins.length).toBeGreaterThan(0);
    const filesystemCount = fs.readdirSync(path.join(ROOT, 'bin')).filter((name) => name.endsWith('.mjs')).length;
    expect(bins).toHaveLength(filesystemCount);

    const sandbox = makeSweepSandbox();
    const repoBefore = treeSignature(ROOT);
    const artifactsBefore = treeSignature(path.join(ROOT, 'artifacts'));
    const homeBefore = treeSignature(sandbox.home);
    try {
      const entries = collectOperatorCommandMetadata({
        root: ROOT,
        bins,
        run: (absolute) => spawnSync(process.execPath, [absolute, '--print-metadata'], {
          cwd: sandbox.cwd,
          env: sandbox.env,
          encoding: 'utf8',
          timeout: 10_000,
          maxBuffer: 1024 * 1024,
        }),
      });
      const conforming = entries.filter((item) => item.metadata !== null && item.error === null);
      const declaredBroken = entries.filter((item) => item.declared && item.error !== null);
      const undeclared = entries.filter((item) => !item.declared);
      // A bin that declares metadata but cannot answer is a contract failure
      // now, not later: the parser owns --print-metadata before any effect.
      expect(declaredBroken.map((item) => `${item.bin}: ${item.error}`)).toEqual([]);
      expect(conforming.length).toBeGreaterThan(0);

      const names = new Set<string>();
      for (const item of conforming) {
        const declared = item.metadata;
        if (declared === null) continue;
        expect(names.has(declared.name), `duplicate operator name ${declared.name}`).toBe(false);
        names.add(declared.name);
        expect(declared.entry).toBe(item.bin);
        const cwdBefore = treeSignature(sandbox.cwd);
        const homeRunBefore = treeSignature(sandbox.home);
        const started = Date.now();
        const helpResult = spawnSync(process.execPath, [path.join(ROOT, item.bin), '--help'], {
          cwd: sandbox.cwd,
          env: sandbox.env,
          encoding: 'utf8',
          timeout: 10_000,
          maxBuffer: 2 * 1024 * 1024,
        });
        const elapsed = Date.now() - started;
        expect(helpResult.status, `${item.bin} --help must exit 0`).toBe(0);
        const helpText = String(helpResult.stdout ?? '');
        expect(helpText, `${item.bin} --help must print usage`).toContain('Usage:');
        expect(scanOperatorOutputForLeaks(`${helpText}\n${String(helpResult.stderr ?? '')}`), `${item.bin} leaks in help`).toEqual([]);
        if (declared.trailing === undefined || declared.trailing === false) {
          const unknownResult = spawnSync(process.execPath, [path.join(ROOT, item.bin), '--sweep-unknown-flag-xyz'], {
            cwd: sandbox.cwd,
            env: sandbox.env,
            encoding: 'utf8',
            timeout: 10_000,
            maxBuffer: 2 * 1024 * 1024,
          });
          expect(unknownResult.status, `${item.bin} unknown flag must exit 2`).toBe(OPERATOR_CLI_EXIT.USAGE);
          expect(String(unknownResult.stderr ?? '')).toContain('CLI_UNKNOWN_ARGUMENT');
        }
        expect(signatureDiff(cwdBefore, treeSignature(sandbox.cwd)), `${item.bin} wrote into its working directory under --help`).toEqual([]);
        expect(signatureDiff(homeRunBefore, treeSignature(sandbox.home)), `${item.bin} wrote into $HOME under --help`).toEqual([]);
        if (item.bin === 'bin/quality-gate.mjs') {
          expect(elapsed, 'quality-gate --help must exit within one second').toBeLessThan(1000);
          expect(helpText).not.toContain('finalResult');
        }
      }

      // 4.3: the sweep is measured, not assumed. A change names the path.
      expect(signatureDiff(artifactsBefore, treeSignature(path.join(ROOT, 'artifacts'))), 'artifacts/ changed under --help').toEqual([]);
      expect(signatureDiff(homeBefore, treeSignature(sandbox.home)), '$HOME changed under --help').toEqual([]);
      expect(signatureDiff(repoBefore, treeSignature(ROOT)), 'the working tree changed under --help').toEqual([]);

      console.log(`[operator-cli-sweep] discovered=${bins.length} conforming=${conforming.length} declaredBroken=${declaredBroken.length} undeclared=${undeclared.length}`);
      if (undeclared.length > 0) console.log(`[operator-cli-sweep] undeclared: ${undeclared.map((item) => item.bin).join(', ')}`);
    } finally {
      fs.rmSync(sandbox.dir, { recursive: true, force: true });
    }
  });

  test('quality-gate local --help never starts the gate', () => {
    test.setTimeout(30_000);
    const sandbox = makeSweepSandbox();
    try {
      const artifactsBefore = treeSignature(path.join(ROOT, 'artifacts'));
      const started = Date.now();
      const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'quality-gate.mjs'), 'local', '--help'], {
        cwd: sandbox.cwd,
        env: sandbox.env,
        encoding: 'utf8',
        timeout: 10_000,
      });
      const elapsed = Date.now() - started;
      expect(result.status).toBe(0);
      expect(String(result.stdout)).toContain('Usage: node bin/quality-gate.mjs');
      expect(String(result.stdout)).not.toContain('finalResult');
      expect(String(result.stderr)).not.toContain('RECEIPT_PERSISTED');
      expect(elapsed).toBeLessThan(1000);
      expect(signatureDiff(artifactsBefore, treeSignature(path.join(ROOT, 'artifacts')))).toEqual([]);
      expect(treeSignature(sandbox.home).size).toBe(0);
    } finally {
      fs.rmSync(sandbox.dir, { recursive: true, force: true });
    }
  });
});
