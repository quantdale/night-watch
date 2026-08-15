# Nightwatch Phase 8B.0.1 — Sandbox Promotion-Readiness Closeout — Report

Task ID: phase-8b-0-1-sandbox-promotion-readiness-closeout
Phase: 8B.0.1 — Sandbox Promotion-Readiness Closeout
Status: COMPLETE

## Report (task §91 format)

1. **Starting SHA**: `fca4002ccb4869e5b9932b70f25e5df8e67d1da6` (verified:
   clean worktree, branch main, local HEAD == origin/main at task start).
2. **Phase 8B historical status**: `COMPLETE_SANDBOX_ONLY` — historically
   accepted; evidence preserved (session
   `session:sha256:27dbbd7f94e360af7e9fc564e9cdabf45d3d9ae5c67e84eccc676f78f047ac46`,
   plan `adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`,
   result
   `adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`,
   CI runs 31853612222 / 31854455364). NOT regressed to FAILED.
3. **Phase 8B.0.1 status**: `COMPLETE`.
4. **Phase 8B.1 status**: `NOT_STARTED` / `NOT_AUTHORIZED` —
   `READY_FOR_SEPARATE_DESIGN_REVIEW`. Not started by this task.
5. **Defect A pre-fix reproduction**: `TRUE_POSITIVE` (runtime, isolated
   HOME): (A1) preexisting base symlink → pre-fix `chmodSync(base)` followed
   the link and mutated the external target mode 755→700 BEFORE the lstat
   rejection (`SELFDEV_SANDBOX_BASE_UNSAFE`); (A2) symlinked `.nightwatch`
   parent → pre-fix `mkdirSync(recursive)` followed the link, the full
   mirror (chmod + mkdtemp + copy) was created inside the external target,
   and `createSandboxMirror` returned SUCCESS with no error.
6. **Defect B pre-fix reproduction**: `TRUE_POSITIVE` (runtime): a plan with
   `strategyClass: 'FUTURE_UNKNOWN_STRATEGY'` and a recomputed `planIdFor`
   passed `validateAdoptionPlan`; a verified result with the same unknown
   strategy and a recomputed `resultIdFor` passed
   `validateAdoptionSandboxResult`. Legitimate plan/result validated first.
7. **Defect C pre-fix reproduction**: `TRUE_POSITIVE` (runtime): a real
   verified result with `nonOverreachResult` replaced by `NOT_RUN` and a
   recomputed resultId passed `validateAdoptionSandboxResult`
   ("verified without non-overreach proof" accepted).
8. **Defect D pre-fix reproduction**: `TRUE_POSITIVE` (runtime): a failure
   after one successful sandbox target write (post-write module-load
   failure, `SANDBOX_MODULE_LOAD_FAILED` — only reachable after write +
   exactly-one-changed-file + postimage-digest checks) reported
   `sandboxSourceWrites: 0`; the pre-write failure (`PLAN_STALE`) correctly
   reported 0.
9. **Validated implementation SHA**: `c4537ab5e3e96859c7c472ac47c3143a15b20c26`.
10. **Substantive checkpoint SHA**: `c4537ab5e3e96859c7c472ac47c3143a15b20c26`.
11. **Documentation checkpoint SHA**: `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`
    (continuity commit recording the anchors; final docs closure commit C
    recorded in STATE.md).
12. **Final live SHA**: (final docs closure commit — see STATE.md).
13. **origin/main SHA**: equal to final live SHA (fast-forward verified
    after each push).
14. **Sandbox private-root/base contract**: code-defined
    `$HOME/.nightwatch/selfdev-sandboxes` (`SELFDEV_SANDBOX_ROOT_BASE`);
    production runtime accepts no caller/CLI-supplied base; tests use a
    module-level override not exported from the boundary index; no
    `--sandbox-root` option exists (hardening-enforced).
15. **Existing-parent validation semantics**: lstat-first; symlink and
    non-directory parents fail closed (`SELFDEV_SANDBOX_BASE_SYMLINK` /
    `_NOT_DIRECTORY`); owner must match the effective uid; the private
    parent reuses the established private-artifact convention — a validated
    non-symlink owner-matched directory whose mode is too open is TIGHTENED
    to 0700 (never loosened), then revalidated.
