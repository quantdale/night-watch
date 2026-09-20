# Local report publication integrity proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-009 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Six current-report writers use direct `mkdirSync` plus `writeFileSync`; five
  default to ignored `artifacts/**/current.json`, and change-intelligence writes
  the same way to its selected output.
- Gate topology writes timestamp-only historical receipts directly beneath
  `artifacts/topology-receipts/`.
- Direct publication can follow symlinks, truncate a previous complete report,
  inherit inconsistent modes, or overwrite a same-millisecond topology
  receipt.
- Existing retention, gate-receipt, schema-export, private-store, and generic
  CLI contracts do not own this seven-writer ignored-artifact boundary.

## Required deliverables

- OpenSpec proposal, design, new `local-report-publication-integrity` spec, and
  implementation tasks.
- Complete checked writer inventory; pre-mutation serialization/schema/size
  admission; safe path/type handling; private modes; safe categorical errors.
- Atomic linearized replacement for current reports and immutable no-replace
  topology receipt publication.
- Real-CLI external-sentinel, fault-injection, concurrency, and non-vacuous
  structural/mutation proof.
- Precise boundaries from retention journals, private stores, schema export,
  and already-owned generic CLI behavior.

## Non-goals

No source/bin implementation, artifact generation, destructive mutation,
dependency installation, Alphaus action, sibling read, product execution, CI
run, or external publication.

## Safety constraints

Planning artifacts and local read-only evidence only. Do not execute any writer
against prepared unsafe paths during this task; future tests use isolated
synthetic roots and sentinel values.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifact classes exist and strict validation passes.
- Requirements distinguish regenerable current replacement from immutable
  historical receipt publication and define honest concurrency/durability.
- The full seven-writer denominator and bypass guard are non-vacuous.
- Implementation tasks are explicitly declared outside this planning task.
