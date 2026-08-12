# Nightwatch Phase 5 — Restricted OOPS + Generated Read-Only API Corpus

Status: `IN_PROGRESS` — M0 task creation and Phase 4 closure audit are
complete; implementation and OOPS/source/API work have not started.

## Starting identity

- Starting Nightwatch SHA: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 implementation/checkpoint: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`.
- Phase 4 clean closure HEAD: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 6: `NOT STARTED`.

## Phase 4 closure reconciliation

The Phase 4 implementation and closure commits exist and are ancestral to
current HEAD. The native Phase 4 focused exploration suite passed 16/16,
TypeScript passed, `agent:check` passed with the approved-document warning,
and the closure worktree was clean before this task’s files were created.

The frozen source-defined exact-replay condition is the runner’s
`plannedActions.length > 1 && safetyIsZero(...)` selection predicate. The six
real matrix records each contain one planned action, so the exact-replay ledger
is `0/3 — NOT_APPLICABLE`; it is not relabeled as a pass and no nontrivial
sequence was skipped. Synthetic exact replay remains covered by the 16 tests.

The two Phase 4 `RUNTIME_FAILURE` records are retained as
`NIGHTWATCH_RUNTIME_ARTIFACT`: each followed successful anchor initialization,
attempted one approved action, returned `FAILED` with
`ACTION_TRANSITION_FAILED`, wrote an invalidated transition, and had no
semantic request delta or anomaly fingerprint. Both were fatal to their own
sequence but nonfatal to the corpus and had zero production/proxy/unknown/
mutation/action-unknown/DB safety counts. The E2 record additionally contains
non-causal optional font transport failures classified `DEV_INFRA_TRANSIENT`.
No product anomaly was admitted.

## Closure handoff

The remaining report sections will be filled at M10 with current OOPS source
and binary provenance, adapter/relay/sandbox results, catalog counts and
operation ledger, scenario/replay corpus, DEV results, anomaly levels,
privacy/safety accounting, validation, and the final adversarial review. A
successful closure must leave Nightwatch clean and must not start Phase 6.

## Current next action

Perform the read-only current OOPS source and installed-binary audit described
in M1. Do not execute an existing or generated OOPS scenario until the
restricted profile and local-fixture plan are implemented.
