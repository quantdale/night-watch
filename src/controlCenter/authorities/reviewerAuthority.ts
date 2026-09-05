// ---------------------------------------------------------------------------
// Nightwatch Control Center — reviewer authority.
//
// Maps the read-only findings snapshot onto the REAL finding-intelligence
// cone and returns the inputs the reviewer projection consumes. It calls
// classifyRelationship, classifyRecurrence and groupDefectClasses rather than
// reimplementing them, so the browser surface and the human filing report
// answer to the same certified logic.
//
// What the snapshot cannot supply stays UNKNOWN. Dossier metadata carries no
// expectation identity, no semantic contract identity and no review record,
// so relationships rest on fingerprint evidence, defect classes are usually
// absent, and local review is UNKNOWN until a review store exists. That is
// the honest answer; supplying a default here would be the exact failure the
// contract forbids.
//
// The Alphaus vocabulary below is a DELIBERATE LITERAL DUPLICATE of
// src/core/alphausHandoff/types.ts under the F-12 reverse-isolation
// discipline: hardening forbids any file outside the AH-1 cones and tests
// from importing that module, and a hardening rule pins these literals to it
// so the copy cannot drift.
//
// Pure: no fs, network, child_process, or persistence authority.
// ---------------------------------------------------------------------------

import {
  classifyRecurrence,
  classifyRelationship,
  groupDefectClasses,
  type DefectClass,
  type IntelFindingDescriptor,
  type IntelHistoryEntry,
  type RelationshipResult,
} from '../../core/findingIntel';
import type { FindingsDossierMetadata } from './findingsAuthority';
import type { ReviewerFindingInput } from '../adapters/reviewerAdapter';

/** Pinned duplicates of ALPHAUS_SEVERITY_VALUES / _CATCH_STAGE_ / _SOURCE_. */
const ALPHAUS_SEVERITY_LITERALS = ['blocker', 'critical', 'major', 'minor'] as const;
const ALPHAUS_CATCH_STAGE_LITERALS = ['pr_review', 'next', 'production', 'production_outage'] as const;
const ALPHAUS_SOURCE_LITERALS = ['self_found', 'customer_escaped'] as const;

/**
 * Nightwatch technical severity to the Alphaus severity vocabulary. Total and
 * explicit: an unmapped value would otherwise become a silent default.
 */
const SEVERITY_RECOMMENDATION: Readonly<Record<string, (typeof ALPHAUS_SEVERITY_LITERALS)[number]>> = Object.freeze({
  CRITICAL: 'blocker',
  HIGH: 'critical',
  MEDIUM: 'major',
  LOW: 'minor',
});

/**
 * Dossier confidence to the intel confidence vocabulary. The dossier scale is
 * coarser, so the mapping never claims PROVEN: PROVEN requires a mechanical
 * proof artifact that a summary level does not carry.
 */
const CONFIDENCE_MAP: Readonly<Record<string, string>> = Object.freeze({
  HIGH: 'HIGH_CONFIDENCE',
  MEDIUM: 'SUPPORTED',
  LOW: 'TENTATIVE',
  UNRESOLVED: 'INSUFFICIENT',
});

const FINGERPRINT_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const ID_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;

export interface ReviewerAuthorityInput {
  readonly dossiers: readonly FindingsDossierMetadata[];
  /** Campaign identity for recurrence chronology; UNKNOWN_HISTORY without it. */
  readonly campaignId: string | null;
  /**
   * Pairwise relationship analysis is quadratic. This bound is the number of
   * findings above which pairwise comparison is not attempted and every
   * relationship is reported UNKNOWN with a stated reason, rather than the
   * surface stalling. M4 measures where the real threshold lies; this is the
   * mechanism that lets a measured number be applied.
   */
  readonly pairwiseLimit?: number;
}

function descriptorFor(dossier: FindingsDossierMetadata): IntelFindingDescriptor | null {
  if (typeof dossier.candidateId !== 'string' || !ID_RE.test(dossier.candidateId)) return null;
  const fingerprint =
    typeof dossier.oracleFingerprint === 'string' && FINGERPRINT_RE.test(dossier.oracleFingerprint)
      ? dossier.oracleFingerprint
      : null;
  const route = typeof dossier.routeClass === 'string' && ID_RE.test(dossier.routeClass) ? dossier.routeClass : null;
  return {
    findingId: dossier.candidateId,
    fingerprint,
    // Dossier metadata carries no expectation or contract identity. Null is
    // the truthful value and drives the cone to UNKNOWN where it should.
    expectationId: null,
    semanticContractId: null,
    failureSignature: null,
    route,
    sourceLineage: null,
    replayOutcome: dossier.reproduction.result === 'REPRODUCED' ? 'FAILURE' : null,
  };
}

function observedAtMs(value: string | null): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

/**
 * Best relationship for `candidate` among the earlier findings, plus every
 * duplicate-shaped suggestion. "Earlier" is decided by observation time and
 * then by identifier, so the result does not depend on snapshot ordering.
 */
