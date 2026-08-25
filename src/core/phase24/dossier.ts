import {
  assertBoundedBoolean,
  assertBoundedInteger,
  assertCode,
  assertId,
  assertNoRawArtifactFields,
  assertPath,
  assertSourceIdentity,
  digest,
  invalid,
  sortedUnique,
} from './common';
import { portfolioCandidateById, validatePhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_DOSSIER_VERSION,
  type Phase24BehaviorOwner,
  type Phase24Confidence,
  type Phase24CrossCandidateRelationKind,
  type Phase24Dossier,
  type Phase24CandidatePortfolio,
  type Phase24OwnerRouting,
  type Phase24ReplayClassification,
  type Phase24SemanticKind,
} from './types';

function validateOwnerRouting(owner: Phase24OwnerRouting): void {
  assertNoRawArtifactFields(owner);
  if (!['EXACT_COMPONENT', 'REPOSITORY_ONLY', 'AMBIGUOUS_COMPONENT', 'UNRESOLVED'].includes(owner.resolution)) invalid('OWNER_RESOLUTION');
  if (owner.repository !== null) assertId(owner.repository, 'OWNER_REPOSITORY');
  if (owner.packageName !== null) assertId(owner.packageName, 'OWNER_PACKAGE');
  if (owner.component !== null) assertId(owner.component, 'OWNER_COMPONENT');
  if (!['HIGH', 'MEDIUM', 'LOW', 'UNCONFIRMED', 'AMBIGUOUS'].includes(owner.confidence)) invalid('OWNER_CONFIDENCE');
  assertCode(owner.reasonCode, 'OWNER_REASON');
  if (!/^owner-routing:sha256:[0-9a-f]{24}$/.test(owner.deterministicDigest)) invalid('OWNER_DIGEST_FORMAT');
}

/** Route only to code ownership; no person inference is possible here. */
export function routePhase24OwnerProvenance(input: { readonly owner: Phase24BehaviorOwner | null; readonly ownerProven: boolean }): Phase24OwnerRouting {
  assertNoRawArtifactFields(input);
  assertBoundedBoolean(input.ownerProven, 'OWNER_PROVEN');
  let resolution: Phase24OwnerRouting['resolution'];
  let reasonCode: string;
  let confidence: Phase24OwnerRouting['confidence'];
  if (input.owner === null || !input.ownerProven) {
    resolution = 'UNRESOLVED';
    reasonCode = 'OWNER_EVIDENCE_MISSING';
    confidence = 'UNCONFIRMED';
  } else if (input.owner.confidence === 'AMBIGUOUS' || input.owner.confidence === 'UNCONFIRMED') {
    resolution = 'AMBIGUOUS_COMPONENT';
    reasonCode = 'OWNER_COMPONENT_AMBIGUOUS';
    confidence = 'AMBIGUOUS';
  } else if (input.owner.confidence === 'LOW') {
    resolution = 'REPOSITORY_ONLY';
    reasonCode = 'OWNER_REPOSITORY_BOUND_COMPONENT_LOW_CONFIDENCE';
    confidence = 'LOW';
  } else {
    resolution = 'EXACT_COMPONENT';
    reasonCode = 'OWNER_COMPONENT_EXACT';
    confidence = input.owner.confidence;
  }
  const core = {
    resolution,
    repository: input.owner?.repository ?? null,
    packageName: input.owner?.packageName ?? null,
    component: resolution === 'EXACT_COMPONENT' ? input.owner?.component ?? null : null,
    confidence,
    reasonCode,
  } as const;
  return { ...core, deterministicDigest: digest('owner-routing:', core) };
}

