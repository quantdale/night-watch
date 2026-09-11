# review-persistence Specification

## Purpose
TBD - created by archiving change nightwatch-owner-local-review-persistence-v1. Update Purpose after archive.
## Requirements
### Requirement: terminal safety accounting cannot contradict itself
A campaign task whose `STATE.md` records one or more entries under
`## Safety Events` SHALL NOT carry a `REPORT.md` asserting that no safety
events occurred.

#### Scenario: a report claiming NONE over a recorded event fails closed
- **WHEN** a task `STATE.md` records at least one safety event and its
  `REPORT.md` `Safety events:` line asserts `NONE`
- **THEN** `npm run agent:check` fails with
  `TASK_SAFETY_EVENT_ACCOUNTING_CONTRADICTION` naming the task

#### Scenario: a task with no recorded event may report NONE
- **WHEN** a task `STATE.md` records no safety events
- **THEN** a `REPORT.md` asserting `Safety events: NONE` passes

### Requirement: the review store lives outside the repository
The owner-local review store root SHALL be absolute, symlink-free at every
component, owner-only, and outside both the Nightwatch repository and the
sibling workspace root.

#### Scenario: a root inside the repository is refused
- **WHEN** the derived review-store root resolves inside the repository
- **THEN** construction fails with `PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY`
  and no file is created

#### Scenario: the derived root is not reported as a test root
- **WHEN** the store derives its canonical root rather than receiving one
- **THEN** its policy record reports `rootClass: OUTSIDE_REPOSITORY`

### Requirement: a stored review is immutable
A published review SHALL NOT be replaced, edited or removed by any store
operation.

#### Scenario: a second write to one identity is refused
- **WHEN** a review is published and a second write targets the same review
  identity
- **THEN** the second write fails with `REVIEW_STORE_ALREADY_DECIDED` and the
  canonical bytes are byte-identical to the first write

#### Scenario: competing writers produce one winner
- **WHEN** two writers race the same review identity
- **THEN** exactly one succeeds, the other receives
  `REVIEW_STORE_ALREADY_DECIDED`, and the stored file is neither corrupt nor
  partially merged

### Requirement: a review is keyed by its binding, not its finding id
The review identity SHALL be a deterministic digest of the complete review
binding.

#### Scenario: a regenerated artifact does not overwrite history
- **WHEN** a finding keeps its id but its dossier is regenerated and reviewed
  again
- **THEN** both reviews exist in the store under distinct identities and the
  earlier receipt remains readable

### Requirement: every read validates before it answers
A store read SHALL revalidate the envelope schema, the record binding, the
receipt through the canonical `verifyReviewCurrent`, the recomputed review
identity, the terminal state, and the organizational authority.

#### Scenario: corrupt bytes never read as current
- **WHEN** stored bytes are truncated, malformed, or carry an unknown schema
  version
- **THEN** the read state is `CORRUPT` or `REVIEW_STORE_VERSION_UNSUPPORTED`
  and never `CURRENT`

#### Scenario: a tampered receipt is detected
- **WHEN** a stored receipt's decision, rationale, timestamp or binding is
  edited without recomputing its review id
- **THEN** the read fails with `REVIEW_STORE_RECEIPT_TAMPERED`

#### Scenario: a changed artifact makes a stored review stale
- **WHEN** the current finding, dossier, handoff, source SHA, campaign,
  handoff version or privacy projection version differs from the binding
- **THEN** the read state is `STALE` and the decision is not projected as
  live

### Requirement: history is never deleted automatically
The store SHALL NOT delete a stored review because its artifacts changed.

#### Scenario: a stale review survives regeneration
- **WHEN** a dossier is regenerated after a review was stored
- **THEN** the stored review remains present and readable as `STALE`

### Requirement: local review never acquires organizational authority
A persisted review SHALL carry `organizationalAuthority:
NONE_LOCAL_REVIEW_ONLY`, and a stored value other than that literal SHALL
fail closed.

#### Scenario: an edited authority is refused
- **WHEN** a stored receipt's `organizationalAuthority` is changed to any
  other value
- **THEN** the read fails and the review is never projected as valid

### Requirement: the reviewer surface projects real local review state
The Control Center reviewer projection SHALL report the persisted review
state for a finding, distinguishing no review, a current decision and a
stale decision.

#### Scenario: an unreviewed finding stays UNKNOWN
- **WHEN** no stored review binds a finding
- **THEN** its `localReview` element is `UNKNOWN` with a `NO_LOCAL_REVIEW`
  basis and no decision value

#### Scenario: a stale decision is not shown as live
- **WHEN** a stored review exists but its binding no longer matches current
  artifacts
- **THEN** `bindingCurrentness` is `STALE`

#### Scenario: persisted state survives a server restart
- **WHEN** a decision is written by one server process and read by a later
  one over the same store
- **THEN** the decision is visible with `bindingCurrentness: CURRENT`

### Requirement: the review write authority is narrow
The Control Center review-decision route SHALL accept only a canonical
decision enum, a bounded sentinel-screened rationale and the exact current
review identity, and SHALL write only review-store artifacts.

#### Scenario: a mismatched binding is refused
- **WHEN** the submitted review identity differs from the identity the server
  recomputes from current state
- **THEN** the request is refused and nothing is written

#### Scenario: a sensitive rationale never persists
- **WHEN** a rationale contains a sentinel, credential, token or address
  shape, or exceeds the bound
- **THEN** the request is refused and no file is created

#### Scenario: a second decision fails server-side
- **WHEN** a decided finding receives a second decision request, bypassing
  the UI
- **THEN** the server refuses it and the stored decision is unchanged

### Requirement: dossier identity is carried, never derived
Expectation and semantic-contract identity SHALL be propagated only from
mechanically established upstream evidence.

#### Scenario: a v2 dossier carries its identity forward
- **WHEN** a dossier carries semantic triage evidence
- **THEN** its `expectationId` and `invariantDefinitionId` reach the reviewer
  descriptor unchanged

#### Scenario: absent identity stays absent
- **WHEN** a dossier carries no semantic triage evidence
- **THEN** both identities are `null` and nothing is inferred from prose,
  severity, route or title

#### Scenario: an unsafe identity is dropped, not forwarded
- **WHEN** an upstream identity fails the safe-id or sentinel screen
- **THEN** it is projected as `null` rather than persisted or displayed

### Requirement: identity propagation does not over-collapse findings
Propagated identity SHALL NOT cause distinct findings to be classified as
duplicates.

#### Scenario: same expectation, different failure
- **WHEN** two findings share an expectation identity but differ in
  fingerprint and failure
- **THEN** the classification records shared-expectation evidence without
  reporting `EXACT_SAME_FINDING`

#### Scenario: differing identities remain counterevidence
- **WHEN** two findings share a fingerprint but carry different expectation
  identities
- **THEN** the differing identity is recorded as counterevidence

