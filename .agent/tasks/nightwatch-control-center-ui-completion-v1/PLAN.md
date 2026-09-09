# Control Center UI Completion

## Purpose

The Control Center holds every answer an operator needs and shows a subset of
them. This task closes the gap between what the client fetches and what the
screen says, and installs the two mechanical comparisons whose absence let the
gap open in the first place.

## Starting State

- Task ID: `nightwatch-control-center-ui-completion-v1`
- Starting Nightwatch SHA: `11c9ea62405c5b9b0eddd011fb7083da83348ee7`
- Relevant architecture: `src/controlCenter/` serves bounded, sanitized
  snapshots over loopback; `ui/control-center` is a separate package with its
  own lockfile, runner and typecheck, classified `UI_LANE` in
  `config/validation-universe.v1.json`.
- Dependencies: none outside this repository. No network, no live app, no
  owner harness.
- Established facts that must not be rediscovered: the predecessor campaign is
  terminal COMPLETE; all nine views are reachable; the measured field-by-field
  and class-by-class gap is recorded in the OpenSpec audit.

## Scope

Rendering and styling inside `ui/control-center`, the two new coverage suites,
their UI_LANE registration, and browser-lane assertions that qualify the new
panels and the toolbar's applied style in the built bundle.

## Non-Goals

No new route, authority, contract field or data source. No change to
server-side bounds, sanitization or the read-only boundary. No change to the
predecessor's lane classifications. No visual redesign beyond the rules the
rendered markup already required.

## Safety Constraints

Local, read-only, loopback only. Every newly rendered field was already
sanitized and already sent. Work stays in this campaign's owned session
worktree under C-00.

## Architecture / Approach

The Control Center server produces bounded, sanitized snapshots; the UI package
consumes them over loopback. The defect class this task closes lives entirely
on the consumer side, in two comparisons nobody was making:

- **contract versus render.** Every `readonly` field of every
  `export interface` in `types.ts` is a promise the server keeps. Reading a
  field is not required to typecheck, so a field can be fetched, validated,
  typed and never drawn, and every existing check stays green.
- **class versus stylesheet.** A `className` with no rule renders as the
  browser default. State computed for it — a `dimmed` flag, a `selected`
  flag — is correct, applied, and invisible.

The approach is therefore: render the fields, add the rules, and then install
each comparison as a test so the gap cannot silently reopen. Both checks are
name-level over `App.tsx` and say so in their own headers, because a check
that implies more than it proves is the same defect it exists to catch.

For U-01 specifically, the correction is not a larger client slice but no
client slice: `truncated` reports on the SERVER's bound, so any client bound
is undisclosed by construction. The execution graph adopts the source graph's
deterministic layered layout, and the two now share one `layerAssignment` over
a structural `LayoutGraph` type so they cannot diverge again.

## Milestones

### M0 — establish execution truth — COMPLETE
Owned session `nightwatch-control-center-ui-com-9a04214f` claimed on base
`11c9ea62405c5b9b0eddd011fb7083da83348ee7`; workspace verdict PASS; predecessor
re-verified terminal COMPLETE and untouched.

### M1 — the execution graph draws what the server sent (U-01) — COMPLETE
Both slices removed; `layerAssignment` generalized to a `LayoutGraph`
structural type shared by both canvases; pan, zoom, search, execution-state
filter and selection added; footer separates nodes drawn from matches and
edges drawn from received; server truncation quoted with its bound; undrawn
edges counted and attributed to the projection.

### M2 — run detail renders the contract it fetches (U-02) — COMPLETE
Repository provenance with dirty-tree state, per-type and per-severity
censuses, screenshot count, browser, ended timestamp, hard-failure count,
hard-failure and note codes, and timeline truncation with the continuing
sequence. Empty provenance and empty census state what absence means.

### M3 — the Safety Center lists its checks (U-03) — COMPLETE
Every check by name with state and reason code; refused operation classes
named; auth mode and network posture; declared authorization class, findings
storage, owner scope and feature flags; product readiness. An empty check set
renders as absence of evidence.

### M4 — readiness shows its measurements (U-04) — COMPLETE
Approved targets and active-family coverage, currentness counts, stale and
unavailable targets, compared and drifted campaign keys, pinned versus
observed analyzer version and their agreement, deferred versus never-measured
dimensions kept separate, blockers named with detail codes, external CI
classification, frozen operation count and frozen-marker match.

### M5 — source, reviewer and map surfaces complete (U-02) — COMPLETE
Surface binding, handler state and the three capability states; source anchor,
evidence digest and exclusion reasons; proof-family portfolio, stage/status
census and Phase 24 exclusions; capability rollup and inventory-digest
presence; repository filter; reviewer counterevidence, duplicate basis, shared
invariant, transition count and non-equivalence; system map projection
version.

### M6 — every rendered class has a rule (U-05) — COMPLETE
Graph toolbar, search, filter and zoom styles; dimmed, selected and neutral
node states and dimmed edges; run-detail code chips and census columns;
`panel-full` for panels carrying tables; `orbit-ring-outer` and `safety-grid`
dangling modifiers removed rather than styled.

