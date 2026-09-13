# Task State

## Identity

Task ID: nightwatch-validation-classification-and-skip-truth-v1
Phase: VALIDATION_CLASSIFICATION_AND_SKIP_TRUTH_V1
Status: IN_PROGRESS
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Branch: session/nightwatch-open-spec-truth-closu-7138ca21
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_VALIDATED_IMPLEMENTATION_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_VALIDATION_CLASSIFICATION_AND_SKIP_TRUTH_V1_STATUS: IN_PROGRESS

## Objective

Implement
`openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/`
so skip identities are enforced, universe classification matches the default
runner, stored npm scripts exist, and the production-completion spec counts
are corrected.

## Current Milestone

Milestone ID: M1 — skip-identity enforcement (tasks 1.1–1.4)

## Completed Milestones

None yet.

## Work In Progress

The task record exists so the change↔task error can be enabled; the
implementation follows the campaign's M3.

## Exact Next Action

Extend `config/semantic-compatibility.v1.json` with `canonicalSkipIdentities`
and make `bin/semantic-compat.mjs` fail `UNDECLARED_SKIP` /
`SKIP_POLICY_UNCONFIGURED` before running the cone once to measure live skip
identities.

## Files Changed

Pending: `config/semantic-compatibility.v1.json`, `bin/semantic-compat.mjs`,
`bin/lib/validation-classification.mjs`, `bin/hardening-check.mjs` or its
call site, `config/validation-universe.v1.json`,
`config/validation-lane-state.v1.json`, `config/reference-graph.v1.json`,
`package.json`, `tests/fixtures/*-race-child.mjs`,
`openspec/changes/nightwatch-production-completion-programme-v1/specs/`,
focused tests, and the change's `tasks.md`.

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

- `lanes:manual` remains production-completion G2 work.

## Resume Recipe

1. Read the change's `design.md` and spec deltas.
2. Implement in task order, running each focused check after its rule.
3. Measure the live skip identities before declaring any allowlist entry.

## Completion Snapshot

The task is IN_PROGRESS; no completion snapshot exists yet.
