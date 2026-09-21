## 1. Freeze command authority and threat model

- [x] 1.1 Define the mutating versus read-only command matrix, allowed invocation checkout class, required expected values, compatible continuity statuses, and first forbidden effect for every command.
- [x] 1.2 Define fixed refusal/result codes and bounded safe diagnostics for foreign root, script/current mismatch, session/head mismatch, continuity mismatch, transition conflict, and post-push local uncertainty.
- [x] 1.3 Document that session IDs/revisions are public freshness values and C-00 is cooperative confused-deputy protection, not hostile same-user cryptographic isolation.

## 2. Bind mutations to current checkout and code

- [x] 2.1 Split parser/dispatcher handling so `--root` remains valid only for read-only `status`/`check` and every mutator returns `SESSION_MUTATION_ROOT_OVERRIDE_REFUSED` before context mutation.
- [x] 2.2 Implement symlink-safe comparison of process current Git top-level and the checkout containing the executing session CLI; reject ambiguity or mismatch before authority reads and callbacks.
- [x] 2.3 Add focused tests for root/subdirectory handling, script from a foreign checkout, symlinked current/script paths, bare/detached/unknown repositories, and unchanged cross-root read-only inspection.

## 3. Add explicit session, HEAD, and continuity expectations

- [x] 3.1 Add `--expect-session` to claim/adopt, release, reconcile, integrate, and remove, plus `--expect-head` to integrate, with exact bounded parsers and help/metadata declarations.
- [x] 3.2 Build one pure admission core for current session ID, canonical record revision, ownership state, task/campaign, role, branch, workspace class, active-task routing, task STATE, and command-compatible status.
- [x] 3.3 Ensure adoption requires the exact predecessor session and creates a fresh identity that invalidates all predecessor commands while continuing to refuse a live owner.
- [x] 3.4 Emit copy-safe next commands after start/release without treating public expectations as credentials or emitting absolute paths in JSON.

## 4. Serialize ownership-record transitions

- [x] 4.1 Implement bounded owner-only, exclusive, no-follow sibling transition locks carrying command/session/boot/process/start/operation identity and deterministic validation.
- [x] 4.2 Implement canonical full record revisions, revision comparison, owner-only same-directory durable replacement, directory flush, reread verification, and never-overwrite-on-conflict behavior.
- [x] 4.3 Route claim, release, reconcile, integrate-record update, and lock recovery through the common lock/revision transition core.
- [x] 4.4 Add explicit crashed-lock inspection/recovery that never reclaims by PID or age alone and never changes an ownership record as a side effect.
- [x] 4.5 Cover the transition failure boundaries implemented here with focused, deterministic negatives: competing/malformed/symlinked lock refusal, concurrent-adoption race (exactly one transition), stale-expectation refusal, revision-conflict refusal, and verified-push/unverifiable-finalization. A full per-internal-boundary fault-injection matrix is recorded as follow-up, not claimed.

## 5. Enforce command-specific C-00 roles

- [x] 5.1 Restrict `start` to canonical main or the documented clean single-worktree bootstrap exception and prove an owned linked session cannot create another worktree.
- [x] 5.2 Restrict claim/adopt, release, reconcile, and integrate to the exact invoking linked worktree under their admission table, retaining maintenance-only canonical claim behavior where documented.
- [x] 5.3 Restrict `remove` to canonical with exact target name/session, non-live/released authority, contained/unmerged proof, and existing explicit branch deletion/abandonment flags.
- [x] 5.4 Preserve prospective capacity, transactional start rollback, stale/prunable owner attention, no foreign cleanup, clean-tree gates, no-force/no-rebase, and bounded Git child execution.

## 6. Harden integration admission and outcomes

- [x] 6.1 Admit session/revision/HEAD/branch/remote policy, workspace PASS, clean state, and continuity coherently before the first fetch callback.
- [x] 6.2 Hold the transition lock through fetch, renewed fast-forward and HEAD checks, non-force push, verification fetch, and durable integrated-state transition.
- [x] 6.3 Preserve push rejection as stop/reconcile/revalidate with no force, retry, rebase, amend, or silent conflict handling.
- [x] 6.4 Add the distinct `SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN` result for a verified successful push followed by unverifiable local record finalization; never retry or misreport the remote effect.
- [x] 6.5 Prove pre-network refusal by leaving the remote and the remote-tracking ref byte-identical across admission failures (a fetch against an advanced remote would move them; an admission refusal does not), and keep the existing fast-forward/rejection suites green.

## 7. Cross-session proof, documentation, and certification

- [x] 7.1 Build a canonical-plus-linked-worktree matrix invoking every mutator from the wrong checkout with foreign roots, session IDs, HEADs, tasks, branches, and script paths; assert all protected state byte-for-byte.
- [x] 7.2 Race claim/adopt processes and prove at most one valid transition with categorical conflict for every loser.
- [x] 7.3 Register non-vacuous production-surface mutations for root/code binding, expected session/HEAD, continuity admission, lock/revision CAS, command roles, and pre-network ordering; prove byte restoration.
- [x] 7.4 Update AGENTS, C-00 lifecycle recipes, and durable decisions without rewriting historical command evidence or claiming hostile same-user isolation.
- [x] 7.5 Run focused workspace/session tests, the local quality gate, `npm run workspace:check`, `npm run agent:check`, `npm run handoff:check`, `npm run project:check`, `npm run hardening:check`, `npm run hardening:rules`, `npm run campaign:synthetic`, typecheck and strict OpenSpec validation.
- [x] 7.6 Strict-validate this change, inspect the Git/network/privacy surface, integrate through the owned C-00 session (fast-forward only), and record exact-head evidence without projecting execution.

## Deferred / Follow-Up

- A full fault-injection matrix for every internal transition boundary (before/after lock, read, validation, child callback, revision check, replacement, verification, unlock) remains future hardening work; this change proves the boundaries it implements.
- Exact-head CI execution remains externally blocked; no CI execution is projected by this change.
