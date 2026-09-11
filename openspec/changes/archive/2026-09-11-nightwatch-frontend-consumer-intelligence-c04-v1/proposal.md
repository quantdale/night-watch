# Proposal — Frontend Consumer Intelligence (C-04)

## Why

Nightwatch describes 1,745 backend operations and cannot say which UI code
calls any of them. That edge is what turns a route list into a map: it answers
"what breaks if this changes", and it is the input C-15b's second operator
query is defined against.

## Change

> A bounded Vue SFC `<script>` extractor, an axios-instance recogniser, and a
> function-local resolver for the `url` variable that real call sites use,
> producing consumer edges whose path expression is classified mechanically —
> `LITERAL`, `STRUCTURAL`, `PARTIAL_SEGMENT`, `DYNAMIC`, `UNRESOLVED` — and
> joined to backend route facts categorically.

`.vue` becomes an approved extension and `VUE` a scan language. That is a
LANGUAGE admission, exactly as `.proto` was: 859 files already inside the
approved `ripple-ui` `src` root are today rejected on their extension alone.

## What the measurement changed

The historical design assumed `axios.get('/literal')`. ripple-ui contains
**zero** of those. Every real call is a function-local `url` variable followed
by `blueApi.get(url)`, so a parser written to the assumed shape would have
returned nothing. The shapes were measured first and the design follows them.

`fetch(` appears 189 times and is almost entirely the no-argument Vuex action
`fetch()`. Counting it would have inflated the yield with non-edges.

## The acceptance criterion will not be met, and that is recorded up front

The approved frontend universe is one repository. It holds **211** candidate
call sites in total. The `≥ 400` criterion therefore fails by roughly a factor
of two, and no parser improvement changes that: reaching 400 requires admitting
another frontend REPOSITORY, which the authorization forbids and C-05 owns.

This is stated in the SPEC before implementation rather than reported at the
end, so that it reads as a measured property of the boundary instead of an
excuse for a shortfall.

## What this change refuses to do

- No `SOURCE_FACT` from a non-literal path, ever.
- No query values, account identifiers or user identifiers in durable
  evidence — real call sites embed `?type=${type}`, so this is live.
- No method defaulted to `GET`.
- No execution, rendering, bundling, or sibling `node_modules`.
- No repository admission.

## Impact

- New: `src/core/source/vueSfc.ts`, `src/core/source/frontendConsumer.ts`,
  `src/core/source/frontendJoin.ts`.
- Changed: `scanTypes.ts`, `scan.ts`, `approvedScan.ts`,
  `config/synthetic-campaign.v1.json`, `bin/hardening-check.mjs`.
