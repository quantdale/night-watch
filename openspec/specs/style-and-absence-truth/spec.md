# style-and-absence-truth Specification

## Purpose
TBD - created by archiving change nightwatch-control-center-style-and-absence-truth-v1. Update Purpose after archive.
## Requirements
### Requirement: Control Center style and absence truth

The Control Center SHALL assert every concrete class value each interpolation
family it renders can produce, or state explicitly that the value deliberately
rides the base class; SHALL prove at runtime that every class the built
composition renders changes a computed style on an element that carries it,
or declare it base-only with a reason; SHALL prove that emptying any
collection field changes the rendered DOM or state why it cannot; and SHALL
NOT carry a class whose rule cannot match it or a rule whose class is never
produced.

#### Scenario: a produced family value is asserted or declared base-only

- GIVEN a family produced by interpolation (`status-`, `stage-`)
- WHEN the stylesheet guard runs
- THEN every value the family can produce has a rule, or is declared in the
  suite as intentionally base-only with a reason
- AND a new value with no rule fails the guard

#### Scenario: an inert class fails the runtime check

- GIVEN a class the built composition renders
- WHEN its rule is deleted from the stylesheet and the bundle rebuilt
- THEN the runtime check reports it as ineffective
- AND the lane fails unless it is declared base-only with a reason

#### Scenario: the base-only list is honest in both directions

- GIVEN a declared base-only class
- WHEN the class gains a rule that changes a computed property
- THEN the lane fails and the declaration must be removed
- AND a class that becomes ineffective without a declaration also fails

#### Scenario: an empty collection is not a short one

- GIVEN a contract array field
- WHEN its fixture is emptied and the owning view re-renders
- THEN the DOM differs from the populated rendering
- OR the field appears in the reasoned absence exemption list

#### Scenario: the absence pass is not vacuous

- GIVEN the generator's recorded arrays
- WHEN the pass runs
- THEN the number of recorded arrays is measured
- AND an empty recording fails before any render

#### Scenario: the map carries no impossible tone

- GIVEN the system map's node and edge rendering
- WHEN the composition renders
- THEN no node or edge carries a tone class the stylesheet cannot match
- AND no tone rule for an impossible value remains in the stylesheet

