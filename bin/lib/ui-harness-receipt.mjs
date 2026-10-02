// @ts-check

/**
 * VD-02 / corrections task 4.2 (design D3) — the G18 UI-harness execution
 * receipt. The UI_GATE group runs the Control Center vitest suite with the
 * receipt reporter (`ui/control-center/scripts/receipt-reporter.mjs`), which
 * calls `buildUiHarnessReceipt` after the run and writes the result under the
 * gitignored artifacts/ scratch. `project:check` consumes it through
 * `evaluateUiHarnessReceipt`.
 *
 * The receipt records EXECUTION, not file presence: the recorded outcome of
 * every test in the F-18 differential render harness file, the git identity
 * and tree state the run executed at, and the ApiErrorKind member list the
 * harness was driven over. A receipt from a dirty tree, with a failing or
 * missing harness test, or bound to another commit can never resolve MET.
 *
 * Privacy: only tracked test titles, closed status tokens, integers and the
 * committed ApiErrorKind member names are recorded — never an assertion
 * message, DOM, stack or environment value.
 *
 * Pure: no filesystem, process, network or clock authority.
 */

import { createHash } from 'node:crypto';

export const UI_HARNESS_RECEIPT_SCHEMA = 'nightwatch.ui-harness-receipt.v1';
/** The env marker the UI_CONTROL_CENTER quality-gate group sets for its child. */
export const UI_HARNESS_WRITER_LANE = 'ui-gate';
export const UI_HARNESS_RECEIPT_PATH = 'artifacts/receipts/ui-harness-receipt.v1.json';
/** The harness file, relative to ui/control-center. */
export const UI_HARNESS_FILE = 'src/contractRender.test.tsx';
export const UI_HARNESS_SUITE = 'F-18 failure-path differential render harness';
export const UI_HARNESS_TYPES_PATH = 'ui/control-center/src/types.ts';
/**
 * Tests whose EXECUTED pass the G18 claim needs: the per-kind drive with the
 * distinctness gate, the derived-member coverage assertion, the no-server-
 * content rule, the mutation proof, and the tracked DOM baseline. Matching is
 * by title prefix inside the named suite, so a renamed or removed test is a
 * missing test (fail closed), never a silent pass.
 */
export const UI_HARNESS_REQUIRED_TESTS = Object.freeze([
  { suite: UI_HARNESS_SUITE, titlePrefix: 'drives every view through every ApiErrorKind member' },
  { suite: UI_HARNESS_SUITE, titlePrefix: 'derives the coverage assertion from the members of ApiErrorKind' },
  { suite: UI_HARNESS_SUITE, titlePrefix: 'renders no server-supplied message' },
  { suite: UI_HARNESS_SUITE, titlePrefix: 'mutation proof: a collapsed generic error state' },
  { suite: 'control center render truth', titlePrefix: 'preserves the rendered DOM of every view across the decomposition' },
]);
const STATUSES = new Set(['PASS', 'FAIL', 'SKIPPED', 'OTHER']);
const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {unknown} state
 * @returns {'PASS' | 'FAIL' | 'SKIPPED' | 'OTHER'}
 */
function normalizeStatus(state) {
  if (state === 'pass' || state === 'passed') return 'PASS';
  if (state === 'fail' || state === 'failed') return 'FAIL';
  if (state === 'skip' || state === 'skipped' || state === 'todo') return 'SKIPPED';
  return 'OTHER';
}

/**
 * The ApiErrorKind member names declared in the committed types source.
 * @param {string} typesSource
 * @returns {string[] | null}
 */
export function extractApiErrorKinds(typesSource) {
  const list = /export const API_ERROR_KINDS = \[([^\]]+)\] as const;/.exec(typesSource);
  if (list === null) return null;
  const kinds = (list[1] ?? '').match(/'([A-Z_]+)'/g) ?? [];
  const names = kinds.map((entry) => entry.slice(1, -1));
  return names.length === 0 ? null : names;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : null;
}

