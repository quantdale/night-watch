import { canonical, digest, invalid, sortedUnique } from './common';
import { validatePhase24CandidatePortfolio } from './portfolio';
import {
  PHASE24_INVALIDATION_VERSION,
  type Phase24CandidateDecision,
  type Phase24CandidateInvalidationLedger,
  type Phase24CandidateInvalidationRecord,
  type Phase24InvalidationReasonCode,
  type Phase24InvalidationState,
  type Phase24SourceIdentity,
} from './types';
import type { Phase24CandidatePortfolio } from './types';

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

function makeRecord(input: {
  readonly prior: Phase24CandidateDecision | null;
  readonly current: Phase24CandidateDecision | null;
  readonly sourceAvailable: boolean;
}): Phase24CandidateInvalidationRecord {
  const prior = input.prior;
  const current = input.current;
  const candidate = current ?? prior;
  if (candidate === null) invalid('INVALIDATION_EMPTY_RECORD');
  const reasons: Phase24InvalidationReasonCode[] = [];
  let state: Phase24InvalidationState;
  let replayInvalidated = false;
  let dossierAssumptionsInvalidated = false;

  if (current === null) {
    if (input.sourceAvailable) {
      state = 'CONTRACT_REMOVED';
      addReason(reasons, 'CANDIDATE_REMOVED');
    } else {
      state = 'SOURCE_UNAVAILABLE';
      addReason(reasons, 'SOURCE_SNAPSHOT_UNAVAILABLE');
    }
  } else if (prior === null) {
    state = current.eligibility === 'ELIGIBLE' ? 'NEWLY_ELIGIBLE' : 'NEW_CANDIDATE';
    addReason(reasons, 'CANDIDATE_ADDED');
  } else {
    if (!sourceEqual(prior.source, current.source)) {
      if (prior.source?.sha !== current.source?.sha) addReason(reasons, 'SOURCE_SHA_CHANGED');
      if (prior.source?.evidenceDigest !== current.source?.evidenceDigest) addReason(reasons, 'SOURCE_EVIDENCE_CHANGED');
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

    if (reasons.length === 0) {
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
    } else if (reasons.includes('REPLAY_IDENTITY_CHANGED')) {
      state = 'REPLAY_PLAN_INVALIDATED';
    } else if (reasons.includes('DOSSIER_OWNER_CHANGED')) {
      state = 'DOSSIER_ASSUMPTION_INVALIDATED';
    } else {
      state = 'SOURCE_CHANGED';
    }
  }

  const core = {
    candidateId: candidate.candidateId,
    surfaceKey: candidate.surfaceKey,
    state,
    affected: state !== 'CURRENT',
    reasonCodes: sortedUnique(reasons),
    priorSource: prior?.source ?? null,
    currentSource: current?.source ?? null,
    replayInvalidated,
    dossierAssumptionsInvalidated,
  };
  return { ...core, deterministicDigest: digest('candidate-invalidation:', core) };
}

/** Compare two source-derived portfolios without rebinding any source identity. */
export function buildPhase24CandidateInvalidationLedger(input: {
  readonly prior: Phase24CandidatePortfolio | null;
  readonly current: Phase24CandidatePortfolio | null;
  readonly sourceAvailable?: boolean;
}): Phase24CandidateInvalidationLedger {
  if (input.prior === null && input.current === null) invalid('INVALIDATION_PORTFOLIOS_MISSING');
  if (input.prior !== null) validatePhase24CandidatePortfolio(input.prior);
  if (input.current !== null) validatePhase24CandidatePortfolio(input.current);
  const sourceAvailable = input.sourceAvailable ?? true;
  const priorBySurface = new Map((input.prior?.candidates ?? []).map((candidate) => [candidate.surfaceKey, candidate]));
  const currentBySurface = new Map((input.current?.candidates ?? []).map((candidate) => [candidate.surfaceKey, candidate]));
  const surfaceKeys = [...new Set([...priorBySurface.keys(), ...currentBySurface.keys()])].sort((left, right) => left.localeCompare(right));
  const records = surfaceKeys.map((surfaceKey) => makeRecord({
    prior: priorBySurface.get(surfaceKey) ?? null,
    current: currentBySurface.get(surfaceKey) ?? null,
    sourceAvailable,
  }));
  const changedCandidateIds = records.filter((record) => record.affected).map((record) => record.candidateId);
  const newlyEligibleCandidateIds = records.filter((record) => record.state === 'NEWLY_ELIGIBLE').map((record) => record.candidateId);
  const newlyUnsafeCandidateIds = records.filter((record) => record.state === 'NEWLY_UNSAFE').map((record) => record.candidateId);
  const staleCandidateIds = records.filter((record) => ['SOURCE_CHANGED', 'CONTRACT_CHANGED', 'SEMANTIC_EXPECTATION_CHANGED', 'SOURCE_UNAVAILABLE', 'CONTRACT_REMOVED'].includes(record.state)).map((record) => record.candidateId);
  const replayInvalidatedCandidateIds = records.filter((record) => record.replayInvalidated).map((record) => record.candidateId);
  const dossierInvalidatedCandidateIds = records.filter((record) => record.dossierAssumptionsInvalidated).map((record) => record.candidateId);
  const core = {
    schemaVersion: PHASE24_INVALIDATION_VERSION,
    priorPortfolioDigest: input.prior?.deterministicDigest ?? null,
    currentPortfolioDigest: input.current?.deterministicDigest ?? null,
    sourceAvailable,
    records,
    changedCandidateIds,
    newlyEligibleCandidateIds,
    newlyUnsafeCandidateIds,
    staleCandidateIds,
    replayInvalidatedCandidateIds,
    dossierInvalidatedCandidateIds,
  };
  return { ...core, deterministicDigest: digest('invalidation-ledger:', core) };
}

export function validatePhase24CandidateInvalidationLedger(ledger: Phase24CandidateInvalidationLedger): void {
  if (ledger.schemaVersion !== PHASE24_INVALIDATION_VERSION || !Array.isArray(ledger.records) || ledger.records.length > 128) invalid('INVALIDATION_HEADER');
  const ids = ledger.records.map((record) => record.candidateId);
  if (new Set(ids).size !== ids.length) invalid('INVALIDATION_DUPLICATE');
  for (const record of ledger.records) {
    if (record.affected !== (record.state !== 'CURRENT')) invalid('INVALIDATION_AFFECTED');
    if (record.reasonCodes.length === 0) invalid('INVALIDATION_REASON');
    if (record.deterministicDigest !== digest('candidate-invalidation:', {
      candidateId: record.candidateId,
      surfaceKey: record.surfaceKey,
      state: record.state,
      affected: record.affected,
      reasonCodes: record.reasonCodes,
      priorSource: record.priorSource,
      currentSource: record.currentSource,
      replayInvalidated: record.replayInvalidated,
      dossierAssumptionsInvalidated: record.dossierAssumptionsInvalidated,
    })) invalid('INVALIDATION_RECORD_DIGEST');
  }
  const core = {
    schemaVersion: ledger.schemaVersion,
    priorPortfolioDigest: ledger.priorPortfolioDigest,
    currentPortfolioDigest: ledger.currentPortfolioDigest,
    sourceAvailable: ledger.sourceAvailable,
    records: ledger.records,
    changedCandidateIds: ledger.changedCandidateIds,
    newlyEligibleCandidateIds: ledger.newlyEligibleCandidateIds,
    newlyUnsafeCandidateIds: ledger.newlyUnsafeCandidateIds,
    staleCandidateIds: ledger.staleCandidateIds,
    replayInvalidatedCandidateIds: ledger.replayInvalidatedCandidateIds,
    dossierInvalidatedCandidateIds: ledger.dossierInvalidatedCandidateIds,
  };
  if (ledger.deterministicDigest !== digest('invalidation-ledger:', core)) invalid('INVALIDATION_DIGEST');
}
