# Semantic source-analyzer proof soundness proposal

## Purpose

Convert NW-AUD-040 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no source repository accessed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or external/runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Use fixed syntax-aware, exact-symbol, output-flow proof with explicit totality.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: analyzers, discovery/admission, caches, reports, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-semantic-source-analyzer-proof-soundness-v1 --strict`.

## Decision Log

- 2026-09-21 — Text occurrence is not mechanical source proof.
- 2026-09-21 — Analyzer overflow is non-admissible, never silently partial.

## Discoveries

- Current TS/JS adversarial coverage does not test comment/string decoys; PHP has the stronger tokenizer path.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
