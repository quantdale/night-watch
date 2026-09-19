## Context

`bin/nightwatch-session.mjs` is the sole supported writer for C-00 worktree,
branch, ownership-record, and integration state. Its parser accepts `--root`
for every command. `resolveContext(options.root)` then treats the selected
worktree's ownership record as authority, but the mutators do not establish
that the invocation originates from that worktree or names the record it
expects to mutate.

The defect is directly observable without mutation: while the process current
directory is the canonical checkout, `release --root <live-session> --dry-run`
plans replacement of that live session's ownership record, and
`integrate --root <live-session> --dry-run` plans its fast-forward push. A real
release makes the record stale, after which a foreign caller can explicitly
adopt it. The existing `OWNED_SESSION` classification proves only that the
*target record* is live; it says nothing about the invoking checkout or intent.

All agents share one OS account and filesystem. No repository-only protocol can
provide cryptographic isolation from a malicious same-user process that can
read and rewrite every local record. This design is a confused-deputy and
coordination-safety boundary: it makes cross-session action require deliberate
entry into the target checkout plus exact current authority, detects stale and
racing commands, and prevents arbitrary-root targeting. It does not claim an
OS security boundary.

## Goals / Non-Goals

**Goals:**

- Bind each lifecycle mutation to the exact checkout whose code is executing
  and whose Git top-level contains the process current directory.
- Require explicit expected session/revision—and expected HEAD for
  integration—so stale or copied commands fail before effects.
- Serialize and compare-and-swap ownership-record transitions.
- Keep wrong-checkout, stale-session, task/branch mismatch, and race failures
  ahead of filesystem, Git-ref, fetch, and push callbacks.
- Preserve canonical-only creation/removal roles and read-only cross-root
  inspection.
- Prove two-worktree isolation with negative and mutation tests.

**Non-Goals:**

- Defending against a malicious process with unrestricted access as the same
  OS user, kernel compromise, or direct manual editing of `.git` internals.
- Introducing a credential, secret-bearing session token, daemon, lock server,
  database, network coordinator, or external identity provider.
- Replacing remote Git's compare-and-swap, the C-00 workspace invariants, or
  task continuity v2.
- Authorizing force push, rebase, automatic conflict resolution, automatic
  stale-worktree deletion, or implementation in this planning campaign.

## Decisions

### Separate inspection targeting from mutation targeting

`status` and `check` may retain an explicit read-only inspection root. Every
mutator resolves its invoking authority context solely from `process.cwd()`
using Git's top-level and refuses `--root`. Claim, release, reconcile, and
integrate may mutate only that current worktree; canonical-only start/remove
resolve their new or registered target under their command-specific rules. The
real path of the executing
`bin/nightwatch-session.mjs` must belong to that same top-level; a script from
one checkout cannot mutate another checkout selected by the current directory.

Invocation from a subdirectory is allowed when Git resolves it to the same
top-level. Symlinked current directories or script paths that make the
relationship ambiguous fail closed.

Alternative considered: keep `--root` and require a confirmation flag. That
leaves the confused-deputy primitive intact and makes a copied command target a
foreign worktree, so it is rejected.

### Use explicit public expectations, not a fake secret

Owned-session mutators require `--expect-session <session-id>`. Adoption and
removal require the exact predecessor/target session ID. Integration also
requires `--expect-head <40-hex-sha>`. The command reads the bounded regular
record under its transition lock, computes its canonical full digest as the
record revision, validates session/task/campaign/role/branch/state and
continuity routing, then retains that revision through the transition.

Session IDs and digests are not secrets. Their purpose is freshness and
explicit intent: a command copied from another session or retained across an
adoption/rewrite fails. Help/status output provides the safe expected values;
shell history need not contain credentials because none are created.

Alternative considered: store an unguessable token beside the record. Every
agent uses the same OS identity and can read that location, so calling it an
authentication secret would overstate the boundary. It is rejected.

### Validate command-specific continuity before effects

For `release`, `reconcile`, and `integrate`, the record must classify as the
current owned session and match the current branch. The active task and its
STATE must resolve safely, name the same task/campaign and session branch, and
have a command-compatible status; terminal completion remains compatible with
final integration/release. Unknown or incoherent continuity refuses.

`claim --adopt` operates only in the current linked worktree and must name the
exact previous session ID. A live owner is still refused. It creates a fresh
session identity, invalidating every command prepared under the predecessor.

`start` operates only from canonical main, except the documented clean
single-worktree bootstrap where canonical and session roles are not shared.
It cannot be launched from an owned linked worktree. `remove` operates only
from canonical, requires the exact target name and session ID, refuses live
ownership, preserves unmerged-work refusal, and retains the explicit
`--abandon-unmerged` boundary.

Alternative considered: infer authority only from `OWNED_SESSION`. That is the
current defect—the class describes the selected target, not the caller—and is
rejected.

