# Nightwatch Phase 8B.1 — Owner-Gated Canonical Promotion

## Purpose

Prove Nightwatch can perform exactly one owner-approved canonical write to
its own adopted-case catalog — the first phase permitted to alter canonical
source at runtime at all — under a deliberately severe trust chain, with
zero runtime Git authority: the one Git commit of that one write is always
performed by the development session, never by Nightwatch runtime.

## Starting State

- Task ID: `phase-8b-1-owner-gated-canonical-promotion`
- Starting Nightwatch SHA: `91149621e247a2996a3f5c97090684b68507418d`
- Relevant architecture: `src/core/selfDev/` (pure evaluation, trust
  assessment, replay), `src/core/selfDevSandbox/` (disposable-mirror
  adoption planning/execution), `src/core/provenance/localGit.ts` (sole
  read-only Git boundary), `src/core/policy/ownerScope.ts` /
  `privateArtifacts.ts` (owner policy gate, immutable private storage).
- Dependencies: Phase 8B (sandbox-confined adoption, metamorphic proof) and
  Phase 8B.0.1 (promotion-readiness closeout) must remain COMPLETE and
  unmodified in behavior.
- Established facts that must not be rediscovered: the sandbox
  plan/result schemas and their exact-key validation, the strict single
  adoption strategy class `DECLARATIVE_REGRESSION_CATALOG_PROMOTION`, the
  `assessFutureReviewEligibility` canonical eligibility gate, the
  `PrivateArtifactStore.writeImmutableJson` atomic no-replace primitive.

## Scope

A new `src/core/selfDevPromotion/` authority boundary: promotion intent
(`prepare.ts`), one-shot owner approval (`approve.ts`), the one canonical
source-write executor (`apply.ts`), fresh-load canonical verification
(`verify.ts`), a read-only currentness assessor (`currentness.ts`), private
immutable storage for all four record types (`storage.ts`), and a new CLI
`bin/selfdev-promote-canonical.mjs` (inspect/prepare/approve/apply/verify/
status). A new distinct owner-policy operation
`SELF_DEVELOPMENT_CANONICAL_ADOPTION` under a deliberate
`OWNER_SCOPE_POLICY_VERSION` bump. A new dedicated hardening check and CI
matrix step. Exactly one real canonical promotion acceptance run.

## Non-Goals

Multiple canonical promotions; bulk promotion; arbitrary source changes;
AI-selected, product-derived, or customer-derived candidates; runtime Git
writes of any kind; Alphaus repository mutation; external publication;
campaign/AI/product/database/infrastructure integration into the promotion
subsystem; a generic runtime rollback/source-restore command.

## Safety Constraints

Zero DEV/NEXT/production contact, zero database/infrastructure queries, zero
external AI/model calls, zero publication, zero Alphaus writes. Exactly one
canonical source write, one approval consumption, one adopted catalog entry
for the entire task. Runtime Git write authority stays permanently zero;
only the development session may `git add`/`git commit`/`git push` the one
validated promotion.

## Architecture / Approach

Trust chain: clean current source -> fresh v2 selfDev session -> current
eligibility -> exact candidate -> exact PASS evaluation -> exact Phase 8B
plan -> fresh fully-verified sandbox result -> canonical promotion intent
(content-addressed, no source/patch/diff stored) -> explicit one-shot owner
approval (fixed confirmation token `CANONICAL_ONE_FILE_ONLY`) -> exact-HEAD
revalidation -> one atomic canonical write (temp file, original mode
preserved, symlink/path-escape defense, one-shot approval consumption
claimed strictly before the write) -> fresh-process-equivalent verification
(dynamic reload of the modified canonical modules, reusing the shared
`metamorphicProbes.ts` proof) -> full local tests against the intentionally
dirty tree -> development-session commit -> exact CI -> post-commit
currentness. See `PLAN.md`'s prior "Design decisions recorded" content,
carried into the Decision Log below.

## Milestones

### M1 — Owner policy, schemas, trust model

- Objective: add `SELF_DEVELOPMENT_CANONICAL_ADOPTION`, bump policy version,
  define the four private record schemas and their exact-key validators.
- Files/areas: `src/core/policy/ownerScope.ts`, `src/core/selfDevPromotion/types.ts`,
  `src/core/selfDevPromotion/validation.ts`.
- Acceptance criteria: exact-key validation, content-addressed IDs, semantic
  invariants a recomputed ID cannot legalize.
- Validation commands: `npx tsc --noEmit`
- Status: COMPLETE

