# CI action supply-chain integrity proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-001 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Current workflow uses mutable `actions/checkout@v4` and
  `actions/setup-node@v4` references.
- Current workflow hardening admits them with an unanchored substring regex.

## Required deliverables

- OpenSpec proposal, design, delta specification, and implementation tasks.
- Evidence-backed scope, negative cases, rollout, rollback, and validation.
- Strict OpenSpec validation.

## Non-goals

No workflow, hardening, test, product, dependency, environment, network, CI,
or Alphaus implementation action.

## Safety constraints

Planning artifacts only. The parent owned session remains the sole writing
authority. Implementation requires a separate future task.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifacts exist and strict validation passes.
- The existing `exact-head-ci-baseline` capability is extended rather than
  duplicated.
- Implementation tasks are explicitly declared outside this planning task.
