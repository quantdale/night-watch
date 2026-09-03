# SPEC — C-04 Frontend Consumer Intelligence

Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Phase: FRONTEND_CONSUMER_INTELLIGENCE_C04_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
Predecessor Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_FRONTEND_CONSUMER_INTELLIGENCE_C04_V1

## Frozen intent

Mechanically derive frontend → backend route edges from the approved Vue and
JavaScript source, so the System Map can show which UI code calls which backend
operation — and classify every path so that no edge built from a non-literal
path is ever a `SOURCE_FACT`.

## Measured ceiling — first estimate CORRECTED

The approved frontend universe is one repository. `mobingilabs/ripple-ui@d80b161b`
`src` holds 1,329 files (859 `.vue`, 387 `.js`). `mobingilabs/ripple-api` `src`
is 95 PHP files and zero frontend call sites.

**The pre-implementation estimate recorded here was wrong and is corrected.**
It said 211 candidate call sites and concluded that `>= 400` failed "by roughly
a factor of two". That estimate was taken with a line-oriented grep, and
ripple-ui writes most of its calls across two lines:

```js
return baseApi
  .get(url)
```

A line-oriented count cannot see those. Counted whitespace-insensitively the
figure is **388**, not 211 — the estimate missed 45% of the corpus, and its
"factor of two" conclusion was an artefact of the measuring instrument rather
than a property of the source.

The authoritative measurement is the parser's, over a COMPLETE enumeration of
all 1,329 files:

| Measure | Value |
|---|---|
| consumer edges | **382** |
| `SOURCE_FACT` | 348 (`LITERAL` 138, `STRUCTURAL` 210) |
| `INFERENCE` | 4 (`PARTIAL_SEGMENT`) |
| `UNKNOWN` | 30 (`DYNAMIC` 24, `UNRESOLVED` 6) |
| from `.js` | 360 |
| from `.vue` | 22 |
| enumeration | COMPLETE, 1,329 of 1,329, 0 dropped |

382 rather than 388 because the parser correctly excludes 7 commented-out
calls that a text count includes. The parser is the more accurate instrument in
both directions.

A further 5 `streamPromise(...)` gRPC-stream call sites exist and are NOT
supported by this campaign; they are recorded as a known unsupported pattern so
the yield statement is complete rather than quietly narrowed.

So the `>= 400` criterion **FAILS at 382**, short by 18 — about 4.5%, not a
factor of two. The shortfall is attributable to the repository boundary: the
approved frontend universe is a single repository, and reaching 400 requires
admitting another, which the authorization forbids and C-05 owns.

## Scope

- `.vue` as an approved extension and `VUE` as a scan language — a LANGUAGE
  admission, exactly as `.proto` was for C-02b. No root, no repository.
- A bounded Vue SFC `<script>` extractor; no `@vue/compiler-sfc`, no bundler,
  no `node_modules` from siblings, no execution.
- Recognition of the axios instances declared by `axios.create`.
- Bounded, function-local resolution of the `url` variable that real call sites
  use, plus direct literal arguments.
- Path evidence classification and a canonical structural route.
- A categorical join to the backend route facts C-02a/C-02b already produce.

## Non-goals

- No rendering, no execution, no bundling, no browser, no runtime auth.
- No repository admission. No frontend repository beyond the approved one.
- No `@vue/compiler-sfc` or TypeScript compiler dependency unless the existing
  tokenizer provably cannot do the job.
- No production, DEV or NEXT contact; no credentials; no customer data.

## Path evidence classification

A resolved path expression is classified mechanically:

| Shape | Class |
|---|---|
| fully literal `'/v1/accounts'` | `LITERAL` → may be `SOURCE_FACT` |
| template whose every interpolation fills exactly one whole path segment | `STRUCTURAL` → normalized to `{}` , may be `SOURCE_FACT` |
| interpolation spanning part of a segment | `PARTIAL_SEGMENT` → `INFERENCE` |
| concatenation with a call or unknown identifier | `DYNAMIC` → `UNKNOWN` |
| argument is an unresolved identifier | `UNRESOLVED` → `UNKNOWN` |

A query string is never part of the durable route: it is stripped, its presence
recorded as a boolean, and its values never persisted. Real call sites embed
values such as `?type=${type}` directly, so this is a live privacy rule and not
a hypothetical one (§37).

## Acceptance

1. Frontend → route edges derived from the approved universe, with the measured
   total reported per repository and per class. The historical `≥ 400`
   criterion is evaluated truthfully and FAILS at 382; the shortfall is
   attributed to the repository boundary, not to parser quality, and the
   corrected measurement replaces the erroneous 211 estimate.
2. **Zero** `SOURCE_FACT` edges from a non-literal path. This is absolute.
3. No query values, account identifiers or user identifiers in durable
   evidence.
4. HTTP method derived only when mechanically known; never defaulted to `GET`.
5. Backend join is categorical, and an edge is never stronger than the backend
   fact it joins to.
6. Truncation and completeness visible; no silent drop.
7. New suites gate-registered; hardening probes bite.
8. C-01 no-eviction holds across the enlarged population.
9. Canonical regression zero failures; clean and exact-head CI green;
   siblingWrites 0; session released.

## Safety constraints

Read-only sibling access through `siblingSource.ts`; bounded loops and explicit
ceilings; structural facts and digests only in durable evidence; fail closed to
UNKNOWN; explicit synthetic roots in fixtures; no repository write during
`gate:clean`.

## Declared Deletions

None.
