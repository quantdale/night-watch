// @ts-check

/**
 * R3-09 / corrections task 8.8 — the topology-certification consumer.
 *
 * A topology receipt proves the runner's fail-closed envelope; only a
 * COMPLETE PROVEN envelope is CERTIFYING. `PROVEN_DEGRADED` (for example a
 * runner without Bubblewrap, or one that never exercised Chrome) is recorded
 * evidence, never certification. This pure judgement names the receipt bound
 * to a given checkpoint and whether it may certify, so the release condition
 * and the CI path consume one answer.
 */

import crypto from 'node:crypto';
import { TOPOLOGY_GATE_SCHEMA, topologyReceiptDigest } from './topology-gate.mjs';

const SHA_RE = /^[0-9a-f]{40}$/i;
const TOPOLOGY_CLASSES = Object.freeze(['PROVEN', 'PROVEN_DEGRADED', 'NOT_PROVEN']);

/**
 * R5-16 / review-5 task B5.1 — one topology receipt is ADMISSIBLE only when it is internally
 * consistent: the schema is the gate's, the `topology-receipt:` digest re-derives over the body,
 * the commit is a full SHA, the class is one of the three, `ciClaim` repeats the class, `certifying`
 * is exactly "the class is PROVEN", and a PROVEN class carries the evidence that makes it PROVEN
 * (a non-static run, a PASS result, the Bubblewrap envelope and no unexercised absence). A
 * hand-written `{ gitHead, ciClaim: { certifying: true } }`, or a degraded receipt relabelled as
 * certifying, is rejected here and never reaches the certification judgement.
 * (OD-5: tamper-evident, not tamper-proof; the digest is not a signature.)
 *
 * @param {unknown} entry
 * @returns {{ ok: boolean, reason: string }}
 */
export function verifyTopologyReceipt(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, reason: 'TOPOLOGY_RECEIPT_NOT_AN_OBJECT' };
  const record = /** @type {Record<string, unknown>} */ (entry);
  if (record['schemaVersion'] !== TOPOLOGY_GATE_SCHEMA) return { ok: false, reason: 'TOPOLOGY_RECEIPT_SCHEMA_UNSUPPORTED' };
  if (typeof record['receiptDigest'] !== 'string') return { ok: false, reason: 'TOPOLOGY_RECEIPT_DIGEST_MISSING' };
  const body = { ...record };
  delete body['receiptDigest'];
  if (record['receiptDigest'] !== topologyReceiptDigest(body, (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex'))) {
    return { ok: false, reason: 'TOPOLOGY_RECEIPT_DIGEST_MISMATCH' };
  }
  if (typeof record['gitHead'] !== 'string' || !SHA_RE.test(record['gitHead'])) return { ok: false, reason: 'TOPOLOGY_RECEIPT_GIT_HEAD_INVALID' };
  const topologyClass = record['runnerTopologyClass'];
  if (typeof topologyClass !== 'string' || !TOPOLOGY_CLASSES.includes(topologyClass)) return { ok: false, reason: 'TOPOLOGY_RECEIPT_CLASS_UNKNOWN' };
  const claim = record['ciClaim'];
  if (claim === null || typeof claim !== 'object' || Array.isArray(claim)) return { ok: false, reason: 'TOPOLOGY_RECEIPT_CLAIM_MISSING' };
  const ciClaim = /** @type {Record<string, unknown>} */ (claim);
  if (ciClaim['runnerTopologyClass'] !== topologyClass) return { ok: false, reason: 'TOPOLOGY_RECEIPT_CLASS_DISAGREES' };
  if (typeof ciClaim['certifying'] !== 'boolean' || ciClaim['certifying'] !== (topologyClass === 'PROVEN')) {
    return { ok: false, reason: 'TOPOLOGY_RECEIPT_CERTIFYING_INCONSISTENT' };
  }
  if (topologyClass === 'PROVEN') {
    const unexercised = ciClaim['unexercisedAbsences'];
    if (record['mode'] === 'static' || record['result'] !== 'PASS' || ciClaim['runnerTopologyEnvelope'] !== 'BUBBLEWRAP'
      || !Array.isArray(unexercised) || unexercised.length !== 0) {
      return { ok: false, reason: 'TOPOLOGY_RECEIPT_PROVEN_WITHOUT_EVIDENCE' };
    }
  }
  return { ok: true, reason: 'ADMISSIBLE' };
}

/**
 * @param {ReadonlyArray<unknown>} receipts parsed topology receipts
 * @param {string | null} checkpointSha
 * @returns {{ checked: boolean, certifying: boolean, detail: string }}
 */
export function topologyCertificationForCheckpoint(receipts, checkpointSha) {
  if (typeof checkpointSha !== 'string' || !SHA_RE.test(checkpointSha)) {
    return { checked: false, certifying: false, detail: 'checkpoint unresolved' };
  }
  /** @type {Record<string, unknown>[]} */
  const matching = [];
  /** @type {string[]} */
  const rejected = [];
  for (const entry of receipts) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (typeof record.gitHead !== 'string' || record.gitHead.toLowerCase() !== checkpointSha.toLowerCase()) continue;
    // R5-16: only an admissible (consistent, digest-verified) receipt is ever considered.
    const admitted = verifyTopologyReceipt(record);
    if (admitted.ok) matching.push(record);
    else rejected.push(admitted.reason);
  }
  if (matching.length === 0) {
    const note = rejected.length === 0 ? '' : `; ${rejected.length} receipt(s) rejected (${rejected[0]})`;
    return { checked: false, certifying: false, detail: `no admissible topology receipt for ${checkpointSha.slice(0, 8)}${note}` };
  }
  matching.sort((left, right) => String(right.generatedAt ?? '').localeCompare(String(left.generatedAt ?? '')));
  const receipt = matching[0];
  const claim = receipt.ciClaim;
  const certifying = claim !== null && typeof claim === 'object' && !Array.isArray(claim)
    && (/** @type {Record<string, unknown>} */ (claim)).certifying === true;
  const topologyClass = typeof receipt.runnerTopologyClass === 'string' ? receipt.runnerTopologyClass : 'UNKNOWN';
  return {
    checked: true,
    certifying,
    detail: `${topologyClass}${certifying ? '' : ' (non-certifying)'} at ${checkpointSha.slice(0, 8)}`,
  };
}

