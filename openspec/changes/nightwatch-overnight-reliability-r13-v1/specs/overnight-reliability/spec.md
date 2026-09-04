# Spec — overnight reliability

## ADDED Requirements

### Requirement: determinism across fresh processes

#### Scenario: repeated deterministic projections
- **WHEN** any compact deterministic projection (source snapshot digest,
  operation ordering, completeness, C-02b/C-03/C-04 facts, C-05 universe,
  C-08 bindings, C-09 expectations, EIG ranking, map graph/layout digests,
  gate receipt canonicalization) is produced in 10+ independent Node
  processes
- **THEN** every identity SHALL match exactly, excluding documented timing
  fields

#### Scenario: repeated full source scans
- **WHEN** the complete source-intelligence scan runs 3–5 times from fresh
  processes against unchanged source
- **THEN** repositories, files, operations, completeness, truncation, digests
  and identities SHALL match; drift SHALL be filed as a DEFECT

### Requirement: order and infrastructure robustness

#### Scenario: permuted suite orders
- **WHEN** the campaign suites run in at least three different orders
- **THEN** results SHALL be identical; hidden shared state SHALL be filed as
  a DEFECT

#### Scenario: lifecycle stress
- **WHEN** port lease, child-process lifecycle, temp dirs, clean receipt,
  atomic receipt write, worktree lifecycle and port ownership are exercised
  25–100 times deterministically
- **THEN** every iteration SHALL pass without retry logic

#### Scenario: port collision
- **WHEN** preferred ports are deliberately occupied (single, consecutive,
  stale/live/malformed/symlink leases, concurrent allocators, exhaustion)
- **THEN** allocation SHALL remain correct and never assume identity from
  `process.pid`

### Requirement: scale and property invariance

#### Scenario: map scale permutations
- **WHEN** maximum-permission projections are built from multiple input-order
  permutations across all levels and query paths
- **THEN** graph and layout digests SHALL be order-invariant

#### Scenario: seeded properties
- **WHEN** bounded seeded generation (recorded seeds, fixed counts) checks
  bounds, drops, fact-lattice joins, UNKNOWN/UNMEASURED preservation,
  admission, expectation, deployment and EIG authority boundaries, and
  canonical map identity
- **THEN** every property SHALL hold on every seed

### Requirement: topology and regression stability

#### Scenario: second clean topology
- **WHEN** validation runs from a fresh clone/worktree in a different parent
  directory
- **THEN** it SHALL pass identically; workspace-coincidence dependence SHALL
  be filed as a DEFECT

#### Scenario: repeated full regression
- **WHEN** the canonical regression runs three complete independent times
- **THEN** each SHALL be recorded as a separate observation; a pass/pass/fail
  SHALL be investigated, never averaged away

### Requirement: UI endurance and evidence durability

#### Scenario: navigation loops
- **WHEN** 20+ complete L1→L2→L3→L4→query→back loops run against
  synthetic/local data
- **THEN** there SHALL be no listener accumulation, fatal console errors,
  runaway DOM growth, broken selections, stale results, or layout corruption

#### Scenario: injected failure
- **WHEN** a synthetic known failure is deliberately triggered
- **THEN** the authoritative receipt SHALL still carry failed group,
  categorical location, didNotRun, environment, digest and containment state,
  and the tree SHALL be restored afterwards

### Requirement: guard bite and clean closure

#### Scenario: adversarial mutations
- **WHEN** each load-bearing rule (manifest registration, admission,
  no-read-unapproved, deployment classification, W-SPEC boundary, EIG
  independence, fact-category, ProjectionBound, layout identity, GET/HEAD
  boundary, prod-store exclusion) is temporarily mutated
- **THEN** the corresponding check SHALL fail, and the mutation SHALL leave
  no trace

#### Scenario: long clean gate
- **WHEN** all stress and mutation work is restored and the tree is clean
- **THEN** `gate:clean` SHALL run with zero writes during execution; any
  change SHALL void the observation
