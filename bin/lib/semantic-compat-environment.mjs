// @ts-check

import { buildChildEnvironment } from '../child-environment.mjs';

/**
 * Keep semantic-compatibility inside its caller's gate classification. In
 * particular, LOCAL must never self-upgrade to a fresh-checkout exception.
 * @param {NodeJS.ProcessEnv} parentEnvironment
 * @returns {NodeJS.ProcessEnv}
 */
export function buildSemanticCompatibilityEnvironment(parentEnvironment) {
  /** @type {Record<string, string | undefined>} */
  const explicitValues = {
    NIGHTWATCH_ENV: 'local',
    NIGHTWATCH_TIMING_LANE: 'semantic-compatibility',
  };
  const parentGateEnvironment = parentEnvironment.NIGHTWATCH_GATE_ENVIRONMENT;
  if (parentGateEnvironment !== undefined) explicitValues.NIGHTWATCH_GATE_ENVIRONMENT = parentGateEnvironment;
  const environment = buildChildEnvironment(parentEnvironment, explicitValues);
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of ['NIGHTWATCH_PROXY_PORT', 'NIGHTWATCH_PROXY_LEASE_TOKEN', 'NIGHTWATCH_PROXY_LEASE_PATH', 'NIGHTWATCH_PROXY_LEASE_OWNER_PID']) delete environment[key];
  return environment;
}
