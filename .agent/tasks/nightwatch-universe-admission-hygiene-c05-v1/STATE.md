# Task State

## Identity

Task ID: nightwatch-universe-admission-hygiene-c05-v1
Phase: UNIVERSE_ADMISSION_HYGIENE_C05_V1
Status: IN_PROGRESS
Starting SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last validated implementation SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last substantive checkpoint SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-universe-admission-hy-418aba0f
Last checkpoint: baseline measured read-only at 210cd0c — 149 repositories discovered, 6 admitted, 143 unapproved; 1,745 operations (blueapi 1,181 / ouchan 341 / ripple-api 223); 10 of 18 persisted remote-tracking Git fields diverged from live; blueinternal openapiv2 measured at 51 operations and wave-api at 55 route keys
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_VALIDATED_IMPLEMENTATION_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Separate discovery from admission, make the owner-approved universe a single
authority, stop persisting mutable Git state as normative configuration, prove
at the read boundary that an unapproved repository is never read, and admit
exactly the two owner-named repositories.

## Current Milestone

M2 — one admission authority, with discovery separated from admission.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured baseline.

## Work In Progress

M2 — collapsing the two-list admission intersection into one canonical
owner-approved authority, and adding discovery as an admission-free operation.

## Exact Next Action

Introduce the canonical admission authority so that
`PHASE25_APPROVED_REPOSITORY_IDS` becomes a projection of ONE owner-approved
statement rather than `RIPPLE_REPOSITORIES(scope IN_SCOPE)` intersected with
the keys of `APPROVED_ROOTS`. A repository named in one and absent from the
other must become a declared error instead of a silent non-admission. Then add
the admission-free discovery operation and assert that 149 discovered with 6
admitted grants nothing.

## Files Changed

- `.agent/tasks/nightwatch-universe-admission-hygiene-c05-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/**` — new
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-05

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS, `WORKSPACE_INTEGRITY_SATISFIED` |
| repository discovery census (read-only) | 149 git repositories at depth ≤ 3; 6 admitted; 143 unapproved |
| `nightwatch-intelligence source-gaps` at 210cd0c | 1,745 operations; blueapi 1,181 / ouchan 341 / ripple-api 223; limit 4,096; dropped 0; enumeration TRUNCATED; contentRead COMPLETE; state UNKNOWN; `remainingUnknown: true` |
| persisted vs live Git state, checkout-local fields | 18/18 accurate |
| persisted vs live Git state, remote-tracking fields | **10 of 18 diverged** — ouchan `behind: 25` vs live 310; ripple-ui 21 vs 74; blueapi 2 vs 15; ripple-api 0 vs 12; blue-sdk-go 1 vs 6 |
| `blueinternal/openapiv2/apidocs.swagger.json` | Swagger 2.0, 46 paths, **51 operations**, all with `operationId`, 84 definitions (historical estimate ~57 refuted) |
| `mobingilabs/wave-api` | PHP, 59 files, layout identical to ripple-api, **55 route keys** in the parser's existing form |

## Decisions Made During This Task

- Report 51 blueinternal operations rather than the historical ~57; the
  historical figure is preserved and refuted explicitly.
- Admit `mobingilabs/wave-api` through the existing YAML route parser with no
  parser change; its key form matches and the parser is indent-relative.
- Frame the persisted-Git-state defect as a divergence-detection failure, not a
  stale-value incident: the checkout-local fields are currently accurate, so
  "the data is stale" would be a false claim.

## Discoveries

- `wave-api` resolves to `mobingilabs/wave-api`, not a top-level directory.
  Assuming the literal name would have failed.
- Three sibling-root-shaped directories sit beside the real org directories
  (`nightwatch-isolated-20-sibling-root`,
  `nightwatch-isolated-20-final-sibling-root`,
  `nightwatch-reliability-yield-and-state-protocol-v1`). They are outside the
  Nightwatch repository, so C-05 may only report them; R-13 §105 owns
  classifying fixture-vs-leak and no removal is authorized here.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

R-13 §105 owns the leftover sibling-root directories. A future reliability
campaign owns the 59 non-campaign infrastructure suites outside the gate
manifests.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-10. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-universe-admission-hy-418aba0f`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
