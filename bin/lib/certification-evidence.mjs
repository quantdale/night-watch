// @ts-check
// R5-12 / review-5 task B2.1 — the certification evidence receipt: builder, digest and
// strict validator.
//
// A receipt certifies ONE subject at ONE commit S. It is built from facts a producer
// MEASURED (a live check state, a command exit), carries only allowlisted tokens
// (the repository is temporarily public: no path, host, user, cookie, header or
// customer value can enter), and its digest is derived over its own canonical body.
// OD-5: the receipt is tamper-evident, not tamper-proof — there is no signature, key
// or MAC; never describe it as forgery-proof or unforgeable.

import crypto from 'node:crypto';
import { CERTIFICATION_EVIDENCE_DIRECTORY, CERTIFICATION_SCHEMA_SUBJECTS } from './certification-subjects.mjs';
import { stableCanonical } from './stable-canonical.mjs';

export const CERTIFICATION_RECEIPT_SCHEMA = 'nightwatch.certification-evidence-receipt.v1';
export const CERTIFICATION_RECEIPT_DIGEST_PREFIX = 'receipt:sha256:';
export { CERTIFICATION_EVIDENCE_DIRECTORY };

const SHA40_RE = /^[0-9a-f]{40}$/;
/** Every string a receipt carries is a bounded token: no path separator, whitespace or host value. */
const TOKEN_RE = /^[A-Za-z0-9._:+-]{1,80}$/;
const ALLOWED_KEYS = Object.freeze([
  'schemaVersion', 'subject', 'subjects', 'sourceHead', 'observedAtHead', 'sourceRootCleanAtEmit',
  'checkId', 'checkState', 'result', 'producer', 'environmentClass', 'commandDigest', 'counts',
  'ciRunId', 'ciConclusion', 'receiptDigest',
]);
const CHECK_STATES = Object.freeze(['MET', 'UNMET', 'UNAVAILABLE_CAPABILITY', 'NOT_AT_CHECKPOINT', 'BLOCKED_EXTERNAL', 'NOT_MET']);
const PRODUCERS = Object.freeze(['PROJECT_CHECK', 'COMMAND', 'OBSERVE_CI']);
const ENVIRONMENT_CLASSES = Object.freeze(['HOST_LOCAL', 'CI_RUNNER']);
const CI_CONCLUSIONS = Object.freeze(['success', 'failure', 'cancelled', 'timed_out', 'neutral', 'skipped']);
const MAX_COUNT_KEYS = 8;

/** @typedef {Record<string, unknown>} Body */

/**
 * @typedef {object} ReceiptInput
 * @property {string} subject
 * @property {string} sourceHead
 * @property {string} observedAtHead
 * @property {boolean} sourceRootCleanAtEmit
 * @property {string} checkId
 * @property {string} checkState
 * @property {string} producer
 * @property {string} [environmentClass]
 * @property {string} [commandDigest]
 * @property {Record<string, number>} [counts]
 * @property {string} [ciRunId]
 * @property {string} [ciConclusion]
 */


/**
 * @param {Body} body
 * @returns {string}
 */
export function certificationReceiptDigest(body) {
  const { receiptDigest: _ignored, ...rest } = body;
  return `${CERTIFICATION_RECEIPT_DIGEST_PREFIX}${crypto.createHash('sha256').update(stableCanonical(rest), 'utf8').digest('hex').slice(0, 24)}`;
}

/**
 * Build one receipt (with its digest) from measured facts. `result` is `PASS` only for a
 * MET check on a clean emit; anything else is `NOT_MET` and never verifies.
 * @param {ReceiptInput} input
 * @returns {Body}
 */
export function buildCertificationReceipt(input) {
  /** @type {Body} */
  const body = {
    schemaVersion: CERTIFICATION_RECEIPT_SCHEMA,
    subject: input.subject,
    subjects: [input.subject],
    sourceHead: input.sourceHead,
    observedAtHead: input.observedAtHead,
    sourceRootCleanAtEmit: input.sourceRootCleanAtEmit === true,
    checkId: input.checkId,
    checkState: input.checkState,
    result: input.checkState === 'MET' && input.sourceRootCleanAtEmit === true ? 'PASS' : 'NOT_MET',
    producer: input.producer,
    environmentClass: input.environmentClass ?? 'HOST_LOCAL',
  };
  if (input.commandDigest !== undefined) body.commandDigest = input.commandDigest;
  if (input.counts !== undefined) body.counts = { ...input.counts };
  if (input.ciRunId !== undefined) body.ciRunId = input.ciRunId;
  if (input.ciConclusion !== undefined) body.ciConclusion = input.ciConclusion;
  body.receiptDigest = certificationReceiptDigest(body);
  return body;
}

