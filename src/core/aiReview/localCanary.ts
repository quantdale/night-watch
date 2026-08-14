// ---------------------------------------------------------------------------
// Phase 7B.3 — one-shot local-model protocol canary.
//
// This module is intentionally narrower than the general Phase 7B session:
// one fixed synthetic BUG_CANDIDATE input, one loopback provider, no store,
// no oracle operation, and no retry path. It returns metadata only; model
// prose never crosses this module's result boundary.
// ---------------------------------------------------------------------------

import { AiReviewError } from './errors';
import { LoopbackAiReviewProvider, validateLoopbackEndpoint } from './loopbackProvider';
import { AiReviewSession } from './pipeline';
import {
  AI_BUG_DRAFT_SCHEMA_VERSION,
  AI_REVIEW_BUDGET,
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  PASS_AI_PRIVACY,
  ZERO_AI_SAFETY,
  type AiBugReviewInput,
  type AiReviewFailureCode,
} from './types';
import { digest } from './util';
import { validateAiBugDraft, validateAiBugReviewInput } from './validation';

export const LOCAL_CANARY_INPUT_VERSION = 'nightwatch.local-model-canary-input.private.v1' as const;
export const LOCAL_CANARY_RESULT_VERSION = 'nightwatch.local-model-canary-result.private.v1' as const;
export const LOCAL_CANARY_OPERATION = 'BUG_CANDIDATE' as const;
export const LOCAL_CANARY_ENDPOINT_CLASS = 'LOOPBACK_ONLY' as const;

const MODEL_IDENTIFIER_RE = /^[A-Za-z0-9_.:/-]{1,100}$/;
const CANARY_CANDIDATE_ID = 'synthetic-local-model-canary-candidate-v1';
const CANARY_FINGERPRINT = 'synthetic-local-model-canary-fingerprint-v1';
const CANARY_ROUTE = '/synthetic/local-model-canary';
const CANARY_ACTION = 'synthetic.read.deterministic-observation';

export type LocalCanaryFailureClass =
  | 'FAIL_PROVIDER_UNAVAILABLE'
  | 'FAIL_TIMEOUT'
  | 'FAIL_MALFORMED_OUTPUT'
  | 'FAIL_OUTPUT_TOO_LARGE'
  | 'FAIL_SCHEMA'
  | 'FAIL_REFERENCE'
  | 'FAIL_PRIVACY';

export type LocalCanaryNotRunReason =
  | 'NOT_RUN_RUNTIME_ABSENT'
  | 'NOT_RUN_MODEL_ABSENT'
  | 'NOT_RUN_RUNTIME_UNSAFE'
  | 'NOT_RUN_AMBIGUOUS_CONFIGURATION';

export interface LocalCanaryCliOptions {
  readonly endpoint: string;
  readonly modelIdentifier: string;
  readonly timeoutMs: number;
}

export interface LocalCanaryPassResult {
  readonly resultVersion: typeof LOCAL_CANARY_RESULT_VERSION;
  readonly resultClass: 'PASS';
  readonly providerClass: 'LOOPBACK_LOCAL';
  readonly modelIdentifier: string;
  readonly endpointClass: typeof LOCAL_CANARY_ENDPOINT_CLASS;
  readonly endpointPort: number;
  readonly operation: typeof LOCAL_CANARY_OPERATION;
  readonly inputFixtureVersion: typeof LOCAL_CANARY_INPUT_VERSION;
  readonly inputFixtureDigest: string;
  readonly providerCalls: 1;
  readonly loopbackModelRequests: 1;
  readonly externalAiRequests: 0;
  readonly artifactSchema: typeof AI_BUG_DRAFT_SCHEMA_VERSION;
  readonly draftId: string;
  readonly responseDigest: string;
  readonly evidenceLevelAtGeneration: 'L2';
  readonly referenceValidation: 'PASS';
  readonly privacyValidation: 'PASS';
  readonly artifactPath: null;
  readonly rawModelOutputPersisted: 0;
  readonly ownerReviewWrites: 0;
  readonly productContacts: 0;
}

export class LocalCanaryUsageError extends Error {
  readonly code = 'AI_LOCAL_CANARY_USAGE_INVALID' as const;

  constructor() {
    super('AI_LOCAL_CANARY_USAGE_INVALID');
    this.name = 'LocalCanaryUsageError';
  }
}

