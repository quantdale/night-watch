import fs from 'node:fs';
import path from 'node:path';
import type { BaselineRecord, BaselineState, ChangeSet, ExecutionDisposition } from './types';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
const BASELINE_SCHEMA_VERSION = 'nightwatch.baseline.phase3.v1' as const;

export function bootstrapBaseline(repoId: string, sha: string, provenance: string): BaselineRecord {
  return { repoId, baselineSha: sha, status: 'BOOTSTRAP_BASELINE', provenance, lastChangesetId: null, lastAcceptedExecutionStatus: null };
}

export function initialBaselineState(records: readonly BaselineRecord[]): BaselineState {
  return { schemaVersion: BASELINE_SCHEMA_VERSION, records: [...records].sort((a, b) => a.repoId.localeCompare(b.repoId)) };
}

export function applyExecutionDisposition(state: BaselineState, changeset: ChangeSet, disposition: ExecutionDisposition): BaselineState {
  if (disposition.changesetId !== changeset.changesetId) throw new Error('baseline disposition changeset does not match selected changeset');
  const byRepo = new Map(state.records.map((record) => [record.repoId, record]));
  for (const baseline of changeset.repoBaselines) {
    const existing = byRepo.get(baseline.repoId);
    if (!existing) throw new Error(`baseline record missing for ${baseline.repoId}`);
    const accepted = disposition.status === 'ACCEPTED_SUCCESS';
    byRepo.set(baseline.repoId, {
      ...existing,
      baselineSha: accepted ? baseline.headSha : existing.baselineSha,
      status: accepted ? 'VERIFIED_BASELINE' : 'PENDING_CHANGESET',
      provenance: accepted
        ? `Accepted ${changeset.changesetId} for selected journeys ${disposition.acceptedJourneyIds.join(',') || 'none'}.`
        : `Pending ${changeset.changesetId}; execution status ${disposition.status}; baseline did not advance.`,
      lastChangesetId: changeset.changesetId,
      lastAcceptedExecutionStatus: disposition.status,
    });
  }
  return { schemaVersion: BASELINE_SCHEMA_VERSION, records: [...byRepo.values()].sort((a, b) => a.repoId.localeCompare(b.repoId)) };
}

export function readBaseline(filePath: string): BaselineState {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as BaselineState;
}

export function writeBaselineAtomic(filePath: string, state: BaselineState): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch { /* preserve the original failure */ }
    throw error;
  }
}
