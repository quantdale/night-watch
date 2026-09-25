## ADDED Requirements

### Requirement: Every entry point conforms to the operator CLI contract
Every top-level `bin/*.mjs` entry point SHALL either declare itself through
the shared operator CLI contract (help without execution, categorical refusal
of unknown arguments, exit codes 0–4, a single JSON document under `--json`,
and no absolute machine paths or secrets in output) or be retired as a
declared deletion. A structural rule with a negative probe SHALL enforce this.

#### Scenario: Unknown flag
- **WHEN** an operator passes an unknown flag to any entry point
- **THEN** it exits 2 with CLI_UNKNOWN_ARGUMENT and performs no effect

#### Scenario: Help on a test runner
- **WHEN** an operator runs `nightwatch-agent test --help`
- **THEN** usage is printed and no test suite executes

### Requirement: bin type-check is enforcing
The bin type-check lane SHALL run in BLOCKING mode with zero exemptions and
all entry points conforming. Until then, a per-file diagnostic ceiling SHALL
fail any increase.

#### Scenario: Regression during burn-down
- **WHEN** an edit raises a bin file's diagnostic count above its ceiling
- **THEN** the gate fails

### Requirement: A fresh operator can install and run from the README
The README SHALL give an operator quickstart. It SHALL cover installing both
the root and the UI packages, checking health, launching a bounded autonomous
hunt (with the reasoner environment prerequisites), inspecting status and
findings, starting the Control Center, and capturing authentication for an
authorized lane. It SHALL also say where findings and reviews are stored,
which actions require human authorization, and what a provider failure
means. Every command it names SHALL exist, and its behaviour SHALL match that
command's `--help`.

#### Scenario: Fresh clone follows the README
- **WHEN** a clean clone runs the README install and health commands
- **THEN** each command succeeds, and the Control Center build finds its
  dependencies

### Requirement: Browser channel is selectable without editing tracked config
The browser channel SHALL be selectable through a declared environment
variable with fail-closed validation, so the documented Chromium fallback
works without editing tracked files.

#### Scenario: System Chrome absent
- **WHEN** system Chrome is absent and the operator selects the Chromium
  channel
- **THEN** browser lanes launch the installed Chromium

### Requirement: Bounded proof runs are expressible from the CLI
`campaign run` SHALL accept a wall-clock option that can only narrow the
duration ceiling, and SHALL refuse any value that would widen it.

#### Scenario: Thirty-minute proof run
- **WHEN** an operator passes a 30-minute wall-clock limit with `--duration=1h`
- **THEN** the campaign stops at or before 30 minutes

### Requirement: End-to-end operator proof is executed and receipted
Before closure, the campaign SHALL execute and receipt three proofs:
1. A deterministic synthetic hunt exercising admission, refusal,
   persistence, resume, provider-outage classification and signal pause.
2. Exactly one authorized bounded paid provider run against the approved
   sibling universe, with executed provider calls, source actions,
   reproduction attempts, unchanged sibling identity and zero leakage shown in
   its receipt.
3. A clean-clone install proof.
A provider-blocked paid run SHALL be recorded as EXTERNAL, never as zero
yield.

#### Scenario: Paid run admits nothing
- **WHEN** the paid run executes provider calls and reproduction attempts
  but admits no candidate
- **THEN** the receipt records a valid zero-admission run with its
  denominators, and no threshold is changed

#### Scenario: Provider account unusable
- **WHEN** every provider call fails before any source action
- **THEN** the proof is recorded PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION and the
  live proof is listed as an external prerequisite

### Requirement: Operator documentation agrees with live state
README, CURRENT_STATE, RELEASE-ADVANCE-CONDITIONS, ROADMAP headings and CLI
help SHALL agree with live project:check and CI observations. Historical
tables SHALL be labelled historical, and no document SHALL claim a lane,
status or CI result that live output contradicts.

#### Scenario: README CI claim
- **WHEN** the README describes exact-head CI
- **THEN** the description matches the observed run at the certified
  checkpoint
