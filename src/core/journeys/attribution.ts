// ---------------------------------------------------------------------------
// Nightwatch — deterministic journey failure attribution.
//
// Triggered oracles and causal conclusions are deliberately separate. This
// helper only uses ordered step/monitor metadata; timestamps alone never prove
// causality.
// ---------------------------------------------------------------------------

import type { RunMonitor } from '../../state/run';
import type { JourneyFailureAttribution, JourneyStepResult } from './types';

export function buildJourneyFailureAttribution(input: {
  steps: readonly JourneyStepResult[];
  monitor: RunMonitor;
  authValid: boolean;
}): JourneyFailureAttribution {
  const firstFailed = input.steps.find((step) => step.status !== 'PASS');
  const lastSuccessful = [...input.steps].reverse().find((step) => step.status === 'PASS');
  const primaryFailure = !input.authValid
    ? 'AUTH_STATE_INVALID'
    : firstFailed?.failureClassification ??
    (input.monitor.oracleFailures[0]?.data?.reason as string | undefined) ??
    (input.monitor.hardFailures[0]?.reason ?? null);
  const safetyFailure = input.monitor.safetyFailed
    ? input.monitor.primaryFailure()?.reason ?? 'SAFETY_FAILURE'
    : null;
  const secondaryOracles = input.monitor.oracleObservations
    .map((item) => item.oracleId)
    .filter((id, index, all) => id !== primaryFailure && all.indexOf(id) === index);
  const likelyCause = !input.authValid
    ? 'AUTH_STATE_INVALID'
    : input.monitor.safetyFailed
      ? 'UNRESOLVED'
      : primaryFailure === null
        ? 'NONE'
        : 'UNRESOLVED';
  const causalityConfidence = primaryFailure === null
    ? 'NOT_CAUSAL'
    : firstFailed !== undefined || input.monitor.safetyFailed
      ? 'PROVEN'
      : 'UNRESOLVED';
  return {
    primaryFailure: primaryFailure ?? null,
    secondaryOracles,
    safetyFailure,
    containmentEvents: [...input.monitor.containmentEvents],
    likelyCause,
    causalityConfidence,
    lastSuccessfulStep: lastSuccessful?.stepId ?? null,
    firstFailingStep: firstFailed?.stepId ?? null,
  };
}
