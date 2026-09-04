// ---------------------------------------------------------------------------
// Nightwatch AH-1 — C-12 readiness evaluator (pure, no I/O).
//
// Collects EVERY blocker (advisory, unlike the P1 first-denial chain) so one
// run tells the operator everything still missing. Malformed input fails
// closed with `C12_READINESS_INVALID:<REASON>`.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import type {
  C12Blocker,
  C12BlockerCode,
  C12ReadinessInput,
  C12ReadinessReport,
} from './types';
import { C12_READINESS_VERSION, C12_MAX_OBSERVATION_WINDOW_MS } from './types';

const SHA_RE = /^[0-9a-f]{40}$/;
const RECEIPT_RE = /^receipt:sha256:[0-9a-f]{16,64}$/;
const HOST_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
const PROVENANCE_CLASSES: ReadonlySet<string> = new Set(['OPERATOR_CREATED', 'NIGHTWATCH_CREATED', 'UNKNOWN']);
const DEPLOYMENT_STATES: ReadonlySet<string> = new Set(['PROVEN', 'UNKNOWN', 'INFERRED']);
const ATTRIBUTION_CAPABILITIES: ReadonlySet<string> = new Set(['ATTRIBUTING_PROXY', 'UNKNOWN']);

function invalid(reason: string): never {
  throw new Error(`C12_READINESS_INVALID:${reason}`);
}

function blocker(code: C12BlockerCode, basis: string): C12Blocker {
  return { code, basis };
}

function sha(value: unknown, field: string): string {
  if (typeof value !== 'string' || !SHA_RE.test(value)) invalid(`${field}_SHA`);
  return value;
}

function isoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) invalid(`${field}_DATE`);
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) invalid(`${field}_DATE_UNPARSABLE`);
  return value;
}

/**
 * Evaluate C-12 readiness from explicitly presented facts. Pure: no clock
 * read, no filesystem, no network, no credential access, no authorization
 * consumption.
 */
