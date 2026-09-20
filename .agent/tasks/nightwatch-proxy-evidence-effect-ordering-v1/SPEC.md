# Proxy evidence-effect ordering proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-022 without starting a proxy or executing traffic.

## Established starting state

- Parent audit starts at 34517c9ba11c97407168fe5879ee03794dfff3e3.
- Allowed HTTP, CONNECT, and Upgrade handlers begin upstream effects before the corresponding event append completes.
- Evidence-write failure disables future traffic but cannot retract the current effect.
- The current zero-connection failure test uses a destination denied independently by host policy.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Durable pre-effect preparation, truthful terminal/crash states, transport symmetry, privacy bounds, and allowed-destination fault proof.

## Non-goals

No proxy implementation, process/network execution, external target, or owner-policy expansion.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no proxy or request executed.
