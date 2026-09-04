# Spec — explain-surface argument forms

## Both documented orders must work

`explain-surface --repo=<id> --surface=<sid>` (README order) and
`explain-surface --repo=<id> <sid>` (positional order) MUST both
resolve `<sid>` to the same explanation for a proven surface id.
Malformed ids MUST still fail `EXPLAIN_SURFACE_ID_UNSAFE`. On conflict
(flag and positional disagree), the explicit flag wins —
deterministic and documented in code.
