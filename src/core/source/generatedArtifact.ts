// ---------------------------------------------------------------------------
// Nightwatch C-02a — generated-artifact evidence provenance.
//
// A committed generated artifact (`alphauslabs/blueapi/openapiv2/
// apidocs.swagger.json`) is still source evidence, but it is *generated*
// source evidence: it is a mirror of the protobuf surface that is refreshed
// only when somebody runs the generator. This module is data-only policy and
// deterministic classification. It has no filesystem, process, or network
// authority; the sibling-source boundary performs every read.
//
// Three separable facts are kept apart on purpose:
//
//   1. evidence class     — DIRECT_SOURCE vs GENERATED_ARTIFACT (a pure
//                           function of repository + path).
//   2. generation currency — whether the artifact's relationship to the proto
//                           surface has been mechanically established. With no
//                           corroborator admitted (the proto surface arrives
//                           with C-02b) the honest answer is UNKNOWN, never
//                           CURRENT.
//   3. production admission — an evidence-class gate that may only DENY. A
//                           GENERATED_ARTIFACT can never be the sole basis of
//                           a production admission, and an UNKNOWN or STALE
//                           currency denies on its own.
// ---------------------------------------------------------------------------

export const SOURCE_EVIDENCE_PROVENANCE_VERSION = 'nightwatch.source-evidence-provenance.v1' as const;

export const SOURCE_EVIDENCE_QUALIFIERS = ['DIRECT_SOURCE', 'GENERATED_ARTIFACT'] as const;
export type SourceEvidenceQualifier = (typeof SOURCE_EVIDENCE_QUALIFIERS)[number];

export const GENERATION_CURRENCY_STATES = ['CURRENT', 'STALE', 'UNKNOWN'] as const;
export type GenerationCurrencyState = (typeof GENERATION_CURRENCY_STATES)[number];

export const GENERATION_CURRENCY_REASONS = [
  'GENERATION_CORROBORATOR_UNAVAILABLE',
  'GENERATION_CORROBORATION_SNAPSHOT_MISMATCH',
  'GENERATION_CORROBORATION_MALFORMED',
  'GENERATION_OPERATION_COUNT_MISMATCH',
  'GENERATION_CORROBORATED_EXACT',
] as const;
export type GenerationCurrencyReason = (typeof GENERATION_CURRENCY_REASONS)[number];

export const PRODUCTION_ADMISSION_DENIAL_CODES = [
  'GENERATED_ARTIFACT_SOLE_EVIDENCE',
  'GENERATION_CURRENCY_UNKNOWN',
  'GENERATION_CURRENCY_STALE',
] as const;
export type ProductionAdmissionDenialCode = (typeof PRODUCTION_ADMISSION_DENIAL_CODES)[number];

/**
 * Owner-approved generated roots, per repository. This is the ONLY place a
 * root is declared generated; an unlisted root is DIRECT_SOURCE. Admission of
 * the root itself remains the separate concern of `approvedScan.ts`.
 */
const GENERATED_ARTIFACT_ROOTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'alphauslabs/blueapi': Object.freeze(['openapiv2']),
});

/**
 * Corroboration record produced by an independent view of the proto surface.
 * C-02a admits no proto parser, so the registry below is intentionally empty:
 * the check exists, its input does not yet, and the resulting currency is
 * therefore explicitly UNKNOWN rather than silently CURRENT.
 */
export interface ProtoSurfaceCorroboration {
  readonly repoId: string;
  /** Exact repository snapshot the corroboration was derived from. */
  readonly sourceSha: string;
  /** Generated artifact path the corroboration speaks about. */
  readonly artifactPath: string;
  /** Operation count independently recovered from the proto surface. */
  readonly protoOperationCount: number;
}

export const PROTO_SURFACE_CORROBORATIONS: readonly ProtoSurfaceCorroboration[] = Object.freeze([]);

export interface GenerationCurrency {
  readonly state: GenerationCurrencyState;
  readonly reason: GenerationCurrencyReason;
  readonly corroborator: 'PROTO_SURFACE';
  /** Operations recovered from the generated artifact for this repository. */
  readonly artifactOperationCount: number;
  /** Operations independently recovered from the proto surface, when known. */
  readonly corroboratedOperationCount: number | null;
}

export interface ProductionAdmissionEvidenceDecision {
  /** This gate only ever denies. It never grants production authority. */
  readonly state: 'DENIED' | 'NOT_DENIED_BY_EVIDENCE_CLASS';
  readonly denialCodes: readonly ProductionAdmissionDenialCode[];
}

export interface SourceEvidenceProvenance {
  readonly schemaVersion: typeof SOURCE_EVIDENCE_PROVENANCE_VERSION;
  /** Generated or not, this remains source evidence. */
  readonly evidenceClass: 'SOURCE_FACT';
  readonly qualifier: SourceEvidenceQualifier;
  readonly generationCurrency: GenerationCurrency | null;
  readonly productionAdmission: ProductionAdmissionEvidenceDecision;
}

function normalizedSegments(relativePath: string): readonly string[] {
  return relativePath.split('/').filter((segment) => segment.length > 0);
}

