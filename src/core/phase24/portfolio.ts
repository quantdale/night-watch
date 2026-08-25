import {
  assertBoundedBoolean,
  assertBoundedInteger,
  assertId,
  assertNoRawArtifactFields,
  assertPath,
  assertSafeBoundedToken,
  canonical,
  digest,
  DIGEST_RE,
  EVIDENCE_RE,
  invalid,
  SAFE_ID_RE,
  SHA_RE,
  sortedUnique,
} from './common';
import {
  PHASE24_PORTFOLIO_VERSION,
  PHASE24_SELECTION_VERSION,
  type Phase24BehaviorOwner,
  type Phase24CandidateDecision,
  type Phase24CandidateInput,
  type Phase24CandidatePortfolio,
  type Phase24ContractIdentity,
  type Phase24ExclusionReason,
  type Phase24ReasonCode,
  type Phase24ReplayDescriptor,
  type Phase24RouteIdentity,
  type Phase24SourceIdentity,
  type Phase24PortfolioSelection,
  type Phase24PortfolioSelectionRow,
} from './types';

const POSITIVE_CODES: readonly Phase24ReasonCode[] = [
  'ELIGIBLE_ROUTE_IDENTITY_BOUND',
  'ELIGIBLE_CONTRACT_IDENTITY_BOUND',
  'ELIGIBLE_SOURCE_PROVENANCE_EXACT',
  'ELIGIBLE_BEHAVIOR_OWNER_BOUND',
  'ELIGIBLE_VERSION_CURRENT',
  'ELIGIBLE_SEMANTIC_PRECONDITIONS_BOUND',
  'ELIGIBLE_READ_ONLY_CONFIRMED',
  'ELIGIBLE_AUTH_EXTERNALIZED',
  'ELIGIBLE_DEV_ENVIRONMENT',
  'ELIGIBLE_MUTATION_ABSENT',
  'ELIGIBLE_REPLAY_BOUNDED',
  'ELIGIBLE_PROJECTION_SAFE',
  'ELIGIBLE_DOSSIER_VALUE',
];

interface Check {
  readonly ok: boolean;
  readonly code: Phase24ReasonCode;
  readonly failure: string;
  readonly why: string;
  readonly permanent: boolean;
  readonly futureSourceCanMakeEligible: boolean;
}

function sourceShape(source: Phase24SourceIdentity | null): { readonly valid: boolean; readonly reason: Phase24ReasonCode | null } {
  if (source === null) return { valid: false, reason: 'SOURCE_IDENTITY_MISSING' };
  if (typeof source.repoId !== 'string' || source.repoId.length === 0 || !SAFE_ID_RE.test(source.repoId)) return { valid: false, reason: 'SOURCE_IDENTITY_MISSING' };
  if (typeof source.sha !== 'string' || !SHA_RE.test(source.sha)) return { valid: false, reason: 'SOURCE_SHA_INVALID' };
  if (typeof source.evidenceDigest !== 'string' || !EVIDENCE_RE.test(source.evidenceDigest)) return { valid: false, reason: 'SOURCE_EVIDENCE_INVALID' };
  return { valid: true, reason: null };
}

function validateRoute(route: Phase24RouteIdentity | null): void {
  if (route === null) return;
  assertId(route.endpointId, 'ROUTE_ENDPOINT');
  if (typeof route.routeTemplate !== 'string' || !/^\/[A-Za-z0-9._/{}?=&:-]{0,239}$/.test(route.routeTemplate)) invalid('ROUTE_TEMPLATE_TOKEN');
  if (route.method !== 'GET' || !['HTTP_API', 'BROWSER_READ_ONLY', 'SYNTHETIC'].includes(route.transport)) invalid('ROUTE_METHOD_OR_TRANSPORT');
}

function validateContract(contract: Phase24ContractIdentity | null): void {
  if (contract === null) return;
  assertId(contract.contractId, 'CONTRACT');
  if (!DIGEST_RE.test(contract.requestDigest) || !DIGEST_RE.test(contract.responseDigest)) invalid('CONTRACT_DIGEST');
  assertId(contract.version, 'CONTRACT_VERSION');
}

