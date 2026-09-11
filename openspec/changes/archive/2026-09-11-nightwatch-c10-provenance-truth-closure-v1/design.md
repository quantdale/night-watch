# Design — C-10.5 Provenance and Project-Truth Closure

## The constraint that shapes everything

Two requirements pull in opposite directions:

- **A6** demands a capability that cannot be forged at runtime, including by
  reviving serialized JSON that matches the shape.
- **A8** forbids the privacy cone from importing filesystem, network, browser,
  persistence or source-loader modules. The source artifact that would prove a
  vocabulary lives behind a loader.

C-10 resolved this by passing the vocabulary in call-scoped and validating only
its shape. That kept the cone pure and left authority unowned. The resolution
here keeps the cone pure while giving authority a real owner, by splitting
*derivation* from *identity*:

```
  OUTSIDE the cone                        INSIDE the cone
  ────────────────                        ───────────────
  src/core/prodProvenance/**              src/core/prodPrivacy/**
  (fs, loaders, C-02a intelligence)       (node:crypto only)

  reads source ──► ValidatedSourceEvidence ──► mint ──► capability
                   (pure data record)          │        (brand-registered)
                                               │
                                        computes identity,
                                        enforces invariants,
                                        registers object
```

`node:crypto` is already the one node builtin the cone may import
(`checkC10ProductionPrivacyBoundary`), so identity computation is cone-legal.
The loader work stays outside. The evidence record crossing the boundary is
plain immutable data, so no capability leaks inward.

## Why a registry rather than a digest check

The natural instinct is: let the cone recompute the digest and compare it to
the supplied one. That fails A6's last clause. A caller who can supply both the
members and the digest can supply a *self-consistent* pair — recomputation
agrees, and the forgery passes. Checking a supplied digest only proves internal
consistency, never provenance.

So the mint exposes **no digest parameter at all**. Identity is an output. A
caller cannot express the forgery, which is stronger than detecting it.

That still leaves JSON revival: an attacker who once observed a legitimate
capability could serialize and rebuild it. Object identity is the one property
that does not survive `JSON.parse`, so the brand is a module-private
`WeakSet<object>`:

```ts
const MINTED = new WeakSet<object>();          // module-private, never exported
function isMinted(candidate: object): boolean { return MINTED.has(candidate); }
```

A `WeakSet` is pure — no fs, no net, no process — so it is cone-legal, and it
holds no strong reference, so a capability stays collectable. Consumers gain a
membership precondition; a duck-typed or revived object is refused regardless
of how perfectly it matches.

A TypeScript brand would not do: it is erased at runtime and cannot refuse a
revival. This is precisely what A6 means by "unforgeable-at-runtime design,
not TypeScript compile-time branding alone".

## Canonical binding

Identity is computed over a deterministic encoding whose fields are exactly the
load-bearing authority inputs A7 enumerates:

| Component | Why it is load-bearing |
| --- | --- |
| vocabulary version | a version change is a semantic change |
| vocabulary kind (route / key) | a key set must not be usable as a route set |
| provenance class | the evidence class claimed |
| repository identity | which repository proved it |
| source checkpoint (SHA) | which snapshot proved it |
| source root / artifact path | which artifact within that snapshot |
| inventory completeness state | authority requires COMPLETE |
| generation currentness state | authority requires CURRENT where applicable |
| canonically ordered members | the contents being authorized |
| member count | guards against encoding ambiguity |

Members are sorted before encoding, so **set-based semantics canonicalize
identically under permutation** — the intentional behaviour A7 asks for.
Addition or removal changes the member list and the count, so identity changes.
A source-SHA change changes identity. Each field is length-prefixed in the
encoding so no combination of member literals can imitate a field boundary.

## Fail-closed invariants at the mint

The mint denies rather than degrades, per A7 and the fail-closed rule:

- inventory completeness is not `COMPLETE` → deny
- generated-artifact currentness is `STALE` or `UNKNOWN` where currency is
  required → deny
- source SHA is not 40 lowercase hex → deny
- repository identity outside the known closed set → deny
- an operation lacking `operationId` where C-02a requires it → deny
- evidence class does not match the vocabulary class being minted → deny
- empty or oversized member set → deny (existing C-10 bounds retained)
- a prototype-hostile key or shape-invalid route template → deny (retained)

