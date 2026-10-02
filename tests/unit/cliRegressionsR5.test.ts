// R5-07 / review-5 task A6.1 — CLI regressions from the M9 migrations.
//
// `nightwatch-agent bogus` exited 0 (the default command swallowed the word as a
// free positional), `phase22-dev explain <id>` failed CLI_UNEXPECTED_POSITIONAL
// (it read a positional it never declared), help advertised flags nothing
// consumed, and the DEV-executing `phase23-dev` declared a LOCAL_ONLY class.
// Each is a spawned-process regression.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { operatorCommandListing } from '../../bin/lib/operator-command-listing.mjs';

const ROOT = path.join(__dirname, '..', '..');

function run(bin: string, args: string[]) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', bin), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    timeout: 60_000,
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function metadata(bin: string): { flags: Array<{ name: string }>; authorization?: string; positionals?: { max?: number; choices?: string[] } } {
  return JSON.parse(run(bin, ['--print-metadata']).stdout);
}

test.describe('R5-07 nightwatch-agent', () => {
  test('an unknown command is a usage error (exit 2), never the default help (exit 0)', () => {
    // `bogus`/`campain` must be refused by the DECLARED CHOICES (a second guard, the stray-positional
    // refusal, would also exit 2, so only the code tells the two apart and a removed `choices` is seen);
    // `run` is a valid CAMPAIGN word but not a command, refused by the stray-positional guard.
    for (const [word, code] of [['bogus', /CLI_ARGUMENT_INVALID/], ['campain', /CLI_ARGUMENT_INVALID/], ['run', /takes no argument/]] as const) {
      const result = run('nightwatch-agent.mjs', [word]);
      expect(result.status, word).toBe(2);
      expect(`${result.stderr}${result.stdout}`, word).toMatch(code);
    }
  });

  test('a positional that does not follow `campaign` is refused even when it is a valid subcommand word', () => {
    for (const args of [['status', 'extra'], ['status', 'run'], ['test', 'status']]) {
      const result = run('nightwatch-agent.mjs', args);
      expect(result.status, args.join(' ')).toBe(2);
    }
  });

  test('help still exits 0, and an undeclared flag is refused with exit 2', () => {
    expect(run('nightwatch-agent.mjs', ['help']).status).toBe(0);
    expect(run('nightwatch-agent.mjs', ['--help']).status).toBe(0);
    expect(run('nightwatch-agent.mjs', []).status).toBe(0);
    for (const flag of ['--porcelain', '--project=x', '--workers=2', '--expose-gc', '--env=dev']) {
      const result = run('nightwatch-agent.mjs', [flag]);
      expect(result.status, flag).toBe(2);
      expect(result.stderr, flag).toContain('CLI_UNKNOWN_ARGUMENT');
    }
  });

  test('the declared flags are exactly the ones the campaign runner consumes', () => {
    const names = metadata('nightwatch-agent.mjs').flags.map((flag) => flag.name).sort();
    expect(names).toEqual(['--duration', '--id', '--max-turns', '--model', '--reasoner', '--repository', '--wall-clock-minutes'].sort());
  });

  test('a campaign subcommand outside the declared set is refused by the parser', () => {
    expect(run('nightwatch-agent.mjs', ['campaign', 'bogus']).status).toBe(2);
  });
});

test.describe('R5-07 phase22-dev', () => {
  test('`explain <id>` reads its declared positional: a valid id reaches the manifest read, an invalid one is refused as a bad id', () => {
    const valid = run('phase22-dev.mjs', ['explain', 'target-1', '--manifest=/nonexistent/phase22-manifest.json']);
    expect(valid.stderr).toContain('PHASE22_OPERATOR_BLOCKED:JSON_UNREADABLE');
    expect(valid.stderr).not.toContain('CLI_UNEXPECTED_POSITIONAL');
    const invalid = run('phase22-dev.mjs', ['explain', 'bad id!', '--manifest=/nonexistent/phase22-manifest.json']);
    expect(invalid.stderr).toContain('PHASE22_OPERATOR_BLOCKED:SAFE_ID_REQUIRED');
    const missing = run('phase22-dev.mjs', ['explain', '--manifest=/nonexistent/phase22-manifest.json']);
    expect(missing.stderr).toContain('PHASE22_OPERATOR_BLOCKED:SAFE_ID_REQUIRED');
  });

  test('every other command refuses a stray positional', () => {
    for (const command of ['manifest', 'preflight', 'acceptance', 'results']) {
      const result = run('phase22-dev.mjs', [command, 'stray']);
      expect(result.stderr, command).toContain('PHASE22_OPERATOR_BLOCKED:UNEXPECTED_POSITIONAL');
    }
  });

  test('there is no --all flag: dynamic target discovery is refused by the parser (exit 2)', () => {
    expect(metadata('phase22-dev.mjs').flags.map((flag) => flag.name)).not.toContain('--all');
    const result = run('phase22-dev.mjs', ['acceptance', '--all']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('CLI_UNKNOWN_ARGUMENT');
  });
});

test.describe('R5-07 phase23-dev', () => {
  test('the DEV-executing surface declares an owner-gated authorization class', () => {
    expect(metadata('phase23-dev.mjs').authorization).toBe('OWNER_GATED');
  });
});

test.describe('R5-08 nightwatch --help', () => {
  test('a LIBRARY_RETAINED module is listed as a library, never as an undeclared command', () => {
    const help = run('nightwatch.mjs', ['--help']).stdout;
    expect(help).not.toContain('Undeclared metadata');
    expect(help).toContain('Library modules, retained under bin/ (not commands) (4):');
    for (const library of ['nightwatch-reasoner-print', 'observe-authenticated-config', 'phase10b-launcher-args', 'phase9b-launcher-args']) {
      expect(help).toContain(`bin/${library}.mjs`);
    }
    const listing = operatorCommandListing(ROOT);
    expect(listing.entries.filter((entry) => !entry.declared && entry.library !== true)).toEqual([]);
    expect(listing.entries.filter((entry) => entry.library === true).map((entry) => entry.bin).sort()).toEqual([
      'bin/nightwatch-reasoner-print.mjs', 'bin/observe-authenticated-config.mjs', 'bin/phase10b-launcher-args.mjs', 'bin/phase9b-launcher-args.mjs',
    ]);
  });

  test('a genuinely undeclared bin stays visible as undeclared', () => {
    const entries = operatorCommandListing(ROOT, { libraryRetained: new Map() }).entries;
    expect(entries.filter((entry) => !entry.declared).map((entry) => entry.bin)).toContain('bin/nightwatch-reasoner-print.mjs');
  });
});
