# Task State

## Identity

Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Phase: GO_GRPC_TOPOLOGY_BINDING_C03_V1
Status: IN_PROGRESS
Starting SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last validated implementation SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last substantive checkpoint SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-go-grpc-topology-bind-25187565
Last checkpoint: M1 opened at the C-02b closure head 03bab54 with the ouchan enumeration limit and the Go registration inventory measured before any code
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_VALIDATED_IMPLEMENTATION_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Bind protobuf services to the Go gRPC registration topology that serves them,
at service level, as mechanically proven `SOURCE_FACT`s — without claiming a
whole-repository completeness that ouchan's enumeration cannot support.

## Current Milestone

Milestone ID: M1 — task record, OpenSpec change, recorded baseline
Milestone status: IN_PROGRESS
What is being attempted: SPEC and PLAN are written; the OpenSpec change and the
`agent:check` / `handoff:check` pair remain.

## Completed Milestones

- None yet. M1 is the first.

## Work In Progress

M1. SPEC.md and PLAN.md are written. No source module and no test exists yet:
the adversarial Go corpus of M2 is asserted before the parser of M3.

## Exact Next Action

Write the OpenSpec change
`openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/` with `audit.md`,
`proposal.md`, `design.md`, `tasks.md` and `specs/*/spec.md`, route
`.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md` to this campaign, then
run `agent:check` and `handoff:check` and commit the M1 checkpoint.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/SPEC.md` | frozen intent | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/PLAN.md` | living plan, eight milestones | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |

## Validation Ledger

Command: `npm run session:status` and `nightwatch-session.mjs claim`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: C-02b released; canonical clean at 03bab54;
session `sess-5816b4a78516` claimed on branch
`session/nightwatch-go-grpc-topology-bind-25187565`.

Command: measured ouchan enumeration at three budget/root variants
Result: recorded as the campaign baseline
When: 2026-09-03
Relevant failure/output summary: `maxFiles: 1024` over `services`+`pkg`
enumerates 857 entries and sees ZERO of the 12 registration daemons;
`maxFiles: 4096` sees 8 of 12 and stays TRUNCATED at 3,156 examined; `services`
alone at 4,096 is COMPLETE at 2,623 with all 12 visible. The walk counts every
considered directory entry, and `pkg` sorts first.

Command: measured the Go registration inventory and the proto root surface
Result: recorded as the campaign baseline
When: 2026-09-03
Relevant failure/output summary: 17 production registrations across 15 daemons
plus 2 in `_test.go`; 15 name blueapi proto services. The fourteen further
blueapi proto roots hold 443 RPCs, taking the proto surface to 590.

## Decisions Made During This Task

Decision: admit the fourteen further blueapi proto roots.
Reason: with only `billing` admitted exactly one join is provable and the ≥12
acceptance is arithmetically unreachable. C-02a established that a root inside
an already-admitted repository is not a repository admission.
Evidence/constraint: the owner was asked directly and chose this option. No
repository is admitted; blueinternal and wave-api stay out.

Decision: raise ouchan `maxFiles` to the existing 4,096 ceiling, and do not
raise the ceiling itself.
Reason: at 1,024 C-03 has literally no input — not one registration file is
enumerated. `MAX_SIBLING_SOURCE_SCAN_FILES` is a safety contract constant and
changing it belongs to its own authorized change.
Evidence/constraint: measured 0 of 12 daemons visible at 1,024, 8 of 12 at
4,096.

Decision: do not narrow ouchan's roots to `services` to obtain COMPLETE
enumeration.
Reason: it would drop `pkg`, which holds the `types.proto` negative case C-02b
depends on, and buying a completeness claim by shrinking what is looked at is
the trade the operating principles forbid.

## Discoveries

- The enumeration walk counts every considered directory entry, not only
  admitted source files, so `pkg` sorting before `services` consumed the entire
  budget and left C-03 with no observable registration at all.
- ouchan can never report COMPLETE enumeration across both approved roots under
  the current contract ceiling of 4,096. Reported, not worked around.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Raising `MAX_SIBLING_SOURCE_SCAN_FILES`: its own authorized change.
- `prismd`, `webtoold`, `pricingd`, `vortexd`: `TRUNCATED_ENUMERATION`.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA in the session worktree.
4. Run the smallest relevant validation.
5. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
