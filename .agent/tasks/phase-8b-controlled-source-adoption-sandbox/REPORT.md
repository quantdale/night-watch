# Nightwatch Phase 8B — Controlled Source Adoption Sandbox — Report

- Starting SHA: `e7abed9c64252df2c3bd9809252d652bd95f045a`
- Validated implementation / substantive checkpoint SHA:
  `36495b4df2c013d671a4983cd7991e1aecd9a25e`
- Task objective: prove Nightwatch can translate one exact, current-source-
  eligible declarative regression candidate into one deterministic tracked-
  source adoption, apply it only inside a disposable owner-private source
  mirror, execute the modified sandbox evaluator, and metamorphically prove
  the effect — while the canonical checkout remains byte-for-byte untouched.
  See `SPEC.md` for the full frozen intent.

## Changes

- `src/core/selfDev/adoptedCases.ts` + `adoptedCaseCatalog.generated.ts`:
  strict versioned (`nightwatch.selfdev-adopted-case.v1`), data-only adopted-
  case catalog split across a trusted schema module and a pure-data
  generated file (the sole sandbox mutation target); base-independent
  identity; coverage always re-derived from the action registry, never
  trusted from a supplied field; deterministic canonical renderer. Catalog
  starts and remains empty in canonical source.
- `src/core/selfDev/validation.ts`: added `selfDevEquivalentFingerprint`;
  refactored `candidateEquivalentFingerprint` to delegate to it.
- `src/core/selfDev/evaluator.ts`: `SelfDevEvaluatorOptions` gained
  `seedEquivalentFingerprints`/`seedCoverageClasses`, merged into
  constructor-time state.
- `src/core/selfDev/controller.ts`, `replay.ts`: wired the same catalog
  seeding into real-session and replay evaluator construction.
- `src/core/selfDev/contract.ts`: catalog contents embedded directly in
  `SELFDEV_CONTRACT_MANIFEST`, so `contractDigest` changes automatically
  when the catalog changes.
- `src/core/selfDev/provenanceManifest.ts`, `src/core/provenance/localGit.ts`:
  new files added to `SELFDEV_AUTHORITATIVE_PATHS` and the untracked-path
  Git check.
- `src/core/selfDev/index.ts`: exported the new adopted-case surface
  (types/schema versions/validate/derive/render); did not touch `types.ts`.
- `src/core/policy/ownerScope.ts`: new `SELF_DEVELOPMENT_SANDBOX_ADOPTION`
  allowed operation.
- `src/core/selfDevSandbox/{types,validation,storage,planner,sandboxMirror,
  sandboxLoader,sandboxExecutor,index}.ts`: the new sandbox-authority
  boundary — pure deterministic planner, immutable private plan/result
  storage, disposable source mirror, bounded serial cache-isolated
  TypeScript loader, and metamorphic-verification executor.
- `bin/selfdev-adopt-sandbox.mjs`: exact-ID `inspect`/`plan`/`run` CLI with
  fixed `SANDBOX_ONLY` confirmation.
- `package.json`: `selfdev:adopt-sandbox` script.
- `bin/hardening-check.mjs`: new `checkPhase8BSandboxBoundary` (source
  coverage, forbidden-capability scan, call-graph containment).
- `.github/workflows/hardening.yml`: "Phase 8B controlled source adoption
  sandbox matrix" CI step.
- `tests/unit/selfDevAdoptionCatalog.test.ts` (7), `selfDevAdoptionPlan.test.ts`
  (12), `selfDevAdoptionSandbox.test.ts` (7), `selfDevAdoptionCli.test.ts`
  (7), `tests/unit/ownerScope.test.ts` (+1): new focused Phase 8B tests.
- `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`,
  `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md` (D-47): documentation closure.

## Tests / validation

- `npm run typecheck` — PASS (0 errors), local and isolated clean checkout.
- `npm run hardening:check` — PASS, local and isolated clean checkout.
- Focused Phase 8A/8A.1/8A.1.1/8B matrix (10 files, 90 tests) — 90/90 PASS,
  local and isolated clean checkout. The 54 pre-existing Phase 8A/8A.1/
  8A.1.1 tests pass unmodified, confirming zero behavior change from the
  empty catalog.
- Full Playwright suite — 611 passed (local dev checkout); 608 passed + 3
  environment-conditional skips (611 total, isolated clean checkout cloned
  as a sibling of the real `alphauslabs`/`mobingilabs` repos).
- `npm run campaign:synthetic` — 27/27 PASS (both checkouts).
- `npm run agent:check` — PASS (benign `CHECKPOINT_ADVANCE` warning only,
  the expected/normal state per `AGENTS.md`'s three-state model).
- `git diff --check` — clean (both checkouts).
- Secret-shape grep over the full diff — none found.
- Exact substantive CI run `31853612222` at `36495b4df2c013d671a4983cd7991e1aecd9a25e`
  — `completed`/`success`, including the dedicated "Phase 8B controlled
  source adoption sandbox matrix" step (verified green individually, not
  merely inferred from overall success).

## Real acceptance run (M16-M18)

- Fresh v2 artifact:
  `session:sha256:27dbbd7f94e360af7e9fc564e9cdabf45d3d9ae5c67e84eccc676f78f047ac46`
  bound to `36495b4df2c013d671a4983cd7991e1aecd9a25e`; `VERIFIED_EXACT_BASE`,
  replay `PASS`, `eligible: true`, one candidate.
- Plan:
  `adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`.
- Result:
  `adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7` —
  `sandboxVerificationStatus: PASS`, `adoptionStatus:
  SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`, exactly one changed file
  (the sandbox target), `sandboxSourceWrites: 1`, `canonicalSourceWrites: 0`,
  `runtimeGitWrites: 0`, `externalCalls: 0`, all four metamorphic probes
  `PASS`, `cleanupStatus: PASS`, `canonicalApply: PROHIBITED`,
  `publication: PROHIBITED`.
- Canonical-unchanged proof: `git status --short` clean;
  `src/core/selfDev/adoptedCaseCatalog.generated.ts` byte-identical before
  and after (`sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
  content still `export const SELFDEV_ADOPTED_CASES = [];`); `git rev-parse
  HEAD` unchanged; the disposable sandbox base directory exists (0700) and
  is empty — no residual mirror.

## Decisions

See `PLAN.md` Decision Log and `docs/DECISIONS.md` D-47 for full detail:
sandbox-authority split from the pure evaluation domain; two-file catalog
split (trusted schema vs. pure-data generated target); base-independent
adopted-case identity with re-derived coverage; contract binding without a
separate manifest-version bump; TOCTOU revalidation on digests rather than
HEAD-SHA equality (docs-only descendants remain runnable).

## Safety events

NONE. Zero DEV/NEXT/production contacts, product mutations, database/
infrastructure queries, external AI/model calls, publication, canonical
source writes, or Alphaus writes at any point. Development Git commits to
the private `origin` history are the existing allowed checkpoint pattern,
not runtime Git writes.

## Deferred items

- Phase 8B.1 — Owner-Gated Canonical Promotion: `NOT_STARTED`,
  `NOT_AUTHORIZED`. Not designed or scaffolded. A future separately
  authorized task should consume this phase's exact plan ID, result ID,
  source artifact ID, candidate ID, preimage/postimage digests, and pre/
  post source-bundle/contract digests rather than re-deriving adoption
  semantics.

## Remaining blockers

None.

## Recommended next phase/task

Phase 8B.1 — Owner-Gated Canonical Promotion, if and when separately
authorized by the owner. Do not start it as part of this task.
