# Proposal — C-15c System Map V2 HTTP Transport + Complete Operator UI

## Why

C-15b built the System Map V2 model, its bounded projections and its
deterministic layout, and then stopped at the process boundary. Nothing outside
the process could reach it, so an operator could not use it, and a model no
operator can reach cannot be checked against reality by the people who know the
system best.

## What changes

The map is carried over HTTP under `/api/v2/system-map`, and the Control Center
UI gains a view that can navigate it: four disclosure levels, eight operator
queries, drill and return, search, filter, pan, zoom and keyboard drive.

## What does NOT change

The map's authority. Every level and every query answer carries
`executionAuthority: NONE` and `mutationAuthority: NONE`. The transport is
GET/HEAD only. Describing a route is not permission to call it, and putting the
description on a screen does not change that.

The v1 API. V2 segments are parsed before the v1 prefix check specifically so
that no v1 path is ever reinterpreted by the new routes.

## The two honesty requirements this change is really about

Bounded projection is worth nothing if the boundary is rendered away.

`MUTATION_CAPABLE_ROUTES` truncates at the 1,000-node limit with `total: null`
and `dropped: null`, because the upstream operation population total is
unknown and a drop count needs a total. The obvious UI — showing "1000 of 1000"
or "0 dropped" — would tell the operator they had seen everything. They have
not, and the projection says so with `remainingUnknown: true`. Both nulls
render as the word "unknown".

`OBSERVED_PRODUCTION_PATHS` returns zero nodes with `measurement: UNMEASURED`.
Zero production observation has happened and none is authorized. An empty list
would read as "no production paths are problematic". The truth is that nothing
was measured, and the UI says that instead.

## Impact

New: the V2 contract, the adapter, the router segments, the collector methods,
the API client functions, the System Map view.

Modified: two existing UI roster guards, extended to admit exactly the new view
while staying closed allowlists.
