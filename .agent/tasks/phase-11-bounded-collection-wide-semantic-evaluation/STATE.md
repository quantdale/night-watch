# Task State

## Identity

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Phase: 11A-COLLECTION-WIDE-SEMANTIC
Title: Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Status: IN_PROGRESS
Starting SHA: b4a34e53ae7342def056dd135eb0f0abb6b43902
Last validated implementation SHA: 6158ef436a306d48b4399978df454f27a3d021a0
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: b4a34e53ae7342def056dd135eb0f0abb6b43902
LAST_VALIDATED_IMPLEMENTATION_SHA: 6158ef436a306d48b4399978df454f27a3d021a0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6158ef436a306d48b4399978df454f27a3d021a0
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_STATUS: IN_PROGRESS
PHASE_11_COLLECTION_WIDE_SEMANTIC: IN_PROGRESS
PHASE_11B_DEV_ACCEPTANCE: NOT_AUTHORIZED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_10B (unchanged): COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_10B_DEV_RESULT (unchanged): PASS
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Objective

Execute the owner-authorized Phase 11A implementation from the canonical remote task
package. Remove the confirmed item-0-only blind spot using explicit bounded collection
scope over the existing safe projection; preserve historical positional semantics; make
partial coverage load-bearing; aggregate findings without per-row explosion; prove
later-row detection, zero benign false positives, zero privacy leakage, deterministic
behavior, historical Phase 9/10 compatibility, complete regression, exact CI; then close
under continuity v2 and STOP. No DEV.

## Current Milestone

M8 — FULL LOCAL VALIDATION IN PROGRESS.

All Phase 11 source implementation, corpus, tests, and hardening have been completed.
Full local validation is in progress: running Phase 11 matrix, complete Playwright
regression, isolated/source-equivalent regression, and all acceptance checks.

## Completed Milestones

- Pre-task design review COMPLETE under D-61: confirmed
  `COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP`; selected
  `BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION`; Phase 11 designed.
- Owner explicitly authorized Phase 11A implementation on 2026-08-17 and requested
  spec-driven execution with the durable task package stored on GitHub.
- Normative implementation design published:
  `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`.
- Frozen SPEC and execution PLAN published under this task directory.
- M0 — Fresh bootstrap and durable recovery COMPLETE.
- M1 — Permanent pre-fix baseline proof COMPLETE.
- M2 — Explicit collection-scope and identity design COMPLETE.
- M3 — Coverage-state evaluation COMPLETE.
- M4 — Aggregate findings and versioning COMPLETE.
- M5 — Phase 11 corpus COMPLETE.
- M6 — Focused Phase 11 matrices COMPLETE.
- M7 — Hardening and CI COMPLETE.

## Work In Progress

M8 full local validation is in progress. Running Phase 11 matrix, complete Playwright
regression, isolated/source-equivalent regression, and all acceptance checks.

## Exact Next Action

Complete M8 validation:
1. Run Phase 11 matrix: `npx playwright test tests/unit/phase11CollectionWide.test.ts --workers=1`
2. Run complete Playwright regression.
3. Run isolated/source-equivalent regression.
4. Run `npm run agent:check`, `npm run project:check`, `npm run agent:audit`.
5. Record validation results and advance to M9.

## Scope Boundaries

Authorized: local Nightwatch source/tests/corpus/hardening/CI/docs changes required by the
Phase 11 SPEC; normal validated Nightwatch development commits/pushes.

Not authorized: DEV/NEXT/production, product mutations, DB/data-layer, infrastructure,
new product surfaces, Alphaus writes, real campaign/minimization repair, differential,
AI/model execution or authority, Phase 6, selfDev/promotion/catalog/B adoption,
publication.

## Decisions Made During This Task

- D-61: selected `BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION` as Phase 11 architecture.
- Owner authorized Phase 11A implementation on 2026-08-17.
- Spec package published to canonical remote for durable execution.

## Discoveries

- All four real collection expectations are item-0-only; later-row defects are never
  detected by current evaluation.
- `CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT` — projector comment overstates current
  truncation handling.
