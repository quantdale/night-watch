# Active Task

Task ID: phase-15h-whole-system-integrated-hardening
Phase: 15H-WHOLE-SYSTEM-INTEGRATED-HARDENING
Title: Nightwatch Phase 15H — Whole-System Integrated Hardening (single all-phase campaign over the Phase-15P mass implementation)
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-15h-whole-system-integrated-hardening
Starting SHA: 7695b87c61890cabfe110e3d147a076c1b1ecea1
Last validated implementation SHA: 7695b87c61890cabfe110e3d147a076c1b1ecea1
Last checkpoint: 7695b87c61890cabfe110e3d147a076c1b1ecea1
Current milestone: M6 campaign/provenance packs — M0–M5 complete (typecheck/hardening/focused/all-phase unit sweep green; DEF-01..DEF-11 repaired)
Next action: npm run campaign:synthetic + npm run test:owner-provenance, then full canonical and isolated Playwright regressions, then continuity closure and validated checkpoint push
Authorization class: PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

ANCHOR_SCOPE_NOTE: anchors are the carried-forward bootstrap values
(validated == STARTING_SHA by design). The Phase-15P mass anchor c2640cb08...
remains UNVALIDATED for its round until this task's own hardening checkpoint
is committed at M10.

## Scope

Validate and harden the complete Phase-15P 105-file mass implementation
(anchor c2640cb08e7057eccab740942c3dc9991109ad1e) plus historical all-phase
compatibility (families 1–15). Typecheck first; every failure became hardening
evidence with narrow reproducer -> root cause -> source fix -> permanent
regression. Adversarial corpus executable with >=3 repeats and all quality
floors zero. Complete canonical + topology-correct isolated Playwright
workers=1. No DEV/NEXT/production/real campaign/mutation/data-plane/infra/
Phase 6 expansion/Alphaus writes/AI authority/selfDev promotion/catalog
mutation/new endpoint authority. Phase 11B and 13B remain NOT_AUTHORIZED.

## Continuity

STARTING_SHA: 7695b87c61890cabfe110e3d147a076c1b1ecea1
LAST_VALIDATED_IMPLEMENTATION_SHA: 7695b87c61890cabfe110e3d147a076c1b1ecea1
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7695b87c61890cabfe110e3d147a076c1b1ecea1
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_15H_STATUS: IN_PROGRESS
PHASE_15H_IMPLEMENTATION_AUTHORITY: GRANTED_LOCAL_ONLY
PHASE_15P_MASS_IMPLEMENTATION: HARDENING_IN_PROGRESS_LOCAL_SUITES_GREEN
PHASE_15P_LANE_LABELS_A01_A16: HISTORICAL_FOCUSED_GREEN_PREMASS_SCOPE_ONLY_NOT_PROOF_OF_MASS_ROUND
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: CAMPAIGN_SYNTHETIC_AND_OWNER_PROVENANCE_THEN_FULL_REGRESSIONS

## Blockers

None.

## Recovery

Fetch origin/main and verify live state from Git (LIVE_HEAD_AUTHORITY: GIT).
Read the task's SPEC.md, PLAN.md, STATE.md, WORKSTREAMS.md,
ACCEPTANCE_MATRIX.md, DEFECT_LEDGER.md, plus the Phase-15P
MASS_IMPLEMENTATION_HANDOFF.md / HARDENING_HANDOFF.md / ledgers. Git/source/
test evidence wins over conversation memory. Resume from STATE.md Exact Next
Action.
