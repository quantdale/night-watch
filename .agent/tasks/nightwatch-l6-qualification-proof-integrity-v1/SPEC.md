# L6 qualification proof integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-017 without starting a contained or authenticated runtime.

## Established starting state

- Parent audit starts at 34517c9ba11c97407168fe5879ee03794dfff3e3.
- UDP is recorded by the probe but omitted from directDenied.
- Browser direct listeners are not wired into browser stimuli, and a resolver rule suppresses the speculative hostname.
- Qualification returns constants and is not carried into the later authenticated launch.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Complete witnessed probes, positive controls, exact runtime identity, qualification-to-use binding, non-fabricable READY authority, privacy, and mutation proof.

## Non-goals

No containment implementation, browser/OOPS launch, authenticated target, external network, privileged operation, or policy expansion.

## Safety constraints

Planning and read-only evidence only; validation may parse local artifacts.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no contained/authenticated/runtime action.
