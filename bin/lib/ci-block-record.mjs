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

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

/**
 * Structural completeness of one block record. Every omission is
 * `CI_BLOCK_RECORD_INCOMPLETE`, because a block missing any of these fields is
 * indistinguishable from abandonment.
 *
 * @param {any} record
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
  return { ok: errors.length === 0, errors };
}

/**
 * The computed staleness report. `todayIso` is injected so the judgement is
 * deterministic and testable.
 *
 * @param {any} record
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
 * @param {any} evidence
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
    if (!Number.isInteger(evidence.executedSteps) || evidence.executedSteps < 1) {
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
 * @param {{ ciObservedSha: string | null, ciExecutedSha: string | null, ciStatus: string | null }} field
 * @param {any} evidence
 * @returns {{ field: { ciObservedSha: string | null, ciExecutedSha: string | null, ciStatus: string | null }, changed: boolean, refused: boolean, code: string | null, classification: string }}
 */
export function applyCiExecutionEvidence(field, evidence) {
  const judgement = classifyCiExecutionEvidence(evidence);
  if (!judgement.canSetCiExecutedSha) {
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
 * @param {{
 *   completionStatus?: string | null,
 *   certifiedCheckpointSha?: string | null,
 *   releaseCheckpointSha?: string | null,
 *   ciObservedSha?: string | null,
 *   ciExecutedSha?: string | null,
 *   ciStatus?: string | null,
 * }} input
 * @returns {{ ok: boolean, errors: readonly { code: string, detail: string }[] }}
 */
export function evaluateCiCertification(input) {
  /** @type {{ code: string, detail: string }[]} */
  const errors = [];
  const completionStatus = input.completionStatus ?? null;
  if (!CI_CERTIFIED_COMPLETION_STATUSES.includes(completionStatus)) {
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
 * @param {any} record
 * @returns {{ ok: boolean, routes: readonly any[], errors: readonly { code: string, detail: string }[] }}
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
    if (tradeOffs.length < 2 || tradeOffs.some((entry) => !nonEmptyString(entry, 8))) {
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
