# Exact runtime toolchain identity proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-004 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- CI selects `node-version: 20`, not an exact patch identity.
- The clean gate executes `npm exec --yes --package=node@20` outside the
  project lockfile when the host runtime is not Node 20.
- Clean receipts record only `nodeMajor`, so runtime-patch and npm identity
  disagreement cannot be proven from certification evidence.

## Required deliverables

- OpenSpec proposal, design, new capability spec, reproducibility delta spec,
  and implementation tasks.
- Evidence-backed positive/negative behavior, supply-chain boundary,
  cross-change dependency, migration, rollback, and validation.
- Strict OpenSpec validation.

## Non-goals

No runtime manifest, workflow, clean-gate, receipt, hardening, test,
dependency, environment, network, CI, or Alphaus implementation action.

## Safety constraints

Planning artifacts only. The parent owned session remains the sole writing
authority. Implementation and any upstream toolchain lookup require a separate
future task.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifact classes exist and strict validation passes.
- Runtime toolchain integrity is distinct from immutable GitHub Action code
  identity while their implementation order is explicit.
- `reproducibility` is strengthened with the full existing requirement copied
  into a valid delta.
- Implementation tasks are explicitly declared outside this planning task.
