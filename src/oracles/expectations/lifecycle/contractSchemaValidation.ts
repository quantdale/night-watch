// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream E — fail-closed schema validation
// and canonical serialization for the Session-1 lifecycle DTOs.
//
// ONE pure validation gateway over the four lifecycle data contracts:
//
//   ContractFamilyDescriptor          (contractLifecycleRegistry)
//   UnifiedContractResult             (contractResultVocabulary)
//   FamilyResolutionRecord            (sourceContractResolution)
//   ComposedSourceContractResolution  (sourceContractResolution)
//
// Fail-closed everywhere; every error code is prefixed CONTRACT_SCHEMA_*:
//   - STRICT UNKNOWN-FIELD REJECTION at every object level: any key outside
//     the exact field set fails with CONTRACT_SCHEMA_UNKNOWN_FIELD:<dto>.<key>
//     (nested paths included, e.g.
//     ComposedSourceContractResolution.families[2].unified.bogus);
//   - a present key whose value is undefined fails with
//     CONTRACT_SCHEMA_UNDEFINED_FIELD:<path>;
//   - every field's type and enum membership is checked against the
//     authoritative source modules' own unions and version constants;
//   - cross-field coherence (derivation/evidence/currentness pairing per
//     family kind, probe-vs-expectationId exclusivity, historicalImmutable
//     iff archived, composed kind vs overall-category allowlist, composed
//     kind vs family currentness classes) fails with
//     CONTRACT_SCHEMA_INCOHERENT:<detail>;
//   - free-text surfaces are privacy-screened with containsAnySentinel; a
//     trip fails with CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:<field>.
//
// The migration-map row
// 'src/oracles/expectations/lifecycle/contractSchemaValidation.ts#validateContractSchema'
// becomes truthful with this module: validateContractSchema is the canonical
// shape-detecting entry point, and canonicalSerializeContractDto /
// assertDeterministicRoundTrip pin byte-stable canonical identity over
// canonicalDigest.stableJsonSorted.
//
// PURE: no process execution, no transport, no filesystem, no environment
// access, no persistence (hardening-guarded). Deterministic: identical input
// yields identical results and a byte-identical canonical form.
// ---------------------------------------------------------------------------

import { containsAnySentinel, MECHANICAL_ANALYZER_VERSION } from '../extract/analyzer';
import type { ContractDriftClass, ContractDriftClassification } from '../extract/contractDrift';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../collectionAdmission';
import {
  MECHANICAL_ANALYZER_EVIDENCE_VERSION,
  SOURCE_EVIDENCE_DIGEST_VERSION,
} from './contractLifecycleRegistry';
import type {
  CampaignEligibility,
  ContractFamilyDescriptor,
  ContractFamilyKind,
  ContractFamilyScope,
  CurrentnessRequirement,
} from './contractLifecycleRegistry';
import {
  CONTRACT_RESULT_VOCABULARY_VERSION,
  UNIFIED_CONTRACT_RESULT_CATEGORIES,
} from './contractResultVocabulary';
import type { UnifiedContractResult, UnifiedContractResultCategory } from './contractResultVocabulary';
import { SOURCE_CONTRACT_RESOLUTION_VERSION } from './sourceContractResolution';
import type {
  ComposedResolutionKind,
  ComposedSourceContractResolution,
  FamilyCurrentnessClass,
  FamilyResolutionRecord,
} from './sourceContractResolution';
import { isEvidenceDigest, stableJsonSorted } from '../../../core/identity/canonicalDigest';

/** Load-bearing schema-validation version for the lifecycle DTO gateway. */
export const CONTRACT_SCHEMA_VALIDATION_VERSION = 'nightwatch.contract-schema-validation.v1' as const;

// ---------------------------------------------------------------------------
// Closed vocabularies (mirrors of the authoritative unions; kept in lockstep
// with the source modules' own member tables).
// ---------------------------------------------------------------------------

