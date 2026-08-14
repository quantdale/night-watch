# Nightwatch Phase 8B — Controlled Source Adoption Sandbox

## Task purpose

Phase 8A/8A.1/8A.1.1 proved Nightwatch can propose, deterministically
evaluate, prove the provenance/replay of, and gate for future-review
eligibility a bounded declarative regression candidate — with zero adoption
authority. Phase 8B answers the next narrow question: can Nightwatch take
ONE exact current-source-eligible candidate, derive ONE deterministic source
adoption from it, apply that change only inside an isolated, disposable,
owner-private Nightwatch source mirror, and prove the modified source behaves
exactly as the adoption contract predicts — without ever touching the
canonical checkout? If yes, Phase 8B is complete. Canonical source promotion
is explicitly deferred to a future, separately authorized task
(Phase 8B.1 — Owner-Gated Canonical Promotion, NOT_STARTED).

## Owner authorization

`CURRENT OWNER AUTHORIZATION: PROCEED WITH PHASE 8B CONTROLLED SOURCE
ADOPTION SANDBOX.` This authorization is intentionally narrow: it covers
planning and one sandbox-confined source write/execute/verify/cleanup cycle
only. It does NOT authorize canonical source writes, Git commit/push from
Nightwatch runtime (development checkpoint pushes to the private
`quantdale/night-watch` remote remain separately allowed per `AGENTS.md`),
Alphaus repository writes, AI/model execution, product/DB/infrastructure
access, or publication. This authorization must not be broadened during the
task.

## Established starting state

- Task ID: `phase-8b-controlled-source-adoption-sandbox`
- Starting SHA: `e7abed9c64252df2c3bd9809252d652bd95f045a` (verified
  `HEAD == origin/main`, clean worktree, branch `main`)
- Phase 6: `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`
- Phase 7 / 7B family: `COMPLETE` (7B.3 harness complete, real local-model
  canary `NOT_RUN / LOCAL_RUNTIME_NOT_AVAILABLE`)
- Phase 8: `IN_PROGRESS`; Phase 8A, 8A.1, 8A.1.1: `COMPLETE`
- Historical Phase 8A.1.1 acceptance artifact
  `session:sha256:0cdcbb79062e93582db244feb6321c85398c323243f6cba53fbc071ecc1deff4`
  bound to `d33a8c1cc062b435a7b2bc4f69567286dd56ebb4` is historical evidence
  and becomes source-stale once Phase 8B changes authoritative source; it
  must not be rewritten, migrated, or force-kept-current.
- The existing `src/core/selfDev/` v2 trust chain
  (`assessFutureReviewEligibility`, `verifiedPassCandidates`, replay,
  provenance, contract) is the sole authority for candidate eligibility; do
  not rediscover it — consult the Phase 8A/8A.1/8A.1.1 SPEC/PLAN/STATE/REPORT
  and current source before redesigning it.

## Required deliverables

1. A strict, versioned, data-only adopted-case catalog
   (`src/core/selfDev/adoptedCases.ts`, schema
   `nightwatch.selfdev-adopted-case.v1`) that starts empty in canonical
   source and seeds the evaluator's baseline equivalent-fingerprint/coverage
   state without changing any existing Phase 8A behavior while empty.
2. Contract/source-provenance binding: adopting a catalog entry must change
   `contractDigest`; every new Phase 8B semantic source file must be part of
   `sourceBundleDigest`.
3. A pure, deterministic, content-addressed adoption planner consuming only
   an exact session artifact ID + exact candidate ID already accepted by
   `assessFutureReviewEligibility`, requiring a matching
   `EVALUATED_PASS_NOT_ADOPTED` evaluation with positive coverage delta, and
   producing an immutable private plan (`nightwatch.selfdev-adoption-plan.private.v1`)
   bound to a single code-defined target path
   (`src/core/selfDev/adoptedCases.ts`).
