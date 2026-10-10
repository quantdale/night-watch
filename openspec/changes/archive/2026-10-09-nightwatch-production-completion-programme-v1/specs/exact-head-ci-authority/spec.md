# Spec — Exact-head CI authority

Closes the CI half of F-02. Measured at `36bd493`: `project:check` reports
`CI_OBSERVED_SHA: NONE`, `CI_EXECUTED_SHA: NONE`, `CI_STATUS: NOT_OBSERVED`.
`docs/ROADMAP.md` records `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` /
`stepCount=0` across Phase 12A, 13I, 14A, 15H, 16H, 16CH, 17, 23, 24, 27 and
28 — eleven consecutive terminal campaigns with no executed CI. One run
(`33572572053` at `c3fed38`) has ever executed `gate:ci`, and it failed two real
host-topology cases.

## ADDED Requirements

### Requirement: CI state SHALL be observed at the exact candidate SHA, never projected

The distinction the project already draws SHALL be preserved and made
unavoidable: a workflow file that parses is not an executed run; a run that
starts is not a run that executed steps; and an executed run at a different SHA
is not evidence about this one. `src/core/qualityGate/externalCi.ts` already
classifies zero-step runs; that classification SHALL be the only route by which
any CI claim enters project state.

`CI_EXECUTED_SHA` SHALL be non-`NONE` only when a run at exactly that SHA
executed at least one step. `CI_OBSERVED_SHA` SHALL be non-`NONE` only when a
run at exactly that SHA was inspected, whatever its outcome. A run at an
ancestor or descendant SHA SHALL NOT satisfy either field.

`project:check` SHALL continue to refuse a release certification that projects
executed CI from zero-step evidence, and SHALL additionally refuse a
certification whose `CI_OBSERVED_SHA` does not match the checkpoint it
certifies.

#### Scenario: a zero-step run never becomes executed CI
- **WHEN** a run at the candidate SHA reports `stepCount=0`
- **THEN** `CI_EXECUTED_SHA` stays `NONE` and `CI_STATUS` records the block
  class
- **AND** `project:check` fails any document that claims executed CI

#### Scenario: a run at a different SHA is not evidence
- **WHEN** the only available run is at an ancestor SHA
- **THEN** both CI fields stay `NONE` for the candidate
- **AND** the mismatch is reported with both SHAs

### Requirement: The external block SHALL carry an owner action and a revisit condition

A recorded block is honest and, by itself, permanent. Today the block is
recorded eleven times with no statement of what would clear it. The block
record SHALL carry: the observed run identity and job identity, the block
class, the date observed, the named owner action that would clear it (a billing
or spending-limit change on the GitHub account, or adoption of an alternative
runner), and the condition under which it SHALL be re-observed.

`agent:check` SHALL report a block record whose revisit date has passed as
`CI_BLOCK_RECORD_STALE`, so a block cannot silently become a permanent excuse.

#### Scenario: a block without an owner action is rejected
- **WHEN** a CI block record omits the owner action or the revisit condition
- **THEN** `project:check` fails with `CI_BLOCK_RECORD_INCOMPLETE`

#### Scenario: an expired block record is surfaced
- **WHEN** the revisit date on the current block record has passed
- **THEN** `agent:check` reports `CI_BLOCK_RECORD_STALE` with the record's date
- **AND** the report names the owner action

### Requirement: An alternative executable route SHALL be specified so the block is not the only path

Because the block is external and organizational, the repository SHALL specify
at least one route to executed exact-head CI that does not depend on clearing
it, and SHALL state that route's trade-offs rather than adopting one silently.

The candidate routes, each to be evaluated and one selected by the owner: a
self-hosted runner under the existing safety boundary; a scheduled local
execution of `gate:ci` from a disposable Node 20 checkout, recorded with the
same receipt discipline but explicitly classified as `LOCAL_NOT_CI` and never
as CI; or the `gate:topology` lane of `validation-lane-closure` standing in for
the runner-topology class specifically, with its own explicit statement that it
does not prove GitHub execution.

Whichever route is chosen, it SHALL NOT be permitted to set `CI_EXECUTED_SHA`.
Only a GitHub Actions run may do that. A substitute that could set the CI field
would reintroduce exactly the projection this requirement forbids.

#### Scenario: a local substitute is classified as a substitute
- **WHEN** the selected route is local execution of `gate:ci`
- **THEN** its receipt is classified `LOCAL_NOT_CI`
- **AND** `CI_EXECUTED_SHA` remains `NONE`

#### Scenario: the runner-topology class is covered without claiming CI
- **WHEN** `gate:topology` passes
- **THEN** the runner-topology class is recorded PROVEN
- **AND** the record states explicitly that GitHub execution is not proven

### Requirement: When CI does execute, the two known host-topology defect classes SHALL be regression-covered

Run `33572572053` failed on an absolute sibling source root and on an absent
Bubblewrap binary. Both were host-topology defects in test code against
already-correct production paths (D-109). Those two classes SHALL have
permanent regressions in the offline suite so they cannot recur while CI is
blocked and undetectable.

The regressions SHALL assert the categorical property — a test may not depend
on an absolute path outside the checkout, and a test may not require a binary
without declaring the capability — rather than asserting against the two
specific paths, which would leave a third sibling unguarded.

#### Scenario: a test depending on an absolute external path is rejected
- **WHEN** a test resolves a path outside the checkout without declaring a host
  capability
- **THEN** `hardening:check` fails naming the test and the path

#### Scenario: a test requiring an undeclared binary is rejected
- **WHEN** a test invokes a binary with no corresponding capability probe
- **THEN** `hardening:check` fails naming the test and the binary
