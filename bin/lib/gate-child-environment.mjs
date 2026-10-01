// @ts-check
// R4-10 / review-4 task 3.1 — the quality gate's child environment, extracted
// so it is testable in isolation.
//
// The allowlist in bin/child-environment.mjs exists so ambient parent state
// cannot reach a child. It also stripped NIGHTWATCH_PUSH_BEFORE, which the
// HARDENING groups' append-only/pushed-range pairing reads
// (`resolveArchiveDiffBase`), so in CI the pairing fell back to the empty
// merge-base range and the pushed commits were never inspected. The push tip
// is forwarded EXPLICITLY here, shape-validated, and never inherited.

import { buildChildEnvironment } from '../child-environment.mjs';
import { GATE_RECEIPT_PATH_ENV } from './gate-receipt.mjs';

export const GATE_CHILD_PUSH_BEFORE = 'NIGHTWATCH_PUSH_BEFORE';
const SHA40_RE = /^[0-9a-f]{40}$/i;

export const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'NIGHTWATCH_STORAGE_STATE', 'NIGHTWATCH_AUTH_FILE', 'NIGHTWATCH_OWNER_FINDINGS',
  'GITHUB_TOKEN', 'GH_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'CLOUDSDK_AUTH_ACCESS_TOKEN',
  // The receipt destination belongs to THIS gate run. A child inheriting it
  // could overwrite the parent's authoritative receipt with its own.
  GATE_RECEIPT_PATH_ENV,
]);

/**
 * A gate child's environment: the allowlisted base, the gate's own explicit
 * labels, the forwarded (shape-validated) push tip, and a fixed locale.
 * @param {NodeJS.ProcessEnv} parentEnvironment
 * @param {{ mode: string, commandKey?: string | null }} input
 * @returns {NodeJS.ProcessEnv}
 */
export function buildGateChildEnvironment(parentEnvironment, input) {
  const { mode, commandKey = null } = input;
  const environment = buildChildEnvironment(parentEnvironment, {
    NIGHTWATCH_ENV: 'local',
    NIGHTWATCH_GATE_ENVIRONMENT: mode.toUpperCase(),
    // F-PERF-1: attribute this group's Playwright timing document to the group
    // that produced it. The reporter sanitizes the label itself.
    ...(typeof commandKey === 'string' && commandKey.length > 0
      ? { NIGHTWATCH_TIMING_LANE: commandKey.toLowerCase().replace(/_+/g, '-') }
      : {}),
    // R4-10 / review-4 task 3.1: forwarded EXPLICITLY and only when it is a
    // 40-hex tip, so the pushed commit range is inspected instead of the empty
    // merge-base range CI otherwise sees.
    ...(typeof parentEnvironment[GATE_CHILD_PUSH_BEFORE] === 'string' && SHA40_RE.test(parentEnvironment[GATE_CHILD_PUSH_BEFORE])
      ? { [GATE_CHILD_PUSH_BEFORE]: parentEnvironment[GATE_CHILD_PUSH_BEFORE] }
      : {}),
  });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of FORBIDDEN_ENVIRONMENT_KEYS) delete environment[key];
  return environment;
}