const SEMANTIC_KINDS: readonly string[] = [
  'TOTALS_CONTRADICTORY', 'MISSING_MEMBERS', 'DUPLICATE_LOGICAL_ENTITIES', 'IMPOSSIBLE_STATE_TRANSITION',
  'UNIT_INCONSISTENT', 'PAGINATION_NON_MONOTONIC', 'FILTER_LEAKAGE', 'SORT_INSTABILITY',
  'LIST_DETAIL_DISAGREEMENT', 'MALFORMED_BOUNDED_AGGREGATE', 'CROSS_FIELD_CONTRADICTION', 'IDENTITY_INSTABILITY',
  'LIST_DETAIL_MEMBERSHIP', 'FILTERED_SUBSET', 'SUMMARY_MEMBERS', 'PAYER_EXCHANGE_LINK', 'INVENTORY_ACCOUNT_LINK',
];
const REPLAY_CLASSES: readonly Phase24ReplayClassification[] = [
  'DETERMINISTIC_REPRODUCTION', 'PRECONDITION_DIVERGENCE', 'SOURCE_DRIFT', 'AUTH_DIVERGENCE',
  'ENVIRONMENT_DIVERGENCE', 'SEMANTIC_NON_REPRODUCTION', 'INVALID_REPLAY',
];
const CANDIDATE_DECISION_DIGEST_RE = /^candidate-decision:sha256:[0-9a-f]{24}$/;

function validateDossier(dossier: Phase24Dossier): void {
  assertNoRawArtifactFields(dossier);
  if (dossier.schemaVersion !== PHASE24_DOSSIER_VERSION || !/^dossier:sha256:[0-9a-f]{24}$/.test(dossier.dossierId) || !/^dossier-record:sha256:[0-9a-f]{24}$/.test(dossier.deterministicDigest)) invalid('DOSSIER_HEADER');
  if (!SEMANTIC_KINDS.includes(dossier.findingKind)) invalid('DOSSIER_FINDING_KIND');
  assertId(dossier.invariantId, 'DOSSIER_INVARIANT');
  if (dossier.candidateIds.length < 1 || dossier.candidateIds.length > 2 || dossier.candidateIds.some((id) => !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(id))) invalid('DOSSIER_CANDIDATES');
  if (JSON.stringify(dossier.candidateIds) !== JSON.stringify([...dossier.candidateIds].sort((left, right) => left.localeCompare(right)))) invalid('DOSSIER_CANDIDATE_ORDER');
  if (dossier.candidateDecisionBindings.length !== dossier.candidateIds.length || JSON.stringify(dossier.candidateDecisionBindings.map((binding) => binding.candidateId)) !== JSON.stringify(dossier.candidateIds)) invalid('DOSSIER_CANDIDATE_BINDING_ORDER');
  for (const binding of dossier.candidateDecisionBindings) {
    assertId(binding.candidateId, 'DOSSIER_CANDIDATE_BINDING');
    if (!CANDIDATE_DECISION_DIGEST_RE.test(binding.decisionDigest)) invalid('DOSSIER_CANDIDATE_DECISION');
  }
  if (dossier.sourceContracts.length < 1 || dossier.sourceContracts.length > 2) invalid('DOSSIER_SOURCE_COUNT');
  for (const contract of dossier.sourceContracts) {
    assertSourceIdentity(contract, 'DOSSIER_CONTRACT');
    assertId(contract.contractId, 'DOSSIER_CONTRACT_ID');
  }
  dossier.implementationFiles.forEach((file) => assertPath(file, 'DOSSIER_FILE'));
  validateOwnerRouting(dossier.ownership);
  if (!REPLAY_CLASSES.includes(dossier.replayClassification)) invalid('DOSSIER_REPLAY');
  assertBoundedBoolean(dossier.minimized, 'DOSSIER_MINIMIZED');
  dossier.changedAssumptionCodes.forEach((code) => assertCode(code, 'DOSSIER_CHANGED_ASSUMPTION'));
  dossier.discardedEvidenceCodes.forEach((code) => assertCode(code, 'DOSSIER_DISCARDED_EVIDENCE'));
  assertCode(dossier.additionalConfirmationCode, 'DOSSIER_CONFIRMATION');
  if (dossier.privacy.rawValuesPersisted !== false || dossier.privacy.rawCustomerValuesPersisted !== false || dossier.privacy.rawAuthPersisted !== false || dossier.privacy.screenshotsPersisted !== false || dossier.privacy.tracesPersisted !== false || dossier.privacy.destinationClass !== 'OWNER_LOCAL_ONLY') invalid('DOSSIER_PRIVACY');
  if (dossier.findingCount !== 0 && dossier.findingCount !== 1) invalid('DOSSIER_FINDING_COUNT');
  const core = {
    schemaVersion: dossier.schemaVersion,
    findingKind: dossier.findingKind,
    invariantId: dossier.invariantId,
    candidateIds: dossier.candidateIds,
    candidateDecisionBindings: dossier.candidateDecisionBindings,
    sourceContracts: dossier.sourceContracts,
    implementationFiles: dossier.implementationFiles,
    ownership: dossier.ownership,
    replayClassification: dossier.replayClassification,
    minimized: dossier.minimized,
    changedAssumptionCodes: dossier.changedAssumptionCodes,
    discardedEvidenceCodes: dossier.discardedEvidenceCodes,
    additionalConfirmationCode: dossier.additionalConfirmationCode,
    privacy: dossier.privacy,
    findingCount: dossier.findingCount,
  };
  if (dossier.dossierId !== digest('dossier:', core)) invalid('DOSSIER_ID');
  if (dossier.deterministicDigest !== digest('dossier-record:', { ...core, dossierId: dossier.dossierId })) invalid('DOSSIER_DIGEST');
}

