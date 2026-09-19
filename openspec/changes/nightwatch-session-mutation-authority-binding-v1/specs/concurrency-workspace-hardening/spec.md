## ADDED Requirements

### Requirement: Session mutations are bound to the invoking checkout
Every session lifecycle command that can modify an ownership record, Git ref,
branch, worktree, working tree, remote-tracking ref, or remote ref SHALL derive
its invoking authority context only from the Git top-level containing the
process current directory. `claim`, `release`, `reconcile`, and `integrate`
MUST mutate only that exact worktree; canonical-only `start` and `remove` MAY
resolve a new or registered target only through their command-specific identity
rules. The executing session CLI file SHALL resolve inside the same exact
non-symlink authority worktree. Every mutator MUST reject an explicit `--root`
and complete checkout-binding validation before any mutation or network
callback. Read-only `status` and `check` MAY inspect an explicit root.

#### Scenario: Canonical process targets a live linked session
- **WHEN** a mutating command is launched from canonical with `--root` naming a live linked session
- **THEN** it fails with `SESSION_MUTATION_ROOT_OVERRIDE_REFUSED` and changes no ownership record, ref, branch, worktree, working-tree file, or remote state

#### Scenario: CLI code and current checkout differ
- **WHEN** the executing `nightwatch-session.mjs` resolves from a different worktree than the current Git top-level
- **THEN** every mutating command fails before reading mutation authority or invoking a child mutation/network callback

#### Scenario: Cross-root inspection remains read-only
- **WHEN** `status` or `check` is given another registered worktree root
- **THEN** it reports the bounded topology without changing any repository, record, worktree, or remote state

### Requirement: Owned-session mutations require explicit current expectations
`release`, `reconcile`, and `integrate` SHALL require the exact current session
ID supplied as an explicit expectation. `integrate` SHALL additionally require
the exact expected 40-hex HEAD. The command SHALL validate the expected values,
canonical record revision, owned state, task/campaign, role, branch, workspace,
and continuity routing before effects. A missing, stale, foreign, malformed, or
mismatched expectation MUST fail closed.

#### Scenario: Session command is copied into another worktree
- **WHEN** a command's expected session ID does not equal the current checkout's valid owned record
- **THEN** the command returns `SESSION_EXPECTATION_MISMATCH` before filesystem, Git mutation, fetch, or push callbacks

#### Scenario: Integration HEAD advances after intent is prepared
- **WHEN** current HEAD differs from `--expect-head` at admission or immediately before push
- **THEN** integration refuses without pushing and requires a fresh explicit intent

#### Scenario: Continuity and ownership disagree
- **WHEN** active task identity, campaign, session branch, task state, record role, or workspace class is absent, ambiguous, or incompatible with the command
- **THEN** the command fails with a categorical authority reason before effects

### Requirement: Ownership-record transitions are serialized compare-and-swap operations
Every ownership-record transition SHALL hold one bounded exclusive,
symlink-refusing, owner-only transition lock from admission through durable
record verification. It SHALL capture a canonical full record revision and
publish a replacement only if the revision remains exact. Competing,
malformed, symlinked, irregular, changed, or uncertain lock/record state MUST
fail closed and MUST NOT be overwritten.

#### Scenario: Release and adoption race
- **WHEN** concurrent processes attempt incompatible transitions against one ownership record
- **THEN** at most one transition commits and every loser reports a revision or lock conflict without overwriting the winner

#### Scenario: Record changes during a command
- **WHEN** the ownership record revision differs from the admitted revision before publication or network mutation
- **THEN** the command stops with `SESSION_RECORD_REVISION_CHANGED` and does not publish its stale transition

#### Scenario: Transition process crashes while holding the lock
- **WHEN** a transition terminates before releasing its lock
- **THEN** later mutators remain blocked until explicit owner recovery proves and removes that exact stale lock without changing the ownership record

