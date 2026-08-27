// ---------------------------------------------------------------------------
// Private sanitized bug dossier construction.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import {
  AI_READY_PACKAGE_VERSION,
  DOSSIER_VERSION,
  type AiReadyEvidencePackage,
  type BrowserApiDifferential,
  type BugDossier,
  type ConfidenceResult,
  type EvidenceLevel,
  type FaultBoundaryResult,
  type HumanReproductionRecipe,
  type MinimizationResult,
  type SourceCorrelationResult,
  type TechnicalSeverity,
  type TriagePriority,
} from './types';
import type { SemanticDossierEvidence } from '../../oracles/semantic/dossier';
import { validateDossierRuntime } from './dossierRuntimeValidation';

// The shared runtime boundary delegates sanitized semantic evidence to the
// owning validateSemanticDossierEvidence contract; keep that ownership
// explicit here for the triage-core hardening seam.

const SAFE_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s]+[?&](?:token|account|customer|cost)=)/i;

function digest(value: unknown): string {
  return sha256Hex(stableJsonSorted(value)).slice(0, 24);
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
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSentinels(item, `${pathName}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${pathName}.${key}`);
  }
}

function candidateId(fingerprint: string, journeyOrApiFamily: string, apiOperationFamily: string | null): string {
  return `candidate:sha256:${digest({ schemaVersion: DOSSIER_VERSION, fingerprint, journeyOrApiFamily, apiOperationFamily })}`;
}

function recipe(actionIds: readonly string[], routeClass: string, oracleFingerprint: string): HumanReproductionRecipe {
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
  readonly confidence: ConfidenceResult;
  readonly likelyFaultBoundary: FaultBoundaryResult;
  readonly sourceChangeCandidates: SourceCorrelationResult['candidates'];
}): AiReadyEvidencePackage {
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
      confidence: input.confidence.level,
      faultBoundary: input.likelyFaultBoundary.primaryBoundary,
      sourceCandidateCount: input.sourceChangeCandidates.length,
    },
    allowedUses: ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'],
    oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY',
    prohibitedUses: ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'],
  };
}

export interface BugDossierInput {
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
}

export interface IncompleteBugDossier {
  readonly schemaVersion: typeof DOSSIER_VERSION;
  readonly status: 'INCOMPLETE';
  readonly candidateId: string;
  readonly missingSections: readonly string[];
  readonly privacy: { readonly result: 'PASS'; readonly confirmed: false };
}

export function createIncompleteDossier(input: { readonly anomalyFingerprint: string; readonly journeyOrApiFamily: string; readonly missingSections: readonly string[] }): IncompleteBugDossier {
  const fingerprint = safeId(input.anomalyFingerprint, 'FINGERPRINT');
  const family = safeId(input.journeyOrApiFamily, 'FAMILY');
  const result: IncompleteBugDossier = {
    schemaVersion: DOSSIER_VERSION,
    status: 'INCOMPLETE',
    candidateId: candidateId(fingerprint, family, null),
    missingSections: [...new Set(input.missingSections)].sort(),
    privacy: { result: 'PASS', confirmed: false },
  };
  assertNoSentinels(result);
  return result;
}

export function createBugDossier(input: BugDossierInput): BugDossier {
  if ((input.evidenceLevel as string) === 'L4') throw new Error('L4_DATASTORE_OUT_OF_SCOPE_BY_OWNER');
  const routeClass = safeId(input.routeClass, 'ROUTE_CLASS');
  const fingerprint = safeId(input.oracleFingerprint, 'ORACLE_FINGERPRINT');
  const family = input.journeyIds[0] ?? input.apiOperationFamily ?? 'application-anomaly';
  const id = candidateId(fingerprint, safeId(family, 'JOURNEY_OR_API_FAMILY'), input.apiOperationFamily);
  const title = `Sanitized application anomaly in ${routeClass}`;
  const humanRecipe = recipe(input.minimization.minimalReproducingSequence, routeClass, fingerprint);
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
  });
  const reproduction: BugDossier['reproduction'] = {
    result: input.minimization.status === 'NO_REPRODUCTION' ? 'NOT_REPRODUCED' : input.minimization.status === 'BOUNDED_BUDGET_EXHAUSTED' ? 'BOUNDED' : input.minimization.freshExactReplay === 'REPRODUCED' ? 'REPRODUCED' : 'INCOMPLETE',
    count: input.minimization.reproductionCount,
    minimalityGuarantee: input.minimization.minimalityGuarantee,
  };
  const dossier: BugDossier = {
    schemaVersion: DOSSIER_VERSION,
    status: 'READY',
    candidateId: id,
    title,
    firstObserved: input.firstObserved,
    lastObserved: input.lastObserved,
    journeys: [...input.journeyIds].map((value) => safeId(value, 'JOURNEY_ID')).sort(),
    seeds: [...input.seeds].map((value) => safeId(value, 'SEED')).sort(),
    minimalSequence: input.minimization.minimalReproducingSequence.map((value) => safeId(value, 'ACTION_ID')),
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
    technicalSeverity: input.technicalSeverity,
    triagePriority: input.triagePriority,
    knownNightwatchDefect: input.knownNightwatchDefect,
    alternativesRuledOut: [...input.alternativesRuledOut],
    missingEvidence: [...input.missingEvidence],
    semanticEvidence: input.semanticEvidence ?? null,
    humanReproductionRecipe: humanRecipe,
    aiReady: ai,
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0 },
    privacy: { result: 'PASS', rawBodiesPersisted: false, customerValuesPersisted: false, credentialsPersisted: false, screenshotsPersisted: false, authenticatedTracesPersisted: false },
  };
  assertNoSentinels(dossier);
  return dossier;
}

export function validateBugDossier(dossier: BugDossier): void;
export function validateBugDossier(dossier: unknown): asserts dossier is BugDossier;
export function validateBugDossier(value: unknown): void {
  validateDossierRuntime(value, { version: 'v1', schemaVersion: DOSSIER_VERSION });
}
