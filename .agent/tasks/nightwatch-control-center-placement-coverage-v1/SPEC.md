# Control Center Placement Coverage

Task ID: nightwatch-control-center-placement-coverage-v1

## Task purpose

The predecessor closed six rendering findings and added two guards. Both
guards are name-level over `App.tsx`: a field passes
`contractCoverage.test.ts` if its name appears anywhere in the component file,
and the suite states that limit in its own header. A file-level search can be
satisfied by prose in an unrelated view — `RunListItemSnapshot.passed` passes
only because the Safety Center contains the sentence "A route that is off is
not a route that passed." — while the field itself reaches no render path.

This change makes the contract guard prove placement: every contract field
must appear inside at least one component that actually carries its contract,
where carriage is derived mechanically from the source (a direct props, state
or type mention; a generic consumer bound at the call site; or a containment
path through a parent field the component already reads). It then closes every
gap the stronger guard exposes, and it closes the predecessor's three deferred
UI residuals: the paged lists' server `truncated` flag is never rendered, the
source graph silently drops edges whose endpoints are outside the projection,
and the unreachable `PlaceholderView` fail-safe has no test.

## Established starting state

- Task: `nightwatch-control-center-placement-coverage-v1`
- Starting SHA: `ceb8fe21f9dd90666190c9272030a0dbfabc458f` — the predecessor's
  certification checkpoint, integrated by fast-forward and verified with
  local `HEAD == origin/main`.
- Predecessor `nightwatch-control-center-ui-completion-v1` is terminal
  COMPLETE. U-01 through U-06 are CLOSED. Do not reopen them.
