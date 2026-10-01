// Bounded diagnostics for the authoritative quality-gate receipt.
//
// This module is the ONLY path by which anything a child process printed can
// reach a gate receipt. It is deliberately small, pure and separately testable:
// the gate previously understood exactly one structured schema, so a
// Playwright-backed group could contribute no diagnostics at all and an
// exact-head CI failure could not be debugged from its own receipt.
//
// The privacy contract is allowlisting, not redaction. Only integers, tracked
// `tests/**` paths with a line number, and fixed enum tokens are ever emitted.
// Assertion values, source contents, environment values, stack frames,
// credentials, response bodies and arbitrary child stderr have no
// representation here and cannot pass through by accident.

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { topologyReceiptDigest } from './topology-gate.mjs';

// Structured child receipts the gate understands. Each is a bounded,
// categorical summary emitted by a repository-owned launcher — never raw
// child output.
const STRUCTURED_CHILD_SCHEMAS = new Set([
  'nightwatch.semantic-compatibility.v1',
  'nightwatch.synthetic-campaign.v1',
  'nightwatch.shard-run-receipt.v1',
  'nightwatch.gate-topology-receipt.v1',
]);

function structuredChildReceipt(output) {
  for (const line of output.split(/\r?\n/).reverse()) {
    try {
      const value = JSON.parse(line);
      if (STRUCTURED_CHILD_SCHEMAS.has(value?.schemaVersion)) return value;
    } catch {
      // The child may also emit ordinary Playwright output; the bounded text
      // patterns remain the fallback when no structured summary is present.
    }
  }
  return null;
}

export function parseCounts(output) {
  // `didNotRun` is a distinct bucket, not a kind of skip. Playwright reports
  // cases it never reached that way, and a serial suite whose first case fails
  // cascades every remaining case into it. Folding it into `skipped` — or
  // omitting it, as before — let five cases disappear from an authoritative
  // receipt while total/passed/failed still looked self-consistent.
  const counts = { total: null, passed: null, skipped: null, didNotRun: null, failed: null };
  const structured = structuredChildReceipt(output);
  if (structured !== null) {
    const source = structured.schemaVersion === 'nightwatch.shard-run-receipt.v1' ? structured.totals : structured;
    for (const key of ['total', 'passed', 'skipped', 'didNotRun', 'failed']) {
      const sourceKey = key === 'total' && structured.schemaVersion === 'nightwatch.shard-run-receipt.v1' ? 'planned' : key;
      if (Number.isInteger(source?.[sourceKey])) counts[key] = source[sourceKey];
    }
    if (counts.total === null && [counts.passed, counts.skipped, counts.failed].every((item) => Number.isInteger(item))) {
      counts.total = counts.passed + counts.skipped + counts.failed + (Number.isInteger(counts.didNotRun) ? counts.didNotRun : 0);
    }
    return counts;
  }
  // RV-15 / corrections task 7.12: a vitest run prints TWO summary lines — `Test
  // Files  8 passed (8)` and `Tests  105 passed (105)`. The generic patterns
  // below took the first `N passed` (the FILE count), so the UI group reported 8
  // where 105 tests ran. A vitest `Tests` line is authoritative when present.
  const vitestTests = /^\s*Tests\s+([^\r\n]+)$/m.exec(output);
  if (vitestTests !== null && /^\s*Test Files\s+/m.test(output)) {
    const line = vitestTests[1] ?? '';
    const token = (name) => {
      const found = new RegExp(`(\\d+)\\s+${name}\\b`).exec(line);
      return found === null ? null : Number(found[1]);
    };
    const parenthesized = /\((\d+)\)/.exec(line);
    counts.passed = token('passed') ?? 0;
    counts.failed = token('failed') ?? 0;
    counts.skipped = (token('skipped') ?? 0) + (token('todo') ?? 0);
    counts.total = parenthesized === null ? counts.passed + counts.failed + counts.skipped : Number(parenthesized[1]);
    return counts;
  }
  const total = /Total:\s*(\d+)\s+tests?/i.exec(output);
  const passed = /(\d+)\s+passed/i.exec(output);
  const skipped = /(\d+)\s+skipped/i.exec(output);
  const failed = /(\d+)\s+failed/i.exec(output);
  const didNotRun = /(\d+)\s+did not run/i.exec(output);
  if (total) counts.total = Number(total[1]);
  if (passed) counts.passed = Number(passed[1]);
  if (skipped) counts.skipped = Number(skipped[1]);
  if (failed) counts.failed = Number(failed[1]);
  if (didNotRun) counts.didNotRun = Number(didNotRun[1]);
  return counts;
}

