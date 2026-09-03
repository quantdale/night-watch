# EXECUTION PROMPT — C-03 Go/gRPC Topology Binding

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-go-grpc-topology-binding-c03-v1
OpenSpec: openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/
Planned-From: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Target Branch: main
Predecessor Task ID: nightwatch-protobuf-source-intelligence-c02b-v1
Predecessor Status: COMPLETE

## Mission

Bind protobuf services to the Go gRPC registration topology that serves them,
at SERVICE level, as mechanically proven `SOURCE_FACT`s — and keep positive
facts strictly apart from a repository completeness that ouchan's enumeration
cannot support.

## Authority

Repository-local, offline, read-only source intelligence. Sibling Alphaus
repositories are read through the existing path-confined boundary and never
written. No Go toolchain, no type checking, no call graph, no networking.

Two authorized scope items, both recorded in the OpenSpec audit: the fourteen
further blueapi proto roots (owner-decided, on the C-02a precedent that a root
inside an admitted repository is not a repository admission), and raising
ouchan's `maxFiles` to the existing 4,096 contract ceiling. No repository is
admitted; `MAX_SIBLING_SOURCE_SCAN_FILES` is unchanged.

No real production, DEV or NEXT contact, authenticated browsing, credential or
auth-state inspection, customer-data or datastore access, cloud/IAM/Kubernetes
discovery, sibling-repository write, or external publication is authorized or
performed. C-12 is NOT authorized and is NOT begun.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-go-grpc-topology-bind-25187565`.

## Ordered workstreams

1. Task record, OpenSpec change, recorded baseline.
2. Adversarial Go corpus, asserted before the parser.
3. Bounded Go registration lexer with import-alias resolution.
4. Root admission and ouchan budget correction; C-01 no-eviction.
5. Proto service index and the categorical join.
6. Completeness discipline and the W-EFFECT_RPC determination.
7. Hardening rules with recorded negative probes; gate registration.
8. Full validation matrix, integration, exact-head CI, closure.

## Constraints

Bounded loops and explicit ceilings; categorical states rather than defaults;
structural facts and digests only in durable evidence; fail closed to
AMBIGUOUS/UNSUPPORTED; explicit synthetic roots in every fixture; no repository
write while `gate:clean` evidence is running.

## Validation

`npm run typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `workspace:check`, `gate:inventory`,
`test:semantic-compat`, `campaign:synthetic`, the new C-03 suites, the C-02b
suites, source inventory and completeness suites, the full canonical
regression, `gate:local`, `gate:clean`, and exact-head GitHub Actions.

## Acceptance and completion gates

The ten acceptance rows of
`.agent/tasks/nightwatch-go-grpc-topology-binding-c03-v1/SPEC.md`, each carried
in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
