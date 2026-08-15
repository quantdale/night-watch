import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const CLI = path.resolve(process.cwd(), 'bin', 'selfdev-promote-canonical.mjs');

function withPrivateRoot<T>(fn: (root: string) => T): T {
  const root = fs.mkdtempSync(path.join(os.homedir(), 'nightwatch-selfdev-promote-canonical-cli-'));
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

const ARTIFACT_ID = `session:sha256:${'a'.repeat(64)}`;
const CANDIDATE_ID = `candidate:${'b'.repeat(64)}`;
const PLAN_ID = `adoption-plan:sha256:${'c'.repeat(64)}`;
const RESULT_ID = `adoption-sandbox-result:sha256:${'d'.repeat(64)}`;
const PROMOTION_ID = `canonical-promotion:sha256:${'e'.repeat(64)}`;
const APPROVAL_ID = `canonical-promotion-approval:sha256:${'f'.repeat(64)}`;
const RECEIPT_ID = `canonical-apply-receipt:sha256:${'0'.repeat(64)}`;
const VERIFICATION_ID = `canonical-promotion-verification:sha256:${'1'.repeat(64)}`;

test('Phase 8B.1 CLI is a thin wrapper over prepare/approve/apply/verify/status with no runtime authority expansion', () => {
  const source = fs.readFileSync(CLI, 'utf8');
  expect(source).toContain('parseArgs');
  expect(source).toContain('preparePromotion');
  expect(source).toContain('approvePromotion');
  expect(source).toContain('applyPromotion');
  expect(source).toContain('verifyCanonicalPromotion');
  expect(source).toContain('CANONICAL_ONE_FILE_ONLY');
  expect(source).not.toMatch(/node:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket/);
  expect(source).not.toMatch(/git\s+(?:add|apply|commit|push)/i);
  expect(source).not.toMatch(/AiReviewSession|LoopbackAiReviewProvider|owner-review|NIGHTWATCH_STORAGE_STATE|campaign/);
  for (const forbidden of [
    '--path', '--file', '--source', '--code', '--patch', '--diff', '--repo', '--root',
    '--target', '--command', '--shell', '--model', '--prompt', '--url',
    '--endpoint', '--latest', '--all', '--commit', '--push', '--publish', '--force', '--yes', '--rollback',
  ]) {
    expect(source).not.toContain(forbidden);
  }
  for (const forbiddenCommand of ['commit', 'push', 'merge', 'install', 'rollback']) {
    expect(source).not.toContain(`command === '${forbiddenCommand}'`);
  }
});

test('--help prints usage and performs no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['--help'], privateRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('inspect');
    expect(result.stdout).toContain('prepare');
    expect(result.stdout).toContain('approve');
    expect(result.stdout).toContain('apply');
    expect(result.stdout).toContain('verify');
    expect(result.stdout).toContain('status');
    expect(result.stdout).toContain('CANONICAL_ONE_FILE_ONLY');
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('malformed exact IDs are rejected before any lookup, across every subcommand', () => {
  withPrivateRoot((privateRoot) => {
    const badArtifact = run(['inspect', '--artifact-id', 'not-an-id', '--candidate-id', CANDIDATE_ID, '--plan-id', PLAN_ID, '--sandbox-result-id', RESULT_ID], privateRoot);
    expect(badArtifact.status).toBe(1);
    expect(badArtifact.stderr).toContain('SELFDEV_ARTIFACT_ID_INVALID');

    const badCandidate = run(['prepare', '--artifact-id', ARTIFACT_ID, '--candidate-id', 'not-a-candidate', '--plan-id', PLAN_ID, '--sandbox-result-id', RESULT_ID], privateRoot);
    expect(badCandidate.status).toBe(1);
    expect(badCandidate.stderr).toContain('SELFDEV_CANDIDATE_ID_INVALID');

    const badPromotion = run(['approve', '--promotion-id', 'not-a-promotion', '--confirm', 'CANONICAL_ONE_FILE_ONLY'], privateRoot);
    expect(badPromotion.status).toBe(1);
    expect(badPromotion.stderr).toContain('SELFDEV_PROMOTION_ID_INVALID');

    const badApproval = run(['apply', '--promotion-id', PROMOTION_ID, '--approval-id', 'not-an-approval'], privateRoot);
    expect(badApproval.status).toBe(1);
    expect(badApproval.stderr).toContain('SELFDEV_APPROVAL_ID_INVALID');

    const badReceipt = run(['verify', '--promotion-id', PROMOTION_ID, '--receipt-id', 'not-a-receipt'], privateRoot);
    expect(badReceipt.status).toBe(1);
    expect(badReceipt.stderr).toContain('SELFDEV_RECEIPT_ID_INVALID');

    const badVerification = run(['status', '--promotion-id', PROMOTION_ID, '--verification-id', 'not-a-verification'], privateRoot);
    expect(badVerification.status).toBe(1);
    expect(badVerification.stderr).toContain('SELFDEV_VERIFICATION_ID_INVALID');

    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('approve requires the exact CANONICAL_ONE_FILE_ONLY confirmation token; no alternative is accepted', () => {
  withPrivateRoot((privateRoot) => {
    for (const wrongToken of ['yes', 'true', 'YES', 'canonical_one_file_only', 'CANONICAL-ONE-FILE-ONLY', 'SANDBOX_ONLY', '']) {
      const result = run(['approve', '--promotion-id', PROMOTION_ID, '--confirm', wrongToken], privateRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION_INVALID');
    }
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('unrecognized commands and option combinations are rejected as usage-invalid, with no write', () => {
  withPrivateRoot((privateRoot) => {
    for (const args of [
      [],
      ['bogus-command'],
      ['inspect'],
      ['inspect', '--latest'],
      ['prepare', '--artifact-id', ARTIFACT_ID],
      ['approve', '--promotion-id', PROMOTION_ID],
      ['apply', '--promotion-id', PROMOTION_ID],
      ['verify', '--promotion-id', PROMOTION_ID],
      ['status', '--promotion-id', PROMOTION_ID],
    ]) {
      const result = run(args, privateRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID');
    }
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('apply against a missing exact promotion ID fails closed with no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['apply', '--promotion-id', PROMOTION_ID, '--approval-id', APPROVAL_ID], privateRoot);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SELFDEV_CANONICAL_PROMOTION_NOT_FOUND');
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('verify against a missing exact promotion ID fails closed with no write', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['verify', '--promotion-id', PROMOTION_ID, '--receipt-id', RECEIPT_ID], privateRoot);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SELFDEV_CANONICAL_PROMOTION_NOT_FOUND');
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});

test('status against a missing exact verification ID reports without writing', () => {
  withPrivateRoot((privateRoot) => {
    const result = run(['status', '--promotion-id', PROMOTION_ID, '--verification-id', VERIFICATION_ID], privateRoot);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SELFDEV_CANONICAL_PROMOTION_NOT_FOUND');
    expect(fs.existsSync(privateRoot) ? fs.readdirSync(privateRoot) : []).toEqual([]);
  });
});
