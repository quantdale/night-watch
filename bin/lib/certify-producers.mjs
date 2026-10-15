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
//
// D-173 correction — the guarded measurement root. A COMMAND lane measures the
// SUBSTANTIVE SOURCE CHECKPOINT S, never the observing checkout: S cannot declare its
// own SHA in its tree (that is a hash fixed point), so the authorized choreography puts
// the observer at a documentary descendant of S while the anchor names S. The old
// `head === checkpoint` rule demanded both facts from ONE root and was therefore
// structurally unsatisfiable. The corrected invariant is not a deletion but a
// replacement: a COMMAND receipt is produced ONLY after the producer has verified an
// explicitly supplied MEASUREMENT ROOT — a real, canonicalized checkout whose Git
// object identity proves it is exactly S (`HEAD == S`, `HEAD^{tree} == S^{tree}` as the
// OBSERVER's object database resolves it), on a clean tracked tree, carrying no
// ignored/untracked input outside the disposable dependency/build allowlist, while the
// observer itself sits on S or on a legitimate documentary descendant of S whose range
// invalidates no certification. The declared command then executes INSIDE the verified
// measurement root (re-verified immediately before spawn), and the receipt records the
// truth the schema already carries separately: `sourceHead: S` (measured) and
// `observedAtHead: <observer HEAD>` (observing).

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
 * @typedef {object} MeasurementRun
 * @property {number | null} status the command's exit status (null when it did not run or was killed)
 * @property {boolean} preVerified whether the runner re-verified the measurement identity immediately before spawn
 */

/**
 * @typedef {object} MeasurementExpectation
 * @property {string} head the source checkpoint the measurement root must still be at
 * @property {string} tree the tree OID the measurement root must still carry
 */

/**
 * The GUARDED MEASUREMENT ROOT (D-173): a declared checkout of the substantive source
 * checkpoint. `root` is the declared directory as the caller resolved it; `realpath` is
 * its filesystem realpath (null when unreadable) and `rootIsSymlink` whether the
 * declared directory is itself a symlink; `topLevel` is the measurement repository's
 * own `rev-parse --show-toplevel`. `git` is a bounded read-only Git read bound to the
 * measurement root. `runCommand` executes a declared command INSIDE the measurement
 * root and must re-verify `expect` immediately before spawn, reporting
 * `preVerified: false` (and never executing) when the root no longer measures what was
 * verified. None of these facts is ever emitted into a receipt: receipts carry only the
 * allowlisted tokens of the schema.
 *
 * @typedef {object} MeasurementRoot
 * @property {string} root the declared measurement checkout (canonicalized by the caller; never emitted)
 * @property {string | null} realpath the filesystem realpath of the declared directory (null when unreadable)
 * @property {boolean} rootIsSymlink whether the declared directory is itself a symlink
 * @property {string | null} topLevel the measurement repository top level (`rev-parse --show-toplevel`)
 * @property {(args: string[]) => string | null} git read-only Git bound to the measurement root; null on failure
 * @property {(argv: readonly string[], expect: MeasurementExpectation) => MeasurementRun} runCommand execute inside the measurement root
 */

/**
 * @typedef {object} ProducerIo
 * @property {(args: string[]) => string | null} git read-only Git of the OBSERVER root; null on a non-zero exit
 * @property {() => Record<string, unknown> | null} projectVerdict the parsed project-state-check JSON, or null
 * @property {(sha: string) => CiObservation | null} observeCi
 * @property {(from: string, to: string) => string | null} checkpointRangeClass the existing
 *   checkpoint-role classification of the observer range `from..to` (`SAME`,
 *   `DOCUMENTARY_DESCENDANT`, `SUBSTANTIVE_DESCENDANT`, `UNRELATED`, `UNKNOWN`); null when
 *   the range cannot be classified
 * @property {MeasurementRoot | null} measurement the guarded measurement root for COMMAND subjects
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
 * Disposable inputs a qualified measurement checkout may carry BESIDE its tracked
 * tree: dependency installs and build/staging outputs only. Anything else that Git
 * reports as ignored/untracked-input — a local override, a scratch file, an injected
 * fixture, a credential-shaped artifact — invalidates the measurement. The named
 * scratch root `.tmp-nightwatch/` is the repository's DECLARED test-scratch class
 * (`SCRATCH_ROOT` in `src/core/workspace/ephemeralLayout.ts`): the suites write it
 * themselves, so refusing it would refuse the product's own legitimate outputs.
 */
