# EXECUTION PROMPT — C-09 Spec-Derived Expectations

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-spec-derived-expectations-c09-v1
OpenSpec: openspec/changes/nightwatch-spec-derived-expectations-c09-v1/
Planned-From: da369dad6c96472820790ffa4b69a773d2d26033
Target Branch: main
Predecessor Task ID: nightwatch-deployment-fact-binding-c08-v1
Predecessor Status: COMPLETE

## Mission

Turn product specification into mechanically checkable expectations bound to
exact operations with full provenance, classify every scenario in the corpus
rather than dropping any, and prove a specification witness alone never grants
a read-only proof.

## Authority

Repository-local, offline, observational. C-09 ADMITS expectations and
evaluates none; it issues no request and grants no request authority. No
production, NEXT or DEV contact; C-12 is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-spec-derived-expectat-4dff694d`.

## Ordered workstreams

1. Task record, OpenSpec change, measured inventory.
2. Scenario classification over all 332, totality enforced.
3. Expectation extractor: TYPE, ENUM, SHAPE, CARDINALITY.
4. Provenance, currentness and STALE behaviour.
5. W-SPEC reports HELD; the boundary is demonstrated.
6. Hardening rule and negative probes.
7. Validation, integration, exact-head CI, closure.

## Constraints

No natural-language interpretation and no prose-derived assertion. No fuzzy
operation matching. No required-key expectation, because the artifacts contain
none. No new oracle invariant kind unless the existing vocabulary provably
cannot represent an otherwise-admissible expectation. `AMBIGUOUS` and
`NO_OPERATION_BINDING` grant nothing. A changed artifact yields `STALE`, never
a silent rebind. Correctness outranks the count.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the C-06 suite that
asserts the W-SPEC boundary, the new C-09 suite, the canonical regression,
`gate:local`, `gate:clean`, exact-head GitHub Actions.

## Acceptance and completion gates

The nine acceptance rows of
`.agent/tasks/nightwatch-spec-derived-expectations-c09-v1/SPEC.md`, each
carried in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
