# Report — Concurrency and Workspace Hardening (C-00)

Task ID: nightwatch-concurrency-workspace-hardening-c00-v1
Phase: CONCURRENCY_WORKSPACE_HARDENING_C00_V1
Status: COMPLETE

## 1. Starting SHA

`2517c26a019bbf8aa53008cd57658b917cc79bea` — `main`, clean,
`HEAD == origin/main` at bootstrap. Measured, not trusted from a persisted
field.

## 2. Final implementation SHA

`24220965fb3bacd0fd6e7d7826a40c1ec0428efc`; also recorded in
`STATE.md` (`LAST_VALIDATED_IMPLEMENTATION_SHA`) and integrated into canonical
`main` by fast-forward push.

## 3. C-00 architecture implemented

A thin deterministic policy layer over Git's native isolation. No daemon, no
lock service, no network coordination, no database, no hidden mutable global
state.

| Component | File | Authority |
| --- | --- | --- |
| Committed policy | `config/workspace-integrity.v1.json` | data only |
| Read-only inspection core | `bin/workspace-integrity.mjs` | read-only Git/filesystem reads; no write verb, no network, no `import.meta` |
| Mutating session CLI | `bin/nightwatch-session.mjs` | the only worktree/branch/ownership mutation surface |
| Continuity integration | `bin/agent-state.mjs` | `agent:check` fails closed on drift |
| Handoff integration | `bin/planner-handoff-check.mjs` | accepts an owned session branch whose target is `main` |
| Gate integration | `config/quality-gate.v1.json`, `bin/quality-gate.mjs`, `bin/quality-gate-spec.mjs`, `src/core/qualityGate/definition.ts` | required `WORKSPACE_INTEGRITY` group |
| Structural guard | `bin/hardening-check.mjs` | `checkC00WorkspaceIntegrity()` |
| Adversarial matrix | `tests/unit/workspaceIsolation.test.ts` | disposable synthetic repositories only |

## 4. Exact ownership model

`ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`.

The record `nightwatch.workspace-session.v1` lives at
`$GIT_COMMON_DIR/worktrees/<name>/nightwatch-session.v1.json` (or
`$GIT_COMMON_DIR/nightwatch-session.v1.json` for the canonical worktree):
`schemaVersion, sessionId, taskId, campaignId, role, branch, baseSha,
createdAtIso, ownershipState, integrationState, holder{bootDigest,
startedAtIso, pid?}`. It is per-worktree (so 1:1 identity is structural),
untracked and regenerable, garbage-collected by `git worktree remove/prune`,
and stores no absolute path — persisting `worktreePath` is rejected.

Claim exclusivity is an atomic `O_EXCL` create. A second claim against a live
holder is `SESSION_ALREADY_OWNED`; against a non-live holder it is
`SESSION_OWNER_STALE` and requires explicit `--adopt`. Liveness is
`ownershipState == OWNED` and a `bootDigest` match and, only when a process
anchor is present, `process.kill(pid, 0)`. The anchor is optional because a
conversational agent has no single long-lived pid; a reboot invalidates every
stale claim deterministically without a clock or a machine fingerprint.

Six classes, with write authority: `CANONICAL_MAIN` (integration/maintenance),
`CANONICAL_MAINTENANCE` (bounded maintenance), `OWNED_SESSION` (full, own
task), `STALE_SESSION` (none until adopted), `UNOWNED_WORKTREE` (none, fails
closed), `UNKNOWN` (none, fails closed).

## 5. Exact worktree policy

A writing agent works in a dedicated worktree on `session/<name>`, created by
`session start` from the canonical checkout and claimed by the writing agent.
The canonical checkout may not host an implementation session; it may hold a
`MAINTENANCE` claim. A newly created worktree starts `RELEASED`, so the
creating process never silently owns it. Session worktrees default to
`$HOME/.nightwatch/worktrees/<name>`, outside the workspace tree, so nothing
may derive the sibling REPOSITORIES root from its own checkout location.

## 6. Repository-global hygiene invariants

