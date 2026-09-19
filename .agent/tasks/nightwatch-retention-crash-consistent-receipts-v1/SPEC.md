# Crash-consistent evidence-retention receipts proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-005 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Retention writes a `STARTED` receipt with an empty deleted set, removes
  candidates, and best-effort overwrites the same receipt with final state.
- A crash after removal can therefore leave no durable target outcome.
- Final receipt failure can return `result: APPLIED` with
  `receiptFinalized: false`, and the CLI exits zero because only `BLOCKED`
  changes its exit status.

## Required deliverables

- OpenSpec proposal, design, new capability spec, and implementation tasks.
- Exact prepared/outcome/terminal journal authority, fail-closed result/exit
  semantics, recovery rules, concurrency, durability, privacy, fault
  injection, and mutation coverage.
- Strict OpenSpec validation.

## Non-goals

No retention implementation, deletion, evidence-store mutation, journal
creation, recovery action, dependency, environment, network, CI, or Alphaus
action.

## Safety constraints

Planning artifacts only. The parent owned session remains the sole writing
authority. No evidence candidate or owner-local findings path may be touched.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifact classes exist and strict validation passes.
- The plan never fabricates deletion certainty across the filesystem crash
  window and never retries deletion during recovery.
- Successful CLI results require a durably verified terminal record.
- Implementation tasks are explicitly declared outside this planning task.
