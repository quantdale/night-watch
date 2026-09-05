# Spec — Review Operations, History and Review-Aware Filing

## ADDED Requirements

### Requirement: The review-store inventory SHALL be read-only by construction

The inventory SHALL obtain its store through a handle whose write methods
refuse, rather than through a writable handle it merely declines to use. It
SHALL NOT delete, rewrite, repair, archive, move, rename, change permissions,
or alter any timestamp in the store.

#### Scenario: A writable operation is structurally unavailable
- **WHEN** the inventory path holds its store handle
- **THEN** every write method of that handle SHALL throw
  `PRIVATE_ARTIFACT_READ_ONLY`

#### Scenario: Inventory leaves the store byte-identical
- **GIVEN** a store whose entries have recorded names, sizes, mtimes and modes
- **WHEN** the inventory runs
- **THEN** every recorded name, size, mtime and mode SHALL be unchanged, and
  the root directory's own mode and mtime SHALL be unchanged

### Requirement: Integrity and currentness SHALL be independent axes

The inventory SHALL classify each canonical artifact's integrity as `VALID` or
`CORRUPT` from the store alone, and its currentness as `CURRENT`, `STALE` or
`UNKNOWN`. Currentness SHALL be `UNKNOWN` unless a caller supplies the current
artifacts, and the inventory SHALL NOT derive currentness from the store.

#### Scenario: A store-only inventory claims no currentness
- **WHEN** the inventory runs with no currentness resolver
- **THEN** every artifact's currentness SHALL be `UNKNOWN` and the report SHALL
  state that currentness was not resolved

#### Scenario: A corrupt generation is never hidden by a valid sibling
- **GIVEN** one finding with one valid and one corrupt stored generation
- **THEN** the inventory SHALL report exactly one `VALID` and one `CORRUPT`
  artifact for that finding

### Requirement: Store health SHALL report every condition that holds

Health SHALL carry a sorted set of all conditions that hold, drawn from a
closed vocabulary, together with a single highest-precedence classification.
Ordinary stale history SHALL NOT be classified as corruption.

#### Scenario: Corruption and unknown entries coexist
- **GIVEN** a store containing one corrupt artifact and one unrecognized file
- **THEN** `conditions` SHALL contain both `CORRUPTION_PRESENT` and
  `UNKNOWN_FILES_PRESENT`, and `classification` SHALL be `CORRUPTION_PRESENT`

#### Scenario: Stale history alone is not corruption
- **GIVEN** a store whose only non-current artifacts are valid stale generations
- **THEN** `classification` SHALL be `STALE_HISTORY_PRESENT` and `conditions`
  SHALL NOT contain `CORRUPTION_PRESENT`

### Requirement: Unrecognized store entries SHALL be preserved and never echoed

An entry whose name matches neither the canonical nor the temporary shape SHALL
be counted and reported as `UNKNOWN_STORE_ENTRY` by digest of its name and its
size. Its name SHALL NOT appear in any output, and the entry SHALL NOT be
opened, parsed or removed.

#### Scenario: An unknown file carrying a sentinel name does not leak
- **GIVEN** an unrecognized store entry whose name contains a planted sentinel
- **WHEN** the inventory is rendered as JSON, as CLI text and through the
  Control Center
- **THEN** no output SHALL contain the sentinel, and the entry SHALL still exist
  after the run

### Requirement: Review history SHALL be deterministic and derived from records

Generations SHALL be ordered by `storedAt`, then `reviewedAt`, then
`reviewIdentity`, never by filesystem enumeration order or filename. The
current generation SHALL be identified by `verifyReviewCurrent` against the
supplied current artifacts, never by recency.

#### Scenario: Shuffled directory order yields an identical history
- **GIVEN** the same store read twice with the entry order reversed
- **THEN** the two history documents SHALL be byte-identical

#### Scenario: The newest generation is not assumed current
- **GIVEN** a finding whose newest stored generation does not bind to the
  current artifacts and whose older one does
- **THEN** the older generation SHALL be reported as the current generation

### Requirement: Historical review generations SHALL remain distinct from the current one

A stale generation SHALL be presented as historical evidence and SHALL NOT be
rendered as the current decision on any surface.

