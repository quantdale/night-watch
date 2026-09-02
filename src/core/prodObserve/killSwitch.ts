// ---------------------------------------------------------------------------
// Nightwatch C-11 — the production kill switch.
//
// Evaluated TWICE: once at qualification entry and once immediately before
// dispatch. The independent review is right that it is the cheapest and most
// urgent check, and the second evaluation is the one that matters: a
// qualification that passed a moment ago must not authorize a request after the
// owner has revoked. No cached ALLOW may survive revocation.
//
// The probe is injected rather than reading the filesystem here, so the
// revocation RACE is testable deterministically — engage between the two
// evaluations and assert nothing dispatches.
// ---------------------------------------------------------------------------

export const PRODUCTION_KILL_SWITCH_VERSION = 'nightwatch.production-kill-switch.v1' as const;

/** Returns true when observation is FORBIDDEN. Fail-closed on any doubt. */
export type KillSwitchProbe = () => boolean;

export type KillSwitchState = 'ABSENT' | 'ENGAGED';

export function evaluateKillSwitch(probe: KillSwitchProbe): KillSwitchState {
  let engaged: boolean;
  try {
    engaged = probe() === true;
  } catch {
    // A probe that cannot answer is treated as ENGAGED. An unreadable kill
    // switch must never be read as permission.
    return 'ENGAGED';
  }
  return engaged ? 'ENGAGED' : 'ABSENT';
}

/**
 * A filesystem-backed probe: the presence of the stop file forbids observation.
 * Any error reads as ENGAGED, so an unreadable directory cannot grant
 * permission.
 */
export function createStopFileKillSwitchProbe(stopFilePath: string, exists: (file: string) => boolean): KillSwitchProbe {
  return () => {
    try {
      return exists(stopFilePath);
    } catch {
      return true;
    }
  };
}
