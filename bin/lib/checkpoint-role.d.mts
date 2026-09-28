
// VB-03 / corrections task 2.3 (bin/lib/checkpoint-role.mjs).
export function removedLineDigests(root: string, commit: string, file: string): ReadonlySet<string> | null;
export function correctionPairingViolations(
  root: string,
  commit: string,
  correctionsFile: string,
  archiveFile: string,
): ReadonlyArray<{ code: string; id?: string; correctionsFile?: string; archiveFile?: string; expectedDigest?: string }>;
export function checkpointRoleViolations(
  root: string,
  files: readonly string[],
  context: { kind: 'commit'; commit: string } | { kind: 'range'; from: string; to: string },
): string[];
