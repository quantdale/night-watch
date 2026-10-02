// Types for the committed-measurement consumer (`bin/lib/committed-measurement.mjs`).
export const HOST_BOUND_SUBJECTS: readonly string[];
export function consumeCommittedMeasurement(
  root: string,
  subject: string,
  checkpointSha: string | null,
  live: { state: string; detail: string },
): { state: string; detail: string };
