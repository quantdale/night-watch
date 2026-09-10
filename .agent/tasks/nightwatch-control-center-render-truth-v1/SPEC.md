# Control Center Render Truth

Task ID: nightwatch-control-center-render-truth-v1

## Task purpose

The predecessor's placement guard proves a contract field name occurs inside a
component that can receive the contract. It does not prove the field's VALUE
reaches the rendered DOM: a field could be read in a conditional branch the
default state never takes, used only as a React key, or computed into a
variable no render consumes, and the guard would stay green. At the same time
navigation changes the rendered view without moving focus, announcing the
change, or updating the window title, and the stylesheet guard proves a rule
exists without proving a dynamic class applies in the built bundle.

This change adds the missing runtime proof: a differential render harness that
mutates one contract leaf at a time and requires the rendered DOM to change,
view-change focus and title management for keyboard and assistive-technology
operators, and browser-lane computed-style assertions for the dynamic class
families. Any field the harness proves unobservable is rendered in its owning
view or exempted with a reason an operator would accept.

## Established starting state

- Task: `nightwatch-control-center-render-truth-v1`
- Starting SHA: `f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16` — the predecessor's
  certification checkpoint, integrated by fast-forward with local
  `HEAD == origin/main` and a clean canonical checkout.
- Predecessor `nightwatch-control-center-placement-coverage-v1` is terminal
  COMPLETE. P-01 through P-05 are CLOSED; its placement guard passes with five
  reasoned exemptions (`schemaVersion`, `afterSeq`, `advisoryOnly`, `passed`,
  `layer`). Do not reopen P-01 through P-05.
- `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
  COMPLETE; its three `UNAVAILABLE_CAPABILITY` lanes and the
  `BLOCKED_EXTERNAL` external CI state are unchanged.
- Measured at the starting SHA: full offline regression 4789 passed / 18
  skipped / 0 failed; `gate:local` all eleven groups PASS at the predecessor's
  implementation checkpoint; UI typecheck, 58 tests and build PASS; browser
  workflow lane 4 passed / 0 failed.
- A feasibility probe in this session built a TypeScript-AST fixture generator
  over `ui/control-center/src/types.ts` (34 interfaces; 213 sentinel leaves in
  the Overview family) and a differential runner: 137 Overview-family leaves
  were each flipped and the rendered DOM changed for all 137, in 4.8 seconds.
  No `Date.now`, `Math.random` or `new Date()` occurs in `App.tsx`, so DOM
  comparisons are deterministic.
- `App.tsx` contains no `focus()` call and no `document.title` assignment
  anywhere in the UI package. The browser lane contains exactly one
  `getComputedStyle` assertion (the graph toolbar's background).

## Registered findings

- R-01 — the placement guard is static and name-scoped. It proves a field
  reaches a carrier component, not that its value reaches the rendered DOM.
  Deliverable: a differential render harness that generates a maximally
  revealing fixture per view from `types.ts`, flips each non-exempt contract
  leaf to an alternative value, and requires the rendered DOM to change; any
  unobservable field is rendered in its owning view or exempted with a stated
  reason. The harness must be non-vacuous, deterministic, and mutation-proven
  (removing a field's render must fail it).
- R-02 — view changes are silent to assistive technology. Navigation (nav
  click, hash change, back/forward) rerenders the view without moving focus
  from the nav link, without a document title change, and without an
  announcement. Deliverable: focus the main content on user navigation, set
  the document title per view, and assert both, without stealing focus on
  initial load or on background refreshes.
- R-03 — the stylesheet guard proves a rule exists in source; the browser lane
  computes a style for one class. Dynamic class families (`status-*`,
  `graph-node-*`, `graph-edge-*`, `code-chip-*`, `stage-*`, `text-*`) have no
  runtime application proof. Deliverable: browser-lane computed-style
  assertions for representative dynamic classes, so a rule that exists but
  does not apply fails.
- R-04 — project and task truth for this campaign, and any documentation drift
  the campaign repairs, recorded in the established shape.

## Required deliverables

- `ui/control-center/src/contractRender.test.tsx` (name indicative): the
  differential render harness. It must:
  - generate fixtures from the declared contracts with a failing-closed
    generator (an unknown type shape must not silently become a string);
  - exercise every view (`overview`, `safety`, `runs` + detail + timeline,
    `execution-graph`, `campaigns`, `source-intelligence` + graph, `findings`,
    `reviewer`, `system-map`);
  - assert each non-exempt leaf observably changes the DOM when flipped, with
    a reasoned exempt list and a staleness check;
  - prove its own extraction and rendering are non-vacuous;
  - be mutation-verified: removing a rendered field's DOM effect fails it.
- Focus and title management in `App.tsx` with regressions in
  `App.test.tsx`, including that initial load does not move focus and that
  background refreshes do not disturb a focused control.
- Browser-lane dynamic-class computed-style assertions in
  `tests/browser/controlCenterBrowser.browser.ts`.
- Registration of any new test file in `config/validation-universe.v1.json`
  UI_LANE with `inventoryDigest` refreshed.
- Regressions for every unobservable field the harness exposes, whether by
  rendering it or by exempting it with a reason.

## Explicit non-goals

- No new API route, adapter, authority, contract field, server bound or
  sanitizer change.
- No execution, mutation, product contact, publication or network egress.
- No change to the predecessor's lane classifications or CI state.
- No new stylesheet classes; the browser assertions prove existing rules.
- No visual redesign.
- No reopening of P-01 through P-05 or U-01 through U-06.

## Safety constraints

- Local, read-only, loopback only. The UI gains no authority it lacked.
- Owner-local findings, raw evidence, source text, paths, credentials,
  authenticated traces and customer values remain outside the boundary.
- Work happens in this campaign's owned session worktree under C-00. The
  canonical checkout is not an implementation worktree.

## Declared Deletions

None.

## Acceptance criteria

- The harness renders every view with generated fixtures and proves every
  non-exempt contract leaf observably affects the DOM; its exempt list is
  reasoned, staleness-checked, and small relative to the field population.
- A mutation that removes a rendered field's DOM effect fails the harness, and
  restoring it passes.
- `document.title` names the current view; user navigation moves focus to the
  main content region; initial load and background refresh do not move focus.
- Browser-lane assertions compute non-default styles for representative
  dynamic classes in the built bundle.
- `ui/control-center`: `typecheck` PASS, all tests PASS, `build` PASS.
- Root `typecheck` and `hardening:check` PASS; `validation:universe` PASS with
  every new file classified.
- The browser workflow lane passes.
- `gate:local` PASS from this owned session, with task and project state
  reconciled to that checkpoint and the checkpoint integrated by fast-forward.
