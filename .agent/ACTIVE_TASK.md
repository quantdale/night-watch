# Active Task

Task ID: phase-8b-1-owner-gated-canonical-promotion
Phase: 8B.1 — Owner-Gated Canonical Promotion
Title: Nightwatch Phase 8B.1 — Owner-Gated Canonical Promotion
Status: BLOCKED
Task directory: .agent/tasks/phase-8b-1-owner-gated-canonical-promotion
Starting SHA: 91149621e247a2996a3f5c97090684b68507418d
Last validated implementation SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
Current milestone: M17 — dirty-tree local validation (BLOCKED here; see below).
Last checkpoint: 2026-08-15 — the Phase 8B.1 promotion MACHINERY is
implementation-complete, committed, and CI-green (exact run `31868447710` at
`bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9`, every step green). The one
authorized real canonical promotion was then run end to end: a fresh
pre-promotion selfDev session, a fresh Phase 8B sandbox plan/result, and a
real prepare -> approve -> apply -> verify chain all completed successfully
— `apply` reported `canonicalSourceWrites: 1` exactly once, and the
fresh-process `verify` reported `CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`
with all four metamorphic probes PASS. The promotion mechanism itself has
no defect.

However, running the full local regression suite against that one-file-dirty
tree revealed that 8 pre-existing test files spanning Phase 8A, 8A.1,
8A.1.1, and 8B (50 test failures) depend on an assumption Phase 8B.1's own
mission necessarily breaks: `src/core/selfDev/controller.ts` always seeds a
fresh in-process evaluator from the live adopted-case catalog, and the
deterministic synthetic proposer's one "valid" candidate slot always
produces the exact same semantic candidate — the one this task just
adopted. Once adopted, that candidate can never again evaluate as a fresh
`EVALUATED_PASS_NOT_ADOPTED` in-process, permanently (not just during the
dirty pre-commit window), breaking every historical test that depends on
that precondition. This is a genuine, structural, cross-phase compatibility
gap this task's own STOP conditions require treating as a blocker rather
than improvising fixes across four previously-closed phases' test suites
immediately after a real, already-consumed one-shot approval.

The development session therefore restored
`src/core/selfDev/adoptedCaseCatalog.generated.ts` to its exact
pre-promotion bytes (`git checkout HEAD -- <path>`, a normal development Git
operation, not a runtime action) and re-ran the same focused suite, which
passed 83/83 — confirming the failures were caused exclusively by the one
adopted entry. The repository is clean and matches `origin/main` exactly at
`623e4c8857b269cc79433ef4ab3e8a19cc84380f`. The consumed approval remains
permanently spent; no second write, no second approval, no retry was
attempted.

Next action: NONE within this task's current authorization. A future,
separately authorized task must first resolve the root-cause compatibility
gap (make the historical Phase 8A/8A.1/8A.1.1/8B test suites resilient to a
non-empty canonical catalog, or give the deterministic proposer a second
distinct "genuinely new" fixture) before a real canonical promotion can be
committed without permanently breaking the full regression suite.

This task's owner authorization class was PHASE_8B_1_ONE_CANONICAL_PROMOTION,
covering exactly one real canonical promotion acceptance. That one
authorized acceptance was exercised (applied and verified) and then
reverted by the development session per the discovery above; the
authorization is now spent and this task is BLOCKED pending new,
separate owner authorization for the root-cause follow-up work. Runtime Git
write authority for this task remained none throughout; Alphaus repository
write authority remained none.

Remote status: PRIVATE_REMOTE_CONFIRMED (`origin` → `quantdale/night-watch`, `main`).
Canonical Git root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
Parent workspace Git: RETIRED (parent is not a Git repository).
Live local/remote HEAD: DISCOVER_FROM_GIT.

Historical status (preserved): Phase 6 FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE; Phase 7 / 7B COMPLETE; Phase 8
IN_PROGRESS; Phase 8A / 8A.1 / 8A.1.1 COMPLETE; Phase 8B COMPLETE_SANDBOX_ONLY
(historical acceptance preserved; PHASE 8B SANDBOX FUNCTIONALITY:
HISTORICALLY ACCEPTED, PROMOTION READINESS: READY after 8B.0.1);
Phase 8B.0.1 COMPLETE; Phase 8B.1 BLOCKED (this task) — canonical adopted-case
catalog remains empty; the promotion MACHINERY is implementation-complete
and CI-green, but no real promotion is committed.
