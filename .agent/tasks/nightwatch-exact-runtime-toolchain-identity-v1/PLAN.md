# Exact runtime toolchain identity proposal

## Purpose

Convert NW-AUD-004 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No toolchain selection/download, implementation, external action, or CI run.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Ground the proposal in the current major-only CI selector, unlocked
`node@20` clean fallback, major-only receipt, current reproducibility spec, and
absence of exact-toolchain ownership. Specify an exact data-only manifest,
pre-install admission, receipt parity, mutation proof, and manual rotation.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current selectors, resolver, receipt schema, and existing change
  inventory inspected; no exact runtime identity proposal found.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, both capability specs, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-exact-runtime-toolchain-identity-v1 --strict`.

## Decision Log

- 2026-09-20 — Add `runtime-toolchain-integrity` and modify
  `reproducibility`; reason: exact runtime admission is a new trust capability,
  while clean-machine behavior already has published authority that must be
  strengthened rather than contradicted.
- 2026-09-20 — Keep CI action code identity as a predecessor; reason: pinning
  setup-node code and pinning the runtime it selects close different attack and
  reproducibility surfaces.

## Discoveries

- `node@20` is referenced only by the clean wrapper and is absent from the
  project lockfile.
- Current focused tests prove receipt transport and help behavior, not exact
  runtime selection or no-install-on-mismatch.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
