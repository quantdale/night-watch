# Task State

## Identity

Task ID: phase-8b-1-owner-gated-canonical-promotion
Phase: 8B.1
Status: BLOCKED
Starting SHA: 91149621e247a2996a3f5c97090684b68507418d
Last validated implementation SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
Last substantive checkpoint SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
Last documentation checkpoint SHA: (none yet)
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-15 — one real canonical promotion APPLIED and VERIFIED successfully, then the development session restored the pre-promotion catalog after full local regression revealed a structural, cross-phase test-suite incompatibility. See Blockers.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 91149621e247a2996a3f5c97090684b68507418d
LAST_VALIDATED_IMPLEMENTATION_SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9
LAST_DOCUMENTATION_CHECKPOINT_SHA:
LIVE_HEAD_AUTHORITY: GIT
PHASE_8B_1_STATUS: BLOCKED (attempt closed; retry requires fresh owner authorization)

## Objective

Implement and exercise exactly one owner-gated canonical promotion: a new
`src/core/selfDevPromotion/` authority boundary, its CLI, hardening, and
tests, then perform the one real prepare/approve/apply/verify/commit
acceptance chain this task is authorized to run.

## Current Milestone

Milestone ID: M17 — dirty-tree local validation (STOP triggered here); milestone status: BLOCKED
What is being attempted: after a fully successful real APPLY and VERIFY
(both PASS, see Completed Milestones), running the full local regression
suite against the dirty (one-file-changed) tree revealed that dozens of
pre-existing Phase 8A/8A.1/8A.1.1/8B tests fail — not because of a defect in
the promotion mechanism, but because `src/core/selfDev/controller.ts`
always seeds a fresh in-process `SelfDevEvaluator` from the live,
statically-imported `SELFDEV_ADOPTED_CASES`, and the ONE candidate the
deterministic synthetic proposer's default "valid" slot ever produces
(`selfdev.fixture.local-regression.v1` / `selfdev.synthetic.expand-summary`)
is exactly the one just adopted. Every historical test that calls
`runSyntheticSelfDevSession(...)` in-process (directly, or via a synthetic
`makeGitRepo()` fixture copied from `process.cwd()`, which now also carries
the live one-entry catalog) permanently loses its "there is always one fresh
EVALUATED_PASS_NOT_ADOPTED candidate" precondition once this promotion is
committed — not just during the dirty pre-commit window, but forever,
because the proposer has no second distinct "new" fixture to fall back to.
This is a real, cross-cutting, multi-phase test-suite compatibility gap
(8 test files spanning Phase 8A, 8A.1, 8A.1.1, 8B, and this task's own new
suite), not a narrow fix. Per the task's own explicit STOP condition
("local tests fail after apply... No automatic second approval/application")
and its explicit instruction not to mix new architecture/test fixes with an
already-applied promotion, the canonical write was reverted by the
development session (a normal `git checkout HEAD --
src/core/selfDev/adoptedCaseCatalog.generated.ts`, not a runtime action) and
the task STOPPED here rather than improvising fixes across four historical
phases' test suites under time pressure.

## Completed Milestones

- M0 — bootstrap / stale-state classification / task creation: bootstrap
  CASE D confirmed (local HEAD == origin/main == 91149621..., matching the
  authorization prompt's expected SHA; `.agent/ACTIVE_TASK.md` showed Phase
  8B.1 NOT_STARTED/NOT_AUTHORIZED with no existing task directory).
- M1–M9 — full Phase 8B.1 implementation (owner policy + 4 schemas +
  prepare/approve/apply/verify/currentness/storage + CLI + hardening + 20/20
  new/updated focused tests). See PLAN.md for detail.
- M10 — full regression at the implementation checkpoint (catalog still
  empty): 650+ passed; two pre-existing browser/proxy tests are worker-count
  port-contention flakes, confirmed unrelated.
- M11 — implementation checkpoint: commit `04aef3b` (implementation) +
  `7009eef`/`bcdca80` (continuity + a hardening call-graph false-negative
  fix — see PLAN.md Decision Log) pushed fast-forward; exact CI run
  `31868447710` at `bcdca80d4ae59de88b1aa4447bd49ef4b09fd6d9` completed
  success on every step, including the dedicated "Phase 8B.1 owner-gated
  canonical promotion matrix" step, agent-state check, and diff check.
