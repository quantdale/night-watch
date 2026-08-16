# Active Task

Task ID: phase-10-deeper-real-source-semantic-contracts
Phase: 10A-DEEPER-REAL-SOURCE-SEMANTICS
Title: Nightwatch Phase 10A — Deeper Real-Source Semantic Contracts
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-10-deeper-real-source-semantic-contracts
Starting SHA: c3393ce54ef53d10451da2465d0327a0796bcf4f
Last validated implementation SHA: c3393ce54ef53d10451da2465d0327a0796bcf4f
Current milestone: M8 — full local validation + full Playwright regression
(M0–M7 done: bootstrap, reviews, recipe v2 + type-flow extractor, TYPE_IN_SET,
admission/resolver fail-closed, corpus, 10 test matrices 342 focused green,
owner-local canary 4/4 at 169df39d, hardening + CI matrix).
Last checkpoint: 2026-08-16 — M7 complete; local validation in progress.
Next action: run the full local validation sweep (campaign:synthetic,
owner-provenance, agent:check/audit, project:check, catalog integrity,
git diff --check, full Playwright 0 failed), then the substantive
implementation checkpoint (commit + push + exact CI).
Authorization class: PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Local/source-only/synthetic implementation of deeper real-source semantic
contracts on the existing approved read-only targets: recipe schema v2 for
common-exchange + payer-exchange (itemFieldTypeContracts), fixed bounded
PHP_ITEM_FIELD_TYPE_FLOW extractor, new fixed invariant TYPE_IN_SET (payer
OBJECT|ARRAY), common TYPE_MATCH OBJECT, evidence-digest binding,
currentness fail-closed, bounded Phase 10 corpus (4 seeded deep defects,
benign 0 FP, baseline shape-only 0/4 vs Phase 10 4/4), synthetic
campaign/dossier integration, hardening + CI matrix, full regression,
exact checkpoints + CI, docs closure (D-59), STOP. NO DEV/NEXT/production;
no new endpoints/journeys; no finite-key contracts (flow unproven); no
campaign/triage core change; no Phase 6/AI/selfDev/promotion/catalog.

## Continuity

STARTING_SHA: c3393ce54ef53d10451da2465d0327a0796bcf4f
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_10A_STATUS: IN_PROGRESS
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_9B_R1 (unchanged): COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9A_1_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Next Action

Run the three parallel READ-ONLY reviews (PHP extractor / expectation
versioning / privacy-FP), reconcile, then implement M2 (recipe v2 +
PHP_ITEM_FIELD_TYPE_FLOW extractor) per SPEC.md §6-§8.

## Stop

Phase 10A is local/synthetic; Phase 10B contained DEV validation requires a
separate owner authorization.
