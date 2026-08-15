# Active Task

Task ID: phase-8-final-closure-phase-9-roadmap-selection
Phase: 8-CLOSURE
Title: Nightwatch Phase 8 Final Closure & Phase 9 Roadmap Selection
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-8-final-closure-phase-9-roadmap-selection
Starting SHA: 27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2
Last validated implementation SHA: 044c4a6e0095d14004cd50b44ceb47998e44e3ec
Current milestone: M1 — pre-fix reproductions (project-state pin +
docs/design checkpoint path)
Last checkpoint: 2026-08-15 — bootstrap complete: CASE D (HEAD ==
origin/main == 27cc5a2c, tracked tree clean); ground truth + D-52
completion criteria verified; v2 task records created; Phase 9 evidence
agents running.
Next action: run the pre-fix reproductions (PHASE_8_STATUS COMPLETE
fixture → PROJECT_STATE_PHASE_8_STATUS_MISMATCH; docs/design/example.md →
not an approved checkpoint path) and record exact diagnostics.
Authorization class: PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Mechanically transition Phase 8 from IN_PROGRESS to COMPLETE
(bin/project-state-check.mjs pin + docs/CURRENT_STATE.md machine block +
tests + hardening + docs), extend the docs/design/*.md checkpoint
allowlist narrowly (with negative tests), freeze the canonical-promotion
research boundary (machinery retained; authority stays NONE), reconstruct
the bug-hunting pipeline, select exactly ONE evidence-backed Phase 9
primary direction with an implementation-ready future spec in
docs/design/PHASE_9_ROADMAP.md, validate fully (incl. full Playwright +
isolated checkout), commit/push the source-bearing closure checkpoint,
verify exact implementation CI, then final docs closure + exact final CI,
and close under nightwatch.agent-continuity.v2. NO Phase 9 implementation;
NO variant-B adoption; NO promotion prepare/approve/apply; NO catalog
mutation; NO owner-policy change; NO product/DEV/NEXT/production; NO
DB/infra; NO AI/model; NO Alphaus writes; NO publication.

## Continuity

STARTING_SHA: 27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2
LAST_VALIDATED_IMPLEMENTATION_SHA: 044c4a6e0095d14004cd50b44ceb47998e44e3ec
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_8_FINAL_CLOSURE_STATUS: IN_PROGRESS
PHASE_8_STATUS (transition target): IN_PROGRESS → COMPLETE
PHASE_8B_1_STATUS (unchanged): COMPLETE VIA SUCCESSFUL RETRY R1
REAL_CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (adopted case A; digest
bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED (variant B)
NEXT_PROMOTION_AUTHORITY (unchanged): NONE
PHASE_9 (design target): DESIGNED / NOT_STARTED / NOT_AUTHORIZED

## STOP

This task executes ONLY the authorized Phase-8 closure + Phase-9 roadmap
selection. No Phase 9 implementation. No variant-B adoption. No promotion
prepare/approve/apply. No catalog mutation. No product/data/infra/AI
activity. Catalog digest must remain sha256:bd35b934... — any drift is a
STOP.
