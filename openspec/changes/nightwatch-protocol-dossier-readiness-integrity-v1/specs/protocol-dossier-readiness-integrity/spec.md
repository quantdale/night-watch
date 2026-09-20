## ADDED Requirements

### Requirement: Protocol readiness has one derived authority

The system SHALL derive one protocol triage verdict from replay, minimization, safety/privacy, false-positive, and critical-gap evidence before any dossier persistence or promotion side effect. Every downstream readiness consumer SHALL use that verdict.

#### Scenario: Fresh replay does not reproduce
- **WHEN** the exact replay returns a different fingerprint or no target failure
- **THEN** the protocol record is unresolved, no READY dossier or ledger entry is created, and the campaign does not count a finding

#### Scenario: Minimization is invalid or budget-exhausted
- **WHEN** minimization ends `INVALID_ORIGINAL` or `BOUNDED_BUDGET_EXHAUSTED`
- **THEN** the attempt remains non-ready and records the exact categorical reason

### Requirement: Persistence cannot precede readiness truth

The system SHALL publish READY protocol bytes only after the canonical verdict is READY. Failed or interrupted triage MAY publish a distinct incomplete record but SHALL NOT publish the READY v1 shape.

#### Scenario: Failure occurs after minimization
- **WHEN** replay evidence is non-reproducing and a private store is configured
- **THEN** no READY artifact is visible at the destination

### Requirement: Promotion and summaries exclude unresolved protocol attempts

Bug-candidate ledgers, promotion results, morning briefs, and final campaign result classes SHALL exclude unresolved protocol attempts.

#### Scenario: Lifecycle already failed reproduction
- **WHEN** the cluster lifecycle is UNRESOLVED after `FAIL_REPRODUCTION`
- **THEN** a later compatibility branch cannot append READY or make `hasAdmittedFindings` true

### Requirement: Fresh-context confidence requires context provenance

Fresh-context reproduction counts SHALL be derived from distinct attested context-generation identities. Browser/API agreement SHALL remain differential evidence and SHALL NOT count as a second context.

#### Scenario: Browser and API outcomes agree in one run
- **WHEN** both channels report the same failure but only one browser context generation exists
- **THEN** fresh-context reproduction count remains one

### Requirement: Adversarial protocol cases are tested

Tests SHALL cover wrong fingerprints, executor invalidity, budget exhaustion, store failure, partial campaign interruption, duplicated context labels, and mutations that restore unconditional READY behavior.

#### Scenario: READY constant is restored by mutation
- **WHEN** a mutation bypasses the derived verdict
- **THEN** the focused protocol promotion suite fails