16. **Missing-base creation semantics**: created only beneath a previously
    validated parent, non-recursively, mode 0700 at creation time, then
    immediately re-lstat'd and revalidated (owner + private mode); a missing
    ANCESTOR (`SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING`) or missing `$HOME`
    fails closed — nothing is created above the permitted directory.
17. **Symlink-base behavior**: rejected BEFORE chmod/mkdir-beneath/mkdtemp/
    file creation/cleanup with `SELFDEV_SANDBOX_BASE_SYMLINK`; symlink
    target mode and contents proven unchanged (test matrix C).
18. **Symlink-parent behavior**: rejected before sandbox-base creation; the
    target is untouched (test matrix D).
19. **Owner validation behavior**: base owner must equal `process.getuid`
    where uid semantics exist; wrong owner fails closed
    (`SELFDEV_SANDBOX_BASE_UNSAFE_OWNER`) — end-to-end test G runs when the
    environment permits chown (skipped otherwise).
20. **Permission validation behavior**: the base fails closed on
    group/world-accessible mode (`_PERMISSIONS_UNSAFE`, `(mode & 0o077) !==
    0`) with NO chmod repair; directories created by Nightwatch get 0700 at
    creation time only.
21. **Realpath containment behavior**: instances are `realpathSync`-
    contained strictly beneath the validated base realpath and must be a
    non-symlink private directory; instance must not be inside/equal to the
    canonical repository, the parent workspace, or the private findings
    root (forged in-repo base rejected — test I).
22. **Cleanup containment behavior**: cleanup requires realpath strict-child
    containment beneath the validated base + lstat (directory, non-symlink)
    before `rmSync`; the base itself, outside paths, and symlink roots are
    refused with `FAIL` and nothing is deleted (test J); copy failures clean
    up the partial mirror under the same rule.
23. **Residual filesystem race threat model**: protection covers preexisting
    symlinked base/parent, ordinary path confusion, accidental symlink
    configuration, and symlink-target mutation before detection; a malicious
    machine owner who can rewrite the filesystem and source/verifier
    concurrently remains OUT of the threat model (documented, unchanged from
    the established Nightwatch residual model). No native addons or new
    dependencies were introduced.
24. **Plan strategy required value**: `plan.strategyClass ===
    SELFDEV_ADOPTION_STRATEGY_CLASS` (`DECLARATIVE_REGRESSION_CATALOG_PROMOTION`),
    enforced at runtime before any identity check (`PLAN_STRATEGY_INVALID`
    otherwise).
25. **Plan/adopted-case strategy cross-binding**: `plan.strategyClass ===
    plan.adoptedCase.strategyClass` (`PLAN_STRATEGY_MISMATCH` gate);
    adopted-case validation itself requires the exact constant.
26. **Result strategy required value**: `result.strategyClass ===
    SELFDEV_ADOPTION_STRATEGY_CLASS` (`RESULT_STRATEGY_INVALID` otherwise).
27. **Unknown-strategy forged-plan result**: rejected —
    `SELFDEV_SANDBOX_PLAN_STRATEGY_INVALID` even with a recomputed planId.
28. **Unknown-strategy forged-result result**: rejected —
    `SELFDEV_SANDBOX_RESULT_STRATEGY_INVALID` even with a recomputed
    resultId.
29. **Strategy version decision**: `nightwatch.selfdev-adoption-strategy.v1`
    preserved; NOT added to plan/result records — it is already bound
    through the contract manifest (`adoptionStrategyVersion` +
    `adoptionStrategyClass` in `SELFDEV_CONTRACT_MANIFEST`) into
    `contractDigest`, which plans/results carry and TOCTOU-revalidate. Class
    and version remain distinct; unknown strategyClass fails independently
    of any source hash.
30. **Verified-result probe invariant**: a claimed
    `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` result requires EXACTLY
    `preAdoptionResult === 'PASS'`, `postEquivalentResult === 'PASS'`,
    `postVariantCoverageResult === 'PASS'`, `nonOverreachResult === 'PASS'`,
    `unsafeRegressionResult === 'PASS'`; NOT_RUN and FAIL rejected per field
    even with a recomputed resultId (matrix-tested 5 fields × 2 values).
