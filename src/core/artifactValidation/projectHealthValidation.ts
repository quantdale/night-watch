// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11 round 2) — strict validator for the durable
// project-health-report artifact: readiness/localReadiness.LocalReadinessSummary
// as produced by summarizeLocalReadiness.
//
// COMPOSITION, NOT FORKING — everything versioned or categorical is reused
// verbatim from the owning module:
// - model identity: LOCAL_READINESS_MODEL_VERSION;
// - vocabularies: LOCAL_READINESS_CURRENTNESS_VALUES,
//   LOCAL_READINESS_EXTERNAL_CI_VALUES,
//   LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES,
//   LOCAL_READINESS_BLOCKER_KINDS;
// - frozen owner-scope markers: EXPECTED_OWNER_SCOPE_STATUS /
//   EXPECTED_OWNER_SCOPE_REASON / EXPECTED_FROZEN_OPERATION_COUNT, used to
//   RECOMPUTE `ownerScope.matchesFrozenMarkers` exactly as
//   ownerScopeMatchesMarkers does;
// - blocker privacy screening composes the shared
//   campaign/runtimeValidation.containsForbiddenErrorDetail on top of the
//   code/detail patterns documented in readiness/types.ts.
//
// Every cross-field rule below is a mechanically derivable invariant of
// summarizeLocalReadiness/summarizeSourceContracts/summarizeCampaign/
// normalizeBlockers (counts, sorted orders, partition identities, fixed scope
// markers). Category DERIVATION is deliberately NOT re-implemented here — the
// only total bidirectional rule enforced is NOT_APPLICABLE ⇔ !applies; deeper
// category coherence stays with the owning module.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import {
  LOCAL_READINESS_MODEL_VERSION,
  LOCAL_READINESS_CURRENTNESS_VALUES,
  LOCAL_READINESS_EXTERNAL_CI_VALUES,
  LOCAL_READINESS_EXTERNAL_CI_CLASSIFICATION_TABLE,
  LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES,
  LOCAL_READINESS_BLOCKER_KINDS,
  LOCAL_READINESS_ANALYZER_AVAILABILITY_VALUES,
  LOCAL_READINESS_AUTH_CAPABILITY_STATES,
  LOCAL_READINESS_AUTH_VALIDITY_BANDS,
  LOCAL_READINESS_DEFERRED_VERIFICATION_VALUES,
  LOCAL_READINESS_VERIFICATION_DIMENSIONS,
} from '../readiness/types';
import { MECHANICAL_ANALYZER_VERSION } from '../../oracles/expectations/extract/analyzer';
import {
  EXPECTED_OWNER_SCOPE_STATUS,
  EXPECTED_OWNER_SCOPE_REASON,
  EXPECTED_FROZEN_OPERATION_COUNT,
} from '../readiness/localReadiness';
import {
  assertBoolean,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  containsForbiddenErrorDetail,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
} from '../campaign/runtimeValidation';

const SUMMARY_BASE_KEYS = [
  'modelVersion', 'scope', 'readyClaim', 'category', 'applies',
  'sourceContracts', 'approvedTargetCoverage', 'campaign',
  'checkpointCompatibility', 'unresolvedBlockers', 'externalCi', 'ownerScope',
] as const;
const SUMMARY_ADDITIVE_KEYS = ['analyzer', 'verification', 'externalCiClassification'] as const;
/**
 * Optional sections are their own all-or-nothing family: an artifact written
 * before the section existed stays readable, and the section is validated
 * exactly when present. This is deliberately NOT folded into
 * SUMMARY_ADDITIVE_KEYS, which would make every historical artifact
 * incomplete.
 */
const SUMMARY_OPTIONAL_KEYS = ['authCapability'] as const;

const HEALTH_KEYS = [
  'totalFamilies', 'activeFamilies', 'archivedFamilies', 'familiesByKind',
  'approvedTargets', 'targetsWithActiveFamily', 'targetsMissingActiveFamily',
  'unknownFamilyTargets', 'campaignEligibleExpectationFamilies',
  'currentnessCounts', 'currentnessUnevaluatedTargets', 'staleTargets',
  'unavailableTargets',
] as const;

