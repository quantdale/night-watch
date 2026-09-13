// Type declarations for the deterministic agent-state checker module
// (bin/agent-state.mjs). The module itself is ESM JS; these declarations
// exist so TypeScript tests can import its exported helpers directly.
export function isApprovedCheckpointPath(file: string): boolean;
export function classifySha(
  root: string,
  recordedSha: string,
  suppliedHead?: string | null
): {
  status: 'STALE' | 'SYNCED' | 'CHECKPOINT_ADVANCE';
  classification: string;
  head: string | null;
  paths: string[];
  disallowed?: string[];
  reason: string;
};
export function inspectActiveTaskRouting(
  activeText: string,
  taskId: string,
  stateBranch?: string | undefined,
  liveWorktreeBranches?: string[] | null
): {
  errors: string[];
  declaredCampaign: string | undefined;
  declaredWorktree: string | undefined;
};
