// ---------------------------------------------------------------------------
// Runtime validation for the durable v1/v2 dossier shapes.
//
// A dossier is commonly loaded from JSON and then passed through a TypeScript
// cast.  This module is the bounded runtime proof between those two steps. It
// validates only the frozen dossier structure and its known nested records;
// it does not recursively trust arbitrary objects or acquire any authority.
// ---------------------------------------------------------------------------

import {
  assertBoolean,
  assertEnum,
  assertExactKeys,
  assertIntegerAtMost,
  assertIsoTimestamp,
  assertString,
  isRuntimeRecord,
  requireRuntimeArray,
  safeErrorDetail,
} from '../campaign/runtimeValidation';
import { validateSemanticDossierEvidence } from '../../oracles/semantic/dossier';
import { validateSemanticTriageEvidence } from './semanticTriageEvidence';

type RuntimeRecord = Record<string, unknown>;
type DossierVersion = 'v1' | 'v2';

const SAFE_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const CANDIDATE_ID_RE = /^candidate:sha256:[0-9a-f]{24}$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s]+[?&](?:token|account|customer|cost)=)/i;

const MAX_TITLE_LENGTH = 400;
const MAX_TEXT_LENGTH = 800;
const MAX_DOSSIER_LIST = 256;
const MAX_ACTION_LIST = 64;
const MAX_BOUNDARY_LIST = 16;
const MAX_REPRODUCTION_COUNT = 100_000;
const MAX_SAFETY_COUNTER = 1_000_000;

const V1_ROOT_KEYS = [
  'schemaVersion', 'status', 'candidateId', 'title', 'firstObserved', 'lastObserved',
  'journeys', 'seeds', 'minimalSequence', 'routeClass', 'apiOperationFamily',
  'oracleFingerprint', 'evidenceLevel', 'l4Datastore', 'reproduction',
  'browserApiDifferential', 'sourceChangeCandidates', 'likelyFaultBoundary',
  'confidence', 'technicalSeverity', 'triagePriority', 'knownNightwatchDefect',
  'alternativesRuledOut', 'missingEvidence', 'semanticEvidence',
  'humanReproductionRecipe', 'aiReady', 'safety', 'privacy',
] as const;

const V2_REQUIRED_ROOT_KEYS = [
  ...V1_ROOT_KEYS.slice(0, 25),
  'semanticTriageEvidence',
  ...V1_ROOT_KEYS.slice(25),
] as const;
const V2_OPTIONAL_ROOT_KEYS = ['semanticConfidence'] as const;

const REPRODUCTION_RESULTS = ['REPRODUCED', 'NOT_REPRODUCED', 'BOUNDED', 'INCOMPLETE'] as const;
const MINIMALITY_GUARANTEES = ['1-MINIMAL', 'BOUNDED_MINIMAL', 'NONE'] as const;
const EVIDENCE_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
const TRIAGE_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'] as const;
const TECHNICAL_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
const TRIAGE_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'UNRANKED'] as const;
const SOURCE_RELEVANCE = [
  'DIRECT_CHANGE_RELEVANCE',
  'SHARED_CHANGE_RELEVANCE',
  'TRANSITIVE_CHANGE_RELEVANCE',
  'NO_CURRENT_CHANGE_RELEVANCE',
  'UNKNOWN',
] as const;
const SOURCE_FRESHNESS = ['SOURCE_CURRENT_LOCALLY', 'LOCAL_TRACKING_REF_ONLY', 'REMOTE_FRESHNESS_CONFIRMED', 'UNKNOWN'] as const;
const FAULT_BOUNDARIES = [
  'AUTH', 'ROUTER', 'UI_COMPONENT', 'CLIENT_STATE', 'API_CLIENT',
  'API_TRANSPORT', 'BACKEND_HANDLER', 'PROTOCOL', 'RESOURCE_LOADING', 'UNKNOWN',
] as const;
const DIFFERENTIAL_STATUS = ['UI_FAILURE_API_PASS', 'BROWSER_API_FAILURE_AGREE', 'BROWSER_API_DIVERGE', 'NOT_AVAILABLE'] as const;
const DIFFERENTIAL_DISCRIMINATOR = ['UI_CLIENT_SIDE_STRONGER', 'API_SERVER_PROTOCOL_STRONGER', 'INCONCLUSIVE', 'NOT_AVAILABLE'] as const;
const SEMANTIC_CONFIDENCE = TRIAGE_CONFIDENCE;
const SEMANTIC_REPLAY_STATUS = ['REPRODUCED', 'NOT_REPRODUCED', 'INVALID', 'NOT_EVALUATED'] as const;
const SEMANTIC_REPLAY_OUTCOME = [
  'REPRODUCED_EXACT', 'REPRODUCED_EQUIVALENT_SEMANTIC', 'PRECONDITION_DIVERGENCE',
  'SEMANTIC_DIVERGENCE', 'NOT_REPRODUCED', 'AMBIGUOUS_OCCURRENCE', 'SOURCE_STALE',
  'INVALID_REPLAY', 'INFRA_FAILURE',
] as const;
const SEMANTIC_OCCURRENCE_BINDING = ['BOUND', 'AMBIGUOUS', 'INVALID'] as const;
const SEMANTIC_CURRENTNESS = ['CURRENT', 'STALE', 'AMBIGUOUS', 'MISSING', 'UNSUPPORTED', 'SYNTHETIC_ONLY'] as const;
const AI_SOURCE_CURRENTNESS = ['CURRENT', 'LOCAL_TRACKING_ONLY', 'STALE', 'UNAVAILABLE', 'UNKNOWN'] as const;

