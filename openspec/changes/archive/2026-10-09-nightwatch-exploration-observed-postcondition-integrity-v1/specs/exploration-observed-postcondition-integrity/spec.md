## ADDED Requirements

### Requirement: Approved actions have independent source-backed postconditions

Every approved exploration action SHALL declare a fixed source-backed postcondition observer and predicate whose safe observed output is independent of the declared expected value. An expected delta SHALL never be returned or merged as if it had been observed.

#### Scenario: Click succeeds but UI is unchanged
- **WHEN** Playwright resolves the click and no required postcondition change is observed
- **THEN** the action fails categorically and model state does not advance

#### Scenario: Local-only action has no network request
- **WHEN** an approved local-only action completes
- **THEN** success still requires its independent UI postcondition proof

### Requirement: Postconditions settle uniquely and on the current document

The system SHALL sample bounded safe before/after state, require exact unique controls, bind observations to the current document/page generation, and accept only a stable postcondition within one deadline. Ambiguous, detached, stale, contradictory, or timed-out observations SHALL fail closed.

#### Scenario: Stale menu option is clicked
- **WHEN** the selected locator belongs to an earlier menu/document generation
- **THEN** the postcondition is rejected and no transition is recorded complete

#### Scenario: Two controls match a source label
- **WHEN** the postcondition observer cannot identify exactly one approved control
- **THEN** the action is unavailable or failed without inspecting arbitrary text

### Requirement: Exploration state and transitions derive from observations

`safeViewState`, `structuralDelta`, `nextState`, coverage, novelty, and transition identity SHALL derive from admitted observed facts. The engine SHALL verify the observed delta against the declarative predicate and SHALL reject inconsistencies between delta and next state.

#### Scenario: Runtime returns a copied expected delta
- **WHEN** the returned delta lacks a matching before/after observation proof
- **THEN** the engine classifies a runtime/capture failure and does not advance coverage

#### Scenario: Required reads occur but wrong option is selected
- **WHEN** network expectations settle while the UI postcondition contradicts the action
- **THEN** the action fails and the requests do not substitute for UI proof

### Requirement: Sort and selector semantics are proven without customer values

Selector, tab, and sort observers SHALL retain only fixed source-enum labels and categorical structural states. They SHALL NOT persist row values, customer text, identifiers, costs, raw DOM, or screenshots. If sort direction/key cannot be proven safely, that action SHALL remain unadmitted.

#### Scenario: Header click leaves sort unchanged
- **WHEN** a column-header click does not yield the required categorical sort state
- **THEN** no sort transition is admitted

### Requirement: Exact replay re-observes postcondition proof

Exact replay SHALL execute the action against a fresh admitted context, re-observe the source-backed postcondition, and require the same contract version and safe categorical result before declaring a strict transition match.

#### Scenario: Replay copies prior evidence
- **WHEN** a runtime returns prior expected/observed values without a current-generation proof
- **THEN** replay reports invariant/capture divergence

### Requirement: Tests exercise the real runtime adapter

Tests SHALL drive the real Ripple exploration runtime through synthetic local DOM/network fixtures and cover no-op click, wrong option/tab, stale/detached menu, ambiguity, unchanged/reversed sort, reads-with-wrong-UI, document replacement, timeout, and mutations that reintroduce expected-value injection.

#### Scenario: Expected-value injection is restored
- **WHEN** a mutation assigns catalog expected state to runtime state or returned delta
- **THEN** a real-adapter no-op fixture fails the focused suite