/**
 * Strict structural validation: closed key set, closed subject, bounded tokens, a
 * digest that re-derives. Returns every error (empty = valid). It does NOT decide
 * `result`/`checkState` consistency beyond the PASS invariant.
 * @param {unknown} value
 * @returns {string[]}
 */
export function validateCertificationReceipt(value) {
  /** @type {string[]} */
  const errors = [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return ['CERT_RECEIPT_NOT_AN_OBJECT'];
  const body = /** @type {Body} */ (value);
  for (const key of Object.keys(body)) if (!ALLOWED_KEYS.includes(key)) errors.push(`CERT_RECEIPT_UNKNOWN_KEY:${key.slice(0, 40)}`);
  if (body.schemaVersion !== CERTIFICATION_RECEIPT_SCHEMA) errors.push('CERT_RECEIPT_SCHEMA_MISMATCH');
  const subject = body.subject;
  if (typeof subject !== 'string' || !CERTIFICATION_SCHEMA_SUBJECTS.includes(subject)) errors.push('CERT_RECEIPT_SUBJECT_NOT_CERTIFIABLE');
  if (!Array.isArray(body.subjects) || body.subjects.length !== 1 || body.subjects[0] !== subject) errors.push('CERT_RECEIPT_SUBJECTS_NOT_EXACTLY_ONE');
  for (const field of ['sourceHead', 'observedAtHead']) {
    const sha = body[field];
    if (typeof sha !== 'string' || !SHA40_RE.test(sha)) errors.push(`CERT_RECEIPT_SHA_INVALID:${field}`);
  }
  if (typeof body.sourceRootCleanAtEmit !== 'boolean') errors.push('CERT_RECEIPT_CLEAN_EMIT_NOT_BOOLEAN');
  for (const field of ['checkId', 'checkState', 'result', 'producer', 'environmentClass']) {
    const token = body[field];
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) errors.push(`CERT_RECEIPT_TOKEN_INVALID:${field}`);
  }
  if (typeof body.checkState === 'string' && !CHECK_STATES.includes(body.checkState)) errors.push('CERT_RECEIPT_CHECK_STATE_UNKNOWN');
  if (typeof body.producer === 'string' && !PRODUCERS.includes(body.producer)) errors.push('CERT_RECEIPT_PRODUCER_UNKNOWN');
  if (typeof body.environmentClass === 'string' && !ENVIRONMENT_CLASSES.includes(body.environmentClass)) errors.push('CERT_RECEIPT_ENVIRONMENT_UNKNOWN');
  if (body.result !== 'PASS' && body.result !== 'NOT_MET') errors.push('CERT_RECEIPT_RESULT_UNKNOWN');
  if (body.result === 'PASS' && (body.checkState !== 'MET' || body.sourceRootCleanAtEmit !== true)) errors.push('CERT_RECEIPT_PASS_WITHOUT_MET_CLEAN');
  if (body.commandDigest !== undefined && (typeof body.commandDigest !== 'string' || !/^sha256:[0-9a-f]{24}$/.test(body.commandDigest))) errors.push('CERT_RECEIPT_COMMAND_DIGEST_INVALID');
  if (body.ciRunId !== undefined && (typeof body.ciRunId !== 'string' || !/^[0-9]{1,20}$/.test(body.ciRunId))) errors.push('CERT_RECEIPT_CI_RUN_ID_INVALID');
  if (body.ciConclusion !== undefined && (typeof body.ciConclusion !== 'string' || !CI_CONCLUSIONS.includes(body.ciConclusion))) errors.push('CERT_RECEIPT_CI_CONCLUSION_INVALID');
  if (body.counts !== undefined) {
    const counts = body.counts;
    if (counts === null || typeof counts !== 'object' || Array.isArray(counts)) errors.push('CERT_RECEIPT_COUNTS_INVALID');
    else {
      const entries = Object.entries(/** @type {Record<string, unknown>} */ (counts));
      if (entries.length > MAX_COUNT_KEYS) errors.push('CERT_RECEIPT_COUNTS_TOO_MANY');
      for (const [key, count] of entries) {
        if (!TOKEN_RE.test(key) || typeof count !== 'number' || !Number.isInteger(count) || count < 0) errors.push('CERT_RECEIPT_COUNTS_INVALID');
      }
    }
  }
  if (typeof body.receiptDigest !== 'string' || body.receiptDigest !== certificationReceiptDigest(body)) errors.push('CERT_RECEIPT_DIGEST_MISMATCH');
  return errors;
}

/**
 * The tracked file name of one receipt: the subject, never a head-derived name that a
 * re-run overwrites.
 * @param {string} sha
 * @param {string} subject
 * @returns {string}
 */
export function certificationReceiptPath(sha, subject) {
  return `${CERTIFICATION_EVIDENCE_DIRECTORY}/${sha}/${subject}.json`;
}
