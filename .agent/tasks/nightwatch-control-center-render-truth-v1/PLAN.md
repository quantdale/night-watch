# Control Center Render Truth — Plan

## Purpose

Convert the Control Center's static placement evidence into runtime evidence:
every contract field observably affects the DOM of the view that owns it;
view changes are announced to keyboard and assistive-technology operators; and
dynamic style classes apply in the built bundle. The observable outcome: a
field that stops rendering fails a mechanical check, and an operator who
navigates with a keyboard or a screen reader is told what changed.

## Starting State

- Task ID: `nightwatch-control-center-render-truth-v1`
- Starting SHA: `f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`
- `ui/control-center` is a Vite + React 19 + vitest package. Views are
  components in `src/App.tsx`; contracts are in `src/types.ts`; the API layer
  in `src/api.ts` validates each snapshot's `schemaVersion` and required
  fields before the UI sees it.
- Measured at the starting SHA: full regression 4789/18/0; UI 58 tests, build
  324,478 bytes; browser lane 4/0; `gate:local` 11/11 at the predecessor's
  implementation checkpoint.
- Feasibility probe in this session: the TS-AST generator produced 213
  sentinel leaves across the Overview-family contracts; the differential
  runner rendered and flipped 137 leaves with 0 unobservable in 4.8 seconds.

## Scope

- `ui/control-center/src/contractRender.test.tsx` (new) — the harness.
- `ui/control-center/src/App.test.tsx` — focus/title regressions and any
  repairs the harness requires.
- `ui/control-center/src/App.tsx` — focus/title management and any field
  rendering the harness proves missing.
- `tests/browser/controlCenterBrowser.browser.ts` — dynamic-class computed
  styles.
- `config/validation-universe.v1.json` — registration and digest.
- `.agent/**`, `openspec/changes/nightwatch-control-center-render-truth-v1/**`,
  `docs/**` — task and project truth.

## Non-Goals

- No server, route, adapter, contract, bound or sanitizer change.
- No new stylesheet classes or visual redesign.
- No execution, mutation, product contact, publication or network egress.
- No reopening of P-01 through P-05 or U-01 through U-06.
- No attempt to prove visual correctness; the harness proves DOM influence.

## Safety Constraints

- LOCAL only; loopback UI reads; sibling repositories read-only.
- Owner-local findings, raw evidence, credentials, traces and customer values
  stay outside the boundary.
- C-00: implementation happens in this campaign's owned session worktree.
- Never weaken a guard or delete a test for green output.

## Architecture / Approach

### Generated fixtures

The harness parses `ui/control-center/src/types.ts` with the TypeScript
compiler API (a UI devDependency). Each interface becomes an object whose
leaves are unique sentinels: strings become unique tokens (date-shaped fields
become valid ISO strings so date formatting stays observable), numbers become
unique integers, booleans become `true`, literal unions pick the first
constituent, arrays carry one element, nullable fields carry their non-null
member, and inline objects recurse. A shape the generator cannot resolve
becomes a sentinel only through an explicit fallback that is itself asserted
non-vacuous, so an unknown shape cannot silently weaken the harness.

`schemaVersion` is not a sentinel: the API layer refuses a mismatched
identity, so the harness writes each contract's declared version and excludes
that field from the flip set.

### Differential observability

For each view:

1. Build the view's fixture set, navigate to it, and wait for a stable marker.
2. Capture `document.body.innerHTML` as the baseline.
3. For each leaf, deep-clone the fixtures, set the alternative value, render
   again, and require the DOM to differ. A leaf whose flip never changes the
   DOM is either rendered in its owning view or listed as exempt with a
   reason.

The exempt list is keyed by contract path and carries a reason; the harness
fails if an exempt path becomes observable (stale) or names a field the
contracts no longer declare.

### Operators

View navigation becomes a single function that updates the hash, the active
view, the document title and the main-content focus. Initial load and
background refreshes do not move focus, so an operator reading a panel is not
interrupted by an SSE-driven rerender. The main content region is focusable
with `tabIndex={-1}` and carries the view heading.

### Dynamic classes

The browser lane computes styles for classes that are produced by
interpolation (`status-ready`, `graph-node-warning`, `graph-edge-dimmed`,
`code-chip-blocked`, `stage-gap`, `text-warning`) and asserts they differ from
the unstyled default, so a rule that exists in source but never applies in the
built bundle fails.

## Milestones

### M0 — execution truth

- **Status:** COMPLETE
- Objective: an owned session on the current base, a clean workspace, the
  predecessor re-verified terminal COMPLETE, and this route committed.
- Files: `.agent/**`, `openspec/changes/nightwatch-control-center-render-truth-v1/**`.
- Acceptance: `session:status` verdict PASS with `owned=true`, `drift=false`,
  `base=CURRENT`; predecessor records untouched.
- Validation: `node bin/nightwatch-session.mjs status`, `npm run workspace:check`,
  `git diff --check`.

### M1 — harness core and the Overview family (R-01)

- **Status:** COMPLETE
- Objective: the generator, the differential runner, the exempt-list
  machinery, and coverage of the Overview/Safety family.
- Files: `ui/control-center/src/contractRender.test.tsx`.
- Acceptance: extraction and rendering are measured non-vacuous; every
  non-exempt leaf of the Overview family is observably rendered; the exempt
  list is reasoned and staleness checked; removing a rendered field's DOM
  effect fails the harness.
