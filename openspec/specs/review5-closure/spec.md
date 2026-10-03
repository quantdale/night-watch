# review5-closure Specification

## Purpose
The review-5 closure guarantees: archive moves and range classification cannot smuggle a file past the
checkpoint guard, receipts verify only for what their producer actually executed on a clean tree, every
guard named by the independent review-5 is proven by a behavioural fixture and a registered mutant
(one committed mutation harness at zero survivors), the CLI and CI records say what is true, and release
certification is reachable honestly: every condition and lane has a producer, committed tamper-evident
evidence that a clean clone verifies, and a topology, yield and UI verdict that cannot be forged by an
edited body.
## Requirements
### Requirement: Archive moves are approved only for approved planning shapes

A move under `openspec/changes/archive/<dated>/` SHALL be approved as documentary only when the destination is an approved planning shape (`proposal.md`, `design.md`, `audit.md`, `tasks.md`, `.openspec.yaml`, `specs/<capability>/spec.md`) whose source path was itself approved and existed at the range base. A range SHALL be classified commit by commit and never through the aggregate diff.

#### Scenario: A test file smuggled through an archive move is substantive

- **WHEN** a commit adds `openspec/changes/x/tests/evil.test.ts` and a later commit moves it under the archive
- **THEN** the range from the base classifies SUBSTANTIVE

#### Scenario: A non-identical single-commit move is substantive

- **WHEN** a single commit moves an approved planning file and changes its bytes
- **THEN** the commit classifies SUBSTANTIVE and the dropped `before !== after` mutant is DETECTED

### Requirement: Deletions cannot hide behind renames

Every `git diff`, `diff-tree` and `log --name-*` listing that feeds classification or the declared-deletion gate SHALL pass `--no-renames`, and a totality rule SHALL scan every such invocation.

#### Scenario: A renamed tracked source is an undeclared deletion

- **WHEN** a session `git mv`s a tracked source file without declaring it
- **THEN** `WORKSPACE_UNDECLARED_TRACKED_DELETION` fails the gate

#### Scenario: A listing without --no-renames fails the totality rule

- **WHEN** a name-status invocation omits `--no-renames`
- **THEN** hardening:check reports the call site

### Requirement: Receipts verify only when their producer proved them

Every certifying receipt kind SHALL record tree cleanliness at emit and SHALL require a clean emit; a receipt from a dirty tree SHALL be non-certifying. Every receipt kind SHALL declare a closed subject set derived from what its producer executed, and a receipt naming a subject its producer did not execute SHALL never verify.

#### Scenario: A gate receipt from a dirty tree does not verify

- **WHEN** `gate:local` runs on a dirty tree and emits a receipt
- **THEN** the receipt records `treeClean: false` and verification refuses it

#### Scenario: A foreign subject never verifies

- **WHEN** a gate-schema receipt declares `autonomous-yield-proof` as a subject
- **THEN** verification refuses it because the gate producer never executed that subject

### Requirement: Collector and classifier guards are covered behaviourally

Each collector and classifier guard named in R5-05 SHALL be covered by a behavioural fixture, every R5-05 mutant SHALL be registered as a probe and DETECTED by behaviour rather than by a text anchor, and a committed mutation harness SHALL apply each registered mutant to a scratch copy and fail on any survivor, running in `gate:milestone`.

#### Scenario: An equivalent mutant is detected by behaviour

- **WHEN** a mutant assigns `rangeClass = 'DOCUMENTARY_DESCENDANT'`
- **THEN** a behavioural fixture fails and the probe reports DETECTED

#### Scenario: A surviving mutant fails the harness

- **WHEN** a registered mutant passes `hardening:check` and the focused tests
- **THEN** the mutation harness exits non-zero naming the survivor

### Requirement: The DEV launcher's effects are found by AST analysis

The DEV-launcher effect analysis SHALL parse the launcher's top level up to the guard and up to the short-circuit and SHALL detect aliases and destructuring, function expressions, IIFEs, `.call`/`.apply`/`Reflect.apply`, any `child_process` or `fs` binding, `globalThis.fetch` and network use, dynamic import, and any effect before `guardDevLane`.

