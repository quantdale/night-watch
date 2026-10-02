// @ts-check
// R5-11 / review-5 task A9.1 — the append-only canonical claim journal.
//
// The C-00 protocol says every writer works under a claim (a SESSION in its own
// worktree, or a bounded canonical MAINTENANCE claim), but nothing recorded which
// commit on `main` was made under which claim: three canonical docs commits
// (67eb3098, e5ec64ca, 46c8b674) had no claim at all and nobody could prove it
// either way. The journal is a tracked, append-only record of claim WINDOWS —
// `(base, tip]` on the first-parent chain of `main` — and `agent:check` fails a
// commit, from the claim era onward, that lies in no window.
//
// Format (`.agent/CLAIM_JOURNAL.md`, one `KEY: value` per line, prose ignored):
//   CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1
//   ERA_START_SHA: <40-hex>     commits AFTER this one must be covered
//   GAP: <40-hex> | <reason>    a pre-era commit known to lack a claim (history, not coverage)
//   CLAIM: <claimId> | role=SESSION|MAINTENANCE | task=<id> | created=<iso|UNRECORDED>
//          | released=<iso|OPEN> | base=<40-hex> | tip=<40-hex|OPEN>
// At most one window is OPEN (a live claim); a journal-only commit (it touches
// nothing but the journal) is exempt because it is the record itself.
// Pure: no filesystem, process or Git authority — the caller supplies the chain.

export const CLAIM_JOURNAL_PATH = '.agent/CLAIM_JOURNAL.md';
export const CLAIM_JOURNAL_PROTOCOL = 'nightwatch.claim-journal.v1';

const SHA_RE = /^[0-9a-f]{40}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const CLAIM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/;
const TASK_RE = /^[a-z0-9][a-z0-9-]{2,127}$/;
const ROLES = new Set(['SESSION', 'MAINTENANCE']);

/**
 * @typedef {object} Claim
 * @property {string} claimId
 * @property {string} role
 * @property {string} task
 * @property {string} created ISO timestamp or UNRECORDED
 * @property {string} released ISO timestamp or OPEN
 * @property {string} base 40-hex
 * @property {string} tip 40-hex or OPEN
 * @typedef {object} ParsedJournal
 * @property {string | null} protocol
 * @property {string | null} eraStartSha
 * @property {Array<{ sha: string, reason: string }>} gaps
 * @property {Claim[]} claims
 * @property {string[]} errors
 */

/**
 * @param {string} text
 * @returns {ParsedJournal}
 */
