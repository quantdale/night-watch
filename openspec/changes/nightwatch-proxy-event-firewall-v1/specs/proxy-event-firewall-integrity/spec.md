## ADDED Requirements

### Requirement: Raw proxy events are exact and bounded

The raw event writer SHALL validate an exact closed ProxyEvent key set, required
fields, enums, numeric bounds, timestamps, and control-character-free bounded
strings before any append byte is written.

#### Scenario: Unknown private field is supplied
- **WHEN** a JavaScript caller adds an unknown or private field to a proxy event
- **THEN** append refuses with a categorical schema error and writes no line

### Requirement: Raw event persistence is owner-safe

The runtime event log SHALL be initialized/appended with owner-only permissions
and a durability acknowledgement, while preserving the existing summary-read
contract for accepted events.

#### Scenario: Event log is created
- **WHEN** the proxy initializes its event log
- **THEN** the file is owner-readable/writable only and accepted lines remain
  parseable by the existing reader

### Requirement: The raw writer is census-covered

The authenticated writer census SHALL discover and claim the configured raw
proxy event writer under a distinct closed class, and fail closed on registry
drift or missing discovery.

#### Scenario: Writer registration is removed
- **WHEN** the proxy writer is removed from the registry or discovery
- **THEN** the census reports a violation rather than a clean result

### Requirement: Adversarial validation protects the boundary

Tests SHALL cover valid, unknown, private, malformed, control-character, and
mutation cases while preserving existing proxy summary compatibility.

#### Scenario: Validator is weakened
- **WHEN** a mutation removes exact-key or bounds checking
- **THEN** focused validation fails
