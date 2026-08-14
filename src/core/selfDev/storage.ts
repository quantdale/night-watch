// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — private self-development artifact storage.
//
// The self-development namespace is a companion to, but never part of, the
// product-finding dossier. It delegates all filesystem safety and immutable
// publication semantics to the existing owner-only PrivateArtifactStore.
// ---------------------------------------------------------------------------

import path from 'node:path';
import {
  PrivateArtifactStore,
  privateArtifactRoot,
} from '../policy/privateArtifacts';
import { canonicalJson, sha256Digest } from './canonical';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_PUBLICATION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  type SelfDevEvaluation,
  type SelfDevSessionArtifact,
} from './types';
import { validateSessionArtifact } from './validation';

export const SELFDEV_PRIVATE_NAMESPACE = 'self-development' as const;

export interface SelfDevPrivateStoreOptions {
  readonly store?: PrivateArtifactStore;
  readonly root?: string;
}

function sessionArtifactIdentity(input: {
  readonly baseNightwatchSha: string;
  readonly evaluations: readonly SelfDevEvaluation[];
}): Record<string, unknown> {
  return {
    schemaVersion: SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
    baseNightwatchSha: input.baseNightwatchSha,
    proposerClass: SELFDEV_PROPOSER_CLASS,
    candidateCount: input.evaluations.length,
    evaluations: input.evaluations,
    adoptionStatus: SELFDEV_ADOPTION_STATUS,
    publication: SELFDEV_PUBLICATION,
    sourceWrites: 0,
    gitWrites: 0,
    externalCalls: 0,
  };
}

export function sessionArtifactId(input: {
  readonly baseNightwatchSha: string;
  readonly evaluations: readonly SelfDevEvaluation[];
}): string {
  return `session:${sha256Digest(sessionArtifactIdentity(input))}`;
}

export function createSessionArtifact(input: {
  readonly baseNightwatchSha: string;
  readonly evaluations: readonly SelfDevEvaluation[];
}): SelfDevSessionArtifact {
  const artifact = {
    ...sessionArtifactIdentity(input),
    artifactId: sessionArtifactId(input),
    safetyVector: {
      devContacts: 0,
      nextContacts: 0,
      productionContacts: 0,
      productMutations: 0,
      databaseQueries: 0,
      infrastructureQueries: 0,
      externalAiCalls: 0,
      realModelCalls: 0,
      publication: 0,
      runtimeGitWrites: 0,
      nightwatchRuntimeSourceWrites: 0,
      alphausWrites: 0,
    },
  } as SelfDevSessionArtifact;
  return validateSessionArtifact(artifact);
}

function fileNameForArtifact(artifactId: string): string {
  const digest = artifactId.slice('session:sha256:'.length);
  return `selfdev-evaluation-${digest}.json`;
}

function stripStorageStatus(value: unknown): { readonly status: unknown; readonly artifact: unknown } | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const { status, ...artifact } = record;
  return { status, artifact };
}

export class SelfDevPrivateArtifactStore {
  readonly namespace = SELFDEV_PRIVATE_NAMESPACE;
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevPrivateStoreOptions = {}) {
    this.store = options.store ?? new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_PRIVATE_NAMESPACE),
    });
  }

  writeSessionArtifact(artifact: SelfDevSessionArtifact): 'CREATED' | 'EXACT_DUPLICATE' {
    const validated = validateSessionArtifact(artifact);
    const fileName = fileNameForArtifact(validated.artifactId);
    try {
      this.store.writeImmutableJson(fileName, validated);
      return 'CREATED';
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'PRIVATE_ARTIFACT_IMMUTABLE') throw error;
      const stored = stripStorageStatus(this.store.readJson(fileName));
      if (stored === null || stored.status !== 'READY') throw new Error('SELFDEV_PRIVATE_ARTIFACT_CONFLICT');
      const storedArtifact = validateSessionArtifact(stored.artifact);
      if (canonicalJson(storedArtifact) !== canonicalJson(validated)) throw new Error('SELFDEV_PRIVATE_ARTIFACT_CONFLICT');
      return 'EXACT_DUPLICATE';
    }
  }
}
