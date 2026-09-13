# Nightwatch continuity live-waypoint binding

## Purpose

Close the operational-waypoint gap DEF-FC-04 left open: the routing documents
a fresh agent reads first must describe the live Git and task world, or
`AGENT_CONTINUITY` fails closed.

## Starting State

- Change planned at `ebe26ce`; task record created by the
  `nightwatch-open-spec-truth-closure-v1` campaign before the
  `LEDGER_CHANGE_WITHOUT_TASK` error is enabled.
- `inspectActiveTaskRouting` compares the declared worktree to STATE
  `Branch:` as a string only; the IN_PROGRESS state machine never compares
  ACTIVE and STATE waypoints.

## Scope

Milestone identity, stale next action, live worktree existence, the ledger
error, tests and the landing reconciliation.

## Non-Goals

Other campaigns, prose diffing, auto-creating task records, C-00 changes.

## Safety Constraints

Read-only checks; synthetic fixtures never mutate the live ACTIVE_TASK.

## Architecture / Approach

Pure milestone/next-action inspectors in the continuity protocol module;
live worktree branch lookup through the shared porcelain parser used by the
workspace integrity checker; the ledger diagnosis switches to an error only
for active changes whose STATE.md is absent.

## Milestones

- [ ] M1 — Inspectors and error codes (tasks 1.1–1.6).
- [ ] M2 — Synthetic-fixture tests (tasks 2.1–2.3).
- [ ] M3 — Landing reconciliation and gate validation (tasks 3.1–3.3).
- [ ] M4 — Closeout (tasks 4.1–4.2).

## Validation Strategy

Focused `agentContinuityProtocol` / `productionCompletionOpenWork` suites,
`npm run agent:check`, `npm run typecheck`, and the change's strict OpenSpec
validation.

## Decision Log

- 2026-09-14 — Token extraction uses the existing `Current milestone` /
  `Milestone ID` fields, not a new structured field, to avoid
  `DUPLICATE_CONTINUITY_FIELD`.

## Discoveries

- (recorded as measured)

## Deferred Work

None.

## Completion Criteria

As the change's tasks: every box ticked with evidence, the gate green, and no
production-completion implementation box ticked as a side effect.
