# operational-acceptance Specification

## Purpose
TBD - created by archiving change nightwatch-operational-acceptance-v1. Update Purpose after archive.
## Requirements
### Requirement: local-clean certification is not operational acceptance
Historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` SHALL remain a valid
COMPLETE-only local/synthetic/clean record. An IN_PROGRESS operational-
acceptance task SHALL NOT project that token as current project completion.

#### Scenario: pending operational acceptance
- **WHEN** the active task is IN_PROGRESS for operational acceptance
- **THEN** `PROJECT_COMPLETION_STATUS` is
  `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` or `IN_PROGRESS`
  and not `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`

#### Scenario: historical local-clean remains valid
- **WHEN** a COMPLETE task records local/clean certification only
- **THEN** `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` is still accepted and is
  not treated as `OPERATIONALLY_ACCEPTED`

### Requirement: operational terminals match active-task status
Operational terminal tokens SHALL pair with the matching continuity status:
pending with IN_PROGRESS, `OPERATIONAL_ACCEPTANCE_BLOCKED` with BLOCKED, and
`OPERATIONALLY_ACCEPTED` /
`REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN` /
`OPERATIONAL_ACCEPTANCE_FAILED` with COMPLETE.

#### Scenario: forbidden combinations fail closed
- **WHEN** a blocked or in-progress task projects an operational-accepted or
  historical-complete token
- **THEN** project-state check fails with
  `PROJECT_STATE_COMPLETION_STATUS_MISMATCH` or
  `PROJECT_STATE_COMPLETION_STATUS_INVALID`

### Requirement: real DEV owner workflow
Operational acceptance SHALL exercise the existing serial DEV launchers with
external storage-state, prepare-then-resume campaign lifecycle, no production
contact, and no credential leakage.

#### Scenario: blocked prerequisite
- **WHEN** authentication, DEV, or another prerequisite is unavailable
- **THEN** the campaign records `OPERATIONAL_ACCEPTANCE_BLOCKED` with
  fail-closed evidence rather than a fabricated pass

