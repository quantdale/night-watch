// ---------------------------------------------------------------------------
// Conservative application-layer fault-boundary localization.
//
// This ranks evidence-supported boundaries. It never returns DATASTORE and
// never labels a source candidate as a root cause.
// ---------------------------------------------------------------------------

import type { FaultBoundary, FaultBoundaryEvidence, FaultBoundaryResult, SourceChangeCandidate, TriageConfidence } from './types';

function confidenceFor(evidence: FaultBoundaryEvidence, candidates: readonly FaultBoundary[]): TriageConfidence {
  if (evidence.authInvalid) return 'HIGH';
  if (candidates.length === 1 && (evidence.apiAvailable || evidence.routeDiverged || evidence.resourceFailure)) return 'MEDIUM';
  if (candidates.length > 0) return 'LOW';
  return 'UNRESOLVED';
}

function candidateFromSource(source: readonly SourceChangeCandidate[]): FaultBoundary[] {
  const boundaries: FaultBoundary[] = [];
  for (const candidate of source) {
    if (candidate.relevance === 'DIRECT_CHANGE_RELEVANCE' || candidate.relevance === 'SHARED_CHANGE_RELEVANCE') {
      if (candidate.reason.toLowerCase().includes('backend') || candidate.edgeId?.includes('api-handler') || candidate.edgeId?.includes('service')) boundaries.push('BACKEND_HANDLER');
      else if (candidate.reason.toLowerCase().includes('client') || candidate.edgeId?.includes('client')) boundaries.push('API_CLIENT');
    }
  }
  return boundaries;
}

export function localizeFaultBoundary(evidence: FaultBoundaryEvidence): FaultBoundaryResult {
  const candidates: FaultBoundary[] = [];
  const reasons: string[] = [];
  if (evidence.authInvalid) {
    candidates.push('AUTH');
    reasons.push('authenticated evidence is invalid; product behavior is not admitted');
  } else if (evidence.routeDiverged) {
    candidates.push('ROUTER');
    reasons.push('approved route class diverged during replay');
  } else if (evidence.resourceFailure) {
    candidates.push('RESOURCE_LOADING');
    reasons.push('critical resource loading failed');
  } else if (evidence.apiAvailable && evidence.apiFailed && evidence.apiProtocolMismatch) {
    candidates.push('PROTOCOL');
    reasons.push('direct API replay fails with an app-layer protocol/status/parse contradiction');
  } else if (evidence.apiAvailable && !evidence.apiFailed && evidence.structuralDiverged) {
    candidates.push('UI_COMPONENT', 'CLIENT_STATE');
    reasons.push('browser structure fails while the corresponding direct API operation passes');
  } else if (evidence.apiAvailable && evidence.apiFailed) {
    candidates.push('API_TRANSPORT', 'BACKEND_HANDLER');
    reasons.push('direct API replay fails; transport/protocol/backend boundaries remain alternatives');
  } else if (evidence.browserRuntimeFailure) {
    candidates.push('UI_COMPONENT', 'CLIENT_STATE');
    reasons.push('browser runtime evidence is present without an independent API contradiction');
  }
  candidates.push(...candidateFromSource(evidence.sourceCandidates));
  const unique = [...new Set(candidates)];
  const primary = unique[0] ?? 'UNKNOWN';
  return {
    primaryBoundary: primary,
    candidateBoundaries: unique.length > 0 ? unique : ['UNKNOWN'],
    confidence: confidenceFor(evidence, unique),
    reasons,
    rootCauseClaim: 'NONE',
  };
}

