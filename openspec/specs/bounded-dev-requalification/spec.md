# bounded-dev-requalification Specification

## Purpose
TBD - created by archiving change nightwatch-dev-requalification-v1. Update Purpose after archive.
## Requirements
### Requirement: Bounded serial DEV requalification

Nightwatch SHALL run the authorized real-DEV requalification through the
existing guarded launchers in a fixed serial order: three Phase 2C
observations, one Phase 4 observation, one Phase 5 observation, and one
campaign prepare/resume sequence. Each invocation SHALL remain read-only and
bounded by the existing target, proxy, authentication, and safety gates.

#### Scenario: All guards pass

- **WHEN** the external owner-managed state is page-readable and every
  launcher gate passes
- **THEN** Nightwatch executes the fixed serial sample and records a sanitized
  result for each invocation

#### Scenario: A guard blocks an invocation

- **WHEN** authentication, target, repository freshness, proxy, or safety
  validation fails
- **THEN** Nightwatch stops before the blocked operation and records the
  categorical reason without substituting a synthetic or retry result

### Requirement: Strict outcome accounting

Every attempted observation SHALL retain its sanitized outcome category,
including clean, deterministic replay mismatch, product-state variation,
timing-only variation, environment divergence, auth divergence, framework
capture defect, and unknown/unclassified divergence. A later retry SHALL be a
new observation and SHALL NOT relabel an earlier result.

#### Scenario: First run diverges and later run is clean

- **WHEN** an earlier strict replay run diverges and a later bounded run passes
- **THEN** the report contains both outcomes and does not claim deterministic
  reliability for the earlier run

#### Scenario: Auth expires during execution

- **WHEN** authentication becomes unusable before or during a work item
- **THEN** the work item is classified as auth divergence or auth blocked and
  is not reported as a product failure

### Requirement: Sanitized private evidence

Requalification evidence SHALL contain only bounded safe metadata such as
operation identity, timestamps, counts, classifications, safe fingerprints,
and cleanup/state receipts. Credentials, cookies, storage-state bytes, raw
responses, raw DOM, customer values, and authenticated traces SHALL never be
written to Git, task documents, or shared artifacts.

#### Scenario: Product anomaly is observed

- **WHEN** a guarded read-only operation finds a product anomaly
- **THEN** Nightwatch stores one stable sanitized finding identity and minimal
  owner-local evidence without raw customer or authentication values

#### Scenario: Sensitive evidence would be emitted

- **WHEN** a diagnostic path would include a secret, raw response, or raw page
  value
- **THEN** the safety boundary rejects or redacts the diagnostic before it is
  persisted

### Requirement: Campaign state and cleanup truth

The requalification SHALL verify persisted campaign state and process/browser
cleanup after each bounded operation. An interrupted or incomplete operation
MUST NOT be reported as `COMPLETE_CLEAN`, and completed work MUST NOT be
silently duplicated on resume.

#### Scenario: Campaign prepare and resume complete

- **WHEN** a prepared campaign resumes from its persisted manifest and all
  selected work items complete
- **THEN** the result records the campaign identity, completion state, counts,
  and cleanup outcome using sanitized evidence

#### Scenario: Resume state is incomplete

- **WHEN** a checkpoint, manifest, or evidence write is incomplete or stale
- **THEN** Nightwatch fails closed or resumes only the explicit pending work
  and records the recovery classification

### Requirement: Truthful project-state transition

The active continuity task SHALL declare its verdict effect explicitly and
SHALL preserve `OPERATIONALLY_ACCEPTED` only while the evidence campaign has
not established a reason to invalidate it. Any invalidating evidence SHALL
trigger an explicit state transition and SHALL never be hidden by changing
task names, retrying, or editing historical records.

#### Scenario: Bounded observation remains inconclusive

- **WHEN** all results are clean, blocked, or product/environment-classified
  without evidence that invalidates the earned project verdict
- **THEN** the successor closes with explicit `PRESERVE` and the project
  remains `OPERATIONALLY_ACCEPTED`

#### Scenario: Evidence invalidates acceptance

- **WHEN** a validated Nightwatch or operational result genuinely invalidates
  the project verdict
- **THEN** the task stops and records the explicit reevaluation/failure state
  through the project-state protocol before any further campaign work

