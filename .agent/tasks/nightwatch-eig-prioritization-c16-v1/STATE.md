# Task State

## Identity

Task ID: nightwatch-eig-prioritization-c16-v1
Phase: EXPECTED_INFORMATION_GAIN_C16_V1
Status: COMPLETE
Starting SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Last validated implementation SHA: 7fff8159fd044ca19933caa2a2bef6052fad143c
Last substantive checkpoint SHA: 7fff8159fd044ca19933caa2a2bef6052fad143c
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-eig-prioritization-c1-20849857
Last checkpoint: exact-head GitHub run 33811693944 at d863a7f passed all eleven required groups on Node 20 with receipt receipt:sha256:24fb235d1acf6131cae7c7fd; gate:local receipt:sha256:d71dcd65be882aecb9dcc821 and gate:clean PASS with inner receipt receipt:sha256:fb5ae82c29c765d56bb82a7a and siblingWrites 0; canonical regression 3,556/3,543/13/0; both orphans assigned to C-16 and implemented; 8/8 negative probes detected; CI skips unchanged at 39, so all 37 new cases execute there
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LAST_VALIDATED_IMPLEMENTATION_SHA: 7fff8159fd044ca19933caa2a2bef6052fad143c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7fff8159fd044ca19933caa2a2bef6052fad143c
LAST_DOCUMENTATION_CHECKPOINT_SHA: d863a7fe4c55e9172a473d925f9c131560a23be7
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Resolve two orphaned requirements that belong to no campaign, then implement a
bounded, deterministic, explainable LOCAL prioritisation that ranks targets and
grants nothing.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed and all eleven acceptance rows PASS.
Certified by exact-head CI run 33811693944 at `d863a7f`.

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
- M8 — validation, integration and exact-head CI. The first gate attempt failed
  at `HANDOFF_TRUTH` on a missing-scaffolding omission, was repaired, and both
  gates then passed; exact-head CI PASS at `d863a7f` with CI skips unchanged at
  39, so all 37 new cases execute there.

## Work In Progress

NONE — the campaign is COMPLETE.

## Exact Next Action

STOP — C-16 is COMPLETE and certified. The next authorized campaign is C-07
derived semantics and generated DEV targets.

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
| **`gate:local`** at `70ef1d6` (a documentation descendant of the implementation anchor `7fff815`) | **PASS, eleven groups**, receipt `receipt:sha256:d71dcd65be882aecb9dcc821`; synthetic lane 866/866 |
| **`gate:clean`** at `70ef1d6` | **PASS, eleven groups**, Node 20, **`siblingWrites: 0`**; inner `receipt:sha256:fb5ae82c29c765d56bb82a7a`, outer `clean-receipt:sha256:d85c83fb41a6a8e4ded7f1c5` |

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

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-16 is COMPLETE and certified.

Substantive implementation anchor: 7fff8159fd044ca19933caa2a2bef6052fad143c
Certified exact-head checkpoint: d863a7fe4c55e9172a473d925f9c131560a23be7
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,556 / 3,543 / 13 skipped / 0 failed; synthetic
campaign 866/866 locally and 866 / 827 / 39 skipped / 0 failed in CI; the new
`c16ExpectedInformationGain` suite 37/37.
Artifacts: `src/core/source/expectedInformationGain.ts` (six bounded factor
levels, exact rational score, total tie-breaking, `grantsAuthority: false`);
`src/core/source/censusFigureLedger.ts` (G-16's one derived figure source);
`checkC16EigBoundary`; four census figures tagged in `docs/CURRENT_STATE.md`;
the master ledger's orphan row closed with both requirements recorded
separately.
Known issues: none introduced. EIG produces an ORDER and is not yet wired to
any consumer — using it to order a live DEV cohort is C-07's work, and that
separation is deliberate.
Recommended next task: C-07 derived semantics and generated DEV targets.
