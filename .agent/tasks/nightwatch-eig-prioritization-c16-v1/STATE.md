# Task State

## Identity

Task ID: nightwatch-eig-prioritization-c16-v1
Phase: EXPECTED_INFORMATION_GAIN_C16_V1
Status: IN_PROGRESS
Starting SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Last validated implementation SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Last substantive checkpoint SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-eig-prioritization-c1-20849857
Last checkpoint: both orphans assigned to C-16 and implemented — G-16 as a one-derived-figure-source ledger with four live figures tagged in docs/CURRENT_STATE.md, and EIG as bounded integer levels with exact rational ordering; 37/37 suite, 8/8 negative probes, regression 3,556/3,543/13/0
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LAST_VALIDATED_IMPLEMENTATION_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Resolve two orphaned requirements that belong to no campaign, then implement a
bounded, deterministic, explainable LOCAL prioritisation that ranks targets and
grants nothing.

## Current Milestone

M8 — validation, integration, exact-head CI and closure. M1 through M7 are
complete.

## Completed Milestones

- M1 — task record, OpenSpec change, orphan definitions read from the master
  plan and the independent review rather than reconstructed.
- M2 — both orphans assigned to C-16 and the master ledger row closed, with
  G-16 and EIG recorded SEPARATELY because they are unrelated.
- M3 — EIG factor model: six bounded integer levels, each with an explicit
  `UNKNOWN` sitting strictly mid-scale.
- M4 — exact integer ranking: the score is a rational never divided, ordering
  cross-multiplies, and ties break on target id for a total order.
- M5 — explainability: per-entry factor levels and reason codes, so a score is
  reproducible by hand.
- M6 — G-16 implemented as a doc/ledger figure check, with four live figures
  tagged in `docs/CURRENT_STATE.md`.
- M7 — hardening rule and 8 negative probes, all DETECTED and restored.

## Work In Progress

M8 — the validation battery. The first attempt failed both gates at
`HANDOFF_TRUTH`, which was my own omission rather than a code defect.

## Exact Next Action

Re-run `gate:local` and then `gate:clean` now that the task scaffolding is
complete, then integrate by verified fast-forward and observe exact-head CI.

## Files Changed

- `.agent/tasks/nightwatch-eig-prioritization-c16-v1/{SPEC,PLAN,STATE,REPORT}.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/**`
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-16
- `src/core/source/expectedInformationGain.ts` — NEW
- `src/core/source/censusFigureLedger.ts` — NEW (G-16)
- `tests/unit/c16ExpectedInformationGain.test.ts` — NEW, 37 cases
- `bin/hardening-check.mjs` — `checkC16EigBoundary`
- `docs/CURRENT_STATE.md` — four census figures tagged
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md` — orphan row closed

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS |
| G-16 authoritative definition | read from `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md`: "stale duplicate figures in durable docs", fix "one derived figure source", assert "no document contains a census figure absent from the current ledger" |
| EIG authoritative definition | read from master-plan `design.md §9.2`, with all six factors and the explicit non-goal |
| orphan confirmation | independent review F-28 maps G-01…G-15 to campaigns and records both of these as unowned |
| G-16 live subjects | 4 census figures tagged in `docs/CURRENT_STATE.md`; check `holds: true` with `taggedFiguresFound: 4` |
| G-16 bites | stale figure → `FIGURE_NOT_IN_LEDGER`; unknown measure → `MEASURE_UNKNOWN`; explicit marker exempts; ordinary prose does NOT exempt |
| `tests/unit/c16ExpectedInformationGain.test.ts` | **37 passed / 0 failed** |
| negative probes E1-E8 | **8/8 DETECTED**, all restored, tree clean after each |
| **canonical regression** at `7fff815` | **3,556 total / 3,543 passed / 13 skipped / 0 failed**, 0 failure blocks |
| `gate:local` / `gate:clean`, first attempt at `7fff815` | **FAILED at `HANDOFF_TRUTH`** — my omission: C-16's STATE, REPORT, OpenSpec change and routing were absent, so the handoff check could not bind the active campaign. Not a code defect; every group after the first required failure is `NOT_RUN` by design |

## Decisions Made During This Task

- Both orphans assigned to C-16, from their authoritative definitions.
- The score is an exact integer rational, never a float, because a float order
  depends on rounding.
- `UNKNOWN` sits strictly mid-scale per factor: a zero deletes a target under
  the multiplicative form and a maximum promotes one.
- G-16 implemented rather than deferred, since a doc/ledger check is entirely
  offline and the risk is live.
- G-16's historical exemption is ONE explicit marker, not a word list.

## Discoveries

- G-16 and EIG are unrelated requirements that merely share the property of
  being orphaned. The ledger row's phrasing invites treating them as one
  prioritisation concern, which would have left the documentation-truth
  requirement unimplemented.
- §9.2's `contract_depth` ordering maps exactly onto C-09's expectation
  classes, so the factor has a real input rather than a placeholder.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

Using EIG to order a live DEV cohort is C-07's work. C-16 produces the order
and grants nothing.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-11. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-eig-prioritization-c1-20849857`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
