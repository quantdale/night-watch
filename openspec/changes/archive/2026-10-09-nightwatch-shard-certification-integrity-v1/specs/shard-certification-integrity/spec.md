## ADDED Requirements

### Requirement: Shard execution accounting is machine-readable and strict

The system SHALL produce one bounded, schema-versioned execution receipt per
shard from Playwright test outcomes. The receipt SHALL record explicit
`executed`, `passed`, `failed`, `skipped`, and `didNotRun` counts and SHALL be
read through a strict parser before result classification.

#### Scenario: All tests are skipped
- **WHEN** a shard executes one or more tests but every outcome is skipped
- **THEN** the result is non-pass with an all-skipped categorical code

#### Scenario: No tests execute
- **WHEN** a shard has zero executed tests
- **THEN** the result is non-pass with a no-tests-executed code

#### Scenario: Counts are absent
- **WHEN** a receipt is missing, malformed, oversized, or contains unknown
  counts
- **THEN** the shard fails closed and never coerces unknown values to zero

### Requirement: PASS requires known executed work

A shard SHALL be classified PASS only when its receipt is known, executed is
greater than zero, failed and did-not-run are zero, and all outcome counts are
internally consistent. A nonzero skipped count SHALL remain allowed when at
least one test executed.

#### Scenario: Mixed pass and skip
- **WHEN** at least one test passes and others are skipped with known counts
- **THEN** the shard remains PASS and reports the exact mixed totals

### Requirement: Receipt publication is bounded and atomic

The reporter SHALL write the receipt through an owned temporary path and atomic
replacement, enforce byte/count bounds, and fail visibly when the receipt
cannot be published. Human text output SHALL NOT override receipt authority.

#### Scenario: Reporter publication fails
- **WHEN** the receipt cannot be written or parsed
- **THEN** the runner returns a non-pass result and preserves the failure code

### Requirement: Validation protects the execution authority

Tests SHALL cover all-skipped, zero-test, unknown, malformed, normal mixed, and
mutation cases, while preserving existing coverage, disjointness, exclusivity,
and zero-retry behavior.

#### Scenario: Executed guard is removed
- **WHEN** a mutation removes the executed-test requirement
- **THEN** focused validation detects the regression
