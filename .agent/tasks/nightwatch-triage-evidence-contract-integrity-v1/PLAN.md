# Triage evidence contract integrity proposal

## Purpose

Convert NW-AUD-030 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or runtime activity.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Centralize bounded evidence identities, validate before effect, recompose durable digests, and isolate legacy authority.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: affected producers, parsers, adapters, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-triage-evidence-contract-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Plan validation must prove its evidence envelope is representable.
- 2026-09-21 — A persisted digest without recomposable identity is not integrity proof.

## Discoveries

- Deeper replay schemas hardened individual layers but left their shared domain duplicated.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, zero runtime activity.