const CONTRACT_FAMILY_KINDS: readonly ContractFamilyKind[] = [
  'HISTORICAL_SHAPE',
  'DEEP_TYPE',
  'COLLECTION',
  'MECHANICAL_PROBE',
  'ARCHIVED_HISTORICAL_SHAPE',
];

const CONTRACT_FAMILY_SCOPES: readonly ContractFamilyScope[] = [
  'ROOT_ARRAY_SHAPE',
  'ITEM_FIELD_TYPE',
  'COLLECTION_WIDE',
  'ANALYZER_EVIDENCE',
];

const CURRENTNESS_REQUIREMENTS: readonly CurrentnessRequirement[] = [
  'SNAPSHOT_SHA_EQUALITY',
  'ANALYZER_SOURCE_FRESHNESS',
];

const CAMPAIGN_ELIGIBILITIES: readonly CampaignEligibility[] = [
  'CAMPAIGN_ELIGIBLE',
  'NOT_CAMPAIGN_ELIGIBLE',
];

const FAMILY_CURRENTNESS_CLASSES: readonly FamilyCurrentnessClass[] = [
  'CURRENT',
  'STALE',
  'UNAVAILABLE',
  'NOT_APPLICABLE',
];

const COMPOSED_RESOLUTION_KINDS: readonly ComposedResolutionKind[] = [
  'RESOLVED_CURRENT',
  'STALE',
  'SOURCE_UNAVAILABLE',
  'NO_EXPECTATION',
  'UNKNOWN_TARGET',
  'MIXED_CURRENTNESS_BLOCKED',
  'AMBIGUOUS_TARGET_SELECTION',
];

const CONTRACT_DRIFT_CLASSES: readonly ContractDriftClass[] = [
  'EVIDENCE_UNCHANGED_SHA_MOVED',
  'EVIDENCE_CHANGED_COMPATIBLE',
  'EVIDENCE_CHANGED_BREAKING',
  'DERIVATION_VERSION_CHANGED',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'CONTRACT_BECAME_AMBIGUOUS',
  'CONTRACT_BECAME_PROVABLE',
  'NO_APPROVED_TARGET',
];

/**
 * The distinct derivation-version strings the lifecycle registry defines.
 * HISTORICAL_SHAPE and ARCHIVED_HISTORICAL_SHAPE share
 * REAL_SOURCE_DERIVATION_VERSION, so the registry's four authoritative
 * constants are exactly these four distinct strings.
 */
const KNOWN_LIFECYCLE_DERIVATION_VERSIONS: readonly string[] = [
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
  REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_ANALYZER_VERSION,
];

/** Exact derivation-version pairing per descriptor kind (registry semantics). */
const DERIVATION_VERSION_BY_KIND: Record<ContractFamilyKind, string> = {
  HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
  DEEP_TYPE: REAL_SOURCE_DERIVATION_VERSION_V2,
  COLLECTION: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_PROBE: MECHANICAL_ANALYZER_VERSION,
  ARCHIVED_HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
};

/**
 * Pinned ComposedResolutionKind -> allowed overall UnifiedContractResult
 * category pairs. Derived from what sourceContractResolution.ts plus its
 * permanent suite (tests/unit/phase15SourceContractResolution.test.ts)
 * actually produce:
 *   RESOLVED_CURRENT           -> PROVEN    (happy-path tests)
 *                                 | PARTIAL ('drift attached: changed evidence' test)
 *   STALE                      -> STALE     (stale test + drift-stale test)
 *   SOURCE_UNAVAILABLE         -> UNAVAILABLE (both unavailable tests)
 *   NO_EXPECTATION             -> NOT_APPLICABLE (probe-only test + the fixed
 *                                 early-return emptyOverall construction)
 *                                 | UNSUPPORTED  (derivation-failure test)
 *   UNKNOWN_TARGET             -> NOT_APPLICABLE (unknown-target test)
 *   AMBIGUOUS_TARGET_SELECTION -> NOT_APPLICABLE (same code-fixed early-return
 *                                 emptyOverall construction as UNKNOWN_TARGET;
 *                                 unreachable through public params today
 *                                 because built registry chains are unique)
 *   MIXED_CURRENTNESS_BLOCKED  -> STALE     (code-fixed literal in the
 *                                 mixed-currentness fail-closed guard)
 * Any other pair is incoherent and rejected.
 */
