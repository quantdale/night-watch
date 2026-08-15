# Task State

## Identity

Task ID: phase-8b-1-r1-1-project-memory-canonical-truth
Phase: 8B.1-R1.1
Status: IN_PROGRESS
Starting SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
Last validated implementation SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
Last substantive checkpoint SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-15 — implementation complete (M1-M9): defects A+B
confirmed and corrected; project-state v1 block + checker + 25 tests + CI
step + hardening guard in place; catalog regenerated (digest 401b2c67...,
semantics identical); currentness strictness regression added; docs
corrected. Entering focused validation (M10).
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: a8ba972ae7b0723c6812f982bcf93acdb17d28a5
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Correct the false generated-catalog authority header (renderer + regenerated
catalog), remove the stale generic project-level checkpoint anchors in
CURRENT_STATE (authority de-duplication, not new hashes), introduce
`nightwatch.project-state.v1` with a machine-checked CURRENT_STATE block and
read-only `npm run project:check` (+ tests + CI step), audit repository-wide
live-vs-historical truth claims, preserve promotion currentness strictness,
regenerate the one-entry catalog through the trusted renderer (entry set
unchanged), and close under continuity v2. NO variant-B adoption; NO new
promotion authority; contractDigest must stay d8012fae....

## Current Milestone

M9 — docs corrections (complete). Next: M10 — focused validation.

## Completed Milestones

- M0 — bootstrap / task creation / pre-state capture: CASE D (HEAD ==
  origin/main == a8ba972ae7b0723c6812f982bcf93acdb17d28a5, clean worktree);
  v2 task records created (SPEC/PLAN/STATE/REPORT); ACTIVE_TASK updated;
  pre-state captured: catalog count 1, raw digest
  fa7b71d472ad4656aa9019a0ca35e264da31226c8af6612f3f649a397e9e4e7e;
  adoptedCaseId adopted-case:sha256:90248aae...; equivalentFingerprint
  sha256:6a322450...; sourceBundleDigest
  sha256:1bec27108f0268903de78451a83d5be15c67303f519587c7e1a8a39e3e508281;
  contractDigest sha256:d8012faecd3d5bd4843e6257eb9edd7cec64b25c8928a0303d7d20525ed6beb7;
  fresh session session:sha256:03707b5792a277d6f85a24fce1fd2c839e6891934fef3c93b6803173edef9fc7
  (VERIFIED_EXACT_BASE, replay PASS, passCount 1, duplicate 1, rejected 1,
  SELECTED EXPAND_THEN_COLLAPSE, fixture VALID_MATRIX_EXPAND_COLLAPSE);
  catalog integrity PASS (count 1, round-trip true, clean).
- M1 — repository-wide live-truth audit: confirmed Defect A (renderer +
  module header in src/core/selfDev/adoptedCases.ts lines 4-10 + 234-238 and
  the generated file lines 4-10 carry the obsolete sandbox-only wording
  "never in this canonical checkout at runtime"); confirmed Defect B
  (CURRENT_STATE lines 67-68 generic LAST_VALIDATED_IMPLEMENTATION_SHA
  4602fac... / LAST_DOCUMENTATION_CHECKPOINT_SHA 488b4e..., Phase 8A.1-era);
  classified all term-search hits. CURRENT_STALE set: adoptedCases.ts
  (header+renderer), generated catalog, CURRENT_STATE rows 67-68 + PHASE_8_STATUS
  description line 74, ARCHITECTURE line 79 + lines 416-418, SAFETY_MODEL
  lines 1002-1005 + 1029-1031 bullet, package.json (no project:check),
  hardening.yml (no project-memory step), hardening-check.mjs (no guard),
  DECISIONS (no D-50), ROADMAP (no R1.1 tail), AGENTS (no project-memory
  rules). All other hits HISTORICAL_TRUE / TEST_FIXTURE_INTENTIONAL /
  EXAMPLE_ONLY — preserved.
- M2 — project-state authority model design (PLAN.md Architecture / Approach):
  authority hierarchy (Git / ACTIVE_TASK+v2 / CURRENT_STATE snapshot /
  renderer+validator / sandbox-mirror OR owner-gated promotion / availability
  != authority); structured block field set; checker check list §16/§20-26
  with PROJECT_STATE_* error codes; test matrix §42+§43; renderer correction
  wording plan; currentness regression test plan; decisions D-R1.1-1..5.
- M6 — renderer/module header correction in adoptedCases.ts: the corrected
  header states the two-writer partition (sandbox mirror-only / owner-gated
  canonical promotion with development-session commit / deterministic
  renderer only / no generic self-modification). Obsolete sentence removed
  from live renderer text.
- M7 — one-entry catalog deterministic regeneration via the trusted renderer:
  count 1; deep semantic equality vs committed pre-image PASS
  (adoptedCaseId 90248aae..., fingerprint 6a322450..., fixture/actions/
  assertions/coverage/strategy identical); raw digest fa7b71d4... ->
  401b2c673e8e0486f697f3af159833cca6102410f690e82731377829b1e95b6c (header
  bytes only).
- M3 — CURRENT_STATE project-state v1: generic anchor rows 67-68 removed;
  PHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA /
  PHASE_8A_1_HISTORICAL_DOCUMENTATION_CHECKPOINT_SHA rows added; PHASE_8_STATUS
  description refreshed; "Project-memory authority model" section +
  "Project-state v1 (machine-checked truth block)" section added (digest
  401b2c67...); PHASE_8B_1_R1_1_AUTHORIZATION row added.
