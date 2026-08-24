import {
  assertBoundedBoolean,
  assertNoRawArtifactFields,
  FULL_DIGEST_RE,
  SHA_RE,
  digest,
  invalid,
} from './common';
import {
  PHASE24_CI_VERSION,
  PHASE24_READINESS_VERSION,
  type Phase24CiClassification,
  type Phase24CiObservation,
  type Phase24CiState,
  type Phase24ReadinessDiagnostics,
  type Phase24ReadinessFacts,
} from './types';

function ciResult(input: {
  readonly state: Phase24CiState;
  readonly reasonCodes: readonly string[];
  readonly exactHead: boolean;
  readonly executedStepCount: number;
}): Phase24CiClassification {
  const core = { schemaVersion: PHASE24_CI_VERSION, ...input };
  return { ...core, deterministicDigest: digest('ci-observation:', core) };
}

/** Classify sanitized Actions facts conservatively and without API authority. */
export function classifyPhase24Ci(input: Phase24CiObservation): Phase24CiClassification {
  assertNoRawArtifactFields(input);
  if (!SHA_RE.test(input.currentHead) || input.expectedWorkflow.length === 0 || input.requiredJob.length === 0) invalid('CI_OBSERVATION_SHAPE');
  if (input.run === null) return ciResult({ state: 'NO_RUN', reasonCodes: ['NO_RUN_EXISTS'], exactHead: false, executedStepCount: 0 });
  const exactHead = input.run.headSha === input.currentHead;
  if (input.run.workflow !== input.expectedWorkflow) return ciResult({ state: 'WRONG_WORKFLOW', reasonCodes: ['WORKFLOW_NAME_MISMATCH'], exactHead, executedStepCount: 0 });
  if (!exactHead) return ciResult({ state: 'WRONG_SHA', reasonCodes: ['RUN_HEAD_MISMATCH'], exactHead: false, executedStepCount: 0 });
  if (input.run.status === 'queued') return ciResult({ state: 'QUEUED', reasonCodes: ['RUN_QUEUED'], exactHead, executedStepCount: 0 });
  if (input.run.status === 'in_progress') return ciResult({ state: 'RUNNING', reasonCodes: ['RUN_IN_PROGRESS'], exactHead, executedStepCount: 0 });
  if (input.run.conclusion === 'cancelled') return ciResult({ state: 'CANCELLED', reasonCodes: ['RUN_CANCELLED'], exactHead, executedStepCount: 0 });
  const job = input.requiredJobObservation;
  if (job === null || job.name !== input.requiredJob) return ciResult({ state: 'WRONG_JOB', reasonCodes: ['REQUIRED_JOB_MISSING'], exactHead, executedStepCount: 0 });
  if (job.steps === null) return ciResult({ state: 'INCOMPLETE_STEPS', reasonCodes: ['REQUIRED_JOB_STEPS_UNOBSERVABLE'], exactHead, executedStepCount: 0 });
  if (job.steps.length === 0) return ciResult({ state: 'ZERO_STEP_PLATFORM_BLOCK', reasonCodes: ['REQUIRED_JOB_STEPS_EMPTY'], exactHead, executedStepCount: 0 });
  const executedStepCount = job.steps.length;
  if (input.gateReceipt === null) return ciResult({ state: 'AMBIGUOUS', reasonCodes: ['GATE_RECEIPT_MISSING'], exactHead, executedStepCount });
  if (input.gateReceipt.gateDefinitionDigest !== input.gateReceipt.expectedGateDefinitionDigest || input.gateReceipt.gateDefinitionDigest === null || !FULL_DIGEST_RE.test(input.gateReceipt.gateDefinitionDigest)) return ciResult({ state: 'AMBIGUOUS', reasonCodes: ['GATE_DEFINITION_DIGEST_MISMATCH'], exactHead, executedStepCount });
  const allStepsGreen = job.steps.every((step) => step.status === 'completed' && step.conclusion === 'success');
  if (!allStepsGreen) {
    return ciResult({ state: input.gateReceipt.finalResult === 'TEST_FAILURE' ? 'EXACT_HEAD_TEST_FAILURE' : 'INFRASTRUCTURE_FAILURE', reasonCodes: [input.gateReceipt.finalResult === 'TEST_FAILURE' ? 'GATE_TEST_FAILURE' : 'JOB_OR_STEP_FAILURE'], exactHead, executedStepCount });
  }
  if (input.run.conclusion === 'success' && job.conclusion === 'success' && input.gateReceipt.finalResult === 'PASS') return ciResult({ state: 'EXACT_HEAD_GREEN', reasonCodes: ['EXACT_HEAD_AND_GATE_PASS'], exactHead, executedStepCount });
  if (input.gateReceipt.finalResult === 'TEST_FAILURE') return ciResult({ state: 'EXACT_HEAD_TEST_FAILURE', reasonCodes: ['GATE_TEST_FAILURE'], exactHead, executedStepCount });
  return ciResult({ state: 'INFRASTRUCTURE_FAILURE', reasonCodes: ['RUN_OR_GATE_NOT_SUCCESS'], exactHead, executedStepCount });
}

