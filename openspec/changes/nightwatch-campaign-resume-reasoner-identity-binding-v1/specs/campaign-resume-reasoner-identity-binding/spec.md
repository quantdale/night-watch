## ADDED Requirements

### Requirement: Resume admits one reasoner generation

A paused local campaign SHALL resume only under the exact reasoner generation recorded in its progress envelope: resolved path, content digest, provider, model, and canonical argv digest.

#### Scenario: Resume swaps the executable script
- **WHEN** a paused campaign recorded identity A and resume supplies a different executable or argv
- **THEN** resume refuses categorically before any reasoner call

### Requirement: Omitted identity cannot resume a recorded generation

If the checkpoint recorded a reasoner identity, resume SHALL refuse when the caller omits path, digest, provider, or model rather than defaulting or copying stored values.

#### Scenario: Resume omits reasonerIdentity
- **WHEN** the progress envelope has a path/digest pair and resume input has none
- **THEN** resume fails closed with a mismatch class

### Requirement: Stored identity is compared, not only echoed

Parsing and returning `reasonerIdentity` SHALL NOT satisfy continuity. The live driver SHALL be admitted only after byte-equal comparison with the stored generation.

#### Scenario: Provider label changes
- **WHEN** path and digest match and provider or model differs
- **THEN** resume refuses

### Requirement: Comparison precedes driver use

Identity mismatch SHALL throw before `ReasonerDriver.complete` and SHALL NOT mutate campaign progress, remaining budget, or investigation state.

#### Scenario: Mismatch is detected
- **WHEN** resume identity does not match the checkpoint
- **THEN** zero reasoner processes are spawned and the paused checkpoint remains unread as an execution authority

### Requirement: Adversarial resume proof exists

Tests SHALL cover omitted identity, path mismatch, digest mismatch, provider/model swap, argv swap, and the current pause/resume caller.

#### Scenario: Current swap test is inverted
- **WHEN** mutation restores driver construction from live caller fields without comparison
- **THEN** the focused resume-identity suite fails
