export declare function topologyCertificationForCheckpoint(
  receipts: ReadonlyArray<unknown>,
  checkpointSha: string | null,
): { checked: boolean; certifying: boolean; detail: string };
export declare function topologyCertificationVerdict(
  topology: { checked: boolean; certifying: boolean; detail: string },
  input: { ciStatus: string | null; executedSha: string | null; checkpointSha: string | null; runId?: unknown; blockClass?: unknown },
): { state: 'MET' | 'UNMET'; detail: string };
