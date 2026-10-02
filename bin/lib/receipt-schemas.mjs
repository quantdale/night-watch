// @ts-check
// R5-03 / R5-04 / review-5 tasks A3.1-A3.2 — the closed receipt-schema table.
//
// Every receipt schema the release-evidence verifier will accept is declared
// HERE, once, with (a) the CLOSED set of subjects its producer may certify,
// (b) the body field that proves the tree was clean when the receipt was
// emitted, and (c) the function that derives, FROM THE RECEIPT BODY, which of
// those subjects the producer actually EXECUTED. A schema with an open subject
// set (the former `subjects: null`) let any receipt name any subject; deriving
// the executed set from the body means a receipt that merely CLAIMS a subject
// its producer never ran verifies for nothing (OD-5: tamper-evident, not
// tamper-proof — the check is complete for an honest system).
//
// Producers and the verifier import this one module, so a subject can only be
// added where its executing producer is declared, and a producer cannot emit a
// subject the verifier does not know.

import { CERTIFICATION_SCHEMA_SUBJECTS } from './certification-subjects.mjs';

/** @typedef {{ subjects: readonly string[], cleanEmitField: string, executed: (body: Record<string, unknown>) => string[] }} ReceiptSchema */

/** @param {unknown} value */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The authoritative gate executed `authoritative-gate` only when it ran its
 * groups: a non-empty group list in which every REQUIRED group passed, whose
 * ids agree with the receipt's own `groupIds`.
 * @param {Record<string, unknown>} body
 * @returns {string[]}
 */
export function qualityGateExecutedSubjects(body) {
  const groups = body.groups;
  if (!Array.isArray(groups) || groups.length === 0) return [];
  const records = groups.filter(isRecord);
  if (records.length !== groups.length) return [];
  if (!records.every((group) => typeof group.id === 'string' && group.id !== '')) return [];
  if (Array.isArray(body.groupIds)) {
    const ids = records.map((group) => group.id);
    if (body.groupIds.length !== ids.length || body.groupIds.some((id, index) => id !== ids[index])) return [];
  }
  if (!records.every((group) => group.required !== true || group.status === 'PASS')) return [];
  return ['authoritative-gate'];
}

/**
 * The clean-checkout receipt is produced only by the gate run inside a fresh
 * clone; it records both the wrapper's and the gate's verdicts.
 * @param {Record<string, unknown>} body
 * @returns {string[]}
 */
export function cleanCheckoutExecutedSubjects(body) {
  return typeof body.gateResult === 'string' && typeof body.finalResult === 'string' ? ['clean-checkout'] : [];
}

/**
 * The UI harness receipt records the harness tests it ran: it executed its
 * subject only when at least one harness test is recorded.
 * @param {Record<string, unknown>} body
 * @returns {string[]}
 */
export function uiHarnessExecutedSubjects(body) {
  const harness = body.harness;
  if (!isRecord(harness) || !Array.isArray(harness.tests) || harness.tests.length === 0) return [];
  return ['ui-error-taxonomy-rendering'];
}

/**
 * A certification receipt executed its subject only when its producer recorded the
 * check as MET and the verdict PASS for exactly the subject it names.
 * @param {Record<string, unknown>} body
 * @returns {string[]}
 */
export function certificationExecutedSubjects(body) {
  if (typeof body.subject !== 'string' || body.subject === '') return [];
  return body.checkState === 'MET' && body.result === 'PASS' ? [body.subject] : [];
}

/** @type {Readonly<Record<string, ReceiptSchema>>} */
export const RECEIPT_SCHEMAS = Object.freeze({
  'nightwatch.quality-gate-receipt.v1': Object.freeze({
    subjects: Object.freeze(['authoritative-gate']),
    cleanEmitField: 'sourceRootCleanAtEmit',
    executed: qualityGateExecutedSubjects,
  }),
  'nightwatch.ui-harness-receipt.v1': Object.freeze({
    subjects: Object.freeze(['ui-error-taxonomy-rendering']),
    cleanEmitField: 'treeClean',
    executed: uiHarnessExecutedSubjects,
  }),
  'nightwatch.certification-evidence-receipt.v1': Object.freeze({
    subjects: CERTIFICATION_SCHEMA_SUBJECTS,
    cleanEmitField: 'sourceRootCleanAtEmit',
    executed: certificationExecutedSubjects,
  }),
  'nightwatch.clean-checkout-receipt.v1': Object.freeze({
    subjects: Object.freeze(['clean-checkout']),
    cleanEmitField: 'sourceRootCleanAtEmit',
    executed: cleanCheckoutExecutedSubjects,
  }),
});

/**
 * Every subject some declared schema may certify, in declaration order (the
 * closed union a receipt KIND may carry).
 * @param {readonly string[]} schemas
 * @returns {readonly string[]}
 */
export function subjectsOfSchemas(schemas) {
  const union = [];
  for (const schema of schemas) {
    for (const subject of RECEIPT_SCHEMAS[schema]?.subjects ?? []) if (!union.includes(subject)) union.push(subject);
  }
  return Object.freeze(union);
}
