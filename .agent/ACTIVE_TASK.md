# Active Task

Task ID: phase-8b-1-owner-gated-canonical-promotion
Phase: 8B.1 — Owner-Gated Canonical Promotion
Title: Nightwatch Phase 8B.1 — Owner-Gated Canonical Promotion
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-8b-1-owner-gated-canonical-promotion
Starting SHA: 91149621e247a2996a3f5c97090684b68507418d
Last validated implementation SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
Current milestone: M12 — fresh pre-promotion selfDev session.
Last checkpoint: 2026-08-15 — implementation checkpoint COMPLETE. New
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
8A/8A.1/8A.1.1/8B/8B.0.1 tests pass unmodified). A hardening false negative
(the Phase 8B call-graph scan only sees tracked files) was found and fixed
in a follow-up commit before CI ran clean. Canonical adopted-case catalog
remains empty at this checkpoint; no real promotion has occurred yet.
Implementation checkpoint `bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9` pushed
fast-forward; exact CI run `31868447710` completed/success with every step
green, including the dedicated "Phase 8B.1 owner-gated canonical promotion
matrix" step, the agent-state check, and the diff check.
Next action: run `npm run selfdev:synthetic` for a fresh current-source v2
session, then the fresh Phase 8B sandbox plan/run, then the one real
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
