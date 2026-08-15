# Phase 8B.1.0 — Final Report (durable handoff)

Status: COMPLETE
Task ID: phase-8b-1-0-catalog-aware-proposal-compatibility

## Outcome

The Phase 8B.1 structural compatibility blocker is removed on BOTH sides:
production now has a bounded deterministic proposal portfolio with
catalog-aware novelty selection and a valid EXHAUSTED terminal state; the
historical test suites now use explicit adopted-catalog baselines
(EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE) instead of inheriting whatever
the live checkout's catalog happens to be.

## Anchors

- Starting SHA: 1bb8a369b65f9a580a9dc51e5cdb562dd187c0ca (CASE D bootstrap).
- LAST_VALIDATED_IMPLEMENTATION_SHA: e3a8e2f946afb95ab1f4eadec5149afda3739088
  (substantive implementation; its exact CI run 31874567136 passed every
  test step; the task-introduced cleanliness step had a shell-quoting defect
  fixed in the workflow-only commit below).
- LAST_SUBSTANTIVE_CHECKPOINT_SHA: e02aebeb42b2b95995dc20f4123dade866ed71cd
  (implementation + CI-fix; exact CI run 31874715283 — ALL steps success,
  including the dedicated "Phase 8B.1.0 catalog-aware proposal compatibility
  matrix" and the checkout-cleanliness step).
- LAST_DOCUMENTATION_CHECKPOINT_SHA: docs closure commit (M17).
- Final live SHA / origin/main: (filled at close).
- Real canonical catalog: EMPTY, file digest
  sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334
  (unchanged pre/post task).

## Blocked Phase 8B.1 disposition (preserved)

- One real promotion was prepared/approved/applied/verified, then reverted by
  the development session after full regression exposed the cross-phase
  test-suite incompatibility; the catalog was restored to exact pre-promotion
  bytes; the repository is clean; the historical task record is untouched.
- Approval canonical-promotion-approval:sha256:17c970356d9d2691c3f371ecda2c2acbcd9d367585db766aec41b23097f34c47
  remains PERMANENTLY SPENT — read-only re-verified during this task
  (`APPROVAL_CONSUMED_READONLY: true`; promotion intent present). No reuse,
  no reset, no replacement.
- Phase 8B.1 status: BLOCKED →
  BLOCKER_RESOLVED_RETRY_REQUIRES_NEW_OWNER_AUTHORIZATION;
  PHASE_8B_1_RETRY_READINESS: READY_FOR_FRESH_OWNER_AUTHORIZATION.
  NOT resumed automatically; no promotion attempted in this task.

## Key evidence

- M1 reproduction (pre-fix): one-entry checkout → 47 failed / 58 passed;
  the rendered one-entry catalog byte-matches the historical applied
  postimage sha256:fa7b71d472ad4656aa9019a0ca35e264da31226c8af6612f3f649a397e9e4e7e.
- M13 (one-entry, post-fix): 159 passed / 1 skipped / 0 failed — the
  historical blocker does NOT recur.
- M14 (exhausted A+B, post-fix): 160 passed / 1 skipped / 0 failed — a
  second adoption would not recreate the failure; exhaustion is intentional.
- Full Playwright (real checkout): 682 passed / 1 skipped / 2 failed
  (dirty-tree-only CLI inspect/run; both pass on any clean tree — verified
  17/17 after commit). Owner provenance 91, AI regressions 98, campaign
  synthetic 27, typecheck, hardening, git diff --check, agent-state, privacy
  scan: PASS.
- Contract digests: pre-task (v1, empty) sha256:91b45f10...;
  post-task (v2, empty) sha256:0336723f...; EXPAND_ONLY and
  EXPAND_AND_COLLAPSE fixtures yield two further distinct digests (tested).
- Pre-task sourceBundleDigest sha256:ed3038d3...; post-implementation value
  recorded in STATE.md at M16.

## Portfolio (final)

- Version: nightwatch.selfdev-synthetic-portfolio.v1
- Order: [EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE]
- Selection algorithm: nightwatch.selfdev-synthetic-selection.v1
- A: actions [selfdev.synthetic.expand-summary]; final state expanded.v1;
  terminal transition READ_ONLY_EXPANSION; fingerprint
  sha256:6a322450...; adopted-case id adopted-case:sha256:90248aae...
- B: actions [expand-summary, collapse-summary]; final state ready.v1;
  terminal transition READ_ONLY_COLLAPSE; fingerprint sha256:917d83b5...;
  adopted-case id adopted-case:sha256:6543eb5d...
- EMPTY → A; A adopted → B; A+B → EXHAUSTED (0 PASS, not eligible, session
  completes normally, CLI exits 0 with portfolioStatus EXHAUSTED).

## Safety

Zero DEV/NEXT/production contacts, zero database/infrastructure queries,
zero external AI/model calls, zero publication, zero Alphaus writes, zero
runtime Git writes, zero real canonical catalog writes. The spent approval
was only read. No new approval, no promotion retry.

## Files

Implementation: src/core/selfDev/portfolio.ts (new), types.ts, proposer.ts,
controller.ts, contract.ts, metamorphicProbes.ts, provenanceManifest.ts,
index.ts, bin/selfdev-synthetic.mjs, bin/hardening-check.mjs,
.github/workflows/hardening.yml. Tests: tests/helpers/selfDevSourceFixture.ts,
tests/helpers/selfDevStack.ts (new), 8 refactored selfDev test files,
tests/unit/selfDevPortfolio.test.ts (new, 30 tests). Docs: CURRENT_STATE,
ROADMAP, ARCHITECTURE, SAFETY_MODEL, DECISIONS (D-49), task records.
