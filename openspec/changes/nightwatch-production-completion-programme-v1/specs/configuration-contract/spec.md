# Spec — Configuration contract

Closes F-19. Measured at `36bd493`: `.env.example` documents 7 variables;
`src` and `bin` read **26**, some assembled by runtime string concatenation so
the true surface is not statically enumerable. Undocumented variables include
`NIGHTWATCH_REASONER_CLI` (names the executable the agent runtime spawns),
`NIGHTWATCH_REASONER_SCRIPT`, `NIGHTWATCH_PROXY_LEASE_PATH`,
`NIGHTWATCH_PROXY_LEASE_TOKEN`, `NIGHTWATCH_PROXY_PORT`, `NIGHTWATCH_HEADED`
and the `NIGHTWATCH_PRINT_*` family. `config/environments/*.json` are loaded
with a name check and no schema validation of their host lists.

Verified and not a finding: `GH_TOKEN` and `GITHUB_TOKEN` are stripped from
every child environment by `bin/quality-gate.mjs:22` and forwarded deliberately
only to the two `gh`-based CI observers.

## ADDED Requirements

### Requirement: The environment surface SHALL be declared, validated and enumerable

An operator cannot configure what they cannot discover, and a typo in a
variable name is currently indistinguishable from choosing the default. For a
tool whose correctness depends on containment settings — the proxy lease, the
browser headed flag, the reasoner executable — a silent default is a safety
property decided by a typo.

A single declaration SHALL own every environment variable Nightwatch reads:
name, purpose, whether it is required and in which mode, its value shape, its
default, whether it is secret-bearing, and which surfaces consume it.

Startup SHALL validate against the declaration and fail closed on a malformed
value, consistently with the existing `NIGHTWATCH_ENV` treatment. An unknown
`NIGHTWATCH_*` variable in the environment SHALL be reported — a near-miss such
as `NIGHTWATCH_REASONER_CLI_PATH` is far more likely a typo than an intentional
setting, and silence is the wrong answer.

Variables assembled at runtime SHALL be replaced by literals, or their
construction SHALL be enumerated in the declaration, so the surface is
statically knowable. `npm run nightwatch -- config` SHALL print the declaration
with each variable's effective source (declaration default, environment,
`.env`) and SHALL redact secret-bearing values to presence-only.

#### Scenario: a malformed value fails closed at startup
- **WHEN** a declared variable holds a value outside its shape
- **THEN** the process exits with a configuration refusal naming the variable
  and the expected shape
- **AND** no browser, subprocess or socket is created

#### Scenario: an unknown NIGHTWATCH_ variable is reported
- **WHEN** the environment carries a `NIGHTWATCH_*` name that is not declared
- **THEN** it is reported with the closest declared name

#### Scenario: the effective configuration is printable and redacted
- **WHEN** the config view runs
- **THEN** every declared variable appears with its effective source
- **AND** a secret-bearing variable shows presence only, never its value

#### Scenario: the declaration cannot drift
- **WHEN** `src` or `bin` reads a variable with no declaration
- **THEN** `hardening:check` fails naming the variable and the file

### Requirement: Environment configuration files SHALL be schema-validated, and the allowlist SHALL be validated as hosts

`config/environments/{local,dev,next}.json` carry the allowlists the entire
fail-closed egress model rests on. They are loaded with a name check;
`allowedHosts`, `apiHosts`, `authHosts`, `staticAssetHosts` and
`telemetryHosts` are not validated as host patterns.

Loading SHALL validate the full shape: required keys present, no unknown keys,
every host entry a well-formed hostname, IP literal, bracketed IPv6 literal or
a single-label wildcard of the documented form. A malformed entry SHALL fail
the load rather than being silently ignored — an ignored entry in an allowlist
is a denial, which fails safe, but an ignored entry in a *known production host*
list would fail open and must be impossible.

Validation SHALL assert the invariants the safety model already states rather
than only the syntax: no environment's allowlist may contain a known production
host; `production.json` SHALL remain structurally unloadable (D-4); and
`local.json` SHALL contain only loopback-family entries.

The `.env.example` `NIGHTWATCH_UI_URL` override SHALL be validated against the
selected environment's allowlist at load, which the README already promises
("the host MUST still pass the outbound-request policy"), with the check
asserted by a test that supplies a disallowed host.

#### Scenario: a malformed host entry fails the load
- **WHEN** an environment file contains an entry that is not a valid host
  pattern
- **THEN** the load fails naming the file, the key and the entry

#### Scenario: an unknown key fails the load
- **WHEN** an environment file carries a key the schema does not declare
- **THEN** the load fails rather than ignoring it

#### Scenario: a production host in an allowlist is refused
- **WHEN** any environment's allowlist contains a known production host
- **THEN** the load fails naming the host

#### Scenario: local stays loopback-only
- **WHEN** `local.json` contains a non-loopback entry
- **THEN** the load fails

#### Scenario: a disallowed UI override is refused at run start
- **WHEN** `--ui-url` or `NIGHTWATCH_UI_URL` names a host outside the selected
  environment's allowlist
- **THEN** the run refuses before creating a browser context

### Requirement: The reasoner executable SHALL be a declared, validated configuration surface

`bin/nightwatch-agent.mjs` spawns the executable named by
`NIGHTWATCH_REASONER_CLI`, defaulting to `process.execPath`, and correctly
refuses to start when neither it nor `NIGHTWATCH_PRINT_CLI` is set
(`REASONER_CLI_NOT_CONFIGURED`). What is missing is that this — the one place a
host-supplied string selects a program to run — is undocumented, unvalidated
and absent from the safety model's written surface.

The value SHALL be validated before use: an absolute path to an existing,
executable regular file, resolved without shell interpretation, with the
resolved path and its digest recorded in the run's evidence so a campaign's
reasoner identity is attributable after the fact.

`docs/SAFETY_MODEL.md` SHALL document this surface: what it selects, what the
process may and may not do, and that it is never passed to a shell. The
existing child-process boundary rules in `hardening:check` SHALL be extended to
assert the no-shell property at this call site specifically.

#### Scenario: a non-executable or relative path is refused
- **WHEN** the configured reasoner path is relative, missing, a directory or
  not executable
- **THEN** the agent refuses to start naming the reason
- **AND** no process is spawned

#### Scenario: the reasoner identity is recorded
- **WHEN** a campaign runs with a configured reasoner
- **THEN** the run evidence records the resolved path and its digest

#### Scenario: no shell interpretation
- **WHEN** the reasoner is spawned
- **THEN** it is spawned without a shell
- **AND** the structural rule fails if that call site gains shell execution
