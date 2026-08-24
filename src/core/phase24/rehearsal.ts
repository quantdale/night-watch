import { assertNoRawArtifactFields, digest, invalid } from './common';
import { validatePhase24Manifest, manifestCandidateBinding } from './manifest';
import { portfolioCandidateById, validatePhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_REHEARSAL_VERSION,
  type Phase24CandidatePortfolio,
  type Phase24Manifest,
  type Phase24NoContactRehearsalReceipt,
} from './types';

const STAGES: readonly string[] = [
  'MANIFEST_RESOLVED',
  'CANDIDATE_SELECTION_RESOLVED',
  'SCENARIO_CONSTRUCTED',
  'ENVIRONMENT_DEV_PLANNING_ONLY',
  'POLICY_READ_ONLY_RESOLVED',
  'CONTAINMENT_LOOPBACK_READY',
  'BROWSER_ACTION_PLANS_BUILT',
  'DETERMINISTIC_ORACLES_ATTACHED',
  'REPLAY_PLANS_STRUCTURALLY_VALID',
  'DOSSIER_OWNER_LOCAL_ROUTED',
  'TEARDOWN_COMPLETE',
];

/**
 * Rehearse the complete future campaign shape without a network, browser,
 * auth read, filesystem destination, or product adapter callback.
 */
export function buildPhase24NoContactRehearsal(input: { readonly manifest: Phase24Manifest; readonly portfolio: Phase24CandidatePortfolio }): Phase24NoContactRehearsalReceipt {
  assertNoRawArtifactFields(input);
  validatePhase24Manifest(input.manifest);
  validatePhase24CandidatePortfolio(input.portfolio);
  if (input.manifest.portfolioDigest !== input.portfolio.deterministicDigest) invalid('REHEARSAL_PORTFOLIO_STALE');
  for (const candidateId of input.manifest.selectedCandidateIds) {
    const candidate = portfolioCandidateById(input.portfolio, candidateId);
    const binding = manifestCandidateBinding(input.manifest, candidateId);
    if (candidate === null || binding === null) invalid('REHEARSAL_CANDIDATE_MISSING');
    if (candidate.eligibility !== 'ELIGIBLE' || candidate.deterministicDigest !== binding.candidateDecisionDigest) invalid('REHEARSAL_CANDIDATE_NOT_CURRENT');
    if (candidate.route === null || candidate.route.method !== 'GET' || !['NONE', 'READ_ONLY'].includes(candidate.mutationClassification) || !candidate.readOnlySuitable || !candidate.projectionSafe) invalid('REHEARSAL_ACTION_NOT_ALLOWED');
    if (candidate.semanticExpectationId !== binding.semanticExpectationId || candidate.contract?.contractId !== binding.contractId || candidate.replay?.planIdentity !== binding.replayPlanIdentity) invalid('REHEARSAL_BINDING_MISMATCH');
    if (candidate.replay === null || candidate.replay.maxContexts !== 2 || !['DETERMINISTIC_FIXTURE', 'FIRST_REPLAY'].includes(candidate.replay.strategy)) invalid('REHEARSAL_REPLAY_INVALID');
  }
  if (input.manifest.containment.externalContactAllowed !== false || input.manifest.containment.mutationAllowed !== false || input.manifest.containment.rawPersistenceAllowed !== false || input.manifest.operatorAuthorization === 'NOT_READ' && input.manifest.qualityGate.finalResult !== 'PASS') invalid('REHEARSAL_CONTAINMENT');
  const targetCount = input.manifest.selectedCandidateIds.length;
  const core = {
    schemaVersion: PHASE24_REHEARSAL_VERSION,
    manifestId: input.manifest.manifestId,
    manifestDigest: input.manifest.deterministicDigest,
    candidateCount: targetCount,
    stageCodes: STAGES,
    browserActionCount: targetCount,
    oracleCount: targetCount,
    replayPlanCount: targetCount,
    dossierRouteCount: targetCount,
    externalContactCount: 0 as const,
    mutationCount: 0 as const,
    rawPersistenceCount: 0 as const,
    teardownComplete: true as const,
    result: 'PASS' as const,
  };
  return { ...core, deterministicDigest: digest('rehearsal:', core) };
}

export function validatePhase24NoContactRehearsal(receipt: Phase24NoContactRehearsalReceipt): void {
  assertNoRawArtifactFields(receipt);
  if (receipt.schemaVersion !== PHASE24_REHEARSAL_VERSION || receipt.externalContactCount !== 0 || receipt.mutationCount !== 0 || receipt.rawPersistenceCount !== 0 || receipt.teardownComplete !== true || receipt.result !== 'PASS') invalid('REHEARSAL_RECEIPT_SAFETY');
  if (JSON.stringify(receipt.stageCodes) !== JSON.stringify(STAGES)) invalid('REHEARSAL_STAGE_ORDER');
  if (receipt.candidateCount < 1 || receipt.candidateCount > 6 || receipt.browserActionCount !== receipt.candidateCount || receipt.oracleCount !== receipt.candidateCount || receipt.replayPlanCount !== receipt.candidateCount || receipt.dossierRouteCount !== receipt.candidateCount) invalid('REHEARSAL_COUNTS');
  const core = {
    schemaVersion: receipt.schemaVersion,
    manifestId: receipt.manifestId,
    manifestDigest: receipt.manifestDigest,
    candidateCount: receipt.candidateCount,
    stageCodes: receipt.stageCodes,
    browserActionCount: receipt.browserActionCount,
    oracleCount: receipt.oracleCount,
    replayPlanCount: receipt.replayPlanCount,
    dossierRouteCount: receipt.dossierRouteCount,
    externalContactCount: receipt.externalContactCount,
    mutationCount: receipt.mutationCount,
    rawPersistenceCount: receipt.rawPersistenceCount,
    teardownComplete: receipt.teardownComplete,
    result: receipt.result,
  };
  if (receipt.deterministicDigest !== digest('rehearsal:', core)) invalid('REHEARSAL_RECEIPT_DIGEST');
}
