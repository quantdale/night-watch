// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 — local readiness summarizer (pure core).
//
// `summarizeLocalReadiness` is a pure function over explicit inputs: callers
// supply what to summarize, so this module stays deterministic and testable.
// Both renderers (`renderLocalReadinessJson`, `renderLocalReadinessText`)
// derive from the ONE summary model — never duplicated logic.
//
// Category resolution is deterministic, fail-closed, and TABLE-DRIVEN (most
// severe first; see CATEGORY_DERIVATION_TABLE):
//   NOT_APPLICABLE            caller marked the surface not applicable
//   BLOCKED_AUTHORITY         AUTHORITY blocker or owner-scope marker drift
//   BLOCKED_SOURCE            SOURCE blocker, structural contract gap,
//                             stale/unavailable currentness
//   BLOCKED_VERSION           VERSION blocker, version drift, or an
//                             INCOMPATIBLE checkpoint
//   BLOCKED_ANALYZER          ANALYZER blocker, analyzer UNAVAILABLE, or
//                             observed analyzer-version drift
//   BLOCKED_EXTERNAL_CI       EXTERNAL_CI blocker or a table-classified
//                             EXECUTED_FAIL / EXTERNALLY_BLOCKED CI state
//   READY_LOCAL_SYNTHETIC     none of the above
//
// Additive sections default to honest unknowns so callers that do not supply
// them see unchanged categories: absent analyzer input is NOT_EVALUATED /
// unmeasured, absent verification dimensions are NOT_MEASURED. Deferred
// verification never blocks and NEVER fabricates PASS/FAIL.
//
// Hardening: no fs, no network, no child processes, no environment access, no
// persistence, no timestamps. Blocker details are privacy-screened and fail
// closed on token-like free text.
// ---------------------------------------------------------------------------

import {
  MECHANICAL_ANALYZER_VERSION,
} from '../../oracles/expectations/extract/analyzer';
import {
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
  FROZEN_OWNER_OPERATIONS,
} from '../policy/ownerScope';
import {
  LOCAL_READINESS_ANALYZER_AVAILABILITY_VALUES,
  LOCAL_READINESS_BLOCKER_KINDS,
  LOCAL_READINESS_BLOCKER_KIND_CATEGORIES,
  LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES,
  LOCAL_READINESS_CURRENTNESS_VALUES,
  LOCAL_READINESS_DEFERRED_VERIFICATION_VALUES,
  LOCAL_READINESS_EXTERNAL_CI_CLASSIFICATION_TABLE,
  LOCAL_READINESS_EXTERNAL_CI_VALUES,
  LOCAL_READINESS_MODEL_VERSION,
  LOCAL_READINESS_VERIFICATION_DIMENSIONS,
} from './types';
import { containsForbiddenErrorDetail, safeErrorDetail } from '../campaign/runtimeValidation';
import {
  LOCAL_READINESS_AUTH_CAPABILITY_STATES,
} from './types';
import type {
  LocalReadinessAnalyzerAvailability,
  LocalReadinessAnalyzerInput,
  LocalReadinessAnalyzerSection,
  LocalReadinessAuthCapabilityEntry,
  LocalReadinessAuthCapabilityInput,
  LocalReadinessAuthCapabilitySection,
  LocalReadinessAuthValidityBand,
  LocalReadinessBlocker,
  LocalReadinessCampaignSummary,
  LocalReadinessCategory,
  LocalReadinessCheckpointCompatibility,
  LocalReadinessContractHealth,
  LocalReadinessCurrentness,
  LocalReadinessDeferredVerification,
  LocalReadinessExternalCi,
  LocalReadinessExternalCiClassification,
  LocalReadinessInput,
  LocalReadinessSummary,
  LocalReadinessTargetCoverage,
  LocalReadinessTargetCoverageEntry,
  LocalReadinessVerificationDimension,
  LocalReadinessVerificationSection,
} from './types';

/** Canonical owner-scope markers the summary compares against (fail-closed). */
export const EXPECTED_OWNER_SCOPE_STATUS: string = OWNER_SCOPE_STATUS;
export const EXPECTED_OWNER_SCOPE_REASON: string = OWNER_SCOPE_REASON;
export const EXPECTED_FROZEN_OPERATION_COUNT: number = FROZEN_OWNER_OPERATIONS.length;