- Real minimization reduced-candidate replay gap remains CURRENT but NEXT_AFTER.

## Blockers

None. Phase 11A implementation is authorized and execution-ready.

## Safety Events

No safety events during spec publication. Phase 11A scope is strictly local/synthetic.

## Deferred / Follow-Up

- Real minimization gap repair (NEXT_AFTER, not Phase 11 scope).
- Phase 11B DEV acceptance (requires separate owner authorization).
- High-confidence real semantic triage (NEXT_AFTER unless new evidence).

## Resume Recipe

Fresh CLI executor:
1. `git fetch origin` in the canonical Nightwatch repository.
2. Require clean `main` and `HEAD == origin/main`; Git wins over conversational context.
3. Read `AGENTS.md`, `.agent/ACTIVE_TASK.md`, this task's SPEC/PLAN/STATE, and
   `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`.
4. Run the read-only continuity/project checks.
5. Execute the task from M0, beginning with permanent pre-fix baseline reproduction.

## Completion Snapshot

No completion snapshot. Phase 11A is IN_PROGRESS; implementation has not yet been
claimed. Completion requires terminal CI green, continuity strict-v2 clean, and
STOP token.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md` | normative implementation design | docs (created) |
| `.agent/tasks/phase-11-bounded-collection-wide-semantic-evaluation/SPEC.md` | frozen owner-authorized intent | docs (created) |
| `.agent/tasks/phase-11-bounded-collection-wide-semantic-evaluation/PLAN.md` | living execution plan | docs (modified) |
| `.agent/tasks/phase-11-bounded-collection-wide-semantic-evaluation/STATE.md` | strict-v2 current waypoint | docs (modified) |
| `.agent/tasks/phase-11-bounded-collection-wide-semantic-evaluation/REPORT.md` | execution report shell | docs (modified) |
| `.agent/ACTIVE_TASK.md` | route future sessions to Phase 11 | docs (modified) |
| `.github/workflows/hardening.yml` | CI workflow step for Phase 11 | docs (modified) |
| `src/oracles/expectations/types.ts` | collection-wide expectation types | source (modified) |
| `src/oracles/invariants/evaluate.ts` | collection-wide invariant evaluation | source (modified) |
| `src/oracles/invariants/types.ts` | collection-wide invariant types | source (modified) |
| `src/oracles/semantic/hook.ts` | collection-wide semantic hook | source (modified) |
| `src/oracles/semantic/oracle.ts` | collection-wide semantic oracle | source (modified) |
| `src/oracles/semantic/receipts.ts` | collection-wide semantic receipts | source (modified) |
| `corpus/phase11/` | Phase 11 test fixtures | corpus (created) |
| `tests/unit/phase11CollectionWide.test.ts` | Phase 11 matrix tests | tests (created) |

## Validation Ledger

- Pre-package Git authority check: `origin/main` was exactly
  `b4a34e53ae7342def056dd135eb0f0abb6b43902`, the accepted post-Phase-10 design
  closure.
- Live HEAD after package publication: `6158ef436a306d48b4399978df454f27a3d021a0`
  (discovered from Git).
- Phase 11 source implementation: 6 source files modified, 1 corpus directory created,
  1 test file created.
- M0-M7 milestones completed.
- M8 full local validation in progress.
- Phase 11 matrix test file exists: `tests/unit/phase11CollectionWide.test.ts`
- CI workflow step added: Phase 11 bounded collection-wide semantic evaluation matrix.

## Known Findings / Design Constraints

- `CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP` — all current real collection item contracts
  are item-0-only.
- `CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT` — projector comment overstates current
  truncation handling; correct behavior first, then comment.
- Real minimization reduced-candidate replay gap remains CURRENT but NEXT_AFTER; do not
  fix in Phase 11.
- Collection scope must be explicit; generic positional SafePath semantics remain fixed.
- Uninspected tail may create uncertainty but never full semantic certainty.

## Stop Conditions

Use the exact blocker classes defined in SPEC §13. Do not broaden authority to avoid a
blocker.
