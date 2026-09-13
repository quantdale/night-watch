## MODIFIED Requirements

### Requirement: Residual closure and lane qualification

Nightwatch SHALL resolve every declared validation lane to exactly one of
`PROVEN`, `BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY`, SHALL bind a
`PROVEN` lane to a receipt produced by an owning session, and SHALL bound the
growth of local evidence without ever weakening immutable evidence identity.

A lane-state row of `UNAVAILABLE_CAPABILITY` SHALL NOT cover files that the
default Playwright runner (`playwright.config.ts` `testMatch`, `npm test`)
executes. Those files are executed lanes; carrying them as unavailable is a
classification defect, not an honest host gap.

#### Scenario: a lane that executes is not carried as unavailable

- GIVEN a host that provides the capability a lane requires
- WHEN the lane is executed inside an owned session worktree
- THEN the lane resolves to `PROVEN` with a receipt naming that session
- AND no lane state records it as UNAVAILABLE thereafter

#### Scenario: default-runner files are not recorded as never-executed

- GIVEN a validation-universe class listing `tests/smoke/*.smoke.ts` or `scenarios/**/*.smoke.ts`
- AND those globs are in the default Playwright `testMatch`
- WHEN lane-state is emitted
- THEN that class is not `UNAVAILABLE_CAPABILITY`
- AND evidence SHALL NOT claim those files have never executed

#### Scenario: a run from the canonical checkout is not a receipt

- GIVEN a lane executed from the canonical checkout
- WHEN a receipt is requested for it
- THEN the result is evidence without an owning session identity
- AND it does not satisfy the lane's `PROVEN` requirement

#### Scenario: an externally blocked lane is distinguishable from an uninspected one

- GIVEN a required CI run whose job never started
- WHEN the external observer classifies it
- THEN the recorded state names the run identity, the observed reason and the
  block class
- AND the CI status remains non-passing
- AND execution is never projected from a local workflow parse

#### Scenario: a capability that is genuinely absent names its acquisition condition

- GIVEN a lane requiring network egress, DEV authentication or an owner
  harness that the campaign's authority does not include
- THEN the lane resolves to `UNAVAILABLE_CAPABILITY`
- AND the recorded state names the impact, the reason, the owner decision and
  the revisit condition

#### Scenario: retention refuses what it cannot prove unreferenced

- GIVEN an artifact directory referenced by tracked task state, a REPORT
  receipt or project state
- WHEN retention is evaluated
- THEN the artifact is in the refusal set and is never removed
- AND an artifact whose reference status cannot be proven is also refused

#### Scenario: retention reports rather than removes by default

- GIVEN a retention invocation without an explicit owner removal flag
- THEN nothing is removed
- AND the refusal and candidate counts are reported
- AND reclaiming nothing is reported as a valid outcome, not as a failure

#### Scenario: retention never replaces an artifact in place

- GIVEN any retention outcome
- THEN no artifact file is rewritten, truncated or replaced
- AND removal operates on whole unreferenced run directories only
- AND the review and evidence stores' no-replace identity patterns still hold

#### Scenario: a stale worktree claiming a complete task is released, not adopted

- GIVEN a stale session worktree whose claimed task is terminal COMPLETE
- WHEN the residue is cleared
- THEN the worktree is released through the session CLI from the canonical
  checkout
- AND a worktree whose holder is live is left unchanged and reported

#### Scenario: a shipped capability is documented where an operator will find it

- GIVEN a launcher flag that enables an otherwise absent write route
- THEN the entry-point documentation names the flag, what it enables and
  where the resulting owner-local state is stored
- AND a supported check is invocable from a documented script rather than
  only from a test

#### Scenario: a planning-only handoff prompt satisfies project truth

- GIVEN a handoff prompt whose `Status` is `READY_FOR_EXECUTION`, naming a
  successor `Campaign ID` and the terminal predecessor in
  `Predecessor Task ID` and `Predecessor Status`
- WHEN project-state truth cross-checks it against the active task
- THEN the predecessor binding is asserted rather than the campaign binding
- AND a prompt whose predecessor fields match the active task and status
  passes
- AND `handoff:check` and `project:check` agree on the same prompt

#### Scenario: a planning prompt naming the wrong predecessor still fails

- GIVEN a `READY_FOR_EXECUTION` prompt whose `Predecessor Task ID` or
  `Predecessor Status` does not match the active task
- THEN project-state truth fails with the existing prompt task-id or status
  mismatch code
- AND the planning state grants no exemption from the binding itself

#### Scenario: an active handoff prompt keeps its original binding

- GIVEN a prompt whose `Status` is `IN_PROGRESS`, `BLOCKED` or `COMPLETE`
- THEN its `Campaign ID` must equal the active task id and its `Status` must
  normalize to the active task status, exactly as before
