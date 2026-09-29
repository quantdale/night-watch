// @ts-check

/**
 * VD-01 / corrections task 4.1 (design D3) — probe-at-checkpoint semantics.
 *
 * A release probe may resolve MET in exactly two ways:
 *   (a) it executed in a checkout whose HEAD equals the certified checkpoint S
 *       with a clean tree, or
 *   (b) it consumed a machine-readable receipt bound to S (its recorded
 *       nightwatchSha equals S).
 * Anything else that would have been MET resolves `NOT_AT_CHECKPOINT`, which is
 * NOT MET. A diagnostic failure (UNMET, UNAVAILABLE_CAPABILITY) is never
 * upgraded and never hidden: only a passing result is demoted, because only a
 * pass claims something about S.
 *
 * This module is pure: it holds no filesystem, process, network or clock
 * authority. The caller supplies the three observed facts.
 */

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {{
 *   certifiedCheckpointSha: string | null,
 *   headSha: string | null,
 *   treeClean: boolean | null,
 * }} ProbeBindingInput
 */

/**
 * @typedef {{
 *   atCheckpoint: boolean,
 *   reasonCode: string | null,
 *   certifiedCheckpointSha: string | null,
 *   headSha: string | null,
 *   treeClean: boolean | null,
 * }} ProbeBinding
 */

/**
 * @typedef {{ state: string, detail: string }} ProbeOutput
 */

/**
 * @param {ProbeBindingInput} input
 * @returns {ProbeBinding}
 */
export function resolveProbeBinding(input) {
  const certified = typeof input.certifiedCheckpointSha === 'string' && SHA_RE.test(input.certifiedCheckpointSha)
    ? input.certifiedCheckpointSha.toLowerCase()
    : null;
  const head = typeof input.headSha === 'string' && SHA_RE.test(input.headSha) ? input.headSha.toLowerCase() : null;
  const treeClean = typeof input.treeClean === 'boolean' ? input.treeClean : null;
  /** @type {string | null} */
  let reasonCode = null;
  if (certified === null) reasonCode = 'CHECKPOINT_UNRESOLVED';
  else if (head === null) reasonCode = 'HEAD_UNRESOLVED';
  else if (head !== certified) reasonCode = 'HEAD_NOT_CHECKPOINT';
  else if (treeClean === null) reasonCode = 'TREE_STATE_UNKNOWN';
  else if (treeClean === false) reasonCode = 'TREE_DIRTY';
  return { atCheckpoint: reasonCode === null, reasonCode, certifiedCheckpointSha: certified, headSha: head, treeClean };
}

/**
 * The bounded, value-free explanation of why a working-tree measurement is not
 * bound to the certified checkpoint.
 * @param {ProbeBinding} binding
 * @returns {string}
 */
export function describeProbeBinding(binding) {
  const short = (/** @type {string | null} */ sha) => (sha === null ? 'NONE' : sha.slice(0, 8));
  return `${binding.reasonCode ?? 'AT_CHECKPOINT'}: HEAD ${short(binding.headSha)} vs certified checkpoint ${short(binding.certifiedCheckpointSha)}, tree ${binding.treeClean === null ? 'UNKNOWN' : binding.treeClean ? 'clean' : 'dirty'}`;
}

/**
 * Bind a probe that EXECUTED against the working tree (path (a)).
 * @param {ProbeBinding} binding
 * @param {ProbeOutput} output
 * @returns {ProbeOutput}
 */
export function bindTreeProbe(binding, output) {
  if (output.state !== 'MET' || binding.atCheckpoint) return output;
  return {
    state: 'NOT_AT_CHECKPOINT',
    detail: `measured PASS on the working tree but not bound to the certified checkpoint (${describeProbeBinding(binding)}); measurement: ${output.detail}`,
  };
}

/**
 * Bind a probe that consumed a receipt (path (b)): the receipt's recorded SHA
 * is compared with the certified checkpoint, never with HEAD.
 * @param {string | null} certifiedCheckpointSha
 * @param {unknown} receiptSha
 * @returns {'BOUND' | 'BOUND_TO_OTHER' | 'CHECKPOINT_UNRESOLVED' | 'RECEIPT_SHA_INVALID'}
 */
export function receiptBindingRelation(certifiedCheckpointSha, receiptSha) {
  if (typeof certifiedCheckpointSha !== 'string' || !SHA_RE.test(certifiedCheckpointSha)) return 'CHECKPOINT_UNRESOLVED';
  if (typeof receiptSha !== 'string' || !SHA_RE.test(receiptSha)) return 'RECEIPT_SHA_INVALID';
  return receiptSha.toLowerCase() === certifiedCheckpointSha.toLowerCase() ? 'BOUND' : 'BOUND_TO_OTHER';
}

/**
 * The single wording for "a receipt exists but is bound to another commit".
 * @param {string} receiptLabel
 * @param {string} receiptSha
 * @param {string | null} certifiedCheckpointSha
 * @returns {ProbeOutput}
 */
export function receiptNotAtCheckpoint(receiptLabel, receiptSha, certifiedCheckpointSha) {
  return {
    state: 'NOT_AT_CHECKPOINT',
    detail: `${receiptLabel} is bound to ${receiptSha.slice(0, 8)}, not the certified checkpoint ${certifiedCheckpointSha === null ? 'NONE' : certifiedCheckpointSha.slice(0, 8)}; it proves nothing about the checkpoint`,
  };
}
