# click-robustness Specification

## Purpose
TBD - created by archiving change nightwatch-control-center-click-robustness-v1. Update Purpose after archive.
## Requirements
### Requirement: Inspect clicks require painted buttons, then dispatch

Before each `Inspect` click, the test MUST observe the button visible
(operator invariant: only a painted button is clickable). The click
itself MUST use box-independent `dispatchEvent('click')` (one bounded
retry): force-clicks skip the polling that absorbs transient box stalls
but still need a box for scroll coordinates. Every dispatch is followed
by answer-specific assertions (run-detail heading, selected row), so a
swallowed dispatch fails loud, never vacuous.

#### Scenario: an Inspect click is performed

- **WHEN** an `Inspect` click is performed
- **THEN** the button MUST be observed visible before the click, the click MUST use box-independent `dispatchEvent('click')` with one bounded retry, and every dispatch SHALL be followed by answer-specific assertions so a swallowed dispatch fails loud, never vacuous

