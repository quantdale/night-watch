# Authenticated evidence minimization integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-018 without authenticated execution.

## Established starting state

- Parent audit starts at 34517c9ba11c97407168fe5879ee03794dfff3e3.
- Lowercase alphanumeric identifiers survive the authenticated URL heuristic.
- Constructor metadata, repository snapshots, and final summary notes have direct serialization paths outside authenticated-data sanitization.
- Late authenticated-mode transition does not harden the existing directory.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Proven route identity, closed DTOs, total writer census, final firewall, safe publication/mode transition, and adversarial proof.

## Non-goals

No recorder implementation, authenticated browser, DEV/production contact, customer data, or publication.

## Safety constraints

Planning and read-only evidence only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no authenticated/runtime action.
