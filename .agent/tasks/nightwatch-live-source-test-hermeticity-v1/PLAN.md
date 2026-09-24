# Live-source test hermeticity v1

## Purpose

Repair the final executable broad-validation residual without changing production source authority or historical pins.

## Starting State

- Task ID: `nightwatch-live-source-test-hermeticity-v1`
- Starting SHA: `060cd592cf4e8db4b07fc6398d03c147b8a51f12`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Affected evidence: 12 broad failures; empty-sibling replay leaves 11 failures.
- Existing dependencies: confined `siblingSource`, approved universe/map, source-parity fixture, currentness-aware real-source tests.

## Scope

Test helper and affected unit tests, strict OpenSpec, task/continuity records. Product source only if a current test proves a real production defect; none is assumed.

## Non-Goals

No source-pin update, expectation derivation, sibling write, network fetch, product source change, or broad skip.

## Safety Constraints

Local deterministic fixtures; read-only Git HEAD metadata; no external runtime.

## Architecture / Approach

Add one test-only authority classifier. Gate live historical measurements on the exact required current SHA closure. Use the existing source-parity fixture for parser/CLI tests. Fix Phase 12 to compare the same checkout before/after. Prove all three states adversarially.

## Milestones

### M0 — Contract and activation

- Objective: record the 12/11 reproduction and strict contract.
- Status: COMPLETE

### M1 — Authority helper and adversarial states

- Objective: implement and prove CURRENT/STALE/UNAVAILABLE classification.
- Status: IN_PROGRESS

### M2 — Affected test migration

- Objective: remove 12 ambient-live failures while preserving synthetic controls.
- Status: NOT_STARTED

### M3 — Validation and closure

- Objective: focused/broad validation, pin/sibling immutability, final reassessment, and C-00 close.
- Status: NOT_STARTED

## Validation Strategy

Run affected tests under default live, explicit empty, deterministic stale, and exact-current fixture states. Then typecheck, hardening, strict OpenSpec, `gate:dev`, and `gate:milestone`.

## Decision Log

- 2026-09-25 — Select after isolation: 11 structural empty-root failures make this higher-confidence and more executable than popup L0 design work.

## Deferred Work

- Lower-level popup target admission.
- Any future intentional live-source re-admission requires a separate current-source evidence campaign.

## Completion Criteria

All broad lanes pass with exact truthful currentness states, no hidden skips or source rebinding, unchanged pins/siblings, and terminal continuity.
