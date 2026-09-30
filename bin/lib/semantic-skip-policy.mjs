// Semantic skip-identity enforcement (nightwatch-validation-classification-and-skip-truth-v1).
//
// Every authoritative Playwright lane consumes the same bounded v2 identity
// report. An allowlist entry is one exact test identity (file + full suite / test
// title path) and a non-empty reason token; file-wide or reasonless entries are
// invalid. The policy is pure over caller-supplied data.

export const SEMANTIC_SKIP_POLICY_VERSION = 'nightwatch.semantic-skip-identity.v2';
export const SKIP_IDENTITY_REPORT_SCHEMA = 'nightwatch.skip-identity-report.v2';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFilePath(value) {
  return typeof value === 'string'
    && /^tests\/(?:unit|smoke|manual)\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes('..');
}

function isTitlePath(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((part) => typeof part === 'string' && part.trim().length > 0);
}

function isValidIdentity(value) {
  return isRecord(value)
    && isFilePath(value.file)
    && isTitlePath(value.titlePath)
    && typeof value.reason === 'string'
    && value.reason.trim().length > 0;
}

function isValidAllowlistEntry(value) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'file,reasonToken,titlePath') return false;
  return isFilePath(value.file)
    && isTitlePath(value.titlePath)
    && typeof value.reasonToken === 'string'
    && value.reasonToken.trim().length > 0;
}

function sameTitlePath(left, right) {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function isDeclared(identity, canonicalSkipIdentities) {
  if (!isValidIdentity(identity)) return false;
  return canonicalSkipIdentities.some((entry) => entry.file === identity.file
    && sameTitlePath(entry.titlePath, identity.titlePath)
    && identity.reason.includes(entry.reasonToken));
}

function evaluateConfiguration(canonicalSkipIdentities, expectedSkipPolicy) {
  if (typeof expectedSkipPolicy !== 'string' || expectedSkipPolicy.trim() === '') {
    return { result: 'SKIP_POLICY_UNCONFIGURED', detail: 'expectedSkipPolicy is absent or empty' };
  }
  if (!Array.isArray(canonicalSkipIdentities)) {
    return { result: 'SKIP_POLICY_UNCONFIGURED', detail: 'canonicalSkipIdentities is absent or not a list' };
  }
  if (!canonicalSkipIdentities.every(isValidAllowlistEntry)) {
    return { result: 'SKIP_POLICY_UNCONFIGURED', detail: 'canonicalSkipIdentities contains an invalid or blanket entry' };
  }
  const identities = new Set();
  for (const entry of canonicalSkipIdentities) {
    const key = JSON.stringify([entry.file, entry.titlePath, entry.reasonToken]);
    if (identities.has(key)) return { result: 'SKIP_POLICY_UNCONFIGURED', detail: 'canonicalSkipIdentities contains a duplicate entry' };
    identities.add(key);
  }
  return null;
}

/**
 * Evaluate the skip policy for one Playwright JSON identity report.
 * Missing and malformed reports are distinct non-pass outcomes.
 */
export function evaluateSemanticSkipIdentityReport({ report, canonicalSkipIdentities, expectedSkipPolicy } = {}) {
  if (report === undefined || report === null) {
    return { result: 'SKIP_REPORT_MISSING', skipped: 0, undeclared: [], detail: 'skip identity report is missing' };
  }
  if (!isRecord(report) || report.schemaVersion !== SKIP_IDENTITY_REPORT_SCHEMA || !Array.isArray(report.skips)) {
    return { result: 'SKIP_REPORT_INVALID', skipped: 0, undeclared: [], detail: 'skip identity report has an unsupported shape' };
  }
  return evaluateSemanticSkipPolicyIdentities({
    identities: report.skips,
    canonicalSkipIdentities,
    expectedSkipPolicy,
  });
}

/**
 * Evaluate pre-collected v2 skip identities (for lane runners).
 * Returns PASS only when every skip is exactly allowlisted and reasoned.
 */
export function evaluateSemanticSkipPolicyIdentities({ identities, canonicalSkipIdentities, expectedSkipPolicy } = {}) {
  const invalid = evaluateConfiguration(canonicalSkipIdentities, expectedSkipPolicy);
  if (invalid !== null) {
    return { result: invalid.result, skipped: 0, undeclared: [], detail: invalid.detail };
  }
  if (!Array.isArray(identities)) {
    return { result: 'SKIP_REPORT_INVALID', skipped: 0, undeclared: [], detail: 'skip identities are not a list' };
  }
  const undeclared = identities.filter((identity) => !isDeclared(identity, canonicalSkipIdentities));
  return {
    result: undeclared.length === 0 ? 'PASS' : 'UNDECLARED_SKIP',
    skipped: identities.length,
    undeclared,
    declared: identities.length - undeclared.length,
  };
}

/**
 * RV-15 / corrections task 7.12 — a lane has TWO independent counts of skipped
 * tests: the list reporter's `N skipped` summary and the skip-identity report's
 * length. They observe the same run, so they must agree; a lane that trusted
 * only the identity report could not see a skip the reporter never recorded,
 * nor one it invented. The list reporter prints nothing when no test skipped,
 * so an absent reporter count is zero. An unusable identity count is
 * unverifiable, never agreement.
 *
 * @param {number | null | undefined} reporterSkipped
 * @param {number | null | undefined} identityReportSkipped
 * @returns {null | 'SKIP_COUNT_MISMATCH' | 'SKIP_COUNT_UNVERIFIABLE'} null when they agree
 */
export function skipCountDisagreement(reporterSkipped, identityReportSkipped) {
  if (!Number.isInteger(identityReportSkipped)) return 'SKIP_COUNT_UNVERIFIABLE';
  const reporter = Number.isInteger(reporterSkipped) ? reporterSkipped : 0;
  return reporter === identityReportSkipped ? null : 'SKIP_COUNT_MISMATCH';
}

// R3-13 / corrections task 8.12 — the VC-01 per-test CI proof: the four
// browser-backed DEV-login tests must have EXECUTED (passed) in this lane, as
// recorded per test in the published identity report.
export const VC01_REQUIRED_TITLES = Object.freeze([
  'source-approved login helper fills the synthetic form once without evidence plumbing',
  'a replaced login document invalidates the one-shot binding before secret input',
  'a changed form action invalidates the one-shot binding',
  'non-DEV target is rejected before the credential provider is consulted',
]);

/**
 * @param {unknown} report
 * @returns {string | null} a failure code, or null when every VC-01 test ran
 */
export function vc01ExecutionFailure(report) {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) return 'VC01_EXECUTION_REPORT_MISSING';
  const record = /** @type {Record<string, unknown>} */ (report);
  const executed = Array.isArray(record.executedSecurity)
    ? /** @type {Array<{ file?: unknown, titlePath?: unknown }>} */ (record.executedSecurity)
    : null;
  if (executed === null) return 'VC01_EXECUTION_UNRECORDED';
  const titles = new Set();
  for (const entry of executed) {
    if (entry === null || typeof entry !== 'object') continue;
    const pathParts = Array.isArray(entry.titlePath) ? entry.titlePath.filter((part) => typeof part === 'string') : [];
    if (pathParts.length > 0) titles.add(pathParts.join(' > '));
  }
  for (const required of VC01_REQUIRED_TITLES) {
    if (![...titles].some((title) => title.endsWith(required))) return `VC01_EXECUTION_MISSING:${required}`;
  }
  return null;
}
