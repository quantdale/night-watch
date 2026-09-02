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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Structured child receipts the gate understands. Each is a bounded,
// categorical summary emitted by a repository-owned launcher — never raw
// child output.
const STRUCTURED_CHILD_SCHEMAS = new Set([
  'nightwatch.semantic-compatibility.v1',
  'nightwatch.synthetic-campaign.v1',
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
    for (const key of ['total', 'passed', 'skipped', 'didNotRun', 'failed']) {
      if (Number.isInteger(structured[key])) counts[key] = structured[key];
    }
    if (counts.total === null && [counts.passed, counts.skipped, counts.failed].every((item) => Number.isInteger(item))) {
      counts.total = counts.passed + counts.skipped + counts.failed + (Number.isInteger(counts.didNotRun) ? counts.didNotRun : 0);
    }
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
const SAFE_LOCATION_PATTERN = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts:\d+$/;
const SAFE_LANE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

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
