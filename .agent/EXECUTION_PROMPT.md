# EXECUTION PROMPT — C-02b Protobuf Source Intelligence

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-protobuf-source-intelligence-c02b-v1
OpenSpec: openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/
Planned-From: fab7675883b15bdfc29bcc946d52b2762fe96b2f
Target Branch: main
Predecessor Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Predecessor Status: COMPLETE

## Mission

Give Nightwatch bounded, deterministic protobuf source intelligence over the
roots it has already been granted, so that gRPC streaming becomes visible, the
proto service↔RPC symbol becomes a fact C-03 can join against, and the C-02a
generated OpenAPI artifact is corroborated per operation identity rather than
by counting operations.

## Authority

Repository-local, offline, read-only source intelligence. Sibling Alphaus
repositories are read through the existing path-confined boundary and never
written. No protobuf compilation or execution, no descriptor decoding, no
generated-code reading, no gRPC client, no networking, no dynamic evaluation.
No new repository admission and no new root: this campaign adds a language and
an extension.

No real production, DEV or NEXT contact, authenticated browsing, credential or
auth-state inspection, customer-data or datastore access, cloud/IAM/Kubernetes
discovery, sibling-repository write, or external publication is authorized or
performed. C-12 is NOT authorized and is NOT begun.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-protobuf-source-intel-139a4f45`.

## Ordered workstreams

1. Task record, OpenSpec change, measured pre-implementation baseline.
2. Adversarial comment/string/malformed corpus, asserted before the parser.
3. Bounded lexer and bounded declaration reader.
4. HTTP annotation matrix and streaming matrix, ambiguity represented.
5. `PROTOBUF` language and `.proto` extension; `parseProtoRoutes` dispatch.
6. Completeness propagation and the C-01 no-eviction regression.
7. Per-operation OpenAPI corroboration wired to the C-02a seam.
8. Hardening rules with recorded negative probes.
9. Gate registration, full validation matrix, integration, exact-head CI.

## Constraints

Bounded loops and explicit ceilings everywhere; categorical exhaustion states;
structural facts and digests only in durable evidence; fail closed to
UNKNOWN/AMBIGUOUS; explicit synthetic roots in every fixture; no repository
write while `gate:clean` evidence is running.

## Validation

`npm run typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `workspace:check`, `gate:inventory`,
`test:semantic-compat`, `campaign:synthetic`, the new C-02b suites, the C-02a
and C-06 suites, source inventory and completeness suites, the full canonical
regression, `gate:local`, `gate:clean`, and exact-head GitHub Actions.

## Acceptance and completion gates

The nine acceptance rows of
`.agent/tasks/nightwatch-protobuf-source-intelligence-c02b-v1/SPEC.md`, each
carried in the REPORT requirement ledger with exact evidence. A campaign
cannot close while any mandatory row is NOT_STARTED, IN_PROGRESS, FAIL or
BLOCKED.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward push; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
