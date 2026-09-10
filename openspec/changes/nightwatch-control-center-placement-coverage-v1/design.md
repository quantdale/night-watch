# Design — Control Center placement coverage

## Carriage is derived, not declared

A contract-to-view map would be a second authority that can drift from the
code it describes. Instead the guard derives carriage from the source:

- a component carries a contract when the contract's name appears in its
  carrier text;
- a component's carrier text is its own body plus the bodies of functions it
  invokes with explicit type arguments, so
  `usePagedCollection<RunListSnapshot, …>` makes the shared paged collection
  part of every view that consumes the list, without the hook naming any
  concrete contract;
- carriage closes transitively over containment: a component that carries
  `OverviewSnapshot` and reads `safety` also carries `SafetySnapshot`, because
  `OverviewSnapshot.safety` is declared as that type.

A field passes when at least one carrier of a contract that declares it
contains the field. The assertion is still textual at the field level; what it
adds over the predecessor is that the text is scoped to code that can actually
receive the contract, through a chain that is checkable from the source.

## The exempt list is the honest half

An exemption is only valid while the field is absent from every carrier. The
guard fails when an exempt field becomes rendered, and when an entry names a
field no contract declares. That is stronger than the predecessor's check,
which only verified the name still existed somewhere.

Five fields are deliberately never rendered:

- `schemaVersion` — validated by the API layer, which refuses a mismatched
  response, so the shell never has a version to display;
- `afterSeq` — the request cursor the shell itself sent;
- `advisoryOnly` — a `true` literal, rendered as prose on every advisory
  element;
- `passed` — the boolean projection of `status`, which the runs views render;
  showing both states one fact twice;
- `layer` — the server's layout ordinal for a system-map node; the map draws
  the node's `x`/`y` position, which is what an operator reads.

## The server's truncation is stated, not inferred

`page.truncated` and `nextCursor` are different fields with different jobs:
one is the server's answer about its bound, the other is how the client asks
for the next page. The shared paged collection now exposes `truncated` from
the latest snapshot, and `LoadMoreControl` states it independently of the
continuation button. A list that says "All loaded." says it from the declared
flag.

## Undrawn edges are a statement about the projection

The execution graph already counts edges whose endpoints are outside the
projection, reports `drawn of received`, and attributes the remainder to the
projection rather than to the run. The source graph now does the same, so the
two canvases cannot disagree about what a missing endpoint means.

## The graph-limit card quotes the declaration

The Source Intelligence card rendered `250 / 500` as the nodes/edges
"maximum". Those are the server's defaults; the declared maximums are
`maxGraphNodes` 1000 and `maxGraphEdges` 2000, and the overview already
fetches them in `meta.limits`. The card quotes the declaration instead of a
client constant.

## The guard states its own limit

The placement guard proves that a field name occurs inside a component that
can receive its contract, or that the absence is a reasoned exemption. It
does not prove that every render branch draws the field, nor that the field is
conditionally visible. Conditional-reachability remains deferred, and the
guard's header says so.
