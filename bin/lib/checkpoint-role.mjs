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
 * The digests of the lines a `git diff --unified=0` REMOVES. Removals are read
 * only INSIDE a hunk: before the first `@@` the `--- a/…` header is not a
 * removed line, and after it a removed line whose own text begins `-- ` is a
 * REMOVAL, not a header (a prefix test on `--- ` dropped it). A removed blank
 * line exempts nothing and is never digested (RV-04: one blank-line policy for
 * the per-commit and working-tree pairing checks). Pure.
 * @param {string} diffText
 * @returns {Set<string>}
 */
export function removedLineDigestsFromDiff(diffText) {
  const digest = new Set();
  let inHunk = false;
  for (const line of String(diffText).split('\n')) {
    if (line.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (line.startsWith('diff --git ')) {
      inHunk = false;
      continue;
    }
    if (!inHunk) continue;
    if (line.startsWith('-') && line.slice(1) !== '') digest.add(lineSha256Prefix(line.slice(1)));
  }
  return digest;
}

/**
 * Files whose change makes the given commit (or range) NOT documentation-only:
 * paths outside `APPROVED_CHECKPOINT_PATHS`, plus any guarded binding file
 * whose diff shape fails its guard. An unresolvable diff fails closed.
 *
 * @param {string} root
 * @param {readonly string[]} files paths the commit/range touches
 * @param {{ kind: 'commit', commit: string } | { kind: 'range', from: string, to: string }, verifyBindingReceipt?: (subject: string, digest: string, sha: string) => boolean }} context
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
  return removedLineDigestsFromDiff(diff.stdout ?? '');
}

/**
 * VB-03 / RV-04 — correction entries this commit appended WITHOUT removing the
 * archive line each exempts. Each entry is paired against the removed lines of
 * ITS OWN archive (`entry.path`) in THIS commit; a removal in a different file
 * never pairs it, and no archive path is assumed for every entry (RV-04: the
 * old code hard-coded `docs/CURRENT_STATE.md` for all of them). A bare append
 * makes the corrections-file touch substantive even when the entry satisfies
 * the legacy append-only shape.
 * @param {string} root
 * @param {string} commit
 * @param {string} correctionsFile
 */
export function correctionPairingViolations(root, commit, correctionsFile) {
  const hasParent = gitText(root, ['rev-parse', '--verify', '--quiet', `${commit}^^{commit}`]) !== null;
  const before = hasParent ? blobAt(root, `${commit}^`, correctionsFile) : null;
  const after = blobAt(root, commit, correctionsFile);
  const appended = appendedCorrectionEntries(before, after);
  // R3-17 / corrections task 8.16: an unparsable side is a violation, never an
  // empty pairing result (the previous `[]` let a broken registry pass).
  if (appended === null) return [{ code: 'CORRECTION_FILE_UNPARSEABLE', correctionsFile }];
  if (appended.length === 0) return [];
  /** @type {Map<string, Set<string> | null>} */
  const removedByArchive = new Map();
  const violations = [];
  for (const entry of appended) {
    if (!removedByArchive.has(entry.path)) removedByArchive.set(entry.path, removedLineDigests(root, commit, entry.path));
    const removed = removedByArchive.get(entry.path) ?? null;
    if (removed === null) {
      violations.push({ code: 'CORRECTION_PAIRING_UNVERIFIABLE', correctionsFile, archiveFile: entry.path });
    } else if (!isCorrectionAppendAdmissible(entry, removed).admissible) {
      violations.push({ code: 'CORRECTION_APPEND_UNPAIRED', id: entry.id, archiveFile: entry.path, expectedDigest: entry.oldLineSha256 });
    }
  }
  return violations;
}

/**
 * RV-04 — the per-commit pairing judgement over a range: every commit in
 * `fromExclusive..toInclusive` (oldest first) is checked ON ITS OWN, never
 * against the aggregate. A two-commit split (append in one commit, remove the
 * archive line in the next) is therefore two findings' worth of truth: the
 * first commit is unpaired even though the range as a whole looks paired.
 * @param {string} root
 * @param {string} fromExclusive
 * @param {string} toInclusive
 * @param {string} correctionsFile
 * @returns {Array<{ commit: string, code: string, id?: string, archiveFile?: string }> | null} null when the range cannot be listed
 */
export function unpairedCorrectionsInRange(root, fromExclusive, toInclusive, correctionsFile) {
  const listed = gitText(root, ['rev-list', '--reverse', `${fromExclusive}..${toInclusive}`]);
  if (listed === null) return null;
  const found = [];
  for (const commit of listed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    for (const violation of correctionPairingViolations(root, commit, correctionsFile)) found.push({ commit, ...violation });
  }
  return found;
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
        const guardOptions = typeof context.verifyBindingReceipt === 'function'
          ? { verifyReceipt: context.verifyBindingReceipt }
          : {};
        if (!guardHoldsForChange(file, before, after, guardOptions)) {
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
        const pairings = correctionPairingViolations(root, commit, file);
        if (pairings.length > 0) violations.push(file);
      }
    }
  }
  return [...new Set(violations)];
}
