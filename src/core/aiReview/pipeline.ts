// ---------------------------------------------------------------------------
// Explicit owner-invoked AI review pipeline.
//
// AiReviewSession is the only supported provider-execution authority. Provider
// adapters register an internal handler here; callers receive only provider
// metadata and cannot invoke a review operation without passing through the
// session's attempt, deadline, and shared provider-call reservations.
// ---------------------------------------------------------------------------

import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { AiReviewError, asAiReviewError, responseDigest } from './errors';
import { AiReviewArtifactStore } from './storage';
import {
  AI_BUG_DRAFT_SCHEMA_VERSION,
  AI_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_REVIEW_BUDGET,
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  AI_REVIEW_PROMPT_TEMPLATE_VERSION,
  type AiBugDraft,
  type AiBugModelOutput,
  type AiBugReviewInput,
  type AiOracleModelOutput,
  type AiOracleReviewInput,
  type AiOracleSuggestion,
  type AiReviewProvider,
} from './types';
import { digest, stableJson } from './util';
import {
  assertProviderAdapterVersion,
  parseAndValidateBugModelOutput,
  parseAndValidateOracleModelOutput,
  validateAiBugReviewInput,
  validateAiOracleReviewInput,
  validateAiBugDraft,
  validateAiOracleSuggestion,
} from './validation';

export interface AiReviewRunOptions {
  readonly store?: AiReviewArtifactStore;
  readonly now?: () => Date;
  readonly clock?: () => number;
  readonly timeoutMs?: number;
}

export interface AiReviewResult<T> {
  readonly artifact: T;
  readonly artifactPath: string | null;
  readonly responseDigest: string;
  readonly modelInvocationId: string;
}

type ProviderOperation = 'BUG_CANDIDATE' | 'ORACLE_SUGGESTION';
export type AiReviewProviderHandler = (
  operation: ProviderOperation,
  input: AiBugReviewInput | AiOracleReviewInput,
) => Promise<string | Uint8Array>;

const providerHandlers = new WeakMap<object, AiReviewProviderHandler>();

/** @internal Provider adapters register behavior; this is not an execution API. */
export function registerAiReviewProvider(provider: AiReviewProvider, handler: AiReviewProviderHandler): void {
  if (providerHandlers.has(provider)) throw new Error('AI_PROVIDER_ALREADY_REGISTERED');
  providerHandlers.set(provider, handler);
}

function invokeRegisteredProvider(
  provider: AiReviewProvider,
  operation: ProviderOperation,
  input: AiBugReviewInput | AiOracleReviewInput,
): Promise<string | Uint8Array> {
  const handler = providerHandlers.get(provider);
  if (handler === undefined) throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  return handler(operation, input);
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function inputBytes(input: unknown): number {
  return Buffer.byteLength(stableJson(input), 'utf8');
}

function mapInputError(error: unknown, metadata: { readonly schemaVersion: string }): AiReviewError {
  if (error instanceof Error && error.message.startsWith('AI_INPUT_NOT_ELIGIBLE')) return new AiReviewError('AI_INPUT_NOT_ELIGIBLE', { schemaVersion: metadata.schemaVersion });
  return new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { schemaVersion: metadata.schemaVersion });
}

function mapOutputError(error: unknown, metadata: { readonly schemaVersion: string; readonly providerClass: string; readonly outputBytes?: number; readonly responseDigest?: string }): AiReviewError {
  if (error instanceof AiReviewError) return error;
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('AI_PROVIDER_OUTPUT_TOO_LARGE')) return new AiReviewError('AI_PROVIDER_OUTPUT_TOO_LARGE', metadata);
  if (message.startsWith('AI_PROVIDER_MALFORMED_OUTPUT')) return new AiReviewError('AI_PROVIDER_MALFORMED_OUTPUT', metadata);
  if (message.startsWith('AI_OUTPUT_REFERENCE_INVALID')) return new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', metadata);
  if (message.startsWith('AI_OUTPUT_PRIVACY_BLOCKED') || message.startsWith('AI_INPUT_PRIVACY_BLOCKED')) return new AiReviewError('AI_OUTPUT_PRIVACY_BLOCKED', metadata);
  return new AiReviewError('AI_OUTPUT_SCHEMA_INVALID', metadata);
}

function assertLocalProvider(provider: AiReviewProvider | null): AiReviewProvider {
  if (provider === null) throw new AiReviewError('AI_PROVIDER_DISABLED');
  if (provider.providerClass !== 'SYNTHETIC_LOCAL' && provider.providerClass !== 'LOOPBACK_LOCAL') throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  if (!providerHandlers.has(provider)) throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  if (!/^[A-Za-z0-9_.:/-]{1,100}$/.test(provider.modelIdentifier)) throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  try {
    assertProviderAdapterVersion(provider.adapterVersion);
  } catch {
    throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  }
  return provider;
}

