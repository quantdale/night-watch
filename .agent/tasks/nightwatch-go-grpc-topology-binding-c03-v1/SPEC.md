# SPEC — C-03 Go/gRPC Topology Binding

Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Phase: GO_GRPC_TOPOLOGY_BINDING_C03_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Predecessor Task ID: nightwatch-protobuf-source-intelligence-c02b-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_GO_GRPC_TOPOLOGY_BINDING_C03_V1

## Frozen intent

Bind protobuf service declarations to the Go gRPC registration topology that
serves them, as `SOURCE_FACT`s with mechanically proven provenance, at
SERVICE level.

C-03 is on the mapping path. It is not production authority, and it does not
become a Go call-graph campaign.

## Owner decision recorded at the start

C-02b left every blueapi proto root except `billing` unread, so only one proto
service existed as a fact and the `≥12` acceptance was arithmetically
unreachable. The owner was asked and chose to admit the remaining fourteen
blueapi proto roots, following the C-02a precedent that a per-root change
inside an already-admitted repository is not a repository admission.

`alphauslabs/blueinternal` and `wave-api` remain outside the universe. No
repository is admitted. That boundary is unchanged and hardening-guarded.

## Measured starting state

Go registration topology in `mobingilabs/ouchan@565f00a8`:

- 17 production `Register<X>Server(gs, svc)` call sites across 15 daemon
  directories under `services/` (`blued` alone registers six).
- 2 further call sites in `_test.go` files, which must never become topology
  facts.
- 15 of the 17 name a blueapi proto service; `MetricsControlPlane` and
  `WebToolControlPlane` do not.

Proto surface after the authorized root admission: 15 blueapi roots, one
`.proto` and one `service` each, 590 RPCs in total (147 `billing` from C-02b
plus 443 new).

Enumeration truth for `mobingilabs/ouchan`, measured before any change:

| maxFiles | roots | enumeration | examined | registration daemons visible |
|---|---|---|---|---|
| 1,024 (current) | services, pkg | TRUNCATED | 857 | **0 of 12** |
| 4,096 (contract ceiling) | services, pkg | TRUNCATED | 3,156 | 8 of 12 |
| 4,096 | services only | COMPLETE | 2,623 | 12 of 12 |

At the current budget C-03 cannot observe a single registration file. The walk
counts every directory entry, so `pkg` (sorted first) consumes the budget
before `services` is reached.

A COMPLETE ouchan enumeration over both approved roots is **unreachable**: the
walk needs more considered entries than `MAX_SIBLING_SOURCE_SCAN_FILES` (4,096)
permits. That is a contract ceiling, and raising it is not this campaign's to
take.

## Scope

- Raise `mobingilabs/ouchan`'s per-repository `maxFiles` from 1,024 to the
  existing 4,096 contract ceiling. No contract constant changes.
- Admit the fourteen further blueapi proto roots (owner-decided above).
- A bounded Go lexer for `Register<X>Server` registration and
  `Unimplemented<X>Server` embedding.
- A proto service fact index built from C-02b's reader.
- A categorical join with explicit states, and canonical service identities.
- Hardening rules with negative probes; gate-registered suites.

## Non-goals

- No Go type checking, no call graph, no toolchain, no `go` invocation.
- No repository admission. No change to `MAX_SIBLING_SOURCE_SCAN_FILES`.
- No `W-EFFECT_RPC` unless every §29 precondition is demonstrably met. It is
  not: ouchan enumeration cannot be COMPLETE, so `UNSUPPORTED` is the
  truthful and expected outcome.
- No production, DEV or NEXT contact; no credentials; no customer data.

## Completeness discipline

`POSITIVE_SOURCE_FACT` and `REPOSITORY_COMPLETE_PROOF` are distinct and must
never be conflated. A registration observed in an enumerated, read file is a
positive fact. Because ouchan enumeration remains TRUNCATED with
`remainingUnknown: true`:

- no whole-repository claim may be made;
- no negative fact may be derived from absence — an unobserved daemon is
  `TRUNCATED_ENUMERATION`, never `MISSING`;
- no complete effect closure may be claimed.

## Acceptance

1. ≥12 proto services bound to ouchan registrations as `SOURCE_FACT`, each
   mechanically proven, or a truthful measured shortfall with a categorical
   blocker per unbound service.
2. Registrations in `_test.go` are never topology facts.
3. Registrations inside comments or strings are never topology facts.
4. Every ambiguous case is non-`SOURCE_FACT`, with an explicit join state.
5. Enumeration truth preserved: TRUNCATED stays TRUNCATED, `remainingUnknown`
   stays true, and no whole-repository completeness is claimed.
6. `W-EFFECT_RPC` remains `UNSUPPORTED`, recorded with its exact blocker.
7. No repository admitted; blueinternal and wave-api still absent.
8. C-01 no-eviction holds across the enlarged operation population.
9. New suites gate-registered; hardening probes bite.
10. Canonical regression zero failures; local, clean and exact-head CI green;
    siblingWrites 0; session released.

## Safety constraints

Read-only sibling access through `siblingSource.ts` only; bounded loops and
explicit ceilings; structural facts and digests only in durable evidence; fail
closed to AMBIGUOUS/UNSUPPORTED; explicit synthetic roots in fixtures; no
repository write while `gate:clean` evidence is running.

## Declared Deletions

None.
