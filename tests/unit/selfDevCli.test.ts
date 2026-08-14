import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const CLI = path.resolve(process.cwd(), 'bin', 'selfdev-synthetic.mjs');

test('Phase 8A synthetic CLI is a thin deterministic wrapper with no runtime authority expansion', () => {
  const source = fs.readFileSync(CLI, 'utf8');
  expect(source).toContain('parseArgs');
  expect(source).toContain('runSyntheticSelfDevSession');
  expect(source).toContain('--help');
  expect(source).not.toMatch(/node:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket/);
  expect(source).not.toMatch(/git\s+(?:add|apply|commit|push)/i);
  expect(source).not.toMatch(/AiReviewSession|LoopbackAiReviewProvider|owner-review|NIGHTWATCH_STORAGE_STATE/);
  expect(source).not.toMatch(/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i);
  expect(source).not.toContain('process.env');
});

test('Phase 8A.1 verify CLI accepts only one exact ID and performs no write', () => {
  const verifySource = fs.readFileSync(path.resolve(process.cwd(), 'bin', 'selfdev-verify.mjs'), 'utf8');
  expect(verifySource).toContain('--artifact-id');
  expect(verifySource).toContain('readOnly: true');
  expect(verifySource).toContain('assessSelfDevArtifactIntegrity');
  const privateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-cli-'));
  try {
    const env = { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot };
    const missing = spawnSync(process.execPath, ['bin/selfdev-verify.mjs', '--artifact-id', `session:sha256:${'a'.repeat(64)}`], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(missing.status).toBe(1);
    expect(missing.stdout).toContain('SELFDEV_ARTIFACT_NOT_FOUND');
    expect(fs.readdirSync(privateRoot)).toEqual([]);

    const forbidden = spawnSync(process.execPath, ['bin/selfdev-verify.mjs', '--latest'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(forbidden.status).toBe(1);
    expect(forbidden.stdout).toContain('SELFDEV_VERIFY_USAGE_INVALID');
    expect(fs.readdirSync(privateRoot)).toEqual([]);
  } finally {
    fs.rmSync(privateRoot, { recursive: true, force: true });
  }
});