async function callProvider(provider: AiReviewProvider, operation: ProviderOperation, input: AiBugReviewInput | AiOracleReviewInput, timeoutMs: number, schemaVersion: string): Promise<string | Uint8Array> {
  const boundedTimeout = Math.min(Math.max(1, timeoutMs), AI_REVIEW_BUDGET.perCallTimeoutMs);
  let timer: NodeJS.Timeout | undefined;
  try {
    return await new Promise<string | Uint8Array>((resolve, reject) => {
      timer = setTimeout(() => reject(new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion })), boundedTimeout);
      invokeRegisteredProvider(provider, operation, input).then(resolve, (error: unknown) => reject(asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion })));
    });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function assertBugReferences(output: AiBugModelOutput, input: AiBugReviewInput): void {
  const evidence = new Set(input.availableEvidenceRefs);
  const sources = new Set(input.availableSourceRefs);
  if (output.candidateId !== input.facts.candidateId || output.inputPackageId !== input.inputPackageId || output.inputPackageDigest !== input.inputPackageDigest) throw new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', { schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
  if (output.evidenceLevelAtGeneration !== input.facts.evidenceLevel) throw new AiReviewError('AI_OUTPUT_SCHEMA_INVALID', { schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
  if (output.evidenceRefs.some((reference) => !evidence.has(reference)) || output.sourceRefs.some((reference) => !sources.has(reference))) throw new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', { schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
}

function assertOracleReferences(output: AiOracleModelOutput, input: AiOracleReviewInput): void {
  const changes = new Set(input.changeEvidenceRefs);
  const snapshots = new Set(input.sourceSnapshotRefs);
  if (output.inputChangePackageId !== input.inputChangePackageId) throw new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', { schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
  if (output.changeEvidenceRefs.some((reference) => !changes.has(reference)) || output.sourceSnapshotRefs.some((reference) => !snapshots.has(reference))) throw new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', { schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
  if (!input.affectedSurfaces.includes(output.affectedSurface)) throw new AiReviewError('AI_OUTPUT_REFERENCE_INVALID', { schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
  if (input.knownDeterministicInvariants.includes(output.proposedInvariant)) throw new AiReviewError('AI_OUTPUT_SCHEMA_INVALID', { schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
}

function bugDraft(input: AiBugReviewInput, output: AiBugModelOutput, provider: AiReviewProvider, raw: string | Uint8Array, now: () => Date): AiBugDraft {
  const outputDigest = responseDigest(raw);
  const invocationId = `invocation:${digest({ inputPackageDigest: input.inputPackageDigest, providerClass: provider.providerClass, modelIdentifier: provider.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, responseDigest: outputDigest })}`;
  const draftId = `draft:${digest({ schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION, inputPackageDigest: input.inputPackageDigest, providerClass: provider.providerClass, modelIdentifier: provider.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, responseDigest: outputDigest })}`;
  return validateAiBugDraft({
    schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION,
    draftId,
    inputPackageId: input.inputPackageId,
    inputPackageDigest: input.inputPackageDigest,
    candidateId: input.facts.candidateId,
    evidenceLevelAtGeneration: input.facts.evidenceLevel,
    modelProviderClass: provider.providerClass,
    modelIdentifier: provider.modelIdentifier,
    modelInvocationId: invocationId,
    promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION,
    inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    providerAdapterVersion: provider.adapterVersion,
    dossierVersion: input.dossierVersion,
    generatedAt: nowIso(now),
    status: 'AI_GENERATED_UNREVIEWED',
    provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED',
    summaryDraft: output.summaryDraft,
    reproductionDraft: output.reproductionDraft,
    observedBehaviorDraft: output.observedBehaviorDraft,
    expectedBehaviorDraft: output.expectedBehaviorDraft,
    impactDraft: output.impactDraft,
    hypotheses: output.hypotheses,
    evidenceRefs: output.evidenceRefs,
    sourceRefs: output.sourceRefs,
    sourceSnapshotRefs: input.sourceSnapshotRefs,
    uncertainties: output.uncertainties,
    humanReviewRequired: true,
    externalPublication: 'PROHIBITED',
    safety: input.safety,
    privacy: input.privacy,
    responseDigest: outputDigest,
  });
}

function oracleSuggestion(input: AiOracleReviewInput, output: AiOracleModelOutput, provider: AiReviewProvider, raw: string | Uint8Array, now: () => Date): AiOracleSuggestion {
  const outputDigest = responseDigest(raw);
  const suggestionId = `suggestion:${digest({ schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION, inputChangePackageDigest: input.inputChangePackageDigest, providerClass: provider.providerClass, modelIdentifier: provider.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, responseDigest: outputDigest })}`;
  const invocationId = `invocation:${digest({ inputChangePackageDigest: input.inputChangePackageDigest, providerClass: provider.providerClass, modelIdentifier: provider.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, responseDigest: outputDigest })}`;
  return validateAiOracleSuggestion({
    schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION,
    suggestionId,
    inputChangePackageId: input.inputChangePackageId,
    inputChangePackageDigest: input.inputChangePackageDigest,
    modelProviderClass: provider.providerClass,
    modelIdentifier: provider.modelIdentifier,
    modelInvocationId: invocationId,
    promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION,
    inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    providerAdapterVersion: provider.adapterVersion,
    generatedAt: nowIso(now),
    changeEvidenceRefs: output.changeEvidenceRefs,
    sourceSnapshotRefs: output.sourceSnapshotRefs,
    affectedSurface: output.affectedSurface,
    proposedInvariant: output.proposedInvariant,
    proposedObservationClasses: output.proposedObservationClasses,
    rationale: output.rationale,
    possibleFalsePositiveModes: output.possibleFalsePositiveModes,
    requiredDeterministicEvidence: output.requiredDeterministicEvidence,
    requiredFixtureCoverage: output.requiredFixtureCoverage,
    riskNotes: output.riskNotes,
    humanReviewRequired: true,
    executable: false,
    status: 'AI_GENERATED_UNREVIEWED',
    provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED',
    externalPublication: 'PROHIBITED',
    safety: input.safety,
    privacy: input.privacy,
    responseDigest: outputDigest,
  });
}

function mapStorageError(error: unknown): AiReviewError {
  if (error instanceof AiReviewError) return error;
  if (error instanceof Error && error.message === 'AI_REVIEW_ARTIFACT_IMMUTABLE') return new AiReviewError('AI_REVIEW_ARTIFACT_IMMUTABLE');
  if (error instanceof Error && error.message === 'AI_REVIEW_CONFLICTING_DECISIONS') return new AiReviewError('AI_REVIEW_CONFLICTING_DECISIONS');
  return new AiReviewError('AI_REVIEW_STORAGE_FAILED');
}

export class AiReviewSession {
  readonly provider: AiReviewProvider | null;
  readonly options: AiReviewRunOptions;
  private candidateReviewAttempts = 0;
  private oracleSuggestionAttempts = 0;
  private providerCalls = 0;
  private readonly startedAt: number;
  private readonly clock: () => number;

  constructor(provider: AiReviewProvider | null, options: AiReviewRunOptions = {}) {
    this.provider = provider;
    this.options = options;
    this.clock = options.clock ?? (() => Date.now());
    this.startedAt = this.clock();
  }

  async reviewBugCandidate(input: unknown): Promise<AiReviewResult<AiBugDraft>> {
    this.reserveAttempt('BUG_CANDIDATE');
    assertOwnerPolicyAllows('AI_REVIEW_LOCAL');
    let validatedInput: AiBugReviewInput;
    try {
      validatedInput = validateAiBugReviewInput(input);
    } catch (error) {
      throw mapInputError(error, { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION });
    }
    return this.runBugReview(validatedInput);
  }

  async suggestOracle(input: unknown): Promise<AiReviewResult<AiOracleSuggestion>> {
    this.reserveAttempt('ORACLE_SUGGESTION');
    assertOwnerPolicyAllows('AI_ORACLE_SUGGESTION_LOCAL');
    let validatedInput: AiOracleReviewInput;
    try {
      validatedInput = validateAiOracleReviewInput(input);
    } catch (error) {
      throw mapInputError(error, { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION });
    }
    return this.runOracleReview(validatedInput);
  }

  usage(): { readonly candidateReviewAttempts: number; readonly oracleSuggestionAttempts: number; readonly providerCalls: number } {
    return {
      candidateReviewAttempts: this.candidateReviewAttempts,
      oracleSuggestionAttempts: this.oracleSuggestionAttempts,
      providerCalls: this.providerCalls,
    };
  }

  private reserveAttempt(operation: ProviderOperation): void {
    if (operation === 'BUG_CANDIDATE') {
      if (this.candidateReviewAttempts >= AI_REVIEW_BUDGET.maxCandidateReviews) throw new AiReviewError('AI_REVIEW_BUDGET_EXHAUSTED');
      this.candidateReviewAttempts += 1;
    } else {
      if (this.oracleSuggestionAttempts >= AI_REVIEW_BUDGET.maxOracleSuggestions) throw new AiReviewError('AI_REVIEW_BUDGET_EXHAUSTED');
      this.oracleSuggestionAttempts += 1;
    }
    if (this.elapsedMs() >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_REVIEW_RUNTIME_BUDGET_EXHAUSTED');
  }

  private reserveProviderCall(provider: AiReviewProvider): void {
    if (this.elapsedMs() >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_REVIEW_RUNTIME_BUDGET_EXHAUSTED', { providerClass: provider.providerClass });
    if (this.providerCalls >= AI_REVIEW_BUDGET.maxProviderCalls) throw new AiReviewError('AI_REVIEW_PROVIDER_BUDGET_EXHAUSTED', { providerClass: provider.providerClass });
    // This synchronous reservation happens before Promise creation and before
    // the provider handler can observe the request.
    this.providerCalls += 1;
  }

  private elapsedMs(): number {
    return Math.max(0, this.clock() - this.startedAt);
  }

  private async runBugReview(input: AiBugReviewInput): Promise<AiReviewResult<AiBugDraft>> {
    const bytes = inputBytes(input);
    if (bytes > AI_REVIEW_BUDGET.maxInputBytes) throw new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, inputBytes: bytes });
    const provider = assertLocalProvider(this.provider);
    this.reserveProviderCall(provider);
    let raw: string | Uint8Array;
    try {
      raw = await callProvider(provider, 'BUG_CANDIDATE', input, this.options.timeoutMs ?? AI_REVIEW_BUDGET.perCallTimeoutMs, AI_BUG_DRAFT_SCHEMA_VERSION);
    } catch (error) {
      throw asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
    }
    if (this.elapsedMs() >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
    const outputBytes = typeof raw === 'string' ? Buffer.byteLength(raw, 'utf8') : raw.byteLength;
    if (outputBytes > AI_REVIEW_BUDGET.maxOutputBytes) throw new AiReviewError('AI_PROVIDER_OUTPUT_TOO_LARGE', { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION, outputBytes });
    const rawDigest = responseDigest(raw);
    let output: AiBugModelOutput;
    try {
      output = parseAndValidateBugModelOutput(raw);
      assertBugReferences(output, input);
    } catch (error) {
      throw mapOutputError(error, { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION, outputBytes, responseDigest: rawDigest });
    }
    const artifact = bugDraft(input, output, provider, raw, this.options.now ?? (() => new Date()));
    let artifactPath: string | null = null;
    if (this.options.store !== undefined) {
      try {
        artifactPath = this.options.store.writeBugDraft(artifact);
      } catch (error) {
        throw mapStorageError(error);
      }
    }
    return { artifact, artifactPath, responseDigest: rawDigest, modelInvocationId: artifact.modelInvocationId };
  }

  private async runOracleReview(input: AiOracleReviewInput): Promise<AiReviewResult<AiOracleSuggestion>> {
    const bytes = inputBytes(input);
    if (bytes > AI_REVIEW_BUDGET.maxInputBytes) throw new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, inputBytes: bytes });
    const provider = assertLocalProvider(this.provider);
    this.reserveProviderCall(provider);
    let raw: string | Uint8Array;
    try {
      raw = await callProvider(provider, 'ORACLE_SUGGESTION', input, this.options.timeoutMs ?? AI_REVIEW_BUDGET.perCallTimeoutMs, AI_ORACLE_SUGGESTION_SCHEMA_VERSION);
    } catch (error) {
      throw asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
    }
    if (this.elapsedMs() >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
    const outputBytes = typeof raw === 'string' ? Buffer.byteLength(raw, 'utf8') : raw.byteLength;
    if (outputBytes > AI_REVIEW_BUDGET.maxOutputBytes) throw new AiReviewError('AI_PROVIDER_OUTPUT_TOO_LARGE', { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION, outputBytes });
    const rawDigest = responseDigest(raw);
    let output: AiOracleModelOutput;
    try {
      output = parseAndValidateOracleModelOutput(raw);
      assertOracleReferences(output, input);
    } catch (error) {
      throw mapOutputError(error, { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION, outputBytes, responseDigest: rawDigest });
    }
    const artifact = oracleSuggestion(input, output, provider, raw, this.options.now ?? (() => new Date()));
    let artifactPath: string | null = null;
    if (this.options.store !== undefined) {
      try {
        artifactPath = this.options.store.writeOracleSuggestion(artifact);
      } catch (error) {
        throw mapStorageError(error);
      }
    }
    return { artifact, artifactPath, responseDigest: rawDigest, modelInvocationId: artifact.modelInvocationId };
  }
}
