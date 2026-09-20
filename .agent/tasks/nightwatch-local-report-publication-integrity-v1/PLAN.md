# Local report publication integrity proposal

## Purpose

Convert NW-AUD-009 into a complete apply-ready remediation plan.

## Starting State

Parent audit campaign at starting SHA
`34517c9ba11c97407168fe5879ee03794dfff3e3`; no implementation authorized.

## Scope

OpenSpec artifacts and matching completed planning-task continuity only.

## Non-Goals

No report execution, unsafe-path reproduction, artifact mutation, dependency
install, implementation, external action, or CI run.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Ground the proposal in the seven direct ignored-artifact writers, their schema
declarations and consumers, and the safe publication patterns elsewhere in the
repository. Specify a complete checked inventory, admission before mutation,
safe destination identities, atomic current replacement, immutable topology
receipts, platform qualification, privacy-safe failures, real-process
sentinels, fault injection, concurrency, and mutation enforcement.

## Milestones

### M0 — Evidence and deduplication

- Status: COMPLETE
- Acceptance: current writers, schemas, destinations, existing primitives,
  tests, and active planning inspected; no existing requirement closes the
  exact seven-writer local publication boundary.

### M1 — OpenSpec artifacts

- Status: COMPLETE
- Acceptance: proposal, design, new capability spec, and tasks complete.

### M2 — Planning validation

- Status: COMPLETE
- Acceptance: strict OpenSpec validation passes; implementation is declared
  not in scope.

## Validation Strategy

`openspec validate nightwatch-local-report-publication-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — Use one shared publisher with `CURRENT_REPLACE` and
  `APPEND_IMMUTABLE` profiles; the two histories have different replacement
  authority.
- 2026-09-20 — Preserve intentional explicit output selection while refusing
  symlink, irregular-type, unstable-identity, and unsafe-commit paths.
- 2026-09-20 — Use atomic linearized last-commit-wins semantics for
  regenerable current reports and exclusive unique files for historical
  receipts; persistent locks are unnecessary for current snapshots.

## Discoveries

- Five report schemas plus change intelligence are declared persisted/private
  artifacts but publish through direct writes.
- Gate topology already sets mode `0600`, but its timestamp-only direct write
  can replace a receipt on collision.
- Existing safe primitives demonstrate pieces of the solution but have
  different authority and cannot be adopted without an explicit profile.

## Deferred Work

Every implementation and validation task in the OpenSpec task list.

## Completion Criteria

All planning artifacts are complete, strict-valid, and implementation remains
unperformed.
