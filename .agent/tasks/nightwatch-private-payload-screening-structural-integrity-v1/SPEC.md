# Private payload screening structural integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-019 without handling real private data.

## Established starting state

- Parent audit starts at 34517c9ba11c97407168fe5879ee03794dfff3e3.
- The shared labeled-value regex is applied to JSON.stringify output.
- Normal quoted token, password, and customer keys bypass that regex.
- Sentinel-only tests pass and do not exercise ordinary structural values.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Structural schemas, safe DTOs, bounded text defense, total consumer census, reader revalidation, and mutation proof.

## Non-goals

No store implementation, real finding/customer/credential data, external publication, or owner-policy expansion.

## Safety constraints

Planning and synthetic/read-only evidence only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no private/runtime action.
