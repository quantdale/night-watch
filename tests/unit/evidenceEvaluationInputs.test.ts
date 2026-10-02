// R5-05 / review-5 task A4.1 — the evidence inputs handed to the release
// certification evaluator, behaviourally.
//
// `binding?.certifying !== false` rewritten to an always-true form, an artifact
// resolver stubbed to `() => true`, and a receipt verifier stubbed to `() => true`
// each used to survive every test, because the expressions lived inline inside a
// CLI whose `main()` runs at import. They are one module now, driven here against
// a real Git repository and a real persisted receipt.

import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildEvidenceEvaluationInputs } from '../../bin/lib/evidence-evaluation-inputs.mjs';

function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-evinputs-'));
  const environment = { PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };
  const git = (args: string[]) => spawnSync('git', args, { cwd: root, env: environment, encoding: 'utf8', shell: false });
  git(['init', '--quiet', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'present.txt'), 'present\n');
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'S']);
  const sha = (git(['rev-parse', 'HEAD']).stdout ?? '').trim();
  return { root, sha, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const DIGEST = `receipt:sha256:${'1'.repeat(24)}`;

test.describe('R5-05 release-evidence evaluation inputs', () => {
  test('the certifying flag is false ONLY for an explicit false binding', () => {
    const r = fixtureRepo();
    try {
      const inputs = buildEvidenceEvaluationInputs({
        root: r.root,
        bySubject: new Map([
          ['explicit-true', { certifying: true }],
          ['explicit-false', { certifying: false }],
          ['omitted', {}],
          ['null-binding', null],
        ]),
      });
      expect(inputs.evidenceCertifying).toEqual({ 'explicit-true': true, 'explicit-false': false, omitted: true, 'null-binding': true });
    } finally {
      r.cleanup();
    }
  });

  test('receipt digests and artifact paths follow the recorded binding exactly', () => {
    const r = fixtureRepo();
    try {
      const inputs = buildEvidenceEvaluationInputs({
        root: r.root,
        bySubject: new Map([
          ['bound', { receiptDigest: DIGEST, artifactPaths: ['present.txt', 'other.txt'] }],
          ['unbound', { receiptDigest: null, artifactPaths: [] }],
          ['bare', {}],
          ['null-binding', null],
        ]),
      });
      expect(inputs.evidenceReceiptDigests).toEqual({ bound: DIGEST, unbound: null, bare: null, 'null-binding': null });
      expect(inputs.evidenceArtifactPaths).toEqual({ bound: ['present.txt', 'other.txt'], unbound: [], bare: [], 'null-binding': [] });
    } finally {
      r.cleanup();
    }
  });

  test('the artifact resolver consults Git: present at the SHA is true, absent is false, an unknown SHA is false', () => {
    const r = fixtureRepo();
    try {
      const { resolveEvidenceArtifactAtSha } = buildEvidenceEvaluationInputs({ root: r.root, bySubject: new Map() });
      expect(resolveEvidenceArtifactAtSha(r.sha, 'present.txt')).toBe(true);
      expect(resolveEvidenceArtifactAtSha(r.sha, 'absent.txt')).toBe(false);
      expect(resolveEvidenceArtifactAtSha('0'.repeat(40), 'present.txt')).toBe(false);
    } finally {
      r.cleanup();
    }
  });

  test('the receipt verifier is the production verifier: a persisted clean receipt verifies; any other digest, subject or SHA does not', () => {
    const r = fixtureRepo();
    try {
      const body = { schemaVersion: 'nightwatch.clean-checkout-receipt.v1', subject: 'clean-checkout', sourceHead: r.sha, sourceRootCleanAtEmit: true, gateResult: 'PASS', finalResult: 'PASS' };
      const digest = `clean-receipt:sha256:${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 24)}`;
      fs.mkdirSync(path.join(r.root, 'artifacts/gate-receipts'), { recursive: true });
      fs.writeFileSync(path.join(r.root, 'artifacts/gate-receipts/clean.json'), `${JSON.stringify({ ...body, receiptDigest: digest })}\n`);
      const { verifyEvidenceReceipt } = buildEvidenceEvaluationInputs({ root: r.root, bySubject: new Map() });
      expect(verifyEvidenceReceipt('clean-checkout', digest, r.sha)).toBe(true);
      expect(verifyEvidenceReceipt('clean-checkout', DIGEST, r.sha)).toBe(false);
      expect(verifyEvidenceReceipt('clean-checkout', `clean-receipt:sha256:${'0'.repeat(24)}`, r.sha)).toBe(false);
      expect(verifyEvidenceReceipt('root-compile', digest, r.sha)).toBe(false);
      expect(verifyEvidenceReceipt('clean-checkout', digest, 'a'.repeat(40))).toBe(false);
    } finally {
      r.cleanup();
    }
  });
});
