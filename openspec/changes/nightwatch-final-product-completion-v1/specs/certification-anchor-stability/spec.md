## ADDED Requirements

### Requirement: Evidence bindings are checkpoint-neutral
Release-condition and validation-lane evidence bindings SHALL live in a
closed-schema bindings file. A commit that changes only binding values in that
file SHALL be classified as documentary. A commit that changes any other field
or key in that file SHALL be classified as substantive.

#### Scenario: Re-binding evidence after a gate run
- **WHEN** a commit updates only `evidenceSha`/`receiptDigest`/`observedAt`
  values for existing subjects
- **THEN** the last substantive implementation checkpoint does not move and
  the bound evidence can be EXACT

#### Scenario: Smuggled non-binding edit
- **WHEN** a commit adds an unknown key or changes a subject identity in the
  bindings file
- **THEN** the commit is substantive and a hardening probe detects the attempt

### Requirement: Bound evidence must exist at its SHA
`project:check` SHALL verify that each bound evidence artifact exists at its
declared `evidenceSha`, and that every condition cites a lane whose binding
agrees with its own.

#### Scenario: Evidence SHA predates its artifact
- **WHEN** a condition binds `evidenceSha` X but its evidence file does not
  exist at X
- **THEN** project:check reports the condition as not MET with
  `EVIDENCE_ARTIFACT_ABSENT_AT_SHA`

### Requirement: Task lifecycle status is not a source literal
The expected live task status SHALL be derived from `.agent/ACTIVE_TASK.md` at
check time. Opening or closing a task SHALL NOT require a source-code edit.

#### Scenario: Task opens
- **WHEN** ACTIVE_TASK changes from COMPLETE to IN_PROGRESS
- **THEN** hardening and project checks pass without any `src/` change

### Requirement: Every release check has a wired probe
Every release advance check SHALL be marked implemented only when a probe
resolves it from executed evidence. A hardening rule SHALL fail if a check
remains `implemented:false` while its probe exists, or is marked
`implemented:true` without one. The accessibility check SHALL be able to reach
MET only from a machine-readable result record executed at the certified
checkpoint.

#### Scenario: Schema lifecycle passes
- **WHEN** `schema-lifecycle check` passes at the certified checkpoint
- **THEN** release check G17 resolves MET from that execution

#### Scenario: Accessibility not executed at S
- **WHEN** the accessibility result record was produced at an ancestor of S
- **THEN** the accessibility condition is not MET

### Requirement: Certification demotes instead of breaking after later commits
After an advance is claimed at checkpoint S, project:check SHALL classify
HEAD as EXACT, DESCENDANT_DOCUMENTARY or DESCENDANT_SUBSTANTIVE. For the
two descendant classes it SHALL report the status as certified at S, raise
ATTENTION for a substantive descendant, and SHALL NOT claim the advance at
HEAD. A passed revisit date SHALL produce ATTENTION with an owner action, not
a silent pass.

#### Scenario: Substantive commit after certification
- **WHEN** a substantive commit lands after certification at S
- **THEN** project:check passes with `CERTIFIED_AT_ANCESTOR` ATTENTION and
  does not present HEAD as certified

### Requirement: Exact-head CI truth is observed, not asserted
CI status records SHALL be derived from observed GitHub Actions runs. The
billing-block record SHALL be retired to history once executed runs exist.
Condition 2 SHALL be MET only by an observed `EXECUTED_PASS` at exactly the
final substantive checkpoint.

#### Scenario: Executed failing run
- **WHEN** the latest run at HEAD executed every step and failed
- **THEN** the CI record reads `EXECUTED_TEST_FAILURE` with the run ID and a
  sanitized assertion class, never `NOT_OBSERVED` or a billing block

### Requirement: Gates are deterministic and sibling-hermetic
`gate:clean` SHALL run with sibling repositories absent by default, and SHALL
record a measured sibling identity before and after instead of a constant.
`gate:topology` SHALL be part of the certification set. The UI lane SHALL be a
gate group in the local, CI and clean modes. Tests SHALL own their temporary
parents, and the synthetic campaign lane SHALL isolate TMPDIR.

#### Scenario: Test depends on the owner sibling root
- **WHEN** a test reads the sibling root in a checkout where it is absent
- **THEN** the test is a declared skip with a reason, and gate:topology
  reports the dependency

#### Scenario: Concurrent tmp writer
- **WHEN** another process writes into the shared system temp directory
  during the synthetic campaign
- **THEN** no test outcome changes

### Requirement: Skips are declared and vacuous passes are forbidden
The full regression SHALL evaluate every skipped test identity against a
declared allowlist with reasons, and an undeclared skip SHALL fail the run. A
test SHALL NOT pass by asserting only that its live precondition is absent.

#### Scenario: Live source stale
- **WHEN** a live-source test finds its sibling source STALE or UNAVAILABLE
- **THEN** it is reported as a declared skip with reason
  `LIVE_SOURCE_<kind>`, not as a pass

### Requirement: Session-declared pushes are CI-evaluable without weakening handoff truth
In `ci` and `clean` modes, a declared session worktree that is absent from
the checkout SHALL be classified `SESSION_DECLARED_ABSENT_EXPECTED` only when
the declared branch equals the task STATE branch and every other handoff
invariant holds. Any other mismatch SHALL fail.

#### Scenario: Mismatched declared branch
- **WHEN** ACTIVE_TASK declares a session branch different from STATE's
  branch
- **THEN** HANDOFF_TRUTH fails in every mode

### Requirement: CI supply chain and runtime identity are pinned
Workflow actions SHALL be pinned by full commit SHA and checked by an anchored
rule that sees every workflow file and step form. Gate receipts SHALL record
the exact node and npm versions that executed them.

#### Scenario: Compact uses step with a tag ref
- **WHEN** a workflow adds `- uses: actions/checkout@v4`
- **THEN** hardening fails
