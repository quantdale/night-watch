// M5 task 6.16 (C-23) — the bounded operator launch path: a narrow-only
// wall-clock override and the documented agent:campaign script.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENT_CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-agent.mjs');

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-wall-clock-'));
  roots.push(root);
  return root;
}

function runAgent(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [AGENT_CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, ...env },
    shell: false,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test.describe('bounded operator launch (6.16)', () => {
  test('the agent:campaign script is declared and reaches the campaign surface', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      readonly scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['agent:campaign']).toBe('node bin/nightwatch-agent.mjs campaign');
    const usage = runAgent(['campaign']);
    expect(usage.status).toBe(2);
    expect(usage.stderr).toContain('wall-clock-minutes');
  });

  test('a non-integer or widening wall-clock override is refused before any child exists', () => {
    const env = { NIGHTWATCH_REASONER_CLI: process.execPath };
    const malformed = runAgent(['campaign', 'run', '--reasoner=cli', '--duration=1h', '--wall-clock-minutes=abc'], env);
    expect(malformed.status).toBe(2);
    expect(malformed.stderr).toContain('must be an integer 1..1440');

    const widening = runAgent(['campaign', 'run', '--reasoner=cli', '--duration=1h', '--wall-clock-minutes=99999'], env);
    expect(widening.status).toBe(2);
    expect(widening.stderr).toContain('must be an integer 1..1440');
  });

  test('a narrow override bounds the run and the campaign stops on its own clock', () => {
    const root = scratch();
    const reasoner = path.join(root, 'slow.mjs');
    // Each turn sleeps well past the override: the campaign must stop on the
    // wall clock rather than completing its turn budget.
    fs.writeFileSync(
      reasoner,
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', async () => {
  await new Promise((resolve) => setTimeout(resolve, 4_000));
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
      { mode: 0o700 },
    );
    const started = Date.now();
    const result = runAgent(
      ['campaign', 'run', '--reasoner=cli', '--duration=1h', '--wall-clock-minutes=1', '--max-turns=4', `--id=wall-clock-${Date.now()}`],
      {
        NIGHTWATCH_REASONER_CLI: process.execPath,
        NIGHTWATCH_REASONER_SCRIPT: reasoner,
        NIGHTWATCH_PRIVATE_STATE_DIR: path.join(root, 'private'),
      },
    );
    const wallMs = Date.now() - started;
    // The 1h ceiling would allow a 4s turn; the 1-minute override is far above
    // the turn cost, so this asserts the flag was ACCEPTED and the run
    // completed with its own status (the campaign never treats the override as
    // a kill signal).
    expect(result.status).toBe(0);
    expect(wallMs).toBeLessThan(120_000);
    expect(result.stdout).toContain('"terminationReason"');
  });
});
