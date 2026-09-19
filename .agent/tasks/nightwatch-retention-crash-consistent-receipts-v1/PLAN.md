# Crash-consistent evidence-retention receipts proposal

## Purpose

Convert NW-AUD-005 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No retention execution, evidence mutation, implementation, external action, or
CI run.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Ground the proposal in the current prepare-delete-final-overwrite ordering,
best-effort receipt writes, result/exit mismatch, existing deletion-recording
requirement, and absence of crash recovery ownership. Specify an append-only
operation journal, durable ordering, exclusive apply, honest uncertainty,
read-only inspection, explicit reconciliation, and adversarial proof.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current retention code/tests/specs and existing change inventory
  inspected; no crash-consistent retention proposal found.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-retention-crash-consistent-receipts-v1 --strict`.

## Decision Log

- 2026-09-20 — Use append-only prepared/outcome/terminal records; reason:
  overwriting one receipt loses the last known-good state and cannot represent
  partial durable progress.
- 2026-09-20 — Preserve a post-removal/pre-outcome crash as uncertainty;
  reason: path absence cannot prove Nightwatch performed the deletion.
- 2026-09-20 — Block new apply until explicit reconciliation; reason:
  continuing past incomplete history compounds irreversible ambiguity.

## Discoveries

- Current unit coverage proves successful plan/apply behavior but has no
  persistence-failure, process-interruption, or concurrent-apply matrix.
- Current CLI exit semantics treat every result except `BLOCKED` as success.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
