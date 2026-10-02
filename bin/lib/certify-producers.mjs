// @ts-check
// R5-12 / review-5 task B2.1 — the certification producers.
//
// `produceCertificationReceipt` turns a MEASURED fact (a live check state read from the
// project-state verdict, a fixed command's exit status, a read-only CI observation) into
// one receipt. Every effect is injected through `io`, so the production CLI passes real
// ones and the tests pass either real ones or an observably different stand-in; the
// decision logic here has no filesystem, process or network authority of its own.
//
// Refusals are explicit and categorical (`CERTIFY_*`): a producer that cannot measure
// honestly refuses instead of writing a receipt.

import crypto from 'node:crypto';
import { buildCertificationReceipt } from './certification-evidence.mjs';
import { certificationSubject } from './certification-subjects.mjs';

const SHA40_RE = /^[0-9a-f]{40}$/;

/**
 * @typedef {object} CiObservation
 * @property {string} runId
 * @property {string} conclusion
 */

/**
 * @typedef {object} ProducerIo
 * @property {(args: string[]) => string | null} git read-only Git; null on a non-zero exit
 * @property {() => Record<string, unknown> | null} projectVerdict the parsed project-state-check JSON, or null
 * @property {(argv: readonly string[]) => { status: number | null }} runCommand
 * @property {(sha: string) => CiObservation | null} observeCi
 */

/**
 * @typedef {object} ProducerResult
 * @property {boolean} ok a receipt was built (it may still be NOT_MET)
 * @property {string} code
 * @property {Record<string, unknown> | null} receipt
 */

/**
 * @param {readonly string[]} argv
 * @returns {string}
 */
export function commandDigest(argv) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(argv), 'utf8').digest('hex').slice(0, 24)}`;
}

/**
 * @param {string} code
 * @returns {ProducerResult}
 */
function refuse(code) {
  return { ok: false, code, receipt: null };
}

/**
 * @typedef {object} ProducerExtra
 * @property {string} [commandDigest]
 * @property {string} [ciRunId]
 * @property {string} [ciConclusion]
 */

/**
 * @typedef {object} ReleaseFacts
 * @property {string} checkpoint
 * @property {Array<Record<string, unknown>>} conditions
 */

/**
 * @param {Record<string, unknown> | null} verdict
 * @returns {ReleaseFacts | null}
 */
function releaseFacts(verdict) {
  const release = verdict?.['releaseVerdict'];
  if (release === null || typeof release !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (release);
  const checkpoint = record['certifiedCheckpointSha'];
  if (typeof checkpoint !== 'string' || !SHA40_RE.test(checkpoint)) return null;
  const conditions = Array.isArray(record['conditions']) ? record['conditions'].filter((entry) => entry !== null && typeof entry === 'object') : [];
  return { checkpoint, conditions: /** @type {Array<Record<string, unknown>>} */ (conditions) };
}

/**
 * @param {{ subject: string, io: ProducerIo }} input
 * @returns {ProducerResult}
 */
export function produceCertificationReceipt(input) {
  const entry = certificationSubject(input.subject);
  if (entry === null || entry.route !== 'CERTIFICATION') return refuse('CERTIFY_SUBJECT_NOT_PRODUCIBLE');
  const headText = input.io.git(['rev-parse', 'HEAD']);
  const head = headText === null ? '' : headText.trim();
  if (!SHA40_RE.test(head)) return refuse('CERTIFY_GIT_UNREADABLE');
  const porcelain = input.io.git(['status', '--porcelain']);
  if (porcelain === null) return refuse('CERTIFY_GIT_UNREADABLE');
  if (porcelain.trim() !== '') return refuse('CERTIFY_TREE_DIRTY');
  const facts = releaseFacts(input.io.projectVerdict());
  if (facts === null) return refuse('CERTIFY_CHECKPOINT_UNRESOLVED');
  const checkpoint = facts.checkpoint;

  if (entry.producer === 'PROJECT_CHECK') {
    const conditionId = entry.checkOf ?? entry.id;
    const condition = facts.conditions.find((candidate) => candidate['id'] === conditionId);
    const checkState = condition?.['checkState'];
    const checkId = condition?.['check'];
    if (typeof checkState !== 'string' || typeof checkId !== 'string') return refuse('CERTIFY_CONDITION_UNKNOWN');
    return built(entry.id, checkpoint, head, checkId, checkState, 'PROJECT_CHECK', {});
  }
  if (entry.producer === 'COMMAND') {
    if (head !== checkpoint) return refuse('CERTIFY_HEAD_NOT_CHECKPOINT');
    const command = entry.command;
    if (command === null) return refuse('CERTIFY_SUBJECT_NOT_PRODUCIBLE');
    const outcome = input.io.runCommand(command);
    return built(entry.id, checkpoint, head, `cmd-${entry.id}`, outcome.status === 0 ? 'MET' : 'NOT_MET', 'COMMAND', { commandDigest: commandDigest(command) });
  }
  if (entry.producer === 'OBSERVE_CI') {
    // The observation can only follow S, so HEAD is S or a descendant of it.
    if (head !== checkpoint && input.io.git(['merge-base', '--is-ancestor', checkpoint, head]) === null) return refuse('CERTIFY_CHECKPOINT_NOT_ANCESTOR');
    const observation = input.io.observeCi(checkpoint);
    if (observation === null) return built(entry.id, checkpoint, head, 'ci-run-at-checkpoint', 'UNAVAILABLE_CAPABILITY', 'OBSERVE_CI', {});
    return built(entry.id, checkpoint, head, 'ci-run-at-checkpoint', observation.conclusion === 'success' ? 'MET' : 'NOT_MET', 'OBSERVE_CI', { ciRunId: observation.runId, ciConclusion: observation.conclusion });
  }
  return refuse('CERTIFY_SUBJECT_NOT_PRODUCIBLE');
}

/**
 * @param {string} subject
 * @param {string} checkpoint
 * @param {string} head
 * @param {string} checkId
 * @param {string} checkState
 * @param {string} producer
 * @param {ProducerExtra} extra
 * @returns {ProducerResult}
 */
function built(subject, checkpoint, head, checkId, checkState, producer, extra) {
  const receipt = buildCertificationReceipt({
    subject,
    sourceHead: checkpoint,
    observedAtHead: head,
    sourceRootCleanAtEmit: true,
    checkId,
    checkState,
    producer,
    ...extra,
  });
  return { ok: true, code: receipt['result'] === 'PASS' ? 'CERTIFY_PASS' : 'CERTIFY_NOT_MET', receipt };
}

/**
 * The newest completed run at exactly `sha` from a `gh run list --json` document.
 * @param {unknown} runs
 * @param {string} sha
 * @returns {CiObservation | null}
 */
export function selectCiObservation(runs, sha) {
  if (!Array.isArray(runs)) return null;
  for (const run of runs) {
    if (run === null || typeof run !== 'object') continue;
    const record = /** @type {Record<string, unknown>} */ (run);
    if (typeof record['headSha'] !== 'string' || record['headSha'].toLowerCase() !== sha.toLowerCase()) continue;
    if (record['status'] !== 'completed' || typeof record['conclusion'] !== 'string') continue;
    const id = record['databaseId'];
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) continue;
    return { runId: String(id), conclusion: record['conclusion'] };
  }
  return null;
}