function validateOwner(owner: Phase24BehaviorOwner | null): void {
  if (owner === null) return;
  assertId(owner.repository, 'OWNER_REPOSITORY');
  assertId(owner.packageName, 'OWNER_PACKAGE');
  assertId(owner.component, 'OWNER_COMPONENT');
  if (!['HIGH', 'MEDIUM', 'LOW', 'UNCONFIRMED', 'AMBIGUOUS'].includes(owner.confidence)) invalid('OWNER_CONFIDENCE');
}

function validateReplay(replay: Phase24ReplayDescriptor | null): void {
  if (replay === null) return;
  if (!['DETERMINISTIC_FIXTURE', 'FIRST_REPLAY', 'UNSUPPORTED', 'UNBOUNDED'].includes(replay.strategy)) invalid('REPLAY_STRATEGY');
  assertSafeBoundedToken(replay.planIdentity, 'REPLAY_PLAN');
  if (replay.maxContexts !== 2 || replay.prerequisites.length > 16) invalid('REPLAY_BOUND');
  replay.prerequisites.forEach((code) => assertSafeBoundedToken(code, 'REPLAY_PREREQUISITE'));
}

function exclusionFor(check: Check): Phase24ExclusionReason {
  return {
    code: check.code,
    failure: check.failure,
    why: check.why,
    permanent: check.permanent,
    futureSourceCanMakeEligible: check.futureSourceCanMakeEligible,
  };
}

