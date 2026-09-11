# Requirements — DEV Capture Soak, Replay, and Yield

## ADDED Requirements

### Requirement: DEV Capture Soak, Replay, and Yield

1. The executor MUST validate Git, safety, source identity, and owner-managed
   auth before DEV contact.
2. Each real invocation MUST be recorded independently; retries MUST NOT erase
   previous outcomes.
3. Capture metrics MUST distinguish settlement, intentional known-read body
   capture, bounded failure codes, and product/framework/environment/auth
   classification.
4. The sample SHOULD target 10 Phase 2C, 5 Phase 4, 5 Phase 5, and 5 fresh
   Phase 7 campaigns unless a stop-worthy defect or auth/environment boundary
   ends the authorized sample.
5. Historical or stale candidates MUST NOT authorize replay.
6. Only fresh DVR-011-admitted candidates MAY enter attack replay.
7. Replay starvation MUST be reported explicitly when zero current candidates
   exist.
8. Critical/High Nightwatch defects MUST be repaired before further DEV work.
9. Safety and privacy counters MUST remain explicit and fail closed.
10. Final reporting MUST quantify capture rate, account-inventory reach,
    candidate/replay/dossier conversion, and remaining limitations.

#### Scenario: DEV Capture Soak, Replay, and Yield

- **WHEN** the authorized DEV capture soak, replay, and yield campaign executes
- **THEN** every numbered requirement above SHALL hold, and the final report SHALL quantify capture rate, account-inventory reach, candidate/replay/dossier conversion, and remaining limitations.
