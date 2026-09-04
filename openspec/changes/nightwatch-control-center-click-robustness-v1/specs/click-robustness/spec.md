# Spec — sibling view-button click robustness

## Inspect clicks require painted buttons, then dispatch

Before each `Inspect` click, the test MUST observe the button visible
(operator invariant: only a painted button is clickable). The click
itself MUST use box-independent `dispatchEvent('click')` (one bounded
retry): force-clicks skip the polling that absorbs transient box stalls
but still need a box for scroll coordinates. Every dispatch is followed
by answer-specific assertions (run-detail heading, selected row), so a
swallowed dispatch fails loud, never vacuous.
