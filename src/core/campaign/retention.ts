// ---------------------------------------------------------------------------
// Phase 7 private finding retention review.
// ---------------------------------------------------------------------------

import type { BugDossier } from '../triage/types';

export type RetentionDisposition = 'KEEP_ACTIVE_UNRESOLVED' | 'KEEP_RECENT_RESOLVED' | 'ELIGIBLE_RESOLVED_DUPLICATE_PRUNE' | 'KEEP_SYNTHETIC_FIXTURE';

export interface RetentionRecord {
  readonly candidateId: string;
  readonly disposition: RetentionDisposition;
  readonly reason: string;
}
/**
 * Produce an owner-reviewable retention plan. It never silently deletes an
 * unresolved dossier; callers may explicitly apply only prune dispositions.
 */
export function planPrivateRetention(input: {
  readonly dossiers: readonly BugDossier[];
  readonly maxRecentResolved?: number;
  readonly syntheticCandidateIds?: readonly string[];
}): readonly RetentionRecord[] {
  const maxRecentResolved = input.maxRecentResolved ?? 20;
  if (!Number.isInteger(maxRecentResolved) || maxRecentResolved < 0) throw new Error('RETENTION_LIMIT_INVALID');
  const synthetic = new Set(input.syntheticCandidateIds ?? []);
  const resolved = [...input.dossiers]
    .filter((dossier) => dossier.status === 'READY' && dossier.reproduction.result === 'NOT_REPRODUCED')
    .sort((a, b) => (b.lastObserved ?? '').localeCompare(a.lastObserved ?? '') || a.candidateId.localeCompare(b.candidateId));
  const recent = new Set(resolved.slice(0, maxRecentResolved).map((dossier) => dossier.candidateId));
  return [...input.dossiers]
    .map((dossier): RetentionRecord => {
      if (synthetic.has(dossier.candidateId)) return { candidateId: dossier.candidateId, disposition: 'KEEP_SYNTHETIC_FIXTURE', reason: 'synthetic fixtures are retained for deterministic regression' };
      if (dossier.reproduction.result !== 'NOT_REPRODUCED' || dossier.evidenceLevel === 'L0') return { candidateId: dossier.candidateId, disposition: 'KEEP_ACTIVE_UNRESOLVED', reason: 'unresolved or admitted finding remains owner-controlled' };
      if (recent.has(dossier.candidateId)) return { candidateId: dossier.candidateId, disposition: 'KEEP_RECENT_RESOLVED', reason: 'within the bounded recent resolved retention window' };
      return { candidateId: dossier.candidateId, disposition: 'ELIGIBLE_RESOLVED_DUPLICATE_PRUNE', reason: 'old resolved/non-reproduced artifact may be pruned only by explicit owner action' };
    })
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
}