export class LocalCanaryNotRunError extends Error {
  readonly reason: LocalCanaryNotRunReason;

  constructor(reason: LocalCanaryNotRunReason) {
    super(reason);
    this.name = 'LocalCanaryNotRunError';
    this.reason = reason;
  }
}

export class LocalCanaryFailureError extends Error {
  readonly resultClass: LocalCanaryFailureClass;
  readonly errorCode: string;
  readonly providerCalls: number;
  readonly loopbackModelRequests: number;
  readonly responseDigest: string | null;
  readonly outputBytes: number | null;

  constructor(options: {
    readonly resultClass: LocalCanaryFailureClass;
    readonly errorCode: string;
    readonly providerCalls: number;
    readonly loopbackModelRequests: number;
    readonly responseDigest?: string;
    readonly outputBytes?: number;
  }) {
    super(options.resultClass);
    this.name = 'LocalCanaryFailureError';
    this.resultClass = options.resultClass;
    this.errorCode = /^[A-Z0-9_]+$/.test(options.errorCode) ? options.errorCode : 'AI_PROVIDER_UNAVAILABLE';
    this.providerCalls = options.providerCalls === 1 ? 1 : 0;
    this.loopbackModelRequests = options.loopbackModelRequests === 1 ? 1 : 0;
    this.responseDigest = typeof options.responseDigest === 'string' && /^sha256:[a-f0-9]{64}$/.test(options.responseDigest) ? options.responseDigest : null;
    this.outputBytes = typeof options.outputBytes === 'number' && Number.isSafeInteger(options.outputBytes) && options.outputBytes >= 0 && options.outputBytes <= AI_REVIEW_BUDGET.maxOutputBytes * 2 ? options.outputBytes : null;
  }
}

export interface LocalCanaryHelp {
  readonly help: true;
}

export type ParsedLocalCanaryArgs = LocalCanaryHelp | LocalCanaryCliOptions;

function canaryInputBase(): Record<string, unknown> {
  const upstreamPackage = {
    schemaVersion: 'nightwatch.ai-ready-evidence.private.v1',
    deterministic: true,
    evidence: {
      candidateId: CANARY_CANDIDATE_ID,
      title: 'Synthetic local-model canary candidate',
      routeClass: CANARY_ROUTE,
      apiOperationFamily: 'synthetic-read-only-observation',
      oracleFingerprint: CANARY_FINGERPRINT,
      minimalSequence: [CANARY_ACTION],
      confidence: 'MEDIUM',
      faultBoundary: 'UI_COMPONENT',
      sourceCandidateCount: 0,
    },
    allowedUses: ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'],
    oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY',
    prohibitedUses: ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'],
  };
  const evidenceRefs = [
    `candidate:${CANARY_CANDIDATE_ID}`,
    `fingerprint:${CANARY_FINGERPRINT}`,
    `route:${CANARY_ROUTE}`,
    `action:${CANARY_ACTION}`,
  ];
  return {
    schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    kind: 'BUG_CANDIDATE',
    inputPackageId: null,
    inputPackageDigest: null,
    dossierVersion: 'nightwatch.bug-dossier.private.v1',
    upstreamPackage,
    facts: {
      candidateId: CANARY_CANDIDATE_ID,
      evidenceLevel: 'L2',
      routeClass: CANARY_ROUTE,
      apiOperationFamily: 'synthetic-read-only-observation',
      oracleFingerprint: CANARY_FINGERPRINT,
      sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
      technicalSeverity: 'LOW',
      triagePriority: 'P3',
      browserApiStatus: 'NOT_AVAILABLE',
      deterministicFaultBoundary: 'UI_COMPONENT',
    },
    evidenceRefs,
    sourceRefs: [],
    sourceSnapshotRefs: ['source:synthetic-local-model-canary@v1'],
    availableEvidenceRefs: evidenceRefs,
    availableSourceRefs: [],
    structuralEvidence: {
      title: 'Synthetic local-model canary candidate',
      minimalActionIds: [CANARY_ACTION],
      routeClass: CANARY_ROUTE,
      apiOperationFamily: 'synthetic-read-only-observation',
      browserApiStatus: 'NOT_AVAILABLE',
      sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
      uncertaintyClasses: ['DEPLOYMENT_STATUS_UNRESOLVED', 'SYNTHETIC_FIXTURE_ONLY'],
    },
    privacy: PASS_AI_PRIVACY,
    safety: ZERO_AI_SAFETY,
  };
}

