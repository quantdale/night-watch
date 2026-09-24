# Run-evidence transaction successor v1 — Report

- Starting SHA: `a215f8e971b82796b9d278dd362f8b200d5ec9e3`
- Status: BLOCKED
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