// Bounded diagnostics. Only tracked `tests/**` paths, 1-based line numbers and
// fixed enum classifications cross this boundary. Assertion values, source
// contents, environment values, stack frames and arbitrary child stderr are
// never copied into the quality-gate receipt.
// The optional class suffix is the sanitized assertion class (4.5): plain
// `file:line` literals from historical receipts stay valid.
const SAFE_LOCATION_PATTERN = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts:\d+(?::(?:TIMEOUT|EXPECT_EQUAL|EXPECT_MATCH|EXPECT_THROW|UNCLASSIFIED))?$/;
const SAFE_SKIP_LOCATION_PATTERN = /^tests\/(?:unit|smoke|manual)\/[A-Za-z0-9._/-]+:\d+$/;
const SAFE_LANE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_TOPOLOGY_CLASSES = new Set(['PROVEN', 'PROVEN_DEGRADED', 'NOT_PROVEN']);
const SAFE_TOPOLOGY_ENVELOPES = new Set(['BUBBLEWRAP', 'BWRAP_UNAVAILABLE_DEGRADED']);
const SAFE_TOPOLOGY_ABSENCES = new Set(['sibling-root', 'bwrap', 'chrome', 'fresh-home']);
const SAFE_SKIP_POLICY_RESULTS = new Set(['PASS', 'UNDECLARED_SKIP', 'SKIP_POLICY_UNCONFIGURED', 'SKIP_REPORT_MISSING', 'SKIP_REPORT_INVALID']);

function nonnegativeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeSkipPolicy(value, fallbackSkipped) {
  if (value === null || value === undefined) {
    return { result: 'SKIP_REPORT_MISSING', skipped: null, undeclared: null };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { result: 'SKIP_REPORT_INVALID', skipped: null, undeclared: null };
  }
  const result = SAFE_SKIP_POLICY_RESULTS.has(value.result) ? value.result : 'SKIP_REPORT_INVALID';
  const skipped = nonnegativeCount(value.skipped) ?? nonnegativeCount(fallbackSkipped);
  const undeclared = nonnegativeCount(value.undeclared);
  const declared = nonnegativeCount(value.declared);
  const undeclaredSkips = (Array.isArray(value.undeclaredSkips) ? value.undeclaredSkips : [])
    .filter((location) => typeof location === 'string' && SAFE_SKIP_LOCATION_PATTERN.test(location) && !location.split('/').includes('..'))
    .slice(0, 16);
  return {
    result,
    skipped,
    undeclared,
    ...(declared === null ? {} : { declared }),
    ...(undeclaredSkips.length === 0 ? {} : { undeclaredSkips }),
  };
}

function shardSkipPolicy(value) {
  if (!Array.isArray(value.shardResults) || value.shardResults.length === 0) {
    return { result: 'SKIP_REPORT_MISSING', skipped: null, undeclared: null };
  }
  const policies = value.shardResults.map((shard) => normalizeSkipPolicy(
    shard !== null && typeof shard === 'object' && !Array.isArray(shard) ? shard.skipPolicy : null,
    null,
  ));
  const failure = policies.find((policy) => policy.result !== 'PASS');
  const sum = (field) => policies.every((policy) => Number.isSafeInteger(policy[field]))
    ? policies.reduce((total, policy) => total + policy[field], 0)
    : null;
  return {
    result: failure?.result ?? 'PASS',
    skipped: sum('skipped'),
    undeclared: sum('undeclared'),
  };
}

