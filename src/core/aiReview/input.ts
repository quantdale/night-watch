// ---------------------------------------------------------------------------
// Sanitized input builders.
//
// These builders are the only supported bridge from deterministic triage and
// Phase 3 change intelligence into the AI review boundary. They deliberately
// project structural evidence instead of forwarding dossiers, diffs, bodies,
// DOM, or authenticated material wholesale.
// ---------------------------------------------------------------------------

import type { ChangeSet, ImpactClass, SelectionResult } from '../changeIntelligence/types';
import type { BugDossier, SourceChangeRelevance } from '../triage/types';
import { validateBugDossier } from '../triage/dossier';
import { digest } from './util';
import {
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  PASS_AI_PRIVACY,
  ZERO_AI_SAFETY,
  type AiBugReviewInput,
  type AiOracleReviewInput,
  type AiStructuralChange,
  type BugReviewBuildOptions,
  type OracleReviewBuildOptions,
} from './types';
import { validateAiBugReviewInput, validateAiOracleReviewInput } from './validation';

function sourceRelevanceForImpact(impactClass: ImpactClass | undefined): SourceChangeRelevance {
  if (impactClass === 'DIRECT_JOURNEY_CHANGE' || impactClass === 'DIRECT_ROUTE_CHANGE' || impactClass === 'DIRECT_API_CLIENT_CHANGE' || impactClass === 'DIRECT_BACKEND_HANDLER_CHANGE') return 'DIRECT_CHANGE_RELEVANCE';
  if (impactClass === 'SHARED_AUTH_CHANGE' || impactClass === 'SHARED_ROUTER_CHANGE' || impactClass === 'SHARED_LAYOUT_CHANGE' || impactClass === 'SHARED_API_TRANSPORT_CHANGE' || impactClass === 'SHARED_STATE_INITIALIZATION_CHANGE' || impactClass === 'CONTRACT_CHANGE') return 'SHARED_CHANGE_RELEVANCE';
  if (impactClass === 'TRANSITIVE_DEPENDENCY_CHANGE') return 'TRANSITIVE_CHANGE_RELEVANCE';
  if (impactClass === 'UNKNOWN_IMPACT') return 'UNKNOWN';
  return 'NO_CURRENT_CHANGE_RELEVANCE';
}

function safeSourceRef(repoId: string, path: string, edgeId: string | null): string {
  return `source:${repoId}:${path}${edgeId === null ? '' : `:${edgeId}`}`;
}

function inputDigest(value: Record<string, unknown>, idKey: 'inputPackageId' | 'inputChangePackageId', digestKey: 'inputPackageDigest' | 'inputChangePackageDigest'): { readonly id: string; readonly digest: string } {
  const digestValue = digest({ ...value, [idKey]: null, [digestKey]: null });
  return { id: `ai-input:${digestValue}`, digest: digestValue };
}

export function buildBugReviewInput(dossier: BugDossier, options: BugReviewBuildOptions = {}): AiBugReviewInput {
  validateBugDossier(dossier);
  const sourceRefs = [...new Set(dossier.sourceChangeCandidates.map((candidate) => safeSourceRef(candidate.repoId, candidate.path, candidate.edgeId)))].sort();
  const evidenceRefs = [
    `candidate:${dossier.candidateId}`,
    `fingerprint:${dossier.oracleFingerprint}`,
    `route:${dossier.routeClass}`,
    ...dossier.minimalSequence.map((actionId) => `action:${actionId}`),
  ];
  const facts = {
    candidateId: dossier.candidateId,
    evidenceLevel: dossier.evidenceLevel as Exclude<BugDossier['evidenceLevel'], 'L0' | 'L1' | 'L4' | 'L5'>,
    routeClass: dossier.routeClass,
    apiOperationFamily: dossier.apiOperationFamily,
    oracleFingerprint: dossier.oracleFingerprint,
    sourceRelevance: dossier.sourceChangeCandidates.length === 0 ? 'NO_CURRENT_CHANGE_RELEVANCE' as const : dossier.sourceChangeCandidates.some((candidate) => candidate.relevance === 'DIRECT_CHANGE_RELEVANCE') ? 'DIRECT_CHANGE_RELEVANCE' as const : dossier.sourceChangeCandidates.some((candidate) => candidate.relevance === 'SHARED_CHANGE_RELEVANCE') ? 'SHARED_CHANGE_RELEVANCE' as const : dossier.sourceChangeCandidates.some((candidate) => candidate.relevance === 'TRANSITIVE_CHANGE_RELEVANCE') ? 'TRANSITIVE_CHANGE_RELEVANCE' as const : 'UNKNOWN' as const,
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
    technicalSeverity: dossier.technicalSeverity,
    triagePriority: dossier.triagePriority,
    browserApiStatus: dossier.browserApiDifferential.status,
    deterministicFaultBoundary: dossier.likelyFaultBoundary.primaryBoundary,
  };
  const structuralEvidence = {
    title: dossier.title,
    minimalActionIds: [...dossier.minimalSequence],
    routeClass: dossier.routeClass,
    apiOperationFamily: dossier.apiOperationFamily,
    browserApiStatus: dossier.browserApiDifferential.status,
    sourceRelevance: facts.sourceRelevance,
    uncertaintyClasses: [...dossier.missingEvidence, ...dossier.likelyFaultBoundary.reasons].slice(0, 32),
  };
  const base: Record<string, unknown> = {
    schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    kind: 'BUG_CANDIDATE',
    inputPackageId: null,
    inputPackageDigest: null,
    dossierVersion: dossier.schemaVersion,
    upstreamPackage: dossier.aiReady,
    facts,
    evidenceRefs: [...new Set(evidenceRefs)].sort(),
    sourceRefs,
    sourceSnapshotRefs: [...(options.sourceSnapshotRefs ?? [])],
    availableEvidenceRefs: [...new Set(evidenceRefs)].sort(),
    availableSourceRefs: sourceRefs,
    structuralEvidence,
    privacy: PASS_AI_PRIVACY,
    safety: {
      ...ZERO_AI_SAFETY,
      productionAttempts: dossier.safety.productionAttempts,
      productMutations: dossier.safety.productMutations,
      databaseQueries: dossier.safety.databaseQueries,
      proxyViolations: dossier.safety.proxyViolations,
      unknownDestinations: dossier.safety.unknownDestinations,
      unknownApprovals: dossier.safety.unknownApprovals,
      actionCausedUnknown: dossier.safety.actionCausedUnknown,
    },
  };
  const identity = inputDigest(base, 'inputPackageId', 'inputPackageDigest');
  base.inputPackageId = identity.id;
  base.inputPackageDigest = identity.digest;
  return validateAiBugReviewInput(base);
}