export function createPhase24Dossier(input: {
  readonly findingKind: Phase24SemanticKind | Phase24CrossCandidateRelationKind;
  readonly invariantId: string;
  readonly candidateIds: readonly string[];
  readonly candidateDecisionBindings: readonly { readonly candidateId: string; readonly decisionDigest: string }[];
  readonly sourceContracts: readonly { readonly repoId: string; readonly sha: string; readonly evidenceDigest: string; readonly contractId: string }[];
  readonly implementationFiles: readonly string[];
  readonly ownership: Phase24OwnerRouting;
  readonly replayClassification: Phase24ReplayClassification;
  readonly minimized: boolean;
  readonly changedAssumptionCodes: readonly string[];
  readonly discardedEvidenceCodes: readonly string[];
  readonly additionalConfirmationCode: string;
  readonly findingCount: 0 | 1;
}): Phase24Dossier {
  assertNoRawArtifactFields(input);
  const core = {
    schemaVersion: PHASE24_DOSSIER_VERSION,
    findingKind: input.findingKind,
    invariantId: input.invariantId,
    candidateIds: sortedUnique(input.candidateIds),
    candidateDecisionBindings: [...input.candidateDecisionBindings].sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
    sourceContracts: [...input.sourceContracts].sort((left, right) => `${left.repoId}:${left.sha}:${left.contractId}`.localeCompare(`${right.repoId}:${right.sha}:${right.contractId}`)),
    implementationFiles: sortedUnique(input.implementationFiles),
    ownership: input.ownership,
    replayClassification: input.replayClassification,
    minimized: input.minimized,
    changedAssumptionCodes: sortedUnique(input.changedAssumptionCodes),
    discardedEvidenceCodes: sortedUnique(input.discardedEvidenceCodes),
    additionalConfirmationCode: input.additionalConfirmationCode,
    privacy: {
      rawValuesPersisted: false as const,
      rawCustomerValuesPersisted: false as const,
      rawAuthPersisted: false as const,
      screenshotsPersisted: false as const,
      tracesPersisted: false as const,
      destinationClass: 'OWNER_LOCAL_ONLY' as const,
    },
    findingCount: input.findingCount,
  } as const;
  const dossierId = digest('dossier:', core);
  const dossier: Phase24Dossier = { ...core, dossierId, deterministicDigest: digest('dossier-record:', { ...core, dossierId }) };
  validateDossier(dossier);
  return dossier;
}

export function validatePhase24Dossier(dossier: Phase24Dossier): void {
  validateDossier(dossier);
}

/** Reject a dossier whose candidate decision has moved since it was created. */
export function validatePhase24DossierAgainstPortfolio(input: { readonly dossier: Phase24Dossier; readonly portfolio: Phase24CandidatePortfolio }): void {
  validateDossier(input.dossier);
  validatePhase24CandidatePortfolio(input.portfolio);
  for (const binding of input.dossier.candidateDecisionBindings) {
    const candidate = portfolioCandidateById(input.portfolio, binding.candidateId);
    if (candidate === null || candidate.eligibility !== 'ELIGIBLE' || candidate.deterministicDigest !== binding.decisionDigest) invalid('DOSSIER_CANDIDATE_STALE');
  }
}