const KIND_TO_OVERALL_CATEGORIES: Record<ComposedResolutionKind, readonly UnifiedContractResultCategory[]> = {
  RESOLVED_CURRENT: ['PROVEN', 'PARTIAL'],
  STALE: ['STALE'],
  SOURCE_UNAVAILABLE: ['UNAVAILABLE'],
  NO_EXPECTATION: ['NOT_APPLICABLE', 'UNSUPPORTED'],
  UNKNOWN_TARGET: ['NOT_APPLICABLE'],
  MIXED_CURRENTNESS_BLOCKED: ['STALE'],
  AMBIGUOUS_TARGET_SELECTION: ['NOT_APPLICABLE'],
};

// ---------------------------------------------------------------------------
// Exact per-DTO field sets (strict unknown-field rejection at every level).
// ---------------------------------------------------------------------------

const UNIFIED_CONTRACT_RESULT_FIELDS: readonly string[] = [
  'resultVersion',
  'category',
  'sourceVocabulary',
  'sourceValue',
  'targetId',
  'detail',
];

const FAMILY_RESOLUTION_RECORD_FIELDS: readonly string[] = [
  'familyId',
  'kind',
  'unified',
  'currentnessClass',
  'evidenceDigest',
  'derivationVersion',
];

const COMPOSED_RESOLUTION_FIELDS: readonly string[] = [
  'resolutionVersion',
  'targetId',
  'kind',
  'families',
  'drift',
  'overall',
  'detail',
];

const COMPOSED_RESOLUTION_REQUIRED_FIELDS: readonly string[] = [
  'resolutionVersion',
  'targetId',
  'kind',
  'families',
  'drift',
  'overall',
];

const CONTRACT_FAMILY_DESCRIPTOR_FIELDS: readonly string[] = [
  'familyId',
  'targetId',
  'kind',
  'scope',
  'expectationId',
  'derivationVersion',
  'evidenceVersion',
  'currentnessRequirement',
  'campaignEligible',
  'predecessorFamilyId',
  'successorFamilyId',
  'historicalImmutable',
];

const DRIFT_CLASSIFICATION_FIELDS: readonly string[] = [
  'targetId',
  'driftClass',
  'prevDigest',
  'currDigest',
  'prevStatus',
  'currStatus',
  'detail',
];

const DRIFT_NULLABLE_STRING_FIELDS: readonly string[] = ['prevDigest', 'currDigest', 'prevStatus', 'currStatus'];

const LINEAGE_ID_FIELDS: readonly string[] = ['predecessorFamilyId', 'successorFamilyId'];

// ---------------------------------------------------------------------------
// Fail-closed helpers. Every emitted message starts with CONTRACT_SCHEMA_*.
// ---------------------------------------------------------------------------

function reject(message: string): never {
  throw new Error(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (!isPlainObject(value)) reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}:expected-object`);
  return value;
}

function rejectUnexpectedFields(path: string, box: Record<string, unknown>, allowed: readonly string[]): void {
  for (const [key, item] of Object.entries(box)) {
    if (!allowed.includes(key)) reject(`CONTRACT_SCHEMA_UNKNOWN_FIELD:${path}.${key}`);
    if (item === undefined) reject(`CONTRACT_SCHEMA_UNDEFINED_FIELD:${path}.${key}`);
  }
}

function requirePresentFields(path: string, box: Record<string, unknown>, required: readonly string[]): void {
  for (const key of required) {
    if (!(key in box)) reject(`CONTRACT_SCHEMA_MISSING_FIELD:${path}.${key}`);
  }
}

function stringAt(path: string, box: Record<string, unknown>, field: string): string {
  const item = box[field];
  if (typeof item !== 'string') reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.${field}:expected-string`);
  return item;
}

