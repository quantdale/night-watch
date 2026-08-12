# Phase 4 Exploration Models

Status: `IMPLEMENTATION_PENDING`

Planned schemas:

- `nightwatch.exploration-state.phase4.v1`
- `nightwatch.exploration-transition.phase4.v1`
- `nightwatch.exploration-model.phase4.v1`
- `nightwatch.exploration.phase4.v1` evidence

The model separates source-allowed edges from runtime-observed edges,
privacy-safe canonical state from raw browser state, and novelty from oracle
anomalies. The implementation is a small generic engine, not a crawler:

- State IDs are SHA-256 over canonical route/surface/structural booleans,
  safe-view enums, semantic family IDs, auth class, terminal flags, and the
  sorted approved availability set. Raw DOM, text, IDs, bodies, and timing are
  excluded.
- Transition IDs are canonical `(fromStateId, actionId, toStateId)` values
  under the catalog/model fingerprint; run IDs never enter logical identity.
- The planner is a seeded frontier walk. It sorts action IDs, excludes unsafe,
  stale, unavailable, exhausted, or precondition-false actions with explicit
  reasons, and uses SplitMix64 v1 only to tie-break the least-visited safe
  bucket.
- The runtime semantic tripwire is independent of the catalog label. Any
  `KNOWN_MUTATION` or strongly attributed `ACTION_CAUSED_UNKNOWN` stops; a new
  host is blocked by the existing outbound policy and stops the run.
- Seed replay regenerates decisions. Exact-sequence replay executes recorded
  action IDs only and stops on `REPLAY_PRECONDITION_DIVERGENCE`.

Source-allowed edges are not runtime-observed until an adapter completes them.
Runtime-unavailable controls remain evidence, not anomalies.