### Requirement: Command roles preserve C-00 ownership boundaries
`start` SHALL operate only from canonical main or the documented clean
single-worktree bootstrap exception. `claim`/`adopt` SHALL operate only in the
current target linked worktree and adoption SHALL require the exact predecessor
session ID while still refusing a live owner. `remove` SHALL operate only from
canonical, require the exact target name and session ID, refuse live ownership,
and preserve unmerged-work protection and explicit abandonment.

#### Scenario: Owned session tries to start another worktree
- **WHEN** `start` is invoked from an owned linked session
- **THEN** it fails before directory, branch, worktree, or record creation

#### Scenario: Foreign checkout attempts adoption
- **WHEN** `claim --adopt` is invoked outside the target linked worktree or without its exact predecessor session ID
- **THEN** adoption fails and the prior ownership record remains byte-identical

#### Scenario: Canonical removes a released session deliberately
- **WHEN** canonical invokes `remove` with the exact target name/session ID and all existing released, non-live, containment, and unmerged-work checks pass
- **THEN** only that proven target may be removed under the existing explicit branch/abandonment flags

### Requirement: Integration authority is admitted before network access
Integration SHALL bind current session ID, record revision, exact HEAD, branch,
remote/branch policy, clean state, workspace PASS, and coherent continuity
before fetch. The transition lock SHALL remain held through fetch,
fast-forward recheck, non-force push, verification fetch, and record update.
Any admission failure MUST invoke neither fetch nor push. Push rejection MUST
never retry with force or rewrite history.

#### Scenario: Foreign-root integration is attempted
- **WHEN** a process outside the owned session tries to integrate that session through a selected root
- **THEN** integration refuses before fetch and push and leaves local and remote refs unchanged

#### Scenario: Remote advances after admission
- **WHEN** the remote compare-and-swap rejects the push because canonical main advanced
- **THEN** integration reports `SESSION_PUSH_REJECTED`, performs no force/retry/rebase, preserves the ownership record as not integrated, and requires reconcile plus revalidation

#### Scenario: Push succeeds but local record finalization is uncertain
- **WHEN** the remote verifies at the expected HEAD but durable local integration-state recording cannot be verified
- **THEN** the command reports remote success with local-record uncertainty, exits non-zero, and instructs read-only reconciliation without retrying the push

### Requirement: Session authority diagnostics respect the cooperative threat boundary
The protocol SHALL describe session IDs and revisions as public freshness and
intent values, not authentication secrets. Diagnostics SHALL be categorical
and bounded and MUST NOT expose record bodies, environment values, credentials,
remote output, or machine paths in JSON. Documentation MUST state that the
protocol prevents accidental/confused-deputy cross-session action but does not
provide cryptographic isolation from a malicious process with unrestricted
same-user filesystem access.

#### Scenario: Operator obtains a next command
- **WHEN** status, claim, or a refusal emits an owner next action
- **THEN** it may include bounded public session/branch/SHA expectations but contains no credential or secret claim

#### Scenario: Same-user threat boundary is documented
- **WHEN** C-00 ownership guarantees are presented to an operator or agent
- **THEN** they distinguish mechanized cooperative isolation from hostile same-OS-user security isolation

### Requirement: Cross-session and race tests are non-vacuous
The authoritative C-00 suite SHALL exercise canonical plus at least two linked
worktrees, every mutating command from the wrong checkout, stale/copied
expectations, record races, crashed locks, and pre-network refusal. Tests SHALL
assert byte-for-byte unchanged ownership records and unchanged refs, branches,
worktrees, working-tree sentinels, fetch counts, and push counts after every
refusal. Production-surface mutation probes MUST prove each control is
independently detected and restored.

#### Scenario: Every mutator is invoked from a foreign checkout
- **WHEN** the adversarial matrix targets claim, release, reconcile, integrate, start, and remove across the wrong worktree boundary
- **THEN** each unauthorized path is refused before its first effect and all protected sentinels and callback counts remain unchanged

#### Scenario: Authority control is removed from production code
- **WHEN** a mutation disables root binding, expected-session/head admission, continuity validation, record locking/revision CAS, or pre-network ordering
- **THEN** the authoritative tests detect the mutation non-vacuously and restore the original bytes exactly
