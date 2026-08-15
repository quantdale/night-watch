# Plan — Phase 8B.0.1 Sandbox Promotion-Readiness Closeout

## Purpose

Close the four Phase 8B promotion-readiness integrity defects discovered
after Phase 8B's sandbox-only acceptance: (A) sandbox-base pre-validation
(symlink-following chmod before lstat rejection), (B) adoption-strategy
binding (generic string strategy accepted), (C) verified-result metamorphic
completeness (non-overreach NOT_RUN accepted as verified), (D) truthful
failure-path sandbox-write accounting (post-write failures report 0 writes).
Then run a fresh private sandbox-only acceptance proving the system is ready
for a SEPARATELY AUTHORIZED Phase 8B.1 design review.

## Starting State

- Canonical Git root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Remote: `origin` → `https://github.com/quantdale/night-watch.git`, branch `main`.
- STARTING_SHA: `fca4002ccb4869e5b9932b70f25e5df8e67d1da6` (== local HEAD == origin/main at task start, clean worktree).
- Phase statuses: Phase 6 FROZEN_BY_OWNER; Phase 7/7B COMPLETE; Phase 8
  IN_PROGRESS; Phase 8A/8A.1/8A.1.1 COMPLETE; Phase 8B COMPLETE_SANDBOX_ONLY
  (historical acceptance preserved: session
  `session:sha256:27dbbd7f94e360af7e9fc564e9cdabf45d3d9ae5c67e84eccc676f78f047ac46`,
  plan `adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`,
  result
  `adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`);
  Phase 8B.1 NOT_STARTED / NOT_AUTHORIZED.
- All four defects confirmed in source at STARTING_SHA and reproduced at
  runtime pre-fix (see STATE.md Defect-Repro Ledger).

## Scope

- Fix the four defects in `src/core/selfDevSandbox/*` (+ `src/core/selfDev/adoptedCases.ts`
  type alias); add focused tests (new `selfDevSandboxConfinement.test.ts`,
  additions to `selfDevAdoptionPlan.test.ts` / `selfDevAdoptionSandbox.test.ts`);
  extend `bin/hardening-check.mjs` and `.github/workflows/hardening.yml` with a
  dedicated Phase 8B.0.1 matrix step; run full local validation + isolated
  clean-checkout validation; commit a substantive checkpoint and a
  documentation closure checkpoint; push fast-forward; verify exact CI; run a
  fresh private sandbox-only acceptance; issue the final report.

## Non-Goals

- NO canonical promotion (Phase 8B.1) — not designed, not scaffolded, not
  authorized. Canonical catalog stays empty and byte-identical.
- NO runtime Git commit/push authority; NO new owner-policy capability
  (SELF_DEVELOPMENT_CANONICAL_ADOPTION is NOT added).
- NO public `--sandbox-root`/path/root CLI option; CLI stays inspect/plan/run
  with fixed SANDBOX_ONLY confirmation.
- NO migration/overwrite/delete of historical Phase 8B private artifacts.
- NO AI/model/product/database/infrastructure/publication work.
- NO broad Phase 8 re-audit or architecture rediscovery.

## Safety Constraints

- Fail closed everywhere: unknown strategyClass rejected regardless of
  recomputed IDs; verified results require all five metamorphic probes PASS;
  sandboxSourceWrites bounded 0..1 with canonicalSourceWrites /
  runtimeGitWrites / externalCalls ALWAYS 0; sandbox-base pathname chain
  validated before any mutation (no chmod/mkdir/mkdtemp/write/cleanup on
  unvalidated pathnames); cleanup confined to the validated base.
- All defect reproductions run in isolated temp HOME/roots — never real
  $HOME state.
- Documented residual race assumption: a malicious machine owner who can
  rewrite the filesystem and source/verifier concurrently is OUT of threat
  model; protection covers preexisting symlinks, ordinary path confusion,
  accidental symlink configuration, and symlink-target mutation before
  detection.
- No test or reproduction touches canonical source; synthetic repos are
  built by copying authoritative files.

## Architecture / Approach

