/**
 * Pure classification for the one external authority Nightwatch cannot
 * manufacture locally: an executed GitHub Actions run for the exact head.
 *
 * The input is already a sanitized observation. This module never calls a
 * GitHub API, reads credentials, or treats missing execution telemetry as a
 * test failure.
 */

export const EXTERNAL_CI_CLASSIFICATIONS = [
  'EXECUTED_GREEN',
  'EXECUTED_TEST_FAILURE',
  'EXECUTED_INFRA_FAILURE',
  'NO_STEPS_BILLING_OR_PLATFORM_BLOCK',
  'API_UNOBSERVABLE',
  'WORKFLOW_NOT_FOUND',
  'HEAD_MISMATCH',
  'RUN_PENDING',
  'RUN_CANCELLED',
  'UNKNOWN',
] as const;

export type ExternalCiClassification = typeof EXTERNAL_CI_CLASSIFICATIONS[number];

export interface ExternalCiStepObservation {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
}

export interface ExternalCiJobObservation {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly steps: readonly ExternalCiStepObservation[] | null;
}

export interface ExternalGateGroupObservation {
  readonly id: string;
  readonly status: string;
}

export interface ExternalGateReceiptObservation {
  readonly receiptDigest: string;
  readonly gateDefinitionDigest: string;
  readonly finalResult: string;
  readonly groups: readonly ExternalGateGroupObservation[];
}

export interface ExternalCiRunObservation {
  readonly runId: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly headSha: string;
  readonly workflowName: string;
}

export interface ExternalCiObservation {
  readonly apiObservable: boolean;
  readonly workflowFound: boolean;
  readonly expectedWorkflowName: string;
  readonly currentHeadSha: string;
  readonly run: ExternalCiRunObservation | null;
  readonly jobs: readonly ExternalCiJobObservation[] | null;
  readonly requiredJobNames: readonly string[];
  readonly expectedGateDefinitionDigest: string;
  readonly expectedRequiredGroupIds: readonly string[];
  readonly gateReceipt: ExternalGateReceiptObservation | null;
}

export interface ExternalCiClassificationResult {
  readonly classification: ExternalCiClassification;
  readonly reasonCodes: readonly string[];
  readonly exactHead: boolean;
  readonly runId: string | null;
  readonly executedJobNames: readonly string[];
  readonly requiredJobNames: readonly string[];
}

const SHA_RE = /^[0-9a-f]{40}$/;
const RUN_ID_RE = /^\d+$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const RECEIPT_DIGEST_RE = /^receipt:sha256:[0-9a-f]{24}$/;

