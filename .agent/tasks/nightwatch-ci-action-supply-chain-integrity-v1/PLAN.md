# CI action supply-chain integrity proposal

## Purpose

Convert NW-AUD-001 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No implementation or external action.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Ground the proposal in the current workflow and hardening regex, modify the
published exact-head CI capability, specify exact action identities and
mutation proof, then strict-validate.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current refs/rule verified and no existing pinning change found.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, delta spec, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-ci-action-supply-chain-integrity-v1 --strict`.

## Decision Log

- 2026-09-19 — Extend `exact-head-ci-baseline`; action code is part of the
  exact-head trust chain, so a disconnected new capability would duplicate
  authority.

## Discoveries

- The current regex accepts substring lookalikes and suffixed refs.
- The workflow's read-only permission reduces authority but does not prevent
  private-source reads or workspace tampering by pre-gate action code.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
