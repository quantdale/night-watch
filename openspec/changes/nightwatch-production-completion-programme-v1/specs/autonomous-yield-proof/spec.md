# Spec — Autonomous yield proof

Closes F-03. Measured from `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/STATE.md`
and re-stated in two independent campaign closures: strict `EXACT_REDISCOVERY`
is 0 and previously-unknown-defect yield is 0 across W7–W10. W9's final live
campaign produced 7 investigations, 28 grounded hypotheses, 7 reproduction
attempts, 7 `NOT_AVAILABLE`, 1 candidate, 0 admissions. W10 raised reproduction
attempts reaching real contained execution from 0/7 to 6/6 and eliminated
`NOT_AVAILABLE` waste, with zero qualifying current-source failures and zero
admissions. The programme is parked: `Work In Progress: None. No wave is
active.`

## ADDED Requirements

### Requirement: Strict EXACT_REDISCOVERY SHALL be attempted against the historical corpus and its result reported honestly

The historical benchmark harness (`src/core/benchmark/**`,
`.agent/tasks/nightwatch-historical-benchmark-v1`) exists and has never yielded
a strict exact rediscovery. A wave SHALL be opened whose sole objective is that
measurement.

`EXACT_REDISCOVERY` SHALL mean what the existing machinery already defines and
SHALL NOT be loosened to produce a number: the reproduction fingerprint equals
the historical defect's fingerprint exactly. A near match SHALL be reported as
a near match with its distance, never promoted.

The wave SHALL report, per historical case: whether the defect's source state
was reachable, whether a reproduction was attempted, whether it executed, the
disposition (`EXACT`, `NEAR`, `NOT_REPRODUCED`, `NOT_AVAILABLE`,
`ENVIRONMENT_BLOCKED`), and for every non-EXACT case the specific reason. An
aggregate count without per-case reasons is not an acceptable result.

A final result of zero strict rediscoveries SHALL be an acceptable and
publishable outcome provided the per-case reasons are recorded. What SHALL NOT
be acceptable is a zero with no diagnosis, which is the current state.

#### Scenario: a near match is not promoted
- **WHEN** a reproduction fingerprint differs from the historical fingerprint
- **THEN** the case is recorded `NEAR` with the measured distance
- **AND** `EXACT_REDISCOVERY` does not increment

#### Scenario: zero with reasons is a result; zero without reasons is not
- **WHEN** the wave completes with zero EXACT cases
- **THEN** every case carries a specific non-EXACT reason
- **AND** a case with no recorded reason fails the wave's own acceptance

#### Scenario: an environment block is never a negative finding
- **WHEN** a case cannot run because a toolchain or provider is unavailable
- **THEN** it is recorded `ENVIRONMENT_BLOCKED` with the missing capability
- **AND** it is excluded from both the numerator and the denominator of any
  yield rate

### Requirement: A bounded previously-unknown-defect campaign SHALL run against an approved current-source target

W10 proved the reproduction path reaches real contained execution and found
zero qualifying current-source failures on `opencode-go/omen-alpha`. That is a
result about one repository over four HOUR_1 campaigns, not about the
framework's capability.

A campaign SHALL run across a materially wider slice of the eight admitted
repositories, with the scope, budget and repository set fixed in advance and
recorded before execution so the result cannot be selected after the fact. The
existing host-owned `--repository` scope, which fails closed on an unapproved
id and on a widened resume, SHALL govern it.

Every candidate SHALL pass the existing mechanical admission rather than a
human judgement, and the campaign SHALL report: investigations, calls, actions,
unique source targets, grounded hypotheses, reproduction attempts, executions,
candidates, admissions, false positives, and leakage events. Prohibited safety
counts SHALL remain zero, and a non-zero leakage count SHALL abort the campaign
rather than be reported alongside a yield.

The campaign SHALL state its own limit: a defect this campaign did not find is
not a defect that does not exist, and an admitted finding is a Nightwatch
admission, not an Alphaus-confirmed bug. Final verdict authority remains
`HUMAN_ORGANIZATIONAL`.

#### Scenario: scope is fixed before execution
- **WHEN** the campaign starts
- **THEN** its repository set, budget and stopping condition are already
  recorded at a committed SHA
- **AND** a resume that widens the scope fails closed

#### Scenario: a leakage event aborts rather than accompanies a yield
- **WHEN** any hidden-truth leakage is detected during the campaign
- **THEN** the campaign aborts and reports the event
- **AND** no yield figure is published from that run

#### Scenario: admission is mechanical
- **WHEN** a candidate is proposed
- **THEN** it is admitted only by the existing mechanical admission path
- **AND** an admission with no reproduction is refused with
  `MISSING_REPRODUCTION`

### Requirement: The yield campaign's external prerequisite SHALL be named and confirmed before the wave opens

The residual-closure campaign recorded that this work is "gated on confirmed
provider capability, not on repository work". That prerequisite SHALL be stated
concretely — which provider, which capability, which toolchain versions, which
approved repositories, and what confirms it — and SHALL be confirmed before the
wave opens, so the wave cannot end in another `ENVIRONMENT_BLOCKED` aggregate.

`src/core/ownerLocalReproduction/provider.ts` already classifies
`TOOLCHAIN_UNAVAILABLE` and `TOOLCHAIN_VERSION_UNSATISFIED`. A pre-flight SHALL
run those probes across the intended repository set and refuse to open the wave
if the reachable fraction is below a threshold recorded in advance.

#### Scenario: the wave refuses to open under an unconfirmed provider
- **WHEN** the pre-flight finds the reachable fraction below the recorded
  threshold
- **THEN** the wave does not open and the missing capabilities are listed
- **AND** no partial campaign is run and reported

#### Scenario: the prerequisite is concrete, not "provider capability"
- **WHEN** the prerequisite is recorded
- **THEN** it names the provider, capability, toolchain versions, repository
  set and confirming probe
- **AND** an unnamed prerequisite fails the wave's own opening check

### Requirement: A zero result SHALL change the project's claims about itself

If both waves complete and yield remains zero, the project SHALL say so in its
own current-truth surfaces rather than continuing to describe itself only by
its gate receipts. `README.md` and `docs/CURRENT_STATE.md` SHALL carry the
measured yield alongside the measured validation, so a reader learns what the
framework has found, not only that it passes its own checks.

Conversely, a non-zero yield SHALL NOT by itself advance
`PROJECT_COMPLETION_STATUS`; that advance is governed by
`release-definition-and-verdict`.

#### Scenario: the yield figure is visible where the receipts are
- **WHEN** a reader opens `README.md` or the current-state live block
- **THEN** admitted findings, strict rediscoveries and false positives appear
  with their measurement date
- **AND** a stale figure is caught by the census-figure ledger

#### Scenario: a non-zero yield does not self-certify the project
- **WHEN** the campaign admits its first finding
- **THEN** `PROJECT_COMPLETION_STATUS` is unchanged by that fact alone
