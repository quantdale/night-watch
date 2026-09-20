# Protocol dossier readiness integrity proposal

## Purpose

Convert NW-AUD-029 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no runtime authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No implementation or environment contact.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Derive one protocol readiness verdict before persistence and bind all consumers to it.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: triage, campaign, dossier, confidence, summary, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-protocol-dossier-readiness-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Lifecycle failure and READY bookkeeping must never coexist.
- 2026-09-21 — Observation channels are not independent context generations.

## Discoveries

- Semantic v2 readiness is stronger but does not govern protocol v1 production.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero runtime activity.
