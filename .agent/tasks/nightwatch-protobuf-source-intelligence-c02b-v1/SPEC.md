# SPEC — C-02b Protobuf Source Intelligence

Task ID: nightwatch-protobuf-source-intelligence-c02b-v1
Phase: PROTOBUF_SOURCE_INTELLIGENCE_C02B_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: fab7675883b15bdfc29bcc946d52b2762fe96b2f
Predecessor Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_PROTOBUF_SOURCE_INTELLIGENCE_C02B_V1

## Frozen intent

Add bounded, deterministic protobuf **source intelligence** over the source
roots that are **already** approved, so that Nightwatch can mechanically state,
per RPC:

- the declaring package and service;
- the RPC symbol and its canonical identity;
- the request and response message types;
- client- and server-streaming classification;
- the `google.api.http` binding (method, route template, body presence) when
  and only when it is mechanically proven;
- a completeness state that never presents a floor as a total.

and so that the C-02a generated OpenAPI artifact can be corroborated **per
operation identity**, not by counting.

C-02b complements C-02a. It does not replace it, and it does not weaken it.

## Why this campaign exists

`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md` narrowed C-02 to
C-02a (OpenAPI admission, done) plus C-02b, which remains necessary for exactly
three things OpenAPI cannot supply:

1. **Streaming RPCs.** Swagger 2.0 cannot represent a gRPC stream at all.
2. **The proto service ↔ RPC symbol** that C-03 joins Go registration against.
   C-03 must not manufacture this itself.
3. **Corroboration of the generated artifact.** `evaluateGenerationCurrency`
   in `src/core/source/generatedArtifact.ts` already has the seam, and
   `PROTO_SURFACE_CORROBORATIONS` is deliberately empty, so blueapi's
   generation currency is honestly `UNKNOWN` today.

## Scope

- A new bounded protobuf lexer/parser module.
- A durable proto declaration fact model (service / RPC / message / streaming /
  HTTP binding / completeness / provenance).
- `PROTOBUF` as a scan language and `.proto` as an approved extension, admitted
  through the existing owner-approved root machinery.
- `parseProtoRoutes` participation in existing route discovery, subject to the
  existing C-01 truncation and completeness contracts.
- A deterministic per-operation corroboration between the proto HTTP surface
  and the C-02a generated OpenAPI surface.
- Hardening rules for the new load-bearing invariants, each negative-probed.
- Gate registration of every new suite.

## Non-goals

- No protobuf compilation, no `protoc`, no `buf`, no descriptor decoding.
- No generated-code reading, no gRPC client, no runtime networking.
- No dynamic evaluation, no `child_process`, no new filesystem authority
  outside the existing `siblingSource.ts` boundary.
- No new **repository** admission. `alphauslabs/blueinternal` and `wave-api`
  stay out; they are C-05's.
- No production, DEV or NEXT contact; no credentials; no customer data.
- No C-03 implementation. If C-02b cannot supply the service↔RPC symbol C-03
  needs, C-03 is recorded BLOCKED rather than faked.

## Source boundary

Only roots already in `APPROVED_ROOTS` (`src/core/source/approvedScan.ts`) are
inspected. Measured proto presence inside that universe at the pinned SHAs:

| Approved root | `.proto` files |
|---|---|
| `alphauslabs/blueapi` `billing` | 1 (`billing/v1/billing.proto`) |
| `alphauslabs/blueapi` `openapiv2` | 0 |
| `alphauslabs/blue-sdk-go` `billing` | 0 |
| `mobingilabs/ouchan` `services` | 0 |
| `mobingilabs/ouchan` `pkg` | 1 (`pkg/sapphire/proto/v1/types.proto`, 0 services) |
| `mobingilabs/ripple-api` `src` | 0 |
| `mobingilabs/ripple-ui` `src` | 0 |
| `alphauslabs/grpc-chunk-parser` `src` | 0 |

Substantial protobuf source exists in **unadmitted roots** of `blueapi`
(`api/`, `cost/`, `cover/`, `iam/`, `pricing/`, `protos/`, …) and in
repositories outside the universe. Both are recorded as
`BLOCKED_BY_C05_REPOSITORY_ADMISSION` and neither is read for facts.

## Acceptance

1. `alphauslabs/blueapi` `billing` yields **≥ 147** mechanically proven RPCs,
   each carrying verb, route template, request message and response message,
   or a truthful measured shortfall with a categorical cause per missing RPC.
2. **Zero** facts derived from a comment, a string literal, or a malformed
   option block, proven by an adversarial corpus.
3. Streaming classification distinguishes unary / client / server /
   bidirectional, with the measured distribution reported rather than an
   inherited documentation figure.
4. A deterministic proto ↔ generated-OpenAPI corroboration exists and
   categorizes every operation as MATCH / OPENAPI_ONLY / PROTO_ONLY /
   METHOD_MISMATCH / PATH_MISMATCH / AMBIGUOUS / UNCORROBORATABLE.
5. Generated evidence is upgraded out of `UNKNOWN` only on per-operation
   identity evidence, never on count similarity.
6. Completeness is propagated; no operation discovered before the change is
   evicted after it (C-01 no-eviction regression).
7. Every new suite is registered in the authoritative quality-gate manifest.
8. Every new load-bearing hardening rule is negative-probed: mutation FAILS,
   restoration PASSES, both recorded.
9. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
   exact-head CI PASS; `siblingWrites` 0; session released.

## Safety constraints

- Read-only over sibling repositories, through `siblingSource.ts` only.
- Bounded: file count, file bytes, total bytes, token count, nesting depth and
  every loop must have an explicit ceiling; exhaustion is reported, never
  silently truncating a fact into existence.
- Durable evidence carries structural facts and digests only — never raw
  comment text, never arbitrary source text.
- Fail closed: anything not mechanically proven stays UNKNOWN/AMBIGUOUS and
  never becomes a `SOURCE_FACT`.
- No workspace-root inference from checkout location; all synthetic roots in
  tests are explicit (C-11 lesson 5.4).
- No repository-owned file is written while `gate:clean` evidence is running
  (C-11 lesson 5.5).

## Declared Deletions

None.
