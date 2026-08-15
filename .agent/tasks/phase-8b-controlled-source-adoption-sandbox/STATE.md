# Task State

## Identity

Task ID: phase-8b-controlled-source-adoption-sandbox
Phase: 8B — Controlled Source Adoption Sandbox
Status: IN_PROGRESS
Starting SHA: e7abed9c64252df2c3bd9809252d652bd95f045a
Last validated implementation SHA: f04bb928890b8d730665b24cfd303386608b2a5a
Last substantive checkpoint SHA: f04bb928890b8d730665b24cfd303386608b2a5a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-15 — task scaffolding created; git bootstrap
verified (HEAD == origin/main == e7abed9c64252df2c3bd9809252d652bd95f045a,
clean worktree); durable docs (AGENTS.md, docs/CURRENT_STATE.md,
docs/SAFETY_MODEL.md, .agent/ACTIVE_TASK.md) read; architecture research
agent dispatched over src/core/selfDev/*, provenance/localGit.ts,
policy/ownerScope.ts, policy/privateArtifacts.ts, selfdev-*.mjs,
hardening-check.mjs, selfDev*.test.ts, package.json, hardening.yml,
DECISIONS.md, ROADMAP.md, ARCHITECTURE.md.

STARTING_SHA: e7abed9c64252df2c3bd9809252d652bd95f045a
LAST_VALIDATED_IMPLEMENTATION_SHA: f04bb928890b8d730665b24cfd303386608b2a5a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f04bb928890b8d730665b24cfd303386608b2a5a
LIVE_HEAD_AUTHORITY: GIT

## Objective

Implement Phase 8B per SPEC.md/PLAN.md: one deterministic, sandbox-confined
source adoption of an eligible declarative regression candidate, with
metamorphic proof and zero canonical mutation.

## Current Milestone

Milestone ID: M8 — Metamorphic adoption verification (end-to-end test)
Status: IN_PROGRESS
What is being attempted: M1-M7 implemented and independently validated
(catalog: 7/7 tests; planner: 12/12 tests; typecheck/hardening PASS). Now
writing the full end-to-end sandbox-executor test
(tests/unit/selfDevAdoptionSandbox.test.ts) to exercise the mirror/write/
load/metamorphic-probe flow for real and catch integration bugs the
planner/catalog unit tests can't reach.

## Completed Milestones

- **M0**: Git bootstrap verified: root, branch `main`, clean worktree,
  `HEAD == origin/main == e7abed9c64252df2c3bd9809252d652bd95f045a`. Durable
  docs read. Task directory created with SPEC/PLAN/STATE/REPORT.md,
  ACTIVE_TASK.md updated. Committed and pushed as `4152f72` (task-init-only
  checkpoint, no implementation source changed), `HEAD == origin/main`
  reconfirmed at `4152f726bd6087724fd5609f549eefca579edf03`.
- **Architecture research** (background agent): exhaustive map of exact
  types/signatures/constants for types.ts, validation.ts, canonical.ts,
  registry.ts, proposer.ts, evaluator.ts (incl. constructor/state-seeding
  gap), replay.ts, trust.ts, controller.ts, storage.ts, contract.ts,
  provenanceManifest.ts, index.ts (public/internal boundary),
  provenance/localGit.ts, policy/ownerScope.ts, policy/privateArtifacts.ts,
  bin/selfdev-*.mjs, hardening-check.mjs (every distinct rule), all 5
  selfDev test files' coverage shape, package.json/tsconfig/hardening.yml,
  and docs/DECISIONS.md, docs/ROADMAP.md, docs/ARCHITECTURE.md tail
  structure/style. Full report captured in conversation; key extension
  points identified (see Decisions).

## Work In Progress

M1-M7 implementation complete: src/core/selfDevSandbox/{types,validation,
storage,planner,sandboxMirror,sandboxLoader,sandboxExecutor,index}.ts,
bin/selfdev-adopt-sandbox.mjs, package.json script, hardening-check.mjs
`checkPhase8BSandboxBoundary`, provenanceManifest.ts + localGit.ts updated
for the new authoritative paths. Catalog tests (7/7) and planner tests
(12/12) pass; typecheck and hardening:check both PASS. Now writing the
end-to-end sandbox-executor test.

## Exact Next Action

1. Write and iterate tests/unit/selfDevAdoptionSandbox.test.ts against the
   real sandboxExecutor.runSandboxAdoption implementation until green (this
   is expected to surface integration bugs — module loader path resolution,
   digest mismatches, probe construction — since it's the first real
   end-to-end exercise of the mirror/write/load/probe/cleanup chain).
2. Write tests/unit/selfDevAdoptionCli.test.ts (--help, forbidden options,
   wrong confirmation, inspect/plan/run live-process smoke, mirroring
   selfDevCli.test.ts's style).
3. Add owner-policy regression coverage (SELF_DEVELOPMENT_SANDBOX_ADOPTION
   allowed, SELF_DEVELOPMENT_CANONICAL_ADOPTION blocked) — likely appended
   to one of the new test files rather than a new file.
4. Add the "Phase 8B controlled source adoption sandbox matrix" CI step to
   .github/workflows/hardening.yml (mirroring the Phase 8A.1.1 step shape),
   listing the new test files.
5. Run full regression (typecheck, hardening, full Playwright, synthetic
   campaign, agent:check, git diff --check) + isolated clean checkout
   (M12/M13), then architecture review + substantive commit/push + exact CI
   (M14/M15), then the real acceptance run (M16-M18), then docs closure
   (M19/M20).

## Completed Milestones (M1-M3 detail)

- M1/M2: created src/core/selfDev/adoptedCaseCatalog.generated.ts (empty
  pure-data sandbox target) and src/core/selfDev/adoptedCases.ts (schema
  nightwatch.selfdev-adopted-case.v1, base-independent adoptedCaseId,
  coverage always re-derived from the action registry — never trusted from
  a supplied field — strict validateAdoptedCase/validateAdoptedCatalog,
  deterministic renderAdoptedCatalogSource). Added
  selfDevEquivalentFingerprint(fixtureId, actionIds, assertionIds) to
  validation.ts and refactored candidateEquivalentFingerprint to delegate to
  it. Extended SelfDevEvaluatorOptions/constructor in evaluator.ts with
  seedEquivalentFingerprints/seedCoverageClasses merged into the state Sets
  at construction. Wired the same seeding into controller.ts's real-session
  evaluator construction and replay.ts's replay evaluator construction (both
  now call selfDevAdoptedEquivalentFingerprints()/selfDevAdoptedCoverageClasses()
  from adoptedCases.ts) so replay stays byte-exact once the catalog is
  non-empty in a sandbox. Exported the new adopted-case surface (types,
  schema version consts, validate/derive/render functions, budget/target-path
  consts) from src/core/selfDev/index.ts; did NOT touch types.ts (kept the
  new schema local to adoptedCases.ts to minimize footprint on a heavily
  hardening-scrutinized file).
- M3: bound the adopted catalog into contractDigest by including
  adoptedCaseSchemaVersion/adoptionStrategyVersion/adoptionStrategyClass/
  adoptedCatalogMaxEntries/adoptedCases (the live catalog contents) directly
  in SELFDEV_CONTRACT_MANIFEST — so contractDigest changes automatically
  whenever the catalog changes, with no separate SELFDEV_CONTRACT_MANIFEST_VERSION
  bump needed (same reasoning precedent as D-46: the manifest *shape* adding
  new bound fields is itself covered by the unchanged version constant,
  matching how Phase 8A.1.1 advanced sourceBundleDigest without a version
  bump). Added adoptedCaseCatalog.generated.ts and adoptedCases.ts to
  SELFDEV_AUTHORITATIVE_PATHS in provenanceManifest.ts.
- Validation: `npm run typecheck` PASS. Focused suite
  (selfDevSchema/selfDev/selfDevProvenance/selfDevCli/selfDevEligibility,
  54 tests) — 54/54 PASS, confirming the empty catalog produces zero
  behavior change vs. pre-Phase-8B baseline (goal-mode §21 requirement).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/phase-8b-controlled-source-adoption-sandbox/SPEC.md` | Frozen task intent | Created |
| `.agent/tasks/phase-8b-controlled-source-adoption-sandbox/PLAN.md` | Living execution plan | Created |
| `.agent/tasks/phase-8b-controlled-source-adoption-sandbox/STATE.md` | Waypoint | Created |
| `.agent/tasks/phase-8b-controlled-source-adoption-sandbox/REPORT.md` | Handoff stub | Pending |
| `.agent/ACTIVE_TASK.md` | Point at Phase 8B task | Pending |

## Validation Ledger

Command: `git rev-parse --show-toplevel && git status --short && git branch --show-current && git remote -v && git fetch origin && git rev-parse HEAD && git rev-parse origin/main`
Result: PASS
When: 2026-08-15
Relevant failure/output summary: root correct, status clean, branch main,
origin -> quantdale/night-watch, HEAD == origin/main ==
e7abed9c64252df2c3bd9809252d652bd95f045a.

## Decisions Made During This Task

Decision: create `src/core/selfDevSandbox/` as a distinct authority boundary
from `src/core/selfDev/`.
Reason: goal-mode prompt explicitly requests preserving the pure
deterministic trust/evaluation domain separately from sandbox filesystem
authority.
Evidence/constraint: goal-mode prompt §24; prior phases' pattern of narrow
unexported authority boundaries (e.g. Phase 7B.2.1 `ownerDecision.ts`).

Decision: split the adopted-case catalog into two files —
`src/core/selfDev/adoptedCases.ts` (hand-written schema/validation/ID/
fingerprint/renderer logic, trusted) and
`src/core/selfDev/adoptedCaseCatalog.generated.ts` (the actual sandbox
mutation target — pure data, a single `export const SELFDEV_ADOPTED_CASES =
[...]` array literal with no imports/functions/logic).
Reason: goal-mode prompt §30/§83 requires the sandbox-mutable target to be
strictly data-only (no imports beyond what's explicitly required, no
functions) and requires the renderer to produce "canonical source bytes";
a single merged file would force either the schema/validation logic to be
part of the sandbox-write target (violating data-only-ness) or the renderer
to regenerate hand-written validation code (unsafe/unnecessary). Splitting
lets hardening enforce data-only-ness on a small, easily-audited file while
`adoptedCases.ts` stays normal trusted source.
Evidence: architecture research report's summary of hardening's
`checkSelfDevelopmentBoundary` pattern (structural regex over exact file
content) — the same pattern extends cleanly to a small generated file but
would be fragile against a large hand-written module.
Consequence: both files must be added to `SELFDEV_AUTHORITATIVE_PATHS`; the
sandbox executor's "exactly one changed tracked-shape file" target is
`adoptedCaseCatalog.generated.ts`, not `adoptedCases.ts`. Recorded as a
deliberate deviation from the goal-mode prompt's suggested single-path
`src/core/selfDev/adoptedCases.ts` per AGENTS.md precedence (current
implementation/architecture reasoning outranks the prompt's literal
suggestion when the prompt itself says "if current repository architecture
supports an obviously stronger equivalent, use it and document why" — §13).

Decision: add `selfDevEquivalentFingerprint(fixtureId, actionIds,
assertionIds)` as a new exported function in `validation.ts`, and refactor
`candidateEquivalentFingerprint` to delegate to it.
Reason: goal-mode §17 requires the adopted-case catalog to reuse the exact
same source-derived equivalent-fingerprint concept, not reimplement it, so a
catalog entry's `equivalentFingerprint` seeds the evaluator's
`equivalentFingerprints` Set with a value that genuinely matches what a
real candidate with the same fixture/actions/assertions would compute.
Evidence: research report's exact quote of `candidateEquivalentFingerprint`
in validation.ts. This is a source change to an authoritative-path file but
adds no new forbidden field/capability and does not disturb any of
hardening's existing exact-string assertions on validation.ts.

Decision: extend `SelfDevEvaluatorOptions` with optional `seedEquivalentFingerprints?: readonly string[]` and `seedCoverageClasses?: readonly string[]`, merged into the constructor's `state` Sets at construction time.
Reason: the evaluator's `state` fields are `readonly`-reference `Set`s
initialized once in a class-field initializer with no existing seeding
hook; goal-mode §19 requires catalog entries to seed baseline fingerprints/
coverage without executing arbitrary behavior — a plain data merge at
construction time satisfies this with a minimal, auditable diff.
Evidence: research report's exact quote of the `SelfDevEvaluator`
constructor/class-field state.

## Discoveries

- (none yet beyond confirming the goal-mode prompt's claimed baseline is
  accurate against live Git and durable docs)

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Phase 8B.1 — Owner-Gated Canonical Promotion (NOT_STARTED, not authorized,
  task directory must not be created during Phase 8B).

## Resume Recipe

1. Read SPEC.md.
2. Read PLAN.md.
3. Inspect `git status` and current SHA; confirm `HEAD == origin/main`
   unless mid-implementation with intentional local commits pending push.
4. Run the smallest relevant validation for the current milestone.
5. Continue Exact Next Action above.

## Completion Snapshot

(populate only at Phase 8B completion)