Empirically corrected scope (`docs/DECISIONS.md` D-102): indexes are
per-worktree, so the index invariant runs for EVERY registered worktree; only
`info/exclude`, `hooks` and `config` are shared.

1. `WORKSPACE_INDEX_FLAGS` — every tracked entry in every worktree must carry
   an allowed uppercase tag (`H`/`M`/`R`/`C`/`K`/`?`); `S`/`s` (skip-worktree)
   and any lowercase tag (assume-unchanged) are violations; an unknown tag
   fails closed. This corrects the review's "no lowercase letters" rule, which
   would have missed the observed `skip-worktree` bit.
2. `WORKSPACE_EXCLUDE_POLICY` — normalized effective patterns of
   `$GIT_COMMON_DIR/info/exclude` must all appear in the committed allowlist
   (currently empty), within size and line bounds. Where the inspected
   repository commits no allowlist there is no authoritative comparison, so the
   result is `NOT_APPLICABLE` plus a `WORKSPACE_EXCLUDE_ALLOWLIST_UNAVAILABLE`
   advisory — never a silent PASS. Enforcement in this repository is unchanged.
3. `WORKSPACE_HOOKS_POLICY` — `$GIT_COMMON_DIR/hooks` may contain only regular
   `*.sample` files and `core.hooksPath` must be unset.
4. `WORKSPACE_WORKTREE_METADATA` — registrations must resolve to real,
   non-symlink directories within a bounded count; unowned linked worktrees,
   malformed records, records claiming another branch, duplicate `sessionId`
   and duplicate live `taskId` all fail closed; `prunable` and stale sessions
   are owner-attention warnings and are never pruned silently.
5. `WORKSPACE_CANONICAL_PROTECTION` — an `IMPLEMENTATION` record on the
   canonical checkout fails; the canonical checkout on a `session/*` branch
   fails when linked worktrees exist; and while any owned session worktree is
   live the canonical checkout must be clean.
6. `WORKSPACE_DECLARED_DELETIONS` — see §7.
7. `WORKSPACE_INTEGRATION_READINESS` — see §8.

Warnings versus hard failures: security/integrity ambiguity fails closed
(unknown ownership, unknown index tag, malformed record, unowned worktree,
undeclared deletion, drifted shared state). Conditions that require an owner
decision but are not themselves corruption are warnings (prunable worktree,
stale session, stale or diverged base, unresolvable deletion base inside a
session).

## 7. Destructive-operation protections

Mechanically enforced core: every tracked-file deletion measured with
`git diff --diff-filter=D --name-only <base>` against the session base — or
the canonical merge base outside a session — must be declared under
`## Declared Deletions` in the active task `SPEC.md`, else
`WORKSPACE_UNDECLARED_TRACKED_DELETION`. Committed, staged and unstaged
deletions are all covered by that single query. A file created and deleted
inside one session produces no net deletion, so session-created files need no
declaration; that is why this satisfies both clauses of the review's rule
without an ownership index.

Documented behavioural rules (effects detected, commands not blockable from
inside the repository): no `git clean -fd`, no broad `git restore`, no broad
`git checkout -- <path>`, no destructive reset, no cross-session `git stash`,
and never delete, revert or amend another session's work. Recorded in
`AGENTS.md`. Enforcement never inspects shell history.

## 8. Integration protocol

```
origin/main -> session base SHA -> dedicated worktree + session branch ->
implementation + validation -> fetch origin/main -> stale-base/conflict check
-> reconcile by merging (never rewriting) -> validated checkpoint ->
serialized integration -> push -> verify HEAD == origin/main
```

Integration is `git push origin HEAD:refs/heads/main` from the session
worktree: it never mutates another worktree's index or checkout, the remote ref
update is an atomic compare-and-swap, and a concurrent advance is rejected as a
non-fast-forward instead of being resolved. `reconcile` merges with `--no-ff`,
never rebases, and on conflict aborts the merge and reports
`SESSION_RECONCILE_CONFLICT`; a non-conflict merge failure is reported
distinctly as `SESSION_RECONCILE_FAILED`. `remove` refuses a live holder and
refuses unmerged work unless `--abandon-unmerged` is passed deliberately. No
force-push, rebase of another session's commits, amend of another session's
checkpoint, or discard of a newer `origin/main` is ever emitted.