function reasonForChange(selection: SelectionResult, repoId: string, path: string): { readonly edgeIds: readonly string[]; readonly journeyIds: readonly string[]; readonly relevance: SourceChangeRelevance } {
  const reasons = selection.impactReasons.filter((reason) => reason.repoId === repoId && reason.changedPath === path);
  const edgeIds = [...new Set(reasons.flatMap((reason) => reason.edgeId === undefined ? [] : [reason.edgeId]))].sort();
  const journeyIds = [...new Set(reasons.map((reason) => reason.journeyId))].sort();
  const relevance = reasons.some((reason) => sourceRelevanceForImpact(reason.impactClass) === 'DIRECT_CHANGE_RELEVANCE')
    ? 'DIRECT_CHANGE_RELEVANCE'
    : reasons.some((reason) => sourceRelevanceForImpact(reason.impactClass) === 'SHARED_CHANGE_RELEVANCE')
      ? 'SHARED_CHANGE_RELEVANCE'
      : reasons.some((reason) => sourceRelevanceForImpact(reason.impactClass) === 'TRANSITIVE_CHANGE_RELEVANCE')
        ? 'TRANSITIVE_CHANGE_RELEVANCE'
        : reasons.some((reason) => sourceRelevanceForImpact(reason.impactClass) === 'UNKNOWN') ? 'UNKNOWN' : 'NO_CURRENT_CHANGE_RELEVANCE';
  return { edgeIds, journeyIds, relevance };
}

export function buildOracleReviewInput(changeSet: ChangeSet, selection: SelectionResult, options: OracleReviewBuildOptions): AiOracleReviewInput {
  const structuralChanges: AiStructuralChange[] = changeSet.changedFiles.map((file) => {
    const reason = reasonForChange(selection, file.repoId, file.path);
    const changeRef = `change:${file.repoId}:${file.path}:${file.status}`;
    return {
      changeRef,
      repoId: file.repoId,
      path: file.path,
      changeType: file.status,
      dependencyEdgeIds: reason.edgeIds,
      affectedJourneyIds: reason.journeyIds,
      affectedApiFamilies: [],
      sourceRelevance: reason.relevance,
    };
  });
  const changeEvidenceRefs = [
    `changeset:${selection.changesetId}`,
    ...structuralChanges.map((change) => change.changeRef),
    ...selection.impactReasons.map((reason) => `impact:${reason.reasonId}`),
  ];
  const sourceSnapshotRefs = changeSet.repoBaselines.map((baseline) => `repo:${baseline.repoId}@${baseline.headSha}`).sort();
  const affectedSurfaces = selection.selectedJourneys.length === 0 ? ['NO_SELECTED_SURFACE'] : selection.selectedJourneys.map((journey) => journey.journeyId);
  const base: Record<string, unknown> = {
    schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    kind: 'ORACLE_SUGGESTION',
    inputChangePackageId: null,
    inputChangePackageDigest: null,
    changeEvidenceRefs: [...new Set(changeEvidenceRefs)].sort(),
    sourceSnapshotRefs,
    affectedSurfaces,
    structuralChanges,
    knownDeterministicInvariants: [...options.knownDeterministicInvariants],
    missingCoverageClasses: [...options.missingCoverageClasses],
    privacy: PASS_AI_PRIVACY,
    safety: ZERO_AI_SAFETY,
  };
  const identity = inputDigest(base, 'inputChangePackageId', 'inputChangePackageDigest');
  base.inputChangePackageId = `change-input:${identity.id.slice('ai-input:'.length)}`;
  base.inputChangePackageDigest = identity.digest;
  return validateAiOracleReviewInput(base);
}
