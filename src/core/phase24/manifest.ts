import {
  assertBoundedInteger,
  assertId,
  assertNoRawArtifactFields,
  assertSourceIdentity,
  canonical,
  DIGEST_RE,
  digest,
  FULL_DIGEST_RE,
  invalid,
  SHA_RE,
} from './common';
import { validatePhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_MANIFEST_VERSION,
  type Phase24CandidateDecision,
  type Phase24CandidatePortfolio,
  type Phase24Manifest,
  type Phase24ManifestCandidateBinding,
  type Phase24ManifestInput,
} from './types';

const MANIFEST_ID_RE = /^manifest:sha256:[0-9a-f]{24}$/;
const RECEIPT_RE = /^receipt:sha256:[0-9a-f]{24}$/;
const CANDIDATE_DIGEST_RE = /^candidate-decision:sha256:[0-9a-f]{24}$/;

function validateInput(input: Phase24ManifestInput): void {
  assertNoRawArtifactFields(input);
  if (!SHA_RE.test(input.nightwatchSha) || input.environment !== 'DEV') invalid('MANIFEST_HEAD_OR_ENVIRONMENT');
  validatePhase24CandidatePortfolio(input.portfolio);
  if (input.selectedCandidateIds.length < 1 || input.selectedCandidateIds.length > 6) invalid('SELECTED_CANDIDATE_BOUND');
  if (input.selectedCandidateIds.length * 2 > 12) invalid('CONTEXT_BOUND');
  if (new Set(input.selectedCandidateIds).size !== input.selectedCandidateIds.length) invalid('SELECTED_CANDIDATE_DUPLICATE');
  if (!DIGEST_RE.test(input.semanticExpectationDigest) || !DIGEST_RE.test(input.replayPlanDigest)) invalid('PLAN_DIGEST');
  if (input.containment.loopbackProxyRequired !== true || input.containment.externalContactAllowed !== false || input.containment.mutationAllowed !== false || input.containment.rawPersistenceAllowed !== false || input.containment.localDestinationClass !== 'OWNER_LOCAL_ONLY') invalid('CONTAINMENT_POLICY');
  assertId(input.containment.version, 'CONTAINMENT_VERSION');
  if (input.policy.operationClass !== 'READ_ONLY' || input.policy.ownerScopeStatus !== 'FROZEN_BY_OWNER' || !DIGEST_RE.test(input.policy.digest)) invalid('OWNER_POLICY');
  assertId(input.policy.version, 'POLICY_VERSION');
  const gate = input.qualityGate;
  if (gate.receiptSchemaVersion !== 'nightwatch.quality-gate-receipt.v1' || !RECEIPT_RE.test(gate.receiptDigest) || !FULL_DIGEST_RE.test(gate.gateDefinitionDigest) || gate.gitHead !== input.nightwatchSha || gate.finalResult !== 'PASS') invalid('QUALITY_GATE_BINDING');
  if (input.operatorAuthorization !== 'EXTERNAL_CI_REQUIRED' && input.operatorAuthorization !== 'NOT_READ') invalid('OPERATOR_AUTHORIZATION');
}

function bindingFor(candidate: Phase24CandidateDecision): Phase24ManifestCandidateBinding {
  if (candidate.eligibility !== 'ELIGIBLE' || candidate.source === null || candidate.contract === null || candidate.replay === null) invalid('SELECTED_CANDIDATE_NOT_EXECUTABLE');
  return {
    candidateId: candidate.candidateId,
    surfaceKey: candidate.surfaceKey,
    source: candidate.source,
    semanticExpectationId: candidate.semanticExpectationId,
    contractId: candidate.contract.contractId,
    replayPlanIdentity: candidate.replay.planIdentity,
    candidateDecisionDigest: candidate.deterministicDigest,
  };
}

function manifestCore(manifest: Omit<Phase24Manifest, 'manifestId' | 'deterministicDigest'>): Record<string, unknown> {
  return {
    schemaVersion: manifest.schemaVersion,
    nightwatchSha: manifest.nightwatchSha,
    environment: manifest.environment,
    selectedCandidateIds: manifest.selectedCandidateIds,
    selectedCandidates: manifest.selectedCandidates,
    portfolioDigest: manifest.portfolioDigest,
    semanticExpectationDigest: manifest.semanticExpectationDigest,
    replayPlanDigest: manifest.replayPlanDigest,
    containment: manifest.containment,
    policy: manifest.policy,
    qualityGate: manifest.qualityGate,
    operatorAuthorization: manifest.operatorAuthorization,
  };
}