- M12 — fresh pre-promotion selfDev session: `npm run selfdev:synthetic` at
  base `623e4c8857b269cc79433ef4ab3e8a19cc84380f` (a docs-only descendant of
  the implementation checkpoint) produced
  `session:sha256:5f11b98ec169cfd711711a8c71e19f669d44e036e1be00ff122f340387a83a2d`,
  `VERIFIED_EXACT_BASE`, replay PASS, 1 pass / 1 duplicate / 1 rejected,
  `sourceBundleDigest sha256:ed3038d3...`, `contractDigest sha256:91b45f10...`
  (unchanged from Phase 8B.0.1 — still the empty-catalog contract).
- M13 — fresh Phase 8B sandbox plan/result for the one eligible candidate
  `candidate:e5fbe9e4a8df7843b5712a0510b5c4479e29053c29d52185165560a8304e6093`:
  plan `adoption-plan:sha256:1b725caaafd1b93a3825b6055f2443d25d90ba31e8c4d790833fc58cc67e46ff`;
  sandbox result
  `adoption-sandbox-result:sha256:37965499aa6f360f89b98b684b9966c549c0fce0d087ee1622d8fbb54147d7c1`
  — `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`, all five probes PASS,
  `sandboxSourceWrites 1`, canonical/runtime/external all 0, `cleanupStatus
  PASS`. Real repository confirmed byte-identical/clean before and after.
- M14 — promotion prepare + approve: `inspect` (read-only) matched `prepare`
  exactly; promotion
  `canonical-promotion:sha256:93d5bb9ded566e00f4d43f5ecf927aacb9d72787c47191c131e690fef68a0c0d`
  (`preparedAgainstHeadSha 623e4c88...`, `targetPreimageDigest
  sha256:ffe3d635...`, `targetPostimageDigest sha256:fa7b71d4...`,
  `expectedPostSourceBundleDigest sha256:0836b99e...`,
  `expectedPostContractDigest sha256:8d115602...`). Approval
  `canonical-promotion-approval:sha256:17c970356d9d2691c3f371ecda2c2acbcd9d367585db766aec41b23097f34c47`
  created with the exact `CANONICAL_ONE_FILE_ONLY` token. Zero writes so far.
- M15 — the ONE real canonical APPLY: receipt
  `canonical-apply-receipt:sha256:1d69bbf13652188d25194e0c3aab5d999937811d0f7c086860a3a148d2edab34`,
  `applyOutcome APPLIED`, `canonicalSourceWrites 1`, `runtimeGitWrites 0`,
  `externalCalls 0`, `observedTargetPostimageDigest` matched exactly,
  `observedChangedFiles` exactly `[src/core/selfDev/adoptedCaseCatalog.generated.ts]`.
  Original file mode preserved. The one-shot approval was consumed and
  remains permanently spent (no reuse attempted, no second approval
  created).
- M16 — canonical VERIFY (fresh CLI process): verification
  `canonical-promotion-verification:sha256:42d5193d5ee267e23229cb3d8716be38becfee6f740e0ccc29136151ce12f958`
  — `verificationStatus CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`, all four
  post-apply metamorphic probes PASS (postEquivalent, postVariantCoverage,
  nonOverreach, unsafeRegression), `canonicalSourceWrites 0`,
  `runtimeGitWrites 0`, `runtimeGitCommit NOT_AUTHORIZED`. The promotion
  mechanism itself is fully, cleanly proven correct end to end.
- M17 (attempted) — dirty-tree local validation: `git diff --name-only`
  showed exactly the one target file, staged/untracked empty; `npx tsc
  --noEmit` PASS; `npm run hardening:check` PASS; but the focused
  Phase 8A/8A.1/8A.1.1/8B/8B.1 matrix showed 50 failures, all traced to the
  single root cause described above. The development session then restored
  `src/core/selfDev/adoptedCaseCatalog.generated.ts` to its exact
  pre-promotion bytes via `git checkout HEAD -- <path>` (verified
  byte-identical to `targetPreimageDigest sha256:ffe3d635...` before and
  after) and re-ran the same focused suite, which passed 83/83 — confirming
  the failures were caused exclusively by the one adopted catalog entry, not
  by any defect in this task's own implementation.

## Work In Progress

None. The repository is clean and matches `origin/main` at
`623e4c8857b269cc79433ef4ab3e8a19cc84380f` exactly (verified: `git status`
empty, `git diff` empty, local HEAD == origin/main).

## Exact Next Action

