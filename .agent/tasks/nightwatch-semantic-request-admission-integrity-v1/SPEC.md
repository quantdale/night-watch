# Semantic request admission integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-020 without executing product traffic.

## Established starting state

- Parent audit starts at 34517c9ba11c97407168fe5879ee03794dfff3e3.
- Unknown API traffic is allowed during navigation/no-intent as `PASSIVE_UNKNOWN_OBSERVED`.
- Action intent ends after a fixed 250 ms sleep, before final observation settlement.
- CDP redirect backstop and L5 apply host authority without semantic admission.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Pre-effect admission, finite initialization exceptions, causal generations, cross-layer enforcement, and mutation proof.

## Non-goals

No browser/proxy implementation, real DEV access, new endpoint authority, or owner-policy expansion.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no product request executed.
