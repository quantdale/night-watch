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

/**
 * R4-13 / review-4 task 3.4, tightened by R5-01 / review-5 task A1.1 —
 * `openspec/changes/archive/<dated>-<change>/<rest>` is a MOVED planning
 * artifact. It is documentary ONLY when (a) `<rest>` is one of the APPROVED
 * PLANNING SHAPES (`proposal|design|audit|tasks.md`, `.openspec.yaml`,
 * `specs/<capability>/spec.md`) — never any other file at any depth or with any
 * extension, because a tree file such as `…/tests/evil.test.ts` is picked up by
 * test discovery once it exists; (b) the SOURCE path `openspec/changes/<change>/
 * <rest>` is itself an approved checkpoint path (guaranteed by construction —
 * every shape above is an approved planning path under `openspec/changes/<one
 * directory>/` — and pinned by a test, not re-checked at run time, so there is no
 * redundant guard for a mutant to be equivalent to); and (c) the same commit ADDS
 * the archived path byte-identically and REMOVES that source. An edit, a copy, an
 * addition from elsewhere, or a change that leaves the source in place is
 * substantive. Enumerating the shapes exactly keeps the rule from approving any
 * other path.
 */
export const ARCHIVE_MOVE_PATH_RE =
  /^openspec\/changes\/archive\/(\d{4}-\d{2}-\d{2})-([^/]+)\/((?:(?:proposal|design|audit|tasks)\.md)|(?:\.openspec\.yaml)|(?:specs\/[^/]+\/spec\.md))$/;

/**
 * @param {string} root
 * @param {string} commit
 * @param {string} file
 * @returns {boolean} true when this commit is a byte-identical move
 */
export function archiveMoveHolds(root, commit, file) {
  const archived = ARCHIVE_MOVE_PATH_RE.exec(file);
  if (archived === null) return false;
  const source = `openspec/changes/${archived[2]}/${archived[3]}`;
  const before = blobAt(root, `${commit}^`, source);
  const after = blobAt(root, commit, file);
  if (before === null || after === null) return false;
  if (before !== after) return false;
  // The source must be GONE at this commit: a copy is not a move.
  return blobAt(root, commit, source) === null;
}

/**
 * R5-01 — every path ONE commit touches (a merge against each parent), exactly
 * as Git names them (NUL-separated, so no path is quoted away or mistaken for
 * a header). `null` when the commit cannot be listed (fail closed).
 * @param {string} root
 * @param {string} commit
 * @returns {string[] | null}
 */
export function commitTouchedPaths(root, commit) {
  const output = gitText(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-m', '-r', '-z', commit]);
  if (output === null) return null;
  return [...new Set(output.split('\0').filter((entry) => entry !== ''))];
}

/** The sentinel a range that cannot be listed contributes: never an approvable path. */
export const UNLISTABLE_RANGE_VIOLATION = '<unlistable-range>';

/**
 * Whether one PATH, judged alone, makes a commit non-documentary. Guarded
 * binding files and archive-move shapes are decided by their own diff-shape
 * checks, not here.
 * @param {string} file
 */
function pathAloneViolation(file) {
  return guardClassForPath(file) === null && !isApprovedCheckpointPath(file) && !ARCHIVE_MOVE_PATH_RE.test(file);
}

export function checkpointRoleViolations(root, files, context) {
  // VB-06: guarded paths are excluded from the path-alone filter — their
  // admissibility is decided exclusively by their diff-shape guard below.
  const violations = files.filter((file) => pathAloneViolation(file));
  /** @type {string[]} */
  let commits;
  if (context.kind === 'commit') {
    commits = [context.commit];
  } else {
    const listed = gitText(root, ['rev-list', `${context.from}..${context.to}`]);
    // An unlistable range fails closed for EVERY path, not only the guarded
    // ones: nothing can be proven about commits that cannot be enumerated.
    if (listed === null) return [...new Set([...violations, ...files, UNLISTABLE_RANGE_VIOLATION])];
    commits = listed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    // A range from A to B is classified over every commit in it; commits
    // before `from` are the checkpoint itself and not part of the range.
  }
  const aggregateGuarded = new Set(files.filter((file) => guardClassForPath(file) !== null));
  const aggregateArchived = new Set(files.filter((file) => ARCHIVE_MOVE_PATH_RE.test(file)));
  // R5-01: a range is classified COMMIT BY COMMIT, never through its aggregate
  // diff. A path that one commit adds and a later commit removes (or moves) has
  // no net entry in the aggregate, yet it existed in the history under judgement.
  const perCommitJudgement = context.kind === 'range';
  if (!perCommitJudgement && aggregateGuarded.size === 0 && aggregateArchived.size === 0) return [...new Set(violations)];

  for (const commit of commits) {
    /** @type {Set<string>} */
    let guarded = aggregateGuarded;
    /** @type {Set<string>} */
    let archived = aggregateArchived;
    if (perCommitJudgement) {
      const touchedPaths = commitTouchedPaths(root, commit);
      if (touchedPaths === null) {
        violations.push(UNLISTABLE_RANGE_VIOLATION, ...files);
        continue;
      }
      for (const file of touchedPaths) if (pathAloneViolation(file)) violations.push(file);
      guarded = new Set(touchedPaths.filter((file) => guardClassForPath(file) !== null));
      archived = new Set(touchedPaths.filter((file) => ARCHIVE_MOVE_PATH_RE.test(file)));
    }
    const touched = touchedGuardedFiles(root, commit, guarded);
    if (touched === null) {
      violations.push(...guarded);
      continue;
    }
    // R4-13: every archive-prefix path this commit touched must be a
    // byte-identical move of its named change's file.
    for (const file of archived) {
      const touchedArchive = gitText(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', '-m', commit, '--', file]);
      if (touchedArchive === null) {
        violations.push(file);
        continue;
      }
      if (touchedArchive.trim() === '') continue;
      if (!archiveMoveHolds(root, commit, file)) violations.push(file);
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