export function evaluateC12Readiness(input: C12ReadinessInput): C12ReadinessReport {
  if (input === null || typeof input !== 'object') invalid('INPUT_SHAPE');
  const blockers: C12Blocker[] = [];
  const now = Date.parse(isoDate(input.nowIso, 'NOW'));

  // --- Prerequisite 1: implementation binding ---
  const currentSha = sha(input.implementation?.currentSha, 'IMPLEMENTATION_CURRENT');
  const requiredSha = sha(input.implementation?.requiredSha, 'IMPLEMENTATION_REQUIRED');
  if (currentSha !== requiredSha) {
    blockers.push(blocker('BLOCKED_IMPLEMENTATION_BINDING', 'current implementation SHA does not match the qualified MA-8 anchor'));
  }

  // --- Prerequisite 2: PQ binding ---
  const receipt = input.pqBinding?.receiptDigest;
  const boundSha = input.pqBinding?.boundSha;
  if (typeof receipt !== 'string' || !RECEIPT_RE.test(receipt) || typeof boundSha !== 'string' || !SHA_RE.test(boundSha)) {
    blockers.push(blocker('BLOCKED_PQ_BINDING', 'no well-formed PQ qualification receipt bound to the implementation'));
  } else if (boundSha !== currentSha) {
    blockers.push(blocker('BLOCKED_PQ_BINDING', 'PQ receipt is bound to a stale implementation SHA'));
  }

  // --- Prerequisite 3: operator subject (already-existing, operator-created) ---
  const subject = input.operatorSubject;
  if (subject === null || typeof subject !== 'object' || !PROVENANCE_CLASSES.has(subject.provenance)) {
    invalid('OPERATOR_SUBJECT_SHAPE');
  }
  if (!subject.present) {
    blockers.push(blocker('BLOCKED_OPERATOR_SUBJECT', 'no already-loaded operator production subject presented'));
  } else if (subject.provenance !== 'OPERATOR_CREATED') {
    blockers.push(
      blocker('BLOCKED_OPERATOR_SUBJECT', `subject provenance ${subject.provenance} does not admit: Nightwatch must never observe a subject it created`),
    );
  }

  // --- Prerequisite 4: external P1 scope config (synthetic/template shape) ---
  const scope = input.scopeConfig;
  if (scope === null || scope === undefined) {
    blockers.push(blocker('BLOCKED_SCOPE_CONFIG', 'no external P1 scope configuration presented'));
  } else {
    if (typeof scope.host !== 'string' || scope.host.includes('*') || scope.host.includes('://') || !HOST_RE.test(scope.host)) {
      blockers.push(blocker('BLOCKED_SCOPE_CONFIG', 'scope host is not an exact admission hostname (wildcard, URL, or malformed)'));
    }
    const start = Date.parse(isoDate(scope.windowStartIso, 'WINDOW_START'));
    const end = Date.parse(isoDate(scope.windowEndIso, 'WINDOW_END'));
    if (!(start < end)) {
      blockers.push(blocker('BLOCKED_SCOPE_CONFIG', 'observation window is empty or inverted'));
    } else {
      if (end <= now) blockers.push(blocker('BLOCKED_WINDOW', 'observation window has expired'));
      if (end - start > C12_MAX_OBSERVATION_WINDOW_MS) {
        blockers.push(blocker('BLOCKED_WINDOW', `observation window exceeds the ${C12_MAX_OBSERVATION_WINDOW_MS} ms P1 cap`));
      }
    }
    if (
      typeof scope.evidenceDestination !== 'string' ||
      scope.evidenceDestination.length === 0 ||
      scope.evidenceDestination.length > 500 ||
      scope.evidenceDestination.includes('://') ||
      scope.evidenceDestination.includes('@') ||
      /\s/.test(scope.evidenceDestination)
    ) {
      blockers.push(blocker('BLOCKED_PRIVACY_DESTINATION', 'evidence destination is not an approved private path-like descriptor'));
    } else if (!scope.destinationApproved) {
      blockers.push(blocker('BLOCKED_PRIVACY_DESTINATION', 'evidence destination is not operator-approved'));
    }
    if (!scope.killSwitchArmed) {
      blockers.push(blocker('BLOCKED_KILL_SWITCH', 'no armed kill switch in the scope configuration'));
    }
  }

  // --- Prerequisite 5: deployment fact (C-08b truth, never inferred) ---
  const deploymentState = input.deploymentFact?.state;
  if (!DEPLOYMENT_STATES.has(deploymentState)) invalid('DEPLOYMENT_FACT_SHAPE');
  if (deploymentState !== 'PROVEN') {
    blockers.push(
      blocker(
        'BLOCKED_DEPLOYMENT_FACT',
        deploymentState === 'INFERRED'
          ? 'inferred deployment facts never satisfy C-08b; C-08b UNKNOWN cannot become PROVEN by inference'
          : 'C-08b deployment facts remain unavailable',
      ),
    );
  }

  // --- Prerequisite 8: attribution capability ---
  const capability = input.attribution?.capability;
  if (!ATTRIBUTION_CAPABILITIES.has(capability)) invalid('ATTRIBUTION_SHAPE');
  if (capability !== 'ATTRIBUTING_PROXY') {
    blockers.push(blocker('BLOCKED_ATTRIBUTION', 'no attributing proxy capability bound; UNKNOWN attribution fails closed'));
  }

  // --- Prerequisite 6: fresh C-12 authorization (inspected, never consumed) ---
  const auth = input.authorization;
  if (auth === null || auth === undefined) {
    blockers.push(blocker('BLOCKED_AUTHORIZATION', 'no C-12-specific owner authorization presented; MA-8 authorization does not transfer'));
  } else {
    if (auth.authClass !== 'P1_OBSERVE') {
      blockers.push(blocker('BLOCKED_AUTHORIZATION', `authorization class ${auth.authClass} is not C-12 observation authority`));
    } else if (!auth.fresh) {
      blockers.push(blocker('BLOCKED_AUTHORIZATION', 'authorization is stale or already spent'));
    } else if (auth.consumed) {
      blockers.push(blocker('BLOCKED_AUTHORIZATION', 'authorization already consumed'));
    }
  }

  // --- Prerequisite 10: kill switch not engaged ---
  if (input.killSwitchEngaged !== false && input.killSwitchEngaged !== true) invalid('KILL_SWITCH_SHAPE');
  if (input.killSwitchEngaged) {
    blockers.push(blocker('BLOCKED_KILL_SWITCH', 'kill switch is engaged: observation must stop, not start'));
  }

  const body = {
    schemaVersion: C12_READINESS_VERSION,
    status: (blockers.length === 0 ? 'READY' : 'BLOCKED') as 'READY' | 'BLOCKED',
    blockers,
  };
  const digest = sha256Hex(stableJsonSorted(body)).slice(0, 24);
  return { ...body, deterministicDigest: digest };
}
