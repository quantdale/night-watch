# Active Task

Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Phase: GO_GRPC_TOPOLOGY_BINDING_C03_V1
Title: C-03 Go/gRPC Topology Binding
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1
Starting SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last validated implementation SHA: 53e963de059518dbc865ab9153319d0af10e2863
Last checkpoint: exact-head GitHub run 33689899601 / job 100445996051 at 0d86b6d passed all eleven required groups on Node 20 with receipt receipt:sha256:b8765cd35533224fa4f8090e, SEMANTIC_COMPATIBILITY 2,033/2,020/13/0 and SYNTHETIC_CAMPAIGN 511/486/25 skipped; gate:clean PASS with inner receipt receipt:sha256:7d05be06a2eaa16eb8cf6163 and siblingWrites 0; canonical regression 3,288 total / 3,275 passed / 13 skipped / 0 failed; 12 proto services bound as SOURCE_FACT across 7 daemon directories; 19/19 negative probes detected; DEF-C03-1 through DEF-C03-3 introduced by this campaign, all found, repaired and reported
Current milestone: COMPLETE / STOP — M1 through M8 are closed
Next action: STOP — C-03 is COMPLETE and certified by exact-head CI run 33689899601 / job 100445996051 at 0d86b6d. W-EFFECT_RPC remains UNSUPPORTED with its exact blocker, which is a successful outcome. C-04 `nightwatch-frontend-consumer-intelligence-c04-v1` is the next authorized campaign and depends on C-01 rather than on C-03
Authorization class: NIGHTWATCH_GO_GRPC_TOPOLOGY_BINDING_C03_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_VALIDATED_IMPLEMENTATION_SHA: 53e963de059518dbc865ab9153319d0af10e2863
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 53e963de059518dbc865ab9153319d0af10e2863
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_GO_GRPC_TOPOLOGY_BINDING_C03_V1_STATUS: COMPLETE

## Routing and safety

C-03 binds protobuf services to the Go gRPC registration topology that serves
them, at SERVICE level, as mechanically proven `SOURCE_FACT`s. It is on the
mapping path and carries no production authority.

Two scope decisions are recorded in the task SPEC and OpenSpec audit. The owner
authorized admitting the fourteen further `alphauslabs/blueapi` proto roots,
following the C-02a precedent that a root inside an already-admitted repository
is not a repository admission; without it the `≥12` acceptance was
arithmetically unreachable. And `mobingilabs/ouchan`'s `maxFiles` rises from
1,024 to the existing 4,096 contract ceiling, because at 1,024 not one
registration file is enumerated at all. `MAX_SIBLING_SOURCE_SCAN_FILES` is NOT
changed, no repository is admitted, and `alphauslabs/blueinternal` and
`wave-api` remain outside the universe.

ouchan enumeration stays truthfully TRUNCATED with `remainingUnknown: true`. A
COMPLETE walk of both approved roots is unreachable under the contract ceiling,
so `POSITIVE_SOURCE_FACT` and `REPOSITORY_COMPLETE_PROOF` are kept strictly
apart, no negative fact is derived from absence, and `W-EFFECT_RPC` remains
`UNSUPPORTED` with that exact blocker recorded.

This is a repository-local, offline, read-only campaign. Sibling Alphaus
repositories are read through `src/core/source/siblingSource.ts` only and are
never modified. No Go toolchain, no type checking, no call graph. No real
production, DEV or NEXT contact; no credential, cookie, token or auth-state
access; no customer data; no cloud, IAM, Kubernetes or datastore access; no
external publication.

C-11 is unchanged. C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-go-grpc-topology-bind-25187565`; the canonical checkout is
never used for implementation.