/** Return a fresh validated copy of the repository-owned synthetic L2 input. */
export function fixedSyntheticCanaryInput(): AiBugReviewInput {
  const base = canaryInputBase();
  const inputDigest = digest(base);
  return validateAiBugReviewInput({
    ...base,
    inputPackageId: `ai-input:${inputDigest}`,
    inputPackageDigest: inputDigest,
  });
}

export function fixedSyntheticCanaryInputDigest(): string {
  return fixedSyntheticCanaryInput().inputPackageDigest;
}

function assertModelIdentifier(modelIdentifier: string): void {
  if (!MODEL_IDENTIFIER_RE.test(modelIdentifier)) throw new LocalCanaryNotRunError('NOT_RUN_AMBIGUOUS_CONFIGURATION');
}

function assertTimeout(timeoutMs: number): void {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > AI_REVIEW_BUDGET.perCallTimeoutMs) throw new LocalCanaryNotRunError('NOT_RUN_AMBIGUOUS_CONFIGURATION');
}

function nextArgument(args: readonly string[], index: number): string {
  const value = args[index + 1];
  if (value === undefined || value.length === 0 || value.startsWith('--')) throw new LocalCanaryUsageError();
  return value;
}

/** Parse only the bounded canary options; no prompt or input option exists. */
export function parseLocalCanaryArgs(args: readonly string[]): ParsedLocalCanaryArgs {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length === 0) throw new LocalCanaryUsageError();

  let endpoint: string | undefined;
  let modelIdentifier: string | undefined;
  let timeoutMs: number = AI_REVIEW_BUDGET.perCallTimeoutMs;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--endpoint') {
      if (endpoint !== undefined) throw new LocalCanaryUsageError();
      endpoint = nextArgument(args, index);
      index += 1;
    } else if (argument === '--model') {
      if (modelIdentifier !== undefined) throw new LocalCanaryUsageError();
      modelIdentifier = nextArgument(args, index);
      assertModelIdentifier(modelIdentifier);
      index += 1;
    } else if (argument === '--timeout-ms') {
      if (timeoutMs !== AI_REVIEW_BUDGET.perCallTimeoutMs || index + 1 >= args.length) throw new LocalCanaryUsageError();
      const raw = nextArgument(args, index);
      if (!/^\d+$/.test(raw)) throw new LocalCanaryUsageError();
      timeoutMs = Number(raw);
      if (!Number.isSafeInteger(timeoutMs)) throw new LocalCanaryUsageError();
      assertTimeout(timeoutMs);
      index += 1;
    } else {
      throw new LocalCanaryUsageError();
    }
  }
  if (endpoint === undefined || modelIdentifier === undefined) throw new LocalCanaryUsageError();
  return { endpoint, modelIdentifier, timeoutMs };
}

function failureClass(error: AiReviewFailureCode): LocalCanaryFailureClass {
  if (error === 'AI_PROVIDER_TIMEOUT' || error === 'AI_REVIEW_RUNTIME_BUDGET_EXHAUSTED') return 'FAIL_TIMEOUT';
  if (error === 'AI_PROVIDER_MALFORMED_OUTPUT') return 'FAIL_MALFORMED_OUTPUT';
  if (error === 'AI_PROVIDER_OUTPUT_TOO_LARGE') return 'FAIL_OUTPUT_TOO_LARGE';
  if (error === 'AI_OUTPUT_REFERENCE_INVALID') return 'FAIL_REFERENCE';
  if (error === 'AI_OUTPUT_PRIVACY_BLOCKED' || error === 'AI_INPUT_PRIVACY_BLOCKED') return 'FAIL_PRIVACY';
  if (error === 'AI_OUTPUT_SCHEMA_INVALID') return 'FAIL_SCHEMA';
  return 'FAIL_PROVIDER_UNAVAILABLE';
}

function providerErrorMetadata(error: unknown): { readonly code: AiReviewFailureCode; readonly responseDigest?: string; readonly outputBytes?: number } {
  if (error instanceof AiReviewError) return { code: error.code, responseDigest: error.metadata.responseDigest, outputBytes: error.metadata.outputBytes };
  return { code: 'AI_PROVIDER_UNAVAILABLE' };
}

