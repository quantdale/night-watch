# Audit — Control Center render truth

Audited live at `f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`, in the owned
session worktree `nightwatch-control-center-render-287b0e00`, with the
canonical checkout clean and `HEAD == origin/main`. Every number below was
measured here, not copied from a predecessor record.

## What is already true, and is not re-opened

`nightwatch-control-center-placement-coverage-v1` is terminal COMPLETE and
integrated at `f0180d1`; P-01 through P-05 are CLOSED. Its placement guard
passes with five reasoned exemptions (`schemaVersion`, `afterSeq`,
`advisoryOnly`, `passed`, `layer`). `nightwatch-residual-closure-and-lane-
qualification-v1` is terminal COMPLETE; its three `UNAVAILABLE_CAPABILITY`
lanes and the `BLOCKED_EXTERNAL` external CI state are unchanged by this
change. No network egress, owner harness or live app is required.

Re-verified independently at the starting SHA:

- `npm test` full offline regression: 4789 passed / 18 skipped / 0 failed in
  16.4 minutes.
- `gate:local` all eleven groups PASS at the predecessor's implementation
  checkpoint.
- `ui/control-center`: typecheck PASS, 58 tests across 4 files PASS, build
  PASS at 3 files / 324,478 bytes.

## R-01 — the placement guard is static, not runtime

`ui/control-center/src/contractCoverage.test.ts` asserts that each contract
field name occurs inside a component that can receive the contract. It proves
placement of a NAME. It does not prove the field's value reaches the rendered
DOM. A field read only in a conditional branch the default state never takes,
computed into a variable no render consumes, or used only as a React key would
satisfy it while rendering nothing.

The placement campaign recorded this limit in its own STATE and in
`docs/CURRENT_STATE.md`: "Conditionally reachable rendering is still not
proven by a name-level carrier check; the guard states that limit."

A feasibility probe run in this session built a TypeScript-AST generator over
`ui/control-center/src/types.ts` and a differential runner:

- 34 interfaces parsed; 213 sentinel leaves generated for the Overview family
  (`HealthSnapshot`, `MetaSnapshot`, `ReadinessSnapshot`, `SafetySnapshot`,
  `SourceSummarySnapshot`).
- 137 leaves (excluding `schemaVersion`, which the API layer validates) were
  each flipped to an alternative value, the app re-rendered, and
  `document.body.innerHTML` compared with the baseline.
- All 137 changed the DOM; elapsed 4.76 seconds; baseline HTML 14,438 bytes.
- No `Date.now`, `Math.random` or `new Date()` occurs in `App.tsx`, so the
  comparison is deterministic.
- One intermediate failure was instructive: with date-shaped strings emitted
  as sentinels, `formatTimestamp` rendered an invalid date identically for
  every value, and after fixing the generated value shape the same fields
  became observable. The generator must therefore emit valid ISO strings for
  date-shaped fields rather than raw sentinels.

## R-02 — view changes are silent to assistive technology

`App.tsx` contains no `focus()` call and no `document.title` assignment
anywhere in the UI package. Navigation is implemented twice: the nav click
calls `navigate(view)`, which sets the hash and the active view, and a
`hashchange` listener sets the active view for back/forward. Neither path
moves focus from the nav link, announces the new view, or updates the window
title. A keyboard or screen-reader operator activates a nav link and remains,
in the accessibility tree, on that link; the document title continues to
describe whatever it described before.

The existing tests assert that headings are present after navigation; no test
asserts focus, title or announcement.

## R-03 — dynamic classes have no runtime application proof

`ui/control-center/src/styles.test.ts` asserts that every rendered class has a
selector in `styles.css`. The browser lane
(`tests/browser/controlCenterBrowser.browser.ts`) contains exactly one
computed-style assertion: `.graph-controls` background is not the transparent
default. The interpolated families that the stylesheet guard checks
name-by-name (`graph-node-${tone}`, `graph-edge-dimmed`, `code-chip-${tone}`,
`stage-${tone}`, `text-${tone}`, `status-${tone}`) have no assertion that the
rule actually applies at runtime. A rule that exists but is overridden,
mistyped in the built bundle, or scoped away would pass both current guards.

## Why no existing check caught any of this

- The placement guard is static and scoped to carrier text.
- `App.test.tsx` asserts specific rendered strings for specific fixtures; it
  cannot fail for a field no assertion mentions.
- The browser lane proves views load and one toolbar class styles.
- Typecheck proves the fields exist on the type; consuming a field is not
  required to typecheck.
