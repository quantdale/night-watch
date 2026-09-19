Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze command authority and threat model

- [ ] ~~1.1 Define the mutating versus read-only command matrix, allowed
  invocation checkout class, required expected values, compatible continuity
  statuses, and first forbidden effect for every command.~~
- [ ] ~~1.2 Define fixed refusal/result codes and bounded safe diagnostics for
  foreign root, script/current mismatch, session/head mismatch, continuity
  mismatch, transition conflict, and post-push local uncertainty.~~
- [ ] ~~1.3 Document that session IDs/revisions are public freshness values
  and C-00 is cooperative confused-deputy protection, not hostile same-user
  cryptographic isolation.~~

## 2. Bind mutations to current checkout and code

- [ ] ~~2.1 Split parser/dispatcher handling so `--root` remains valid only
  for read-only `status`/`check` and every mutator returns
  `SESSION_MUTATION_ROOT_OVERRIDE_REFUSED` before context mutation.~~
- [ ] ~~2.2 Implement symlink-safe comparison of process current Git top-level
  and the checkout containing the executing session CLI; reject ambiguity or
  mismatch before authority reads and callbacks.~~
- [ ] ~~2.3 Add focused tests for root/subdirectory handling, script from a
  foreign checkout, symlinked current/script paths, bare/detached/unknown
  repositories, and unchanged cross-root read-only inspection.~~

## 3. Add explicit session, HEAD, and continuity expectations

- [ ] ~~3.1 Add `--expect-session` to claim/adopt, release, reconcile,
  integrate, and remove, plus `--expect-head` to integrate, with exact bounded
  parsers and help/metadata declarations.~~
- [ ] ~~3.2 Build one pure admission core for current session ID, canonical
  record revision, ownership state, task/campaign, role, branch, workspace
  class, active-task routing, task STATE, and command-compatible status.~~
- [ ] ~~3.3 Ensure adoption requires the exact predecessor session and creates
  a fresh identity that invalidates all predecessor commands while continuing
  to refuse a live owner.~~
- [ ] ~~3.4 Emit copy-safe next commands after start/claim/status without
  treating public expectations as credentials or emitting absolute paths in
  JSON.~~

## 4. Serialize ownership-record transitions

- [ ] ~~4.1 Implement bounded owner-only, exclusive, no-follow sibling
  transition locks carrying command/session/boot/process/start/operation
  identity and deterministic validation.~~
- [ ] ~~4.2 Implement canonical full record revisions, revision comparison,
  owner-only same-directory durable replacement, directory flush, reread
  verification, and never-overwrite-on-conflict behavior.~~
- [ ] ~~4.3 Route claim, release, reconcile, integrate-record update, and any
  lock recovery through the common lock/revision transition core.~~
- [ ] ~~4.4 Add explicit crashed-lock inspection/recovery that never reclaims
  by PID or age alone and never changes an ownership record as a side effect.~~
- [ ] ~~4.5 Add fault injection before/after lock, read, validation, child
  callback, revision check, replacement, verification, and unlock; prove exact
  durable state and cleanup/refusal behavior.~~

## 5. Enforce command-specific C-00 roles

- [ ] ~~5.1 Restrict `start` to canonical main or the documented clean
  single-worktree bootstrap exception and prove an owned linked session cannot
  create another worktree.~~
- [ ] ~~5.2 Restrict claim/adopt, release, reconcile, and integrate to the
  exact invoking linked worktree under their admission table, retaining
  maintenance-only canonical claim behavior where documented.~~
- [ ] ~~5.3 Restrict `remove` to canonical with exact target name/session,
  non-live/released authority, contained/unmerged proof, and existing explicit
  branch deletion/abandonment flags.~~
- [ ] ~~5.4 Preserve prospective capacity, transactional start rollback,
  stale/prunable owner attention, no foreign cleanup, clean-tree gates,
  no-force/no-rebase, and bounded Git child execution.~~

## 6. Harden integration admission and outcomes

- [ ] ~~6.1 Admit session/revision/HEAD/branch/remote policy, workspace PASS,
  clean state, and continuity coherently before the first fetch callback.~~
- [ ] ~~6.2 Hold the transition lock through fetch, renewed fast-forward and
  HEAD checks, non-force push, verification fetch, and durable integrated-state
  transition.~~
- [ ] ~~6.3 Preserve push rejection as stop/reconcile/revalidate with no
  force, retry, rebase, amend, or silent conflict handling.~~
- [ ] ~~6.4 Add the distinct
  `SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN` result for a
  verified successful push followed by unverifiable local record finalization;
  never retry or misreport the remote effect.~~
- [ ] ~~6.5 Add callback-spy and local-bare-remote tests proving every
  admission failure makes zero fetch/push calls and every race keeps exact
  expected local/remote refs.~~

## 7. Cross-session proof, documentation, and certification

- [ ] ~~7.1 Build a canonical-plus-two-linked-worktree matrix invoking every
  mutator from the wrong checkout with foreign roots, session IDs, HEADs,
  tasks, branches, and script paths; assert all protected state byte-for-byte.~~
- [ ] ~~7.2 Race release/adopt, release/integrate, reconcile/integrate, and
  remove/claim child processes; prove at most one valid transition and
  categorical conflict for every loser.~~
- [ ] ~~7.3 Register non-vacuous production-surface mutations for root/code
  binding, expected session/HEAD, continuity admission, lock/revision CAS,
  command roles, and pre-network ordering; prove byte restoration.~~
- [ ] ~~7.4 Update AGENTS, C-00 design/usage, CLI docs, active recipes,
  hardening, and continuity guidance without rewriting historical command
  evidence or claiming hostile same-user isolation.~~
- [ ] ~~7.5 Run focused workspace/session tests, race/fault/mutation matrices,
  `npm run workspace:check`, `npm run agent:check`, hardening, validation
  universe, root/bin typechecks, local gate, and required clean-checkout gate.~~
- [ ] ~~7.6 Strict-validate this change, inspect the Git/network/privacy
  surface, integrate only through a disposable proof then the owned C-00
  session, and record exact-head CI evidence without projecting execution.~~
