# Nightwatch Phase 8B — Controlled Source Adoption Sandbox — Plan

## Purpose

Translate one eligible declarative regression candidate into one
deterministic tracked-source adoption, applied only inside an isolated
private source mirror, with metamorphic proof of effect and zero canonical
mutation. See `SPEC.md` for full frozen intent.

## Starting State

- Task ID: `phase-8b-controlled-source-adoption-sandbox`
- Starting Nightwatch SHA: `e7abed9c64252df2c3bd9809252d652bd95f045a`
- Relevant architecture: `src/core/selfDev/*` (Phase 8A/8A.1/8A.1.1),
  `src/core/provenance/localGit.ts`, `src/core/policy/ownerScope.ts`,
  `src/core/policy/privateArtifacts.ts`, `bin/selfdev-*.mjs`,
  `bin/hardening-check.mjs`.
- Dependencies: `assessFutureReviewEligibility`, `verifiedPassCandidates`,
  the v2 evaluation/session schemas, `sourceBundleDigest`/`contractDigest`,
  `PrivateArtifactStore` atomic no-replace primitive.
- Established facts not to rediscover: Phase 8A/8A.1/8A.1.1 trust chain
  semantics (see their own SPEC/PLAN/STATE/REPORT); do not redesign
  `assessFutureReviewEligibility` — consume it.

## Scope

Items 1–11 of `SPEC.md`'s Required Deliverables.

## Non-Goals

`SPEC.md` Explicit Non-Goals, verbatim.

## Safety Constraints

`SPEC.md` Safety Constraints, verbatim; goal-mode prompt §185 ABSOLUTE NO-GO
list applies as hard constraints.

## Architecture / Approach

Trust chain (goal-mode prompt §7, frozen):

```
exact v2 session artifact ID
  -> current local source provenance
  -> assessFutureReviewEligibility(...)
  -> exact eligible candidate ID
  -> matching PASS evaluation
  -> deterministic adoption plan
  -> immutable private plan
  -> revalidate current source + plan (TOCTOU)
  -> private disposable source mirror
  -> one allowlisted tracked-source change (adoptedCases.ts)
  -> post-change source/contract verification
  -> load modified sandbox evaluator (bounded TS loader)
  -> metamorphic adoption proof
  -> private sandbox result
  -> cleanup
  -> STOP
```

No canonical source write. No Git commit/push from this runtime path.

