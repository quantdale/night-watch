// ---------------------------------------------------------------------------
// Nightwatch C-11 — `PROD_OBSERVE` public surface.
//
// This cone owns the PRODUCTION authorization decision and nothing else. It
// deliberately does NOT import, and must never import:
//
//   - the DEV campaign orchestrator or the DEV environment loader,
//   - the NEXT campaign execution path,
//   - the generic real-run decision path (`src/core/safety/realRunGate.ts`),
//   - `KNOWN_PRODUCTION_HOSTS` (F-10: the deny table is never inverted).
//
// The absence of those imports is the separation (F-12), and `hardening:check`
// enforces it in both directions.
//
// It creates no production connectivity. There is no launcher, no dispatcher
// and no network call anywhere in this cone: admission returns a DECISION, and
// dispatch — if it ever exists — is a separate, separately authorized concern.
// ---------------------------------------------------------------------------

export * from './types';
export * from './authorization';
export * from './observationConfig';
export * from './killSwitch';
export * from './budget';
export * from './breakers';
export * from './productionRunGate';
export * from './receipt';