const AI_BASE_EVIDENCE_KEYS = [
  'candidateId', 'title', 'routeClass', 'apiOperationFamily', 'oracleFingerprint',
  'minimalSequence', 'confidence', 'faultBoundary', 'sourceCandidateCount',
] as const;
const AI_SEMANTIC_EVIDENCE_KEYS = [
  'semanticConfidence', 'expectationId', 'targetId', 'semanticFindingFingerprint',
  'sourceCurrentness', 'exactReplayStatus', 'replayOutcomeClass', 'occurrenceBinding',
  'replayDeterministic',
] as const;

function fail(code: string): never {
  throw new Error(code);
}

function plainRecord(value: unknown, code: string): RuntimeRecord {
  if (!isRuntimeRecord(value)) fail(`${code}:OBJECT_REQUIRED`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(`${code}:PROTOTYPE_INVALID`);
  return value;
}

function boundedText(value: unknown, code: string, maxLength = MAX_TEXT_LENGTH, allowEmpty = false): string {
  assertString(value, code);
  if ((!allowEmpty && value.length === 0) || value.length > maxLength || CONTROL_CHARACTER_RE.test(value) || SENTINEL_RE.test(value)) {
    fail(`${code}:INVALID`);
  }
  return value;
}

function safeId(value: unknown, code: string): string {
  assertString(value, code);
  if (!SAFE_ID_RE.test(value) || SENTINEL_RE.test(value)) fail(`${code}:INVALID`);
  return value;
}

function safeFingerprint(value: unknown, code: string): string {
  const fingerprint = safeId(value, code);
  if (!FINGERPRINT_RE.test(fingerprint)) fail(`${code}:INVALID`);
  return fingerprint;
}

function candidateId(value: unknown): void {
  const id = safeId(value, 'DOSSIER_CANDIDATE_ID');
  if (!CANDIDATE_ID_RE.test(id)) fail('DOSSIER_CANDIDATE_ID:INVALID');
}

function nullableId(value: unknown, code: string): void {
  if (value !== null) safeId(value, code);
}

function nullableTimestamp(value: unknown, code: string): number | null {
  if (value === null) return null;
  assertIsoTimestamp(value, code);
  boundedText(value, code, 80);
  return Date.parse(value);
}

function boundedIdArray(value: unknown, code: string, maxLength: number, unique: boolean): readonly string[] {
  const values = requireRuntimeArray(value, code);
  if (values.length > maxLength) fail(`${code}:EXCEEDS_BOUND`);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    const id = safeId(item, code);
    if (unique && seen.has(id)) fail(`${code}:DUPLICATE`);
    seen.add(id);
    result.push(id);
  }
  return result;
}

function boundedTextArray(value: unknown, code: string, maxLength: number, maxItemLength = MAX_TEXT_LENGTH): readonly string[] {
  const values = requireRuntimeArray(value, code);
  if (values.length > maxLength) fail(`${code}:EXCEEDS_BOUND`);
  return values.map((item) => boundedText(item, code, maxItemLength));
}

