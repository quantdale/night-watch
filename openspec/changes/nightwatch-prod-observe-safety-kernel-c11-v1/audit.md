# C-11 Audit — design reconciliation before implementation

## Starting truth, verified

| Expected | Verified |
| --- | --- |
| `origin/main` at R-11 closure | `060fef41205b29210d9bd8416aca97c03b028e4f`, canonical clean |
| R-11 `COMPLETE` and certified | run `33656654543` / job `100336766433` at `e11cf64`, eleven groups PASS |
| canonical regression | 3,032 / 3,019 / 13 / 0 |
| C-06 read-only proof | unchanged; PHP route derivation still fails closed with `PHP_ROUTE_PROOF_UNAVAILABLE` |
| D-4 | `SUPPORTED_ENVIRONMENTS = ['local', 'dev', 'next']`; `production.json` structurally unloadable |
| `KNOWN_PRODUCTION_HOSTS` | present in `src/core/safety/hosts.ts`, deny-only |

R-11 is the declared prerequisite and it is closed, so C-11 may begin.

## The historical design cannot be implemented as written

The master plan and its OpenSpec `design.md` predate the independent review.
Implementing `design.md §5` literally would introduce three of the exact
failures the review identified. Every historical requirement is classified
below; nothing is silently dropped and nothing obsolete is silently obeyed.

### A. The gate-count contradiction is real

`design.md §5.2` says "**eleven** ordered gates" and then labels the chain
`G0` through `G11`, which is **twelve** identifiers. The master plan repeats
"eleven" in three places, and `PQ → P1` acceptance says "every `G0`–`G11` gate
exercised".

This is not a harmless off-by-one. The acceptance criterion is stated as a
COUNT, so an implementation could satisfy "eleven gates" while omitting one of
the twelve named checks and still look compliant. The count is also already
wrong in the other direction: the independent review adds load-bearing checks
(observer-identity stage minimum, parameter provenance, organizational window,
kill switch at entry) that no number between eleven and twelve accommodates.

**Resolution.** The NAMED, VERSIONED gate contract is the authority and the
number is derived from it, never asserted. C-11 defines
`nightwatch.production-admission-chain.v1` as an explicit ordered list of named
gate IDs, and the PQ receipt carries a digest over that list plus the ordered
IDs themselves. A missing, duplicated, reordered or unknown gate fails closed
on identity, not on arithmetic. §23's requirement is met by documenting the
mapping from the historical twelve identifiers to the final chain, which
appears in `design.md`.

### B. Requirement classification

