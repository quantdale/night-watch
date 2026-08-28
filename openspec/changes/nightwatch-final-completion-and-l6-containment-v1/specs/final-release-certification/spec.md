## ADDED Requirements

### Requirement: whole-repository release audit
The campaign SHALL enumerate tracked paths with a NUL-safe Git manifest,
account for every path, read or hash every regular file, classify every path,
and record safe aggregate counts, bytes, lines and digests. Reviewed count
MUST equal tracked count; missing or non-regular paths MUST be explicit.

#### Scenario: audit is complete
- **WHEN** the audit reaches its terminal checkpoint
- **THEN** the report contains matching tracked/reviewed counts and an
  evidence-backed P0–P3 remediation matrix

### Requirement: coherent release authority
Project truth SHALL distinguish live Git head, substantive implementation
checkpoint, local/clean validation checkpoints, CI-observed/executed SHA and
documentation checkpoint. A documentation descendant SHALL NOT be presented
as implementation validation, and an older CI run SHALL NOT be presented as
validation of a newer head.

#### Scenario: stale CI is represented honestly
- **WHEN** an exact-head CI run executes zero required steps or targets an old
  SHA
- **THEN** machine state classifies it as non-evidence and COMPLETE CI
  certification is unavailable

#### Scenario: blocked release cannot satisfy complete checks
- **WHEN** a campaign has a terminal L6 blocker or unresolved P0/P1
- **THEN** the project-state and handoff validators reject COMPLETE semantics
  and require a concrete blocker/STOP next action

### Requirement: reproducible certification
The release matrix SHALL pass from a fresh supported Node 20 checkout without
ambient credentials, global tools, sibling writes, prior module/build state or
private findings. Canonical and isolated suites SHALL report exact pass/fail/
skip counts and skip-identity parity.

#### Scenario: clean checkout proves reproducibility
- **WHEN** the clean gate runs in a disposable checkout
- **THEN** all required local gates and UI qualification execute from clean
  state, and cleanup leaves no checkout or process residue

### Requirement: truthful terminal outcome
The campaign SHALL end as exactly one of
`PROJECT_COMPLETE_AND_CI_CERTIFIED`,
`PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`, or
`PROJECT_NOT_COMPLETE_BLOCKED`. COMPLETE is forbidden while L6 is required but
unproven, any unresolved P0/P1 or blocking P2 remains, required gates fail,
skips are unexplained, or CI is represented inaccurately.

#### Scenario: local complete with external CI blocker
- **WHEN** all repository-owned local and clean requirements pass and CI is
  unavailable solely due to a proven external platform/account condition
- **THEN** the terminal state is local-clean-certified and explicitly says CI
  is not certified

#### Scenario: technical blocker remains
- **WHEN** a required containment proof or repository-owned gate cannot be
  completed safely
- **THEN** the terminal state is blocked with reproduction, attempted paths,
  safety reason and exact next action
