## ADDED Requirements

### Requirement: Configuration input is strictly admitted before effects
The system SHALL strictly parse the environment declaration, optional `.env` file, supported CLI overrides, and ambient process values before any browser, subprocess, socket, or mutable owner-local action. Unknown structure, malformed file lines, duplicate assignments, undeclared `NIGHTWATCH_*` names, and invalid declared values SHALL fail closed with value-redacted diagnostics.

#### Scenario: Unknown name exists only in the file layer
- **WHEN** `.env` contains a misspelled `NIGHTWATCH_*` assignment absent from the process environment
- **THEN** startup refuses or reports it according to the declared unknown-name policy before effects, including its line and closest declared name but not its value

#### Scenario: Declaration carries an unknown key
- **WHEN** the declaration document, a variable, shape, or assembled-read object contains an unrecognized key
- **THEN** declaration loading fails rather than ignoring the key

### Requirement: One immutable snapshot governs validation rendering and execution
The system SHALL create one immutable admitted configuration snapshot with per-variable source and SHALL use that exact snapshot for validation, configuration rendering, direct runtime reads, and explicit child-process projection. A launcher SHALL NOT validate a merged snapshot and later execute from ambient `process.env`.

#### Scenario: Value exists only in `.env`
- **WHEN** a declared value is supplied only by the optional file layer
- **THEN** the config view reports `ENV_FILE` and the intended runtime/child observes the same admitted value

#### Scenario: Runtime input changes after admission
- **WHEN** ambient process state or the `.env` file changes after the snapshot is created
- **THEN** the active command continues with the admitted snapshot or refuses restart; it never mixes old validation with new execution values

### Requirement: Precedence is explicit and consistent
For every command that supports the corresponding source, precedence SHALL be CLI override, then non-empty process environment, then `.env`, then declaration default. Commands that intentionally require an explicit CLI value SHALL declare and test that exception rather than silently discarding a lower layer.

#### Scenario: Process and file both set a value
- **WHEN** both layers set the same declared variable
- **THEN** process wins, provenance reports `PROCESS_ENVIRONMENT`, and execution observes that exact value

#### Scenario: Supported CLI override is supplied
- **WHEN** a CLI override and lower-precedence values exist
- **THEN** validation, rendering, and execution all use the CLI value and record `CLI_OVERRIDE`

### Requirement: File parsing is bounded literal configuration
The `.env` reader SHALL accept only bounded comments, blank lines, and literal declared assignments. It SHALL reject duplicate keys, malformed lines, unsupported expansion/interpolation syntax, NUL, oversize input, and unreadable non-absent files. Missing optional `.env` is distinguishable from unreadable or malformed `.env`.

#### Scenario: Duplicate secret-bearing assignment
- **WHEN** a secret-bearing variable is assigned twice
- **THEN** admission refuses with variable and line metadata while revealing neither value

#### Scenario: File is absent versus unreadable
- **WHEN** `.env` does not exist
- **THEN** admission records `ABSENT_OPTIONAL`
- **AND WHEN** it exists but cannot be safely read
- **THEN** admission refuses instead of treating it as absent

### Requirement: Explicit child values are declaration-bound
The child environment builder SHALL accept an explicit `NIGHTWATCH_*` key only when it is declared and its value comes from the admitted snapshot or a documented fixed launcher override. The inherited host-key allowlist SHALL remain minimal and ambient secrets SHALL remain excluded.

#### Scenario: Launcher misspells an explicit key
- **WHEN** a launcher passes a syntactically valid but undeclared `NIGHTWATCH_*` key
- **THEN** child construction fails before spawn

#### Scenario: Secret exists only in the parent
- **WHEN** an undeclared or non-forwarded credential is present in ambient state
- **THEN** it is absent from the admitted child environment and all rendered diagnostics

### Requirement: Configuration coherence enforcement is total and non-vacuous
Authoritative tests and structural rules SHALL enumerate configuration admission/render/launch call sites and prove each consumes the same snapshot. Mutation probes SHALL detect dropping file-only values, reporting against the wrong map, process re-reads after admission, permissive declaration/file parsing, undeclared explicit child keys, and provenance/execution disagreement.

#### Scenario: Launcher reverts to process environment
- **WHEN** a mutation changes one launcher to read a declared variable from `process.env` after snapshot admission
- **THEN** a structural or executing test fails naming that launcher

#### Scenario: File-only cross-process proof
- **WHEN** a synthetic command runs with an otherwise empty environment and a safe `.env` fixture
- **THEN** the observed child values and rendered provenance match exactly, while unknown and secret sentinels remain absent
