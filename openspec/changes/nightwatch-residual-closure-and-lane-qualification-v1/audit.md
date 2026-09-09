# Audit — residual closure and lane qualification

Audited live at `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`, with the
canonical checkout and `origin/main` equal and the tree clean. Every number
below was measured in this audit, not copied from a predecessor record.

## What is already true, and is not re-opened

`nightwatch-repository-hardening-implementation-v1` is terminal COMPLETE.
NW-01 through NW-14 are CLOSED with acceptance evidence and NW-15 is closed
by the W10 owner. Re-verified independently here:

- `npm run typecheck` PASS.
- `npm run hardening:check` PASS — offline structural invariants hold.
- `npm run validation:universe` PASS — 427 discovered, 254 in the
  authoritative gate, 173 classified out, 0 unclassified, digest
  `sha256:063ecd1f416bdcb540aff7a7`.
- `npm run handoff:check`, `project:check`, `workspace:check` PASS.
- `npm run agent:check` PASS with 4 warnings; 143 task records, 112 strict
  v2, 31 legacy v1, 0 strict errors.
- `git diff --check` clean; no tracked auth state, credential or raw finding.
- 88 npm scripts, none referencing a missing `bin/` file.
- Two `TODO`-shaped grep hits exist in `bin/agent-continuity-protocol.mjs`
  and both are status-vocabulary regex literals, not deferred work.

The repository does not need repair. It needs four externally-gated lanes
resolved by evidence rather than by assumption, and a short list of
bookkeeping items the predecessor campaign deliberately deferred.

## R-01 — the browser workflow lane is not unavailable on this host

The predecessor recorded the browser workflow lane UNAVAILABLE, needing "a
qualified host and owner authorization". The host qualification half of that
is already satisfied and was never tested: `/usr/bin/google-chrome` and
`/usr/bin/bwrap` are both present.

Executed during this audit from the canonical checkout:
`npm run control-center:ui:browser` built the UI (3 files, 297422 bytes, no
external references) and ran the lane to **4 passed / 0 failed in 3.8
minutes** — `controlCenterBrowser.browser.ts`, both
`reviewPersistence.browser.ts` cases including the 30-consecutive-decision
workflow, and `systemMapV2.browser.ts`.

That is evidence the lane executes and passes. It is **not** a recordable
receipt: C-00 makes the canonical checkout a non-implementation worktree, so
the run has no owning session identity. The lane must be re-executed inside
an owned session worktree to be recorded.

## R-02 — the CI block has an observed cause, and it is not a code fault

`CI_STATUS` is `NOT_OBSERVED`, which the repository correctly refuses to read
as a pass. The cause is now observed rather than inferred.

All 100 most recent GitHub Actions runs concluded `failure`, each in about
three seconds, from the oldest available (`2026-09-06T21:39:43Z`) to the
newest (`2026-09-08T22:51:37Z`). Run `34287959085`, job `102267798769`,
carries the annotation: "The job was not started because recent account
payments have failed or your spending limit needs to be increased." No job
step ever executed.

This is exactly the class `docs/CI_HARDENING.md` already defines —
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, never a test failure and never
pre-DEV authority. The finding is that the classification is documented but
the observed evidence is not recorded anywhere in project state, so a reader
cannot distinguish "never inspected" from "inspected, and externally
blocked for a known billable reason". Clearing the block is an owner action
outside this repository.

## R-03 — the predecessor's closure is under-recorded in project state

