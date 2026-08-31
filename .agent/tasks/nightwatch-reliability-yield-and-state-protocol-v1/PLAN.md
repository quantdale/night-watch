# Nightwatch Reliability, Yield, and State Protocol Campaign

Task ID: `nightwatch-reliability-yield-and-state-protocol-v1`
Phase: `RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1`
Starting SHA: `7ac265594719f3d93eabf78e0bd9f749ef63dba7`
Last validated implementation: `d12b1d75886987356f3ab6d80ca5b25f0723c471`
Authorization class: `NIGHTWATCH_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1`
Project verdict effect: `PRESERVE`
OpenSpec: `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/`

## Purpose

Make repeated Nightwatch interpretation more deterministic and productive
while preserving the existing `OPERATIONALLY_ACCEPTED` verdict, read-only
scope, owner freeze, and fail-closed execution boundaries.

## Starting State

- Git was fetched and verified at `7ac2655`; local `main` equals
  `origin/main`, with no tracked changes before this task.
- Prior final reproducibility is complete: canonical and detached-source
  parity was `2661` enumerated / `2648` passed / `13` skipped / `0` failed;
  Phase 2C had one strict divergence followed by a passing retry; Phase 4
  retains the sanitized DEV `billinggroups` malformed-JSON anomaly.
- Current source census remains conservative with `NO_SAFE_NEW_FAMILY` and
  Phase 24 as the campaign authority.
- Current project-state acceptance is preserved by a narrow
  `nightwatch-*` post-acceptance exception that this task will replace with
  explicit metadata.

## Scope

Replay reliability and identity; deterministic campaign scoring, diversity,
yield, and clustering; explicit project-verdict effect; continuity and live
documentation truth; chaos/resume and auth lifecycle; diagnostics; measured
performance; cache/property test quality; bounded DEV re-observation; clean
and topology-correct reproducibility; final hygiene.

## Non-Goals

Production/NEXT, DEV mutation, data/infra/deployment operations, sibling
writes, external publication, credential capture, containment weakening,
speculative source proof, opaque model scoring, mass historical migration,
mass dependency upgrade, or retry-based correctness certification.

## Safety Constraints

All real runs remain serial and guarded by the existing environment, owner,
auth, browser/L5/L6, source-currentness, privacy, and campaign gates. Raw
product values, responses, DOM, credentials, cookies, traces, and findings
remain ephemeral or owner-local and never enter Git/task records. Unknown
state, auth, source, replay, and safety outcomes fail closed.

## Architecture / Approach

Use one bounded sanitized observation ledger and one versioned replay
canonicalization policy. Compare semantic identity independently from timing,
telemetry, multiplicity, and environment channels. Extend the existing
portfolio planner with capped integer components and stable tie-breakers, then
apply diversity/redundancy constraints before execution. Keep finding cluster
identity separate from occurrence metadata. Add a strict task metadata field
for verdict effect and consume structured fields in continuity/project-state
validation. Prove each behavior with synthetic/metamorphic fixtures before
running any external observation.

## Milestones

### M0 — Setup and authoritative baseline — COMPLETE

- Bind the new task/OpenSpec route, preserve the accepted verdict, and record
  the starting Git state.
- Run all required baseline gates and inspect the owning implementations.
- Result: scaffold validated and pushed at `d11dae2`; implementation gates and
  Control Center baseline passed. The pre-checkpoint continuity/project/
  handoff failures were closed as expected scaffold state.

### M1 — Phase 2C replay diagnosis and identity — IN_PROGRESS

- Reproduce the divergence with sanitized fixtures and classify its cause.
- Implement strict categorical replay outcomes, canonicalization, bounded
  diagnostics, and permanent regression/property tests.

### M2 — Campaign yield and finding stability — NOT_STARTED

- Backtest current selection; implement measured explainable scoring,
  diversity, yield attribution, and stable conservative clustering.
- Add benign controls and prove no source-proof weakening or false-positive
  regression.

### M3 — Explicit state protocol — NOT_STARTED

- Add and validate `PROJECT_VERDICT_EFFECT` semantics.
- Remove task-name authorization inference, harden continuity parsing, and
  validate bounded live documentation contradictions.

### M4 — Persisted execution and quality hardening — NOT_STARTED

- Expand interruption/resume chaos, auth expiry, diagnostics, cache/property,
  and measured performance coverage.

### M5 — Repeated operation and release evidence — NOT_STARTED

- Run bounded DEV observations if the owner-managed state is valid, preserving
  every divergence/anomaly classification.
- Run local, clean, isolated, Control Center, and final validation, inspect CI
  once, and reconcile all task/project documentation.

## Validation Strategy

Focused pre-fix reproductions precede fixes. Each milestone requires its
defined focused tests, then the affected compatibility cone. Final validation
includes typecheck, hardening, quality-gate spec/inventory, semantic
compatibility, owner provenance, synthetic campaign, continuity/history,
project/handoff, Control Center checks, local and clean gates, canonical and
topology-correct isolated parity, relevant replay/cache/property/chaos/auth
tests, and truthful DEV/CI evidence.

## Decision Log

- 2026-08-31 — Created successor from live `main` at `7ac2655` because prior
  acceptance/reproducibility tasks are terminal and their measured residuals
  require a distinct campaign.
- 2026-08-31 — Initial verdict effect is `PRESERVE`; operational acceptance
  remains the project-level authority while this hardening task is active.

## Discoveries

- Pending: baseline and current implementation audit.

## Deferred Work

- Any source family that does not clear the existing mechanical proof bar.
- Any DEV path blocked by owner authentication or safety gates; record the
  exact bounded blocker rather than bypassing it.

## Completion Criteria

All milestones are terminal; no Critical/High defect is deferred; replay and
state regressions are green; yield claims are evidence-based; local/clean and
isolated parity are exact or explained; DEV and CI are reported truthfully;
task/project/handoff docs agree; a validated checkpoint is committed on clean
`main` with `HEAD == origin/main`.
