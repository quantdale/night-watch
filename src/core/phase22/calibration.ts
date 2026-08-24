import { calculateConfidenceV2, type ConfidenceV2Result } from '../campaignIntelligence/confidenceV2';
import type { MinimalityProofKind } from '../campaignIntelligence/minimizationV2';
import type { StabilityClass } from '../campaignIntelligence/stability';
import { phase22Digest } from './digest';
import {
  PHASE22_CALIBRATION_CATEGORIES,
  PHASE22_CALIBRATION_VERSION,
  type Phase22CalibrationCategory,
  type Phase22CalibrationMetrics,
  type Phase22Confidence,
  type Phase22RealTargetResult,
  type Phase22ReplayOutcome,
} from './types';

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const REPRODUCED: readonly Phase22ReplayOutcome[] = ['REPRODUCED_EXACT', 'REPRODUCED_SEMANTIC_EQUIVALENT', 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED'];

function invalid(reason: string): never {
  throw new Error(`PHASE22_CALIBRATION_INVALID:${reason}`);
}

function bounded(value: number, label: string, max = 1_000_000): void {
  if (!Number.isInteger(value) || value < 0 || value > max) invalid(label);
}

export interface Phase22CalibrationFacts {
  readonly sourceCurrent: boolean;
  readonly expectationResolved: boolean;
  readonly projectionAvailable: boolean;
  readonly contractApplicable: boolean;
  readonly contractSatisfied: boolean;
  readonly observedBroader: boolean;
  readonly observedNarrower: boolean;
  readonly semanticMismatch: boolean;
  readonly evidenceComplete: boolean;
}

export function classifyPhase22SyntheticToReal(input: Phase22CalibrationFacts): Phase22CalibrationCategory {
  if (!input.sourceCurrent || !input.expectationResolved || !input.evidenceComplete) return 'INSUFFICIENT_EVIDENCE';
  if (!input.projectionAvailable) return 'PROJECTION_MODEL_INCOMPLETE';
  if (!input.contractApplicable) return 'CONTRACT_NOT_APPLICABLE_REAL';
  if (input.semanticMismatch || !input.contractSatisfied) return 'SEMANTIC_MISMATCH';
  if (input.observedBroader) return 'REAL_BEHAVIOR_BROADER_BUT_CONTRACT_VALID';
  if (input.observedNarrower) return 'REAL_BEHAVIOR_NARROWER_BUT_CONTRACT_VALID';
  return 'SYNTHETIC_MODEL_CALIBRATED';
}

export interface Phase22RealConfidenceInput {
  readonly firstRunEvidence: boolean;
  readonly sourceCurrent: boolean;
  readonly expectationResolved: boolean;
  readonly replayOutcome: Phase22ReplayOutcome;
  readonly semanticIdentityStable: boolean;
  readonly repeatStability: StabilityClass | null;
  readonly minimizationProof: MinimalityProofKind | null;
  readonly oracleAuthoritative: boolean;
  readonly benignControlPassed: boolean;
  readonly evidenceComplete: boolean;
  readonly privacyPassed: boolean;
  readonly protocolPassed: boolean;
  readonly preconditionStable: boolean;
}

export interface Phase22RealConfidenceDecision {
  readonly confidence: Phase22Confidence;
  readonly underlying: ConfidenceV2Result;
  readonly realGatePassed: boolean;
  readonly reasons: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly deterministicDigest: string;
}

/**
 * Phase 22 tightens Confidence V2 at the real-observation boundary.  In
 * particular, SYNTHETIC_ONLY is never passed to the underlying confidence
 * calculator as a positive source signal, and HIGH is impossible without a
 * current resolved expectation plus a reproduced fresh-context observation.
 */
export function calculatePhase22RealConfidence(input: Phase22RealConfidenceInput): Phase22RealConfidenceDecision {
  if (!['REPRODUCED_EXACT', 'REPRODUCED_SEMANTIC_EQUIVALENT', 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED', 'PRECONDITION_DIVERGENCE', 'OBSERVATION_DIVERGENCE', 'SOURCE_STALE', 'CONTRACT_CHANGED', 'NONDETERMINISTIC', 'NOT_REPRODUCED', 'INVALID'].includes(input.replayOutcome)) invalid('REPLAY_OUTCOME');
  const exactReplay = input.replayOutcome === 'REPRODUCED_EXACT';
  const semanticEquivalentReplay = input.replayOutcome === 'REPRODUCED_SEMANTIC_EQUIVALENT' || input.replayOutcome === 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED';
  const underlying = calculateConfidenceV2({
    firstRunEvidence: input.firstRunEvidence,
    exactReplay,
    semanticEquivalentReplay,
    repeatStability: input.repeatStability,
    minimizationProof: input.minimizationProof,
    sourceCurrentness: input.sourceCurrent && input.expectationResolved ? 'CURRENT' : 'STALE',
    oracleAuthoritative: input.oracleAuthoritative,
    benignControlPassed: input.benignControlPassed,
    evidenceComplete: input.evidenceComplete && input.privacyPassed && input.protocolPassed,
    preconditionStable: input.preconditionStable,
  });
  const replayReproduced = REPRODUCED.includes(input.replayOutcome);
  const realGatePassed = input.firstRunEvidence && input.sourceCurrent && input.expectationResolved && replayReproduced && input.semanticIdentityStable && input.repeatStability === 'DETERMINISTIC' && input.privacyPassed && input.protocolPassed && input.preconditionStable && input.evidenceComplete;
  const confidence: Phase22Confidence = realGatePassed && underlying.level === 'HIGH'
    ? 'HIGH'
    : realGatePassed
      ? 'MEDIUM'
      : underlying.level === 'UNRESOLVED'
        ? 'UNCONFIRMED'
        : underlying.level;
  const reasons = [...underlying.reasons];
  const blockingReasons = [...underlying.blockingReasons];
  if (!input.sourceCurrent) blockingReasons.push('REAL_SOURCE_NOT_CURRENT');
  if (!input.expectationResolved) blockingReasons.push('REAL_EXPECTATION_NOT_RESOLVED');
  if (!input.semanticIdentityStable) blockingReasons.push('SEMANTIC_IDENTITY_NOT_STABLE');
  if (!input.privacyPassed) blockingReasons.push('PRIVACY_RECEIPT_FAILED');
  if (!input.protocolPassed) blockingReasons.push('PROTOCOL_RECEIPT_FAILED');
  const core = {
    confidence,
    realGatePassed,
    reasons: [...new Set(reasons)].sort(),
    blockingReasons: [...new Set(blockingReasons)].sort(),
    underlyingDigest: underlying.deterministicDigest,
  };
  return { ...core, underlying, deterministicDigest: phase22Digest(core, 'real-confidence:sha256:') };
}

export function buildPhase22CalibrationMetrics(input: {
  readonly targetsConsidered: number;
  readonly targetsEligible: number;
  readonly targetsAdmitted: number;
  readonly results: readonly Phase22RealTargetResult[];
  readonly privacyEvents: number;
  readonly safetyEvents: number;
}): Phase22CalibrationMetrics {
  for (const [label, value] of Object.entries({ targetsConsidered: input.targetsConsidered, targetsEligible: input.targetsEligible, targetsAdmitted: input.targetsAdmitted, privacyEvents: input.privacyEvents, safetyEvents: input.safetyEvents })) bounded(value, label);
  if (input.targetsEligible > input.targetsConsidered || input.targetsAdmitted > input.targetsEligible || input.results.length > input.targetsAdmitted) invalid('TARGET_COUNTS');
  const targetIds = new Set<string>();
  for (const result of input.results) {
    if (!SAFE_ID_RE.test(result.targetId) || !SAFE_ID_RE.test(result.expectationId)) invalid('RESULT_ID');
    if (targetIds.has(result.targetId)) invalid('DUPLICATE_RESULT');
    targetIds.add(result.targetId);
    bounded(result.findingCount, 'FINDING_COUNT', 128);
  }
  const decisiveEvaluations = input.results.filter((result) => result.firstOutcome === 'PASS' || result.firstOutcome === 'ANOMALY').length;
  const partialEvaluations = input.results.filter((result) => result.firstOutcome === 'PARTIAL' || result.coverage === 'PARTIAL').length;
  const notApplicableEvaluations = input.results.filter((result) => result.firstOutcome === 'NOT_APPLICABLE' || result.coverage === 'NOT_APPLICABLE').length;
  const semanticViolations = input.results.reduce((sum, result) => sum + (result.firstOutcome === 'ANOMALY' ? result.findingCount : 0), 0);
  const protocolViolations = input.results.filter((result) => !result.protocolPassed).length;
  const exactReproductions = input.results.filter((result) => result.replayOutcome === 'REPRODUCED_EXACT').length;
  const semanticEquivalentReproductions = input.results.filter((result) => result.replayOutcome === 'REPRODUCED_SEMANTIC_EQUIVALENT' || result.replayOutcome === 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED').length;
  const divergentReplays = input.results.filter((result) => !REPRODUCED.includes(result.replayOutcome)).length;
  const realDifferentialPairsEvaluated = input.results.filter((result) => result.differentialOutcome !== null).length;
  const membershipEvaluations = input.results.filter((result) => result.membershipEvaluated).length;
  const collectionEvaluations = input.results.filter((result) => result.collectionEvaluated).length;
  const productMismatches = input.results.filter((result) => result.calibration === 'SEMANTIC_MISMATCH').length;
  const core = {
    schemaVersion: PHASE22_CALIBRATION_VERSION,
    targetsConsidered: input.targetsConsidered,
    targetsEligible: input.targetsEligible,
    targetsAdmitted: input.targetsAdmitted,
    targetsObserved: input.results.length,
    expectationsResolved: input.results.filter((result) => result.expectationResolved).length,
    decisiveEvaluations,
    partialEvaluations,
    notApplicableEvaluations,
    semanticViolations,
    protocolViolations,
    exactReproductions,
    semanticEquivalentReproductions,
    divergentReplays,
    realDifferentialPairsEvaluated,
    membershipEvaluations,
    collectionEvaluations,
    productMismatches,
    privacyEvents: input.privacyEvents,
    safetyEvents: input.safetyEvents,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'calibration:sha256:') };
}

export function validatePhase22CalibrationCategory(category: string): asserts category is Phase22CalibrationCategory {
  if (!PHASE22_CALIBRATION_CATEGORIES.includes(category as Phase22CalibrationCategory)) invalid('CALIBRATION_CATEGORY');
}
