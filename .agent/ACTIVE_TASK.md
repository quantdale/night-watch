# Active Task

Task ID: phase-8b-1-r1-owner-gated-canonical-promotion-retry
Phase: 8B.1-R1
Title: Nightwatch Phase 8B.1-R1 — Owner-Gated Canonical Promotion Retry
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-8b-1-r1-owner-gated-canonical-promotion-retry
Starting SHA: a12431522d8545ba94c71ee7f4e6189837342961
Last validated implementation SHA: a12431522d8545ba94c71ee7f4e6189837342961
Current milestone: M2 — Catalog-integrity invariant implementation
Last checkpoint: 2026-08-15 — bootstrap CASE D verified; v2 task created;
pre-task snapshot recorded; historical approval rechecked consumed (1+1
records); empty-only audit complete (2 D-class gates: hardening.yml step +
hardening-check.mjs portfolio check). Anchor fields are bootstrap anchors
equal to STARTING_SHA until the readiness/canonical checkpoints land.
Next action: implement the catalog-integrity invariant (new read-only
bin/selfdev-catalog-integrity.mjs; replace the empty-only workflow step and
hardening assertion; add focused tests), then run the readiness validation
suite.
Authorization class: PHASE_8B_1_R1_OWNER_GATED_CANONICAL_PROMOTION_RETRY_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Catalog-aware CI transition (readiness commit), fresh selfDev/sandbox
artifacts, one-entry disposable rehearsal, exactly one prepare/approve/apply/
verify, canonical adoption commit + exact CI, post-commit continuation proof,
continuity v2 closure + docs finalization + final exact CI. NO second
approval/APPLY; NO promotion of B; NO Phase 6 / product / AI / publication /
DB / infrastructure.

## Continuity

STARTING_SHA: a12431522d8545ba94c71ee7f4e6189837342961
LAST_VALIDATED_IMPLEMENTATION_SHA: a12431522d8545ba94c71ee7f4e6189837342961
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a12431522d8545ba94c71ee7f4e6189837342961
LIVE_HEAD_AUTHORITY: GIT

## Status

PHASE_8B_1_R1_STATUS: IN_PROGRESS
PHASE_8B_1_STATUS (overall): RETRY_IN_PROGRESS (historical original attempt
remains BLOCKED / CLOSED; old approval SPENT)
REAL_CANONICAL_CATALOG_ENTRY_COUNT: 0 (EMPTY, digest ffe3d635... unchanged)

## STOP conditions

Any admission-gate failure → preserve evidence, leave the safest deterministic
state, classify (PHASE_8B_1_R1_BLOCKED_*), STOP. No automatic retry, no
second approval, no second APPLY.
