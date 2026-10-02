// @ts-check
// R5-13 / review-5 task B3.1 — consuming a COMMITTED measurement for a host-bound check.
//
// Four release checks measure something only the qualified host can observe: the exact-head CI
// authority (its local Bubblewrap topology half), the autonomous yield campaign (a paid provider
// run), the dependency assessment (kernel- and runtime-qualified) and the accessibility record
// (a browser lane). A clean clone, a CI runner or `gate:clean` cannot repeat those, and before
// this module they therefore always read UNMET there while the host read MET — the verdict
// depended on where it was computed.
//
// The host-side producer (`certify:evidence`) attests the check's own measured state at S in a
// receipt committed under the tracked evidence directory. Here a live check that is NOT met may be
// replaced by that receipt's recorded MET — only for these four subjects, only for the exact
// certified checkpoint S, and only when the real receipt judgement verifies the body. A live MET is
// never changed and a receipt can never downgrade or upgrade any other check.

import fs from 'node:fs';
import path from 'node:path';
import { CERTIFICATION_EVIDENCE_DIRECTORY } from './certification-subjects.mjs';
import { verifyReceiptBody } from './release-evidence.mjs';

/** The release-condition subjects whose live check is host-bound. */
export const HOST_BOUND_SUBJECTS = Object.freeze([
  'exact-head-ci-authority',
  'autonomous-yield-proof',
  'dependency-supply-chain-currency',
  'accessibility-certification',
]);

const SHA40_RE = /^[0-9a-f]{40}$/;

/**
 * @typedef {object} CheckOutput
 * @property {string} state
 * @property {string} detail
 */

/**
 * @param {string} root
 * @param {string} subject
 * @param {string | null} checkpointSha
 * @param {CheckOutput} live
 * @returns {CheckOutput}
 */
export function consumeCommittedMeasurement(root, subject, checkpointSha, live) {
  if (live.state === 'MET') return live;
  if (!HOST_BOUND_SUBJECTS.includes(subject)) return live;
  if (typeof checkpointSha !== 'string' || !SHA40_RE.test(checkpointSha)) return live;
  const file = path.join(root, CERTIFICATION_EVIDENCE_DIRECTORY, checkpointSha, `${subject}.json`);
  /** @type {unknown} */
  let body;
  try {
    body = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return live;
  }
  const record = body !== null && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : null;
  const digest = record === null ? null : record['receiptDigest'];
  if (record === null || typeof digest !== 'string') return live;
  const judged = verifyReceiptBody(record, subject, digest, checkpointSha);
  if (!judged.verified) return { state: live.state, detail: `${live.detail}; committed receipt rejected: ${judged.reason}` };
  // A verifying receipt is a PASS (the schema validates `PASS` only for a MET check on a clean emit).
  return {
    state: 'MET',
    detail: `host-bound check consumed from the committed receipt ${digest} (measured MET at ${checkpointSha.slice(0, 8)} by the qualified host); live measurement here: ${live.state}`,
  };
}
