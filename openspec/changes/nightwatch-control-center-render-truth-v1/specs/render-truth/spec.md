# Spec — Control Center render truth

## ADDED Requirements

### Requirement: Control Center render truth

The Control Center SHALL prove at runtime that every contract field it
declares observably affects the rendered DOM of the view that owns it, or
declare that it does not with a stated reason; SHALL announce a view change to
assistive technology without disturbing initial load or background refreshes;
and SHALL prove that the interpolated style classes it renders apply at
runtime.

#### Scenario: a field that reaches no render fails the harness

- GIVEN a contract leaf that is declared and fetched
- WHEN the harness flips its value and the rendered DOM does not change
- THEN the leaf is reported unobservable
- AND it must be rendered in its owning view or added to the reasoned exempt
  list, or the suite fails

#### Scenario: a field that renders is proven observable

- GIVEN a contract leaf whose value the owning view renders
- WHEN the harness flips its value
- THEN the rendered DOM changes
- AND the flip is measured against the baseline HTML, not against a sentinel
  string that a formatter might rewrite

#### Scenario: exemptions stay honest

- GIVEN an exempt contract path
- WHEN the field becomes observable in the DOM
- THEN the harness fails and the exemption must be removed
- AND an exempt path that names no declared field also fails

#### Scenario: the harness is not vacuous

- GIVEN the harness's fixture generator and baseline render
- WHEN the suite runs
- THEN the number of contracts, leaves and views is measured
- AND a generator that produced nothing would fail before any flip

#### Scenario: a view change is announced

- GIVEN an operator on any view
- WHEN they activate a navigation link, change the hash, or use back/forward
- THEN the document title names the new view
- AND focus moves to the main content region
- AND the change is not silent to assistive technology

#### Scenario: background refreshes do not interrupt

- GIVEN an operator with focus inside the current view
- WHEN an SSE refresh or the initial load renders
- THEN focus is not moved
- AND the operator's reading position is preserved

#### Scenario: a dynamic class applies at runtime

- GIVEN the built Control Center served over loopback
- WHEN a representative class of an interpolated family renders
- THEN its computed style differs from the unstyled default
- AND a rule that exists in source but does not apply fails the lane
