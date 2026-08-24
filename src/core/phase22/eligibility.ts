import {
  PHASE22_DIFFERENTIAL_STATES,
  PHASE22_DIFFERENTIAL_VERSION,
  PHASE22_ELIGIBILITY_STATES,
  PHASE22_ELIGIBILITY_VERSION,
  PHASE22_SOURCE_FRESHNESS_STATES,
  PHASE22_SOURCE_FRESHNESS_VERSION,
  type Phase22DifferentialEligibility,
  type Phase22EligibilityState,
  type Phase22SourceFreshnessEvidence,
  type Phase22SourceFreshnessState,
  type Phase22SourceIdentity,
} from './types';
import { phase22Digest } from './digest';

const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

function assertId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) throw new Error(`PHASE22_INVALID:${label}`);
}

function assertSource(source: Phase22SourceIdentity, label: string): void {
  if (!source || !SAFE_ID_RE.test(source.repoId) || !SHA_RE.test(source.sha) || !EVIDENCE_RE.test(source.evidenceDigest)) {
    throw new Error(`PHASE22_INVALID:${label}_SOURCE`);
  }
}

export interface Phase22EligibilityFacts {
  readonly hasMechanicalRealSourceProof: boolean;
  readonly sourceFreshness: Phase22SourceFreshnessState;
  readonly runtimeBindingAvailable: boolean;
  readonly runtimeBindingCurrent: boolean;
  readonly projectionAvailable: boolean;
  readonly replaySupported: boolean;
  readonly mutationRequired: boolean;
  readonly devHostAllowlisted: boolean;
  readonly authorityAllowed: boolean;
  readonly targetApprovedReadOnly: boolean;
}

export interface Phase22EligibilityDecision {
  readonly schemaVersion: typeof PHASE22_ELIGIBILITY_VERSION;
  readonly targetId: string;
  readonly state: Phase22EligibilityState;
  readonly reasons: readonly string[];
  readonly eligible: boolean;
  readonly deterministicDigest: string;
}

/**
 * Classify a candidate without granting authority to any caller.  The
 * eligibility state is intentionally ordered from strongest fail-closed
 * blockers to the one admissible state.
 */
export function classifyPhase22Eligibility(input: {
  readonly targetId: string;
  readonly facts: Phase22EligibilityFacts;
}): Phase22EligibilityDecision {
  assertId(input.targetId, 'TARGET_ID');
  const facts = input.facts;
  const reasons: string[] = [];
  let state: Phase22EligibilityState;

  if (!facts.hasMechanicalRealSourceProof) {
    state = 'SYNTHETIC_ONLY';
    reasons.push('REAL_SOURCE_PROOF_MISSING');
  } else if (facts.mutationRequired) {
    state = 'REAL_SOURCE_AUTHORITY_BLOCKED';
    reasons.push('MUTATION_REQUIRED');
  } else if (!facts.runtimeBindingAvailable) {
    state = 'REAL_SOURCE_NO_RUNTIME_BINDING';
    reasons.push('RUNTIME_BINDING_MISSING');
  } else if (!facts.projectionAvailable) {
    state = 'REAL_SOURCE_PROJECTION_UNAVAILABLE';
    reasons.push('PRIVACY_SAFE_PROJECTION_MISSING');
  } else if (!facts.authorityAllowed || !facts.devHostAllowlisted || !facts.targetApprovedReadOnly) {
    state = 'REAL_SOURCE_AUTHORITY_BLOCKED';
    if (!facts.authorityAllowed) reasons.push('OWNER_AUTHORITY_BLOCKED');
    if (!facts.devHostAllowlisted) reasons.push('DEV_HOST_NOT_ALLOWLISTED');
    if (!facts.targetApprovedReadOnly) reasons.push('TARGET_NOT_APPROVED_READ_ONLY');
  } else if (!facts.runtimeBindingCurrent || facts.sourceFreshness !== 'CURRENT_EXACT') {
    state = 'REAL_SOURCE_RUNTIME_BINDING_STALE';
    reasons.push(`SOURCE_NOT_CURRENT:${facts.sourceFreshness}`);
  } else if (!facts.replaySupported) {
    state = 'REAL_SOURCE_RUNTIME_BINDING_AVAILABLE';
    reasons.push('REPLAY_UNSUPPORTED');
  } else {
    state = 'REAL_SOURCE_DEV_ACCEPTANCE_ELIGIBLE';
  }

  if (!PHASE22_ELIGIBILITY_STATES.includes(state)) throw new Error('PHASE22_INVALID:ELIGIBILITY_STATE');
  const core = { schemaVersion: PHASE22_ELIGIBILITY_VERSION, targetId: input.targetId, state, reasons, eligible: state === 'REAL_SOURCE_DEV_ACCEPTANCE_ELIGIBLE' };
  return { ...core, deterministicDigest: phase22Digest(core, 'eligibility:sha256:') };
}

export interface Phase22SourceFreshnessDecision {
  readonly schemaVersion: typeof PHASE22_SOURCE_FRESHNESS_VERSION;
  readonly targetId: string;
  readonly state: Phase22SourceFreshnessState;
  readonly reasonCode: string;
  readonly bound: Phase22SourceIdentity | null;
  readonly observed: Phase22SourceIdentity | null;
  readonly deterministicDigest: string;
}

