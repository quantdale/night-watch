# Design — Concurrency and Workspace Hardening (C-00)

## Problem

`git worktree` isolates `HEAD`, the index and the checkout, and the object
database it shares is append-only. That removes index races, checkout races
and cross-session working-tree deletion in one move.

Measured correction (see `docs/DECISIONS.md` D-102). Index extension flags
(`skip-worktree`, `assume-unchanged`) live in the *per-worktree* index, not in
the shared common directory: setting `skip-worktree` inside a linked worktree
reports `S` there and `H` in the main worktree. Independent review §11 item 2
states otherwise; the review text is preserved as historical evidence and this
design is the correction of record. What worktrees genuinely do **not**
isolate is:

- `$GIT_COMMON_DIR/info/exclude`;
- `$GIT_COMMON_DIR/hooks` and `core.hooksPath`;
- `$GIT_COMMON_DIR/config`;
- worktree registration metadata itself.

Isolation therefore removes the index-flag hazard only for *new* worktrees.
The canonical checkout's index stays shared by every agent who works there,
so the index invariant is enforced for EVERY registered worktree, and the
shared surfaces are enforced once against `$GIT_COMMON_DIR`. The design is:
**isolation (Git-native) + hygiene invariants over both surfaces
(Nightwatch) + ownership metadata (Nightwatch) + declared-deletion gate
(Nightwatch) + fast-forward-only integration (Git + policy)**.

## Component map

| Component | File | Authority |
|---|---|---|
| Read-only inspection core | `bin/workspace-integrity.mjs` | read-only Git queries and filesystem reads; no write verb, no network |
| Mutating session CLI | `bin/nightwatch-session.mjs` | worktree/branch creation, ownership records, integration push |
| Static policy | `config/workspace-integrity.v1.json` | committed expected-state policy (exclude allowlist, hook policy, bounds) |
| Continuity integration | `bin/agent-state.mjs` | imports the read-only core; `agent:check` fails closed on drift |
| Gate integration | `config/quality-gate.v1.json`, `bin/quality-gate.mjs`, `bin/quality-gate-spec.mjs`, `src/core/qualityGate/definition.ts` | required `WORKSPACE_INTEGRITY` group |
| Adversarial matrix | `tests/unit/workspaceIsolation.test.ts` | disposable synthetic repositories only |

`bin/agent-state.mjs` must stay free of filesystem mutation (enforced by
`hardening:check`), so all mutation lives in the session CLI and the
inspection core is import-safe for the continuity checker.

## Ownership model

Invariant: `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`.

The ownership record is stored at `<per-worktree git dir>/nightwatch-session.v1.json`
— that is `.git/nightwatch-session.v1.json` for the canonical worktree and
`.git/worktrees/<name>/nightwatch-session.v1.json` for a linked worktree.

Rationale for that location:

- it is *per worktree*, so 1:1 identity is structural rather than asserted;
- `git worktree remove`/`git worktree prune` garbage-collect it for free, so a
  removed worktree cannot leave a phantom claim;
- it is untracked and regenerable, so no machine-specific transient path
  enters durable project truth;
- it is visible from every worktree through `git worktree list` +
  `$GIT_COMMON_DIR/worktrees/<name>/`, so cross-session inspection needs no
  registry file and no daemon.

Record schema (`nightwatch.workspace-session.v1`):

```
schemaVersion, sessionId, taskId, campaignId, role, branch, baseSha,
createdAtIso, ownershipState, integrationState,
holder{bootDigest, startedAtIso, pid?}
```

No absolute path is stored: the worktree path is always discovered from Git.
`bootDigest` is a truncated SHA-256 of the kernel boot identifier, so a reboot
deterministically invalidates every stale holder without persisting a machine
fingerprint.

Worktree classification:

| Class | Meaning | Write authority |
|---|---|---|
| `CANONICAL_MAIN` | main worktree, no session record | integration/maintenance only |
| `CANONICAL_MAINTENANCE` | main worktree with an explicit maintenance claim | bounded maintenance |
| `OWNED_SESSION` | linked worktree, valid record, live holder | full, for its own task |
| `STALE_SESSION` | linked worktree, valid record, dead holder | none until adopted |
| `UNOWNED_WORKTREE` | linked worktree, no record | none (fails closed) |
| `UNKNOWN` | record malformed, duplicated, or contradictory | none (fails closed) |

Claim exclusivity is enforced by an atomic `O_EXCL` create of the record.
A second claim against a live holder returns `SESSION_ALREADY_OWNED`; against a
dead holder it returns `SESSION_OWNER_STALE` and requires an explicit
`--adopt`.

Liveness is `ownershipState == OWNED` **and** a `bootDigest` match, **and** —
only when the record carries a process anchor — `process.kill(pid, 0)`. The
anchor is optional because a conversational agent session has no single
long-lived pid; a long-running process may anchor with `--pid`. A reboot
therefore invalidates every stale claim deterministically without persisting a
machine fingerprint and without depending on a clock, and an unanchored claim
ends at explicit `release` or explicit `--adopt`. The liveness probe is
injectable, and the adversarial matrix forces the stale state by writing an
impossible `bootDigest` rather than by racing a pid.

## Repository-global hygiene invariants

The shared surfaces are checked once against `$GIT_COMMON_DIR`; the index
invariant is checked for EVERY registered worktree, because indexes are
per-worktree. Every worktree therefore observes the same verdict.

