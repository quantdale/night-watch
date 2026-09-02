# C-10.5 Audit — the residual provenance authority gap

## A2. Reproduction, before any repair

The brief asked whether application code can mint a production-safe vocabulary
by asserting a provenance label, without presenting any source-evidence
capability. It can. Reproduced at `cb631cc` against the shipped C-10 cone with
obvious synthetic sentinels and no real customer identifier:

```ts
const FABRICATED_DIGEST = 'ev:sha256:' + 'deadbeefdeadbeefdeadbeef';
const SENTINEL_ROUTE = 'GET /v1/synthetic-sentinel-NWSENT0001/{id}';
const SENTINEL_KEY = 'NWSENT0002_forged_dynamic_key';

createProvenRouteVocabulary({
  provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
  provenanceDigest: FABRICATED_DIGEST,
  templates: [SENTINEL_ROUTE],
});
```

Captured output:

```
ROUTE_FORGERY_ACCEPTED={"provenanceClass":"SOURCE_PROVEN_OPENAPI_OPERATION","provenanceDigest":"ev:sha256:deadbeefdeadbeefdeadbeef","templateCount":1}
ROUTE_SENTINEL_TREATED_AS_PROVEN=true
KEY_FORGERY_ACCEPTED={"provenanceClass":"SOURCE_PROVEN_FIXED_CONTRACT","provenanceDigest":"ev:sha256:deadbeefdeadbeefdeadbeef","keyCount":1}
KEY_SENTINEL_TREATED_AS_PROVEN=true
JSON_REVIVED_ACCEPTED_BY_CONSUMER=true
```

Four distinct failures, all confirmed rather than assumed:

1. **Label-only route authority.** A caller chose
   `SOURCE_PROVEN_OPENAPI_OPERATION` and received it. No OpenAPI operation was
   presented, resolved or consulted.
2. **Fabricated digest accepted as provenance.** `deadbeef…` is not the digest
   of anything. It passed because the only check is the shape regex
   `/^ev:sha256:[0-9a-f]{24}$/`.
3. **Arbitrary members admitted.** `GET /v1/synthetic-sentinel-NWSENT0001/{id}`
   was never an admitted operation, yet `isSourceProvenRoute` returned `true`
   for it — so it would be persistable as a route identity.
4. **Shape-only JSON revival trusted.** An object rebuilt from
   `JSON.parse(JSON.stringify(...))` — never produced by any constructor — was
   accepted by the consumer, because consumption tests set membership on a
   duck-typed object.

## The gap is wider than the brief assumed

A search for producers of either vocabulary across `src/` and `bin/` returns
**no non-test producer at all**:

```
src/core/prodPrivacy/evidence.ts      — consumer (type only)
src/core/prodPrivacy/projector.ts     — consumer (type only)
src/core/prodPrivacy/parameterProvenance.ts — consumer (type only)
src/core/prodEvidence/productionFindingsStore.ts — consumer (type only)
```

Every `SOURCE_PROVEN_*` capability that has ever existed in this system was
constructed by a test fixture. C-10's route- and key-provenance boundary was
therefore load-bearing in shape only: the consumption side was implemented and
tested, and the production side of the boundary — establishing that a
vocabulary corresponds to real source evidence — was never built.

`routeVocabulary.ts`'s own header states that "the provenance digest binds this
set to that source". No code performed that binding. The comment described an
intent the implementation did not have, which is how the gap survived review:
the module reads as though the binding exists.

## Why the shipped design could not have closed it

- `Object.freeze` plus closed-enum and shape validation is the whole authority
  mechanism. Freezing prevents later mutation of a capability; it says nothing
  about whether the capability was ever legitimate.
- A TypeScript brand would not help either: it is erased at runtime, so it
  cannot refuse a JSON revival, which is failure 4 above.
- The digest could not be *checked* by the cone, because the cone must not read
  the filesystem (Workstream E import isolation) — and the source artifact
  lives behind a loader. C-10 resolved that tension by passing the vocabulary
  in call-scoped, which correctly kept the cone pure but left the minting side
  unowned.

## Resolution direction

Authority moves from a *label the caller asserts* to an *identity trusted code
computes*:

- the mint takes a validated source-evidence record and exposes **no digest
  parameter**, so the forgery in failure 2 becomes inexpressible rather than
  merely detectable;
- provenance identity is computed over source identity, evidence class, source
  checkpoint, completeness, currentness, vocabulary version and canonically
  ordered members, so failure 3 changes the identity it would need to match;
- a module-private `WeakSet` records genuinely minted capabilities and
  consumption requires membership, which refuses failure 4 across any
  serialization boundary — object identity does not survive `JSON.parse`;
- the filesystem-facing derivation lives OUTSIDE the cone, so the cone keeps
  its `node:crypto`-only import profile.

## A9. Project-state truth drift found at campaign start

`docs/CURRENT_STATE.md` held all five live anchors at
`b99ce4e61166e52b554dd6ac07b7678b433959da`:

```
LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: b99ce4e…
LAST_LOCALLY_VALIDATED_SHA:          b99ce4e…
LAST_CLEAN_VALIDATED_SHA:            b99ce4e…
CI_OBSERVED_SHA:                     b99ce4e…
CI_EXECUTED_SHA:                     b99ce4e…
```

while `.agent/ACTIVE_TASK.md` described a validated substantive implementation
at `23523cc` and a documentation checkpoint at `1234daf`. The narrative
"Exact-head CI is green" section was stale in the same direction, describing
run `33590645175` at `b99ce4e`.

`b99ce4e` is an **ancestor** of the C-10 implementation, so the five fields
were mutually consistent and globally stale — exactly the class the existing
`project:check` staleness detection misses, because pairwise agreement between
the fields is all it can see. This is the A10 defect, reproduced from live
repository state rather than constructed.

## A11/A12 documentation drift

- The verified final C-10 certification is run `33601265465` / job
  `100155266632` at `cb631cc`, Node 20, eleven groups PASS,
  `SYNTHETIC_CAMPAIGN` 221/221, receipt
  `receipt:sha256:f38b272bec3a37464257e194`. Both `ACTIVE_TASK.md` and
  `CURRENT_STATE.md` named earlier runs.
- The master plan's single/salted value-digest model was superseded by C-10's
  two-family resolution (`prodstruct:sha256:*` structural, durable value digest
  ABSENT) but the superseding is not stated unambiguously in the master design.

## A13 methodological defect (from DEF-C10-5)

The C-10 privacy corpus enumerated sensitive VALUE CLASSES and proved each
could not persist. It did not enumerate PERSISTED POSITIONS. `routeTemplate`
was a free-form string field in the persisted DTO that no sentinel occupied, so
the corpus was complete against its own model and still missed a live leak. The
standing rule must therefore be driven by a field inventory, not by a list of
value classes.