const BLOCKER_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
/** Bounded categorical detail charset; anything richer fails closed. */
const BLOCKER_DETAIL_PATTERN = /^[A-Za-z0-9 ._:/()-]{0,160}$/;
/**
 * Bounded categorical charset for identity fields (target/family/kind) that
 * are carried verbatim into the summary; sentinel-bearing or free-text values
 * fail closed instead of entering the durable readiness surface.
 */
const IDENTITY_FIELD_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;
/** Substrings that must never appear in any carried detail (case-insensitive). */
const BLOCKER_DETAIL_DENYLIST = [
  'bearer',
  'token',
  'cookie',
  'password',
  'secret',
  'credential',
  'authorization',
  'api-key',
  'apikey',
  'private-key',
] as const;

function failClosed(code: string): never {
  throw new Error(code);
}

/** Identity fields are carried verbatim into summaries: bounded categorical
 *  values only, never sentinel-bearing or free-text payloads (fail-closed). */
function assertSafeIdentityField(value: string, code: string): void {
  if (!IDENTITY_FIELD_PATTERN.test(value) || containsForbiddenErrorDetail(value)) {
    failClosed(code);
  }
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function validateBlocker(blocker: LocalReadinessBlocker, index: number): void {
  if (!LOCAL_READINESS_BLOCKER_KINDS.includes(blocker.kind)) {
    failClosed(`READINESS_INVALID_BLOCKER:kind:${index}:${safeErrorDetail(blocker.kind)}`);
  }
  if (typeof blocker.code !== 'string' || !BLOCKER_CODE_PATTERN.test(blocker.code)) {
    failClosed(`READINESS_INVALID_BLOCKER:code:${index}`);
  }
  if (blocker.detail === undefined) return;
  if (typeof blocker.detail !== 'string' || !BLOCKER_DETAIL_PATTERN.test(blocker.detail)) {
    failClosed(`READINESS_PRIVACY_BLOCKED:blocker-detail:${index}`);
  }
  const lowered = blocker.detail.toLowerCase();
  for (const forbidden of BLOCKER_DETAIL_DENYLIST) {
    if (lowered.includes(forbidden)) {
      failClosed(`READINESS_PRIVACY_BLOCKED:blocker-detail:${index}`);
    }
  }
}

function normalizeBlockers(blockers: readonly LocalReadinessBlocker[]): LocalReadinessBlocker[] {
  blockers.forEach(validateBlocker);
  const kindOrder = new Map<string, number>(
    LOCAL_READINESS_BLOCKER_KINDS.map((kind, index) => [kind, index]),
  );
  return [...blockers].sort((a, b) => {
    const kindDelta =
      (kindOrder.get(a.kind) ?? Number.MAX_SAFE_INTEGER) -
      (kindOrder.get(b.kind) ?? Number.MAX_SAFE_INTEGER);
    if (kindDelta !== 0) return kindDelta;
    return compareStrings(a.code, b.code);
  });
}

function summarizeSourceContracts(input: LocalReadinessInput): {
  health: LocalReadinessContractHealth;
  sourceBlocked: boolean;
} {
  const { approvedTargetIds, families, currentnessByTargetId } = input.sourceContracts;

  if (approvedTargetIds.length === 0) {
    failClosed('READINESS_INVALID_TARGETS:empty');
  }
  const seenTargets = new Set<string>();
  for (const targetId of approvedTargetIds) {
    if (targetId === '') failClosed('READINESS_INVALID_TARGETS:empty-id');
    assertSafeIdentityField(targetId, 'READINESS_PRIVACY_BLOCKED:target-id');
    if (seenTargets.has(targetId)) failClosed(`READINESS_INVALID_TARGETS:duplicate-target:${safeErrorDetail(targetId)}`);
    seenTargets.add(targetId);
  }

  const seenFamilyIds = new Set<string>();
  for (const [index, family] of families.entries()) {
    if (family.familyId === '' || family.targetId === '') {
      failClosed(`READINESS_INVALID_FAMILIES:empty-identity:${index}`);
    }
    assertSafeIdentityField(family.familyId, `READINESS_PRIVACY_BLOCKED:family-identity:${index}`);
    assertSafeIdentityField(family.targetId, `READINESS_PRIVACY_BLOCKED:family-identity:${index}`);
    assertSafeIdentityField(family.kind, `READINESS_PRIVACY_BLOCKED:family-kind:${index}`);
    if (seenFamilyIds.has(family.familyId)) {
      failClosed(`READINESS_INVALID_FAMILIES:duplicate-family-id:${safeErrorDetail(family.familyId)}`);
    }
    seenFamilyIds.add(family.familyId);
  }

  for (const [targetId, currentness] of Object.entries(currentnessByTargetId)) {
    assertSafeIdentityField(targetId, 'READINESS_PRIVACY_BLOCKED:currentness-target');
    if (!LOCAL_READINESS_CURRENTNESS_VALUES.includes(currentness)) {
      failClosed(`READINESS_INVALID_CURRENTNESS:${safeErrorDetail(targetId)}`);
    }
  }

  const familiesByKind: Record<string, number> = {};
  let activeFamilies = 0;
  let archivedFamilies = 0;
  let campaignEligibleExpectationFamilies = 0;
  const activeByTarget = new Map<string, number>();
  const unknownTargets: string[] = [];
  for (const family of families) {
    familiesByKind[family.kind] = (familiesByKind[family.kind] ?? 0) + 1;
    if (family.historicalImmutable) {
      archivedFamilies += 1;
      continue;
    }
    activeFamilies += 1;
    activeByTarget.set(family.targetId, (activeByTarget.get(family.targetId) ?? 0) + 1);
    if (family.campaignEligible && family.hasExpectationId) {
      campaignEligibleExpectationFamilies += 1;
    }
    if (!seenTargets.has(family.targetId)) unknownTargets.push(family.targetId);
  }

  const targetsMissingActiveFamily = sortedUnique(
    approvedTargetIds.filter((targetId) => !activeByTarget.has(targetId)),
  );

  const currentnessCounts: Record<LocalReadinessCurrentness, number> = {
    CURRENT: 0,
    STALE: 0,
    SOURCE_UNAVAILABLE: 0,
    NOT_EVALUATED: 0,
  };
  const staleTargets: string[] = [];
  const unavailableTargets: string[] = [];
  const unevaluatedTargets: string[] = [];
  for (const targetId of approvedTargetIds) {
    const currentness = currentnessByTargetId[targetId] ?? 'NOT_EVALUATED';
    currentnessCounts[currentness] += 1;
    if (currentness === 'STALE') staleTargets.push(targetId);
    else if (currentness === 'SOURCE_UNAVAILABLE') unavailableTargets.push(targetId);
    else if (currentness === 'NOT_EVALUATED') unevaluatedTargets.push(targetId);
  }

  const health = {
    totalFamilies: families.length,
    activeFamilies,
    archivedFamilies,
    familiesByKind,
    approvedTargets: approvedTargetIds.length,
    targetsWithActiveFamily: approvedTargetIds.length - targetsMissingActiveFamily.length,
    targetsMissingActiveFamily,
    unknownFamilyTargets: sortedUnique(unknownTargets),
    campaignEligibleExpectationFamilies,
    currentnessCounts,
    currentnessUnevaluatedTargets: sortedUnique(unevaluatedTargets),
    staleTargets: [...staleTargets].sort(compareStrings),
    unavailableTargets: [...unavailableTargets].sort(compareStrings),
  };

  const sourceBlocked =
    targetsMissingActiveFamily.length > 0 ||
    unknownTargets.length > 0 ||
    staleTargets.length > 0 ||
    unavailableTargets.length > 0;

  return { health, sourceBlocked };
}

function summarizeCampaign(input: LocalReadinessInput): {
  campaign: LocalReadinessCampaignSummary;
  versionBlocked: boolean;
} {
  const { pinnedVersions, observedVersions } = input.campaign;
  for (const [key, value] of Object.entries(pinnedVersions)) {
    if (key === '' || typeof value !== 'string' || value === '') {
      failClosed(`READINESS_INVALID_VERSIONS:${key === '' ? '<empty-key>' : safeErrorDetail(key)}`);
    }
  }

  if (observedVersions === null) {
    return {
      campaign: { category: 'UNMEASURED', comparedKeys: [], driftKeys: [], unmeasured: true },
      versionBlocked: false,
    };
  }

  const comparedKeys = sortedUnique(
    Object.keys(pinnedVersions).filter((key) => Object.prototype.hasOwnProperty.call(observedVersions, key)),
  );
  const driftKeys = comparedKeys.filter((key) => pinnedVersions[key] !== observedVersions[key]);
  return {
    campaign: {
      category: driftKeys.length > 0 ? 'DRIFT_DETECTED' : 'PINNED_CONSISTENT',
      comparedKeys,
      driftKeys,
      unmeasured: false,
    },
    versionBlocked: driftKeys.length > 0,
  };
}

function ownerScopeMatchesMarkers(input: LocalReadinessInput): boolean {
  return (
    input.ownerScope.status === EXPECTED_OWNER_SCOPE_STATUS &&
    input.ownerScope.reason === EXPECTED_OWNER_SCOPE_REASON &&
    input.ownerScope.frozenOperationCount === EXPECTED_FROZEN_OPERATION_COUNT
  );
}

/**
 * Table-derived external-CI classification. Unknown values fail closed with
 * READINESS_INVALID_EXTERNAL_CI (same code as direct vocabulary validation —
 * the table is exhaustive over that vocabulary).
 */
export function classifyExternalCi(externalCi: LocalReadinessExternalCi): {
  classification: LocalReadinessExternalCiClassification;
  blocksCategory: boolean;
} {
  const row = LOCAL_READINESS_EXTERNAL_CI_CLASSIFICATION_TABLE.find((rule) => rule.ci === externalCi);
  if (row === undefined) failClosed(`READINESS_INVALID_EXTERNAL_CI:${safeErrorDetail(externalCi)}`);
  return { classification: row.classification, blocksCategory: row.blocksCategory };
}

function summarizeAnalyzer(input: LocalReadinessInput): {
  section: LocalReadinessAnalyzerSection;
  analyzerBlocked: boolean;
} {
  // Absent input = honest NOT_EVALUATED unknowns; never a fabricated match.
  const raw: LocalReadinessAnalyzerInput = input.analyzer ?? { observedVersion: null };
  if (
    raw.availability !== undefined &&
    !LOCAL_READINESS_ANALYZER_AVAILABILITY_VALUES.includes(raw.availability)
  ) {
    failClosed(`READINESS_INVALID_ANALYZER:availability:${safeErrorDetail(raw.availability)}`);
  }
  const availability: LocalReadinessAnalyzerAvailability = raw.availability ?? 'NOT_EVALUATED';
  let versionConsistent: boolean | null = null;
  if (raw.observedVersion !== null) {
    if (typeof raw.observedVersion !== 'string' || raw.observedVersion === '') {
      failClosed('READINESS_INVALID_ANALYZER:observed-version');
    }
    assertSafeIdentityField(raw.observedVersion, 'READINESS_PRIVACY_BLOCKED:analyzer-version');
    versionConsistent = raw.observedVersion === MECHANICAL_ANALYZER_VERSION;
  }
  const blocked = availability === 'UNAVAILABLE' || versionConsistent === false;
  return {
    section: {
      pinnedVersion: MECHANICAL_ANALYZER_VERSION,
      observedVersion: raw.observedVersion,
      availability,
      versionConsistent,
      blocked,
    },
    analyzerBlocked: blocked,
  };
}

function verificationStateFor(
  states: Partial<Record<LocalReadinessVerificationDimension, LocalReadinessDeferredVerification>>,
  dimension: LocalReadinessVerificationDimension,
): LocalReadinessDeferredVerification {
  return states[dimension] ?? 'NOT_MEASURED';
}

function summarizeVerification(input: LocalReadinessInput): LocalReadinessVerificationSection {
  const rawStates: Partial<Record<LocalReadinessVerificationDimension, LocalReadinessDeferredVerification>> =
    input.verification?.statesByDimension ?? {};
  for (const [dimension, state] of Object.entries(rawStates)) {
    if (!LOCAL_READINESS_VERIFICATION_DIMENSIONS.includes(dimension as LocalReadinessVerificationDimension)) {
      failClosed(`READINESS_INVALID_VERIFICATION:dimension:${safeErrorDetail(dimension)}`);
    }
    if (state !== undefined && !LOCAL_READINESS_DEFERRED_VERIFICATION_VALUES.includes(state)) {
      failClosed(`READINESS_INVALID_VERIFICATION:state:${safeErrorDetail(dimension)}`);
    }
  }
  const statesByDimension: Record<LocalReadinessVerificationDimension, LocalReadinessDeferredVerification> = {
    TESTING: verificationStateFor(rawStates, 'TESTING'),
    TYPECHECK: verificationStateFor(rawStates, 'TYPECHECK'),
    HARDENING: verificationStateFor(rawStates, 'HARDENING'),
  };
  const deferredDimensions = LOCAL_READINESS_VERIFICATION_DIMENSIONS.filter(
    (dimension) => statesByDimension[dimension] === 'DEFERRED_TO_HARDENING',
  );
  const notMeasuredDimensions = LOCAL_READINESS_VERIFICATION_DIMENSIONS.filter(
    (dimension) => statesByDimension[dimension] === 'NOT_MEASURED',
  );
  return {
    statesByDimension,
    deferredDimensions,
    notMeasuredDimensions,
    allDeferredToHardening: deferredDimensions.length === LOCAL_READINESS_VERIFICATION_DIMENSIONS.length,
  };
}

const AUTH_ENVIRONMENT_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

function authEpistemicClass(state: LocalReadinessAuthCapabilityEntry['state']): LocalReadinessAuthCapabilityEntry['epistemicClass'] {
  return state === 'UNKNOWN_AGE' || state === 'UNREADABLE' || state === 'NOT_EVALUATED' ? 'UNKNOWN' : 'FACT';
}

function authValidityBand(remainingValidityMs: number | null): LocalReadinessAuthValidityBand {
  if (remainingValidityMs === null) return 'UNKNOWN';
  if (remainingValidityMs <= 0) return 'NONE';
  if (remainingValidityMs < 1 * 60 * 60 * 1000) return 'UNDER_1H';
  if (remainingValidityMs < 6 * 60 * 60 * 1000) return 'UNDER_6H';
  if (remainingValidityMs < 12 * 60 * 60 * 1000) return 'UNDER_12H';
  return 'AT_LEAST_12H';
}

function isoOrNull(value: string | null | undefined, code: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) failClosed(code);
  return value;
}

