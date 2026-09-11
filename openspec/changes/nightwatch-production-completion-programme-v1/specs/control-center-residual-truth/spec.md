# Spec — Control Center residual truth

Closes F-09. The four predecessor campaigns
(`…ui-completion-v1`, `…placement-coverage-v1`, `…render-truth-v1`,
`…style-and-absence-truth-v1`) are terminal COMPLETE and are not re-opened. The
last of them recorded its own residuals verbatim: "Native form controls remain
statically covered only; whole-stylesheet dead-rule detection is unperformed",
and an evidence-status colour taxonomy for the system map is "recorded as
deferred owner-facing work". Measured at `36bd493`: UI typecheck, 63 tests and
build PASS; browser lane 4 passed / 0 failed; `UI_LANE=5` in the validation
universe.

## ADDED Requirements

### Requirement: Every stylesheet rule SHALL be reachable by a class the composition can render

The existing guards run in one direction: every rendered class must have an
effective rule. The reverse — every rule must have a class that can produce
it — is unguarded, and that is exactly how the system map's four dead
`.map-node.node-*` tone rules survived until they were found by hand. A rule
that no class can match is dead code in the shipped bundle.

A whole-stylesheet check SHALL extract every selector from the built stylesheet
and require each to be matched by at least one element in the synthetic
composition across the qualification walk, or to appear in a reasoned
unreachable list with its reason (a state the synthetic composition cannot
produce, a pseudo-class the sweep cannot enter, a vendor fallback).

The list SHALL fail in both directions, as the render-truth campaign's base-only
list already does: a listed selector that becomes reachable is stale and fails,
and an unlisted unreachable selector fails. The check SHALL assert a non-zero
extracted selector count so an extractor that silently stops finding rules
fails before any assertion.

Pseudo-classes and media queries that the sweep cannot legitimately enter
(`:hover`, `:focus-visible`, `print`, `prefers-reduced-motion`) SHALL be a
declared class of exemption with a stated reason, not silently skipped.

#### Scenario: a dead rule fails the check
- **WHEN** a rule's selector matches no element in the composition and is not
  listed
- **THEN** the check fails naming the selector and the stylesheet line

#### Scenario: the unreachable list is honest in both directions
- **WHEN** a listed selector becomes reachable
- **THEN** the check fails as stale
- **AND** the listing must be removed

#### Scenario: the check is non-vacuous
- **WHEN** selector extraction yields zero selectors
- **THEN** the check fails before asserting reachability

#### Scenario: the mutation proof holds
- **WHEN** a live rule's selector is altered so nothing can match it
- **THEN** the lane fails

### Requirement: Native form controls SHALL be covered by a runtime check appropriate to them

The runtime computed-effect sweep excludes native form controls because this
browser environment forces their computed colours, so a toggle-and-compare
reads no difference. The exclusion is correct and leaves the controls proven
only statically — a class on a `<select>` or `<input>` can be inert and nothing
detects it.

A runtime check SHALL cover them on properties the environment does not force.
Geometry, spacing, border, font and layout properties are observable where
colour is not; the check SHALL assert on that property set, with the forced
properties declared and excluded by name rather than the whole element being
excluded.

Where a control genuinely carries no non-forced effect, it SHALL appear in the
base-only list with that reason, subject to the same both-directions rule.

#### Scenario: an inert class on a native control fails
- **WHEN** a class applied to a native form control changes no non-forced
  computed property and is not declared base-only
- **THEN** the lane fails naming the class and the element

#### Scenario: forced properties are named, not assumed
- **WHEN** the check runs
- **THEN** the excluded properties are declared by name with the reason
- **AND** an undeclared exclusion fails

### Requirement: The system map SHALL either carry a proven evidence-status taxonomy or state that it is flat

The map's tone classes were removed because the wire carries a 13-value
evidence vocabulary while the stylesheet matched four historical values, so
every tone rule was dead. Removal was right; the map now renders flat and the
operator loses the evidence distinction the vocabulary carries.

Exactly one of two outcomes SHALL be recorded.

**A taxonomy.** A mapping from the 13-value core evidence vocabulary to a
rendered treatment, complete over the vocabulary — every value maps, with no
default bucket that silently absorbs a new value. Adding a fourteenth value
SHALL fail the completeness assertion rather than render as the default. The
treatment SHALL be proven by the existing runtime computed-effect sweep, and
SHALL NOT rely on colour alone, since colour alone is not an accessible
distinction.

**Stated flatness.** If no taxonomy is adopted, the map SHALL state in the UI
that evidence status is not rendered on the graph and SHALL point at the
surface that does carry it, so the operator is not left to infer that every
node is equivalent.

#### Scenario: the taxonomy is complete over the vocabulary
- **WHEN** a taxonomy is adopted
- **THEN** every one of the 13 values has an explicit treatment
- **AND** adding a value with no treatment fails the completeness assertion

#### Scenario: the distinction is not colour-only
- **WHEN** a treatment is asserted
- **THEN** it differs in at least one non-colour computed property

#### Scenario: flatness is disclosed
- **WHEN** no taxonomy is adopted
- **THEN** the map view states that evidence status is not rendered and names
  where it is
- **AND** the statement is covered by the contract-render guard

### Requirement: The new guards SHALL be registered and bound to the inventory digest

R-12 made suite registration a totality rule: the gate runs only declared and
manifest-listed suites, so a written-but-unregistered check proves nothing.
Every guard added here SHALL be registered in
`config/validation-universe.v1.json`, SHALL appear in the UI lane manifest, and
the `inventoryDigest` SHALL be refreshed. `validation:universe` SHALL report the
raised `UI_LANE` count.

#### Scenario: an unregistered guard fails the universe check
- **WHEN** a new UI suite exists but is not classified
- **THEN** `validation:universe` reports it unclassified and
  `hardening:check` fails

#### Scenario: the digest binds the new inventory
- **WHEN** registration completes
- **THEN** the gate receipt binds the refreshed `inventoryDigest`
