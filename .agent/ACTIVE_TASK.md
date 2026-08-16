# Active Task

Task ID: phase-9b-contained-dev-semantic-acceptance
Phase: 9B-CONTAINED-DEV-SEMANTIC-ACCEPTANCE
Title: Nightwatch Phase 9B — Contained DEV Semantic Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-9b-contained-dev-semantic-acceptance
Starting SHA: 62ec80426035e979b563135d858bdc1438d84fb4
Last validated implementation SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
Current milestone: M0 — task records + ACTIVE_TASK (IN_PROGRESS)
Last checkpoint: 2026-08-16 — bootstrap CASE D (HEAD == origin/main ==
62ec804, worktree clean); no prior Phase 9B records; durable reads complete;
strict-v2 task records created; next: ACTIVE_TASK routing (this file) then
the read-only remote source-freshness gate, then M1 wiring.
Next action: Run the read-only remote source-freshness gate
(mobingilabs/ripple-api + mobingilabs/ripple-ui via gh api / git ls-remote),
record remote SHAs, classify F1/F2/BLOCK; then M1 (context wiring + Phase 9B
core modules + launcher + config + runner).
Authorization class: PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

ONE bounded canonical-DEV semantic acceptance (ONE approved journey
ripple-common-exchange-read x FIRST + ONE fresh-context replay) of the
admitted real-source expectation ripple.common-exchange.read.
real-source-shape against https://appdev.alphaus.cloud/ripple/ only:
minimum source wiring (NightwatchContextOptions.semanticOracle? ->
createNetworkObserver), local/synthetic tests for that wiring, gated
launcher bin/phase9b-real.mjs + playwright.phase9b.config.ts +
tests/manual/phase9b-contained-dev-semantic.ts, pre-dev metadata-only
readiness gate + read-only source-freshness gate (F1/F2/BLOCK), one
source-bearing Nightwatch implementation checkpoint, exact green CI BEFORE
any product contact, safe semantic evaluation receipts, private/local
sanitized evidence, docs/continuity closure (D-56), normal Nightwatch
commits/pushes. FORBIDDEN: second journey, fallback, third attempt,
exploratory clicking, arbitrary navigation, new endpoint authority, NEXT,
production, mutation, POST/PUT/PATCH/DELETE, DB/infra (Phase 6 freeze),
deployment binding, screenshots, authenticated traces, DOM snapshots, raw
persistence, raw customer-value persistence, AI models/oracle authority,
Alphaus writes, selfDev/promotion/catalog, variant-B adoption, publication.

## Continuity

STARTING_SHA: 62ec80426035e979b563135d858bdc1438d84fb4
LAST_VALIDATED_IMPLEMENTATION_SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9B_STATUS: IN_PROGRESS
PHASE_9A_1_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (narrative, unchanged): COMPLETE_LOCAL_SYNTHETIC
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## STOP

STOP conditions: any pre-dev gate failure (freshness / exact CI / resolver
RESOLVED / auth / proxy / exact target) -> PHASE_9B_BLOCKED_* before any DEV
contact; any privacy or hard-safety violation -> immediate STOP; semantic
nondeterminism -> PHASE_9B_BLOCKED_SEMANTIC_NONDETERMINISM; after the ONE
launcher run -> STOP (a retry requires a fresh owner authorization).
