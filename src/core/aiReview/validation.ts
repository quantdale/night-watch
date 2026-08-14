import {
  AI_BUG_DRAFT_OUTPUT_SCHEMA_VERSION,
  AI_BUG_DRAFT_SCHEMA_VERSION,
  AI_HUMAN_REVIEW_SCHEMA_VERSION,
  AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION,
  AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION,
  AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_ORACLE_SUGGESTION_OUTPUT_SCHEMA_VERSION,
  AI_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  AI_REVIEW_PROMPT_TEMPLATE_VERSION,
  AI_PROVIDER_ADAPTER_VERSION,
  PASS_AI_PRIVACY,
  ZERO_AI_SAFETY,
  type AiBugDraft,
  type AiBugDraftV1,
  type AiBugModelOutput,
  type AiBugReviewInput,
  type AiHumanReviewRecord,
  type AiHumanReviewRecordV1,
  type AiOracleModelOutput,
  type AiOracleReviewInput,
  type AiOracleSuggestion,
  type AiOracleSuggestionV1,
  type AiReadableReviewArtifact,
  type AiPrivacyVector,
  type AiSafetyVector,
} from './types';
import { digest, exactKeys, isRecord, parseJsonObject, assertBoundedString, assertEnum, assertNonNegativeInteger, assertOptionalString, assertSafeId, assertStringList, assertUniqueStrings, type UnknownRecord, SHA256_RE } from './util';
import type { AiReadyEvidencePackage, EvidenceLevel } from '../triage/types';

const EVIDENCE_LEVELS = ['L2', 'L3'] as const;
const SOURCE_RELEVANCE = ['DIRECT_CHANGE_RELEVANCE', 'SHARED_CHANGE_RELEVANCE', 'TRANSITIVE_CHANGE_RELEVANCE', 'NO_CURRENT_CHANGE_RELEVANCE', 'UNKNOWN'] as const;
const DIFFERENTIAL = ['UI_FAILURE_API_PASS', 'BROWSER_API_FAILURE_AGREE', 'BROWSER_API_DIVERGE', 'NOT_AVAILABLE'] as const;
const CHANGE_TYPES = ['add', 'modify', 'delete', 'rename'] as const;
const SAFE_BOUNDARIES = ['AUTH', 'ROUTER', 'UI_COMPONENT', 'CLIENT_STATE', 'API_CLIENT', 'API_TRANSPORT', 'BACKEND_HANDLER', 'PROTOCOL', 'RESOURCE_LOADING', 'UNKNOWN'] as const;

const SECRET_MARKER_RE = /(?:FAKE_AI_PASSWORD_|FAKE_AI_TOKEN_|FAKE_CUSTOMER_EMAIL_|FAKE_ACCOUNT_ID_|FAKE_COST_|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const RAW_DATA_KEY_RE = /^(?:password|passwd|secret|authorization|cookie|cookies|storage[_-]?state|token|tokens|request[_-]?body|response[_-]?body|raw[_-]?body|dom|screenshot|trace|customer[_-]?name|customer[_-]?email|account[_-]?id|payer[_-]?id|billing[_-]?group[_-]?id|financial[_-]?value|cost|amount)$/i;
const PII_VALUE_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:[$€£¥]\s*\d|\b(?:USD|EUR|JPY|PHP|SGD|AUD)\s*\d)/i;
const MODEL_CONTROL_LANGUAGE_RE = /(?:ignore\s+(?:all|the|previous)\s+(?:instructions?|rules?)|publish\s+(?:this|the)?\s*(?:bug|finding)?|send\s+to\s+slack|run\s+kubectl|query\s+(?:dynamodb|bigquery|spanner)|click\s+save|change\s+evidence(?:Level| level)\s+to\s+L[0-5]|mark\s+(?:root\s+cause|deployment)\s+verified|root\s+cause\s+is\b|(?:deployment|commit|source)\s+(?:commit\s+)?[A-Za-z0-9_-]+\s+caused|write\s+(?:a\s+)?patch|git\s+(?:commit|push)|ownerApproved|issueCreate|requestUrl|requestBody|selector|\b(?:shell|execute|submit|fill)\b|admitFinding|campaignResult|evidenceLevelOverride|publication|phase\s*6|\b(?:gcp|gke|kubernetes|aws\s+sts|dynamodb|bigquery|spanner)\b)/i;
const ORACLE_UNSAFE_LANGUAGE_RE = /(?:https?:\/\/|arbitrary\s+(?:url|endpoint|selector)|\b(?:url|endpoint|selector|click|fill|submit|shell|script|patch|code|command)\b|\b(?:write|update|delete|create|mutat(?:e|ion)|read-back|production|kubectl|dynamodb|bigquery|spanner|sql|slack|github|issue|publish|send)\b)/i;

function privacyScan(value: unknown, pathName = 'ai'): void {
  if (typeof value === 'string') {
    if (SECRET_MARKER_RE.test(value)) throw new Error(`AI_INPUT_PRIVACY_BLOCKED:${pathName}`);
    if (PII_VALUE_RE.test(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:' + pathName);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => privacyScan(item, `${pathName}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (RAW_DATA_KEY_RE.test(key)) {
        // These keys are allowed only in the fixed privacy vector. Any other
        // occurrence is raw-data-shaped input and fails closed.
        if (!['storageStatePersisted', 'tokensPersisted', 'cookiesPersisted', 'credentialsPersisted', 'rawBodiesPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'].includes(key)) {
          throw new Error(`AI_INPUT_PRIVACY_BLOCKED:${pathName}.${key}`);
        }
      }
      privacyScan(child, `${pathName}.${key}`);
    }
  }
}