export function parseSafeDetails(output) {
  const value = structuredChildReceipt(output);
  if (value === null) return null;
  const failedLocations = (Array.isArray(value.failedLocations) ? value.failedLocations : [])
    .filter((location) => typeof location === 'string' && SAFE_LOCATION_PATTERN.test(location))
    .slice(0, 16);
  const details = { failedLocations };
  // Which containment lane actually ran. A green receipt must never be able to
  // imply deep-containment coverage that the host could not provide.
  if (typeof value.deepContainmentLane === 'string' && SAFE_LANE_PATTERN.test(value.deepContainmentLane)) {
    details.deepContainmentLane = value.deepContainmentLane;
  }
  if (value.schemaVersion === 'nightwatch.gate-topology-receipt.v1') {
    const claim = value.ciClaim !== null && typeof value.ciClaim === 'object' && !Array.isArray(value.ciClaim)
      ? value.ciClaim
      : {};
    const dynamic = value.dynamic !== null && typeof value.dynamic === 'object' && !Array.isArray(value.dynamic)
      ? value.dynamic
      : {};
    const envelope = SAFE_TOPOLOGY_ENVELOPES.has(dynamic.envelope) && dynamic.envelope === claim.runnerTopologyEnvelope
      ? dynamic.envelope
      : null;
    const rawUnexercisedAbsences = (Array.isArray(dynamic.entries) ? dynamic.entries : [])
      .filter((entry) => entry !== null && typeof entry === 'object' && entry.notExercised !== undefined)
      .map((entry) => entry.absence);
    const unexercisedAbsences = rawUnexercisedAbsences
      .filter((absence) => SAFE_TOPOLOGY_ABSENCES.has(absence))
      .filter((absence, index, values) => values.indexOf(absence) === index)
      .slice(0, SAFE_TOPOLOGY_ABSENCES.size);
    const rawClaimedAbsences = Array.isArray(claim.unexercisedAbsences) ? claim.unexercisedAbsences : [];
    const claimedAbsences = rawClaimedAbsences
      .filter((absence) => SAFE_TOPOLOGY_ABSENCES.has(absence))
      .filter((absence, index, values) => values.indexOf(absence) === index)
      .slice(0, SAFE_TOPOLOGY_ABSENCES.size);
    const absenceClaimsMatch = rawUnexercisedAbsences.length === unexercisedAbsences.length
      && rawClaimedAbsences.length === claimedAbsences.length
      && JSON.stringify(unexercisedAbsences) === JSON.stringify(claimedAbsences);
    const topologyClass = value.runnerTopologyClass;
    const classMatchesClaim = topologyClass === claim.runnerTopologyClass;
    // RV-09 / corrections task 7.7: the bound commit, whether the class is
    // CERTIFYING (only a complete PROVEN envelope), and the receipt's digest —
    // carried ONLY when the digest re-derives from the receipt body it claims to
    // describe, so a forged or truncated receipt cannot lend its digest to the
    // gate receipt.
    if (typeof value.gitHead === 'string' && /^[0-9a-f]{40}$/.test(value.gitHead)) details.topologyGitHead = value.gitHead;
    if (typeof value.receiptDigest === 'string' && /^topology-receipt:sha256:[0-9a-f]{24}$/.test(value.receiptDigest)) {
      const { receiptDigest, ...body } = value;
      if (topologyReceiptDigest(body, (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex')) === receiptDigest) {
        details.topologyReceiptDigest = receiptDigest;
      }
    }
    if (envelope !== null) details.topologyEnvelope = envelope;
    if (unexercisedAbsences.length > 0) details.unexercisedAbsences = unexercisedAbsences;
    if (topologyClass === 'NOT_PROVEN' && classMatchesClaim) {
      details.runnerTopologyClass = topologyClass;
    } else if (topologyClass === 'PROVEN' && classMatchesClaim && envelope === 'BUBBLEWRAP' && absenceClaimsMatch && unexercisedAbsences.length === 0) {
      details.runnerTopologyClass = topologyClass;
      details.topologyCertifying = true;
    } else if (topologyClass === 'PROVEN_DEGRADED' && classMatchesClaim && envelope !== null && absenceClaimsMatch
      && (envelope === 'BWRAP_UNAVAILABLE_DEGRADED' || unexercisedAbsences.length > 0)) {
      details.runnerTopologyClass = topologyClass;
      details.topologyCertifying = false;
    }
  } else {
    details.skipPolicy = value.schemaVersion === 'nightwatch.shard-run-receipt.v1'
      ? shardSkipPolicy(value)
      : normalizeSkipPolicy(value.skipPolicy, value.skipped);
  }
  return details;
}

// ---------------------------------------------------------------------------
// R-11 — durable receipt persistence.
//
// The gate previously emitted its receipt to stdout ONLY. That made the single
// copy of the authoritative evidence destroyable by anything between the gate
// and the reader: OBS-C105-1's failing-group detail was lost to a filter that
// printed `finalResult` and discarded the rest, and the clean-checkout wrapper
// recovered the inner receipt by SCRAPING stdout for a schema token, which any
// child could shadow by printing a matching line.
//
// The remedy is that the gate itself writes the canonical bytes to a confined
// path, atomically, for failures as well as passes. Confinement is the whole
// safety story here: a receipt path is an arbitrary caller-supplied filesystem
// destination, so it is validated BEFORE the gate runs and rejected unless it
// is absolute, traversal-free, outside the repository, inside a permitted
// temporary root, and pointing at a real regular file in a real directory.
// Nothing but the receipt bytes is ever written, and those bytes are already
// allowlisted by `parseCounts`/`parseSafeDetails` above.
// ---------------------------------------------------------------------------


export const GATE_RECEIPT_PATH_ENV = 'NIGHTWATCH_GATE_RECEIPT_PATH';
export const GATE_RECEIPT_DEFAULT_DIRECTORY = 'nightwatch-gate-receipts';
/**
 * R4-07 / review-4 task 1.7 — the repository-local receipt directory the
 * release-evidence verifier reads a `receipt:` digest from. It is gitignored
 * (`artifacts/*`), so persisting there cannot dirty a tracked path.
 */
export const GATE_RECEIPT_REPO_DIRECTORY = 'artifacts/receipts';

/**
 * Git must PROVABLY ignore a repository-local receipt directory before the
 * gate writes there; an unignored path is refused, never guessed at.
 * @param {string} repositoryRoot
 * @param {string} relative
 */
function repositoryPathIsIgnored(repositoryRoot, relative) {
  const result = spawnSync('git', ['check-ignore', '--quiet', '--', relative], {
    cwd: repositoryRoot, shell: false, encoding: 'utf8', timeout: 10_000,
  });
  return result.status === 0;
}

function realPathOrNull(candidate) {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return null;
  }
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * The permitted roots for a receipt destination. Confining to temporary roots
 * is what makes "never writes into a tracked repository path" and "does not
 * dirty a clean checkout" mechanical rather than a promise: `PATCH_INTEGRITY`
 * keeps requiring a clean checkout and is unaffected by anything written here.
 */
export function gateReceiptPermittedRoots(environment = process.env) {
  const roots = [os.tmpdir()];
  // GitHub Actions' per-job temporary directory, so a CI receipt lands in the
  // runner's own scratch rather than in the checkout.
  if (typeof environment.RUNNER_TEMP === 'string' && path.isAbsolute(environment.RUNNER_TEMP)) roots.push(environment.RUNNER_TEMP);
  const resolved = [];
  for (const root of roots) {
    const real = realPathOrNull(root);
    if (real !== null) resolved.push(real);
  }
  return resolved;
}

/**
 * Resolve where this gate run's receipt belongs, or refuse.
 *
 * An explicit `NIGHTWATCH_GATE_RECEIPT_PATH` is honoured only after full
 * validation. With no explicit path a safe default is derived, because the
 * failure mode being eliminated is an operator losing the only copy — a
 * mechanism that must be remembered would not have prevented OBS-C105-1.
 */
export function resolveGateReceiptTarget(options) {
  const { environment = process.env, repositoryRoot, mode, gitHead } = options;
  const requested = environment[GATE_RECEIPT_PATH_ENV];
  const permittedRoots = gateReceiptPermittedRoots(environment);
  if (permittedRoots.length === 0) return { error: 'GATE_RECEIPT_NO_PERMITTED_ROOT' };

  if (typeof requested !== 'string' || requested.trim() === '') {
    const head = typeof gitHead === 'string' && /^[0-9a-f]{40}$/.test(gitHead) ? gitHead.slice(0, 12) : 'unknown-head';
    // R4-07 / review-4 task 1.7: prefer the repository-local, Git-ignored
    // artifacts/receipts directory, because that is exactly where
    // `verifyPersistedReceipt` re-reads a `receipt:` digest. A receipt written
    // only to the operator's tmpdir was never consumable as evidence, so a
    // commit that bound it was classified substantive forever.
    try {
      if (repositoryPathIsIgnored(repositoryRoot, GATE_RECEIPT_REPO_DIRECTORY)) {
        const repoDirectory = path.join(repositoryRoot, GATE_RECEIPT_REPO_DIRECTORY);
        fs.mkdirSync(repoDirectory, { recursive: true, mode: 0o700 });
        const repoReal = realPathOrNull(repoDirectory);
        const rootReal = realPathOrNull(repositoryRoot);
        if (repoReal !== null && rootReal !== null && isWithin(rootReal, repoReal)) {
          return { file: path.join(repoReal, `${String(mode).toLowerCase()}-${head}.json`), origin: 'REPOSITORY_IGNORED' };
        }
      }
    } catch {
      // Any failure falls through to the confined temp-directory default.
    }
    const directory = path.join(permittedRoots[0], GATE_RECEIPT_DEFAULT_DIRECTORY);
    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    } catch {
      return { error: 'GATE_RECEIPT_DEFAULT_DIRECTORY_UNAVAILABLE' };
    }
    return { file: path.join(directory, `${String(mode).toLowerCase()}-${head}.json`), origin: 'DEFAULT' };
  }

  if (!path.isAbsolute(requested)) return { error: 'GATE_RECEIPT_PATH_NOT_ABSOLUTE' };
  // Reject traversal on the LITERAL request, before any normalization can hide
  // it, and reject a directory-shaped request outright.
  if (requested.split(/[\\/]+/).includes('..')) return { error: 'GATE_RECEIPT_PATH_TRAVERSAL' };
  if (requested.endsWith('/') || requested.endsWith(path.sep)) return { error: 'GATE_RECEIPT_PATH_NOT_A_FILE' };

  const parent = path.dirname(requested);
  let parentStat;
  try {
    parentStat = fs.lstatSync(parent);
  } catch {
    return { error: 'GATE_RECEIPT_PATH_PARENT_MISSING' };
  }
  // A symlinked parent could redirect the write out of the permitted root
  // after validation, so it is refused rather than followed.
  if (parentStat.isSymbolicLink()) return { error: 'GATE_RECEIPT_PATH_PARENT_SYMLINK' };
  if (!parentStat.isDirectory()) return { error: 'GATE_RECEIPT_PATH_PARENT_NOT_DIRECTORY' };

  const realParent = realPathOrNull(parent);
  if (realParent === null) return { error: 'GATE_RECEIPT_PATH_PARENT_UNRESOLVABLE' };

  const realRepository = realPathOrNull(repositoryRoot);
  if (realRepository !== null && (realParent === realRepository || isWithin(realRepository, realParent))) {
    return { error: 'GATE_RECEIPT_PATH_INSIDE_REPOSITORY' };
  }
  if (!permittedRoots.some((root) => realParent === root || isWithin(root, realParent))) {
    return { error: 'GATE_RECEIPT_PATH_UNCONFINED' };
  }

  const file = path.join(realParent, path.basename(requested));
  try {
    const destination = fs.lstatSync(file);
    // An existing symlink destination is refused, never followed: following it
    // would write the receipt wherever the link points.
    if (destination.isSymbolicLink()) return { error: 'GATE_RECEIPT_PATH_DESTINATION_SYMLINK' };
    if (!destination.isFile()) return { error: 'GATE_RECEIPT_PATH_DESTINATION_NOT_FILE' };
  } catch {
    // A destination that does not exist yet is the normal case.
  }
  return { file, origin: 'EXPLICIT' };
}

/**
 * Write the canonical receipt bytes atomically.
 *
 * `rename` within one directory is atomic, so a reader observes either the
 * previous receipt or the complete new one — never a truncated prefix that
 * happens to parse. The temporary name is created with an exclusive create so
 * two concurrent gates cannot interleave into one partial file.
 */
export function persistGateReceipt(file, canonicalBytes) {
  const directory = path.dirname(file);
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${Date.now().toString(36)}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, canonicalBytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
    return { status: 'WRITTEN', file };
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* bounded scratch cleanup */ }
    }
    try { fs.unlinkSync(temporary); } catch { /* bounded scratch cleanup */ }
    return { status: 'FAILED', code: `GATE_RECEIPT_WRITE_FAILED_${(error && error.code) || 'UNKNOWN'}` };
  }
}

