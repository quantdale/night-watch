# Task State

STATE — nightwatch-residual-closure-and-lane-qualification-v1

## Identity

Task ID: nightwatch-residual-closure-and-lane-qualification-v1
Phase: RESIDUAL_CLOSURE_AND_LANE_QUALIFICATION_V1
Status: IN_PROGRESS
Campaign: nightwatch-residual-closure-and-lane-qualification-v1
Starting SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Last validated implementation SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Last substantive checkpoint SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-residual-closure-and--e130f226
Last checkpoint: M0 in progress; owned session sess-f4f1d66c73a2 claimed on base `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142` with workspace verdict PASS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LAST_VALIDATED_IMPLEMENTATION_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_RESIDUAL_CLOSURE_AND_LANE_QUALIFICATION_V1_STATUS: IN_PROGRESS

## Objective

Resolve the four lanes the repository hardening campaign recorded UNAVAILABLE
into `PROVEN`, `BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY`; prove the ones
this host can prove; close the bookkeeping that campaign deferred; and give
local evidence growth a bounded, refusal-first retention policy.

## Current Milestone

Milestone ID: M0b
Milestone status: IN_PROGRESS
What is being attempted: R-07 — restoring the planning-only handoff
checkpoint. The repair and its three regressions are written and validated;
the milestone closes when the checkpoint is committed and integrated.

## Completed Milestones

- **M0 COMPLETE** — execution truth established at planning checkpoint
  `a180a081d92f32a75fd26909d6e3362459cea990`. Owned session worktree
  `nightwatch-residual-closure-and--e130f226` claimed as `sess-f4f1d66c73a2`
  on base `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`; `session:status`
  verdict PASS, `owned=true`, `drift=false`, `base=CURRENT`. Independent
  re-verification at the starting SHA: typecheck, `hardening:check`,
  `handoff:check`, `workspace:check` PASS; `agent:check` PASS with 4
  warnings; `validation:universe` 427 discovered / 0 unclassified at digest
  `sha256:063ecd1f416bdcb540aff7a7`; `git diff --check` clean. Predecessor
  verified terminal COMPLETE and not reopened. R-01 through R-07 registered;
  planning artifacts and the OpenSpec route integrated by fast-forward.

## Work In Progress

M0b. The R-07 repair is written and validated but not yet committed.
`bin/planner-handoff-protocol.mjs` exports `HANDOFF_PLANNING_ONLY_STATUS`,
and `bin/project-state-check.mjs` asserts the predecessor binding for a
`READY_FOR_EXECUTION` prompt while leaving the active-prompt rule untouched.
Three regressions in `tests/unit/projectState.test.ts` cover the planning
pass and both wrong-predecessor failures.

Historical, for the record — M0. The owned session worktree
`nightwatch-residual-closure-and--e130f226` is claimed as session
`sess-f4f1d66c73a2` on base `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`, with
`session:status` reporting verdict PASS, `owned=true`, `drift=false` and
`base=CURRENT`. SPEC, PLAN and this STATE are written; the OpenSpec change
route is written. Neither `.agent/ACTIVE_TASK.md` nor
`.agent/EXECUTION_PROMPT.md` has been bound to this campaign yet, because the
handoff header is still at the planning-only `READY_FOR_EXECUTION`
checkpoint and the terminal predecessor legitimately remains the active task.

## Exact Next Action