/**
 * Normalize the authenticated-capability facts into the summary section.
 * Contradictions fail closed: a VALID entry cannot carry a refusal code, and a
 * refusal state cannot deny that the artefact is present.
 */
function summarizeAuthCapability(input: LocalReadinessAuthCapabilityInput | undefined): LocalReadinessAuthCapabilitySection {
  const rawEntries = input?.entries ?? [];
  const seen = new Set<string>();
  const entries: LocalReadinessAuthCapabilityEntry[] = [];
  for (const [index, entry] of rawEntries.entries()) {
    if (!AUTH_ENVIRONMENT_PATTERN.test(entry.environment) || containsForbiddenErrorDetail(entry.environment)) {
      failClosed(`READINESS_PRIVACY_BLOCKED:auth-environment:${index}`);
    }
    if (seen.has(entry.environment)) failClosed(`READINESS_INVALID_AUTH:duplicate-environment:${safeErrorDetail(entry.environment)}`);
    seen.add(entry.environment);
    if (!LOCAL_READINESS_AUTH_CAPABILITY_STATES.includes(entry.state)) {
      failClosed(`READINESS_INVALID_AUTH:state:${safeErrorDetail(entry.environment)}`);
    }
    const absenceStates = entry.state === 'MISSING' || entry.state === 'NOT_EVALUATED';
    if (entry.present === absenceStates) {
      failClosed(`READINESS_INVALID_AUTH:presence:${safeErrorDetail(entry.environment)}`);
    }
    const refusalCode = entry.refusalCode ?? null;
    if (refusalCode !== null && (typeof refusalCode !== 'string' || !BLOCKER_CODE_PATTERN.test(refusalCode))) {
      failClosed(`READINESS_INVALID_AUTH:refusal-code:${safeErrorDetail(entry.environment)}`);
    }
    if ((entry.state === 'VALID' || entry.state === 'NOT_EVALUATED') !== (refusalCode === null)) {
      failClosed(`READINESS_INVALID_AUTH:refusal-contradiction:${safeErrorDetail(entry.environment)}`);
    }
    const remainingValidityMs = entry.remainingValidityMs ?? null;
    if (remainingValidityMs !== null && (!Number.isFinite(remainingValidityMs) || remainingValidityMs < 0)) {
      failClosed(`READINESS_INVALID_AUTH:remaining:${safeErrorDetail(entry.environment)}`);
    }
    const blockedLanes = sortedUnique(entry.blockedLanes ?? []);
    if (blockedLanes.length > 24) failClosed(`READINESS_INVALID_AUTH:blocked-lanes:${safeErrorDetail(entry.environment)}`);
    for (const lane of blockedLanes) {
      if (!IDENTITY_FIELD_PATTERN.test(lane) || containsForbiddenErrorDetail(lane)) {
        failClosed(`READINESS_PRIVACY_BLOCKED:auth-blocked-lane:${safeErrorDetail(entry.environment)}`);
      }
    }
    entries.push(Object.freeze({
      environment: entry.environment,
      present: entry.present,
      state: entry.state,
      epistemicClass: authEpistemicClass(entry.state),
      captureInstant: isoOrNull(entry.captureInstant, `READINESS_INVALID_AUTH:capture-instant:${safeErrorDetail(entry.environment)}`),
      declaredValidUntil: isoOrNull(entry.declaredValidUntil, `READINESS_INVALID_AUTH:declared-until:${safeErrorDetail(entry.environment)}`),
      remainingValidityBand: authValidityBand(remainingValidityMs),
      refusalCode,
      blockedLanes: Object.freeze(blockedLanes),
    }));
  }
  entries.sort((left, right) => compareStrings(left.environment, right.environment));
  const presentAndExpiredEnvironments = entries
    .filter((entry) => entry.present && entry.state === 'EXPIRED')
    .map((entry) => entry.environment);
  const aggregateState: LocalReadinessAuthCapabilitySection['aggregateState'] =
    entries.length === 0 ? 'UNKNOWN' : entries.every((entry) => entry.state === 'VALID') ? 'VALID' : 'ATTENTION';
  return Object.freeze({
    entries: Object.freeze(entries),
    presentAndExpiredEnvironments: Object.freeze(presentAndExpiredEnvironments),
    aggregateState,
  });
}

