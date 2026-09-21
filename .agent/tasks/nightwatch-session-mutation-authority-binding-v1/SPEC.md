# Session mutation authority binding implementation

## Task purpose

Implement and validate the strict-valid OpenSpec change
`nightwatch-session-mutation-authority-binding-v1` (NW-AUD-006) in this owned
session worktree: bind every mutating C-00 lifecycle command to the invoking
checkout and executing CLI, require explicit public session/HEAD expectations,
admit continuity coherence, serialize ownership-record transitions with a
bounded lock and revision compare-and-swap, restrict command roles, admit
integration authority before any network callback, and prove the cross-session
and race boundaries non-vacuously.

## Established starting state

- Implementation base: `caab10e91b8d81f2b98597b3c6974db89638ae6c` (`main`).
- Planning authority: `openspec/changes/nightwatch-session-mutation-authority-binding-v1/`
  (proposal, design, `concurrency-workspace-hardening` delta spec, tasks) is
  strict-valid and implementation-ready.
- Current defect: `bin/nightwatch-session.mjs` accepts `--root` for every
  command; `release` does not bind the caller or expected session, and
  `integrate` classifies only the selected target record before reaching its
  fetch/push path.
- Existing read-only inspection authority: `bin/workspace-integrity.mjs`
  (unchanged unless a bounded helper is required).

## Required deliverables

- Checkout/code binding: mutators derive authority only from the Git top-level
  containing `process.cwd()`; `--root` is refused for mutators with
  `SESSION_MUTATION_ROOT_OVERRIDE_REFUSED`; read-only `status`/`check` keep
  cross-root inspection.
- Explicit expectations: `--expect-session` for claim/adopt, release,
  reconcile, integrate and remove; `--expect-head` (40-hex) for integrate;
  mismatch fails closed before effects.
- Continuity admission for release/reconcile/integrate/adopt: record identity,
  task/campaign, branch, active-task routing, task STATE and command-compatible
  status.
- Serialized transitions: bounded exclusive owner-only no-follow lock, full
  canonical record revision, same-directory durable replacement, reread
  verification, no overwrite on conflict, explicit crashed-lock recovery.
- Command roles: `start` canonical-only, `claim`/adopt current linked
  worktree, `remove` canonical-only with exact name and session ID.
- Pre-network integration admission and the
  `SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN` outcome.
- Adversarial, race, lock and mutation-probe tests; atomic documentation and
  operator recipe updates.

## Non-goals

No hostile same-OS-user cryptographic isolation claim, no credential or secret
introduction, no force push, rebase, or automatic conflict resolution, no
Alphaus contact, no production/data/cloud access, no implementation outside
this change's scope.

## Safety constraints

All work is local and deterministic. This session's own lifecycle uses the
current validated CLI until the change is integrated; the canonical checkout
stays clean; the ownership record, refs and remote are mutated only through
the documented lifecycle commands.

## Declared Deletions

None.

## Acceptance criteria

- The OpenSpec delta-spec scenarios hold: foreign-root and foreign-checkout
  refusals, stale/mismatched expectations, lock/revision conflicts, command
  roles, pre-network admission, uncertain-outcome reporting, and read-only
  cross-root inspection.
- Non-vacuous tests cover canonical plus at least two linked worktrees, wrong
  checkout invocations for every mutator, races and crashed locks, with
  byte-for-byte protected-state assertions and zero fetch/push callbacks on
  refusal.
- `openspec validate nightwatch-session-mutation-authority-binding-v1 --strict`
  passes; focused suites, typechecks, hardening, workspace/agent/project
  checks and the applicable quality gates pass on the committed checkpoint.