function checksFor(input: Phase24CandidateInput): readonly Check[] {
  const source = sourceShape(input.source);
  const routeOk = input.routeIdentityProven && input.route !== null;
  const contractOk = input.contractIdentityProven && input.contract !== null;
  const ownerOk = input.behaviorOwnerProven && input.behaviorOwner !== null && input.behaviorOwner.confidence !== 'AMBIGUOUS' && input.behaviorOwner.confidence !== 'UNCONFIRMED';
  // Snapshot matching is authority evidence, not a convenience flag. An
  // omitted value is indistinguishable from an unproven value and must fail
  // closed at this boundary.
  const sourceSnapshotOk = input.sourceSnapshotMatches === true;
  const sourceOk = input.sourceAvailable && source.valid && sourceSnapshotOk;
  const replayOk = input.replay !== null && (input.replay.strategy === 'DETERMINISTIC_FIXTURE' || input.replay.strategy === 'FIRST_REPLAY') && input.replay.maxContexts === 2;
  const authOk = input.authRequirement === 'NONE' || input.authRequirement === 'OWNER_EXTERNAL_PATH';
  const environmentOk = input.environmentRequirement === 'DEV_ONLY';
  const mutationOk = input.mutationClassification === 'NONE' || input.mutationClassification === 'READ_ONLY';
  const evidenceOk = input.expectedEvidenceValue !== 'NONE';
  const countOk = Number.isInteger(input.anticipatedInvariantCount) && input.anticipatedInvariantCount >= 1 && input.anticipatedInvariantCount <= 32;
  const priorityOk = Number.isInteger(input.selectionPriority) && input.selectionPriority >= 1 && input.selectionPriority <= 1000;
  const sourceCode = !input.sourceAvailable ? 'SOURCE_UNAVAILABLE' : !sourceSnapshotOk ? 'SOURCE_SNAPSHOT_MISMATCH' : source.reason ?? 'SOURCE_IDENTITY_MISSING';
  return [
    { ok: routeOk, code: routeOk ? 'ELIGIBLE_ROUTE_IDENTITY_BOUND' : 'ROUTE_IDENTITY_UNPROVEN', failure: 'ROUTE_IDENTITY', why: 'route or endpoint identity is not mechanically bound', permanent: false, futureSourceCanMakeEligible: true },
    { ok: contractOk, code: contractOk ? 'ELIGIBLE_CONTRACT_IDENTITY_BOUND' : 'CONTRACT_IDENTITY_UNPROVEN', failure: 'REQUEST_RESPONSE_CONTRACT', why: 'request and response contract identity is not proven', permanent: false, futureSourceCanMakeEligible: true },
    { ok: sourceOk, code: sourceOk ? 'ELIGIBLE_SOURCE_PROVENANCE_EXACT' : sourceCode as Phase24ReasonCode, failure: 'SOURCE_PROVENANCE', why: sourceOk ? 'approved source snapshot and evidence digest are exact' : sourceCode === 'SOURCE_SNAPSHOT_MISMATCH' ? 'surface provenance belongs to a different source snapshot' : 'source snapshot is unavailable or its identity is invalid', permanent: false, futureSourceCanMakeEligible: true },
    { ok: ownerOk, code: ownerOk ? 'ELIGIBLE_BEHAVIOR_OWNER_BOUND' : 'BEHAVIOR_OWNER_AMBIGUOUS', failure: 'BEHAVIORAL_OWNER', why: 'repository/package/component ownership is ambiguous or unproven', permanent: false, futureSourceCanMakeEligible: true },
    { ok: input.sourceVersion === 'CURRENT', code: input.sourceVersion === 'CURRENT' ? 'ELIGIBLE_VERSION_CURRENT' : input.sourceVersion === 'DRIFTED' ? 'SOURCE_VERSION_DRIFT' : 'SOURCE_VERSION_UNKNOWN', failure: 'SOURCE_VERSION', why: 'candidate is not bound to the current approved source snapshot', permanent: false, futureSourceCanMakeEligible: true },
    { ok: input.semanticContractProven, code: input.semanticContractProven ? 'ELIGIBLE_SEMANTIC_PRECONDITIONS_BOUND' : 'SEMANTIC_CONTRACT_UNPROVEN', failure: 'SEMANTIC_CONTRACT', why: 'semantic contract is not mechanically established', permanent: false, futureSourceCanMakeEligible: true },
    { ok: input.semanticPreconditionsBound, code: input.semanticPreconditionsBound ? 'ELIGIBLE_SEMANTIC_PRECONDITIONS_BOUND' : 'SEMANTIC_PRECONDITIONS_UNBOUNDED', failure: 'SEMANTIC_PRECONDITIONS', why: 'semantic preconditions are missing or unbounded', permanent: false, futureSourceCanMakeEligible: true },
    { ok: mutationOk && input.readOnlySuitable, code: mutationOk && input.readOnlySuitable ? 'ELIGIBLE_READ_ONLY_CONFIRMED' : !mutationOk ? 'MUTATION_REQUIRED' : 'READ_ONLY_SUITABILITY_UNPROVEN', failure: 'READ_ONLY_SUITABILITY', why: mutationOk && input.readOnlySuitable ? 'GET/read-only behavior is mechanically suitable' : 'mutation risk or read-only suitability is unresolved', permanent: !mutationOk, futureSourceCanMakeEligible: mutationOk },
    { ok: authOk, code: authOk ? 'ELIGIBLE_AUTH_EXTERNALIZED' : input.authRequirement === 'INLINE_SECRET' ? 'INLINE_SECRET_AUTH_FORBIDDEN' : 'AUTH_REQUIREMENT_UNBOUND', failure: 'AUTHENTICATION_REQUIREMENT', why: authOk ? 'authentication is absent or external owner-local state only' : 'authentication is inline, unbound, or unsafe for local planning', permanent: input.authRequirement === 'INLINE_SECRET', futureSourceCanMakeEligible: input.authRequirement !== 'INLINE_SECRET' },
    { ok: environmentOk, code: environmentOk ? 'ELIGIBLE_DEV_ENVIRONMENT' : 'ENVIRONMENT_NOT_DEV', failure: 'ENVIRONMENT_REQUIREMENT', why: 'candidate is not explicitly bounded to non-production DEV planning', permanent: input.environmentRequirement === 'PRODUCTION_ONLY', futureSourceCanMakeEligible: input.environmentRequirement !== 'PRODUCTION_ONLY' },
    { ok: mutationOk, code: mutationOk ? 'ELIGIBLE_MUTATION_ABSENT' : 'MUTATION_REQUIRED', failure: 'MUTATION_CLASSIFICATION', why: 'candidate may require a mutation or has unknown mutation semantics', permanent: !mutationOk, futureSourceCanMakeEligible: false },
    { ok: input.projectionSafe, code: input.projectionSafe ? 'ELIGIBLE_PROJECTION_SAFE' : 'PROJECTION_UNSAFE', failure: 'PRIVACY_PROJECTION', why: 'a category-only privacy projection is not proven', permanent: false, futureSourceCanMakeEligible: true },
    { ok: replayOk, code: replayOk ? 'ELIGIBLE_REPLAY_BOUNDED' : input.replay?.strategy === 'UNBOUNDED' ? 'REPLAY_UNBOUNDED' : 'REPLAY_UNSUPPORTED', failure: 'REPLAYABILITY', why: replayOk ? 'one FIRST and one bounded replay plan are structurally available' : 'replay is absent, unsupported, or unbounded', permanent: false, futureSourceCanMakeEligible: true },
    { ok: evidenceOk, code: evidenceOk ? 'ELIGIBLE_DOSSIER_VALUE' : 'DOSSIER_VALUE_INSUFFICIENT', failure: 'DOSSIER_VALUE', why: 'candidate cannot produce enough structured evidence for owner review', permanent: false, futureSourceCanMakeEligible: true },
    { ok: countOk, code: countOk ? 'ELIGIBLE_DOSSIER_VALUE' : 'ANTICIPATED_INVARIANT_COUNT_INVALID', failure: 'INVARIANT_COUNT', why: 'anticipated invariant count is outside the bounded contract', permanent: false, futureSourceCanMakeEligible: true },
    { ok: priorityOk, code: priorityOk ? 'ELIGIBLE_DOSSIER_VALUE' : 'SELECTION_PRIORITY_INVALID', failure: 'SELECTION_PRIORITY', why: 'selection priority is outside the bounded planner range', permanent: false, futureSourceCanMakeEligible: true },
  ];
}

