# Audit — session mutation authority binding (NW-AUD-006)

Campaign activation measured in the owned C-00 worktree at base
`caab10e91b8d81f2b98597b3c6974db89638ae6c`, with the canonical checkout
clean, on 2026-09-21. This record is the implementation campaign's audit
artifact; it closes NW-AUD-006 only when the delta spec's scenarios and this
file's acceptance gates hold on an integrated checkpoint.

## Defect under closure

The exhaustive repository audit recorded, with zero-mutation dry-run
evidence: every lifecycle command accepted `--root`; `release` rewrote the
selected live ownership record without binding the caller or the expected
session; and `integrate` treated the selected target's `OWNED_SESSION` class
as sufficient authority to reach its fetch/push path. A process in the
canonical checkout could therefore plan another live session's release or
integration. Session identities and revisions are public freshness/intent
values, so the remediation is cooperative confused-deputy protection, not
cryptographic isolation from a hostile same-user process.

## What this campaign changes

- Mutators derive authority only from the Git top-level containing
  `process.cwd()`; the executing CLI must resolve inside that same worktree;
  `--root` is refused for mutators and retained read-only for
  `status`/`check`.
- `release`/`reconcile`/`integrate`/`remove`/`--adopt` require the exact
  public `--expect-session`; `integrate` additionally requires the exact
  40-hex `--expect-head`.
- `release`/`reconcile`/`integrate` admit active-task/STATE continuity before
  effects.
- Ownership-record transitions hold a bounded exclusive no-follow lock with a
  canonical full-record revision compare-and-swap, durable same-directory
  publication and reread verification; a crashed lock is recovered only by
  explicit `recover` proof and never by editing a record.
- Integration admits before its first fetch callback, holds the lock through
  push and verification, preserves `SESSION_PUSH_REJECTED`, and reports a
  verified remote with unverifiable local finalization as
  `SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN` without
  retrying.

## Measured at activation

- `npx playwright test tests/unit/workspaceIsolation.test.ts --workers=1` —
  67 passed.
- `npx playwright test tests/unit/sessionMutationAuthority.test.ts
  --workers=1` — 11 passed.
- `npm run typecheck` — PASS.
- `npm run typecheck:bin` — REPORTING lane unchanged (the CLI was already
  non-conforming; no new gate is claimed here).
- `node bin/hardening-check.mjs --probe-campaign
  --only=checkC00WorkspaceIntegrity` — 10 probes, 10 detected.
- `openspec validate nightwatch-session-mutation-authority-binding-v1
  --strict` — PASS.
- `npm run workspace:check`, `npm run agent:check`, `npm run
  hardening:check` — PASS at the registered checkpoint.

## Constraints

Local, deterministic, no-network except the existing explicit fast-forward
integration push. No Alphaus contact, no data-plane or cloud operation, no
sibling mutation, no publication, no force push, and no hostile same-user
security claim. Other sessions are never touched.

## Acceptance / completion gates

- Every scenario in `specs/concurrency-workspace-hardening/spec.md` holds,
  including wrong-checkout refusal for every mutator, expectation mismatch,
  lock/revision conflicts, crashed-lock recovery, pre-network admission, the
  uncertain-finalization result, and read-only cross-root inspection.
- The non-vacuous matrix runs canonical plus at least two linked worktrees
  and asserts byte-for-byte protected state with zero fetch/push on refusal.
- The hardening rule and its recorded probes keep each control detected.
- The change is integrated through the C-00 lifecycle with the active task
  closed and the project truth updated.