export const ALLOWED_IGNORED_INPUTS = Object.freeze([
  'node_modules/',
  'dist/',
  'artifacts/',
  'coverage/',
  'test-results/',
  'playwright-report/',
  'ui/control-center/node_modules/',
  'ui/control-center/dist/',
  'ui/control-center/coverage/',
  '.tmp-nightwatch/',
]);

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
 * The observer must sit ON the checkpoint or on one of its descendants: an observation
 * (CI) or a measurement (COMMAND) of S from a root that cannot reach S proves nothing.
 * @param {ProducerIo} io
 * @param {string} checkpoint
 * @param {string} head
 * @returns {boolean}
 */
function observerAtOrAfterCheckpoint(io, checkpoint, head) {
  return head === checkpoint || io.git(['merge-base', '--is-ancestor', checkpoint, head]) !== null;
}

/**
 * The `!! ` entries of a `status --porcelain --ignored` listing.
 * @param {string} porcelain
 * @returns {string[]}
 */
function ignoredEntries(porcelain) {
  return porcelain.split('\n').map((line) => line.trimEnd()).filter((line) => line.startsWith('!! ')).map((line) => line.slice(3));
}

/**
 * @param {string} entry
 * @returns {boolean}
 */
function allowedIgnoredInput(entry) {
  return ALLOWED_IGNORED_INPUTS.some((prefix) => entry === prefix || entry.startsWith(prefix) || `${entry}/` === prefix);
}

/**
 * The guarded measurement-root gate (D-173). Every identity and cleanliness
 * precondition is verified HERE, against the observer's own object database and the
 * measurement root's declared facts, before any command may execute. The returned tree
 * OID is the verified measurement identity the runner must re-check at spawn time.
 *
 * @param {ProducerIo} io
 * @param {string} checkpoint the declared substantive source checkpoint S
 * @param {string} head the observer HEAD
 * @returns {{ code: string, tree: null } | { code: null, tree: string }}
 */
