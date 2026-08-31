## ADDED Requirements

### Requirement: Replay comparisons have explicit categorical outcomes

The replay subsystem SHALL classify every non-identical observation as one
and only one bounded outcome, including deterministic replay mismatch,
expected product-state drift, timing-only observation difference,
environment divergence, authentication divergence, benign telemetry
variation, framework capture defect, or unknown divergence.

#### Scenario: Unexplained difference remains non-success
- **WHEN** two otherwise comparable observations differ and no approved classifier applies
- **THEN** the result is `UNKNOWN_DIVERGENCE` and the replay does not pass

#### Scenario: Auth difference is not a product finding
- **WHEN** the replay context loses or invalidates authentication
- **THEN** the result is `AUTH_DIVERGENCE` with sanitized metadata and no product-failure classification

### Requirement: Replay identity uses explicit semantic canonicalization

The replay identity SHALL canonicalize only fields with a declared bounded
policy, preserve meaningful order and multiplicity by default, and include
all meaningful action, route, method, status, oracle, semantic-contract, and
source/currentness identity fields.

#### Scenario: Equivalent object-key permutations match
- **WHEN** two ledgers differ only in object-key insertion order
- **THEN** their canonical identity and replay fingerprint are equal

#### Scenario: Meaningful behavior change does not match
- **WHEN** a route, method, action, status, oracle result, or semantic-contract identity changes
- **THEN** the canonical identity differs and the comparison cannot be timing-only

#### Scenario: Unsupported canonical input fails closed
- **WHEN** a ledger contains a cycle, unsupported value, oversized value, or unknown canonicalization policy
- **THEN** canonicalization returns a bounded failure and no replay PASS is produced

### Requirement: Replay observations are privacy-safe and bounded

The replay ledger and diagnostics SHALL contain only bounded categorical
metadata, counts, and opaque digests; raw response/DOM/customer values,
credentials, cookies, headers, and source text SHALL never cross the replay
boundary or appear in an error.

#### Scenario: Timing diagnostics do not leak payloads
- **WHEN** a timing-only difference is recorded
- **THEN** the output contains bounded timing/category metadata and no raw observation value

#### Scenario: Repeated ledger entries remain bounded
- **WHEN** a run produces duplicate reads or background polling
- **THEN** the ledger applies its configured cap and reports multiplicity/category without unbounded growth

### Requirement: Replay classifiers are deterministic and regression-tested

Given the same sanitized inputs and classifier version, the replay subsystem
SHALL produce byte-stable identity, classification, and diagnostics across
processes and runs.

#### Scenario: Repeated classification is byte-identical
- **WHEN** the same fixture pair is classified at least three times
- **THEN** all serialized results, fingerprints, and reason codes are identical

#### Scenario: Benign telemetry is separated from semantic drift
- **WHEN** only an allowlisted telemetry event changes between observations
- **THEN** the result is `BENIGN_TELEMETRY_VARIATION` and semantic identity remains equal
