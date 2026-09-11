# Spec — Structural rule soundness

Closes F-16. Measured at `36bd493`: `bin/hardening-check.mjs` is 4,376 lines —
the largest file in the repository — excluded from `typecheck`, carrying 70
`check*` rules (all called; no dead rule), which assert via **644 `.test(` and
84 `.includes(` matcher calls over the text of 198 source files**.
`withoutComments()` is applied at 72 sites. Thirteen assertion sites match
directly against `read(...)`, and five of those are fail-if-absent positives:
lines 108, 184, 863, 1868 and 3697.

## ADDED Requirements

### Requirement: A positive structural assertion SHALL NOT be satisfiable by a comment

A rule of the form "this file must contain X" run against raw source is
satisfied by X appearing in a comment. `bin/hardening-check.mjs:108` is the
sharpest case:

```js
if (!/env\s*!==\s*['"]dev['"]/.test(read(file))) fail(`${file} does not enforce DEV-only automated credential execution`);
```

The rule that proves DEV-only automated credential execution is satisfied by
the literal `env !== 'dev'` appearing anywhere in the file, including in the
comment explaining why the rule exists. The same shape appears at lines 184
(the AI provider allowlist), 863 (the CI empty-step rule), 1868 (the safe-action
catalog version) and 3697 (admitted repository ids).

Every fail-if-absent assertion SHALL read comment-stripped source. The
`read`/`withoutComments` pair SHALL be replaced by a single accessor that
returns code-only text by default, so the unsafe form requires an explicit,
named opt-in (`readIncludingComments`) used only where a rule is genuinely
about comment text.

A structural rule over the checker itself SHALL enforce this: a matcher applied
directly to the raw accessor in a fail-if-absent position fails the check. The
checker is a source file like any other and is already the subject of rules, so
this is consistent rather than novel.

#### Scenario: a comment cannot satisfy a positive rule
- **WHEN** the asserted literal exists only inside a comment in the target file
- **THEN** the rule fails
- **AND** the same literal in code satisfies it

#### Scenario: the unsafe accessor requires an explicit opt-in
- **WHEN** a rule needs raw text including comments
- **THEN** it calls the explicitly named raw accessor
- **AND** a fail-if-absent matcher over the raw accessor fails the
  self-check

#### Scenario: the five identified sites are repaired and proven
- **WHEN** each of lines 108, 184, 863, 1868 and 3697 is converted
- **THEN** moving the matched literal into a comment in the target file makes
  the rule fail
- **AND** the mutation is recorded in the campaign's proof ledger

### Requirement: An occurrence-scoped rule SHALL be occurrence-complete

Thirty-six of the checker's sites use a global match; the remainder test for a
first match. A rule that forbids a pattern and stops at the first safe
occurrence passes while a later line in the same file is unsafe — the failure
mode that has already been recorded in this repository for a
`includes(literal)` guard and for the `session/...` worktree scan
(`ACTIVE_TASK_ROUTING_*`, DEF-FC-04).

Every rule whose meaning is "no occurrence of X is unsafe" or "every occurrence
of X satisfies Y" SHALL evaluate **all** occurrences and report each failing
one with its line number. A rule whose meaning is genuinely "at least one
occurrence exists" SHALL be written so that intent is explicit in its name or a
comment, so a reader can tell the two apart.

Rules SHALL report the line number of what they matched or failed to match.
A failure message that names only a file forces the next reader to re-derive
what the rule meant.

#### Scenario: a later unsafe occurrence is caught
- **WHEN** a file contains one safe and one unsafe occurrence of a guarded
  pattern
- **THEN** the rule fails naming the unsafe occurrence and its line

#### Scenario: existence rules are distinguishable from totality rules
- **WHEN** the checker is read
- **THEN** each rule's quantifier is explicit
- **AND** a totality rule implemented with a first-match test fails the
  self-check

### Requirement: Every structural rule SHALL be proven by a mutation that it catches

Seventy rules assert invariants across 198 files, and a rule that never fires
is indistinguishable from a rule that cannot fire. This repository has recorded
both classes: a hardening rule that never ran, and a conditional guard whose
condition was never true.

Each rule SHALL have a recorded negative probe: a specific, reversible mutation
of the real guarded source that the rule detects. The probe set SHALL be
executable as a campaign — the repository already has
`bin/review-mutation-campaign.mjs` as precedent — and SHALL report, per rule,
whether its mutation was detected.

A rule with no probe SHALL be reported. An undetected mutation SHALL fail. The
campaign SHALL assert a non-zero rule count so an enumerator that stops finding
rules fails loudly.

#### Scenario: every rule has a detected probe
- **WHEN** the mutation campaign runs
- **THEN** every one of the 70 rules reports a detected mutation
- **AND** an undetected mutation fails the campaign naming the rule

#### Scenario: a rule with no probe is reported
- **WHEN** a rule has no recorded probe
- **THEN** the campaign reports it as unproven

#### Scenario: mutations are reversed
- **WHEN** the campaign completes
- **THEN** `git status --porcelain` is unchanged from before the run

### Requirement: The structural authority SHALL be type-checked and decomposed

A 4,376-line untyped file is the authority for every offline structural
invariant, including the validation-universe completeness rule that makes the
totality rule work. It already carries `// @ts-check` and JSDoc, so the intent
exists and is unenforced (see `cli-implementation-contract`).

Beyond type checking, the file SHALL be decomposed so a rule can be located,
read and probed independently: one module per invariant family, a single
registry that enumerates rules, and the entry point reduced to running the
registry. The registry makes the definition-versus-call-site comparison
structural rather than a grep, and makes the per-rule probe set addressable.

Decomposition SHALL preserve behaviour exactly: the rule set before and after
SHALL produce identical output on the same tree, asserted by comparing full
output at the same SHA.

#### Scenario: decomposition is behaviour-preserving
- **WHEN** the decomposed checker runs on the tree at the starting SHA
- **THEN** its output is byte-identical to the pre-decomposition output

#### Scenario: the rule registry is the enumeration authority
- **WHEN** a rule module is added without registering it
- **THEN** the self-check fails naming the unregistered rule