- `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
  COMPLETE; its three `UNAVAILABLE_CAPABILITY` lanes and the `BLOCKED_EXTERNAL`
  external CI state are unchanged by this task.
- Measured in this session at the starting SHA with the guard's own parser:
  `ui/control-center/src/types.ts` declares 33 interfaces and 402 `readonly`
  fields; `App.tsx` yields 37 function components. The existing guard carries
  three exemptions (`schemaVersion`, `afterSeq`, `advisoryOnly`).
- The placement model measured 16 fields that no carrier of their contract
  renders and 5 fields that are deliberately not rendered. The five
  deliberate ones are `schemaVersion`, `afterSeq`, `advisoryOnly`, `passed`
  and `layer`; the 16 gaps are recorded in `STATE.md` and the OpenSpec audit.
- Root `typecheck` and `hardening:check` PASS; UI typecheck, 55 tests across 4
  files and build PASS; the browser workflow lane passes 4/0; `gate:local`
  passes all eleven groups with receipt
  `receipt:sha256:73bb24ef5913e09ca74e7b23` at the starting SHA.

## Registered findings

- P-01 — the contract guard is name-level over `App.tsx`, so it verifies that
  a field reaches the file, not that it reaches a view that owns the data.
  `RunListItemSnapshot.passed` passes on an unrelated Safety Center sentence.
  Deliverable: a placement-level guard that derives each contract's carriers
  mechanically and asserts every non-exempt field appears within one of them,
  with a reasoned, staleness-checked exempt list and measured anti-vacuity.
- P-02 — the five paged contracts carry `page.truncated`, and no view renders
  it. `usePagedCollection` reads only `page.nextCursor`, and `LoadMoreControl`
  infers completeness from that cursor, so a server-truncated page reads as
  "All loaded." Deliverable: the shared paged collection consumes and exposes
  `page.truncated`, and `LoadMoreControl` states the server truncation.
- P-03 — the source graph silently skips an edge whose endpoint is outside the
  projection (`SourceGraphCanvas` returns `null`) and its footer reports every
  received edge as if drawn, while the execution graph counts the undrawn
  edges and discloses them. Deliverable: parity — count, draw-ratio and
  disclose undrawn source edges.
- P-04 — `PlaceholderView`, the fail-safe for a view id with no render branch,
  is unreachable by construction and has no test. Deliverable: the component
  is exportable and covered by a test that renders it and asserts its declared
  fallback text.
- P-05 — the Source Intelligence metric card hardcodes `250 / 500` as the
  graph "nodes / edges maximum". Those are the server's DEFAULTS; the declared
  maximums are `maxGraphNodes` 1000 and `maxGraphEdges` 2000. A client-baked
  bound is presented as the server's. Deliverable: the card quotes the
  declared limits the overview already fetches.

## Required deliverables

- The placement guard replaces the name-level assertion in
  `ui/control-center/src/contractCoverage.test.ts`. It must:
  - extract contracts and fields with the same parser as before, and assert
    the extraction is non-vacuous (contracts, fields, components and one
    transitive-containment field are all measured);
  - derive carriers per contract from component text, generic consumers bound
    at the call site, and containment access paths, to a fixpoint;
  - assert every non-exempt field is present in at least one carrier;
  - carry a reasoned exempt list and fail if an exempt field becomes rendered
    in any of its carriers, or if an entry names no declared field;
  - state in its own header exactly what it does and does not prove.
- Every one of the 16 measured gaps is closed by rendering the field in a
  carrier or by a reasoned exemption:
  - `MetaSnapshot.service`, `.executionAuthority`, `.mutationAuthority`,
    `.limits` and `HealthSnapshot.status` and `SafetySnapshot.status` render
    in the Safety Center's service-authority panel;
  - `ReadinessSnapshot.status` renders in the readiness detail panel;
  - the paged `truncated` fields render through the shared paged collection
    and `LoadMoreControl` (P-02);
  - `ExecutionGraphSnapshot` edge `proof` renders in an edge inventory;
  - `CampaignSummarySnapshot.ownerScopeStatus` / `.ownerScopeReason` replace
    the Campaign Intelligence view's hardcoded "Frozen by owner" row, and
    `CampaignCoverageSnapshot` row `gapReasons` render on the coverage row;
  - `SourceSurfaceSnapshot.repositoryId` renders on the surface row;
  - `SystemMapNodeView.layer` and `RunListItemSnapshot.passed` are exempt with
    stated reasons.
- The source graph counts and discloses undrawn edges (P-03).
- `PlaceholderView` is exported and tested (P-04).
- The graph-limits card quotes the declared maximums (P-05).
- Regressions: paged truncation disclosure, source-graph undrawn-edge
  disclosure, the placeholder fallback, and the limits card each carry a test
  in an already-registered suite. The placement guard is mutation-verified:
  removing a rendered field's carrier occurrence must fail it.

## Explicit non-goals

- No new API route, adapter, authority, contract field, server bound or
  sanitizer change.
- No execution, mutation, product contact, publication or network egress.
- No change to the predecessor's lane classifications or CI state.
- No new stylesheet classes; the added markup reuses existing rules.
- No visual redesign beyond the rows and tables the newly rendered fields
  require.
- No placement proof for the stylesheet guard; that remains class-to-rule.

## Safety constraints

- Local, read-only, loopback only. The UI gains no authority it lacked; every
  field newly rendered was already sanitized and already sent.
- Owner-local findings, raw evidence, source text, paths, credentials,
  authenticated traces and customer values remain outside the boundary.
- Work happens in this campaign's owned session worktree under C-00. The
  canonical checkout is not an implementation worktree.

## Declared Deletions

None.

## Acceptance criteria

- `contractCoverage.test.ts` fails when a rendered field's carrier occurrence
  is removed, and passes on the current source with the five reasoned
  exemptions; its extraction is measured and its exempt set is staleness
  checked.
- A page whose `page.truncated` is true renders a server-truncation statement
  and the flag is consumed by the shared collection, not inferred from
  `nextCursor`.
- The source graph's edge footer separates drawn from received, and a graph
  with an endpoint-less edge states the count and attributes it to the
  projection.
- `PlaceholderView` renders its declared fallback under test.
- The graph-limits card quotes the declared `maxGraphNodes` / `maxGraphEdges`.
- `ui/control-center`: `typecheck` PASS, `vitest run` all PASS, `build` PASS.
- Root `typecheck` and `hardening:check` PASS; `validation:universe` PASS.
- The browser workflow lane passes.
- `gate:local` PASS from this owned session, with task and project state
  reconciled to that checkpoint and the checkpoint integrated by fast-forward.
