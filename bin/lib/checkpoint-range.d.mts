export type CheckpointRangeClass = 'SAME' | 'DOCUMENTARY_DESCENDANT' | 'SUBSTANTIVE_DESCENDANT' | 'UNRELATED' | 'UNKNOWN';
export declare const CHECKPOINT_RANGE_CLASSES: readonly CheckpointRangeClass[];
export declare function classifyCheckpointRange(facts: {
  readonly certifiedCheckpointSha: string | null;
  readonly headSha: string | null;
  readonly isAncestor: ((ancestor: string, descendant: string) => boolean) | null;
  readonly changedFiles: ((from: string, to: string) => readonly string[] | null) | null;
  readonly checkpointRoleViolations: ((files: readonly string[]) => readonly string[] | null) | null;
}): CheckpointRangeClass;
