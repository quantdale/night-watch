# Session mutation authority binding proposal

## Purpose

Convert NW-AUD-006 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No session lifecycle execution beyond read-only dry-run evidence, no
implementation, external action, or CI run.

## Safety Constraints

LOCAL / READ-ONLY / DRY-RUN evidence; planning writes only.

## Architecture / Approach

Ground the proposal in parser/dispatcher arbitrary-root selection,
target-record-only ownership classification, non-CAS record replacement, C-00
requirements, and live canonical-to-session dry-run evidence. Specify exact
checkout/code binding, public freshness expectations, continuity coherence,
serialized durable record revisions, command roles, and pre-network proof.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current session/workspace code, tests, published C-00 spec, and
  active changes inspected; no invocation-authority proposal found.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, delta spec, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-session-mutation-authority-binding-v1 --strict`.

## Decision Log

- 2026-09-20 — Remove arbitrary root selection from mutators while retaining
  read-only cross-root inspection; reason: target selection is the confused
  deputy primitive.
- 2026-09-20 — Use public expected session/HEAD values plus a locked record
  revision, not a fake local secret; reason: all agents share one OS account.
- 2026-09-20 — Hold record transition authority through integration network
  callbacks; reason: admission must remain current until push and final state.

## Discoveries

- Current tests prove a direct second claim is refused but never call release
  or integrate from a foreign checkout against a live session.
- Ordinary record replacement is atomic rename but not compare-and-swap, so
  concurrent lifecycle updates can overwrite a newer transition.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
