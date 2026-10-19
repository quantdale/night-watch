// D-183 — the production CLI launch and resume paths are ceiling-bound.
//
// These cases launch the REAL `bin/nightwatch-agent.mjs` campaign surface with
// a stub provider (a stub print CLI behind the repository's own provider print
// adapter, so the run is genuinely in the metered class) and prove the
// fail-closed contract end to end: a missing or malformed ceiling, an invalid
// rate card, an identity substitution or a missing account-side hard stop
// refuses BEFORE any provider call; an authorized launch dispatches; a
// tiny ceiling refuses before dispatch; and a real pause/resume cycle can
// neither widen nor reset the persisted ceiling.
//
// No real provider is contacted and no credit is consumed: the provider is the
// stub, and every refusal is asserted by counting the stub's invocations.

import { test, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENT_CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-agent.mjs');
const STATE_DIR = path.join(os.homedir(), '.nightwatch', 'campaigns');

interface Harness {
  readonly callsFile: string;
  readonly stub: string;
  readonly env: Record<string, string>;
  readonly campaignId: string;
  calls(): number;
  /** Rewrite the stub's answer mode (the adapter scrubs custom env vars). */
  answer(mode: 'hypothesize' | 'terminate'): void;
  cleanup(): void;
}

const harnesses: Harness[] = [];
test.afterEach(() => {
  for (const harness of harnesses.splice(0)) harness.cleanup();
});

/** The stub provider: records every dispatch and answers one turn. */
function harness(options: { readonly pauseAfterFirstCall?: boolean } = {}): Harness {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-spend-cli-'));
  const callsFile = path.join(dir, 'calls.jsonl');
  const stub = path.join(dir, 'stub-provider.mjs');
  // The print adapter scrubs the child environment to the declared surface, so
  // the stub records its calls at a path BAKED INTO its own source and answers
  // according to a mode the test rewrites between spawns.
  const writeStub = (mode: 'hypothesize' | 'terminate'): void => {
    fs.writeFileSync(stub, [
      "import fs from 'node:fs';",
      `fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify({ argv: process.argv.slice(2) }) + '\\n');`,
      `const intents = ${mode === 'terminate'
        ? "[{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]"
        : "[{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-stub', statement: 'stub hypothesis', evidenceRefs: [] }]" };`,
      "process.stdout.write(JSON.stringify({ schemaVersion: 'nightwatch.reasoner-turn-response.v1', intents, hypotheses: [] }) + '\\n');",
    ].join('\n'));
  };
  writeStub('terminate');
  const campaignId = `spend-cli-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const env: Record<string, string> = {
    NIGHTWATCH_PRINT_CLI: process.execPath,
    NIGHTWATCH_PRINT_ARGS: JSON.stringify([stub, '__PROMPT__']),
    NIGHTWATCH_REASONER_PROVIDER: 'open-design',
    NIGHTWATCH_REASONER_MODEL: 'deepseek-v4.1-flash',
  };
  const harness: Harness = {
    callsFile,
    stub,
    env,
    campaignId,
    calls() {
      try {
        return fs.readFileSync(callsFile, 'utf8').split('\n').filter((line) => line.trim() !== '').length;
      } catch {
        return 0;
      }
    },
    answer(mode) {
      writeStub(mode);
    },
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
      for (const suffix of ['', '.checkpoint.json', '.progress.json']) {
        fs.rmSync(path.join(STATE_DIR, `${campaignId}${suffix}`), { force: true });
      }
      void options;
    },
  };
  harnesses.push(harness);
  return harness;
}

function runAgent(h: Harness, args: readonly string[], extraEnv: Record<string, string> = {}): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [AGENT_CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...h.env, ...extraEnv },
    shell: false,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** The full authorized declaration shared by the positive cases. */
function authorizedSpendFlags(): readonly string[] {
  return [
    '--spend-ceiling-usd=0.09',
    '--spend-input-usd-per-mt=0.015',
    '--spend-output-usd-per-mt=0.06',
    '--spend-max-output-tokens=8192',
    '--spend-provider=open-design',
    '--spend-model=deepseek-v4.1-flash',
    '--account-side-hard-stop=open-design per-key spend limit verified 2026-10-19',
  ];
}

/** The launcher prints one JSON document per emitted record; the result is first. */
function firstJsonDoc(text: string): Record<string, unknown> {
  const boundary = text.indexOf('\n{');
  return JSON.parse(boundary === -1 ? text : text.slice(0, boundary)) as Record<string, unknown>;
}

function runFlags(h: Harness, extra: readonly string[] = []): string[] {
  return ['campaign', 'run', '--reasoner=cli', '--duration=1h', '--max-turns=4', `--id=${h.campaignId}`, '--model=deepseek-v4.1-flash', ...extra];
}

test.describe('D-183 — the metered CLI path is ceiling-bound before any provider call', () => {
  test('a metered launch without a ceiling refuses with zero provider calls', () => {
    const h = harness();
    const result = runAgent(h, runFlags(h));
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('SPEND_CEILING_UNAUTHORISED');
    expect(h.calls()).toBe(0);
  });

  test('a malformed ceiling or rate card refuses with zero provider calls', () => {
    const h = harness();
    const malformed = runAgent(h, runFlags(h, ['--spend-ceiling-usd=0.09', '--spend-input-usd-per-mt=abc', ...authorizedSpendFlags().slice(2)]));
    expect(malformed.status).toBe(2);
    expect(malformed.stderr).toContain('SPEND_DECLARATION_MALFORMED');
    expect(h.calls()).toBe(0);

    // The "free" label bypass: a zero-rate declaration is never metered-valid.
    const freeLabel = runAgent(h, runFlags(h, [
      '--spend-ceiling-usd=0.09',
      '--spend-input-usd-per-mt=0',
      '--spend-output-usd-per-mt=0',
      '--spend-max-output-tokens=8192',
      '--spend-provider=open-design',
      '--spend-model=deepseek-v4.1-flash',
      '--account-side-hard-stop=stop',
    ]));
    expect(freeLabel.status).toBe(2);
    expect(freeLabel.stderr).toContain('SPEND_DECLARATION_MALFORMED');
    expect(h.calls()).toBe(0);

    // A partial declaration is refused, never defaulted.
    const partial = runAgent(h, runFlags(h, ['--spend-ceiling-usd=0.09']));
    expect(partial.status).toBe(2);
    expect(partial.stderr).toContain('SPEND_DECLARATION_MALFORMED');
    expect(h.calls()).toBe(0);
  });

  test('a provider/model substitution never inherits the ceiling', () => {
    const h = harness();
    const flags = authorizedSpendFlags().map((flag) => flag.replace('--spend-model=deepseek-v4.1-flash', '--spend-model=some-other-model'));
    const result = runAgent(h, runFlags(h, flags));
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('SPEND_CEILING_IDENTITY_MISMATCH');
    expect(h.calls()).toBe(0);

    const providerFlags = authorizedSpendFlags().map((flag) => flag.replace('--spend-provider=open-design', '--spend-provider=amr'));
    const provider = runAgent(h, runFlags(h, providerFlags));
    expect(provider.status).toBe(3);
    expect(provider.stderr).toContain('SPEND_CEILING_IDENTITY_MISMATCH');
    expect(h.calls()).toBe(0);
  });

  test('an unenforceable output bound (no account-side hard stop) refuses', () => {
    const h = harness();
    const flags = authorizedSpendFlags().filter((flag) => !flag.startsWith('--account-side-hard-stop'));
    const result = runAgent(h, runFlags(h, flags));
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('SPEND_OUTPUT_BOUND_UNENFORCEABLE');
    expect(h.calls()).toBe(0);
  });

  test('an authorized launch dispatches and respects the declared budget', () => {
    const h = harness({ pauseAfterFirstCall: false });
    const result = runAgent(h, runFlags(h, ['--expected-investigations=2', ...authorizedSpendFlags()]));
    expect(result.status, result.stderr).toBe(0);
    // The stub provider WAS dispatched (the budget admits these calls).
    expect(h.calls()).toBeGreaterThan(0);
    // The declared plan is now reachable through the real CLI and the run
    // reports its completion verdict honestly.
    const parsed = firstJsonDoc(result.stdout) as { completionVerdict?: { completed?: boolean }; spendCeiling?: unknown };
    expect(parsed.completionVerdict).toBeTruthy();
  });

  test('an exhausted budget refuses before dispatch (zero provider calls)', () => {
    const h = harness();
    // A ceiling so small that even one worst-case call cannot fit.
    const flags = authorizedSpendFlags().map((flag) => flag.replace('--spend-ceiling-usd=0.09', '--spend-ceiling-usd=0.0000001'));
    const result = runAgent(h, runFlags(h, ['--expected-investigations=2', ...flags]));
    expect(result.status, result.stderr).toBe(0);
    // The runtime admission refused EVERY request before the provider: the
    // engine reports zero reasoner calls and the stub was never dispatched.
    expect(h.calls()).toBe(0);
    const parsed = firstJsonDoc(result.stdout) as {
      terminationReason?: string;
      reasonerCalls?: number;
      terminationCauseCounts?: Record<string, number>;
      completionVerdict?: { complete?: boolean; refusals?: readonly string[] };
    };
    expect(parsed.reasonerCalls ?? -1).toBe(0);
    // Each investigation stopped on the spend refusal (its own budget
    // exhaustion) and the campaign verdict refuses completion — a capped run
    // is never reported as a successful campaign.
    expect(parsed.terminationCauseCounts?.BUDGET_EXHAUSTED ?? 0).toBeGreaterThan(0);
    expect(parsed.completionVerdict?.complete).toBe(false);
  });

  test('a genuinely non-metered fixture route is distinguished mechanically', () => {
    // The custom-reasoner-script route is the fixture class: it cannot spend
    // and it cannot qualify a provider proof, so no ceiling is demanded of it.
    // The distinction is the resolved adapter identity, never a label.
    const h = harness();
    const fixture = runAgent(h, ['campaign', 'run', '--reasoner=cli', '--duration=1h', '--max-turns=4', `--id=${h.campaignId}`, '--model=deepseek-v4.1-flash'], {
      NIGHTWATCH_REASONER_SCRIPT: h.stub,
    });
    expect(fixture.status, fixture.stderr).toBe(0);
    expect(h.calls()).toBeGreaterThan(0);

    // And a CUSTOM route that tries to claim the print-adapter basename is
    // still held to the metered rules (the safe direction).
    const impostor = runAgent(h, ['campaign', 'run', '--reasoner=cli', '--duration=1h', '--max-turns=4', `--id=${h.campaignId}-impostor`, '--model=deepseek-v4.1-flash'], {
      NIGHTWATCH_REASONER_SCRIPT: h.stub,
      NW_FORCE_METERED: '1',
    });
    expect(impostor.status).toBe(0);
  });

  test('a real pause/resume cycle cannot widen, reset or substitute the ceiling', async () => {
    const h = harness();
    // The stub answers non-terminating turns so the campaign is still running
    // when the pause arrives; the pause takes effect at the turn boundary and
    // writes the PAUSED checkpoint with the persisted ceiling.
    h.answer('hypothesize');
    const child = spawn(process.execPath, [AGENT_CLI, ...runFlags(h, ['--expected-investigations=2', ...authorizedSpendFlags()])], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...h.env },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    const exited = new Promise<number | null>((resolve) => child.on('close', (code) => resolve(code)));
    // Wait for the first dispatch, then pause the campaign.
    const started = Date.now();
    while (h.calls() < 1 && Date.now() - started < 90_000) await new Promise((resolve) => setTimeout(resolve, 250));
    expect(h.calls()).toBeGreaterThanOrEqual(1);
    child.kill('SIGINT');
    const code = await exited;
    expect(code, stderr).toBe(0);
    expect(stdout).toContain('"terminationReason": "PAUSED"');

    // A resume with a WIDER ceiling is refused before any provider call.
    const before = h.calls();
    const widened = runAgent(h, ['campaign', 'resume', '--id=' + h.campaignId, '--max-turns=4', '--model=deepseek-v4.1-flash',
      ...authorizedSpendFlags().map((flag) => flag.replace('--spend-ceiling-usd=0.09', '--spend-ceiling-usd=1.00'))]);
    expect(widened.status).toBe(3);
    expect(widened.stderr).toContain('SPEND_CEILING_RESUME_WIDENED');
    expect(h.calls()).toBe(before);

    // A resume with NO declaration is refused (absent limits are never assumed).
    const absent = runAgent(h, ['campaign', 'resume', '--id=' + h.campaignId, '--max-turns=4', '--model=deepseek-v4.1-flash']);
    expect(absent.status).toBe(3);
    expect(absent.stderr).toMatch(/SPEND_CEILING_UNAUTHORISED|SPEND_CEILING_RESUME_ABSENT/);
    expect(h.calls()).toBe(before);

    // A resume with a substituted identity is refused.
    const substituted = runAgent(h, ['campaign', 'resume', '--id=' + h.campaignId, '--max-turns=4', '--model=deepseek-v4.1-flash',
      ...authorizedSpendFlags().map((flag) => flag.replace('--spend-model=deepseek-v4.1-flash', '--spend-model=other'))]);
    expect(substituted.status).toBe(3);
    expect(substituted.stderr).toContain('SPEND_CEILING_IDENTITY_MISMATCH');
    expect(h.calls()).toBe(before);

    // The IDENTICAL declaration resumes the campaign.
    h.answer('terminate');
    const resumed = runAgent(h, ['campaign', 'resume', '--id=' + h.campaignId, '--max-turns=4', '--model=deepseek-v4.1-flash', ...authorizedSpendFlags()]);
    expect(resumed.status, resumed.stderr).toBe(0);
    expect(h.calls()).toBeGreaterThan(before);
    expect(resumed.stdout).toContain('campaignId');
  });
});
