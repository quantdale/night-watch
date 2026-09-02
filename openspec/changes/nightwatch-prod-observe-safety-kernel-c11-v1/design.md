# Design — C-11 `PROD_OBSERVE` safety kernel

C-11 is **Production Qualification only**. It proves the architecture against
MOCK/SYNTHETIC production and grants no authority over real production.

## §1. The authoritative admission chain

`nightwatch.production-admission-chain.v1`. The NAMED ordered list is the
authority; the count is derived from it and never asserted (see `audit.md` §A).

| # | Gate ID | Asserts | Historical origin |
| --- | --- | --- | --- |
| 1 | `G_KILL_SWITCH_ENTRY` | no kill switch engaged at qualification entry | review SHOULD FIX (new position) |
| 2 | `G_OWNER_AUTHORIZATION` | a `PROD_OBSERVE` grant exists, is scoped to this campaign, is unexpired and is UNCONSUMED | `G0` |
| 3 | `G_AUTHORIZATION_CLASS` | the grant's class is `PROD_OBSERVE`, reached through the production kernel and not aliased to any other authority | `G1` |
| 4 | `G_ORGANIZATION_WINDOW` | now falls inside a finite, explicitly approved observation window | review EXPANDED (`G-ORG`) |
| 5 | `G_CONFIGURATION_INTEGRITY` | the observation config is external-only and passes every integrity requirement | F-09 (replaces in-repo config) |
| 6 | `G_OBSERVER_IDENTITY` | the observer identity class meets the stage minimum | review EXPANDED (was prose in `§5.6`) |
| 7 | `G_SOURCE_CURRENCY` | the source snapshot is COMPLETE and CURRENT at a pinned checkpoint | `G3` |
| 8 | `G_READ_ONLY_PROOF` | the target surface is `READ_ONLY_PROVEN` by two non-stale witnesses | `G4` |
| 9 | `G_ROUTE_AUTHORITY` | the route template is a PROVEN MEMBER of a mechanically source-derived vocabulary | `G5`, narrowed by C-10.5/DEF-C10-5 |
| 10 | `G_HOST_ADMISSION` | the host appears in the external allowlist | `G6a`, corrected by F-10 |
| 11 | `G_ADDRESS_POLICY` | the resolved address set is admissible and dialling is to an exact admitted numeric destination | `G6b` |
| 12 | `G_METHOD_AND_BODY` | method is a permitted read method, there is no body, and the action carries no mutation classification | `G7` |
| 13 | `G_PARAMETER_PROVENANCE` | every parameter is an opaque handle from the approved source; no concrete value is present | review EXPANDED (F-16) |
| 14 | `G_PRIVACY_CAPABILITY` | a production-cone privacy policy is attached and live | `G10` |
| 15 | `G_CONTAINMENT_READINESS` | containment state satisfies the requirement for this environment class | `design.md §5.3` |
| 16 | `G_BUDGET_RESERVATION` | a reservation was acquired BEFORE dispatch and is consumed on reservation | `G8` |
| 17 | `G_BREAKER_STATE` | no breaker is open | `G9` |
| 18 | `G_KILL_SWITCH_PREDISPATCH` | no kill switch engaged immediately before dispatch | `G11` |

Post-conditions, evaluated after a response and each terminal on violation:
no redirect off the allowlist, no redirect loop, no unexpected method, no
`WebSocket` upgrade, no download, no response-size violation, no mutation
signal, and no `Set-Cookie` write-back to persistent authenticated state.

### Mapping the historical twelve identifiers

`G0`→2, `G1`→3, `G2`→6, `G3`→7, `G4`→8, `G5`→9, `G6`→10 and 11 (split: host
admission and resolved-address admission are independent facts and were
conflated), `G7`→12, `G8`→16, `G9`→17, `G10`→14, `G11`→18 and 1 (the kill
switch is evaluated twice). Added by the independent review: 4, 13, and the
`Set-Cookie` post-condition. Added for explicitness: 5, 15.

Twelve historical identifiers become eighteen named gates. No historical check
is dropped; six are added and one is split. The receipt records the ordered IDs
and a digest over the chain definition, so identity — not a count — is what
fails closed.

## §2. Why the count is not the contract

`design.md §5.2` said "eleven" while naming twelve, and the master plan's
acceptance criterion was phrased as a count. A count is unfalsifiable evidence:
an implementation can run eleven checks, omit a twelfth, and satisfy "all
eleven gates exercised". Worse, the review's additions make any fixed number
wrong. C-11 therefore versions the chain, digests its definition, and requires
the PQ receipt to carry every gate ID in order — so a missing, duplicated,
reordered or unknown gate is detected by name.

## §3. Separation, enforced mechanically

Per F-11 and F-12, separation is a property of the import graph:

- `productionRunGate` is a distinct kernel. `realRunGate` gains no production
  branch and no mode parameter. Hardening asserts both.
