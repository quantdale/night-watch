// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — deterministic semantic clustering & contract identity
// (SPEC §6, WORKSTREAM_C, Matrix F).
//
// - Semantically identical findings collapse regardless of row ordinal,
//   violating count, raw value, identity, timestamp, run path, filesystem path.
// - Distinct invariant definitions / targets remain distinct.
// - Source SHA movement with identical normalized evidence digest +
//   identical derivation semantics does NOT create a new class (no
//   accidental fragmentation). Changed digest or changed derivation
//   semantics MUST NOT be silently merged.
// - Historical protocol-only clustering remains compatible (separate module).
// - Occurrence/reproduction metadata never enters identity.
// - Deterministic canonicalization; privacy-safe (sentinel rejection).
// - Pure: no browser/network/fs/child-process/DB/AI/selfDev.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../../core/identity/canonicalDigest';
import type { InvariantDefinition } from '../expectations/types';
import type { SourceProvenance } from '../expectations/types';
import type { SemanticOracleFinding } from './types';

export const SEMANTIC_CONTRACT_IDENTITY_VERSION = 'nightwatch.semantic-contract-identity.v1' as const;
export const SEMANTIC_CLUSTER_VERSION = 'nightwatch.semantic-cluster.v1' as const;

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,200}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const FORBIDDEN_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function digest(value: unknown): string {
  return sha256Hex(stableJsonSorted(value)).slice(0, 24);
}

function assertSafe(value: string, field: string): void {
  if (FORBIDDEN_RE.test(value)) throw new Error(`SEMANTIC_CLUSTER_PRIVACY_BLOCKED:${field}`);
}

function assertSafeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) throw new Error(`SEMANTIC_CLUSTER_ID_INVALID:${field}`);
  assertSafe(value, field);
}

// ---------------------------------------------------------------------------
// Invariant definition canonicalization
// ---------------------------------------------------------------------------

function canonicalInvariant(invariant: InvariantDefinition): Record<string, unknown> {
  switch (invariant.kind) {
    case 'FIELD_PRESENT':
      return { kind: invariant.kind, path: [...invariant.path], expected: invariant.expected };
    case 'FIELD_ABSENT':
      return { kind: invariant.kind, path: [...invariant.path] };
    case 'TYPE_MATCH':
      return { kind: invariant.kind, path: [...invariant.path], expectedType: invariant.expectedType };
    case 'TYPE_IN_SET':
      return { kind: invariant.kind, path: [...invariant.path], allowedTypes: [...invariant.allowedTypes].sort() };
    case 'CARDINALITY_MATCH':
      return { kind: invariant.kind, path: [...invariant.path], min: invariant.min ?? null, max: invariant.max ?? null, exact: invariant.exact ?? null };
    case 'ENVELOPE_CLASS':
      return { kind: invariant.kind, expected: invariant.expected, successField: [...invariant.successField], errorField: [...invariant.errorField] };
    case 'IDENTITY_EQUAL':
      return { kind: invariant.kind, leftPath: [...invariant.leftPath], rightPath: [...invariant.rightPath] };
    case 'IDENTITY_PRESENT_IN_COLLECTION':
      return { kind: invariant.kind, collectionPath: [...invariant.collectionPath], itemIdentityPath: [...invariant.itemIdentityPath], detailIdentityPath: [...invariant.detailIdentityPath], correlationContext: invariant.correlationContext };
    case 'NUMERIC_SUM_RELATION':
      return { kind: invariant.kind, relationId: invariant.relationId, collectionPath: [...invariant.collectionPath], numericFieldPath: [...invariant.numericFieldPath], scalarPath: [...invariant.scalarPath] };
    case 'COUNT_RELATION':
      return { kind: invariant.kind, relationId: invariant.relationId, operation: invariant.operation, collectionPath: [...invariant.collectionPath], scalarPath: invariant.scalarPath ? [...invariant.scalarPath] : null, expectedCount: invariant.expectedCount ?? null };
    case 'SHAPE_CHANGED':
      return { kind: invariant.kind, expectedTransition: invariant.expectedTransition, statePath: invariant.statePath ? [...invariant.statePath] : null };
    case 'COLLECTION_ITEM_CONTRACT': {
      const base: Record<string, unknown> = {
        kind: invariant.kind,
        collectionPath: [...invariant.collectionPath],
        itemInvariantKind: invariant.itemInvariantKind,
        itemRelativePath: [...invariant.itemRelativePath],
      };
      if (invariant.itemInvariantKind === 'FIELD_PRESENT') (base as Record<string, unknown>).itemExpected = (invariant as unknown as { itemExpected: boolean }).itemExpected;
      if (invariant.itemInvariantKind === 'TYPE_MATCH') (base as Record<string, unknown>).itemExpectedType = (invariant as unknown as { itemExpectedType: string }).itemExpectedType;
      if (invariant.itemInvariantKind === 'TYPE_IN_SET') (base as Record<string, unknown>).itemAllowedTypes = [...((invariant as unknown as { itemAllowedTypes: readonly string[] }).itemAllowedTypes)].sort();
      return base;
    }
    default:
      throw new Error(`SEMANTIC_CLUSTER_UNSUPPORTED_INVARIANT:${(invariant as { kind: string }).kind}`);
  }
}

