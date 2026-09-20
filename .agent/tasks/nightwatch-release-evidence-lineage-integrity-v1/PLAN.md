# Release evidence lineage integrity proposal

## Purpose

Convert NW-AUD-010 into a complete apply-ready remediation plan.

## Starting State

Parent audit at starting SHA `34517c9ba11c97407168fe5879ee03794dfff3e3`;
no implementation authorized.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No release-state edit, evidence rebind, implementation, Git mutation, or CI.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Separate raw check state from categorical evidence relation and effective
condition state; admit `MET` only at exact checkpoint equality; capture one Git
snapshot; bind verdict inputs; prove null/exact/stale/future/divergent/missing/
indeterminate relations through synthetic repositories and mutations.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: evaluator, adapter, config, tests, and active release ownership inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict validation passes; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-release-evidence-lineage-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — Only exact commit equality can certify a condition; newer or
  divergent evidence is about different bytes.
- 2026-09-20 — Replace boolean ancestry with a closed categorical relation and
  keep operational Git failure indeterminate.

## Discoveries

- Current all-met pure tests intentionally use `isAncestor: () => false`,
  masking every non-ancestor class.
- Null evidence already exists for not-yet-implemented conditions and would
  remain met if their raw check later becomes met.

## Deferred Work

Every implementation task in the OpenSpec checklist.

## Completion Criteria

All planning artifacts complete, strict-valid, and unimplemented.
