## ADDED Requirements

### Requirement: Immutable audit universe
The audit SHALL bind its coverage claim to an exact Git starting SHA and SHALL enumerate every tracked path at that snapshot into a coverage class. A later repository change MUST NOT be silently included in or omitted from the claimed universe.

#### Scenario: Starting inventory is established
- **WHEN** the audit campaign begins
- **THEN** it records the exact starting SHA and a deterministic tracked-path inventory whose classified count equals the tracked-file count

#### Scenario: Main advances during the audit
- **WHEN** current `origin/main` no longer equals the starting snapshot before closure
- **THEN** the audit records the drift and reconciles every changed path or refuses to claim exhaustive completion

### Requirement: Complete subsystem coverage matrix
The audit SHALL maintain coverage rows for runtime source, browser and API paths, safety and containment, evidence and persistence, source and semantic intelligence, campaigns and autonomous runtime, Control Center, CLI and validation tooling, configuration and dependencies, tests and fixtures, continuity and workspace machinery, OpenSpec, and durable documentation. Generated, corpus, archived, and historical paths MUST receive an explicit class and MUST NOT disappear from the denominator.

#### Scenario: Coverage is non-vacuous
- **WHEN** the coverage matrix is evaluated
- **THEN** every tracked path belongs to at least one declared class and every class records its inspection method, evidence, and final disposition

#### Scenario: A path is intentionally not inspected in detail
- **WHEN** a generated, archived, corpus, or historical path is not reviewed line by line
- **THEN** its class records why sampling or invariant-based inspection is sufficient and which generator, validator, digest, or historical boundary supplies evidence

### Requirement: Evidence-backed candidate lifecycle
Every candidate SHALL carry a stable identifier, affected path or subsystem, concrete failure mode, trigger or reachability, consequence, existing mitigation analysis, evidence references, confidence, and lifecycle state. Only candidates with decisive current evidence MAY become MATERIAL.

#### Scenario: Suspicious code is observed
- **WHEN** inspection identifies a plausible defect or weakness without decisive reachability or consequence evidence
- **THEN** the audit records it as OBSERVED and does not present it as a confirmed issue or create an implementation proposal

#### Scenario: Candidate is substantiated
- **WHEN** current code, deterministic validation, or an existing failing test proves the failure mode and its impact
- **THEN** the candidate may advance to SUBSTANTIATED and then MATERIAL only after severity and existing-plan coverage are adjudicated

#### Scenario: Candidate is rejected
- **WHEN** stronger implementation or test evidence disproves the suspected failure mode
- **THEN** the candidate is retained with terminal disposition NOT_AN_ISSUE and the contrary evidence is recorded

### Requirement: Consistent severity and confidence
Each MATERIAL finding SHALL record severity and evidence confidence separately. Severity MUST consider safety/privacy consequence, correctness or integrity impact, operational blast radius, trigger reachability, and likelihood or recurrence.

#### Scenario: High-impact boundary lacks validation
- **WHEN** a missing negative test leaves a safety-critical behavior unproved but no implementation bypass is demonstrated
- **THEN** the audit records the validation gap at a severity justified by the unverified consequence and records confidence separately from impact

#### Scenario: Critical or High severity is assigned
- **WHEN** a finding is ranked Critical or High
- **THEN** its evidence identifies a credible reachable path to the claimed severe consequence and existing mitigations are shown insufficient

### Requirement: Existing-work deduplication
Before a MATERIAL finding receives a new remediation proposal, the audit SHALL compare it with current implementation, published specs, active OpenSpec changes, task state, decisions, and tests. Similar naming MUST NOT count as coverage unless the existing requirements and acceptance criteria close the same failure mode.

#### Scenario: Existing change fully covers the finding
- **WHEN** an active or completed change contains requirements and tasks that close the same root cause and acceptance boundary
- **THEN** the finding is marked DUPLICATE with exact artifact references and no new remediation change is created

#### Scenario: Existing change only partially covers the finding
- **WHEN** related work omits the observed trigger, consequence, or acceptance case
- **THEN** the audit records the gap and creates a separately owned follow-up proposal without editing another session's change

### Requirement: Planning-only safety boundary
The audit SHALL use local read-only inspection and deterministic synthetic validation only. It MUST NOT modify product implementation, dependencies, generated product artifacts, sibling repositories, or external systems, and MUST NOT contact DEV, NEXT, production, authenticated, data-plane, or cloud surfaces.

#### Scenario: Validation would require a prohibited surface
- **WHEN** a candidate can only be confirmed through real-environment, authenticated, data-plane, cloud, or sibling-mutation activity
- **THEN** the candidate is classified DEFERRED_EXTERNAL_EVIDENCE with the exact unblock condition and is not promoted to a confirmed defect

#### Scenario: Audit diff is inspected at closure
- **WHEN** the campaign prepares its final checkpoint
- **THEN** every changed tracked path is a task-continuity or OpenSpec planning artifact and any product-path change fails completion

### Requirement: Exhaustive completion proof
The audit SHALL NOT claim completion until every coverage row has a final disposition and every MATERIAL finding maps to exactly one owning remediation change or an explicit evidence-backed blocker. Search exhaustion alone MUST NOT establish completion.

#### Scenario: Coverage or disposition is incomplete
- **WHEN** any tracked path is unclassified, any coverage row lacks evidence, or any MATERIAL finding lacks an owning proposal
- **THEN** the campaign remains IN_PROGRESS or BLOCKED and cannot report exhaustive completion

#### Scenario: Completion audit passes
- **WHEN** every coverage row is closed, every candidate is terminal, every MATERIAL finding has an owning validated proposal, and the planning-only diff check passes
- **THEN** the campaign may record a complete audit snapshot with residual uncertainties and deferred external-evidence items explicitly listed
