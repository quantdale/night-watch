# Task State

## Identity

Task ID: phase-11a-1-partial-coverage-receipt-correctness-closeout
Phase: 11A.1-PARTIAL-COVERAGE-RECEIPT-CLOSEOUT
Title: Nightwatch Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Status: IN_PROGRESS
Starting SHA: 2c47812335379f2efa56df504098f8618d0b07ea
Last validated implementation SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 2c47812335379f2efa56df504098f8618d0b07ea
LAST_VALIDATED_IMPLEMENTATION_SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_1_STATUS: IN_PROGRESS
PHASE_11A_STATUS: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11_COLLECTION_WIDE_SEMANTIC: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11B_DEV_ACCEPTANCE: NOT_AUTHORIZED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Objective

Correct the confirmed receipt-layer false-PASS defect: semantic `PARTIAL_COVERAGE` is currently mapped to receipt `PASS`. Make partial coverage explicitly non-pass through the safe receipt path, preserve historical v1 receipts, audit all downstream success consumers, re-run full local validation, and establish truthful CI state.

## Current Milestone

M0 — spec package published; executor must fresh-fetch and reproduce the defect before source changes.

## Work In Progress

Corrective implementation has not yet been performed.

## Exact Next Action

Fresh executor:
1. fetch origin and require clean main == origin/main;
2. read AGENTS.md, ACTIVE_TASK.md, this task's PROPOSAL/SPEC/PLAN/STATE/REPORT, and the Phase 11 normative design;
3. reproduce semantic PARTIAL_COVERAGE -> receipt PASS;
4. implement the narrow correction from SPEC;
5. validate locally and truthfully handle GitHub Actions availability.

## Scope Boundaries

No DEV/NEXT/production, no Phase 11B, no product mutation, no DB/data layer, no infra/Phase 6, no Alphaus writes, no campaign/triage redesign, no differential, no AI/model authority, no selfDev/promotion/catalog/B adoption, no publication.

## Confirmed Finding

`CONFIRMED_PARTIAL_COVERAGE_RECEIPT_FALSE_PASS`

Evidence at the Phase 11A closure source:
- `SemanticOutcome` includes `PARTIAL_COVERAGE`;
- hook mapping returns receipt `PASS` for that outcome;
- receipt outcome vocabulary has no `PARTIAL_COVERAGE` member;
- frozen design says partial coverage must never be indistinguishable downstream from full semantic PASS.

## External CI Condition

GitHub Actions is currently known to be blocked before job start by account billing/spending-limit. This is external, not evidence that current code passes CI. The executor must re-check after its corrective checkpoint.

## Resume Recipe

Task is IN_PROGRESS. Recover from remote Git state and execute M0 onward.
