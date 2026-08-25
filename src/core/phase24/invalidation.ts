import {
  assertBoundedBoolean,
  assertId,
  assertSafeBoundedToken,
  canonical,
  digest,
  invalid,
  sortedUnique,
} from './common';
import { validatePhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_INVALIDATION_VERSION,
  type Phase24CandidateDecision,
  type Phase24CandidateInvalidationLedger,
  type Phase24CandidateInvalidationRecord,
  type Phase24InvalidationReasonCode,
  type Phase24InvalidationState,
  type Phase24SourceAvailability,
  type Phase24SourceIdentity,
} from './types';
import type { Phase24CandidatePortfolio } from './types';

const CANDIDATE_ID_RE = /^candidate:sha256:[0-9a-f]{24}$/;

function sourceEqual(left: Phase24SourceIdentity | null, right: Phase24SourceIdentity | null): boolean {
  return canonical(left) === canonical(right);
}

function ownerEqual(left: Phase24CandidateDecision, right: Phase24CandidateDecision): boolean {
  return canonical(left.behaviorOwner) === canonical(right.behaviorOwner)
    && canonical(left.relevantFiles) === canonical(right.relevantFiles);
}

function addReason(reasons: Phase24InvalidationReasonCode[], reason: Phase24InvalidationReasonCode): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function normalizeSourceAvailability(input: readonly Phase24SourceAvailability[] | undefined): readonly Phase24SourceAvailability[] {
  if (!Array.isArray(input) || input.length > 128) invalid('INVALIDATION_SOURCE_AVAILABILITY');
  const normalized = input.map((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) invalid('INVALIDATION_SOURCE_AVAILABILITY');
    assertId(entry.repoId, 'INVALIDATION_AVAILABILITY_REPOSITORY');
    assertBoundedBoolean(entry.available, 'INVALIDATION_AVAILABILITY');
    return { repoId: entry.repoId, available: entry.available };
  }).sort((left, right) => left.repoId.localeCompare(right.repoId));
  if (new Set(normalized.map((entry) => entry.repoId)).size !== normalized.length) invalid('INVALIDATION_SOURCE_AVAILABILITY_DUPLICATE');
  return normalized;
}

function availabilityMap(input: readonly Phase24SourceAvailability[]): ReadonlyMap<string, boolean> {
  return new Map(input.map((entry) => [entry.repoId, entry.available]));
}

/** A candidate is source-authoritative only when both its local fact and the current repository map agree. */
function sourceAvailable(candidate: Phase24CandidateDecision | null, availability: ReadonlyMap<string, boolean>): boolean {
  return candidate !== null
    && candidate.source !== null
    && candidate.sourceAvailable
    && availability.get(candidate.source.repoId) === true;
}

function candidateIds(record: Phase24CandidateInvalidationRecord): readonly string[] {
  return sortedUnique([record.priorCandidateId, record.currentCandidateId].filter((id): id is string => id !== null));
}

function staleArtifactKeys(input: {
  readonly prior: Phase24CandidateDecision | null;
  readonly current: Phase24CandidateDecision | null;
  readonly affected: boolean;
  readonly replayInvalidated: boolean;
  readonly dossierAssumptionsInvalidated: boolean;
}): readonly string[] {
  if (!input.affected || input.prior === null) return [];
  const keys = [`selection:${input.prior.surfaceKey}`, `manifest:${input.prior.surfaceKey}`];
  if (input.prior.eligibility !== input.current?.eligibility || input.prior.candidateId !== input.current?.candidateId) {
    keys.push(`candidate-decision:${input.prior.candidateId}`);
  }
  if (input.replayInvalidated) keys.push(`replay:${input.prior.candidateId}`);
  if (input.dossierAssumptionsInvalidated) keys.push(`dossier:${input.prior.candidateId}`);
  return sortedUnique(keys);
}

