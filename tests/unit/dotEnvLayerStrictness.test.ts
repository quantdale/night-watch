// M7 task 8.1 (NW-AUD-012 narrowed) — the `.env` layer is parsed fail-closed,
// an unreadable layer is an error, and launchers forward the VALIDATED MERGE.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DotEnvLoadError,
  loadDotEnvLayer,
  mergeDotEnvLayer,
  parseDotEnvStrict,
} from '../../src/core/config/environmentSurface';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DECLARED = ['NIGHTWATCH_REASONER_MODEL', 'NIGHTWATCH_REASONER_PROVIDER', 'NIGHTWATCH_REASONER_CLI', 'NIGHTWATCH_PRINT_CLI'];

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-dotenv-'));
  roots.push(root);
  return root;
}

test.describe('.env layer strictness (8.1)', () => {
  test('a valid layer parses to its values', () => {
    const parsed = parseDotEnvStrict(
      [
        '# a comment',
        '',
        'NIGHTWATCH_REASONER_MODEL=local-model',
        'NIGHTWATCH_REASONER_PROVIDER="quoted-provider"',
      ].join('\n'),
      DECLARED,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.values).toEqual({
      NIGHTWATCH_REASONER_MODEL: 'local-model',
      NIGHTWATCH_REASONER_PROVIDER: 'quoted-provider',
    });
  });

  test('a malformed line is refused with its line number', () => {
    const parsed = parseDotEnvStrict('NIGHTWATCH_REASONER_MODEL=ok\nnot a key value pair\n', DECLARED);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.code).toBe('DOTENV_LINE_MALFORMED');
    expect(parsed.errors[0]?.line).toBe(2);
  });

  test('an unknown key is refused rather than silently ignored', () => {
    const parsed = parseDotEnvStrict('NIGHTWATCH_NOT_DECLARED_ANYWHERE=1\n', DECLARED);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.code).toBe('DOTENV_KEY_UNKNOWN');
    expect(parsed.values).toEqual({});
  });

  test('a duplicate key is refused rather than last-one-wins', () => {
    const parsed = parseDotEnvStrict('NIGHTWATCH_REASONER_MODEL=first\nNIGHTWATCH_REASONER_MODEL=second\n', DECLARED);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.code).toBe('DOTENV_KEY_DUPLICATE');
    expect(parsed.values).toEqual({ NIGHTWATCH_REASONER_MODEL: 'first' });
  });

  test('an absent layer is empty and an unreadable layer is an error', () => {
    const root = scratch();
    expect(loadDotEnvLayer(root, DECLARED)).toEqual({});

    // A directory where the file should be is unreadable, not "absent".
    const blocked = scratch();
    fs.mkdirSync(path.join(blocked, '.env'));
    expect(() => loadDotEnvLayer(blocked, DECLARED)).toThrow(DotEnvLoadError);
    expect(() => loadDotEnvLayer(blocked, DECLARED)).toThrow(/DOTENV_UNREADABLE/);

    // A malformed layer refuses with its own code.
    const malformed = scratch();
    fs.writeFileSync(path.join(malformed, '.env'), 'NIGHTWATCH_REASONER_MODEL=ok\nbroken line\n');
    expect(() => loadDotEnvLayer(malformed, DECLARED)).toThrow(/DOTENV_LINE_MALFORMED/);
  });

  test('the merge prefers the process value and supplies the declared .env value', () => {
    const merged = mergeDotEnvLayer(
      { NIGHTWATCH_REASONER_MODEL: 'from-process' },
      { NIGHTWATCH_REASONER_MODEL: 'from-file', NIGHTWATCH_REASONER_PROVIDER: 'from-file' },
    );
    expect(merged.NIGHTWATCH_REASONER_MODEL).toBe('from-process');
    expect(merged.NIGHTWATCH_REASONER_PROVIDER).toBe('from-file');
  });

  test('the launchers forward the merged environment, never the ambient one', () => {
    const dispatcher = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'nightwatch.mjs'), 'utf8');
    // The validated merge is what reaches the children.
    expect(dispatcher).toContain('buildChildEnvironment(mergedEnvironment');
    expect(dispatcher).not.toContain('buildChildEnvironment(process.env');

    const agent = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'nightwatch-agent.mjs'), 'utf8');
    // The agent CLI returns the merge from its startup gate and reads the
    // forwarded configuration from it.
    expect(agent).toContain('return merged;');
    expect(agent).toContain('campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT');
    expect(agent).toContain('campaignEnvironment().NIGHTWATCH_REASONER_PROVIDER');
    expect(agent).not.toContain('process.env.NIGHTWATCH_REASONER_MODEL ??');
  });
});
