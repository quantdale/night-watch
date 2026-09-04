// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the P1 kill switch.
//
// Evaluated at admission entry, immediately before attach, AND on every
// observation poll while attached. Fail-closed on probe error: a probe that
// throws is ENGAGED, never absent.
//
// Duplicated from the C-11 kill-switch discipline rather than imported, for
// the F-12 reason recorded in `authorization.ts`.
// ---------------------------------------------------------------------------

export const P1_KILL_SWITCH_VERSION = 'nightwatch.p1-kill-switch.v1' as const;

export type P1KillSwitchProbe = () => boolean;

export type P1KillSwitchState = 'ABSENT' | 'ENGAGED';

export function evaluateP1KillSwitch(probe: P1KillSwitchProbe | null | undefined): P1KillSwitchState {
  if (probe === null || probe === undefined) return 'ENGAGED';
  try {
    return probe() === true ? 'ENGAGED' : 'ABSENT';
  } catch {
    return 'ENGAGED';
  }
}

/** Filesystem-backed probe: presence of the stop file engages the switch. Fails closed on error. */
export function createP1StopFileProbe(
  stopFilePath: string,
  exists: (path: string) => boolean,
): P1KillSwitchProbe {
  return () => {
    try {
      return exists(stopFilePath);
    } catch {
      return true;
    }
  };
}
