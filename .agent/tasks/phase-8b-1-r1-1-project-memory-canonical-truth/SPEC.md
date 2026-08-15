# Nightwatch Phase 8B.1-R1.1 —
# Project-Memory & Canonical-Source Truth Hardening

Status: IN_PROGRESS (frozen intent; PLAN.md is living)
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
PHASE_8B_1_R1_1_STATUS: IN_PROGRESS

## Purpose

Harden project-level durable truth after Phase 8B.1-R1:

1. Correct the false generated-catalog authority header (Defect A):
   `renderAdoptedCatalogSource()` in `src/core/selfDev/adoptedCases.ts` and the
   regenerated `adoptedCaseCatalog.generated.ts` must describe BOTH the
   Phase 8B sandbox mirror-only write authority AND the separately
   owner-gated Phase 8B.1 canonical-promotion write authority — never a
   generic runtime mutation authority. The obsolete exact sentence "never in
   this canonical checkout at runtime" must leave live renderer text.
2. Correct the stale generic project-level checkpoint anchors in
   `docs/CURRENT_STATE.md` (Defect B): `LAST_VALIDATED_IMPLEMENTATION_SHA`
   `4602fac...` / `LAST_DOCUMENTATION_CHECKPOINT_SHA` `488b4e...` are
   Phase 8A.1-era duplicates of authority already owned by Git and the strict
   continuity-v2 task system. Root cause: CURRENT_STATE duplicated live
   authority; fix is de-duplication (authority pointers), NOT newer hashes.
3. Introduce the versioned project-memory protocol
   `nightwatch.project-state.v1` with a machine-checked structured truth
   block in CURRENT_STATE, a deterministic read-only `npm run project:check`
   (`bin/project-state-check.mjs`), focused tests, and a CI
   "Project-memory truth check" step.
4. Re-audit repository-wide CURRENT vs HISTORICAL truth claims; correct only
   CURRENT_STALE claims; preserve all historical records and promotion
   provenance exactness.

## Scope

- Source: `src/core/selfDev/adoptedCases.ts` (module header + renderer header
  only — no semantic logic), regenerated one-entry catalog via the trusted
  renderer (entry set unchanged).
- New tooling: `bin/project-state-check.mjs`, `npm run project:check`,
  `tests/unit/projectState.test.ts`, hardening guard, CI step.
- Docs: CURRENT_STATE, ROADMAP, ARCHITECTURE, DECISIONS (new decision only),
  SAFETY_MODEL (stale canonical-mutation claims only), AGENTS.md (concise
  project-memory rules).
- Promotion currentness: add a regression test proving an authoritative
  source change after a verified promotion correctly fails exact
  source/currentness matching — no weakening.

## Non-Goals

- NO variant-B adoption; NO new promotion intent/approval/APPLY.
- NO change to the catalog ENTRY SET (count stays exactly 1, semantic fields
  byte-identical apart from generated header bytes).
- NO evaluator/adoption semantics change: `contractDigest` must stay
  `sha256:d8012fae...`.
- NO promotion currentness logic change.
- NO product / data / infra / AI / DEV / NEXT / production activity.
- NO rewriting of historical phase records or decisions.
- NO second implementation of selfDev/portfolio semantics in the checker.

## Safety Constraints

- Checker is deterministic, local, read-only, no network, no fs writes, no
  model, no DB/infra, no user-supplied catalog path.
- Catalog regeneration happens through the real renderer only.
- If `contractDigest` changes: STOP and investigate before proceeding.
- If catalog semantic entry fields change: STOP.
- Historical R1 verification stays historical exact evidence; after the
  source change, current source is a later validated state (strict
  provenance, not semantic closeness).

## Milestones

M0 bootstrap/task creation/pre-state capture
M1 repository-wide live-truth audit
M2 project-state authority model design
M3 project-state v1 structured CURRENT_STATE block
M4 project:check implementation
M5 project:check tests
M6 catalog renderer/header authority correction
M7 one-entry catalog deterministic regeneration
M8 promotion-currentness strictness regression
M9 CURRENT_STATE / ROADMAP / ARCHITECTURE / DECISIONS / AGENTS corrections
M10 focused validation
M11 full regression
M12 isolated checkout
M13 source-bearing implementation commit + push + exact CI
M14 fresh current-source selfDev continuation proof
M15 v2 docs closure
M16 final exact CI / project:check / agent:audit
M17 STOP + report

## Validation Strategy

- `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`,
  `npm run agent:audit`, `npm run project:check`
- catalog-integrity, project-state focused tests, selfDev adopted catalog
  tests, portfolio tests, provenance/replay tests, canonical promotion
  currentness tests, owner scope tests
- `npm run test:owner-provenance`, `npm run campaign:synthetic`
- Phase 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1/8B.1.0 matrices
- full unfiltered Playwright `--project=nightwatch --workers=1`
- `git diff --check`; isolated full-history checkout
- exact CI at source-bearing SHA and final SHA

## Decision Log

- (living) see PLAN.md Decision Log.

## Discoveries

- (living) see PLAN.md.

## Deferred Work

- Variant B adoption (separate authorization).
- Portfolio expansion beyond A+B.

## Completion Criteria

Acceptance sections 63–69 of the task authorization (catalog truth, project
memory, project-state protocol, repository audit, validation,
current-source continuation, remote) all satisfied; final verdict
`PHASE_8B_1_R1_1_COMPLETE_PROJECT_TRUTH_HARDENED`.