#### Scenario: The UI separates current from historical
- **THEN** the current generation and the historical generations SHALL carry
  distinct textual labels, not colour alone

### Requirement: Rows SHALL be bounded while counts remain global

Any listing of individual artifacts, findings or generations SHALL carry
explicit `offset`, `limit`, `total` and `truncated`. Aggregate counts MAY be
global and exact.

#### Scenario: A large store returns exact counts and a bounded page
- **GIVEN** a store of 50,000 artifacts
- **THEN** the reported total SHALL be exact and the returned rows SHALL not
  exceed the requested limit

### Requirement: The human filing report SHALL distinguish four review states

The report SHALL render `NO_REVIEW`, `CURRENT`, `STALE` and `CORRUPT`
distinctly. A stale decision SHALL NOT be presented as current. A corrupt
review SHALL fail closed and present no decision. A current review SHALL carry
the explicit statement that it is not a Leslie genuine verdict, not a Leslie
invalid verdict, not a Pondr approval and not organizational sign-off.

#### Scenario: A stale review does not read as a decision in force
- **GIVEN** a finding whose only stored review is stale
- **THEN** the report SHALL state that a historical local review exists, that
  it does not bind to the current artifact, and that human review is required
  for this generation

#### Scenario: A corrupt review yields no decision
- **GIVEN** a finding whose only stored review fails validation
- **THEN** the report SHALL mark the local review unavailable and SHALL NOT
  name a decision or a resulting state

### Requirement: Finding history entries SHALL carry real identity or none

An `IntelHistoryEntry` SHALL carry the source identity of the observation it
represents, the expectation identity where one is mechanically established,
and the semantic-contract identity on the same terms. A value that is not
established SHALL be `null`. No identity SHALL be derived from prose, and no
source SHA SHALL be manufactured.

#### Scenario: No fabricated source SHA reaches history
- **THEN** no history entry produced by the reviewer authority SHALL carry a
  forty-zero source SHA, and where no source evidence exists the entry SHALL
  carry the same named absence the review binding records

### Requirement: A regression candidate SHALL require a moved source lineage

`REGRESSION_CANDIDATE` SHALL be reported only when a prior entry is
`RESOLVED_FIXED` and its source identity differs from the candidate's. Where
the candidate carries no source identity, movement is unproven and the
classification SHALL fall back to `RECURRENT`.

#### Scenario: A prior fix at the same source is not a regression
- **GIVEN** a prior `RESOLVED_FIXED` entry whose source identity equals the
  candidate's
- **THEN** the recurrence SHALL be `RECURRENT`, not `REGRESSION_CANDIDATE`

#### Scenario: A stored review is not evidence of a fix
- **GIVEN** a finding with any number of stored local review decisions
- **THEN** no recurrence classification SHALL treat those decisions as a proven
  prior fix

### Requirement: A terminal COMPLETE report SHALL NOT use a live-authority marker for a historical anchor

`DISCOVER_FROM_GIT` names a value Git can answer now. A stable historical
anchor is not such a value. A terminal `REPORT.md` SHALL record its
implementation anchor as a concrete SHA already known before the document was
committed, or as an explicit statement that the campaign added no
implementation.

#### Scenario: The marker is refused where Git cannot answer
- **GIVEN** a COMPLETE task whose `STATE.md` declares
  `LAST_VALIDATED_IMPLEMENTATION_SHA`
- **WHEN** its `REPORT.md` records `Implementation anchor: DISCOVER_FROM_GIT`
- **THEN** the continuity check SHALL fail closed

#### Scenario: Live fields keep the marker
- **THEN** `Live HEAD` and `origin/main` SHALL remain permitted to carry
  `DISCOVER_FROM_GIT`

### Requirement: This campaign SHALL implement no retention or deletion policy

No automatic deletion, retention, archival or pruning of review artifacts SHALL
be implemented. Analysis of future options SHALL be recorded as an explicitly
undecided owner question.

#### Scenario: No destructive review-store operation exists
- **THEN** the review-operations cone SHALL contain no call that removes,
  renames, truncates or replaces a canonical review artifact
