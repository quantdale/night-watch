# Configuration layer authority integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-012
without changing runtime configuration behavior.

## Established starting state

- Parent audit starts at `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- `.env` values enter the validation/rendered merge, but launchers later read
  and forward `process.env` instead of the merged authority.
- Unknown file-only names disappear before unknown-variable reporting;
  malformed/duplicate file input and unknown declaration keys are permissive.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Strict input admission, one effective snapshot, execution/provenance
  coherence, declaration-bound child projection, privacy, and mutation proof.

## Non-goals

No implementation, credentials, environment authorization, external action,
or broadened child inheritance.

## Safety constraints

Planning and read-only evidence only; synthetic future tests only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks explicitly out of
  scope; no runtime/product changes.
