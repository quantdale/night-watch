# Production observation receipt integrity proposal

## Purpose

Convert NW-AUD-034 into an apply-ready planning change.

## Starting State

Parent audit static evidence at the frozen starting SHA; production remains unauthorized.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, rehearsal, qualification, target, or environment contact.

## Safety Constraints

LOCAL / MOCK / READ-ONLY inspection only.

## Architecture / Approach

Separate deterministic tamper digests from producer execution authority, then strictly recompose all current evidence.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: validators, sealers, chain definitions, P1 identities, consumers, and reachability inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-production-observation-receipt-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Content digest is tamper detection, never producer authority.
- 2026-09-21 — P1 identity includes privacy-safe destination and expected implementation identities.

## Discoveries

- Current qualification and P1 execution are mock/local; this limits reachability but not the evidence-contract defect.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero target activity.
