# Active Task

Task ID: phase-8b-1-r1-1-project-memory-canonical-truth
Phase: 8B.1-R1.1
Title: Nightwatch Phase 8B.1-R1.1 — Project-Memory & Canonical-Source Truth Hardening
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-8b-1-r1-1-project-memory-canonical-truth
Starting SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
Last validated implementation SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
Current milestone: M9 — docs corrections (complete); M10 focused validation in progress
Last checkpoint: 2026-08-15 — implementation complete (M1-M9); catalog regenerated (401b2c67...); project:check + 25 tests + CI step + hardening guard; currentness strictness regression; docs corrected
Next action: finish M10 focused validation, then M11 full regression → M13 source-bearing commit + push + exact CI
Authorization class: PHASE_8B_1_R1_1_PROJECT_MEMORY_CANONICAL_SOURCE_TRUTH_HARDENING_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Correct the generated-catalog authority header (renderer + regenerated
one-entry catalog; entry set unchanged); de-duplicate CURRENT_STATE live
checkpoint authority (no competing generic SHAs; Git + continuity v2 own it);
introduce nightwatch.project-state.v1 with a machine-checked CURRENT_STATE
block and read-only `npm run project:check` (+ tests + CI step); audit
repository-wide live-vs-historical truth; preserve promotion currentness
strictness. NO variant-B adoption; NO new promotion intent/approval/APPLY; NO
product/data/infra/AI activity; contractDigest must stay d8012fae....

## Continuity

STARTING_SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_8B_1_R1_1_STATUS: IN_PROGRESS
PHASE_8B_1_STATUS (overall): COMPLETE VIA SUCCESSFUL RETRY R1 (unchanged; R1.1
does not reopen R1)
REAL_CANONICAL_CATALOG_ENTRY_COUNT: 1 (adopted case A; pre-R1.1 digest
fa7b71d4...; raw digest expected to change after header regeneration —
semantic entry unchanged)
NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED (variant B / EXPAND_THEN_COLLAPSE)
NEXT_PROMOTION_AUTHORITY: NONE

## STOP

No variant-B adoption. No promotion prepare/approve/apply. No product/data/
infra/AI activity. If contractDigest changes unexpectedly: STOP and
investigate.
