# Proposal — Protobuf Source Intelligence (C-02b)

## Why

C-02a admitted `blueapi/openapiv2` and recovered 591 HTTP operations with zero
new parsers. It also recorded, honestly, what that artifact is: a *generated*
mirror whose relationship to the protobuf surface has never been mechanically
established. `PROTO_SURFACE_CORROBORATIONS` in
`src/core/source/generatedArtifact.ts` is an empty array on purpose, so
`evaluateGenerationCurrency` answers `UNKNOWN` and the artifact is barred from
being the sole basis of a production admission.

Three things are still missing, and only protobuf source supplies them.

1. **Streaming.** Swagger 2.0 cannot express a gRPC stream. Measured against
   the approved universe, 33 of the 147 `blueapi/billing` RPCs are
   server-streaming and are therefore invisible in the artifact — including
   `Billing.ListBillingGroups`, which the dependency map already names as a
   `HIGH` severity contract edge.
2. **The service ↔ RPC symbol.** C-03 binds Go `RegisterXServer` registration
   to a proto service. If C-03 derives the proto side itself, it is joining a
   name to a name. The symbol must come from the proto source as a fact.
3. **Corroboration.** The artifact carries exactly 147 `Billing`-tagged
   operations with `Billing_<RpcName>` operationIds. That is an exact
   per-operation join key — and it is the reason this proposal refuses to
   settle for a count comparison.

## Change

> Nightwatch reads `.proto` source through a new bounded lexer and
> recursive-descent declaration reader over the roots it has **already** been
> granted; it records package, service, RPC, request and response message,
> client/server streaming, and the `google.api.http` binding as structural
> facts with provenance and a completeness state; those proven HTTP bindings
> join the existing route-discovery path unchanged; and a new deterministic
> corroborator compares the proto HTTP surface to the C-02a generated surface
> **per operation identity**, categorising every operation rather than
> counting them.

No repository is admitted. No root is added. `PROTOBUF` becomes a scan
language and `.proto` an approved extension, which changes what the existing
approved roots yield, not which roots exist.

## What this deliberately does not do

- No `protoc`, no `buf`, no compilation, no descriptor decoding, no generated
  Go reading, no gRPC client, no networking.
- No count-based upgrade of generation currency. Agreement on 147 vs 147 while
  a single route differs is `PATH_MISMATCH`, not `CURRENT`.
- No C-03. If the service↔RPC symbol does not come out mechanically, C-03 is
  recorded BLOCKED.
- No expansion beyond the approved universe. Substantial protobuf source in
  unadmitted `blueapi` roots stays `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.

## Impact

- New: `src/core/source/protoLexer.ts`, `src/core/source/protoDeclarations.ts`,
  `src/core/source/protoCorroboration.ts`.
- Changed: `src/core/source/scanTypes.ts` (language + extension),
  `src/core/source/approvedScan.ts` (extension list),
  `src/core/source/surfaces.ts` (`parseProtoRoutes` dispatch),
  `src/core/source/generatedArtifact.ts` (identity-based corroboration input),
  `config/synthetic-campaign.v1.json` (suite registration).
- Risk: adding 147 operations to discovery is exactly the eviction hazard
  `F-27` named. The C-01 no-eviction regression is a required acceptance row,
  not an afterthought.
