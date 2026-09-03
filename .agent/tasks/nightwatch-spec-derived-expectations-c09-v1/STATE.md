# Task State

## Identity

Task ID: nightwatch-spec-derived-expectations-c09-v1
Phase: SPEC_DERIVED_EXPECTATIONS_C09_V1
Status: IN_PROGRESS
Starting SHA: da369dad6c96472820790ffa4b69a773d2d26033
Last validated implementation SHA: da369dad6c96472820790ffa4b69a773d2d26033
Last substantive checkpoint SHA: da369dad6c96472820790ffa4b69a773d2d26033
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-spec-derived-expectat-4dff694d
Last checkpoint: inventory measured read-only at da369da — 332 OpenSpec scenarios which specify NIGHTWATCH rather than the product and are therefore OUTSIDE_SCOPE; the product specification is the generated OpenAPI with 642 operations, 1,891 typed properties, 30 enum definitions, 534 nested refs, 490 arrays and 0 required-key entries
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LAST_VALIDATED_IMPLEMENTATION_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LAST_SUBSTANTIVE_CHECKPOINT_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Turn product specification into mechanically checkable expectations bound to
exact operations with full provenance, classify every scenario in the corpus
rather than dropping any, and prove a specification witness alone never grants
a read-only proof.

## Current Milestone

M2 — scenario classification with totality.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured inventory.

## Work In Progress

M2 — `src/core/source/specScenarioInventory.ts`: classify all 332 scenarios
with the §42 vocabulary, totality enforced by construction.

## Exact Next Action

Write the scenario classifier so every discovered scenario receives exactly one
classification and a count assertion proves none was dropped. The `OUTSIDE_SCOPE`
verdict for the OpenSpec corpus must be PROVEN from the corpus itself — the
change directories are Nightwatch campaign records, so their scenarios specify
the tool — rather than asserted in a comment.

## Files Changed

- `.agent/tasks/nightwatch-spec-derived-expectations-c09-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/**` — new
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-09

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS |
| `openspec/` layout | only `changes/`; no `specs/`, no archive |
| OpenSpec scenarios | **332** `#### Scenario:` across 37 `spec.md`; 190 requirements; 32 change directories; 165 md files |
| historical estimate | ~823 — **refuted** by measurement |
| scenario subject matter | Nightwatch's own behaviour, e.g. "Evidence invalidates acceptance", "Auth expires during execution" — therefore no product-operation binding is possible |
| product OpenAPI operations | 591 blueapi + 51 blueinternal = **642**, all with a resolved response schema |
| typed response properties | 1,756 + 135 = **1,891** |
| enum definitions with a value set | 28 + 2 = **30** |
| nested `$ref` object properties | 523 + 11 = **534** |
| array-typed properties | 470 + 20 = **490** |
| `required` key entries | **0** in both — protobuf3 has no required, so none will be claimed |
| existing W-SPEC state | `UNSUPPORTED` / `SPEC_EXPECTATION_ANALYZER_ABSENT` |
| existing witness lattice | `READ_ONLY_PROVEN` needs one DECLARATION and one EFFECT witness; W-SPEC is `DOCUMENTARY`, so the §46 boundary is already structural |

## Decisions Made During This Task

- All 332 OpenSpec scenarios are `OUTSIDE_SCOPE`: they specify Nightwatch, not
  the product. Reading them as product expectations would have produced 332
  expectations about the wrong system.
- No `required`-key expectations will be claimed; measured 0, with a
  principled cause.
- The §46 W-SPEC boundary is DEMONSTRATED rather than re-guarded, because it is
  already structural and a second guard would duplicate authority.

## Discoveries

- "Spec-derived expectations" cannot mean "derived from our own OpenSpec".
- The `required`-key class is unavailable for a principled reason rather than
  by omission, which is worth recording so a future campaign does not look
  for it again.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

Evaluating these expectations against a running environment belongs to C-07's
DEV work and beyond. C-09 admits and does not evaluate.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-9. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-spec-derived-expectat-4dff694d`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
