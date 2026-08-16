// ---------------------------------------------------------------------------
// End-to-end local private triage pipeline.
// ---------------------------------------------------------------------------

import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import { correlateSourceChanges, type SourceCorrelationInput } from './correlation';
import { compareBrowserAndApi } from './differential';
import { createBugDossier, validateBugDossier } from './dossier';
import { rankConfidence } from './confidence';
import { localizeFaultBoundary } from './localization';
import { minimizeFailure } from './minimizer';
import { rankTriagePriority } from './summaries';
import type { SemanticDossierEvidence } from '../../oracles/semantic/dossier';
import type {
  ApiObservation,
  BrowserObservation,
  BugDossier,
  EvidenceLevel,
  MinimizationAction,
  MinimizationOptions,
  SourceCorrelationResult,
  TechnicalSeverity,
} from './types';

export interface PrivateTriageInput extends Omit<MinimizationOptions, 'originalSequence'> {
  readonly originalSequence: readonly MinimizationAction[];
  readonly observedAt: string;
  readonly journeyIds: readonly string[];
  readonly seeds: readonly string[];
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly browser: BrowserObservation;
  readonly api: ApiObservation | null;
  readonly sourceCorrelation: SourceCorrelationInput;
  readonly evidenceLevel: Exclude<EvidenceLevel, 'L4'>;
  readonly technicalSeverity: TechnicalSeverity;
  readonly breadth: 'NARROW' | 'MULTI_JOURNEY' | 'SHARED_CORE';
  readonly knownNightwatchDefect: boolean;
  readonly missingEvidence: readonly string[];
  readonly alternativesRuledOut: readonly string[];
  readonly semanticEvidence?: SemanticDossierEvidence | null;
  readonly store?: PrivateArtifactStore;
}

export interface PrivateTriageResult {
  readonly dossier: BugDossier;
  readonly minimization: Awaited<ReturnType<typeof minimizeFailure>>;
  readonly browserApiDifferential: ReturnType<typeof compareBrowserAndApi>;
  readonly sourceCorrelation: SourceCorrelationResult;
  readonly faultBoundary: ReturnType<typeof localizeFaultBoundary>;
  readonly artifactPath: string | null;
}

/** Run all local deterministic stages and optionally atomically persist one dossier. */
export async function triageAnomaly(input: PrivateTriageInput): Promise<PrivateTriageResult> {
  assertOwnerPolicyAllows('PRIVATE_TRIAGE');
  const minimization = await minimizeFailure({
    originalSequence: input.originalSequence,
    anomalyFingerprint: input.anomalyFingerprint,
    sourceVersion: input.sourceVersion,
    catalogVersion: input.catalogVersion,
    approvedActionIds: input.approvedActionIds,
    safeActionCatalog: input.safeActionCatalog,
    safety: input.safety,
    budget: input.budget,
    preconditionCheck: input.preconditionCheck,
    replay: input.replay,
  });
  const differential = compareBrowserAndApi(input.browser, input.api);
  const sourceCorrelation = correlateSourceChanges(input.sourceCorrelation);
  const faultBoundary = localizeFaultBoundary({
    authInvalid: input.api?.available === true && input.api.failed === false && input.browser.runtimeCategory === 'AUTH_STATE_INVALID',
    routeDiverged: input.browser.runtimeCategory === 'route-divergence',
    structuralDiverged: input.browser.structuralState.includes('missing') || input.browser.structuralState.includes('divergence'),
    browserRuntimeFailure: input.browser.runtimeCategory === 'browser-runtime',
    resourceFailure: input.browser.runtimeCategory === 'resource-loading',
    apiAvailable: input.api?.available === true,
    apiFailed: input.api?.failed === true,
    apiProtocolMismatch: input.api?.parseCategory === 'invalid' || input.api?.parseCategory === 'json-invalid' || input.api?.parseCategory === 'ndjson-invalid' || input.api?.statusClass === '4xx' || input.api?.statusClass === '5xx',
    sourceCandidates: sourceCorrelation.candidates,
  });
  const confidence = rankConfidence({
    freshContextReproductions: input.api?.available === true && input.api.failed === input.browser.failed ? 2 : 1,
    minimalSequenceReproductions: minimization.reproductionCount,
    browserApiDifferential: differential.status,
    sourceRelevance: sourceCorrelation.overallRelevance,
    oracleReliable: true,
    knownFalsePositive: input.knownNightwatchDefect,
    safetyClean: minimization.safetyRejectionCount === 0,
  });
  const dossier = createBugDossier({
    firstObserved: input.observedAt,
    lastObserved: input.observedAt,
    journeyIds: input.journeyIds,
    seeds: input.seeds,
    routeClass: input.routeClass,
    apiOperationFamily: input.apiOperationFamily,
    oracleFingerprint: input.anomalyFingerprint,
    evidenceLevel: input.evidenceLevel,
    minimization,
    browserApiDifferential: differential,
    sourceCorrelation,
    likelyFaultBoundary: faultBoundary,
    confidence,
    technicalSeverity: input.technicalSeverity,
    triagePriority: rankTriagePriority({ technicalSeverity: input.technicalSeverity, confidence: confidence.level, reproduced: minimization.freshExactReplay === 'REPRODUCED', breadth: input.breadth, knownNightwatchDefect: input.knownNightwatchDefect }),
    knownNightwatchDefect: input.knownNightwatchDefect ? 'NIGHTWATCH_FALSE_POSITIVE_CATALOG_MATCH' : null,
    alternativesRuledOut: input.alternativesRuledOut,
    missingEvidence: input.missingEvidence,
    semanticEvidence: input.semanticEvidence ?? null,
  });
  validateBugDossier(dossier);
  const artifactPath = input.store === undefined ? null : input.store.writeJson(`${dossier.candidateId.replaceAll(':', '-')}.json`, dossier);
  return { dossier, minimization, browserApiDifferential: differential, sourceCorrelation, faultBoundary, artifactPath };
}

