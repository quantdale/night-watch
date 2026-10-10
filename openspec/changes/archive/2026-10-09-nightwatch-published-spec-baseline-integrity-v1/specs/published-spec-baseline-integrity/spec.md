## ADDED Requirements

### Requirement: The archive index SHALL be a complete, parseable 1:1 table

`openspec/changes/archive/ARCHIVE-INDEX.md` SHALL declare schema
`nightwatch.openspec-archive-index.v1` and SHALL contain a single markdown
table whose data rows are exactly the archived change directories.

Each data row SHALL have four columns: Change, Task status, Classification,
Reason. The Change cell SHALL be a non-empty change id (the archive directory
name with the `YYYY-MM-DD-` prefix stripped). The Change cell SHALL NOT be a
bare integer, `undefined`, or empty.

Every directory `openspec/changes/archive/<date>-<id>/` SHALL have exactly one
row. Every row SHALL name a directory that exists. Duplicate change ids SHALL
fail.

A `CAPABILITY_BEARING` row's Reason SHALL list one or more published spec
names, and each name SHALL exist as `openspec/specs/<name>/spec.md`. A
`BLOCKED_NOT_PUBLISHED` row SHALL list zero published spec names.

The check SHALL run in the required `AGENT_CONTINUITY` or `HARDENING_CHECK`
group and SHALL fail the group on any violation. The index remains a tracked
markdown file; the parser is the authority for well-formedness, not human
eyeballing.

#### Scenario: the trailing garbage row fails the check

- **WHEN** the index contains a row whose Change cell is `54` or `undefined`
- **THEN** the check reports `ARCHIVE_INDEX_MALFORMED_ROW` with the line
  number
- **AND** the owning gate group fails

#### Scenario: a missing archive directory fails the check

- **WHEN** a row names `nightwatch-example-v1` and
  `openspec/changes/archive/` has no directory whose stripped name is that id
- **THEN** the check reports `ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY`
- **AND** the owning gate group fails

#### Scenario: a published spec name that does not exist fails the check

- **WHEN** a `CAPABILITY_BEARING` row says `published: not-a-real-spec`
- **AND** `openspec/specs/not-a-real-spec/spec.md` is absent
- **THEN** the check reports `ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING`
- **AND** the owning gate group fails

#### Scenario: a well-formed 1:1 index passes

- **WHEN** every archive directory has exactly one well-formed row and every
  published name exists
- **THEN** the index clause of this requirement passes

### Requirement: A published spec Purpose SHALL not be an archive stub

Every file `openspec/specs/<capability>/spec.md` SHALL contain a `## Purpose`
section whose body is not empty, not `TBD`, and not the archive-CLI
placeholder `TBD - created by archiving change`.

The Purpose SHALL state, in one short paragraph, what the capability
requires of Nightwatch. Filling a Purpose SHALL NOT alter requirement
headings, scenario headings, or any SHA, receipt, count, or date already in
the spec body.

`openspec validate --specs --strict` SHALL still pass after the fills.

#### Scenario: the archive stub fails the check

- **WHEN** a published spec Purpose is `TBD - created by archiving change nightwatch-control-center-render-truth-v1. Update Purpose after archive.`
- **THEN** the check reports `PUBLISHED_SPEC_PURPOSE_STUB` naming the
  capability
- **AND** the owning gate group fails

#### Scenario: a one-paragraph purpose passes

- **WHEN** the Purpose states the capability in operator-readable language
  and is not a TBD stub
- **THEN** the Purpose clause of this requirement passes

#### Scenario: filling a Purpose does not rewrite requirements

- **WHEN** a Purpose line is updated under this requirement
- **THEN** every `### Requirement:` heading and `#### Scenario:` heading in
  that file is unchanged
- **AND** no receipt digest, SHA, or census figure in the body is altered
