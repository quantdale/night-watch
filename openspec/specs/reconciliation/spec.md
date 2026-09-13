# reconciliation Specification

## Purpose

The dependency and documentation record SHALL be internally consistent: superseded decisions state their superseding fact, and the removal of an unused dependency is reflected wherever the project records it.

## Requirements
### Requirement: The D-87 consequences sentence must read truthfully

The paragraph MUST retain its historical decision content and MUST
state the superseding fact: the root Vue 2 dependency was removed as
unused (zero references) and `npm audit` reports zero vulnerabilities.
No other sentence in the document changes.

#### Scenario: the D-87 consequences sentence is reconciled

- **WHEN** the D-87 consequences sentence is updated
- **THEN** the paragraph SHALL retain its historical decision content and SHALL state the superseding fact that the root Vue 2 dependency was removed as unused (zero references) and `npm audit` reports zero vulnerabilities, with no other sentence in the document changing

