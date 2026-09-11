# Spec — Documentation currency

Closes F-08. Measured at `36bd493`: `docs/` totals 17,462 lines across 11
files — `DECISIONS.md` 4,663, `CURRENT_STATE.md` 3,999, `ROADMAP.md` 3,084,
`ARCHITECTURE.md` 2,198, `SAFETY_MODEL.md` 1,571.
`docs/HOST-CAPABILITY-MATRIX.md` §5 states the problem in the project's own
words: these are "append-heavy historical records … in which current and
historical truth are interleaved", and directs the reader to five documents
instead. That mitigation is correct and entirely unenforced.

## ADDED Requirements

### Requirement: The current-truth short list SHALL be mechanically enforced, not advisory

§5 names five documents that answer "where are we" and distinguishes them from
the archives that answer "how did we get here". Nothing prevents a campaign
from appending a current-sounding status to an archive, and nothing detects a
historical status being read as current — which is precisely the failure class
that produced DEF-FC-04 and the `PHASE_16CH` / `PHASE_12A` style rows that
still read as present tense.

A versioned `nightwatch.document-role.v1` declaration SHALL assign every file
under `docs/` exactly one role: `CURRENT_TRUTH`, `APPEND_ONLY_ARCHIVE`, or
`OPERATOR_REFERENCE`. `hardening:check` SHALL fail on an undeclared,
duplicate-declared or missing file.

An `APPEND_ONLY_ARCHIVE` SHALL be edit-restricted in the direction that can be
false: existing lines SHALL NOT be modified or deleted, only appended to. A
diff that modifies an existing archive line SHALL fail the check, with an
explicit escape for a declared correction that states what it corrects. This is
what makes "historical receipts, SHAs and decisions stay exactly as recorded" a
rule rather than an intention.

#### Scenario: an archive edit that rewrites history fails
- **WHEN** a diff modifies or deletes an existing line in an
  `APPEND_ONLY_ARCHIVE`
- **THEN** `hardening:check` fails naming the file and line
- **AND** an append-only diff to the same file passes

#### Scenario: an undeclared document fails closed
- **WHEN** a new file appears under `docs/` with no role declaration
- **THEN** `hardening:check` fails naming the file

### Requirement: A status word in an archive SHALL NOT be readable as current

The census-figure ledger already solves this problem for numbers: a document may
state a census figure only in a form the ledger supports. The same mechanism
SHALL extend to status words, which are the other class of stale claim that
misleads a reader.

The ledger SHALL declare the current value of each governed status key
(`PROJECT_COMPLETION_STATUS`, each `PHASE_*_STATUS`, each lane class, each
campaign disposition). A document SHALL state a governed status either as the
ledger's current value, or in an explicitly historical form that names the
checkpoint it describes.

The check SHALL be narrow for the same reason the figure ledger is narrow:
documents legitimately carry historical statuses, and a heuristic sweep over
every capitalized token would be wrong. Only declared keys are governed, and a
governed key stated without a current value or a historical qualifier fails.

#### Scenario: a bare stale status fails
- **WHEN** a document states `PHASE_12A_STATUS: BLOCKED_EXTERNAL_CI` with no
  checkpoint qualifier and the ledger's current value differs
- **THEN** the check fails naming the document, line and key

#### Scenario: a qualified historical status passes
- **WHEN** the same status is stated as the value at a named SHA or date
- **THEN** the check passes

#### Scenario: the ledger is the only writer
- **WHEN** a governed status changes
- **THEN** the ledger is updated and every governed document is re-checked
- **AND** a document carrying the previous value fails

### Requirement: The five current-truth documents SHALL be readable end to end

`CURRENT_STATE.md` is 3,999 lines of which `project:check` governs one bounded
block. A reader cannot be expected to find current truth inside it, and the §5
instruction to read it is currently an instruction to read four thousand lines.

The `CURRENT_TRUTH` documents SHALL be bounded: each SHALL have a stated
maximum length, and content that exceeds it SHALL move to an
`APPEND_ONLY_ARCHIVE` with a dated pointer rather than accumulating. The
archives keep everything; the current documents stay readable.

Migration SHALL be a move, not a rewrite: text relocated into an archive SHALL
be byte-identical to the text removed, and the check SHALL verify that
correspondence so no receipt or measurement is lost in the split.

#### Scenario: a current document over its bound fails
- **WHEN** a `CURRENT_TRUTH` document exceeds its declared maximum
- **THEN** `hardening:check` fails naming the document and both lengths

#### Scenario: relocation preserves bytes exactly
- **WHEN** content moves from a current document to an archive
- **THEN** the archived text is byte-identical to the removed text
- **AND** a modified relocation fails the correspondence check

### Requirement: README SHALL describe the system as measured, not as intended

`README.md` describes safety, lanes and commands accurately and says nothing
about what the framework has found. A reader concludes it is a working
bug-hunting framework with a strong safety model; the measured yield is zero
(F-03) and eighteen declared checks have never run (F-02).

`README.md` SHALL carry a short, ledger-governed status block: the current
validation lane classes, the measured yield, the semantic layer's acceptance
class, and the production path's stage. Each figure SHALL come from the ledger,
so it cannot go stale silently.

#### Scenario: the README status block is governed
- **WHEN** any governed figure or status changes
- **THEN** the README block fails the ledger check until updated

#### Scenario: absence is stated, not omitted
- **WHEN** a lane has never executed
- **THEN** the README states its class and the reason
- **AND** it is not omitted from the block
