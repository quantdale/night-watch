# replay-budget-dossier Specification

## Purpose
TBD - created by archiving change nightwatch-replay-budget-and-dossier-closure-v1. Update Purpose after archive.
## Requirements
### Requirement: Replay budget and dossier closure

1. The system MUST reproduce the existing three-journey replay-starvation case
   in a deterministic local test before changing budget semantics.
2. A fresh current DVR-011-admitted candidate MUST be able to reserve replay
   capacity under the new model when authorized budget remains.
3. The new model MUST retain an explicit finite cap for collection and replay.
4. A campaign with no admitted candidates MUST NOT spend replay budget.
5. Duplicate candidates or clusters MUST NOT multiply replay authority.
6. Stale manifests and source drift MUST fail before replay execution.
7. Checkpoint/resume and interruption MUST NOT double-spend budget or duplicate
   replay execution.
8. Capture-incomplete, auth-blocked, framework, and environment outcomes MUST
   remain non-product replay authority.
9. Budget exhaustion MUST remain fail closed and truthfully classified.
10. Existing safety/privacy/containment invariants MUST remain unchanged.
11. A fresh guarded DEV confirmation SHOULD take one current candidate through
    replay and, if reproduced, minimization and dossier generation.
12. If real confirmation cannot obtain a fresh candidate, the task MUST close
    with a blocked/starved confirmation result rather than weakening admission.

#### Scenario: replay authority is bounded and fail-closed
- **WHEN** a campaign requests replay authority under the new model
- **THEN** a fresh current DVR-011-admitted candidate MUST be able to reserve replay capacity while authorized budget remains and the model MUST retain an explicit finite cap
- **AND** a campaign with no admitted candidates or with duplicate candidates MUST NOT spend or multiply replay budget, and budget exhaustion MUST remain fail closed

