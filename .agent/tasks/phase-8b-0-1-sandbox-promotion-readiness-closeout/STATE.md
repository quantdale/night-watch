# Task State

## Identity

Task ID: phase-8b-0-1-sandbox-promotion-readiness-closeout
Phase: 8B.0.1 — Sandbox Promotion-Readiness Closeout
Status: COMPLETE
Starting SHA: fca4002ccb4869e5b9932b70f25e5df8e67d1da6
Last validated implementation SHA: c4537ab5e3e96859c7c472ac47c3143a15b20c26
Branch: main
Remote: origin (https://github.com/quantdale/night-watch.git)
Live HEAD authority: GIT (discover from git, never predict)

STARTING_SHA: fca4002ccb4869e5b9932b70f25e5df8e67d1da6
LAST_VALIDATED_IMPLEMENTATION_SHA: c4537ab5e3e96859c7c472ac47c3143a15b20c26
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c4537ab5e3e96859c7c472ac47c3143a15b20c26
LAST_DOCUMENTATION_CHECKPOINT_SHA: 0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9

## Objective

Close the four Phase 8B promotion-readiness integrity defects (sandbox base
pre-validation, adoption strategy binding, complete verified-result
metamorphic invariants, truthful failure-path sandbox-write accounting), prove
each with pre-fix TRUE_POSITIVE reproductions, and run a fresh private
sandbox-only acceptance proving readiness for a SEPARATELY AUTHORIZED Phase
8B.1 design review. Canonical promotion stays NOT_AUTHORIZED; canonical
catalog stays empty and byte-identical.

## Current Milestone

Milestone ID: M13 — STOP (COMPLETE).
Status: COMPLETE
What was attempted and the result: M12 complete — docs closure commit C
(1fc8b569c0a3750f5045f1880345b07bec9f5cf5) pushed fast-forward
(0f64ea6..1fc8b56); final exact CI run 31858202588 at 1fc8b569 —
completed/success with the dedicated "Phase 8B.0.1 sandbox promotion-
readiness closeout matrix" step and the agent-state check verified
individually; fresh acceptance session re-verified at the final HEAD as
VERIFIED_SOURCE_EQUIVALENT_DESCENDANT with replay PASS and eligible true
(§78); final worktree clean; HEAD == origin/main == 1fc8b569 confirmed.
PHASE_8B_0_1_COMPLETE. Phase 8B.1 was not started. STOP.

## Completed Milestones

- M0 — Git bootstrap + continuity read + task scaffolding (SPEC/PLAN/STATE/
  REPORT, ACTIVE_TASK.md). Verified: root correct, branch main, clean
  worktree, HEAD == origin/main == fca4002ccb4869e5b9932b70f25e5df8e67d1da6.
  Continuity read: AGENTS.md, docs/CURRENT_STATE.md, docs/SAFETY_MODEL.md,
  .agent/ACTIVE_TASK.md, Phase 8B task SPEC/PLAN/STATE/REPORT. All four
  defects confirmed in source.
- M1 — Pre-fix reproduction of all four defects with the isolated harness at
  /tmp/phase8b01-repro/ (temp HOME, temp git repos, injected private roots;
  never real $HOME). All four TRUE_POSITIVE (see Defect-Repro Ledger below).
- M2 — Defect A fix: `ensurePrivateSandboxBase()` (component-wise pathname-
  chain validation, fail-closed symlink/non-directory/owner/mode, create-
  only-beneath-validated-parent, immediate revalidation), instance
  realpath-containment + repo/workspace/findings disjointness, cleanup strict
  child containment, copy-failure cleanup inside createSandboxMirror.
- M3 — Defect B fix: strict `SELFDEV_ADOPTION_STRATEGY_CLASS` equality in
  plan/result validation (before identity checks), plan↔adoptedCase
  cross-binding (PLAN_STRATEGY_MISMATCH), literal
  `SelfDevAdoptionStrategyClass` type (type-only import; no runtime cycle).
- M4 — Defect C fix: verified result requires all five probes exactly PASS;
  `NON_OVERREACH_PROBE_UNAVAILABLE` added to the failure-class union;
  executor maps NOT_RUN → NON_OVERREACH_PROBE_UNAVAILABLE, FAIL →
  NON_OVERREACH_REGRESSION.
- M5 — Defect D fix: closure-tracked `sandboxSourceWrites` (0 → 1 immediately
  after the single successful writeSandboxTarget); failure and success drafts
  carry the tracked value; validation bounds integer 0..1; success requires
  exactly 1; outer-catch cleanupStatus truthful ('PASS' when no mirror was
  created).
- M6 — Focused tests: new `tests/unit/selfDevSandboxConfinement.test.ts`
  (13 tests, matrix A-J); `selfDevAdoptionPlan.test.ts` +2 strategy-binding;
  `selfDevAdoptionSandbox.test.ts` +8 (result strategy, verified-invariant
  matrix 5 fields × NOT_RUN/FAIL, executor modified-source probe evaluation,
  NON_OVERREACH_REGRESSION end-to-end, UNAVAILABLE class semantics, post-write
  failure writes=1, pre-write failure writes=0, impossible counter tuples).
  Also fixed ADDITIONAL_PHASE_8B_0_1_FINDING (sandboxLoader lock wedge).
  42/42 focused tests pass (1 env-conditional skip: owner-chown needs root).
- M7 — Hardening `checkPhase8B01CloseoutIntegrity` + dedicated CI step
  "Phase 8B.0.1 sandbox promotion-readiness closeout matrix"
  (confinement file + `-g "8B\.0\.1"` subset of plan/sandbox files).
  hardening:check PASS; local run of the exact CI selection: 22 passed /
  1 skip.
- M8 — Full local validation: typecheck PASS; hardening PASS; focused matrix
  110 passed / 1 skip / 2 CLI failures at the dirty tree (expected —
  currentCheckoutState against the real repo; 7/7 at clean commit A); owner
  provenance 91; AI regressions 98; agent-state 32; campaign 27; git diff
  --check clean; full Playwright at commit A: 633 passed / 1 env-conditional
  skip (634 total; 611 Phase 8B baseline + 23 new).
- M9 — Isolated full-history clean-checkout validation (sibling of the real
  Alphaus repos): typecheck PASS, hardening PASS, focused matrix 112 passed /
  1 skip, owner provenance 91, agent-state 32, campaign 27, git diff --check
  clean.
- M10 — Substantive checkpoint: commit A (c4537ab5e3e96859c7c472ac47c3143a15b20c26)
  committed; continuity commit B (0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9)
  recorded the anchors (validated == substantive == A; agent:check at A is
  red on the six anchor fields by construction — a commit cannot reference
  itself); A+B pushed in one fast-forward (fca4002..0f64ea6); HEAD ==
  origin/main == 0f64ea6. Exact CI run 31857751099 at 0f64ea6:
  completed/success; dedicated 8B.0.1 matrix step executed and PASSED and
  agent-state check PASSED, both verified individually.
- M11 — Fresh sandbox-only acceptance on the current implementation (see
  "Real Acceptance Evidence (M11)" below): session d8846f36... VERIFIED_
  EXACT_BASE, replay PASS, eligible true, one candidate; plan
  037e840b...; run → result ee941a9f... SANDBOX_VERIFIED_NOT_CANONICALLY_
  APPLIED, all five probes PASS, sandboxSourceWrites 1, zero canonical/Git/
  external counters, cleanupStatus PASS; canonical catalog byte-identical
  (ffe3d635..., still empty); git status clean; sandbox base empty (0
  instances); session re-verified VERIFIED_EXACT_BASE (replay PASS) at HEAD
  before the docs closure.
- M12 — Docs closure: durable docs updated (docs/CURRENT_STATE.md,
  docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/SAFETY_MODEL.md,
  docs/DECISIONS.md D-48); task STATE/PLAN/REPORT/ACTIVE_TASK updated;
  REPORT.md written in the 102-field format. Commit C pending push + final
  CI.

## Real Acceptance Evidence (M11)

Performed at HEAD == origin/main == 0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9
(clean worktree; exact CI 31857751099 already green including the dedicated
8B.0.1 step).

- Pre-acceptance canonical catalog digest:
  `sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`
  (empty-catalog canonical bytes; identical to the historical Phase 8B
  pre/post digest).
- `npm run selfdev:synthetic` → fresh v2 artifact
  `session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`,
  bound to `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`, source digest
  `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`,
  contract digest
  `sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`
  (unchanged — closeout is source-provenance, not evaluator-contract),
  `trustStatus: VERIFIED_EXACT_BASE`, 1 pass / 1 duplicate / 1 rejected.
- `inspect` → `eligible: true`, exactly one candidate
  `candidate:0a8626f4e7e21ecf167462b7e5c12985f751e88f107fc5d76b091daa2349e74d`.
- `plan` → `adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`;
  `strategyClass: DECLARATIVE_REGRESSION_CATALOG_PROMOTION`;
  `targetPreimageDigest` matched the pre-acceptance canonical digest exactly;
  `canonicalApply: PROHIBITED`, `publication: PROHIBITED`; canonical
  worktree verified clean immediately after planning.
- `run --confirm SANDBOX_ONLY` → result
  `adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`:
  `sandboxVerificationStatus: PASS`, `failureClass: NONE`,
  `adoptionStatus: SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`,
  `changedFiles: ["src/core/selfDev/adoptedCaseCatalog.generated.ts"]`,
  `preAdoptionResult/postEquivalentResult/postVariantCoverageResult/
  nonOverreachResult/unsafeRegressionResult` ALL `PASS` (no NOT_RUN),
  `sandboxSourceWrites: 1`, `canonicalSourceWrites: 0`,
  `runtimeGitWrites: 0`, `externalCalls: 0`, `cleanupStatus: PASS`,
  `canonicalApply: PROHIBITED`, `publication: PROHIBITED`.
- Post-acceptance canonical proof: `git status --short` clean;
  `src/core/selfDev/adoptedCaseCatalog.generated.ts` byte-identical
  (digest `sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
  content still `export const SELFDEV_ADOPTED_CASES = [];`); `git rev-parse
  HEAD` unchanged; canonical sourceBundleDigest unchanged
  (`89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`);
  `$HOME/.nightwatch/selfdev-sandboxes/` exists (0700) and contains ZERO
  entries — no residual acceptance sandbox.
- Session re-verification at HEAD: `npm run selfdev:verify -- --artifact-id
  session:sha256:d8846f...` → `VERIFIED_EXACT_BASE`, `replayStatus: PASS`,
  `passCandidateCount: 1`. (After the docs-only closure commit C this is
  expected to report `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` — §78.)

## Work In Progress

None — task closed (M13 STOP). Final live SHA:
1fc8b569c0a3750f5045f1880345b07bec9f5cf5; final CI 31858202588 green;
acceptance session re-verified VERIFIED_SOURCE_EQUIVALENT_DESCENDANT;
worktree clean; HEAD == origin/main.

## Exact Next Action

NONE. Task closed: Phase 8B.0.1 = COMPLETE; Phase 8B.1 = NOT_STARTED /
NOT_AUTHORIZED (READY_FOR_SEPARATE_DESIGN_REVIEW). Do not start Phase 8B.1
without separate owner authorization.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| .agent/tasks/phase-8b-0-1-sandbox-promotion-readiness-closeout/{SPEC,PLAN,STATE,REPORT}.md | Task scaffolding | Created |
| .agent/ACTIVE_TASK.md | Point at Phase 8B.0.1 task | Modified |
| src/core/selfDevSandbox/sandboxMirror.ts | Defect A: ensurePrivateSandboxBase + containment + cleanup + copy-failure cleanup | Modified |
| src/core/selfDevSandbox/validation.ts | Defects B/C/D: strategy binding, verified invariant, write-count bound, new failure class | Modified |
| src/core/selfDevSandbox/types.ts | Literal strategy type + NON_OVERREACH_PROBE_UNAVAILABLE union member | Modified |
| src/core/selfDev/adoptedCases.ts | `SelfDevAdoptionStrategyClass` type alias | Modified |
| src/core/selfDevSandbox/sandboxExecutor.ts | Defects C/D: probe gates + truthful write accounting | Modified |
| src/core/selfDevSandbox/sandboxLoader.ts | ADDITIONAL FINDING: lock released on every exit path | Modified |
| tests/unit/selfDevSandboxConfinement.test.ts | Phase 8B.0.1 confinement matrix | Created |
| tests/unit/selfDevAdoptionPlan.test.ts | +2 strategy-binding tests | Modified |
| tests/unit/selfDevAdoptionSandbox.test.ts | +8 strategy/invariant/accounting/executor tests | Modified |
| bin/hardening-check.mjs | `checkPhase8B01CloseoutIntegrity` | Modified |
| .github/workflows/hardening.yml | Dedicated 8B.0.1 CI matrix step | Modified |

## Validation Ledger

Command: `git rev-parse --show-toplevel && git status --short && git branch --show-current && git remote -v && git fetch origin && git rev-parse HEAD && git rev-parse origin/main`
Result: PASS (clean, main, HEAD == origin/main == fca4002ccb4869e5b9932b70f25e5df8e67d1da6)
When: 2026-08-15

Command: `npm run typecheck`
Result: PASS (0 errors) — after all fixes and tests.

Command: `npm run hardening:check`
Result: PASS — including the new checkPhase8B01CloseoutIntegrity.

Command: `npx playwright test tests/unit/selfDevSandboxConfinement.test.ts tests/unit/selfDevAdoptionPlan.test.ts tests/unit/selfDevAdoptionSandbox.test.ts --project=nightwatch --workers=1`
Result: 41 passed / 1 env-conditional skip (42 total).

Command: `npx playwright test tests/unit/selfDevSandboxConfinement.test.ts tests/unit/selfDevAdoptionPlan.test.ts tests/unit/selfDevAdoptionSandbox.test.ts -g "8B\.0\.1" --project=nightwatch --workers=1`
Result: 22 passed / 1 skip — the exact dedicated CI selection.

Command: full focused matrix (selfDevSchema/selfDev/selfDevProvenance/
selfDevCli/selfDevEligibility/selfDevAdoptionCatalog/selfDevAdoptionPlan/
selfDevAdoptionSandbox/selfDevAdoptionCli/selfDevSandboxConfinement/
ownerScope, --project=nightwatch --workers=1)
Result: 110 passed / 1 skip / 2 failed — the 2 failures are the CLI tests
reading the REAL repo's currentCheckoutState, which reports
SELFDEV_AUTHORITATIVE_SOURCE_DIRTY because the worktree is deliberately dirty
mid-implementation. Expected; re-run at commit A with a clean tree.

Command: `npm run test:owner-provenance`
Result: 91 passed.

Command: AI regressions (aiReview/aiReviewLoopback/aiLocalCanary/aiOwnerReview)
Result: 98 passed.

Command: `npx playwright test tests/unit/agent-state.test.ts --project=nightwatch --workers=1`
Result: 32 passed.

Command: `npm run campaign:synthetic`
Result: 27 passed.

Command: `git diff --check`
Result: clean.

Command: `npm run agent:check`
Result: FAIL (27 errors) — task files not yet matching the schema at first
run; restructured; then 6 anchor-only errors at commit A (expected — a
commit cannot reference itself); PASS with 1 benign CHECKPOINT_ADVANCE
warning at the continuity commit B (approved paths only).

Command: `git push origin main` (A+B in one fast-forward, fca4002..0f64ea6)
Result: PASS; `git fetch origin && git rev-parse HEAD origin/main` — both
0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9.

Command: exact CI run 31857751099 at 0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9
Result: completed / success; every step green; dedicated "Phase 8B.0.1
sandbox promotion-readiness closeout matrix" step executed and PASSED and
"Agent-state check" PASSED — both verified individually from the job steps.

Command: `npm run selfdev:synthetic`
Result: SESSION PASS — artifact session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2, VERIFIED_EXACT_BASE, 1 pass/1 duplicate/1 rejected.

Command: `npm run selfdev:adopt-sandbox -- inspect --artifact-id <fresh session>`
Result: eligible true, exactly one candidate candidate:0a8626f4e7e21ecf167462b7e5c12985f751e88f107fc5d76b091daa2349e74d.

Command: `npm run selfdev:adopt-sandbox -- plan --artifact-id <fresh session> --candidate-id <candidate>`
Result: plan adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4, strategy DECLARATIVE_REGRESSION_CATALOG_PROMOTION, canonicalApply/publication PROHIBITED; canonical worktree clean after planning.

Command: `npm run selfdev:adopt-sandbox -- run --plan-id <plan> --confirm SANDBOX_ONLY`
Result: result adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183 — SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED, all five probes PASS, sandboxSourceWrites 1, canonicalSourceWrites/runtimeGitWrites/externalCalls 0, cleanupStatus PASS.

Command: post-acceptance canonical proof (`git status --short`, catalog sha256sum, HEAD, base listing)
Result: PASS — clean; catalog byte-identical ffe3d635... (still empty); HEAD unchanged; base 0700 with 0 entries.

Command: `npm run selfdev:verify -- --artifact-id <fresh session>`
Result: SESSION PASS — VERIFIED_EXACT_BASE, replayStatus PASS,
passCandidateCount 1 at HEAD 0f64ea6; re-verified at the final docs closure
HEAD 1fc8b569 as VERIFIED_SOURCE_EQUIVALENT_DESCENDANT (sourceBundleMatch
MATCH, contractDigestMatch MATCH, replayStatus PASS, passCandidateCount 1)
— §78 satisfied.

Command: `git push origin main` (docs closure C, 0f64ea6..1fc8b56)
Result: PASS; HEAD == origin/main == 1fc8b569c0a3750f5045f1880345b07bec9f5cf5.

Command: exact final CI run 31858202588 at 1fc8b569c0a3750f5045f1880345b07bec9f5cf5
Result: completed / success; every step green; dedicated "Phase 8B.0.1
sandbox promotion-readiness closeout matrix" step executed and PASSED and
"Agent-state check" PASSED — both verified individually from the job steps.

Command: final continuity commit D (approved task-file paths only), push
fast-forward, exact final CI at D
Result: PASS; completed / success (dedicated 8B.0.1 step and agent-state
check verified individually); HEAD == origin/main; final worktree clean.

## Decisions Made During This Task

- D1: sandbox base remains code-defined; test injection via module-level
  `setSandboxBaseOverrideForTests` (not exported from the boundary index,
  unreachable from the production CLI; no --sandbox-root option).
- D2: permission policy — base fails closed on open mode/wrong owner (no
  repair); private parent reuses the established private-artifact convention
  (validated non-symlink owner-matched directory tightened to 0700, never
  loosened); $HOME and arbitrary ancestors never chmodded or created.
  Rationale: `~/.nightwatch` is created by Nightwatch's own recursive mkdir
  at 0755 on this machine (only `findings`/`auth` are 0700); the established
  store convention is validate-then-tighten; the sandbox base itself stays
  strict.
- D3: pathname chain validated component-wise from the filesystem root
  (mirrors privateArtifacts `assertNoSymlinkComponents`); first missing
  component must be the exact directory permitted for creation.
- D4: cleanup requires realpath strict-child containment + lstat before
  rmSync; any doubt → FAIL (residual directory preferred to unsafe deletion).
- D5: strategy version NOT added to plan/result records — the contract
  manifest already binds adoptionStrategyVersion/adoptionStrategyClass into
  contractDigest, which plans/results carry and revalidate; only strategy
  CLASS becomes a strict runtime constant. No cosmetic fields.
- D6: non-overreach semantics: NOT_RUN → NON_OVERREACH_PROBE_UNAVAILABLE;
  FAIL → NON_OVERREACH_REGRESSION; other probes NOT_RUN/FAIL →
  POST_ADOPTION_STILL_PASS.
- D7: write accounting is a closure variable set to 1 immediately after the
  single successful writeSandboxTarget; no hardcoded counters remain.
- D8: executor outer catch reports cleanupStatus PASS when no mirror was
  created (nothing to clean); createSandboxMirror cleans up its own partially
  copied mirror under the validated-root rule.
- D9: end-to-end NON_OVERREACH_PROBE_UNAVAILABLE is not forcible with the
  current deterministic registry (it always yields a bounded probe — the
  historical acceptance property, spec §39); covered by validation semantics
  + hardening source assertion + the REGRESSION end-to-end test.
- D10: checkpoint sequencing — substantive commit carries `(none yet)`
  anchors (a commit cannot reference itself; agent:check is red by
  construction at the substantive commit); a docs-only continuity commit
  records the anchors; A+B pushed in one fast-forward so no red CI run
  exists; the green run at B is the exact-substantive-content CI evidence.

## Discoveries

- ADDITIONAL_PHASE_8B_0_1_FINDING (fixed): `sandboxLoader.ts` set
  `loadInFlight = true` before `requireFn('typescript')`, which can throw
  BEFORE the try/finally — permanently wedging the serial-execution lock for
  every later sandbox load. Found by the new post-write-failure test seam
  (bad anchor wedged all subsequent full runs in the same worker). Fixed with
  a whole-body try/finally releasing the lock on every exit path.
- The failure-result builder records all probe fields as NOT_RUN for failure
  records (allowed by spec §34); the failureClass is the discriminator.
- Probe SELECTION (findNonOverreachActionIds) uses the canonical in-process
  registry while probe EVALUATION uses the mirrored registry — by design;
  the registry-surgery tests prove the evaluator genuinely executes the
  modified mirror (unknown action → probe FAIL → NON_OVERREACH_REGRESSION).

## Blockers

None.

## Safety Events

NONE. Zero DEV/NEXT/production contacts, product mutations, database/
infrastructure queries, external AI/model calls, publication, canonical
source writes, runtime Git writes, Alphaus writes. Defect reproductions used
isolated temp HOME/roots only. The real `~/.nightwatch` base (0700) was
revalidated in place; no canonical file was touched by any reproduction or
test.

## Deferred / Follow-Up

- Phase 8B.1 — Owner-Gated Canonical Promotion: NOT_STARTED / NOT_AUTHORIZED.
  No task directory may be created during this task.
- Owner-chown regression (confinement test G) is environment-conditional
  (requires root); runs as a skip on this machine, executes on capable hosts.

## Resume Recipe

1. Read SPEC.md.
2. Read PLAN.md.
3. Inspect `git status` and current SHA; confirm `HEAD == origin/main`.
4. Run the smallest relevant validation for the current milestone.
5. Continue Exact Next Action above.

## Completion Snapshot

Final substantive checkpoint: `c4537ab5e3e96859c7c472ac47c3143a15b20c26`
Final documentation checkpoint (CI-verified, `HEAD == origin/main`):
`0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9` (continuity commit; final docs
closure commit `1fc8b569c0a3750f5045f1880345b07bec9f5cf5` was the live HEAD
when the docs closure landed; the final continuity record may advance live
HEAD by approved task-file paths only)
Live HEAD: DISCOVER_FROM_GIT (worktree clean; HEAD == origin/main confirmed
at task close)
Tests: typecheck PASS; hardening PASS (incl. checkPhase8B01CloseoutIntegrity);
focused 8B.0.1 matrix 22 passed / 1 env-conditional skip (exact CI
selection); full focused matrix 110 passed / 1 skip (dirty tree) and
112 passed / 1 skip (clean tree, isolated checkout); full Playwright
633 passed / 1 env-conditional skip (634 total; 611 baseline + 23 new);
owner provenance 91; AI regressions 98; agent-state 32; campaign:synthetic
27; agent:check PASS at continuity commit (benign CHECKPOINT_ADVANCE
warning only); git diff --check clean; secret-shape scan clean.
Exact CI: run `31857751099` at `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`
PASS (dedicated 8B.0.1 matrix step and Agent-state check verified
individually); final exact CI run at the docs closure commit recorded live.
Artifacts (all private, owner-only; not committed): fresh v2 acceptance
artifact `session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`
(VERIFIED_EXACT_BASE, replay PASS; re-verified VERIFIED_SOURCE_EQUIVALENT_
DESCENDANT after docs closure); acceptance plan
`adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`;
acceptance result
`adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`.
New sourceBundleDigest: `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`;
contractDigest unchanged: `sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`.
Canonical catalog before/after: `sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
still `export const SELFDEV_ADOPTED_CASES = [];`.
Known issues: none open. One additional finding was found and fixed during
this task (sandbox loader lock wedge, ADDITIONAL_PHASE_8B_0_1_FINDING) and
one environment-conditional test (owner-chown) runs only where chown is
permitted.
Recommended next task: Phase 8B.1 — Owner-Gated Canonical Promotion, if and
when separately authorized by the owner. NOT_STARTED. Do not begin it as
part of this task.

## Defect-Repro Ledger (M1)

All four reproduced at runtime against pre-fix source at
fca4002ccb4869e5b9932b70f25e5df8e67d1da6 using the isolated harness at
/tmp/phase8b01-repro/ (temp HOME / temp git repos / injected private roots;
never real $HOME; read-only against the real repository). Defect A cases ran
in fresh subprocesses so the module-load-time sandbox-base constant resolved
per case; B/C/D ran in one process with a fixed temp HOME.

DEFECT A: PRE-FIX TRUE_POSITIVE (runtime, two sub-cases)
- A1 base symlink: `~/.nightwatch/selfdev-sandboxes -> <external dir>` (0755).
  Pre-fix createSandboxMirror ran mkdirSync(recursive) → chmodSync(base,0700)
  → lstat. Result: external target mode mutated 755 → 700 by chmod BEFORE the
  lstat rejection; then threw SELFDEV_SANDBOX_BASE_UNSAFE. chmod followed the
  symlink; mutation-before-validation proven.
- A2 private-parent symlink: `~/.nightwatch -> <external dir>`. Pre-fix
  mkdirSync(recursive) followed the link and created selfdev-sandboxes inside
  the external target; chmod + mkdtemp + full mirror copy all succeeded there;
  createSandboxMirror returned SUCCESS; sandbox root realpath was inside the
  external target; external target mutated. Full sandbox escape without
  rejection.

DEFECT B: PRE-FIX TRUE_POSITIVE (runtime)
- Legitimate plan (planner-generated, real synthetic session) validated.
- strategyClass replaced with 'FUTURE_UNKNOWN_STRATEGY'; planId recomputed
  with planIdFor; validateAdoptionPlan ACCEPTED the forged plan.
- Real verified sandbox result; strategyClass replaced with
  'FUTURE_UNKNOWN_STRATEGY'; resultId recomputed with resultIdFor;
  validateAdoptionSandboxResult ACCEPTED the forged result.

DEFECT C: PRE-FIX TRUE_POSITIVE (runtime)
- Real verified result (all probes PASS); nonOverreachResult replaced with
  'NOT_RUN'; resultId recomputed with resultIdFor; validateAdoptionSandboxResult
  ACCEPTED the "verified without non-overreach proof" tuple.

DEFECT D: PRE-FIX TRUE_POSITIVE (runtime)
- Pre-write failure (PLAN_STALE): sandboxSourceWrites = 0 — correct.
- Post-write failure: valid plan; executor run with a deliberately broken
  nodeModulesAnchorPath so loadSandboxModules failed AFTER the single
  successful sandbox target write (SANDBOX_MODULE_LOAD_FAILED is only
  reachable after write + exactly-one-changed-file diff check + postimage
  digest check). Result reported sandboxSourceWrites = 0 despite one write
  having provably happened. cleanupStatus PASS.
