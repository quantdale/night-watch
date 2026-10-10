# Spec — Accessibility certification

Closes F-20. Measured at `36bd493` in `ui/control-center/src/`: `App.tsx` is
1,786 lines in one file holding all nine views, 36 components and 68 hook call
sites; `main.tsx` is 9 lines; there is no router, view module or component
directory. 53 `aria-*` attributes and 16 `role=` attributes, added ad hoc.
**No `axe`, `jest-axe` or any accessibility tooling** in the UI's dependencies;
8 lines across five test files mention aria, role, keyboard or focus. 125
`color:` declarations with no contrast measurement. Three campaign closures
state "no formal accessibility certification" as something not claimed; none
scheduled one.

## ADDED Requirements

### Requirement: Evidence status SHALL NOT be encoded by colour alone

This is a correctness requirement, not a compliance one. The Control Center's
entire purpose is letting a human distinguish `FACT` from `RECOMMENDATION` from
`UNKNOWN`, `PROVEN` from `UNPROVEN` from `TRUNCATED` from `STALE`, and a
deliberate empty from an unmeasured one. Nightwatch's core discipline is that
absent, skipped and unavailable are distinct from PASS. A reader who cannot
perceive the encoding gets the conflation the whole system exists to prevent.

Every status distinction the UI renders SHALL be carried by at least one
non-colour channel: text, shape, icon with an accessible name, or position. A
status whose only differentiator from another status is a colour value SHALL
fail.

The check SHALL run on the built composition, reusing the runtime
computed-style sweep the style campaign already built: for each pair of status
values rendered by the same component, compare the computed properties and
require a difference outside the colour property set, or the accessible text.

This subsumes and makes concrete the open question in
`control-center-residual-truth` about a system-map evidence taxonomy: if a
taxonomy is adopted, this requirement is what it must satisfy.

#### Scenario: two statuses differ by more than colour
- **WHEN** the same component renders two different status values
- **THEN** they differ in accessible text or in a non-colour computed property
- **AND** a colour-only difference fails naming both values

#### Scenario: the check runs on the built bundle
- **WHEN** the check executes
- **THEN** it reads computed styles from the built composition, not source

### Requirement: Contrast SHALL be measured against the rendered palette

125 colour declarations exist and none is measured. A status pill that is
technically distinct but unreadable conveys nothing.

Every foreground/background pair the built composition actually produces SHALL
be measured for contrast ratio and SHALL meet WCAG 2.2 AA for its computed font
size and weight — 4.5:1 for normal text, 3:1 for large text and for the
non-text boundaries that carry status meaning.

Pairs SHALL be enumerated from the rendered DOM, not from the stylesheet, so a
pair that only arises through cascade is measured and a declared-but-unrendered
pair is not. The enumeration SHALL assert a non-zero pair count.

A pair that cannot meet the ratio SHALL appear in a reasoned exemption list
that fails in both directions, with the reason stated — the same discipline the
base-only class list already uses.

#### Scenario: an unreadable status pair fails
- **WHEN** a rendered foreground/background pair falls below its required ratio
- **THEN** the check fails naming the pair, the ratio and the element

#### Scenario: pairs come from the DOM, not the stylesheet
- **WHEN** a pair arises only through the cascade
- **THEN** it is measured
- **AND** a declared pair that never renders is not measured

#### Scenario: the enumeration is non-vacuous
- **WHEN** zero pairs are enumerated
- **THEN** the check fails before measuring

### Requirement: The operator workflow SHALL be completable by keyboard, and that SHALL be executed

The reviewer workflow — navigate to a finding, read its epistemic class, record
one of five decisions — is the product's human half. It has never been executed
without a mouse.

The browser lane SHALL execute each operator workflow by keyboard alone:
view navigation, paging a collection, selecting a run, drilling into a graph
node, filtering, and submitting a review decision. Each SHALL assert that focus
is visible at every step, that focus order follows reading order, that no
control is reachable only by pointer, and that no focus trap exists outside a
deliberate modal.

The existing navigation behaviour — `document.title` set and main content
focused only for operator navigation, never on initial load or background
refresh — SHALL be preserved and asserted, since keyboard testing is exactly
what would otherwise regress it.

Automated structural auditing SHALL run over each rendered view: a standard
accessibility audit with a reasoned, both-directions violation-exemption list.
An audit tool finding zero violations SHALL NOT be presented as certification;
the lane SHALL state in its own output that automated auditing covers the
structural subset only.

#### Scenario: every workflow completes by keyboard
- **WHEN** each operator workflow is driven by keyboard only
- **THEN** it completes
- **AND** a control reachable only by pointer fails the lane naming it

#### Scenario: focus is visible and ordered
- **WHEN** focus moves through a view
- **THEN** a visible focus indicator is present at each step
- **AND** focus order follows reading order

#### Scenario: a review decision is submittable without a mouse
- **WHEN** the reviewer workflow runs by keyboard
- **THEN** a decision is recorded and the persisted result is read back

#### Scenario: the automated audit states its own limit
- **WHEN** the audit reports zero violations
- **THEN** the output states that this is the structural subset, not
  certification

### Requirement: `App.tsx` SHALL be decomposed so the surface is reviewable

1,786 lines holding nine views, 36 components and 68 hook call sites in one
file is the reason three successive campaigns found rendered-but-unbound data
and inert classes by writing mechanical guards: the file cannot be reviewed by
reading it.

The file SHALL be decomposed into one module per view plus a shared component
module, with the existing guards re-pointed at the new layout. The
contract-coverage guard already derives carriers mechanically from component
bodies and call-site-bound generics, so decomposition SHALL make it stronger,
not weaker: carriers become per-view, and a field rendered in the wrong view
becomes detectable.

Decomposition SHALL be behaviour-preserving and proven so: the built bundle's
rendered DOM for every view under the existing fixture matrix SHALL be
identical before and after, asserted by comparison rather than by review.

#### Scenario: decomposition changes no rendered output
- **WHEN** the fixture matrix renders every view before and after
- **THEN** the resulting DOM is identical

#### Scenario: guards become per-view
- **WHEN** the contract-coverage guard runs after decomposition
- **THEN** carriers resolve within the owning view's module
- **AND** a field rendered in a non-owning view fails

#### Scenario: no guard is weakened to accommodate the move
- **WHEN** the decomposition lands
- **THEN** every existing exemption list is unchanged or shorter
