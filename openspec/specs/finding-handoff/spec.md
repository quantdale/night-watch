# finding-handoff Specification

## Purpose
TBD - created by archiving change nightwatch-alphaus-finding-handoff-c12-readiness-v1. Update Purpose after archive.
## Requirements
### Requirement: canonical-dossier projection

The handoff SHALL project the canonical `BugDossier` (and optional AI bug
draft), never a parallel finding model. Dossier identity SHALL be
`candidateId`. Facts SHALL pass closed vocabularies and bounded shapes;
free-text drafts SHALL be sentinel-scanned in full before projection.

#### Scenario: a dossier is projected

- **WHEN** a finding is projected for handoff
- **THEN** it SHALL be the canonical `BugDossier` (with optional AI bug draft) under identity `candidateId`, never a parallel finding model

### Requirement: evidence-gated recommendations

Severity, catch-stage, source, team, and report-type recommendations SHALL
each carry basis + provenance or be UNKNOWN. Asserted consequence classes
without provenance, non-READY dossiers, and sub-L2 evidence SHALL yield
UNKNOWN severity. Production observation without outage evidence SHALL yield
`production`, never `production_outage`. LOCAL/DEV/SOURCE_ANALYSIS SHALL
yield UNKNOWN catch stage. `customer_escaped` SHALL be preserved exactly and
SHALL have no path to `self_found`. Team SHALL be UNKNOWN; code owner SHALL
have no representation.

#### Scenario: a recommendation is evidence-gated

- **WHEN** a severity, catch-stage, source, team, or report-type recommendation is produced
- **THEN** it SHALL carry basis + provenance or be UNKNOWN

### Requirement: non-weakable authority

Every artifact SHALL carry `humanReviewRequired: true`,
`executable: false`, `externalPublication: 'PROHIBITED'`, `autoFile: false`,
`autoApprove: false` as literal types. No bounty-scoring field SHALL exist.

#### Scenario: a handoff artifact is emitted

- **WHEN** a handoff artifact is emitted
- **THEN** it SHALL carry `humanReviewRequired: true`, `executable: false`, `externalPublication: 'PROHIBITED'`, `autoFile: false`, `autoApprove: false` as literal types, and no bounty-scoring field SHALL exist

# C-12 Readiness Preflight

### Requirement: local-only advisory evaluation

Readiness SHALL be evaluated purely from caller-supplied descriptors with an
injected clock: no browser, DNS, HTTP, credential access, or authorization
consumption. All applicable BLOCKED_* codes SHALL report in one pass.
INFERRED deployment facts SHALL block. Missing or Nightwatch-created
subjects SHALL block. UNKNOWN attribution SHALL block. The evaluator SHALL
share no import edge with P1/C-11 machinery.

#### Scenario: readiness is evaluated locally

- **WHEN** readiness is evaluated
- **THEN** readiness SHALL be evaluated purely from caller-supplied descriptors with an injected clock, all applicable BLOCKED_* codes SHALL report in one pass, INFERRED deployment facts, missing or Nightwatch-created subjects, and UNKNOWN attribution SHALL block, and no browser, DNS, HTTP, credential access, or authorization consumption SHALL occur

