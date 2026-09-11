# Design — Control Center render truth

## Fixtures are generated from the declared contracts

Parsing `types.ts` by hand would drift. The harness uses the TypeScript
compiler API (already a UI devDependency) to read every `export interface` and
produces a value for every member:

- `string` becomes a unique sentinel token, except fields whose name is
  date-shaped (`*At`, `timestamp`, `date`), which become valid ISO strings so
  date formatting stays observable rather than rendering a constant
  "Invalid Date" for every value;
- `number` becomes a unique integer, `boolean` becomes `true`;
- literal types keep their literal (and are flipped between alternatives);
- unions take their first non-null constituent; nullable fields carry a
  non-null value so their presence is observable;
- arrays carry one element; inline object types recurse; `Readonly<T>`,
  `Record<K, V>`, indexed access, type operators (`readonly`), tuples and
  intersections resolve structurally;
- a shape the generator cannot resolve fails closed through an explicit
  fallback that the non-vacuity assertion measures.

`schemaVersion` is written from the API contract table, not sentineled: the
API layer refuses a mismatched identity before the UI sees a snapshot.

## Observability is differential

For each view the harness renders a baseline, captures
`document.body.innerHTML`, then re-renders once per non-exempt leaf with that
leaf's alternative value and requires the DOM to differ. Differential
comparison catches values that pass through formatters, presence indicators
and class-tone mappings, which sentinel-presence checks miss.

The exempt list is keyed by contract path with a reason, and the harness fails
when an exempt path becomes observable (stale) or names a field no contract
declares. `schemaVersion`, `afterSeq`, `advisoryOnly`, `passed` and `layer`
are expected to remain exempt for the same reasons the placement guard states;
anything else the harness exposes is a finding to render or to justify.

## Navigation owns its announcement

`navigate(view)` becomes the single path for user navigation: it writes the
hash, sets the active view, sets `document.title` to the view's label, and
moves focus to the main content region (which becomes focusable with
`tabIndex={-1}`). The `hashchange` listener routes through the same function so
back/forward announces too. A ref distinguishes user navigation from the
initial render and from SSE-driven refreshes, so an operator reading a panel
is never interrupted by a background update.

## Dynamic classes are proven at runtime

The browser lane already computes one class's style. It gains assertions for a
representative member of each interpolated family
(`graph-node-*`, `graph-edge-dimmed`, `code-chip-*`, `stage-*`, `text-*`,
`status-*`), comparing against the unstyled default so a rule that exists in
source but never applies fails.

## The harness states its own limit

It proves a field's value changes the rendered DOM in the maximally revealing
fixture state. It does not prove visual correctness, layout, or a branch the
fixture does not take; the exempt list records anything the fixture cannot
reach, and the suite header states the limit.
