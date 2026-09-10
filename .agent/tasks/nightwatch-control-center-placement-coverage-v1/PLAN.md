# Control Center Placement Coverage — Plan

## Purpose

Turn the Control Center's contract-coverage guard from a file-level name search
into a placement assertion, and close every gap the stronger guard exposes —
including the predecessor's deferred paged-truncation, source-graph
undrawn-edge and placeholder-coverage residuals. The observable outcome: an
operator reading a view can be sure every field of the snapshot that view owns
reaches that view, or that its absence is a declared, reasoned exemption.

## Starting State

- Task ID: `nightwatch-control-center-placement-coverage-v1`
- Starting SHA: `ceb8fe21f9dd90666190c9272030a0dbfabc458f`
- Browser: `ui/control-center` is a Vite + React + vitest package under
  `ui/control-center/src/{App.tsx,types.ts,styles.css}`; all tests are vitest
  files in the same package, plus a Playwright browser lane under
  `tests/browser/`.
- The existing guard `ui/control-center/src/contractCoverage.test.ts` parses
  `types.ts` interfaces and asserts each field name is present somewhere in
  `App.tsx`. It is registered in `config/validation-universe.v1.json` UI_LANE.
- Measured at the starting SHA: 33 contracts, 402 `readonly` fields, 37
  function components, 3 exemptions. The placement model finds 16 unrendered
  fields in their contracts' carriers and 5 deliberate non-renders.
- The server's declared limits are in `src/controlCenter/adapters/metaAdapter.ts`
  (`meta.limits`) with `maxGraphNodes` 1000 and `maxGraphEdges` 2000 from
  `CONTROL_CENTER_LIMITS`.

## Scope

- `ui/control-center/src/App.tsx` — carrier plumbing, the missing rows,
  tables and disclosures, and the `PlaceholderView` export.
- `ui/control-center/src/contractCoverage.test.ts` — the placement guard.
- `ui/control-center/src/App.test.tsx` — regressions for the newly rendered
  fields and the placeholder fallback.
- `.agent/**`, `openspec/changes/nightwatch-control-center-placement-coverage-v1/**`,
  `docs/**` — task and project truth.

## Non-Goals

- No server, route, adapter, contract, bound or sanitizer change.
- No new stylesheet classes or visual redesign.
- No execution, mutation, product contact, publication or network egress.
- No reopening of U-01 through U-06 or R-01 through R-07.
- No placement proof for `styles.test.ts`; it stays class-to-rule with its
  stated limit.

## Safety Constraints

- LOCAL only; loopback UI reads; sibling repositories read-only.
- Owner-local findings, raw evidence, source text, credentials, traces and
  customer values stay outside the boundary.
- C-00: implementation happens in this campaign's owned session worktree.
- Never weaken a guard or delete a test for green output.

## Architecture / Approach

### Carrier derivation

For each `function` component in `App.tsx` (including generic functions such
as `usePagedCollection<S, T>`), the guard computes a carrier text: the
component's own body, plus the bodies of any function it invokes with explicit
type arguments (`usePagedCollection<RunListSnapshot, …>` binds the generic
consumer to that contract). A component carries a contract when the contract's
name appears in its carrier text. Carriage closes transitively over
containment: a component that carries a parent contract and reads the parent
field under which a child contract sits also carries the child. A field
passes when at least one carrier of its contract contains the field name.

### Exemptions

The exempt list is field-keyed and reasoned. An entry is only honest while the
field is absent from every carrier of every contract that declares it; the
guard fails if an exempt field becomes rendered or if an entry names no
declared field. The five entries are `schemaVersion` (API-validated identity),
`afterSeq` (request echo), `advisoryOnly` (constant rendered as prose),
`passed` (boolean projection of `status`) and `layer` (server layout ordinal,
position is what the map draws).

### Paged truncation

`PagedSnapshot<T>` gains `page.truncated`, `usePagedCollection` reads it from
the latest snapshot and exposes it, and `LoadMoreControl` states the server
truncation independently of the cursor-derived continuation button.

### Source-graph parity

`SourceGraphCanvas` counts edges whose endpoints are outside the projection,
reports `drawn of received` in the footer, and renders the same disclosure
callout the execution graph already uses.

## Milestones

### M0 — execution truth

- **Status:** COMPLETE
- Objective: an owned session on the current base with a clean workspace, the
  predecessor re-verified terminal COMPLETE, and this route committed.
- Files: `.agent/**`, `openspec/changes/nightwatch-control-center-placement-coverage-v1/**`.
- Acceptance: `session:status` verdict PASS with `owned=true`, `drift=false`,
  `base=CURRENT`; predecessor records untouched.
- Validation: `node bin/nightwatch-session.mjs status`, `npm run workspace:check`,
  `git diff --check`.

### M1 — the placement guard (P-01)

- **Status:** COMPLETE
- Objective: replace the name-level assertion with the carrier model above.
- Files: `ui/control-center/src/contractCoverage.test.ts`.
- Acceptance: the guard fails on the measured 16 gaps before the repairs; its
  extraction is anti-vacuously measured; the exempt list is reasoned and
  staleness checked; a source mutation that removes a rendered field's carrier
  occurrence fails it.
