// ---------------------------------------------------------------------------
// Nightwatch Control Center — bounded owner-local findings reader.
//
// The normal root is resolved by the existing private-artifact policy and is
// never supplied by the HTTP caller. This reader enumerates only local JSON
// files, validates dossier v1/v2 through the converged artifact facade, and
// projects no path, raw evidence, title/body value, credential, or validator
// detail into its snapshot. A screened display label is the only title-shaped
// field that survives the projection.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import { validateArtifact } from '../../core/artifactValidation';
import { containsPrivatePayloadShape, privateArtifactRoot, assertPrivateArtifactPath } from '../../core/policy';
import { assertNotProductionFindingsRoot } from '../../core/prodEvidence/controlCenterExclusion';
import { DOSSIER_VERSION, type BugDossier } from '../../core/triage/types';
import { DOSSIER_VERSION_V2, type BugDossierV2 } from '../../core/triage/dossierV2';
import { reduceFindingsSourceCurrentness } from './findingsCurrentness';
import {
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterTimestamp,
} from '../contracts/common';

export const CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION = 'nightwatch.control-center-findings-authority.v1' as const;

export type FindingsAuthorityState = 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';

export const FINDINGS_AUTHORITY_REASON_CODES = [
  'FINDINGS_ROOT_UNAVAILABLE',
  'FINDINGS_ROOT_UNSAFE',
  'FINDINGS_ROOT_PRODUCTION_EXCLUDED',
  'FINDINGS_ROOT_PERMISSIONS_UNSAFE',
  'FINDINGS_EMPTY',
  'FINDINGS_INCOMPLETE_DOSSIER',
  'FINDINGS_PARTIAL_CORRUPTION',
  'FINDINGS_PRIVACY_BLOCKED',
  'FINDINGS_SCHEMA_INVALID',
  'FINDINGS_FILE_UNSAFE',
  'FINDINGS_FILE_TOO_LARGE',
  'FINDINGS_FILE_UNSTABLE',
  'FINDINGS_FILE_LIMIT',
  'FINDINGS_DUPLICATE_DOSSIER',
  'FINDINGS_INTERNAL_ERROR',
] as const;
export type FindingsAuthorityReasonCode = (typeof FINDINGS_AUTHORITY_REASON_CODES)[number];

export type FindingsDossier = BugDossier | BugDossierV2;

/** Metadata-only finding input emitted after validation and privacy projection. */
export interface FindingsDossierMetadata {
  readonly schemaVersion: FindingsDossier['schemaVersion'];
  readonly status: 'READY' | 'INCOMPLETE';
  readonly candidateId: string;
  readonly title: string | null;
  readonly firstObserved: string | null;
  readonly lastObserved: string | null;
  readonly routeClass: string | null;
  readonly oracleFingerprint: string;
  readonly evidenceLevel: FindingsDossier['evidenceLevel'];
  readonly reproduction: {
    readonly result: FindingsDossier['reproduction']['result'];
    readonly count: FindingsDossier['reproduction']['count'];
    readonly minimalityGuarantee: FindingsDossier['reproduction']['minimalityGuarantee'];
  };
  readonly technicalSeverity: FindingsDossier['technicalSeverity'];
  readonly triagePriority: FindingsDossier['triagePriority'];
  readonly confidence: {
    readonly level: FindingsDossier['confidence']['level'];
  };
  readonly sourceCurrentness: 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
  readonly semanticFinding: boolean;
  /**
   * The mechanically established expectation identity — "why is this
   * considered wrong?" — carried forward from the dossier's semantic triage
   * evidence. Null when the dossier carries none: a v1 dossier, a v2 dossier
   * without semantic triage evidence, or an identity that fails the
   * projection screen. NOTHING is derived, inferred or hashed from prose to
   * fill this in, so null here means the reviewer surface reports UNKNOWN.
   */
  readonly expectationId: string | null;
  /** The semantic contract / invariant identity, carried on the same terms. */
  readonly semanticContractId: string | null;
  /**
   * Digest of the ENTIRE parsed dossier this row was derived from.
   *
   * A review binds to it, so a change anywhere in the dossier makes a stored
   * review stale — including a change to a field this row does not project.
   * Binding to the row alone would let an unprojected edit slip past a
   * decision that was made before it.
   */
  readonly contentDigest: string;
}

export interface FindingsAuthoritySnapshot {
  readonly schemaVersion: typeof CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION;
  readonly state: FindingsAuthorityState;
  readonly dossiers: readonly FindingsDossierMetadata[];
  readonly generation: string | null;
  readonly reasonCodes: readonly FindingsAuthorityReasonCode[];
}

export interface FindingsAuthority {
  readonly snapshot: () => FindingsAuthoritySnapshot;
}