- Defect A: one internal `ensurePrivateSandboxBase()` routine in
  `sandboxMirror.ts` — component-wise pathname-chain validation
  (lstat-first, symlink/non-directory fail closed, missing directories
  created only beneath validated parents with 0700 and immediately
  revalidated); base fails closed on open mode/wrong owner (no repair);
  private parent reuses the established private-artifact tightening
  convention; instance realpath-containment + disjointness checks
  (repo/workspace/findings); cleanup requires strict child containment.
  Test-only module-level base override (not exported from the boundary
  index, not reachable from the CLI).
- Defect B: runtime equality against `SELFDEV_ADOPTION_STRATEGY_CLASS` in
  plan and result validation (before identity checks), explicit
  plan↔adoptedCase cross-binding, literal `SelfDevAdoptionStrategyClass`
  type (type-only import, no runtime cycle). Strategy version stays bound
  through the existing contract manifest → contractDigest (no cosmetic
  field).
- Defect C: verified result requires all five probes exactly PASS;
  executor maps NOT_RUN → `NON_OVERREACH_PROBE_UNAVAILABLE`, FAIL →
  `NON_OVERREACH_REGRESSION`; other probe NOT_RUN/FAIL →
  POST_ADOPTION_STILL_PASS.
- Defect D: closure-tracked `sandboxSourceWrites` (0 → 1 immediately after
  the single successful target write); failure and success records carry the
  actual value; validation bounds 0..1.
- Validation: typecheck, hardening, focused 8B.0.1 matrix, Phase 8B + 8A/
  8A.1/8A.1.1 regressions, owner provenance, AI regressions, agent-state,
  campaign:synthetic, agent:check, git diff --check, full Playwright,
  isolated full-history checkout, privacy/secret scan, then commit/push/CI,
  fresh sandbox-only acceptance, docs closure.

## Milestones

- M0 — Git bootstrap + continuity read + task scaffolding. COMPLETE.
- M1 — Pre-fix TRUE_POSITIVE reproduction of all four defects. COMPLETE.
- M2 — Defect A fix (sandbox base pre-validation). COMPLETE.
- M3 — Defect B fix (strategy binding). COMPLETE.
- M4 — Defect C fix (verified-result probe invariant). COMPLETE.
- M5 — Defect D fix (truthful write accounting). COMPLETE.
- M6 — Focused tests (confinement matrix, strategy, invariants, accounting).
  COMPLETE.
- M7 — Hardening `checkPhase8B01CloseoutIntegrity` + dedicated CI step.
  COMPLETE.
- M8 — Full local validation. IN PROGRESS.
- M9 — Isolated full-history clean-checkout validation. PENDING.
- M10 — Substantive checkpoint commit + push + exact CI. PENDING.
- M11 — Fresh private sandbox-only acceptance. PENDING.
- M12 — Docs closure + docs checkpoint + final CI. PENDING.
- M13 — Final report (102-field format), verdict PHASE_8B_0_1_COMPLETE.
  PENDING.

## Validation Strategy

- Focused: `selfDevSandboxConfinement.test.ts` (matrix A-J),
  `selfDevAdoptionPlan.test.ts` (+2 strategy), `selfDevAdoptionSandbox.test.ts`
  (+8 strategy/invariant/accounting/executor); dedicated CI step
  `npx playwright test tests/unit/selfDevSandboxConfinement.test.ts
  tests/unit/selfDevAdoptionPlan.test.ts tests/unit/selfDevAdoptionSandbox.test.ts
  -g "8B\.0\.1" --project=nightwatch --workers=1`.
- Regression: full Phase 8A/8A.1/8A.1.1/8B matrix, owner provenance, AI
  regressions, agent-state, campaign:synthetic, agent:check, git diff --check,
  full Playwright (report actual pass/skip counts), isolated full-history
  checkout, secret-shape scan.
- Remote: exact hardening CI (completed/success; dedicated 8B.0.1 step
  verified individually; agent-state check green); HEAD == origin/main after
  each push; fresh acceptance proves all five probes PASS,
  sandboxSourceWrites=1, canonical catalog byte-identical empty.

## Decision Log

