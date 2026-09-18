# Spec — Certification closure and validation integrity

Measured at `521210f7`. `bin/nightwatch-session.mjs` dispatches eight commands
and parses `--dry-run` as one global boolean read by `commandIntegrate` alone.
`bin/hardening-check.mjs` runs 83 registered rules (60 TOTALITY, 23 EXISTENCE,
21 carrying a `firstMatch` singleton justification) and offers a
`--probe-campaign` mode with 90 recorded probes; the authoritative gate has 11
required groups and executes `hardening:check` but never the campaign. The
campaign exits 1 at this SHA with `checkActiveMilestoneProgression` UNDETECTED.

## ADDED Requirements

### Requirement: Every command SHALL declare a `--dry-run` contract, and a dry run SHALL mutate nothing

A flag that is parsed, documented and then ignored is worse than an absent
flag: `start --dry-run` reported a plan and created a branch, a worktree and an
ownership record, consuming capacity a later real start then lacked.

Every command the CLI dispatches SHALL declare its `--dry-run` contract as
either `SUPPORTED` or `NOT_APPLICABLE`, and the declaration SHALL be enforced
at dispatch so a new command cannot be added without one. A `NOT_APPLICABLE`
command SHALL refuse the flag with a categorical code rather than accept it as
a no-op.

For a `SUPPORTED` command the dry run SHALL compute and report its whole plan
and then return having changed nothing: no ref, no branch, no worktree, no
ownership record, no file, no directory, no index entry, no remote-tracking
ref, and no entry under the shared Git directory. It SHALL still fail closed on
every condition that would stop the real command — an unsafe workspace, an
unresolved or invalid base, capacity exhaustion, an occupied path, an existing
branch, an invalid fault-injection token — and SHALL do so before mutating.

#### Scenario: a clean start dry run changes nothing
- **WHEN** `start --dry-run` is run against an admitted candidate
- **THEN** it reports the candidate name, branch, path, base and capacity, and the full topology snapshot is byte-identical afterwards

#### Scenario: a dry run consumes no capacity
- **WHEN** repeated `start --dry-run` invocations run at the worktree bound
- **THEN** a subsequent real `start` still succeeds and the bound is not exceeded

#### Scenario: an invalid base fails closed before mutation
- **WHEN** `start --dry-run --base <sha that resolves to no commit>` is run
- **THEN** it fails with `SESSION_BASE_INVALID` and creates no directory

#### Scenario: a read-only command refuses the flag
- **WHEN** `status --dry-run` or `check --dry-run` is run
- **THEN** it exits with a usage error naming `SESSION_DRY_RUN_NOT_APPLICABLE`

#### Scenario: the contract covers every dispatchable command
- **WHEN** a command exists in the dispatch set with no declared dry-run contract
- **THEN** the guard fails naming that command

### Requirement: A release-authoritative gate SHALL execute the hardening probe campaign

Knowing that a command exists is not validation. `hardening:rules` proves that
each registered rule detects the violation it guards; because no gate ran it,
probe HC-059 rotted once and HC-015 has been failing unnoticed at this SHA.

The authoritative quality gate SHALL carry a REQUIRED group that executes the
rule probe campaign, registered through the gate-definition machinery: a fixed
command key in the declared union, a runtime dispatch arm, acceptance by the
offline definition validator, a validation-universe classification, and an
entry in the emitted receipt. The group SHALL NOT be optional, flag-guarded or
environment-conditional.

The campaign SHALL fail closed on vacuity: a zero rule count, a zero probe
count, any rule with no recorded probe, any probe that does not produce a
detected failure, any file it could not restore byte-for-byte, and any change
to `git status --porcelain` across the run.

#### Scenario: a failing probe makes the gate non-green
- **WHEN** a recorded probe mutates guarded source and the rule does not detect it
- **THEN** the probe group fails and the gate's final result is not PASS

#### Scenario: vacuity fails
- **WHEN** the campaign would run zero rules or zero probes
- **THEN** it fails rather than reporting success

#### Scenario: the campaign leaves the tree byte-identical
- **WHEN** the campaign completes, including after a probe error
- **THEN** every mutated file is restored byte-for-byte and `git status --porcelain` is unchanged

#### Scenario: the required group appears in the receipt
- **WHEN** the gate emits its receipt
- **THEN** the probe group is present in `groupIds` and in `groups` with its status