function coverageForTarget(activeCount: number, hasCampaignEligibleExpectation: boolean): LocalReadinessTargetCoverage {
  if (activeCount === 0) return 'MISSING';
  return hasCampaignEligibleExpectation ? 'COVERED' : 'PARTIAL';
}

/**
 * Ordered category derivation table (most severe first). Each blocking signal
 * owns exactly one row; the FIRST row whose signal fires wins. Blocker kinds
 * map onto categories through LOCAL_READINESS_BLOCKER_KIND_CATEGORIES, keeping
 * kind->category semantics table-driven and documented in one place.
 */
interface CategoryDerivationContext {
  readonly authorityBlocked: boolean;
  readonly sourceBlocked: boolean;
  readonly versionBlocked: boolean;
  readonly analyzerBlocked: boolean;
  readonly externalCiBlocked: boolean;
}

const CATEGORY_DERIVATION_TABLE: ReadonlyArray<{
  readonly category: Exclude<LocalReadinessCategory, 'READY_LOCAL_SYNTHETIC' | 'NOT_APPLICABLE'>;
  readonly fires: (context: CategoryDerivationContext) => boolean;
}> = Object.freeze([
  { category: 'BLOCKED_AUTHORITY', fires: (context) => context.authorityBlocked },
  { category: 'BLOCKED_SOURCE', fires: (context) => context.sourceBlocked },
  { category: 'BLOCKED_VERSION', fires: (context) => context.versionBlocked },
  { category: 'BLOCKED_ANALYZER', fires: (context) => context.analyzerBlocked },
  { category: 'BLOCKED_EXTERNAL_CI', fires: (context) => context.externalCiBlocked },
]);

