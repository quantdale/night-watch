# Canonical promotion transaction serialization proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-011 without implementing or authorizing a promotion.

## Established starting state

- Parent: `nightwatch-exhaustive-repository-audit-proposals-v1`; starting SHA
  `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Approval consumption is exclusive by approval ID only.
- Distinct approvals at one clean preimage can both pass preflight and write.
- Crashes can separate consumption/rename from receipt truth; directory sync
  failure is swallowed as best effort.
- Standing canonical promotion authority is `NONE` and remains frozen.

## Required deliverables

- Proposal, design, `canonical-promotion-transaction-integrity` spec, tasks.
- Repository-target serialization, immutable stage truth, under-authority
  revalidation, required durability, non-writing reconciliation, real races,
  killed-child faults, privacy, and mutation proof.

## Non-goals

No promotion, adoption, implementation, Git write, external action, or new
authority.

## Safety constraints

Planning and read-only evidence only; synthetic future proof only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; frozen authority preserved; future tasks
  explicitly unperformed.