function normalizeInput(input: Phase24CandidateInput): Phase24CandidateInput {
  assertNoRawArtifactFields(input);
  assertId(input.surfaceKey, 'SURFACE');
  assertId(input.targetId, 'TARGET');
  assertId(input.product, 'PRODUCT');
  if (input.relevantFiles.length > 16) invalid('RELEVANT_FILE_BOUND');
  input.relevantFiles.forEach((file) => assertPath(file, 'SOURCE_FILE'));
  validateRoute(input.route);
  validateContract(input.contract);
  validateOwner(input.behaviorOwner);
  validateReplay(input.replay);
  assertId(input.semanticExpectationId, 'EXPECTATION');
  if (input.semanticPreconditions.length > 16) invalid('PRECONDITION_BOUND');
  input.semanticPreconditions.forEach((code) => assertSafeBoundedToken(code, 'PRECONDITION'));
  assertBoundedBoolean(input.sourceAvailable, 'SOURCE_AVAILABLE');
  if (input.sourceSnapshotMatches !== undefined) assertBoundedBoolean(input.sourceSnapshotMatches, 'SOURCE_SNAPSHOT_MATCHES');
  assertBoundedBoolean(input.routeIdentityProven, 'ROUTE_PROVEN');
  assertBoundedBoolean(input.contractIdentityProven, 'CONTRACT_PROVEN');
  assertBoundedBoolean(input.behaviorOwnerProven, 'OWNER_PROVEN');
  assertBoundedBoolean(input.semanticContractProven, 'SEMANTIC_PROVEN');
  assertBoundedBoolean(input.semanticPreconditionsBound, 'PRECONDITIONS_BOUND');
  assertBoundedBoolean(input.readOnlySuitable, 'READ_ONLY');
  assertBoundedBoolean(input.projectionSafe, 'PROJECTION_SAFE');
  assertBoundedInteger(input.selectionPriority, 'SELECTION_PRIORITY', 1, 1000);
  assertBoundedInteger(input.anticipatedInvariantCount, 'INVARIANT_COUNT', 1, 32);
  if (!['CURRENT', 'DRIFTED', 'UNKNOWN'].includes(input.sourceVersion)) invalid('SOURCE_VERSION');
  if (!['NONE', 'READ_ONLY', 'CONDITIONAL_MUTATION', 'MUTATION', 'UNKNOWN'].includes(input.mutationClassification)) invalid('MUTATION_CLASSIFICATION');
  if (!['NONE', 'OWNER_EXTERNAL_PATH', 'UNBOUND', 'INLINE_SECRET'].includes(input.authRequirement)) invalid('AUTH_REQUIREMENT');
  if (!['DEV_ONLY', 'NONPRODUCTION', 'PRODUCTION_ONLY', 'UNBOUND'].includes(input.environmentRequirement)) invalid('ENVIRONMENT_REQUIREMENT');
  if (!['HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(input.expectedEvidenceValue)) invalid('EVIDENCE_VALUE');
  return {
    surfaceKey: input.surfaceKey,
    targetId: input.targetId,
    product: input.product,
    source: input.source,
    sourceAvailable: input.sourceAvailable,
    sourceSnapshotMatches: input.sourceSnapshotMatches === true,
    relevantFiles: sortedUnique(input.relevantFiles),
    route: input.route,
    routeIdentityProven: input.routeIdentityProven,
    contract: input.contract,
    contractIdentityProven: input.contractIdentityProven,
    behaviorOwner: input.behaviorOwner,
    behaviorOwnerProven: input.behaviorOwnerProven,
    sourceVersion: input.sourceVersion,
    semanticExpectationId: input.semanticExpectationId,
    semanticContractProven: input.semanticContractProven,
    semanticPreconditions: sortedUnique(input.semanticPreconditions),
    semanticPreconditionsBound: input.semanticPreconditionsBound,
    materialClass: input.materialClass,
    authRequirement: input.authRequirement,
    environmentRequirement: input.environmentRequirement,
    mutationClassification: input.mutationClassification,
    readOnlySuitable: input.readOnlySuitable,
    projectionSafe: input.projectionSafe,
    replay: input.replay === null ? null : { ...input.replay, prerequisites: sortedUnique(input.replay.prerequisites) },
    expectedEvidenceValue: input.expectedEvidenceValue,
    selectionPriority: input.selectionPriority,
    anticipatedInvariantCount: input.anticipatedInvariantCount,
  };
}

function candidateCore(input: Phase24CandidateInput): Record<string, unknown> {
  return {
    surfaceKey: input.surfaceKey,
    targetId: input.targetId,
    product: input.product,
    route: input.route,
    contract: input.contract,
    semanticExpectationId: input.semanticExpectationId,
  };
}

function decisionFor(input: Phase24CandidateInput): Phase24CandidateDecision {
  const normalized = normalizeInput(input);
  const candidateId = digest('candidate:', candidateCore(normalized));
  const checks = checksFor(normalized);
  const failures = checks.filter((check) => !check.ok);
  const reasonCodes = failures.length === 0 ? POSITIVE_CODES : failures.map((check) => check.code);
  const exclusionReasons = failures.map(exclusionFor);
  const core = {
    ...normalized,
    candidateId,
    eligibility: failures.length === 0 ? 'ELIGIBLE' as const : 'EXCLUDED' as const,
    reasonCodes,
    exclusionReasons,
  };
  return { ...core, deterministicDigest: digest('candidate-decision:', core) };
}

function sourceKey(source: Phase24SourceIdentity): string {
  return `${source.repoId}:${source.sha}:${source.evidenceDigest}`;
}

/** Build a source-derived portfolio from facts; the core never reads source. */
export function buildPhase24CandidatePortfolio(input: { readonly candidates: readonly Phase24CandidateInput[] }): Phase24CandidatePortfolio {
  if (!Array.isArray(input.candidates) || input.candidates.length === 0 || input.candidates.length > 128) invalid('CANDIDATE_COUNT');
  const decisions = input.candidates.map(decisionFor).sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  if (new Set(decisions.map((candidate) => candidate.candidateId)).size !== decisions.length) invalid('DUPLICATE_CANDIDATE');
  if (new Set(decisions.map((candidate) => candidate.surfaceKey)).size !== decisions.length) invalid('DUPLICATE_SURFACE');
  const sourceMap = new Map<string, Phase24SourceIdentity>();
  for (const candidate of decisions) {
    if (candidate.source !== null && sourceShape(candidate.source).valid) sourceMap.set(sourceKey(candidate.source), candidate.source);
  }
  const eligibleCandidateIds = decisions.filter((candidate) => candidate.eligibility === 'ELIGIBLE').map((candidate) => candidate.candidateId);
  const excludedCandidateIds = decisions.filter((candidate) => candidate.eligibility === 'EXCLUDED').map((candidate) => candidate.candidateId);
  const core = {
    schemaVersion: PHASE24_PORTFOLIO_VERSION,
    sourceSnapshots: [...sourceMap.values()].sort((left, right) => sourceKey(left).localeCompare(sourceKey(right))),
    candidates: decisions,
    eligibleCandidateIds,
    excludedCandidateIds,
    reasonCodeCoverage: sortedUnique(decisions.flatMap((candidate) => candidate.reasonCodes)),
    consideredCount: decisions.length,
    eligibleCount: eligibleCandidateIds.length,
    excludedCount: excludedCandidateIds.length,
  };
  return { ...core, deterministicDigest: digest('portfolio:', core) };
}

export function validatePhase24CandidatePortfolio(portfolio: Phase24CandidatePortfolio): void {
  if (portfolio.schemaVersion !== PHASE24_PORTFOLIO_VERSION || !Array.isArray(portfolio.candidates) || portfolio.candidates.length !== portfolio.consideredCount) invalid('PORTFOLIO_HEADER');
  if (portfolio.consideredCount > 128 || portfolio.eligibleCount + portfolio.excludedCount !== portfolio.consideredCount) invalid('PORTFOLIO_COUNT');
  const ids = portfolio.candidates.map((candidate) => candidate.candidateId);
  if (new Set(ids).size !== ids.length || JSON.stringify(ids) !== JSON.stringify([...ids].sort((left, right) => left.localeCompare(right)))) invalid('PORTFOLIO_ORDER');
  const surfaces = portfolio.candidates.map((candidate) => candidate.surfaceKey);
  if (new Set(surfaces).size !== surfaces.length) invalid('DUPLICATE_SURFACE');
  for (const candidate of portfolio.candidates) {
    if (!/^candidate:sha256:[0-9a-f]{24}$/.test(candidate.candidateId) || !/^candidate-decision:sha256:[0-9a-f]{24}$/.test(candidate.deterministicDigest)) invalid('CANDIDATE_IDENTITY');
    const rebuilt = decisionFor(candidate);
    if (rebuilt.candidateId !== candidate.candidateId || rebuilt.deterministicDigest !== candidate.deterministicDigest || rebuilt.eligibility !== candidate.eligibility) invalid('CANDIDATE_DECISION_DIGEST');
    if (candidate.eligibility === 'ELIGIBLE' && candidate.exclusionReasons.length !== 0) invalid('ELIGIBLE_EXCLUSIONS');
    if (candidate.eligibility === 'EXCLUDED' && candidate.exclusionReasons.length === 0) invalid('EXCLUDED_REASON_MISSING');
  }
  const core = {
    schemaVersion: portfolio.schemaVersion,
    sourceSnapshots: portfolio.sourceSnapshots,
    candidates: portfolio.candidates,
    eligibleCandidateIds: portfolio.eligibleCandidateIds,
    excludedCandidateIds: portfolio.excludedCandidateIds,
    reasonCodeCoverage: portfolio.reasonCodeCoverage,
    consideredCount: portfolio.consideredCount,
    eligibleCount: portfolio.eligibleCount,
    excludedCount: portfolio.excludedCount,
  };
  if (portfolio.deterministicDigest !== digest('portfolio:', core)) invalid('PORTFOLIO_DIGEST');
}

export function portfolioCandidateById(portfolio: Phase24CandidatePortfolio, candidateId: string): Phase24CandidateDecision | null {
  validatePhase24CandidatePortfolio(portfolio);
  return portfolio.candidates.find((candidate) => candidate.candidateId === candidateId) ?? null;
}

/** Safe explanation helper for operator/dossier layers. */
export function candidateReasonSummary(candidate: Phase24CandidateDecision): readonly string[] {
  return [...candidate.reasonCodes].sort((left, right) => left.localeCompare(right));
}

const MATERIAL_BONUS: Readonly<Record<Phase24CandidateDecision['materialClass'], number>> = {
  COLLECTION: 50,
  MEMBERSHIP: 45,
  RELATIONAL: 40,
  DIFFERENTIAL: 35,
  SHAPE: 30,
  PROTOCOL: 25,
};

function candidateScore(candidate: Phase24CandidateDecision): number {
  const evidence = candidate.expectedEvidenceValue === 'HIGH' ? 60 : candidate.expectedEvidenceValue === 'MEDIUM' ? 40 : candidate.expectedEvidenceValue === 'LOW' ? 20 : 0;
  const replay = candidate.replay?.strategy === 'DETERMINISTIC_FIXTURE' ? 20 : candidate.replay?.strategy === 'FIRST_REPLAY' ? 15 : 0;
  return evidence + replay + MATERIAL_BONUS[candidate.materialClass] + (1000 - candidate.selectionPriority);
}

/** Deterministically prioritize eligible source surfaces with material diversity. */
export function prioritizePhase24Portfolio(input: { readonly portfolio: Phase24CandidatePortfolio; readonly maxCandidates: number }): Phase24PortfolioSelection {
  validatePhase24CandidatePortfolio(input.portfolio);
  assertBoundedInteger(input.maxCandidates, 'SELECTION_MAX', 1, 6);
  const eligible = input.portfolio.candidates
    .filter((candidate) => candidate.eligibility === 'ELIGIBLE')
    .map((candidate) => ({ candidate, score: candidateScore(candidate) }))
    .sort((left, right) => right.score - left.score || left.candidate.candidateId.localeCompare(right.candidate.candidateId));
  const selected: Array<{ readonly candidate: Phase24CandidateDecision; readonly score: number; readonly reasonCode: 'MATERIAL_DIVERSITY' | 'SCORE_PRIORITY' }> = [];
  const selectedClasses = new Set<Phase24CandidateDecision['materialClass']>();
  for (const item of eligible) {
    if (selected.length >= input.maxCandidates) break;
    if (!selectedClasses.has(item.candidate.materialClass)) {
      selected.push({ ...item, reasonCode: 'MATERIAL_DIVERSITY' });
      selectedClasses.add(item.candidate.materialClass);
    }
  }
  for (const item of eligible) {
    if (selected.length >= input.maxCandidates) break;
    if (!selected.some((entry) => entry.candidate.candidateId === item.candidate.candidateId)) selected.push({ ...item, reasonCode: 'SCORE_PRIORITY' });
  }
  const rankById = new Map(selected.map((entry, index) => [entry.candidate.candidateId, { rank: index + 1, reasonCode: entry.reasonCode }]));
  const rows: Phase24PortfolioSelectionRow[] = input.portfolio.candidates.map((candidate) => {
    const rank = rankById.get(candidate.candidateId);
    return {
      candidateId: candidate.candidateId,
      score: candidate.eligibility === 'ELIGIBLE' ? candidateScore(candidate) : 0,
      rank: rank?.rank ?? null,
      selected: rank !== undefined,
      reasonCode: candidate.eligibility !== 'ELIGIBLE' ? 'SOURCE_QUALIFICATION_EXCLUDED' : rank?.reasonCode ?? 'BOUND_EXHAUSTED',
    };
  });
  const core = {
    schemaVersion: PHASE24_SELECTION_VERSION,
    portfolioDigest: input.portfolio.deterministicDigest,
    maxCandidates: input.maxCandidates,
    selectedCandidateIds: [...rankById.keys()].sort((left, right) => left.localeCompare(right)),
    rows,
  };
  return { ...core, deterministicDigest: digest('selection:', core) };
}

export function validatePhase24PortfolioSelection(selection: Phase24PortfolioSelection, portfolio: Phase24CandidatePortfolio): void {
  validatePhase24CandidatePortfolio(portfolio);
  if (selection.schemaVersion !== PHASE24_SELECTION_VERSION || selection.portfolioDigest !== portfolio.deterministicDigest || selection.maxCandidates < 1 || selection.maxCandidates > 6 || selection.rows.length !== portfolio.candidates.length) invalid('SELECTION_HEADER');
  if (selection.selectedCandidateIds.length > selection.maxCandidates || new Set(selection.selectedCandidateIds).size !== selection.selectedCandidateIds.length) invalid('SELECTION_BOUND');
  const candidateIds = portfolio.candidates.map((candidate) => candidate.candidateId);
  if (JSON.stringify(selection.rows.map((row) => row.candidateId)) !== JSON.stringify(candidateIds)) invalid('SELECTION_ORDER');
  const rankValues = selection.rows.filter((row) => row.rank !== null).map((row) => row.rank as number);
  if (JSON.stringify([...rankValues].sort((left, right) => left - right)) !== JSON.stringify(Array.from({ length: rankValues.length }, (_unused, index) => index + 1))) invalid('SELECTION_RANK');
  if (JSON.stringify(selection.selectedCandidateIds) !== JSON.stringify([...selection.selectedCandidateIds].sort((left, right) => left.localeCompare(right)))) invalid('SELECTION_ID_ORDER');
  const core = {
    schemaVersion: selection.schemaVersion,
    portfolioDigest: selection.portfolioDigest,
    maxCandidates: selection.maxCandidates,
    selectedCandidateIds: selection.selectedCandidateIds,
    rows: selection.rows,
  };
  if (selection.deterministicDigest !== digest('selection:', core)) invalid('SELECTION_DIGEST');
}
