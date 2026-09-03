# Task State

## Identity

Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Phase: GO_GRPC_TOPOLOGY_BINDING_C03_V1
Status: COMPLETE
Starting SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last validated implementation SHA: 53e963de059518dbc865ab9153319d0af10e2863
Last substantive checkpoint SHA: 53e963de059518dbc865ab9153319d0af10e2863
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-go-grpc-topology-bind-25187565
Last checkpoint: exact-head GitHub run 33689899601 / job 100445996051 at 0d86b6d passed all eleven required groups on Node 20 with receipt receipt:sha256:b8765cd35533224fa4f8090e; gate:clean PASS with inner receipt receipt:sha256:7d05be06a2eaa16eb8cf6163 and siblingWrites 0; canonical regression 3,288 total / 3,275 passed / 13 skipped / 0 failed; 12 proto services bound as SOURCE_FACT; 19/19 negative probes detected; DEF-C03-1 through DEF-C03-3 introduced by this campaign, all found, repaired and reported
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_VALIDATED_IMPLEMENTATION_SHA: 53e963de059518dbc865ab9153319d0af10e2863
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 53e963de059518dbc865ab9153319d0af10e2863
LAST_DOCUMENTATION_CHECKPOINT_SHA: 0d86b6d258fdc6aa3f36ff689950abefc4da15f1
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Bind protobuf services to the Go gRPC registration topology that serves them,
at service level, as mechanically proven `SOURCE_FACT`s — without claiming a
whole-repository completeness that ouchan's enumeration cannot support.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed. Twelve proto services are bound to
ouchan registrations as mechanically proven SOURCE_FACTs, certified by
exact-head CI run 33689899601 / job 100445996051 at `0d86b6d` with all eleven
required groups PASS. `W-EFFECT_RPC` remains UNSUPPORTED with its exact
blocker, which §29 makes a successful outcome. C-04
`nightwatch-frontend-consumer-intelligence-c04-v1` is the next authorized
campaign and does not depend on this one.

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

NONE.

## Exact Next Action

STOP — C-03 is COMPLETE and certified by exact-head CI run 33689899601 / job
100445996051 at `0d86b6d`. C-04 `nightwatch-frontend-consumer-intelligence-c04-v1`
is the next authorized campaign; it depends on C-01 rather than on C-03 and is
not blocked.

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
| `src/core/source/approvedScan.ts` | fourteen blueapi + fourteen blue-sdk-go roots; ouchan file and byte budgets | IMPLEMENTED |
| `src/core/source/protoServiceIndex.ts` | proto service facts and generated-SDK descriptors | IMPLEMENTED |
| `src/core/source/grpcTopology.ts` | the three-link join with categorical states | IMPLEMENTED |
| `tests/unit/c03GrpcTopology.test.ts` | join, completeness discipline, real yield, no-eviction | 23/23 PASS |
| `tests/unit/c02aOpenApiAdmission.test.ts` | two assertions rescoped from root-list description to the property defended | PASS |
| `tests/unit/c02bProtoSurface.test.ts` | one assertion rescoped likewise | PASS |

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

Command: measured C-03 topology yield against the real sibling checkouts
Result: 12 PROVEN, 12 distinct proto services, 0 ambiguous / 0 missing /
0 multiple / 0 stale, 1 UNSUPPORTED
When: 2026-09-03, session worktree
Relevant failure/output summary: bound services are Admin, Billing, Cost,
Cover, Flags, Flow, GuaranteedCommitments, Iam, Luster, Operations,
Organization, Preferences, across 7 daemon directories (`services/blued`
carries six). `RegisterMetricsControlPlaneServer` is UNSUPPORTED with blocker
`SDK_DESCRIPTOR_UNOBSERVED`. All 15 SDK descriptors pair uniquely; 421 test
files excluded; ouchan enumeration TRUNCATED with `repositoryCompleteProof`
false.

Command: `npx playwright test` over the C-02a, C-02b, C-06, phase25 and census
suites after the admission
Result: PASS 109/109 after three truthful assertion updates; 106/109 before
When: 2026-09-03, session worktree
Relevant failure/output summary: two assertions described blueapi's root list
("exactly two roots wide") rather than the property they defend, and C-03
legitimately changed that list under an owner decision; they now assert that
`openapiv2` and `billing` are admitted, that `protos` is not, and that no
repository was admitted. The third compared a repository-wide counter to the
artifact's own definition total — equal only while the artifact was the sole
OpenAPI source with definitions. Raising ouchan's budget made its own
`services/*/docs/swagger.json` files visible, contributing 328 further bound
definitions, so the counter is now compared to the repository-wide sum.