New modules (exact paths decided during M1 after the architecture research
agent's report; default plan unless source disproves it):

- `src/core/selfDev/adoptedCases.ts` — schema, empty catalog, validation,
  canonical renderer, base-independent ID + fingerprint recomputation.
- `src/core/selfDevSandbox/` — sandbox-only authority boundary (planner,
  plan schema/storage, sandbox mirror/executor, TS loader, result
  schema/storage), kept separate from the pure `src/core/selfDev/`
  trust/evaluation domain per goal-mode prompt §24.
- `bin/selfdev-adopt-sandbox.mjs` — CLI (`inspect`/`plan`/`run`).
- Owner policy: extend `src/core/policy/ownerScope.ts` with
  `SELF_DEVELOPMENT_SANDBOX_ADOPTION`.
- Hardening: extend `bin/hardening-check.mjs`.

## Milestones

### M0 — Bootstrap + task scaffolding
- Objective: verify git/docs state, create this task, update ACTIVE_TASK.md.
- Status: COMPLETE

### M1 — Freeze trust model + schemas
- Objective: finalize adopted-case schema, plan schema, result schema field
  lists (from `SPEC.md` + architecture research), confirm exact target file
  paths against actual current source layout.
- Status: COMPLETE

### M2 — Empty adopted catalog + validation + evaluator integration
- Objective: `adoptedCases.ts` with empty `SELFDEV_ADOPTED_CASES`, strict
  validation, canonical renderer with round-trip determinism; evaluator
  seeds initial fingerprints/coverage from catalog; empty-catalog behavior
  unchanged (existing 39 selfDev tests still pass unmodified).
- Validation: `npx playwright test tests/unit/selfDev.test.ts
  tests/unit/selfDevSchema.test.ts tests/unit/selfDevEligibility.test.ts
  tests/unit/selfDevProvenance.test.ts`
- Status: COMPLETE

### M3 — Contract + source provenance integration
- Objective: adopted catalog changes affect `contractDigest`; new files join
  `SELFDEV_AUTHORITATIVE_PATHS`; document manifest-version bump decision.
- Status: COMPLETE

### M4 — Pure deterministic adoption planner
- Objective: plan creation gate (goal-mode §34) fully implemented and pure;
  deterministic plan ID; strict plan validation.
- Status: COMPLETE

### M5 — Private plan storage + TOCTOU revalidation
- Objective: immutable no-replace plan storage under
  `$HOME/.nightwatch/selfdev-adoption/`; `run` revalidates plan/source/
  eligibility/target-preimage before any sandbox mutation.
- Status: COMPLETE

### M6 — Private source-mirror sandbox executor
- Objective: disposable 0700 sandbox root outside canonical/workspace/
  Alphaus; bounded authoritative-path copy; pre-mutation digest check;
  exactly one atomic sandbox target write; path-safety/symlink rejection.
- Status: COMPLETE

### M7 — Sandbox modified-source module loader
- Objective: bounded local TypeScript loader for sandbox absolute paths
  only; module-cache isolation regression (A-then-B, B-then-A); execution
  seriality if the loader is process-global.
- Status: COMPLETE

### M8 — Metamorphic adoption verification
- Objective: post-mutation contract/source digest change; same-semantics
  future-base duplicate; assertion-variant duplicate; new-coverage
  non-overreach PASS; unsafe-candidate-still-rejected.
- Status: COMPLETE

### M9 — Private result storage
- Objective: sanitized immutable sandbox-result schema/storage; deterministic
  result ID; sanitized failure classes.
- Status: COMPLETE

### M10 — CLI inspect/plan/run
- Objective: `bin/selfdev-adopt-sandbox.mjs`, `npm run selfdev:adopt-sandbox`
  script; forbidden-option rejection; sanitized output only.
- Status: COMPLETE

### M11 — Owner policy + hardening boundaries
- Objective: `SELF_DEVELOPMENT_SANDBOX_ADOPTION` operation; hardening checks
  for call-graph, data-only catalog, no-Git-mutation, no-arbitrary-path.
- Status: COMPLETE

### M12 — Adversarial test matrix
- Objective: focused test files per `SPEC.md` deliverable 9; cover goal-mode
  §85–§97 and §121–§123 forgery/injection/staleness/TOCTOU cases.
- Status: COMPLETE

### M13 — Full regression + clean checkout
- Objective: typecheck, hardening, full Playwright, synthetic campaign,
  agent:check, diff-check, isolated `npm ci --ignore-scripts` full-history
  clone validation.
- Status: COMPLETE

### M14 — Architecture/safety review
- Objective: answer goal-mode §163–§169 review questions with evidence from
  this implementation; record in STATE/REPORT.
- Status: COMPLETE

### M15 — Substantive commit/push/exact CI
- Objective: privacy scan, `git diff --check`, commit, push to
  `origin main`, verify `HEAD == origin/main`, verify exact CI green
  including new Phase 8B matrix step.
- Status: COMPLETE

### M16 — Fresh v2 acceptance artifact
- Objective: `npm run selfdev:synthetic` post-checkpoint; verify
  `VERIFIED_EXACT_BASE`, replay PASS, eligible true, >=1 candidate.
- Status: COMPLETE

### M17 — Real private plan + one sandbox adoption
- Objective: inspect -> plan -> run with `SANDBOX_ONLY` against the fresh
  artifact; capture sanitized IDs/digests only.
- Status: COMPLETE

### M18 — Canonical-unchanged proof
- Objective: `git status --short` clean; catalog bytes/digest unchanged;
  source bundle unchanged, both before/after comparison recorded.
- Status: COMPLETE

### M19 — Docs closure + final push + final CI
- Objective: update durable docs + task files + ACTIVE_TASK.md; push;
  verify final CI green including Phase 8B matrix step; verify worktree
  clean and `HEAD == origin/main`.
- Status: IN_PROGRESS

### M20 — STOP
- Objective: final success report; do not start Phase 8B.1.
- Status: NOT_STARTED

## Validation Strategy

Focused selfDev/adoption suites first at each milestone; full
Playwright/typecheck/hardening/agent-state/campaign gates at M13, M15
(pre-push), and M19 (pre-final-push). Clean isolated checkout at M13 and
optionally reconfirmed at M15.

## Decision Log

- 2026-08-15 — Decision: use `src/core/selfDevSandbox/` as a distinct
  boundary from `src/core/selfDev/` for sandbox-mutation authority; reason:
  goal-mode prompt §24 explicitly requests preserving `src/core/selfDev/` as
  pure deterministic trust/evaluation/planning domain; evidence: prior
  phases' pattern of narrow authority boundaries (e.g. `ownerDecision.ts`
  kept internal/unexported in Phase 7B.2.1); consequence: hardening call-
  graph check scans both directories with distinct rules.

## Discoveries

- (populated as implementation proceeds)

## Deferred Work

- Phase 8B.1 — Owner-Gated Canonical Promotion (NOT_STARTED, not authorized).

## Completion Criteria

`PHASE_8B_COMPLETE_SANDBOX_ONLY`: all `SPEC.md` acceptance criteria pass, the
real local acceptance exercise (M16-M18) proves canonical byte-identity
before/after, final CI is green including the Phase 8B matrix step, and
`ACTIVE_TASK.md`/`docs/CURRENT_STATE.md` reflect Phase 8B `COMPLETE` with
canonical promotion `NOT_STARTED`/`NOT_AUTHORIZED`.
