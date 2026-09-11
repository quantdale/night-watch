# Audit — C-07

Read-only at `a34064711d2682f090c4d35079a27f08a7767ea5`. No request was issued
to any environment, and the DEV storage state's contents were never read.

## §7 offline preconditions

| Condition | State |
|---|---|
| C-05 COMPLETE | yes, certified at CI run `33796281169` |
| C-08 COMPLETE | yes, certified at CI run `33801673312` |
| C-09 COMPLETE | yes, certified at CI run `33806627149` |
| R-12 COMPLETE | yes, certified at CI run `33784345028` |

## The existing registry

`src/core/safety/endpointSemantics.ts`:

> No API semantics are asserted without a reviewed exact source-backed rule.
> `export const RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule[] = [];`

Its header states the rule C-07 must respect: "HTTP method is not a read/write
contract."

## Read-only classification over 1,851 operations

| Classification | Count |
|---|---|
| `PROVEN_MUTATION_CAPABLE` | 1,107 |
| `READ_ONLY_METHOD_ONLY` | 485 |
| `UNSUPPORTED` | 179 |
| `CONDITIONAL_MUTATION` | 80 |
| `READ_ONLY_PROVEN` | **0** — absent from the distribution |

Methods: GET 677, POST 739, PUT 260, DELETE 169, PATCH 6. Route proof: PROVEN
1,672, AMBIGUOUS 177, UNSUPPORTED 2.

Runtime binding: `SOURCE_ONLY` 1,843, `RUNTIME_BOUND_EXACT` 8. Only those 8
carry a `targetId`, so the runtime-binding precondition holds for 0.43% of the
population.

## The existing admission chain

`portfolio: considered 1,851 · eligible 0 · excluded 1,851`, with nine
exclusion reason codes in play: `AUTH_REQUIREMENT_UNBOUND`,
`BEHAVIOR_OWNER_AMBIGUOUS`, `CONTRACT_IDENTITY_UNPROVEN`, `MUTATION_REQUIRED`,
`PROJECTION_UNSAFE`, `REPLAY_UNSUPPORTED`, `ROUTE_IDENTITY_UNPROVEN`,
`SEMANTIC_CONTRACT_UNPROVEN`, `SEMANTIC_PRECONDITIONS_UNBOUNDED`.

The read-only candidate census adds: handler population 276, GET population
677, response-flow attempts 26, **response-flow proven 0**, rejected 26.

## Why READ_ONLY_PROVEN is zero

C-06's own report records it: `READ_ONLY_PROVEN` over the approved universe fell
**5 → 0** when the eleven-row catalog stopped classifying; 79 `ripple-api` GET
routes are positively shown to perform an outbound call through their resolved
pipeline; and 6,114 unclassified callee identities block promotion via
`CALLEE_CLASSIFICATION_INCOMPLETE`.

So the zero is a consequence of evidence getting stricter, not of analysis
getting worse — and C-07 must not undo it.

## The DEV tooling boundary

`bin/phase22-dev.mjs` header: `manifest`, `preflight`, `acceptance --dry-run`,
`results` and `explain` are local/read-only. "The only path that may invoke a
real launcher is `acceptance --execute --env=dev --storage-state=...
--manifest=...`." There is no `--all` flag and no dynamic target discovery.

A DEV storage state exists at `$HOME/.nightwatch/auth/ripple-dev-state.json`,
mode 600. Only its existence and mode were observed; its contents are auth
state and were not read.
