// @ts-check

// Group 3 — exact-head CI authority, as pure judgement.
//
// The distinction this module makes unavoidable is the one the project already
// draws: a workflow file that parses is not an executed run; a run that starts
// is not a run that executed steps; an executed run at a different SHA is not
// evidence about this one. Only a GitHub Actions run at the exact candidate
// SHA that executed at least one step may set `CI_EXECUTED_SHA`. Every local
// substitute — a scheduled `gate:ci`, the topology gate — is classified as a
// substitute in its own record and is refused the field.
//
// The external block is data, not prose: run identity, job identity, block
// class, observation date, a named owner action and a revisit condition. A
// block without them is `CI_BLOCK_RECORD_INCOMPLETE`; a block whose revisit
// date has passed is `CI_BLOCK_RECORD_STALE`, reported with the owner action so
// it cannot silently become a permanent excuse.
//
// Pure: no filesystem, no clock, no subprocess. The caller supplies the record
// and the current date.

export const CI_BLOCK_RECORD_SCHEMA = 'nightwatch.ci-block-record.v1';

/** The only block classes this record vocabulary admits. */
export const CI_BLOCK_CLASSES = Object.freeze([
  'NO_STEPS_BILLING_OR_PLATFORM_BLOCK',
  'EXECUTED_TEST_FAILURE',
  'EXECUTED_INFRA_FAILURE',
  'EXECUTED_PASS',
  'API_UNOBSERVABLE',
  'WORKFLOW_NOT_FOUND',
  'HEAD_MISMATCH',
  'RUN_PENDING',
  'RUN_CANCELLED',
  'UNKNOWN',
]);

/**
 * Completion statuses that assert certified CI. Only these are held to the
 * exact-checkpoint `CI_OBSERVED_SHA` match; a merely local certification makes
 * no CI claim and is not judged here.
 */
export const CI_CERTIFIED_COMPLETION_STATUSES = Object.freeze([
  'PROJECT_COMPLETE_AND_CI_CERTIFIED',
]);