/**
 * Pure summarizer over explicit inputs. Throws Error('CODE:...') on invalid
 * or privacy-unsafe inputs (fail-closed); never throws on healthy-but-unknown
 * facts (those surface as categories instead).
 */
export function summarizeLocalReadiness(input: LocalReadinessInput): LocalReadinessSummary {
  if (!LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES.includes(input.checkpointCompatibility)) {
    failClosed(`READINESS_INVALID_CHECKPOINT:${safeErrorDetail(input.checkpointCompatibility)}`);
  }
  if (!LOCAL_READINESS_EXTERNAL_CI_VALUES.includes(input.externalCi)) {
    failClosed(`READINESS_INVALID_EXTERNAL_CI:${safeErrorDetail(input.externalCi)}`);
  }
  const normalizedBlockers = normalizeBlockers(input.unresolvedBlockers);

  const { health, sourceBlocked } = summarizeSourceContracts(input);
  const { campaign, versionBlocked } = summarizeCampaign(input);
  const matchesFrozenMarkers = ownerScopeMatchesMarkers(input);
  const { section: analyzerSection, analyzerBlocked } = summarizeAnalyzer(input);
  const verification = summarizeVerification(input);
  const authCapability = summarizeAuthCapability(input.authCapability);
  const externalCiClassification = classifyExternalCi(input.externalCi);

  // Approved-target coverage entries (structural only), sorted by targetId.
  const activeCountByTarget = new Map<string, number>();
  const eligibleByTarget = new Set<string>();
  for (const family of input.sourceContracts.families) {
    if (family.historicalImmutable) continue;
    activeCountByTarget.set(family.targetId, (activeCountByTarget.get(family.targetId) ?? 0) + 1);
    if (family.campaignEligible && family.hasExpectationId) eligibleByTarget.add(family.targetId);
  }
  const approvedTargetCoverage: LocalReadinessTargetCoverageEntry[] = input.sourceContracts.approvedTargetIds
    .map((targetId) => ({
      targetId,
      coverage: coverageForTarget(activeCountByTarget.get(targetId) ?? 0, eligibleByTarget.has(targetId)),
      activeFamilies: activeCountByTarget.get(targetId) ?? 0,
      currentness: input.sourceContracts.currentnessByTargetId[targetId] ?? ('NOT_EVALUATED' as LocalReadinessCurrentness),
    }))
    .sort((a, b) => compareStrings(a.targetId, b.targetId));

  // Table-driven derivation context. CI blocking comes from the
  // classification table (EXECUTED_FAIL / EXTERNALLY_BLOCKED block;
  // UNMEASURED_UNKNOWN never does).
  const context: CategoryDerivationContext = {
    authorityBlocked:
      !matchesFrozenMarkers ||
      normalizedBlockers.some(
        (blocker) => LOCAL_READINESS_BLOCKER_KIND_CATEGORIES[blocker.kind] === 'BLOCKED_AUTHORITY',
      ),
    sourceBlocked:
      sourceBlocked ||
      normalizedBlockers.some(
        (blocker) => LOCAL_READINESS_BLOCKER_KIND_CATEGORIES[blocker.kind] === 'BLOCKED_SOURCE',
      ),
    versionBlocked:
      versionBlocked ||
      input.checkpointCompatibility === 'INCOMPATIBLE' ||
      normalizedBlockers.some(
        (blocker) => LOCAL_READINESS_BLOCKER_KIND_CATEGORIES[blocker.kind] === 'BLOCKED_VERSION',
      ),
    analyzerBlocked:
      analyzerBlocked ||
      normalizedBlockers.some(
        (blocker) => LOCAL_READINESS_BLOCKER_KIND_CATEGORIES[blocker.kind] === 'BLOCKED_ANALYZER',
      ),
    externalCiBlocked:
      externalCiClassification.blocksCategory ||
      normalizedBlockers.some(
        (blocker) => LOCAL_READINESS_BLOCKER_KIND_CATEGORIES[blocker.kind] === 'BLOCKED_EXTERNAL_CI',
      ),
  };

  let category: LocalReadinessCategory;
  if (!input.applies) {
    category = 'NOT_APPLICABLE';
  } else {
    const fired = CATEGORY_DERIVATION_TABLE.find((row) => row.fires(context));
    category = fired ? fired.category : 'READY_LOCAL_SYNTHETIC';
  }

  return Object.freeze({
    modelVersion: LOCAL_READINESS_MODEL_VERSION,
    scope: 'LOCAL_SYNTHETIC',
    readyClaim: 'LOCAL_SYNTHETIC_ONLY',
    category,
    applies: input.applies,
    sourceContracts: Object.freeze(health),
    approvedTargetCoverage: Object.freeze(approvedTargetCoverage),
    campaign: Object.freeze(campaign),
    checkpointCompatibility: input.checkpointCompatibility,
    analyzer: Object.freeze(analyzerSection),
    verification: Object.freeze(verification),
    authCapability,
    unresolvedBlockers: Object.freeze(normalizedBlockers.map((blocker) => Object.freeze({ ...blocker }))),
    externalCi: input.externalCi,
    externalCiClassification: externalCiClassification.classification,
    ownerScope: Object.freeze({
      status: input.ownerScope.status,
      reason: input.ownerScope.reason,
      frozenOperationCount: input.ownerScope.frozenOperationCount,
      matchesFrozenMarkers,
    }),
  });
}

