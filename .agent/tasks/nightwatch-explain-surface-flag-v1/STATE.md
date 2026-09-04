# Task State

## Identity

Task ID: nightwatch-explain-surface-flag-v1
Phase: EXPLAIN_SURFACE_FLAG_V1
Status: IN_PROGRESS
Starting SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Last validated implementation SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Last substantive checkpoint SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-explain-surface-flag--4fe14ac8
Last checkpoint: M1 done — session claimed at a39f49c; SPEC/PLAN/STATE + OpenSpec written; fix (M2) next
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LAST_VALIDATED_IMPLEMENTATION_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_EXPLAIN_SURFACE_FLAG_V1_STATUS: IN_PROGRESS

## Objective

Accept the documented `--surface=<id>` form for `explain-surface`
without weakening validation; regression-test both forms; integrate.

## Current Milestone

M1 — Task record and session (IN_PROGRESS, routing files landing).

## Completed Milestones

None yet (M1 in progress).

## Work In Progress

M1 routing: ACTIVE_TASK + EXECUTION_PROMPT + OpenSpec + conformance.

## Exact Next Action

Finish routing files, run handoff/agent checks, then apply the M2 fix.

## Files Changed

None yet (task record only, this checkpoint).

## Validation Ledger

No validation results yet (M1).

## Decisions Made During This Task

Decision: fix code, not README.
Reason: flag form is order-independent and already documented; the
positional fragility (flags-before-id break) is itself a defect.

## Defects found and disposition

None introduced. Target: README/code incoherence on the surface-id
argument form (documented form refused).

## Discoveries

- `explain` shares the positional pattern but is undocumented with
  args; intentionally untouched.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

None. C-12 and all owner-gated campaigns remain out of scope.

## Resume Recipe

Continue at M1: finish routing, verify checks, implement M2.

## Completion Snapshot

Not complete. No snapshot until M3.
