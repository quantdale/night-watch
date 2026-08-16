# Active Task

Task ID: phase-9-deterministic-semantic-oracle-depth
Phase: 9-ORACLE-DEPTH
Title: Nightwatch Phase 9 — Deterministic Semantic Oracle Depth
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-9-deterministic-semantic-oracle-depth
Starting SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
Last validated implementation SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
Current milestone: M1 — oracle-ceiling reproduction matrix
Last checkpoint: 2026-08-16 — M0 complete: bootstrap CASE D verified
(HEAD == origin/main == 09a94034...), durable reads + source recon done,
strict-v2 task records created, ACTIVE_TASK updated IN_PROGRESS,
src/oracles/{projections,expectations,invariants,semantic}/ and
corpus/phase9/{source-fixture,defects,benign}/ created.
Next action: implement M1 — tests/unit/oracleCeilingReproduction.test.ts
proving current protocol/API oracles pass / produce no semantic anomaly for
the five seeded semantic defect fixtures; record exact behavior.
Authorization class: PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Implement the local/synthetic Phase 9 architecture (owner-authorized):
bounded deterministic semantic projection layer; declarative source-backed
expectation system; deterministic semantic expectation oracles; deterministic
cross-step relational invariant oracles; fixed synthetic semantic-bug fixture
corpus (>=5 seeded classes) with benign false-positive control; strict
privacy/redaction/sentinel-leakage enforcement; integration of semantic
findings into the existing deterministic campaign -> triage -> dossier
pipeline; hardening and CI matrices; durable Phase 9 task/docs/decision
state; full Nightwatch regression; commit/push exact checkpoints; exact CI;
closure under nightwatch.agent-continuity.v2. NO DEV/NEXT/production
execution; NO Phase 6 (data/infra); NO AI oracle authority; NO selfDev/
promotion activity; NO catalog mutation; NO owner-policy expansion; NO
Alphaus writes; NO publication.

## Continuity

STARTING_SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9_ORACLE_DEPTH_STATUS: IN_PROGRESS
PHASE_9_STATUS (narrative): IN_PROGRESS_LOCAL_SYNTHETIC
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE
