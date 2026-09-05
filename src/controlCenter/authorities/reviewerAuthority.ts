// ---------------------------------------------------------------------------
// Nightwatch Control Center — reviewer authority.
//
// Maps the read-only findings snapshot onto the REAL finding-intelligence
// cone and returns the inputs the reviewer projection consumes. It calls
// classifyRelationship, classifyRecurrence and groupDefectClasses rather than
// reimplementing them, so the browser surface and the human filing report
// answer to the same certified logic.
//
// What the snapshot cannot supply stays UNKNOWN. Where the dossier DOES carry
// an expectation or semantic-contract identity — a v2 dossier with semantic
// triage evidence — it is carried forward unchanged, so relationships and
// defect classes can rest on that identity as well as on fingerprint
// evidence. Where it does not, both stay null and the cone reports UNKNOWN.
// That is the honest answer; supplying a default here would be the exact
// failure the contract forbids.
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
import { CONTROL_CENTER_REVIEW_NO_SOURCE } from './reviewBinding';
import type { ReviewerFindingInput, ReviewerLocalReviewInput, ReviewerProjectionInput } from '../adapters/reviewerAdapter';
import { safePublicId } from '../adapters/common';

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
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;
const ID_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;

export interface ReviewerAuthorityInput {
  readonly dossiers: readonly FindingsDossierMetadata[];
  /** Campaign identity for recurrence chronology; UNKNOWN_HISTORY without it. */
  readonly campaignId: string | null;
  /**
   * Source identity of the observations in this snapshot.
   *
   * The SAME value the review binding records, imported from the same module
   * rather than re-derived, so a finding's history entry and its review
   * binding can never disagree about what was observed. When no source
   * evidence exists the named absence `synthetic.no-source-evidence` is
   * carried through — not a forty-zero SHA, which reads as a real commit and
   * is what this authority used to fabricate.
   */
  readonly sourceSha?: string | null;
  /**
   * Corpus size above which pairwise comparison is not attempted and every
   * relationship is reported UNKNOWN with a stated reason, rather than the
   * surface stalling.
   *
   * M4 measured a pair at ~3.6 µs. Since M5 the served path compares only the
   * findings on the requested page against the corpus, so the cost is
   * `page x corpus`, not `corpus squared`: at the maximum page of 100 rows a
   * 2,500-finding corpus is ~250,000 comparisons ≈ 0.9 s. The default is set
   * from that number rather than from intuition.
   */
  readonly pairwiseLimit?: number;
  /**
   * How many findings the caller will actually render. Intelligence is
   * computed for those and no others — see `reviewerInputsFromFindings`.
   */
  readonly limit?: number;
  /**
   * Restrict the projection to these finding ids.
   *
   * `limit` scopes a PAGE; this scopes a SELECTION, which is what a caller
   * wanting one finding actually needs. Without it, a single-finding consumer
   * had to ask for the whole corpus and then discard all but one row — and
   * because each projected row is classified against every earlier finding,
   * that cost `corpus x corpus` to produce one report. Measured on the
   * synthetic corpus: 38 ms at 100 findings, 163 ms at 250, 613 ms at 500,
   * for one document about one finding.
   *
   * History still accumulates over the WHOLE corpus, exactly as page-scoping
   * already does, so the values for the selected finding are byte-identical
   * to what the unscoped path produced. What is removed is only the work for
   * findings nobody asked about.
   */
  readonly onlyFindingIds?: readonly string[];
  /**
   * Persisted local review state for ONE finding, or null when the caller has
   * no review store.
   *
   * A function rather than a map, and invoked ONLY for the findings actually
   * on the page: that is what keeps the read path page-bounded. Passing a
   * prebuilt map would force the caller to look up the whole corpus to
   * render fifty rows — the exact cost the page-scoping optimization removed.
   *
   * It is also what keeps this module pure. The store has filesystem
   * authority; this authority calls a function it was handed and has none.
   */
  readonly localReviewLookup?: (dossier: FindingsDossierMetadata) => ReviewerLocalReviewInput | null;
  /**
   * The identity a decision for this finding must bind to. Supplied by the
   * same authority that owns the store, and computed for page rows only.
   */
  readonly reviewIdentityFor?: (dossier: FindingsDossierMetadata) => string | null;
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
    // Carried forward from the dossier's semantic triage evidence, where
    // these identities are mechanically established and privacy validated.
    // Null when the dossier carries none — a v1 dossier, or a v2 dossier
    // without semantic triage evidence — and null still drives the cone to
    // UNKNOWN, which remains the truthful answer for those. Nothing is
    // derived here: this cone reads an identity or reports its absence.
    // `?? null` normalizes at the boundary rather than trusting the shape:
    // a snapshot can arrive across a JSON boundary where a missing field is
    // `undefined`, and the descriptor contract is `string | null`. The
    // classifier is left exactly as certified.
    expectationId: dossier.expectationId ?? null,
    semanticContractId: dossier.semanticContractId ?? null,
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

/**
 * One finding-history entry for one observed finding.
 *
 * EXPORTED for direct test, and there is a specific reason. Nothing this
 * authority returns exposes a history entry: `priorOutcome` is always
 * `UNKNOWN` here, so `classifyRecurrence` can never take the branch that
 * quotes a source SHA, and the fabricated forty-zero value this authority
 * used to push therefore appeared in no output at all. A defect that reaches
 * no output is not a defect that does not matter — it is one that a
 * behavioural test structurally cannot see, which is exactly how it survived
 * a campaign that certified this cone. So the builder is a named, directly
 * testable function, its single source resolution is shared with the
 * recurrence candidate, and hardening pins both.
 *
 * `priorOutcome` is `UNKNOWN` and must stay so. Nightwatch observes; it never
 * learns that a defect was remediated. A stored local review decision is not
 * remediation evidence, and no path may turn one into `RESOLVED_FIXED`.
 */
export function findingHistoryEntry(
  descriptor: IntelFindingDescriptor,
  campaignId: string,
  sourceSha: string,
  observedAtMs: number
): IntelHistoryEntry {
  return {
    findingId: descriptor.findingId,
    fingerprint: descriptor.fingerprint,
    campaignId,
    observedAtMs,
    sourceSha,
    // Carried from the dossier's semantic triage evidence, or null. Nothing is
    // derived here, and null stays null.
    expectationId: descriptor.expectationId,
    semanticContractId: descriptor.semanticContractId,
    priorOutcome: 'UNKNOWN',
  };
}

/**
 * Project the requested page of findings, with intelligence computed for that
 * page only.
 *
 * M4 measured the whole-corpus approach at 178 s of pairwise and 30 s of
 * recurrence for 10,000 findings — to render fifty rows. The values for a
 * given finding are unchanged: each is still classified against the entire
 * earlier corpus, so the rendered page is byte-identical to what the
 * exhaustive path produced. What is removed is the work for findings nobody
 * asked to see, which is the actual defect the measurement exposed.
 *
 * `total` is returned alongside so the projection can still report truthful
 * truncation. A page that no longer knows the corpus size would report
 * `truncated: false` for a 10,000-finding corpus, which would be a worse bug
 * than the one being fixed.
 */
export function reviewerInputsFromFindings(input: ReviewerAuthorityInput): ReviewerProjectionInput & { readonly findings: readonly ReviewerFindingInput[] } {
  const dossiers = Array.isArray(input.dossiers) ? input.dossiers : [];
  const pairwiseLimit = typeof input.pairwiseLimit === 'number' && input.pairwiseLimit >= 0 ? input.pairwiseLimit : 2500;
  const limit = typeof input.limit === 'number' && Number.isSafeInteger(input.limit) && input.limit > 0 ? input.limit : Number.MAX_SAFE_INTEGER;
  const campaignId = typeof input.campaignId === 'string' && ID_RE.test(input.campaignId) ? input.campaignId : null;
  const lookupLocalReview = typeof input.localReviewLookup === 'function' ? input.localReviewLookup : null;
  const lookupReviewIdentity = typeof input.reviewIdentityFor === 'function' ? input.reviewIdentityFor : null;
  // ONE resolution, shared by the candidate and by every history entry. Two
  // resolutions is how a finding ends up compared against a source identity
  // it never had.
  const sourceSha = typeof input.sourceSha === 'string' && SOURCE_SHA_RE.test(input.sourceSha)
    ? input.sourceSha
    : CONTROL_CENTER_REVIEW_NO_SOURCE;

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

  // The page, chosen by the SAME identity the projection sorts on, so the
  // rows selected here are exactly the rows the projection would have kept.
  const requested = Array.isArray(input.onlyFindingIds) ? new Set(input.onlyFindingIds) : null;
  const ordering = entries
    .map((entry, index) => ({ index, findingId: entry.descriptor.findingId, id: safePublicId(entry.descriptor.findingId, 'cc-reviewer') as string }))
    .filter((row) => requested === null || requested.has(row.findingId))
    .sort((left, right) => left.id.localeCompare(right.id));
  const selected = new Set(ordering.slice(0, limit).map((row) => row.index));

  const history: IntelHistoryEntry[] = [];
  const findings = entries.flatMap((entry, index) => {
    // History must still accumulate over every earlier finding, selected or
    // not: recurrence is a claim about the whole corpus, not about the page.
    const at0 = entry.at;
    if (!selected.has(index)) {
      if (campaignId !== null && at0 !== null) history.push(findingHistoryEntry(entry.descriptor, campaignId, sourceSha, at0));
      return [];
    }
    return [projectEntry(entry, index)];
  });
  // `total` remains the CORPUS size, not the selection: truncation is a claim
  // about how many findings exist, and a selected-set total would report
  // `truncated: false` for a corpus of ten thousand.
  return { findings, total: entries.length };

  function projectEntry(entry: { dossier: FindingsDossierMetadata; descriptor: IntelFindingDescriptor; at: number | null }, index: number): ReviewerFindingInput {
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
            {
              findingId: entry.descriptor.findingId,
              fingerprint: entry.descriptor.fingerprint,
              campaignId,
              observedAtMs: at,
              // The candidate carries the same identities its history entry
              // will, so a source that did not move cannot read as one that
              // did, and a contradicting invariant is visible on both sides.
              sourceSha,
              expectationId: entry.descriptor.expectationId,
              semanticContractId: entry.descriptor.semanticContractId,
            },
            [...history]
          );
    if (campaignId !== null && at !== null) history.push(findingHistoryEntry(entry.descriptor, campaignId, sourceSha, at));

    const severity = SEVERITY_RECOMMENDATION[entry.dossier.technicalSeverity] ?? null;
    const unknowns: string[] = [];
    if (best === null && !pairwise) unknowns.push('RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT');
    if (entry.descriptor.fingerprint === null) unknowns.push('NO_EXECUTABLE_FINGERPRINT');
    if (classByMember.get(entry.descriptor.findingId) === undefined) unknowns.push('NO_DEFECT_CLASS_IDENTIFIED');
    // Looked up for THIS row only — see `localReviewLookup`.
    const localReview = lookupLocalReview === null ? null : lookupLocalReview(entry.dossier);
    if (lookupLocalReview === null) unknowns.push('NO_LOCAL_REVIEW_STORE');
    else if (localReview === null) unknowns.push('NO_LOCAL_REVIEW');
    else if (localReview.bindingCurrentness === 'STALE') unknowns.push('LOCAL_REVIEW_STALE');

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
      localReview,
      reviewIdentity: lookupReviewIdentity === null ? null : lookupReviewIdentity(entry.dossier),
      unknowns,
    };
  }
}
