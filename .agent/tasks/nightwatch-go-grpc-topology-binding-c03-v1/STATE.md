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

Milestone ID: M4 — root admission and budget correction
Milestone status: IN_PROGRESS
What is being attempted: admit the fourteen further blueapi proto roots and the
fourteen matching blue-sdk-go roots, raise ouchan `maxFiles` to 4,096, and
prove C-01 no-eviction over the enlarged population.

## Completed Milestones

- M1 — task record, OpenSpec change, recorded baseline. Committed at `d7b45fb`.
  `agent:check`, `handoff:check` and `project:check` PASS.
- M2 — adversarial Go corpus asserted BEFORE the parser.
  `tests/unit/c03GoRegistration.test.ts` failed to import, which is the
  reproduction.
- M3 — `src/core/source/goRegistration.ts` implemented; 29/29. One real bug
  found by the corpus: a blank import `import _ "…"` fell through to the
  derived package name and bound `billing`, so a qualifier the file never
  binds would have resolved. Blank and dot imports now bind nothing.

## Work In Progress

M4. Nothing partial: M1-M3 are closed and committed.

## Exact Next Action

Admit the fourteen further blueapi proto roots and the fourteen matching
blue-sdk-go roots in `approvedScan.ts`, raise `mobingilabs/ouchan` `maxFiles`
to 4,096, then assert the C-01 no-eviction regression over the enlarged
population before building the index and the join.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/SPEC.md` | frozen intent | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/PLAN.md` | living plan, eight milestones | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |
| `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/**` | five OpenSpec files | COMMITTED d7b45fb |
| `tests/unit/c03GoRegistration.test.ts` | adversarial Go corpus | 29/29 PASS |
| `src/core/source/goRegistration.ts` | bounded registration reader with import-alias resolution | IMPLEMENTED |

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

Command: `npx playwright test tests/unit/c03GoRegistration.test.ts`
Result: PASS 29/29
When: 2026-09-03, session worktree
Relevant failure/output summary: the suite could not import before the reader
existed. After M3 one assertion failed and it was a real defect, not a bad
assertion: `import _ "github.com/.../billing/v1"` was pushed through the
identifier fallback and bound `billing`, so `billing.RegisterBillingServer`
would have resolved through a package the file imports only for side effects.
Blank and dot imports now bind nothing.

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

Decision: the join runs through the generated SDK, not through a naming
convention, and the design was corrected on evidence before implementation.
Reason: the PLAN assumed ouchan would import blueapi and that the join key
would be the proto's `go_package`. It does not. `services/billingd/main.go`
imports `github.com/alphauslabs/blue-sdk-go/billing/v1`, whose `go_package`
differs from blueapi's. Matching those two by name would have been the
naming-similarity join §25 forbids.
Evidence/constraint: `blue-sdk-go/billing/v1/billing_grpc.pb.go` declares BOTH
`func RegisterBillingServer` and `ServiceName: "blueapi.billing.v1.Billing"` in
the same generated file. That string is generated data, so the chain
ouchan -> sdk -> proto full name is mechanical at every link. All fifteen SDK
roots carry exactly the expected `ServiceName`, 57 files and 8 MB in total,
largest file 1.18 MB against a 2 MB cap.
Consequence: the fourteen matching blue-sdk-go roots must be admitted too.
This is the same per-root class the owner approved for blueapi and is
mechanically required to realise the outcome that decision chose; it is
recorded here and in the REPORT rather than folded in silently.

## Discoveries

- ouchan does not import blueapi at all. Every registration goes through the
  generated `blue-sdk-go` SDK, and the SDK's own `ServiceName` constant is what
  makes the binding provable rather than merely plausible.

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