function makeRecord(input: {
  readonly prior: Phase24CandidateDecision | null;
  readonly current: Phase24CandidateDecision | null;
  readonly availability: ReadonlyMap<string, boolean>;
}): Phase24CandidateInvalidationRecord {
  const prior = input.prior;
  const current = input.current;
  const candidate = current ?? prior;
  if (candidate === null) invalid('INVALIDATION_EMPTY_RECORD');
  const reasons: Phase24InvalidationReasonCode[] = [];
  let state: Phase24InvalidationState;
  let replayInvalidated = false;
  let dossierAssumptionsInvalidated = false;
  const priorAvailable = sourceAvailable(prior, input.availability);
  const currentAvailable = sourceAvailable(current, input.availability);

  if (current === null) {
    if (priorAvailable) {
      state = 'CONTRACT_REMOVED';
      addReason(reasons, 'CANDIDATE_REMOVED');
    } else {
      state = 'SOURCE_UNAVAILABLE';
      addReason(reasons, 'SOURCE_SNAPSHOT_UNAVAILABLE');
    }
    // A replay plan or dossier built from a removed/unavailable surface must
    // never remain authoritative merely because no replacement was supplied.
    replayInvalidated = true;
    dossierAssumptionsInvalidated = true;
  } else if (prior === null) {
    if (!currentAvailable) {
      state = 'SOURCE_UNAVAILABLE';
      addReason(reasons, 'SOURCE_SNAPSHOT_UNAVAILABLE');
    } else {
      state = current.eligibility === 'ELIGIBLE' ? 'NEWLY_ELIGIBLE' : 'NEW_CANDIDATE';
      addReason(reasons, 'CANDIDATE_ADDED');
    }
  } else {
    const candidateIdentityChanged = prior.candidateId !== current.candidateId;
    if (candidateIdentityChanged) {
      addReason(reasons, 'CANDIDATE_IDENTITY_CHANGED');
      // A route/target/product/contract/expectation identity change can leave
      // the prior candidate's artifact keys otherwise unmentioned.
      replayInvalidated = true;
      dossierAssumptionsInvalidated = true;
    }
    if (!sourceEqual(prior.source, current.source)) {
      if (prior.source?.sha !== current.source?.sha) addReason(reasons, 'SOURCE_SHA_CHANGED');
      if (prior.source?.evidenceDigest !== current.source?.evidenceDigest) addReason(reasons, 'SOURCE_EVIDENCE_CHANGED');
      if (prior.source?.sha !== current.source?.sha || prior.source?.evidenceDigest !== current.source?.evidenceDigest) {
        replayInvalidated = true;
        dossierAssumptionsInvalidated = true;
      }
    }
    if (canonical(prior.contract) !== canonical(current.contract)) addReason(reasons, 'CONTRACT_IDENTITY_CHANGED');
    if (prior.semanticExpectationId !== current.semanticExpectationId) addReason(reasons, 'SEMANTIC_EXPECTATION_CHANGED');
    if (prior.replay?.planIdentity !== current.replay?.planIdentity) {
      addReason(reasons, 'REPLAY_IDENTITY_CHANGED');
      replayInvalidated = true;
    }
    if (!ownerEqual(prior, current)) {
      addReason(reasons, 'DOSSIER_OWNER_CHANGED');
      dossierAssumptionsInvalidated = true;
    }
    if (prior.eligibility !== current.eligibility) addReason(reasons, 'ELIGIBILITY_CHANGED');
    if (prior.eligibility === 'ELIGIBLE' && prior.deterministicDigest !== current.deterministicDigest) {
      addReason(reasons, 'CANDIDATE_DECISION_CHANGED');
      // Replay and dossier artifacts now carry the decision digest. Any
      // changed eligible decision therefore invalidates both artifact types.
      replayInvalidated = true;
      dossierAssumptionsInvalidated = true;
    }

    if (!currentAvailable) {
      state = 'SOURCE_UNAVAILABLE';
      addReason(reasons, 'SOURCE_SNAPSHOT_UNAVAILABLE');
      replayInvalidated = true;
      dossierAssumptionsInvalidated = true;
    } else if (!priorAvailable) {
      state = 'SOURCE_RECOVERED';
      addReason(reasons, 'SOURCE_RECOVERED');
      // Recovery never restores an older artifact. A new source incarnation
      // must be admitted independently even if its logical candidate ID is
      // stable.
      replayInvalidated = true;
      dossierAssumptionsInvalidated = true;
    } else if (reasons.length === 0) {
      state = 'CURRENT';
      addReason(reasons, 'NO_CHANGE');
    } else if (prior.eligibility !== current.eligibility && current.eligibility === 'ELIGIBLE') {
      state = 'NEWLY_ELIGIBLE';
    } else if (prior.eligibility !== current.eligibility && current.eligibility === 'EXCLUDED') {
      state = 'NEWLY_UNSAFE';
    } else if (reasons.includes('SEMANTIC_EXPECTATION_CHANGED')) {
      state = 'SEMANTIC_EXPECTATION_CHANGED';
    } else if (reasons.includes('CONTRACT_IDENTITY_CHANGED')) {
      state = 'CONTRACT_CHANGED';
    } else if (reasons.includes('SOURCE_SHA_CHANGED') || reasons.includes('SOURCE_EVIDENCE_CHANGED')) {
      state = 'SOURCE_CHANGED';
    } else if (candidateIdentityChanged) {
      state = 'CANDIDATE_IDENTITY_CHANGED';
    } else if (reasons.includes('REPLAY_IDENTITY_CHANGED')) {
      state = 'REPLAY_PLAN_INVALIDATED';
    } else if (reasons.includes('DOSSIER_OWNER_CHANGED')) {
      state = 'DOSSIER_ASSUMPTION_INVALIDATED';
    } else if (reasons.includes('CANDIDATE_DECISION_CHANGED')) {
      state = 'CANDIDATE_DECISION_CHANGED';
    } else {
      state = 'SOURCE_CHANGED';
    }
  }

  const core = {
    candidateId: candidate.candidateId,
    priorCandidateId: prior?.candidateId ?? null,
    currentCandidateId: current?.candidateId ?? null,
    priorEligibility: prior?.eligibility ?? null,
    currentEligibility: current?.eligibility ?? null,
    surfaceKey: candidate.surfaceKey,
    state,
    affected: state !== 'CURRENT',
    reasonCodes: sortedUnique(reasons),
    priorSource: prior?.source ?? null,
    currentSource: current?.source ?? null,
    replayInvalidated,
    dossierAssumptionsInvalidated,
    staleArtifactKeys: staleArtifactKeys({
      prior,
      current,
      affected: state !== 'CURRENT',
      replayInvalidated,
      dossierAssumptionsInvalidated,
    }),
  };
  return { ...core, deterministicDigest: digest('candidate-invalidation:', core) };
}

