/**
 * Pure classification for local evidence retention.
 *
 * Nightwatch writes one artifact directory per run and has never removed one,
 * so the store grows without bound. Retention is dangerous in exactly one
 * direction — a wrongly removed artifact is unrecoverable, while a wrongly
 * kept one costs disk — so this module is refusal-first: it computes what must
 * be REFUSED before it computes what may be REMOVED, and anything it cannot
 * prove unreferenced is refused.
 *
 * It never touches a filesystem. The caller supplies an already-enumerated
 * observation, applies the plan, and owns every mutation.
 */

export const RETENTION_DISPOSITIONS = [
  'REFUSED_REFERENCED',
  'REFUSED_RECENT',
  'REFUSED_UNPROVABLE',
  'REFUSED_UNSAFE',
  'REMOVAL_CANDIDATE',
] as const;

export type RetentionDisposition = typeof RETENTION_DISPOSITIONS[number];

export interface RetentionEntryObservation {
  /** Directory name inside the artifact root; never a path. */
  readonly name: string;
  /** Directory entries only. Anything else is unsafe by construction. */
  readonly kind: 'DIRECTORY' | 'FILE' | 'SYMLINK' | 'OTHER';
  /** Total bytes, or null when the size could not be measured. */
  readonly bytes: number | null;
  /** Modification time in epoch milliseconds, or null when unmeasurable. */
  readonly modifiedMs: number | null;
}

export interface RetentionObservation {
  /**
   * Tokens found in tracked project state — task records, docs, OpenSpec.
   * A run directory whose name appears here is load-bearing evidence.
   */
  readonly referencedTokens: readonly string[];
  readonly entries: readonly RetentionEntryObservation[];
  /**
   * False when the reference scan was incomplete for ANY reason. A partial
   * scan cannot prove a negative, so it refuses everything.
   */
  readonly referenceScanComplete: boolean;
  /** Newest N entries are refused regardless of references. */
  readonly keepRecent: number;
}

export interface RetentionPlanEntry {
  readonly name: string;
  readonly disposition: RetentionDisposition;
  readonly reasonCode: string;
  readonly bytes: number | null;
}

export interface RetentionPlan {
  readonly schemaVersion: 'nightwatch.evidence-retention.v1';
  readonly entries: readonly RetentionPlanEntry[];
  readonly refusedCount: number;
  readonly candidateCount: number;
  /** Bytes across removal candidates, or null if any candidate is unmeasured. */
  readonly reclaimableBytes: number | null;
  readonly referenceScanComplete: boolean;
}

const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function isSafeName(name: string): boolean {
  return SAFE_NAME_RE.test(name) && name !== '.' && name !== '..' && !name.includes('/');
}

/**
 * A token references an entry when it is the name, or contains the name as a
 * whole segment. Substring matching is deliberate and asymmetric: it can only
 * ever move an entry INTO the refusal set, so a false positive costs disk and
 * a false negative is impossible from this direction.
 */
function isReferenced(name: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => token === name || token.includes(name));
}

/** Build a refusal-first retention plan. Never mutates, never touches disk. */
export function planRetention(observation: RetentionObservation): RetentionPlan {
  const keepRecent = Number.isInteger(observation.keepRecent) && observation.keepRecent >= 0
    ? observation.keepRecent
    : 0;

  // Recency is computed first and independently of references, so a missing
  // mtime can never widen the removal set: an unmeasurable entry sorts as
  // oldest but is refused as UNPROVABLE below regardless.
  const recentNames = new Set(
    [...observation.entries]
      .filter((entry) => entry.modifiedMs !== null)
      .sort((left, right) => (right.modifiedMs as number) - (left.modifiedMs as number))
      .slice(0, keepRecent)
      .map((entry) => entry.name),
  );

  const entries: RetentionPlanEntry[] = observation.entries.map((entry) => {
    const base = { name: entry.name, bytes: entry.bytes };
    if (!isSafeName(entry.name)) {
      return { ...base, disposition: 'REFUSED_UNSAFE', reasonCode: 'ENTRY_NAME_UNSAFE' };
    }
    if (entry.kind !== 'DIRECTORY') {
      return { ...base, disposition: 'REFUSED_UNSAFE', reasonCode: `ENTRY_NOT_A_DIRECTORY_${entry.kind}` };
    }
    if (observation.referenceScanComplete !== true) {
      return { ...base, disposition: 'REFUSED_UNPROVABLE', reasonCode: 'REFERENCE_SCAN_INCOMPLETE' };
    }
    if (entry.modifiedMs === null || entry.bytes === null) {
      return { ...base, disposition: 'REFUSED_UNPROVABLE', reasonCode: 'ENTRY_UNMEASURABLE' };
    }
    if (isReferenced(entry.name, observation.referencedTokens)) {
      return { ...base, disposition: 'REFUSED_REFERENCED', reasonCode: 'REFERENCED_BY_TRACKED_STATE' };
    }
    if (recentNames.has(entry.name)) {
      return { ...base, disposition: 'REFUSED_RECENT', reasonCode: 'WITHIN_RECENT_WORKING_SET' };
    }
    return { ...base, disposition: 'REMOVAL_CANDIDATE', reasonCode: 'UNREFERENCED_AND_NOT_RECENT' };
  });

  const candidates = entries.filter((entry) => entry.disposition === 'REMOVAL_CANDIDATE');
  const reclaimableBytes = candidates.some((entry) => entry.bytes === null)
    ? null
    : candidates.reduce((total, entry) => total + (entry.bytes as number), 0);

  return {
    schemaVersion: 'nightwatch.evidence-retention.v1',
    entries,
    refusedCount: entries.length - candidates.length,
    candidateCount: candidates.length,
    reclaimableBytes,
    referenceScanComplete: observation.referenceScanComplete === true,
  };
}
