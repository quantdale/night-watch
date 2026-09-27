// M5 task 6.10 (C-11/C-24) — the print adapter cleans up on every exit path and
// never fabricates grounding evidence refs.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ADAPTER = path.join(REPO_ROOT, 'bin', 'nightwatch-reasoner-print.mjs');
const TMPDIR = os.tmpdir();

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-print-adapter-'));
  roots.push(root);
  return root;
}

/** Leftovers this adapter owns: its prompt file and its isolated cwd. */
function adapterLeftovers(): string[] {
  return fs
    .readdirSync(TMPDIR)
    .filter((name) => /^nw-reasoner-prompt-\d+\.txt$/.test(name) || /^nw-print-cwd-/.test(name));
}

function turnRequest(evidenceRefs: string[]): string {
  return JSON.stringify({
    schemaVersion: 'nightwatch.reasoner-turn-request.v1',
    campaignId: 'camp-print-adapter',
    turnId: 'camp-print-adapter:turn:1',
    observation: {
      phase: 'PLAN',
      untrusted: [],
      evidenceRefs,
      allowedToolIds: ['INSPECT_SOURCE_SURFACE', 'RERUN_SAFE_REPRODUCTION', 'REQUEST_FINDING_PROPOSAL'],
      allowedIntentKinds: ['CALL_TOOL', 'FORM_HYPOTHESIS', 'PROPOSE_CANDIDATE', 'TERMINATE'],
      memory: null,
    },
    budgetRemaining: { policy: {}, usage: {} },
  });
}

function runAdapter(
  printCli: string,
  request: string,
  env: Record<string, string> = {},
): { readonly status: number | null; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(process.execPath, [ADAPTER], {
    cwd: REPO_ROOT,
    input: request,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
    env: {
      ...process.env,
      NIGHTWATCH_PRINT_CLI: process.execPath,
      NIGHTWATCH_PRINT_ARGS: JSON.stringify([printCli, '__PROMPT_FILE__']),
      ...env,
    },
    shell: false,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test.describe('print adapter lifecycle (6.10)', () => {
  test('a failing print CLI exits non-zero and leaves nothing in TMPDIR', () => {
    const root = scratch();
    const failing = path.join(root, 'failing-print.mjs');
    fs.writeFileSync(failing, 'process.stderr.write("print CLI exploded\\n");\nprocess.exit(3);\n', { mode: 0o700 });

    const before = adapterLeftovers();
    const result = runAdapter(failing, turnRequest(['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa']));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('print CLI exited 3');
    expect(adapterLeftovers().sort()).toEqual(before.sort());
  });

  test('an unusable response exits non-zero and leaves nothing in TMPDIR', () => {
    const root = scratch();
    const garbage = path.join(root, 'garbage-print.mjs');
    fs.writeFileSync(garbage, 'process.stdout.write("no intents here\\n");\n', { mode: 0o700 });

    const before = adapterLeftovers();
    const result = runAdapter(garbage, turnRequest(['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa']));
    expect(result.status).toBe(2);
    expect(adapterLeftovers().sort()).toEqual(before.sort());
  });

  test('a successful run also leaves nothing in TMPDIR', () => {
    const root = scratch();
    const ok = path.join(root, 'ok-print.mjs');
    fs.writeFileSync(
      ok,
      `process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));\n`,
      { mode: 0o700 },
    );
    const before = adapterLeftovers();
    const result = runAdapter(ok, turnRequest(['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa']));
    expect(result.status).toBe(0);
    expect(adapterLeftovers().sort()).toEqual(before.sort());
  });

  test('a model-supplied proposal with no refs is never back-filled with campaign refs', () => {
    const root = scratch();
    const model = path.join(root, 'proposal-without-refs.mjs');
    fs.writeFileSync(
      model,
      `process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'PROPOSE_CANDIDATE', candidateId: 'cand-ungrounded' }], hypotheses: [] }));\n`,
      { mode: 0o700 },
    );
    const campaignRefs = ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb'];
    const result = runAdapter(model, turnRequest(campaignRefs));
    // The ungrounded proposal is REFUSED (the protocol requires at least one
    // ref) rather than repaired with refs the model never cited.
    expect(result.status).toBe(2);
    expect(result.stdout.trim()).toBe('');
    for (const ref of campaignRefs) {
      expect(`${result.stdout}${result.stderr}`).not.toContain(ref);
    }
  });

  test('a model-supplied ref is passed through unchanged', () => {
    const root = scratch();
    const model = path.join(root, 'proposal-with-ref.mjs');
    const cited = 'ev:sha256:cccccccccccccccccccccccc';
    fs.writeFileSync(
      model,
      `process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'PROPOSE_CANDIDATE', candidateId: 'cand-grounded', evidenceRefs: [${JSON.stringify(cited)}] }], hypotheses: [] }));\n`,
      { mode: 0o700 },
    );
    const result = runAdapter(model, turnRequest([cited]));
    expect(result.status).toBe(0);
    const response = JSON.parse(result.stdout.trim()) as {
      readonly intents: readonly { readonly kind: string; readonly evidenceRefs?: readonly string[] }[];
    };
    expect(response.intents.find((intent) => intent.kind === 'PROPOSE_CANDIDATE')?.evidenceRefs).toEqual([cited]);
  });
});
