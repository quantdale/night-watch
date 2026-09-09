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

## M1 — browser workflow lane (R-01)

**Host capability, observed rather than assumed:** Google Chrome
151.0.7922.173 at `/usr/bin/google-chrome`; bubblewrap 0.9.0 at
`/usr/bin/bwrap`.

**Receipt, produced inside this owned session** — worktree
`session/nightwatch-residual-closure-and--e130f226`, session
`sess-f4f1d66c73a2`:

```
npm run control-center:ui:browser
[control-center-ui] PASS: 3 built files, 297422 bytes total
                          (271681 js / 24924 css), no external references
Running 4 tests using 1 worker
  ok controlCenterBrowser.browser.ts:252   every built view, one synthetic authority   864ms
  ok reviewPersistence.browser.ts:207      survives reload, navigation, restart       31.4s
  ok reviewPersistence.browser.ts:309      holds over 30 consecutive decisions         3.1m
  ok systemMapV2.browser.ts:122            C-15c map navigation, no overstatement       7.2s
4 passed (3.8m)
```

Lane state: **`PROVEN`**, recorded in `docs/HOST-CAPABILITY-MATRIX.md` §4a
together with the three-valued lane vocabulary.

The audit's canonical-checkout run of the same lane remains recorded as
evidence of executability and is explicitly not this receipt: C-00 makes the
canonical checkout a non-implementation worktree, so it has no session
identity to bind to. The distinction cost one 3.8-minute re-run and is the
difference between an anecdote and a receipt.

## M2 — exact-head CI, classified rather than assumed (R-02)

The classification was produced by the repository's own classifier, not
asserted. `node bin/phase23-ci.mjs observe --run-id=34303289286` fed a
sanitized observation through `src/core/qualityGate/externalCi.ts`:

```
classification: NO_STEPS_BILLING_OR_PLATFORM_BLOCK
reasonCodes:    ["REQUIRED_JOB_STEPS_EMPTY"]
exactHead:      true
runId:          34303289286
executedJobNames: []
requiredJobNames: ["Executable quality gate"]
job 102314618949  status=completed conclusion=failure stepCount=0 executed=false
```

The run is at the exact head `a063416fb24c6b85e5098970a674698ed2955d44`. The
annotation reads "The job was not started because recent account payments have
failed or your spending limit needs to be increased."

Recorded in `docs/CURRENT_STATE.md` as
`CI_STATUS: NO_STEPS_EXTERNAL_NON_EVIDENCE`, `CI_OBSERVED_SHA: a063416…`,
`CI_EXECUTED_SHA: NONE`. The distinction now visible in project state is
between *uninspected* and *inspected and externally blocked*; neither is a
pass, and `CI_EXECUTED_SHA` stays `NONE` because nothing executed.

The block is account-wide and long-standing, not specific to this checkpoint:
all 100 most recent runs concluded `failure` in about three seconds with zero
steps, from `2026-09-06T21:39:43Z` through `2026-09-09T02:27:33Z`. No retry
loop and no meaningless commit was used to provoke a runner.

**Owner action, outside this repository:** clear the payment or spending-limit
block in GitHub Billing & plans, then re-run at the acceptance head and record
the run id and executed SHA.

## M3 — project-state reconciliation (R-03)

`docs/CURRENT_STATE.md` now carries
`## Repository master hardening implementation — terminal COMPLETE —
2026-09-09` in the same shape every prior campaign uses, with the fourteen
findings summarised one line each, the predecessor's certification evidence,
and the four UNAVAILABLE lanes re-stated against what this campaign actually
found. `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` advanced to
`a063416fb24c6b85e5098970a674698ed2955d44`, a real implementation commit.

`LAST_LOCALLY_VALIDATED_SHA` and `LAST_CLEAN_VALIDATED_SHA` are **deliberately
not advanced yet**. They would have to name a checkpoint whose `gate:local`
and fresh-Node-20 `gate:clean` receipts exist. Inheriting the predecessor's
receipts for a different SHA would be exactly the copied-receipt failure this
repository forbids, so those two fields move at M7 against this campaign's own
receipts or not at all.

No pre-existing historical section, receipt or SHA was rewritten; the change
is an append plus the two current-anchor fields.

## M4 — the shipped surface, documented (R-04)

