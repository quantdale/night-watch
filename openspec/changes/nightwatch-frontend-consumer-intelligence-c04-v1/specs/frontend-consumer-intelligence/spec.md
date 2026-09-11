# Spec — frontend consumer intelligence

## ADDED Requirements

### Requirement: no fact from a non-literal path
The system SHALL classify every resolved path expression, and SHALL NOT emit a
`SOURCE_FACT` edge for any class other than `LITERAL` or `STRUCTURAL`.

#### Scenario: a path built by concatenation
- **WHEN** a call site passes `base + foo.bar`
- **THEN** the edge is `UNKNOWN` and is not a `SOURCE_FACT`.

#### Scenario: an interpolation inside a segment
- **WHEN** a template is `/v1/acc${suffix}`
- **THEN** the class is `PARTIAL_SEGMENT` and the edge is at most `INFERENCE`.

#### Scenario: a whole-segment interpolation
- **WHEN** a template is `/v1/accounts/${accountId}`
- **THEN** the route normalises to `/v1/accounts/{}` and may be a
  `SOURCE_FACT`.

### Requirement: only declared clients are HTTP clients
The system SHALL treat an identifier as an HTTP client only when it is bound by
`axios.create`.

#### Scenario: a cookie accessor is not a GET
- **WHEN** `Cookies.get('token')` appears
- **THEN** no consumer edge is emitted.

### Requirement: comments and strings never produce an edge
The system SHALL never produce an edge from a comment or a string.
#### Scenario: a call inside a comment
- **WHEN** a call site appears in a `//` or `/* */` comment
- **THEN** no edge is emitted.

### Requirement: no customer value in durable evidence
The system SHALL strip query and hash before persisting a route.

#### Scenario: a query carrying a runtime value
- **WHEN** a path is `admin/v1/aws/xacct/dca?type=${type}`
- **THEN** the persisted route is `admin/v1/aws/xacct/dca` and the query value
  is not persisted.

### Requirement: method is never defaulted
The system SHALL never default the method.
#### Scenario: an unreadable verb
- **WHEN** the call verb cannot be read
- **THEN** the method is absent, not `GET`.

### Requirement: the join never upgrades evidence
The system SHALL never upgrade evidence during a join.
#### Scenario: a structural path joined to a generated-artifact route
- **WHEN** a consumer edge joins a backend fact of a weaker class
- **THEN** the joined edge carries the weaker class.

### Requirement: no repository admission
The system SHALL admit no repository.
#### Scenario: the universe is unchanged
- **WHEN** the approved repository set is inspected
- **THEN** it holds the same six repositories.
