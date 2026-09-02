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