function idsFor(records: readonly Phase24CandidateInvalidationRecord[], predicate: (record: Phase24CandidateInvalidationRecord) => boolean): readonly string[] {
  return sortedUnique(records.filter(predicate).flatMap(candidateIds));
}

function currentIdsFor(records: readonly Phase24CandidateInvalidationRecord[], predicate: (record: Phase24CandidateInvalidationRecord) => boolean): readonly string[] {
  return sortedUnique(records.filter(predicate).flatMap((record) => record.currentCandidateId === null ? [] : [record.currentCandidateId]));
}

function isStaleRecord(record: Phase24CandidateInvalidationRecord): boolean {
  return record.affected && record.priorCandidateId !== null && [
    'CANDIDATE_IDENTITY_CHANGED',
    'CANDIDATE_DECISION_CHANGED',
    'SOURCE_CHANGED',
    'SOURCE_RECOVERED',
    'CONTRACT_CHANGED',
    'SEMANTIC_EXPECTATION_CHANGED',
    'SOURCE_UNAVAILABLE',
    'CONTRACT_REMOVED',
  ].includes(record.state);
}

function ledgerCore(ledger: Omit<Phase24CandidateInvalidationLedger, 'deterministicDigest'>): Omit<Phase24CandidateInvalidationLedger, 'deterministicDigest'> {
  return ledger;
}