4. A disposable, owner-private, non-Git source-mirror sandbox executor that:
   TOCTOU-revalidates the plan against current source, copies only the fixed
   authoritative source set, verifies its pre-mutation digest matches
   canonical, performs exactly one safe-rendered catalog write, verifies
   post-mutation digests, loads and executes the modified sandbox evaluator
   through a bounded local TypeScript loader with module-cache isolation, and
   produces a sanitized immutable private result
   (`nightwatch.selfdev-adoption-sandbox-result.private.v1`).
5. Metamorphic proof that after adoption: the same regression semantics under
   a different valid base SHA resolve as duplicate; an assertion-variant with
   identical coverage also resolves as duplicate; a genuinely new coverage
   edge still passes; an unsafe candidate remains rejected.
6. A narrow two-stage CLI (`npm run selfdev:adopt-sandbox -- inspect|plan|run`)
   with exact-ID addressing only, no latest/list/bulk, and a fixed
   `--confirm SANDBOX_ONLY` token for `run`. No `apply`/`commit`/`push`/
   `promote` command exists.
7. A new narrow owner-policy operation (`SELF_DEVELOPMENT_SANDBOX_ADOPTION`
   or repository-native equivalent) that authorizes sandbox-only source
   writes and nothing else; `SELF_DEVELOPMENT_CANONICAL_ADOPTION` (or
   equivalent) remains unknown/blocked.
8. Hardening-check extensions proving: single call-graph reachability of the
   sandbox source-write executor, catalog data-only enforcement, no arbitrary
   path/command/model/Git-mutation authority, private immutable plan/result
   storage.
9. A focused adversarial test matrix (catalog, planner, sandbox, CLI, owner
   policy) plus full existing regression (selfDev/AI/provenance/agent-state/
   campaign/Playwright), typecheck, hardening, and an isolated full-history
   clean checkout.
10. One real local acceptance exercise on a fresh post-implementation v2
    synthetic artifact: inspect → plan → run with `SANDBOX_ONLY`, verifying
    the canonical adopted-case catalog and source bundle are byte-identical
    before and after.
11. Durable documentation closure (`docs/CURRENT_STATE.md`,
    `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/SAFETY_MODEL.md`,
    `docs/DECISIONS.md`) and this task's own `PLAN.md`/`STATE.md`/`REPORT.md`
    plus `.agent/ACTIVE_TASK.md`.

## Explicit non-goals

- No canonical source write authority, no Git commit/push authority beyond
  the pre-existing development-checkpoint push pattern, no AI/model
  authority, no product/DB/infrastructure authority, no publication
  authority, no new candidate proposer, no arbitrary code/patch/diff/path/
  command input at any boundary, no automatic plan→run chain, no
  campaign-to-adoption wiring, no canonical-apply CLI command, no starting of
  Phase 8B.1.

## Safety constraints

- Every rule in the goal-mode prompt's "ABSOLUTE NO-GO" list (§185) applies
  verbatim and is treated as a hard constraint on this task, not
  aspirational guidance.
- Sandbox source mutation must be provably confined: bounded copy set,
  bounded byte budgets, symlink/path-traversal rejection, exactly one
  changed tracked-shape file, no runtime Git writes, no network, cleanup
  that only ever removes a verified process-created sandbox root.
- If confinement or modified-source verification cannot be proven safely,
  STOP and report a blocker (§181/§182) rather than weakening the boundary.
- If a runtime acceptance path is ever found to have modified canonical
  source, STOP, classify `CANONICAL_RUNTIME_MUTATION_VIOLATION`, and do not
  conceal or silently absorb it into a commit.

## Acceptance criteria

See goal-mode prompt §173–§179 verbatim; restated compactly in `PLAN.md`
milestone acceptance criteria and validated in `STATE.md`'s validation
ledger. The only success verdict is `PHASE_8B_COMPLETE_SANDBOX_ONLY`.