### Serialize record transitions with a bounded exclusive lock and revision CAS

Before an ownership-record transition, the command creates a sibling lock with
exclusive no-follow regular-file semantics and owner-only mode. The lock binds
command, session ID, boot identity, process identity, start time, and a random
operation ID. While holding it, the command reads and validates the record,
captures its canonical revision digest, performs allowed work, verifies the
revision is unchanged, and publishes the new record through a same-directory
owner-only durable replacement followed by reread verification.

A competing lock, changed revision, replacement record, symlink, irregular
file, malformed lock, or uncertain stale lock fails closed. A crashed lock is
never reclaimed by time or PID alone; explicit owner recovery validates the
current record and proves no lifecycle child/network callback is live before
removing only that exact lock. Record transitions never silently overwrite a
winner.

Alternative considered: check the digest immediately before ordinary rename
without a lock. Another process can write between check and rename, so it is
not compare-and-swap and is rejected.

### Admit integration intent before any network callback

Integration admission binds the current session ID, record revision, exact
HEAD, branch, remote/branch policy, clean state, workspace PASS, and continuity
state. All validation occurs before fetch. The lock remains held through
fetch, fast-forward recheck, push, verification fetch, and record update.
Remote push remains an atomic non-force compare-and-swap; rejection never
retries or force-pushes.

If the push succeeds but local post-push record verification fails, the command
reports `SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN`, exits
non-zero, and instructs read-only status/recovery. It never reports the push as
failed or retries it blindly.

### Preserve read-only visibility and safe diagnostics

Cross-root `status`/`check` stay available because agents need to inspect the
shared topology. Their JSON continues to omit absolute paths. Mutation refusal
diagnostics contain fixed codes plus bounded safe task/session/branch/SHA
identities; they omit record bodies, environment, credentials, remote output,
and machine paths in JSON.

### Test the real confused-deputy and race paths

The adversarial matrix creates canonical plus two linked worktrees and invokes
every mutator from the wrong checkout with foreign roots/identities. Callback
spies and local bare remotes prove no record byte, ref, branch, worktree,
working-tree file, fetch, or push changes. Parallel child processes race
release/adopt, release/integrate, reconcile/integrate, and remove/claim; at
most one valid transition commits and losers report categorical conflicts.

Hardening/mutation probes target the production dispatcher, current/script
root comparison, expected-session/head checks, continuity check, lock/revision
CAS, and pre-network ordering. Tests also prove read-only cross-root status
continues to work.

## Risks / Trade-offs

- **Lifecycle commands become more verbose** -> status and successful claim
  print exact copy-safe next commands with public session/HEAD expectations.
- **A crashed transition lock blocks progress** -> provide explicit bounded
  owner recovery; never guess from elapsed time or PID alone.
- **Same-user malicious processes remain able to bypass the CLI** -> state the
  cooperative threat boundary and rely on OS/workspace isolation if hostile
  same-user defense is ever required.
- **Continuity may be terminal at integration/release** -> define an explicit
  command/status compatibility table and test both IN_PROGRESS and COMPLETE
  closure paths.
- **Holding a lock across network operations reduces concurrency** -> only one
  owner is permitted for that session; correctness is preferable and network
  timeouts remain bounded.
- **Legacy scripts using `--root` break** -> keep it for status/check, emit a
  migration-specific refusal for mutators, and update all documented command
  recipes atomically.

## Migration Plan

1. In a future authorized implementation session, add pure admission helpers
   and tests for command/root/script/record/continuity relationships.
2. Add expected-session/head parsing and command-specific authority tables,
   initially behind negative tests.
3. Add bounded symlink-refusing lock, canonical revision, durable transition,
   and explicit lock-recovery primitives.
4. Route claim/release/reconcile/integrate through the common admission and CAS
   core; then restrict start/remove to their canonical roles.
5. Update help, next-action output, documentation, hardening, and all C-00 test
   fixtures/recipes; retain read-only inspection-root compatibility.
6. Run the two-worktree race/fault matrix, full C-00 suite, workspace/agent
   checks, hardening/mutations, local gate, and required clean-checkout gate.
7. Integrate through the old protocol only after proving the new command on a
   disposable local remote; after integration, all future lifecycle mutations
   use the new authority binding.

Rollback before first new-format transition is code-only. After a new
transition, rollback may disable mutations and retain read-only status; it must
not restore arbitrary-root mutation or rewrite the ownership record by hand.

## Open Questions

- Should command-compatible task status be a small shared table in continuity
  v2 or remain owned by the session CLI? Resolve by choosing one authority and
  mutation-testing disagreement; do not duplicate independent tables.
- Which explicit proof is sufficient to recover a crashed transition lock on
  non-Linux platforms without relying on PID/age alone? Until qualified, lock
  recovery on an unsupported platform must be manual and fail closed.