/** Create a local-only v3 manifest; it is not accepted by the Phase 23 launcher. */
export function createPhase24Manifest(input: Phase24ManifestInput): Phase24Manifest {
  validateInput(input);
  const selectedIds = [...input.selectedCandidateIds].sort((left, right) => left.localeCompare(right));
  const candidateMap = new Map(input.portfolio.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const selectedCandidates = selectedIds.map((candidateId) => {
    const candidate = candidateMap.get(candidateId);
    if (candidate === undefined) invalid('SELECTED_CANDIDATE_MISSING');
    return bindingFor(candidate);
  });
  const base = {
    schemaVersion: PHASE24_MANIFEST_VERSION,
    nightwatchSha: input.nightwatchSha,
    environment: input.environment,
    selectedCandidateIds: selectedIds,
    selectedCandidates,
    portfolioDigest: input.portfolio.deterministicDigest,
    semanticExpectationDigest: input.semanticExpectationDigest,
    replayPlanDigest: input.replayPlanDigest,
    containment: input.containment,
    policy: input.policy,
    qualityGate: input.qualityGate,
    operatorAuthorization: input.operatorAuthorization,
  } satisfies Omit<Phase24Manifest, 'manifestId' | 'deterministicDigest'>;
  const manifestId = digest('manifest:', base);
  const withId = { ...base, manifestId };
  const manifest: Phase24Manifest = { ...withId, deterministicDigest: digest('manifest:', withId) };
  validatePhase24Manifest(manifest);
  return manifest;
}

export function validatePhase24Manifest(manifest: Phase24Manifest): void {
  assertNoRawArtifactFields(manifest);
  if (manifest.schemaVersion !== PHASE24_MANIFEST_VERSION || !MANIFEST_ID_RE.test(manifest.manifestId) || !MANIFEST_ID_RE.test(manifest.deterministicDigest)) invalid('MANIFEST_HEADER');
  if (!SHA_RE.test(manifest.nightwatchSha) || manifest.environment !== 'DEV') invalid('MANIFEST_ENVIRONMENT');
  if (!Array.isArray(manifest.selectedCandidateIds) || manifest.selectedCandidateIds.length < 1 || manifest.selectedCandidateIds.length > 6 || manifest.selectedCandidateIds.length * 2 > 12) invalid('MANIFEST_TARGET_BOUND');
  if (JSON.stringify(manifest.selectedCandidateIds) !== JSON.stringify([...manifest.selectedCandidateIds].sort((left, right) => left.localeCompare(right)))) invalid('MANIFEST_ORDER');
  if (new Set(manifest.selectedCandidateIds).size !== manifest.selectedCandidateIds.length) invalid('MANIFEST_DUPLICATE');
  if (!Array.isArray(manifest.selectedCandidates) || manifest.selectedCandidates.length !== manifest.selectedCandidateIds.length) invalid('MANIFEST_BINDING_COUNT');
  const bindingIds = manifest.selectedCandidates.map((binding) => binding.candidateId);
  if (JSON.stringify(bindingIds) !== JSON.stringify(manifest.selectedCandidateIds)) invalid('MANIFEST_BINDING_ORDER');
  for (const binding of manifest.selectedCandidates) {
    assertId(binding.candidateId, 'BINDING_CANDIDATE');
    assertId(binding.surfaceKey, 'BINDING_SURFACE');
    assertSourceIdentity(binding.source, 'BINDING');
    assertId(binding.semanticExpectationId, 'BINDING_EXPECTATION');
    assertId(binding.contractId, 'BINDING_CONTRACT');
    assertId(binding.replayPlanIdentity, 'BINDING_REPLAY');
    if (!CANDIDATE_DIGEST_RE.test(binding.candidateDecisionDigest)) invalid('BINDING_DIGEST');
  }
  if (!DIGEST_RE.test(manifest.portfolioDigest) || !DIGEST_RE.test(manifest.semanticExpectationDigest) || !DIGEST_RE.test(manifest.replayPlanDigest)) invalid('MANIFEST_PLAN_DIGEST');
  if (manifest.containment.loopbackProxyRequired !== true || manifest.containment.externalContactAllowed !== false || manifest.containment.mutationAllowed !== false || manifest.containment.rawPersistenceAllowed !== false || manifest.containment.localDestinationClass !== 'OWNER_LOCAL_ONLY') invalid('MANIFEST_CONTAINMENT');
  assertId(manifest.containment.version, 'MANIFEST_CONTAINMENT_VERSION');
  if (manifest.policy.operationClass !== 'READ_ONLY' || manifest.policy.ownerScopeStatus !== 'FROZEN_BY_OWNER' || !DIGEST_RE.test(manifest.policy.digest)) invalid('MANIFEST_POLICY');
  assertId(manifest.policy.version, 'MANIFEST_POLICY_VERSION');
  if (manifest.qualityGate.receiptSchemaVersion !== 'nightwatch.quality-gate-receipt.v1' || !RECEIPT_RE.test(manifest.qualityGate.receiptDigest) || !FULL_DIGEST_RE.test(manifest.qualityGate.gateDefinitionDigest) || manifest.qualityGate.gitHead !== manifest.nightwatchSha || manifest.qualityGate.finalResult !== 'PASS') invalid('MANIFEST_GATE');
  if (manifest.operatorAuthorization !== 'EXTERNAL_CI_REQUIRED' && manifest.operatorAuthorization !== 'NOT_READ') invalid('MANIFEST_AUTHORIZATION');
  const core = manifestCore(manifest);
  if (manifest.manifestId !== digest('manifest:', core)) invalid('MANIFEST_ID_DIGEST');
  if (manifest.deterministicDigest !== digest('manifest:', { ...core, manifestId: manifest.manifestId })) invalid('MANIFEST_DIGEST');
}

export function manifestCandidateBinding(manifest: Phase24Manifest, candidateId: string): Phase24ManifestCandidateBinding | null {
  validatePhase24Manifest(manifest);
  return manifest.selectedCandidates.find((candidate) => candidate.candidateId === candidateId) ?? null;
}

export function phase24ManifestIdentityInputs(manifest: Phase24Manifest): readonly string[] {
  validatePhase24Manifest(manifest);
  return [manifest.nightwatchSha, manifest.portfolioDigest, manifest.semanticExpectationDigest, manifest.replayPlanDigest, manifest.policy.digest, manifest.qualityGate.gateDefinitionDigest, manifest.operatorAuthorization];
}