- D1: sandbox base remains code-defined `SELFDEV_SANDBOX_ROOT_BASE`
  (`$HOME/.nightwatch/selfdev-sandboxes`); tests inject via module-level
  `setSandboxBaseOverrideForTests` (not exported from boundary index).
- D2: permission policy — base fails closed on open mode/wrong owner (no
  repair); private parent reuses the established private-artifact convention
  (validated non-symlink owner-matched directory tightened to 0700, never
  loosened); $HOME/ancestors never chmodded or created.
- D3: pathname chain validated component-wise from the filesystem root
  (mirrors privateArtifacts `assertNoSymlinkComponents`); first missing
  component must be the exact directory permitted for creation.
- D4: cleanup requires realpath strict-child containment + lstat before
  rmSync; any doubt → FAIL, no deletion (residual directory preferred).
- D5: strategy version NOT added to plan/result records — already bound via
  contract manifest (adoptionStrategyVersion/adoptionStrategyClass →
  contractDigest → plan/result digests); only strategy CLASS becomes a strict
  runtime constant.
- D6: non-overreach semantics: NOT_RUN → NON_OVERREACH_PROBE_UNAVAILABLE;
  FAIL → NON_OVERREACH_REGRESSION; other probes NOT_RUN/FAIL →
  POST_ADOPTION_STILL_PASS.
- D7: write accounting is a closure variable set to 1 immediately after the
  single successful writeSandboxTarget; no hardcoded counters remain.
- D8: executor outer catch reports cleanupStatus PASS when no mirror was
  created; createSandboxMirror cleans up its own partially copied mirror.
- D9: end-to-end NON_OVERREACH_PROBE_UNAVAILABLE is not forcible with the
  current deterministic registry (it always yields a bounded probe — the
  historical acceptance property); covered by validation semantics +
  hardening source assertion + the REGRESSION end-to-end test.
- D10: checkpoint sequencing — the substantive commit carries `(none yet)`
  continuity anchors (agent:check is red by construction at the substantive
  commit, since a commit cannot reference itself); a docs-only continuity
  commit immediately records the anchors; A+B pushed in one fast-forward so
  no red CI run exists; the green run at B is the exact-substantive-content
  CI evidence.

## Discoveries

- ADDITIONAL_PHASE_8B_0_1_FINDING (fixed): `sandboxLoader.ts` set
  `loadInFlight = true` before `requireFn('typescript')`, which can throw
  BEFORE the try/finally — permanently wedging the serial-execution lock for
  every later sandbox load. Found by the new post-write-failure test seam
  (bad anchor wedged all subsequent full runs). Fixed with a whole-body
  try/finally.
- The failure-result builder records all probe fields as NOT_RUN for failure
  records (allowed by spec §34 "may have PASS/FAIL/NOT_RUN as appropriate");
  the failureClass is the discriminator, not the probe fields.
- Probe SELECTION (findNonOverreachActionIds) uses the canonical in-process
  registry while probe EVALUATION uses the mirrored registry — by design; the
  registry-surgery tests prove the evaluator genuinely executes the modified
  mirror.

## Deferred Work

- Phase 8B.1 — Owner-Gated Canonical Promotion: NOT_STARTED / NOT_AUTHORIZED;
  no task directory may be created during this task.
- Full executable owner-chown regression (test G) is environment-conditional
  (requires root to chown); runs as a skip on this machine.

## Completion Criteria

All acceptance criteria of the task (filesystem, strategy, metamorphic
result, effect accounting, regression, validation, remote/real acceptance,
safety and privacy vectors): focused tests PASS; existing regressions PASS;
typecheck/hardening/campaign/agent:check/git diff --check/Playwright PASS;
isolated checkout PASS; substantive + docs checkpoints pushed with
HEAD == origin/main; exact CI green with the dedicated 8B.0.1 step verified
individually; fresh acceptance: all five probes PASS, sandboxSourceWrites=1,
canonical catalog byte-identical empty, clean worktree; Phase 8B.0.1 =
COMPLETE; Phase 8B.1 = NOT_STARTED / NOT_AUTHORIZED
(READY_FOR_SEPARATE_DESIGN_REVIEW); final report verdict
PHASE_8B_0_1_COMPLETE.
