# Spec — frontier completion & deep reliability

## ADDED Requirements

### Requirement: local review binds to the exact reviewed artifact
A review decision SHALL bind to the finding, dossier and handoff digests,
source SHA, campaign id, handoff version, and privacy-projection version.

#### Scenario: a regenerated dossier invalidates a prior review
- **WHEN** a stored receipt is verified against a regenerated dossier
- **THEN** verification fails closed with `FINDING_REVIEW_STALE`

### Requirement: local review is never organizational sign-off
Every review receipt SHALL carry `organizationalAuthority`
`NONE_LOCAL_REVIEW_ONLY` and SHALL NOT equate to a Leslie or Pondr verdict.

#### Scenario: a receipt claiming organizational authority is rejected
- **WHEN** a receipt carries any other organizational authority value
- **THEN** verification fails with `FINDING_REVIEW_AUTHORITY_INVALID`

### Requirement: finding relationships are mechanical and advisory
Relationship classification SHALL derive only from mechanical fields and
SHALL carry `advisoryOnly` with `finalVerdictAuthority`
`HUMAN_ORGANIZATIONAL`.

#### Scenario: missing comparison inputs yield UNKNOWN
- **WHEN** either side lacks fingerprint and expectation identity
- **THEN** the relationship is `UNKNOWN` with no `possibleOriginalId`

### Requirement: a regression verdict requires mechanical chronology
`REGRESSION_CANDIDATE` SHALL require a proven prior fix AND a moved source
lineage.

#### Scenario: an unfixed prior outcome is not a regression
- **WHEN** the earlier outcome is not `RESOLVED_FIXED`
- **THEN** the relationship is not `REGRESSION_CANDIDATE`

### Requirement: the offline rehearsal never confers live authorization
Every rehearsal receipt, on every scenario, SHALL carry `liveAuthorization`
`NOT_CONFERRED_SYNTHETIC_ONLY`.

#### Scenario: a passing rehearsal leaves live readiness missing
- **WHEN** the clean passive scenario reaches `LOCAL_REHEARSAL_PASS`
- **THEN** live prerequisites and authorization remain missing

### Requirement: tracked source may only resolve declared dependencies
A package reached by tracked source SHALL be declared in the manifest.

#### Scenario: an undeclared resolved package fails the build
- **WHEN** tracked source resolves a package absent from the manifest
- **THEN** `hardening:check` fails closed
