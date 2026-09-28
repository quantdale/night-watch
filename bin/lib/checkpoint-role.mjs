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
import {
  appendedCorrectionEntries,
  guardClassForPath,
  guardHoldsForChange,
  isCorrectionAppendAdmissible,
  lineSha256Prefix,
} from './release-evidence.mjs';

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
  // `-m` diffs a MERGE against EACH parent; without it a merge commit's
  // touches are invisible and a merge could smuggle a guarded-file rewrite
  // past the classifier (VB-06). Non-merges are unaffected by `-m`.
  const output = gitText(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-m', '-r', commit]);
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
/**
 * VB-03 / corrections task 2.3 — the removed-line digests for one file in one
 * commit (its diff against its parent; a root commit removes nothing).
 * @param {string} root
 * @param {string} commit
 * @param {string} file
 */
export function removedLineDigests(root, commit, file) {
  const digest = new Set();
  const parentRef = `${commit}^`;
  const hasParent = gitText(root, ['rev-parse', '--verify', '--quiet', `${parentRef}^{commit}`]) !== null;
  if (!hasParent) return digest;
  const diff = spawnSync('git', ['diff', '--unified=0', '--no-color', '--no-ext-diff', parentRef, commit, '--', file], {
    cwd: root, encoding: 'utf8', shell: false, timeout: 30_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (diff.status !== 0 || diff.error) return null;
  for (const line of (diff.stdout ?? '').split('\n')) {
    if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@@')) continue;
    if (line.startsWith('-')) digest.add(lineSha256Prefix(line.slice(1)));
  }
  return digest;
}

/**
 * VB-03 — correction entries this commit appended WITHOUT removing the
 * archive line each exempts. A bare `pairing` entry (no same-commit removal)
 * makes the corrections-file touch substantive even when the entry itself
 * satisfies the legacy append-only shape.
 * @param {string} root
 * @param {string} commit
 * @param {string} correctionsFile
 * @param {string} archiveFile
 */
export function correctionPairingViolations(root, commit, correctionsFile, archiveFile) {
  const hasParent = gitText(root, ['rev-parse', '--verify', '--quiet', `${commit}^^{commit}`]) !== null;
  const before = hasParent ? blobAt(root, `${commit}^`, correctionsFile) : null;
  const after = blobAt(root, commit, correctionsFile);
  const appended = appendedCorrectionEntries(before, after);
  if (appended === null || appended.length === 0) return [];
  const removed = removedLineDigests(root, commit, archiveFile);
  if (removed === null) return [{ code: 'CORRECTION_PAIRING_UNVERIFIABLE', correctionsFile, archiveFile }];
  return appended
    .filter((entry) => !isCorrectionAppendAdmissible(entry, removed).admissible)
    .map((entry) => ({ code: 'CORRECTION_APPEND_UNPAIRED', id: entry.id, archiveFile, expectedDigest: entry.oldLineSha256 }));
}

export function checkpointRoleViolations(root, files, context) {
  // VB-06: guarded paths are excluded from the path-alone filter — their
  // admissibility is decided exclusively by their diff-shape guard below.
  const violations = files.filter((file) => guardClassForPath(file) === null && !isApprovedCheckpointPath(file));
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
      // A merge must hold its guard against EVERY parent: a rewrite visible
      // from one parent is substantive even when it matches the other.
      const parentsLine = gitText(root, ['rev-list', '--parents', '-n', '1', commit]);
      const parents = parentsLine === null ? [] : parentsLine.trim().split(/\s+/).slice(1);
      const parentRefs = parents.length === 0 ? [null] : parents;
      let guardFailed = false;
      for (const parent of parentRefs) {
        const before = parent === null ? null : blobAt(root, parent, file);
        const after = blobAt(root, commit, file);
        if (!guardHoldsForChange(file, before, after)) {
          violations.push(file);
          guardFailed = true;
          break;
        }
      }
      if (guardFailed) continue;
      // VB-03: an append-only-shaped corrections append must still pair its
      // removal of the exempted archive line in THIS commit. Without the
      // pairing the entry is a purchased future rewrite and the commit is
      // substantive.
      if (file === 'config/document-role-corrections.v1.json') {
        const pairings = correctionPairingViolations(root, commit, file, 'docs/CURRENT_STATE.md');
        if (pairings.length > 0) violations.push(file);
      }
    }
  }
  return [...new Set(violations)];
}
