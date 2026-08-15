# Task State

## Identity

Task ID: phase-8b-1-owner-gated-canonical-promotion
Phase: 8B.1
Status: IN_PROGRESS
Starting SHA: 91149621e247a2996a3f5c97090684b68507418d
Last validated implementation SHA: 04aef3b20e14c0735cbe8797bbae79534e14463b
Last substantive checkpoint SHA: 04aef3b20e14c0735cbe8797bbae79534e14463b
Last documentation checkpoint SHA: (none yet — no documentation-only descendant of the implementation checkpoint exists)
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-15 — implementation checkpoint committed locally as 04aef3b20e14c0735cbe8797bbae79534e14463b; not yet pushed.

STARTING_SHA: 91149621e247a2996a3f5c97090684b68507418d
LAST_VALIDATED_IMPLEMENTATION_SHA: 04aef3b20e14c0735cbe8797bbae79534e14463b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 04aef3b20e14c0735cbe8797bbae79534e14463b
LAST_DOCUMENTATION_CHECKPOINT_SHA:
LIVE_HEAD_AUTHORITY: GIT

## Objective

Implement and exercise exactly one owner-gated canonical promotion: a new
`src/core/selfDevPromotion/` authority boundary, its CLI, hardening, and
tests, then perform the one real prepare/approve/apply/verify/commit
acceptance chain this task is authorized to run.

## Current Milestone

Milestone ID: M11 — implementation checkpoint push + exact CI
Status: IN_PROGRESS
What is being attempted: about to commit the implementation (catalog still
empty), push fast-forward to origin/main, and wait for the exact CI run to
go green, including the new dedicated Phase 8B.1 matrix step.

## Completed Milestones

- M0 — bootstrap / stale-state classification / task creation: bootstrap
  CASE D confirmed (local HEAD == origin/main == 91149621..., matching the
  authorization prompt's expected SHA; `.agent/ACTIVE_TASK.md` showed Phase
  8B.1 NOT_STARTED/NOT_AUTHORIZED with no existing task directory).
- M1 — owner policy + schemas + trust model: `SELF_DEVELOPMENT_CANONICAL_ADOPTION`
  added, `OWNER_SCOPE_POLICY_VERSION` bumped to `.v2`, four private record
  schemas with exact-key validation and content-addressed identity in
  `src/core/selfDevPromotion/{types,validation}.ts`. Validation:
  `npx tsc --noEmit` PASS.
- M2–M7 — promotion intent / approval / apply / verify / currentness / CLI:
  implemented in `src/core/selfDevPromotion/{prepare,approve,apply,verify,currentness,storage,index}.ts`
  and `bin/selfdev-promote-canonical.mjs`. Validation: `npx tsc --noEmit` PASS.
- M8 — hardening: `checkPhase8B1CanonicalPromotionBoundary` added; the
  existing Phase 8B metamorphic-probe check repaired after the shared
  extraction. Validation: `npm run hardening:check` → PASS.
- M9 — adversarial test matrix: `tests/unit/selfDevCanonicalPromotion.test.ts`
  (5/5), `selfDevCanonicalPromotionFlow.test.ts` (7/7),
  `selfDevCanonicalPromotionCli.test.ts` (8/8), updated `ownerScope.test.ts`
  (4/4) — all PASS.
- M10 — full regression: `npx playwright test --project=nightwatch --workers=1`
  → 650+ passed; two pre-existing browser/proxy tests are worker-count
  port-contention flakes (confirmed unrelated; pass individually and under
  `--workers=1`).

## Work In Progress

Implementation checkpoint commit has not yet been created. All source,
tests, hardening, and workflow changes are staged-ready in the working tree
but uncommitted.

## Exact Next Action

