## Why

Every session lifecycle command accepts `--root`, but mutating commands trust
the ownership record found at that target rather than binding the invocation to
the caller's current worktree and expected ownership epoch. From the canonical
checkout, a process can therefore plan—and without `--dry-run` perform—the
release, adoption, reconciliation, or integration of another live session,
defeating the C-00 claim that integration and release are the session owner's
actions.

## What Changes

- **BREAKING**: remove arbitrary target selection from `claim`, `release`,
  `reconcile`, and `integrate`; these commands operate only on the invoking
  process's exact current Git worktree and refuse `--root` redirection.
- Require every owned-session mutation to name and match the expected session
  ID plus record revision, active task/campaign, branch, and current record
  digest before its first mutation or network callback.
- Make ownership-record transitions compare-and-swap, durable, and
  race-detecting so concurrent release/adopt/integrate updates cannot overwrite
  a newer owner state.
- Restrict `start` to the canonical checkout (or the already documented
  single-worktree bootstrap exception) and keep `remove` canonical-only with an
  exact target session identity and released/non-live proof.
- Bind integration to one explicit, head-specific owner intent after current
  workspace/continuity validation; foreign-root, stale-epoch, mismatched-task,
  and raced-record invocations must reach neither fetch nor push.
- Preserve read-only `status`/`check` inspection across an explicitly selected
  root and preserve C-00's fast-forward-only, no-force, no-rebase, clean-tree,
  prospective-capacity, rollback, and owner-attention behavior.
- Add a two-worktree adversarial matrix that invokes each mutator from the
  wrong checkout, races lifecycle transitions, and proves ownership records,
  Git refs, worktrees, working trees, and remote callbacks stay unchanged.
- State the cooperative threat boundary precisely: the protocol prevents
  accidental or confused-deputy cross-session action; it does not claim
  cryptographic isolation from a malicious process with the same OS account
  and unrestricted filesystem access.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `concurrency-workspace-hardening`: strengthen session ownership from a
  target-record classification into invocation-bound, epoch-checked authority
  for every lifecycle mutation and integration.

## Impact

Affected surfaces are `bin/nightwatch-session.mjs`, ownership-record schema and
transition helpers, workspace/active-task admission, operator CLI metadata and
documentation, C-00 adversarial tests, and hardening/mutation rules. No product
source, Alphaus environment, database, cloud, credential, general remote, or
publication authority is introduced; only the existing explicit integration
push remains, behind stricter owner-intent admission.
