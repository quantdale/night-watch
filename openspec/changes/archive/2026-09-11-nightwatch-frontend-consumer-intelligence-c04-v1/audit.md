# Audit — C-04, before implementation

Audited at `7c0d5f5326be1983cf081888680f3c01f3f128f6` against the working tree
and the pinned sibling checkouts.

## A-1 — The historical design's call shape does not exist

The master plan describes "axios-instance call recognition" and the campaign
prompt's examples lead with `fetch('/literal')` and `axios.get(...)`.

Measured in `mobingilabs/ripple-ui@d80b161b`: **zero** `axios.<verb>('/…')`
call sites. `axios.` appears 126 times and is `axios.config` (97),
`axios.CancelToken` (20), `axios.create` (8) and `axios.isCancel` (1).

Every real call goes through one of eight instances created by `axios.create`
in `src/axios.config.js`, and the path arrives as a function-local variable:

```js
let url = `admin/v1/aws/xacct/dca?type=${type}`;
const res = await blueApi.get(url);
```

A parser written to the assumed shape would have found nothing and reported a
clean zero. Measuring the corpus before fixing the design is the only reason
this campaign has any yield at all.

## A-2 — `fetch(` is a decoy

`fetch(` appears 189 times. 145 of those are `fetch()` with no argument — the
Vuex action convention — and one is a real HTTP call. Treating `fetch(` as an
HTTP indicator would have manufactured ~188 non-edges and inflated the headline
number toward the acceptance criterion while measuring nothing.

## A-3 — The first ceiling estimate was wrong, and the instrument was the cause

This audit originally recorded 211 candidate call sites and concluded that the
`>= 400` criterion failed "by roughly a factor of two". That was measured with
a line-oriented grep, and ripple-ui writes most calls across two lines:

```js
return baseApi
  .get(url)
```

Counted whitespace-insensitively the figure is 388. The estimate missed 45% of
the corpus, and the conclusion drawn from it described the measuring
instrument rather than the source.

The authoritative number is the parser's, over a COMPLETE enumeration of all
1,329 files: **382 edges** — 348 `SOURCE_FACT` (138 `LITERAL`, 210
`STRUCTURAL`), 4 `INFERENCE`, 30 `UNKNOWN`. It is 382 rather than 388 because
the parser correctly excludes 7 commented-out calls a text count includes.

So `>= 400` fails by 18, roughly 4.5%, and the shortfall is a property of the
single-repository universe rather than of parser quality. A further 5
`streamPromise(...)` gRPC-stream sites exist and are deliberately unsupported,
recorded so the yield statement is complete.

The correction is left visible rather than quietly overwritten: a campaign that
records a pre-implementation baseline has to be willing to say when the
baseline was wrong.

## A-4 — `.vue` is blocked the same way `.proto` was

859 `.vue` files sit inside the already-approved `ripple-ui` `src` root and are
rejected `SOURCE_LANGUAGE_UNSUPPORTED` on their extension. C-04 adds a language
and an extension; no root and no repository.

18 of the 211 call sites live in `.vue` files, so without the language
admission the yield would be 193 rather than 211 — a smaller effect than the
file count suggests, and worth stating so the admission is justified by what it
actually buys.

## A-5 — Privacy is live here, not hypothetical

Real call sites embed values directly in the path expression:
`admin/v1/aws/xacct/dca?type=${type}`. Persisting resolved query strings would
put runtime values into durable source intelligence. The query is therefore
stripped and only its presence recorded. C-10/C-10.5 lessons apply even though
this is source rather than traffic.

## A-6 — The join target is now large, and mostly proto

After C-02b and C-03 the backend population is 1,745 operations: 1,181 blueapi
(591 generated artifact + 590 proto), 341 ouchan, 223 ripple-api. A frontend
path may therefore match a proto-derived route, an artifact-derived route, or
both. The join must be categorical about which, and must never report an edge
as stronger than the backend fact it lands on.

## A-7 — Fixtures must not infer topology

Every fixture takes an explicit root. The parser modules take source TEXT and
have no filesystem authority, so they cannot infer anything; the suites that
read the real tree gate on the sibling checkout and skip categorically.
