# Task State

## Identity

Task ID: nightwatch-published-spec-baseline-integrity-v1
Phase: PUBLISHED_SPEC_BASELINE_INTEGRITY_V1
Status: IN_PROGRESS
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Branch: session/nightwatch-open-spec-truth-closu-7138ca21
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_VALIDATED_IMPLEMENTATION_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PUBLISHED_SPEC_BASELINE_INTEGRITY_V1_STATUS: IN_PROGRESS

## Objective

Implement `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/`
so the archive index and the published spec Purposes are machine-checked and
substantive.

## Current Milestone

Milestone ID: M1 — parser and diagnostics (tasks 1.1–1.2)

## Completed Milestones

None yet.

## Work In Progress

The task record exists so the change↔task error can be enabled; the
implementation follows the campaign's M2.

## Exact Next Action

Add `bin/lib/openspec-archive-index.mjs` with the strict four-column row
grammar and the `ARCHIVE_INDEX_*` diagnostics, then wire it into
`bin/agent-state.mjs`.

## Files Changed

Pending: `bin/lib/openspec-archive-index.mjs`,
`tests/unit/openspecArchiveIndex.test.ts`,
`openspec/changes/archive/ARCHIVE-INDEX.md`, `openspec/specs/*/spec.md`
(Purpose only), `bin/agent-state.mjs`,
`openspec/changes/nightwatch-published-spec-baseline-integrity-v1/tasks.md`.

## Validation Ledger

- Pending implementation.

## Decisions Made During This Task

See `PLAN.md` Decision Log.

## Discoveries

- (recorded as measured)

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

None.

## Resume Recipe

1. Read the change's `design.md` D1–D4.
2. Implement in task order; regenerate the heading snapshot before and after
   the Purpose fills and compare.
3. Tick boxes only with the evidence recorded here.

## Completion Snapshot

The task is IN_PROGRESS; no completion snapshot exists yet.