const COVERAGE_ENTRY_KEYS = ['targetId', 'coverage', 'activeFamilies', 'currentness'] as const;
const CAMPAIGN_KEYS = ['category', 'comparedKeys', 'driftKeys', 'unmeasured'] as const;
const OWNER_SCOPE_KEYS = ['status', 'reason', 'frozenOperationCount', 'matchesFrozenMarkers'] as const;
const ANALYZER_KEYS = ['pinnedVersion', 'observedVersion', 'availability', 'versionConsistent', 'blocked'] as const;
const VERIFICATION_KEYS = ['statesByDimension', 'deferredDimensions', 'notMeasuredDimensions', 'allDeferredToHardening'] as const;
const AUTH_SECTION_KEYS = ['entries', 'presentAndExpiredEnvironments', 'aggregateState'] as const;
const AUTH_ENTRY_KEYS = [
  'environment', 'present', 'state', 'epistemicClass', 'captureInstant',
  'declaredValidUntil', 'remainingValidityBand', 'refusalCode', 'blockedLanes',
] as const;
const AUTH_EPISTEMIC_CLASSES = ['FACT', 'UNKNOWN'] as const;
const AUTH_AGGREGATE_STATES = ['VALID', 'ATTENTION', 'UNKNOWN'] as const;

const CATEGORIES = ['READY_LOCAL_SYNTHETIC', 'BLOCKED_SOURCE', 'BLOCKED_VERSION', 'BLOCKED_AUTHORITY', 'BLOCKED_EXTERNAL_CI', 'NOT_APPLICABLE'] as const;
const COVERAGE_VALUES = ['COVERED', 'PARTIAL', 'MISSING'] as const;
const CAMPAIGN_CATEGORIES = ['PINNED_CONSISTENT', 'DRIFT_DETECTED', 'UNMEASURED'] as const;

