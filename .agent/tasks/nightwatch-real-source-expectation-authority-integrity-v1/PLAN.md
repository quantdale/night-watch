# Real-source expectation authority integrity proposal

## Purpose

Convert NW-AUD-037 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; current permanent real-source rules preserved.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No code implementation, real-source access, recipe change, or semantic execution.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Bind exact canonical expectation semantics to fixed-recipe extraction and a closed source transaction; never treat digest syntax as producer authority.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: admission, proof, resolver, collection, lifecycle, manual harness, and focused tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-real-source-expectation-authority-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — A source extraction digest is not a signature over expectation semantics.
- 2026-09-21 — Canonical recomputation, not runtime branding alone, establishes authority.

## Discoveries

- Current forged-digest regression uses an incorrect digest and does not test altered semantics with a genuine digest.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero external activity.