31. **Non-overreach unavailable behavior**: executor returns
    `NON_OVERREACH_PROBE_UNAVAILABLE` (new failure class) when no bounded
    new-coverage probe exists; never a verified result. End-to-end forcing
    is impossible with the current deterministic registry (it always yields
    a bounded probe — the historical acceptance property); the class is
    covered by validation semantics + hardening source assertion + the
    end-to-end REGRESSION test proving the executor gate.
32. **Non-overreach failure behavior**: executor returns
    `NON_OVERREACH_REGRESSION` when a constructed probe ran and failed;
    proven end-to-end via registry surgery (bogus-coverage continuation
    action → sandbox evaluator rejects the probe candidate → FAIL).
33. **Failure-before-write accounting**: `sandboxSourceWrites = 0` (proven:
    `PLAN_STALE` failure).
34. **Failure-after-write accounting**: `sandboxSourceWrites = 1` (proven:
    post-write `SANDBOX_MODULE_LOAD_FAILED` reports 1; also
    `NON_OVERREACH_REGRESSION`/`NON_OVERREACH_PROBE_UNAVAILABLE`-shaped
    failures report 1).
35. **Successful write accounting**: exactly 1 (fresh acceptance).
36. **Maximum sandbox write count**: 1 — validation rejects any integer
    outside 0..1 (`RESULT_SANDBOX_WRITES_INVALID`; -1, 2, 1.5, '1' all
    rejected with recomputed resultId).
37. **Canonical source write authority**: NONE — `canonicalSourceWrites`
    always 0, enforced in plan/result validation and proven by the fresh
    acceptance (byte-identical catalog + clean `git status`).
38. **Runtime Git write authority**: NONE — `runtimeGitWrites` always 0; no
    Git verb in the sandbox boundary (hardening-enforced); development
    checkpoints pushed by the session per the established pattern.
39. **Product authority**: NONE (zero DEV/NEXT/production contacts).
40. **AI/model authority**: NONE (zero AI/model calls; Phase 7B boundaries
    untouched).
41. **Database authority**: NONE (zero database queries).
42. **Infrastructure authority**: NONE (zero infrastructure queries; Phase 6
    remains frozen).
43. **Publication authority**: NONE (zero external publication; plan/result
    `publication: 'PROHIBITED'`).
44. **Focused filesystem tests**: `selfDevSandboxConfinement.test.ts` —
    13 tests (matrix A-J + production-constant assertion): 12 passed /
    1 env-conditional skip (owner-chown test G needs root).
45. **Focused strategy tests**: plan strict binding (3 unknown/bounded-wrong
    constants + recomputed planId), plan/adoptedCase cross-binding,
    result strict binding (3 constants + recomputed resultId) — all PASS.
46. **Focused result-invariant tests**: verified-invariant matrix (all 5
    probe fields × NOT_RUN/FAIL + recomputed resultId) — all PASS;
    UNAVAILABLE/REGRESSION class semantics — PASS.
47. **Focused failure-accounting tests**: pre-write failure 0; post-write
    failure 1; impossible counter tuples rejected; truthful post-write
    failure record validates — all PASS.
