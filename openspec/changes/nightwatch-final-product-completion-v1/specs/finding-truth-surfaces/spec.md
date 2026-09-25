## ADDED Requirements

### Requirement: Protocol dossier readiness is a derived verdict
A protocol dossier SHALL be READY only when minimization ended MINIMIZED or
UNCHANGED, the fresh exact replay REPRODUCED, and no safety rejection
occurred. Otherwise it SHALL be persisted as incomplete or UNRESOLVED. A campaign
SHALL NOT become COMPLETE_WITH_FINDINGS, create a bug candidate, or record a
READY promotion from a dossier that is not READY.

#### Scenario: Minimization reports NO_REPRODUCTION
- **WHEN** a protocol anomaly passes reproduction but minimization ends
  NO_REPRODUCTION
- **THEN** the dossier is not READY, no READY ledger entry or promotion is
  recorded, and the campaign is not COMPLETE_WITH_FINDINGS

### Requirement: Control Center status projection is total
The Control Center SHALL map every dossier status to a distinct displayed
value. READY SHALL come only from a readiness verdict, UNRESOLVED SHALL
display as unresolved, and a malformed status SHALL display as UNKNOWN.

#### Scenario: V2 UNRESOLVED dossier
- **WHEN** a v2 dossier has status UNRESOLVED
- **THEN** the findings view shows UNRESOLVED, not INCOMPLETE

### Requirement: Replay admission levels require role-typed contexts
Anomaly admission SHALL reach L1 only with one FIRST_OBSERVATION plus one
FRESH_CONTEXT_REPLAY, and L2 only with an added BOUNDED_REPETITION. Each role
SHALL have a distinct run ID. Run labels without roles SHALL NOT raise the
level.

#### Scenario: Two first observations
- **WHEN** two different work items both report FIRST_OBSERVATION for the
  same fingerprint
- **THEN** the admission level stays below L1

### Requirement: Campaign state and findings have separate private subtrees
Orchestrator checkpoints, manifests and briefs SHALL be written to a
campaign-state subtree, and agent findings to an agent-findings subtree. The
findings authority SHALL filter to dossier families before applying byte
budgets, and SHALL expose its reason codes. Existing files SHALL remain
readable. Nightwatch SHALL NOT migrate owner-local files without an
owner-gated step.

#### Scenario: Legacy campaign files in the findings root
- **WHEN** the findings root still holds legacy campaign checkpoint files
- **THEN** the findings view lists the dossiers it contains, and reports the
  legacy files as a separate reason code instead of going UNKNOWN

### Requirement: Control Center data views show real data within bounds
The Runs view SHALL read a bounded newest-N window across the real run roots,
and SHALL report `RUN_EVIDENCE_WINDOW_TRUNCATED` when it truncates. Tests SHALL
write run evidence only to a test-scoped root. An agent-campaign view SHALL
list campaigns, termination classes, admission states and candidate IDs
without absolute paths. The Safety Center SHALL be computed from owner scope,
workspace integrity and session status. Local readiness currentness SHALL be
computed, or labelled not wired.

#### Scenario: More than 256 run directories
- **WHEN** the run root holds 300 run directories
- **THEN** the Runs view shows the newest window with a truncation reason,
  not UNAVAILABLE

#### Scenario: Safety Center request
- **WHEN** the Safety Center is requested
- **THEN** it returns measured checks, not UNKNOWN with zero checks

### Requirement: Heuristic and synthetic results are labelled as such
Regex-based source analyzers SHALL produce HEURISTIC results that cannot feed
candidate selection as mechanically proven. Synthetic-only coverage, gap and
plan reports SHALL be labelled synthetic preview. Semantic evaluations with
NOT_APPLICABLE, INVALID_INPUT or truncated evidence SHALL be incomplete,
never PASS.

#### Scenario: Match inside a comment
- **WHEN** a TS analyzer pattern matches only inside a comment
- **THEN** no MECHANICALLY_PROVABLE contract is produced

#### Scenario: Every item lacks the typed field
- **WHEN** a collection item contract evaluates to NOT_APPLICABLE for every
  item
- **THEN** the outcome is incomplete, not FULLY_EVALUATED_PASS

### Requirement: Source reads are bound to one snapshot and one root
Source discovery SHALL re-check each repository's HEAD after its scan, and
SHALL mark the scan stale if HEAD moved. Candidate inputs SHALL NOT hard-code
`sourceSnapshotMatches: true`. Every consumer SHALL resolve the sibling root
through one resolver that honours `NIGHTWATCH_REPOS_ROOT`.

#### Scenario: Sibling checkout moves during a scan
- **WHEN** a sibling repository's HEAD changes between the start and end of a
  scan
- **THEN** the surface is reported stale and not cached as current

#### Scenario: Override set
- **WHEN** NIGHTWATCH_REPOS_ROOT points at another directory
- **THEN** source intelligence, the Control Center source view, and
  historical context all read that directory
