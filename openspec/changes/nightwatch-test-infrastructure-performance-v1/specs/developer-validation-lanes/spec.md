## ADDED Requirements

### Requirement: Exactly three validation tiers SHALL exist and be documented

Nightwatch SHALL provide a fast development lane and a milestone lane, while
the existing authoritative lanes remain the certification tier. The fast and
milestone lanes SHALL print an explicit NOT-certification label in their own
output and developer documentation SHALL state exactly which lane applies to
normal coding, integration checkpoints, and release/campaign closeout. A fast
or milestone lane result SHALL NOT satisfy a certification requirement.

#### Scenario: A fast lane cannot masquerade as certification

- **GIVEN** a green `gate:dev` run
- **WHEN** a certification decision is evaluated
- **THEN** the fast lane result is not accepted as certification
- **AND** the decision requires the authoritative lane evidence

#### Scenario: The lane choice is not left to guessing

- **GIVEN** a developer changing source
- **WHEN** the developer reads the repository developer documentation
- **THEN** the documentation names the command for normal coding, for a
  substantial integration checkpoint, and for release/campaign closeout
- **AND** each tier's authority is explicit

### Requirement: Affected-test selection SHALL fail closed

The affected-test selection surface SHALL compare changed tracked paths
against an explicit base SHA, SHALL assert a non-zero changed-file set, and
SHALL output the exact test files to execute. It SHALL include declared
always-run safety classes, SHALL broaden rather than narrow when a changed
path is unmapped or reachable only through a runtime loader, SHALL trigger
broader suites for safety, governance, shared-core, and test-infrastructure
changes, and SHALL select the full universe when impact cannot be determined.

#### Scenario: An empty change set is not a pass

- **GIVEN** a base SHA with no tracked difference
- **WHEN** affected selection runs
- **THEN** it fails closed with the empty change set named
- **AND** it does not report a green selection of zero tests

#### Scenario: An unmapped path broadens the selection

- **GIVEN** a changed file that the impact graph cannot map
- **WHEN** affected selection runs
- **THEN** the selected set broadens to the full applicable universe
- **AND** it never narrows to zero or to a guess

#### Scenario: A shared-core change fans out

- **GIVEN** a changed module that many tests import
- **WHEN** affected selection runs
- **THEN** the dependent tests are included in the selection
- **AND** a hidden dependency probe demonstrates that omission is detected

#### Scenario: Test-infrastructure changes select the infrastructure suites

- **GIVEN** a changed test-infrastructure file
- **WHEN** affected selection runs
- **THEN** the full test-infrastructure suite selection is included
- **AND** a bounded hand-picked subset is not accepted as equivalent

### Requirement: Fast and milestone lanes SHALL be measured

The fast and milestone lanes SHALL have measured durations recorded with host
context. If a lane exceeds its target, the campaign SHALL record the measured
cause and either reduce it further or report the limit truthfully rather than
restating the target as met.

#### Scenario: A target is never claimed without a measurement

- **GIVEN** a fast or milestone lane
- **WHEN** the campaign reports the lane
- **THEN** the report contains a measured duration for that lane
- **AND** a duration above target is reported as a measured limit

### Requirement: Coverage equivalence SHALL be proven across the optimized lanes

For every optimized authoritative lane the campaign SHALL prove the same
required test universe, gate groups, hardening rules and probes, synthetic
scenarios, and validation-universe classification as before the change, with
counts recorded on both sides. Where concurrency changes output ordering, the
comparison SHALL be against normalized semantic results rather than byte
identity.

#### Scenario: A shrunken count is a regression

- **GIVEN** before/after test counts for an authoritative lane
- **WHEN** the after count is lower without a declared, approved reason
- **THEN** the campaign reports a coverage regression
- **AND** the change is not accepted as a performance improvement

#### Scenario: Structural guards make future regressions visible

- **GIVEN** a future change that duplicates a suite execution, adds a process
  launch in a defined hot path, drops a shard member, or breaks a cache key
- **WHEN** the structural guards run
- **THEN** the regression is detected without a wall-clock assertion

### Requirement: Parallel lanes SHALL be flakiness-checked and hygiene-checked

Changed parallel shards and the fast and milestone lanes SHALL be executed
repeatedly in consecutive runs, and the campaign SHALL check for port, temp
file, environment, ordering, and workspace-mutation races and for leaked
owned processes, browsers, servers, port leases, temporary fixtures, and
worktrees. Cleanup SHALL be scoped to processes and state created by the
execution under test.

#### Scenario: A race is fixed, not hidden

- **GIVEN** an intermittent failure in repeated parallel runs
- **WHEN** the campaign resolves it
- **THEN** the cause is fixed or the suite is classified serial with evidence
- **AND** reducing workers to hide the race is not accepted

#### Scenario: Hygiene cleanup never touches foreign processes

- **GIVEN** leaked state after a lane run
- **WHEN** cleanup runs
- **THEN** only state created by that execution and identified by ownership is
  removed
- **AND** arbitrary user or other-session processes are never killed
