# Schema preservation integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-013
without exporting, migrating, orphaning, or modifying owner records.

## Established starting state

- Parent audit starts at `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- The export pre-slices candidates, silently skips failed records, and therefore
  can report incomplete preservation as untruncated.
- Destination ancestry is not fully resolved; migration identity is string-only
  and original retention is returned as a constant rather than observed.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Truthful completeness, safe/durable publication, identity-qualified
  migration, observed retention, privacy, concurrency/fault/mutation proof.

## Non-goals

No export, migration, ORPHAN decision, implementation, deletion, or external
publication.

## Safety constraints

Planning and read-only evidence only; synthetic future proof only.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; all implementation tasks out of scope;
  no owner data or runtime files changed.
