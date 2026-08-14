// ---------------------------------------------------------------------------
// Phase 8A.1 — exact-ID v2 private storage.
//
// The store is a persistence boundary, not a trust oracle. It validates the
// v2 envelope, recomputed ID, semantic state, and ordered replay before write;
// local Git/source attestation is supplied by the controller's narrow
// provenance wrapper. Legacy v1 is readable only and never migrated.
// ---------------------------------------------------------------------------

import path from 'node:path';
import {
  PrivateArtifactStore,
  privateArtifactRoot,
} from '../policy/privateArtifacts';
import { canonicalJson } from './canonical';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_EVALUATION_SCHEMA_VERSION,
  SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_PUBLICATION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevEvaluation,
  type SelfDevLegacySessionArtifact,
  type SelfDevProvenance,
  type SelfDevReplayDescriptor,
  type SelfDevSessionArtifact,
  type SelfDevStoredArtifact,
} from './types';
import {
  SelfDevIntegrityError,
  isV2SessionArtifact,
  sessionArtifactIdFor,
  validateLegacySessionArtifact,
  validateSessionArtifact,
} from './validation';
import { replaySession } from './replay';

export const SELFDEV_PRIVATE_NAMESPACE = 'self-development' as const;
export const SELFDEV_V2_FILE_PREFIX = 'selfdev-evaluation-v2-' as const;
export const SELFDEV_LEGACY_FILE_PREFIX = 'selfdev-evaluation-' as const;

export interface SelfDevPrivateStoreOptions {
  readonly store?: PrivateArtifactStore;
  readonly root?: string;
  readonly readOnly?: boolean;
}

export interface SelfDevSessionArtifactInput {
  readonly baseNightwatchSha: string;
  readonly provenance: SelfDevProvenance;
  readonly replayDescriptor: SelfDevReplayDescriptor;
  readonly evaluations: readonly SelfDevEvaluation[];
}

function sessionArtifactIdentity(input: SelfDevSessionArtifactInput): Omit<SelfDevSessionArtifact, 'artifactId'> {
  return {
    schemaVersion: SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
    baseNightwatchSha: input.baseNightwatchSha,
    provenance: input.provenance,
    replayDescriptor: input.replayDescriptor,
    proposerClass: SELFDEV_PROPOSER_CLASS,
    candidateCount: input.evaluations.length,
    evaluations: input.evaluations,
    adoptionStatus: SELFDEV_ADOPTION_STATUS,
    publication: SELFDEV_PUBLICATION,
    sourceWrites: 0,
    gitWrites: 0,
    externalCalls: 0,
    safetyVector: { ...ZERO_SELFDEV_SAFETY_VECTOR },
  };
}

export function sessionArtifactId(input: SelfDevSessionArtifactInput | SelfDevSessionArtifact): string {
  return 'schemaVersion' in input
    ? sessionArtifactIdFor(input)
    : sessionArtifactIdFor(sessionArtifactIdentity(input));
}

export function createSessionArtifact(input: SelfDevSessionArtifactInput): SelfDevSessionArtifact {
  const identity = sessionArtifactIdentity(input);
  const artifact = { ...identity, artifactId: sessionArtifactId(identity) };
  const validated = validateSessionArtifact(artifact);
  if (!isV2SessionArtifact(validated)) throw new Error('SELFDEV_SESSION_SCHEMA_INVALID');
  return validated;
}

function fileNameForV2Artifact(artifactId: string): string {
  const digest = artifactId.slice('session:sha256:'.length);
  return `${SELFDEV_V2_FILE_PREFIX}${digest}.json`;
}

function fileNameForLegacyArtifact(artifactId: string): string {
  const digest = artifactId.slice('session:sha256:'.length);
  return `${SELFDEV_LEGACY_FILE_PREFIX}${digest}.json`;
}

function stripStorageStatus(value: unknown): { readonly status: unknown; readonly artifact: unknown } | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const { status, ...artifact } = record;
  return { status, artifact };
}

function requirePersistableArtifact(artifact: SelfDevSessionArtifact): void {
  if (/^0{40}$/.test(artifact.baseNightwatchSha) || artifact.provenance.provenanceClass !== 'LOCAL_GIT_SOURCE_ATTESTED') {
    throw new Error('SELFDEV_PROVENANCE_REQUIRED');
  }
  if (artifact.provenance.gitHeadSha !== artifact.baseNightwatchSha) throw new SelfDevIntegrityError('BASELINE_MISMATCH');
  const replay = replaySession(artifact);
  if (replay.status !== 'PASS') throw new Error(`SELFDEV_PREWRITE_REPLAY_FAILED:${replay.reason}`);
}

