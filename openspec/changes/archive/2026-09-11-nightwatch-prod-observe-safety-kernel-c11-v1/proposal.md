# Proposal — C-11 `PROD_OBSERVE` safety kernel

## Why

Every earlier production-observability campaign built a component. C-11 builds
the thing that decides. Its whole value is that Nightwatch becomes **incapable**
of issuing a production request unless every required machine authority grants
it — and that the incapability is demonstrated rather than asserted.

The historical design cannot be implemented as written. Its in-repo observation
config re-creates what D-4 removed; its "invert the deny table" proposal is one
boolean from catastrophe; its gate count contradicts its own gate labels; and
its separation claim rests on the entry point rather than the import graph.
`audit.md` classifies every historical requirement and `design.md` resolves the
conflicts, so C-11 implements a reconciled design instead of an obsolete one.

## What changes

1. A distinct `PROD_OBSERVE` authorization class — finite, scoped, expiring and
   one-shot, failing `ALREADY_CONSUMED` on reuse — aliased to nothing.
2. A distinct `productionRunGate`. `realRunGate` gains no production branch and
   no mode parameter, and hardening proves it.
3. Import-graph separation enforced in both directions, with shared modules
   taking policy by injection and no default. Missing policy denies.
4. External-only observation configuration, and a `PROD_OBSERVE` allowlist built
   solely from it. `KNOWN_PRODUCTION_HOSTS` stays deny-only in every mode and
   the production policy may not import it.
5. One versioned, named, ordered admission chain of eighteen gates, digested and
   recorded by ID, replacing an acceptance criterion phrased as a count.
6. Route authority bound mechanically to C-10.5's source-derived vocabularies;
   parameter provenance bound to C-10's opaque handles.
7. Reservation-based race-safe budgets, terminal categorical breakers, and a
   kill switch evaluated at entry AND immediately before dispatch.
8. A loopback-only mock production environment, a complete one-fault denial
   matrix with network-side zero-contact proof, one non-vacuous positive
   synthetic path, and a tamper-resistant PQ receipt.
9. A validator that fails when an intended C-11 certification suite belongs to
   no authoritative quality-gate group.

## What does not change

- No real production, DEV or NEXT contact. Mock production is loopback-only.
- D-4 stands: production never becomes a selectable environment and
  `config/environments/production.json` stays unloadable.
- C-06 is not weakened; `READ_ONLY_PROVEN` is not increased.
- C-10 privacy and C-10.5 provenance are consumed, not modified.
- No credential, auth state, cookie or token is created, requested or read.
- P1 passive observation is not implemented and C-12 is not begun.
