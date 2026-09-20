# Release evidence lineage integrity proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-010 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Release conditions retain raw `MET` unless evidence is a proven strict
  ancestor of the certified checkpoint.
- Null, later `HEAD`, missing, future, and divergent evidence are therefore
  non-exact but can count as met.
- The Git adapter collapses ancestry exit 1 and operational failure into the
  same false result; tests exercise only stale-ancestor refusal.

## Required deliverables

- Proposal, design, new `release-evidence-lineage-integrity` spec, and tasks.
- Exact checkpoint equality for every met condition; categorical commit
  resolution; snapshot-stable `HEAD`; effective-state counting and verdict
  binding.
- Pure and full-process Git-relation matrices plus non-vacuous mutations.
- Coordination with, but no duplication of, production-completion release
  definition and exact-head CI/toolchain changes.

## Non-goals

No release advancement, owner-status choice, evidence fabrication, source/bin
implementation, Git mutation, CI run, product action, or external publication.

## Safety constraints

Planning artifacts and read-only Git evidence only.

## Declared Deletions

None.

## Acceptance criteria

- Four OpenSpec artifact classes are complete and strict-valid.
- Every evidence identity/lineage state has a deterministic non-success or
  exact-success contract.
- Implementation tasks are explicitly outside this planning task.
