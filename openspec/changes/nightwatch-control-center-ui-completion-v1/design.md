# Design — Control Center UI completion

## `truncated` answers a question about the server

The execution-graph contract carries `nodeLimit`, `edgeLimit` and `truncated`.
All three describe the projection the server produced. A client that then
slices what it received has introduced a second, undisclosed bound, and
`truncated === false` still reports on the first one. The previous canvas read
that field and printed `Complete`.

The correction is not a larger slice. It is removing the client bound entirely
and reporting three separate facts:

- how many nodes were drawn, and how many match the current filter;
- how many edges were drawn out of how many were received;
- whether the SERVER reached its bound, quoted with the bound it reached.

An edge whose endpoint is absent from the projection cannot be drawn. That is
a statement about the projection, not about the run, so it is counted and
named rather than dropped in silence.

## Filtering narrows attention, never the denominator

Search and the state filter dim nodes; they do not remove them, and they do
not change the drawn count. The footer reads `N nodes drawn · M match`, so a
filtered view can never be mistaken for a smaller graph. This is the same
decision C-15b made for the source graph, and the two canvases now share one
layout function so they cannot drift.

## One layered layout, one structural type

`layerAssignment` took `SourceGraphSnapshot`. It only ever needed node
identifiers and edge endpoints, so it now takes a local `LayoutGraph`
structural type that both contracts satisfy. Layer and within-layer order come
from the node identifier, so the same snapshot always draws the same picture.

## A count is not a name

`safety.checks.length` in an Overview metric card cannot answer "which check
is unknown", which is the only question the Safety Center exists to answer.
Deferred verification dimensions and never-measured verification dimensions
are likewise different facts and are rendered as separate lists: deferring is
a decision, and not measuring is a hole.

The same reasoning governs the empty cases. An empty check set renders as
"An empty check set is an absence of evidence, never a pass", and absent
repository provenance renders as "Without it, this run anchors to no
revision" — not as a missing row.

## The exempt list is the honest part

Three contract fields are deliberately never rendered, and the coverage check
holds the reason for each rather than a bare allowance:

- `schemaVersion` — validated by the API layer, which refuses a mismatched
  response, so the shell never has a version to display;
- `afterSeq` — the request cursor the shell itself sent;
- `advisoryOnly` — a `true` literal, rendered as prose on every advisory
  element because the word is what a reviewer needs to read.

A third assertion fails if an exempt entry names a field the contracts no
longer declare, because stale bookkeeping is how a narrow exemption grows
into a blanket.

## Both checks state their own limit

The contract-coverage check is a NAME-level comparison over `App.tsx`. It
proves a field name reaches the component file; it does not prove placement or
reachability. That is exactly the failure that occurred — a field that reached
no render path at all — and the check says so in its own header rather than
implying more. The stylesheet check has the same shape and the same honesty:
it proves a rule exists for a rendered class, not that the rule is correct.

A browser-level assertion covers the part neither can: it reads the computed
background of the graph toolbar in the built bundle, because a class with
markup and no rule computes to the transparent default.

## Panels that carry tables span the grid

`panel-wide` spans grid ROWS. The new census, check-list and readiness panels
carry tables and long data grids, so they use a new `panel-full` that spans
the grid columns and collapses harmlessly at the existing single-column
breakpoint.

## Dangling modifiers are removed, not styled

`orbit-ring-outer` and `safety-grid` were modifier classes with no rule, whose
base class did all the work. Inventing a rule for either would change the
design to satisfy a checker. They are removed instead.