export function validatePhase24CiClassification(classification: Phase24CiClassification): void {
  assertNoRawArtifactFields(classification);
  if (classification.schemaVersion !== PHASE24_CI_VERSION || classification.executedStepCount < 0 || classification.reasonCodes.length === 0 || !/^ci-observation:sha256:[0-9a-f]{24}$/.test(classification.deterministicDigest)) invalid('CI_CLASSIFICATION');
  const core = {
    schemaVersion: classification.schemaVersion,
    state: classification.state,
    reasonCodes: classification.reasonCodes,
    exactHead: classification.exactHead,
    executedStepCount: classification.executedStepCount,
  };
  if (classification.deterministicDigest !== digest('ci-observation:', core)) invalid('CI_CLASSIFICATION_DIGEST');
}

const REQUIRED_CONDITIONS: readonly string[] = [
  'EXTERNAL_CI_EXACT_HEAD_GREEN',
  'SOURCE_CURRENT',
  'MANIFEST_CURRENT',
  'AUTH_READY',
  'CONTAINMENT_READY',
  'QUALITY_GATE_MATCH',
  'SOURCE_IDENTITY_MATCH',
  'ENVIRONMENT_AUTHORIZED',
];

/** Render every pre-DEV blocker explicitly; no best-effort fallback exists. */
export function diagnosePhase24Readiness(facts: Phase24ReadinessFacts): Phase24ReadinessDiagnostics {
  assertNoRawArtifactFields(facts);
  validatePhase24CiClassification(facts.externalCi);
  const blockers: string[] = [];
  if (facts.externalCi.state !== 'EXACT_HEAD_GREEN') {
    blockers.push('EXTERNAL_CI_NOT_GREEN', `CI_STATE:${facts.externalCi.state}`);
  }
  if (!facts.sourceCurrent) blockers.push('SOURCE_STALE');
  if (!facts.manifestCurrent) blockers.push('MANIFEST_STALE');
  if (!facts.authReady) blockers.push('AUTH_NOT_READY');
  if (!facts.containmentReady) blockers.push('CONTAINMENT_NOT_READY');
  if (!facts.qualityGateMatches) blockers.push('QUALITY_GATE_MISMATCH');
  if (!facts.sourceIdentityMatches) blockers.push('SOURCE_IDENTITY_MISMATCH');
  if (!facts.environmentAuthorized) blockers.push('ENVIRONMENT_NOT_AUTHORIZED');
  const core = {
    schemaVersion: PHASE24_READINESS_VERSION,
    state: blockers.length === 0 ? 'READY' as const : 'BLOCKED' as const,
    blockerCodes: [...new Set(blockers)],
    requiredConditions: REQUIRED_CONDITIONS,
  };
  return { ...core, deterministicDigest: digest('readiness:', core) };
}

export function validatePhase24ReadinessDiagnostics(diagnostics: Phase24ReadinessDiagnostics): void {
  assertNoRawArtifactFields(diagnostics);
  if (diagnostics.schemaVersion !== PHASE24_READINESS_VERSION || JSON.stringify(diagnostics.requiredConditions) !== JSON.stringify(REQUIRED_CONDITIONS)) invalid('READINESS_SCHEMA');
  if (diagnostics.state === 'READY' && diagnostics.blockerCodes.length !== 0) invalid('READINESS_READY_WITH_BLOCKERS');
  if (diagnostics.state === 'BLOCKED' && diagnostics.blockerCodes.length === 0) invalid('READINESS_BLOCKED_WITHOUT_REASON');
  if (diagnostics.deterministicDigest !== digest('readiness:', { schemaVersion: diagnostics.schemaVersion, state: diagnostics.state, blockerCodes: diagnostics.blockerCodes, requiredConditions: diagnostics.requiredConditions })) invalid('READINESS_DIGEST');
}
