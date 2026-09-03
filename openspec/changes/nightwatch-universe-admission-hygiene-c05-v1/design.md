# Design — C-05

## The distinction being made mechanical

> A repository DISCOVERED is not a repository ADMITTED.

Today the sentence has nowhere to live: there is no discovery operation, and
admission is an intersection of two lists in two files. C-05 gives each half a
name and makes exactly one of them authoritative for reads.

## Admission

One canonical statement of the owner-approved universe: repository identity →
approved roots. `PHASE25_APPROVED_REPOSITORY_IDS` becomes a PROJECTION of it.

The important behavioural change is what happens on disagreement. Today, a
repository in `APPROVED_ROOTS` but not `IN_SCOPE` in the change-intelligence
map is silently not admitted — the intersection swallows it. After C-05 that is
a declared error, because the two possible meanings ("the owner approved it and
the map is stale" versus "the map is right and the roots literal is stale") are
not interchangeable and neither may be guessed.

Rejected alternative: keep the intersection and document it. It is not a policy,
it is the absence of one, and it fails silently in the direction of reading less
— which looks safe and is actually unfalsifiable.

## Discovery

An admission-free operation over the sibling root that yields, per repository:
identity, whether it is a git repository, and one classification — `ADMITTED`
or `DISCOVERED_NOT_ADMITTED`. It reads repository METADATA only, never source
content. That is what makes it safe to point at 149 repositories.

Explicitly insufficient for admission, and each asserted as such: existence,
name, primary language, organization directory, presence of an OpenAPI
document, having routes, and filesystem adjacency to an admitted repository.
The last two matter most, because `blueinternal` has an OpenAPI document and
sits beside `blueapi`, and neither fact is why it is being admitted — an owner
authorization is.

## Live Git state

The persisted fields split cleanly by whether they can change without the
checkout changing:

| Field | Class | Disposition |
|---|---|---|
| `repoId`, `productRole`, `scope` | stable identity | stays durable |
| `branch`, `checkedOutSha`, `dirty` | checkout-local, mutable | queried live |
| `trackingRef` | stable configuration | stays durable |
| `trackingSha`, `ahead`, `behind` | remote-relative, mutable | queried live |

The measurement justifies the split rather than assuming it: the checkout-local
fields are currently 18/18 accurate while the remote-relative fields are 10/18
diverged. Both classes are mutable, so both leave the normative record; the
difference is only in how fast they rot.

Where a historical snapshot is genuinely wanted — a source-map SHA a derivation
was bound to — it stays, labelled historical, because a provenance record MUST
pin a SHA. That is the one legitimate reason to persist one, and it is
different in kind from persisting `behind: 25` as if it were configuration.

## Read-boundary instrumentation

The guarantee moves from an output property to a call-site property:

```
before: operations[unapprovedRepo] === 0        // derived nothing
after:  analyzerSourceReads[unapprovedRepo] === 0  // opened nothing
```

`src/core/source/siblingSource.ts` is already the sole sibling-source read path
and is path-confined, so the ledger goes there. A per-repository counter is
incremented at the read call. The proof is then a positive statement about the
absence of an attempt, and a negative probe that attempts a read of an
unapproved repository must be REFUSED and counted as a refusal, not silently
returned empty.

## Admissions reuse existing machinery

`blueinternal/openapiv2` uses `parseOpenApiRoutes` — the same path C-02a used
for `blueapi/openapiv2`, including `$ref` → `definitions` response binding. The
artifact is `SOURCE_FACT` with a `GENERATED_ARTIFACT` qualifier and a
currentness state, and generated evidence alone still cannot grant production
admission.

`mobingilabs/wave-api` root `src` uses the existing YAML route parser. No
parser change: its keys are the same quoted `verb:/path` form, its children are
the same `action:`/`class:`/`client:` keys, and the parser is indent-relative.

Neither admission may create a source fact the existing analyzers cannot
justify. If wave-api's 55 keys do not all resolve to a handler, the unresolved
ones are reported `UNSUPPORTED`/`HANDLER_UNRESOLVED` exactly as ripple-api's
are — a lower proven count is the correct outcome, never a looser parser.

## No-eviction

The operation identity set before C-05 must be a SUBSET of the set after. This
matters specifically here: the global projection sorts `repoId` first, so
inserting `alphauslabs/blueinternal` — which sorts BEFORE `alphauslabs/blueapi`
— could displace later repositories if the projection limit were reached. The
limit is 4,096 and the population is 1,745 heading to roughly 1,851, so there
is headroom; the assertion is made anyway, because headroom is not a guarantee
and C-01 exists because this exact eviction happened once.

## Negative probes

| # | Mutation | Expected |
|---|---|---|
| 1 | admit a repository absent from the owner authority | DETECTED |
| 2 | name a repository in the roots literal only | DETECTED as a contradiction, not silently dropped |
| 3 | name a repository in the map only | DETECTED |
| 4 | attempt an analyzer source read of an unapproved repository | REFUSED and counted |
| 5 | re-persist a mutable Git field in the normative record | DETECTED |
| 6 | drop a pre-C-05 operation identity | DETECTED by no-eviction |
| 7 | claim COMPLETE enumeration while truncated | DETECTED |
| 8 | admit a third repository not owner-named | DETECTED |
