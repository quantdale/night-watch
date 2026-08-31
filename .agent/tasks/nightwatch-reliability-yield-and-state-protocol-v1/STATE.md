# Task State

## Identity

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: IN_PROGRESS
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last substantive checkpoint SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last documentation checkpoint SHA: d11dae2e71f501ddfb611dd3c8beb349e6e44711
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
LAST_VALIDATED_IMPLEMENTATION_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1_STATUS: IN_PROGRESS

## Objective

Explain and reduce intermittent strict replay divergence, increase useful
bug yield from existing mechanically proven source coverage, and replace
task-name-based project-verdict authorization with explicit fail-closed state
metadata. Preserve `OPERATIONALLY_ACCEPTED` unless current evidence actually
invalidates it.

## Current Milestone

M1 — Phase 2C replay diagnosis and identity — IN_PROGRESS

## Completed Milestones

- Git topology and authoritative starting SHA verified.
- Successor task and OpenSpec change scaffolded.
- Required local baseline tests and Control Center checks completed.
- Task/OpenSpec scaffold checkpointed and pushed at `d11dae2`; post-checkpoint
  agent, project, handoff, and hardening checks pass.

## Work In Progress

The baseline and scaffold checkpoint are closed. No Nightwatch implementation
change has started. M1 now begins with the existing replay identity,
observation settlement, and divergence-path audit.

## Exact Next Action

Inspect the existing replay identity, observation settlement, and divergence
paths; create a deterministic local reproducer before modifying them.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/SPEC.md` | frozen successor intent | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/PLAN.md` | living milestones | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/STATE.md` | continuity state and baseline | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/REPORT.md` | live report handoff | done |
| `.agent/ACTIVE_TASK.md` | activate successor | done |
| `.agent/EXECUTION_PROMPT.md` | active handoff | done |
| `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/*` | OpenSpec proposal/design/spec/tasks | done |

## Validation Ledger

Command: `git fetch --prune origin && git status --short --branch && git branch --show-current && git rev-parse HEAD && git rev-parse origin/main`
Result: PASS before scaffolding
When: 2026-08-31
Relevant failure/output summary: canonical Nightwatch repository; `main` only;
local `HEAD == origin/main == 7ac265594719f3d93eabf78e0bd9f749ef63dba7`; clean
working tree before task activation.

Command: `npm ci`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 7 packages added; audit reported one low
severity advisory from the existing dependency set.

Command: `npm run typecheck`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: TypeScript completed with no errors; 11.3s
observed.

Command: `npm run hardening:check`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: offline structural invariants hold.

Command: `npm run quality-gate:spec`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: definition digest
`sha256:4c5a9d19416fd2e0c24f01a2fd6a518b8faf47f866665ae37af21abbf8921044`;
10 required groups; compatibility phases 22 and files 142.

Command: `npm run gate:inventory`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 10 logical groups; 156 unique test files; 0
duplicate test-file executions; inventory baseline digest
`ac3df00195eef846a8e9e42615e90b4b912877d2`.

Command: `npm run test:semantic-compat`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 1932 total; 1919 passed; 13 skipped; 0
failed; phases 9–26; 142 files.

Command: `npm run test:owner-provenance`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 91 tests passed; 0 failed; Playwright 8.0s
observed.

Command: `npm run campaign:synthetic -- --reporter=line`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 73 passed; 0 failed; Playwright 15.4s and
19.59s wall.

Command: `npm run control-center:ui:typecheck`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: no TypeScript errors.

Command: `npm run control-center:ui:test`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 2 files; 11 tests; 0 failed; Vitest 3.38s,
4.13s wall.

Command: `npm run control-center:ui:build`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 3 built files; 259566 bytes; no external
references or embedded content; 2.08s wall.

Command: `npm run agent:check`
Result: FAIL during initial untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the first invocation preceded creation of
this STATE/REPORT; after the continuity-v2 shape repair and checkpoint it
passed with only the approved stale implementation-baseline and legacy-task
warnings. The stale warning refers to the documentation-only OpenSpec
scaffold, not source code.

Command: `npm run project:check`
Result: FAIL closed during untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the pre-checkpoint run emitted
`PROJECT_STATE_CHECKOUT_DIRTY` and
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; the post-checkpoint run passed
and preserved `OPERATIONALLY_ACCEPTED`.

Command: `npm run handoff:check`
Result: FAIL closed during untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the pre-checkpoint run emitted
missing/untracked OpenSpec and active continuity errors; the post-checkpoint
handoff receipt passed with all seven OpenSpec files, including `audit.md`.

Command: `npm run gate:local`
Result: FAIL closed during untracked scaffold
When: 2026-08-31
Relevant failure/output summary: static and hardening groups passed, then
HANDOFF_TRUTH failed and later groups were not run; this is task scaffolding,
not an implementation regression.

## Decisions Made During This Task

- Create a distinct continuity-v2 successor because completed acceptance and
  reproducibility tasks must remain terminal historical records.
- Preserve `OPERATIONALLY_ACCEPTED` with explicit `PROJECT_VERDICT_EFFECT:
  PRESERVE` while this hardening task is active.
- Treat an unexplained replay divergence as non-success even when a later
  bounded retry passes.
- Keep `NO_SAFE_NEW_FAMILY` authoritative unless new source evidence clears
  the existing mechanical proof bar.

## Defect Ledger

| ID | Severity | Subsystem | Discovery | Reproduction | Root cause | Fix | Regression | Validation | Final disposition |
|---|---|---|---|---|---|---|---|---|---|
| RYSP-001 | Medium | continuity bootstrap | baseline | New task scaffold was not visible to the strict checker before STATE/REPORT and required OpenSpec audit were present/tracked | setup ordering and incomplete handoff scaffold | added required v2 state/report shape, `audit.md`, and checkpointed before strict gate evaluation | `agent:check`, `project:check`, and `handoff:check` pass after `d11dae2` | post-checkpoint validators pass | Closed as scaffold sequencing; not a Nightwatch runtime defect |

## Discoveries

- The current project checker authorizes accepted status for many active
  `nightwatch-*` tasks through a task-name prefix exception; this is the
  state-protocol defect under investigation.
- The current baseline is green for implementation gates, but activating a
  new task requires the exact continuity-v2 document shape before project and
  handoff truth can be evaluated.
- Current source census remains conservative: `NO_SAFE_NEW_FAMILY`; 1732
  files considered, 1092 read, 1078 admitted, 654 rejected, 12,449,877 bytes;
  128 operations, 127 routes, 127 request contracts, 83 response contracts,
  175 semantic observations, 118 proven/10 rejected joins, lifecycle
  45 discovered/80 mechanically proven/3 projectable, and Phase 24 has
  3 eligible/125 excluded.

## Safety Events

NONE

## Resume Recipe

Read `ACTIVE_TASK.md`, this `STATE.md`, `PLAN.md`, and `SPEC.md`; inspect the
working tree; then take the replay implementation audit as M1's first bounded
subproblem. Do not contact DEV until the local replay/state changes and their
focused regressions pass.

## Completion Snapshot

Not complete. M0 is closed; replay, selection,
state-protocol, persisted-execution, DEV, reproducibility, CI, and final
closure evidence remain pending.

## Blockers

None at the current milestone. Owner-managed DEV authentication will be
checked only after local changes are validated; unavailable authentication
will be reported as a bounded evidence limitation rather than bypassed.

## Deferred / Follow-Up

- Any source family below the mechanical proof bar.
- Production, NEXT, infrastructure, datastore, mutation, publication, and
  sibling-repository work.