#### Scenario: An aliased effect before the guard is found

- **WHEN** the launcher binds `const run = spawnSync` and calls `run()` before the guard
- **THEN** the rule reports it

#### Scenario: All twelve R5-06 mutants are detected

- **WHEN** each of the twelve equivalent mutants is applied in turn
- **THEN** every one is DETECTED

### Requirement: Operator CLIs keep their contracts

`nightwatch-agent` SHALL exit 2 for an unknown command; `phase22-dev explain <id>` SHALL work through a declared positional; help SHALL NOT advertise unconsumed or misleading flags; `phase23-dev` SHALL declare an authorization class reflecting DEV execution; and the shared-parser rule SHALL be behavioural, enumerate bins from `git ls-files`, and carry probes across at least three bins.

#### Scenario: An unknown command is refused

- **WHEN** `nightwatch-agent bogus` is run
- **THEN** it exits 2

#### Scenario: The shared-parser rule sweeps bins behaviourally

- **WHEN** a bin performs an effect under `--help`
- **THEN** the rule reports it

### Requirement: The CI record states what CI did

`config/ci-block-record.v1.json` SHALL map every SHA to its true run, record every red and repair run in run order, refresh its top level to the newest observed run on every push, compare run order rather than dates for staleness, and derive status from the newest observation per SHA.

#### Scenario: A later failure supersedes an earlier pass

- **WHEN** a SHA has a passing observation followed by a failing one
- **THEN** the derived status is not EXECUTED_PASS

#### Scenario: A mis-attributed run is rejected

- **WHEN** an entry pairs a run id with a SHA that is not its head
- **THEN** the record check fails

### Requirement: Small truths are true

The `captureFailureCounts` end-to-end test SHALL assert a non-zero `BODY_READ_ACQUISITION_BOUND` in the recorded summary; the stale CURRENT_STATE live-CI prose SHALL be corrected; archived changes SHALL not remain in the task-ID ledger; the absent-Prettier branch SHALL emit a declared skip identity; and remaining session identifiers SHALL be redacted by appended correction with the public-history limit recorded.

#### Scenario: A hard-coded empty failure-count map fails the test

- **WHEN** the recorded summary carries `{}` for the counts
- **THEN** the end-to-end test fails

#### Scenario: Absent Prettier is a declared skip

- **WHEN** the formatter-policy test runs without Prettier
- **THEN** it reports a declared skip identity, not a silent pass

### Requirement: Process breaches are mechanically visible

An append-only canonical claim journal SHALL cover every canonical commit from the claim era onward; `npm run prepush` SHALL run `hardening:check`, `agent:check`, `project:check`, `typecheck`, `typecheck:bin` and the affected focused suites and every integrate step SHALL reference it; earlier records SHALL be corrected by appended annotation; and parent continuity prose SHALL be synchronised and checked in every form and count.

#### Scenario: An uncovered canonical commit fails agent:check

- **WHEN** a canonical commit has no claim journal entry
- **THEN** agent:check fails

#### Scenario: Stale continuity prose is caught in any form

- **WHEN** ACTIVE_TASK names a next ID that disagrees with STATE
- **THEN** the prose checker reports it

### Requirement: The Certification Producer Matrix is designed before it is coded

The change's `design.md` SHALL carry a complete Producer Matrix, one row per condition (16) and per lane (11), naming producer, gate group, receipt kind and schema, closed subjects, verdict fields, persistence, clean-clone verification and the binding route; the persistence mechanism SHALL be recorded in D-152; and the change SHALL strict-validate before any Track B code. A row that cannot be completed honestly SHALL stop the campaign for an owner decision.

#### Scenario: An incomplete matrix blocks Track B

- **WHEN** any of the 27 rows is EMPTY
- **THEN** Track B code does not start

#### Scenario: An impossible row stops the campaign

- **WHEN** a row cannot be completed honestly
- **THEN** STATE records the blocker and the exact next action, and the owner is asked

### Requirement: Every condition and lane has a real producer