/** Machine-readable rendering of the ONE model. */
export function renderLocalReadinessJson(summary: LocalReadinessSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

/** Concise text rendering derived ONLY from the same model. */
export function renderLocalReadinessText(summary: LocalReadinessSummary): string {
  const contracts = summary.sourceContracts;
  const lines: string[] = [
    `nightwatch local readiness ${summary.modelVersion}`,
    `category: ${summary.category}`,
    `scope: ${summary.scope} (ready claim: ${summary.readyClaim}; never DEV/production)`,
    `source-contracts: total=${contracts.totalFamilies} active=${contracts.activeFamilies} archived=${contracts.archivedFamilies}` +
      ` targets-covered=${contractsWithActiveFamily(contracts)}/${contracts.approvedTargets}` +
      ` campaign-eligible-expectations=${contracts.campaignEligibleExpectationFamilies}`,
    `currentness: current=${contracts.currentnessCounts.CURRENT} stale=${contracts.currentnessCounts.STALE}` +
      ` unavailable=${contracts.currentnessCounts.SOURCE_UNAVAILABLE} unevaluated=${contracts.currentnessCounts.NOT_EVALUATED}`,
    `coverage: ${renderCoverageCounts(summary)}`,
    `campaign: ${summary.campaign.category} compared=${summary.campaign.comparedKeys.length} drift=${summary.campaign.driftKeys.length} unmeasured=${summary.campaign.unmeasured}`,
    `checkpoint: ${summary.checkpointCompatibility}`,
    `analyzer: pinned=${summary.analyzer.pinnedVersion} observed=${summary.analyzer.observedVersion ?? 'null'}` +
      ` availability=${summary.analyzer.availability} consistent=${renderVersionConsistency(summary.analyzer.versionConsistent)}`,
    `verification: ${renderVerificationStates(summary)} deferred=${summary.verification.deferredDimensions.length}` +
      ` not-measured=${summary.verification.notMeasuredDimensions.length}`,
    `external-ci: ${summary.externalCi} (classification=${summary.externalCiClassification})`,
    `authenticated-capability: ${summary.authCapability.aggregateState} entries=${summary.authCapability.entries.length}` +
      ` present-and-expired=${summary.authCapability.presentAndExpiredEnvironments.length === 0 ? 'none' : summary.authCapability.presentAndExpiredEnvironments.join(',')}`,
    `owner-scope: ${summary.ownerScope.status} / ${summary.ownerScope.reason} (frozen=${summary.ownerScope.frozenOperationCount} markers-match=${summary.ownerScope.matchesFrozenMarkers})`,
    `blockers: ${summary.unresolvedBlockers.length}`,
  ];
  for (const entry of summary.authCapability.entries) {
    lines.push(`  - auth ${entry.environment} ${entry.state} present=${entry.present} band=${entry.remainingValidityBand} epistemic=${entry.epistemicClass}`);
  }
  for (const blocker of summary.unresolvedBlockers) {
    lines.push(`  - ${blocker.kind} ${blocker.code}${blocker.detail === undefined ? '' : ` (${blocker.detail})`}`);
  }
  return `${lines.join('\n')}\n`;
}

type ContractHealth = LocalReadinessSummary['sourceContracts'];

function contractsWithActiveFamily(contracts: ContractHealth): number {
  return contracts.approvedTargets - contracts.targetsMissingActiveFamily.length;
}

function renderCoverageCounts(summary: LocalReadinessSummary): string {
  const counts: Record<LocalReadinessTargetCoverage, number> = { COVERED: 0, PARTIAL: 0, MISSING: 0 };
  for (const entry of summary.approvedTargetCoverage) counts[entry.coverage] += 1;
  return `covered=${counts.COVERED} partial=${counts.PARTIAL} missing=${counts.MISSING}`;
}

/** null stays explicitly "unmeasured" — never rendered as a pass/fail verdict. */
function renderVersionConsistency(consistent: boolean | null): string {
  if (consistent === null) return 'unmeasured';
  return consistent ? 'true' : 'false';
}

function renderVerificationStates(summary: LocalReadinessSummary): string {
  return LOCAL_READINESS_VERIFICATION_DIMENSIONS.map((dimension) => {
    const state = summary.verification.statesByDimension[dimension] ?? 'NOT_MEASURED';
    return `${dimension}=${state}`;
  }).join(' ');
}
