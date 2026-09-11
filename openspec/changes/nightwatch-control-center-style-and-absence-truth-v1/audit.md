# Audit — Control Center style and absence truth

Audited live at `d904dc96156f8376c772e6c43a75ce8cde3fad04`, in the owned
session worktree `nightwatch-control-center-style--5e5ddb63`, with the
canonical checkout clean and `HEAD == origin/main`. Every number below was
measured here, not copied from a predecessor record.

## What is already true, and is not re-opened

`nightwatch-control-center-render-truth-v1` is terminal COMPLETE (R-01
through R-04 CLOSED): the differential render harness covers all sixteen
contracts; navigation sets the document title and focuses main content only
for operator navigation; and the browser lane computes styles for the
`status-*`, `graph-node-*` and `stage-chip` families. That campaign recorded
one limit in its own words: "a placement-level stylesheet guard remains
unproven beyond the dynamic-family application assertions".

Re-verified independently at the starting SHA:

- UI typecheck PASS; 63 tests across 5 files PASS; build PASS.
- Browser workflow lane 4 passed / 0 failed.
- `validation:universe` PASS with UI_LANE=5.
- `gate:local` all eleven groups PASS with receipt
  `receipt:sha256:fd0ddcf782fd34ba027b6854`.
- Full offline regression 4789 passed / 18 skipped / 0 failed.

## A-01 — the source family assertions have a blind spot

`ui/control-center/src/styles.test.ts` extracts rendered class names but
replaces every `${...}` interpolation with a space and then excludes the
leftover prefix fragments: `edge-`, `node-`, `graph-node-`, `stage-`,
`status-`, `text-`, `code-chip-`. The concrete-family assertion then covers
only:

- `graph-node-{ready,warning,blocked,neutral}`, `graph-node-dimmed`,
  `graph-node-selected`, `graph-edge-dimmed`;
- `code-chip-{ready,warning,blocked,neutral}`;
- `text-{ready,warning,blocked}` (`text-neutral` documented as intentional).

Produced but never asserted: `status-*` (every `StatusPill`),
`stage-*` (coverage chips via `stage-${statusTone(stage.state)}`), and the
system-map `node-*` family. The stylesheet declares `.status-ready`,
`.status-warning`, `.status-blocked`, `.stage-ready`, `.stage-warning` and
`.stage-blocked`; there is no `.status-neutral` and no `.stage-neutral`, and
those are the only unasserted gaps for the two families.

## A-02 — no runtime proof that a rendered class applies

`styles.test.ts` proves a selector exists in source. The browser lane
computes styles for `.graph-controls`, `status-ready` vs `status-warning`,
`rect.graph-node` strokes and `.stage-chip` border width. Every other class
the built composition renders has no runtime proof that its rule applies to
the element that carries it rather than being overridden, media-scoped away,
or lost in the artifact.

## A-03 — collections are never emptied by the render harness

`ui/control-center/src/contractRender.test.tsx` flips scalar leaves one at a
time. Arrays are generated with exactly one element and never emptied, so an
array whose empty rendering is indistinguishable from its short rendering
would pass every guard. That is the "an empty list is not a short list" class
this product exists to prevent, mechanically unverified for collections.

## A-04 — the system map's tone classes cannot match their rules

`SystemMapView` renders node groups with
`className={`map-node node-${node.evidenceStatus.toLowerCase()}`}` and edges
with `className={`map-edge edge-${edge.evidenceStatus.toLowerCase()}`}`.
`evidenceStatus` crosses the wire as the core `EvidenceStatus` vocabulary in
`src/core/systemMap/model.ts`:

`MECHANICALLY_PROVEN`, `RUNTIME_OBSERVED`, `PRODUCTION_OBSERVED`,
`SOURCE_ONLY`, `PARTIAL`, `INFERRED`, `STALE`, `UNAVAILABLE`,
`MUTATION_CAPABLE`, `READ_ONLY_PROVEN`, `REPLAY_PROVEN`, `FINDING_PRESENT`,
`TRUNCATED`.

The stylesheet's map tone rules are:

- `.map-node.node-proven circle:not(.map-node-hit)` — fill green
- `.map-node.node-unproven circle:not(.map-node-hit)` — fill amber
- `.map-node.node-unknown circle:not(.map-node-hit)` — fill amber
- `.map-node.node-refuted circle:not(.map-node-hit)` — fill red
- `.map-node.node-selected circle:not(.map-node-hit)` — selection stroke

Lowercasing any value in the vocabulary cannot produce `proven`, `unproven`,
`unknown` or `refuted`, so every tone rule is dead and every tone class is
inert. The map's node fill is always the `.map-node` base. No test or source
consumer references an `edge-*` class, and `.map-edge` is the only edge rule.

## Why the existing checks did not catch any of this

- `styles.test.ts` excludes interpolation prefixes, and its concrete list was
  written for the C-15b graph family, not every family rendered since.
- The browser lane's R-03 assertions were deliberately representative, and
  the map's evidence classes are neither `status-*` nor `graph-node-*`.
- The render harness flips scalar leaves only; array emptiness is structural.
- No rule-to-element reverse check exists, so a dead rule and an inert class
  can coexist indefinitely.