function nonEmptyStringAt(path: string, box: Record<string, unknown>, field: string): string {
  const item = stringAt(path, box, field);
  if (item.length === 0) reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.${field}-must-be-non-empty`);
  return item;
}

function booleanAt(path: string, box: Record<string, unknown>, field: string): boolean {
  const item = box[field];
  if (typeof item !== 'boolean') reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.${field}:expected-boolean`);
  return item;
}

function enumAt<T extends string>(path: string, box: Record<string, unknown>, field: string, allowed: readonly T[]): T {
  const item = box[field];
  if (typeof item !== 'string' || !allowed.includes(item as T)) {
    reject(`CONTRACT_SCHEMA_ENUM_VIOLATION:${path}.${field}:${String(item)}`);
  }
  return item as T;
}

/**
 * Optional free-text surface: absent is fine; present must be a string and
 * must not carry a privacy sentinel.
 */
function screenedOptionalTextAt(path: string, box: Record<string, unknown>, field: string): void {
  const item = box[field];
  if (item === undefined) return;
  if (typeof item !== 'string') reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.${field}:expected-string`);
  if (containsAnySentinel(item)) reject(`CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:${path}.${field}`);
}

// ---------------------------------------------------------------------------
// Per-DTO validators (path-parameterized so nested errors carry full paths).
// ---------------------------------------------------------------------------

function validateUnifiedAt(value: unknown, path: string): UnifiedContractResult {
  const box = requireObject(value, path);
  rejectUnexpectedFields(path, box, UNIFIED_CONTRACT_RESULT_FIELDS);
  requirePresentFields(path, box, ['resultVersion', 'category', 'sourceVocabulary', 'sourceValue']);
  if (box['resultVersion'] !== CONTRACT_RESULT_VOCABULARY_VERSION) {
    reject(`CONTRACT_SCHEMA_ENUM_VIOLATION:${path}.resultVersion:${String(box['resultVersion'])}`);
  }
  enumAt(path, box, 'category', UNIFIED_CONTRACT_RESULT_CATEGORIES);
  nonEmptyStringAt(path, box, 'sourceVocabulary');
  nonEmptyStringAt(path, box, 'sourceValue');
  const targetId = box['targetId'];
  if (targetId !== undefined) {
    if (typeof targetId !== 'string') reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.targetId:expected-string`);
    if (targetId.length === 0) reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.targetId-must-be-non-empty`);
    if (containsAnySentinel(targetId)) reject(`CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:${path}.targetId`);
  }
  screenedOptionalTextAt(path, box, 'detail');
  return box as unknown as UnifiedContractResult;
}

function validateRecordAt(value: unknown, path: string): FamilyResolutionRecord {
  const box = requireObject(value, path);
  rejectUnexpectedFields(path, box, FAMILY_RESOLUTION_RECORD_FIELDS);
  requirePresentFields(path, box, FAMILY_RESOLUTION_RECORD_FIELDS);
  const familyId = nonEmptyStringAt(path, box, 'familyId');
  if (!familyId.startsWith('lifecycle:')) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.familyId-must-start-with-lifecycle-colon:${familyId}`);
  }
  enumAt(path, box, 'kind', CONTRACT_FAMILY_KINDS);
  validateUnifiedAt(box['unified'], `${path}.unified`);
  enumAt(path, box, 'currentnessClass', FAMILY_CURRENTNESS_CLASSES);
  const digest = box['evidenceDigest'];
  if (digest !== null && !isEvidenceDigest(digest)) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.evidenceDigest-must-be-null-or-ev-sha256-24:${String(digest)}`);
  }
  const derivationVersion = stringAt(path, box, 'derivationVersion');
  if (!KNOWN_LIFECYCLE_DERIVATION_VERSIONS.includes(derivationVersion)) {
    reject(`CONTRACT_SCHEMA_ENUM_VIOLATION:${path}.derivationVersion:${derivationVersion}`);
  }
  return box as unknown as FamilyResolutionRecord;
}

function validateDriftAt(value: unknown, path: string): ContractDriftClassification {
  const box = requireObject(value, path);
  rejectUnexpectedFields(path, box, DRIFT_CLASSIFICATION_FIELDS);
  requirePresentFields(path, box, DRIFT_CLASSIFICATION_FIELDS);
  nonEmptyStringAt(path, box, 'targetId');
  enumAt(path, box, 'driftClass', CONTRACT_DRIFT_CLASSES);
  for (const field of DRIFT_NULLABLE_STRING_FIELDS) {
    const item = box[field];
    if (item !== null && typeof item !== 'string') {
      reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.${field}:expected-string-or-null`);
    }
  }
  stringAt(path, box, 'detail');
  return box as unknown as ContractDriftClassification;
}