- The production cone may not import the DEV campaign orchestrator, the DEV
  environment loader, the NEXT execution path, or the generic real-run decision
  path.
- The DEV/NEXT cone may not import the production policy, the `PROD_OBSERVE`
  launcher or the production authorization machinery.
- Shared modules receive policy by injection with **no default**. A missing
  policy throws; it never falls back. Missing policy = DENY.

## §4. The production allowlist is independent

Per F-10, `KNOWN_PRODUCTION_HOSTS` stays DENY-ONLY in every mode including
`PROD_OBSERVE`. The `PROD_OBSERVE` allowlist is a separate structure built
solely from the external observation config, and a hardening rule forbids the
production policy module from importing the deny table at all. A host becomes
admissible only by explicit presence in that external allowlist — never by
inverting an existing table, because an inversion is one boolean from
catastrophe.

## §5. External-only configuration

Per F-09, and mirroring the D-13/D-20 storage-state discipline: absolute path,
outside the Nightwatch repository, outside the Alphaus workspace, regular file,
non-symlink, owner-only `0600`, referenced by a dedicated environment variable.
No production host may be written into the repository outside the unloadable
`config/environments/production.json`.

C-11 tests use disposable synthetic external configs with loopback hosts only.

## §6. Authorization semantics

`PROD_OBSERVE` is a distinct authorization class, aliased to nothing — not DEV,
not NEXT, not authenticated browsing, not replay, not source intelligence, not
generic real-run authority. A grant is finite, explicitly scoped, expiring and
**one-shot**: reusing a consumed grant fails with `ALREADY_CONSUMED`.

## §7. D-4 is preserved textually and mechanically

Production does not join `SUPPORTED_ENVIRONMENTS`.
`config/environments/production.json` remains structurally unloadable. C-11
adds a regression asserting D-4's decision text is intact and that the loader
still rejects production by name validation.

## §8. Source-bound route authority

C-11 consumes C-10.5's trusted derivation and accepts none of: a caller-supplied
provenance enum, an arbitrary digest, an arbitrary route list, a JSON-revived
capability, or a test-only vocabulary. Authorization traces mechanically to
validated source evidence, and the receipt identifies repository identity,
source checkpoint, evidence digest, route-template identity, vocabulary
identity and completeness/currentness — with no customer value.

C-06 is not weakened. It currently proves zero PHP operations read-only, which
is a truthful outcome; the positive PQ path uses synthetic but mechanically
valid proof fixtures, and the real census stays truthful.

## §9. Parameter provenance

Concrete values may not enter authorization state, receipts, logs, budget keys,
replay keys, fingerprints, errors, checkpoints or persistent route identities.
Only opaque handles cross those boundaries. If a mock request builder resolves
a synthetic handle, the concrete bytes exist only inside that narrow builder.
Planted sentinels are asserted absent from every surrounding channel.

## §10. Containment reporting

Qualification reports containment state categorically rather than asserting it.
GitHub CI lacking Bubblewrap must remain explicit as
`NOT_EXERCISED_BWRAP_UNAVAILABLE` and must never be promoted to `PROVEN`; the
local, clean and predev modes enforce the designed stronger requirement. This
mirrors the existing `SYNTHETIC_CAMPAIGN` deep-lane discipline.

## §11. Budgets

Reservation-based and race-safe. The rule is **reserve BEFORE dispatch**, never
check → dispatch → increment. Concurrent workers cannot oversubscribe.
Reservations are consumed on reservation and are not refunded merely because a
request failed. Design values are reconciled as-is and never broadened.

## §12. Breakers

Categorical and terminal for the campaign: privacy violation, containment
anomaly, unexpected redirect, response-size violation, route mismatch, mutation
signal, authorization invalidation, budget exhaustion, persistence failure.
Once a breaker is terminal, no later request may proceed.

## §13. The PQ receipt

`nightwatch.production-qualification-receipt.v1`, privacy-safe fields only,
with a digest over its canonical body. It carries the schema version, campaign
and task identity, authorization class and lifecycle state, environment class,
source checkpoint, gate-definition digest, the ordered gate IDs, the result of
every gate, categorical denial codes, route/read-only/source-completeness/
parameter-provenance/privacy/containment/observer/window/budget identities,
breaker and kill-switch state, request-count and denied-before-dispatch
aggregates, the persistence-audit result, the final result and the receipt
digest. No free-form sensitive value has any representation.

Tamper resistance: a missing, reordered, duplicated or unknown gate; a changed
gate result; changed source, route, privacy, budget, observer or window
identity; a forged final `ALLOW`; a stale or unknown schema; and an altered
receipt digest all fail closed.

## §14. Zero-contact proof

For every one-fault denial the mock server's received-request count must be
**zero** when denial occurs before dispatch. An internal boolean is not
accepted as evidence: the assertion is made network-side against an
instrumented loopback server.
