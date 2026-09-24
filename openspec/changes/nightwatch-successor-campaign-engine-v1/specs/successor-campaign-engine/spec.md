## ADDED Requirements

### Requirement: Successor work is evidence-led and separately scoped

The programme SHALL rank current executable work using impact, confidence,
executability, and risk; SHALL reproduce a candidate before implementation; and
SHALL preserve each selected campaign in a distinct child task/OpenSpec.

#### Scenario: A new candidate is selected
- **WHEN** current evidence identifies a stronger executable local defect
- **THEN** the programme records its reproduction and opens a distinct child
  task/OpenSpec before implementation

### Requirement: Campaign checkpoints are recoverable and C-00 bound

Each campaign SHALL record its baseline, reproduction, invariant, focused
validation, adversarial review, exact checkpoint, safety counters, and resume
recipe. Integration SHALL use one owned session and exact expectations.

#### Scenario: A campaign is interrupted
- **WHEN** a session ends before its next milestone
- **THEN** STATE and the exact resume recipe identify the next safe action
  without reopening a completed predecessor

### Requirement: Completion claims are terminal and truthful

The programme SHALL claim COMPLETE only after material authorized work is
completed, validated, or deliberately rejected with evidence. External blockers
and speculative/harmful remainder SHALL be reported honestly.

#### Scenario: Meaningful work remains blocked
- **WHEN** a material local campaign cannot proceed because a safety or
  workspace invariant fails
- **THEN** the programme reports BLOCKED with the exact unblock condition and
  does not claim completion
