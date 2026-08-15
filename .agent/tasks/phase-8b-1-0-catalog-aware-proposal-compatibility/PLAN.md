# Phase 8B.1.0 — Catalog-Aware Synthetic Proposal & Test-Baseline Compatibility — PLAN

Task ID: `phase-8b-1-0-catalog-aware-proposal-compatibility`
Status: IN_PROGRESS
Starting SHA: 1bb8a369b65f9a580a9dc51e5cdb562dd187c0ca
Authorization class: PHASE_8B_1_0_COMPATIBILITY_REPAIR_ONLY

## Purpose

Repair the structural compatibility blocker that prevented the first real
Phase 8B.1 canonical promotion from being committed, on BOTH sides:
- **Production**: a small bounded deterministic portfolio of genuinely
  distinct safe proposal semantics (EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE)
  with catalog-aware novelty selection; portfolio exhaustion is a valid
  non-failing terminal state (`passCandidateCount = 0`,
  `futureReviewEligible = false`).
- **Tests**: historical suites must stop accidentally using the live
  canonical adopted-case catalog as an implicit fixture; each test states
  which adopted-catalog state it proves (EMPTY / EXPAND_ONLY /
  EXPAND_AND_COLLAPSE) via one centralized test-only source-fixture
  mechanism.

The end state makes a FUTURE fresh Phase 8B.1 promotion attempt possible;
that retry requires a separate owner authorization after this task.

## Starting State

- Local HEAD == origin/main == `1bb8a369b65f9a580a9dc51e5cdb562dd187c0ca`,
  clean worktree, branch `main`, remote `origin` → `quantdale/night-watch`.
- Phase 8B.1: BLOCKED (historical promotion attempt preserved; approval
  `canonical-promotion-approval:sha256:17c970356d9d2691c3f371ecda2c2acbcd9d367585db766aec41b23097f34c47`
  permanently spent; catalog restored to empty; repository clean).
- Real canonical catalog: empty (`SELFDEV_ADOPTED_CASES = []`, file digest
  `sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`).
- Pre-task contractDigest (v1, empty catalog):
  `sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`.
- Pre-task sourceBundleDigest: `sha256:ed3038d3156f8ebb3edf375f039ab84c7559792b787c414ebec8168af88b8bd5`.

## Scope

- New `src/core/selfDev/portfolio.ts`: portfolio version, selection-algorithm
  version, two frozen declarative variants, pure `selectNextSyntheticProposalVariant`.
- Proposer concrete fixtures `VALID_MATRIX_EXPAND`, `VALID_MATRIX_EXPAND_COLLAPSE`;
  variant-driven matrix (duplicate duplicates the SELECTED member).
- Controller resolves the default/`VALID_MATRIX` alias through the selector to
  a concrete fixture; EXHAUSTED → bounded diagnostic matrix (first member).
- Contract manifest binds portfolio + selection; manifest version v1 → v2.
- Shared metamorphic probes: nonOverreach exactness for the terminal member
  (registry-saturated state correctly recognized as duplicate).
- `SELFDEV_AUTHORITATIVE_PATHS` gains portfolio.ts; CLI prints
  portfolioStatus/selectedVariant diagnostics.
- Test-only helpers `tests/helpers/selfDevSourceFixture.ts` (explicit catalog
  states rendered via the real renderer) and `tests/helpers/selfDevStack.ts`
  (coherent stack loaded from one source root: session/replay/trust/
  eligibility/planner/sandbox/promotion).
- Historical test refactor + new `tests/unit/selfDevPortfolio.test.ts` matrix;
  hardening check `checkPhase8B10PortfolioIntegrity`; CI matrix step.

## Non-Goals

No canonical promotion prepare/approve/apply; no new approval; no reuse of
the spent approval; no third portfolio variant; no new registry action; no
`--variant`/`--candidate-slot`/`--empty-baseline` production CLI options; no
weakening of duplicate/eligibility/provenance rules; no historical artifact
rewrite; no AI/model/product/DB/infra/publication/Alphaus activity; no
runtime Git mutation.