/**
 * Flatten a vitest task tree into leaf tests with their enclosing suite path.
 * @param {ReadonlyArray<unknown>} tasks
 * @param {string[]} suitePath
 * @param {Array<{ suite: string, title: string, status: 'PASS' | 'FAIL' | 'SKIPPED' | 'OTHER' }>} out
 */
function flatten(tasks, suitePath, out) {
  for (const entry of tasks) {
    const task = asRecord(entry);
    if (task === null) continue;
    if (task.type === 'suite' && Array.isArray(task.tasks)) {
      flatten(task.tasks, [...suitePath, String(task.name)], out);
    } else if (task.type === 'test') {
      out.push({ suite: suitePath.join(' > '), title: String(task.name), status: normalizeStatus(asRecord(task.result)?.state ?? task.mode) });
    }
  }
}

/**
 * R3-06 / corrections task 8.5 — the number of leaf tests the harness source
 * declares. The receipt's recorded harness test count must equal this at S, so
 * a hand-written receipt cannot claim tests the committed harness never had.
 * @param {string | null} source
 * @returns {number | null} null when the source is unavailable
 */
export function countHarnessTests(source) {
  if (typeof source !== 'string' || source === '') return null;
  const matches = source.match(/^\s*(?:it|test)\(/gm);
  return matches === null ? 0 : matches.length;
}

/**
 * The receipt's own content digest: sha256 over the canonical receipt body
 * (sorted keys) without the digest field. Verified at read.
 * @param {Record<string, unknown>} body
 * @returns {string}
 */
export function uiHarnessReceiptDigest(body) {
  const clone = { ...body };
  delete clone.receiptDigest;
  // R5-14: the digest carries the `receipt:` prefix the release-evidence verifier selects the
  // receipt kind by; the unprefixed form was refused as RECEIPT_KIND_UNSUPPORTED.
  return `receipt:sha256:${createHash('sha256').update(canonicalJson(clone)).digest('hex').slice(0, 24)}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(/** @type {Record<string, unknown>} */ (value)[key])}`).join(',')}}`;
}

/**
 * @param {{
 *   files: ReadonlyArray<unknown>,
 *   headSha: string | null,
 *   treeClean: boolean | null,
 *   typesSource: string | null,
 *   harnessSource: string | null,
 *   executedAt: string,
 * }} input
 * @returns {Record<string, unknown> | null} null when the harness file did not run
 */
export function buildUiHarnessReceipt(input) {
  const suiteTotals = { files: 0, tests: 0, passed: 0, failed: 0, skipped: 0 };
  /** @type {Array<{ suite: string, title: string, status: 'PASS' | 'FAIL' | 'SKIPPED' | 'OTHER' }>} */
  let harnessTests = [];
  let harnessRan = false;
  for (const file of input.files) {
    suiteTotals.files += 1;
    /** @type {Array<{ suite: string, title: string, status: 'PASS' | 'FAIL' | 'SKIPPED' | 'OTHER' }>} */
    const tests = [];
    const fileRecord = asRecord(file);
    flatten(Array.isArray(fileRecord?.tasks) ? fileRecord.tasks : [], [], tests);
    for (const test of tests) {
      suiteTotals.tests += 1;
      if (test.status === 'PASS') suiteTotals.passed += 1;
      else if (test.status === 'FAIL') suiteTotals.failed += 1;
      else suiteTotals.skipped += 1;
    }
    const filepath = typeof fileRecord?.filepath === 'string' ? fileRecord.filepath.replace(/\\/g, '/') : '';
    if (filepath.endsWith(`/${UI_HARNESS_FILE}`)) {
      harnessRan = true;
      harnessTests = tests;
    }
  }
  if (!harnessRan) return null;
  const harnessSource = typeof input.harnessSource === 'string' && input.harnessSource !== '' ? input.harnessSource : null;
  const body = {
    schemaVersion: UI_HARNESS_RECEIPT_SCHEMA,
    // R4-03 / review-4 task 1.3: the subject this receipt was produced for,
    // so a UI receipt can never be bound to a different subject's condition.
    subject: 'ui-error-taxonomy-rendering',
    nightwatchSha: typeof input.headSha === 'string' && SHA_RE.test(input.headSha) ? input.headSha.toLowerCase() : null,
    treeClean: input.treeClean === true,
    // R5-14: the verdict field the verifier requires. PASS only when at least one harness test ran and
    // every one passed; the evaluator re-derives it from the recorded tests, never trusts it.
    result: harnessTests.length > 0 && harnessTests.every((test) => test.status === 'PASS') ? 'PASS' : 'FAIL',
    executedAt: input.executedAt,
    harness: { file: UI_HARNESS_FILE, tests: harnessTests },
    // R3-06 / corrections task 8.5: the receipt is tied to the harness CONTENT
    // that executed, not merely to its path.
    harnessDigest: harnessSource === null ? null : `sha256:${createHash('sha256').update(harnessSource).digest('hex').slice(0, 24)}`,
    suiteTotals,
    apiErrorKinds: input.typesSource === null ? null : extractApiErrorKinds(input.typesSource),
  };
  return { ...body, receiptDigest: uiHarnessReceiptDigest(body) };
}

/**
 * Strict, fail-closed evaluation of a persisted receipt against the certified
 * checkpoint and the ApiErrorKind member list committed AT that checkpoint.
 *
 * @param {unknown} raw
 * @param {{
 *   certifiedCheckpointSha: string | null,
 *   expectedKinds: readonly string[] | null,
 *   harnessSourceAtS?: string | null,
 * }} context
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   relation: 'BOUND' | 'BOUND_TO_OTHER' | 'INVALID',
 *   summary: { sha: string, harnessTests: number, totalTests: number, kinds: number } | null,
 * }}
 */
export function evaluateUiHarnessReceipt(raw, context) {
  /** @type {string[]} */
  const errors = [];
  const record = asRecord(raw);
  if (record === null) {
    return { ok: false, errors: ['UI_HARNESS_RECEIPT_UNAVAILABLE'], relation: 'INVALID', summary: null };
  }
  if (record.schemaVersion !== UI_HARNESS_RECEIPT_SCHEMA) errors.push(`UI_HARNESS_RECEIPT_SCHEMA_UNSUPPORTED:${String(record.schemaVersion)}`);
  // R3-06 / corrections task 8.5: the content digest is re-derived at read;
  // a hand-written receipt that edits any recorded field fails here.
  if (typeof record.receiptDigest !== 'string') {
    errors.push('UI_HARNESS_RECEIPT_DIGEST_MISSING');
  } else if (record.receiptDigest !== uiHarnessReceiptDigest(record)) {
    errors.push('UI_HARNESS_RECEIPT_DIGEST_MISMATCH');
  }
  const recordedSha = record.nightwatchSha;
  if (typeof recordedSha !== 'string' || !SHA_RE.test(recordedSha)) errors.push('UI_HARNESS_RECEIPT_SHA_INVALID');
  if (record.treeClean !== true) errors.push('UI_HARNESS_RECEIPT_TREE_NOT_CLEAN');
  const harness = asRecord(record.harness);
  if (harness?.file !== UI_HARNESS_FILE) errors.push('UI_HARNESS_RECEIPT_FILE_MISMATCH');
  /** @type {Array<{ suite: string, title: string, status: string }>} */
  const tests = [];
  let malformed = false;
  for (const entry of Array.isArray(harness?.tests) ? harness.tests : []) {
    const test = asRecord(entry);
    if (test === null || typeof test.title !== 'string' || typeof test.suite !== 'string' || typeof test.status !== 'string' || !STATUSES.has(test.status)) {
      malformed = true;
      break;
    }
    tests.push({ suite: test.suite, title: test.title, status: test.status });
  }
  if (malformed) errors.push('UI_HARNESS_RECEIPT_TEST_MALFORMED');
  // R5-14: the recorded verdict must equal the one the recorded tests derive.
  const derivedResult = tests.length > 0 && !malformed && tests.every((test) => test.status === 'PASS') ? 'PASS' : 'FAIL';
  if (record.result !== derivedResult) errors.push(`UI_HARNESS_RECEIPT_RESULT_MISMATCH:${String(record.result)}`);
  if (tests.length === 0) {
    errors.push('UI_HARNESS_RECEIPT_NO_HARNESS_TESTS');
  } else if (!malformed) {
    const failing = tests.filter((test) => test.status !== 'PASS').length;
    if (failing > 0) errors.push(`UI_HARNESS_RECEIPT_HARNESS_TEST_NOT_PASSED:${failing}`);
    for (const required of UI_HARNESS_REQUIRED_TESTS) {
      const found = tests.find((test) => test.suite.endsWith(required.suite) && test.title.startsWith(required.titlePrefix));
      if (found === undefined) errors.push(`UI_HARNESS_RECEIPT_REQUIRED_TEST_MISSING:${required.titlePrefix}`);
      else if (found.status !== 'PASS') errors.push(`UI_HARNESS_RECEIPT_REQUIRED_TEST_NOT_PASSED:${required.titlePrefix}`);
    }
  }
  const totals = asRecord(record.suiteTotals);
  const totalTests = typeof totals?.tests === 'number' && Number.isInteger(totals.tests) ? totals.tests : 0;
  if (totals === null || totalTests < 1) {
    errors.push('UI_HARNESS_RECEIPT_TOTALS_INVALID');
  } else if (totals.failed !== 0) {
    errors.push(`UI_HARNESS_RECEIPT_SUITE_FAILED:${String(totals.failed)}`);
  } else if (tests.length > 0 && totalTests < tests.length) {
    // R3-06: the suite totals must at least cover the harness tests they claim.
    errors.push(`UI_HARNESS_RECEIPT_TOTALS_LT_HARNESS:${totalTests}:${tests.length}`);
  }
  // R3-06 / corrections task 8.5: the harness digest and the test count are
  // cross-checked against the harness source committed AT S.
  const harnessSourceAtS = typeof context.harnessSourceAtS === 'string' && context.harnessSourceAtS !== '' ? context.harnessSourceAtS : null;
  if (harnessSourceAtS === null) {
    errors.push('UI_HARNESS_RECEIPT_HARNESS_SOURCE_UNAVAILABLE');
  } else {
    const expectedHarnessDigest = `sha256:${createHash('sha256').update(harnessSourceAtS).digest('hex').slice(0, 24)}`;
    if (record.harnessDigest !== expectedHarnessDigest) errors.push('UI_HARNESS_RECEIPT_HARNESS_DIGEST_MISMATCH');
    const expectedCount = countHarnessTests(harnessSourceAtS);
    if (expectedCount !== null && tests.length !== expectedCount) {
      errors.push(`UI_HARNESS_RECEIPT_HARNESS_TEST_COUNT_MISMATCH:${tests.length}:${expectedCount}`);
    }
  }
  const recordedKinds = Array.isArray(record.apiErrorKinds) ? record.apiErrorKinds : [];
  const expectedKinds = context.expectedKinds;
  if (recordedKinds.length === 0) {
    errors.push('UI_HARNESS_RECEIPT_KINDS_MISSING');
  } else if (expectedKinds === null) {
    errors.push('UI_HARNESS_RECEIPT_EXPECTED_KINDS_UNAVAILABLE');
  } else if (recordedKinds.length !== expectedKinds.length || recordedKinds.some((kind, index) => kind !== expectedKinds[index])) {
    errors.push('UI_HARNESS_RECEIPT_KINDS_DRIFT');
  }
  if (errors.length > 0 || typeof recordedSha !== 'string') return { ok: false, errors, relation: 'INVALID', summary: null };
  const sha = recordedSha.toLowerCase();
  const certified = context.certifiedCheckpointSha;
  const relation = typeof certified === 'string' && SHA_RE.test(certified) && certified.toLowerCase() === sha ? 'BOUND' : 'BOUND_TO_OTHER';
  return { ok: true, errors: [], relation, summary: { sha, harnessTests: tests.length, totalTests, kinds: recordedKinds.length } };
}
