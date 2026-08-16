# Active Task

Task ID: phase-10b-contained-dev-deep-semantic-acceptance
Phase: 10B-CONTAINED-DEV-DEEP-SEMANTIC-ACCEPTANCE
Title: Nightwatch Phase 10B — Contained DEV Deep-Semantic Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-10b-contained-dev-deep-semantic-acceptance
Starting SHA: 87917377a5f842c60b02fa43cd6c7df9710faa87
Last validated implementation SHA: 6cef0c45b0733c3a7179789b360eeaba40ab931b
Current milestone: M1 + M2 complete (harness core/files/matrix implemented,
24/24 matrix green + Phase 9B regression 34/34 + typecheck + hardening green);
M3 full local validation in progress (full clean Playwright suite running;
campaign/owner-provenance queued on the shared loopback port).
Next action: finish M3 (campaign:synthetic, test:owner-provenance, agent:check,
agent:audit, project:check, selfdev:catalog-integrity, git diff --check,
isolated checkout); then M4 fresh source discovery + deep re-derivation +
auth structural; M5 substantive checkpoint + push + exact CI; M6 final gate +
the ONE launcher invocation (FIRST + fresh-context REPLAY); M7 audits; M8
docs closure (D-60) + final CI + 99-item report.
Authorization class: PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Last checkpoint: 2026-08-16 — M0/M1/M2 complete at 8791737 (CASE D, clean):
deep core + narrow harness implemented (runner/config/launcher/args/script/
hardening guards/CI step), 24-item matrix written; typecheck + hardening:check
green; Phase 9B historical regression green; Phase 10B matrix 24/24; full
suite in progress; task records brought to strict-v2 template.

## Scope

ONE contained DEV deep-semantic acceptance: fixed journey
ripple-common-exchange-read, fixed target ripple.common-exchange.read, fixed
current deep expectation ripple.common-exchange.read.real-source-deep
(derived fresh from the live registry at the freshness-approved snapshot;
resolver RESOLVED; the L3 item type contract itself decisive). Narrow
additive harness (runner/config/launcher/args/npm script/hardening/CI step/
20-item matrix); historical Phase 9B harness preserved byte-identical;
local/synthetic validation + exact pre-DEV CI; fresh read-only source
discovery + re-derivation; auth structural gate; exactly ONE launcher
invocation owning FIRST + ONE fresh-context REPLAY; deep acceptance required
(invariantTotal == expected, pass == total, N/A 0, violations 0, findings 0)
or reproducible attributable deep mismatch or fail-closed terminal; safe
evidence only; post-run privacy/sibling audits; docs closure D-60; STOP.

## Continuity

STARTING_SHA: 87917377a5f842c60b02fa43cd6c7df9710faa87
LAST_VALIDATED_IMPLEMENTATION_SHA: 6cef0c45b0733c3a7179789b360eeaba40ab931b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: DISCOVER_FROM_GIT
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_10B_STATUS: IN_PROGRESS
PHASE_10B: NOT_YET_EXECUTED
PHASE_10B_DEV_RESULT: NOT_RUN
DEEP_INVARIANT_DEV_VALIDATION: NOT_RUN
PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_10A_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_9B_R1 (unchanged): COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9A_1_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Stop

Do not run the real launcher before: local/synthetic validation green,
substantive checkpoint pushed, exact implementation CI green, fresh source
re-derivation PASS, auth structural gate PASS. Exactly ONE launcher
invocation (FIRST + ONE fresh-context REPLAY). No retry; any retry requires
fresh owner authorization. Any Phase 10A semantic-contract change required:
STOP (separate fix task).