export function parseClaimJournal(text) {
  /** @type {ParsedJournal} */
  const parsed = { protocol: null, eraStartSha: null, gaps: [], claims: [], errors: [] };
  for (const [index, raw] of String(text ?? '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    const where = `line ${index + 1}`;
    if (line.startsWith('CLAIM_JOURNAL_PROTOCOL_VERSION:')) {
      if (parsed.protocol !== null) parsed.errors.push(`CLAIM_JOURNAL_DUPLICATE_FIELD: protocol version (${where})`);
      parsed.protocol = line.slice('CLAIM_JOURNAL_PROTOCOL_VERSION:'.length).trim();
    } else if (line.startsWith('ERA_START_SHA:')) {
      if (parsed.eraStartSha !== null) parsed.errors.push(`CLAIM_JOURNAL_DUPLICATE_FIELD: ERA_START_SHA (${where})`);
      parsed.eraStartSha = line.slice('ERA_START_SHA:'.length).trim();
    } else if (line.startsWith('GAP:')) {
      const [sha = '', ...reason] = line.slice('GAP:'.length).split('|').map((part) => part.trim());
      parsed.gaps.push({ sha, reason: reason.join(' | ') });
    } else if (line.startsWith('CLAIM:')) {
      const [idPart = '', ...rest] = line.slice('CLAIM:'.length).split('|').map((part) => part.trim());
      /** @type {Record<string, string>} */
      const fields = {};
      for (const part of rest) {
        const eq = part.indexOf('=');
        if (eq > 0) fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
      }
      parsed.claims.push({ claimId: idPart, role: fields.role ?? '', task: fields.task ?? '', created: fields.created ?? '', released: fields.released ?? '', base: fields.base ?? '', tip: fields.tip ?? '' });
    }
  }
  return parsed;
}

/**
 * Structural validation (no Git).
 * @param {ParsedJournal} parsed
 * @returns {string[]}
 */
export function validateClaimJournalStructure(parsed) {
  const errors = [...parsed.errors];
  if (parsed.protocol !== CLAIM_JOURNAL_PROTOCOL) errors.push(`CLAIM_JOURNAL_PROTOCOL_UNSUPPORTED: ${String(parsed.protocol)}`);
  if (parsed.eraStartSha === null || !SHA_RE.test(parsed.eraStartSha)) errors.push('CLAIM_JOURNAL_ERA_START_INVALID: ERA_START_SHA must be a 40-hex commit');
  for (const gap of parsed.gaps) {
    if (!SHA_RE.test(gap.sha)) errors.push(`CLAIM_JOURNAL_GAP_INVALID: ${JSON.stringify(gap.sha)} is not a 40-hex commit`);
    if (gap.reason.length < 12) errors.push(`CLAIM_JOURNAL_GAP_INVALID: gap ${gap.sha.slice(0, 8)} states no reason`);
  }
  const seen = new Set();
  let open = 0;
  for (const claim of parsed.claims) {
    const label = claim.claimId === '' ? '(unnamed)' : claim.claimId;
    if (!CLAIM_ID_RE.test(claim.claimId)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: claim id ${JSON.stringify(claim.claimId)}`);
    if (seen.has(claim.claimId)) errors.push(`CLAIM_JOURNAL_CLAIM_DUPLICATE: ${label}`);
    seen.add(claim.claimId);
    if (!ROLES.has(claim.role)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} role must be SESSION or MAINTENANCE`);
    if (!TASK_RE.test(claim.task)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} task ${JSON.stringify(claim.task)}`);
    if (claim.created !== 'UNRECORDED' && !ISO_RE.test(claim.created)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} created must be an ISO UTC time or UNRECORDED`);
    if (!SHA_RE.test(claim.base)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} base must be 40-hex`);
    const releasedOpen = claim.released === 'OPEN';
    const tipOpen = claim.tip === 'OPEN';
    if (!releasedOpen && !ISO_RE.test(claim.released)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} released must be an ISO UTC time or OPEN`);
    if (!tipOpen && !SHA_RE.test(claim.tip)) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} tip must be 40-hex or OPEN`);
    if (releasedOpen !== tipOpen) errors.push(`CLAIM_JOURNAL_CLAIM_INVALID: ${label} is released=${claim.released} but tip=${claim.tip}; both are OPEN or neither is`);
    if (releasedOpen) open += 1;
  }
  if (open > 1) errors.push(`CLAIM_JOURNAL_MULTIPLE_OPEN: ${open} windows are OPEN; at most one claim is live`);
  return errors;
}

/**
 * Coverage over the first-parent chain.
 * @param {ParsedJournal} parsed
 * @param {ReadonlyArray<{ sha: string, journalOnly: () => boolean }>} chain commits AFTER the era start, oldest first
 * @param {(sha: string) => number} positionOf index of a commit within `chain` (−1 when absent); the era start is −1 and is passed as `eraStartSha`
 * @returns {{ errors: string[], uncovered: string[], openWindow: string | null }}
 */
export function evaluateClaimCoverage(parsed, chain, positionOf) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Array<{ from: number, to: number, claimId: string }>} */
  const windows = [];
  let openWindow = null;
  for (const claim of parsed.claims) {
    const from = claim.base === parsed.eraStartSha ? -1 : positionOf(claim.base);
    const to = claim.tip === 'OPEN' ? chain.length - 1 : positionOf(claim.tip);
    if (claim.base !== parsed.eraStartSha && from < 0) { errors.push(`CLAIM_JOURNAL_WINDOW_UNRESOLVED: ${claim.claimId} base ${claim.base.slice(0, 8)} is not on the first-parent chain after the era start`); continue; }
    if (to < 0 && claim.tip !== 'OPEN') { errors.push(`CLAIM_JOURNAL_WINDOW_UNRESOLVED: ${claim.claimId} tip ${claim.tip.slice(0, 8)} is not on the first-parent chain after the era start`); continue; }
    if (to < from) { errors.push(`CLAIM_JOURNAL_WINDOW_INVERTED: ${claim.claimId} tip precedes its base`); continue; }
    if (claim.tip === 'OPEN') openWindow = claim.claimId;
    windows.push({ from: from + 1, to, claimId: claim.claimId });
  }
  // Windows may not overlap: one commit is made under exactly one claim.
  const ordered = [...windows].sort((left, right) => left.from - right.from);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous !== undefined && current !== undefined && current.from <= previous.to) errors.push(`CLAIM_JOURNAL_WINDOWS_OVERLAP: ${previous.claimId} and ${current.claimId} both claim a commit`);
  }
  /** @type {string[]} */
  const uncovered = [];
  for (const [position, commit] of chain.entries()) {
    if (windows.some((window) => position >= window.from && position <= window.to)) continue;
    if (commit.journalOnly()) continue;
    uncovered.push(commit.sha);
    errors.push(`CLAIM_JOURNAL_UNCOVERED_COMMIT: ${commit.sha} lies in no claim window; every commit on main from the claim era onward is made under a recorded claim`);
  }
  return { errors, uncovered, openWindow };
}

/**
 * Append-only judgement of one journal revision against its predecessor. Every protocol
 * line of the OLD text must survive unchanged — except an OPEN claim, which may be CLOSED
 * (same claim id, role, task and base; released and tip now set). Prose is free.
 *
 * @param {string} previous
 * @param {string} next
 * @returns {string[]} errors
 */
export function evaluateJournalAppendOnly(previous, next) {
  /** @type {string[]} */
  const errors = [];
  const before = parseClaimJournal(previous);
  const after = parseClaimJournal(next);
  if (before.protocol !== after.protocol) errors.push('CLAIM_JOURNAL_REWRITTEN: the protocol version line changed');
  if (before.eraStartSha !== after.eraStartSha) errors.push('CLAIM_JOURNAL_REWRITTEN: ERA_START_SHA changed');
  const keptGaps = new Set(after.gaps.map((gap) => `${gap.sha}|${gap.reason}`));
  for (const gap of before.gaps) if (!keptGaps.has(`${gap.sha}|${gap.reason}`)) errors.push(`CLAIM_JOURNAL_REWRITTEN: the recorded gap ${gap.sha.slice(0, 8)} was edited or removed`);
  for (const claim of before.claims) {
    const survivor = after.claims.find((candidate) => candidate.claimId === claim.claimId);
    if (survivor === undefined) { errors.push(`CLAIM_JOURNAL_REWRITTEN: claim ${claim.claimId} was removed`); continue; }
    const identical = JSON.stringify(survivor) === JSON.stringify(claim);
    const closing = claim.tip === 'OPEN' && claim.released === 'OPEN' && survivor.role === claim.role && survivor.task === claim.task && survivor.base === claim.base && survivor.created === claim.created;
    if (!identical && !closing) errors.push(`CLAIM_JOURNAL_REWRITTEN: claim ${claim.claimId} was edited (only an OPEN claim may be closed, keeping its identity and base)`);
  }
  return errors;
}

/**
 * Read and judge the journal against Git. `git(args)` is injected (read-only) and returns
 * `{ status, stdout }`; `readText(path)` returns the journal text or null.
 *
 * @param {{ readText: (relative: string) => string | null, git: (args: string[]) => { status: number | null, stdout: string } }} input
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
export function inspectClaimJournal(input) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const info = [];
  const text = input.readText(CLAIM_JOURNAL_PATH);
  if (text === null) {
    // The claim era begins with the commit that adds the journal. A journal that is
    // absent although HEAD's history ever touched it was deleted: fail closed. A
    // history that never carried one (a synthetic fixture, a fresh repository) is
    // not in the era yet and is reported, never silently passed.
    const touched = input.git(['log', '--format=%H', '-n', '1', 'HEAD', '--', CLAIM_JOURNAL_PATH]);
    if (touched.status !== 0 || touched.stdout.trim() !== '') {
      errors.push(`CLAIM_JOURNAL_MISSING: ${CLAIM_JOURNAL_PATH} is absent although it is part of this history (or the history is unreadable); the canonical claim journal is required from the claim era onward`);
    } else {
      info.push(`CLAIM_JOURNAL_NOT_STARTED: ${CLAIM_JOURNAL_PATH} has never existed in this history; the claim era has not begun`);
    }
    return { errors, warnings, info };
  }
  const parsed = parseClaimJournal(text);
  const structural = validateClaimJournalStructure(parsed);
  errors.push(...structural);
  if (structural.length > 0 || parsed.eraStartSha === null) return { errors, warnings, info };
  const ancestor = input.git(['merge-base', '--is-ancestor', parsed.eraStartSha, 'HEAD']);
  if (ancestor.status !== 0) {
    errors.push(`CLAIM_JOURNAL_ERA_START_UNRESOLVED: ERA_START_SHA ${parsed.eraStartSha.slice(0, 8)} is not an ancestor of HEAD (a shallow or unrelated checkout cannot verify claim coverage)`);
    return { errors, warnings, info };
  }
  const listed = input.git(['rev-list', '--first-parent', '--reverse', `${parsed.eraStartSha}..HEAD`]);
  if (listed.status !== 0) {
    errors.push('CLAIM_JOURNAL_CHAIN_UNREADABLE: the first-parent chain after the era start could not be listed');
    return { errors, warnings, info };
  }
  const shas = listed.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');
  const index = new Map(shas.map((sha, position) => [sha, position]));
  const chain = shas.map((sha) => ({
    sha,
    // A commit that touches nothing but the journal IS the record, not an unclaimed change.
    journalOnly: () => {
      const touched = input.git(['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-m', '-r', '-z', sha]);
      if (touched.status !== 0) return false;
      const paths = touched.stdout.split('\0').filter((entry) => entry !== '');
      return paths.length > 0 && paths.every((entry) => entry === CLAIM_JOURNAL_PATH);
    },
  }));
  const coverage = evaluateClaimCoverage(parsed, chain, (sha) => index.get(sha) ?? -1);
  errors.push(...coverage.errors);
  // Append-only across history: every commit that revised the journal is judged against its parent's text.
  const revisions = input.git(['rev-list', '--first-parent', '--reverse', `${parsed.eraStartSha}..HEAD`, '--', CLAIM_JOURNAL_PATH]);
  if (revisions.status === 0) {
    for (const revision of revisions.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '')) {
      const before = input.git(['show', `${revision}^:${CLAIM_JOURNAL_PATH}`]);
      const after = input.git(['show', `${revision}:${CLAIM_JOURNAL_PATH}`]);
      if (before.status !== 0 || after.status !== 0) continue;
      for (const error of evaluateJournalAppendOnly(before.stdout, after.stdout)) errors.push(`${error} (commit ${revision.slice(0, 8)})`);
    }
  }
  if (coverage.openWindow !== null) info.push(`CLAIM_JOURNAL_OPEN_WINDOW: ${coverage.openWindow} is the live claim (it is closed with its tip when the session is released)`);
  info.push(`CLAIM_JOURNAL_COVERAGE: ${shas.length} commit(s) after the era start, ${coverage.uncovered.length} uncovered, ${parsed.gaps.length} recorded pre-era gap(s)`);
  return { errors, warnings, info };
}
