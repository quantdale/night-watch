# Run-evidence transaction successor v1 — Report

Status: COMPLETE

- Starting SHA: `a215f8e971b82796b9d278dd362f8b200d5ec9e3`
- Status: COMPLETE
- Problem: same-run recorder reuse and durable divergence can produce a false
  passing summary.
- Reproduction: synthetic A/B evidence is recorded in the parent task.
- Changes: exclusive run-directory admission, fsync-backed appends, integrity
  latch, durable JSONL reconciliation, and four new transaction regressions.
- Validation: focused evidence suite 19/19; typecheck/hardening/schema PASS;
  identity/latch mutations detected in disposable archives.
- Validation: focused evidence suite 19/19; typecheck/hardening/schema PASS;
  identity/latch mutations detected in disposable archives. `gate:dev` and
  `gate:milestone` each retain 12 baseline/source-drift failures, with no new
  run-evidence failure.
- Safety: NONE; temporary synthetic runs only.
- Remaining: preserve the blocked child and select popup L0 readiness next.
  Full arbitrary-SIGKILL journal recovery is explicitly not claimed.

## Closure record (2026-10-10, parent campaign M13 task 14.2)

The BLOCKED status recorded above was accurate when written and is preserved
verbatim; it is closed here against receipts rather than rewritten. The blocker
was the independently reproduced live-source drift residual (12 failures on the
certified baseline), never a defect in this child's own scope. The parent
campaign's M3 live-source hermeticity work (tasks 4.1/4.2) cleared it and the
M8 follow-through closed this child's residual scope. Closure receipts and the
NW-AUD original reconciliation are recorded in the task STATE.md's Completion
Snapshot and in audit.md's M13 14.1 record.
