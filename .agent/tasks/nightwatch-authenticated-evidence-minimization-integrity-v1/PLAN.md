# Authenticated evidence minimization integrity proposal

## Purpose

Convert NW-AUD-018 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No evidence/runtime implementation or authenticated/external execution.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Replace heuristic route preservation with proven templates and route every authenticated writer through closed DTOs plus one final owner-only persistence firewall.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: redaction, recorder writers/callers, tests, and production privacy scope inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/runtime execution not in scope.

## Validation Strategy

openspec validate nightwatch-authenticated-evidence-minimization-integrity-v1 --strict.

## Decision Log

- 2026-09-20 — Route literals require proof; lexical shape is not privacy provenance.
- 2026-09-20 — Every authenticated artifact writer belongs behind one final firewall.

## Discoveries

- acme1234 is retained by the current path heuristic.
- writeRepositories and finalize notes bypass sanitizeAuthenticatedData.
- enableAuthenticatedEvidence does not harden a directory created in unauthenticated mode.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no authenticated/runtime action.
