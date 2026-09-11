# Proposal — PHP Read-Only Proof (C-06)

## Why

Nightwatch's read-only authority for `mobingilabs/ripple-api` was an
eleven-row hand-authored operation catalog. `surfaces.ts:186` reduced the
whole question "may Nightwatch call this route?" to "is the verb GET and does
`PHASE5_API_CATALOG` call it `KNOWN_READ`?". That is a human judgement wearing
a mechanical label, and D-79 already proved it is the failure mode that
actually occurs: two of those rows were reproduced as false-positive
admissions.

The independent review's F-01 then measured something worse. The proof the
master plan specified is rooted at the PHP handler's call closure, but Ripple
is a Slim-style application whose middleware pipeline is attached per route
group and is not part of any handler's closure. `RouteProvidor.php` attaches
`MarketplaceSubscriptionMiddleware` to every route group whose routing config
enables `x-header`, and that middleware's `__invoke` carries no HTTP-method
guard and performs an outbound `curl` to an external host on every request.

A handler-rooted proof therefore declares such a route read-only while the
request leaves the analysable region on every invocation. The unsound
component is the one the entire near-term production path depends on.

## Change

Replace catalog membership with mechanically derived, fail-closed proof:

> Read-only classification is decided after the route → handler join, from the
> route's FULLY RESOLVED middleware pipeline plus its handler, through a
> bounded effect closure classified by a versioned data-only effect-kind
> vocabulary. `PROVEN_READ_ONLY` requires at least one declaration witness AND
> at least one effect witness. No catalog row, and no generated OpenAPI
> artifact, can produce it.

Four new data-only modules and one wiring change:

- `effectVocabulary.ts` — the eight effect kinds, their owner-approved
  admission policy, the identifier tables, the dynamic-dispatch construct
  lists, the analyzer bounds, and a deterministic vocabulary digest.
- `phpPipeline.ts` — mechanical route → middleware pipeline resolution from
  the route provider and the per-route routing flags. Unresolvable ⇒
  `AMBIGUOUS`; there is no handler-only fallback.
- `phpEffectClosure.ts` — the bounded walk over pipeline entrypoints plus the
  handler, with categorical refusals for dynamic dispatch, unresolved and
  unclassified callees, and every bound.
- `readOnlyProof.ts` — the kind-diverse, effect-mandatory lattice, carrying
  the join precondition, the inventory-completeness assertion, the vocabulary
  digest and the per-kind effect ledger.

## Impact

The measured `READ_ONLY_PROVEN` population over the approved universe falls
from 5 to 0. That is the intended result, not a regression: all five were
catalog-granted, two of them are the historical D-79 admissions, and 79
`ripple-api` GET routes are now positively shown to perform an outbound call
through their resolved pipeline.

The count is REPORTED. It is not a target, and no mechanism that reduces it
may be weakened to raise it.
