// ---------------------------------------------------------------------------
// Production track — loadability policy.
//
// D-4 is the strongest guard in the system: `config/environments/
// production.json` is structurally unloadable, and no capability in the
// production completion programme changes that. This module records the
// policy as data and evaluates the FUTURE per-session grant shape:
//
//   - global loadability is NEVER;
//   - a grant is per-stage and per-session, never persistent;
//   - a session end revokes it.
//
// The evaluator deliberately has no side effect and no environment-loader
// authority: it cannot make production loadable. The structural gate remains
// `CLOSED_D4` in every current input, so the only reachable state today is
// `UNLOADABLE`. The `OPEN_PER_SESSION` branch exists so the per-session
// revocation property is testable when a future, separately authorized stage
// eventually changes D-4 — it is not reachable from any shipped caller.
// ---------------------------------------------------------------------------

export const PRODUCTION_LOADABILITY_VERSION = 'nightwatch.production-loadability.v1' as const;

export const PRODUCTION_LOADABILITY_POLICY = Object.freeze({
  schemaVersion: PRODUCTION_LOADABILITY_VERSION,
  /** Never globally, under any grant. */
  globalLoadability: 'NEVER' as const,
  /** A future grant is scoped to one stage and one session. */
  grantScope: 'PER_STAGE_PER_SESSION' as const,
  /** A session end revokes loadability; a later run needs fresh authorization. */
  revokeAtSessionEnd: true as const,
  /** D-4 remains closed; the environment loader keeps refusing production. */
  d4StructuralGate: 'CLOSED' as const,
});

export const PRODUCTION_LOADABILITY_REASONS = [
  'NO_ACTIVE_STAGE_SESSION',
  'SESSION_EXPIRED_REVOKED',
  'D4_STRUCTURALLY_UNLOADABLE',
] as const;
export type ProductionLoadabilityReason = (typeof PRODUCTION_LOADABILITY_REASONS)[number];

export interface ProductionStageSession {
  readonly stage: 'C-12' | 'C-13' | 'C-14' | 'P4';
  /** Opaque session identity. Never a credential and never a customer value. */
  readonly sessionId: string;
  readonly grantedAtMs: number;
  readonly expiresAtMs: number;
}

export interface ProductionLoadabilityInput {
  readonly activeSession: ProductionStageSession | null;
  readonly nowMs: number;
  /**
   * The D-4 environment-loader gate. Current callers always pass `CLOSED_D4`;
   * the open value models a future, separately authorized stage only.
   */
  readonly structuralEnvironmentGate: 'CLOSED_D4' | 'OPEN_PER_SESSION';
}

export type ProductionLoadability =
  | {
      readonly schemaVersion: typeof PRODUCTION_LOADABILITY_VERSION;
      readonly state: 'UNLOADABLE';
      readonly reason: ProductionLoadabilityReason;
      readonly sessionId: string | null;
    }
  | {
      readonly schemaVersion: typeof PRODUCTION_LOADABILITY_VERSION;
      readonly state: 'LOADABLE_PER_SESSION';
      readonly reason: null;
      readonly stage: ProductionStageSession['stage'];
      readonly sessionId: string;
    };

/**
 * Resolve loadability. Defaulting (no session, expired session, D-4 closed) is
 * always `UNLOADABLE`; only a live session under an explicitly open
 * structural gate is loadable, and never beyond the session's own expiry.
 */
export function resolveProductionLoadability(input: ProductionLoadabilityInput): ProductionLoadability {
  if (input.structuralEnvironmentGate !== 'OPEN_PER_SESSION') {
    return Object.freeze({
      schemaVersion: PRODUCTION_LOADABILITY_VERSION,
      state: 'UNLOADABLE' as const,
      reason: 'D4_STRUCTURALLY_UNLOADABLE' as const,
      sessionId: input.activeSession?.sessionId ?? null,
    });
  }
  const session = input.activeSession;
  if (session === null) {
    return Object.freeze({
      schemaVersion: PRODUCTION_LOADABILITY_VERSION,
      state: 'UNLOADABLE' as const,
      reason: 'NO_ACTIVE_STAGE_SESSION' as const,
      sessionId: null,
    });
  }
  if (session.expiresAtMs <= input.nowMs) {
    return Object.freeze({
      schemaVersion: PRODUCTION_LOADABILITY_VERSION,
      state: 'UNLOADABLE' as const,
      reason: 'SESSION_EXPIRED_REVOKED' as const,
      sessionId: session.sessionId,
    });
  }
  return Object.freeze({
    schemaVersion: PRODUCTION_LOADABILITY_VERSION,
    state: 'LOADABLE_PER_SESSION' as const,
    reason: null,
    stage: session.stage,
    sessionId: session.sessionId,
  });
}