function relationshipsFor(
  candidate: IntelFindingDescriptor,
  earlier: readonly IntelFindingDescriptor[]
): { readonly best: RelationshipResult | null; readonly duplicates: readonly RelationshipResult[] } {
  const duplicates: RelationshipResult[] = [];
  let best: RelationshipResult | null = null;
  const rank: Readonly<Record<string, number>> = {
    EXACT_SAME_FINDING: 6,
    REGRESSION_CANDIDATE: 5,
    PROBABLE_DUPLICATE: 4,
    SHARED_DEFECT_CLASS: 3,
    RELATED_FINDING: 2,
    UNRELATED: 1,
    UNKNOWN: 0,
  };
  for (const other of earlier) {
    const result = classifyRelationship(candidate, other);
    if (result.relationship === 'EXACT_SAME_FINDING' || result.relationship === 'PROBABLE_DUPLICATE') {
      duplicates.push(result);
    }
    if (best === null || (rank[result.relationship] ?? 0) > (rank[best.relationship] ?? 0)) best = result;
  }
  return { best, duplicates };
}

export function reviewerInputsFromFindings(input: ReviewerAuthorityInput): readonly ReviewerFindingInput[] {
  const dossiers = Array.isArray(input.dossiers) ? input.dossiers : [];
  const pairwiseLimit = typeof input.pairwiseLimit === 'number' && input.pairwiseLimit >= 0 ? input.pairwiseLimit : 2000;
  const campaignId = typeof input.campaignId === 'string' && ID_RE.test(input.campaignId) ? input.campaignId : null;

  const entries = dossiers
    .map((dossier) => ({ dossier, descriptor: descriptorFor(dossier), at: observedAtMs(dossier.firstObserved) }))
    .filter((entry): entry is { dossier: FindingsDossierMetadata; descriptor: IntelFindingDescriptor; at: number | null } =>
      entry.descriptor !== null
    )
    .sort((left, right) => (left.at ?? 0) - (right.at ?? 0) || left.descriptor.findingId.localeCompare(right.descriptor.findingId));

  const pairwise = entries.length <= pairwiseLimit;

  const classes: readonly DefectClass[] = groupDefectClasses(
    entries.map((entry) => ({
      findingId: entry.descriptor.findingId,
      semanticContractId: entry.descriptor.semanticContractId,
      expectationId: entry.descriptor.expectationId,
      sourceScope: entry.descriptor.route ?? 'UNKNOWN_SCOPE',
      replayOutcome: entry.descriptor.replayOutcome,
    }))
  );
  const classByMember = new Map<string, DefectClass>();
  for (const defectClass of classes) {
    for (const member of defectClass.memberFindingIds) classByMember.set(member, defectClass);
  }

  const history: IntelHistoryEntry[] = [];
  return entries.map((entry, index) => {
    const { best, duplicates } = pairwise
      ? relationshipsFor(
          entry.descriptor,
          entries.slice(0, index).map((earlier) => earlier.descriptor)
        )
      : { best: null, duplicates: [] };

    const at = entry.at;
    const recurrence =
      campaignId === null || at === null
        ? null
        : classifyRecurrence(
            { findingId: entry.descriptor.findingId, fingerprint: entry.descriptor.fingerprint, campaignId, observedAtMs: at },
            [...history]
          );
    if (campaignId !== null && at !== null) {
      history.push({
        findingId: entry.descriptor.findingId,
        fingerprint: entry.descriptor.fingerprint,
        campaignId,
        observedAtMs: at,
        sourceSha: '0'.repeat(40),
        priorOutcome: 'UNKNOWN',
      });
    }

    const severity = SEVERITY_RECOMMENDATION[entry.dossier.technicalSeverity] ?? null;
    const unknowns: string[] = [];
    if (best === null && !pairwise) unknowns.push('RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT');
    if (entry.descriptor.fingerprint === null) unknowns.push('NO_EXECUTABLE_FINGERPRINT');
    if (classByMember.get(entry.descriptor.findingId) === undefined) unknowns.push('NO_DEFECT_CLASS_IDENTIFIED');
    unknowns.push('NO_LOCAL_REVIEW_STORE');

    return {
      findingId: entry.descriptor.findingId,
      relationship: best,
      probableDuplicates: duplicates,
      recurrence,
      defectClass: classByMember.get(entry.descriptor.findingId) ?? null,
      // Provenance is read from what the dossier records about itself, never
      // inferred from severity or confidence.
      expectationProvenance: entry.dossier.semanticFinding ? 'SEMANTIC_ORACLE' : 'PROTOCOL_CONTRACT',
      confidence: CONFIDENCE_MAP[entry.dossier.confidence.level] ?? 'INSUFFICIENT',
      alphausRecommendation: {
        severity: (severity ?? 'minor').toUpperCase(),
        severityBasis: severity === null ? 'NO_SEVERITY_MAPPING' : 'DOSSIER_TECHNICAL_SEVERITY',
        // Nightwatch observes locally, so the catch stage it can evidence is
        // the earliest one. Anything later would be a claim about where the
        // defect would otherwise have been found, which is not observed.
        catchStage: ALPHAUS_CATCH_STAGE_LITERALS[0].toUpperCase(),
        catchStageBasis: 'LOCAL_PRE_REVIEW_OBSERVATION',
        // Taken from provenance, never from convenience: Nightwatch found it.
        source: ALPHAUS_SOURCE_LITERALS[0].toUpperCase(),
        sourceBasis: 'NIGHTWATCH_LOCAL_DISCOVERY',
        team: 'UNKNOWN',
        teamEvidence: null,
      },
      localReview: null,
      unknowns,
    };
  });
}