Command: method-level investigation against the real sibling checkouts
Result: POSITIVE direction supportable; NEGATIVE direction unattainable
When: 2026-09-03, session worktree
Relevant failure/output summary: the generated `BillingServer` interface
declares 147 methods for 147 RPCs, and `services/billingd` defines 143 of them
on `*service` across three files. Across the twelve proven bindings, 531 of 549
RPCs have an observed handler method, and six services reach an exact count
(Cost 72/72, Flow 18/18, Luster 19/19, Organization 7/7, Operations 5/5,
Flags 2/2). What cannot be decided is the other 18: an RPC with no observed
method may be unimplemented and inheriting the embedded base, or its file may
simply not have been enumerated. While ouchan is TRUNCATED those two are
indistinguishable.

Command: 19 negative probes (12 against `hardening:check`, 7 behavioural)
Result: 19/19 DETECTED, 19/19 RESTORED_PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: five failures on the first pass, all mine.
Two hardening rules were vacuous — one was satisfied by the import line while
the filter it named was deleted, and one matched the word inside the comment
that explains it — and three tests were too weak to notice their rule being
removed, because a single-service fixture cannot exercise a disambiguation
rule and no fixture asserted a NEGATIVE corroboration. All five repaired and
re-probed.

Command: full validation matrix at 53e963d
Result: PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: typecheck, hardening, handoff, agent, agent
audit, workspace and gate inventory all PASS; semantic compatibility 2,033 /
2,020 / 13 skipped / 0 failed; synthetic campaign 511/511 across 23 files with
the deep containment lane PROVEN; full canonical regression 3,288 total / 3,275
passed / 13 skipped / 0 failed, up 60 on C-02b's 3,228 for the 60 tests this
campaign adds.

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

Decision: embedding corroboration is scoped to the Go package directory, not
the file, and requires the same resolved import path.
Reason: real daemons register in `main.go` and embed
`Unimplemented<Service>Server` in `service.go`, so a same-file rule reported
zero corroboration across the whole repository while the evidence sat one file
away. Requiring the import path to match as well stops an unrelated package's
identically named embedding from corroborating anything.
Evidence/constraint: all 12 proven bindings are corroborated under the
directory rule and none under the file rule.

Decision: implement the method-level prototype as POSITIVE_ONLY and keep
`W-EFFECT_RPC` UNSUPPORTED.
Reason: §29 requires COMPLETE repository enumeration before an effect closure
can be sound, and ouchan cannot reach COMPLETE under the contract ceiling. A
handler count that happens to be exact does not change that; `completenessClaim`
is `NONE` even at 72/72.
Evidence/constraint: measured 531/549 observed handlers with 18 undecidable.

Decision: avoid the regular-expression method whose name collides with the
process-spawning one, rather than relax the source-authority guard that
forbids it.
Reason: the guard matches that identifier textually across
`src/core/source/**` and cannot tell a regular expression from a child
process. Loosening a safety rule so this campaign's code could pass is exactly
the trade the operating rules forbid; rewriting the call is free.
Evidence/constraint: `hardening:check` fired on `goRegistration.ts` and
`protoServiceIndex.ts`, and then on the COMMENT that explained the workaround.

## Discoveries

- The repository's `src/core/source/**` authority guard matches that
  identifier as bare text, so a regular-expression call — and even a comment
  naming it — reads as process authority. Worth narrowing one day the way the
  sibling-reader rule already does; not narrowed here, because relaxing a
  safety rule to suit a campaign is the wrong direction.

- Raising ouchan's budget revealed eleven `services/*/docs/swagger.json`
  documents that had never been enumerated, adding 328 bound response
  definitions and 341 ouchan operations. That is new reach delivered by a
  budget correction rather than by a parser.

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

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-03 is COMPLETE and certified.

Final substantive checkpoint: 53e963d
Final documentation checkpoint: 0d86b6d258fdc6aa3f36ff689950abefc4da15f1
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,288 total / 3,275 passed / 13 skipped / 0 failed;
semantic compatibility 2,033 / 2,020 / 13 / 0; synthetic campaign 511/511 with
the deep containment lane PROVEN. `gate:local` was NOT re-run at the final head
and is not claimed; `gate:clean` and exact-head CI each executed all eleven
groups at that exact SHA.
Artifacts: `src/core/source/goRegistration.ts`,
`src/core/source/protoServiceIndex.ts`, `src/core/source/grpcTopology.ts`; the
blueapi and blue-sdk-go root admission and ouchan budget correction in
`approvedScan.ts`; `checkC03GrpcTopologyBoundary()` in
`bin/hardening-check.mjs`; two registered suites; SPEC/PLAN/STATE/REPORT and
the OpenSpec change.
Known issues: ouchan enumeration is permanently TRUNCATED under the contract
ceiling, so four daemons stay unobserved and `W-EFFECT_RPC` stays UNSUPPORTED.
`tests/unit/c02aOpenApiAdmission.test.ts` and
`tests/unit/c06PhpReadOnlyProof.test.ts` remain unregistered in both gate
manifests; PRE_EXISTING.
Recommended next task: `nightwatch-frontend-consumer-intelligence-c04-v1` (C-04).
