# Semantic request admission integrity proposal

## Purpose

Convert NW-AUD-020 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No runtime implementation or real product/API traffic.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Require immutable source-proven read admission before effect; keep explicit finite initialization exceptions and causal request generations through transport settlement.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: endpoint semantics, browser/CDP/proxy consumers, journey timing, tests, and prior task ownership inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; runtime implementation not in scope.

## Validation Strategy

openspec validate nightwatch-semantic-request-admission-integrity-v1 --strict.

## Decision Log

- 2026-09-20 — Unknown is not read-only authority, including during navigation.
- 2026-09-20 — Request causality ends at deterministic settlement, never an elapsed sleep.

## Discoveries

- `PASSIVE_UNKNOWN_OBSERVED` requests are continued to allowlisted API hosts.
- The fixed 250 ms intent window closes before the later 10 s observation barrier.
- Redirect-only CDP enforcement has no semantic request input.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no target traffic.
