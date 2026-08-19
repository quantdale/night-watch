# Active Task

Task ID: phase-13-real-campaign-semantic-runtime-integration
Phase: 13A-REAL-CAMPAIGN-SEMANTIC-RUNTIME-INTEGRATION
Title: Nightwatch Phase 13A — Real Campaign Semantic Runtime Integration & Contract Integrity
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-13-real-campaign-semantic-runtime-integration
Starting SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last validated implementation SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last substantive checkpoint SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last checkpoint: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Current milestone: M1 — overnight three-change implementation batch (IN_PROGRESS); C1 contract & identity correctness committed; C2/C3 pending.
Next action: implement Change 2 (real-campaign semantic runtime plumbing: source bundle + observer seam), run typecheck + git diff --check, push FF checkpoint.
Authorization class: PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Overnight implementation-first batch of three change tranches only (no hardening campaign, no full regression):

- C1 — Contract & identity correctness (replay-plan v2 occurrence identity + API cardinality, semantic triage coherence, AI-ready confidence).
- C2 — Real-campaign semantic runtime plumbing (frozen source bundle, fixed mapping, observer seam wiring).
- C3 — Real replay + semantic triage/clustering/dossier integration (remove invalidReducedReplay where safe, occurrence-aware replay binding, semantic cluster/triage/dossier route, manifest/checkpoint version identity).

NO DEV/NEXT/production, product mutation, DB/data plane, infrastructure/Phase 6, Alphaus writes, AI/model authority, selfDev/promotion/catalog/B adoption, publication, new endpoint/target authority, Phase 11B, Phase 13B. Per OVERNIGHT_IMPLEMENTATION_AMENDMENT.md.

## Continuity

STARTING_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LAST_VALIDATED_IMPLEMENTATION_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_13_OVERNIGHT_C1: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C2: IN_PROGRESS
PHASE_13_OVERNIGHT_C3: PENDING
PHASE_13A_STATUS: IN_PROGRESS
PHASE_13_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: IMPLEMENT_C2

## Blockers

None blocking implementation. GitHub Actions may remain externally billing-blocked; do not wait on it.

## Recovery

Fetch canonical origin/main and recover detailed authority from this task's SPEC/PLAN/STATE/WORKSTREAM files, OVERNIGHT_IMPLEMENTATION_AMENDMENT.md, HARDENING_HANDOFF.md, and docs/design/PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION.md. Git/source evidence wins over conversation text.
