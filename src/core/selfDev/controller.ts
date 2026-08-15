// ---------------------------------------------------------------------------
// Nightwatch Phase 8A.1 — bounded v2 synthetic session controller.
//
// This controller accepts an already-attested provenance DTO from the narrow
// local wrapper. It does not inspect Git, the filesystem, or the environment.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_PUBLICATION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_REPLAY_ALGORITHM_VERSION,
  SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevPrivateArtifactReceipt,
  type SelfDevProvenance,
  type SelfDevReplayDescriptor,
  type SelfDevSessionReport,
} from './types';
import {
  SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA,
  SyntheticDeterministicProposer,
  type SyntheticProposalFixture,
  type SyntheticProposerOptions,
} from './proposer';
import {
  selectNextSyntheticProposalVariant,
} from './portfolio';
import { SelfDevEvaluator } from './evaluator';
import {
  createSessionArtifact,
  SelfDevPrivateArtifactStore,
} from './storage';
import { replaySession } from './replay';
import { selfDevAdoptedCoverageClasses, selfDevAdoptedEquivalentFingerprints } from './adoptedCases';

export interface SelfDevControllerOptions extends SyntheticProposerOptions {
  readonly artifactStore?: SelfDevPrivateArtifactStore;
  readonly persist?: boolean;
  readonly provenance?: SelfDevProvenance;
}

function syntheticDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`;
}

function syntheticTestProvenance(baseNightwatchSha: string): SelfDevProvenance {
  return {
    schemaVersion: 'nightwatch.selfdev-provenance.private.v1',
    gitHeadSha: baseNightwatchSha,
    sourceBundleDigest: syntheticDigest({ testOnly: true, baseNightwatchSha }),
    contractDigest: syntheticDigest({ testOnly: true, contract: 'synthetic' }),
    algorithmVersion: SELFDEV_REPLAY_ALGORITHM_VERSION,
    authoritativeSourceState: 'CLEAN',
    runtimeNodeVersion: '20.0.0',
    provenanceClass: 'SYNTHETIC_TEST_ONLY',
  };
}

function replayDescriptor(options: SyntheticProposerOptions, baseNightwatchSha: string, expectedProposalCount: number): SelfDevReplayDescriptor {
  return {
    schemaVersion: SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION,
    proposerClass: SELFDEV_PROPOSER_CLASS,
    fixture: options.fixture ?? 'VALID_MATRIX',
    seed: options.seed ?? 0,
    baseNightwatchSha,
    expectedProposalCount,
  };
}

/**
 * Phase 8B.1.0 — the default/live alias (`VALID_MATRIX` or omitted fixture) is
 * catalog-aware: it resolves to the first currently-novel portfolio member as
 * a CONCRETE fixture, so the persisted replay descriptor always names the
 * exact proposal semantics that were evaluated. When the portfolio is
 * exhausted, a bounded diagnostic matrix using the first portfolio member is
 * still generated deterministically (every candidate then correctly evaluates
 * duplicate/rejected — `passCandidateCount` 0 is a valid terminal state).
 * Explicit non-default fixtures (adversarial or concrete) bypass selection.
 */
function resolveDefaultFixture(adoptedFingerprints: readonly string[], adoptedCoverage: readonly string[]): SyntheticProposalFixture {
  const selection = selectNextSyntheticProposalVariant({
    adoptedEquivalentFingerprints: adoptedFingerprints,
    adoptedCoverageClasses: adoptedCoverage,
  });
  if (selection === null) return 'VALID_MATRIX_EXPAND';
  return selection.variantId === 'EXPAND_SUMMARY' ? 'VALID_MATRIX_EXPAND' : 'VALID_MATRIX_EXPAND_COLLAPSE';
}

export class SelfDevController {
  run(options: SelfDevControllerOptions = {}): SelfDevSessionReport {
    assertOwnerPolicyAllows('SELF_DEVELOPMENT_SYNTHETIC_EVALUATION');
    const persist = options.persist !== false;
    if (persist && options.provenance === undefined) throw new Error('SELFDEV_PROVENANCE_REQUIRED');

    const baseNightwatchSha = options.provenance?.gitHeadSha ?? options.baseNightwatchSha ?? SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA;
    if (options.provenance !== undefined && options.baseNightwatchSha !== undefined && options.baseNightwatchSha !== options.provenance.gitHeadSha) {
      throw new Error('SELFDEV_BASELINE_MISMATCH');
    }
    const proposer = new SyntheticDeterministicProposer();
    const adoptedFingerprints = selfDevAdoptedEquivalentFingerprints();
    const adoptedCoverage = selfDevAdoptedCoverageClasses();
    const fixture: SyntheticProposalFixture = (options.fixture === undefined || options.fixture === 'VALID_MATRIX')
      ? resolveDefaultFixture(adoptedFingerprints, adoptedCoverage)
      : options.fixture;
    const proposerOptions: SyntheticProposerOptions = {
      baseNightwatchSha,
      seed: options.seed,
      fixture,
    };
    const proposals = proposer.propose(proposerOptions);
    const evaluator = new SelfDevEvaluator({
      seedEquivalentFingerprints: adoptedFingerprints,
      seedCoverageClasses: adoptedCoverage,
    });
    const evaluations = evaluator.evaluateSession(proposals);
    const provenance = options.provenance ?? syntheticTestProvenance(baseNightwatchSha);
    const descriptor = replayDescriptor(proposerOptions, baseNightwatchSha, proposals.length);
    const artifact = createSessionArtifact({ baseNightwatchSha, provenance, replayDescriptor: descriptor, evaluations });

    // Replay is required even for an in-memory report. Persistence adds the
    // stronger locally-attested class and immutable read-back gate below.
    const replay = replaySession(artifact);
    if (replay.status !== 'PASS') throw new Error(`SELFDEV_REPLAY_FAILED:${replay.reason}`);

    let privateArtifact: SelfDevPrivateArtifactReceipt;
    if (!persist) {
      privateArtifact = {
        persisted: false,
        namespace: 'self-development',
        artifactId: artifact.artifactId,
        disposition: 'NOT_PERSISTED',
      };
    } else {
      const store = options.artifactStore ?? new SelfDevPrivateArtifactStore();
      privateArtifact = {
        persisted: true,
        namespace: 'self-development',
        artifactId: artifact.artifactId,
        disposition: store.writeSessionArtifact(artifact),
      };
    }
    return {
      schemaVersion: SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
      baseNightwatchSha: artifact.baseNightwatchSha,
      artifactId: artifact.artifactId,
      provenance: artifact.provenance,
      replayDescriptor: artifact.replayDescriptor,
      proposerClass: SELFDEV_PROPOSER_CLASS,
      candidateCount: evaluations.length,
      evaluations,
      privateArtifact,
      adoptionStatus: SELFDEV_ADOPTION_STATUS,
      publication: SELFDEV_PUBLICATION,
      sourceWrites: 0,
      gitWrites: 0,
      externalCalls: 0,
      safetyVector: { ...ZERO_SELFDEV_SAFETY_VECTOR },
    };
  }
}

export function runSyntheticSelfDevSession(options: SelfDevControllerOptions = {}): SelfDevSessionReport {
  return new SelfDevController().run(options);
}
