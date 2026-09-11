# campaign-certification-registry Specification

## Purpose
TBD - created by archiving change nightwatch-certification-truth-r12-v1. Update Purpose after archive.
## Requirements
### Requirement: one declarative registration authority

Campaign certification suites SHALL be declared in
`config/campaign-certification.v1.json`, carrying
`schemaVersion: nightwatch.campaign-certification.v1`, a `lanes` map from lane
id to that lane's manifest path, and a `campaigns` array whose members carry
`id`, `task`, `lane` and `suites`.

#### Scenario: the schema is malformed
- **WHEN** the registry's schema version, lane map or campaign array is absent or malformed
- **THEN** `hardening:check` SHALL fail closed rather than skip the rule

#### Scenario: a duplicate campaign id or suite path
- **WHEN** two campaigns share an id, or one suite path is declared twice
- **THEN** `hardening:check` SHALL fail

### Requirement: every declared suite exists

Every declared suite SHALL exist.

#### Scenario: a declared suite is deleted from disk
- **WHEN** a suite named in the registry no longer exists in the working tree
- **THEN** `hardening:check` SHALL fail naming that suite

### Requirement: every declared suite is gate-registered in its lane

Every declared suite SHALL be gate-registered in its lane.

#### Scenario: a suite is removed from its lane manifest
- **WHEN** a registry-declared suite is absent from the manifest its declared lane names
- **THEN** `hardening:check` SHALL fail naming the suite and the lane

#### Scenario: a lane is not a required gate group
- **WHEN** the registry names a lane whose manifest is not one of the authoritative gate manifests
- **THEN** `hardening:check` SHALL fail

### Requirement: registry totality over the campaign ledger

The registry SHALL declare every campaign that owns a task directory matching
the campaign-id pattern under `.agent/tasks/`.

#### Scenario: a campaign task directory has no registry entry
- **WHEN** a campaign task directory exists and the registry does not declare it
- **THEN** `hardening:check` SHALL fail naming the undeclared campaign

#### Scenario: a campaign genuinely certifies through no suite of its own
- **WHEN** a campaign declares an empty `suites` array
- **THEN** it SHALL also declare a non-empty `reason`, and `hardening:check` SHALL fail if it does not

### Requirement: registration never overstates execution

Registration SHALL never overstate execution.

#### Scenario: a registered suite skips for a missing prerequisite
- **WHEN** a registered suite's real-source block skips because the read-only sibling checkouts are absent
- **THEN** the authoritative receipt SHALL record the skip, and the skip SHALL NOT be reported as a pass

