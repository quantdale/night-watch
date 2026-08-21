// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream D — composed source-contract
// resolution.
//
// ONE pure composition entry point over the existing authoritative low-level
// APIs (none of which are modified):
//
//   contractLifecycleRegistry   -> which expectation families exist for a
//                                  target and which family is terminal
//   admission                   -> mechanical real-source expectation
//                                  derivation at a snapshot
//   collectionAdmission         -> collection-wide transform for
//                                  COLLECTION-terminal chains
//   resolver                    -> currentness-gated atomic resolution
//   contractDrift               -> probe-based drift classification
//   contractResultVocabulary    -> the single categorical result vocabulary
//   canonicalDigest             -> source-SHA validation
//
// Fail-closed everywhere:
//   - an unknown derivation-failure code never falls through to a
//     success-looking category (it lands in UNSUPPORTED through the guarded
//     constructor, never through the fixed table);
//   - mixed family currentness blocks the whole resolution
//     (MIXED_CURRENTNESS_BLOCKED with a STALE overall);
//   - privacy sentinels are screened from every emitted detail string and
//     from caller-supplied free-text probe status before anything is
//     attached;
//   - a malformed snapshot SHA is rejected before any evaluation.
//
// PURE: no fs, no network, no child process, no env, no crypto, no
// persistence (hardening-guarded). Deterministic output order (registry
// order). Raw product/customer values never enter any emitted DTO.
// ---------------------------------------------------------------------------

import { containsAnySentinel } from '../extract/analyzer';
import { driftFromProbes } from '../extract/contractDrift';
import type { ContractDriftClassification } from '../extract/contractDrift';
import {
  aggregateUnifiedContractResults,
  buildUnifiedContractResult,
  unifiedFromCollectionAdmissionFailure,
  unifiedFromDerivationFailure,
  unifiedFromDriftClass,
  unifiedFromRealSourceResolution,
} from './contractResultVocabulary';
import type { UnifiedContractResult } from './contractResultVocabulary';
import {
  listContractFamiliesForTarget,
  terminalContractFamilyForTarget,
} from './contractLifecycleRegistry';
import type { ContractFamilyKind } from './contractLifecycleRegistry';
import { deriveRealSourceExpectation } from '../admission';
import { deriveCollectionWideRealSourceExpectation } from '../collectionAdmission';
import { createRealSourceResolver } from '../resolver';
import { getRealSourceRecipe } from '../recipes/registry';
import type {
  RealSourceCurrentness,
  RealSourceDerivationFailure,
  RealSourceReader,
} from '../recipes/types';
import { isSourceSha } from '../../../core/identity/canonicalDigest';

/** Load-bearing composed-resolution version (schema validation builds on it). */
export const SOURCE_CONTRACT_RESOLUTION_VERSION = 'nightwatch.source-contract-resolution.v1' as const;

export type ComposedResolutionKind =
  | 'RESOLVED_CURRENT'
  | 'STALE'
  | 'SOURCE_UNAVAILABLE'
  | 'NO_EXPECTATION'
  | 'UNKNOWN_TARGET'
  | 'MIXED_CURRENTNESS_BLOCKED'
  | 'AMBIGUOUS_TARGET_SELECTION';

export type FamilyCurrentnessClass = 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_APPLICABLE';

export interface FamilyResolutionRecord {
  familyId: string;
  kind: ContractFamilyKind;
  unified: UnifiedContractResult;
  currentnessClass: FamilyCurrentnessClass;
  /** ev:sha256:<24> of the finally-used derived expectation, or null when no
   *  expectation was admitted for this family in this resolution. */
  evidenceDigest: string | null;
  derivationVersion: string;
}