const DOSSIER_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$/;
const MAX_DOSSIER_FILES = 256;
const MAX_DOSSIER_FILE_BYTES = 2_000_000;
const MAX_DOSSIER_TOTAL_BYTES = 16_000_000;
const DOSSIER_SCHEMA_PREFIX = 'nightwatch.bug-dossier.private.';

function sortedReasons(values: readonly FindingsAuthorityReasonCode[]): readonly FindingsAuthorityReasonCode[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function ownerOnly(stat: fs.Stats): boolean {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) return false;
  return (stat.mode & 0o077) === 0;
}

function unavailable(reason: FindingsAuthorityReasonCode): FindingsAuthoritySnapshot {
  return {
    schemaVersion: CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION,
    state: 'UNAVAILABLE',
    dossiers: [],
    generation: null,
    reasonCodes: [reason],
  };
}

function generationFor(state: FindingsAuthorityState, dossiers: readonly FindingsDossierMetadata[], reasons: readonly FindingsAuthorityReasonCode[]): string {
  return prefixedDigest24('cc-findings-generation', {
    schemaVersion: CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION,
    state,
    reasons,
    dossiers: dossiers.map((dossier) => ({
      schemaVersion: dossier.schemaVersion,
      status: dossier.status,
      candidateId: dossier.candidateId,
      fingerprint: dossier.oracleFingerprint,
      evidenceLevel: dossier.evidenceLevel,
      sourceCurrentness: dossier.sourceCurrentness,
      reproduction: dossier.reproduction.result,
      reproductionCount: dossier.reproduction.count,
      minimality: dossier.reproduction.minimalityGuarantee,
      firstObserved: dossier.firstObserved,
      lastObserved: dossier.lastObserved,
    })).sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
  });
}

function readStableText(filePath: string): { readonly text: string } | { readonly reason: FindingsAuthorityReasonCode } {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let descriptor: number | null = null;
    try {
      descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      const before = fs.fstatSync(descriptor);
      if (!before.isFile()) return { reason: 'FINDINGS_FILE_UNSAFE' };
      if (!ownerOnly(before)) return { reason: 'FINDINGS_ROOT_PERMISSIONS_UNSAFE' };
      if (before.size > MAX_DOSSIER_FILE_BYTES) return { reason: 'FINDINGS_FILE_TOO_LARGE' };
      const text = fs.readFileSync(descriptor, { encoding: 'utf8' });
      const after = fs.fstatSync(descriptor);
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) {
        if (attempt === 0) continue;
        return { reason: 'FINDINGS_FILE_UNSTABLE' };
      }
      return { text };
    } catch {
      return { reason: 'FINDINGS_FILE_UNSAFE' };
    } finally {
      if (descriptor !== null) {
        try { fs.closeSync(descriptor); } catch { /* categorical failure already selected */ }
      }
    }
  }
  return { reason: 'FINDINGS_FILE_UNSTABLE' };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function dossierCandidate(raw: unknown, fileName: string): { readonly value: unknown; readonly dossierLike: boolean } {
  if (!record(raw)) return { value: raw, dossierLike: fileName.startsWith('candidate-') };
  if (record(raw.dossier)) return { value: raw.dossier, dossierLike: true };
  const schemaVersion = raw.schemaVersion;
  if (typeof schemaVersion === 'string' && (schemaVersion === DOSSIER_VERSION || schemaVersion === DOSSIER_VERSION_V2 || schemaVersion.startsWith(DOSSIER_SCHEMA_PREFIX))) {
    return { value: raw, dossierLike: true };
  }
  return { value: raw, dossierLike: fileName.startsWith('candidate-') };
}

function validatedDossier(value: unknown): FindingsDossier | null {
  const result = validateArtifact('dossier', value);
  if (!result.valid) return null;
  if (!record(value) || (value.schemaVersion !== DOSSIER_VERSION && value.schemaVersion !== DOSSIER_VERSION_V2)) return null;
  if (value.status === 'INCOMPLETE') return null;
  if (value.schemaVersion === DOSSIER_VERSION_V2) return value as unknown as BugDossierV2;
  return value as unknown as BugDossier;
}

/**
 * Project one upstream identity across the Control Center boundary.
 *
 * The identity is ALREADY privacy-validated where it is constructed
 * (`validateSemanticTriageEvidence` applies the safe-id pattern, the sentinel
 * set and a whole-object sentinel sweep). Re-screening here is defence in
 * depth, not derivation: this function can only drop an identity, never
 * invent or repair one.
 *
 * Both screens are applied deliberately. The id pattern alone would pass
 * `CUSTOMER_SENTINEL`, which is a valid identifier shape and an invalid thing
 * to project; the sentinel screen alone would pass a path-shaped value.
 */
