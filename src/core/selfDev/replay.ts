// ---------------------------------------------------------------------------
// Phase 8A.1 — ordered deterministic replay.
//
// Replay regenerates the entire proposal sequence and evaluates it through a
// fresh stateful evaluator. Candidates are never evaluated independently:
// duplicate and coverage state make array order authoritative.
// ---------------------------------------------------------------------------

import {
  SELFDEV_BUDGET,
  SELFDEV_CANDIDATE_KIND,
  type SelfDevCandidate,
  type SelfDevEvaluation,
  type SelfDevReplayResult,
  type SelfDevSessionArtifact,
} from './types';
import { SyntheticDeterministicProposer } from './proposer';
import { SelfDevEvaluator } from './evaluator';
import { candidateDigestFor, validateCandidate, validateSessionArtifact } from './validation';
import { canonicalJson } from './canonical';

export class DeterministicReplayClock {
  now(): number {
    return 0;
  }
}

function passCount(evaluations: readonly SelfDevEvaluation[]): number {
  return evaluations.filter((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED').length;
}

function budgetResult(evaluation: SelfDevEvaluation): boolean {
  return evaluation.reasonCode === 'CANDIDATE_EVALUATION_BUDGET_EXCEEDED'
    || evaluation.reasonCode === 'SESSION_EVALUATION_BUDGET_EXCEEDED';
}

function replayProposals(artifact: SelfDevSessionArtifact): readonly unknown[] {
  const descriptor = artifact.replayDescriptor;
  const proposer = new SyntheticDeterministicProposer();
  const proposals = proposer.propose({
    baseNightwatchSha: descriptor.baseNightwatchSha,
    seed: descriptor.seed,
    fixture: descriptor.fixture,
  });
  if (proposals.length !== descriptor.expectedProposalCount || proposals.length !== artifact.candidateCount || proposals.length > SELFDEV_BUDGET.maxCandidatesPerSession) {
    throw new Error('SELFDEV_REPLAY_COUNT_MISMATCH');
  }
  return proposals;
}

/** Replay one complete v2 session in its persisted order. */
export function replaySession(artifactInput: SelfDevSessionArtifact): SelfDevReplayResult {
  let artifact: SelfDevSessionArtifact;
  try {
    const validated = validateSessionArtifact(artifactInput);
    if (validated.schemaVersion !== 'nightwatch.selfdev-session.private.v2') throw new Error('SELFDEV_LEGACY_NOT_REPLAYABLE');
    artifact = validated;
  } catch (error) {
    return {
      status: 'FAIL',
      reason: error instanceof Error ? error.message : 'SELFDEV_REPLAY_SCHEMA_INVALID',
      passCandidateCount: 0,
    };
  }

  if (artifact.evaluations.some(budgetResult)) {
    return {
      status: 'NON_REPLAYABLE_BUDGET_RESULT',
      reason: 'NON_REPLAYABLE_BUDGET_RESULT',
      passCandidateCount: passCount(artifact.evaluations),
    };
  }

  try {
    const proposals = replayProposals(artifact);
    const evaluator = new SelfDevEvaluator({ clock: () => new DeterministicReplayClock().now() });
    const replayed = evaluator.evaluateSession(proposals);
    if (replayed.length !== artifact.evaluations.length) throw new Error('SELFDEV_REPLAY_COUNT_MISMATCH');

    for (let index = 0; index < proposals.length; index += 1) {
      const proposal = proposals[index]!;
      const expected = artifact.evaluations[index]!;
      const actual = replayed[index]!;
      let candidate: SelfDevCandidate | null = null;
      try {
        candidate = validateCandidate(proposal);
      } catch {
        // Rejected proposals are deliberately not retained in the artifact.
        // Their bounded proposer descriptor is enough to regenerate the
        // evaluator output; only safe identity-shaped metadata is compared.
      }
      const raw = proposal !== null && typeof proposal === 'object' && !Array.isArray(proposal)
        ? proposal as Record<string, unknown>
        : {};
      const rawCandidateId = typeof raw.candidateId === 'string' && /^candidate:[0-9a-f]{64}$/.test(raw.candidateId)
        ? raw.candidateId
        : 'candidate:' + '0'.repeat(64);
      const expectedCandidateId = candidate?.candidateId ?? rawCandidateId;
      const expectedCandidateDigest = candidate ? candidateDigestFor(candidate) : `sha256:${expectedCandidateId.slice('candidate:'.length)}`;
      const expectedBase = candidate?.baseNightwatchSha ?? (typeof raw.baseNightwatchSha === 'string' && /^[0-9a-f]{40}$/.test(raw.baseNightwatchSha) ? raw.baseNightwatchSha : '0'.repeat(40));
      if (expected.candidateId !== expectedCandidateId
        || expected.candidateDigest !== expectedCandidateDigest
        || expected.baseNightwatchSha !== expectedBase
        || expected.candidateKind !== SELFDEV_CANDIDATE_KIND) {
        throw new Error('SELFDEV_CANDIDATE_BINDING_MISMATCH');
      }
      if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error('SELFDEV_REPLAY_MISMATCH');
    }
    return {
      status: 'PASS',
      reason: 'REPLAY_EXACT',
      passCandidateCount: passCount(artifact.evaluations),
    };
  } catch (error) {
    return {
      status: 'FAIL',
      reason: error instanceof Error ? error.message : 'SELFDEV_REPLAY_MISMATCH',
      passCandidateCount: 0,
    };
  }
}

/**
 * Read-only future-review helper. It returns only regenerated declarative
 * candidates after exact replay succeeds; it never returns source, patches,
 * diffs, or an adoption decision.
 */
export function verifiedPassCandidates(artifactInput: SelfDevSessionArtifact): readonly SelfDevCandidate[] {
  const result = replaySession(artifactInput);
  if (result.status !== 'PASS') throw new Error(`SELFDEV_FUTURE_REVIEW_NOT_VERIFIED:${result.reason}`);
  const validated = validateSessionArtifact(artifactInput);
  if (validated.schemaVersion !== 'nightwatch.selfdev-session.private.v2') throw new Error('SELFDEV_LEGACY_NOT_ELIGIBLE');
  const proposals = replayProposals(validated);
  return proposals
    .map((proposal, index) => ({ proposal, index }))
    .filter(({ index }) => validated.evaluations[index]?.resultClass === 'EVALUATED_PASS_NOT_ADOPTED')
    .map(({ proposal }) => validateCandidate(proposal));
}
