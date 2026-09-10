# Audit — Control Center placement coverage

Audited live at `ceb8fe21f9dd90666190c9272030a0dbfabc458f`, in the owned
session worktree `nightwatch-control-center-placem-f8abc223`, with the
canonical checkout clean and `HEAD == origin/main`. Every number below was
measured here, not copied from a predecessor record.

## What is already true, and is not re-opened

`nightwatch-control-center-ui-completion-v1` is terminal COMPLETE and
integrated at `ceb8fe2`; U-01 through U-06 are CLOSED. Its two guards,
`contractCoverage.test.ts` and `styles.test.ts`, pass, and the browser lane
passes. `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
COMPLETE; its three `UNAVAILABLE_CAPABILITY` lanes and the `BLOCKED_EXTERNAL`
external CI state are unchanged by this change. No network egress, owner
harness or live app is required.

Re-verified independently at the starting SHA:

- `npm run typecheck` PASS; `npm run hardening:check` PASS.
- `ui/control-center`: `typecheck` PASS, 55 tests across 4 files PASS, `build`
  PASS.
- Browser workflow lane 4 passed / 0 failed.
- `gate:local` all eleven groups PASS with receipt
  `receipt:sha256:73bb24ef5913e09ca74e7b23`.

## P-01 — the contract guard proves reachability of the file, not of the view

The guard parses each `export interface` in `ui/control-center/src/types.ts`
and asserts each `readonly` field name matches `\bfield\b` somewhere in
`App.tsx`. At this SHA the parser yields 33 interfaces and 402 declared
fields, and the file yields 37 function components. Nothing in the assertion
relates a field to the component that receives its contract.

Measured consequence: `RunListItemSnapshot.passed` (`types.ts:209`) appears in
`App.tsx` only inside the Safety Center sentence "A route that is off is not a
route that passed." (`App.tsx:1183`). No runs view reads it. The guard passes
because the word is somewhere in the file, which is exactly what the guard
claims to measure and exactly what an operator needs it not to miss.

A placement model was measured against the same sources. For each component
the model computes a carrier text — the component's own body plus the bodies
of functions it invokes with explicit type arguments, so
`usePagedCollection<RunListSnapshot, …>` binds the generic consumer to the
list it serves — then carries contracts transitively through containment when
the component reads the parent field that holds them. A field passes when at
least one carrier of a contract that declares it contains the field. Measured
at this SHA: 16 fields are present in no carrier, and 5 fields are
deliberately never rendered.

The 16 unrendered fields inside their contracts' carriers:

| Contract | Field | Where it is fetched | Where it belongs |
| --- | --- | --- | --- |
| `HealthSnapshot` | `status` | overview | Safety Center service posture |
| `MetaSnapshot` | `service` | overview | service identity |
| `MetaSnapshot` | `executionAuthority` | overview | service authority declaration |
| `MetaSnapshot` | `mutationAuthority` | overview | service authority declaration |
| `MetaSnapshot` | `limits` | overview | declared server bounds |
| `ReadinessSnapshot` | `status` (owner scope) | overview | readiness detail |
| `SafetySnapshot` | `status` (owner scope) | overview | Safety Center |
| `RunListSnapshot` | `truncated` (page) | runs | list continuation |
| `ExecutionGraphSnapshot` | `proof` (edges) | execution graph | edge evidence |
| `CampaignSummarySnapshot` | `ownerScopeStatus` | campaigns | owner authority panel |
| `CampaignSummarySnapshot` | `ownerScopeReason` | campaigns | owner authority panel |
| `CampaignCoverageSnapshot` | `gapReasons` (rows) | campaigns | coverage row |
| `CampaignCoverageSnapshot` | `truncated` (page) | campaigns | list continuation |
| `FindingsSnapshot` | `truncated` (page) | findings | list continuation |
| `SourceSurfaceSnapshot` | `repositoryId` | source intelligence | surface row |
| `ReviewerSnapshot` | `truncated` (page) | reviewer | list continuation |

The 5 deliberate non-renders, each with a reason the guard will carry:
`schemaVersion` (API-validated identity, refused on mismatch),
`afterSeq` (request echo), `advisoryOnly` (constant rendered as prose),
`passed` (boolean projection of `status`, which the runs views render), and
`SystemMapNodeView.layer` (server layout ordinal; the map draws `x`/`y`).

## P-02 — the paged lists never render the server's truncation

`boundedCollection` (`src/controlCenter/adapters/common.ts:84-93`) derives
`truncated` as "more remain AFTER this page" and returns it in `page` beside
`nextCursor`. The five paged contracts (`RunListSnapshot`,
`CampaignCoverageSnapshot`, `FindingsSnapshot`, `SourceSurfacesSnapshot`,
`ReviewerSnapshot`) all declare `page.truncated`.

The client reads `snapshot.page.nextCursor` (`App.tsx:97`) and derives `atEnd`
from it (`App.tsx:130`). `LoadMoreControl` renders "All loaded." from `atEnd`
(`App.tsx:154`). The declared `truncated` field is never read, so a page the
server truncated and a list that is complete both render as complete until the
operator notices the button.

This is the same class U-01 fixed on the graph and the timeline: the server's
answer about its own bound must be stated, not inferred from a neighbouring
field.

## P-03 — the source graph drops endpoint-less edges silently

`SourceGraphCanvas` skips an edge whose endpoint is outside the projection
(`App.tsx:736`), and its footer reports `{graph.edges.length} edges`
(`App.tsx:753`) — the count received, as if all were drawn. The execution
graph, after U-01, counts the same condition (`App.tsx:543`), separates the
footer (`App.tsx:595`) and discloses it (`App.tsx:601`). The asymmetry was
recorded as deferred work by the predecessor and is closed here.

## P-04 — the placeholder fail-safe has no test

`PlaceholderView` (`App.tsx:1475`) is the fallback for a `VIEW_DEFINITIONS`
id without a render branch. Every current id has a branch, and
`readViewFromHash` maps an unknown hash to `overview`, so the component is
unreachable in production and untested. It is not exported, so a test cannot
render it directly. The predecessor recorded its absence as deferred.

## P-05 — a client default is presented as the server's maximum

The Source Intelligence metric card reads
`value="250 / 500" detail="nodes / edges maximum"` (`App.tsx` metric grid).
`CONTROL_CENTER_LIMITS` declares `defaultGraphNodes` 250 and
`defaultGraphEdges` 500 with `maxGraphNodes` 1000 and `maxGraphEdges` 2000;
the overview already fetches the declared limits as `meta.limits`
(`src/controlCenter/adapters/metaAdapter.ts:45`). The card presents the
default as a maximum, which is the bound-misstatement class the predecessor
closed on the graph canvas.

## Why the existing checks did not catch any of this

- `contractCoverage.test.ts` is file-level by construction; the suite states
  its name-level limit honestly, so this is not a broken check but an
  incomplete one.
- `styles.test.ts` compares classes to rules and does not read data.
- `App.test.tsx` asserts what the views do render; no assertion covered these
  fields.
- Typecheck proves the fields exist on the type; reading a field is not
  required to typecheck.
- The browser lane proves every view loads without an error and without an
  external request; a view that renders part of its snapshot satisfies it.