function validateComposedAt(value: unknown, path: string): ComposedSourceContractResolution {
  const box = requireObject(value, path);
  rejectUnexpectedFields(path, box, COMPOSED_RESOLUTION_FIELDS);
  requirePresentFields(path, box, COMPOSED_RESOLUTION_REQUIRED_FIELDS);
  if (box['resolutionVersion'] !== SOURCE_CONTRACT_RESOLUTION_VERSION) {
    reject(`CONTRACT_SCHEMA_ENUM_VIOLATION:${path}.resolutionVersion:${String(box['resolutionVersion'])}`);
  }
  nonEmptyStringAt(path, box, 'targetId');
  const kind = enumAt(path, box, 'kind', COMPOSED_RESOLUTION_KINDS);
  const familiesRaw = box['families'];
  if (!Array.isArray(familiesRaw)) reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.families:expected-array`);
  const records: FamilyResolutionRecord[] = familiesRaw.map((entry: unknown, index: number) =>
    validateRecordAt(entry, `${path}.families[${index}]`),
  );
  const driftRaw = box['drift'];
  if (driftRaw !== null) validateDriftAt(driftRaw, `${path}.drift`);
  const overall = validateUnifiedAt(box['overall'], `${path}.overall`);
  let detail: string | undefined;
  if (box['detail'] !== undefined) detail = stringAt(path, box, 'detail');

  // --- cross-field coherence ----------------------------------------------
  const allowedCategories = KIND_TO_OVERALL_CATEGORIES[kind];
  if (!allowedCategories.includes(overall.category)) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:composed-kind-${kind}-cannot-carry-overall-category-${overall.category}`);
  }
  if (kind === 'RESOLVED_CURRENT' && !records.some((record) => record.currentnessClass === 'CURRENT')) {
    reject('CONTRACT_SCHEMA_INCOHERENT:RESOLVED_CURRENT-requires-at-least-one-CURRENT-family-record');
  }
  if (kind === 'STALE') {
    const hasStaleRecord = records.some((record) => record.currentnessClass === 'STALE');
    const mixedBlockedDetail = detail === 'mixed-currentness-fail-closed';
    if (!hasStaleRecord && !mixedBlockedDetail) {
      reject('CONTRACT_SCHEMA_INCOHERENT:STALE-requires-a-STALE-family-record-or-mixed-blocked-detail');
    }
  }
  if (kind === 'NO_EXPECTATION' && records.length > 0) {
    const allNotApplicable = records.every((record) => record.currentnessClass === 'NOT_APPLICABLE');
    if (!allNotApplicable) {
      reject('CONTRACT_SCHEMA_INCOHERENT:NO_EXPECTATION-requires-empty-families-or-all-NOT_APPLICABLE-records');
    }
  }
  return box as unknown as ComposedSourceContractResolution;
}

