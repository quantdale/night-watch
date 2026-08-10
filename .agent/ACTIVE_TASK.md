# Active Task

Task ID: phase-2a-controlled-observation
Phase: 2A
Title: First Controlled Authenticated Ripple Dev/Next Observation
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2a-controlled-observation
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 868b639fb6a5374bea6af99e70e570f398e3e448
Last validated implementation SHA: 868b639fb6a5374bea6af99e70e570f398e3e448
Current milestone: M7 — First controlled authenticated landing observation (IN_PROGRESS)
Last checkpoint: 2026-08-10 — implementation `868b639fb6a5374bea6af99e70e570f398e3e448` repairs the `75d877c` runner target-plumbing failure. Absent `--ui-url` now reaches the gate without a UI override and resolves the canonical DEV target; explicit non-empty overrides remain strict and explicit blank values are rejected.
Next action: M7 first observation attempted and stopped before replay because
the approved DEV session resolved to `/ripple/dashboard` but the observer only
confirmed the configured `/ripple/` path; stability also timed out and the
authenticated shell root was not confirmed. Checkpoint the bounded readiness
contract repair and validation before any retry. Do not begin Phase 2B.
