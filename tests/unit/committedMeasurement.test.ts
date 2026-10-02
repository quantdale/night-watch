// R5-13 / review-5 task B3.1 — a host-bound check consumes the COMMITTED measurement of S, and
// only that: real builder output, written where a clean clone finds it, judged by the real verifier.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { buildCertificationReceipt, certificationReceiptPath } from '../../bin/lib/certification-evidence.mjs';
import { HOST_BOUND_SUBJECTS, consumeCommittedMeasurement } from '../../bin/lib/committed-measurement.mjs';

const S = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const UNMET = { state: 'UNMET', detail: 'live measurement here' };
const MET = { state: 'MET', detail: 'live MET here' };

function root(): { dir: string; put: (subject: string, sha: string, body: Record<string, unknown>) => void; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-committed-'));
  return {
    dir,
    put: (subject, sha, body) => {
      const file = path.join(dir, certificationReceiptPath(sha, subject));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(body));
    },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

const receipt = (subject: string, overrides: Record<string, unknown> = {}) => buildCertificationReceipt({
  subject,
  sourceHead: S,
  observedAtHead: S,
  sourceRootCleanAtEmit: true,
  checkId: 'host-bound-check',
  checkState: 'MET',
  producer: 'PROJECT_CHECK',
  ...overrides,
} as Parameters<typeof buildCertificationReceipt>[0]);

test.describe('consumeCommittedMeasurement', () => {
  test('the host-bound subjects are exactly the four checks only the qualified host can measure', () => {
    expect([...HOST_BOUND_SUBJECTS].sort()).toEqual(['accessibility-certification', 'autonomous-yield-proof', 'dependency-supply-chain-currency', 'exact-head-ci-authority']);
  });

  test('a live MET is never changed; an unmet live check takes a verified committed MET for S', () => {
    const r = root();
    try {
      r.put('dependency-supply-chain-currency', S, receipt('dependency-supply-chain-currency'));
      expect(consumeCommittedMeasurement(r.dir, 'dependency-supply-chain-currency', S, MET)).toBe(MET);
      const consumed = consumeCommittedMeasurement(r.dir, 'dependency-supply-chain-currency', S, UNMET);
      expect(consumed.state).toBe('MET');
      expect(consumed.detail).toContain('consumed from the committed receipt');
      expect(consumed.detail).toContain('live measurement here: UNMET');
    } finally {
      r.cleanup();
    }
  });

  test('no other subject is ever upgraded, whatever a receipt says', () => {
    const r = root();
    try {
      for (const subject of ['completion-ledger-truth', 'documentation-currency', 'cli-implementation-contract']) {
        r.put(subject, S, receipt(subject));
        expect(consumeCommittedMeasurement(r.dir, subject, S, UNMET), subject).toBe(UNMET);
      }
    } finally {
      r.cleanup();
    }
  });

  test('an absent receipt, a receipt of another checkpoint, an UNMET receipt and a tampered receipt leave the live state', () => {
    const r = root();
    try {
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', S, UNMET)).toBe(UNMET);
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', null, UNMET)).toBe(UNMET);
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', 'short', UNMET)).toBe(UNMET);
      // A receipt of ANOTHER checkpoint filed in S's directory is not bound to S.
      r.put('accessibility-certification', S, receipt('accessibility-certification', { sourceHead: OTHER }));
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', S, UNMET).state).toBe('UNMET');
      // A NOT_MET receipt measured nothing.
      r.put('accessibility-certification', S, receipt('accessibility-certification', { checkState: 'UNMET' }));
      const notMet = consumeCommittedMeasurement(r.dir, 'accessibility-certification', S, UNMET);
      expect(notMet.state).toBe('UNMET');
      expect(notMet.detail).toContain('committed receipt rejected');
      // A body edited after emit.
      r.put('accessibility-certification', S, { ...receipt('accessibility-certification'), checkId: 'edited-after-emit' });
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', S, UNMET).state).toBe('UNMET');
      // Another subject's receipt filed under this subject's name.
      r.put('accessibility-certification', S, receipt('autonomous-yield-proof'));
      expect(consumeCommittedMeasurement(r.dir, 'accessibility-certification', S, UNMET).state).toBe('UNMET');
    } finally {
      r.cleanup();
    }
  });
});