/**
 * Freshness classification is intentionally separate from the legacy
 * resolver.  A changed SHA is never silently rebound: it becomes
 * SOURCE_CHANGED_SEMANTICS_UNCHANGED only as an explicitly recorded
 * re-derivation result.
 */
export function classifyPhase22SourceFreshness(input: {
  readonly targetId: string;
  readonly evidence: Phase22SourceFreshnessEvidence;
}): Phase22SourceFreshnessDecision {
  assertId(input.targetId, 'TARGET_ID');
  const evidence = input.evidence;
  assertSource(evidence.bound, 'BOUND');
  if (evidence.observed !== null) assertSource(evidence.observed, 'OBSERVED');

  let state: Phase22SourceFreshnessState;
  let reasonCode: string;
  if (!evidence.sourceAvailable || evidence.observed === null) {
    state = 'SOURCE_UNAVAILABLE';
    reasonCode = 'SOURCE_SNAPSHOT_UNAVAILABLE';
  } else if (!evidence.derivationSupported) {
    state = 'UNSUPPORTED_NOW';
    reasonCode = 'DERIVATION_UNSUPPORTED';
  } else if (!evidence.contractPresent) {
    state = 'CONTRACT_REMOVED';
    reasonCode = 'SOURCE_CONTRACT_NOT_FOUND';
  } else if (!evidence.derivationEvidenceMatches) {
    state = evidence.semanticsUnchanged ? 'REDERIVATION_REQUIRED' : 'CONTRACT_CHANGED';
    reasonCode = evidence.semanticsUnchanged ? 'EVIDENCE_DIGEST_CHANGED_REDERIVE' : 'DERIVED_CONTRACT_CHANGED';
  } else if (evidence.observed.sha === evidence.bound.sha && evidence.observed.evidenceDigest === evidence.bound.evidenceDigest) {
    state = 'CURRENT_EXACT';
    reasonCode = 'SOURCE_AND_EVIDENCE_EXACT';
  } else if (evidence.observed.sha !== evidence.bound.sha && evidence.semanticsUnchanged) {
    state = 'SOURCE_CHANGED_SEMANTICS_UNCHANGED';
    reasonCode = 'FRESH_DERIVATION_REQUIRED_FOR_NEW_SHA';
  } else {
    state = 'CONTRACT_CHANGED';
    reasonCode = 'SOURCE_IDENTITY_OR_EVIDENCE_CHANGED';
  }

  if (!PHASE22_SOURCE_FRESHNESS_STATES.includes(state)) throw new Error('PHASE22_INVALID:SOURCE_FRESHNESS_STATE');
  const core = {
    schemaVersion: PHASE22_SOURCE_FRESHNESS_VERSION,
    targetId: input.targetId,
    state,
    reasonCode,
    bound: evidence.bound,
    observed: evidence.observed,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'freshness:sha256:') };
}

export interface Phase22DifferentialFacts {
  readonly targetId: string;
  readonly secondSurfacePresent: boolean;
  readonly secondSurfaceCurrent: boolean;
  readonly equivalenceMechanicallyProven: boolean;
  readonly leftProjectionAvailable: boolean;
  readonly rightProjectionAvailable: boolean;
  readonly authorityAllowed: boolean;
}

export interface Phase22DifferentialDecision {
  readonly schemaVersion: typeof PHASE22_DIFFERENTIAL_VERSION;
  readonly targetId: string;
  readonly state: Phase22DifferentialEligibility;
  readonly reasonCode: string;
  readonly deterministicDigest: string;
}

export function classifyPhase22DifferentialEligibility(input: Phase22DifferentialFacts): Phase22DifferentialDecision {
  assertId(input.targetId, 'TARGET_ID');
  let state: Phase22DifferentialEligibility;
  let reasonCode: string;
  if (!input.authorityAllowed) {
    state = 'AUTHORITY_BLOCKED';
    reasonCode = 'OWNER_AUTHORITY_BLOCKED';
  } else if (!input.secondSurfacePresent) {
    state = 'NO_REAL_SECOND_SURFACE';
    reasonCode = 'NO_APPROVED_SECOND_SURFACE';
  } else if (!input.secondSurfaceCurrent) {
    state = 'REAL_SECOND_SURFACE_STALE';
    reasonCode = 'SECOND_SURFACE_SOURCE_STALE';
  } else if (!input.equivalenceMechanicallyProven) {
    state = 'EQUIVALENCE_NOT_MECHANICALLY_PROVEN';
    reasonCode = 'EQUIVALENCE_PROOF_MISSING';
  } else if (!input.leftProjectionAvailable || !input.rightProjectionAvailable) {
    state = 'PROJECTION_UNAVAILABLE';
    reasonCode = 'PRIVACY_SAFE_PROJECTION_MISSING';
  } else {
    state = 'REAL_DIFFERENTIAL_ELIGIBLE';
    reasonCode = 'REAL_SECOND_SURFACE_CURRENT_AND_PROVEN';
  }
  if (!PHASE22_DIFFERENTIAL_STATES.includes(state)) throw new Error('PHASE22_INVALID:DIFFERENTIAL_STATE');
  const core = { schemaVersion: PHASE22_DIFFERENTIAL_VERSION, targetId: input.targetId, state, reasonCode };
  return { ...core, deterministicDigest: phase22Digest(core, 'differential-eligibility:sha256:') };
}
