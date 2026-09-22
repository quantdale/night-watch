import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { currentCheckoutState } from '../../src/core/provenance';

const CLI = path.resolve(process.cwd(), 'bin', 'selfdev-adopt-sandbox.mjs');

/**
 * The trust gate (`assertClean` over SELFDEV_AUTHORITATIVE_PATHS) is
 * deliberately evaluated BEFORE any artifact/plan lookup, so the CLI's error
 * precedence depends on checkout cleanliness. Branch on the PRODUCT'S OWN
 * check — never a copied path list — so both contracts are asserted truthfully
 * on any tree: dirty => provenance refusal wins; clean => not-found wins.
 */
function authoritativeSourceState(): 'CLEAN' | 'DIRTY' {
  try {
    currentCheckoutState({ repositoryRoot: process.cwd() });
    return 'CLEAN';
  } catch (error) {
    if (String((error as Error).message).includes('AUTHORITATIVE_SOURCE_DIRTY')) return 'DIRTY';
    throw error;
  }
}

function withPrivateRoot<T>(fn: (root: string) => T): T {
  // Keep the synthetic injected root under the operator home (not /tmp): the
  // private-artifact policy rejects roots inside the detected workspace, and
  // a fresh clone under /tmp can make os.tmpdir() part of that workspace.
  const root = fs.mkdtempSync(path.join(os.homedir(), 'nightwatch-selfdev-adopt-sandbox-cli-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function run(args: readonly string[], privateRoot: string): { readonly status: number | null; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
    encoding: 'utf8',
    timeout: 10_000,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('Phase 8B CLI is a thin wrapper exposing only inspect/plan/run with no runtime authority expansion', () => {
  const source = fs.readFileSync(CLI, 'utf8');
  expect(source).toContain('parseArgs');
  expect(source).toContain('inspectSelfDevAdoption');
  expect(source).toContain('planAdoption');
  expect(source).toContain('runSandboxAdoption');
  expect(source).toContain('SANDBOX_ONLY');
  expect(source).not.toMatch(/node:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket/);
  expect(source).not.toMatch(/git\s+(?:add|apply|commit|push)/i);
  expect(source).not.toMatch(/AiReviewSession|LoopbackAiReviewProvider|owner-review|NIGHTWATCH_STORAGE_STATE/);
  for (const forbidden of [
    '--path', '--file', '--source', '--code', '--patch', '--diff', '--repo', '--root',
    '--sandbox-root', '--target', '--command', '--shell', '--model', '--prompt', '--url',
    '--endpoint', '--latest', '--all', '--apply', '--commit', '--push', '--publish', '--force', '--yes',
  ]) {
    expect(source).not.toContain(forbidden);
  }
  for (const forbiddenCommand of ['apply', 'promote', 'commit', 'merge', 'install']) {
    expect(source).not.toContain(`command === '${forbiddenCommand}'`);
  }
});

test('--help prints usage and performs no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['--help'], privateRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('inspect');
    expect(result.stdout).toContain('plan');
    expect(result.stdout).toContain('run');
    expect(result.stdout).toContain('SANDBOX_ONLY');
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('inspect on a missing exact artifact ID fails closed with no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['inspect', '--artifact-id', `session:sha256:${'a'.repeat(64)}`], privateRoot);
    expect(result.status).toBe(1);
    if (authoritativeSourceState() === 'DIRTY') {
      // Trust-gate precedence: on a dirty authoritative checkout the CLI must
      // refuse with the provenance error and never reach the lookup path.
      expect(result.stderr).toContain('SELFDEV_AUTHORITATIVE_SOURCE_DIRTY');
      expect(result.stderr).not.toContain('SELFDEV_ARTIFACT_NOT_FOUND');
    } else {
      expect(result.stderr).toContain('SELFDEV_ARTIFACT_NOT_FOUND');
    }
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('malformed artifact/candidate/plan IDs are rejected before any lookup', () => {
  withPrivateRoot((privateRoot) => {
    const badArtifact = run(['inspect', '--artifact-id', 'not-a-valid-id'], privateRoot);
    expect(badArtifact.status).toBe(1);
    expect(badArtifact.stderr).toContain('SELFDEV_ARTIFACT_ID_INVALID');

    const badCandidate = run(['plan', '--artifact-id', `session:sha256:${'a'.repeat(64)}`, '--candidate-id', 'not-a-candidate'], privateRoot);
    expect(badCandidate.status).toBe(1);
    expect(badCandidate.stderr).toContain('SELFDEV_CANDIDATE_ID_INVALID');

    const badPlan = run(['run', '--plan-id', 'not-a-plan', '--confirm', 'SANDBOX_ONLY'], privateRoot);
    expect(badPlan.status).toBe(1);
    expect(badPlan.stderr).toContain('SELFDEV_PLAN_ID_INVALID');

    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('run requires the exact SANDBOX_ONLY confirmation token; no alternative is accepted', () => {
  withPrivateRoot((privateRoot) => {
    const planId = `adoption-plan:sha256:${'b'.repeat(64)}`;
    for (const wrongToken of ['yes', 'true', 'YES', 'sandbox_only', 'SANDBOX-ONLY', '']) {
      const result = run(['run', '--plan-id', planId, '--confirm', wrongToken], privateRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SELFDEV_ADOPT_SANDBOX_CONFIRMATION_INVALID');
    }
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('unrecognized commands and option combinations are rejected as usage-invalid', () => {
  withPrivateRoot((privateRoot) => {
    for (const args of [
      [],
      ['bogus-command'],
      ['inspect'],
      ['inspect', '--latest'],
      ['plan', '--artifact-id', `session:sha256:${'a'.repeat(64)}`],
      ['run', '--plan-id', `adoption-plan:sha256:${'b'.repeat(64)}`],
    ]) {
      const result = run(args, privateRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
    }
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('run against a missing exact plan ID fails closed with no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['run', '--plan-id', `adoption-plan:sha256:${'c'.repeat(64)}`, '--confirm', 'SANDBOX_ONLY'], privateRoot);
    expect(result.status).toBe(1);
    if (authoritativeSourceState() === 'DIRTY') {
      expect(result.stderr).toContain('SELFDEV_AUTHORITATIVE_SOURCE_DIRTY');
      expect(result.stderr).not.toContain('SELFDEV_SANDBOX_PLAN_NOT_FOUND');
    } else {
      expect(result.stderr).toContain('SELFDEV_SANDBOX_PLAN_NOT_FOUND');
    }
  });
});
