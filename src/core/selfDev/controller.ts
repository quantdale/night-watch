// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — bounded synthetic self-development controller.
// ---------------------------------------------------------------------------

import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_PUBLICATION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevPrivateArtifactReceipt,
  type SelfDevSessionReport,
} from './types';
import {
  SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA,
  SyntheticDeterministicProposer,
  type SyntheticProposerOptions,
} from './proposer';
import { SelfDevEvaluator } from './evaluator';
import {
  createSessionArtifact,
  SelfDevPrivateArtifactStore,
} from './storage';

export interface SelfDevControllerOptions extends SyntheticProposerOptions {
  readonly artifactStore?: SelfDevPrivateArtifactStore;
  readonly persist?: boolean;
}

export class SelfDevController {
  run(options: SelfDevControllerOptions = {}): SelfDevSessionReport {
    assertOwnerPolicyAllows('SELF_DEVELOPMENT_SYNTHETIC_EVALUATION');
    const baseNightwatchSha = options.baseNightwatchSha ?? SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA;
    const proposer = new SyntheticDeterministicProposer();
    const proposals = proposer.propose(options);
    const evaluator = new SelfDevEvaluator();
    const evaluations = evaluator.evaluateSession(proposals);
    const artifact = createSessionArtifact({ baseNightwatchSha, evaluations });
    const persist = options.persist !== false;
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
      baseNightwatchSha,
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
