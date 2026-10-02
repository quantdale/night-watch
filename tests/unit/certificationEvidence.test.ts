// R5-12 / review-5 task B2.1 — the certification evidence receipt, driven by REAL builder
// output through the REAL verifier (never a hand-shaped receipt).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  buildCertificationReceipt,
  certificationReceiptDigest,
  certificationReceiptPath,
  validateCertificationReceipt,
} from '../../bin/lib/certification-evidence.mjs';
import { CERTIFICATION_SCHEMA_SUBJECTS, CERTIFICATION_SUBJECTS, certificationSubject } from '../../bin/lib/certification-subjects.mjs';
import { RECEIPT_SCHEMAS } from '../../bin/lib/receipt-schemas.mjs';
import { verifyPersistedReceipt } from '../../bin/lib/release-evidence.mjs';

const ROOT = path.join(__dirname, '..', '..');
const S = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);

function receipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return buildCertificationReceipt({
    subject: 'documentation-currency',
    sourceHead: S,
    observedAtHead: HEAD,
    sourceRootCleanAtEmit: true,
    checkId: 'documentation-currency-rules',
    checkState: 'MET',
    producer: 'PROJECT_CHECK',
    ...overrides,
  } as Parameters<typeof buildCertificationReceipt>[0]);
}

function persist(body: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-cert-'));
  fs.mkdirSync(path.join(root, 'artifacts', 'receipts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'receipts', `${String(body.subject)}.json`), JSON.stringify(body));
  return root;
}

test.describe('the closed subject table matches the Producer Matrix', () => {
  test('every matrix row is a declared subject and every declared subject is a matrix row', () => {
    const design = fs.readFileSync(path.join(ROOT, 'openspec', 'changes', 'nightwatch-final-completion-review5-v1', 'design.md'), 'utf8');
    const matrix = [...design.matchAll(/^\| (\d+) \| `([a-z0-9-]+)` \|/gm)].map((match) => match[2]);
    expect(matrix).toHaveLength(27);
    expect([...matrix].sort()).toEqual(CERTIFICATION_SUBJECTS.map((entry) => entry.id).sort());
    expect(CERTIFICATION_SUBJECTS.filter((entry) => entry.kind === 'CONDITION')).toHaveLength(16);
    expect(CERTIFICATION_SUBJECTS.filter((entry) => entry.kind === 'LANE')).toHaveLength(11);
    expect(design).not.toMatch(/\| EMPTY \|/);
  });

  test('the certification schema certifies exactly the CERTIFICATION-route subjects', () => {
    expect([...CERTIFICATION_SCHEMA_SUBJECTS].sort()).toEqual(
      CERTIFICATION_SUBJECTS.filter((entry) => entry.route === 'CERTIFICATION').map((entry) => entry.id).sort(),
    );
    expect(RECEIPT_SCHEMAS['nightwatch.certification-evidence-receipt.v1']!.subjects).toEqual(CERTIFICATION_SCHEMA_SUBJECTS);
    // The two existing producers keep their own schemas: no subject is certifiable twice.
    for (const subject of ['authoritative-gate', 'clean-checkout', 'ui-error-taxonomy-rendering', 'owner-manual']) {
      expect(CERTIFICATION_SCHEMA_SUBJECTS).not.toContain(subject);
    }
    expect(certificationSubject('owner-manual')).toMatchObject({ route: 'NONE', producer: 'UNAVAILABLE' });
    expect(certificationSubject('no-such-subject')).toBeNull();
  });
});

test.describe('the receipt builder and validator', () => {
  test('a measured MET check on a clean emit builds a valid PASS receipt with a re-derivable digest', () => {
    const body = receipt();
    expect(validateCertificationReceipt(body)).toEqual([]);
    expect(body.result).toBe('PASS');
    expect(String(body.receiptDigest)).toMatch(/^receipt:sha256:[0-9a-f]{24}$/);
    expect(certificationReceiptPath(S, 'documentation-currency')).toBe(`evidence/certification/${S}/documentation-currency.json`);
  });

  test('a non-MET check or a dirty emit is NOT_MET and can never be PASS', () => {
    expect(receipt({ checkState: 'UNMET' }).result).toBe('NOT_MET');
    expect(receipt({ sourceRootCleanAtEmit: false }).result).toBe('NOT_MET');
    const forged = { ...receipt({ checkState: 'UNMET' }), result: 'PASS' };
    expect(validateCertificationReceipt(forged).join(' ')).toContain('CERT_RECEIPT_PASS_WITHOUT_MET_CLEAN');
  });

  test('every field edit, an unknown key and a foreign or doubled subject are rejected', () => {
    const body = receipt();
    for (const [key, value] of Object.entries({ sourceHead: 'c'.repeat(40), checkId: 'other-check', environmentClass: 'CI_RUNNER' })) {
      expect(validateCertificationReceipt({ ...body, [key]: value }).join(' ')).toContain('CERT_RECEIPT_DIGEST_MISMATCH');
    }
    expect(validateCertificationReceipt({ ...body, extra: 'x' }).join(' ')).toContain('CERT_RECEIPT_UNKNOWN_KEY');
    expect(validateCertificationReceipt(receipt({ subject: 'authoritative-gate' })).join(' ')).toContain('CERT_RECEIPT_SUBJECT_NOT_CERTIFIABLE');
    expect(validateCertificationReceipt({ ...body, subjects: ['documentation-currency', 'completion-ledger-truth'] }).join(' ')).toContain('CERT_RECEIPT_SUBJECTS_NOT_EXACTLY_ONE');
    expect(validateCertificationReceipt(null)).toEqual(['CERT_RECEIPT_NOT_AN_OBJECT']);
  });

  test('a path, host or whitespace value can never enter a receipt (privacy allowlist)', () => {
    for (const checkId of ['/home/someone/.config', 'C:\\Users\\someone', 'a b', 'x'.repeat(81), '']) {
      expect(validateCertificationReceipt(receipt({ checkId })).join(' '), checkId).toContain('CERT_RECEIPT_TOKEN_INVALID:checkId');
    }
    expect(validateCertificationReceipt(receipt({ ciRunId: '12/34' })).join(' ')).toContain('CERT_RECEIPT_CI_RUN_ID_INVALID');
    expect(validateCertificationReceipt(receipt({ counts: { 'a/b': 1 } })).join(' ')).toContain('CERT_RECEIPT_COUNTS_INVALID');
    expect(validateCertificationReceipt(receipt({ counts: { passed: -1 } })).join(' ')).toContain('CERT_RECEIPT_COUNTS_INVALID');
  });
});

test.describe('the real verifier over real builder output', () => {
  test('a PASS receipt verifies for its subject at its SHA', () => {
    const body = receipt();
    const root = persist(body);
    try {
      expect(verifyPersistedReceipt(root, 'documentation-currency', String(body.receiptDigest), S)).toEqual({ verified: true, reason: 'VERIFIED' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // The executed-subject derivation is its own guard: a body that CLAIMS PASS while its recorded
  // check was not MET (re-digested so every earlier check is satisfied) must still execute nothing.
  test('a receipt claiming PASS over a non-MET check, with a re-derived digest, certifies nothing', () => {
    const forged: Record<string, unknown> = { ...receipt({ checkState: 'UNMET' }), result: 'PASS' };
    forged.receiptDigest = certificationReceiptDigest(forged);
    const root = persist(forged);
    try {
      const verdict = verifyPersistedReceipt(root, 'documentation-currency', String(forged.receiptDigest), S);
      expect(verdict).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_NOT_EXECUTED:documentation-currency' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('another subject, another SHA, an UNMET check and a dirty emit never verify', () => {
    const good = receipt();
    const root = persist(good);
    try {
      expect(verifyPersistedReceipt(root, 'completion-ledger-truth', String(good.receiptDigest), S).verified).toBe(false);
      expect(verifyPersistedReceipt(root, 'documentation-currency', String(good.receiptDigest), 'c'.repeat(40)).verified).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
    for (const [overrides, reason] of [
      [{ checkState: 'UNMET' }, /RECEIPT_VERDICT_NOT_PASS|RECEIPT_SUBJECT_NOT_EXECUTED/],
      [{ sourceRootCleanAtEmit: false }, /RECEIPT_VERDICT_NOT_PASS|RECEIPT_CLEAN_EMIT_UNPROVEN|RECEIPT_SUBJECT_NOT_EXECUTED/],
    ] as const) {
      const body = receipt(overrides);
      const dir = persist(body);
      try {
        const verdict = verifyPersistedReceipt(dir, 'documentation-currency', String(body.receiptDigest), S);
        expect(verdict.verified).toBe(false);
        expect(verdict.reason).toMatch(reason);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});