### M2–M7 — Promotion intent, approval, apply, verify, currentness, CLI

- Objective: implement `prepare.ts`/`approve.ts`/`apply.ts`/`verify.ts`/
  `currentness.ts`/`storage.ts` and the CLI.
- Files/areas: `src/core/selfDevPromotion/*`, `bin/selfdev-promote-canonical.mjs`,
  `package.json`.
- Acceptance criteria: whole-repository cleanliness gates before
  prepare/approve/apply; exact-HEAD gate on apply; one-shot approval
  consumption claimed before any write; atomic same-directory temp-file
  write with mode preservation and symlink/path-escape defense; fresh-load
  verification against the modified canonical modules using the shared
  metamorphic proof; CLI accepts no path/target/repo/model/force/commit/push
  option.
- Validation commands: `npx tsc --noEmit`, focused Playwright matrix below.
- Status: COMPLETE

### M8 — Hardening

- Objective: `checkPhase8B1CanonicalPromotionBoundary` in
  `bin/hardening-check.mjs`; repair the existing Phase 8B metamorphic-probe
  check after the shared extraction.
- Validation commands: `npm run hardening:check`
- Status: COMPLETE

### M9 — Adversarial test matrix

- Objective: `tests/unit/selfDevCanonicalPromotion.test.ts`,
  `selfDevCanonicalPromotionFlow.test.ts`, `selfDevCanonicalPromotionCli.test.ts`,
  and an updated `tests/unit/ownerScope.test.ts`.
- Validation commands: `npx playwright test tests/unit/selfDevCanonicalPromotion*.test.ts tests/unit/ownerScope.test.ts --project=nightwatch --workers=1`
- Status: COMPLETE (20/20 new/updated tests pass)

### M10 — Full regression

- Objective: confirm zero behavior change to Phase 8A/8A.1/8A.1.1/8B/8B.0.1
  after the metamorphic-probe extraction and owner-policy version bump.
- Validation commands: `npx playwright test --project=nightwatch --workers=1`
- Status: COMPLETE (650+ passed; two pre-existing browser/proxy tests are
  worker-count port-contention flakes, confirmed passing individually and
  under `--workers=1`, unrelated to this change)

### M11 — Implementation checkpoint push + exact CI

- Objective: commit while the catalog is still empty, push fast-forward,
  wait for exact CI including the new dedicated matrix step.
- Status: IN_PROGRESS

### M12–M23 — One real acceptance promotion through STOP

- Objective: fresh pre-promotion selfDev session; fresh Phase 8B sandbox
  plan/result; prepare/approve/apply/verify against the real canonical
  checkout; dirty-tree validation; promotion commit; clean validation, push,
  exact CI; post-promotion duplicate/non-overreach/unsafe-regression proof;
  documentation closure; final push/CI/currentness; STOP.
- Status: NOT_STARTED

## Validation Strategy

Focused: the new Phase 8B.1 matrix plus `ownerScope.test.ts`. Regression:
full Phase 8A/8A.1/8A.1.1/8B/8B.0.1 focused suites plus the full Playwright
suite. Structural: `npx tsc --noEmit`, `npm run hardening:check`,
`npm run agent:check`, `git diff --check`. Real acceptance: exact GitHub
Actions run at both the implementation checkpoint and the promotion commit,
requiring the dedicated Phase 8B.1 matrix step to have executed and passed.

## Decision Log

- 2026-08-15 — Decision: add all new `selfDevPromotion` source files and the
  new CLI to `SELFDEV_AUTHORITATIVE_PATHS` (affects `sourceBundleDigest`)
  but NOT to `SELFDEV_CONTRACT_MANIFEST` (does not affect `contractDigest`);
  reason: promotion machinery is source provenance, not evaluator contract —
  only a future adopted-catalog entry changes `contractDigest`, exactly as
  Phase 8B already established; evidence: `provenanceManifest.ts` diff;
  consequence: the implementation checkpoint advances `sourceBundleDigest`
  without touching `contractDigest`.
- 2026-08-15 — Decision: extract the four Phase 8B metamorphic probes from
  `sandboxExecutor.ts` into a new pure `src/core/selfDev/metamorphicProbes.ts`;
  reason: canonical `verify` needs the identical proof logic against the
  modified canonical checkout rather than a duplicate implementation
  (mandate: prefer one pure fixed metamorphic proof implementation);
  evidence: `sandboxExecutor.ts` now calls the shared function and all prior
  Phase 8B/8B.0.1 tests pass unmodified; consequence: any future change to
  the proof logic only has one implementation to maintain.