/**
 * Read a persisted receipt, failing closed.
 *
 * This is the clean-checkout wrapper's replacement for stdout scraping. It
 * requires the schema, a well-formed receipt digest, and — when the caller
 * knows which commit it asked the gate to run at — an exact `gitHead` match,
 * so a receipt left behind by an earlier run cannot be mistaken for this one.
 */
export function readPersistedGateReceipt(file, expected = {}) {
  let raw;
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) return { status: 'FAILED', code: 'GATE_RECEIPT_FILE_NOT_REGULAR' };
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { status: 'FAILED', code: 'GATE_RECEIPT_FILE_UNREADABLE' };
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    // A truncated or otherwise malformed file is never salvaged.
    return { status: 'FAILED', code: 'GATE_RECEIPT_FILE_MALFORMED' };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { status: 'FAILED', code: 'GATE_RECEIPT_FILE_MALFORMED' };
  if (value.schemaVersion !== 'nightwatch.quality-gate-receipt.v1') return { status: 'FAILED', code: 'GATE_RECEIPT_SCHEMA_UNSUPPORTED' };
  if (typeof value.receiptDigest !== 'string' || !/^receipt:sha256:[0-9a-f]{24}$/.test(value.receiptDigest)) return { status: 'FAILED', code: 'GATE_RECEIPT_DIGEST_MALFORMED' };
  if (typeof value.finalResult !== 'string' || !/^[A-Z][A-Z_]{2,63}$/.test(value.finalResult)) return { status: 'FAILED', code: 'GATE_RECEIPT_FINAL_RESULT_MALFORMED' };
  if (typeof expected.gitHead === 'string' && value.gitHead !== expected.gitHead) return { status: 'FAILED', code: 'GATE_RECEIPT_STALE_HEAD' };
  if (typeof expected.environmentClass === 'string' && value.environmentClass !== expected.environmentClass) return { status: 'FAILED', code: 'GATE_RECEIPT_ENVIRONMENT_MISMATCH' };
  return { status: 'READ', receipt: value, bytes: raw };
}
