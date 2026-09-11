# Audit — C-15b, before implementation

Audited at `9ac83bebbeb9ed747ff4a55e84701c4b95a1c692`.

## A-1 — The ceiling is two `slice` calls, not a rendering limit

`SourceGraphCanvas` in `ui/control-center/src/App.tsx`:

```js
const nodes = graph.nodes.slice(0, 24);
const nodePositions = new Map(nodes.map((node, index) =>
  [node.nodeId, { x: 120 + (index % 3) * 230, y: 58 + Math.floor(index / 3) * 84 }]));
…
graph.edges.slice(0, 48)
```

`CONTROL_CENTER_LIMITS` permits `maxGraphNodes: 1000` and `maxGraphEdges:
2000`. So the contract was never the constraint, and no amount of raising it
would have helped. The footer does say "N of M nodes shown", which is honest as
far as it goes, but the operator has no way to see the rest.

## A-2 — The graph never received C-01's lesson

`ControlCenterSourceGraphDto` carries `nodeLimit`, `edgeLimit` and
`truncated: boolean`. There is no `total`, no `projected`, no `dropped`, no
`remainingUnknown`.

Operations got all of that in C-01, precisely because a floor presented as a
total is the failure mode this project exists to avoid. The graph kept the
boolean. A graph that says `truncated: true` and stops is a graph that cannot
tell an operator whether they are missing two nodes or two thousand.

## A-3 — There is nowhere to put a fact category

Node DTOs carry `proof`, `currentness`, `lifecycle` and `capability`. Edge DTOs
carry `proof`. None of those is a fact category: `proof` is a join state, and
`capability` is about support.

C-03 produces bindings that are explicitly `SOURCE_FACT` or explicitly
`NOT_A_FACT`, and C-04 produces edges that are `SOURCE_FACT`, `INFERENCE` or
`UNKNOWN`. Under v1 that distinction is lost the moment the data reaches the
graph — which would make the map exactly the thing the operating principles
warn against: a larger inferred graph mislabelled as fact.

## A-4 — There is one projection, and it is not progressive

The only source-graph projection is a surface-centred neighbourhood at default
depth 1. There is no company, product, repository or service level, so the
browser cannot ask for a coarse view and drill in; it can only ask for one
surface's neighbours.

## A-5 — The data to show now exists, and it is heterogeneous

1,745 operations across four repositories, of which 591 are a generated
artifact and 590 are proto; 12 proven service bindings; 382 consumer edges of
three different evidence classes, 164 of them joined. Mixing those in one graph
without a per-element fact category would be laundering, and §48 forbids it
explicitly.

## A-6 — Production observations are legitimately empty

C-12 has not run and is not authorized. The "show all observed production
paths" query must therefore return zero, and the map must distinguish that zero
from `UNMEASURED` and from `UNKNOWN` rather than rendering a reassuring blank.

## A-7 — Authority must be re-proven, not assumed

C-15b touches the Control Center's read surface. GET/HEAD-only, 405 on
anything else, `executionAuthority: NONE`, `mutationAuthority: NONE`, no SSE
command intake and no access to `$HOME/.nightwatch/prod-findings/` are all
existing invariants; this campaign must show they still hold after the change
rather than inheriting the claim.