1. **Index flags.** `git ls-files -v` in each registered worktree: every
   tracked entry must carry an allowed uppercase tag (`H`/`M`/`R`/`C`/`K`/`?`)
   and never `S`/`s` or a lowercase tag. A lowercase tag is
   `assume-unchanged`; `S` is `skip-worktree`; `s` is both; anything else is
   an unknown tag and fails closed. This corrects the review's "no lowercase
   letters" wording, which would have missed the observed `skip-worktree` bit
   (uppercase `S`).
2. **`.git/info/exclude`.** The committed policy defines the allowed
   *effective* pattern set (currently empty). Comments and blank lines are
   normalized away; every remaining line must appear in the allowlist. This is
   deterministic, survives Git template differences between clones and CI
   runners, and still fails closed on the exact incident (a real pattern
   hiding a tracked path). Size and line-count bounds prevent an unbounded
   read.
3. **Hooks.** `$GIT_COMMON_DIR/hooks` may contain only regular `*.sample`
   files, and `core.hooksPath` must be unset. Nightwatch never installs or
   executes a repository-local hook.
4. **Worktree metadata.** Registrations must resolve to real directories that
   are not symlinks; `prunable` registrations are reported as owner-attention
   warnings, never silently pruned; duplicate `sessionId` or duplicate live
   `taskId` claims fail closed; malformed records fail closed; a linked
   worktree with no record fails closed.

Additional cross-session invariant: **if any live owned session worktree
exists, the canonical main worktree must be clean.** This is the mechanical
detection of "a second agent is editing the shared canonical checkout while an
isolated session is live" — the precise shape of the observed incident. It is
inert in CI and in single-worktree development.

Canonical protection has three mechanical detections: an `IMPLEMENTATION`
session record on the canonical checkout, the canonical checkout sitting on a
`session/*` branch while linked worktrees exist, and the cleanliness rule
above. The branch-name detection is deliberately scoped to shared topologies:
a solo checkout — a fresh clone, a CI checkout, the clean-checkout gate —
shares nothing, so the branch name carries no concurrency hazard there. The
documented canonical exception is a `MAINTENANCE` claim
(`CANONICAL_MAINTENANCE`), which permits bounded maintenance and integration
without granting implementation authority.

## Destructive-operation policy

Enforceable core — the declared-deletion gate:

- Base selection is `session baseSha` inside an owned session worktree, else
  `merge-base(HEAD, origin/main)`, else `NOT_APPLICABLE`.
- Deletions are `git diff --diff-filter=D --name-only <base>`, which covers
  committed, staged and unstaged tracked-file deletions in one query.
- Every deleted path must be declared in the active task `SPEC.md` under
  `## Declared Deletions`; otherwise validation fails with
  `WORKSPACE_UNDECLARED_TRACKED_DELETION`.

Why that is sufficient for the review's "a session may delete only files it
created in that session or files declared in its task scope": a file created
*and* deleted inside the same session produces no net deletion against the
session base, so the only observable net deletions are of files that existed at
the base — which are by construction not session-created and must therefore be
declared. The smallest deterministic mechanism covers both clauses of the rule
without building a general SCM ownership index.

Behavioral rules that remain rules (documented in `AGENTS.md`, not
mechanically preventable from inside the repository): no `git clean -fd`,
no broad `git restore`/`git checkout -- <path>`, no destructive reset, and no
stashing across paths the session does not own. Their *effects* are caught by
the deletion gate, the hygiene invariants and the canonical-cleanliness rule;
the prohibition itself is agent behavior.

## Integration protocol

```
origin/main → session base SHA → worktree + session branch → implementation
→ validation → fetch origin/main → stale-base/conflict check → reconcile by
merging origin/main into the session branch (never rewriting) → validated
session checkpoint → serialized integration → push → verify HEAD == origin/main
```

Integration is performed as `git push origin <sessionBranch>:main`, not by
checking `main` out. That choice matters:

- it never mutates another worktree's index or checkout — the exact class of
  damage C-00 exists to remove;
- the remote ref update is an atomic compare-and-swap, so serialization is
  provided by the server, and a concurrent advance is rejected as a
  non-fast-forward instead of being silently resolved;
- it is fail-closed by default: a rejected push means "stop and reconcile".

The canonical worktree afterwards performs `git merge --ff-only`, which cannot
lose another session's commits. Force-push, rebasing another session's
commits, amending another session's checkpoint and discarding a newer
`origin/main` are prohibited and are never emitted by the tooling.

## Main integration lease — analysis and decision

**Decision: no lease is implemented.**

A lease would exist to serialize the shared `main` update. That update is
already an atomic compare-and-swap on the remote ref: a losing writer gets a
non-fast-forward rejection and must reconcile, which is exactly the behavior a
correct lease would produce, without a file that leaks when an agent dies. A
local lease would add stale-lease recovery, expiry, ownership and adoption
semantics while strictly weakening nothing that Git already guarantees, and it
would risk being mistaken for implementation authority. The review itself
ranks leases as "the fallback, not the mechanism".

The residual risk a lease might have covered — two sessions pushing to `main`
within the same instant — is handled: the second push is rejected, the session
reconciles by merging `origin/main` into its own branch, revalidates, and
pushes again. Nothing is lost and nothing is rewritten.

## Diagnostics contract

All diagnostics are categorical, deterministic, privacy-safe and actionable:
fixed `WORKSPACE_*`/`SESSION_*` codes, repository-relative paths only, no
environment dumps, no absolute machine paths in JSON output except the
worktree paths Git itself reports, and no credential-shaped values anywhere.
