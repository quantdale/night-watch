# Spec — Operator CLI contract

Closes F-05. Measured at `36bd493`: `package.json` declares 110 scripts over 62
`bin/*.mjs` entry points; 28 of 62 mention `--help` and 34 do not; `bin/lib/`
holds five shared modules, none an argument parser. Demonstrated in this
session: `node bin/quality-gate.mjs local --help` printed no help and began
executing the full authoritative gate, because `bin/quality-gate.mjs:178` reads
`process.argv[2]` and ignores every later argument. The command had to be
terminated.

## ADDED Requirements

### Requirement: Every entry point SHALL answer `--help` without side effects

`--help` and `-h` SHALL print usage and exit zero, before any filesystem write,
subprocess, browser context, network connection, credential read or long-running
computation. This is a safety property, not a convenience: the observed failure
was a read-only question that started a multi-minute side-effecting run.

Usage output SHALL state the command's purpose in one line, its accepted
subcommands and flags with their value shapes, its exit codes, whether it
produces artifacts and where, and the authorization class it requires if any.

A shared implementation SHALL live in `bin/lib/` so the contract is one
implementation rather than 62. A bin that does not route through it SHALL fail
a structural rule.

#### Scenario: help is answered before any effect
- **WHEN** any `bin/*.mjs` is invoked with `--help`
- **THEN** usage is printed and the process exits zero
- **AND** no file is written, no subprocess spawned, no socket opened and no
  credential read

#### Scenario: the gate cannot be started by a help request
- **WHEN** `node bin/quality-gate.mjs local --help` runs
- **THEN** usage is printed and the gate does not execute
- **AND** the process exits within one second

#### Scenario: a bin bypassing the shared contract is rejected
- **WHEN** a tracked `bin/*.mjs` parses arguments without the shared parser
- **THEN** `hardening:check` fails naming the file

### Requirement: An unknown or malformed argument SHALL be refused, never ignored

The repository's stated discipline is fail-closed, and `bin/nightwatch.mjs`
already refuses with `fail-closed — no environment selected`. The gate accepts
an unknown flag silently. Silent acceptance is the more dangerous default: the
operator believes they asked for something they did not get.

Every entry point SHALL reject an unrecognized flag, a flag with a missing or
malformed value, a repeated single-valued flag with conflicting values, an
unexpected positional argument, and an unknown subcommand — each with a
distinct code and a non-zero exit. The message SHALL name the offending token
and, where a close match exists, the intended flag.

Refusal SHALL happen before any effect, on the same terms as `--help`.

#### Scenario: an unknown flag is refused before execution
- **WHEN** an entry point receives `--not-a-flag`
- **THEN** it exits non-zero with `CLI_UNKNOWN_ARGUMENT` naming the token
- **AND** nothing is executed

#### Scenario: a malformed value is refused
- **WHEN** a flag requiring a value receives none, or a numeric flag receives a
  non-number
- **THEN** it exits non-zero with `CLI_ARGUMENT_INVALID` naming the flag and the
  expected shape

#### Scenario: conflicting repeats are refused rather than last-wins
- **WHEN** a single-valued flag appears twice with different values
- **THEN** it exits non-zero with `CLI_ARGUMENT_CONFLICT`

#### Scenario: an unexpected positional is refused
- **WHEN** an entry point receives a positional argument it does not accept
- **THEN** it exits non-zero rather than ignoring the token

### Requirement: Exit codes and machine output SHALL follow one convention

Exit codes SHALL be: `0` success; `1` a real failure of the thing the command
does; `2` a usage or argument error; `3` a fail-closed refusal (unauthorized,
unsupported capability, policy block); `4` an environment or external block
that is not a defect. An operator and a script SHALL be able to distinguish a
failing check from a refused invocation from an unavailable capability without
parsing prose.

`--json` SHALL mean the same thing everywhere: a single JSON document on
stdout, nothing else on stdout, human diagnostics on stderr, and a stable
top-level `status` field. Commands that already emit JSON (`quality-gate-spec`,
the intelligence views, `validation-universe`) SHALL be brought to the
convention without changing their existing payload semantics.

Output SHALL remain subject to the existing redaction layer. No usage text,
error message or JSON field may contain a credential, a raw customer value, an
absolute path outside the checkout, or a machine-specific path.

#### Scenario: refusal and failure are distinguishable
- **WHEN** a command is refused by owner policy
- **THEN** it exits `3`
- **AND** a genuine check failure of the same command exits `1`

#### Scenario: `--json` output is parseable alone
- **WHEN** any command supporting `--json` runs with it
- **THEN** stdout parses as exactly one JSON document with a `status` field
- **AND** every human-readable line went to stderr

#### Scenario: no output leaks a path or a secret
- **WHEN** any usage or error text is emitted
- **THEN** it contains no credential and no absolute path outside the checkout

### Requirement: The command surface SHALL be discoverable from one place

110 scripts across 62 binaries cannot be discovered by reading `package.json`.
A single `npm run nightwatch -- help` (or equivalent) SHALL list every operator
command grouped by purpose — run a scenario, inspect intelligence, validate,
manage sessions, manage evidence, operate the Control Center, owner-gated
lanes — with one line each and the authorization class where relevant.

The listing SHALL be derived from the entry points' own declared metadata, not
hand-maintained, so a new bin appears automatically and a removed one
disappears. A bin with no declared metadata SHALL fail the structural rule that
requires the shared parser.

`README.md` SHALL point at this command rather than enumerating scripts, so the
two cannot drift.

#### Scenario: a new entry point appears without editing a list
- **WHEN** a new `bin/*.mjs` with declared metadata is added
- **THEN** it appears in the command listing
- **AND** no hand-maintained list was edited

#### Scenario: a bin with no metadata fails the build
- **WHEN** a tracked bin declares no metadata
- **THEN** `hardening:check` fails naming it

### Requirement: The contract SHALL be proven across every entry point, not sampled

A per-command test would leave the next bin unguarded. A single suite SHALL
enumerate every tracked `bin/*.mjs` from the filesystem and assert the contract
against each: `--help` exits zero with no effect, an unknown flag exits `2`,
metadata is declared. The enumeration SHALL assert a non-zero count so a
generator that stops finding bins fails loudly.

The suite SHALL be registered in `config/validation-universe.v1.json` and in
the gate manifest. An unregistered suite does not run.

#### Scenario: the sweep is exhaustive and non-vacuous
- **WHEN** the CLI contract suite runs
- **THEN** it asserts against every tracked `bin/*.mjs`
- **AND** a discovered count of zero fails the suite before any assertion

#### Scenario: side-effect freedom is measured, not assumed
- **WHEN** `--help` is invoked under the sweep
- **THEN** the working tree, `artifacts/` and `$HOME/.nightwatch` are unchanged
- **AND** any change fails the case naming the path