/**
 * R4-04 / review-4 task 1.4 + OD-6(b) — the release CONDITION's conjunction.
 *
 * Exact-head CI certification is TWO facts, never one and never a fallback:
 * a LOCAL Bubblewrap-backed PROVEN topology receipt at the certified
 * checkpoint S, AND the recorded exact-head CI status word being the
 * executed-pass one with its executed SHA equal to S. CI's own envelope is
 * degraded (the runner has no Bubblewrap), so a CI run can never supply the
 * topology half — that is exactly why a missing local receipt is NOT MET
 * rather than a pass by absence.
 *
 * Pure: it renders the decision and its detail from the two inputs and holds
 * no filesystem, process, network or clock authority.
 *
 * @param {{ checked: boolean, certifying: boolean, detail: string }} topology
 * @param {{ ciStatus: string | null, executedSha: string | null, checkpointSha: string | null, runId: unknown, blockClass: unknown }} input
 * @returns {{ state: 'MET' | 'UNMET', detail: string }}
 */
export function topologyCertificationVerdict(topology, input) {
  const { ciStatus, executedSha, checkpointSha, runId, blockClass } = input;
  const record = `block record ${String(runId ?? 'UNKNOWN')} class=${String(blockClass ?? 'UNKNOWN')}`;
  if (ciStatus !== 'EXECUTED_PASS' || typeof executedSha !== 'string' || !SHA_RE.test(executedSha) || executedSha !== checkpointSha) {
    return {
      state: 'UNMET',
      detail: `the exact-head CI half is not satisfied (status word ${String(ciStatus ?? 'ABSENT')}, executed ${String(executedSha ?? 'NONE')}, checkpoint ${String(checkpointSha ?? 'NONE')}; ${record})`,
    };
  }
  if (!topology.checked) {
    return {
      state: 'UNMET',
      detail: `TOPOLOGY_RECEIPT_ABSENT: no local topology receipt at the certified checkpoint ${executedSha.slice(0, 8)}; exact-head CI is EXECUTED_PASS but a run envelope is not local proof (${record})`,
    };
  }
  if (!topology.certifying) {
    return {
      state: 'UNMET',
      detail: `TOPOLOGY_NOT_CERTIFYING: local topology receipt is ${topology.detail}; the exact-head CI run at ${executedSha.slice(0, 8)} is not certifying on its own (${record})`,
    };
  }
  return {
    state: 'MET',
    detail: `exact-head CI executed PASS at ${executedSha.slice(0, 8)} (${record}); local topology receipt ${topology.detail}`,
  };
}
