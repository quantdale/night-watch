# Spec — Schema version lifecycle

Closes F-17. Measured at `36bd493`: `src` declares **319 distinct
`nightwatch.<name>.v<n>` schema identifiers**, and **25 names already carry
more than one version** — `bug-dossier.private` 18 version literals,
`real-source-expectation-recipe` 15, `minimization-budget.private` 13,
`quality-gate-receipt` 6. Persisted state fails closed on mismatch with no path
forward: `src/core/reviewStore/store.ts:102` yields
`REVIEW_STORE_VERSION_UNSUPPORTED`, and `src/core/campaign/checkpoint.ts:341`
yields `CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED`. The read
policy's four answers are `NO_REVIEW`, `CURRENT`, `STALE`, `CORRUPT` — there is
no `MIGRATABLE`.

## ADDED Requirements

### Requirement: A persisted schema SHALL be distinguishable from an in-memory one

Of 319 schema identifiers, some describe values that live only inside one
process and some describe bytes on the owner's disk. Bumping the first is free;
bumping the second destroys owner state. Nothing in the codebase marks which is
which, so an author editing a version literal cannot know which they are doing.

A declaration SHALL record, for every schema identifier: whether it is
persisted, where it is persisted when it is (the review store, the finding
store, campaign checkpoints, private artifacts, gate receipts, `.agent` records),
its current version, and the versions a reader still accepts.

A structural rule SHALL fail when a schema identifier exists in `src` with no
declaration, and when a declaration names a schema that no longer exists. The
rule SHALL assert a non-zero discovered count so a scanner that stops matching
fails loudly.

Changing the version of a persisted schema SHALL require the change to carry a
migration disposition (below). Changing an in-memory schema SHALL require
nothing beyond the declaration staying accurate.

#### Scenario: an undeclared schema fails
- **WHEN** a new `nightwatch.<name>.v<n>` literal appears in `src` with no
  declaration
- **THEN** `hardening:check` fails naming the identifier and the file

#### Scenario: a persisted bump without a disposition fails
- **WHEN** a schema declared persisted has its version raised
- **THEN** the check fails until the change carries a migration disposition

#### Scenario: the scan is non-vacuous
- **WHEN** the scanner discovers zero schema identifiers
- **THEN** the check fails before evaluating declarations

### Requirement: A persisted-schema change SHALL carry an explicit migration disposition

The current behaviour — refuse and classify as corrupt — is correct as a
default and wrong as the only option, because it silently converts the owner's
accumulated judgement into unreadable files. Reviews in
`$HOME/.nightwatch/reviews` are keyed by their complete binding, never
overwritten, never automatically deleted, and are the most valuable state the
system holds.

Every persisted-schema version change SHALL declare exactly one disposition:

- **`MIGRATE`** — a deterministic, total, pure function from the old shape to
  the new one, with the old shape's validator retained so the input is
  validated before it is migrated. Migration SHALL be non-destructive: the
  original bytes are retained until the migrated record is written and
  re-read successfully, consistent with the existing immutable-write and
  no-replace patterns.
- **`READ_COMPATIBLE`** — the new reader accepts the old version unchanged; the
  declaration lists the accepted versions and a test asserts an old-version
  record still reads.
- **`ORPHAN`** — the old records become unreadable, and this is accepted. The
  disposition SHALL state why migration is impossible or unjustified, and SHALL
  require the notice requirement below.

A change with no disposition SHALL fail. `ORPHAN` SHALL be an explicit owner
decision recorded in `docs/DECISIONS.md`, never a default reached by omission.

#### Scenario: a migration is validated before it is applied
- **WHEN** an old-version record is migrated
- **THEN** it is validated against the old version's validator first
- **AND** a record that fails the old validator is reported corrupt, not
  migrated

#### Scenario: migration is non-destructive
- **WHEN** a migration writes a new record
- **THEN** the original is retained until the new record is written and
  re-read successfully
- **AND** an interrupted migration leaves the original readable

#### Scenario: read compatibility is proven, not asserted
- **WHEN** a schema declares `READ_COMPATIBLE`
- **THEN** a test reads a fixture at each accepted version
- **AND** removing support for one fails that test

#### Scenario: orphaning is a recorded decision
- **WHEN** a change declares `ORPHAN`
- **THEN** the reason is recorded in `docs/DECISIONS.md`
- **AND** a change that omits the disposition fails the check

### Requirement: The owner SHALL be told what a version change costs, before and after

An orphaned store today is silent: the owner discovers it when a review that
existed yesterday reads as `NO_REVIEW` or `CORRUPT`. There is no count, no
notice and no export.

At change time, a persisted-schema bump SHALL report the affected stores and
the disposition in the campaign's own output, so the cost is visible when the
decision is made rather than when a user hits it.

At read time, a store encountering records at an unsupported version SHALL
report a distinct state — `VERSION_UNSUPPORTED` with the found version and the
count of affected records — rather than folding them into `CORRUPT`. `CORRUPT`
means damaged; an old but intact record is not damaged. The Control Center
reviewer surface SHALL render the distinction, because an owner's response
differs: a corrupt record is a defect to report, an unsupported one is a
migration to run.

A bounded export SHALL exist so an owner can preserve records a migration
cannot carry: `npm run retention:*`-style, read-only, producing a sanitized
dump through the existing redaction layer, writing outside the repository, and
never included in any gate.

#### Scenario: an old record is unsupported, not corrupt
- **WHEN** a store reads an intact record at a superseded version
- **THEN** it reports `VERSION_UNSUPPORTED` with the found version
- **AND** a structurally damaged record still reports `CORRUPT`

#### Scenario: the reviewer surface distinguishes the two
- **WHEN** the Control Center renders a review whose record is unsupported
- **THEN** it states that the record predates the current schema and names the
  migration
- **AND** it does not present it as a defect

#### Scenario: the affected count is reported at change time
- **WHEN** a persisted schema is bumped
- **THEN** the campaign output names each affected store and the disposition

#### Scenario: export is sanitized and external
- **WHEN** the export runs
- **THEN** output passes the redaction layer and is written outside the
  repository
- **AND** no raw customer value, credential or absolute private path is
  emitted

### Requirement: Resume across a contract version change SHALL be recoverable or explicitly terminal

`checkpoint.ts` refuses a resume when a runtime contract version differs, which
prevents a campaign from continuing under changed semantics — correct. The
consequence is that a version bump abandons every in-flight campaign with no
statement of what was abandoned.

A refused resume SHALL report the checkpoint's identity, the work items already
completed, the versions that differ, and whether the campaign can be restarted
from its manifest without repeating completed work. Where the completed ledger
remains valid under the new contract, a restart SHALL be able to consume it;
where it does not, the refusal SHALL say so and the campaign SHALL be marked
terminal rather than left pending forever.

#### Scenario: a refused resume explains itself
- **WHEN** resume is refused for a contract version mismatch
- **THEN** the refusal names the differing versions and the completed work
  items
- **AND** it states whether a restart can consume the existing ledger

#### Scenario: an unrecoverable campaign is terminal, not pending
- **WHEN** the completed ledger is invalid under the new contract
- **THEN** the checkpoint is marked terminal with the reason
- **AND** it is not reported as resumable
