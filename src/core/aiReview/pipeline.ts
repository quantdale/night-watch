// ---------------------------------------------------------------------------
// Explicit owner-invoked AI review pipeline.
//
// It is post-processing only. No campaign, oracle, action, browser, API,
// database, infrastructure, Git, or publication callback is available here.
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
  readonly timeoutMs?: number;
}

export interface AiReviewResult<T> {
  readonly artifact: T;
  readonly artifactPath: string | null;
  readonly responseDigest: string;
  readonly modelInvocationId: string;
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
  if (typeof provider.reviewBugCandidate !== 'function' || typeof provider.suggestOracle !== 'function') throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  if (!/^[A-Za-z0-9_.:/-]{1,100}$/.test(provider.modelIdentifier)) throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  assertProviderAdapterVersion(provider.adapterVersion);
  return provider;
}

async function callProvider(provider: AiReviewProvider, call: () => Promise<string | Uint8Array>, timeoutMs: number, schemaVersion: string): Promise<string | Uint8Array> {
  const boundedTimeout = Math.min(Math.max(1, timeoutMs), AI_REVIEW_BUDGET.perCallTimeoutMs);
  let timer: NodeJS.Timeout | undefined;
  try {
    return await new Promise<string | Uint8Array>((resolve, reject) => {
      timer = setTimeout(() => reject(new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion })), boundedTimeout);
      call().then(resolve, (error: unknown) => reject(asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion })));
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

export async function reviewBugCandidate(inputValue: unknown, providerValue: AiReviewProvider | null, options: AiReviewRunOptions = {}): Promise<AiReviewResult<AiBugDraft>> {
  assertOwnerPolicyAllows('AI_REVIEW_LOCAL');
  let input: AiBugReviewInput;
  try {
    input = validateAiBugReviewInput(inputValue);
  } catch (error) {
    throw mapInputError(error, { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION });
  }
  if (inputBytes(input) > AI_REVIEW_BUDGET.maxInputBytes) throw new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, inputBytes: inputBytes(input) });
  const provider = assertLocalProvider(providerValue);
  const started = Date.now();
  let raw: string | Uint8Array;
  try {
    raw = await callProvider(provider, () => provider.reviewBugCandidate(input), options.timeoutMs ?? AI_REVIEW_BUDGET.perCallTimeoutMs, AI_BUG_DRAFT_SCHEMA_VERSION);
  } catch (error) {
    throw asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
  }
  if (Date.now() - started > AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion: AI_BUG_DRAFT_SCHEMA_VERSION });
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
  const artifact = bugDraft(input, output, provider, raw, options.now ?? (() => new Date()));
  const artifactPath = options.store?.writeBugDraft(artifact) ?? null;
  return { artifact, artifactPath, responseDigest: rawDigest, modelInvocationId: artifact.modelInvocationId };
}

export async function suggestOracle(inputValue: unknown, providerValue: AiReviewProvider | null, options: AiReviewRunOptions = {}): Promise<AiReviewResult<AiOracleSuggestion>> {
  assertOwnerPolicyAllows('AI_ORACLE_SUGGESTION_LOCAL');
  let input: AiOracleReviewInput;
  try {
    input = validateAiOracleReviewInput(inputValue);
  } catch (error) {
    throw mapInputError(error, { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION });
  }
  if (inputBytes(input) > AI_REVIEW_BUDGET.maxInputBytes) throw new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION, inputBytes: inputBytes(input) });
  const provider = assertLocalProvider(providerValue);
  const started = Date.now();
  let raw: string | Uint8Array;
  try {
    raw = await callProvider(provider, () => provider.suggestOracle(input), options.timeoutMs ?? AI_REVIEW_BUDGET.perCallTimeoutMs, AI_ORACLE_SUGGESTION_SCHEMA_VERSION);
  } catch (error) {
    throw asAiReviewError(error, 'AI_PROVIDER_UNAVAILABLE', { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
  }
  if (Date.now() - started > AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: provider.providerClass, schemaVersion: AI_ORACLE_SUGGESTION_SCHEMA_VERSION });
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
  const artifact = oracleSuggestion(input, output, provider, raw, options.now ?? (() => new Date()));
  const artifactPath = options.store?.writeOracleSuggestion(artifact) ?? null;
  return { artifact, artifactPath, responseDigest: rawDigest, modelInvocationId: artifact.modelInvocationId };
}

export class AiReviewSession {
  readonly provider: AiReviewProvider | null;
  readonly options: AiReviewRunOptions;
  private candidateReviews = 0;
  private oracleSuggestions = 0;
  private providerCalls = 0;
  private startedAt = Date.now();

  constructor(provider: AiReviewProvider | null, options: AiReviewRunOptions = {}) {
    this.provider = provider;
    this.options = options;
  }

  async reviewBugCandidate(input: unknown): Promise<AiReviewResult<AiBugDraft>> {
    if (this.candidateReviews >= AI_REVIEW_BUDGET.maxCandidateReviews || this.providerCalls >= AI_REVIEW_BUDGET.maxProviderCalls || Date.now() - this.startedAt >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_DISABLED');
    this.candidateReviews += 1;
    this.providerCalls += 1;
    return reviewBugCandidate(input, this.provider, this.options);
  }

  async suggestOracle(input: unknown): Promise<AiReviewResult<AiOracleSuggestion>> {
    if (this.oracleSuggestions >= AI_REVIEW_BUDGET.maxOracleSuggestions || this.providerCalls >= AI_REVIEW_BUDGET.maxProviderCalls || Date.now() - this.startedAt >= AI_REVIEW_BUDGET.maxTotalRuntimeMs) throw new AiReviewError('AI_PROVIDER_DISABLED');
    this.oracleSuggestions += 1;
    this.providerCalls += 1;
    return suggestOracle(input, this.provider, this.options);
  }

  usage(): { readonly candidateReviews: number; readonly oracleSuggestions: number; readonly providerCalls: number } {
    return { candidateReviews: this.candidateReviews, oracleSuggestions: this.oracleSuggestions, providerCalls: this.providerCalls };
  }
}