`docs/CURRENT_STATE.md` carries a `## <campaign> — terminal COMPLETE —
<date>` narrative section for every prior campaign. The hardening campaign
has none: its closing commit changed 8 lines, flipping `LIVE_TASK_STATUS`,
`LIVE_NEXT_ACTION_STATE`, `LIVE_COMPLETION_CLAIM` and
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` only. The single mention of the
campaign in 3653 lines is its `LIVE_TASK_ID`.

Separately, `LAST_LOCALLY_VALIDATED_SHA` and `LAST_CLEAN_VALIDATED_SHA` both
remain `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`, the W10 documentation
SHA, although the campaign ran `gate:local` across all eleven required
groups and a fresh Node 20 `gate:clean` to PASS at its own candidate
checkpoint. Either those fields advance to a checkpoint whose receipts exist,
or the reason they cannot is recorded mechanically.

## R-04 — a shipped capability is absent from the entry-point documentation

NW-09 shipped the opt-in review capability: `bin/nightwatch-control-center.mjs`
parses `--enable-local-review` and only then constructs the review authority
and the write route, which is a deliberate design (`undefined` omits the
route; `null` would not). `README.md`'s Local Control Center section states
the server "accepts read-only GET/HEAD/SSE access" and never mentions the
flag or the owner-local review store location. Definition-of-done item 13
requires documented capabilities and private-state locations.

`bin/phase14-contract-health.mjs` likewise has no `package.json` script and
is reachable only from `tests/unit/phase14ContractReport.test.ts:328`, so a
supported check is undiscoverable from the documented command surface.

## R-05 — workspace and record residue

`workspace:check` and `agent:check` both warn, identically, on two stale
session worktrees whose holders are not live and which need an explicit
adopt-or-release decision:
`nightwatch-autonomous-bug-huntin-725fbbbe` (claiming
`nightwatch-autonomous-bug-hunting-programme-v1`) and
`nightwatch-reproduction-surface--0a9096be` (claiming
`nightwatch-reproduction-surface-coverage-autonomous-yield-v1`). Both claimed
tasks are terminal COMPLETE.

25 merged `session/*` branches remain. `agent:check` also reports a
`CHECKPOINT_ADVANCE` warning (validated SHA precedes live HEAD, approved
documentation paths only) and 41 legacy warnings across 31 legacy v1 task
records that are historical and not strict-validated.

## R-06 — evidence accumulation has no retention policy

`artifacts/` holds **13,367 run directories totalling 915 MB**; the working
tree is 1.2 GB. `bin/nightwatch-hygiene.mjs` names `artifacts`,
`test-results`, `.nightwatch`, `.tmp-test` and `dist` in `GENERATED_OUTPUTS`
but only *observes* them — its `safeTargets` concerns worktree and branch
registrations, and reported `safeTargets=0` here. There is no bounded prune,
and growth is unbounded in normal operation.

18 stale `test-results-*` directories from 2026-08-09 and 4 `.tmp-*`
directories also persist. All are gitignored, so this is a disk and
operability finding, not a privacy or Git-hygiene one.

A prune is not a delete-by-age script. Immutable evidence identity is a
load-bearing repository value, so retention must be owner-gated, must never
remove an artifact referenced by tracked task state, and must be honest about
what it refuses to touch.

## R-07 — the documented planning-only handoff checkpoint is unreachable

Found by using the protocol, not by reading it. `.agent/PLANNER_HANDOFF.md`
states that `READY_FOR_EXECUTION` "is a planning-only checkpoint and may leave
the terminal predecessor in `ACTIVE_TASK.md`". Two guards make that state
impossible to land.

`bin/planner-handoff-check.mjs`, through `validateHandoffState`, requires for
`READY_FOR_EXECUTION` that the active task equal `Predecessor Task ID` and the
active status equal `Predecessor Status`. `bin/project-state-check.mjs`
independently requires that the prompt's `Status` normalize to the active task
status and that its `Campaign ID` equal the active task id.

Both cannot hold. A planning prompt names the successor campaign, so the
`Campaign ID` comparison fails by construction, and
`normalizeTaskStatus('READY_FOR_EXECUTION')` is `null` — verified directly
against the protocol module — so the status comparison fails **unconditionally
for every planning prompt regardless of identity**. Reproduced here at
`58bbf2d`: a protocol-valid planning prompt produced
`handoff:check` PASS alongside `project:check`
`PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH` and
`PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH`.

Each guard is internally correct; together they forbid a documented state.
The last handoff prompts to land in this shape are `5a1b9da` and `69ff71d`
(2026-08-28), both predating the cross-check, which was introduced by
`82e661b` on 2026-08-31 — so no planning checkpoint has been landable since.
The severity is process, not runtime: it forces every campaign either to skip
the planning checkpoint or to mislabel its status.

The repair is not to relax the comparison. In the planning state the binding
that must hold is the predecessor one, which the prompt carries explicitly, so
`project:check` should assert *that* rather than a binding the protocol
forbids. The error vocabulary does not change.

## Lanes this campaign cannot close, and does not claim

- The online dependency-advisory lane needs authorized network egress. The
  `vue@2.6.12` retention rests entirely on the recorded reachability
  argument, with upstream END OF LIFE and no upgrade path.
- Exact-checkpoint CI execution needs the owner's billing block cleared.
- The 12 `MANUAL_OWNER` and 6 `LIVE_APP_SMOKE` lanes need DEV authentication
  and separate authorization.
- Strict `EXACT_REDISCOVERY` and previously-unknown-defect yield remain 0
  across W7 through W10 and are the subject of a separate successor campaign,
  not this one.
