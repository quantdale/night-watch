# Active Task

Task ID: phase-8b-1-owner-gated-canonical-promotion
Phase: 8B.1 — Owner-Gated Canonical Promotion
Title: Nightwatch Phase 8B.1 — Owner-Gated Canonical Promotion
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-8b-1-owner-gated-canonical-promotion
Starting SHA: 91149621e247a2996a3f5c97090684b68507418d
Last validated implementation SHA: 04aef3b20e14c0735cbe8797bbae79534e14463b
Current milestone: M11 — implementation checkpoint committed (04aef3b20e14c0735cbe8797bbae79534e14463b); about to push and wait for exact CI.
Last checkpoint: 2026-08-15 — implementation checkpoint ready to commit. New
`src/core/selfDevPromotion/` canonical-promotion authority boundary (promotion
intent, one-shot owner approval, atomic one-file canonical apply, fresh-load
canonical verify, currentness assessor), new CLI
`bin/selfdev-promote-canonical.mjs` (inspect/prepare/approve/apply/verify/
status), new owner-policy operation `SELF_DEVELOPMENT_CANONICAL_ADOPTION`
under a deliberate owner-scope policy version bump to
`nightwatch.owner-scope-policy.v2`, a new dedicated hardening check, a new CI
matrix step, and a behavior-preserving extraction of the Phase 8B
metamorphic-probe proof into a shared pure
`src/core/selfDev/metamorphicProbes.ts` module (existing Phase
8A/8A.1/8A.1.1/8B/8B.0.1 tests pass unmodified). Canonical adopted-case
catalog remains empty at this checkpoint; no real promotion has occurred yet.
Full local validation is green (typecheck, hardening, the new focused matrix,
full Playwright modulo two pre-existing browser/proxy worker-count
port-contention flakes confirmed unrelated and passing individually and under
--workers=1).
Next action: commit the implementation checkpoint, push fast-forward, wait
for exact CI green including the new dedicated Phase 8B.1 matrix step, then
proceed to the fresh pre-promotion selfDev session and the one real
prepare/approve/apply/verify/commit acceptance chain this task is authorized
to perform exactly once.

This task's owner authorization class is PHASE_8B_1_ONE_CANONICAL_PROMOTION,
covering exactly one real canonical promotion acceptance: one selected
candidate, one promotion intent, one approval, one approval consumption, one
canonical source write, one adopted catalog entry, one promotion Git commit.
Runtime Git write authority for this task remains none; Alphaus repository
write authority remains none.

Remote status: PRIVATE_REMOTE_CONFIRMED (`origin` → `quantdale/night-watch`, `main`).
Canonical Git root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
Parent workspace Git: RETIRED (parent is not a Git repository).
Live local/remote HEAD: DISCOVER_FROM_GIT.

Historical status (preserved): Phase 6 FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE; Phase 7 / 7B COMPLETE; Phase 8
IN_PROGRESS; Phase 8A / 8A.1 / 8A.1.1 COMPLETE; Phase 8B COMPLETE_SANDBOX_ONLY
(historical acceptance preserved; PHASE 8B SANDBOX FUNCTIONALITY:
HISTORICALLY ACCEPTED, PROMOTION READINESS: READY after 8B.0.1);
Phase 8B.0.1 COMPLETE; Phase 8B.1 IN_PROGRESS (this task).