function enumArray<T extends string>(value: unknown, allowed: readonly T[], code: string, maxLength: number, unique: boolean): readonly T[] {
  const values = requireRuntimeArray(value, code);
  if (values.length > maxLength) fail(`${code}:EXCEEDS_BOUND`);
  const result: T[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    assertEnum(item, allowed, code);
    if (unique && seen.has(item)) fail(`${code}:DUPLICATE`);
    seen.add(item);
    result.push(item);
  }
  return result;
}

function nullableBoolean(value: unknown, code: string): void {
  if (value !== null) assertBoolean(value, code);
}

function exactTuple(value: unknown, expected: readonly string[], code: string): void {
  const values = requireRuntimeArray(value, code);
  if (values.length !== expected.length || values.some((item, index) => item !== expected[index])) fail(`${code}:VALUE_INVALID`);
}

function assertDossierRootKeys(value: RuntimeRecord, required: readonly string[], optional: readonly string[], version: DossierVersion): void {
  const accepted = new Set([...required, ...optional]);
  const unknownCode = version === 'v2' ? 'DOSSIER_V2_UNKNOWN_FIELD' : 'DOSSIER_UNKNOWN_FIELD';
  for (const key of Object.keys(value)) {
    if (!accepted.has(key)) fail(`${unknownCode}:${safeErrorDetail(key)}`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${version === 'v2' ? 'DOSSIER_V2_REQUIRED_FIELD' : 'DOSSIER_REQUIRED_FIELD'}:${safeErrorDetail(key)}`);
  }
}

function sameSequence(left: readonly unknown[], right: readonly unknown[], code: string): void {
  if (left.length !== right.length || left.some((value, index) => value !== right[index])) fail(`${code}:MISMATCH`);
}

function validateReproduction(value: unknown, version: DossierVersion): void {
  const reproduction = plainRecord(value, version === 'v2' ? 'DOSSIER_V2_REPRODUCTION' : 'DOSSIER_REPRODUCTION');
  assertExactKeys(reproduction, ['result', 'count', 'minimalityGuarantee'], version === 'v2' ? 'DOSSIER_V2_REPRODUCTION' : 'DOSSIER_REPRODUCTION');
  assertEnum(reproduction.result, REPRODUCTION_RESULTS, 'DOSSIER_REPRODUCTION_RESULT');
  assertIntegerAtMost(reproduction.count, MAX_REPRODUCTION_COUNT, 'DOSSIER_REPRODUCTION_COUNT');
  assertEnum(reproduction.minimalityGuarantee, MINIMALITY_GUARANTEES, 'DOSSIER_REPRODUCTION_MINIMALITY');
  const result = reproduction.result;
  const count = reproduction.count;
  const guarantee = reproduction.minimalityGuarantee;
  if (result === 'NOT_REPRODUCED' && (count !== 0 || guarantee !== 'NONE')) fail('DOSSIER_REPRODUCTION_COHERENCE_INVALID');
  if (result === 'INCOMPLETE' && guarantee !== 'NONE') fail('DOSSIER_REPRODUCTION_COHERENCE_INVALID');
  if ((result === 'REPRODUCED' || result === 'BOUNDED') && count === 0) fail('DOSSIER_REPRODUCTION_COHERENCE_INVALID');
}

function validateDifferential(value: unknown): void {
  const differential = plainRecord(value, 'DOSSIER_BROWSER_API_DIFFERENTIAL');
  assertExactKeys(differential, [
    'status', 'appLayerDiscriminator', 'browserOperationFamily', 'apiOperationFamily',
    'statusClassSame', 'contentTypeClassSame', 'routeClassSame', 'structuralStateSame',
    'parseabilitySame', 'rootCauseClaim',
  ], 'DOSSIER_BROWSER_API_DIFFERENTIAL');
  assertEnum(differential.status, DIFFERENTIAL_STATUS, 'DOSSIER_DIFFERENTIAL_STATUS');
  assertEnum(differential.appLayerDiscriminator, DIFFERENTIAL_DISCRIMINATOR, 'DOSSIER_DIFFERENTIAL_DISCRIMINATOR');
  nullableId(differential.browserOperationFamily, 'DOSSIER_DIFFERENTIAL_BROWSER_OPERATION');
  nullableId(differential.apiOperationFamily, 'DOSSIER_DIFFERENTIAL_API_OPERATION');
  for (const field of ['statusClassSame', 'contentTypeClassSame', 'routeClassSame', 'structuralStateSame', 'parseabilitySame'] as const) {
    nullableBoolean(differential[field], `DOSSIER_DIFFERENTIAL_${field.toUpperCase()}`);
  }
  if (differential.rootCauseClaim !== 'NONE') fail('DOSSIER_DIFFERENTIAL_ROOT_CAUSE_INVALID');
}

function validateSourceCandidates(value: unknown): void {
  const candidates = requireRuntimeArray(value, 'DOSSIER_SOURCE_CANDIDATES');
  if (candidates.length > MAX_DOSSIER_LIST) fail('DOSSIER_SOURCE_CANDIDATES:EXCEEDS_BOUND');
  for (const item of candidates) {
    const candidate = plainRecord(item, 'DOSSIER_SOURCE_CANDIDATE');
    assertExactKeys(candidate, ['repoId', 'path', 'edgeId', 'relevance', 'confidence', 'sourceFreshness', 'reason', 'claim'], 'DOSSIER_SOURCE_CANDIDATE');
    safeId(candidate.repoId, 'DOSSIER_SOURCE_CANDIDATE_REPO');
    const sourcePath = boundedText(candidate.path, 'DOSSIER_SOURCE_CANDIDATE_PATH', 400);
    if (sourcePath.startsWith('/') || sourcePath.includes('..') || sourcePath.includes('\\') || sourcePath.includes('://')) fail('DOSSIER_SOURCE_CANDIDATE_PATH:INVALID');
    nullableId(candidate.edgeId, 'DOSSIER_SOURCE_CANDIDATE_EDGE');
    assertEnum(candidate.relevance, SOURCE_RELEVANCE, 'DOSSIER_SOURCE_CANDIDATE_RELEVANCE');
    assertEnum(candidate.confidence, TRIAGE_CONFIDENCE, 'DOSSIER_SOURCE_CANDIDATE_CONFIDENCE');
    assertEnum(candidate.sourceFreshness, SOURCE_FRESHNESS, 'DOSSIER_SOURCE_CANDIDATE_FRESHNESS');
    boundedText(candidate.reason, 'DOSSIER_SOURCE_CANDIDATE_REASON');
    if (candidate.claim !== 'SOURCE_CHANGE_CANDIDATE') fail('DOSSIER_SOURCE_CANDIDATE_CLAIM_INVALID');
  }
}

function validateFaultBoundary(value: unknown): void {
  const boundary = plainRecord(value, 'DOSSIER_FAULT_BOUNDARY');
  assertExactKeys(boundary, ['primaryBoundary', 'candidateBoundaries', 'confidence', 'reasons', 'rootCauseClaim'], 'DOSSIER_FAULT_BOUNDARY');
  assertEnum(boundary.primaryBoundary, FAULT_BOUNDARIES, 'DOSSIER_FAULT_PRIMARY');
  const candidates = enumArray(boundary.candidateBoundaries, FAULT_BOUNDARIES, 'DOSSIER_FAULT_CANDIDATES', MAX_BOUNDARY_LIST, true);
  assertEnum(boundary.confidence, TRIAGE_CONFIDENCE, 'DOSSIER_FAULT_CONFIDENCE');
  boundedTextArray(boundary.reasons, 'DOSSIER_FAULT_REASONS', MAX_DOSSIER_LIST);
  if (boundary.rootCauseClaim !== 'NONE') fail('DOSSIER_FAULT_ROOT_CAUSE_INVALID');
  // Historical protocol dossiers use candidateBoundaries as an optional
  // alternatives list and may keep it empty even when primaryBoundary is a
  // concrete boundary. Preserve that valid shape; the field-level enum and
  // bounded list checks above are the mechanically justified contract here.
  void candidates;
}

function validateConfidence(value: unknown): void {
  const confidence = plainRecord(value, 'DOSSIER_CONFIDENCE');
  assertExactKeys(confidence, ['level', 'reasons'], 'DOSSIER_CONFIDENCE');
  assertEnum(confidence.level, TRIAGE_CONFIDENCE, 'DOSSIER_CONFIDENCE_LEVEL');
  boundedTextArray(confidence.reasons, 'DOSSIER_CONFIDENCE_REASONS', MAX_DOSSIER_LIST);
}

function validateSemanticConfidence(value: unknown): RuntimeRecord {
  const confidence = plainRecord(value, 'DOSSIER_SEMANTIC_CONFIDENCE');
  assertExactKeys(confidence, ['level', 'reasons', 'blockers'], 'DOSSIER_SEMANTIC_CONFIDENCE');
  assertEnum(confidence.level, SEMANTIC_CONFIDENCE, 'DOSSIER_SEMANTIC_CONFIDENCE_LEVEL');
  boundedTextArray(confidence.reasons, 'DOSSIER_SEMANTIC_CONFIDENCE_REASONS', MAX_DOSSIER_LIST);
  boundedTextArray(confidence.blockers, 'DOSSIER_SEMANTIC_CONFIDENCE_BLOCKERS', MAX_DOSSIER_LIST);
  return confidence;
}

function validateHumanRecipe(value: unknown, root: RuntimeRecord, version: DossierVersion): void {
  const recipe = plainRecord(value, version === 'v2' ? 'DOSSIER_V2_RECIPE' : 'DOSSIER_RECIPE');
  assertExactKeys(recipe, ['steps', 'actionIds', 'observation', 'credentialHandling', 'prohibitedValues'], version === 'v2' ? 'DOSSIER_V2_RECIPE' : 'DOSSIER_RECIPE');
  boundedTextArray(recipe.steps, 'DOSSIER_RECIPE_STEPS', MAX_DOSSIER_LIST);
  const actionIds = boundedIdArray(recipe.actionIds, 'DOSSIER_RECIPE_ACTION_IDS', MAX_ACTION_LIST, false);
  boundedText(recipe.observation, 'DOSSIER_RECIPE_OBSERVATION');
  if (recipe.credentialHandling !== 'OWNER_AUTHENTICATES_TO_APPROVED_DEV_ACCOUNT') fail('DOSSIER_RECIPE_CREDENTIAL_HANDLING_INVALID');
  exactTuple(recipe.prohibitedValues, ['CREDENTIALS', 'CUSTOMER_VALUES', 'COST_VALUES', 'RAW_BODIES', 'COOKIES'], 'DOSSIER_RECIPE_PROHIBITED_VALUES');
  sameSequence(actionIds, root.minimalSequence as readonly unknown[], 'DOSSIER_RECIPE_ACTION_IDS');
}

function validateAiReady(value: unknown, root: RuntimeRecord, version: DossierVersion, semanticConfidence: RuntimeRecord | null, semanticTriageEvidence: RuntimeRecord | null): void {
  const aiReady = plainRecord(value, version === 'v2' ? 'DOSSIER_V2_AI_READY' : 'DOSSIER_AI_READY');
  assertExactKeys(aiReady, ['schemaVersion', 'deterministic', 'evidence', 'allowedUses', 'oracleAuthority', 'prohibitedUses'], version === 'v2' ? 'DOSSIER_V2_AI_READY' : 'DOSSIER_AI_READY');
  if (aiReady.schemaVersion !== 'nightwatch.ai-ready-evidence.private.v1') fail('DOSSIER_AI_READY_VERSION_INVALID');
  if (aiReady.deterministic !== true) fail('DOSSIER_AI_READY_DETERMINISTIC_INVALID');
  if (aiReady.oracleAuthority !== 'DETERMINISTIC_NIGHTWATCH_ONLY') fail('DOSSIER_AI_READY_ORACLE_AUTHORITY_INVALID');
  exactTuple(aiReady.allowedUses, ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'], 'DOSSIER_AI_READY_ALLOWED_USES');
  exactTuple(aiReady.prohibitedUses, ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'], 'DOSSIER_AI_READY_PROHIBITED_USES');

  const evidence = plainRecord(aiReady.evidence, 'DOSSIER_AI_READY_EVIDENCE');
  assertExactKeys(evidence, AI_BASE_EVIDENCE_KEYS, 'DOSSIER_AI_READY_EVIDENCE', version === 'v2' ? AI_SEMANTIC_EVIDENCE_KEYS : []);
  candidateId(evidence.candidateId);
  if (evidence.candidateId !== root.candidateId) fail('DOSSIER_AI_READY_CANDIDATE_ID_MISMATCH');
  boundedText(evidence.title, 'DOSSIER_AI_READY_TITLE', MAX_TITLE_LENGTH);
  if (evidence.title !== root.title) fail('DOSSIER_AI_READY_TITLE_MISMATCH');
  safeId(evidence.routeClass, 'DOSSIER_AI_READY_ROUTE');
  if (evidence.routeClass !== root.routeClass) fail('DOSSIER_AI_READY_ROUTE_MISMATCH');
  nullableId(evidence.apiOperationFamily, 'DOSSIER_AI_READY_API_OPERATION');
  if (evidence.apiOperationFamily !== root.apiOperationFamily) fail('DOSSIER_AI_READY_API_OPERATION_MISMATCH');
  safeFingerprint(evidence.oracleFingerprint, 'DOSSIER_AI_READY_FINGERPRINT');
  if (evidence.oracleFingerprint !== root.oracleFingerprint) fail('DOSSIER_AI_READY_FINGERPRINT_MISMATCH');
  const minimalSequence = boundedIdArray(evidence.minimalSequence, 'DOSSIER_AI_READY_SEQUENCE', MAX_ACTION_LIST, false);
  sameSequence(minimalSequence, root.minimalSequence as readonly unknown[], 'DOSSIER_AI_READY_SEQUENCE');
  assertEnum(evidence.confidence, TRIAGE_CONFIDENCE, 'DOSSIER_AI_READY_CONFIDENCE');
  const expectedConfidence = semanticConfidence?.level ?? (root.confidence as RuntimeRecord).level;
  if (evidence.confidence !== expectedConfidence) fail('DOSSIER_AI_READY_CONFIDENCE_MISMATCH');
  assertEnum(evidence.faultBoundary, FAULT_BOUNDARIES, 'DOSSIER_AI_READY_FAULT_BOUNDARY');
  if (evidence.faultBoundary !== (root.likelyFaultBoundary as RuntimeRecord).primaryBoundary) fail('DOSSIER_AI_READY_FAULT_BOUNDARY_MISMATCH');
  assertIntegerAtMost(evidence.sourceCandidateCount, MAX_DOSSIER_LIST, 'DOSSIER_AI_READY_SOURCE_COUNT');
  if (evidence.sourceCandidateCount !== (root.sourceChangeCandidates as readonly unknown[]).length) fail('DOSSIER_AI_READY_SOURCE_COUNT_MISMATCH');

  const semanticKeysPresent = AI_SEMANTIC_EVIDENCE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(evidence, key));
  if (semanticTriageEvidence === null) {
    if (semanticKeysPresent.length > 0) fail('DOSSIER_AI_READY_SEMANTIC_EVIDENCE_UNEXPECTED');
    return;
  }
  const triage = semanticTriageEvidence;
  if (Object.prototype.hasOwnProperty.call(evidence, 'semanticConfidence')) {
    assertEnum(evidence.semanticConfidence, SEMANTIC_CONFIDENCE, 'DOSSIER_AI_READY_SEMANTIC_CONFIDENCE');
    if (semanticConfidence === null || evidence.semanticConfidence !== semanticConfidence.level) fail('DOSSIER_AI_READY_SEMANTIC_CONFIDENCE_MISMATCH');
  }
  const optionalStringFields = [
    ['expectationId', 'expectationId'],
    ['targetId', 'targetId'],
    ['semanticFindingFingerprint', 'semanticFindingFingerprint'],
    ['sourceCurrentness', 'sourceCurrentness'],
    ['exactReplayStatus', 'exactReplayStatus'],
  ] as const;
  for (const [field, sourceField] of optionalStringFields) {
    if (!Object.prototype.hasOwnProperty.call(evidence, field)) continue;
    const expected = triage[sourceField];
    if (field === 'semanticFindingFingerprint') safeFingerprint(evidence[field], `DOSSIER_AI_READY_${field.toUpperCase()}`);
    else if (field === 'sourceCurrentness') assertEnum(evidence[field], AI_SOURCE_CURRENTNESS, `DOSSIER_AI_READY_${field.toUpperCase()}`);
    else if (field === 'exactReplayStatus') assertEnum(evidence[field], SEMANTIC_REPLAY_STATUS, `DOSSIER_AI_READY_${field.toUpperCase()}`);
    else safeId(evidence[field], `DOSSIER_AI_READY_${field.toUpperCase()}`);
    if (evidence[field] !== expected) fail(`DOSSIER_AI_READY_${field.toUpperCase()}_MISMATCH`);
  }
  const fidelity = isRuntimeRecord(triage.replayFidelity) ? triage.replayFidelity : null;
  for (const field of ['replayOutcomeClass', 'occurrenceBinding', 'replayDeterministic'] as const) {
    if (!Object.prototype.hasOwnProperty.call(evidence, field)) continue;
    if (fidelity === null) fail('DOSSIER_AI_READY_REPLAY_FIDELITY_UNEXPECTED');
    if (field === 'replayOutcomeClass') assertEnum(evidence[field], SEMANTIC_REPLAY_OUTCOME, 'DOSSIER_AI_READY_REPLAY_OUTCOME');
    else if (field === 'occurrenceBinding') assertEnum(evidence[field], SEMANTIC_OCCURRENCE_BINDING, 'DOSSIER_AI_READY_OCCURRENCE_BINDING');
    else assertBoolean(evidence[field], 'DOSSIER_AI_READY_REPLAY_DETERMINISTIC');
    const sourceField = field === 'replayOutcomeClass' ? 'outcomeClass' : field === 'occurrenceBinding' ? 'occurrenceBinding' : 'deterministic';
    if (evidence[field] !== fidelity[sourceField]) fail(`DOSSIER_AI_READY_${field.toUpperCase()}_MISMATCH`);
  }
}

function validateSafety(value: unknown): void {
  const safety = plainRecord(value, 'DOSSIER_SAFETY');
  const keys = ['productionAttempts', 'proxyViolations', 'unknownDestinations', 'unknownApprovals', 'productMutations', 'actionCausedUnknown', 'databaseQueries'] as const;
  assertExactKeys(safety, keys, 'DOSSIER_SAFETY');
  for (const key of keys) assertIntegerAtMost(safety[key], MAX_SAFETY_COUNTER, `DOSSIER_SAFETY_${key.toUpperCase()}`);
  if (keys.some((key) => safety[key] !== 0)) fail('DOSSIER_SAFETY_NOT_CLEAN');
}

function validatePrivacy(value: unknown): void {
  const privacy = plainRecord(value, 'DOSSIER_PRIVACY');
  const keys = ['result', 'rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'] as const;
  assertExactKeys(privacy, keys, 'DOSSIER_PRIVACY');
  if (privacy.result !== 'PASS') fail('DOSSIER_PRIVACY_INVALID');
  for (const key of keys.slice(1)) assertBoolean(privacy[key], `DOSSIER_PRIVACY_${key.toUpperCase()}`);
  if (keys.slice(1).some((key) => privacy[key] !== false)) fail('DOSSIER_PRIVACY_INVALID');
}

function validateSemanticEvidence<T>(value: unknown, code: string, validator: (value: T) => void): void {
  if (!isRuntimeRecord(value)) fail(`${code}:OBJECT_REQUIRED`);
  try {
    validator(value as T);
  } catch {
    // Nested owning validators have historically included some field detail in
    // their errors. The durable boundary keeps that detail categorical.
    fail(`${code}:INVALID`);
  }
}

export function validateDossierRuntime(value: unknown, options: { readonly version: DossierVersion; readonly schemaVersion: string }): void {
  const rootCode = options.version === 'v2' ? 'DOSSIER_V2' : 'DOSSIER';
  const root = plainRecord(value, rootCode);
  if (root.schemaVersion !== options.schemaVersion) {
    fail(options.version === 'v2' ? 'DOSSIER_V2_VERSION_INVALID' : 'DOSSIER_NOT_READY');
  }
  assertDossierRootKeys(root, options.version === 'v2' ? V2_REQUIRED_ROOT_KEYS : V1_ROOT_KEYS, options.version === 'v2' ? V2_OPTIONAL_ROOT_KEYS : [], options.version);
  if (options.version === 'v1') {
    if (root.status !== 'READY') fail('DOSSIER_NOT_READY');
  } else {
    assertEnum(root.status, ['READY', 'UNRESOLVED'], 'DOSSIER_V2_STATUS');
  }

  candidateId(root.candidateId);
  boundedText(root.title, 'DOSSIER_TITLE', MAX_TITLE_LENGTH);
  const firstObserved = nullableTimestamp(root.firstObserved, 'DOSSIER_FIRST_OBSERVED');
  const lastObserved = nullableTimestamp(root.lastObserved, 'DOSSIER_LAST_OBSERVED');
  if (firstObserved !== null && lastObserved !== null && firstObserved > lastObserved) fail('DOSSIER_OBSERVATION_CHRONOLOGY_INVALID');
  boundedIdArray(root.journeys, 'DOSSIER_JOURNEYS', MAX_DOSSIER_LIST, true);
  boundedIdArray(root.seeds, 'DOSSIER_SEEDS', MAX_DOSSIER_LIST, true);
  const minimalSequence = boundedIdArray(root.minimalSequence, 'DOSSIER_MINIMAL_SEQUENCE', MAX_ACTION_LIST, false);
  safeId(root.routeClass, 'DOSSIER_ROUTE_CLASS');
  nullableId(root.apiOperationFamily, 'DOSSIER_API_OPERATION_FAMILY');
  safeFingerprint(root.oracleFingerprint, 'DOSSIER_ORACLE_FINGERPRINT');
  assertEnum(root.evidenceLevel, EVIDENCE_LEVELS, 'DOSSIER_EVIDENCE_LEVEL');
  if (root.evidenceLevel === 'L4' || root.l4Datastore !== 'OUT_OF_SCOPE_BY_OWNER') fail('DOSSIER_DATASTORE_SCOPE_INVALID');
  if (root.l4Datastore !== 'OUT_OF_SCOPE_BY_OWNER') fail('DOSSIER_DATASTORE_SCOPE_INVALID');

  validateReproduction(root.reproduction, options.version);
  validateDifferential(root.browserApiDifferential);
  validateSourceCandidates(root.sourceChangeCandidates);
  validateFaultBoundary(root.likelyFaultBoundary);
  validateConfidence(root.confidence);
  assertEnum(root.technicalSeverity, TECHNICAL_SEVERITIES, 'DOSSIER_TECHNICAL_SEVERITY');
  assertEnum(root.triagePriority, TRIAGE_PRIORITIES, 'DOSSIER_TRIAGE_PRIORITY');
  nullableId(root.knownNightwatchDefect, 'DOSSIER_KNOWN_DEFECT');
  boundedTextArray(root.alternativesRuledOut, 'DOSSIER_ALTERNATIVES', MAX_DOSSIER_LIST);
  boundedTextArray(root.missingEvidence, 'DOSSIER_MISSING_EVIDENCE', MAX_DOSSIER_LIST);

  if (root.semanticEvidence === null) {
    // Null is the explicit protocol-only value in both accepted dossier
    // versions. Undefined is rejected by the required-key/type checks below.
  } else {
    validateSemanticEvidence(root.semanticEvidence, 'DOSSIER_SEMANTIC_EVIDENCE', validateSemanticDossierEvidence);
  }
  const semanticTriageEvidence = options.version === 'v2'
    ? root.semanticTriageEvidence === null ? null : (validateSemanticEvidence(root.semanticTriageEvidence, 'DOSSIER_SEMANTIC_TRIAGE_EVIDENCE', validateSemanticTriageEvidence), plainRecord(root.semanticTriageEvidence, 'DOSSIER_SEMANTIC_TRIAGE_EVIDENCE'))
    : null;
  const semanticConfidence = options.version === 'v2' && Object.prototype.hasOwnProperty.call(root, 'semanticConfidence')
    ? validateSemanticConfidence(root.semanticConfidence)
    : null;
  if (options.version === 'v2' && semanticConfidence !== null && semanticTriageEvidence === null) fail('DOSSIER_SEMANTIC_CONFIDENCE_WITHOUT_EVIDENCE');

  validateHumanRecipe(root.humanReproductionRecipe, root, options.version);
  validateAiReady(root.aiReady, root, options.version, semanticConfidence, semanticTriageEvidence);
  validateSafety(root.safety);
  validatePrivacy(root.privacy);

  // Keep this local cross-field check after the nested validators so malformed
  // arrays cannot reach a consumer through an implicit cast.
  sameSequence(minimalSequence, (root.humanReproductionRecipe as RuntimeRecord).actionIds as readonly unknown[], 'DOSSIER_RECIPE_ACTION_IDS');
}