function projectedIdentity(value: unknown): string | null {
  const safe = asSafeControlCenterId(value);
  if (safe === null) return null;
  return containsPrivatePayloadShape(safe) ? null : (safe as string);
}

/**
 * The dossier's semantic triage evidence, or null. v1 dossiers have no such
 * field; a v2 dossier may legitimately carry `null`.
 */
function semanticTriageEvidenceOf(dossier: FindingsDossier): Record<string, unknown> | null {
  const candidate = (dossier as unknown as Record<string, unknown>).semanticTriageEvidence;
  return record(candidate) ? candidate : null;
}

function toMetadata(dossier: FindingsDossier): FindingsDossierMetadata | null {
  const candidateId = asSafeControlCenterId(dossier.candidateId);
  const oracleFingerprint = asSafeControlCenterDigest(dossier.oracleFingerprint);
  if (candidateId === null || oracleFingerprint === null) return null;
  return {
    schemaVersion: dossier.schemaVersion,
    status: dossier.status === 'READY' ? 'READY' : 'INCOMPLETE',
    candidateId,
    title: asSafeControlCenterLabel(dossier.title),
    firstObserved: asSafeControlCenterTimestamp(dossier.firstObserved),
    lastObserved: asSafeControlCenterTimestamp(dossier.lastObserved),
    routeClass: asSafeControlCenterLabel(dossier.routeClass),
    oracleFingerprint,
    evidenceLevel: dossier.evidenceLevel,
    reproduction: {
      result: dossier.reproduction.result,
      count: dossier.reproduction.count,
      minimalityGuarantee: dossier.reproduction.minimalityGuarantee,
    },
    technicalSeverity: dossier.technicalSeverity,
    triagePriority: dossier.triagePriority,
    confidence: { level: dossier.confidence.level },
    sourceCurrentness: reduceFindingsSourceCurrentness(dossier.sourceChangeCandidates.map((candidate) => candidate.sourceFreshness)),
    semanticFinding: dossier.semanticEvidence !== null && dossier.semanticEvidence !== undefined,
    // Carried, never derived. See projectedIdentity.
    expectationId: projectedIdentity(semanticTriageEvidenceOf(dossier)?.expectationId),
    semanticContractId: projectedIdentity(semanticTriageEvidenceOf(dossier)?.invariantDefinitionId),
    contentDigest: prefixedDigest24('cc-dossier-content', dossier),
  };
}

function reasonForValidation(value: unknown): FindingsAuthorityReasonCode {
  if (!record(value)) return 'FINDINGS_SCHEMA_INVALID';
  const serialized = JSON.stringify(value);
  return containsPrivatePayloadShape(serialized) ? 'FINDINGS_PRIVACY_BLOCKED' : 'FINDINGS_SCHEMA_INVALID';
}

