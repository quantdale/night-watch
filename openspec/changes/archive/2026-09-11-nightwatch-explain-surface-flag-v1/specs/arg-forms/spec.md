# Spec — explain-surface argument forms

## ADDED Requirements

### Requirement: Both documented orders must work

`explain-surface --repo=<id> --surface=<sid>` (README order) and
`explain-surface --repo=<id> <sid>` (positional order) MUST both
resolve `<sid>` to the same explanation for a proven surface id.
Malformed ids MUST still fail `EXPLAIN_SURFACE_ID_UNSAFE`. On conflict
(flag and positional disagree), the explicit flag wins —
deterministic and documented in code.

#### Scenario: Both documented orders must work

- **WHEN** `explain-surface --repo=<id> --surface=<sid>` or `explain-surface --repo=<id> <sid>` is invoked for a proven surface id
- **THEN** both orders SHALL resolve `<sid>` to the same explanation, a malformed id SHALL still fail `EXPLAIN_SURFACE_ID_UNSAFE`, and on conflict the explicit flag SHALL win.
