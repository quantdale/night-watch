# Spec — Control Center UI completion

## ADDED Requirements

### Requirement: Control Center UI completion

The Control Center UI SHALL render every field it fetches or declare, with a
stated reason, that it does not; SHALL never present a bound it imposed itself
as the server's bound or as completeness; and SHALL give every class it renders
a stylesheet rule, so that a control which computes a state also shows it.

#### Scenario: a client-side bound is never presented as completeness

- GIVEN a graph projection whose node count exceeds what the canvas chooses to
  draw
- WHEN the canvas renders it
- THEN the count of nodes drawn is reported alongside the count received
- AND the completeness pill reflects only the SERVER's `truncated` field and
  quotes the bound the server reached
- AND no client-applied slice is described as complete

#### Scenario: an edge without both endpoints is counted, not dropped

- GIVEN an edge whose `fromNodeId` or `toNodeId` is absent from the projection
- WHEN the canvas renders the graph
- THEN the edge is counted as undrawn and the count is stated
- AND the absence is attributed to the projection, not to the run

#### Scenario: filtering does not shrink the reported population

- GIVEN a canvas with a search term or an evidence filter applied
- WHEN the footer reports the population
- THEN the number of nodes drawn is unchanged by the filter
- AND the number matching the filter is reported separately

#### Scenario: a safety check set is listed, never merely counted

- GIVEN a safety snapshot carrying one or more checks
- WHEN the Safety Center renders
- THEN every check is listed by name with its state and its reason code
- AND an `UNKNOWN` check is visible as unknown

#### Scenario: an empty check set is absence of evidence

- GIVEN a safety snapshot whose `checks` array is empty
- WHEN the Safety Center renders
- THEN the view states that an empty check set is an absence of evidence
- AND no pass or healthy claim is made from the emptiness

#### Scenario: deferred and never-measured are distinct facts

- GIVEN a readiness snapshot with both `deferredDimensions` and
  `notMeasuredDimensions` populated
- WHEN the readiness detail renders
- THEN the two lists are rendered separately and labelled distinctly
- AND neither is presented as the other

#### Scenario: a bounded page that was cut says so

- GIVEN a timeline page whose `truncated` is true
- WHEN the timeline renders
- THEN the view states that the timeline is truncated
- AND names the sequence the run continues after, when the server reported one
- AND the events not listed are attributed to the page, not to the run

#### Scenario: a run without provenance is not a run without a claim

- GIVEN a run detail snapshot whose `repositories` array is empty
- WHEN the run detail renders
- THEN the view states that the run anchors to no revision
- AND the provenance section is present rather than omitted

#### Scenario: every contract field reaches the render, or is exempt with a reason

- GIVEN the snapshot contracts the UI declares
- WHEN contract coverage is checked
- THEN every declared field appears in the component file
- OR it appears in the exempt set together with the reason it is not rendered
- AND an exempt entry naming a field the contracts no longer declare fails the
  check

#### Scenario: every rendered class has a stylesheet rule

- GIVEN the class names the component file renders
- WHEN stylesheet coverage is checked
- THEN each class is selected somewhere in the stylesheet
- AND each concrete value an interpolated class family can produce is asserted
  by name
- AND a class rendered with no rule fails the check

#### Scenario: the rule applies in the built bundle, not only in the source

- GIVEN the built UI served by the Control Center server
- WHEN the graph toolbar is inspected in a real browser
- THEN its computed background is not the transparent default
