## ADDED Requirements

### Requirement: Every executable test file SHALL declare one execution class

The repository SHALL declare, in a versioned data config, exactly one
execution class for every discovered executable test file:
`PARALLEL_SAFE`, `PROCESS_ISOLATED_ONLY`, `SERIAL_REQUIRED`, or
`MUTATION_CAMPAIGN_EXCLUSIVE`. The declaration SHALL carry the mechanical
evidence for the class. An unclassified or unknown file SHALL fail closed to
`SERIAL_REQUIRED`, and a file may not be declared in two classes.

#### Scenario: An unclassified file cannot execute in parallel

- **GIVEN** a discovered test file with no execution-class entry
- **WHEN** a parallel shard would include it
- **THEN** the file is assigned the serial class instead
- **AND** the run reports the missing classification

#### Scenario: A git-mutating file cannot be declared parallel-safe

- **GIVEN** a test file that mutates repository or worktree Git state
- **WHEN** execution classes are validated
- **THEN** declaring it `PARALLEL_SAFE` is rejected by the negative probe
- **AND** the validation names the file and the disqualifying evidence

### Requirement: Parallel execution SHALL prove coverage equality

Any sharded or parallel execution of a test universe SHALL mechanically prove
that the union of shard members equals the full universe and that no file
appears in more than one shard, and SHALL emit that proof in its receipt. A
shard that contains a `MUTATION_CAMPAIGN_EXCLUSIVE` file SHALL run alone with
respect to that checkout.

#### Scenario: A partition that omits a file fails closed

- **GIVEN** a shard plan whose union is missing a discovered file
- **WHEN** the runner validates the plan
- **THEN** the run refuses to start
- **AND** the missing file is named

#### Scenario: A duplicated membership fails closed

- **GIVEN** a shard plan where one file appears in two shards
- **WHEN** the runner validates the plan
- **THEN** the run refuses to start
- **AND** the duplicate is named

#### Scenario: A mutation campaign never overlaps another shard

- **GIVEN** a shard classified `MUTATION_CAMPAIGN_EXCLUSIVE`
- **WHEN** the runner schedules concurrent work
- **THEN** no other shard executes against the same checkout at the same time

### Requirement: Concurrency SHALL be bounded and evidence-based

The number of concurrent workers SHALL be a validated integer bounded by a
declared maximum, overridable through a single documented environment
variable, and the default SHALL be chosen from measured 1/2/4/host-core
benchmarks rather than assumed. Each concurrent invocation SHALL have its own
output directory and a coordinated proxy port lease.

#### Scenario: An out-of-range worker request fails closed

- **GIVEN** a worker-count override outside the declared bound or not an
  integer
- **WHEN** the runner starts
- **THEN** the run fails closed with the invalid value named
- **AND** no partial execution occurs

#### Scenario: Concurrent shards do not share an output directory

- **GIVEN** two shards running concurrently
- **WHEN** each writes its Playwright output
- **THEN** each writes under its own lane output directory
- **AND** neither clears or overwrites the other's evidence

### Requirement: The synthetic campaign SHALL preserve semantic coverage under any parallel contract

The synthetic campaign SHALL NOT reduce its case count. A parallel execution
contract SHALL run each shard serially with zero retries over a deterministic
partition of the declared manifest, and SHALL be gated by a normalized
result-set equivalence proof against the serial execution of the same
manifest. The serial contract SHALL remain available as the fallback until
the equivalence proof passes.

#### Scenario: Case count is preserved

- **GIVEN** the synthetic manifest before and after a performance change
- **WHEN** the campaign runs
- **THEN** the executed case count and pass count are unchanged
- **AND** a reduced count is a failure, not an optimization

#### Scenario: A nondeterministic result set blocks the parallel contract

- **GIVEN** a sharded run whose normalized result set differs from the serial
  result set
- **WHEN** the equivalence proof is evaluated
- **THEN** the parallel contract is rejected
- **AND** the campaign remains on the serial contract

### Requirement: Hardening probes SHALL remain complete

The hardening probe campaign SHALL preserve every registered rule and probe
and its detection result, and its harness may be optimized only in ways that
keep each probe's mutation and restoration isolated and serial per checkout.

#### Scenario: A probe is never removed for speed

- **GIVEN** the probe registry before and after a harness change
- **WHEN** the campaign runs
- **THEN** the rule count, probe count, detected count, and restore discipline
  are unchanged
- **AND** a removed or undetected probe fails the campaign

#### Scenario: Mutation probes never run concurrently on one checkout

- **GIVEN** two probes that edit guarded source
- **WHEN** the harness schedules them
- **THEN** they execute serially against a single checkout
- **AND** any parallel probe execution uses isolated checkouts proven not to
  share mutable state