Every condition and lane SHALL have a producer, or a declared mapping from an executed gate group, emitting a receipt with closed subjects, verdict, SHA, tree-clean and a `receipt:`-prefixed digest; end-to-end tests SHALL use real producer output; and the UI receipt SHALL verify with its digest prefix and verdict field.

#### Scenario: The UI receipt verifies from producer output

- **WHEN** `ui-error-taxonomy-rendering` is produced by the real UI harness
- **THEN** the verifier accepts it

#### Scenario: A hand-shaped receipt is not evidence

- **WHEN** a test fabricates a receipt shape
- **THEN** it is not used as proof of a producer

### Requirement: Certification verifies identically from a clean clone

The D-152 persistence mechanism SHALL let CI and `gate:clean` verify the same receipts the host does; receipt filenames SHALL be content-addressed or immutable so a re-run never invalidates a bound digest; and a test SHALL run `project:check` in a fresh clone with the committed evidence and obtain the host's verdict.

#### Scenario: A clean clone reaches the host verdict

- **WHEN** committed evidence is cloned fresh
- **THEN** `project:check` gives the same per-condition verdicts as the host

#### Scenario: A re-run does not overwrite

- **WHEN** a producer runs twice at one head
- **THEN** both receipts exist and the earlier bound digest still verifies

### Requirement: The yield proof is verifiable and unspoofable

The paid-run campaign SHALL emit a yield receipt the verifier accepts (closed subject `autonomous-yield-proof`, verdict, SHA, provider identity bound to the declared provider CLI digest and model, a completed campaign and recorded provider calls) tied to the parent's 12.3 authorization record; a fake or unrecorded print CLI SHALL NOT satisfy it.

#### Scenario: A fake print CLI cannot satisfy the proof

- **WHEN** a receipt names a print CLI whose digest does not match the declared provider CLI
- **THEN** verification refuses it

#### Scenario: An unauthorized run cannot satisfy the proof

- **WHEN** a receipt has no tie to the 12.3 authorization record
- **THEN** verification refuses it

### Requirement: The topology verdict verifies the receipt, not a boolean

The topology verdict SHALL verify the receipt schema, its `topology-receipt:` digest, class/certifying consistency and gitHead; a forged or inconsistent receipt SHALL never certify.

#### Scenario: A bare certifying flag does not certify

- **WHEN** a claim of `{certifying: true}` with the right head and no schema or digest
- **THEN** the verdict is not MET

#### Scenario: A degraded class never certifies

- **WHEN** a receipt declares `PROVEN_DEGRADED` with `certifying: true`
- **THEN** the verdict is not MET

### Requirement: Reachability is proven end to end

A fixture-repository proof SHALL produce every receipt at S through the real producers, commit the evidence in a documentary descendant, run `project:check` from a clean clone and observe 16/16 MET; any condition that cannot reach MET SHALL be listed with its reason and SHALL trigger the exit rule.

#### Scenario: The fixture reaches 16/16

- **WHEN** every producer runs at S in a fixture repository and the evidence is committed in a documentary descendant
- **THEN** a clean clone reports 16/16 MET

#### Scenario: An unreachable condition triggers the exit rule

- **WHEN** a condition stays unmet
- **THEN** it is listed with its reason and the campaign stops

### Requirement: The child closes only on proven validation

The child SHALL close only after the focused suites, `gate:dev`, `gate:milestone` (with the mutation harness at zero survivors) and `hardening:rules` pass, the full authoritative set exits 0, the integrated tip's exact-head CI is observed green and recorded, the session is released and removed with `--delete-branch`, `gate:clean` runs from canonical with no live session, the REPORT carries a per-ID disposition table for R5-01..R5-18, and the change is archived with spec sync and ACTIVE_TASK routed to the parent at M9 10.4.

#### Scenario: Close-out requires an observed green exact-head CI

- **WHEN** the close-out commit is pushed
- **THEN** the child stays open until CI at that exact head is observed green

#### Scenario: The archive move classifies correctly

- **WHEN** the change is archived
- **THEN** the archive range is classified DOCUMENTARY under the A1 rule