Commit the M0b checkpoint and integrate it by fast-forward to `origin main`,
then begin M1: re-execute the browser workflow lane inside this owned session
and record its receipt.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/SPEC.md` | frozen campaign intent, owned paths, declared deletions | ADDED |
| `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/PLAN.md` | milestone plan and sequencing constraints | ADDED |
| `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/audit.md` | live audit at the starting SHA | ADDED |
| `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/proposal.md` | change proposal | ADDED |
| `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/design.md` | lane classes, receipt ownership, refusal-first retention | ADDED |
| `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/tasks.md` | milestone checklist | ADDED |
| `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/specs/residual-closure/spec.md` | requirement and scenarios | ADDED |
| `.agent/EXECUTION_PROMPT.md` | successor handoff header at READY_FOR_EXECUTION | MODIFIED |

## Validation Ledger

Command: `node bin/nightwatch-session.mjs status`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: verdict=PASS
WORKSPACE_INTEGRITY_SATISFIED; self class=OWNED_SESSION, owned=true,
drift=false, base=CURRENT, canonicalSafe=true, attention=2 (the two
pre-existing stale session worktrees this campaign will resolve in M5).

Command: `npm run typecheck`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: no diagnostics at the starting SHA.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: discovered=427 authoritativeGate=254
classified=173 unclassified=0 digest=sha256:063ecd1f416bdcb540aff7a7.

Command: `npm run project:check`
Result: FAIL (R-07, expected and registered)
When: 2026-09-09
Relevant failure/output summary:
`PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH` and
`PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH` against a protocol-valid
planning prompt that `handoff:check` accepted as PASS. This is the R-07
defect, not a defect in the prompt.

Command: `npm run control-center:ui:browser`
Result: PASS (evidence only, not a receipt)
When: 2026-09-09
Relevant failure/output summary: 4 passed / 0 failed in 3.8 minutes, run
from the canonical checkout during the audit and therefore carrying no
owning session identity. M1 re-executes it inside this session.

Command: `npx playwright test tests/unit/projectState.test.ts --project=nightwatch --workers=1`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 67 passed, including the three new R-07
regressions.

Command: mutation proof of the R-07 regressions
Result: PASS (both directions)
When: 2026-09-09
Relevant failure/output summary: with the repair reverted to its committed
form, `1h-1` fails on
`PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH` — so the guard measures the
defect. With a naive mutant that exempts the planning state from any
cross-check, `1h-2` and `1h-3` both fail — so the guard also measures
over-broad exemption. A rule that passes in both mutants would have proven
nothing.

Command: `npx playwright test tests/unit/plannerHandoff.test.ts --project=nightwatch --workers=1`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 12 passed after the protocol module gained
the planning-only status export.

Command: `npm run typecheck` and `npm run hardening:check`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: no diagnostics; offline structural
invariants hold with the repair in place.

## Decisions Made During This Task

Decision: classify lanes three ways rather than as available/unavailable.
Reason: the predecessor's UNAVAILABLE conflated an absent host capability
with an authority the campaign did not hold, and one such lane in fact runs
and passes on this host.
Evidence/constraint: the browser lane passed 4/4 during the audit while being
carried as UNAVAILABLE.

Decision: a lane result from the canonical checkout is evidence, never a
receipt.
Reason: C-00 makes the canonical checkout a non-implementation worktree, so
such a run has no session identity to bind a receipt to.
Evidence/constraint: AGENTS.md worktree class table — `CANONICAL_MAIN` and
`CANONICAL_MAINTENANCE` carry integration and bounded maintenance authority
only.

Decision: retention is refusal-first and owner-gated, and never replaces an
artifact in place.
Reason: immutable evidence identity is load-bearing, and a prune over
evidence is dangerous in exactly one direction.
Evidence/constraint: the review and evidence stores depend on no-replace
identity patterns that a rewrite-in-place prune would break.

Decision: repair R-07 by asserting the predecessor binding rather than by
relaxing the comparison.
Reason: the planning state does have a binding that must hold — the prompt
carries the predecessor explicitly — so the guard should model that binding
instead of being exempted from checking anything.
Evidence/constraint: `validateHandoffState` already enforces exactly this
binding for the same status, so the two checkers converge rather than one
deferring to the other.

Decision: land the planning checkpoint as documentation only, before the
R-07 source repair.
Reason: `agent:check` reports `STALE_IMPLEMENTATION_BASELINE` for source
changes made while the terminal predecessor is still the active task, and
that guard is correct.
Evidence/constraint: observed directly — the repair touched
`bin/project-state-check.mjs` and `bin/planner-handoff-protocol.mjs` and the
guard named both files.

Decision: exclude the real-yield campaign from this scope.
Reason: it depends on confirmed provider capability, which this campaign does
not establish, and it would make a bounded closure campaign unbounded.
Evidence/constraint: strict `EXACT_REDISCOVERY` and previously-unknown-defect
yield are 0 across W7 through W10 and are recorded as separate and unproven.

## Discoveries

- The browser workflow lane executes and passes on this host; its
  UNAVAILABLE record reflected untested host qualification, not a failure.
- The CI block has an observed, non-code cause: all 100 most recent runs
  failed in about three seconds with no step executed, annotated as a
  payment or spending-limit block. The repository already defines the class
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` for exactly this, but records no
  observed instance.
- `docs/CURRENT_STATE.md` has no narrative closure section for the
  predecessor campaign, breaking a convention every prior campaign follows.
- `LAST_LOCALLY_VALIDATED_SHA` and `LAST_CLEAN_VALIDATED_SHA` still name the
  W10 documentation SHA despite the predecessor's own local and clean gate
  passes.
- `README.md` describes the Control Center as read-only GET/HEAD/SSE and
  never mentions the shipped `--enable-local-review` flag or the review store.
- `artifacts/` growth is unbounded: 13,367 run directories, 915 MB, and
  `hygiene` observes generated outputs without pruning any.
- R-07, found by using the protocol rather than reading it: the documented
  planning-only `READY_FOR_EXECUTION` checkpoint cannot land. `handoff:check`
  requires the active task to equal `Predecessor Task ID`, while
  `project:check` requires the prompt `Campaign ID` to equal the active task
  id and the prompt `Status` to normalize to the active status. A planning
  prompt names the successor, so the identity comparison fails by
  construction, and `normalizeTaskStatus('READY_FOR_EXECUTION')` is `null`, so
  the status comparison fails unconditionally for every planning prompt.
  Verified against the protocol module and reproduced at `58bbf2d`.
- The stale-baseline guard correctly refuses source changes while a terminal
  predecessor is still the active task, so the planning checkpoint must land
  as documentation only before any source repair is legal. This shaped the
  commit sequence rather than being worked around.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- The real-yield campaign: strict `EXACT_REDISCOVERY` and
  previously-unknown-defect yield, gated on confirmed provider capability.
- The online dependency-advisory lane, gated on authorized network egress.
- Exact-checkpoint CI execution, gated on the owner clearing the billing
  block.
- The 12 `MANUAL_OWNER` and 6 `LIVE_APP_SMOKE` lanes, gated on DEV
  authentication and separate authorization.
- Splitting the five append-heavy archive documents, and promoting the 84
  `FULL_REGRESSION` suites into the authoritative gate. Both remain
  deliberately deferred with the predecessor's recorded reasons.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect `git status`, the current SHA and `node bin/nightwatch-session.mjs status`.
4. Run the smallest relevant validation for the current milestone.
5. Continue Exact Next Action.

## Completion Snapshot

Not complete. Populate only at closure, with real evidence.