function readFindingsSnapshot(root: string): FindingsAuthoritySnapshot {
  try {
    try { assertPrivateArtifactPath(root, root); } catch { return unavailable('FINDINGS_ROOT_UNSAFE'); }
    let rootStat: fs.Stats;
    try {
      rootStat = fs.lstatSync(root);
    } catch (error) {
      return unavailable((error as NodeJS.ErrnoException).code === 'ENOENT' ? 'FINDINGS_ROOT_UNAVAILABLE' : 'FINDINGS_ROOT_UNSAFE');
    }
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) return unavailable('FINDINGS_ROOT_UNSAFE');
    if (!ownerOnly(rootStat)) return unavailable('FINDINGS_ROOT_PERMISSIONS_UNSAFE');
    const entries = fs.readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    const files = entries.filter((entry) => entry.name.endsWith('.json'));
    const reasons: FindingsAuthorityReasonCode[] = [];
    if (files.length > MAX_DOSSIER_FILES) reasons.push('FINDINGS_FILE_LIMIT');
    const dossiers: FindingsDossierMetadata[] = [];
    const candidateIds = new Set<string>();
    let inspectedBytes = 0;
    for (const entry of files.slice(0, MAX_DOSSIER_FILES)) {
      const fileName = entry.name;
      if (!DOSSIER_FILE_RE.test(fileName) || fileName.includes('..')) {
        reasons.push('FINDINGS_FILE_UNSAFE');
        continue;
      }
      const filePath = path.join(root, fileName);
      try {
        assertPrivateArtifactPath(filePath, root);
      } catch {
        reasons.push('FINDINGS_FILE_UNSAFE');
        continue;
      }
      let fileStat: fs.Stats;
      try { fileStat = fs.lstatSync(filePath); } catch { reasons.push('FINDINGS_FILE_UNSAFE'); continue; }
      if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
        reasons.push('FINDINGS_FILE_UNSAFE');
        continue;
      }
      if (!ownerOnly(fileStat)) {
        reasons.push('FINDINGS_ROOT_PERMISSIONS_UNSAFE');
        continue;
      }
      if (fileStat.size > MAX_DOSSIER_FILE_BYTES || fileStat.size > MAX_DOSSIER_TOTAL_BYTES - inspectedBytes) {
        reasons.push(fileStat.size > MAX_DOSSIER_FILE_BYTES ? 'FINDINGS_FILE_TOO_LARGE' : 'FINDINGS_FILE_LIMIT');
        continue;
      }
      inspectedBytes += fileStat.size;
      const read = readStableText(filePath);
      if ('reason' in read) {
        reasons.push(read.reason);
        continue;
      }
      if (containsPrivatePayloadShape(read.text)) {
        reasons.push('FINDINGS_PRIVACY_BLOCKED');
        continue;
      }
      let raw: unknown;
      try { raw = JSON.parse(read.text) as unknown; } catch { reasons.push('FINDINGS_PARTIAL_CORRUPTION'); continue; }
      const candidate = dossierCandidate(raw, fileName);
      if (!candidate.dossierLike) continue;
      const result = validateArtifact('dossier', candidate.value);
      if (!result.valid) {
        reasons.push(reasonForValidation(candidate.value));
        continue;
      }
      if (record(candidate.value) && candidate.value.status === 'INCOMPLETE') {
        reasons.push('FINDINGS_INCOMPLETE_DOSSIER');
        continue;
      }
      const dossier = validatedDossier(candidate.value);
      if (dossier === null) {
        reasons.push('FINDINGS_SCHEMA_INVALID');
        continue;
      }
      if (candidateIds.has(dossier.candidateId)) {
        reasons.push('FINDINGS_DUPLICATE_DOSSIER');
        continue;
      }
      const metadata = toMetadata(dossier);
      if (metadata === null) {
        reasons.push('FINDINGS_SCHEMA_INVALID');
        continue;
      }
      candidateIds.add(metadata.candidateId);
      dossiers.push(metadata);
    }
    const normalizedReasons = sortedReasons(reasons);
    const state: FindingsAuthorityState = normalizedReasons.some((reason) => reason !== 'FINDINGS_EMPTY' && reason !== 'FINDINGS_INCOMPLETE_DOSSIER')
      ? 'UNKNOWN'
      : dossiers.length === 0 ? 'EMPTY' : 'AVAILABLE';
    const finalReasons = normalizedReasons.length === 0 && dossiers.length === 0 ? ['FINDINGS_EMPTY'] as const : normalizedReasons;
    return {
      schemaVersion: CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION,
      state,
      dossiers: dossiers.sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
      generation: generationFor(state, dossiers, finalReasons),
      reasonCodes: finalReasons,
    };
  } catch {
    return unavailable('FINDINGS_INTERNAL_ERROR');
  }
}

/**
 * C-10 / F-18: the Control Center findings authority may NEVER resolve the
 * production findings store. This is a security invariant, not a consequence of
 * the current default path, so it is enforced by resolved-path equivalence on
 * EVERY construction route — including the test-only seam, so that a seam
 * cannot accidentally become production authority.
 */
function assertDevFindingsRoot(root: string): void {
  assertNotProductionFindingsRoot(root);
}

/** Create the normal fixed owner-local findings authority. */
export function createFindingsAuthority(): FindingsAuthority {
  let root: string | null = null;
  let productionExcluded = false;
  try {
    const candidate = privateArtifactRoot();
    assertDevFindingsRoot(candidate);
    root = candidate;
  } catch (error) {
    // Distinguish "the production store was reached" from a generic failure so
    // the refusal is legible in the snapshot rather than silently unavailable.
    if (error instanceof Error && error.message === 'FINDINGS_ROOT_PRODUCTION_EXCLUDED') {
      productionExcluded = true;
    }
  }
  return {
    snapshot: () => {
      if (productionExcluded) return unavailable('FINDINGS_ROOT_PRODUCTION_EXCLUDED');
      return root === null ? unavailable('FINDINGS_ROOT_UNAVAILABLE') : readFindingsSnapshot(root);
    },
  };
}

/**
 * Test-only seam; normal server construction has no root option. The
 * production exclusion applies here too, BEFORE the root is resolved, so this
 * seam cannot be used to reach the production store.
 */
export function createFindingsAuthorityForTests(root: string): FindingsAuthority {
  assertDevFindingsRoot(root);
  const resolvedRoot = privateArtifactRoot(root);
  assertDevFindingsRoot(resolvedRoot);
  return { snapshot: () => readFindingsSnapshot(resolvedRoot) };
}
