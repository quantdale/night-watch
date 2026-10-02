// R5-16 / review-5 task B5.1 — the topology verdict trusts a receipt only when it is schema-valid,
// digest-verified and class/certifying-consistent. The base receipt is REAL producer output
// (`gate:topology static`); every forgery is a one-field edit of it, with and without re-sealing.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { topologyReceiptDigest } from '../../bin/lib/topology-gate.mjs';
import { topologyCertificationForCheckpoint, verifyTopologyReceipt } from '../../bin/lib/topology-receipts.mjs';

const ROOT = path.join(__dirname, '..', '..');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function realReceipt(): Record<string, unknown> {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'gate-topology.mjs'), 'static', '--no-receipt'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

/** Edit one or more fields, then (optionally) re-seal exactly as the producer does. */
function edited(base: Record<string, unknown>, edit: (body: Record<string, unknown>) => void, reseal: boolean): Record<string, unknown> {
  const body = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  delete body.receiptDigest;
  edit(body);
  return reseal ? { ...body, receiptDigest: topologyReceiptDigest(body, sha256) } : { ...body, receiptDigest: base.receiptDigest };
}

const claim = (body: Record<string, unknown>) => body.ciClaim as Record<string, unknown>;

test.describe('verifyTopologyReceipt over real producer output', () => {
  test('the real receipt is admissible, honest (NOT_PROVEN, non-certifying), and judged for its own commit only', () => {
    const real = realReceipt();
    expect(verifyTopologyReceipt(real)).toEqual({ ok: true, reason: 'ADMISSIBLE' });
    const head = String(real.gitHead);
    expect(topologyCertificationForCheckpoint([real], head)).toMatchObject({ checked: true, certifying: false });
    expect(topologyCertificationForCheckpoint([real], 'f'.repeat(40))).toMatchObject({ checked: false, certifying: false });
  });

  test('an edit without re-sealing fails the digest, whatever the edit', () => {
    const real = realReceipt();
    for (const edit of [
      (body: Record<string, unknown>) => { body.runnerTopologyClass = 'PROVEN'; claim(body).runnerTopologyClass = 'PROVEN'; claim(body).certifying = true; },
      (body: Record<string, unknown>) => { body.gitHead = 'f'.repeat(40); },
      (body: Record<string, unknown>) => { body.result = 'FAIL'; },
    ]) {
      expect(verifyTopologyReceipt(edited(real, edit, false)).reason).toBe('TOPOLOGY_RECEIPT_DIGEST_MISMATCH');
    }
  });

  test('a re-sealed relabelling or inconsistent claim is rejected by class/certifying consistency', () => {
    const real = realReceipt();
    // NOT_PROVEN relabelled PROVEN + certifying, re-digested: a static run has no envelope.
    const relabelled = edited(real, (body) => { body.runnerTopologyClass = 'PROVEN'; claim(body).runnerTopologyClass = 'PROVEN'; claim(body).certifying = true; }, true);
    expect(verifyTopologyReceipt(relabelled).reason).toBe('TOPOLOGY_RECEIPT_PROVEN_WITHOUT_EVIDENCE');
    // certifying:true on a degraded class.
    const lie = edited(real, (body) => { body.runnerTopologyClass = 'PROVEN_DEGRADED'; claim(body).runnerTopologyClass = 'PROVEN_DEGRADED'; claim(body).certifying = true; }, true);
    expect(verifyTopologyReceipt(lie).reason).toBe('TOPOLOGY_RECEIPT_CERTIFYING_INCONSISTENT');
    // certifying:false on a PROVEN class (also inconsistent).
    const understated = edited(real, (body) => { body.runnerTopologyClass = 'PROVEN'; claim(body).runnerTopologyClass = 'PROVEN'; claim(body).certifying = false; }, true);
    expect(verifyTopologyReceipt(understated).reason).toBe('TOPOLOGY_RECEIPT_CERTIFYING_INCONSISTENT');
    // The claim repeats a different class.
    expect(verifyTopologyReceipt(edited(real, (body) => { claim(body).runnerTopologyClass = 'PROVEN_DEGRADED'; }, true)).reason).toBe('TOPOLOGY_RECEIPT_CLASS_DISAGREES');
    // Unknown class, short commit, wrong schema, missing claim, missing digest.
    expect(verifyTopologyReceipt(edited(real, (body) => { body.runnerTopologyClass = 'CERTIFIED'; }, true)).reason).toBe('TOPOLOGY_RECEIPT_CLASS_UNKNOWN');
    expect(verifyTopologyReceipt(edited(real, (body) => { body.gitHead = 'abc123'; }, true)).reason).toBe('TOPOLOGY_RECEIPT_GIT_HEAD_INVALID');
    expect(verifyTopologyReceipt(edited(real, (body) => { body.schemaVersion = 'nightwatch.other.v1'; }, true)).reason).toBe('TOPOLOGY_RECEIPT_SCHEMA_UNSUPPORTED');
    expect(verifyTopologyReceipt(edited(real, (body) => { delete body.ciClaim; }, true)).reason).toBe('TOPOLOGY_RECEIPT_CLAIM_MISSING');
    const noDigest = { ...real };
    delete noDigest.receiptDigest;
    expect(verifyTopologyReceipt(noDigest).reason).toBe('TOPOLOGY_RECEIPT_DIGEST_MISSING');
    expect(verifyTopologyReceipt(null).reason).toBe('TOPOLOGY_RECEIPT_NOT_AN_OBJECT');
  });

  test('a PROVEN receipt is admitted only with the evidence that makes it PROVEN', () => {
    const real = realReceipt();
    const proven = (extra: (body: Record<string, unknown>) => void = () => undefined) => edited(real, (body) => {
      body.mode = 'all';
      body.result = 'PASS';
      body.runnerTopologyClass = 'PROVEN';
      Object.assign(claim(body), { runnerTopologyClass: 'PROVEN', runnerTopologyEnvelope: 'BUBBLEWRAP', unexercisedAbsences: [], certifying: true });
      extra(body);
    }, true);
    expect(verifyTopologyReceipt(proven())).toEqual({ ok: true, reason: 'ADMISSIBLE' });
    expect(topologyCertificationForCheckpoint([proven()], String(real.gitHead))).toMatchObject({ checked: true, certifying: true });
    for (const spoil of [
      (body: Record<string, unknown>) => { body.mode = 'static'; },
      (body: Record<string, unknown>) => { body.result = 'FAIL'; },
      (body: Record<string, unknown>) => { claim(body).runnerTopologyEnvelope = 'BWRAP_UNAVAILABLE_DEGRADED'; },
      (body: Record<string, unknown>) => { claim(body).unexercisedAbsences = ['chrome']; },
    ]) {
      expect(verifyTopologyReceipt(proven(spoil)).reason).toBe('TOPOLOGY_RECEIPT_PROVEN_WITHOUT_EVIDENCE');
    }
  });

  test('the bare forged claim never certifies and the rejection is named', () => {
    const head = 'a'.repeat(40);
    const forged = { gitHead: head, ciClaim: { certifying: true } };
    const verdict = topologyCertificationForCheckpoint([forged], head);
    expect(verdict).toMatchObject({ checked: false, certifying: false });
    expect(verdict.detail).toContain('1 receipt(s) rejected');
    const real = realReceipt();
    // A forged-PROVEN neighbour never shadows or upgrades an honest degraded receipt.
    const mixed = topologyCertificationForCheckpoint([forged, real], String(real.gitHead));
    expect(mixed).toMatchObject({ checked: true, certifying: false });
  });
});
