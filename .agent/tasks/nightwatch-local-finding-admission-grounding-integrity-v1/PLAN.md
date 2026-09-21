# Local finding admission grounding integrity proposal

## Purpose

Convert NW-AUD-047 into an apply-ready planning change.

## Starting State

Parent M5 static evidence; no campaign executed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Fail closed on inexact candidate membership and unobserved provenance.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE

### M1 — OpenSpec artifacts
- Status: COMPLETE

### M2 — Planning validation
- Status: COMPLETE

## Validation Strategy

`openspec validate nightwatch-local-finding-admission-grounding-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Missing candidateIds is not a history-only fallback.
- 2026-09-21 — Empty provenance is not observed provenance.

## Discoveries

- Draft title/severity defaults make ungrounded fields look ordinary.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