## Safety Constraints

- Real canonical catalog stays EMPTY throughout; all non-empty catalog
  testing happens in temporary synthetic source trees / temp Git repos only.
- No production catalog-bypass switch, env-var bypass, monkey patching, or
  mutation of imported global arrays.
- Evaluation and replay within one test harness share the SAME explicit
  adopted state (coherent stack) — never empty-evaluation vs live-replay.
- Selection never depends on baseNightwatchSha/seed/createdAt/candidateId;
  novelty is always re-derived through the trusted action registry.
- The spent Phase 8B.1 approval remains consumed; no reset, no clone, no
  replacement.

## Architecture / Approach

LIVE ADOPTED STATE → BOUNDED TRUSTED PROPOSAL PORTFOLIO → DERIVE SEMANTIC
NOVELTY (fingerprint not adopted AND coverage delta > 0 vs baseline+adopted)
→ FIRST NOVEL VARIANT → CONCRETE REPLAY FIXTURE → NORMAL DETERMINISTIC
EVALUATION. EMPTY → EXPAND; EXPAND ADOPTED → EXPAND+COLLAPSE; BOTH ADOPTED →
EXHAUSTED (0 PASS, not eligible, normal terminal state).

Tests: TEST INTENT → EXPLICIT ADOPTED-CATALOG STATE (EMPTY / EXPAND_ONLY /
EXPAND_AND_COLLAPSE) → EXACT EXPECTATION. The full selfDev stack is loaded
from the fixture source root (cache-isolated, same pattern as the Phase 8B.1
promotion modules' fresh-load), so session, replay, digests, eligibility,
planner, sandbox, and promotion all agree on one explicit catalog state
regardless of the checkout the test process runs in.

## Milestones

- M0 bootstrap / stale-state classification / task creation — DONE (CASE D)
- M1 reproduce blocker in synthetic one-entry source — DONE (47 failed /
  58 passed pre-fix; rendered one-entry catalog byte-matches the historical
  applied postimage `sha256:fa7b71d4...`)
- M2 classify historical test baseline assumptions — DONE (48 tests across
  8 files break under a committed one-entry catalog; full ledger recorded)
- M3 proposal portfolio descriptors — DONE
- M4 catalog-aware deterministic selector — DONE
- M5 concrete replay fixtures — DONE
- M6 controller/replay integration — DONE
- M7 portfolio contract binding — DONE (manifest v2; digest changed)
- M8 test baseline helpers + historical test refactor — DONE
- M9 empty/one-entry/exhausted focused matrix — DONE (29/29 new tests)
- M10 Phase 8B/8B.1 synthetic integration (planner/sandbox/promotion consume
  variant B) — DONE
- M11 hardening + CI — DONE
- M12 full normal regression (real checkout, empty catalog) — IN PROGRESS
- M13 one-entry isolated full-history regression — PENDING
- M14 exhausted isolated full-history regression — PENDING
- M15 architecture/adversarial review — PENDING
- M16 substantive commit/push/exact CI — PENDING
- M17 documentation closure / final CI — PENDING
- M18 final report + STOP (no promotion retry) — PENDING

## Validation Strategy

- `npx tsc --noEmit`; `npm run hardening:check`; `git diff --check`.
- Full selfDev lineage (14 files) in the real checkout; full Playwright
  suite; owner provenance; AI regressions; local-canary; agent-state;
  `npm run campaign:synthetic`; `npm run agent:check`; privacy scan.
- One-entry and exhausted isolated full-history checkouts (temp repos under
  /tmp with explicit rendered catalogs) run the same suites — direct answer
  to "would the previous 50-test structural failure recur?" (expected NO).
- Exact CI run at the substantive SHA; dedicated 8B.1.0 matrix step must
  execute; real checkout left clean with an empty catalog.

## Decision Log

- **Contract manifest version**: bumped to `nightwatch.selfdev-contract.private.v2`
  because the manifest SHAPE gains a load-bearing semantic sub-manifest
  (portfolio + selection). Evidence: v1 existed since Phase 8A.1 and was
  extended in 8B/8B.0.1 without a bump while the contract was still being
  built out; this task alters deterministic PROPOSAL semantics, so the
  version must move. The version string is part of the manifest and therefore
  of contractDigest.
- **Replay algorithm version**: NOT bumped — replay still regenerates the
  exact recorded concrete fixture and evaluates it exactly; only the set of
  valid fixture values changed (enum extension).
- **Replay descriptor / session / candidate / evaluation schemas**: NOT
  changed — the descriptor fixture field already exists and validates via the
  `SELFDEV_SYNTHETIC_FIXTURES` enum; two new enum values are a compatible
  extension.
- **Selector B-only corner**: with only B adopted (synthetic state), the
  portfolio is EXHAUSTED: A's entire coverage is subsumed by B's, so A's
  coverage delta is zero and claiming it novel would violate §10's
  "coverage delta must be nonzero" rule. §92.4's "B adopted but A not
  adopted → A" is therefore interpreted as EXHAUSTED and documented in the
  portfolio tests.
- **Metamorphic nonOverreach probe**: the probe's expectation is now exact
  relative to baseline+adopted: a sequence adding genuinely new coverage must
  still PASS; a sequence whose extra classes are already baseline/adopted
  (registry-saturated terminal state, i.e. adopting B) must be
  REJECTED_DUPLICATE. The executor's REGRESSION/UNAVAILABLE failure paths
  remain reachable end-to-end (continuation-action removal / coherent
  registry without the continuation).
- **Test baseline architecture**: one coherent source-root-scoped stack
  (evaluation, replay, eligibility, planner, sandbox, promotion all loaded
  from the fixture) instead of three unrelated mocks; the promotion modules'
  established fresh-load pattern is reused.
- **Empty-catalog CLI failures during development**: `selfDevAdoptionCli`
  tests fail only while the real checkout is dirty (uncommitted changes);
  they pass on any clean tree (verified in CI and temp checkouts).

## Discoveries

- M1 reproduction: rendering ONE EXPAND_SUMMARY adopted entry via the real
  renderer produces `sha256:fa7b71d472ad4656aa9019a0ca35e264da31226c8af6612f3f649a397e9e4e7e`
  — byte-identical to the historical Phase 8B.1 applied postimage — and the
  previously affected suites fail 47/58 in that checkout.
- The `currentCheckoutState()` contractDigest is process-module-bound (known
  Phase 8B.1 deferred finding): any in-process trust/eligibility call against
  a foreign repo is only coherent when the process's own catalog matches the
  repo's — the stack-loading architecture makes test fixtures coherent
  everywhere.
- The evaluator's state machine forbids `ASSERTION_FAILED` with zero coverage
  delta, so assertion-sabotage probe scenarios are not representable for the
  terminal portfolio member.

## Deferred Work

- `currentCheckoutState()` contract-digest process-binding characteristic
  (unrelated to this blocker; recorded by Phase 8B.1 PLAN Decision Log).
- A future phase may deliberately expand the portfolio/registry after A+B;
  no fake endless self-development loop is introduced here.

## Completion Criteria

- Bounded two-variant portfolio; deterministic base/seed-independent
  selection; EMPTY→A, A→B, A+B→EXHAUSTED; matrix shape preserved; replay
  concrete; contractDigest changed; affected historical suites green in
  empty, one-entry, and exhausted checkouts; exhaustion is a normal terminal
  state (0 PASS, not eligible, CLI exits 0); real catalog stays empty; no
  promotion attempted; exact CI green with the dedicated 8B.1.0 matrix step.
