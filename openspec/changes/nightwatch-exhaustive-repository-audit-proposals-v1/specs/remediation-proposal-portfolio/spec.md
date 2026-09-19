## ADDED Requirements

### Requirement: Coherent remediation boundaries
Each remediation change SHALL own one root cause or atomic architecture boundary with compatible implementation ownership, sequencing, and validation. Unrelated findings MUST NOT be bundled solely because they were discovered in the same audit wave.

#### Scenario: Findings share an atomic root cause
- **WHEN** multiple MATERIAL findings arise from the same authority, state machine, normalization boundary, or lifecycle defect and can be validated together
- **THEN** they may share one remediation change with each finding identifier explicitly mapped

#### Scenario: Findings only share a broad theme
- **WHEN** findings affect different authorities or require independent rollout and acceptance
- **THEN** they receive separate remediation changes even if both are categorized as security, reliability, performance, or maintainability

### Requirement: Complete OpenSpec artifact set
Every remediation change SHALL include a proposal, design when architecture or risk warrants it, one delta specification for every introduced or modified capability, and an ordered actionable task list. Every artifact MUST follow the resolved OpenSpec schema instructions.

#### Scenario: Material finding is ready for proposal
- **WHEN** a finding reaches MATERIAL after deduplication
- **THEN** its owning change identifies why it matters, affected capabilities, design decisions and alternatives, normative requirements with scenarios, implementation sequence, and validation tasks

#### Scenario: Artifact depends on earlier context
- **WHEN** design, specifications, or tasks are generated
- **THEN** all completed dependency artifacts are read first and the later artifact remains consistent with their scope and terminology

### Requirement: Positive, negative, and regression acceptance
Every remediation specification SHALL define observable corrected behavior, the unsafe or incorrect state that MUST be rejected or handled, and regression behavior for adjacent valid inputs. Concurrency, cleanup, privacy, boundedness, determinism, and fail-closed scenarios MUST be included when relevant to the root cause.

#### Scenario: Safety boundary remediation
- **WHEN** a finding affects authorization, containment, redaction, provenance, or evidence truth
- **THEN** the spec contains an adversarial negative scenario proving the unsafe path fails closed before side effects and a positive scenario preserving authorized behavior

#### Scenario: Reliability remediation
- **WHEN** a finding affects partial failure, restart, timeout, race, or cleanup behavior
- **THEN** the spec includes the interrupted or concurrent state and the required deterministic terminal outcome with no leaked resource or fabricated success

### Requirement: Actionable and dependency-aware tasks
Tasks SHALL name the affected subsystem, implementation intent, focused tests, migration or compatibility work, and validation command. Cross-change prerequisites MUST be explicit and MUST NOT rely on an unstated execution order.

#### Scenario: Change has a prerequisite
- **WHEN** one remediation depends on another contract or migration landing first
- **THEN** the proposal and tasks name the prerequisite change and include a refusal or compatibility step for the pre-prerequisite state

#### Scenario: Task can be executed by a fresh agent
- **WHEN** a later implementation agent reads the change artifacts
- **THEN** it can identify the files or modules, required behavior, negative tests, validation gates, and completion condition without repeating the audit

### Requirement: Bidirectional finding-to-change traceability
The portfolio SHALL maintain a one-owner mapping from each MATERIAL finding to a remediation change and a reverse mapping from every remediation change to its substantiated finding identifiers. A finding MUST NOT be silently dropped or multiply owned.

#### Scenario: Portfolio mapping is checked
- **WHEN** the final proposal portfolio is audited
- **THEN** every MATERIAL finding appears exactly once as owned and every created remediation change references at least one substantiated finding

#### Scenario: Finding is intentionally deferred
- **WHEN** a MATERIAL issue cannot be proposed because a required owner decision or prohibited external evidence is missing
- **THEN** it retains an explicit blocker, unblock condition, consequence, and interim risk disposition rather than disappearing from the mapping

### Requirement: Strict validation and planning-only closure
Every created OpenSpec change SHALL reach apply-ready status and pass strict validation before the audit can close. No implementation task may be marked complete, and no product file may be changed as evidence of proposal completion.

#### Scenario: Change fails schema validation
- **WHEN** any proposal artifact is missing, inconsistent, malformed, or not apply-ready
- **THEN** the portfolio remains incomplete and the artifact is repaired before closure

#### Scenario: All proposals validate
- **WHEN** each created change is apply-ready, strict validation passes, traceability is complete, and the diff contains only planning artifacts
- **THEN** the portfolio may be handed off for separately authorized implementation
