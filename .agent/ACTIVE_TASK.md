# Active Task

Task ID: phase-2b-three-readonly-ripple-journeys
Phase: 2B
Title: Three Deterministic Read-Only Ripple Journeys
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2b-three-readonly-ripple-journeys
Starting SHA: ec4c14376923ffbe12356dd180218eb09cf4f75f
Current SHA: 78e5d1f049064e594f99ed7e600ecffb081d6b23
Last validated implementation SHA: 78e5d1f049064e594f99ed7e600ecffb081d6b23
Current milestone: M9 — Journey 3 first observation and fresh-context replay (IN_PROGRESS)
Last checkpoint: 2026-08-12 — `329c32d`; Journey 2's bounded diagnostic
first/replay pair passed in fresh contexts with strict invariants; its prior
L0 font anomaly did not recur.
Next action: run exactly one fresh Journey 3 observation/replay pair with
`--journey-id=ripple-account-inventory`; do not repeat Journey 1/2 or inspect
response bodies.

## Phase 2A closure handoff

Phase 2A remains closed. Its implementation baseline is `a6d7c8b`, validated
closure checkpoint is `9bf2c45`, and clean terminal HEAD is `ec4c143`; the
descendants after the implementation baseline are documentation/continuity
updates. The fresh capture and two successful authenticated landing contexts
remain external/sanitized historical evidence. Phase 2B is now the sole active
engineering target.
