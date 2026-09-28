## ADDED Requirements

### Requirement: PROVEN lanes require exact evidence
A validation lane of class PROVEN SHALL carry a 40-hex `evidenceSha`. A commit
that changes a PROVEN subject's `evidenceSha` to null, or changes any lane
class, SHALL be classified substantive.

#### Scenario: Documentary null-out
- **WHEN** a commit sets a PROVEN lane's `evidenceSha` to null and changes
  nothing else
- **THEN** the lane-state validator rejects it and the commit is classified
  substantive

### Requirement: Evidence artifacts are checked at their SHA
Each binding SHALL declare its evidence artifact paths. project:check SHALL
verify every path exists at the bound SHA, for conditions and for lanes. A
missing artifact SHALL make only that condition not MET, with
`EVIDENCE_ARTIFACT_ABSENT_AT_SHA`.

#### Scenario: Artifact added after the bound commit
- **WHEN** a binding cites SHA X and its artifact was first added in a
  descendant of X
- **THEN** that condition is not MET with `EVIDENCE_ARTIFACT_ABSENT_AT_SHA`

### Requirement: No self-certifying evidence tokens
The literal `HEAD` SHALL be invalid as an evidence SHA. project:check SHALL
require the bindings file and its schema, and a schema-invalid entry SHALL
NOT fall back to legacy locations.

#### Scenario: HEAD token
- **WHEN** any binding or legacy field contains `HEAD`
- **THEN** validation fails and nothing resolves to the live HEAD

### Requirement: Corrections are admitted only with their matching removal
A commit that appends a document-role correction SHALL be documentary only
when the same commit removes exactly the archive line that correction exempts.

#### Scenario: Correction appended with no removal
- **WHEN** a commit appends a correction entry but removes no archive line
- **THEN** the commit is classified substantive

### Requirement: The checkpoint-role classifier is proven
Unit tests SHALL cover values-only, append-only, rename, added-key, null and
merge-commit cases. A mutation probe that stubs the guard SHALL be detected.
Guarded paths SHALL NOT be approved by path alone.

#### Scenario: Guard stubbed
- **WHEN** the probe replaces the guard with one that always holds
- **THEN** the probe campaign reports the mutation as detected

### Requirement: Release probes resolve at the certified checkpoint
A release probe SHALL resolve MET only by executing in a checkout whose HEAD
equals the certified checkpoint with a clean tree, or by consuming a receipt
bound to that checkpoint. Otherwise it SHALL resolve `NOT_AT_CHECKPOINT`.
G18 SHALL consume a UI-harness execution receipt. G12 SHALL consume a
yield-campaign receipt with `passed: true` bound to the checkpoint. G19 and
G21 SHALL execute their contracts.

#### Scenario: Dirty HEAD ahead of S
- **WHEN** project:check runs at a HEAD that is not the certified checkpoint
- **THEN** every probe reports `NOT_AT_CHECKPOINT` and none is MET

#### Scenario: Local smoke run present
- **WHEN** the only local run is a passive smoke run
- **THEN** G12 is not MET

### Requirement: The implemented flag is structurally honest
A hardening rule SHALL compare `RELEASE_ADVANCE_CHECKS` and the probe
collector's keys by parsing them, and SHALL fail when a check is marked
implemented without a probe, or is unimplemented while a probe exists.

#### Scenario: Probe removed
- **WHEN** a probe is deleted while its check stays `implemented: true`
- **THEN** hardening fails

### Requirement: The bin type-check ratchet covers every file
Every non-conforming bin SHALL have a per-file ceiling equal to its measured
count, and a total ceiling SHALL exist. Any increase, or any ceiling above the
measured count, SHALL fail.

#### Scenario: New diagnostics in an unceilinged bin
- **WHEN** an edit adds a diagnostic to any bin
- **THEN** the ratchet fails