function validateDescriptorAt(value: unknown, path: string): ContractFamilyDescriptor {
  const box = requireObject(value, path);
  rejectUnexpectedFields(path, box, CONTRACT_FAMILY_DESCRIPTOR_FIELDS);
  requirePresentFields(path, box, CONTRACT_FAMILY_DESCRIPTOR_FIELDS);
  const familyId = nonEmptyStringAt(path, box, 'familyId');
  if (!familyId.startsWith('lifecycle:')) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.familyId-must-start-with-lifecycle-colon:${familyId}`);
  }
  const targetId = nonEmptyStringAt(path, box, 'targetId');
  const kind = enumAt(path, box, 'kind', CONTRACT_FAMILY_KINDS);
  enumAt(path, box, 'scope', CONTRACT_FAMILY_SCOPES);

  // expectationId: null XOR string, probe <=> null, target-prefixed when set.
  const expectationId = box['expectationId'];
  if (expectationId !== null && typeof expectationId !== 'string') {
    reject(`CONTRACT_SCHEMA_TYPE_MISMATCH:${path}.expectationId:expected-string-or-null`);
  }
  if (kind === 'MECHANICAL_PROBE' && expectationId !== null) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:probe-family-cannot-carry-expectation-id:${familyId}`);
  }
  if (
    kind !== 'MECHANICAL_PROBE' &&
    (expectationId === null || (typeof expectationId === 'string' && expectationId.length === 0))
  ) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:non-probe-family-requires-expectation-id:${familyId}`);
  }
  if (typeof expectationId === 'string' && !expectationId.startsWith(`${targetId}.`)) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:expectation-id-target-mismatch:${targetId}:${expectationId}`);
  }

  // derivation / evidence / currentness pairing per kind.
  const derivationVersion = stringAt(path, box, 'derivationVersion');
  const expectedDerivationVersion = DERIVATION_VERSION_BY_KIND[kind];
  if (derivationVersion !== expectedDerivationVersion) {
    reject(
      `CONTRACT_SCHEMA_INCOHERENT:derivation-version-kind-mismatch:${kind}:${derivationVersion}!=${expectedDerivationVersion}`,
    );
  }
  const evidenceVersion = stringAt(path, box, 'evidenceVersion');
  const expectedEvidenceVersion =
    kind === 'MECHANICAL_PROBE' ? MECHANICAL_ANALYZER_EVIDENCE_VERSION : SOURCE_EVIDENCE_DIGEST_VERSION;
  if (evidenceVersion !== expectedEvidenceVersion) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:evidence-version-kind-mismatch:${kind}:${evidenceVersion}`);
  }
  const currentnessRequirement = enumAt(path, box, 'currentnessRequirement', CURRENTNESS_REQUIREMENTS);
  const expectedCurrentnessRequirement =
    kind === 'MECHANICAL_PROBE' ? 'ANALYZER_SOURCE_FRESHNESS' : 'SNAPSHOT_SHA_EQUALITY';
  if (currentnessRequirement !== expectedCurrentnessRequirement) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:currentness-requirement-kind-mismatch:${kind}:${currentnessRequirement}`);
  }
  enumAt(path, box, 'campaignEligible', CAMPAIGN_ELIGIBILITIES);

  for (const field of LINEAGE_ID_FIELDS) {
    const linkedId = box[field];
    if (linkedId !== null && (typeof linkedId !== 'string' || !linkedId.startsWith('lifecycle:'))) {
      reject(`CONTRACT_SCHEMA_INCOHERENT:${path}.${field}-must-be-null-or-lifecycle-prefixed:${String(linkedId)}`);
    }
  }

  const historicalImmutable = booleanAt(path, box, 'historicalImmutable');
  if (historicalImmutable !== (kind === 'ARCHIVED_HISTORICAL_SHAPE')) {
    reject(`CONTRACT_SCHEMA_INCOHERENT:historicalImmutable-iff-ARCHIVED_HISTORICAL_SHAPE:${familyId}`);
  }
  return box as unknown as ContractFamilyDescriptor;
}

// ---------------------------------------------------------------------------
// Public API (frozen interface).
// ---------------------------------------------------------------------------

