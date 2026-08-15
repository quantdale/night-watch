# Nightwatch Phase 8B.0.1 — Sandbox Promotion-Readiness Closeout

Task ID: phase-8b-0-1-sandbox-promotion-readiness-closeout
Phase: 8B.0.1 — Sandbox Promotion-Readiness Closeout
Status: IN_PROGRESS
Starting SHA: fca4002ccb4869e5b9932b70f25e5df8e67d1da6
Authorized by: OWNER (explicit task authorization; goal-mode prompt)

## Frozen intent (do not change)

Phase 8B.0.1 is a narrow integrity closeout over the Phase 8B sandbox-only
adoption architecture. It closes exactly four confirmed promotion-readiness
defects and proves, with a fresh private sandbox-only acceptance, that the
system is a trustworthy prerequisite for a SEPARATELY AUTHORIZED Phase 8B.1
design review.

Four defects, all confirmed in current source at the starting SHA:

- DEFECT A — CONFIRMED_SANDBOX_BASE_PREVALIDATION_GAP:
  `sandboxMirror.ts` performs `mkdirSync(base, recursive)` then
  `chmodSync(base, 0700)` before `lstat`/`assertNoSymlink(base)`. chmod
  follows symlinks, so a preexisting sandbox-base symlink (or a symlinked
  private parent, which `mkdirSync(recursive)` also follows) can mutate the
  symlink target before rejection. Fix: a single internal
  `ensurePrivateSandboxBase()` routine that validates the pathname chain
  (lstat-first, symlink fail-closed, non-directory fail-closed, owner
  validated where uid is available, unsafe permission state fail-closed)
  BEFORE any mutation; creates missing directories only beneath a validated
  parent with mode 0700; revalidates immediately after creation; never chmods
  an unvalidated pathname; never chmods $HOME or arbitrary ancestors.

- DEFECT B — CONFIRMED_ADOPTION_STRATEGY_BINDING_GAP:
  `validation.ts` accepts any nonempty string for `plan.strategyClass` /
  `result.strategyClass`. Fix: require the exact constant
  `SELFDEV_ADOPTION_STRATEGY_CLASS` at runtime (TypeScript literal type as
  well); require `plan.strategyClass === plan.adoptedCase.strategyClass`;
  reject unknown strategies even when planId/resultId are recomputed.
  Strategy version stays bound through the existing contract manifest
  (adoptionStrategyVersion/adoptionStrategyClass in SELFDEV_CONTRACT_MANIFEST
  → contractDigest → plan/result digests); no cosmetic new field is added.

- DEFECT C — CONFIRMED_SANDBOX_RESULT_INVARIANT_GAP:
  a claimed `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` result is accepted
  with `nonOverreachResult = NOT_RUN` (validator rejects only FAIL; executor
  rejects only FAIL). Fix: a verified result requires EXACTLY all five probes
  `PASS` (preAdoption, postEquivalent, postVariantCoverage, nonOverreach,
  unsafeRegression); NOT_RUN and FAIL are invalid for a verified result;
  executor must not produce a verified result when no valid non-overreach
  probe exists (`NON_OVERREACH_PROBE_UNAVAILABLE`) or when the probe ran and
  failed (`NON_OVERREACH_REGRESSION`).

- DEFECT D — CONFIRMED_SANDBOX_FAILURE_WRITE_ACCOUNTING_GAP:
  the executor failure builder hardcodes `sandboxSourceWrites = 0`, so
  failures after a successful `writeSandboxTarget` report false provenance.
  Fix: track the actual executed write (`0` before the single allowed write,
  `1` after); every result carries the true value; validation bounds
  `sandboxSourceWrites` to integer 0..1; success still requires exactly 1;
  canonicalSourceWrites/runtimeGitWrites/externalCalls remain ALWAYS 0.

## Hard boundaries

- Canonical promotion is NOT implemented. The canonical generated catalog
  stays byte-identical and empty (`export const SELFDEV_ADOPTED_CASES = [];`).
- No runtime Git commit/push authority is added.
- No public `--sandbox-root`/path/root CLI option is added.
- No new owner policy capability (`SELF_DEVELOPMENT_CANONICAL_ADOPTION` is
  NOT added; canonical adoption keeps failing closed).
- No Phase 8B.1 code, design, or task directory is created.
- No AI/model/product/database/infrastructure/publication work.
- Historical Phase 8B evidence (session/plan/result IDs, digests, CI runs) is
  preserved and never rewritten.
- No migration/overwrite/delete of the historical private plan/result/session
  artifacts (session:sha256:27dbbd7f..., adoption-plan:sha256:70e2c7f1...,
  adoption-sandbox-result:sha256:de4a2de1...).

## Deliverables

1. Pre-fix TRUE_POSITIVE reproduction evidence for all four defects
   (synthetic, isolated HOME/roots; never real $HOME state).
2. The four fixes above with focused tests:
   - new `tests/unit/selfDevSandboxConfinement.test.ts` (base pre-validation
     matrix: missing safe base, valid existing base, base symlink, private
     parent symlink, base regular file, base mode too open, wrong owner,
     sandbox instance validation, path escape, cleanup outside base);
   - strategy matrix in `selfDevAdoptionPlan.test.ts` /
     `selfDevAdoptionSandbox.test.ts` (valid/unknown/recomputed-ID/mismatch);
   - verified-result invariant matrix (each probe field NOT_RUN and FAIL,
     recomputed resultId, must fail);
   - failure-accounting tests (failure before write → 0; post-write failure
     via a safe seam → 1; success → 1; impossible counter tuples rejected).
3. Hardening additions (confinement ordering, strategy constant binding,
   verified-probe invariant, write-accounting truthfulness) and a dedicated
   CI step "Phase 8B.0.1 sandbox promotion-readiness closeout matrix".
4. Substantive checkpoint commit + fast-forward push + exact hardening CI
   PASS (dedicated step executed and green, verified individually).
5. Fresh sandbox-only acceptance (selfdev:synthetic → inspect → plan → run
   --confirm SANDBOX_ONLY) with all five probes PASS, sandboxSourceWrites=1,
   canonical catalog byte-identical empty, canonical worktree clean.
6. Docs closure (docs + task files) as a separate documentation checkpoint,
   pushed fast-forward; final exact CI PASS; Phase 8B.1 stays NOT_STARTED /
   NOT_AUTHORIZED.
7. Final report per the task's 102-field format with verdict
   PHASE_8B_0_1_COMPLETE.

## Success criteria

All acceptance criteria of the task (filesystem, strategy, metamorphic
result, effect accounting, regression, validation, remote/real acceptance,
safety and privacy vectors) hold. Phase 8B.0.1 = COMPLETE; Phase 8B.1 =
NOT_STARTED / READY_FOR_SEPARATE_DESIGN_REVIEW (still NOT_AUTHORIZED).

## Stop conditions

Stop (do not improvise) if: starting SHA mismatch; dirty worktree; origin/main
advances; confinement cannot be proven without canonical source mutation;
safe base establishment needs broader filesystem authority; strategy binding
breaks legitimate current semantics unexpectedly; no bounded non-overreach
probe exists in the registry; write accounting requires broad executor
redesign; Phase 8B.1 appears necessary; product/network/database/infra work
appears necessary; CI reveals a materially different architectural defect.
Never weaken a check to continue.
