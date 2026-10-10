## ADDED Requirements

### Requirement: Every L6 proof field has complete witnessed evidence
The system SHALL derive each L6 proof field from a closed, versioned probe manifest containing an executed stimulus, a working positive control, a bounded contained outcome, and an applicable parent/external observer outcome. Missing, duplicate, skipped, suppressed, timed-out, malformed, contradictory, or unrecognized evidence SHALL produce NOT_PROVEN and block READY.

#### Scenario: UDP result is omitted from the decision
- **WHEN** the UDP stimulus completes successfully but its result is absent from the denial predicate or receipt
- **THEN** direct UDP denial is NOT_PROVEN and authenticated execution is refused

#### Scenario: Observer receives no traffic without a stimulus
- **WHEN** a direct-listener counter is zero but the target endpoint was never supplied to the probe
- **THEN** the corresponding proof is classified as vacuous and cannot contribute to READY

### Requirement: Browser qualification exercises every claimed traffic class
The system SHALL deterministically exercise the browser DNS, TCP, HTTP(S), upgrade, UDP/QUIC, background/speculative, and descendant classes it claims to contain, and SHALL distinguish namespace denial from relay-mediated success. Resolver or feature flags SHALL NOT suppress the very stimulus used as proof.

#### Scenario: Resolver rule suppresses speculative DNS
- **WHEN** browser arguments map the probe hostname to NOTFOUND before the browser can attempt the qualified path
- **THEN** browser speculative-DNS denial remains NOT_PROVEN

#### Scenario: Relay traffic succeeds
- **WHEN** the intended synthetic browser request traverses the bounded namespace relay
- **THEN** the receipt identifies that exact flow separately from direct-network denial evidence

### Requirement: Qualification is bound to the authorized execution
The system SHALL bind a successful qualification to exact safe identities for the Bubblewrap, Node, Chrome when applicable, bootstrap/control implementation, launch policy, target identity class, and relevant host capability. Authenticated launch SHALL consume and revalidate the same generation before creating target workspaces or exposing secret-bearing state.

#### Scenario: Bubblewrap changes after qualification
- **WHEN** the executable path, inode, digest, owner, mode, or resolved identity differs at launch
- **THEN** the handle is revoked and launch fails before target execution

#### Scenario: Qualification handle is stale or reused
- **WHEN** a handle exceeds its bounded freshness, has already been consumed, or names a different launch policy
- **THEN** the launch is refused and a fresh qualification is required

### Requirement: READY authority cannot be fabricated
Production code SHALL create an L6 READY capability only as the terminal result of complete qualification. Synthetic factories SHALL be test-only and mechanically excluded from the production dependency graph; structural constants alone SHALL NOT satisfy authorization.

#### Scenario: Caller constructs all PROVEN fields
- **WHEN** a caller supplies a plain object containing the expected version and PROVEN constants
- **THEN** production assertion/launch rejects it because it lacks a valid qualification generation and runtime binding

### Requirement: Qualification receipts preserve privacy and boundedness
Receipts and failures SHALL contain only categorical probe outcomes, bounded safe executable/policy digests, generation IDs, durations, and blocker codes. They SHALL NOT contain environment values, credentials, raw request/response bodies, customer data, home paths, or unbounded child output.

#### Scenario: Probe emits secret-like output
- **WHEN** a synthetic child or browser diagnostic contains configured sentinels
- **THEN** the durable/public receipt contains only bounded categorical metadata

### Requirement: L6 qualification enforcement is non-vacuous
Authoritative tests SHALL execute positive controls and contained probes for every manifest entry and register mutations for omitted predicates, unused listeners, suppressed stimuli, constant READY creation, runtime substitution, stale/reused handles, timeout ambiguity, and receipt leakage.

#### Scenario: A proof predicate is deleted
- **WHEN** mutation removes any required probe result from READY derivation
- **THEN** the qualification suite and mutation gate fail

#### Scenario: Listener is no longer targeted
- **WHEN** mutation disconnects a probe endpoint from its stimulus while leaving the zero-hit assertion
- **THEN** positive-control/non-vacuity validation fails before READY can be reported