export class SelfDevPrivateArtifactStore {
  readonly namespace = SELFDEV_PRIVATE_NAMESPACE;
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevPrivateStoreOptions = {}) {
    this.store = options.store ?? new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_PRIVATE_NAMESPACE),
      createIfMissing: options.readOnly !== true,
    });
  }

  /** Read one exact ID; it never lists or chooses a latest artifact. */
  readSessionArtifact(artifactId: string): SelfDevStoredArtifact {
    if (!/^session:sha256:[0-9a-f]{64}$/.test(artifactId)) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
    const v2File = fileNameForV2Artifact(artifactId);
    const legacyFile = fileNameForLegacyArtifact(artifactId);
    const v2 = this.store.readJson(v2File);
    if (v2 !== null) return this.readStoredEnvelope(v2, artifactId, 'V2');
    const legacy = this.store.readJson(legacyFile);
    if (legacy !== null) return this.readStoredEnvelope(legacy, artifactId, 'LEGACY_V1');
    throw new Error('SELFDEV_ARTIFACT_NOT_FOUND');
  }

  writeSessionArtifact(artifact: SelfDevSessionArtifact): 'CREATED' | 'EXACT_DUPLICATE' {
    const validated = validateSessionArtifact(artifact);
    if (!isV2SessionArtifact(validated)) throw new Error('SELFDEV_LEGACY_NOT_WRITABLE');
    requirePersistableArtifact(validated);
    const fileName = fileNameForV2Artifact(validated.artifactId);
    let disposition: 'CREATED' | 'EXACT_DUPLICATE' = 'CREATED';
    try {
      this.store.writeImmutableJson(fileName, validated);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'PRIVATE_ARTIFACT_IMMUTABLE') throw error;
      const winner = this.readSessionArtifact(validated.artifactId);
      if (winner.kind !== 'V2' || canonicalJson(winner.artifact) !== canonicalJson(validated)) throw new Error('SELFDEV_PRIVATE_ARTIFACT_CONFLICT');
      disposition = 'EXACT_DUPLICATE';
    }

    const readBack = this.readSessionArtifact(validated.artifactId);
    if (readBack.kind !== 'V2' || canonicalJson(readBack.artifact) !== canonicalJson(validated)) throw new Error('SELFDEV_PRIVATE_ARTIFACT_CONFLICT');
    const replay = replaySession(readBack.artifact);
    if (replay.status !== 'PASS') throw new Error(`SELFDEV_READ_BACK_REPLAY_FAILED:${replay.reason}`);
    return disposition;
  }

  private readStoredEnvelope(value: unknown, requestedId: string, kind: 'V2' | 'LEGACY_V1'): SelfDevStoredArtifact {
    const stored = stripStorageStatus(value);
    if (stored === null || stored.status !== 'READY') throw new Error('SELFDEV_PRIVATE_ARTIFACT_CORRUPT');
    if (stored.artifact === null || typeof stored.artifact !== 'object' || Array.isArray(stored.artifact)) throw new Error('SELFDEV_PRIVATE_ARTIFACT_CORRUPT');
    const rawId = (stored.artifact as Record<string, unknown>).artifactId;
    if (rawId !== requestedId) throw new Error('SELFDEV_ARTIFACT_ID_MISMATCH');
    if (kind === 'LEGACY_V1') {
      const legacy = validateLegacySessionArtifact(stored.artifact);
      return { kind: 'LEGACY_V1', artifact: legacy };
    }
    const validated = validateSessionArtifact(stored.artifact);
    if (!isV2SessionArtifact(validated)) throw new Error('SELFDEV_PRIVATE_ARTIFACT_CORRUPT');
    return { kind: 'V2', artifact: validated };
  }
}

export function isPersistedSelfDevV2(value: unknown): value is SelfDevSessionArtifact {
  return isV2SessionArtifact(value) && value.schemaVersion === SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION && value.evaluations.every((evaluation) => evaluation.schemaVersion === SELFDEV_EVALUATION_SCHEMA_VERSION);
}

export function isLegacySelfDevSession(value: unknown): value is SelfDevLegacySessionArtifact {
  return value !== null && typeof value === 'object' && (value as Record<string, unknown>).schemaVersion === SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION;
}
