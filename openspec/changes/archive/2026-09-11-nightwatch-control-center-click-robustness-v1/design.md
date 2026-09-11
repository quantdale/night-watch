# Design — sibling browser spec click robustness

## Root cause (neighboring path, same class)

The sibling spec drives seven views with nav-link and button clicks.
Its `Inspect` clicks use `force: true`, which skips actionability
polling yet still requires a laid-out box for scroll coordinates. One
observed failure shows the exact pre-mitigation signature from
systemMapV2: rendered button present, `Element is not visible` at
dispatch, quiescent UI. Post-click assertions (run-detail heading,
selected row) are answer-specific, so box-independent dispatch cannot
go vacuous.

## Change shape

One local helper (`clickViewButton`: explicit `toBeVisible` encoding
the operator invariant, then `dispatchEvent('click')` exercising the
real React handler, one bounded retry) + two call-site conversions.
Timeouts unchanged; skips none; force retained everywhere else
(SVG-adjacent and drill targets keep their geometric reasons).

## Why test-only

The product surface (authorities, server, UI) is proven by unit suites,
gate lanes, and passing repeats. The failure is harness box timing, as
established in the predecessor campaign's diagnosis.
