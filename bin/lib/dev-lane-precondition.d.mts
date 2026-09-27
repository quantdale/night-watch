// Types for M8's DEV-lane precondition launcher guard. The guard is the
// launcher-side half of the authority in
// `src/core/policy/devLanePreconditions.ts`; `tests/unit/devLanePreconditions.test.ts`
// exercises both halves.

export const DEV_LANE_PRECONDITION_OPEN: string;
export const DEV_LANE_OWNER_TOKEN_ENV: string;

/** True when the invocation targets the DEV lane (`--env=dev`, or a DEV-only launcher). */
export function isDevInvocation(args: readonly string[], options?: { readonly devOnly?: boolean }): boolean;

/**
 * Refuse a DEV-lane launch while a DEV-lane precondition is OPEN. Returns true
 * when the guard applied, false when the invocation was not DEV.
 */
export function guardDevLane(options?: {
  readonly root?: string;
  readonly launcher?: string;
  readonly args?: readonly string[];
  readonly devOnly?: boolean;
  readonly env?: Record<string, string | undefined>;
}): boolean;
