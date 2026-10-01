
// VB-03 / corrections task 2.3 (bin/lib/checkpoint-role.mjs).
export function removedLineDigestsFromDiff(diffText: string): Set<string>;
export function removedLineDigests(root: string, commit: string, file: string): ReadonlySet<string> | null;
export function correctionPairingViolations(
  root: string,
  commit: string,
  correctionsFile: string,
): ReadonlyArray<{ code: string; id?: string; correctionsFile?: string; archiveFile?: string; expectedDigest?: string }>;
export function unpairedCorrectionsInRange(
  root: string,
  fromExclusive: string,
  toInclusive: string,
  correctionsFile: string,
): Array<{ commit: string; code: string; id?: string; archiveFile?: string }> | null;
export function checkpointRoleViolations(
  root: string,
  files: readonly string[],
  context: ({ kind: 'commit'; commit: string } | { kind: 'range'; from: string; to: string }) & {
    verifyBindingReceipt?: (subject: string, digest: string, sha: string) => boolean;
  },
): string[];
// R4-13 / review-4 task 3.4 (bin/lib/checkpoint-role.mjs).
export const ARCHIVE_MOVE_PATH_RE: RegExp;
export function archiveMoveHolds(root: string, commit: string, file: string): boolean;
