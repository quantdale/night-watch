## ADDED Requirements

### Requirement: Every shard receives a private OS temporary namespace

The shard runner SHALL derive one absolute temporary directory per shard from a run-unique scratch root and shard identity. It SHALL set `TMPDIR`, `TEMP`, and `TMP` to that directory before launching Playwright, overriding any inherited value.

#### Scenario: Two shards run concurrently
- **WHEN** the runner prepares environment for `shard-1` and `shard-2`
- **THEN** each child observes a different `os.tmpdir()` path under the same run-specific scratch root

#### Scenario: Ambient temp state is present
- **WHEN** the parent process has a shared `TMPDIR`, `TEMP`, or `TMP`
- **THEN** neither inherited value reaches the shard child unchanged

### Requirement: Shard temp identity is bounded and traversal-safe

The temp-path builder SHALL reject non-absolute run roots and any shard identity outside the runner's closed vocabulary before path construction or child launch.

#### Scenario: Malformed shard identity
- **WHEN** a caller supplies a path-like or otherwise unknown shard identity
- **THEN** environment construction fails with a categorical error

### Requirement: Existing child-process boundaries remain intact

The shard environment SHALL retain the explicit parent-environment allowlist,
required deterministic locale settings, and removal of inherited proxy port,
token, path, and owner-PID variables. It SHALL assign one absolute proxy lease
directory shared by every shard in the same validation invocation. Temp
isolation SHALL not add network, source, credential, or filesystem authority
outside the validation runner's local child process.

#### Scenario: Proxy lease state is ambient
- **WHEN** the parent environment contains Nightwatch proxy lease variables
- **THEN** inherited port/token/path/owner values do not survive, while every shard receives the same newly computed absolute lease directory

#### Scenario: Shards coordinate proxy ports
- **WHEN** two otherwise isolated checkout roots reserve proxy ports
- **THEN** their lease files share the explicit validation-run lease directory and cannot claim the same live port

### Requirement: Scratch cleanup is bounded

After serial or concurrent execution settles, the runner SHALL remove only the unique run-specific scratch root it created.

#### Scenario: Ordinary execution completes
- **WHEN** all shard processes exit and their results are collected
- **THEN** the invocation removes its own scratch root without enumerating or deleting unrelated temporary directories
