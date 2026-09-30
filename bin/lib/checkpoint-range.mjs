// @ts-check

/**
 * R3-03 / R3-04 — corrections task 8.3 — the checkpoint-range classifier.
 *
 * "Certified at S" must keep meaning "all substantive content equals S, and the
 * tree is clean". The naive reading — the working tree may be MET only when
 * `HEAD == S` — made certification structurally unsatisfiable: S is recorded in
 * tracked files, and a commit cannot contain its own SHA, so `project:check`
 * always evaluates a DESCENDANT of S. The admissible relaxation is exactly the
 * documentary descendant: S is an ancestor of HEAD, the ENTIRE range S..HEAD is
 * documentation-only (`checkpointRoleViolations` empty), and the tree is clean.
 * A substantive descendant, an unrelated history, a dirty tree, or any
 * unverifiable fact is not at the checkpoint.
 *
 * The facts are injected callbacks, so this module is pure: it holds no
 * filesystem, process, network or clock authority, and every unknown fails
 * closed to `UNKNOWN` (never to a pass).
 *
 * @typedef {(
 *   'SAME'
 *   | 'DOCUMENTARY_DESCENDANT'
 *   | 'SUBSTANTIVE_DESCENDANT'
 *   | 'UNRELATED'
 *   | 'UNKNOWN'
 * )} CheckpointRangeClass
 */

export const CHECKPOINT_RANGE_CLASSES = Object.freeze([
  'SAME',
  'DOCUMENTARY_DESCENDANT',
  'SUBSTANTIVE_DESCENDANT',
  'UNRELATED',
  'UNKNOWN',
]);

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * Classify HEAD against the certified checkpoint S.
 *
 * Callback semantics (all fail closed):
 *   - `isAncestor(a, b)` is true iff `a` is an ancestor of `b`; any failure
 *     yields false (an unproven ancestor is not admitted).
 *   - `changedFiles(from, to)` returns the changed paths, or null when the
 *     range cannot be measured.
 *   - `checkpointRoleViolations(files)` returns the violating paths of the
 *     range, or null when the range cannot be classified.
 *
 * @param {{
 *   certifiedCheckpointSha: string | null,
 *   headSha: string | null,
 *   isAncestor: ((ancestor: string, descendant: string) => boolean) | null,
 *   changedFiles: ((from: string, to: string) => readonly string[] | null) | null,
 *   checkpointRoleViolations: ((files: readonly string[]) => readonly string[] | null) | null,
 * }} facts
 * @returns {CheckpointRangeClass}
 */
export function classifyCheckpointRange(facts) {
  const certified = typeof facts.certifiedCheckpointSha === 'string' && SHA_RE.test(facts.certifiedCheckpointSha)
    ? facts.certifiedCheckpointSha.toLowerCase()
    : null;
  const head = typeof facts.headSha === 'string' && SHA_RE.test(facts.headSha) ? facts.headSha.toLowerCase() : null;
  if (certified === null || head === null) return 'UNKNOWN';
  if (certified === head) return 'SAME';
  if (facts.isAncestor === null || facts.changedFiles === null || facts.checkpointRoleViolations === null) return 'UNKNOWN';
  let ancestor = false;
  try {
    ancestor = facts.isAncestor(certified, head) === true;
  } catch {
    ancestor = false;
  }
  if (!ancestor) return 'UNRELATED';
  let files = null;
  try {
    files = facts.changedFiles(certified, head);
  } catch {
    files = null;
  }
  if (files === null) return 'UNKNOWN';
  if (files.length === 0) return 'DOCUMENTARY_DESCENDANT';
  let violations = null;
  try {
    violations = facts.checkpointRoleViolations(files);
  } catch {
    violations = null;
  }
  if (violations === null) return 'UNKNOWN';
  return violations.length === 0 ? 'DOCUMENTARY_DESCENDANT' : 'SUBSTANTIVE_DESCENDANT';
}
