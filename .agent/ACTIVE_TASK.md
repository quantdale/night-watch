# Active Task

Task ID: phase-14-mechanical-source-contract-expansion
Phase: 14A-MECHANICAL-SOURCE-CONTRACT-EXPANSION
Title: Nightwatch Phase 14A — Mechanical Real-Source Contract Expansion (five-change implementation batch)
Status: BLOCKED
Task directory: .agent/tasks/phase-14-mechanical-source-contract-expansion
Starting SHA: 632e971c1ac51a065882567f6b685db81f9ac63c
Last validated implementation SHA: f554da32849481902c86150f657d9696be46e04f
Last substantive checkpoint SHA: f554da32849481902c86150f657d9696be46e04f
Last checkpoint: f554da32849481902c86150f657d9696be46e04f
Current milestone: E6 — five-change batch terminal closure (IMPLEMENTED_AWAITING_HARDENING)
Next action: STOP — C1-C5 implemented and focused-green; moderate integration pack green; full hardening campaign is REQUIRED_NEXT under separate authorization; see HARDENING_HANDOFF.md
Authorization class: PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY
Second authorization class: PHASE_14_FIVE_CHANGE_IMPLEMENTATION_BATCH_LOCAL_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Original: strengthen Nightwatch's deterministic source-contract analyzer and re-evaluate the existing approved read-only semantic targets against a freshly resolved source snapshot; admit only mechanically proven contract uplifts.
Extension (this execution): implement all five changes C1-C5 with focused proof per change, one moderate integrated validation pack, corpus/phase14 completion, HARDENING_HANDOFF population, and explicit deferral of the full hardening campaign.
No DEV/NEXT/production/real campaign/mutation/DB/data-plane/infra/Phase 6/Alphaus writes/AI/model authority/selfDev/promotion/Phase 11B/Phase 13B.

## Continuity

STARTING_SHA: 632e971c1ac51a065882567f6b685db81f9ac63c
LAST_VALIDATED_IMPLEMENTATION_SHA: f554da32849481902c86150f657d9696be46e04f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f554da32849481902c86150f657d9696be46e04f
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_14_C1_ANALYZER_IR: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C2_STATIC_SCHEMA_ADAPTERS: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C3_REAL_SOURCE_ADMISSION: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C4_CONTRACT_DRIFT_INTELLIGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C5_CONTRACT_OBSERVABILITY: IMPLEMENTED_FOCUSED_GREEN
PHASE_14A_STATUS: IMPLEMENTED_AWAITING_HARDENING
PHASE_14_FULL_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_14_MECHANICAL_SOURCE_EXPANSION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_14_REAL_SOURCE_UPLIFT_COUNT: 0
PHASE_14_ANALYZER_VERSION: nightwatch.mechanical-contract-analyzer.v1
PHASE_13B_STATUS: NOT_AUTHORIZED
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP at the truthful terminal state (IMPLEMENTED_AWAITING_HARDENING)

## Blockers

- EXTERNAL_CI_BILLING_BLOCKED: GitHub Actions job start remains externally blocked by the known billing/spending-limit condition (re-verified once after each push). Local/source acceptance is fully green. Unblock: restore Actions billing/spending-limit so a push re-runs CI to green. No code failure.
- FULL_HARDENING_CAMPAIGN_NOT_AUTHORIZED_HERE: the deferred repository-wide hardening campaign requires separate owner authorization; planned stop, not a defect.

## Recovery

Fetch origin/main and verify live state from GIT (LIVE_HEAD_AUTHORITY: GIT). Read SPEC/PLAN/STATE plus FIVE_CHANGE_IMPLEMENTATION_EXTENSION.md and HARDENING_HANDOFF.md, then docs/CURRENT_STATE.md Phase-14 rows and docs/design/PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION.md. Git/source evidence wins. The next session is the full hardening campaign against the five-change checkpoint; do not restart implementation milestones that are already COMPLETE.