STOP — a fresh Phase 8B.1 retry requires a new owner authorization. The
structural blocker is already resolved by Phase 8B.1.0; the old approval is
permanently spent; no apply continuation, no approval reuse. Any retry
starts from fresh source state, a fresh selfDev artifact, a fresh sandbox
proof, a fresh promotion intent, and a fresh one-shot approval.

## Files Changed

(Unchanged from the pushed implementation checkpoint; no further source
files were modified in this session after `bcdca80`. The catalog target was
written and then restored to identical pre-promotion bytes — net zero
tracked diff.)

| Path | Reason | Status |
|---|---|---|
| `src/core/selfDevPromotion/*.ts` | new canonical-promotion authority boundary | committed (bcdca80) |
| `bin/selfdev-promote-canonical.mjs` | new CLI | committed (bcdca80) |
| `src/core/selfDev/metamorphicProbes.ts` | shared pure metamorphic-proof extraction | committed (bcdca80) |
| `src/core/selfDevSandbox/sandboxExecutor.ts` | now calls the shared proof function | committed (bcdca80) |
| `src/core/policy/ownerScope.ts` | new operation + policy version bump | committed (bcdca80) |
| `src/core/provenance/localGit.ts` | read-only cleanliness/HEAD/diff helpers | committed (bcdca80) |
| `src/core/selfDev/provenanceManifest.ts` | new files added to `SELFDEV_AUTHORITATIVE_PATHS` | committed (bcdca80) |
| `bin/hardening-check.mjs` | new check + call-graph false-negative fix | committed (bcdca80) |
| `.github/workflows/hardening.yml` | new Phase 8B.1 matrix step | committed (bcdca80) |
| `package.json` | new `selfdev:promote-canonical` script | committed (bcdca80) |
| `tests/unit/selfDevCanonicalPromotion*.test.ts` | new focused matrix | committed (bcdca80) |
| `tests/unit/ownerScope.test.ts` | updated for policy v2 | committed (bcdca80) |
| `src/core/selfDev/adoptedCaseCatalog.generated.ts` | applied then restored | clean, unchanged from HEAD |

## Validation Ledger

Command: `npx tsc --noEmit`
Result: PASS (both at the implementation checkpoint and post-apply, dirty tree)
When: 2026-08-15

Command: `npm run hardening:check`
Result: PASS (both at the implementation checkpoint and post-apply, dirty tree)
When: 2026-08-15

Command: focused Phase 8B.1 matrix (24 tests)
Result: PASS
When: 2026-08-15

Command: full Playwright at the implementation checkpoint
Result: PASS (650+; 2 known unrelated worker-count flakes)
When: 2026-08-15

Command: focused Phase 8A/8A.1/8A.1.1/8B matrix, dirty tree (post-apply, one real catalog entry present)
Result: FAIL — 50 failed, 83 passed
When: 2026-08-15
Relevant failure/output summary: every failure traces to the single root
cause (in-process evaluator seeding from the now-nonempty live catalog).

Command: same focused matrix, after restoring the target to pre-promotion bytes
Result: PASS — 83/83
When: 2026-08-15

## Decisions Made During This Task

See `PLAN.md` → Decision Log (source-bundle-vs-contract placement,
metamorphic-probe extraction, fresh-load-not-process-trust for
verify/prepare/apply, approval-consumption check ordering, owner-policy
version bump) plus this session's stop decision: revert the one applied
canonical write via a development-session `git checkout` rather than
attempting to fix eight cross-phase historical test files under time
pressure immediately after a real, already-consumed one-shot approval.

## Discoveries

