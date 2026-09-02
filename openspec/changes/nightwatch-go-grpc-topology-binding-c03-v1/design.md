# Design — C-03

## The join key

protoc-gen-go names the registration function `Register<Service>Server` for
`service <Service>`. That is the mechanical bridge, and it is the only one this
design trusts:

```
proto:  service Billing            in package blueapi.billing.v1
go:     billing.RegisterBillingServer(gs, svc)   in services/billingd/main.go
                  └── Register + "Billing" + Server
```

The Go side is only half a key, because `Register<X>Server` says nothing about
which package `X` came from. The package qualifier (`billing.`) is resolved
through the file's own import block to a module path
(`github.com/alphauslabs/blueapi/billing`), and that path is matched against
the proto file's `option go_package`. Both halves must agree.

Matching on the symbol alone would bind any `Billing` service in any package;
matching on the import path alone would bind a package that registers several
services. Requiring both is what makes the result a fact rather than a
coincidence of naming.

## Join states

| State | Meaning |
|---|---|
| `PROVEN` | exactly one proto service and one registration agree on symbol and go_package |
| `AMBIGUOUS` | the qualifier cannot be resolved, or resolution yields more than one candidate |
| `MULTIPLE` | several registrations of one proto service across observed files |
| `MISSING` | resolved to a package in the approved universe that declares no such service |
| `UNSUPPORTED` | the registration names a service with no proto in the approved universe |
| `STALE` | the proto snapshot SHA differs from the one the fact was derived at |

`MISSING` and `UNSUPPORTED` are deliberately distinct. `MetricsControlPlane`
is `UNSUPPORTED` — Nightwatch cannot see its proto — and calling that
`MISSING` would assert something about Alphaus that this campaign has no
evidence for.

## Completeness, kept separate from the facts

Two claims are modelled independently and must never be merged:

- `POSITIVE_SOURCE_FACT` — this registration was observed in an enumerated,
  read file, and it is proven. True regardless of enumeration completeness.
- `REPOSITORY_COMPLETE_PROOF` — every registration in the repository has been
  observed. **False** for ouchan, permanently, under the current contract
  ceiling.

So the topology may say "these twelve bindings are proven" and must never say
"these are the twelve bindings that exist". Unobserved daemons carry
`TRUNCATED_ENUMERATION`.

## Test files

`_test.go` is excluded from topology facts by path, before parsing. The
exclusion is asserted against the two real call sites in
`pkg/exportcostfilters`, not only against a synthetic fixture.

## Why W-EFFECT_RPC stays UNSUPPORTED

§29 requires an exact RPC→handler join, COMPLETE repository enumeration,
bounded resolution of every traversed callee, a complete effect vocabulary,
fail-closed dynamic dispatch, and represented external and write effects.

The second condition alone is unsatisfiable: ouchan enumeration cannot be
COMPLETE. A campaign cannot prove "this RPC performs no write" from a file set
it knows is partial. `UNSUPPORTED` is therefore recorded with that exact
blocker, and it is a successful outcome rather than a shortfall.
