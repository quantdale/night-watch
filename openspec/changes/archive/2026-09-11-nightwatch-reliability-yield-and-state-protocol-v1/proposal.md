## Why

Nightwatch is operationally accepted, but repeated DEV evidence still shows a
strict Phase 2C replay can diverge once and pass on a bounded retry. Its local
campaign intelligence also has room to improve useful selection without
inventing a new proof family, while project truth still relies on a narrow
task-name exception to preserve acceptance during hardening. This change makes
replay outcomes explainable, campaign choice more productive and diverse, and
continuity/project authorization explicit and fail closed.

## What Changes

- Add a bounded replay-observation ledger and deterministic divergence
  classification that separates timing, benign telemetry, product drift,
  environment/auth variation, capture defects, and unknown outcomes.
- Audit and strengthen replay identity canonicalization with metamorphic
  coverage, preserving meaningful behavior differences and stable finding
  fingerprints.
- Improve deterministic campaign prioritization, scheduling, diversity, and
  yield attribution using only source/proof/coverage/history metadata.
- Strengthen finding clustering and false-positive controls for repeated real
  anomalies without persisting raw product values.
- Replace project-state authorization inferred from task-name prefixes with
  explicit task verdict-effect metadata supporting preservation,
  requalification, supersession, and fail-closed acceptance.
- Harden continuity and live-document contradiction parsing around explicit
  structured fields, including negative coverage for malformed and conflicting
  states.
- Expand bounded chaos, auth-expiry, cache/property, observability, and
  performance regressions; preserve the owner-frozen infrastructure/data
  boundary and strict replay semantics.

## Capabilities

### New Capabilities

- `replay-reliability`: Deterministic replay identity, observation ledgers,
  divergence classification, and bounded diagnostics.
- `campaign-yield-scheduling`: Explainable proof-aware prioritization,
  diversity constraints, yield attribution, and stable clustering.
- `task-verdict-protocol`: Explicit task metadata for project-verdict effects,
  continuity state, and contradiction-safe live-state validation.

### Modified Capabilities

- None. The repository has no main `openspec/specs/` catalog; these are new
  additive capability contracts for this successor.

## Impact

- `src/core/journeys`, browser observation/replay, campaign portfolio and
  triage/finding modules; their deterministic unit and synthetic campaign
  tests.
- `bin/agent-state.mjs`, `bin/project-state-check.mjs`, handoff/quality gates,
  active-task metadata, and relevant `.agent` fixtures.
- Cache/property/chaos/auth test fixtures and sanitized operator diagnostics.
- Existing DEV launchers may be exercised serially with owner-managed auth;
  no production, data-layer, infrastructure, sibling-repository write, or
  publication capability is added.