- Validation: `npm --prefix ui/control-center run test -- contractCoverage`,
  plus a recorded mutation proof.

### M2 — render the exposed fields

- **Status:** COMPLETE
- Objective: close the 16 measured gaps by rendering each field in a carrier
  or exempting it with a reason.
- Files: `ui/control-center/src/App.tsx`, `ui/control-center/src/App.test.tsx`.
- Acceptance: `contractCoverage` passes with the five exemptions; the
  service-authority panel, readiness panel, execution-graph edge inventory,
  campaign owner-authority panel and coverage rows, and source surface rows
  carry the fields; regressions assert the new rows.
- Validation: `npm --prefix ui/control-center run test`.

### M3 — paged truncation disclosure (P-02)

- **Status:** COMPLETE
- Objective: consume and render `page.truncated` for all five paged lists.
- Files: `ui/control-center/src/App.tsx`, `ui/control-center/src/App.test.tsx`.
- Acceptance: a page whose `truncated` is true renders a server-truncation
  statement; the hook reads the declared flag rather than inferring it.
- Validation: `npm --prefix ui/control-center run test`.

### M4 — source-graph undrawn-edge parity (P-03)

- **Status:** COMPLETE
- Objective: count, report and disclose endpoint-less edges in the source
  graph, matching the execution graph.
- Files: `ui/control-center/src/App.tsx`, `ui/control-center/src/App.test.tsx`.
- Acceptance: footer separates drawn from received; a graph with an
  endpoint-less edge states the count and attributes it to the projection.
- Validation: `npm --prefix ui/control-center run test`.

### M5 — placeholder coverage and declared limits (P-04, P-05)

- **Status:** COMPLETE
- Objective: export and test `PlaceholderView`; quote the declared graph
  maximums instead of the hardcoded default.
- Files: `ui/control-center/src/App.tsx`, `ui/control-center/src/App.test.tsx`.
- Acceptance: the fallback renders its declared text under test; the limits
  card reads the declared `maxGraphNodes` / `maxGraphEdges`.
- Validation: `npm --prefix ui/control-center run test`.

### M6 — certification

- **Status:** COMPLETE
- Objective: full validation from the owned session, state and docs reconciled
  to the validated checkpoint, integration by fast-forward, session released.
- Files: task state, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `.agent/ACTIVE_TASK.md`,
  `.agent/EXECUTION_PROMPT.md`.
- Acceptance: UI typecheck/test/build, root typecheck/hardening:check,
  browser lane, `gate:local` all PASS at the certified checkpoint; all five
  findings closed; `HEAD == origin/main` verified after the push.
- Validation: the commands above plus `node bin/nightwatch-session.mjs integrate`.

## Validation Strategy

Per milestone, the smallest sufficient check, recorded with its exact command
and result in `STATE.md`: the focused vitest run for M1–M5; UI typecheck and
build for M2–M5; the full `gate:local` and browser lane for M6. No gate is
weakened, no test deleted or skipped, and no absent run is recorded as a pass.

## Decision Log

- Decision: derive carriage mechanically instead of declaring a
  contract-to-view map.
  Reason: a declared map is a second authority that can drift from the code;
  props, state and type-argument mentions are facts about the source.
  Evidence: the generic hook binds `usePagedCollection<RunListSnapshot, …>`
  at the call site, which mechanically ties the paged fields to the view.
  Consequence: the guard resolves generic callees and containment paths.

- Decision: keep the exempt list field-keyed and reason-bearing, and fail when
  an exempt field becomes rendered.
  Reason: the predecessor's third assertion only checked that an exempt name
  still exists; an exemption that outlives its reason is how a narrow list
  becomes a blanket.
  Evidence: three exemptions carried by the predecessor, two added here.
  Consequence: `schemaVersion`, `afterSeq`, `advisoryOnly`, `passed`, `layer`.

- Decision: render the paged `truncated` through the shared collection rather
  than exempting it.
  Reason: `truncated` is the server's answer about the server's bound; a list
  that says "All loaded." from the cursor alone conflates two facts.
  Evidence: `boundedCollection` sets `truncated` as "more remain AFTER this
  page" and the client never read it.
  Consequence: `PagedSnapshot`, `PagedCollection` and `LoadMoreControl` gain
  the field; `nextCursor` remains the cursor.

- Decision: exempt `SystemMapNodeView.layer` rather than draw it.
  Reason: the map communicates position; `layer` is the server's layout
  ordinal, and the view draws `x`/`y` directly.
  Evidence: `SystemMapNodeView` carries `x`, `y` and `layer`; no map code
  reads `layer`.
  Consequence: one reasoned exemption, stated in the guard.

## Discoveries

- To be filled during execution.

## Deferred Work

- A placement proof for the stylesheet guard (class-to-rule is its current
  limit).
- Conditional-render reachability: the guard proves a name occurs inside a
  carrier, not that every branch draws it.

## Completion Criteria

Every acceptance criterion in `SPEC.md` met with evidence; all five findings
P-01 through P-05 CLOSED or resolved into exactly one honest class; the
placement guard and its regressions green in the authoritative gate; state and
docs reconciled; certified checkpoint integrated by fast-forward; session
released; clean tree on canonical `main`.