/** Validates one UnifiedContractResult; throws CONTRACT_SCHEMA_* on any violation. */
export function validateUnifiedContractResultDto(value: unknown): UnifiedContractResult {
  return validateUnifiedAt(value, 'UnifiedContractResult');
}

/** Validates one FamilyResolutionRecord (recursively including its unified result). */
export function validateFamilyResolutionRecordDto(value: unknown): FamilyResolutionRecord {
  return validateRecordAt(value, 'FamilyResolutionRecord');
}

/** Validates one ComposedSourceContractResolution (recursively: records, drift, overall). */
export function validateComposedSourceContractResolutionDto(value: unknown): ComposedSourceContractResolution {
  return validateComposedAt(value, 'ComposedSourceContractResolution');
}

/** Validates one ContractFamilyDescriptor against the registry's semantics. */
export function validateContractFamilyDescriptorDto(value: unknown): ContractFamilyDescriptor {
  return validateDescriptorAt(value, 'ContractFamilyDescriptor');
}

/**
 * Shape-detecting dispatcher named for the migration-map forward reference:
 * detects which lifecycle DTO `value` is by its discriminating keys and runs
 * that DTO's validator. Throws on invalid input; returns the validated DTO
 * (as unknown, per the frozen generic contract) when valid.
 */
export function validateContractSchema(value: unknown): unknown {
  if (!isPlainObject(value)) reject('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE');
  if ('resultVersion' in value) return validateUnifiedContractResultDto(value);
  if ('resolutionVersion' in value) return validateComposedSourceContractResolutionDto(value);
  if ('unified' in value) return validateFamilyResolutionRecordDto(value);
  if ('familyId' in value) return validateContractFamilyDescriptorDto(value);
  reject('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE');
}

/**
 * Validates first, then returns the stableJsonSorted canonical JSON form of
 * the validated DTO. The result must itself be valid JSON (validated DTOs
 * contain no undefined values); otherwise CONTRACT_SCHEMA_NON_JSON_CANON.
 * Called without a validator (unvalidated input), throws
 * CONTRACT_SCHEMA_VALIDATION_REQUIRED before any serialization happens.
 */
export function canonicalSerializeContractDto(value: unknown, validate: (v: unknown) => unknown): string {
  if (typeof validate !== 'function') reject('CONTRACT_SCHEMA_VALIDATION_REQUIRED');
  const validated: unknown = validate(value);
  const canonical: unknown = stableJsonSorted(validated);
  if (typeof canonical !== 'string') reject('CONTRACT_SCHEMA_NON_JSON_CANON');
  try {
    JSON.parse(canonical);
  } catch {
    reject('CONTRACT_SCHEMA_NON_JSON_CANON');
  }
  return canonical;
}

/**
 * Deterministic round-trip proof: serialize -> parse -> re-validate ->
 * re-serialize must be byte-identical. Invalid input fails closed at the
 * entry validation with its own CONTRACT_SCHEMA_* code; a divergence AFTER a
 * successful first serialization (parsed form fails re-validation, or the
 * re-serialized canonical form differs byte-wise) throws
 * CONTRACT_SCHEMA_ROUND_TRIP_MISMATCH with the cause preserved in the detail.
 */
export function assertDeterministicRoundTrip(value: unknown, validate: (v: unknown) => unknown): void {
  const first = canonicalSerializeContractDto(value, validate);
  let parsed: unknown;
  try {
    parsed = JSON.parse(first);
  } catch {
    reject('CONTRACT_SCHEMA_NON_JSON_CANON');
  }
  let second: string;
  try {
    second = canonicalSerializeContractDto(parsed, validate);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    reject(`CONTRACT_SCHEMA_ROUND_TRIP_MISMATCH:re-validation-failed:${reason}`);
  }
  if (first !== second) reject('CONTRACT_SCHEMA_ROUND_TRIP_MISMATCH:canonical-form-not-byte-stable');
}
