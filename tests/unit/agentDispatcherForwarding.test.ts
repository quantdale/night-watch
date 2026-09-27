// M5 task 6.8 (C-03/B-03) — the product dispatcher forwards a campaign with
// inherited stdio, no fixed timeout, signal pass-through and the declared
// consumer environment, and never kills it.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DISPATCHER = path.join(REPO_ROOT, 'bin', 'nightwatch.mjs');
const CAMPAIGN_STATE_DIR = path.join(os.homedir(), '.nightwatch', 'campaigns');

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-dispatcher-'));
  roots.push(root);
  return root;
}

interface RunResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly wallMs: number;
}

function runDispatcher(args: string[], env: Record<string, string>, timeoutMs = 60_000): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [DISPATCHER, ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`dispatcher did not exit within ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, wallMs: Date.now() - started });
    });
  });
}

test.describe('dispatcher forwarding (6.8)', () => {
  test('the agent branch spawns with inherited stdio and no fixed timeout', () => {
    const source = fs.readFileSync(DISPATCHER, 'utf8');
    const start = source.indexOf("if (args[0] === 'agent') {");
    const end = source.indexOf("} else if (operatorCommands.has(args[0])) {");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const branch = source.slice(start, end);
    // A long-running campaign is spawned, never synchronously waited on.
    expect(branch).toContain('spawn(');
    expect(branch).not.toContain('spawnSync(');
    expect(branch).toContain("stdio: 'inherit'");
    // No timeout may terminate a campaign, and no buffer may truncate it.
    expect(branch).not.toContain('timeout:');
    expect(branch).not.toContain('maxBuffer');
    // Signals are forwarded rather than ignored.
    expect(branch).toContain("forward('SIGINT')");
    expect(branch).toContain("forward('SIGTERM')");
    // The child's own status is the dispatcher's status.
    expect(branch).toContain('process.exitCode = code ?? 1;');
  });

  test('a forwarded campaign runs to its own conclusion and passes its status through', async () => {
    const root = scratch();
    const campaignId = 'dispatcher-forwarding';
    const reasoner = path.join(root, 'pause-reasoner.mjs');
    // Deliberately slow: a dispatcher with a short timeout would kill this
    // child before it could write its PAUSED checkpoint.
    fs.writeFileSync(
      reasoner,
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', async () => {
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'PAUSE' }], hypotheses: [] }));
});
`,
      { mode: 0o700 },
    );
    const checkpoint = path.join(CAMPAIGN_STATE_DIR, `${campaignId}.checkpoint.json`);

    try {
      const result = await runDispatcher(
        ['agent', 'campaign', 'run', '--reasoner=cli', '--duration=1h', `--id=${campaignId}`],
        {
          NIGHTWATCH_REASONER_CLI: process.execPath,
          NIGHTWATCH_REASONER_SCRIPT: reasoner,
          NIGHTWATCH_REASONER_PROVIDER: 'dispatcher-test-provider',
          NIGHTWATCH_REASONER_MODEL: 'dispatcher-test-model',
        },
      );

      // The campaign outlived a short dispatcher timeout and completed.
      expect(result.wallMs).toBeGreaterThanOrEqual(1_400);
      expect(result.signal).toBeNull();
      expect(result.code).toBe(0);

      // Inherited stdio: the child's result reached the dispatcher's stdout.
      expect(result.stdout).toContain('"terminationReason": "PAUSED"');
      // The declared consumer environment reached the child.
      expect(result.stdout).toContain('dispatcher-test-provider');
      expect(result.stdout).toContain('dispatcher-test-model');
      // The child produced its own durable outcome: it was never killed.
      expect(fs.existsSync(checkpoint)).toBe(true);
      const document = JSON.parse(fs.readFileSync(checkpoint, 'utf8')) as {
        readonly campaignProgress?: { readonly reasonerIdentity?: { readonly provider?: string | null } | null };
      };
      expect(document.campaignProgress?.reasonerIdentity?.provider).toBe('dispatcher-test-provider');
    } finally {
      fs.rmSync(checkpoint, { force: true });
    }
  });
});
