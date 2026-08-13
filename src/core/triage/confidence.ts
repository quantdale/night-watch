// ---------------------------------------------------------------------------
// Categorical triage confidence. No fake percentages.
// ---------------------------------------------------------------------------

import type { ConfidenceInput, ConfidenceResult } from './types';

export function rankConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  if (!input.safetyClean) return { level: 'UNRESOLVED', reasons: ['safety vector is not clean'] };
  if (input.knownFalsePositive) return { level: 'LOW', reasons: ['known Nightwatch false-positive mode is present'] };
  if (input.freshContextReproductions >= 2) reasons.push('reproduced in fresh contexts');
  if (input.minimalSequenceReproductions >= 2) reasons.push('minimal sequence reproduced at least twice');
  if (input.browserApiDifferential === 'BROWSER_API_FAILURE_AGREE' || input.browserApiDifferential === 'UI_FAILURE_API_PASS') reasons.push('browser/API differential is informative');
  if (input.sourceRelevance === 'DIRECT_CHANGE_RELEVANCE' || input.sourceRelevance === 'SHARED_CHANGE_RELEVANCE') reasons.push('source relevance is current and evidence-backed');
  if (!input.oracleReliable) reasons.push('oracle reliability is unresolved');
  if (input.freshContextReproductions >= 2 && input.minimalSequenceReproductions >= 2 && input.oracleReliable) return { level: 'HIGH', reasons };
  if (input.freshContextReproductions >= 1 && input.oracleReliable && input.browserApiDifferential !== 'NOT_AVAILABLE') return { level: 'MEDIUM', reasons };
  if (reasons.length > 0) return { level: 'LOW', reasons };
  return { level: 'UNRESOLVED', reasons: ['insufficient independent deterministic evidence'] };
}

