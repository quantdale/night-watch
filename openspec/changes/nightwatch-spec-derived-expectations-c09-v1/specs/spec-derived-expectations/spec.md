# Spec — spec-derived expectations

## ADDED Requirements

### Requirement: every scenario is classified

#### Scenario: the corpus is enumerated
- **WHEN** the scenario corpus is classified
- **THEN** every discovered scenario SHALL receive exactly one classification, and a count assertion SHALL prove none was omitted

#### Scenario: a scenario specifies the tool rather than the product
- **WHEN** a scenario makes no claim about a product operation
- **THEN** it SHALL be classified `OUTSIDE_SCOPE`, and SHALL NOT be classified `NO_OPERATION_BINDING`, because not being a product claim is different from being an unbound one

### Requirement: expectations are derived, never interpreted

#### Scenario: prose is offered as an assertion
- **WHEN** an expectation would derive from a `summary`, `description` or any natural-language field
- **THEN** validation SHALL fail

#### Scenario: an assertion class has no material
- **WHEN** the artifacts contain no `required` arrays
- **THEN** no required-key expectation SHALL be claimed, and the absence SHALL be reported with its cause

### Requirement: the operation join is exact

#### Scenario: a response carries no schema reference
- **WHEN** an operation's responses contain no resolvable `$ref`
- **THEN** it SHALL yield no expectation rather than a guessed one

#### Scenario: a reference does not resolve
- **WHEN** a response `$ref` names a definition that is absent
- **THEN** the outcome SHALL be `AMBIGUOUS` and SHALL NOT be silently skipped

#### Scenario: an expectation is matched by similarity
- **WHEN** an expectation is bound to an operation by name or path similarity rather than by the document's own attachment
- **THEN** validation SHALL fail

### Requirement: provenance and currentness

#### Scenario: an expectation lacks provenance
- **WHEN** an expectation is missing any of repository, source SHA, artifact path, definition name, property path, operation id, extractor version or digest
- **THEN** it SHALL NOT be admitted

#### Scenario: the artifact changes
- **WHEN** the digest or source SHA no longer matches
- **THEN** the expectation SHALL become `STALE` and SHALL NOT be rebound to the new revision

### Requirement: a specification witness alone grants nothing

#### Scenario: W-SPEC is the only witness held
- **WHEN** an operation has admitted expectations and no effect witness
- **THEN** `W-SPEC` MAY be `HELD`, the proof state SHALL NOT be `READ_ONLY_PROVEN`, and production admission SHALL NOT be granted

#### Scenario: W-SPEC has no expectations
- **WHEN** an operation has no admitted expectation
- **THEN** `W-SPEC` SHALL remain `UNSUPPORTED`, which is an absence and never a pass