function outputPrivacyScan(value: unknown, pathName = 'output'): void {
  if (typeof value === 'string') {
    if (SECRET_MARKER_RE.test(value)) throw new Error(`AI_OUTPUT_PRIVACY_BLOCKED:${pathName}`);
    if (PII_VALUE_RE.test(value)) throw new Error('AI_OUTPUT_PRIVACY_BLOCKED:' + pathName);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => outputPrivacyScan(item, `${pathName}[${index}]`));
    return;
  }
  if (isRecord(value)) for (const [key, child] of Object.entries(value)) outputPrivacyScan(child, `${pathName}.${key}`);
}

function scanModelLanguage(value: unknown, code: 'AI_OUTPUT_SCHEMA_INVALID' | 'AI_OUTPUT_PRIVACY_BLOCKED' = 'AI_OUTPUT_SCHEMA_INVALID'): void {
  if (typeof value === 'string') {
    if (value.includes('```') || /\bsource\s+code\b/i.test(value) || MODEL_CONTROL_LANGUAGE_RE.test(value)) throw new Error(`${code}:CONTROL_LANGUAGE`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanModelLanguage(item, code));
    return;
  }
  if (isRecord(value)) for (const child of Object.values(value)) scanModelLanguage(child, code);
}

function assertZeroSafety(value: unknown): asserts value is AiSafetyVector {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:SAFETY_VECTOR');
  exactKeys(value, Object.keys(ZERO_AI_SAFETY), 'AI_INPUT_PRIVACY_BLOCKED:SAFETY_KEYS');
  for (const [key, item] of Object.entries(value)) {
    assertNonNegativeInteger(item, `safety.${key}`, 0, 'AI_INPUT_PRIVACY_BLOCKED');
  }
}

function assertPassPrivacy(value: unknown): asserts value is AiPrivacyVector {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:PRIVACY_VECTOR');
  exactKeys(value, Object.keys(PASS_AI_PRIVACY), 'AI_INPUT_PRIVACY_BLOCKED:PRIVACY_KEYS');
  if (value.result !== 'PASS') throw new Error('AI_INPUT_PRIVACY_BLOCKED:PRIVACY_RESULT');
  for (const [key, item] of Object.entries(value)) if (key !== 'result' && item !== false) throw new Error(`AI_INPUT_PRIVACY_BLOCKED:${key}`);
}

