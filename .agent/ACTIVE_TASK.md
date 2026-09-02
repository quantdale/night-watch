# Active Task

Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Phase: GO_GRPC_TOPOLOGY_BINDING_C03_V1
Title: C-03 Go/gRPC Topology Binding
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1
Starting SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last validated implementation SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Last checkpoint: M1 opened at the C-02b closure head 03bab54 with the ouchan enumeration limit and the Go registration inventory measured before any code
Current milestone: M1 — task record, OpenSpec change, recorded baseline
Next action: Write the OpenSpec change, run `npm run agent:check` and `npm run handoff:check`, commit the M1 checkpoint, then begin M2 by asserting the adversarial Go registration corpus before the parser exists
Authorization class: NIGHTWATCH_GO_GRPC_TOPOLOGY_BINDING_C03_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_VALIDATED_IMPLEMENTATION_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_GO_GRPC_TOPOLOGY_BINDING_C03_V1_STATUS: IN_PROGRESS

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