`README.md` gained an "Opt-in local review (off by default)" section under the
Control Center: the `--enable-local-review` flag, the fact that without it the
write route does not exist rather than being disabled, the owner-local store
at `$HOME/.nightwatch/reviews` with its `NIGHTWATCH_REVIEW_STORE_DIR`
override, the `CONTROL_CENTER_REVIEW_STORE_UNAVAILABLE` refusal, the four
reviewer answers, and the standing non-equivalence of `ACCEPT_EVIDENCE` to
Leslie/Pondr/bounty acceptance.

`bin/phase14-contract-health.mjs` was reachable only from
`tests/unit/phase14ContractReport.test.ts:328`. It now has a documented
script, `npm run contract:health`, and a README line describing its
source-only, read-only inputs.

## M5 — worktree and record residue (R-05)

Two corrections to the audit were forced by live evidence, and both are
recorded rather than smoothed over.

**The two stale worktrees were not in the same state.** The audit said both
claimed terminal-COMPLETE tasks. Only
`nightwatch-reproduction-surface-coverage-autonomous-yield-v1` is COMPLETE.
`nightwatch-autonomous-bug-hunting-programme-v1` is `IN_PROGRESS` — the
umbrella programme, whose own STATE records "no wave is active" after W10
closed and certified. Before touching either worktree, both were proven fully
merged into `origin/main` with zero unmerged commits and clean trees, so
release lost no work. Both were released through
`bin/nightwatch-session.mjs remove --name … --delete-branch` from the
canonical checkout, never by hand:

```
SESSION_BRANCH_DELETED / SESSION_WORKTREE_REMOVED contained=true
  nightwatch-reproduction-surface--0a9096be
  nightwatch-autonomous-bug-huntin-725fbbbe
```

Releasing a worktree does not change a task's status. The parent programme
remains `IN_PROGRESS` and this campaign does not close it. `workspace:status`
now reports `verdict=PASS`, `attention=0`; the two standing
`WORKSPACE_STALE_SESSION_WORKTREE` warnings are gone.

**"25 merged session branches" was wrong.** Measured against `origin/main`,
only 6 of the 24 session branches were provably merged. Those 6 were deleted
with `git branch -d`, which refuses a non-merged branch by construction:

```
session/nightwatch-owner-local-determini-47add5e3
session/nightwatch-w10-capability-memory-69e37993
session/nightwatch-w10-census-engine-lan-1cad7b72
session/nightwatch-w10-failure-evidence--7b5831c6
session/nightwatch-w10-resilience-lane-v-c0af66fd
session/nightwatch-w10-yield-benchmark-l-b22e8a6c
```

The remaining 16 are **not** deleted and are an owner decision. Their tips are
not ancestors of `origin/main`, yet spot checks show the files they add are
present on main, so their content largely landed through different commits
while the tips diverged. One of them,
`session/nightwatch-review-operations-his-7431812c`, holds 16 commits across
72 files and about 10,000 insertions, with a tip commit that says in as many
words that it preserves stale work before parking the worktree. Deciding
whether any of these still holds something unique needs per-branch content
review, which is not a judgement this campaign makes on the owner's behalf:

- `session/nightwatch-reproduction-surface--516a6313`
- `session/nightwatch-reproduction-surface--ce18f499`
- `session/nightwatch-review-operations-his-7431812c`
- `session/nightwatch-w7-context-providers--6f5b5426`
- `session/nightwatch-w7-mechanical-admissi-b7ada8d7`
- `session/nightwatch-w7-programme-identity-91c69c22`
- `session/nightwatch-w7-replay-parity-v1-1f495e51`
- `session/nightwatch-w8-campaign-diversity-f4bd878c`
- `session/nightwatch-w8-efficacy-depth-lan-8c27e81c`
- `session/nightwatch-w8-leakage-proof-lane-ae9ac68a`
- `session/nightwatch-w8-memory-proof-lane--e5504c9e`
- `session/nightwatch-w8-prompt-adapter-lan-340b9c8d`
- `session/nightwatch-w9-current-source-adm-adc6d9b4`
- `session/nightwatch-w9-owner-local-provid-ccd56c9f`
- `session/nightwatch-w9-readiness-lane-v1-fae2fcb3`
- `session/nightwatch-w9-runtime-semantics--2a772323`

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
