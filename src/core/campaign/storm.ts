// ---------------------------------------------------------------------------
// Phase 7 shared-root failure-storm suppression.
// ---------------------------------------------------------------------------

import type { AnomalyObservation } from '../triage/types';

export interface FailureStorm {
  readonly kind: 'FAILURE_STORM';
  readonly reasonCode: 'SHARED_ROOT_SYMPTOM';
  readonly rootKey: string;
  readonly fingerprint: string;
  readonly oracleId: string;
  readonly runtimeCategory: string | null;
  readonly affectedRunIds: readonly string[];
  readonly affectedSurfaces: readonly string[];
  readonly occurrenceCount: number;
}
function rootKey(observation: AnomalyObservation): string {
  const features = observation.features;
  return [
    observation.fingerprint,
    features.oracleId,
    features.statusClass ?? '',
    features.contentTypeClass ?? '',
    features.runtimeCategory ?? '',
    features.structuralState ?? '',
  ].join('|');
}

function surface(observation: AnomalyObservation): string {
  return observation.features.journeyId ?? observation.features.operationFamily ?? observation.runId;
}

/**
 * A storm is intentionally narrower than a cluster: stable root-symptom
 * features must match, while at least two work surfaces are affected. This
 * prevents unrelated bugs from being merged merely because they are both 5xx.
 */
export function detectFailureStorm(observations: readonly AnomalyObservation[], minimumOccurrences = 2): FailureStorm | null {
  if (!Number.isInteger(minimumOccurrences) || minimumOccurrences < 2) throw new Error('FAILURE_STORM_THRESHOLD_INVALID');
  const groups = new Map<string, AnomalyObservation[]>();
  for (const observation of observations) {
    if (observation.timingClass === 'TRANSIENT') continue;
    const key = rootKey(observation);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }
  const candidates = [...groups.entries()]
    .map(([key, group]) => ({ key, group, surfaces: [...new Set(group.map(surface))].sort() }))
    .filter(({ group, surfaces }) => group.length >= minimumOccurrences && surfaces.length >= 2)
    .sort((a, b) => b.group.length - a.group.length || a.key.localeCompare(b.key));
  const selected = candidates[0];
  if (selected === undefined) return null;
  const representative = [...selected.group].sort((a, b) => a.runId.localeCompare(b.runId))[0]!;
  return {
    kind: 'FAILURE_STORM',
    reasonCode: 'SHARED_ROOT_SYMPTOM',
    rootKey: selected.key,
    fingerprint: representative.fingerprint,
    oracleId: representative.features.oracleId,
    runtimeCategory: representative.features.runtimeCategory,
    affectedRunIds: [...new Set(selected.group.map((item) => item.runId))].sort(),
    affectedSurfaces: selected.surfaces,
    occurrenceCount: selected.group.length,
  };
}