function result(
  classification: ExternalCiClassification,
  observation: ExternalCiObservation,
  reasonCodes: readonly string[],
  jobs: readonly ExternalCiJobObservation[] = [],
): ExternalCiClassificationResult {
  return {
    classification,
    reasonCodes,
    exactHead: observation.run !== null && observation.run.headSha === observation.currentHeadSha,
    runId: observation.run !== null && RUN_ID_RE.test(observation.run.runId) ? observation.run.runId : null,
    executedJobNames: jobs.filter((job) => job.steps !== null && job.steps.length > 0).map((job) => job.name),
    requiredJobNames: [...observation.requiredJobNames],
  };
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function requiredGroupsPass(
  receipt: ExternalGateReceiptObservation,
  requiredGroupIds: readonly string[],
): boolean {
  if (!unique(requiredGroupIds) || !unique(receipt.groups.map((group) => group.id))) return false;
  const groups = new Map(receipt.groups.map((group) => [group.id, group.status]));
  return requiredGroupIds.every((id) => groups.get(id) === 'PASS');
}

/** Classify sanitized Actions observations without granting local authority. */
export function classifyExternalCi(observation: ExternalCiObservation): ExternalCiClassificationResult {
  if (observation.apiObservable !== true) return result('API_UNOBSERVABLE', observation, ['API_UNOBSERVABLE']);
  if (observation.workflowFound !== true) return result('WORKFLOW_NOT_FOUND', observation, ['WORKFLOW_NOT_FOUND']);
  if (
    observation.expectedWorkflowName.length === 0
    || !SHA_RE.test(observation.currentHeadSha)
    || !DIGEST_RE.test(observation.expectedGateDefinitionDigest)
    || observation.requiredJobNames.length === 0
    || !unique(observation.requiredJobNames)
  ) return result('UNKNOWN', observation, ['OBSERVATION_SHAPE_INVALID']);
  if (observation.run === null) return result('UNKNOWN', observation, ['RUN_MISSING']);
  if (observation.run.workflowName !== observation.expectedWorkflowName) return result('WORKFLOW_NOT_FOUND', observation, ['WORKFLOW_NAME_MISMATCH']);
  if (!RUN_ID_RE.test(observation.run.runId) || !SHA_RE.test(observation.run.headSha)) return result('UNKNOWN', observation, ['RUN_ID_OR_HEAD_INVALID']);
  if (observation.run.status === 'queued' || observation.run.status === 'in_progress') return result('RUN_PENDING', observation, ['RUN_NOT_COMPLETED']);
  if (observation.run.status === 'cancelled' || observation.run.conclusion === 'cancelled') return result('RUN_CANCELLED', observation, ['RUN_CANCELLED']);
  if (observation.run.headSha !== observation.currentHeadSha) return result('HEAD_MISMATCH', observation, ['RUN_HEAD_MISMATCH']);
  if (observation.jobs === null || observation.jobs.length === 0) return result('UNKNOWN', observation, ['JOBS_MISSING']);

  const requiredJobs = observation.jobs.filter((job) => observation.requiredJobNames.includes(job.name));
  const missingJobs = observation.requiredJobNames.filter((name) => !requiredJobs.some((job) => job.name === name));
  if (missingJobs.length > 0) return result('UNKNOWN', observation, ['REQUIRED_JOB_MISSING'], requiredJobs);

  // An empty step list is an execution/platform observation, not a test
  // result. This branch intentionally precedes all failure interpretation.
  if (requiredJobs.some((job) => job.steps === null || job.steps.length === 0)) {
    return result('NO_STEPS_BILLING_OR_PLATFORM_BLOCK', observation, ['REQUIRED_JOB_STEPS_EMPTY'], requiredJobs);
  }

  const jobsExecutedSuccessfully = requiredJobs.every((job) => (
    job.status === 'completed'
    && job.conclusion === 'success'
    && job.steps !== null
    && job.steps.every((step) => step.status === 'completed' && step.conclusion === 'success')
  ));
  const runExecuted = requiredJobs.every((job) => job.steps !== null && job.steps.length > 0);

  if (!runExecuted) return result('NO_STEPS_BILLING_OR_PLATFORM_BLOCK', observation, ['REQUIRED_JOB_STEPS_UNOBSERVABLE'], requiredJobs);

  if (observation.run.status !== 'completed' || observation.run.conclusion !== 'success') {
    if (observation.gateReceipt?.finalResult === 'TEST_FAILURE') {
      return result('EXECUTED_TEST_FAILURE', observation, ['GATE_TEST_FAILURE'], requiredJobs);
    }
    return result('EXECUTED_INFRA_FAILURE', observation, ['RUN_NOT_SUCCESSFUL'], requiredJobs);
  }

  if (!jobsExecutedSuccessfully) {
    if (observation.gateReceipt?.finalResult === 'TEST_FAILURE') {
      return result('EXECUTED_TEST_FAILURE', observation, ['GATE_TEST_FAILURE'], requiredJobs);
    }
    return result('EXECUTED_INFRA_FAILURE', observation, ['JOB_OR_STEP_FAILURE'], requiredJobs);
  }

  const receipt = observation.gateReceipt;
  if (receipt === null) return result('UNKNOWN', observation, ['GATE_RECEIPT_MISSING'], requiredJobs);
  if (!RECEIPT_DIGEST_RE.test(receipt.receiptDigest)) return result('UNKNOWN', observation, ['GATE_RECEIPT_ID_INVALID'], requiredJobs);
  if (receipt.gateDefinitionDigest !== observation.expectedGateDefinitionDigest) {
    return result('UNKNOWN', observation, ['GATE_DEFINITION_DIGEST_MISMATCH'], requiredJobs);
  }
  if (receipt.finalResult === 'TEST_FAILURE') return result('EXECUTED_TEST_FAILURE', observation, ['GATE_TEST_FAILURE'], requiredJobs);
  if (receipt.finalResult !== 'PASS') return result('EXECUTED_INFRA_FAILURE', observation, ['GATE_RESULT_NOT_PASS'], requiredJobs);
  if (!requiredGroupsPass(receipt, observation.expectedRequiredGroupIds)) {
    return result('UNKNOWN', observation, ['REQUIRED_GATE_GROUP_MISSING_OR_SKIPPED'], requiredJobs);
  }
  return result('EXECUTED_GREEN', observation, ['EXACT_HEAD_AND_GATE_PASS'], requiredJobs);
}
