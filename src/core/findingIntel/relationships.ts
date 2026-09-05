// ---------------------------------------------------------------------------
// Deterministic pairwise finding relationships.
//
// Rules compare sanitized mechanical fields only — never prose similarity.
// Order: EXACT match first, then contract/class/relation, then regression
// via history, else UNRELATED; any missing comparison input yields UNKNOWN
// (never a guessed verdict). Advisory only.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import {
  FINDING_INTEL_VERSION,
  type IntelFindingDescriptor,
  type RelationshipCounterevidence,
  type RelationshipEvidence,
  type RelationshipResult,
} from './types';
const FORBIDDEN_VALUE_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

/** Shared sentinel screen: evidence detail strings embed descriptor values, so no descriptor value may carry one. */
export function isIntelValueForbidden(value: string): boolean {
  return FORBIDDEN_VALUE_RE.test(value);
}

const ID_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const FP_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const FIELD_RE = /^[A-Za-z0-9_.:/@-]{1,200}$/;

function fail(code: string): never {
  throw new Error(code);
}

function assertDescriptor(value: unknown, field: string): asserts value is IntelFindingDescriptor {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}`);
  const record = value as Record<string, unknown>;
  if (typeof record.findingId !== 'string' || !ID_RE.test(record.findingId) || isIntelValueForbidden(record.findingId)) {
    fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}.findingId`);
  }
  for (const key of ['fingerprint', 'expectationId', 'semanticContractId', 'failureSignature', 'route', 'sourceLineage'] as const) {
    const entry = record[key];
    if (entry === null) continue;
    if (typeof entry !== 'string' || isIntelValueForbidden(entry)) fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}.${key}`);
    if (key === 'fingerprint') {
      if (!FP_RE.test(entry)) fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}.fingerprint`);
    } else if (!FIELD_RE.test(entry)) {
      fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}.${key}`);
    }
  }
  const replay = record.replayOutcome;
  if (replay !== null && replay !== 'PASS' && replay !== 'FAILURE' && replay !== 'INVALID') {
    fail(`FINDING_INTEL_INVALID_DESCRIPTOR:${field}.replayOutcome`);
  }
}

export interface RelationshipHistory {
  /** Earlier terminal outcome of `earlierId` where mechanically known. */
  readonly earlierOutcome?: 'OPEN' | 'RESOLVED_FIXED' | 'RESOLVED_OTHER' | 'REJECTED' | 'UNKNOWN';
  /** Earlier source SHA where mechanically known (regression needs a lineage change). */
  readonly earlierSourceSha?: string;
  readonly currentSourceSha?: string;
}

function evidenceFor(a: IntelFindingDescriptor, b: IntelFindingDescriptor): RelationshipEvidence[] {
  const out: RelationshipEvidence[] = [];
  if (a.fingerprint !== null && a.fingerprint === b.fingerprint) {
    out.push({ kind: 'SAME_FINGERPRINT', detail: `shared executable fingerprint ${a.fingerprint}` });
  }
  if (a.expectationId !== null && a.expectationId === b.expectationId) {
    out.push({ kind: 'SAME_EXPECTATION', detail: `shared expectation violation ${a.expectationId}` });
  }
  if (a.semanticContractId !== null && a.semanticContractId === b.semanticContractId) {
    out.push({ kind: 'SAME_SEMANTIC_CONTRACT', detail: `shared semantic contract ${a.semanticContractId}` });
  }
  if (a.failureSignature !== null && a.failureSignature === b.failureSignature) {
    out.push({ kind: 'SAME_FAILURE_SIGNATURE', detail: `shared sanitized failure signature ${a.failureSignature}` });
  }
  if (a.route !== null && a.route === b.route) {
    out.push({ kind: 'SAME_ROUTE', detail: `shared route ${a.route}` });
  }
  if (a.sourceLineage !== null && a.sourceLineage === b.sourceLineage) {
    out.push({ kind: 'SAME_SOURCE_LINEAGE', detail: `shared source lineage ${a.sourceLineage}` });
  }
  if (a.replayOutcome !== null && a.replayOutcome === b.replayOutcome) {
    out.push({ kind: 'SAME_REPLAY_OUTCOME', detail: `shared replay outcome ${a.replayOutcome}` });
  }
  return out;
}

function counterevidenceFor(a: IntelFindingDescriptor, b: IntelFindingDescriptor): RelationshipCounterevidence[] {
  const out: RelationshipCounterevidence[] = [];
  if (a.fingerprint !== null && b.fingerprint !== null && a.fingerprint !== b.fingerprint) {
    out.push({ kind: 'DIFFERENT_FINGERPRINT', detail: 'executable fingerprints differ' });
  }
  if (a.expectationId !== null && b.expectationId !== null && a.expectationId !== b.expectationId) {
    out.push({ kind: 'DIFFERENT_EXPECTATION', detail: 'violated expectations differ' });
  }
  if (a.semanticContractId !== null && b.semanticContractId !== null && a.semanticContractId !== b.semanticContractId) {
    out.push({ kind: 'DIFFERENT_SEMANTIC_CONTRACT', detail: 'semantic contracts differ' });
  }
  if (a.replayOutcome !== null && b.replayOutcome !== null && a.replayOutcome !== b.replayOutcome) {
    out.push({ kind: 'DIFFERENT_REPLAY_OUTCOME', detail: 'replay outcomes differ' });
  }
  for (const [key, label] of [
    ['fingerprint', 'fingerprint'],
    ['expectationId', 'expectation'],
    ['semanticContractId', 'semantic contract'],
    ['failureSignature', 'failure signature'],
  ] as const) {
    if (a[key] === null || b[key] === null) {
      out.push({ kind: 'MISSING_COMPARISON_INPUT', detail: `missing ${label} on at least one side` });
    }
  }
  return out;
}

/**
 * Classify the relationship of `candidate` to `earlier`. Deterministic and
 * order-sensitive only in the advisory pointer (possibleOriginalId is always
 * the earlier finding). Same semantic input always yields the same result.
 */
export function classifyRelationship(
  candidate: IntelFindingDescriptor,
  earlier: IntelFindingDescriptor,
  history?: RelationshipHistory,
): RelationshipResult {
  assertDescriptor(candidate, 'candidate');
  assertDescriptor(earlier, 'earlier');
  const evidence = evidenceFor(candidate, earlier);
  const counterevidence = counterevidenceFor(candidate, earlier);
  const base = {
    schemaVersion: FINDING_INTEL_VERSION,
    evidence,
    counterevidence,
    possibleOriginalId: earlier.findingId,
    advisoryOnly: true as const,
    finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL' as const,
  };

  const hasMissingCoreInput =
    candidate.fingerprint === null ||
    earlier.fingerprint === null ||
    candidate.expectationId === null ||
    earlier.expectationId === null;
  const sameFingerprint = candidate.fingerprint !== null && candidate.fingerprint === earlier.fingerprint;
  const sameExpectation = candidate.expectationId !== null && candidate.expectationId === earlier.expectationId;
  const sameContract = candidate.semanticContractId !== null && candidate.semanticContractId === earlier.semanticContractId;

  // Regression needs mechanical chronology: earlier was fixed AND the source
  // lineage moved. Prose resemblance alone never qualifies.
  if (
    history?.earlierOutcome === 'RESOLVED_FIXED' &&
    history.earlierSourceSha !== undefined &&
    history.currentSourceSha !== undefined &&
    history.earlierSourceSha !== history.currentSourceSha &&
    (sameFingerprint || sameExpectation)
  ) {
    return { ...base, relationship: 'REGRESSION_CANDIDATE', confidence: 'SUPPORTED' };
  }
  if (sameFingerprint && sameExpectation) {
    return { ...base, relationship: 'EXACT_SAME_FINDING', confidence: 'HIGH_CONFIDENCE' };
  }
  if (sameFingerprint) {
    return { ...base, relationship: 'PROBABLE_DUPLICATE', confidence: 'SUPPORTED' };
  }
  if (sameContract) {
    return { ...base, relationship: 'SHARED_DEFECT_CLASS', confidence: 'SUPPORTED' };
  }
  if (sameExpectation) {
    return { ...base, relationship: 'RELATED_FINDING', confidence: 'SUPPORTED' };
  }
  if (evidence.length > 0) {
    return { ...base, relationship: 'RELATED_FINDING', confidence: 'TENTATIVE' };
  }
  if (hasMissingCoreInput) {
    return { ...base, relationship: 'UNKNOWN', confidence: 'INSUFFICIENT', possibleOriginalId: null };
  }
  return { ...base, relationship: 'UNRELATED', confidence: 'SUPPORTED', possibleOriginalId: null };
}

/** Stable digest of a relationship result minus advisory pointers (semantic identity). */
export function relationshipDigest(result: RelationshipResult): string {
  return sha256Hex(
    stableJsonSorted({
      relationship: result.relationship,
      evidence: result.evidence,
      counterevidence: result.counterevidence,
      confidence: result.confidence,
    }),
  ).slice(0, 24);
}
