# Campaign resume reasoner-identity binding proposal

## Purpose

Convert NW-AUD-044 into an apply-ready planning change.

## Starting State

Parent M5 static evidence; no campaign or reasoner executed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Make stored reasoner generation a resume compare-and-swap.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: localCampaign resume, F-19 recording, and pause/resume test inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-campaign-resume-reasoner-identity-binding-v1 --strict`.

## Decision Log

- 2026-09-21 — F-19 attribution is not resume admission.
- 2026-09-21 — Omit is a mismatch, not a default.

## Discoveries

- The pause/resume test currently depends on swapping the reasoner script.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