- **Root cause of the block**: `src/core/selfDev/controller.ts` seeds every
  in-process `SelfDevEvaluator` from the live, statically-imported
  `selfDevAdoptedEquivalentFingerprints()`/`selfDevAdoptedCoverageClasses()`
  (i.e. the real, currently-checked-out `SELFDEV_ADOPTED_CASES`), and the
  deterministic `SyntheticDeterministicProposer`'s default "valid" candidate
  slot (`src/core/selfDev/proposer.ts`) always produces the exact same
  semantic candidate (`fixtureId: selfdev.fixture.local-regression.v1`,
  `actionIds: ['selfdev.synthetic.expand-summary']` — `seed`/`baseNightwatchSha`
  only affect timestamps/candidateId, never the semantic content). There is
  no second distinct "genuinely new" fixture the ordinary proposer can fall
  back to. Consequently, the FIRST real adoption of this one candidate
  permanently and irreversibly (short of un-adopting it) removes the "there
  is always exactly one fresh `EVALUATED_PASS_NOT_ADOPTED` candidate"
  precondition that 8 test files across Phase 8A/8A.1/8A.1.1/8B/8B.1
  (`selfDev.test.ts`, `selfDevProvenance.test.ts`, `selfDevEligibility.test.ts`,
  `selfDevAdoptionPlan.test.ts`, `selfDevAdoptionSandbox.test.ts`,
  `selfDevAdoptionCli.test.ts`, `selfDevCli.test.ts`, this task's own
  `selfDevCanonicalPromotion*.test.ts`) depend on, whether they build a
  synthetic `makeGitRepo()` fixture (which now also inherits the live
  catalog, since it copies from `process.cwd()`) or call
  `runSyntheticSelfDevSession(...)` directly in-process.
- This is a genuinely new finding: Phase 8B and Phase 8B.0.1's own
  historical acceptance never surfaced it because both deliberately kept the
  canonical catalog empty throughout (their own explicit, verified
  invariant). Phase 8B.1 is the first phase whose mission is to make the
  catalog non-empty, and this task is the first to actually attempt it —
  so this incompatibility could only ever be discovered by attempting a
  real promotion, exactly as this task did.
- The promotion mechanism itself (`src/core/selfDevPromotion/*`) has no
  defect: `prepare`, `approve`, `apply`, and `verify` each behaved exactly
  as designed, and the fresh-process-equivalent `verify` step independently
  confirmed all four metamorphic probes PASS against the real applied
  bytes. The block is entirely a pre-existing, cross-phase test-suite
  assumption that this task's mission was always going to eventually
  expose.
- See also `PLAN.md` → Discoveries (the pre-existing `currentCheckoutState()`
  contract-digest process-binding characteristic, and the two unrelated
  worker-count test flakes) — both unrelated to this block.

## Blockers

**BLOCKED**: the previous attempt is CLOSED — one real apply occurred and
was verified, then reverted; its one-shot approval is permanently spent. A
retry is currently blocked on a FRESH OWNER AUTHORIZATION (the structural
cross-phase test-suite blocker was resolved by Phase 8B.1.0). Historical
detail: the promotion applied and verified successfully, then the
development session restored the pre-promotion catalog after full local
regression revealed a structural, cross-phase test-suite incompatibility;
the mechanism itself had no defect.

## Safety Events

NONE. Zero DEV/NEXT/production contact, zero database/infrastructure
queries, zero external AI/model calls, zero publication, zero Alphaus
writes, zero runtime Git writes for the ENTIRE task. Exactly one canonical
source write occurred (the one authorized real APPLY), immediately followed
by exactly one development-session restore (a normal `git checkout`, not a
runtime action) once full regression revealed the cross-phase
incompatibility. Final state: canonical source unchanged from the last
pushed commit; approval consumed exactly once and permanently spent; no
second write, no second approval, no retry.

## Deferred / Follow-Up

- Resolve the root-cause incompatibility described in Discoveries/Blockers
  before any future real canonical promotion attempt.
- `PLAN.md` → Deferred Work: the `currentCheckoutState()` contract-digest
  process-binding characteristic (unrelated, not blocking).

## Resume Recipe

1. Read `SPEC.md`, then `PLAN.md` (Decision Log, Discoveries), then this
   file in full.
2. Confirm `git status` is clean and local HEAD == origin/main ==
   `623e4c8857b269cc79433ef4ab3e8a19cc84380f` (or a later documented
   descendant) before doing anything else.
3. Do NOT reattempt `apply` with promotion
   `canonical-promotion:sha256:93d5bb9ded566e00f4d43f5ecf927aacb9d72787c47191c131e690fef68a0c0d`
   / approval
   `canonical-promotion-approval:sha256:17c970356d9d2691c3f371ecda2c2acbcd9d367585db766aec41b23097f34c47`
   — the approval is already consumed and permanently spent.
4. This task cannot resume to completion without new owner authorization
   scoped to fixing the root-cause test-suite incompatibility first (see
   Blockers). Treat that as a distinct, separately authorized follow-up
   task, not a continuation of this exact promotion.

## Completion Snapshot

Not applicable — task BLOCKED, not complete. See Blockers for the precise
reason and Discoveries for the root cause a follow-up task must address.