export function semanticInvariantDefinitionId(invariant: InvariantDefinition): string {
  for (const seg of invariantPathSegments(invariant)) {
    assertSafe(seg, 'invariant-path');
  }
  if ('relationId' in invariant && (invariant as { relationId?: string }).relationId !== undefined) {
    assertSafeId((invariant as { relationId: string }).relationId, 'relationId');
  }
  const canonical = canonicalInvariant(invariant);
  return `inv:sha256:${digest({ version: SEMANTIC_CONTRACT_IDENTITY_VERSION, invariant: canonical })}`;
}

function invariantPathSegments(invariant: InvariantDefinition): string[] {
  const inv = invariant as unknown as Record<string, unknown>;
  if (Array.isArray(inv.path)) return inv.path as string[];
  if (Array.isArray(inv.collectionPath)) {
    const out: string[] = [...(inv.collectionPath as string[])];
    if (Array.isArray(inv.itemRelativePath)) out.push(...(inv.itemRelativePath as string[]));
    if (Array.isArray(inv.leftPath)) out.push(...(inv.leftPath as string[]));
    if (Array.isArray(inv.rightPath)) out.push(...(inv.rightPath as string[]));
    return out;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Contract identity — deterministic, excludes occurrence metadata
// ---------------------------------------------------------------------------

export interface SemanticContractIdentityInput {
  readonly expectationId: string;
  readonly targetId: string;
  readonly invariant: InvariantDefinition;
  readonly sourceProvenance: Pick<SourceProvenance, 'repoId' | 'derivationVersion' | 'evidenceDigest'>;
}

export function semanticContractIdentity(input: SemanticContractIdentityInput): string {
  assertSafeId(input.expectationId, 'expectationId');
  assertSafeId(input.targetId, 'targetId');
  assertSafeId(input.sourceProvenance.repoId, 'repoId');
  assertSafeId(input.sourceProvenance.derivationVersion, 'derivationVersion');
  if (input.sourceProvenance.evidenceDigest !== undefined) {
    if (!EVIDENCE_DIGEST_RE.test(input.sourceProvenance.evidenceDigest)) throw new Error('SEMANTIC_CLUSTER_EVIDENCE_DIGEST_INVALID');
    assertSafe(input.sourceProvenance.evidenceDigest, 'evidenceDigest');
  }
  const invId = semanticInvariantDefinitionId(input.invariant);
  const payload = {
    version: SEMANTIC_CONTRACT_IDENTITY_VERSION,
    expectationId: input.expectationId,
    targetId: input.targetId,
    invariantId: invId,
    derivationVersion: input.sourceProvenance.derivationVersion,
    evidenceDigest: input.sourceProvenance.evidenceDigest ?? null,
    repoId: input.sourceProvenance.repoId,
  };
  return `sci:sha256:${digest(payload)}`;
}

// ---------------------------------------------------------------------------
// Cluster key — stable across SHA movement, sensitive to digest/version change
// ---------------------------------------------------------------------------

export function semanticClusterKey(input: SemanticContractIdentityInput): string {
  const sci = semanticContractIdentity(input);
  return `sc:sha256:${digest({ version: SEMANTIC_CLUSTER_VERSION, sci })}`;
}

// ---------------------------------------------------------------------------
// Helper: cluster key directly from a finding + invariant + target
// ---------------------------------------------------------------------------

export function semanticClusterKeyFromFinding(params: {
  readonly finding: Pick<SemanticOracleFinding, 'expectationId' | 'sourceProvenance'>;
  readonly targetId: string;
  readonly invariant: InvariantDefinition;
}): string {
  return semanticClusterKey({
    expectationId: params.finding.expectationId,
    targetId: params.targetId,
    invariant: params.invariant,
    sourceProvenance: {
      repoId: params.finding.sourceProvenance.repoId,
      derivationVersion: params.finding.sourceProvenance.derivationVersion,
      evidenceDigest: params.finding.sourceProvenance.evidenceDigest,
    },
  });
}

// ---------------------------------------------------------------------------
// Semantic observation clustering (occurrence metadata out of identity)
// ---------------------------------------------------------------------------

export interface SemanticObservation {
  readonly runId: string;
  readonly observedAt: string;
  readonly expectationId: string;
  readonly targetId: string;
  readonly invariant: InvariantDefinition;
  readonly sourceProvenance: Pick<SourceProvenance, 'repoId' | 'derivationVersion' | 'evidenceDigest' | 'sha'>;
  readonly fingerprint: string;
  readonly reproduced?: boolean;
}

export interface SemanticCluster {
  readonly clusterKey: string;
  readonly contractIdentity: string;
  readonly expectationId: string;
  readonly targetId: string;
  readonly invariantId: string;
  readonly fingerprint: string;
  readonly occurrenceCount: number;
  readonly reproductionCount: number;
  readonly runIds: readonly string[];
}

const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const RUN_ID_RE = /^[A-Za-z0-9_.-]{1,80}$/;

export function clusterSemanticObservations(observations: readonly SemanticObservation[]): readonly SemanticCluster[] {
  // Contract identity is the primary cluster key: source SHA is provenance
  // only and does NOT fragment identity when evidenceDigest + derivationVersion
  // are identical (C4). Occurrence metadata (runId, observedAt, reproduced)
  // never enters identity (C7/C5). A different fingerprint for the same
  // contract does NOT create a new cluster — it is handled by replay
  // attachment (C8/F11), not by silent split; the stored fingerprint is the
  // deterministic primary (first by runId).
  const buckets = new Map<string, SemanticObservation[]>();
  const meta = new Map<string, { contractIdentity: string; invariantId: string; fingerprint: string; expectationId: string; targetId: string }>();

  for (const obs of observations) {
    if (!FINGERPRINT_RE.test(obs.fingerprint)) throw new Error('SEMANTIC_CLUSTER_FINGERPRINT_INVALID');
    if (!RUN_ID_RE.test(obs.runId)) throw new Error('SEMANTIC_CLUSTER_RUN_ID_INVALID');
    if (Number.isNaN(Date.parse(obs.observedAt))) throw new Error('SEMANTIC_CLUSTER_TIMESTAMP_INVALID');
    if (obs.sourceProvenance.sha !== undefined && !SHA_RE.test(obs.sourceProvenance.sha)) throw new Error('SEMANTIC_CLUSTER_SHA_INVALID');
    assertSafe(obs.fingerprint, 'fingerprint');
    assertSafe(obs.runId, 'runId');
    const key = semanticClusterKey({
      expectationId: obs.expectationId,
      targetId: obs.targetId,
      invariant: obs.invariant,
      sourceProvenance: {
        repoId: obs.sourceProvenance.repoId,
        derivationVersion: obs.sourceProvenance.derivationVersion,
        evidenceDigest: obs.sourceProvenance.evidenceDigest,
      },
    });
    const contractIdentity = semanticContractIdentity({
      expectationId: obs.expectationId,
      targetId: obs.targetId,
      invariant: obs.invariant,
      sourceProvenance: {
        repoId: obs.sourceProvenance.repoId,
        derivationVersion: obs.sourceProvenance.derivationVersion,
        evidenceDigest: obs.sourceProvenance.evidenceDigest,
      },
    });
    const invId = semanticInvariantDefinitionId(obs.invariant);
    const bucket = buckets.get(key) ?? [];
    bucket.push(obs);
    buckets.set(key, bucket);
    if (!meta.has(key)) meta.set(key, { contractIdentity, invariantId: invId, fingerprint: obs.fingerprint, expectationId: obs.expectationId, targetId: obs.targetId });
  }

  const clusters: SemanticCluster[] = [];
  for (const [key, items] of buckets.entries()) {
    const m = meta.get(key)!;
    // Deterministic primary: first by runId then observedAt (stable across input order)
    const ordered = [...items].sort((a, b) => a.runId.localeCompare(b.runId) || a.observedAt.localeCompare(b.observedAt));
    const primaryFingerprint = [...items].sort((a, b) => a.runId.localeCompare(b.runId))[0]!.fingerprint;
    clusters.push({
      clusterKey: key,
      contractIdentity: m.contractIdentity,
      expectationId: m.expectationId,
      targetId: m.targetId,
      invariantId: m.invariantId,
      fingerprint: primaryFingerprint,
      occurrenceCount: items.length,
      reproductionCount: items.filter((i) => i.reproduced).length,
      runIds: ordered.map((i) => i.runId),
    });
  }
  return clusters.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
}

// ---------------------------------------------------------------------------
// Replay attachment helpers
// ---------------------------------------------------------------------------

export function isSameSemanticAnomaly(leftFingerprint: string, rightFingerprint: string): boolean {
  if (!FINGERPRINT_RE.test(leftFingerprint) || !FINGERPRINT_RE.test(rightFingerprint)) throw new Error('SEMANTIC_CLUSTER_FINGERPRINT_INVALID');
  return leftFingerprint === rightFingerprint;
}

export function attachReplayToCluster(params: {
  readonly originalClusterKey: string;
  readonly replayFingerprint: string;
  readonly originalFingerprint: string;
}): { attached: boolean; reason: string } {
  if (!isSameSemanticAnomaly(params.replayFingerprint, params.originalFingerprint)) {
    return { attached: false, reason: 'DIFFERENT_FINGERPRINT' };
  }
  return { attached: true, reason: 'EXACT_FINGERPRINT_MATCH' };
}