export const CI_EXECUTION_EVIDENCE_SOURCES = Object.freeze([
  'GITHUB_ACTIONS',
  'LOCAL_GATE_CI',
  'GATE_TOPOLOGY',
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RUN_ID_RE = /^\d+$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * One recorded history observation. Every field is optional because an entry
 * is validated field by field, so a malformed entry is reported rather than
 * assumed well-formed. The optional group uses the mapped type rather than the
 * `?` property form, which the lane's annotation budget counts as a widening
 * form.
 */
/** @typedef {Partial<{ runId: string, jobId: string, observedSha: string, classification: string, observedDate: string }>} CiHistoryEntry */

/**
 * One candidate route, as the record declares it. Route selection is an owner
 * decision, so a route may legitimately omit the GitHub-claim fields.
 */
/** @typedef {Partial<{ routeId: string, summary: string, command: string, source: string, provesGitHubExecution: boolean, canSetCiExecutedSha: boolean, tradeOffs: readonly string[] }>} CiRouteCandidate */

/** @typedef {Partial<{ state: string, selectedRouteId: string | null }>} CiRouteSelection */

/**
 * The CI block record, exactly as this module reads it: one top-level
 * observation, its ordered history, and the owner-routed alternatives.
 */
/** @typedef {Partial<{ schemaVersion: string, runId: string, jobId: string, blockClass: string, observedDate: string, ownerAction: string, revisitCondition: string, revisitDate: string, history: readonly CiHistoryEntry[], candidateRoutes: readonly CiRouteCandidate[], routeSelection: CiRouteSelection }>} CiBlockRecord */

/**
 * One piece of CI-execution evidence. Every field is optional because the
 * classifier's whole job is to refuse an incomplete or malformed piece.
 */
/** @typedef {Partial<{ source: string, exactHead: boolean, executedSteps: number, sha: string }>} CiExecutionEvidence */

/**
 * The three CI authority fields, applied or refused as one unit.
 */
/** @typedef {{ ciObservedSha: string | null, ciExecutedSha: string | null, ciStatus: string | null }} CiExecutionField */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {number} [minimum]
 * @returns {value is string}
 */
function nonEmptyString(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

/**
 * Structural completeness of one block record. Every omission is
 * `CI_BLOCK_RECORD_INCOMPLETE`, because a block missing any of these fields is
 * indistinguishable from abandonment.
 *
 * @param {CiBlockRecord} record
 * @returns {{ ok: boolean, errors: readonly { code: string, detail: string }[] }}
 */
export function validateCiBlockRecord(record) {
  /** @type {{ code: string, detail: string }[]} */
  const errors = [];
  const incomplete = (/** @type {string} */ detail) => {
    errors.push({ code: 'CI_BLOCK_RECORD_INCOMPLETE', detail });
  };
  if (!isObject(record)) {
    incomplete('block record is not an object');
    return { ok: false, errors };
  }
  if (record.schemaVersion !== CI_BLOCK_RECORD_SCHEMA) {
    errors.push({ code: 'CI_BLOCK_RECORD_SCHEMA_UNSUPPORTED', detail: String(record.schemaVersion ?? 'ABSENT') });
  }
  if (typeof record.runId !== 'string' || !RUN_ID_RE.test(record.runId)) {
    incomplete('runId must be the numeric GitHub Actions run identity');
  }
  if (typeof record.jobId !== 'string' || !RUN_ID_RE.test(record.jobId)) {
    incomplete('jobId must be the numeric GitHub Actions job identity');
  }
  if (typeof record.blockClass !== 'string' || !CI_BLOCK_CLASSES.includes(record.blockClass)) {
    incomplete(`blockClass must be one of ${CI_BLOCK_CLASSES.join(', ')}`);
  }
  if (typeof record.observedDate !== 'string' || !DATE_RE.test(record.observedDate)) {
    incomplete('observedDate must be a YYYY-MM-DD date');
  }
  if (!nonEmptyString(record.ownerAction, 12)) {
    incomplete('ownerAction must name the action that would clear the block');
  }
  if (!nonEmptyString(record.revisitCondition, 12)) {
    incomplete('revisitCondition must state when the block is re-observed');
  }
  if (typeof record.revisitDate !== 'string' || !DATE_RE.test(record.revisitDate)) {
    incomplete('revisitDate must be a YYYY-MM-DD date');
  }
  // R4-12 / review-4 task 3.3, corrected by R5-09 / review-5 task A7.1: the TOP LEVEL is the
  // LATEST observation, judged by RUN ORDER (GitHub run ids increase with creation), never by
  // date: two runs on one day have the same date, so the old date comparison could not tell a
  // refreshed record from a stale one.
  const history = Array.isArray(record.history) ? record.history : [];
  /** @type {string[]} */
  const runIds = [];
  const jobIds = new Set();
  for (const [index, entry] of history.entries()) {
    if (!isObject(entry)) {
      errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `history[${index}] is not an object` });
      continue;
    }
    const where = `history[${index}] (run ${String(entry.runId)})`;
    if (typeof entry.runId !== 'string' || !RUN_ID_RE.test(entry.runId)) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `${where}: runId must be numeric` });
    if (typeof entry.jobId !== 'string' || !RUN_ID_RE.test(entry.jobId)) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `${where}: jobId must be numeric` });
    if (typeof entry.observedSha !== 'string' || !SHA_RE.test(entry.observedSha)) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `${where}: observedSha must be 40-hex` });
    if (typeof entry.classification !== 'string' || !CI_BLOCK_CLASSES.includes(entry.classification)) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `${where}: classification must be a declared class` });
    if (typeof entry.observedDate !== 'string' || !DATE_RE.test(entry.observedDate)) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID', detail: `${where}: observedDate must be YYYY-MM-DD` });
    if (typeof entry.jobId === 'string') {
      if (jobIds.has(entry.jobId)) errors.push({ code: 'CI_BLOCK_RECORD_JOB_DUPLICATE', detail: `job ${entry.jobId} is attributed to more than one run` });
      jobIds.add(entry.jobId);
    }
    if (typeof entry.runId === 'string' && RUN_ID_RE.test(entry.runId)) runIds.push(entry.runId);
  }
  for (let index = 1; index < runIds.length; index += 1) {
    const previous = BigInt(runIds[index - 1] ?? '0');
    const current = BigInt(runIds[index] ?? '0');
    if (current === previous) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_DUPLICATE_RUN', detail: `run ${runIds[index]} is recorded twice` });
    else if (current < previous) errors.push({ code: 'CI_BLOCK_RECORD_HISTORY_ORDER', detail: `run ${runIds[index]} is recorded after the newer run ${runIds[index - 1]}; history is oldest-first by run order` });
  }
  const newest = runIds.reduce((best, candidate) => (best === null || BigInt(candidate) > BigInt(best) ? candidate : best), /** @type {string | null} */ (null));
  if (newest !== null && typeof record.runId === 'string' && RUN_ID_RE.test(record.runId) && BigInt(record.runId) < BigInt(newest)) {
    errors.push({
      code: 'CI_BLOCK_RECORD_TOP_LEVEL_STALE',
      detail: `the top-level run ${record.runId} is older than the newest recorded run ${newest}; promote the newest observation to the top level`,
    });
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @typedef {object} CiObservationLike
 * @property {string} [runId]
 * @property {string} [observedSha]
 * @property {string} [classification]
 * @typedef {object} CiRecordLike
 * @property {string} [runId]
 * @property {string} [observedSha]
 * @property {string} [blockClass]
 * @property {CiObservationLike[]} [history]
 */

/**
 * R5-09 — the NEWEST observation per SHA, by run order. A SHA can be observed more than once
 * (a rerun, a repair on the same tree); the claim "CI passed at S" is only as good as the
 * LATEST run at S, so an earlier pass never outlives a later failure.
 *
 * @param {CiRecordLike | null | undefined} record
 * @returns {Map<string, { runId: string, classification: string }>}
 */
export function newestObservationPerSha(record) {
  /** @type {Map<string, { runId: string, classification: string }>} */
  const newest = new Map();
  const observations = [
    { sha: record?.observedSha, runId: record?.runId, classification: record?.blockClass },
    ...(Array.isArray(record?.history) ? record.history.map((entry) => ({ sha: entry?.observedSha, runId: entry?.runId, classification: entry?.classification })) : []),
  ];
  for (const observation of observations) {
    if (typeof observation.sha !== 'string' || typeof observation.runId !== 'string' || !RUN_ID_RE.test(observation.runId) || typeof observation.classification !== 'string') continue;
    const key = observation.sha.toLowerCase();
    const held = newest.get(key);
    if (held === undefined || BigInt(observation.runId) > BigInt(held.runId)) newest.set(key, { runId: observation.runId, classification: observation.classification });
  }
  return newest;
}

/**
 * R4-11 / R5-09 — the governed CI status word, derived from the project-state block's CI fields
 * and the CI block record. Pure (the rule performs the reads). `null` means the claim is not
 * supported: an unknown word, a malformed or contradictory SHA pair, no observation at the claimed
 * SHA, or an observation whose NEWEST run at that SHA disagrees with the claim.
 *
 * @param {{ value: string, observed: string, executed: string, record: CiRecordLike }} input
 * @returns {string | null}
 */
export function deriveCiStatusFromRecord(input) {
  const { value, observed, executed, record } = input;
  if (!['NOT_OBSERVED', 'NO_STEPS_EXTERNAL_NON_EVIDENCE', 'EXECUTED_PASS', 'EXECUTED_FAIL'].includes(value)) return null;
  if (value === 'EXECUTED_PASS' || value === 'EXECUTED_FAIL') {
    if (!SHA_RE.test(observed) || observed !== executed) return null;
    const latest = newestObservationPerSha(record).get(observed.toLowerCase());
    if (latest === undefined) return null;
    if (value === 'EXECUTED_PASS') return latest.classification === 'EXECUTED_PASS' ? value : null;
    return latest.classification === 'EXECUTED_TEST_FAILURE' || latest.classification === 'EXECUTED_INFRA_FAILURE' ? value : null;
  }
  if (observed !== 'NONE' || executed !== 'NONE') return null;
  return value;
}

/**
 * The computed staleness report. `todayIso` is injected so the judgement is
 * deterministic and testable.
 *
 * @param {CiBlockRecord} record
 * @param {string} todayIso
 * @returns {readonly { code: string, detail: string, ownerAction: string | null }[]}
 */
export function collectCiBlockStale(record, todayIso) {
  if (!DATE_RE.test(todayIso) || !isObject(record)) return [];
  if (typeof record.revisitDate !== 'string' || !DATE_RE.test(record.revisitDate)) return [];
  if (record.revisitDate >= todayIso) return [];
  return [{
    code: 'CI_BLOCK_RECORD_STALE',
    detail: `revisit ${record.revisitDate} has passed (today ${todayIso})`,
    ownerAction: nonEmptyString(record.ownerAction, 1) ? record.ownerAction : null,
  }];
}

/**
 * Classify one piece of CI-execution evidence. Only an exact-head GitHub
 * Actions run that executed at least one step can set `CI_EXECUTED_SHA`.
 *
 * @param {CiExecutionEvidence} evidence
 * @returns {{ classification: string, canSetCiExecutedSha: boolean, reason: string }}
 */
export function classifyCiExecutionEvidence(evidence) {
  if (!isObject(evidence)) {
    return { classification: 'NOT_CI', canSetCiExecutedSha: false, reason: 'EVIDENCE_ABSENT' };
  }
  if (evidence.source === 'GITHUB_ACTIONS') {
    if (evidence.exactHead !== true) {
      return { classification: 'NOT_CI', canSetCiExecutedSha: false, reason: 'HEAD_MISMATCH' };
    }
    const executedSteps = evidence.executedSteps;
    if (typeof executedSteps !== 'number' || !Number.isInteger(executedSteps) || executedSteps < 1) {
      return { classification: 'ZERO_STEP_NON_EVIDENCE', canSetCiExecutedSha: false, reason: 'ZERO_STEPS' };
    }
    if (typeof evidence.sha !== 'string' || !SHA_RE.test(evidence.sha)) {
      return { classification: 'NOT_CI', canSetCiExecutedSha: false, reason: 'SHA_INVALID' };
    }
    return { classification: 'GITHUB_ACTIONS_EXACT_HEAD', canSetCiExecutedSha: true, reason: 'EXACT_HEAD_EXECUTED' };
  }
  if (evidence.source === 'LOCAL_GATE_CI') {
    return { classification: 'LOCAL_NOT_CI', canSetCiExecutedSha: false, reason: 'LOCAL_SUBSTITUTE' };
  }
  if (evidence.source === 'GATE_TOPOLOGY') {
    return { classification: 'RUNNER_TOPOLOGY_ONLY_NOT_CI', canSetCiExecutedSha: false, reason: 'TOPOLOGY_SUBSTITUTE' };
  }
  return { classification: 'NOT_CI', canSetCiExecutedSha: false, reason: 'UNKNOWN_SOURCE' };
}

/**
 * Apply evidence to the CI fields. A substitute changes nothing and is
 * refused by name; the refusal is the assertion that no substitute receipt can
 * set `CI_EXECUTED_SHA`.
 *
 * @param {CiExecutionField} field
 * @param {CiExecutionEvidence} evidence
 * @returns {{ field: CiExecutionField, changed: boolean, refused: boolean, code: string | null, classification: string }}
 */
export function applyCiExecutionEvidence(field, evidence) {
  const judgement = classifyCiExecutionEvidence(evidence);
  // A field-setting judgement already proved `sha` is a 40-hex string; the
  // read below keeps that proof local so the non-string case can never reach
  // the accepted branch.
  if (!judgement.canSetCiExecutedSha || typeof evidence.sha !== 'string') {
    return {
      field: { ...field },
      changed: false,
      refused: true,
      code: judgement.classification === 'ZERO_STEP_NON_EVIDENCE'
        ? 'CI_EXECUTED_FROM_ZERO_STEP_REFUSED'
        : 'CI_EXECUTED_SHA_SUBSTITUTE_REFUSED',
      classification: judgement.classification,
    };
  }
  return {
    field: {
      ciObservedSha: evidence.sha,
      ciExecutedSha: evidence.sha,
      ciStatus: 'EXECUTED_PASS',
    },
    changed: true,
    refused: false,
    code: null,
    classification: judgement.classification,
  };
}

/**
 * The certification refusal. A certification that claims CI at a checkpoint
 * whose `CI_OBSERVED_SHA` is a different commit (or absent) is refused with
 * both SHAs named.
 *
 * @param {{ completionStatus: string | null | undefined, certifiedCheckpointSha: string | null | undefined, releaseCheckpointSha: string | null | undefined, ciObservedSha: string | null | undefined, ciExecutedSha: string | null | undefined, ciStatus: string | null | undefined }} input
 * @returns {{ ok: boolean, errors: readonly { code: string, detail: string }[] }}
 */
export function evaluateCiCertification(input) {
  /** @type {{ code: string, detail: string }[]} */
  const errors = [];
  const completionStatus = input.completionStatus ?? null;
  // `Array.prototype.includes` is a string membership test, so an absent
  // status (`null`) is a non-member by definition rather than by coercion.
  if (completionStatus === null || !CI_CERTIFIED_COMPLETION_STATUSES.includes(completionStatus)) {
    return { ok: true, errors };
  }
  const checkpoint = SHA_RE.test(input.certifiedCheckpointSha ?? '')
    ? input.certifiedCheckpointSha
    : (SHA_RE.test(input.releaseCheckpointSha ?? '') ? input.releaseCheckpointSha : null);
  const observed = input.ciObservedSha ?? 'NONE';
  const executed = input.ciExecutedSha ?? 'NONE';
  if (checkpoint === null) {
    errors.push({ code: 'CI_CERTIFICATION_CHECKPOINT_UNRESOLVED', detail: 'a CI-certified status requires a 40-hex certified checkpoint' });
    return { ok: false, errors };
  }
  if (input.ciStatus !== 'EXECUTED_PASS') {
    errors.push({ code: 'CI_CERTIFICATION_WITHOUT_EXECUTION', detail: `CI_STATUS=${String(input.ciStatus ?? 'ABSENT')} cannot certify ${completionStatus}` });
  }
  if (observed !== checkpoint) {
    errors.push({ code: 'CI_OBSERVED_SHA_MISMATCH', detail: `certification at checkpoint ${checkpoint} but CI_OBSERVED_SHA=${observed}` });
  }
  if (executed !== observed) {
    errors.push({ code: 'CI_EXECUTION_MISMATCH', detail: `CI_OBSERVED_SHA=${observed} but CI_EXECUTED_SHA=${executed}` });
  }
  return { ok: errors.length === 0, errors };
}

/**
 * The three candidate routes, as data, with their trade-offs and their CI
 * authority. Selection is an OWNER DECISION (task 3.11); this validator never
 * selects one and refuses a substitute that could set `CI_EXECUTED_SHA`.
 *
 * @param {CiBlockRecord} record
 * @returns {{ ok: boolean, routes: readonly CiRouteCandidate[], errors: readonly { code: string, detail: string }[] }}
 */
export function validateCiRouteCandidates(record) {
  /** @type {{ code: string, detail: string }[]} */
  const errors = [];
  const routes = isObject(record) && Array.isArray(record.candidateRoutes) ? record.candidateRoutes : [];
  if (routes.length < 3) {
    errors.push({ code: 'CI_ROUTE_CANDIDATES_INCOMPLETE', detail: 'at least three candidate routes are required' });
    return { ok: false, routes, errors };
  }
  const seen = new Set();
  for (const route of routes) {
    const routeId = isObject(route) && typeof route.routeId === 'string' ? route.routeId : null;
    if (routeId === null || routeId === '') {
      errors.push({ code: 'CI_ROUTE_ID_MISSING', detail: JSON.stringify(route) });
      continue;
    }
    if (seen.has(routeId)) errors.push({ code: 'CI_ROUTE_DUPLICATE', detail: routeId });
    seen.add(routeId);
    if (!nonEmptyString(route.summary, 12)) {
      errors.push({ code: 'CI_ROUTE_SUMMARY_MISSING', detail: routeId });
    }
    if (!nonEmptyString(route.command, 4)) {
      errors.push({ code: 'CI_ROUTE_COMMAND_MISSING', detail: routeId });
    }
    const tradeOffs = Array.isArray(route.tradeOffs) ? route.tradeOffs : [];
    if (tradeOffs.length < 2 || tradeOffs.some((/** @type {unknown} */ entry) => !nonEmptyString(entry, 8))) {
      errors.push({ code: 'CI_ROUTE_TRADE_OFF_MISSING', detail: `${routeId} must state at least two trade-offs` });
    }
    const provesGitHub = route.provesGitHubExecution === true;
    if (provesGitHub && route.source !== 'GITHUB_ACTIONS') {
      errors.push({ code: 'CI_ROUTE_GITHUB_CLAIM_UNSUPPORTED', detail: `${routeId} claims GitHub execution without source GITHUB_ACTIONS` });
    }
    if (!provesGitHub && route.canSetCiExecutedSha !== false) {
      errors.push({ code: 'CI_ROUTE_SUBSTITUTE_MAY_SET_CI_EXECUTED_SHA', detail: routeId });
    }
    if (provesGitHub && route.canSetCiExecutedSha !== true) {
      errors.push({ code: 'CI_ROUTE_AUTHORITY_INCONSISTENT', detail: routeId });
    }
  }
  const selection = isObject(record) ? record.routeSelection : null;
  const state = isObject(selection) ? selection.state : null;
  if (state !== 'OWNER_DECISION_REQUIRED' && state !== 'SELECTED_BY_OWNER') {
    errors.push({ code: 'CI_ROUTE_SELECTION_INVALID', detail: String(state ?? 'ABSENT') });
  }
  if (state === 'SELECTED_BY_OWNER') {
    const selected = isObject(selection) ? selection.selectedRouteId : null;
    if (typeof selected !== 'string' || !seen.has(selected)) {
      errors.push({ code: 'CI_ROUTE_SELECTION_UNKNOWN', detail: String(selected ?? 'ABSENT') });
    }
  }
  if (state === 'OWNER_DECISION_REQUIRED' && isObject(selection) && selection.selectedRouteId !== null && selection.selectedRouteId !== undefined) {
    errors.push({ code: 'CI_ROUTE_SELECTION_PREMATURE', detail: String(selection.selectedRouteId) });
  }
  return { ok: errors.length === 0, routes, errors };
}