function verifyMeasurementRoot(io, checkpoint, head) {
  /** @param {string} code */
  const deny = (code) => ({ code, tree: null });
  const measurement = io.measurement;
  if (measurement === null || measurement === undefined) return deny('CERTIFY_MEASUREMENT_ROOT_REQUIRED');
  // S must be a real commit of the OBSERVER's repository — the authoritative source.
  if (io.git(['cat-file', '-e', `${checkpoint}^{commit}`]) === null) return deny('CERTIFY_CHECKPOINT_UNRESOLVED');
  if (!observerAtOrAfterCheckpoint(io, checkpoint, head)) return deny('CERTIFY_CHECKPOINT_NOT_ANCESTOR');
  // The whole S..observer-HEAD range must not invalidate certification: only a
  // documentary descendant may observe the checkpoint its anchor names.
  const rangeClass = io.checkpointRangeClass(checkpoint, head);
  if (rangeClass !== 'SAME' && rangeClass !== 'DOCUMENTARY_DESCENDANT') return deny('CERTIFY_CHECKPOINT_RANGE_INVALID');
  // The declared measurement root must be a real, canonicalized directory — never a
  // symlink substitution and never a path that resolves elsewhere than it was declared.
  if (measurement.realpath === null || measurement.rootIsSymlink || measurement.realpath !== measurement.root) return deny('CERTIFY_MEASUREMENT_ROOT_UNSAFE');
  if (measurement.topLevel === null || measurement.topLevel !== measurement.realpath) return deny('CERTIFY_MEASUREMENT_ROOT_UNSAFE');
  // Object identity: S must resolve IN the measurement repository, with the SAME tree
  // the observer's object database attributes to S — a foreign or forged repository
  // cannot present the authorized source's objects under a different root.
  if (measurement.git(['cat-file', '-e', `${checkpoint}^{commit}`]) === null) return deny('CERTIFY_MEASUREMENT_FOREIGN');
  const observerTree = io.git(['rev-parse', `${checkpoint}^{tree}`]);
  const measurementHead = measurement.git(['rev-parse', 'HEAD']);
  const measurementTree = measurement.git(['rev-parse', 'HEAD^{tree}']);
  const measurementCommitTree = measurement.git(['rev-parse', `${checkpoint}^{tree}`]);
  if (observerTree === null || measurementHead === null || measurementTree === null || measurementCommitTree === null) return deny('CERTIFY_MEASUREMENT_ROOT_UNREADABLE');
  const expectedTree = observerTree.trim();
  const measuredHead = measurementHead.trim();
  const measuredTree = measurementTree.trim();
  const measuredCommitTree = measurementCommitTree.trim();
  // The exact-checkpoint invariant (BM-078): the measurement root is AT S, exactly.
  if (measuredHead !== checkpoint) return deny('CERTIFY_MEASUREMENT_NOT_CHECKPOINT');
  if (measuredTree !== expectedTree || measuredCommitTree !== expectedTree) return deny('CERTIFY_MEASUREMENT_TREE_MISMATCH');
  // Cleanliness of the measurement worktree: no tracked change, no untracked input.
  const measurementPorcelain = measurement.git(['status', '--porcelain']);
  if (measurementPorcelain === null) return deny('CERTIFY_MEASUREMENT_ROOT_UNREADABLE');
  if (measurementPorcelain.trim() !== '') return deny('CERTIFY_MEASUREMENT_DIRTY');
  // Ignored/untracked-input policy: only the disposable dependency/build classes may
  // exist beside the tracked tree; any other ignored entry is an unexpected overlay.
  const ignoredStatus = measurement.git(['status', '--porcelain', '--ignored']);
  if (ignoredStatus === null) return deny('CERTIFY_MEASUREMENT_ROOT_UNREADABLE');
  for (const entry of ignoredEntries(ignoredStatus)) if (!allowedIgnoredInput(entry)) return deny('CERTIFY_MEASUREMENT_IGNORED_INPUT');
  return { code: null, tree: expectedTree };
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
    const guarded = verifyMeasurementRoot(input.io, checkpoint, head);
    if (guarded.code !== null || guarded.tree === null) return refuse(guarded.code ?? 'CERTIFY_MEASUREMENT_ROOT_UNREADABLE');
    const measurement = input.io.measurement;
    if (measurement === null || measurement === undefined) return refuse('CERTIFY_MEASUREMENT_ROOT_REQUIRED');
    const command = entry.command;
    if (command === null) return refuse('CERTIFY_SUBJECT_NOT_PRODUCIBLE');
    const outcome = measurement.runCommand(command, { head: checkpoint, tree: guarded.tree });
    if (outcome.preVerified !== true) return refuse('CERTIFY_MEASUREMENT_RACE');
    return built(entry.id, checkpoint, head, `cmd-${entry.id}`, outcome.status === 0 ? 'MET' : 'NOT_MET', 'COMMAND', { commandDigest: commandDigest(command) });
  }
  if (entry.producer === 'OBSERVE_CI') {
    // The observation can only follow S, so HEAD is S or a descendant of it.
    if (!observerAtOrAfterCheckpoint(input.io, checkpoint, head)) return refuse('CERTIFY_CHECKPOINT_NOT_ANCESTOR');
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
