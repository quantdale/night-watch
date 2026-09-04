# Task State

## Identity

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Phase: SYSTEM_MAP_V2_TRANSPORT_C15C_V1
Status: COMPLETE
Starting SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
Last validated implementation SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
Last substantive checkpoint SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-system-map-v2-transpo-6bb0f1cf
Last checkpoint: predecessor C-07 certified at exact-head GitHub run 33817429249; C-15c scaffolding written before any gate battery
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LAST_VALIDATED_IMPLEMENTATION_SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
LAST_DOCUMENTATION_CHECKPOINT_SHA: 17d1c0a7fe908d249bf7334ebdd9f0837e438890
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_SYSTEM_MAP_V2_TRANSPORT_C15C_V1_STATUS: COMPLETE

## Objective

Carry the C-15b System Map V2 model over HTTP and give the operator a UI that
can navigate it, granting the map no authority it does not have and without
rendering away the boundaries of a bounded projection.

## Current Milestone

COMPLETE / STOP — M1 through M7 are closed and all fifteen acceptance rows PASS.

## Completed Milestones

- M1 — SPEC, PLAN, STATE, REPORT, the OpenSpec change, ACTIVE_TASK and
  EXECUTION_PROMPT routing, and the live-state block, written BEFORE any gate
  battery ran.
- M2 — `src/controlCenter/contracts/systemMap.ts` and
  `src/controlCenter/adapters/systemMapAdapter.ts`. Verified against real data:
  1,851 operations, `operationPopulationTotal: null`, L1 at 1 node and 0 edges
  inside a 64/128 bound, layout digest stable across repeated calls, both
  authority fields `NONE`, L1-with-focus null and L2-without-focus null.
- M3 — router segments, collector methods and server dispatch. Verified route
  table: `l1`..`l4` route to `systemMapLevel`; `l5` and `/query/made-up` parse
  to `unknown`; `../etc` is rejected; `/api/v1/source/graph` still routes to
  `sourceGraph`.
- M4 — `loadSystemMapLevel` and `loadSystemMapQuery` in the API client, and the
  System Map operator view with L1→L4 drill, breadcrumb return, the eight
  queries, search, evidence filter, pan, zoom, keyboard drive, a node detail
  panel, the blocking chain and the provenance footer.
- M5 — the C-15c suite (27 tests), registered in both manifests, and the hardening
  rule structurally guarding V2 routes, ProjectionBoundDto nullability, and
  pure projection boundaries.
- M6 — browser scenario matrix (`tests/browser/systemMapV2.browser.ts`), scale
  test at 1,000 nodes / 2,000 edges, UI build verifier and browser test pass (2/2).
- M7 — Full validation battery (`gate:local` PASS with receipt `receipt:sha256:4e6b059312e2281785e38400`, `gate:clean` PASS with receipt `clean-receipt:sha256:6c14424bbbeb876dbd3c6d95`), all 11 gate groups PASS, 0 failed, siblingWrites 0.

## Work In Progress

NONE — task is complete and validated.

## Exact Next Action

STOP — C-15c is COMPLETE and certified. The next authorized campaign is R-13 Overnight Endurance Certification.

## Files Changed

- `src/controlCenter/contracts/systemMap.ts` — new, the V2 wire DTOs
- `src/controlCenter/adapters/systemMapAdapter.ts` — new, level/query adapters
- `src/controlCenter/server/router.ts` — V2 segments parsed before the v1 check
- `src/controlCenter/server/collector.ts` — two new collector methods
- `src/controlCenter/server/defaultCollector.ts` — wired to the authority snapshot
- `src/controlCenter/server/server.ts` — dispatch, `focus` allowlist, GET/HEAD
- `tests/unit/controlCenterServer.test.ts` — collector stub extended
- `ui/control-center/src/types.ts` — V2 view types and the new nav entry
- `ui/control-center/src/api.ts` — the two loader functions
- `ui/control-center/src/App.tsx` — the System Map view
- `ui/control-center/src/styles.css` — the view's styles
- `ui/control-center/src/App.test.tsx` — roster guards extended by exactly one view
- `docs/CURRENT_STATE.md` — live-state block advanced to C-15c

