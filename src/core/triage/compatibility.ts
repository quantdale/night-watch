// ---------------------------------------------------------------------------
// Versioned adapters for existing Phase 2C / Phase 4 / Phase 5 evidence.
// Legacy evidence remains readable; it is not rewritten or upgraded in place.
// ---------------------------------------------------------------------------

import type { ApiOperation, ApiOracleObservation } from '../../api/phase5/types';
import type { JourneyEvidence } from '../journeys/types';
import type { ExplorationEvidence } from '../exploration/types';
import type { AnomalyObservation, StableAnomalyFeatures } from './types';

export const TRIAGE_COMPATIBILITY_VERSION = 'nightwatch.triage-compatibility.private.v1' as const;

function featureDefaults(overrides: Partial<StableAnomalyFeatures>): StableAnomalyFeatures {
  return {
    journeyId: null,
    envelopeId: null,
    oracleId: 'unknown-oracle',
    routeClass: null,
    operationFamily: null,
    statusClass: null,
    contentTypeClass: null,
    runtimeCategory: null,
    structuralState: null,
    failureActionId: null,
    sourceImpactRegion: null,
    browserApiResultClass: null,
    ...overrides,
  };
}

function safeRunId(runId: string): string {
  if (!/^[A-Za-z0-9_.-]{1,160}$/.test(runId)) throw new Error('COMPATIBILITY_RUN_ID_INVALID');
  return runId;
}

function observation(runId: string, observedAt: string, fingerprint: string, features: StableAnomalyFeatures, timingClass: AnomalyObservation['timingClass'] = 'NONE'): AnomalyObservation {
  return { runId: safeRunId(runId), observedAt, fingerprint, features, timingClass, reproduced: false, minimized: false, sourceFreshness: 'UNKNOWN' };
}

export function adaptJourneyEvidence(input: { readonly runId: string; readonly observedAt: string; readonly evidence: JourneyEvidence }): readonly AnomalyObservation[] {
  const fingerprints = input.evidence.anomalyFingerprints ?? [];
  return fingerprints.map((fingerprint, index) => observation(input.runId, input.observedAt, fingerprint, featureDefaults({
    journeyId: input.evidence.journeyId,
    oracleId: input.evidence.oracleObservations?.[index]?.oracleId ?? 'journey-oracle',
    routeClass: input.evidence.finalRouteClass,
    runtimeCategory: input.evidence.failureAttribution?.likelyCause ?? 'unknown',
    structuralState: input.evidence.globalShellReady ? 'shell-ready' : 'shell-not-ready',
    failureActionId: input.evidence.failureAttribution?.firstFailingStep ?? null,
  })));
}

export function adaptExplorationEvidence(input: { readonly runId: string; readonly observedAt: string; readonly evidence: ExplorationEvidence }): readonly AnomalyObservation[] {
  return input.evidence.anomalyFingerprints.map((fingerprint, index) => observation(input.runId, input.observedAt, fingerprint, featureDefaults({
    journeyId: null,
    envelopeId: input.evidence.envelopeId,
    oracleId: input.evidence.oracleResults[index] ?? 'exploration-oracle',
    routeClass: input.evidence.states.at(-1)?.routeClass ?? null,
    runtimeCategory: input.evidence.terminationReason,
    structuralState: input.evidence.coverage.statesDiscovered > 0 ? 'state-observed' : 'state-missing',
    failureActionId: input.evidence.observedActions.at(-1) ?? null,
  })));
}

export function adaptApiOracleObservation(input: { readonly runId: string; readonly observedAt: string; readonly operation: ApiOperation; readonly observation: ApiOracleObservation; }): readonly AnomalyObservation[] {
  if (input.observation.result === 'ORACLE_PASS') return [];
  return [observation(input.runId, input.observedAt, `fp:sha256:${input.observation.oracleId.replace(/[^A-Za-z0-9]/g, '').padEnd(24, '0').slice(0, 24)}`, featureDefaults({
    operationFamily: input.operation.operationId,
    oracleId: input.observation.oracleId,
    statusClass: input.observation.statusClass,
    contentTypeClass: input.observation.contentTypeClass,
    runtimeCategory: input.observation.result,
    structuralState: input.observation.parseCategory,
  }))];
}
