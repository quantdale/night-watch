## ADDED Requirements

### Requirement: Relay invocation requires opaque exact authority

The system SHALL require a non-constructible, non-serializable invocation capability bound to the exact relay instance, approved caller/channel, operation, source/catalog/environment/auth generations, expiry, and budget. Operation path/header equality SHALL remain shape validation and SHALL NOT grant authority.

#### Scenario: Local process knows the port and operation ID
- **WHEN** a process sends an otherwise valid request without the exact live capability
- **THEN** the relay rejects it before credential acquisition, target resolution, DNS, or upstream fetch

#### Scenario: Proof is used for another operation or instance
- **WHEN** a proof is replayed against a different operation or restarted relay
- **THEN** admission fails categorically with zero upstream effect

### Requirement: Budget consumption is atomic and pre-effect

The relay SHALL atomically validate and reserve one invocation before any secret-bearing or upstream effect. It SHALL enforce explicit per-operation, per-scenario, total, concurrent, redirect, and settlement bounds across all caller paths. Ambiguous attempts SHALL not refund or duplicate authority.

#### Scenario: Concurrent duplicate requests race one proof
- **WHEN** two requests concurrently present the same one-use proof
- **THEN** at most one reserves authority and the other is rejected before effects

#### Scenario: Budget is exhausted
- **WHEN** a caller exceeds any bound
- **THEN** the next request fails before `authHeaders` and upstream connection count remains unchanged

### Requirement: Invocation evidence is append-only and cardinality-preserving

The relay SHALL retain one bounded ordered record per admitted/refused invocation identity and SHALL NOT overwrite prior observations by operation ID. Every reservation SHALL reach one terminal or explicit incomplete state.

#### Scenario: Same operation executes twice under two authorized proofs
- **WHEN** two budgeted invocations target one operation
- **THEN** the ledger contains two distinct ordered records and readers cannot mistake them for one

#### Scenario: Terminal recording fails
- **WHEN** an effect occurred but terminal evidence cannot be completed
- **THEN** the invocation remains explicitly incomplete and the relay stops granting clean authority

### Requirement: Close and drift revoke authority

Close SHALL stop admission, revoke unused proofs, bound and settle/cancel in-flight work, seal evidence, and close the listener. Source/catalog/environment/auth/instance/containment drift SHALL revoke matching capabilities before further effects.

#### Scenario: Request arrives during close
- **WHEN** shutdown has begun
- **THEN** the request cannot reserve authority or start credential/upstream work

#### Scenario: Auth generation changes
- **WHEN** the bound storage/auth capability is replaced or expires
- **THEN** unused relay proofs are revoked and cannot acquire the new credential generation

### Requirement: Capability material and diagnostics remain private

Invocation secrets SHALL travel only through the approved in-memory or permissioned control channel and SHALL never enter scenarios, environment, command arguments, stdout/stderr, artifacts, URLs, headers retained as evidence, or error messages. Results SHALL be bounded categorical metadata.

#### Scenario: Child output is captured
- **WHEN** the restricted child exits or fails
- **THEN** captured output and workspace artifacts contain no reusable invocation proof

### Requirement: Adversarial tests prove caller and budget boundaries

Tests SHALL cover unrelated local processes, guessed/forged/replayed/cross-operation/cross-instance/expired proofs, concurrent duplicates, every bound, auth/source drift, close races, ledger capacity/failure, and mutations removing capability or consumption checks, using synthetic loopback fetchers only.

#### Scenario: Operation header is made sufficient
- **WHEN** a mutation bypasses capability validation while preserving operation-ID checks
- **THEN** the ungranted-local-caller test fails