## Validation Ledger

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| UI `vite build` + build verifier | PASS — 3 files, no external references |
| UI unit suite | PASS 12/12 |
| Router truth table | PASS — v1 unaffected, unknown segments rejected |
| Adapter against real data | PASS — bounds, authorities and layout determinism |
| ProjectionBound end-to-end | PASS — nulls preserved, `remainingUnknown` true |
| Full gate battery | NOT RUN YET — M7 |

## Decisions Made During This Task

`ProjectionBound.total` and `.dropped` are both nullable on the wire. When the
upstream population is unknown the number of dropped items is unknowable, and a
non-nullable number would force the transport to invent one.

L1-with-a-focus and L2/L3/L4-without-a-focus return null rather than an empty
map, so the server answers `CONTROL_CENTER_NOT_FOUND`. An empty success is a
claim about the world; these are malformed requests.

The client fetches exactly the level it displays. A client that fetched
everything and filtered locally would have the privacy and scale profile of an
unbounded API however little it drew.

## Discoveries

`MUTATION_CAPABLE_ROUTES` truncates with `total: null` and `dropped: null` and
`remainingUnknown: true`. The natural UI — "1000 of 1000", or "0 dropped" —
would tell the operator they had seen everything, which is the exact inverse of
what the projection says. Both nulls render as "unknown".

`OBSERVED_PRODUCTION_PATHS` returns zero nodes with `measurement: UNMEASURED`,
because zero production observation exists and none is authorized. An empty
list reads as "nothing is wrong". The truth is that nothing was measured, and
the UI says so in words.

## Blockers

None.

## Safety Events

NONE. Production contacts 0, NEXT contacts 0, DEV requests 0, credentials
acquired 0, sibling repository writes 0, force pushes 0. C-12 remains NOT
AUTHORIZED and is not begun.

## Deferred / Follow-Up

The browser scenario matrix and the scale measurement are M6, after the suite
and the hardening rule exist to be exercised.

## Resume Recipe

STOP — task complete, do not resume.

## Completion Snapshot

- Task status: COMPLETE
- Implementation SHA: `82e3a49da77e5e0d8b451697bad58f9af5aaa4e5`
- `gate:local`: PASS (`receipt:sha256:4e6b059312e2281785e38400`), 11 groups
- `gate:clean`: PASS (`clean-receipt:sha256:6c14424bbbeb876dbd3c6d95`), 11 groups
- `campaign:synthetic`: 40 files, 916 passed, 0 failed
- `test:semantic-compat`: 146 files, 2,033 tests, 2,020 passed, 13 skipped, 0 failed
- Browser matrix: 2 passed (Control Center authority composition + System Map V2 navigation)
- Sibling repository writes: 0
- Production contacts: 0, NEXT contacts: 0, DEV requests: 0, credentials acquired: 0

## Method notes

I wrote this task record BEFORE running any gate battery. In C-16 and again in
C-07 I ran the battery first and it failed at HANDOFF_TRUTH both times with
eight groups NOT_RUN. Two consecutive repeats of one mistake is a process
defect rather than bad luck, so the ordering is now written into PLAN M1.

My first draft of this file used my own headings instead of the protocol's, and
`agent:check` rejected it with 33 errors. Running the continuity check while
writing the scaffolding — rather than discovering it at the gate — is the
practical form of the same correction.

The UI dependency tree was absent from this worktree. I first satisfied it with
a symlink to the canonical checkout's `node_modules`, and `git status` then
showed `ui/control-center/node_modules` as UNTRACKED: `.gitignore` says
`node_modules/` with a trailing slash, which matches a directory and not a
symlink. I replaced the symlink with a real directory so the ignore rule
applies and no stray entry can reach a commit. I did not edit `.gitignore` to
paper over it.

Adding the System Map view broke two existing UI tests: a nav-count assertion
pinned at 7 and a closed href allowlist. Both are honest roster guards doing
their job. I extended each to admit exactly `system-map` and kept the allowlist
closed rather than loosening the pattern to something permissive.
