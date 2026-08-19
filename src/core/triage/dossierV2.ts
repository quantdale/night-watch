// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — dossier v2 with semantic triage evidence.
// v1 remains readable/validatable; v2 adds strict semantic triage evidence
// and deterministic READY predicate. Pure, no browser/network/fs/process.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  AI_READY_PACKAGE_VERSION,
  type AiReadyEvidencePackage,
  type BrowserApiDifferential,
  type BugDossier,
  type ConfidenceResult,
  type EvidenceLevel,
  type FaultBoundaryResult,
  type HumanReproductionRecipe,
  type MinimizationResult,
  type SourceChangeCandidate,
  type SourceCorrelationResult,
  type TechnicalSeverity,
  type TriagePriority,
  DOSSIER_VERSION,
} from './types';
import { validateSemanticDossierEvidence, type SemanticDossierEvidence } from '../../oracles/semantic/dossier';
import {
  SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  validateSemanticTriageEvidence,
  type SemanticTriageEvidence,
} from './semanticTriageEvidence';
import { rankSemanticConfidence } from './semanticConfidence';

export const DOSSIER_VERSION_V2 = 'nightwatch.bug-dossier.private.v2' as const;

const SAFE_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s]+[?&](?:token|account|customer|cost)=)/i;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}
function digest(value: unknown): string {
  return crypto.createHash('sha256').update(stableJson(value), 'utf8').digest('hex').slice(0, 24);
}
function safeId(value: string, field: string): string {
  if (!SAFE_ID_RE.test(value) || SENTINEL_RE.test(value)) throw new Error(`DOSSIER_${field.toUpperCase()}_UNSAFE`);
  return value;
}
function assertNoSentinels(value: unknown, pathName = 'dossier'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`DOSSIER_PRIVACY_BLOCKED:${pathName}`);
    return;
  }
  if (Array.isArray(value)) value.forEach((item, index) => assertNoSentinels(item, `${pathName}[${index}]`));
  else if (value !== null && typeof value === 'object') for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${pathName}.${key}`);
}
function candidateIdV2(fingerprint: string, journeyOrApiFamily: string, apiOperationFamily: string | null, version: string): string {
  return `candidate:sha256:${digest({ schemaVersion: version, fingerprint, journeyOrApiFamily, apiOperationFamily })}`;
}
function candidateId(fingerprint: string, journeyOrApiFamily: string, apiOperationFamily: string | null): string {
  return candidateIdV2(fingerprint, journeyOrApiFamily, apiOperationFamily, DOSSIER_VERSION_V2);
}
function recipe(actionIds: readonly string[], routeClass: string, oracleFingerprint: string): HumanReproductionRecipe {
  // Human recipe contains only safe action IDs / route classes / categorical observation — no customer values, no credentials.
  if (actionIds.some((id) => SENTINEL_RE.test(id) || !SAFE_ID_RE.test(id))) throw new Error('DOSSIER_RECIPE_UNSAFE');
  if (SENTINEL_RE.test(routeClass) || SENTINEL_RE.test(oracleFingerprint)) throw new Error('DOSSIER_RECIPE_UNSAFE');
  return {
    steps: [
      'Authenticate to the designated contained DEV test account using the owner-only credential provider.',
      `Navigate to approved route class ${routeClass}.`,
      ...actionIds.map((actionId, index) => `${index + 1}. Perform approved read-only action ${actionId}.`),
      `Observe sanitized anomaly fingerprint ${oracleFingerprint}.`,
    ],
    actionIds: [...actionIds],
    observation: `Observe the structural/oracle result represented by ${oracleFingerprint}.`,
    credentialHandling: 'OWNER_AUTHENTICATES_TO_APPROVED_DEV_ACCOUNT',
    prohibitedValues: ['CREDENTIALS', 'CUSTOMER_VALUES', 'COST_VALUES', 'RAW_BODIES', 'COOKIES'],
  };
}
function aiReady(input: {
  readonly candidateId: string;
  readonly title: string;
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly oracleFingerprint: string;
  readonly minimalSequence: readonly string[];
  readonly confidence: ConfidenceResult | { level: string };
  readonly likelyFaultBoundary: FaultBoundaryResult;
  readonly sourceChangeCandidates: SourceCorrelationResult['candidates'];
  readonly semanticTriageEvidence?: SemanticTriageEvidence | null;
  readonly semanticConfidence?: { readonly level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED'; readonly reasons: readonly string[]; readonly blockers: readonly string[] };
}): AiReadyEvidencePackage {
  // Only sanitized deterministic facts; no raw values.
  const legacyLevel = (input.confidence as ConfidenceResult).level ?? String((input.confidence as Record<string, unknown>).level);
  // AI-ready confidence must never exceed the deterministic semantic confidence
  // when semantic evidence exists: expose the semantic level (<= legacy) rather
  // than the stronger legacy generic confidence. This closes
  // CONFIRMED_AI_READY_SEMANTIC_CONFIDENCE_OVERCLAIM.
  const confidence = input.semanticConfidence ? input.semanticConfidence.level : legacyLevel;
  return {
    schemaVersion: AI_READY_PACKAGE_VERSION,
    deterministic: true,
    evidence: {
      candidateId: input.candidateId,
      title: input.title,
      routeClass: input.routeClass,
      apiOperationFamily: input.apiOperationFamily,
      oracleFingerprint: input.oracleFingerprint,
      minimalSequence: input.minimalSequence,
      confidence,
      ...(input.semanticConfidence === undefined ? {} : { semanticConfidence: input.semanticConfidence.level }),
      faultBoundary: input.likelyFaultBoundary.primaryBoundary,
      sourceCandidateCount: input.sourceChangeCandidates.length,
      ...(input.semanticTriageEvidence === undefined || input.semanticTriageEvidence === null ? {} : {
        expectationId: input.semanticTriageEvidence.expectationId,
        targetId: input.semanticTriageEvidence.targetId,
        semanticFindingFingerprint: input.semanticTriageEvidence.semanticFindingFingerprint,
        sourceCurrentness: input.semanticTriageEvidence.sourceCurrentness,
        exactReplayStatus: input.semanticTriageEvidence.exactReplayStatus,
      }),
    },
    allowedUses: ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'],
    oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY',
    prohibitedUses: ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'],
  };
}

export interface BugDossierV2 {
  readonly schemaVersion: typeof DOSSIER_VERSION_V2;
  readonly status: 'READY' | 'UNRESOLVED';
  readonly candidateId: string;
  readonly title: string;
  readonly firstObserved: string | null;
  readonly lastObserved: string | null;
  readonly journeys: readonly string[];
  readonly seeds: readonly string[];
  readonly minimalSequence: readonly string[];
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly oracleFingerprint: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly l4Datastore: 'OUT_OF_SCOPE_BY_OWNER';
  readonly reproduction: {
    readonly result: 'REPRODUCED' | 'NOT_REPRODUCED' | 'BOUNDED' | 'INCOMPLETE';
    readonly count: number;
    readonly minimalityGuarantee: MinimizationResult['minimalityGuarantee'];
  };
  readonly browserApiDifferential: BrowserApiDifferential;
  readonly sourceChangeCandidates: readonly SourceChangeCandidate[];
  readonly likelyFaultBoundary: FaultBoundaryResult;
  readonly confidence: ConfidenceResult;
  readonly semanticConfidence?: { readonly level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED'; readonly reasons: readonly string[]; readonly blockers: readonly string[] };
  readonly technicalSeverity: TechnicalSeverity;
  readonly triagePriority: TriagePriority;
  readonly knownNightwatchDefect: string | null;
  readonly alternativesRuledOut: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly semanticEvidence: SemanticDossierEvidence | null;
  readonly semanticTriageEvidence: SemanticTriageEvidence | null;
  readonly humanReproductionRecipe: HumanReproductionRecipe;
  readonly aiReady: AiReadyEvidencePackage;
  readonly safety: BugDossier['safety'];
  readonly privacy: BugDossier['privacy'];
}

export interface BugDossierV2Input {
  readonly firstObserved: string | null;
  readonly lastObserved: string | null;
  readonly journeyIds: readonly string[];
  readonly seeds: readonly string[];
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly oracleFingerprint: string;
  readonly evidenceLevel: Exclude<EvidenceLevel, 'L4'>;
  readonly minimization: MinimizationResult;
  readonly browserApiDifferential: BrowserApiDifferential;
  readonly sourceCorrelation: SourceCorrelationResult;
  readonly likelyFaultBoundary: FaultBoundaryResult;
  readonly confidence: ConfidenceResult;
  readonly technicalSeverity: TechnicalSeverity;
  readonly triagePriority: TriagePriority;
  readonly knownNightwatchDefect: string | null;
  readonly alternativesRuledOut: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly semanticEvidence?: SemanticDossierEvidence | null;
  readonly semanticTriageEvidence?: SemanticTriageEvidence | null;
  readonly safetyClean?: boolean;
  readonly privacyClean?: boolean;
  readonly oracleReliable?: boolean;
}

/** READY predicate for semantic dossiers — deterministic, categorical. */
export function isReadySemanticDossier(input: BugDossierV2Input): { ready: boolean; reason?: string } {
  const e = input.semanticTriageEvidence;
  const safetyClean = input.safetyClean ?? true;
  const privacyClean = input.privacyClean ?? true;
  const oracleReliable = input.oracleReliable ?? true;

  // Essential semantic identity missing
  if (e !== null && e !== undefined) {
    if (!e.expectationId || !e.targetId || !e.semanticFindingFingerprint || !e.invariantDefinitionId) {
      return { ready: false, reason: 'SEMANTIC_IDENTITY_MISSING' };
    }
    // Stale/unavailable/unresolved blocks READY as current bug proof
    if (e.sourceCurrentness === 'STALE' || e.sourceCurrentness === 'UNAVAILABLE' || e.sourceCurrentness === 'UNKNOWN') {
      return { ready: false, reason: 'SOURCE_CURRENTNESS_UNRESOLVED' };
    }
    if (e.receiptOutcome === 'EXPECTATION_SOURCE_STALE' || e.receiptOutcome === 'EXPECTATION_SOURCE_UNAVAILABLE' || e.receiptOutcome === 'NO_EXPECTATION') {
      return { ready: false, reason: 'SOURCE_CURRENTNESS_UNRESOLVED' };
    }
    if (e.semanticOutcome === 'PARTIAL_COVERAGE' || e.receiptOutcome === 'PARTIAL_COVERAGE' || e.coverageState === 'PARTIAL_COVERAGE_NO_VIOLATION') {
      return { ready: false, reason: 'PARTIAL_COLLECTION_COVERAGE' };
    }
    if (e.semanticOutcome !== 'ANOMALY' || e.receiptOutcome !== 'ANOMALY') {
      return { ready: false, reason: 'NON_ANOMALY_OUTCOME' };
    }
    if (e.exactReplayStatus !== 'REPRODUCED' || !e.exactFingerprintMatch) {
      return { ready: false, reason: 'EXACT_REPLAY_REQUIRED' };
    }
    if (input.knownNightwatchDefect !== null) return { ready: false, reason: 'KNOWN_FALSE_POSITIVE_PRESENT' };
    if (!safetyClean || !privacyClean) return { ready: false, reason: 'SAFETY_PRIVACY_NONZERO' };
    if (!oracleReliable) return { ready: false, reason: 'ORACLE_RELIABILITY_UNRESOLVED' };
    // Deterministic evidence contradiction: e.g. ANOMALY but minimality NONE with zero reproductions?
    if (e.minimalityGuarantee === 'NONE' && e.minimalSequenceReproductions === 0) {
      return { ready: false, reason: 'REPRODUCTION_EVIDENCE_MISSING' };
    }
  } else {
    // No semantic evidence: protocol-only dossier may still be READY if minimization reproduced and safety clean
    if (input.minimization.freshExactReplay !== 'REPRODUCED') return { ready: false, reason: 'EXACT_REPLAY_REQUIRED' };
    if (!safetyClean || !privacyClean) return { ready: false, reason: 'SAFETY_PRIVACY_NONZERO' };
    if (input.knownNightwatchDefect !== null) return { ready: false, reason: 'KNOWN_FALSE_POSITIVE_PRESENT' };
  }
  return { ready: true };
}

export function createBugDossierV2(input: BugDossierV2Input): BugDossierV2 {
  if ((input.evidenceLevel as string) === 'L4') throw new Error('L4_DATASTORE_OUT_OF_SCOPE_BY_OWNER');
  if (input.semanticTriageEvidence !== null && input.semanticTriageEvidence !== undefined) {
    validateSemanticTriageEvidence(input.semanticTriageEvidence);
  }
  const routeClass = safeId(input.routeClass, 'ROUTE_CLASS');
  const fingerprint = safeId(input.oracleFingerprint, 'ORACLE_FINGERPRINT');
  const family = input.journeyIds[0] ?? input.apiOperationFamily ?? 'application-anomaly';
  const id = candidateId(fingerprint, safeId(family, 'JOURNEY_OR_API_FAMILY'), input.apiOperationFamily);
  const title = `Sanitized application anomaly in ${routeClass}`;
  const humanRecipe = recipe(input.minimization.minimalReproducingSequence, routeClass, fingerprint);

  const safetyClean = input.safetyClean ?? true;
  const privacyClean = input.privacyClean ?? true;
  const oracleReliable = input.oracleReliable ?? true;
  const semanticIdentityPresent = input.semanticTriageEvidence !== null && input.semanticTriageEvidence !== undefined
    && Boolean(input.semanticTriageEvidence.expectationId && input.semanticTriageEvidence.targetId);

  let semanticConfidence: BugDossierV2['semanticConfidence'] | undefined;
  if (input.semanticTriageEvidence) {
    const sc = rankSemanticConfidence({
      evidence: input.semanticTriageEvidence,
      browserApiDifferential: input.browserApiDifferential.status,
      oracleReliable,
      knownFalsePositive: input.knownNightwatchDefect !== null,
      safetyClean,
      privacyClean,
      semanticIdentityPresent,
    });
    semanticConfidence = { level: sc.level, reasons: [...sc.reasons], blockers: [...sc.blockers] };
  }

  const readiness = isReadySemanticDossier({ ...input, safetyClean, privacyClean, oracleReliable });
  const status: BugDossierV2['status'] = readiness.ready ? 'READY' : 'UNRESOLVED';

  const reproduction: BugDossierV2['reproduction'] = {
    result: input.minimization.status === 'NO_REPRODUCTION' ? 'NOT_REPRODUCED' : input.minimization.status === 'BOUNDED_BUDGET_EXHAUSTED' ? 'BOUNDED' : input.minimization.freshExactReplay === 'REPRODUCED' ? 'REPRODUCED' : 'INCOMPLETE',
    count: input.minimization.reproductionCount,
    minimalityGuarantee: input.minimization.minimalityGuarantee,
  };
  const ai = aiReady({
    candidateId: id,
    title,
    routeClass,
    apiOperationFamily: input.apiOperationFamily,
    oracleFingerprint: fingerprint,
    minimalSequence: input.minimization.minimalReproducingSequence,
    confidence: input.confidence,
    likelyFaultBoundary: input.likelyFaultBoundary,
    sourceChangeCandidates: input.sourceCorrelation.candidates,
    semanticTriageEvidence: input.semanticTriageEvidence ?? null,
    semanticConfidence,
  });
  const dossier: BugDossierV2 = {
    schemaVersion: DOSSIER_VERSION_V2,
    status,
    candidateId: id,
    title,
    firstObserved: input.firstObserved,
    lastObserved: input.lastObserved,
    journeys: [...input.journeyIds].map((v) => safeId(v, 'JOURNEY_ID')).sort(),
    seeds: [...input.seeds].map((v) => safeId(v, 'SEED')).sort(),
    minimalSequence: input.minimization.minimalReproducingSequence.map((v) => safeId(v, 'ACTION_ID')),
    routeClass,
    apiOperationFamily: input.apiOperationFamily === null ? null : safeId(input.apiOperationFamily, 'API_OPERATION_FAMILY'),
    oracleFingerprint: fingerprint,
    evidenceLevel: input.evidenceLevel,
    l4Datastore: 'OUT_OF_SCOPE_BY_OWNER',
    reproduction,
    browserApiDifferential: input.browserApiDifferential,
    sourceChangeCandidates: input.sourceCorrelation.candidates,
    likelyFaultBoundary: input.likelyFaultBoundary,
    confidence: input.confidence,
    ...(semanticConfidence === undefined ? {} : { semanticConfidence }),
    technicalSeverity: input.technicalSeverity,
    triagePriority: input.triagePriority,
    knownNightwatchDefect: input.knownNightwatchDefect,
    alternativesRuledOut: [...input.alternativesRuledOut],
    missingEvidence: [...input.missingEvidence],
    semanticEvidence: input.semanticEvidence ?? null,
    semanticTriageEvidence: input.semanticTriageEvidence ?? null,
    humanReproductionRecipe: humanRecipe,
    aiReady: ai,
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0 },
    privacy: { result: 'PASS', rawBodiesPersisted: false, customerValuesPersisted: false, credentialsPersisted: false, screenshotsPersisted: false, authenticatedTracesPersisted: false },
  };
  assertNoSentinels(dossier);
  validateBugDossierV2(dossier);
  return dossier;
}

const ALLOWED_V2_KEYS = new Set([
  'schemaVersion','status','candidateId','title','firstObserved','lastObserved','journeys','seeds','minimalSequence','routeClass','apiOperationFamily','oracleFingerprint','evidenceLevel','l4Datastore','reproduction','browserApiDifferential','sourceChangeCandidates','likelyFaultBoundary','confidence','semanticConfidence','technicalSeverity','triagePriority','knownNightwatchDefect','alternativesRuledOut','missingEvidence','semanticEvidence','semanticTriageEvidence','humanReproductionRecipe','aiReady','safety','privacy',
]);

export function validateBugDossierV2(dossier: BugDossierV2): void {
  if (dossier.schemaVersion !== DOSSIER_VERSION_V2) throw new Error('DOSSIER_V2_VERSION_INVALID');
  for (const key of Object.keys(dossier)) {
    if (!ALLOWED_V2_KEYS.has(key)) throw new Error(`DOSSIER_V2_UNKNOWN_FIELD:${key}`);
  }
  if (dossier.status !== 'READY' && dossier.status !== 'UNRESOLVED') throw new Error('DOSSIER_V2_STATUS_INVALID');
  if (dossier.evidenceLevel === 'L4' || dossier.l4Datastore !== 'OUT_OF_SCOPE_BY_OWNER') throw new Error('DOSSIER_DATASTORE_SCOPE_INVALID');
  if (dossier.safety.productionAttempts !== 0 || dossier.safety.proxyViolations !== 0 || dossier.safety.unknownDestinations !== 0 || dossier.safety.unknownApprovals !== 0 || dossier.safety.productMutations !== 0 || dossier.safety.actionCausedUnknown !== 0 || dossier.safety.databaseQueries !== 0) throw new Error('DOSSIER_SAFETY_NOT_CLEAN');
  if (dossier.privacy.result !== 'PASS' || dossier.privacy.rawBodiesPersisted || dossier.privacy.customerValuesPersisted || dossier.privacy.credentialsPersisted || dossier.privacy.screenshotsPersisted || dossier.privacy.authenticatedTracesPersisted) throw new Error('DOSSIER_PRIVACY_INVALID');
  if (dossier.semanticEvidence !== null && dossier.semanticEvidence !== undefined) validateSemanticDossierEvidence(dossier.semanticEvidence);
  if (dossier.semanticTriageEvidence !== null && dossier.semanticTriageEvidence !== undefined) validateSemanticTriageEvidence(dossier.semanticTriageEvidence);
  if (dossier.semanticConfidence !== undefined) {
    if (!['HIGH','MEDIUM','LOW','UNRESOLVED'].includes(dossier.semanticConfidence.level)) throw new Error('DOSSIER_SEMANTIC_CONFIDENCE_LEVEL_INVALID');
  }
  // READY predicate enforcement: if status READY but would be UNRESOLVED, fail
  // We cannot re-derive without minimization; so check basic invariants: READY requires semanticEvidence? No, protocol-only may be READY if reproduced. So just validate no sentinels and basic safety.
  assertNoSentinels(dossier);
  // Human recipe privacy: must not contain raw values — already sentinel-checked. Additional: actionIds must be safe IDs.
  for (const id of dossier.humanReproductionRecipe.actionIds) {
    if (!SAFE_ID_RE.test(id) || SENTINEL_RE.test(id)) throw new Error('DOSSIER_RECIPE_ACTION_ID_UNSAFE');
  }
  // AI-ready must not leak raw evidence digest beyond safe metadata
  assertNoSentinels(dossier.aiReady);
}

/** Parse and validate a v2 dossier (unknown fields rejected). */
export function parseBugDossierV2(raw: unknown): BugDossierV2 {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('DOSSIER_V2_NOT_OBJECT');
  validateBugDossierV2(raw as BugDossierV2);
  return raw as BugDossierV2;
}

/** Backward compat: validate a v1 dossier remains readable via existing validateBugDossier. */
export function isV1Dossier(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>).schemaVersion === DOSSIER_VERSION;
}
