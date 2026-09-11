# Proposal — Go/gRPC Topology Binding (C-03)

## Why

Nightwatch can now read 590 protobuf RPCs and it admits 2,300 Go files, and it
cannot say which Go process serves which proto service. The System Map needs
that edge, C-06 wants a Go effect witness, and C-15b cannot draw a service
without it.

`SERVICES.md`, directory naming and package names all *suggest* the answer.
None of them prove it. `services/billingd/main.go` calling
`billing.RegisterBillingServer(gs, svc)` proves it, and that is the only thing
this campaign is willing to call a fact.

## Change

> A bounded Go lexer recognises `pkg.Register<X>Server(...)` registration and
> `Unimplemented<X>Server` embedding, resolving the package qualifier through
> the file's own import block; a deterministic index keys proto service facts
> by the generated symbol a registration would use; and a categorical join
> binds the two, emitting `SOURCE_FACT` only when the binding is mechanically
> proven and an explicit non-proven state otherwise.

## Two admissions this change carries, both deliberate

**The fourteen further blueapi proto roots.** C-02b admitted only `billing`,
so exactly one proto service existed as a fact and the `≥12` acceptance was
arithmetically unreachable. The owner was asked and chose to admit the rest,
following C-02a's precedent that a root inside an already-admitted repository
is not a repository admission. `blueinternal` and `wave-api` stay out.

**ouchan's file budget.** At `maxFiles: 1024` the enumeration walk sees 857
entries and **not one** of the twelve registration daemons: the walk counts
every considered directory entry and `pkg` sorts before `services`. Raising the
budget to the existing 4,096 contract ceiling makes 8 of 12 daemons observable
and 12 proto services bindable. `MAX_SIBLING_SOURCE_SCAN_FILES` itself is not
touched.

## What this change refuses to do

- It does not claim ouchan is completely enumerated. It cannot be: a full walk
  of both approved roots needs more considered entries than the contract
  ceiling allows. Enumeration stays TRUNCATED with `remainingUnknown: true`.
- It does not derive a negative fact from absence. An unobserved daemon is
  `TRUNCATED_ENUMERATION`, never `MISSING`.
- It does not implement `W-EFFECT_RPC`. Sound effect proof needs COMPLETE
  enumeration, which ouchan cannot give, so `UNSUPPORTED` is the truthful
  outcome and a valid success for this campaign.
- It does not narrow ouchan's roots to buy a better completeness number.

## Impact

- New: `src/core/source/goRegistration.ts`,
  `src/core/source/protoServiceIndex.ts`, `src/core/source/grpcTopology.ts`.
- Changed: `src/core/source/approvedScan.ts` (fourteen roots, ouchan budget),
  `config/synthetic-campaign.v1.json`, `bin/hardening-check.mjs`.
- Risk: the operation population grows by 443 proto operations, so the C-01
  no-eviction assertion is again a required acceptance row rather than a
  formality.
