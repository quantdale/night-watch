# Task State

## Identity

Task ID: nightwatch-deployment-fact-binding-c08-v1
Phase: DEPLOYMENT_FACT_BINDING_C08_V1
Status: IN_PROGRESS
Starting SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last validated implementation SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last substantive checkpoint SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-deployment-fact-bindi-9d9f8b7b
Last checkpoint: evidence survey completed read-only at 43cff07 — the mochi manifests are absent (verified four independent ways), so U-1 and U-2 stay UNKNOWN and C-08b is blocked; ouchan/build/config.yaml supports a negative deployment fact while the ripple-ui host matrix is client configuration and therefore SOURCE_FACT
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_VALIDATED_IMPLEMENTATION_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Give every source operation an explicit deployment-binding classification, so
that "we do not know where this runs" is a recorded fact naming the missing
hop rather than an absent field.

## Current Milestone

M2 — the binding model, its three-hop chain and its state vocabulary.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured evidence survey.

## Work In Progress

M2 — `src/core/source/deploymentBinding.ts`: one binding per operation,
carrying an explicit `ROUTE_TO_HOST → HOST_TO_SERVICE → SERVICE_TO_DEPLOYMENT`
chain rather than one flat state.

## Exact Next Action

Write the binding model with the chain and the `EXACT` / `PARTIAL` / `UNKNOWN`
/ `UNSUPPORTED` / `STALE` / `AMBIGUOUS` vocabulary, reusing C-15b's
`FACT_CATEGORIES` and its strength ordering rather than inventing a parallel
one. A chain whose earlier hop is established and later hop is not must be
`PARTIAL`, because that is the expected steady state here and is strictly more
informative than `UNKNOWN`.

## Files Changed

- `.agent/tasks/nightwatch-deployment-fact-binding-c08-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/**` — new
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-08

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS |
| operation population at 43cff07 | 1,851 — blueapi 1,181 / ouchan 341 / ripple-api 223 / wave-api 55 / blueinternal 51 |
| `ouchan/services/` service count | 131 |
| mochi repository present at depth ≤ 2 | **NO** |
| any `ingress.yaml` under the sibling root | **NONE** |
| any `appproxy` / `serviceproxy` directory | **NONE** |
| `remote.origin.url` mentioning mochi across ~160 repositories | **NONE** |
| the two `mochi*` paths found | `blueinternal/mochi/v1`, `blue-internal-go/mochi/v1` — protobuf for a SERVICE named mochi, not the manifest repository |
| `ouchan/build/config.yaml` | present; per-branch build EXCLUSIONS over `qa` / `next` / `production`, `build_all: false` |
| `ripple-ui/src/config/common.js` | present, 8,989 bytes; route-prefix × environment → host matrix |
| U-2 services in `ouchan/services/` | `rbac` PRESENT, `user` PRESENT, `openid-connect-server` PRESENT, `gateway` ABSENT, `safe-box` ABSENT |
| `ouchan/kubeconf-dev.yaml` | exists; top-level key shape observed only, NO value read, and deliberately not used |

## Decisions Made During This Task

- The `ripple-ui` host matrix is SOURCE_FACT, not DEPLOYMENT_FACT: it is
  committed CLIENT configuration saying what the frontend calls, which is a
  different claim from what the infrastructure serves. Consequence: the
  positive route→endpoint `DEPLOYMENT_FACT` count may legitimately be zero.
- The binding is an explicit three-hop CHAIN, not one flat state, because the
  campaign's real product is knowing WHICH hop is missing.
- Only the NEGATIVE direction is admitted from build exclusions: exclusion on
  a branch proves not-deployed-there, while non-exclusion proves eligibility
  and not deployment.

## Discoveries

- The route → runtime-endpoint chain breaks at a nameable place:
  `route ──SOURCE_FACT──▶ host ──U-1──▶ k8s service ──U-2──▶ deployed?`, and
  both unknowns share the single blocker of an unavailable `mochi`.
- Two of U-2's five named services are absent from `ouchan/services/`
  entirely, which constrains deployment without settling it.

## Blockers

None for C-08. C-08b is `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, which C-08
records as the reason U-1 and U-2 stay UNKNOWN rather than working around.

## Safety Events

NONE

## Deferred / Follow-Up

C-08b owns U-1 and U-2 and is blocked. C-13's precondition is therefore unmet,
which C-08 records rather than circumvents.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-9. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-deployment-fact-bindi-9d9f8b7b`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