### M7 — mechanical guards (U-06) — COMPLETE
`contractCoverage.test.ts` and `styles.test.ts` added, each asserting its own
extraction is non-vacuous, each carrying a reasoned exempt list, each verified
to FAIL when the defect is reintroduced. Both registered in UI_LANE with
`inventoryDigest` refreshed.

### M8 — certification — COMPLETE
UI typecheck PASS, 55 tests PASS across 4 files, build PASS; root `typecheck`
and `hardening:check` PASS; browser workflow lane 4 passed including the
built-bundle computed-style assertion; `gate:local` PASS from this session;
checkpoint committed.

## Validation Strategy

Each finding is proven by a test that fails without its fix, not by inspection:

- U-01 — reintroduce `nodes.slice(0, 24)` and confirm the new graph tests
  fail, then restore and confirm they pass. Assert 40 nodes render past the old
  24 cut, assert the footer separates drawn from matching and drawn edges from
  received, and assert a truncated projection never reads `Complete`.
- U-02 through U-04 — populated and empty fixtures for each surface. The empty
  fixtures are as important as the populated ones: they assert that absence is
  stated rather than omitted.
- U-05 — `styles.test.ts` fails on a removed or misspelled rule. The browser
  lane additionally reads the toolbar's computed background in the BUILT
  bundle, because a class with markup and no rule computes to the transparent
  default; a source-level check cannot see that.
- U-06 — each guard asserts its own extraction is non-vacuous, so a parser
  that silently matched nothing cannot make every later assertion pass.

Lane order: UI typecheck, UI tests, UI build, root typecheck,
`hardening:check`, browser workflow lane, then `gate:local` from the owned
session. Registration in UI_LANE precedes `hardening:check`, because the
validation universe discovers tracked files only and refuses an undeclared
suite.

## Decision Log

Decision: remove the client-side slice rather than raise it.
Reason: a client bound is undisclosed by construction, because `truncated`
reports only on the server's bound.
Evidence: `CONTROL_CENTER_LIMITS` permits 250/500 by default and 1000/2000 at
maximum; the canvas drew 24/48 and printed `Complete`.

Decision: share one layered layout between both graph canvases.
Reason: C-15b fixed this defect on the source graph and the execution graph
kept it; two copies are two chances to diverge again.
Evidence: `layerAssignment` only ever needed node identifiers and edge
endpoints, so a structural type serves both contracts.

Decision: remove `orbit-ring-outer` and `safety-grid` instead of styling them.
Reason: inventing a rule to satisfy a checker changes the design to fit the
check. Both were modifiers whose base class did all the work.
Evidence: neither appears in `styles.css`; removing them changes no pixel.

Decision: keep `PlaceholderView` although it is unreachable.
Reason: it is the fail-safe for a view id added without a render branch.
Evidence: every current view id has a branch, so it renders never.

Decision: state the limit of both coverage checks in their own headers.
Reason: a check that implies more than it proves is the defect it was written
to catch.
Evidence: both are name-level comparisons over `App.tsx`.

Decision: work in an owned session worktree despite the session being
configured to work in place.
Reason: AGENTS.md makes stricter repository rules win, and C-00 is mechanically
enforced.
Evidence: `agent:check` refused the canonical route with
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`; the transferred diff was
byte-compared against the canonical working tree before the canonical checkout
was restored, and `session:status` went FAIL to PASS.

## Discoveries

- `truncated` on a bounded projection answers a question about the server. A
  client that slices afterwards silently invalidates it.
- A UI can pass typecheck, a 41-test component suite and a real-browser
  qualification lane while rendering half of what it fetches.
- A className with no rule ships a feature that computes correctly and shows
  nothing.
- A count is not a name: `safety.checks.length` cannot say which check is
  unknown.
- The validation universe discovers tracked files only, so a new suite must be
  `git add`-ed before UI_LANE registration and the digest refresh will pass.

## Deferred Work

- A placement-level coverage check — asserting a field renders in the view that
  owns it — is larger work and is not attempted here.
- `PlaceholderView` has no test, because no reachable view id triggers it.
- The dangling-edge disclosure added to the execution graph applies equally to
  the source graph, which still skips such edges silently. Left unchanged to
  keep this diff to the registered findings.

## Completion Criteria

- U-01 through U-06 closed with a test that fails without its fix.
- UI typecheck, tests and build PASS; root typecheck and `hardening:check`
  PASS; `validation:universe` classifies both new suites.
- Browser workflow lane PASS including the built-bundle computed-style
  assertion.
- `gate:local` PASS from the owned session, with task and project state
  reconciled to that checkpoint.

## Validation

- `npm --prefix ui/control-center run typecheck`
- `npm --prefix ui/control-center run test`
- `npm --prefix ui/control-center run build`
- `npm run typecheck`
- `node bin/hardening-check.mjs`
- `npm run control-center:ui:browser`
- `npm run gate:local`

## Rollback

Every change is additive rendering, styling or test surface inside
`ui/control-center`, plus two UI_LANE registrations. Reverting the checkpoint
restores the prior UI exactly; no contract, route, adapter or stored artifact
is touched.