## 9. Main-integration lease decision

**No lease implemented** (`docs/DECISIONS.md` D-103). The shared operation is
already serialized by the remote ref compare-and-swap; a losing writer gets a
non-fast-forward rejection and must reconcile — exactly what a correct lease
would produce, without a file that leaks when an agent dies. A local lease
would add expiry, ownership, adoption and stale-recovery semantics while
strengthening nothing Git already guarantees, and could be mistaken for
implementation authority.

## 10. Adversarial test results

`tests/unit/workspaceIsolation.test.ts` — **39 cases, all passing**, on
disposable synthetic repositories only (an upstream bare repo plus a canonical
clone plus session worktrees, all inside the test's own temporary directory).
The canonical Nightwatch checkout, live session worktrees, and sibling company
repositories are never used as destructive targets.

| Class | Coverage |
| --- | --- |
| A shared working tree | second claim refused (`SESSION_ALREADY_OWNED`); canonical implementation claim refused |
| B `skip-worktree` | fails in the canonical checkout and in a linked worktree; repaired state proven green |
| C `assume-unchanged` | fails; repaired state proven green |
| D `info/exclude` drift | real pattern fails; comment-only change is not drift; repaired state proven green |
| E unexpected hook | non-sample hook refused; `core.hooksPath` refused; repaired green |
| F cross-session deletion | committed and uncommitted undeclared deletions both fail |
| G declared deletion | declared deletion passes; create-and-delete inside one session passes |
| H stale base | advanced `origin/main` is `STALE`, integration refuses, other session's commit intact; reconcile merges without rewriting, then integration fast-forwards and verifies |
| I conflicting integration | merge aborted, `SESSION_RECONCILE_CONFLICT`, session commit and tree intact, integration still refused |
| J parallel worktrees | disjoint edits stay isolated; both worktrees and the canonical checkout independently valid |
| K dead/stale session | `STALE_SESSION` + owner-attention warning; adoption required; live holder never removed; unmerged work protected; no phantom claim after removal; vanished directory reported, never silently pruned |
| L canonical protection | canonical dirty while a session is live fails from both worktrees; `MAINTENANCE` claim is the documented exception |
| extra | unowned worktree, malformed record, foreign-branch record, duplicate session id, duplicate live task claim, dirty/unsafe integration refusal, unsafe `start` refusal, diagnostics privacy, `NOT_APPLICABLE` outside Git, policy-source scoping, byte-level determinism |

## 11. Full validation results

At implementation checkpoint `8c333699cdfa373e536d1f8ba990b7f8c1812679` (the
subsequent commits repaired DEF-06 through DEF-08 and were revalidated; the
final validated implementation checkpoint is `24220965fb3bacd0fd6e7d7826a40c1ec0428efc`):

- `npm run gate:local` at `1deecbc0306807dd9c372ff66dcf4430edee16b9` —
  **PASS**, all 11 groups; receipt `receipt:sha256:fb4237efe09aa703fdd363ba`.
- `npm run gate:clean` (Node 20 disposable clone) at the same head — **PASS**,
  all 11 groups; gate receipt `receipt:sha256:17435865c67de72b7105361a`,
  clean receipt `clean-receipt:sha256:daf3ea88ed184fe565b632c0`.
- Semantic compatibility — 1,950 total / 1,937 passed / 13 skipped / 0 failed,
  exactly matching the canonical baseline measured independently on `main`.
- Owner provenance 91 passed; synthetic campaign 128 passed.
- `npm run typecheck`, `npm run hardening:check`, `npm run handoff:check`,
  `npm run project:check`, `npm run agent:check`, `npm run agent:audit`,
  `npm run quality-gate:spec` — all PASS.
- Full canonical Playwright regression — 2,749 total / 2,736 passed / 13
  skipped / 0 failed, against an independently measured pre-C-00 canonical
  baseline of 2,710 / 2,697 / 13 / 0. The delta is exactly the 39 new C-00
  adversarial cases, with identical skip counts.

External GitHub Actions CI was not run and is not claimed green.

## 12. Canonical pre-C-01 census / digests

`docs/design/PRE-C01-BASELINE.md`, measured once from a clean owned session
worktree at pinned SHA `886d8362b6f0979ccdfc2881abb46cb5ac79b359` with
`npm run campaign:eligibility-census`, scope `LOCAL_SOURCE_ONLY`, safety
`NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT`:

- `srcconfig:sha256:e8bdfc8f0e58d7d93a87215c`
- `srcsnapshot:sha256:04ff583971865f335902f5ad`
- `source-surface-discovery:sha256:906830010ed198639d3c7b91`
- `portfolio:sha256:1f76e8a69b67c2ae2ce038a9`
- `source-eligibility-census:sha256:2f97b732e0472df347f695a1`

128 operations / 127 route proofs / 127 request contracts / 43 response
contracts / 53 semantic observations / 118 proven + 10 rejected joins / 47
mutation-capable / 5 proven read-only / 3 Phase 24 eligible / 125 excluded;
lifecycle 85 `DISCOVERED` / 40 `MECHANICALLY_PROVEN` / 3 `PROJECTABLE`; 1,732
files considered / 1,092 read / 1,078 admitted / 654 rejected / 12,449,877
bytes; 2 budget rejections; 128-operation cap unchanged. The two digests `F-32`
named as the baseline reproduced exactly.

## 13. Defects discovered

- **DEF-01** — the predecessor session's `REPORT.md` pre-asserted validation,
  ownership, integration and census results that did not exist. Repaired: this
  report is evidence-only.
- **DEF-02** — `session reconcile` invoked `git merge --no-rebase`, which is a
  `git pull` option and not valid for `git merge`, so every reconcile failed;
  and the failure was misreported as a content conflict. Repaired: `--no-ff`
  merge, and conflicts are classified from an unmerged index
  (`SESSION_RECONCILE_CONFLICT`) versus other failures
  (`SESSION_RECONCILE_FAILED`). Found by adversarial case H.
- **DEF-03** — the inspection core used `import.meta.url`, which is a syntax
  error once `bin/agent-state.mjs` is imported by a TypeScript test through
  Playwright's CommonJS transform. Repaired: the core is `import.meta`-free and
  the policy has a built-in default with an explicit `policySource`.
- **DEF-04** — synthetic fixtures that copy the continuity checker's bin
  dependencies did not carry the new module, so the checker failed to load
  inside those fixtures. Repaired in `projectState.test.ts` and
  `plannerHandoff.test.ts`.
- **DEF-05** — `agent-state.test.ts` fixtures legitimately use
  `.git/info/exclude` as a fixture mechanism in a disposable repository, which
  the allowlist invariant read as drift. Repaired by scoping: an allowlist
  comparison requires the inspected repository's own committed allowlist;
  otherwise `NOT_APPLICABLE` plus an advisory. Enforcement here is unchanged
  and still proven by adversarial case D.
- **DEF-06** — `tests/unit/changeIntelligenceBacktest.test.ts` and
  `scenarios/ripple/local.smoke.ts` derived the sibling REPOSITORIES root from
  their own checkout location, so they broke in an out-of-tree session
  worktree. Repaired to use `DEFAULT_SIBLING_ROOT` /
  `NIGHTWATCH_REPOS_ROOT`, with a `hardening:check` guard against regression.
  This is a direct consequence of the isolation model and would have silently
  mis-resolved sibling sources in every future session.
- **DEF-07** — base-staleness advisories were computed from any ownership
  record, so a *released* record whose historical base had been overtaken by
  `origin/main` raised `WORKSPACE_BASE_STALE` — advice to reconcile work that
  was already closed. Repaired: staleness is evaluated only for a live claim,
  with a permanent regression case. Found while auditing the closure state of
  this campaign's own canonical maintenance claim.
- **DEF-08** — `.gitignore`'s `node_modules/` rule does not match a
  `node_modules` *symlink*, so sharing one dependency install across worktrees
  can be tracked by an ordinary `git add -A`. It was: this session's own first
  commit tracked the symlink. Repaired by installing dependencies in the
  session worktree and by a `hardening:check` rule that rejects any tracked
  path inside a dependency tree. The bad commit was this session's own,
  unpushed, and was corrected before integration; no other session's history
  was touched.

## 14. Remaining concurrency residual risks

- **RES-1 — the canonical checkout's index is still shared.** Worktree
  isolation gives new worktrees their own index, but any agent that works in
  the canonical checkout shares its index with every other agent that does.
  Mitigation: the canonical checkout is not a valid implementation workspace,
  and the index invariant is checked for every worktree.
- **RES-2 — behavioural prohibitions are detected, not prevented.**
  `git clean -fd`, broad `restore`/`checkout --`, destructive reset and
  cross-session `stash` cannot be blocked from inside the repository. Their
  effects surface through the deletion gate, the hygiene invariants and the
  canonical-cleanliness rule, but a session can still damage its own work.
- **RES-3 — an unanchored ownership claim outlives a dead agent.** Without a
  pid anchor, ownership ends only at explicit `release`, at `--adopt`, or at
  reboot. This is deliberately fail-closed (the worktree is reported as
  requiring owner attention rather than silently reassigned).
- **RES-4 — a same-instant double push is resolved by rejection, not
  prevention.** The loser must reconcile and revalidate. Nothing is lost, but
  the second session pays a revalidation cycle.
- **RES-5 — detection is checkpoint-time, not continuous.** Drift is caught
  when `agent:check`, `workspace:check` or the gate runs, not at the moment of
  damage.
- **RES-6 — shared `$GIT_COMMON_DIR/config` is not yet an invariant** beyond
  `core.hooksPath`. Other shared config keys could be abused; C-00 does not
  claim to cover them.

## 15. DEV/NEXT/production contact

**Zero.** No environment contact, no authentication, no credential inspection,
no datastore/database query, no cloud/IAM/Kubernetes query. The only
company-source operation was the authorized read-only local/source-only
baseline census (`LOCAL_SOURCE_ONLY`,
`NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT`).

## 16. Sibling company-repository modifications

**Zero.** No path under `REPOSITORIES/alphauslabs` or
`REPOSITORIES/mobingilabs` was written; the census read six repositories
read-only.

## 17. Final `HEAD == origin/main`

Verified. The session branch was integrated by
`git push origin HEAD:refs/heads/main` (no force), the push was verified by a
re-fetch, and the canonical checkout then fast-forwarded:
`HEAD == origin/main == 5567e249dcf5e0f31c92a4f1a08f7001caa2f1f0`.

## 18. Final canonical clean-worktree status

Verified clean: `git status --porcelain` in the canonical checkout is empty.

## 19. Final worktree inventory

Exactly one worktree: the canonical checkout on `main`. The C-00 session was
released, then removed with `session remove --name c00-a396cd1f
--delete-branch` from the canonical checkout after its work was proven
contained in `origin/main`; the per-worktree ownership record was
garbage-collected with it, leaving no phantom claim. The session-worktree root
`$HOME/.nightwatch/worktrees/` is empty.

`npm run workspace:check` after closure: `PASS`, all seven invariants, zero
worktrees requiring owner attention. The canonical checkout holds a
`CANONICAL_MAINTENANCE` claim for this closure commit — the documented
exception — and no implementation session.

Post-closure hygiene, measured: zero non-`H` `git ls-files -v` entries, zero
effective `$GIT_COMMON_DIR/info/exclude` patterns, zero non-`*.sample` hook
entries, `core.hooksPath` unset.

## 20. Final local/remote branch inventory

Local: `main` only. Remote: `refs/heads/main` only
(`git ls-remote --heads origin`). The session branch
`session/c00-a396cd1f` existed only locally, was never pushed, and was deleted
at closure. The final remote topology is `main` only, as required.
