# Spec — universe discovery and admission hygiene

## ADDED Requirements

### Requirement: discovery is admission-free

Discovery SHALL enumerate repository identity metadata under the sibling root
without reading source content, and SHALL classify each repository as
`ADMITTED` or `DISCOVERED_NOT_ADMITTED`.

#### Scenario: discovery finds many repositories
- **WHEN** discovery runs over a sibling root containing many repositories
- **THEN** it SHALL report every one it can see, and SHALL admit none of them by that fact alone

#### Scenario: a discovered repository has an OpenAPI document
- **WHEN** an unapproved repository contains an OpenAPI or Swagger document
- **THEN** it SHALL remain `DISCOVERED_NOT_ADMITTED`

#### Scenario: a discovered repository is adjacent to an admitted one
- **WHEN** an unapproved repository shares an organization directory with an admitted repository
- **THEN** it SHALL remain `DISCOVERED_NOT_ADMITTED`

### Requirement: one admission authority

The owner-approved universe SHALL be stated in exactly one canonical place, and
every consumer SHALL derive its admitted set from it.

#### Scenario: a scanner carries its own allowlist
- **WHEN** a scanner or analyzer defines a repository allowlist of its own
- **THEN** validation SHALL fail

#### Scenario: the authority and a derived literal disagree
- **WHEN** a repository is named in one of the two contributing records and absent from the other
- **THEN** validation SHALL report a contradiction rather than silently not admitting it

### Requirement: mutable Git state is not persisted as normative configuration

Persisted normative source configuration SHALL NOT carry current checkout or
remote-tracking state. Live values SHALL be queried when needed. A historical
snapshot SHA bound to a derivation MAY persist, labelled historical.

#### Scenario: a mutable field is reintroduced
- **WHEN** a current checkout SHA, tracking SHA, ahead count, behind count or dirty flag is added to the normative record
- **THEN** validation SHALL fail

### Requirement: an unapproved repository's source is never read

The guarantee SHALL be measured at the read call, as
`analyzerSourceReads[repository] === 0` for every unapproved repository, and
SHALL NOT be inferred from an empty output.

#### Scenario: an analyzer attempts to read an unapproved repository
- **WHEN** a source read is attempted for a repository outside the owner-approved universe
- **THEN** the read SHALL be refused, the refusal SHALL be counted, and no file content SHALL be returned

#### Scenario: an unapproved repository yields no operations
- **WHEN** an unapproved repository produces zero operations
- **THEN** that alone SHALL NOT be accepted as evidence that it was unread

### Requirement: admission of the two owner-named repositories

`alphauslabs/blueinternal` and `mobingilabs/wave-api` SHALL be admitted with
justified roots, through existing parsers, and no third previously unapproved
repository SHALL be admitted.

#### Scenario: a generated artifact is admitted
- **WHEN** `blueinternal/openapiv2` is parsed
- **THEN** its operations SHALL be `SOURCE_FACT` with a `GENERATED_ARTIFACT` qualifier and an explicit currentness state, and generated evidence alone SHALL NOT grant production admission

#### Scenario: a route key does not resolve to a handler
- **WHEN** an admitted repository's route key cannot be bound to a handler
- **THEN** it SHALL be reported unproven rather than admitted by a loosened parser

#### Scenario: a third repository is admitted
- **WHEN** any repository other than the two owner-named ones is added to the admitted set
- **THEN** validation SHALL fail

### Requirement: no eviction

#### Scenario: the population grows
- **WHEN** new repositories are admitted and the operation population grows
- **THEN** every pre-C-05 operation identity SHALL still be present unless its underlying source actually changed

### Requirement: completeness stays truthful

#### Scenario: enumeration is truncated
- **WHEN** the enumeration walk is truncated and the total is unknown
- **THEN** completeness SHALL remain `TRUNCATED` with `remainingUnknown: true`, and admitting more source SHALL NOT convert it into a clean number
