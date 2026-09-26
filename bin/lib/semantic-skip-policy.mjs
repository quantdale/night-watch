// Semantic skip identity — the enforcement of
// `config/semantic-compatibility.v1.json` `execution.expectedSkipPolicy`.
//
// The policy string was declared but never read: Playwright exit 0 set
// `result: PASS` even when a cone suite skipped because a disposable snapshot
// was absent. Playwright's JSON report is the identity source; the allowlist
// is data (`{ file, reasonToken }`).
//
// Pure: the caller supplies the parsed report and the allowlist.

export const SEMANTIC_SKIP_POLICY_VERSION = 'nightwatch.semantic-skip-identity.v1';

function walkTests(report) {
  const tests = [];
  const visit = (suite) => {
    for (const spec of suite?.specs ?? []) {
      for (const test of spec?.tests ?? []) {
        tests.push({
          file: typeof spec.file === 'string' ? spec.file : '',
          line: typeof spec.line === 'number' ? spec.line : null,
          title: typeof spec.title === 'string' ? spec.title : '',
          status: test?.status,
          annotations: Array.isArray(test?.annotations) ? test.annotations : [],
        });
      }
    }
    for (const child of suite?.suites ?? []) visit(child);
  };
  for (const suite of report?.suites ?? []) visit(suite);
  return tests;
}

/** Skipped tests with their identity: file, line, title and skip reason. */
export function collectSkippedIdentities(report) {
  return walkTests(report)
    .filter((test) => test.status === 'skipped')
    .map((test) => {
      const skipAnnotation = test.annotations.find((annotation) => annotation?.type === 'skip');
      const reason = typeof skipAnnotation?.description === 'string' ? skipAnnotation.description.trim() : '';
      return { file: test.file, line: test.line, title: test.title, reason };
    });
}

function isDeclared(identity, canonicalSkipIdentities) {
  return canonicalSkipIdentities.some((entry) => {
    if (entry === null || typeof entry !== 'object') return false;
    if (entry.file !== identity.file) return false;
    const token = typeof entry.reasonToken === 'string' ? entry.reasonToken : '';
    if (token === '') return true;
    return identity.reason.includes(token) || identity.title.includes(token);
  });
}

/**
 * Evaluate the skip policy for one Playwright JSON report.
 * Returns `result` = PASS | UNDECLARED_SKIP | SKIP_POLICY_UNCONFIGURED.
 */
export function evaluateSemanticSkipPolicy({ report, canonicalSkipIdentities, expectedSkipPolicy } = {}) {
  return evaluateSemanticSkipPolicyIdentities({
    identities: collectSkippedIdentities(report),
    canonicalSkipIdentities,
    expectedSkipPolicy,
  });
}

/**
 * D-10 / 4.6 — the same policy over pre-collected skip identities (the
 * per-shard skip-identity report path).
 */
export function evaluateSemanticSkipPolicyIdentities({ identities, canonicalSkipIdentities, expectedSkipPolicy } = {}) {
  if (typeof expectedSkipPolicy !== 'string' || expectedSkipPolicy.trim() === '') {
    return { result: 'SKIP_POLICY_UNCONFIGURED', skipped: 0, undeclared: [], detail: 'expectedSkipPolicy is absent or empty' };
  }
  if (!Array.isArray(canonicalSkipIdentities)) {
    return { result: 'SKIP_POLICY_UNCONFIGURED', skipped: 0, undeclared: [], detail: 'canonicalSkipIdentities is absent or not a list' };
  }
  const collected = Array.isArray(identities) ? identities : [];
  const undeclared = collected.filter((identity) => !isDeclared(identity, canonicalSkipIdentities));
  return {
    result: undeclared.length === 0 ? 'PASS' : 'UNDECLARED_SKIP',
    skipped: collected.length,
    undeclared,
    declared: collected.length - undeclared.length,
  };
}