export interface ComposedSourceContractResolution {
  resolutionVersion: typeof SOURCE_CONTRACT_RESOLUTION_VERSION;
  targetId: string;
  kind: ComposedResolutionKind;
  /** Active expectation families evaluated, in registry order. Mechanical
   *  probes and archived historical shapes are never evaluated here. */
  families: readonly FamilyResolutionRecord[];
  /** Set iff the caller supplied drift-comparison input (a previous digest
   *  for the terminal family or an analyzer probe) AND the composed kind was
   *  RESOLVED_CURRENT or STALE AND the terminal evidence digest was non-null. */
  drift: ContractDriftClassification | null;
  overall: UnifiedContractResult;
  /** Sanitized categorical detail only. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Composed currentness agreement.
// ---------------------------------------------------------------------------

/**
 * Collapse per-family currentness classes into one composed class.
 * NOT_APPLICABLE entries are ignored (they mark families that produced no
 * evaluable expectation this run). Empty after filtering (no expectation
 * families at all, or every family NOT_APPLICABLE) is EMPTY, not an error.
 */
export function evaluateComposedCurrentness(
  classes: readonly FamilyCurrentnessClass[],
): { ok: true; agreed: FamilyCurrentnessClass } | { ok: false; reason: 'MIXED_CURRENTNESS' | 'EMPTY' } {
  let agreed: FamilyCurrentnessClass | null = null;
  for (const cls of classes) {
    if (cls === 'NOT_APPLICABLE') continue;
    if (agreed === null) {
      agreed = cls;
      continue;
    }
    if (agreed !== cls) return { ok: false, reason: 'MIXED_CURRENTNESS' };
  }
  if (agreed === null) return { ok: false, reason: 'EMPTY' };
  return { ok: true, agreed };
}

// ---------------------------------------------------------------------------
// Fail-closed helpers.
// ---------------------------------------------------------------------------

/**
 * Compile-time-exhaustive membership table over RealSourceDerivationFailure.
 * Adding a member to the historical union without a mapping decision here
 * breaks the build instead of silently falling through.
 */
const DERIVATION_FAILURE_MEMBER_TABLE: Record<RealSourceDerivationFailure, true> = {
  SOURCE_UNAVAILABLE: true,
  TYPE_FLOW_AMBIGUOUS: true,
  SOURCE_PATH_MISSING: true,
  FUNCTION_NOT_FOUND: true,
  ACCUMULATOR_NOT_FOUND: true,
  NO_ROW_LITERAL: true,
  TOP_LEVEL_NOT_ARRAY: true,
  ITEM_KEYS_MISMATCH: true,
  ROUTE_NOT_FOUND: true,
  ROUTE_BINDING_MISMATCH: true,
  BUILDER_PUSH_NOT_FOUND: true,
  EXTRACTION_UNSUPPORTED: true,
  TYPE_FLOW_CONTRACT_MISMATCH: true,
  CONTRACT_MISMATCH: true,
};

const DERIVATION_FAILURE_MEMBERS: ReadonlySet<string> = new Set(Object.keys(DERIVATION_FAILURE_MEMBER_TABLE));

/**
 * Map one derivation-failure string to the unified vocabulary. Known members
 * go through the fixed table adapter; unknown runtime strings fail closed to
 * category UNSUPPORTED through the guarded constructor (never silently
 * relabeled as a known member, never success-looking).
 */
function unifiedForDerivationFailure(failure: string, targetId: string): UnifiedContractResult {
  if (DERIVATION_FAILURE_MEMBERS.has(failure)) {
    return unifiedFromDerivationFailure(failure as RealSourceDerivationFailure, { targetId });
  }
  return buildUnifiedContractResult({
    category: 'UNSUPPORTED',
    sourceVocabulary: 'derivation-failure',
    sourceValue: failure,
    targetId,
  });
}

/**
 * Privacy gate over every free-text surface this module emits or attaches.
 * Throws RESOLUTION_PRIVACY_SENTINEL_REJECTED:<field> on a sentinel trip.
 */
function screenText(field: string, value: string): string {
  if (containsAnySentinel(value)) {
    throw new Error(`RESOLUTION_PRIVACY_SENTINEL_REJECTED:${field}`);
  }
  return value;
}

/**
 * Categorical floor for resolutions with NO aggregatable family result
 * (unknown/unapproved targets, ambiguous selection, no active family, and
 * probe-only/no-expectation targets). Aggregating zero results is illegal by
 * contract, so these cases construct the overall directly: the drift-class
 * vocabulary's NO_APPROVED_TARGET member is the sanctioned "nothing was
 * evaluated" marker and lands in the NOT_APPLICABLE floor category.
 */
function emptyOverall(targetId: string): UnifiedContractResult {
  return unifiedFromDriftClass('NO_APPROVED_TARGET', { targetId });
}

// ---------------------------------------------------------------------------
// Composition entry point.
// ---------------------------------------------------------------------------

export function resolveSourceContract(params: {
  targetId: string;
  reader: RealSourceReader;
  currentness: RealSourceCurrentness;
  snapshot: { repoId: string; sha: string } | null;
  previousEvidenceDigestByFamilyId?: Readonly<Record<string, string>>;
  analyzerProbe?: { status: string; evidenceDigest: string } | null;
}): ComposedSourceContractResolution {
  const { targetId, reader, currentness } = params;
  const snapshot = params.snapshot;

  // Input validation before any evaluation (fail fast, fail closed).
  if (snapshot !== null && !isSourceSha(snapshot.sha)) {
    throw new Error('RESOLUTION_INVALID_SNAPSHOT_SHA');
  }
  const previousByFamilyId = params.previousEvidenceDigestByFamilyId ?? null;
  const analyzerProbe = params.analyzerProbe ?? null;
  // The probe status is caller-supplied free text that travels into the
  // attached drift classification; screen it like any other detail surface.
  if (analyzerProbe !== null) screenText('analyzerProbe.status', analyzerProbe.status);

  // Step 1+2 — registry lookup and terminal selection. An unapproved target
  // has neither families nor a terminal selection, so both lookups agree.
  const registryFamilies = listContractFamiliesForTarget(targetId);
  const terminalOutcome = terminalContractFamilyForTarget(targetId);

  if (registryFamilies.length === 0 || !terminalOutcome.ok) {
    let kind: ComposedResolutionKind;
    if (!terminalOutcome.ok && terminalOutcome.reason === 'AMBIGUOUS_TARGET_SELECTION') {
      kind = 'AMBIGUOUS_TARGET_SELECTION';
    } else if (!terminalOutcome.ok && terminalOutcome.reason === 'NO_ACTIVE_FAMILY') {
      kind = 'NO_EXPECTATION';
    } else {
      kind = 'UNKNOWN_TARGET';
    }
    return {
      resolutionVersion: SOURCE_CONTRACT_RESOLUTION_VERSION,
      targetId,
      kind,
      families: [],
      drift: null,
      overall: emptyOverall(targetId),
    };
  }
  const terminalFamily = terminalOutcome.family;

  // Step 3 — evaluate ACTIVE EXPECTATION families only (registry order).
  // MECHANICAL_PROBE and ARCHIVED_HISTORICAL_SHAPE families are skipped.
  const recipe = getRealSourceRecipe(targetId);
  const records: FamilyResolutionRecord[] = [];

  for (const family of registryFamilies) {
    if (family.kind === 'MECHANICAL_PROBE' || family.kind === 'ARCHIVED_HISTORICAL_SHAPE') continue;

    if (recipe === null || snapshot === null) {
      // No admitted recipe for an expectation family, or no snapshot to
      // derive against: derivation is skipped, currentness is UNAVAILABLE.
      records.push({
        familyId: family.familyId,
        kind: family.kind,
        unified: unifiedFromDerivationFailure('SOURCE_UNAVAILABLE', { targetId }),
        currentnessClass: 'UNAVAILABLE',
        evidenceDigest: null,
        derivationVersion: family.derivationVersion,
      });
      continue;
    }

    const derivation = deriveRealSourceExpectation(recipe, snapshot.sha, reader);
    if (!derivation.ok) {
      records.push({
        familyId: family.familyId,
        kind: family.kind,
        unified: unifiedForDerivationFailure(derivation.failure, targetId),
        currentnessClass: 'NOT_APPLICABLE',
        evidenceDigest: null,
        derivationVersion: family.derivationVersion,
      });
      continue;
    }

    // COLLECTION-terminal chains additionally require the collection-wide
    // transform to admit the derived positional expectation.
    let finalExpectation = derivation.derived.expectation;
    if (terminalFamily.kind === 'COLLECTION') {
      const collection = deriveCollectionWideRealSourceExpectation({
        recipe,
        historical: derivation.derived,
      });
      if (!collection.ok) {
        records.push({
          familyId: family.familyId,
          kind: family.kind,
          unified: unifiedFromCollectionAdmissionFailure(collection.failure, { targetId }),
          currentnessClass: 'NOT_APPLICABLE',
          evidenceDigest: derivation.derived.evidenceDigest,
          derivationVersion: family.derivationVersion,
        });
        continue;
      }
      finalExpectation = collection.derived.expectation;
    }

    // Currentness gate over the finally-used derived expectation.
    const resolution = createRealSourceResolver({
      recipes: [recipe],
      expectations: [finalExpectation],
      reader,
      currentness,
    }).resolve({ targetId });

    let currentnessClass: FamilyCurrentnessClass;
    switch (resolution.kind) {
      case 'RESOLVED':
        currentnessClass = 'CURRENT';
        break;
      case 'SOURCE_STALE':
        currentnessClass = 'STALE';
        break;
      case 'SOURCE_UNAVAILABLE':
        currentnessClass = 'UNAVAILABLE';
        break;
      case 'NO_EXPECTATION':
        currentnessClass = 'NOT_APPLICABLE';
        break;
    }
    records.push({
      familyId: family.familyId,
      kind: family.kind,
      unified: unifiedFromRealSourceResolution(resolution, { targetId }),
      currentnessClass,
      evidenceDigest: finalExpectation.sourceProvenance.evidenceDigest ?? null,
      derivationVersion: family.derivationVersion,
    });
  }

  // Step 4+5 — mixed-currentness guard, then kind/agreed mapping.
  const composed = evaluateComposedCurrentness(records.map((record) => record.currentnessClass));
  let kind: ComposedResolutionKind;
  let overall: UnifiedContractResult;
  let drift: ContractDriftClassification | null = null;
  let detail: string | undefined;

  if (!composed.ok && composed.reason === 'MIXED_CURRENTNESS') {
    // Fail closed: disagreeing family currentness must never look current.
    kind = 'MIXED_CURRENTNESS_BLOCKED';
    overall = buildUnifiedContractResult({
      category: 'STALE',
      sourceVocabulary: 'real-source-resolution',
      sourceValue: 'SOURCE_STALE',
      targetId,
    });
    detail = screenText('detail', 'mixed-currentness-fail-closed');
  } else {
    if (!composed.ok) {
      kind = 'NO_EXPECTATION'; // EMPTY: no evaluable expectation family this run.
    } else {
      switch (composed.agreed) {
        case 'CURRENT':
          kind = 'RESOLVED_CURRENT';
          break;
        case 'STALE':
          kind = 'STALE';
          break;
        case 'UNAVAILABLE':
          kind = 'SOURCE_UNAVAILABLE';
          break;
        case 'NOT_APPLICABLE':
          kind = 'NO_EXPECTATION'; // Unreachable via evaluateComposedCurrentness; kept total.
          break;
      }
    }

    // Step 6 — drift, only for a current/stale composed outcome and only when
    // the caller supplied comparison input for the terminal family.
    if (kind === 'RESOLVED_CURRENT' || kind === 'STALE') {
      const terminalRecord = records.find((record) => record.familyId === terminalFamily.familyId) ?? null;
      const currentDigest = terminalRecord?.evidenceDigest ?? null;
      const previousDigest =
        previousByFamilyId !== null && Object.prototype.hasOwnProperty.call(previousByFamilyId, terminalFamily.familyId)
          ? previousByFamilyId[terminalFamily.familyId]
          : undefined;
      if ((analyzerProbe !== null || previousDigest !== undefined) && currentDigest !== null) {
        drift = driftFromProbes({
          targetId,
          prevProbe: previousDigest !== undefined ? { status: 'PROVEN', evidenceDigest: previousDigest } : null,
          currProbe: analyzerProbe ?? { status: 'PROVEN', evidenceDigest: currentDigest },
          sourceAvailable: snapshot !== null,
          sourceStale: kind === 'STALE',
        });
      }
    }

    // Step 7 — overall aggregation. All-NOT_APPLICABLE records still
    // aggregate (to the NOT_APPLICABLE floor); only a truly record-less
    // evaluation (probe-only target) needs the categorical floor constructor,
    // because aggregating zero results is illegal by contract.
    const inputs: UnifiedContractResult[] = records.map((record) => record.unified);
    if (drift !== null) inputs.push(unifiedFromDriftClass(drift.driftClass, { targetId }));
    overall = inputs.length > 0 ? aggregateUnifiedContractResults(inputs) : emptyOverall(targetId);
  }

  return {
    resolutionVersion: SOURCE_CONTRACT_RESOLUTION_VERSION,
    targetId,
    kind,
    families: records,
    drift,
    overall,
    ...(detail !== undefined ? { detail } : {}),
  };
}