- Validation: `npm --prefix ui/control-center run test -- contractRender`,
  plus a recorded mutation proof.

### M2 — list, graph, campaign and finding views (R-01)

- **Status:** COMPLETE
- Objective: extend the harness to runs (list, detail, timeline), execution
  graph, campaigns and findings, including their selection flows.
- Files: `ui/control-center/src/contractRender.test.tsx`; `App.tsx` only where
  the harness proves a field unobservable.
- Acceptance: the same observability and exemption guarantees for these
  views; any exposed field is rendered or exempted with a reason.
- Validation: `npm --prefix ui/control-center run test -- contractRender`.

### M3 — reviewer, source and system map (R-01)

- **Status:** COMPLETE
- Objective: extend the harness to reviewer, source surfaces/graph and the
  system map, and close every remaining exposed field.
- Files: `ui/control-center/src/contractRender.test.tsx`; `App.tsx` only where
  a field proves unobservable.
- Acceptance: every view is covered; no non-exempt leaf is unobservable; the
  exempt list remains small and reasoned.
- Validation: `npm --prefix ui/control-center run test -- contractRender`.

### M4 — view-change focus, title and announcement (R-02)

- **Status:** COMPLETE
- Objective: make a view change announce itself without disturbing initial
  load or background refreshes.
- Files: `ui/control-center/src/App.tsx`, `ui/control-center/src/App.test.tsx`.
- Acceptance: `document.title` names the view; user navigation focuses the
  main content; initial load and SSE refresh do not move focus; regressions
  cover nav click, hash change and back/forward.
- Validation: `npm --prefix ui/control-center run test -- App`.

### M5 — dynamic-class application in the built bundle (R-03)

- **Status:** IN_PROGRESS
- Objective: prove representative interpolated style classes apply at runtime.
- Files: `tests/browser/controlCenterBrowser.browser.ts`.
- Acceptance: computed styles for the dynamic families differ from the
  unstyled default in the built bundle.
- Validation: `npm run control-center:ui:browser`.

### M6 — registration and UI validation

- **Status:** NOT_STARTED
- Objective: register the new suite, refresh the inventory digest, and pass
  the full UI validation set.
- Files: `config/validation-universe.v1.json`.
- Acceptance: `validation:universe` PASS with every new file classified; UI
  typecheck, all tests and build PASS; root typecheck and `hardening:check`
  PASS.
- Validation: the commands above.

### M7 — certification

- **Status:** NOT_STARTED
- Objective: `gate:local` from the owned session, state and docs reconciled,
  fast-forward integration, session released, canonical tree clean.
- Files: task state, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`,
  `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`.
- Acceptance: all fourteen groups PASS at the certified checkpoint, all
  findings closed, `HEAD == origin/main` verified after the push.
- Validation: `npm run gate:local` plus
  `node bin/nightwatch-session.mjs integrate`.

## Validation Strategy

Per milestone, the smallest sufficient check with its exact command and result
recorded in `STATE.md`: focused UI suites for M1–M5; the browser lane for M5;
`validation:universe`, UI typecheck/test/build, root typecheck and
`hardening:check` for M6; the full `gate:local` and a fresh full regression
decision for M7. No gate is weakened, no test deleted or skipped, and no
absent run is recorded as a pass.

## Decision Log

- Decision: generate fixtures from the declared TypeScript AST instead of
  hand-writing sentinel objects.
  Reason: a hand-written fixture drifts from the contract and silently skips
  new fields; the declared types are the authority.
  Evidence: the feasibility probe generated 213 leaves across the Overview
  family and rendered them without error once date-shaped fields produced
  valid ISO values.
  Consequence: the harness fails closed on an unresolvable shape.

- Decision: prove observability by differential DOM comparison, not by
  sentinel presence.
  Reason: presence checks miss values mapped through formatters; a flip must
  change the DOM for any leaf the UI actually uses.
  Evidence: 137 Overview leaves were all observable under differential
  comparison in 4.8 seconds.
  Consequence: each leaf costs one small render; the full matrix is bounded
  and deterministic.

- Decision: keep `schemaVersion` outside the flip set.
  Reason: the API layer refuses a mismatched identity before the UI sees the
  snapshot, so flipping it renders an error state rather than a view.
  Evidence: `validateSnapshot` in `src/api.ts` compares the declared version.
  Consequence: the exempt list carries the same reason as the placement
  guard's.

- Decision: navigation owns title and focus; refreshes do not.
  Reason: an assistive-technology operator needs the change announced, and an
  operator reading a panel must not be interrupted by an SSE refresh.
  Evidence: `App.tsx` has no focus call and no title assignment today.
  Consequence: a single navigation function updates the hash, the title, the
  view and the focus.

## Discoveries

- A fixture generator must resolve generic type arguments and named type
  aliases, or it produces values the view cannot render (M3 found and fixed
  both).
- `SystemMapNodeView.layer` became observable when the map table fallback was
  added, so its exemption was removed from both guards rather than kept.

## Deferred Work

- Visual correctness and layout remain unproven by this harness; it proves
  DOM influence, not readability.
- Conditional branches that a maximally revealing fixture does not take stay
  unproven; the exempt list records anything the fixture cannot reach.

## Completion Criteria

Every acceptance criterion in `SPEC.md` met with evidence; R-01 through R-04
CLOSED or resolved into exactly one honest class; the harness green in the UI
suite and registered; state and docs reconciled; certified checkpoint
integrated by fast-forward; session released; clean tree on canonical `main`.
