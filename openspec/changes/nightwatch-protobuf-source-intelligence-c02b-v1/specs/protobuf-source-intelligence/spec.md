# Spec — protobuf source intelligence

## ADDED Requirements

### Requirement: bounded protobuf lexing
The system SHALL tokenize `.proto` source with explicit ceilings on tokens and
nesting depth, and SHALL discard comments and string bodies before any
declaration rule observes the stream.

#### Scenario: an RPC inside a line comment
- **WHEN** a `.proto` file contains `// rpc Ghost(A) returns (B);`
- **THEN** zero RPC facts are emitted for `Ghost`.

#### Scenario: an RPC inside a block comment
- **WHEN** a `.proto` file contains a block comment enclosing an `rpc`
  declaration and unbalanced braces
- **THEN** zero RPC facts are emitted and the enclosing service parse is
  unaffected.

#### Scenario: a comment token inside a string
- **WHEN** a string literal contains `//` or `/*`
- **THEN** the literal is lexed as one string token and no comment begins.

#### Scenario: token budget exhaustion
- **WHEN** the token ceiling is reached
- **THEN** parsing stops, the result reports `PROTO_TOKEN_BUDGET_EXHAUSTED`,
  and completeness is not `COMPLETE`.

### Requirement: mechanically proven RPC facts
The system SHALL emit an RPC fact only when the RPC name, request message and
response message are each proven from the declaration, and SHALL record client
and server streaming independently.

#### Scenario: streaming classification
- **WHEN** a declaration is `rpc R(stream Q) returns (stream S);`
- **THEN** both `clientStreaming` and `serverStreaming` are true.

#### Scenario: malformed declaration
- **WHEN** a declaration cannot be read to a closing parenthesis
- **THEN** no RPC fact is emitted and a categorical reason is recorded.

### Requirement: fail-closed HTTP binding extraction
The system SHALL extract a `google.api.http` binding only when method and path
are both proven, SHALL represent multiple bindings as an ordered ambiguous set
rather than choosing one, and SHALL never default an unknown method.

#### Scenario: additional bindings
- **WHEN** an RPC carries a primary binding and `additional_bindings`
- **THEN** all bindings are recorded in order and the binding state is
  `AMBIGUOUS`.

#### Scenario: malformed option block
- **WHEN** the option block cannot be read
- **THEN** the binding state is `MALFORMED` and the RPC fact itself remains
  proven.

### Requirement: no repository or root expansion
The system SHALL inspect only roots already present in the owner-approved root
map, and SHALL record protobuf source outside that map as
`BLOCKED_BY_C05_REPOSITORY_ADMISSION`.

#### Scenario: an unadmitted root
- **WHEN** protobuf source exists in a `blueapi` root that is not approved
- **THEN** no fact is derived from it.

### Requirement: identity-based generation corroboration
The system SHALL corroborate the generated OpenAPI artifact against the proto
surface per operation identity, and SHALL NOT report generation currency as
`CURRENT` on operation-count agreement alone.

#### Scenario: counts agree, a path differs
- **WHEN** both surfaces expose the same number of operations but one route
  template differs
- **THEN** the outcome is `PATH_MISMATCH` and currency is not `CURRENT`.

### Requirement: completeness and no eviction
The system SHALL propagate a completeness state for protobuf discovery, and the
set of operation identities discovered before this change SHALL remain a subset
of the set discovered after it.

#### Scenario: blueapi operations added
- **WHEN** protobuf operations enter discovery
- **THEN** every previously discovered operation identity is still discovered.