#### Scenario: removing the group fails gate-definition truth
- **WHEN** the probe group is deleted from the gate definition
- **THEN** the gate-definition completeness guard fails naming the missing group

### Requirement: A probe SHALL mutate the file its rule actually reads

`checkActiveMilestoneProgression` resolves its subject through
`.agent/ACTIVE_TASK.md` to the ACTIVE task's `STATE.md`. Probe HC-015 named a
fixed task directory, so when the active task changed the probe began mutating
a file the rule no longer opens, and reported UNDETECTED while the rule was
working correctly.

A probe whose rule resolves its subject indirectly SHALL resolve that subject
the same way, so probe and rule cannot disagree about which file is under test.

#### Scenario: the active-task probe follows the active task
- **WHEN** the active task changes
- **THEN** the probe still mutates the STATE.md the rule reads, and remains DETECTED

### Requirement: A TOTALITY rule SHALL evaluate every occurrence and report every failing one

Sixty rules declare TOTALITY. The self-check currently catches only a direct
non-global `.exec()`/`.match()` without a recorded singleton justification, so
a rule that stops at the first failing occurrence — or reports one line where
it promised every line — passes while proving less than it claims.

Every registered rule SHALL carry a declared quantifier that matches its
implementation. A TOTALITY rule SHALL inspect every relevant occurrence, SHALL
NOT stop at the first witness of either polarity unless a recorded singleton
justification says the subject is a genuine singleton, and SHALL report each
failing occurrence with its exact location in deterministic order.

#### Scenario: a later failing occurrence is reported
- **WHEN** the first occurrence satisfies a totality rule and a later one violates it
- **THEN** the rule fails naming the later occurrence

#### Scenario: multiple failing occurrences are all reported
- **WHEN** two distinct later occurrences violate a totality rule
- **THEN** both failing locations are reported

### Requirement: Comment stripping SHALL NOT delete code from the analysed view

`withoutComments()` removes block comments before line comments, so a `//`
comment containing `/*` opens a phantom block comment that runs to the next
`*/` and deletes the intervening real code. Every `read()`-based rule then
analyses a source view with a hole in it. A fail-if-absent rule fails loudly;
a fail-if-present rule goes SILENTLY vacuous over the deleted span, which means
forbidden code can hide behind an ordinary-looking line comment.

The code-only accessor SHALL remove comments without removing code, treating a
`/*` sequence inside a line comment as comment text rather than as the start of
a block comment.

#### Scenario: a line comment containing a block-comment opener hides nothing
- **WHEN** source contains a `//` comment whose text includes `/*` and real code follows
- **THEN** the code-only view still contains that following code

### Requirement: A real-source expectation SHALL be re-admitted on derivation evidence, never by SHA substitution

Expectations are provenance-bound to an exact source snapshot and are never
silently re-bound. When the admitted source moves, the correct response is
fresh derivation against the new snapshot and a mechanical comparison of the
result, not an edit to the recorded SHA.

Re-admission SHALL re-derive each affected expectation from the current source
with the existing derivation machinery and SHALL compare source path, symbol,
normalized evidence, contract shape and evidence digest. An expectation whose
derivation no longer reproduces its contract SHALL NOT be forced through
admission. Records that intentionally describe a historical baseline SHALL
remain historical.

#### Scenario: a stale current-source reference fails closed
- **WHEN** a current-source authority names a SHA that is not the admitted snapshot
- **THEN** the currentness check fails

#### Scenario: historical records stay historical
- **WHEN** the admitted SHA advances
- **THEN** documents and fixtures describing the prior baseline continue to name it

### Requirement: Focus indication SHALL be qualified at every declared viewport width

The Control Center declares five widths. Focus-ring contrast was never measured
at any of them, and a shared CSS rule is not evidence that every viewport
composition renders it.

Every keyboard-reachable control SHALL show a focus indicator that is visible,
unclipped and unobscured at every declared width, and its measured contrast
against the actual computed adjacent background SHALL meet the declared floor.
Measurement SHALL use computed styles from the rendered page rather than source
constants, and a failure SHALL name the view, the control and the width.

#### Scenario: a degraded focus token fails the lane
- **WHEN** the focus indicator token is degraded below the declared floor
- **THEN** the browser lane fails naming the affected control and width

#### Scenario: every declared width is covered
- **WHEN** the focus matrix runs
- **THEN** it reports a result for every declared width, and a width with no measured control fails rather than passing vacuously
