# REPORT — nightwatch-residual-closure-and-lane-qualification-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-residual-closure-and-lane-qualification-v1
Status: IN_PROGRESS

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced
and are never copied from a predecessor campaign.

## Campaign identity

- Task: `nightwatch-residual-closure-and-lane-qualification-v1`
- Session branch: `session/nightwatch-residual-closure-and--e130f226`
- Session identity: `sess-f4f1d66c73a2`
- Starting SHA: `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`
- Scope: R-01 through R-07 as registered in the OpenSpec `audit.md`.

## M0 — execution truth

COMPLETE at `a180a081d92f32a75fd26909d6e3362459cea990`.

Owned session worktree created and claimed from the canonical checkout, with
`session:status` reporting `verdict=PASS
WORKSPACE_INTEGRITY_SATISFIED`, `class=OWNED_SESSION`, `owned=true`,
`drift=false`, `base=CURRENT`, `canonicalSafe=true` and `attention=2` — the
two pre-existing stale session worktrees R-05 will resolve.

Independent re-verification at the starting SHA, all from live runs:

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run hardening:check` | PASS |
| `npm run handoff:check` | PASS |
| `npm run workspace:check` | PASS |
| `npm run agent:check` | PASS with 4 warnings |
| `npm run validation:universe` | PASS — 427 discovered, 254 authoritative, 173 classified, 0 unclassified, digest `sha256:063ecd1f416bdcb540aff7a7` |
| `git diff --check` | clean |

The predecessor campaign was verified terminal COMPLETE and was not reopened.
Planning artifacts — SPEC, PLAN, STATE, this REPORT and the five OpenSpec
route files — were committed as a documentation-only checkpoint and integrated
by fast-forward.

### Lane evidence gathered during M0, and its exact standing

`npm run control-center:ui:browser` was executed from the canonical checkout:
the UI built to 3 files totalling 297,422 bytes with no external references,
and the lane reported **4 passed / 0 failed in 3.8 minutes** across
`controlCenterBrowser.browser.ts`, both `reviewPersistence.browser.ts` cases
including the 30-consecutive-decision workflow, and
`systemMapV2.browser.ts`.

This is recorded as evidence that the lane executes, and explicitly **not**
as the R-01 receipt: C-00 makes the canonical checkout a non-implementation
worktree, so the run carries no owning session identity. M1 re-executes the
lane inside this session.

GitHub Actions was observed read-only: all 100 most recent runs concluded
`failure`, each in about three seconds, from `2026-09-06T21:39:43Z` to
`2026-09-08T22:51:37Z`. Run `34287959085`, job `102267798769`, carries the
annotation "The job was not started because recent account payments have
failed or your spending limit needs to be increased." No job step executed in
any run. This is the class `docs/CI_HARDENING.md` already defines as
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. It is not a test failure and it is not
a pass.

### R-07, discovered by using the protocol

Landing this campaign's own planning checkpoint proved that the documented
planning-only `READY_FOR_EXECUTION` state cannot pass the authoritative gate.
Observed directly: `handoff:check` returned `status: PASS` for the planning
prompt while `project:check` returned
`PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH` and
`PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH` for the same file.

`normalizeTaskStatus('READY_FOR_EXECUTION')` was evaluated directly against
`bin/agent-continuity-protocol.mjs` and returns `null`, so the status
comparison fails for every planning prompt regardless of identity. The
campaign-identity comparison fails by construction, because a planning prompt
names the successor campaign while `handoff:check` requires the active task to
be the predecessor.

The cross-check was introduced by `82e661b` (2026-08-31). The last prompts to
land in the planning shape are `5a1b9da` and `69ff71d` (2026-08-28), so no
planning checkpoint has been landable since the cross-check existed.

`STALE_IMPLEMENTATION_BASELINE` then correctly refused the source repair while
the terminal predecessor was still the active task, naming both files the
repair touches. That guard shaped the commit sequence and was not worked
around.

## M0b — R-07, the planning-only handoff checkpoint

The repair does not relax a comparison. In the planning state the prompt
carries its predecessor explicitly, so `bin/project-state-check.mjs` now
asserts *that* binding — `Predecessor Task ID` against the active task id and
`Predecessor Status` against the active task status — and leaves the
active-prompt rule (`Campaign ID` and `Status`) exactly as it was. The header
is read through `parseHandoffHeader`, so the handoff protocol module remains
the single owner of its own header, and it gained one export,
`HANDOFF_PLANNING_ONLY_STATUS`. No error code was added, renamed or removed.

No hole opens: `validateHandoffState` already enforces the same predecessor
binding for the same status, so the two checkers converge on one rule instead
of one deferring to the other.

Three regressions in `tests/unit/projectState.test.ts`:

| Case | Asserts |
| --- | --- |
| `1h-1` | a planning prompt naming a successor campaign passes |
| `1h-2` | a planning prompt naming the wrong predecessor still fails with `PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH` |
| `1h-3` | a planning prompt misreporting the predecessor status still fails with `PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH` |

Both directions were proven by mutation rather than asserted:

- Reverting the repair makes `1h-1` fail on
  `PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH`. The guard measures the
  defect.
- A mutant that exempts the planning state from any cross-check makes `1h-2`
  and `1h-3` fail. The guard also measures over-broad exemption.

A rule that survived both mutants would have proven nothing, which is the
failure mode this repository has recorded before.

Validation at this milestone: `projectState.test.ts` 67 passed;
`plannerHandoff.test.ts` 12 passed; `npm run typecheck` PASS;
`npm run hardening:check` PASS; `npm run handoff:check` PASS.

## Validation receipts

Recorded per milestone as they are produced.

## Safety events

NONE.

## Honest limits

- No DEV, NEXT, production, cloud or datastore contact occurred or is
  authorized.
- No network egress was performed and no dependency-advisory scan was run. An
  absent scan is never a passing scan.
- No sibling repository was written.
- No GitHub Actions run has executed at any checkpoint of this campaign, so
  CI remains non-passing evidence-absent rather than green.
- Completion of this campaign will grant no publication or organizational
  release authority, and will prove neither strict `EXACT_REDISCOVERY` nor
  previously-unknown-defect yield.