/** Compare two source-derived portfolios without rebinding any source identity. */
export function buildPhase24CandidateInvalidationLedger(input: {
  readonly prior: Phase24CandidatePortfolio | null;
  readonly current: Phase24CandidatePortfolio | null;
  readonly sourceAvailability: readonly Phase24SourceAvailability[];
}): Phase24CandidateInvalidationLedger {
  if (input.prior === null && input.current === null) invalid('INVALIDATION_PORTFOLIOS_MISSING');
  if (input.prior !== null) validatePhase24CandidatePortfolio(input.prior);
  if (input.current !== null) validatePhase24CandidatePortfolio(input.current);
  const normalizedAvailability = normalizeSourceAvailability(input.sourceAvailability);
  const availability = availabilityMap(normalizedAvailability);
  const priorBySurface = new Map((input.prior?.candidates ?? []).map((candidate) => [candidate.surfaceKey, candidate]));
  const currentBySurface = new Map((input.current?.candidates ?? []).map((candidate) => [candidate.surfaceKey, candidate]));
  if (priorBySurface.size !== (input.prior?.candidates.length ?? 0) || currentBySurface.size !== (input.current?.candidates.length ?? 0)) invalid('INVALIDATION_DUPLICATE_SURFACE');
  const surfaceKeys = [...new Set([...priorBySurface.keys(), ...currentBySurface.keys()])].sort((left, right) => left.localeCompare(right));
  const records = surfaceKeys.map((surfaceKey) => makeRecord({
    prior: priorBySurface.get(surfaceKey) ?? null,
    current: currentBySurface.get(surfaceKey) ?? null,
    availability,
  }));
  const changedCandidateIds = idsFor(records, (record) => record.affected);
  const newlyEligibleCandidateIds = currentIdsFor(records, (record) => record.state === 'NEWLY_ELIGIBLE' || (record.state === 'SOURCE_RECOVERED' && record.currentCandidateId !== null));
  const newlyUnsafeCandidateIds = currentIdsFor(records, (record) => record.state === 'NEWLY_UNSAFE' || (record.state === 'SOURCE_UNAVAILABLE' && record.currentCandidateId !== null && record.priorEligibility !== 'EXCLUDED'));
  const staleCandidateIds = idsFor(records, isStaleRecord);
  const replayInvalidatedCandidateIds = idsFor(records, (record) => record.replayInvalidated);
  const dossierInvalidatedCandidateIds = idsFor(records, (record) => record.dossierAssumptionsInvalidated);
  const core = ledgerCore({
    schemaVersion: PHASE24_INVALIDATION_VERSION,
    priorPortfolioDigest: input.prior?.deterministicDigest ?? null,
    currentPortfolioDigest: input.current?.deterministicDigest ?? null,
    sourceAvailability: normalizedAvailability,
    records,
    changedCandidateIds,
    newlyEligibleCandidateIds,
    newlyUnsafeCandidateIds,
    staleCandidateIds,
    replayInvalidatedCandidateIds,
    dossierInvalidatedCandidateIds,
    staleArtifactKeys: sortedUnique(records.flatMap((record) => record.staleArtifactKeys)),
  });
  return { ...core, deterministicDigest: digest('invalidation-ledger:', core) };
}

function recordCore(record: Phase24CandidateInvalidationRecord): Omit<Phase24CandidateInvalidationRecord, 'deterministicDigest'> {
  return {
    candidateId: record.candidateId,
    priorCandidateId: record.priorCandidateId,
    currentCandidateId: record.currentCandidateId,
    priorEligibility: record.priorEligibility,
    currentEligibility: record.currentEligibility,
    surfaceKey: record.surfaceKey,
    state: record.state,
    affected: record.affected,
    reasonCodes: record.reasonCodes,
    priorSource: record.priorSource,
    currentSource: record.currentSource,
    replayInvalidated: record.replayInvalidated,
    dossierAssumptionsInvalidated: record.dossierAssumptionsInvalidated,
    staleArtifactKeys: record.staleArtifactKeys,
  };
}

function assertCandidateId(value: string | null, label: string): void {
  if (value !== null && !CANDIDATE_ID_RE.test(value)) invalid(`${label}_IDENTITY`);
}

function expectedLedgerArrays(records: readonly Phase24CandidateInvalidationRecord[]) {
  return {
    changedCandidateIds: idsFor(records, (record) => record.affected),
    newlyEligibleCandidateIds: currentIdsFor(records, (record) => record.state === 'NEWLY_ELIGIBLE' || (record.state === 'SOURCE_RECOVERED' && record.currentCandidateId !== null)),
    newlyUnsafeCandidateIds: currentIdsFor(records, (record) => record.state === 'NEWLY_UNSAFE' || (record.state === 'SOURCE_UNAVAILABLE' && record.currentCandidateId !== null && record.priorEligibility !== 'EXCLUDED')),
    staleCandidateIds: idsFor(records, isStaleRecord),
    replayInvalidatedCandidateIds: idsFor(records, (record) => record.replayInvalidated),
    dossierInvalidatedCandidateIds: idsFor(records, (record) => record.dossierAssumptionsInvalidated),
    staleArtifactKeys: sortedUnique(records.flatMap((record) => record.staleArtifactKeys)),
  };
}

