// @ts-check
// A-01 / D2 — commit-role classification with the diff-shape guard.
//
// `isApprovedCheckpointPath` answers "is this PATH eligible to appear in a
// documentation checkpoint". For the two binding files that is necessary but
// not sufficient: their approval is conditional on the DIFF SHAPE of the exact
// commit (values-only evidence re-binds, append-only correction
// registrations). Any other touch — a new or removed subject, a non-binding
// key, a reorder, a malformed value, an add or a delete — is substantive,
// always. This module evaluates that condition against Git so both the
// continuity checker and the project checker classify identically.

import { spawnSync } from 'node:child_process';
import { isApprovedCheckpointPath } from '../agent-continuity-protocol.mjs';
import { guardClassForPath, guardHoldsForChange } from './release-evidence.mjs';

function gitText(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) return null;
  return result.stdout ?? '';
}

function blobAt(root, ref, file) {
  // A missing blob is a null side (added or deleted file) for the guard.
  const result = spawnSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8', shell: false, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) return null;
  return result.stdout ?? '';
}

function touchedGuardedFiles(root, commit, guarded) {
  const output = gitText(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', commit]);
  if (output === null) return null;
  return output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '' && guarded.has(line));
}

/**
 * Files whose change makes the given commit (or range) NOT documentation-only:
 * paths outside `APPROVED_CHECKPOINT_PATHS`, plus any guarded binding file
 * whose diff shape fails its guard. An unresolvable diff fails closed.
 *
 * @param {string} root
 * @param {readonly string[]} files paths the commit/range touches
 * @param {{ kind: 'commit', commit: string } | { kind: 'range', from: string, to: string }} context
 * @returns {string[]} violating files (de-duplicated, source order)
 */
export function checkpointRoleViolations(root, files, context) {
  const violations = files.filter((file) => !isApprovedCheckpointPath(file));
  const guarded = new Set(files.filter((file) => guardClassForPath(file) !== null));
  if (guarded.size === 0) return [...new Set(violations)];

  /** @type {string[]} */
  let commits;
  if (context.kind === 'commit') {
    commits = [context.commit];
  } else {
    const listed = gitText(root, ['rev-list', `${context.from}..${context.to}`]);
    if (listed === null) return [...new Set([...violations, ...guarded])];
    commits = listed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    // A range from A to B is classified over every commit in it; commits
    // before `from` are the checkpoint itself and not part of the range.
  }
  for (const commit of commits) {
    const touched = touchedGuardedFiles(root, commit, guarded);
    if (touched === null) {
      violations.push(...guarded);
      continue;
    }
    for (const file of touched) {
      const parentRef = `${commit}^`;
      const hasParent = gitText(root, ['rev-parse', '--verify', '--quiet', `${parentRef}^{commit}`]) !== null;
      const before = hasParent ? blobAt(root, parentRef, file) : null;
      const after = blobAt(root, commit, file);
      if (!guardHoldsForChange(file, before, after)) violations.push(file);
    }
  }
  return [...new Set(violations)];
}