function counterInvariant(session: AiReviewSession): void {
  const usage = session.usage();
  if (usage.candidateReviewAttempts !== 1 || usage.oracleSuggestionAttempts !== 0 || usage.providerCalls > 1) throw new LocalCanaryFailureError({
    resultClass: 'FAIL_SCHEMA',
    errorCode: 'LOCAL_CANARY_COUNTER_INVARIANT_FAILED',
    providerCalls: usage.providerCalls,
    loopbackModelRequests: usage.providerCalls,
  });
}

/**
 * Run exactly one real BUG_CANDIDATE operation over fixed synthetic input.
 * The return type deliberately contains no artifact or model prose.
 */
export async function runSingleLocalCanary(options: LocalCanaryCliOptions): Promise<LocalCanaryPassResult> {
  assertModelIdentifier(options.modelIdentifier);
  assertTimeout(options.timeoutMs);
  let endpoint: URL;
  try {
    endpoint = validateLoopbackEndpoint(options.endpoint);
  } catch {
    throw new LocalCanaryNotRunError('NOT_RUN_RUNTIME_UNSAFE');
  }
  const input = fixedSyntheticCanaryInput();
  const provider = new LoopbackAiReviewProvider({ endpoint: endpoint.toString(), modelIdentifier: options.modelIdentifier, timeoutMs: options.timeoutMs });
  const session = new AiReviewSession(provider, { timeoutMs: options.timeoutMs });
  const before = session.usage();
  if (before.candidateReviewAttempts !== 0 || before.oracleSuggestionAttempts !== 0 || before.providerCalls !== 0) throw new LocalCanaryFailureError({
    resultClass: 'FAIL_SCHEMA',
    errorCode: 'LOCAL_CANARY_PRECALL_INVARIANT_FAILED',
    providerCalls: before.providerCalls,
    loopbackModelRequests: before.providerCalls,
  });

  let result;
  try {
    result = await session.reviewBugCandidate(input);
  } catch (error) {
    counterInvariant(session);
    const metadata = providerErrorMetadata(error);
    const usage = session.usage();
    throw new LocalCanaryFailureError({
      resultClass: failureClass(metadata.code),
      errorCode: metadata.code,
      providerCalls: usage.providerCalls,
      loopbackModelRequests: usage.providerCalls,
      responseDigest: metadata.responseDigest,
      outputBytes: metadata.outputBytes,
    });
  }

  const usage = session.usage();
  if (usage.candidateReviewAttempts !== 1 || usage.oracleSuggestionAttempts !== 0 || usage.providerCalls !== 1) throw new LocalCanaryFailureError({
    resultClass: 'FAIL_SCHEMA',
    errorCode: 'LOCAL_CANARY_POSTCALL_INVARIANT_FAILED',
    providerCalls: usage.providerCalls,
    loopbackModelRequests: usage.providerCalls,
  });
  try {
    const artifact = validateAiBugDraft(result.artifact);
    if (result.artifactPath !== null) throw new Error('LOCAL_CANARY_ARTIFACT_PERSISTED');
    if (artifact.evidenceRefs.some((reference) => !input.availableEvidenceRefs.includes(reference)) || artifact.sourceRefs.some((reference) => !input.availableSourceRefs.includes(reference))) throw new Error('AI_OUTPUT_REFERENCE_INVALID');
    if (artifact.privacy.result !== 'PASS' || Object.entries(artifact.privacy).some(([key, value]) => key !== 'result' && value !== false)) throw new Error('AI_OUTPUT_PRIVACY_BLOCKED');
    if (artifact.safety.productionAttempts !== 0 || artifact.safety.productMutations !== 0 || artifact.safety.databaseQueries !== 0 || artifact.safety.infrastructureQueries !== 0 || artifact.safety.externalAiCalls !== 0 || artifact.safety.aiToolExecutions !== 0) throw new Error('AI_OUTPUT_PRIVACY_BLOCKED');
    if (artifact.evidenceLevelAtGeneration !== 'L2' || artifact.schemaVersion !== AI_BUG_DRAFT_SCHEMA_VERSION || artifact.status !== 'AI_GENERATED_UNREVIEWED') throw new Error('AI_OUTPUT_SCHEMA_INVALID');
    return {
      resultVersion: LOCAL_CANARY_RESULT_VERSION,
      resultClass: 'PASS',
      providerClass: provider.providerClass,
      modelIdentifier: provider.modelIdentifier,
      endpointClass: LOCAL_CANARY_ENDPOINT_CLASS,
      endpointPort: Number(endpoint.port),
      operation: LOCAL_CANARY_OPERATION,
      inputFixtureVersion: LOCAL_CANARY_INPUT_VERSION,
      inputFixtureDigest: input.inputPackageDigest,
      providerCalls: 1,
      loopbackModelRequests: 1,
      externalAiRequests: 0,
      artifactSchema: artifact.schemaVersion,
      draftId: artifact.draftId,
      responseDigest: result.responseDigest,
      evidenceLevelAtGeneration: artifact.evidenceLevelAtGeneration,
      referenceValidation: 'PASS',
      privacyValidation: 'PASS',
      artifactPath: null,
      rawModelOutputPersisted: 0,
      ownerReviewWrites: 0,
      productContacts: 0,
    };
  } catch (error) {
    const code = error instanceof Error && error.message === 'AI_OUTPUT_REFERENCE_INVALID'
      ? 'AI_OUTPUT_REFERENCE_INVALID'
      : error instanceof Error && error.message === 'AI_OUTPUT_PRIVACY_BLOCKED'
        ? 'AI_OUTPUT_PRIVACY_BLOCKED'
        : 'AI_OUTPUT_SCHEMA_INVALID';
    throw new LocalCanaryFailureError({ resultClass: failureClass(code), errorCode: code, providerCalls: 1, loopbackModelRequests: 1, responseDigest: result.responseDigest });
  }
}

