// ---------------------------------------------------------------------------
// Nightwatch — action safety kernel.
//
// Every planned UI action is classified BEFORE it executes. An action is
// 'passive' when it cannot mutate production state (read-only navigation,
// observation, waiting). Non-passive actions are rejected by
// assertPassiveAction() — Nightwatch is strictly read-only in every
// environment. Product-specific classification lives in
// src/products/<product>/actions.ts.
// ---------------------------------------------------------------------------

export type ActionKind =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'type'
  | 'press'
  | 'select'
  | 'wait'
  | 'assert'
  | 'hover'
  | 'screenshot'
  | 'other';

export interface NightwatchAction {
  id: string;
  kind: ActionKind;
  label: string;
  /** True when the action cannot mutate state; false = blocked by the kernel. */
  passive: boolean;
  /** Set when passive=false: explains WHY the action was classified non-passive. */
  note?: string;
}

/** Thrown by assertPassiveAction when the action is not passive. */
export class ActionNotPassiveError extends Error {
  constructor(public readonly action: NightwatchAction) {
    super(`non-passive action blocked by safety kernel: "${action.label}" (kind=${action.kind}, id=${action.id})`);
    this.name = 'ActionNotPassiveError';
  }
}

/** Fail-closed gate: throws ActionNotPassiveError when the action is not passive. */
export function assertPassiveAction(action: NightwatchAction): void {
  if (!action.passive) throw new ActionNotPassiveError(action);
}
