# Control Center UI Completion

Task ID: nightwatch-control-center-ui-completion-v1

## Task purpose

Complete the local Control Center UI in the sense this repository means by
complete: every field the client fetches reaches the operator or is declared
unrendered with a reason; no bound the client imposes on itself is presented
as the server's bound or as completeness; and every class the UI renders has a
stylesheet rule, so a control that computes a state also shows it.

The observable outcome is that an operator can answer "which check is
unknown", "what revision was this run measured against", "what did the
readiness verdict actually measure", and "how much of this graph am I looking
at" — none of which the UI could answer before, despite holding every answer.

## Established starting state

- Task ID: `nightwatch-control-center-ui-completion-v1`
- Starting SHA: `11c9ea62405c5b9b0eddd011fb7083da83348ee7`
- Predecessor `nightwatch-residual-closure-and-lane-qualification-v1` is
  terminal COMPLETE. R-01 through R-07 are CLOSED. Do not reopen them.
- The three lanes that predecessor left `UNAVAILABLE_CAPABILITY` by authority,
  and the `BLOCKED_EXTERNAL` external CI state, are unchanged by this task.
  This work needs no network egress, no owner harness and no live app.
- All nine `VIEW_DEFINITIONS` views are reachable and each has a render
  branch. `PlaceholderView` is unreachable and is retained deliberately, as
  the fail-safe for a view id added without a branch.
- At the starting SHA: root `typecheck` and `hardening:check` PASS; the UI
  package's `typecheck` PASS, 41 tests across 2 files PASS, `build` PASS; the
  browser workflow lane 4 passed / 0 failed.
- The measured gap is recorded in
  `openspec/changes/nightwatch-control-center-ui-completion-v1/audit.md`.
  It is a missing comparison, not a missing test: no existing check compares a
  contract to a render, or a class to a stylesheet.

## Registered findings

- U-01 `GraphCanvas` sliced nodes to 24 and edges to 48 against a 250/500
  default and 1000/2000 maximum, reported the full received edge count, and
  labelled a client-truncated picture `Complete`.
- U-02 nine snapshot contracts were fetched in full and rendered in part,
  across run detail, the run list, the timeline, source summary, source
  surfaces, the system map and the reviewer surface.
- U-03 `safety.checks`, `blockedOperationClasses` and `authMode` were never
  rendered, under a hero promising that unknown checks stay visible as
  unknown; `meta` was fetched for one boolean and otherwise discarded.
- U-04 most of the readiness contract's measurements were dropped, including
  the distinction between deferred and never-measured verification.
- U-05 nine rendered classes had no stylesheet rule, so C-15b's graph toolbar
  shipped unstyled and its filter changed no pixel; two further classes were
  dangling modifiers.
- U-06 no mechanical check existed for either defect class.

## Required deliverables

- U-01 the execution-graph canvas draws every node and edge received, on the
  shared deterministic layered layout, with pan, zoom, search, an
  execution-state filter and selection; the footer separates nodes drawn from
  filter matches and edges drawn from edges received; server truncation is
  quoted with its bound; undrawn edges are counted and attributed to the
  projection.
- U-02 every unrendered contract field either renders or appears in a reasoned
  exempt list, across run detail, run list, timeline, source summary, source
  surfaces, system map and reviewer.
- U-03 the Safety Center lists every check by name with state and reason code,
  names the refused operation classes, and shows the declared authorization
  class, findings storage, owner scope and feature flags; an empty check set
  renders as absence of evidence.
- U-04 the Overview renders the readiness measurements behind its verdict,
  keeping deferred and never-measured dimensions separate and naming each
  unresolved blocker with its detail code.
- U-05 every rendered class has a rule; the dangling modifiers are removed
  rather than given invented styles.
- U-06 `contractCoverage.test.ts` and `styles.test.ts`, each asserting its own
  extraction is non-vacuous, each carrying a reasoned exempt list, each
  verified to fail when the defect is reintroduced, and both registered in
  `config/validation-universe.v1.json` UI_LANE with `inventoryDigest`
  refreshed.

## Explicit non-goals

- No new API route, adapter, authority, contract field or data source.
- No change to server-side bounds, sanitization or the read-only boundary.
- No execution, mutation, product contact, publication or network egress.
- No change to the predecessor's lane classifications or CI state.
- No placement or correctness proof from the two coverage checks; both are
  name-level and say so.
- No visual redesign beyond the rules the rendered markup already required.

## Safety constraints

- Local, read-only, loopback only. The UI gains no authority it lacked.
- Owner-local findings, raw evidence, source text, paths, credentials,
  authenticated traces and customer values remain outside the boundary. Every
  field newly rendered was already sanitized and already sent.
- Work happens in this campaign's owned session worktree under C-00. The
  canonical checkout is not an implementation worktree.

## Declared Deletions

None.

## Acceptance criteria

- Reintroducing either slice in `GraphCanvas` fails `App.test.tsx`.
- Removing any stylesheet rule for a rendered class fails `styles.test.ts`.
- Removing a rendered contract field fails `contractCoverage.test.ts`, and an
  exempt entry for a field the contracts no longer declare also fails it.
- An empty safety check set renders as absence of evidence, and a populated
  one lists every check with its reason code.
- A truncated timeline page states that it is truncated.
- `ui/control-center`: `typecheck` PASS, `vitest run` all PASS, `build` PASS.
- Root `typecheck` and `hardening:check` PASS; `validation:universe` PASS with
  the two new suites classified.
- The browser workflow lane passes, including a computed-style assertion
  proving the graph toolbar's rule applies in the built bundle.
- `gate:local` PASS from this owned session.
