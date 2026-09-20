# Proxy runtime instance attestation proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-016 without starting an external/authenticated runtime.

## Established starting state

- Parent audit starts at `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Runtime state carries static self-asserted identities but no live process/lease/instance binding.
- Health accepts any loopback listener returning HTTP 204 on the fixed health path.
- Browser admission and periodic liveness reuse that weak observation.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Exact live-instance identity, active challenge, safe control-state publication, admission/observation binding, revocation, and local adversarial proof.

## Non-goals

No proxy implementation, external network, authenticated target, privileged operation, or policy expansion.

## Safety constraints

Planning and read-only evidence only; validation may parse local artifacts.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no external/authenticated/runtime action.
