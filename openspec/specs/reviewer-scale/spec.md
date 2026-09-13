# reviewer-scale Specification

## Purpose

The reviewer surface SHALL present the whole projected evidence at scale, with every element's epistemic class declared, the privacy boundary preserved, and local review state never mistaken for organizational sign-off.

## Requirements
### Requirement: the active-task routing block binds to the active campaign
The `## Routing and safety` block of `.agent/ACTIVE_TASK.md` SHALL declare
the same campaign identity and session worktree as the active task's own
continuity fields, for every non-NONE active task.

#### Scenario: a predecessor routing block fails closed
- **WHEN** the routing block names a campaign or session worktree other
  than the active task's
- **THEN** `npm run agent:check` fails with
  `ACTIVE_TASK_ROUTING_CAMPAIGN_DRIFT` and names both values

#### Scenario: a missing routing block is not silently accepted
- **WHEN** a non-NONE active task declares no routing and safety block
- **THEN** `npm run agent:check` fails closed rather than skipping the check

### Requirement: reviewer intelligence is projected, never re-authored
The Control Center reviewer projection SHALL derive every relationship,
duplicate, recurrence, defect class, expectation provenance and confidence
value from `findingIntel` and `findingReview` outputs only.

#### Scenario: the reviewer surface cannot invent a classification
- **WHEN** a projected element has no corresponding cone output
- **THEN** the projection fails closed rather than emitting a default

### Requirement: every reviewer element declares its epistemic class
Each projected element SHALL carry `epistemicClass` of exactly `FACT`,
`RECOMMENDATION` or `UNKNOWN`, derived from mechanical provenance.

#### Scenario: an advisory value is never projected as fact
- **WHEN** the source value carries `advisoryOnly`
- **THEN** its `epistemicClass` is `RECOMMENDATION`, never `FACT`

#### Scenario: UNKNOWN is rendered as UNKNOWN
- **WHEN** a value is `UNKNOWN`
- **THEN** the surface renders it as UNKNOWN and offers no pointer that a
  reviewer could read as a weak affirmative

### Requirement: local review state is never organizational sign-off
The reviewer surface SHALL carry `organizationalAuthority`
`NONE_LOCAL_REVIEW_ONLY` on every review element it displays.

#### Scenario: the surface cannot display an organizational verdict
- **WHEN** a review element carries any other organizational authority
- **THEN** the projection fails closed

### Requirement: the reviewer projection preserves the privacy boundary
No raw customer value SHALL cross the reviewer projection boundary into
the Control Center surface, its API payloads, or its error messages.

#### Scenario: a planted sentinel does not reach the surface
- **WHEN** a sentinel value is planted in any projected field
- **THEN** the projection rejects it and the sentinel is absent from the
  payload

### Requirement: finding-intelligence scale is measured before it is optimized
Finding-intelligence cost SHALL be measured at 1,000, 5,000 and 10,000
findings for CPU time, peak resident memory and wall latency, in a fresh
process, before any optimization lands.

#### Scenario: an optimization without a measurement is not admitted
- **WHEN** an algorithmic change is proposed with no recorded measurement
  showing the cost it removes
- **THEN** the change is not admitted in this campaign

#### Scenario: a claimed improvement is a measured delta
- **WHEN** an optimization lands
- **THEN** the same harness re-runs and the report records before and
  after values at the same corpus sizes

### Requirement: a synthetic scale corpus never becomes a real finding
Generated scale corpora SHALL be synthetic, deterministic and local, and
SHALL NOT enter the owner-only finding store or any durable finding record.

#### Scenario: a scale corpus is not persisted as findings
- **WHEN** the scale harness completes
- **THEN** no finding store write has occurred

