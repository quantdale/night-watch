# Change-shadow offline runtime integrity proposal

## Purpose

Convert NW-AUD-007 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No `change:shadow` execution, compiler/package resolution, dependency install,
implementation, sibling read, external action, or CI run.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Ground the proposal in the current `npx tsc` bootstrap, exact lockfile entry,
missing local dependency state, completed loader contract, and active
certification-toolchain scope. Specify direct repository-local compiler
admission, pre-mutation validation, per-invocation derivative ownership,
identity-safe cleanup, full-program semantic parity, fixture-only end-to-end
execution, and mutation proof.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current entrypoint, loader, tests, lockfile, published spec, and
  active changes inspected; no existing requirement closes remote-capable
  compiler bootstrap for this developer command.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, delta spec, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-change-shadow-offline-runtime-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — Preserve full-program `tsc` semantics and directly invoke the
  admitted local compiler rather than assuming the shared transpile loader is
  equivalent.
- 2026-09-20 — Validate compiler identity before any derivative mutation and
  use unique per-invocation output to remove cross-process deletion/import
  races.
- 2026-09-20 — Prove the normal entrypoint with synthetic Git repositories and
  package-runner traps; source matching alone is insufficient.

## Discoveries

- Existing tests execute only `--help`, so they never reach `compileCore()`.
- Production-completion owns generic CLI output/path/argument consistency, but
  does not prohibit this compiler bootstrap.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