48. **Existing Phase 8B regression result**: PASS — full Phase 8B suite
    green (catalog/plan/sandbox/CLI/ownerScope + the 7/7 CLI tests at a
    clean tree; the two CLI tests only fail mid-implementation against a
    deliberately dirty real repo, which is the CLI's fail-closed design).
49. **Phase 8A/8A.1/8A.1.1 regression result**: PASS — focused matrix
    110 passed / 1 skip locally, 112 passed / 1 skip in the isolated
    checkout; all pre-existing tests unmodified.
50. **Owner provenance result**: PASS — 91/91.
51. **AI regression result**: PASS — 98/98 (aiReview, aiReviewLoopback,
    aiLocalCanary, aiOwnerReview).
52. **Agent-state result**: PASS — 32/32 agent-state matrix; `agent:check`
    PASS at the continuity commit (1 benign CHECKPOINT_ADVANCE warning,
    approved paths only).
53. **Synthetic campaign result**: PASS — 27/27 (local + isolated).
54. **Full Playwright result**: 633 passed / 1 environment-conditional skip
    (634 total; 611 Phase 8B baseline + 23 new tests) at the substantive
    commit.
55. **TypeScript result**: PASS (`tsc --noEmit`, local + isolated).
56. **Hardening result**: PASS — including `checkPhase8B01CloseoutIntegrity`
    (local + isolated).
57. **agent:check result**: PASS at the continuity commit (the substantive
    commit itself is red on the six anchor fields by construction — a
    commit cannot reference itself; the docs-only continuity commit records
    the anchors, mirroring Phase 8B's pattern).
58. **git diff --check result**: clean (local + isolated).
59. **Isolated checkout result**: PASS — full-history clean clone as a
    sibling of the Alphaus repos: typecheck, hardening, focused matrix
    112/1, owner provenance 91, agent-state 32, campaign 27, diff --check.
60. **Privacy/secret scan**: PASS — no credentials/tokens/cookies/customer
    values in any diff; acceptance artifacts are owner-only private state,
    never committed; task docs carry sanitized IDs/digests only.
61. **New sourceBundleDigest**: `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`
    (changed from Phase 8B's `ca503583...` — required, authoritative source
    changed; the fresh session is bound to it).
62. **Contract digest decision**: UNCHANGED by design — the closeout is
    source-provenance hardening of the sandbox boundary; the declared
    deterministic evaluator contract manifest is untouched (no new bound
    fields, no semantic changes to the evaluation contract). Strategy
    version/class binding was already present.
63. **New/current contractDigest**: `sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`
    (identical pre/post acceptance; differs from the sandbox postimage
    digest `8d115602...`).
64. **Fresh acceptance artifact ID**:
    `session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`.
65. **Fresh acceptance baseline SHA**: `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`.
66. **Fresh acceptance trust at base**: `VERIFIED_EXACT_BASE`; replay `PASS`;
    eligible `true`; 1 pass / 1 duplicate / 1 rejected candidate.
67. **Fresh acceptance candidate ID**:
    `candidate:0a8626f4e7e21ecf167462b7e5c12985f751e88f107fc5d76b091daa2349e74d`
    (exactly one candidate — selected deterministically by the artifact).
68. **Fresh acceptance plan ID**:
    `adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`.
69. **Fresh acceptance result ID**:
    `adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`.
70. **Fresh plan strategy**:
    `DECLARATIVE_REGRESSION_CATALOG_PROMOTION` (exact constant).
71. **Fresh acceptance pre-source digest**:
    `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`.
72. **Fresh acceptance post-sandbox source digest**:
    `sha256:11737c1bf8ed1d741f48f845ae83e698e11de9f15e73600a70151d9a63e3530a`
    (sandbox postimage only — canonical unchanged).
73. **Fresh acceptance pre-contract digest**:
    `sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`.
74. **Fresh acceptance post-sandbox contract digest**:
    `sha256:8d1156021ddca3840f7f78eaa21f965a7d2b4d81451224daa839142d0ae0d69f`.
75. **preAdoptionResult**: `PASS`.
76. **postEquivalentResult**: `PASS`.
77. **postVariantCoverageResult**: `PASS`.
78. **nonOverreachResult**: `PASS`.
79. **unsafeRegressionResult**: `PASS`.
80. **fresh sandboxSourceWrites**: `1`.
81. **fresh canonicalSourceWrites**: `0`.
82. **fresh runtimeGitWrites**: `0`.
83. **fresh externalCalls**: `0`.
84. **fresh cleanupStatus**: `PASS`.
85. **Canonical catalog before/after digest**:
    `sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`
    — byte-identical before and after the acceptance; still
    `export const SELFDEV_ADOPTED_CASES = [];` (empty).
86. **Canonical sourceBundle before/after sandbox run**:
    `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`
    — identical; canonical source untouched by the runtime run.
87. **Residual sandbox directory state**: `$HOME/.nightwatch/selfdev-sandboxes`
    exists, mode 0700, contains ZERO entries after the acceptance (mirror
    cleaned); no residual acceptance sandbox.
88. **Substantive CI run ID**: `31857751099` (exact-content CI — the run at
    the continuity commit `0f64ea6...` whose tree contains the exact
    substantive implementation; A+B pushed in one fast-forward so no red
    run exists at A by construction).
89. **Substantive CI exact SHA**: `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`.
90. **Substantive 8B.0.1 CI step status**: executed and PASSED (verified
    individually, not inferred from overall green).
91. **Final CI run ID**: (final docs closure run — recorded in STATE.md).
92. **Final CI exact SHA**: (final docs closure commit — recorded in
    STATE.md).
93. **Final 8B.0.1 CI step status**: (verified individually at the final
    run — recorded in STATE.md).
94. **Final agent-state CI status**: PASS at the final run (recorded in
    STATE.md).
95. **Push verification**: fast-forward pushes only; `HEAD == origin/main`
    verified via `git fetch` after each push; no force push.
96. **Final worktree status**: clean.
97. **Architecture review**: the sandbox boundary architecture is preserved;
    the four fixes are narrow, in-boundary changes (sandboxMirror,
    validation, types, executor, loader + one type alias in adoptedCases);
    no redesign, no new authority, no new dependencies.
98. **Adversarial review**: pre-fix TRUE_POSITIVE reproductions + post-fix
    rejection evidence for all four defects; forged IDs (plan/result)
    cannot legalize unknown strategies or impossible verified tuples;
    registry-surgery tests prove the evaluator executes the modified mirror;
    impossible counter tuples rejected; the sandbox loader lock wedge
    (additional finding) was found adversarially via the post-write-failure
    seam and fixed.
99. **Additional findings**: `ADDITIONAL_PHASE_8B_0_1_FINDING` — sandbox
    loader serial lock not released when an early anchor/compiler-resolution
    throw occurs before the try/finally (permanently wedging later loads);
    FIXED (whole-body try/finally), with a hardening assertion and the
    post-write-failure test suite covering the path.
100. **Remaining debt**: the environment-conditional owner-chown regression
     (confinement test G) runs only on hosts where chown is permitted;
     end-to-end `NON_OVERREACH_PROBE_UNAVAILABLE` forcing is impossible with
     the current deterministic registry (which always yields a bounded
     probe) — covered by validation semantics + hardening + the REGRESSION
     end-to-end test; `~/.nightwatch` parent tightening is the established
     convention (documented, D-48). Phase 8B.1 remains the sole deferred
     phase.
101. **Final verdict**: `PHASE_8B_0_1_COMPLETE`.
102. **Promotion-readiness status**:
     `PHASE_8B_1_PROMOTION_READINESS: READY_FOR_SEPARATE_DESIGN_REVIEW`
     (Phase 8B.1 NOT_STARTED / NOT_AUTHORIZED — this task did not start it).

## Safety vector (task §89)

DEV contacts: 0 · NEXT contacts: 0 · production contacts: 0 · product
mutations: 0 · database queries: 0 · infrastructure queries: 0 · external AI
calls: 0 · real model calls: 0 · external publication: 0 · canonical runtime
source writes: 0 · runtime Git writes: 0 · Alphaus writes: 0. Fresh
successful acceptance: sandbox source writes exactly 1. Synthetic
post-write failure test: sandbox source writes exactly 1 with failure
status (SANDBOX_MODULE_LOAD_FAILED).

## Privacy vector (task §90)

Zero new real credentials, tokens, cookies, storage state, customer names,
emails, account IDs, payer IDs, billing IDs, costs, invoice values, raw API
bodies, DOM, screenshots, traces, or model output persisted. Only synthetic/
self-development IDs and digests (session/plan/result/candidate IDs, digest
strings) appear in task docs and durable docs. The new private acceptance
plan/result JSON remains owner-only local state under `~/.nightwatch` and
was never committed.

## Changes

See STATE.md "Files Changed" and PLAN.md Decision Log; the substantive
implementation is `c4537ab5e3e96859c7c472ac47c3143a15b20c26` (source, tests,
hardening, CI) with the continuity commit `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9`
and the docs closure commit recorded in STATE.md.

## Deferred items

- Phase 8B.1 — Owner-Gated Canonical Promotion: `NOT_STARTED` /
  `NOT_AUTHORIZED`; now `READY_FOR_SEPARATE_DESIGN_REVIEW`. A future
  separately authorized task should consume this phase's fresh plan/result/
  session IDs and digests rather than re-deriving adoption semantics.