- 2026-08-15 — Decision: `verify.ts`, and (for correctness) `prepare.ts`'s
  and `apply.ts`'s already-adopted/postimage-render logic, dynamically
  reload `contract.ts`/`evaluator.ts`/`adoptedCases.ts` from the given
  `repositoryRoot` via the existing bounded Phase 8B sandbox loader
  (`loadSandboxModules`) rather than an ordinary top-level import; reason:
  an ordinary import is bound to whichever process happens to run it — a
  genuinely fresh CLI invocation (the real production path) makes this
  equivalent, but making it explicit is strictly more correct and is what
  makes the subsystem soundly testable against a synthetic repository
  in-process; evidence: three latent staleness defects found and fixed
  during the synthetic test matrix (see Discoveries); consequence: no
  behavior change in production (every subcommand is already a separate
  fresh CLI process), but eliminates a class of process-cache bugs.
- 2026-08-15 — Decision: `apply.ts` checks "is this approval already
  consumed" BEFORE the whole-repository cleanliness gate; reason: a
  successful apply deliberately leaves the tree dirty in exactly the target
  file, so a repeated apply attempt for an already-consumed approval must
  report `APPROVAL_ALREADY_CONSUMED`, not be masked by that expected
  post-write dirtiness; evidence: reproduced pre-fix in the synthetic test
  matrix; consequence: the atomic consumption claim immediately before the
  write remains the real race-safe gate — this early check is a precise
  error-reporting improvement, not a safety-relevant reordering.
- 2026-08-15 — Decision: bump `OWNER_SCOPE_POLICY_VERSION` from
  `nightwatch.owner-scope-policy.v1` to `.v2`; reason: `SELF_DEVELOPMENT_CANONICAL_ADOPTION`
  is a material authority expansion (first-ever canonical source-write
  capability) that must not be hidden behind a stale policy-version
  assertion; evidence: no other literal reference to `.v1` existed outside
  its own definition; `tests/unit/ownerScope.test.ts` updated to assert the
  new allowed operation explicitly.

## Discoveries

- `currentCheckoutState()`'s `contractDigest` field (in
  `src/core/provenance/localGit.ts`) is computed via an ordinary top-level
  import of `selfDevContractDigest()`, so it reflects whichever process
  happens to be running it rather than the `repositoryRoot` argument. This
  has been latent throughout Phase 8A/8B/8B.0.1 but was invisible because
  every existing test's synthetic repository catalog coincidentally starts
  and stays empty, matching the real project's own (also empty) catalog. It
  only became externally visible once a test needed the synthetic repo's
  catalog to diverge from the real project's (i.e., exactly what Phase 8B.1
  introduces). This is out of scope to fix here (it is a foundational,
  widely-depended-on function with zero production impact, since every real
  CLI invocation is its own fresh process whose own repository IS
  `repositoryRoot`); Phase 8B.1's own tests work around it by deriving
  "current" contract-digest values from the already fresh-loaded
  `verify`/probe results instead of from `currentCheckoutState()` directly.
  Deferred as a documented, non-blocking characteristic — see Deferred Work.
- Two pre-existing tests (`scenarios/ripple/local.smoke.ts`,
  `tests/unit/journeyEngine.test.ts`'s "optional-image-failure" case) are
  worker-count port-contention flakes under `--workers=2`, unrelated to this
  phase; both pass individually and under `--workers=1`.

## Deferred Work

- `currentCheckoutState()`'s `contractDigest` being process-bound rather
  than `repositoryRoot`-bound (see Discoveries) is a real, if currently
  harmless, characteristic worth a dedicated future closeout task if any
  future subsystem needs `currentCheckoutState()` itself to be sound against
  an arbitrary `repositoryRoot` in-process (not just via a fresh CLI
  process). Not fixed here: out of this task's narrow scope and touches
  widely-depended-on Phase 8A.1 code.

## Completion Criteria

Exactly one canonical promotion acceptance: one selected candidate, one
promotion intent, one approval, one approval consumption, one canonical
source write, one adopted catalog entry, one promotion Git commit — verified
by a fresh-process-equivalent check, committed by the development session,
green on exact CI at both the implementation checkpoint and the promotion
commit, with a post-promotion selfDev session proving the promoted semantics
are now duplicate while future genuinely-new coverage and unsafe-candidate
rejection remain provably possible.