- M4 — bin/project-state-check.mjs implemented: read-only, deterministic,
  no network/writes; reuses the established TypeScript loader + real
  validateAdoptedCatalog / renderAdoptedCatalogSource /
  selectNextSyntheticProposalVariant; spawns agent-state.mjs for ACTIVE_TASK
  continuity v2; requires clean checkout; rejects competing generic live
  anchors (PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY /
  PROJECT_STATE_DUPLICATE_DOCUMENTATION_AUTHORITY); enforces
  NEXT_PROMOTION_AUTHORITY NONE; phase-status whitelist + R1 STATE
  `Status: COMPLETE` cross-check; --root support for fixtures.
  package.json "project:check" script; hardening.yml "Project-memory truth
  check" step; hardening-check.mjs checkProjectStateIntegrity (read-only
  scan incl. bin, renderer/catalog authority wording, obsolete-sentence
  rejection, script/workflow assertions).
- M5 — tests/unit/projectState.test.ts: 25/25 PASS (matrix §42 tests 1-25
  incl. valid one-entry + valid empty fixtures, count/digest/target drift,
  protocol version, authority drift, duplicate anchors, promotion authority,
  phase statuses, validator failure propagation, renderer mismatch, duplicate
  entry through real validator, ACTIVE_TASK missing, continuity failure not
  hidden, historical fields allowed, historical prose ignored, R1 record
  missing, dirty checkout, document-as-authority rejected).
- M8 — promotion-currentness strictness regression added to
  selfDevCanonicalPromotionFlow.test.ts: full chain -> COMMITTED_EXACT ->
  authoritative source header-comment change -> strict
  CANONICAL_PROMOTION_SOURCE_MISMATCH (8/8 flow tests PASS). currentness.ts
  untouched.
- M9 — docs corrections: CURRENT_STATE (intro, phase summary, topology
  table, project-state sections, R1.1 section), ROADMAP (R1.1 tail section),
  ARCHITECTURE (module table row + Phase 8B.1 canonical-promotion paragraph),
  DECISIONS (D-50 appended), SAFETY_MODEL (historical qualifiers + R1/R1.1
  safety update section + footer), AGENTS.md (Project-memory truth section).

## Work In Progress

M10 — focused validation (typecheck / hardening / agent:check / agent:audit /
focused matrices).

## Exact Next Action

Run M10 focused validation: npm run typecheck; npm run hardening:check; npm
run agent:check; npm run agent:audit; npm run project:check (expected
CHECKOUT_DIRTY until M13 commit); catalog-integrity tests
(selfDevAdoptionCatalog), project-state tests, portfolio tests,
provenance/replay tests, canonical promotion currentness tests, owner scope
tests.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/phase-8b-1-r1-1-project-memory-canonical-truth/{SPEC,PLAN,STATE,REPORT}.md` | R1.1 v2 task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to R1.1 IN_PROGRESS | docs |
| `src/core/selfDev/adoptedCases.ts` | Defect A: module header + renderer header authority correction | implementation |
| `src/core/selfDev/adoptedCaseCatalog.generated.ts` | regenerated through the trusted renderer (header only; entry set unchanged) | implementation |
| `docs/CURRENT_STATE.md` | Defect B: generic anchors removed, historical rows added, project-state v1 block + authority model + R1.1 section | docs |
| `bin/project-state-check.mjs` | new read-only project-state truth checker | implementation |
| `package.json` | `project:check` script | implementation |
| `.github/workflows/hardening.yml` | "Project-memory truth check" step | implementation |
| `bin/hardening-check.mjs` | `checkProjectStateIntegrity` + read-only scan extension | implementation |
| `tests/unit/projectState.test.ts` | 25-test project-state matrix | implementation |
| `tests/unit/selfDevCanonicalPromotionFlow.test.ts` | currentness strictness regression (SOURCE_MISMATCH after source change) | implementation |
| `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/SAFETY_MODEL.md`, `AGENTS.md` | R1.1 truth corrections (D-50, R1.1 tail, authority wording, safety update, project-memory rules) | docs |

## Validation Ledger

Command: bootstrap git checks — PASS (CASE D, HEAD == origin/main == a8ba972)
Command: `node bin/selfdev-catalog-integrity.mjs` — PASS count 1 digest
fa7b71d4..., round-trip true, clean
Command: `npm run selfdev:synthetic` — SESSION PASS, trust VERIFIED_EXACT_BASE,
replay PASS, passCount 1, selected EXPAND_THEN_COLLAPSE, artifact
03707b57...

## Decisions Made During This Task

D-R1.1-1..5 — see PLAN.md Decision Log.

## Discoveries

- The R1 `CANONICAL_PROMOTION_COMMITTED_EXACT` currentness vocabulary lives
  in src/core/selfDevPromotion/currentness.ts; a later authoritative-source
  change is expected to yield CANONICAL_PROMOTION_SOURCE_MISMATCH for the R1
  verification — the correct strict result, not a defect.

## Blockers

None.

## Safety Events

NONE. Zero DEV/NEXT/production contacts, DB/infra queries, external AI/model
calls, publication, promotion prepares/approvals/APPLYs, adopted-case
mutations.

## Deferred / Follow-Up

- Variant B (EXPAND_THEN_COLLAPSE) AVAILABLE_NOT_ADOPTED; separate
  authorization required.
- Portfolio expansion beyond A+B.

## Resume Recipe

1. Read SPEC.md, PLAN.md, STATE.md.
2. Continue from Exact Next Action (M3).

## Completion Snapshot

(not yet complete)