function assertDate(value: unknown, field: string, code = 'AI_OUTPUT_SCHEMA_INVALID'): void {
  assertBoundedString(value, field, 80, code);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${code}:${field}`);
}

function assertDigest(value: unknown, field: string, code = 'AI_OUTPUT_SCHEMA_INVALID'): void {
  assertBoundedString(value, field, 80, code);
  if (!SHA256_RE.test(value)) throw new Error(`${code}:${field}`);
}

function assertReferenceSubset(references: readonly string[], allowed: readonly string[], code: string): void {
  const set = new Set(allowed);
  if (references.some((reference) => !set.has(reference))) throw new Error(code);
}

function assertExactStringArray(value: unknown, expected: readonly string[], code: string): void {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) throw new Error(code);
}

export function validateAiReadyEvidencePackage(value: unknown): AiReadyEvidencePackage {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_PACKAGE');
  exactKeys(value, ['schemaVersion', 'deterministic', 'evidence', 'allowedUses', 'oracleAuthority', 'prohibitedUses'], 'AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_KEYS');
  if (value.schemaVersion !== 'nightwatch.ai-ready-evidence.private.v1' || value.deterministic !== true || value.oracleAuthority !== 'DETERMINISTIC_NIGHTWATCH_ONLY') throw new Error('AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_IDENTITY');
  const evidence = value.evidence;
  if (!isRecord(evidence)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_EVIDENCE');
  exactKeys(evidence, ['candidateId', 'title', 'routeClass', 'apiOperationFamily', 'oracleFingerprint', 'minimalSequence', 'confidence', 'faultBoundary', 'sourceCandidateCount'], 'AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_EVIDENCE_KEYS');
  assertSafeId(evidence.candidateId, 'upstream.evidence.candidateId', 200, 'AI_INPUT_PRIVACY_BLOCKED');
  assertBoundedString(evidence.title, 'upstream.evidence.title', 400, 'AI_INPUT_PRIVACY_BLOCKED');
  assertSafeId(evidence.routeClass, 'upstream.evidence.routeClass', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertOptionalString(evidence.apiOperationFamily, 'upstream.evidence.apiOperationFamily', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertSafeId(evidence.oracleFingerprint, 'upstream.evidence.oracleFingerprint', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(evidence.minimalSequence, 'upstream.evidence.minimalSequence', 64, 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(evidence.confidence, ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'], 'upstream.evidence.confidence', 'AI_INPUT_PRIVACY_BLOCKED');
  assertSafeId(evidence.faultBoundary, 'upstream.evidence.faultBoundary', 80, 'AI_INPUT_PRIVACY_BLOCKED');
  assertNonNegativeInteger(evidence.sourceCandidateCount, 'upstream.evidence.sourceCandidateCount', 100, 'AI_INPUT_PRIVACY_BLOCKED');
  assertExactStringArray(value.allowedUses, ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'], 'AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_ALLOWED_USES');
  assertExactStringArray(value.prohibitedUses, ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'], 'AI_INPUT_PRIVACY_BLOCKED:UPSTREAM_PROHIBITED_USES');
  privacyScan(value);
  return value as unknown as AiReadyEvidencePackage;
}

function validateFacts(value: unknown): AiBugReviewInput['facts'] {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:FACTS');
  exactKeys(value, ['candidateId', 'evidenceLevel', 'routeClass', 'apiOperationFamily', 'oracleFingerprint', 'sourceRelevance', 'deploymentStatus', 'technicalSeverity', 'triagePriority', 'browserApiStatus', 'deterministicFaultBoundary'], 'AI_INPUT_PRIVACY_BLOCKED:FACT_KEYS');
  assertSafeId(value.candidateId, 'facts.candidateId', 200, 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.evidenceLevel, EVIDENCE_LEVELS, 'facts.evidenceLevel', 'AI_INPUT_NOT_ELIGIBLE');
  assertSafeId(value.routeClass, 'facts.routeClass', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertOptionalString(value.apiOperationFamily, 'facts.apiOperationFamily', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertSafeId(value.oracleFingerprint, 'facts.oracleFingerprint', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.sourceRelevance, SOURCE_RELEVANCE, 'facts.sourceRelevance', 'AI_INPUT_PRIVACY_BLOCKED');
  if (value.deploymentStatus !== 'DEPLOYMENT_STATUS_UNRESOLVED') throw new Error('AI_INPUT_PRIVACY_BLOCKED:DEPLOYMENT_STATUS');
  assertEnum(value.technicalSeverity, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'], 'facts.technicalSeverity', 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.triagePriority, ['P0', 'P1', 'P2', 'P3', 'UNRANKED'], 'facts.triagePriority', 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.browserApiStatus, DIFFERENTIAL, 'facts.browserApiStatus', 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.deterministicFaultBoundary, SAFE_BOUNDARIES, 'facts.deterministicFaultBoundary', 'AI_INPUT_PRIVACY_BLOCKED');
  return value as unknown as AiBugReviewInput['facts'];
}

function validateBugInputShape(value: UnknownRecord): AiBugReviewInput {
  exactKeys(value, ['schemaVersion', 'kind', 'inputPackageId', 'inputPackageDigest', 'dossierVersion', 'upstreamPackage', 'facts', 'evidenceRefs', 'sourceRefs', 'sourceSnapshotRefs', 'availableEvidenceRefs', 'availableSourceRefs', 'structuralEvidence', 'privacy', 'safety'], 'AI_INPUT_PRIVACY_BLOCKED:INPUT_KEYS');
  if (value.schemaVersion !== AI_REVIEW_INPUT_SCHEMA_VERSION || value.kind !== 'BUG_CANDIDATE') throw new Error('AI_INPUT_PRIVACY_BLOCKED:INPUT_IDENTITY');
  assertSafeId(value.inputPackageId, 'inputPackageId', 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertDigest(value.inputPackageDigest, 'inputPackageDigest', 'AI_INPUT_PRIVACY_BLOCKED');
  if (value.dossierVersion !== 'nightwatch.bug-dossier.private.v1') throw new Error('AI_INPUT_PRIVACY_BLOCKED:DOSSIER_VERSION');
  const upstream = validateAiReadyEvidencePackage(value.upstreamPackage);
  const facts = validateFacts(value.facts);
  if (facts.candidateId !== upstream.evidence.candidateId) throw new Error('AI_INPUT_PRIVACY_BLOCKED:IMMUTABLE_CANDIDATE');
  assertUniqueStrings(value.evidenceRefs, 'evidenceRefs', 64, 200, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.sourceRefs, 'sourceRefs', 64, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.sourceSnapshotRefs, 'sourceSnapshotRefs', 64, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.availableEvidenceRefs, 'availableEvidenceRefs', 128, 200, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.availableSourceRefs, 'availableSourceRefs', 128, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertReferenceSubset(value.evidenceRefs as readonly string[], value.availableEvidenceRefs as readonly string[], 'AI_INPUT_PRIVACY_BLOCKED:EVIDENCE_REFS');
  assertReferenceSubset(value.sourceRefs as readonly string[], value.availableSourceRefs as readonly string[], 'AI_INPUT_PRIVACY_BLOCKED:SOURCE_REFS');
  if (!isRecord(value.structuralEvidence)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:STRUCTURAL_EVIDENCE');
  exactKeys(value.structuralEvidence, ['title', 'minimalActionIds', 'routeClass', 'apiOperationFamily', 'browserApiStatus', 'sourceRelevance', 'uncertaintyClasses'], 'AI_INPUT_PRIVACY_BLOCKED:STRUCTURAL_KEYS');
  assertBoundedString(value.structuralEvidence.title, 'structuralEvidence.title', 400, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.structuralEvidence.minimalActionIds, 'structuralEvidence.minimalActionIds', 64, 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertSafeId(value.structuralEvidence.routeClass, 'structuralEvidence.routeClass', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertOptionalString(value.structuralEvidence.apiOperationFamily, 'structuralEvidence.apiOperationFamily', 160, 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.structuralEvidence.browserApiStatus, DIFFERENTIAL, 'structuralEvidence.browserApiStatus', 'AI_INPUT_PRIVACY_BLOCKED');
  assertEnum(value.structuralEvidence.sourceRelevance, SOURCE_RELEVANCE, 'structuralEvidence.sourceRelevance', 'AI_INPUT_PRIVACY_BLOCKED');
  assertStringList(value.structuralEvidence.uncertaintyClasses, 'structuralEvidence.uncertaintyClasses', 32, 160, 'AI_INPUT_PRIVACY_BLOCKED');
  if ((value.structuralEvidence.uncertaintyClasses as readonly string[]).some((item) => /^TRANSIENT(?:_|$)/i.test(item))) throw new Error('AI_INPUT_NOT_ELIGIBLE:TRANSIENT');
  assertPassPrivacy(value.privacy);
  assertZeroSafety(value.safety);
  privacyScan(value);
  const payload = { ...value, inputPackageId: null, inputPackageDigest: null };
  if (value.inputPackageDigest !== digest(payload)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:INPUT_DIGEST');
  if (value.inputPackageId !== `ai-input:${value.inputPackageDigest}`) throw new Error('AI_INPUT_PRIVACY_BLOCKED:INPUT_ID');
  return value as unknown as AiBugReviewInput;
}

function validateOracleInputShape(value: UnknownRecord): AiOracleReviewInput {
  exactKeys(value, ['schemaVersion', 'kind', 'inputChangePackageId', 'inputChangePackageDigest', 'changeEvidenceRefs', 'sourceSnapshotRefs', 'affectedSurfaces', 'structuralChanges', 'knownDeterministicInvariants', 'missingCoverageClasses', 'privacy', 'safety'], 'AI_INPUT_PRIVACY_BLOCKED:ORACLE_INPUT_KEYS');
  if (value.schemaVersion !== AI_REVIEW_INPUT_SCHEMA_VERSION || value.kind !== 'ORACLE_SUGGESTION') throw new Error('AI_INPUT_PRIVACY_BLOCKED:ORACLE_INPUT_IDENTITY');
  assertSafeId(value.inputChangePackageId, 'inputChangePackageId', 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertDigest(value.inputChangePackageDigest, 'inputChangePackageDigest', 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.changeEvidenceRefs, 'changeEvidenceRefs', 128, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.sourceSnapshotRefs, 'sourceSnapshotRefs', 128, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertUniqueStrings(value.affectedSurfaces, 'affectedSurfaces', 32, 160, 'AI_INPUT_PRIVACY_BLOCKED');
  if (!Array.isArray(value.structuralChanges) || value.structuralChanges.length > 128) throw new Error('AI_INPUT_PRIVACY_BLOCKED:STRUCTURAL_CHANGES');
  for (const item of value.structuralChanges) {
    if (!isRecord(item)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:STRUCTURAL_CHANGE');
    exactKeys(item, ['changeRef', 'repoId', 'path', 'changeType', 'dependencyEdgeIds', 'affectedJourneyIds', 'affectedApiFamilies', 'sourceRelevance'], 'AI_INPUT_PRIVACY_BLOCKED:STRUCTURAL_CHANGE_KEYS');
    assertSafeId(item.changeRef, 'structuralChange.changeRef', 240, 'AI_INPUT_PRIVACY_BLOCKED');
    assertSafeId(item.repoId, 'structuralChange.repoId', 160, 'AI_INPUT_PRIVACY_BLOCKED');
    assertSafeId(item.path, 'structuralChange.path', 240, 'AI_INPUT_PRIVACY_BLOCKED');
    assertEnum(item.changeType, CHANGE_TYPES, 'structuralChange.changeType', 'AI_INPUT_PRIVACY_BLOCKED');
    assertUniqueStrings(item.dependencyEdgeIds, 'structuralChange.dependencyEdgeIds', 32, 160, 'AI_INPUT_PRIVACY_BLOCKED');
    assertUniqueStrings(item.affectedJourneyIds, 'structuralChange.affectedJourneyIds', 16, 160, 'AI_INPUT_PRIVACY_BLOCKED');
    assertUniqueStrings(item.affectedApiFamilies, 'structuralChange.affectedApiFamilies', 16, 160, 'AI_INPUT_PRIVACY_BLOCKED');
    assertEnum(item.sourceRelevance, SOURCE_RELEVANCE, 'structuralChange.sourceRelevance', 'AI_INPUT_PRIVACY_BLOCKED');
  }
  assertStringList(value.knownDeterministicInvariants, 'knownDeterministicInvariants', 64, 320, 'AI_INPUT_PRIVACY_BLOCKED');
  assertStringList(value.missingCoverageClasses, 'missingCoverageClasses', 64, 240, 'AI_INPUT_PRIVACY_BLOCKED');
  assertPassPrivacy(value.privacy);
  assertZeroSafety(value.safety);
  privacyScan(value);
  const payload = { ...value, inputChangePackageId: null, inputChangePackageDigest: null };
  if (value.inputChangePackageDigest !== digest(payload)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:ORACLE_INPUT_DIGEST');
  if (value.inputChangePackageId !== `change-input:${value.inputChangePackageDigest}`) throw new Error('AI_INPUT_PRIVACY_BLOCKED:ORACLE_INPUT_ID');
  return value as unknown as AiOracleReviewInput;
}

export function validateAiBugReviewInput(value: unknown): AiBugReviewInput {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:INPUT_RECORD');
  return validateBugInputShape(value);
}

export function validateAiOracleReviewInput(value: unknown): AiOracleReviewInput {
  if (!isRecord(value)) throw new Error('AI_INPUT_PRIVACY_BLOCKED:ORACLE_INPUT_RECORD');
  return validateOracleInputShape(value);
}

function validateHypotheses(value: unknown, allowedEvidenceRefs: readonly string[]): AiBugModelOutput['hypotheses'] {
  if (!Array.isArray(value) || value.length > 8) throw new Error('AI_OUTPUT_SCHEMA_INVALID:hypotheses');
  return value.map((item) => {
    if (!isRecord(item)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:hypothesis');
    exactKeys(item, ['label', 'text', 'supportingEvidenceRefs', 'contradictingEvidenceRefs', 'whatWouldDiscriminate'], 'AI_OUTPUT_SCHEMA_INVALID:hypothesis_keys');
    if (item.label !== 'UNVERIFIED_HYPOTHESIS') throw new Error('AI_OUTPUT_SCHEMA_INVALID:hypothesis_label');
    assertBoundedString(item.text, 'hypothesis.text', 1_000);
    assertUniqueStrings(item.supportingEvidenceRefs, 'hypothesis.supportingEvidenceRefs', 32, 200);
    assertUniqueStrings(item.contradictingEvidenceRefs, 'hypothesis.contradictingEvidenceRefs', 32, 200);
    assertReferenceSubset(item.supportingEvidenceRefs as readonly string[], allowedEvidenceRefs, 'AI_OUTPUT_REFERENCE_INVALID:supporting');
    assertReferenceSubset(item.contradictingEvidenceRefs as readonly string[], allowedEvidenceRefs, 'AI_OUTPUT_REFERENCE_INVALID:contradicting');
    assertBoundedString(item.whatWouldDiscriminate, 'hypothesis.whatWouldDiscriminate', 800);
    scanModelLanguage(item);
    return item as unknown as AiBugModelOutput['hypotheses'][number];
  });
}

export function validateAiBugModelOutput(value: unknown): AiBugModelOutput {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:record');
  exactKeys(value, ['schemaVersion', 'candidateId', 'inputPackageId', 'inputPackageDigest', 'evidenceLevelAtGeneration', 'summaryDraft', 'reproductionDraft', 'observedBehaviorDraft', 'expectedBehaviorDraft', 'impactDraft', 'hypotheses', 'evidenceRefs', 'sourceRefs', 'uncertainties'], 'AI_OUTPUT_SCHEMA_INVALID:keys');
  if (value.schemaVersion !== AI_BUG_DRAFT_OUTPUT_SCHEMA_VERSION) throw new Error('AI_OUTPUT_SCHEMA_INVALID:version');
  assertSafeId(value.candidateId, 'candidateId');
  assertSafeId(value.inputPackageId, 'inputPackageId', 240);
  assertDigest(value.inputPackageDigest, 'inputPackageDigest');
  assertEnum(value.evidenceLevelAtGeneration, EVIDENCE_LEVELS, 'evidenceLevelAtGeneration');
  for (const field of ['summaryDraft', 'reproductionDraft', 'observedBehaviorDraft', 'expectedBehaviorDraft', 'impactDraft']) assertBoundedString(value[field], field, 2_000);
  assertUniqueStrings(value.evidenceRefs, 'evidenceRefs', 64, 200);
  assertUniqueStrings(value.sourceRefs, 'sourceRefs', 64, 240);
  assertStringList(value.uncertainties, 'uncertainties', 32, 800);
  if ((value.uncertainties as readonly string[]).length === 0) throw new Error('AI_OUTPUT_SCHEMA_INVALID:uncertainties_required');
  const hypotheses = validateHypotheses(value.hypotheses, value.evidenceRefs as readonly string[]);
  outputPrivacyScan(value);
  scanModelLanguage({ ...value, hypotheses });
  return { ...value, hypotheses } as unknown as AiBugModelOutput;
}

export function validateAiOracleModelOutput(value: unknown): AiOracleModelOutput {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:oracle_record');
  exactKeys(value, ['schemaVersion', 'inputChangePackageId', 'changeEvidenceRefs', 'sourceSnapshotRefs', 'affectedSurface', 'proposedInvariant', 'proposedObservationClasses', 'rationale', 'possibleFalsePositiveModes', 'requiredDeterministicEvidence', 'requiredFixtureCoverage', 'riskNotes'], 'AI_OUTPUT_SCHEMA_INVALID:oracle_keys');
  if (value.schemaVersion !== AI_ORACLE_SUGGESTION_OUTPUT_SCHEMA_VERSION) throw new Error('AI_OUTPUT_SCHEMA_INVALID:oracle_version');
  assertSafeId(value.inputChangePackageId, 'inputChangePackageId', 240);
  assertUniqueStrings(value.changeEvidenceRefs, 'changeEvidenceRefs', 128, 240);
  assertUniqueStrings(value.sourceSnapshotRefs, 'sourceSnapshotRefs', 128, 240);
  assertSafeId(value.affectedSurface, 'affectedSurface', 160);
  for (const field of ['proposedInvariant', 'rationale']) assertBoundedString(value[field], field, 1_600);
  assertStringList(value.proposedObservationClasses, 'proposedObservationClasses', 16, 240);
  assertStringList(value.possibleFalsePositiveModes, 'possibleFalsePositiveModes', 16, 600);
  assertStringList(value.requiredDeterministicEvidence, 'requiredDeterministicEvidence', 32, 600);
  assertStringList(value.requiredFixtureCoverage, 'requiredFixtureCoverage', 32, 600);
  assertStringList(value.riskNotes, 'riskNotes', 16, 600);
  if ((value.riskNotes as readonly string[]).length === 0 || (value.requiredDeterministicEvidence as readonly string[]).length === 0 || (value.requiredFixtureCoverage as readonly string[]).length === 0) throw new Error('AI_OUTPUT_SCHEMA_INVALID:oracle_review_fields_required');
  outputPrivacyScan(value);
  for (const field of ['affectedSurface', 'proposedInvariant', 'proposedObservationClasses', 'rationale', 'possibleFalsePositiveModes', 'requiredDeterministicEvidence', 'requiredFixtureCoverage', 'riskNotes']) {
    const item = value[field];
    const items = Array.isArray(item) ? item : [item];
    if (items.some((entry) => typeof entry === 'string' && ORACLE_UNSAFE_LANGUAGE_RE.test(entry))) throw new Error('AI_OUTPUT_SCHEMA_INVALID:UNSAFE_ORACLE_PROPOSAL');
  }
  return value as unknown as AiOracleModelOutput;
}

function validateCommonDraftVectors(value: UnknownRecord): void {
  if (!isRecord(value.safety) || !isRecord(value.privacy)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:vectors');
  exactKeys(value.safety, Object.keys(ZERO_AI_SAFETY), 'AI_OUTPUT_SCHEMA_INVALID:safety_keys');
  exactKeys(value.privacy, Object.keys(PASS_AI_PRIVACY), 'AI_OUTPUT_SCHEMA_INVALID:privacy_keys');
  assertZeroSafety(value.safety);
  assertPassPrivacy(value.privacy);
}

const ARTIFACT_KEYS = ['schemaVersion', 'draftId', 'inputPackageId', 'inputPackageDigest', 'candidateId', 'evidenceLevelAtGeneration', 'modelProviderClass', 'modelIdentifier', 'modelInvocationId', 'promptTemplateVersion', 'inputSchemaVersion', 'providerAdapterVersion', 'dossierVersion', 'generatedAt', 'status', 'provenanceLabel', 'summaryDraft', 'reproductionDraft', 'observedBehaviorDraft', 'expectedBehaviorDraft', 'impactDraft', 'hypotheses', 'evidenceRefs', 'sourceRefs', 'sourceSnapshotRefs', 'uncertainties', 'humanReviewRequired', 'externalPublication', 'safety', 'privacy', 'responseDigest'] as const;
const ORACLE_KEYS = ['schemaVersion', 'suggestionId', 'inputChangePackageId', 'inputChangePackageDigest', 'modelProviderClass', 'modelIdentifier', 'modelInvocationId', 'promptTemplateVersion', 'inputSchemaVersion', 'providerAdapterVersion', 'generatedAt', 'changeEvidenceRefs', 'sourceSnapshotRefs', 'affectedSurface', 'proposedInvariant', 'proposedObservationClasses', 'rationale', 'possibleFalsePositiveModes', 'requiredDeterministicEvidence', 'requiredFixtureCoverage', 'riskNotes', 'humanReviewRequired', 'executable', 'status', 'provenanceLabel', 'externalPublication', 'safety', 'privacy', 'responseDigest'] as const;

function validateBugDraftFields(value: UnknownRecord, schemaVersion: string, statuses: readonly string[]): void {
  exactKeys(value, ARTIFACT_KEYS, 'AI_OUTPUT_SCHEMA_INVALID:draft_keys');
  if (value.schemaVersion !== schemaVersion) throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_version');
  assertSafeId(value.draftId, 'draftId', 240);
  assertSafeId(value.inputPackageId, 'inputPackageId', 240);
  assertDigest(value.inputPackageDigest, 'inputPackageDigest');
  assertSafeId(value.candidateId, 'candidateId');
  assertEnum(value.evidenceLevelAtGeneration, EVIDENCE_LEVELS, 'evidenceLevelAtGeneration');
  assertEnum(value.modelProviderClass, ['SYNTHETIC_LOCAL', 'LOOPBACK_LOCAL'], 'modelProviderClass');
  assertSafeId(value.modelIdentifier, 'modelIdentifier', 120);
  assertSafeId(value.modelInvocationId, 'modelInvocationId', 240);
  if (value.promptTemplateVersion !== AI_REVIEW_PROMPT_TEMPLATE_VERSION || value.inputSchemaVersion !== AI_REVIEW_INPUT_SCHEMA_VERSION || value.dossierVersion !== 'nightwatch.bug-dossier.private.v1') throw new Error('AI_OUTPUT_SCHEMA_INVALID:provenance');
  assertBoundedString(value.providerAdapterVersion, 'providerAdapterVersion', 120);
  assertProviderAdapterVersion(value.providerAdapterVersion);
  assertDate(value.generatedAt, 'generatedAt');
  assertEnum(value.status, statuses, 'status');
  if (value.provenanceLabel !== 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED' || value.humanReviewRequired !== true || value.externalPublication !== 'PROHIBITED') throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_boundary');
  for (const field of ['summaryDraft', 'reproductionDraft', 'observedBehaviorDraft', 'expectedBehaviorDraft', 'impactDraft']) assertBoundedString(value[field], field, 2_000);
  assertUniqueStrings(value.evidenceRefs, 'evidenceRefs', 64, 200);
  assertUniqueStrings(value.sourceRefs, 'sourceRefs', 64, 240);
  assertUniqueStrings(value.sourceSnapshotRefs, 'sourceSnapshotRefs', 64, 240);
  assertStringList(value.uncertainties, 'uncertainties', 32, 800);
  validateHypotheses(value.hypotheses, value.evidenceRefs as readonly string[]);
  validateCommonDraftVectors(value);
  assertDigest(value.responseDigest, 'responseDigest');
  if (value.draftId !== `draft:${digest({ schemaVersion, inputPackageDigest: value.inputPackageDigest, providerClass: value.modelProviderClass, modelIdentifier: value.modelIdentifier, promptTemplateVersion: value.promptTemplateVersion, inputSchemaVersion: value.inputSchemaVersion, responseDigest: value.responseDigest })}`) throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_identity');
  if (value.modelInvocationId !== `invocation:${digest({ inputPackageDigest: value.inputPackageDigest, providerClass: value.modelProviderClass, modelIdentifier: value.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, responseDigest: value.responseDigest })}`) throw new Error('AI_OUTPUT_SCHEMA_INVALID:invocation_identity');
  outputPrivacyScan(value);
}

export function validateAiBugDraft(value: unknown): AiBugDraft {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_record');
  validateBugDraftFields(value, AI_BUG_DRAFT_SCHEMA_VERSION, ['AI_GENERATED_UNREVIEWED']);
  return value as unknown as AiBugDraft;
}

export function validateLegacyAiBugDraft(value: unknown): AiBugDraftV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_record');
  validateBugDraftFields(value, AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION, ['AI_GENERATED_UNREVIEWED', 'OWNER_APPROVED_DRAFT', 'OWNER_REJECTED', 'SUPERSEDED', 'INVALID']);
  return value as unknown as AiBugDraftV1;
}

function validateOracleFields(value: UnknownRecord, schemaVersion: string, statuses: readonly string[]): void {
  exactKeys(value, ORACLE_KEYS, 'AI_OUTPUT_SCHEMA_INVALID:suggestion_keys');
  if (value.schemaVersion !== schemaVersion) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_version');
  assertSafeId(value.suggestionId, 'suggestionId', 240);
  assertSafeId(value.inputChangePackageId, 'inputChangePackageId', 240);
  assertDigest(value.inputChangePackageDigest, 'inputChangePackageDigest');
  assertEnum(value.modelProviderClass, ['SYNTHETIC_LOCAL', 'LOOPBACK_LOCAL'], 'modelProviderClass');
  assertSafeId(value.modelIdentifier, 'modelIdentifier', 120);
  assertSafeId(value.modelInvocationId, 'modelInvocationId', 240);
  if (value.promptTemplateVersion !== AI_REVIEW_PROMPT_TEMPLATE_VERSION || value.inputSchemaVersion !== AI_REVIEW_INPUT_SCHEMA_VERSION) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_provenance');
  assertBoundedString(value.providerAdapterVersion, 'providerAdapterVersion', 120);
  assertProviderAdapterVersion(value.providerAdapterVersion);
  assertDate(value.generatedAt, 'generatedAt');
  assertUniqueStrings(value.changeEvidenceRefs, 'changeEvidenceRefs', 128, 240);
  assertUniqueStrings(value.sourceSnapshotRefs, 'sourceSnapshotRefs', 128, 240);
  assertSafeId(value.affectedSurface, 'affectedSurface', 160);
  for (const field of ['proposedInvariant', 'rationale']) assertBoundedString(value[field], field, 1_600);
  assertStringList(value.proposedObservationClasses, 'proposedObservationClasses', 16, 240);
  assertStringList(value.possibleFalsePositiveModes, 'possibleFalsePositiveModes', 16, 600);
  assertStringList(value.requiredDeterministicEvidence, 'requiredDeterministicEvidence', 32, 600);
  assertStringList(value.requiredFixtureCoverage, 'requiredFixtureCoverage', 32, 600);
  assertStringList(value.riskNotes, 'riskNotes', 16, 600);
  if ((value.riskNotes as readonly string[]).length === 0 || (value.requiredDeterministicEvidence as readonly string[]).length === 0 || (value.requiredFixtureCoverage as readonly string[]).length === 0) throw new Error('AI_OUTPUT_SCHEMA_INVALID:oracle_review_fields_required');
  if (value.humanReviewRequired !== true || value.executable !== false || value.externalPublication !== 'PROHIBITED') throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_boundary');
  assertEnum(value.status, statuses, 'status');
  if (value.provenanceLabel !== 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED') throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_label');
  validateCommonDraftVectors(value);
  assertDigest(value.responseDigest, 'responseDigest');
  if (value.suggestionId !== `suggestion:${digest({ schemaVersion, inputChangePackageDigest: value.inputChangePackageDigest, providerClass: value.modelProviderClass, modelIdentifier: value.modelIdentifier, promptTemplateVersion: value.promptTemplateVersion, inputSchemaVersion: value.inputSchemaVersion, responseDigest: value.responseDigest })}`) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_identity');
  if (value.modelInvocationId !== `invocation:${digest({ inputChangePackageDigest: value.inputChangePackageDigest, providerClass: value.modelProviderClass, modelIdentifier: value.modelIdentifier, promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION, responseDigest: value.responseDigest })}`) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_invocation_identity');
  outputPrivacyScan(value);
}

export function validateAiOracleSuggestion(value: unknown): AiOracleSuggestion {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_record');
  validateOracleFields(value, AI_ORACLE_SUGGESTION_SCHEMA_VERSION, ['AI_GENERATED_UNREVIEWED']);
  return value as unknown as AiOracleSuggestion;
}

export function validateLegacyAiOracleSuggestion(value: unknown): AiOracleSuggestionV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_record');
  validateOracleFields(value, AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION, ['AI_GENERATED_UNREVIEWED', 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW', 'OWNER_REJECTED', 'SUPERSEDED', 'INVALID']);
  return value as unknown as AiOracleSuggestionV1;
}

export function validateAnyAiBugDraft(value: unknown): AiBugDraft | AiBugDraftV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_record');
  if (value.schemaVersion === AI_BUG_DRAFT_SCHEMA_VERSION) return validateAiBugDraft(value);
  if (value.schemaVersion === AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION) return validateLegacyAiBugDraft(value);
  throw new Error('AI_OUTPUT_SCHEMA_INVALID:draft_version');
}

export function validateAnyAiOracleSuggestion(value: unknown): AiOracleSuggestion | AiOracleSuggestionV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_record');
  if (value.schemaVersion === AI_ORACLE_SUGGESTION_SCHEMA_VERSION) return validateAiOracleSuggestion(value);
  if (value.schemaVersion === AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION) return validateLegacyAiOracleSuggestion(value);
  throw new Error('AI_OUTPUT_SCHEMA_INVALID:suggestion_version');
}

export function validateAiHumanReviewRecord(value: unknown): AiHumanReviewRecord {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_record');
  exactKeys(value, ['schemaVersion', 'reviewId', 'artifactId', 'artifactKind', 'artifactSchemaVersion', 'decision', 'reviewedAt', 'reviewerClass', 'notes', 'artifactDigest', 'reviewSchemaVersion', 'publication'], 'AI_OUTPUT_SCHEMA_INVALID:review_keys');
  if (value.schemaVersion !== AI_HUMAN_REVIEW_SCHEMA_VERSION || value.reviewSchemaVersion !== AI_HUMAN_REVIEW_SCHEMA_VERSION) throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_version');
  assertSafeId(value.reviewId, 'reviewId', 280);
  assertSafeId(value.artifactId, 'artifactId', 240);
  assertEnum(value.artifactKind, ['BUG_DRAFT', 'ORACLE_SUGGESTION'], 'artifactKind');
  assertEnum(value.artifactSchemaVersion, [AI_BUG_DRAFT_SCHEMA_VERSION, AI_ORACLE_SUGGESTION_SCHEMA_VERSION], 'artifactSchemaVersion');
  assertEnum(value.decision, ['APPROVE_DRAFT', 'REJECT', 'SUPERSEDE'], 'decision');
  assertDate(value.reviewedAt, 'reviewedAt');
  if (value.reviewerClass !== 'OWNER' || value.publication !== 'PROHIBITED') throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_boundary');
  assertBoundedString(value.notes, 'notes', 2_000);
  assertDigest(value.artifactDigest, 'artifactDigest');
  const identity = digest({ schemaVersion: value.schemaVersion, artifactId: value.artifactId, artifactKind: value.artifactKind, artifactSchemaVersion: value.artifactSchemaVersion, decision: value.decision, reviewedAt: value.reviewedAt, reviewerClass: value.reviewerClass, notes: value.notes, artifactDigest: value.artifactDigest, reviewSchemaVersion: value.reviewSchemaVersion, publication: value.publication });
  if (value.reviewId !== `review:${identity}`) throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_identity');
  outputPrivacyScan(value);
  return value as unknown as AiHumanReviewRecord;
}

export function validateLegacyAiHumanReviewRecord(value: unknown): AiHumanReviewRecordV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_record');
  exactKeys(value, ['schemaVersion', 'artifactId', 'artifactKind', 'decision', 'reviewedAt', 'reviewerClass', 'notes', 'artifactDigest', 'reviewSchemaVersion', 'publication'], 'AI_OUTPUT_SCHEMA_INVALID:legacy_review_keys');
  if (value.schemaVersion !== AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION || value.reviewSchemaVersion !== AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION) throw new Error('AI_OUTPUT_SCHEMA_INVALID:legacy_review_version');
  assertSafeId(value.artifactId, 'artifactId', 240);
  assertEnum(value.artifactKind, ['BUG_DRAFT', 'ORACLE_SUGGESTION'], 'artifactKind');
  assertEnum(value.decision, ['APPROVE_DRAFT', 'REJECT', 'SUPERSEDE'], 'decision');
  assertDate(value.reviewedAt, 'reviewedAt');
  if (value.reviewerClass !== 'OWNER' || value.publication !== 'PROHIBITED') throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_boundary');
  assertBoundedString(value.notes, 'notes', 2_000);
  assertDigest(value.artifactDigest, 'artifactDigest');
  outputPrivacyScan(value);
  return value as unknown as AiHumanReviewRecordV1;
}

export function validateAnyAiHumanReviewRecord(value: unknown): AiHumanReviewRecord | AiHumanReviewRecordV1 {
  if (!isRecord(value)) throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_record');
  if (value.schemaVersion === AI_HUMAN_REVIEW_SCHEMA_VERSION) return validateAiHumanReviewRecord(value);
  if (value.schemaVersion === AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION) return validateLegacyAiHumanReviewRecord(value);
  throw new Error('AI_OUTPUT_SCHEMA_INVALID:review_version');
}

export function parseAndValidateBugModelOutput(value: string | Uint8Array): AiBugModelOutput {
  return validateAiBugModelOutput(parseJsonObject(value, 32 * 1024));
}

export function parseAndValidateOracleModelOutput(value: string | Uint8Array): AiOracleModelOutput {
  return validateAiOracleModelOutput(parseJsonObject(value, 32 * 1024));
}

export function assertProviderAdapterVersion(value: string): void {
  if (value !== AI_PROVIDER_ADAPTER_VERSION && !/^nightwatch\.ai-provider-adapter\.private\.v1(?:\.[A-Za-z0-9_.-]+)?$/.test(value)) throw new Error('AI_PROVIDER_NOT_LOCAL');
}

export function assertBugInputFreshForDraft(draft: AiBugDraft | AiBugDraftV1, input: AiBugReviewInput): void {
  if (draft.inputPackageId !== input.inputPackageId || draft.inputPackageDigest !== input.inputPackageDigest || draft.candidateId !== input.facts.candidateId || draft.evidenceLevelAtGeneration !== input.facts.evidenceLevel || draft.dossierVersion !== input.dossierVersion || draft.promptTemplateVersion !== AI_REVIEW_PROMPT_TEMPLATE_VERSION || draft.inputSchemaVersion !== AI_REVIEW_INPUT_SCHEMA_VERSION || draft.sourceSnapshotRefs.join('|') !== input.sourceSnapshotRefs.join('|') || draft.evidenceRefs.some((reference) => !input.availableEvidenceRefs.includes(reference)) || draft.sourceRefs.some((reference) => !input.availableSourceRefs.includes(reference))) throw new Error('AI_ARTIFACT_STALE');
}

export function assertOracleFreshForSuggestion(suggestion: AiOracleSuggestion | AiOracleSuggestionV1, input: AiOracleReviewInput): void {
  if (suggestion.inputChangePackageId !== input.inputChangePackageId || suggestion.inputChangePackageDigest !== input.inputChangePackageDigest || suggestion.changeEvidenceRefs.some((reference) => !input.changeEvidenceRefs.includes(reference)) || suggestion.sourceSnapshotRefs.some((reference) => !input.sourceSnapshotRefs.includes(reference)) || !input.affectedSurfaces.includes(suggestion.affectedSurface)) throw new Error('AI_ARTIFACT_STALE');
}

export function zeroSafety(value: AiSafetyVector): boolean {
  return Object.entries(value).every(([, item]) => item === 0);
}

export function passPrivacy(value: AiPrivacyVector): boolean {
  return value.result === 'PASS' && Object.entries(value).filter(([key]) => key !== 'result').every(([, item]) => item === false);
}