// Documented in readiness/types.ts ("Categorical code, /^[A-Z][A-Z0-9_]*$/").
const BLOCKER_CODE_RE = /^[A-Z][A-Z0-9_]*$/;
// Bounded categorical detail charset (same shape as the module's private
// BLOCKER_DETAIL_PATTERN); denylist words are screened through the shared
// runtime primitive below.
const BLOCKER_DETAIL_RE = /^[A-Za-z0-9 ._:/()-]{0,160}$/;
const SCOPE_MARKER = 'LOCAL_SYNTHETIC' as const;
const READY_CLAIM_MARKER = 'LOCAL_SYNTHETIC_ONLY' as const;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_PROJECT_HEALTH_INVALID:${reason}`);
}

/** Ascending + duplicate-free under the same ordering normalizeBlockers uses. */
function assertSortedUnique(values: readonly unknown[], code: string): void {
  requireRuntimeArray(values, `ARTIFACT_PROJECT_HEALTH_INVALID:${code}`);
  let previous: string | undefined;
  for (const value of values) {
    assertString(value, `ARTIFACT_PROJECT_HEALTH_INVALID:${code}_ITEM`);
    if (previous !== undefined && !(previous < (value as string))) invalid(`${code}_ORDER`);
    previous = value as string;
  }
}

function assertExactSequence(values: readonly unknown[], expected: readonly string[], code: string): void {
  requireRuntimeArray(values, `ARTIFACT_PROJECT_HEALTH_INVALID:${code}`);
  if (values.length !== expected.length || values.some((value, index) => value !== expected[index])) invalid(`${code}_ORDER`);
}

function validateAdditiveReadinessSections(report: Record<string, unknown>): void {
  const analyzer = requireRuntimeRecord(report.analyzer, 'ARTIFACT_PROJECT_HEALTH_INVALID:ANALYZER');
  assertExactKeys(analyzer, ANALYZER_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:ANALYZER');
  assertString(analyzer.pinnedVersion, 'ARTIFACT_PROJECT_HEALTH_INVALID:ANALYZER_PINNED_VERSION');
  if (analyzer.pinnedVersion !== MECHANICAL_ANALYZER_VERSION) invalid('ANALYZER_PINNED_VERSION');
  if (analyzer.observedVersion !== null) {
    assertString(analyzer.observedVersion, 'ARTIFACT_PROJECT_HEALTH_INVALID:ANALYZER_OBSERVED_VERSION');
    if (analyzer.observedVersion.length === 0 || containsForbiddenErrorDetail(analyzer.observedVersion)) invalid('ANALYZER_OBSERVED_VERSION');
  }
  if (!(LOCAL_READINESS_ANALYZER_AVAILABILITY_VALUES as readonly string[]).includes(analyzer.availability as string)) invalid('ANALYZER_AVAILABILITY');
  if (analyzer.versionConsistent !== null && typeof analyzer.versionConsistent !== 'boolean') invalid('ANALYZER_VERSION_CONSISTENT');
  assertBoolean(analyzer.blocked, 'ARTIFACT_PROJECT_HEALTH_INVALID:ANALYZER_BLOCKED');
  const expectedVersionConsistency = analyzer.observedVersion === null ? null : analyzer.observedVersion === analyzer.pinnedVersion;
  if (analyzer.versionConsistent !== expectedVersionConsistency) invalid('ANALYZER_VERSION_COHERENCE');
  const expectedBlocked = analyzer.availability === 'UNAVAILABLE' || expectedVersionConsistency === false;
  if (analyzer.blocked !== expectedBlocked) invalid('ANALYZER_BLOCKED_COHERENCE');

  const verification = requireRuntimeRecord(report.verification, 'ARTIFACT_PROJECT_HEALTH_INVALID:VERIFICATION');
  assertExactKeys(verification, VERIFICATION_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:VERIFICATION');
  const states = requireRuntimeRecord(verification.statesByDimension, 'ARTIFACT_PROJECT_HEALTH_INVALID:VERIFICATION_STATES');
  assertExactKeys(states, LOCAL_READINESS_VERIFICATION_DIMENSIONS, 'ARTIFACT_PROJECT_HEALTH_INVALID:VERIFICATION_STATES');
  for (const dimension of LOCAL_READINESS_VERIFICATION_DIMENSIONS) {
    if (!(LOCAL_READINESS_DEFERRED_VERIFICATION_VALUES as readonly string[]).includes(states[dimension] as string)) invalid('VERIFICATION_STATE');
  }
  const deferred = verification.deferredDimensions as readonly unknown[];
  const notMeasured = verification.notMeasuredDimensions as readonly unknown[];
  assertExactSequence(deferred, LOCAL_READINESS_VERIFICATION_DIMENSIONS.filter((dimension) => states[dimension] === 'DEFERRED_TO_HARDENING'), 'VERIFICATION_DEFERRED_DIMENSIONS');
  assertExactSequence(notMeasured, LOCAL_READINESS_VERIFICATION_DIMENSIONS.filter((dimension) => states[dimension] === 'NOT_MEASURED'), 'VERIFICATION_NOT_MEASURED_DIMENSIONS');
  assertBoolean(verification.allDeferredToHardening, 'ARTIFACT_PROJECT_HEALTH_INVALID:VERIFICATION_ALL_DEFERRED');
  if (verification.allDeferredToHardening !== (deferred.length === LOCAL_READINESS_VERIFICATION_DIMENSIONS.length)) invalid('VERIFICATION_ALL_DEFERRED_COHERENCE');

  const classification = LOCAL_READINESS_EXTERNAL_CI_CLASSIFICATION_TABLE.find((row) => row.ci === report.externalCi);
  if (classification === undefined || report.externalCiClassification !== classification.classification) invalid('EXTERNAL_CI_CLASSIFICATION');
}

const AUTH_ENVIRONMENT_RE = /^[a-z][a-z0-9-]{0,31}$/;
const AUTH_BLOCKED_LANE_RE = /^[A-Za-z0-9_.:-]{1,200}$/;

/** Validate the optional authenticated-capability section exactly as produced. */
function validateAuthCapabilitySection(value: unknown): void {
  const section = requireRuntimeRecord(value, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH');
  assertExactKeys(section, AUTH_SECTION_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH');
  const entries = requireRuntimeArray(section.entries, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_ENTRIES');
  const presentAndExpired: string[] = [];
  const states: string[] = [];
  let previousEnvironment: string | undefined;
  for (const item of entries) {
    const entry = requireRuntimeRecord(item, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_ENTRY');
    assertExactKeys(entry, AUTH_ENTRY_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_ENTRY');
    assertString(entry.environment, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_ENVIRONMENT');
    const environment = entry.environment as string;
    if (!AUTH_ENVIRONMENT_RE.test(environment) || containsForbiddenErrorDetail(environment)) invalid('AUTH_ENVIRONMENT_PATTERN');
    if (previousEnvironment !== undefined && !(previousEnvironment < environment)) invalid('AUTH_ENTRIES_ORDER');
    previousEnvironment = environment;
    assertBoolean(entry.present, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_PRESENT');
    if (!(LOCAL_READINESS_AUTH_CAPABILITY_STATES as readonly string[]).includes(entry.state as string)) invalid('AUTH_STATE');
    const state = entry.state as string;
    states.push(state);
    const absenceState = state === 'MISSING' || state === 'NOT_EVALUATED';
    if (entry.present === absenceState) invalid('AUTH_PRESENCE_COHERENCE');
    const expectedEpistemic = state === 'UNKNOWN_AGE' || state === 'UNREADABLE' || state === 'NOT_EVALUATED' ? 'UNKNOWN' : 'FACT';
    if (entry.epistemicClass !== expectedEpistemic) invalid('AUTH_EPISTEMIC_COHERENCE');
    for (const instantField of ['captureInstant', 'declaredValidUntil'] as const) {
      const instant = entry[instantField];
      if (instant === null) continue;
      assertString(instant, `ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_${instantField.toUpperCase()}`);
      if (!Number.isFinite(Date.parse(instant as string))) invalid(`AUTH_${instantField.toUpperCase()}`);
    }
    if (!(LOCAL_READINESS_AUTH_VALIDITY_BANDS as readonly string[]).includes(entry.remainingValidityBand as string)) invalid('AUTH_VALIDITY_BAND');
    if (entry.refusalCode !== null) {
      assertString(entry.refusalCode, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_REFUSAL_CODE');
      if (!BLOCKER_CODE_RE.test(entry.refusalCode as string)) invalid('AUTH_REFUSAL_CODE_PATTERN');
    }
    const refusalAllowed = !(state === 'VALID' || state === 'NOT_EVALUATED');
    if (refusalAllowed !== (entry.refusalCode !== null)) invalid('AUTH_REFUSAL_COHERENCE');
    const blockedLanes = requireRuntimeArray(entry.blockedLanes, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_BLOCKED_LANES');
    assertSortedUnique(blockedLanes, 'AUTH_BLOCKED_LANES');
    if (blockedLanes.length > 24) invalid('AUTH_BLOCKED_LANES');
    for (const lane of blockedLanes) {
      if (!AUTH_BLOCKED_LANE_RE.test(lane as string) || containsForbiddenErrorDetail(lane as string)) invalid('AUTH_BLOCKED_LANE_PATTERN');
    }
    if (entry.present === true && state === 'EXPIRED') presentAndExpired.push(environment);
  }
  assertExactSequence(
    requireRuntimeArray(section.presentAndExpiredEnvironments, 'ARTIFACT_PROJECT_HEALTH_INVALID:AUTH_PRESENT_AND_EXPIRED'),
    presentAndExpired,
    'AUTH_PRESENT_AND_EXPIRED',
  );
  if (!(AUTH_AGGREGATE_STATES as readonly string[]).includes(section.aggregateState as string)) invalid('AUTH_AGGREGATE');
  const expectedAggregate = states.length === 0 ? 'UNKNOWN' : states.every((state) => state === 'VALID') ? 'VALID' : 'ATTENTION';
  if (section.aggregateState !== expectedAggregate) invalid('AUTH_AGGREGATE_COHERENCE');
}

/**
 * Strict validation of one persisted LocalReadinessSummary. Throws
 * ARTIFACT_PROJECT_HEALTH_INVALID:* on any violation.
 */
export function validateProjectHealthReportArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const report = requireRuntimeRecord(value, 'ARTIFACT_PROJECT_HEALTH_INVALID');
  assertExactKeys(report, SUMMARY_BASE_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID', [...SUMMARY_ADDITIVE_KEYS, ...SUMMARY_OPTIONAL_KEYS]);
  const additivePresence = SUMMARY_ADDITIVE_KEYS.map((key) => Object.prototype.hasOwnProperty.call(report, key));
  if (additivePresence.some((present) => present) && additivePresence.some((present) => !present)) invalid('ADDITIVE_SECTIONS_INCOMPLETE');
  if (Object.prototype.hasOwnProperty.call(report, 'authCapability')) {
    validateAuthCapabilitySection(report.authCapability);
  }

  // Fixed identity/scope markers of the ONE readiness model.
  if (report.modelVersion !== LOCAL_READINESS_MODEL_VERSION) invalid('MODEL_VERSION_UNSUPPORTED');
  if (report.scope !== SCOPE_MARKER || report.readyClaim !== READY_CLAIM_MARKER) invalid('SCOPE_MARKERS');
  if (!(CATEGORIES as readonly string[]).includes(report.category as string)) invalid('CATEGORY');
  assertBoolean(report.applies, 'ARTIFACT_PROJECT_HEALTH_INVALID:APPLIES');
  // Total bidirectional producer rule: NOT_APPLICABLE exists only when the
  // caller declared the summary not applicable (and vice versa).
  if ((report.category === 'NOT_APPLICABLE') !== (report.applies === false)) invalid('CATEGORY_APPLIES_MISMATCH');

  if (!(LOCAL_READINESS_EXTERNAL_CI_VALUES as readonly string[]).includes(report.externalCi as string)) invalid('EXTERNAL_CI');
  if (!(LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES as readonly string[]).includes(report.checkpointCompatibility as string)) invalid('CHECKPOINT_COMPATIBILITY');
  if (additivePresence.every((present) => present)) validateAdditiveReadinessSections(report);

  // --- blockers (normalized by normalizeBlockers) ---------------------------
  const blockers = requireRuntimeArray(report.unresolvedBlockers, 'ARTIFACT_PROJECT_HEALTH_INVALID:BLOCKERS');
  let previousKindIndex = -1;
  let previousCode: string | undefined;
  for (const item of blockers) {
    const blocker = requireRuntimeRecord(item, 'ARTIFACT_PROJECT_HEALTH_INVALID:BLOCKER');
    assertExactKeys(blocker, ['code', 'kind'], 'ARTIFACT_PROJECT_HEALTH_INVALID:BLOCKER', ['detail']);
    if (!(LOCAL_READINESS_BLOCKER_KINDS as readonly string[]).includes(blocker.kind as string)) invalid('BLOCKER_KIND');
    assertString(blocker.code, 'ARTIFACT_PROJECT_HEALTH_INVALID:BLOCKER_CODE');
    if (!BLOCKER_CODE_RE.test(blocker.code)) invalid('BLOCKER_CODE_PATTERN');
    if (blocker.detail !== undefined) {
      assertString(blocker.detail, 'ARTIFACT_PROJECT_HEALTH_INVALID:BLOCKER_DETAIL');
      if (!BLOCKER_DETAIL_RE.test(blocker.detail) || containsForbiddenErrorDetail(blocker.detail)) invalid('BLOCKER_DETAIL_UNSAFE');
    }
    // Sorted by kind order (module array order) then code ascending. Equal
    // adjacent codes are allowed: normalizeBlockers sorts stably but never
    // deduplicates caller-supplied blockers, so duplicates survive verbatim.
    const kindIndex = (LOCAL_READINESS_BLOCKER_KINDS as readonly string[]).indexOf(blocker.kind as string);
    if (kindIndex < previousKindIndex) invalid('BLOCKERS_ORDER');
    if (kindIndex === previousKindIndex && previousCode !== undefined && !(previousCode <= (blocker.code as string))) invalid('BLOCKERS_ORDER');
    previousKindIndex = kindIndex;
    previousCode = blocker.code as string;
  }

  // --- source-contract health ------------------------------------------------
  const health = requireRuntimeRecord(report.sourceContracts, 'ARTIFACT_PROJECT_HEALTH_INVALID:SOURCE_CONTRACTS');
  assertExactKeys(health, HEALTH_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:SOURCE_CONTRACTS');
  for (const key of ['totalFamilies', 'activeFamilies', 'archivedFamilies', 'approvedTargets', 'targetsWithActiveFamily', 'campaignEligibleExpectationFamilies'] as const) {
    assertNonNegativeInteger(health[key], `ARTIFACT_PROJECT_HEALTH_INVALID:${key.toUpperCase()}`);
  }
  if ((health.totalFamilies as number) !== (health.activeFamilies as number) + (health.archivedFamilies as number)) invalid('FAMILY_PARTITION_MISMATCH');

  const familiesByKind = requireRuntimeRecord(health.familiesByKind, 'ARTIFACT_PROJECT_HEALTH_INVALID:FAMILIES_BY_KIND');
  let kindTotal = 0;
  for (const count of Object.values(familiesByKind)) {
    assertNonNegativeInteger(count, 'ARTIFACT_PROJECT_HEALTH_INVALID:FAMILIES_BY_KIND_VALUE');
    if ((count as number) === 0) invalid('FAMILIES_BY_KIND_EMPTY_BUCKET');
    kindTotal += count as number;
  }
  if (kindTotal !== (health.totalFamilies as number)) invalid('FAMILIES_BY_KIND_SUM_MISMATCH');

  const currentnessCounts = requireRuntimeRecord(health.currentnessCounts, 'ARTIFACT_PROJECT_HEALTH_INVALID:CURRENTNESS_COUNTS');
  assertExactKeys(currentnessCounts, [...LOCAL_READINESS_CURRENTNESS_VALUES], 'ARTIFACT_PROJECT_HEALTH_INVALID:CURRENTNESS_COUNTS');
  let currentnessTotal = 0;
  for (const value of LOCAL_READINESS_CURRENTNESS_VALUES) {
    assertNonNegativeInteger(currentnessCounts[value], `ARTIFACT_PROJECT_HEALTH_INVALID:CURRENTNESS_${value}`);
    currentnessTotal += currentnessCounts[value] as number;
  }
  if (currentnessTotal !== (health.approvedTargets as number)) invalid('CURRENTNESS_SUM_MISMATCH');

  assertSortedUnique(requireRuntimeArray(health.targetsMissingActiveFamily, 'ARTIFACT_PROJECT_HEALTH_INVALID:TARGETS_MISSING_ACTIVE_FAMILY'), 'TARGETS_MISSING_ACTIVE_FAMILY');
  assertSortedUnique(requireRuntimeArray(health.unknownFamilyTargets, 'ARTIFACT_PROJECT_HEALTH_INVALID:UNKNOWN_FAMILY_TARGETS'), 'UNKNOWN_FAMILY_TARGETS');
  assertSortedUnique(requireRuntimeArray(health.currentnessUnevaluatedTargets, 'ARTIFACT_PROJECT_HEALTH_INVALID:CURRENTNESS_UNEVALUATED_TARGETS'), 'CURRENTNESS_UNEVALUATED_TARGETS');
  assertSortedUnique(requireRuntimeArray(health.staleTargets, 'ARTIFACT_PROJECT_HEALTH_INVALID:STALE_TARGETS'), 'STALE_TARGETS');
  assertSortedUnique(requireRuntimeArray(health.unavailableTargets, 'ARTIFACT_PROJECT_HEALTH_INVALID:UNAVAILABLE_TARGETS'), 'UNAVAILABLE_TARGETS');
  if ((health.staleTargets as string[]).length !== (currentnessCounts.STALE as number)) invalid('STALE_COUNT_MISMATCH');
  if ((health.unavailableTargets as string[]).length !== (currentnessCounts.SOURCE_UNAVAILABLE as number)) invalid('UNAVAILABLE_COUNT_MISMATCH');
  if ((health.currentnessUnevaluatedTargets as string[]).length !== (currentnessCounts.NOT_EVALUATED as number)) invalid('UNEVALUATED_COUNT_MISMATCH');

  // --- approved-target coverage ---------------------------------------------
  const coverage = requireRuntimeArray(report.approvedTargetCoverage, 'ARTIFACT_PROJECT_HEALTH_INVALID:COVERAGE');
  if (coverage.length !== (health.approvedTargets as number)) invalid('COVERAGE_TARGET_COUNT_MISMATCH');
  const missingFromCoverage: string[] = [];
  const coverageCurrentnessCounts: Record<string, number> = Object.fromEntries(
    LOCAL_READINESS_CURRENTNESS_VALUES.map((value) => [value, 0]),
  );
  const staleFromCoverage: string[] = [];
  const unavailableFromCoverage: string[] = [];
  const unevaluatedFromCoverage: string[] = [];
  let targetsWithActiveFamily = 0;
  let previousTargetId: string | undefined;
  for (const item of coverage) {
    const entry = requireRuntimeRecord(item, 'ARTIFACT_PROJECT_HEALTH_INVALID:COVERAGE_ENTRY');
    assertExactKeys(entry, COVERAGE_ENTRY_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:COVERAGE_ENTRY');
    assertString(entry.targetId, 'ARTIFACT_PROJECT_HEALTH_INVALID:COVERAGE_TARGET_ID');
    if (!(COVERAGE_VALUES as readonly string[]).includes(entry.coverage as string)) invalid('COVERAGE_VALUE');
    assertNonNegativeInteger(entry.activeFamilies, 'ARTIFACT_PROJECT_HEALTH_INVALID:COVERAGE_ACTIVE_FAMILIES');
    if (!(LOCAL_READINESS_CURRENTNESS_VALUES as readonly string[]).includes(entry.currentness as string)) invalid('COVERAGE_CURRENTNESS');
    coverageCurrentnessCounts[entry.currentness as string] = (coverageCurrentnessCounts[entry.currentness as string] ?? 0) + 1;
    if (entry.currentness === 'STALE') staleFromCoverage.push(entry.targetId as string);
    else if (entry.currentness === 'SOURCE_UNAVAILABLE') unavailableFromCoverage.push(entry.targetId as string);
    else if (entry.currentness === 'NOT_EVALUATED') unevaluatedFromCoverage.push(entry.targetId as string);
    // Mechanical coverageForTarget rule: MISSING ⇔ zero active families.
    if ((entry.coverage === 'MISSING') !== ((entry.activeFamilies as number) === 0)) invalid('COVERAGE_ACTIVE_MISMATCH');
    if ((entry.activeFamilies as number) > 0) targetsWithActiveFamily += 1;
    if (entry.coverage === 'MISSING') missingFromCoverage.push(entry.targetId as string);
    if (previousTargetId !== undefined && !(previousTargetId < (entry.targetId as string))) invalid('COVERAGE_ORDER');
    previousTargetId = entry.targetId as string;
  }
  if (targetsWithActiveFamily !== (health.targetsWithActiveFamily as number)) invalid('TARGETS_WITH_ACTIVE_FAMILY_MISMATCH');
  if (!((health.targetsMissingActiveFamily as string[]).length === missingFromCoverage.length &&
    (health.targetsMissingActiveFamily as string[]).every((id, index) => id === missingFromCoverage[index]))) {
    invalid('MISSING_TARGETS_MISMATCH');
  }
  for (const currentness of LOCAL_READINESS_CURRENTNESS_VALUES) {
    if (coverageCurrentnessCounts[currentness] !== currentnessCounts[currentness]) invalid('COVERAGE_CURRENTNESS_COUNT_MISMATCH');
  }
  if (JSON.stringify(health.staleTargets) !== JSON.stringify(staleFromCoverage)) invalid('COVERAGE_STALE_TARGETS_MISMATCH');
  if (JSON.stringify(health.unavailableTargets) !== JSON.stringify(unavailableFromCoverage)) invalid('COVERAGE_UNAVAILABLE_TARGETS_MISMATCH');
  if (JSON.stringify(health.currentnessUnevaluatedTargets) !== JSON.stringify(unevaluatedFromCoverage)) invalid('COVERAGE_UNEVALUATED_TARGETS_MISMATCH');

  // --- campaign version fingerprint summary ----------------------------------
  const campaign = requireRuntimeRecord(report.campaign, 'ARTIFACT_PROJECT_HEALTH_INVALID:CAMPAIGN');
  assertExactKeys(campaign, CAMPAIGN_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:CAMPAIGN');
  if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(campaign.category as string)) invalid('CAMPAIGN_CATEGORY');
  assertBoolean(campaign.unmeasured, 'ARTIFACT_PROJECT_HEALTH_INVALID:CAMPAIGN_UNMEASURED');
  if ((campaign.category === 'UNMEASURED') !== (campaign.unmeasured === true)) invalid('CAMPAIGN_UNMEASURED_MISMATCH');
  assertSortedUnique(requireRuntimeArray(campaign.comparedKeys, 'ARTIFACT_PROJECT_HEALTH_INVALID:CAMPAIGN_COMPARED_KEYS'), 'CAMPAIGN_COMPARED_KEYS');
  assertSortedUnique(requireRuntimeArray(campaign.driftKeys, 'ARTIFACT_PROJECT_HEALTH_INVALID:CAMPAIGN_DRIFT_KEYS'), 'CAMPAIGN_DRIFT_KEYS');
  if (campaign.unmeasured === true && ((campaign.comparedKeys as string[]).length > 0 || (campaign.driftKeys as string[]).length > 0)) {
    invalid('UNMEASURED_WITH_COMPARED_KEYS');
  }
  for (const key of campaign.driftKeys as string[]) {
    if (!(campaign.comparedKeys as string[]).includes(key)) invalid('DRIFT_KEY_NOT_COMPARED');
  }

  // --- owner scope (markers recomputed from the owning module's constants) ---
  const ownerScope = requireRuntimeRecord(report.ownerScope, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE');
  assertExactKeys(ownerScope, OWNER_SCOPE_KEYS, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE');
  assertString(ownerScope.status, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE_STATUS');
  assertString(ownerScope.reason, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE_REASON');
  assertNonNegativeInteger(ownerScope.frozenOperationCount, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE_COUNT');
  assertBoolean(ownerScope.matchesFrozenMarkers, 'ARTIFACT_PROJECT_HEALTH_INVALID:OWNER_SCOPE_MARKERS_FLAG');
  const expectedMatches =
    ownerScope.status === EXPECTED_OWNER_SCOPE_STATUS &&
    ownerScope.reason === EXPECTED_OWNER_SCOPE_REASON &&
    ownerScope.frozenOperationCount === EXPECTED_FROZEN_OPERATION_COUNT;
  if (ownerScope.matchesFrozenMarkers !== expectedMatches) invalid('OWNER_SCOPE_MARKERS_MISMATCH');
}