/** Pure classification: is this repository/path a committed generated artifact? */
export function classifySourceEvidenceQualifier(repoId: string, relativePath: string): SourceEvidenceQualifier {
  const roots = GENERATED_ARTIFACT_ROOTS[repoId];
  if (roots === undefined) return 'DIRECT_SOURCE';
  const first = normalizedSegments(relativePath)[0];
  if (first === undefined) return 'DIRECT_SOURCE';
  return roots.includes(first) ? 'GENERATED_ARTIFACT' : 'DIRECT_SOURCE';
}

export function isGeneratedArtifactRoot(repoId: string, root: string): boolean {
  return GENERATED_ARTIFACT_ROOTS[repoId]?.includes(root) === true;
}

/**
 * Establish the generated artifact's relationship to the proto surface. An
 * absent, malformed, or differently-snapshotted corroboration is never
 * silently treated as current — it stays UNKNOWN.
 */
export function evaluateGenerationCurrency(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly artifactPath: string;
  readonly artifactOperationCount: number;
  readonly corroborations?: readonly ProtoSurfaceCorroboration[];
}): GenerationCurrency {
  const corroborations = input.corroborations ?? PROTO_SURFACE_CORROBORATIONS;
  const base = { corroborator: 'PROTO_SURFACE' as const, artifactOperationCount: input.artifactOperationCount };
  const candidates = corroborations.filter((entry) => entry.repoId === input.repoId && entry.artifactPath === input.artifactPath);
  const candidate = candidates[0];
  if (candidates.length !== 1 || candidate === undefined) {
    return { ...base, state: 'UNKNOWN', reason: candidates.length > 1 ? 'GENERATION_CORROBORATION_MALFORMED' : 'GENERATION_CORROBORATOR_UNAVAILABLE', corroboratedOperationCount: null };
  }
  if (!Number.isInteger(candidate.protoOperationCount) || candidate.protoOperationCount < 0) {
    return { ...base, state: 'UNKNOWN', reason: 'GENERATION_CORROBORATION_MALFORMED', corroboratedOperationCount: null };
  }
  if (candidate.sourceSha !== input.sourceSha) {
    return { ...base, state: 'UNKNOWN', reason: 'GENERATION_CORROBORATION_SNAPSHOT_MISMATCH', corroboratedOperationCount: candidate.protoOperationCount };
  }
  if (candidate.protoOperationCount !== input.artifactOperationCount) {
    return { ...base, state: 'STALE', reason: 'GENERATION_OPERATION_COUNT_MISMATCH', corroboratedOperationCount: candidate.protoOperationCount };
  }
  return { ...base, state: 'CURRENT', reason: 'GENERATION_CORROBORATED_EXACT', corroboratedOperationCount: candidate.protoOperationCount };
}

/**
 * Evidence-class gate for a future production admission. Deny-only by
 * construction: a caller can never read a grant out of this result.
 */
export function evaluateProductionAdmissionEvidence(input: {
  readonly qualifiers: readonly SourceEvidenceQualifier[];
  readonly generationCurrency: GenerationCurrency | null;
}): ProductionAdmissionEvidenceDecision {
  const denialCodes: ProductionAdmissionDenialCode[] = [];
  const qualifiers = new Set(input.qualifiers);
  const generatedOnly = qualifiers.size > 0 && !qualifiers.has('DIRECT_SOURCE');
  if (generatedOnly) denialCodes.push('GENERATED_ARTIFACT_SOLE_EVIDENCE');
  if (qualifiers.has('GENERATED_ARTIFACT')) {
    if (input.generationCurrency === null || input.generationCurrency.state === 'UNKNOWN') denialCodes.push('GENERATION_CURRENCY_UNKNOWN');
    else if (input.generationCurrency.state === 'STALE') denialCodes.push('GENERATION_CURRENCY_STALE');
  }
  const codes = [...new Set(denialCodes)].sort();
  return { state: codes.length > 0 ? 'DENIED' : 'NOT_DENIED_BY_EVIDENCE_CLASS', denialCodes: codes };
}

/** Build the provenance block carried by one source surface. */
export function sourceEvidenceProvenance(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly artifactOperationCount: number;
  readonly corroborations?: readonly ProtoSurfaceCorroboration[];
}): SourceEvidenceProvenance {
  const qualifier = classifySourceEvidenceQualifier(input.repoId, input.relativePath);
  const generationCurrency = qualifier === 'GENERATED_ARTIFACT'
    ? evaluateGenerationCurrency({ repoId: input.repoId, sourceSha: input.sourceSha, artifactPath: input.relativePath, artifactOperationCount: input.artifactOperationCount, corroborations: input.corroborations })
    : null;
  return {
    schemaVersion: SOURCE_EVIDENCE_PROVENANCE_VERSION,
    evidenceClass: 'SOURCE_FACT',
    qualifier,
    generationCurrency,
    productionAdmission: evaluateProductionAdmissionEvidence({ qualifiers: [qualifier], generationCurrency }),
  };
}
