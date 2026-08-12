# Active Task

Task ID: phase-2b-three-readonly-ripple-journeys
Phase: 2B
Title: Three Deterministic Read-Only Ripple Journeys
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2b-three-readonly-ripple-journeys
Starting SHA: ec4c14376923ffbe12356dd180218eb09cf4f75f
Current SHA: a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba
Last validated implementation SHA: a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba
Current milestone: M8 — Journey 2 first observation diagnostic review (IN_PROGRESS)
Last checkpoint: 2026-08-12 — `15c3c9f`; Journey 1 first/replay passed in
fresh contexts with strict invariants, and Journey 2 first stopped safely on
one generic oracle anomaly before replay.
Next action: implement only a bounded generic resume selector if required,
revalidate locally, and perform one fresh Journey 2 diagnostic observation.
Do not repeat Journey 1 or inspect the 502 body.

## Phase 2A closure handoff

Phase 2A remains closed. Its implementation baseline is `a6d7c8b`, validated
closure checkpoint is `9bf2c45`, and clean terminal HEAD is `ec4c143`; the
descendants after the implementation baseline are documentation/continuity
updates. The fresh capture and two successful authenticated landing contexts
remain external/sanitized historical evidence. Phase 2B is now the sole active
engineering target.
