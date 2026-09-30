export declare function topologyCertificationForCheckpoint(
  receipts: ReadonlyArray<unknown>,
  checkpointSha: string | null,
): { checked: boolean; certifying: boolean; detail: string };
