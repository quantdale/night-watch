## ADDED Requirements

### Requirement: Every met condition has exact checkpoint evidence
A release condition SHALL count as `MET` only when its owning check reports `MET` and its resolved evidence commit is exactly equal to the certified checkpoint commit. Missing evidence, a malformed or nonexistent object, and every non-equal lineage relation SHALL be non-certifying and SHALL refuse certification.

#### Scenario: Evidence is absent
- **WHEN** a check reports `MET` and its condition has `evidenceSha: null`
- **THEN** the condition reports `EVIDENCE_ABSENT`, does not count as met, and cannot authorize an advance

#### Scenario: Evidence is exact
- **WHEN** a check reports `MET` and the resolved evidence commit equals the certified checkpoint commit
- **THEN** the effective condition state is `MET` and its exact binding is included in the verdict

#### Scenario: Check is unmet despite exact evidence
- **WHEN** the evidence commit is exact but the owning check reports a non-met state
- **THEN** the effective condition remains non-met and exact lineage does not upgrade the check result

### Requirement: Evidence lineage is categorical and fail-closed
The system SHALL classify evidence relative to the certified checkpoint as exactly one of `EXACT`, `STALE_ANCESTOR`, `FUTURE_DESCENDANT`, `DIVERGENT`, `OBJECT_MISSING`, or `GIT_INDETERMINATE`. It SHALL NOT represent spawn failure, timeout, signal, malformed output, unknown object, or ancestry-command error as a proven negative ancestry result.

#### Scenario: Evidence predates the checkpoint
- **WHEN** the evidence commit is a strict ancestor of the certified checkpoint
- **THEN** the condition reports stale evidence and refuses certification

#### Scenario: Evidence follows the checkpoint
- **WHEN** the certified checkpoint is a strict ancestor of the evidence commit
- **THEN** the condition reports future evidence and does not retroactively certify the checkpoint

#### Scenario: Evidence is on a divergent branch
- **WHEN** both commits resolve and neither is an ancestor of the other
- **THEN** the condition reports divergent evidence and refuses certification

#### Scenario: Evidence object does not exist
- **WHEN** the configured 40-hex identifier does not resolve to a commit in the admitted repository
- **THEN** the condition reports unresolved evidence rather than retaining the check's `MET` state

#### Scenario: Git relation cannot be established
- **WHEN** commit resolution or ancestry evaluation times out, is signalled, overflows, fails to spawn, or returns an unexpected result
- **THEN** the relation is `GIT_INDETERMINATE` and certification fails closed

### Requirement: HEAD is snapshot-bound
The system SHALL capture live `HEAD` once for a release evaluation and SHALL resolve every `HEAD` evidence token to that exact captured commit. A resolved `HEAD` SHALL certify only when it equals the certified checkpoint; a later documentation or implementation descendant SHALL remain non-exact.

#### Scenario: HEAD is a documentation descendant
- **WHEN** `evidenceSha: HEAD` resolves to a commit after the certified substantive checkpoint
- **THEN** the condition reports future evidence and the descendant is not relabeled as checkpoint evidence

#### Scenario: Checkout changes during evaluation
- **WHEN** repeated guarded identity checks show that live HEAD changed after the evaluation snapshot was captured
- **THEN** the entire certification is indeterminate and no advance succeeds

### Requirement: Verdict binds inputs and effective states
The release verdict SHALL record the definition digest, certified checkpoint, captured live head, ordered check states, resolved evidence objects and relations, lane counts, external-track state, effective condition states, and a canonical evaluation digest. Counts and release decisions SHALL use effective states rather than raw check states.

#### Scenario: Raw checks all report met but one binding is non-exact
- **WHEN** every owning check reports `MET` but one condition has absent, stale, future, divergent, missing, or indeterminate evidence
- **THEN** `conditionsMet` excludes that condition, `certificationRefused` is true, and a claimed advance is refused naming it

#### Scenario: Definition changes between evaluations
- **WHEN** condition evidence text, order, check identity, or evidence SHA changes
- **THEN** the definition/evaluation digest changes and the prior verdict cannot be represented as the new evaluation

### Requirement: Lineage enforcement is adversarially complete
Authoritative tests SHALL cover the full evidence-relation matrix through the pure evaluator and real synthetic Git repositories. Mutation probes SHALL prove that absence guards, exact equality, both ancestry directions, object resolution, indeterminate handling, effective-state counting, and snapshot stability are load-bearing.

#### Scenario: Future and divergent commits are exercised end to end
- **WHEN** a synthetic repository supplies descendant and side-branch evidence to `project:check` while all checks report met and an advance is claimed
- **THEN** both runs fail with distinct stable evidence categories and name the affected condition

#### Scenario: A lineage control is removed
- **WHEN** a registered non-vacuous mutation disables one required evidence-lineage control
- **THEN** its intended focused test fails before the implementation bytes are restored exactly