Review `git status`/`git diff` one more time, stage exactly the
implementation-checkpoint files (source, tests, hardening, workflow,
`.agent/` task files — no adopted-catalog entry), commit, push fast-forward,
verify `HEAD == origin/main`, then poll the exact GitHub Actions run for that
commit SHA until it completes and requires success including the new
"Phase 8B.1 owner-gated canonical promotion matrix" step.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/selfDevPromotion/*.ts` | new canonical-promotion authority boundary | new |
| `bin/selfdev-promote-canonical.mjs` | new CLI | new |
| `src/core/selfDev/metamorphicProbes.ts` | shared pure metamorphic-proof extraction | new |
| `src/core/selfDevSandbox/sandboxExecutor.ts` | now calls the shared proof function | modified |
| `src/core/policy/ownerScope.ts` | new operation + policy version bump | modified |
| `src/core/provenance/localGit.ts` | whole-repo cleanliness / unchecked-HEAD / working-tree-status / cross-commit-diff read-only helpers | modified |
| `src/core/selfDev/provenanceManifest.ts` | new files added to `SELFDEV_AUTHORITATIVE_PATHS` | modified |
| `bin/hardening-check.mjs` | new `checkPhase8B1CanonicalPromotionBoundary`, repaired Phase 8B probe check | modified |
| `.github/workflows/hardening.yml` | new Phase 8B.1 matrix step | modified |
| `package.json` | new `selfdev:promote-canonical` script | modified |
| `tests/unit/selfDevCanonicalPromotion*.test.ts` | new focused matrix | new |
| `tests/unit/ownerScope.test.ts` | updated for policy v2 capability expansion | modified |
| `.agent/tasks/phase-8b-1-owner-gated-canonical-promotion/*` | task continuity | new |
| `.agent/ACTIVE_TASK.md` | points at this task | modified |

## Validation Ledger

Command: `npx tsc --noEmit`
Result: PASS
When: 2026-08-15
Relevant failure/output summary: no errors.

Command: `npm run hardening:check`
Result: PASS
When: 2026-08-15
Relevant failure/output summary: offline structural invariants hold.

Command: `npx playwright test tests/unit/selfDevCanonicalPromotion.test.ts tests/unit/selfDevCanonicalPromotionFlow.test.ts tests/unit/selfDevCanonicalPromotionCli.test.ts tests/unit/ownerScope.test.ts --project=nightwatch --workers=1`
Result: PASS
When: 2026-08-15
Relevant failure/output summary: 24/24 passed.

Command: `npx playwright test --project=nightwatch --workers=1`
Result: PASS (with 2 known unrelated flakes under --workers=2, both confirmed passing here)
When: 2026-08-15
Relevant failure/output summary: 650+ passed, 1 skipped (pre-existing
environment-conditional uid skip).

## Decisions Made During This Task

See `PLAN.md` → Decision Log for the full list (source-bundle-vs-contract
placement, metamorphic-probe extraction, fresh-load-not-process-trust for
verify/prepare/apply, approval-consumption check ordering, owner-policy
version bump).

## Discoveries

See `PLAN.md` → Discoveries (the pre-existing `currentCheckoutState()`
contract-digest process-binding characteristic, and the two unrelated
worker-count test flakes).

## Blockers

None.

## Safety Events

NONE. Zero DEV/NEXT/production contact, zero database/infrastructure
queries, zero external AI/model calls, zero publication, zero Alphaus
writes, zero runtime Git writes. Canonical source writes so far: 0 (catalog
still empty).

## Deferred / Follow-Up

See `PLAN.md` → Deferred Work (the `currentCheckoutState()` contract-digest
process-binding characteristic; not blocking, not fixed in this task).

## Resume Recipe

1. Read `SPEC.md`.
2. Read `PLAN.md`, focusing on the Decision Log and Milestones.
3. Inspect `git status` and current local/remote HEAD.
4. If the implementation checkpoint commit does not yet exist locally,
   continue from "Exact Next Action" above.
5. If it exists but is not yet pushed, push it fast-forward and verify
   `HEAD == origin/main`.
6. If it is pushed but CI has not been confirmed, check the exact GitHub
   Actions run for that SHA before doing anything else.
7. If APPROVAL_CONSUMPTION_STATUS (recorded once M14+ begins) is anything
   other than NOT_YET_ATTEMPTED, do NOT re-run apply — read the recorded IDs
   instead and continue from the exact recorded next milestone.

## Completion Snapshot

Populate only when complete.