export function validatePhase24CandidateInvalidationLedger(ledger: Phase24CandidateInvalidationLedger): void {
  if (ledger.schemaVersion !== PHASE24_INVALIDATION_VERSION || !Array.isArray(ledger.records) || ledger.records.length > 128) invalid('INVALIDATION_HEADER');
  const normalizedAvailability = normalizeSourceAvailability(ledger.sourceAvailability);
  if (canonical(normalizedAvailability) !== canonical(ledger.sourceAvailability)) invalid('INVALIDATION_AVAILABILITY_ORDER');
  const surfaceKeys = ledger.records.map((record) => record.surfaceKey);
  if (new Set(surfaceKeys).size !== surfaceKeys.length || JSON.stringify(surfaceKeys) !== JSON.stringify([...surfaceKeys].sort((left, right) => left.localeCompare(right)))) invalid('INVALIDATION_SURFACE_ORDER');
  const identityOwners = new Map<string, string>();
  for (const record of ledger.records) {
    for (const id of [record.priorCandidateId, record.currentCandidateId]) {
      if (id === null) continue;
      const previousSurface = identityOwners.get(id);
      if (previousSurface !== undefined && previousSurface !== record.surfaceKey) invalid('INVALIDATION_DUPLICATE');
      identityOwners.set(id, record.surfaceKey);
    }
  }
  for (const record of ledger.records) {
    assertId(record.surfaceKey, 'INVALIDATION_SURFACE');
    assertCandidateId(record.candidateId, 'INVALIDATION');
    assertCandidateId(record.priorCandidateId, 'INVALIDATION_PRIOR');
    assertCandidateId(record.currentCandidateId, 'INVALIDATION_CURRENT');
    if (record.priorEligibility !== null && record.priorEligibility !== 'ELIGIBLE' && record.priorEligibility !== 'EXCLUDED') invalid('INVALIDATION_PRIOR_ELIGIBILITY');
    if (record.currentEligibility !== null && record.currentEligibility !== 'ELIGIBLE' && record.currentEligibility !== 'EXCLUDED') invalid('INVALIDATION_CURRENT_ELIGIBILITY');
    if ((record.priorCandidateId === null) !== (record.priorEligibility === null)) invalid('INVALIDATION_PRIOR_ELIGIBILITY_BINDING');
    if ((record.currentCandidateId === null) !== (record.currentEligibility === null)) invalid('INVALIDATION_CURRENT_ELIGIBILITY_BINDING');
    if (record.candidateId !== (record.currentCandidateId ?? record.priorCandidateId)) invalid('INVALIDATION_IDENTITY_ALIAS');
    if (record.affected !== (record.state !== 'CURRENT')) invalid('INVALIDATION_AFFECTED');
    if (record.reasonCodes.length === 0) invalid('INVALIDATION_REASON');
    if (JSON.stringify(record.staleArtifactKeys) !== JSON.stringify(sortedUnique(record.staleArtifactKeys))) invalid('INVALIDATION_ARTIFACT_ORDER');
    record.staleArtifactKeys.forEach((key: string) => assertSafeBoundedToken(key, 'INVALIDATION_ARTIFACT'));
    if (record.deterministicDigest !== digest('candidate-invalidation:', recordCore(record))) invalid('INVALIDATION_RECORD_DIGEST');
  }
  const arrays = expectedLedgerArrays(ledger.records);
  if (canonical(arrays) !== canonical({
    changedCandidateIds: ledger.changedCandidateIds,
    newlyEligibleCandidateIds: ledger.newlyEligibleCandidateIds,
    newlyUnsafeCandidateIds: ledger.newlyUnsafeCandidateIds,
    staleCandidateIds: ledger.staleCandidateIds,
    replayInvalidatedCandidateIds: ledger.replayInvalidatedCandidateIds,
    dossierInvalidatedCandidateIds: ledger.dossierInvalidatedCandidateIds,
    staleArtifactKeys: ledger.staleArtifactKeys,
  })) invalid('INVALIDATION_INDEX');
  const core = ledgerCore({
    schemaVersion: ledger.schemaVersion,
    priorPortfolioDigest: ledger.priorPortfolioDigest,
    currentPortfolioDigest: ledger.currentPortfolioDigest,
    sourceAvailability: ledger.sourceAvailability,
    records: ledger.records,
    changedCandidateIds: ledger.changedCandidateIds,
    newlyEligibleCandidateIds: ledger.newlyEligibleCandidateIds,
    newlyUnsafeCandidateIds: ledger.newlyUnsafeCandidateIds,
    staleCandidateIds: ledger.staleCandidateIds,
    replayInvalidatedCandidateIds: ledger.replayInvalidatedCandidateIds,
    dossierInvalidatedCandidateIds: ledger.dossierInvalidatedCandidateIds,
    staleArtifactKeys: ledger.staleArtifactKeys,
  });
  if (ledger.deterministicDigest !== digest('invalidation-ledger:', core)) invalid('INVALIDATION_DIGEST');
}