## The test seam

The C-10 fixtures legitimately need to build vocabularies. The seam is a
separately named TEST-ONLY mint that produces a capability carrying an
authority marker of `TEST_ONLY` instead of `PRODUCTION`. It registers in the
same brand registry — so consumers that only need *a* genuine capability keep
working — but the production authority assertion checks the marker and refuses
`TEST_ONLY`. Fixtures therefore exercise projection logic without ever
obtaining production authority, satisfying A5's seam clause and A6's
"test seams cannot construct production-authoritative capabilities".

## Bounding the mint's importers

A mint that any module may import is still weak authority in a single process.
`hardening:check` gains a static import-graph rule: only the trusted
`src/core/prodProvenance/**` adapters (and the cone's own modules) may import
the production mint; the TEST-ONLY seam may be imported only from `tests/**`.
This is the same style of mechanical enforcement the repository already applies
to the cone's import profile, and it converts "by convention" into "by gate".

## A10 — the cross-authority invariant

The existing staleness detection compares the project-state fields to each
other and to live HEAD. Five fields all naming `b99ce4e` agree pairwise, so
nothing fires, even though `b99ce4e` is an ancestor of the validated C-10
implementation the active task describes.

The repair adds one directional invariant with clear authority roles, and no
circular truth:

- `.agent/ACTIVE_TASK.md` is authoritative for **which task is live and what
  it validated** (`VALIDATED_IMPLEMENTATION_AUTHORITY` already says so).
- `docs/CURRENT_STATE.md` is authoritative for the **project baseline**.
- Therefore: the project baseline MUST NOT be a strict ancestor of the
  validated substantive implementation the active task names. Equality is fine;
  a documented documentation-descendant is fine; being *behind* is a defect.

Ancestry is computed with `git merge-base --is-ancestor` against the local
object database — no network. The invariant is directional, so `CURRENT_STATE`
never becomes the source of truth for what the task validated, and the task
never dictates the baseline's other fields.

`CI_EXECUTED_SHA` is checked against the same rule but with its own semantics:
it names the commit a CI run actually executed at, so it may legitimately lag a
documentation-only descendant while never lagging the validated implementation
it claims to certify.

## A9 — per-field semantics

The five fields are not synonyms, so they are not bulk-set to HEAD:

| Field | Claims | Reconciled to |
| --- | --- | --- |
| `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` | last commit that changed implementation and was validated | `23523cc` (C-10 / DEF-C10-5 repair) |
| `LAST_LOCALLY_VALIDATED_SHA` | last commit where the local gate passed | `23523cc` |
| `LAST_CLEAN_VALIDATED_SHA` | last commit where the clean Node 20 gate passed | `23523cc` |
| `CI_OBSERVED_SHA` | commit whose CI result was observed | `cb631cc` |
| `CI_EXECUTED_SHA` | commit CI actually executed at | `cb631cc` |

`23523cc` is where the C-10 substantive implementation landed and where the
local and clean gates were recorded green. `cb631cc` is where the verified
exact-head run `33601265465` executed. The documentation commits between them
changed no implementation, which is why the implementation anchor legitimately
trails the CI anchor.

## A13 — inventory-driven sentinel coverage

DEF-C10-5's lesson is that a corpus organized by value class is complete
against its own model and still blind to an unlisted position. So coverage is
driven by an explicit inventory of persisted DTO field positions capable of
carrying a string or bytes, with a declared disposition per position:

- `CLOSED_VOCABULARY` — the field's domain is a finite closed enum
- `SOURCE_PROVEN` — the field's value must be a proven vocabulary member
- `SENTINEL_PROVEN` — a hostile sentinel is planted in that exact position and
  proven incapable of persisting

The suite cross-checks the inventory against the DTO's actual field set. A new
string-capable persisted field with no declared disposition fails the suite,
which is the mechanical enforcement A13 requires — the failure arrives from the
inventory diff, not from someone remembering to write a test.

## A12 — digest semantics

The master design is made unambiguous rather than edited silently: the
superseded single/salted value-digest model is retained but explicitly marked
historical and pointed at the C-10 decision record, and the current production
semantics are stated as `prodstruct:sha256:*` structural (unsalted,
deterministic, cross-campaign comparable, no raw value, no unproven dynamic
key) with the durable value digest ABSENT.
