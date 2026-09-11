# Control Center Style and Absence Truth

Task ID: nightwatch-control-center-style-and-absence-truth-v1

## Task purpose

Two verification limits and one real divergence remain after the render-truth
campaign. The source stylesheet guard excludes seven interpolation prefixes
from its class extraction and then asserts concrete values for only three
families, so the `status-*` and `stage-*` families the UI can produce are
unasserted, and the system-map `node-*`/`edge-*` families are excluded
entirely. There is no runtime proof that a rendered class changes any computed
style in the built bundle beyond four representative selectors. And the render
harness flips scalar leaves but never empties an array, so an empty list that
renders exactly like a short list would pass every check.

Recon additionally found a real divergence: the system map builds
`node-${evidenceStatus}` and `edge-${evidenceStatus}` classes from the
13-value core evidence vocabulary, while the stylesheet only matches
`node-proven`, `node-unproven`, `node-unknown` and `node-refuted` — values
that vocabulary cannot produce. Every map tone rule is dead and the classes
are inert.

This change closes all four: concrete family assertions with intentional
base-only values documented, a runtime computed-effect check for every class
the built composition renders, an absence pass for every array field, and the
map divergence removed rather than papered over.

## Established starting state

- Task: `nightwatch-control-center-style-and-absence-truth-v1`
- Starting SHA: `d904dc96156f8376c772e6c43a75ce8cde3fad04` — the predecessor's
  post-certification consistency checkpoint, integrated by fast-forward with
  local `HEAD == origin/main`.
- Predecessor `nightwatch-control-center-render-truth-v1` is terminal
  COMPLETE (R-01 through R-04 CLOSED). It built the differential render
  harness (`ui/control-center/src/contractRender.test.tsx`), announced view
  changes through title and focus, and proved three dynamic tone families in
  the built bundle. Do not reopen it.
- Measured at the starting SHA: UI typecheck, 63 tests and build PASS; browser
  lane 4/4; `validation:universe` PASS (UI_LANE=5); `gate:local` all eleven
  groups PASS with receipt `receipt:sha256:fd0ddcf782fd34ba027b6854`; full
  offline regression 4789 passed / 18 skipped / 0 failed.
- `ui/control-center/src/styles.test.ts` excludes the prefixes `edge-`,
  `node-`, `graph-node-`, `stage-`, `status-`, `text-`, `code-chip-` from its
  rendered-class extraction, and asserts concrete values only for
  `graph-node-*`, `code-chip-*` and `text-*` plus three graph edge classes.
- `styles.css` declares `.status-ready`, `.status-warning`,
  `.status-blocked` (no `.status-neutral`), `.stage-ready`, `.stage-warning`,
  `.stage-blocked` (no `.stage-neutral`), and the dead map rules
  `.map-node.node-proven`, `.node-unproven`, `.node-unknown`, `.node-refuted`,
  `.node-selected`.
- `EVIDENCE_STATUSES` in `src/core/systemMap/model.ts` is the 13-value
  vocabulary the wire contract carries; lowercasing any of its values cannot
  produce `proven`, `unproven`, `unknown` or `refuted`.
- No test or source consumer references an `edge-*` class.

## Registered findings

- A-01 — the source stylesheet guard has a family blind spot. Seven
  interpolation prefixes are excluded from extraction, but only three
  families receive concrete-value assertions; `status-*` and `stage-*` are
  rendered, styled for three of their four tones, and never asserted, and the
  system-map `node-*` family is excluded with no assertion at all.
  Deliverable: assert every concrete value each rendered family can produce,
  state intentional base-only values explicitly, and keep the extraction
  non-vacuous.
- A-02 — no runtime proof that a class applies. `styles.test.ts` proves a
  selector exists; the browser lane computes styles for four representative
  selectors. Deliverable: for every class the built synthetic composition
  renders, prove the class changes at least one computed property on at least
  one element that carries it, or declare it base-only with a reason.
- A-03 — absence is untested for collections. The render harness flips
  scalar leaves, so an array that renders identically when empty would pass.
  Deliverable: for every array field in every covered contract, emptying it
  must change the DOM of a view that can receive it, or be exempt with a
  stated reason.
- A-04 — the system map's tone classes cannot match their rules. The UI
  builds `node-${evidenceStatus}` / `edge-${evidenceStatus}` from the
  13-value core vocabulary; the stylesheet matches only the four historical
  statuses. Every map tone rule is dead and every tone class is inert.
  Deliverable: remove the dangling interpolation and the dead rules (the
  design-preserving resolution the predecessor applied to
  `orbit-ring-outer`/`safety-grid`), or record an owner-facing alternative.

## Required deliverables

- `ui/control-center/src/styles.test.ts`: concrete-value assertions for
  `status-*` and `stage-*` (the tones the app can produce), the system-map
  family decision recorded, and the intentional base-only values stated with
  reasons in the suite.
- `tests/browser/controlCenterBrowser.browser.ts`: a computed-effect check
  over every class observed in the composition (toggle the class, compare
  computed styles, restore), with a reasoned base-only list asserted at the
  end.
- `ui/control-center/src/contractRender.test.tsx`: an absence pass over every
  array field, with a reasoned exemption list and staleness checking.
- `ui/control-center/src/App.tsx` and `ui/control-center/src/styles.css`:
  remove the map's dangling tone interpolation and dead tone rules when A-04
  is confirmed (or record the alternative).
- Registration of any new suite or file with `inventoryDigest` refresh.

## Explicit non-goals

- No new API route, adapter, authority, contract field, server bound or
  sanitizer change.
- No visual redesign; A-04 removes inert markup rather than inventing a
  colour taxonomy.
- No execution, mutation, product contact, publication or network egress.
- No reopening R-01 through R-04 or P-01 through P-05.
- No mass dead-rule detection beyond the map family this campaign registered.

## Safety constraints

- Local, read-only, loopback only. The UI gains no authority it lacked.
- Owner-local findings, raw evidence, source text, paths, credentials,
  authenticated traces and customer values remain outside the boundary.
- Work happens in this campaign's owned session worktree under C-00. The
  canonical checkout is not an implementation worktree.

## Declared Deletions

None.

## Acceptance criteria

- Every concrete class value each rendered interpolation family can produce is
  asserted in `styles.test.ts`, or explicitly declared intentional base-only
  with a reason.
- The browser lane proves computed effect for every class the composition
  renders, with a small reasoned base-only list; a class whose rule is removed
  from the stylesheet fails it.
- Emptying any array field changes the DOM of a view that can receive it, or
  the exemption states why it cannot.
- The system map no longer carries a tone class that cannot match its rule,
  and no dead tone rule remains; removing `.map-edge`'s base rule or a live
  class fails the runtime check.
- `ui/control-center`: `typecheck` PASS, all tests PASS, `build` PASS.
- Root `typecheck` and `hardening:check` PASS; `validation:universe` PASS.
- The browser workflow lane passes.
- `gate:local` PASS from this owned session, with task and project state
  reconciled to that checkpoint and the checkpoint integrated by fast-forward.