export function formatLocalCanaryPass(result: LocalCanaryPassResult): string {
  return [
    'CANARY=PASS',
    `providerClass=${result.providerClass}`,
    `modelIdentifier=${result.modelIdentifier}`,
    `endpointClass=${result.endpointClass}`,
    `endpointPort=${result.endpointPort}`,
    `operation=${result.operation}`,
    `inputFixtureVersion=${result.inputFixtureVersion}`,
    `inputFixtureDigest=${result.inputFixtureDigest}`,
    `providerCalls=${result.providerCalls}`,
    `loopbackModelRequests=${result.loopbackModelRequests}`,
    `externalAiRequests=${result.externalAiRequests}`,
    `artifactSchema=${result.artifactSchema}`,
    `draftId=${result.draftId}`,
    `responseDigest=${result.responseDigest}`,
    `evidenceLevelAtGeneration=${result.evidenceLevelAtGeneration}`,
    `referenceValidation=${result.referenceValidation}`,
    `privacyValidation=${result.privacyValidation}`,
    'artifactPath=NONE',
    `rawModelOutputPersisted=${result.rawModelOutputPersisted}`,
    `ownerReviewWrites=${result.ownerReviewWrites}`,
    `productContacts=${result.productContacts}`,
  ].join('\n');
}

export function formatLocalCanaryFailure(error: LocalCanaryFailureError, modelIdentifier: string): string {
  return [
    'CANARY=FAIL',
    `failureClass=${error.resultClass}`,
    `errorCode=${error.errorCode}`,
    'providerClass=LOOPBACK_LOCAL',
    `modelIdentifier=${modelIdentifier}`,
    'endpointClass=LOOPBACK_ONLY',
    'operation=BUG_CANDIDATE',
    `inputFixtureVersion=${LOCAL_CANARY_INPUT_VERSION}`,
    `inputFixtureDigest=${fixedSyntheticCanaryInputDigest()}`,
    `providerCalls=${error.providerCalls}`,
    `loopbackModelRequests=${error.loopbackModelRequests}`,
    'externalAiRequests=0',
    `responseDigest=${error.responseDigest ?? 'NONE'}`,
    `outputBytes=${error.outputBytes ?? 'NONE'}`,
    'artifactPath=NONE',
    'rawModelOutputPersisted=0',
    'ownerReviewWrites=0',
    'productContacts=0',
  ].join('\n');
}

export function formatLocalCanaryNotRun(error: LocalCanaryNotRunError): string {
  return [
    'LOCAL_MODEL_CANARY_NOT_RUN',
    `reason=${error.reason}`,
    `inputFixtureVersion=${LOCAL_CANARY_INPUT_VERSION}`,
    `inputFixtureDigest=${fixedSyntheticCanaryInputDigest()}`,
    'providerCalls=0',
    'loopbackModelRequests=0',
    'externalAiRequests=0',
    'artifactPath=NONE',
    'rawModelOutputPersisted=0',
    'ownerReviewWrites=0',
    'productContacts=0',
  ].join('\n');
}