| # | Historical requirement | Source | Class | Resolution in C-11 |
| --- | --- | --- | --- | --- |
| 1 | Production is a separate authorization class, config, policy and launcher | `design.md §5`; master plan G-12 | **CURRENT** | implemented as `PROD_OBSERVE` |
| 2 | Eleven ordered gates, labelled `G0`–`G11` | `design.md §5.2` | **SUPERSEDED** | named versioned chain; count derived (see A) |
| 3 | `config/observation/prod.v1.json` in-repo | `design.md §5.1` | **SUPERSEDED** by F-09 | external-only config, absolute path, non-symlink, `0600`, dedicated env var |
| 4 | `KNOWN_PRODUCTION_HOSTS` inverted into an allow table inside `PROD_OBSERVE` | `design.md §5.3` | **SUPERSEDED** by F-10 | deny-only in every mode; a separate allowlist built solely from the external config; hardening forbids the production policy importing the deny table |
| 5 | Reuse / parameterize `realRunGate` | implied by `design.md §5` | **SUPERSEDED** by F-11 | distinct `productionRunGate` sharing no decision branch; hardening asserts `realRunGate` gains no production path and no mode parameter |
| 6 | "A separate launcher is separation" | `design.md §5` | **SUPERSEDED** by F-12 / UA-12 | separation is an import-graph property, mechanically enforced both ways; shared modules take policy by injection with no default |
| 7 | One-shot, scoped, expiring owner authorization with `ALREADY_CONSUMED` | `design.md §4`; review "sound as designed" | **CURRENT** | implemented |
| 8 | Kill switch checked at `G11` before every request | `design.md §5.4` | **NARROWED** by the review's "SHOULD FIX" | evaluated at qualification ENTRY and again immediately before dispatch |
| 9 | Observer identity class recorded; `P2`/`P3` may proceed with `ORDINARY_USER`; `P4` requires `ORG_ENFORCED_READ_ONLY` | `design.md §5.6` | **NARROWED** | the authorized stage policy requires `ORG_ENFORCED_READ_ONLY` from **P2 onward** unless a future explicit owner exception exists. P0/PQ require no production identity because there is no real contact. C-11 models the gate only; it creates and requests no credential |
| 10 | Observer identity comparison lives in prose | review "two missing gates" | **EXPANDED** | promoted to an explicit gate |
| 11 | Parameter provenance enforced only by the privacy firewall | review "two missing gates" | **EXPANDED** | promoted to an explicit gate consuming C-10's opaque-handle semantics |
| 12 | No organizational observation window | review "Organizational window" | **EXPANDED** | new gate, synthetic window fixtures only in C-11 |
| 13 | `Set-Cookie` write-back unaddressed | review "Missing post-condition" | **EXPANDED** | post-condition plus a hardening rule that no production `context.storageState()` persistence path exists |
| 14 | Mandatory rootless L6 for every production run | `design.md §5.3`; T-13 / RG-18 | **CURRENT**, with the CI carve-out preserved | qualification reports containment state; `NOT_EXERCISED_BWRAP_UNAVAILABLE` in CI is never promoted to `PROVEN`; local, clean and predev enforce the stronger requirement |
| 15 | Budgets reserved before execution and never refunded | `design.md §5.4` | **CURRENT** | reservation-based, race-safe, consumed on reservation |
| 16 | Budget values: 200 campaign / 50 service / 10 route / concurrency 1 / ≤1 req per 2s / redirects / bytes | `design.md §5.4` | **CURRENT**, not broadened | reconciled as-is; C-11 narrows nothing upward |
| 17 | Categorical breakers, terminal for the campaign | `design.md §5.4` | **CURRENT** | implemented |
| 18 | `WebSocket` denied outright; downloads denied; service workers fatal | `design.md §5.3` | **CURRENT** | request-admission and post-condition checks |
| 19 | Route authority = "route on production admission list" | `design.md §5.2` G5 | **NARROWED** by C-10.5 and DEF-C10-5 | admission requires PROVEN MEMBERSHIP of a mechanically derived source-bound vocabulary, never a shape-matched string or a caller-supplied list |
| 20 | Surface `READ_ONLY_PROVEN` by two witnesses | `design.md §5.2` G4 | **CURRENT**, not weakened | C-06 stays fail-closed; the positive PQ path uses synthetic mechanically valid proof fixtures, and the real census remains truthful with zero proven PHP operations |
| 21 | P1 passive observation | `design.md §5.5` | **DEFERRED_TO_LATER_STAGE** | F-13 applies; C-12 territory and NOT authorized here |
| 22 | Structural digest `prodstruct:sha256:` unsalted and persistable; no durable value digest | D-113 | **CURRENT** | consumed unchanged |
| 23 | Production findings in a separate root; Control Center structurally excluded | D-114 | **CURRENT** | consumed unchanged |

### C. What C-11 explicitly does NOT do

- No real production, DEV or NEXT contact. Mock production is loopback-only.
- No credential, auth-state, cookie or token is created, requested or read.
- P1 passive observation is not implemented; C-12 is not begun.
- `READ_ONLY_PROVEN` is not increased and C-06's proof semantics are untouched.
- No production host is added anywhere outside the unloadable
  `config/environments/production.json`.
- No repository-owned production allowlist is created.

## Surfaces C-11 consumes rather than reinvents

Verified present in the current implementation:

| Need | Existing surface |
| --- | --- |
| source-bound route vocabulary | `src/core/prodProvenance/routeVocabularyDerivation.ts` — `deriveOpenApiRouteVocabulary`, `derivePhpRouteVocabulary` |
| source-bound key vocabulary | `src/core/prodProvenance/keyVocabularyDerivation.ts` |
| opaque parameter handles and template-only route identity | `src/core/prodPrivacy/parameterProvenance.ts` — `createOpaqueParameterHandle`, `createSafeRouteIdentity`, `assertNoConcreteParameterValue`, `assertHandleNotValue` |
| production privacy policy and cone assertion | `src/core/prodPrivacy/policy.ts` — `createProductionPrivacyPolicy`, `assertProductionCone` |
| persistence firewall and audit | `src/core/prodEvidence/firewall.ts`, `persistenceAudit.ts` |
| production deny table (never inverted) | `src/core/safety/hosts.ts` — `KNOWN_PRODUCTION_HOSTS` |
| DEV/NEXT authorization, to be left alone | `src/core/safety/realRunGate.ts` |
