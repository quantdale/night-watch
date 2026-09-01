# Nightwatch Concurrency and Workspace Hardening (C-00) — Plan

Task ID: nightwatch-concurrency-workspace-hardening-c00-v1
Phase: CONCURRENCY_WORKSPACE_HARDENING_C00_V1
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Establish the mechanically enforced model
`ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` so that concurrent
Nightwatch development agents cannot share mutable checkout/index state, and so
that corruption of repository-global Git state is mechanically detected. This is
`MA-13` / review §11 / threat `T-48` (OBSERVED), classified
`MUST FIX BEFORE IMPLEMENTATION`, and it precedes C-01.

## Starting State

- Campaign starting SHA `2517c26a019bbf8aa53008cd57658b917cc79bea`
  (`main`, clean, `HEAD == origin/main`).
- Measured read-only at that SHA: zero non-`H` `git ls-files -v` entries,
  pristine `.git/info/exclude`, 14 `*.sample` hooks only, `core.hooksPath`
  unset.
- The observed incident is historically repaired; nothing enforces it.
- Existing validators (`agent:check`, `project:check`, `handoff:check`,
  `hardening:check`, `gate:local`, `gate:clean`) read tracked content and Git
  history only, so none of them can see the incident's surfaces.

## Scope

- Deterministic session/worktree ownership model with regenerable per-worktree
  metadata.
- Repository-global hygiene invariants over the shared common Git directory:
  index flags, `info/exclude`, hooks, worktree metadata.
- Declared-deletion gate over tracked-file deletions.
- Fast-forward-only, never-force-push integration protocol serialized at the
  canonical `main` ref.
- Integration into `agent:check` and the executable quality gate.
- Adversarial matrix A–L on disposable synthetic repositories.
- Pinned pre-C-01 eligibility-census baseline (`F-32`).
- Documentation of the mandatory protocol and the durable decision.

## Non-Goals

C-00 grants no new product or runtime authority. It does not implement C-01,
does not remove the 128-operation cap, does not admit OpenAPI, does not
implement protobuf parsing, read-only effect proof, or production observation,
does not change production/DEV/NEXT policy, does not contact any environment,
does not refresh or inspect credentials, does not query databases or
cloud/IAM/Kubernetes, and does not modify sibling company repositories.

## Safety Constraints

- Destructive Git behaviour is exercised only on disposable synthetic
  repositories created inside the test's own temporary directory.
- The canonical checkout and any live session worktree are never used as a
  destructive test target.
- No credentials, tokens, cookies, storage state, customer values, or absolute
  machine paths beyond what Git itself reports enter source, tests, artifacts,
  or `.agent` files.
- No new network, daemon, database, or cloud coordination surface.
- Read-only inspection must remain importable by `bin/agent-state.mjs`, which
  is hardening-constrained against filesystem mutation.

## Architecture / Approach

Thin deterministic policy layer over Git's native isolation:

1. `config/workspace-integrity.v1.json` — committed static policy.
2. `bin/workspace-integrity.mjs` — read-only inspection core (ownership
   classification, four hygiene invariants, declared-deletion gate, base
   staleness, integration readiness). No write verb, no network.
3. `bin/nightwatch-session.mjs` — the only mutating surface: worktree/branch
   creation, ownership claim/release, integration push.
4. `bin/agent-state.mjs` — imports the read-only core; `agent:check` fails
   closed on drift.
5. `WORKSPACE_INTEGRITY` — one new required quality-gate group.
6. `tests/unit/workspaceIsolation.test.ts` — adversarial matrix A–L.

Full design rationale is in
`openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/design.md`.

## Milestones

## M0 — Safe bootstrap — COMPLETE

Discovered live Git state, verified the planning/review checkpoint, verified
the pre-existing predecessor worktree was abandoned rather than live, adopted
it instead of creating a second one.

## M1 — Durable continuity-v2 task — COMPLETE

`SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`, the OpenSpec change, and
`.agent/ACTIVE_TASK.md` all point at this task.

## M2 — Worktree ownership model

Per-worktree ownership record, six-way classification, atomic exclusive claim,
injectable liveness probe, fail-closed unknown states.

## M3 — Repository-global hygiene invariants

Index-flag invariant (corrected: no lowercase tag and no `S`/`s`), normalized
`info/exclude` allowlist, hooks-only-samples plus unset `core.hooksPath`,
worktree-metadata invariants, canonical-cleanliness cross-session invariant.

## M4 — Destructive-operation policy

Declared-deletion gate against the session base; behavioural prohibitions
documented in `AGENTS.md`.

## M5 — Integration protocol

`git push origin <sessionBranch>:main` compare-and-swap, merge-not-rebase
reconciliation, fast-forward-only canonical advance, no force-push.

## M6 — Main integration lease decision

Recorded analysis; decision is to implement no lease.

## M7 — agent:check / CLI integration

`session:status`, `session:check`, and the `WORKSPACE_INTEGRITY` gate group.

## M8 — Adversarial matrix A–L

Deterministic synthetic-repository tests for every observed hazard class,
proving both the failure and the repaired green state.

## M9 — Pinned pre-C-01 baseline

One read-only local/source-only eligibility census at a pinned clean SHA;
record source snapshot digest, census digest, and operation counts.

## M10 — Full validation and integration

Focused tests, continuity, typecheck, hardening, project truth, synthetic
campaign, local gate, clean Node20 gate; documentation; serialized integration
into canonical `main`.

## Validation Strategy

- Focused: `tests/unit/workspaceIsolation.test.ts` (matrix A–L).
- Continuity: `npm run agent:check`, `npm run agent:audit`.
- Truth: `npm run project:check`.
- Static: `npm run typecheck`, `npm run hardening:check`.
- Gate spec: `npm run quality-gate:spec`, `npm run gate:inventory`.
- Full: `npm run gate:local`, then `npm run gate:clean`.
- Census: `npm run campaign:eligibility-census` at a pinned clean SHA.

No existing validator may be weakened to make C-00 pass.

## Decision Log

- D-C00-1 — isolation over cooperation: one worktree per writing agent; no
  lock-and-cooperate scheme for ordinary development.
- D-C00-2 — ownership metadata lives in the per-worktree Git directory so 1:1
  identity is structural and `git worktree remove/prune` garbage-collects it.
- D-C00-3 — the review's "no lowercase letters" index-flag wording is
  mechanically incomplete; C-00 implements "no lowercase tag and no `S`/`s`".
  The review text is preserved as historical evidence.
- D-C00-4 — no main-integration lease: the remote ref update is already an
  atomic compare-and-swap.
- D-C00-5 — integration pushes `sessionBranch:main` rather than checking out
  `main`, so integration never mutates another worktree's index or checkout.

## Discoveries

- DEF-01 — the predecessor session's `REPORT.md` pre-asserted validation,
  ownership, integration and census results that did not exist. Repaired.

## Deferred Work

- C-01 truncation truth / discovery paging is the next campaign and is
  explicitly out of scope.
- Any future lease revisit requires new evidence that the compare-and-swap is
  insufficient.

## Completion Criteria

1. `session:status`/`session:check` answer the eight bootstrap questions
   categorically, deterministically and privacy-safely.
2. `agent:check` fails closed on every hygiene class and on undeclared
   tracked-file deletions.
3. The quality gate contains the required `WORKSPACE_INTEGRITY` group.
4. Matrix A–L passes, proving failure and repaired-green for each class.
5. The pinned pre-C-01 baseline is recorded.
6. Documentation and decisions are updated; `project:check` passes.
7. Local and clean Node20 gates pass.
8. Session branch integrated fast-forward; `HEAD == origin/main`; canonical
   worktree clean; remote topology `main` only.
