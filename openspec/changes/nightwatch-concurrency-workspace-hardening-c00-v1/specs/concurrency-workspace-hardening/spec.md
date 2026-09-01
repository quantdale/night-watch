# Requirements — Concurrency and Workspace Hardening (C-00)

1. A writing Nightwatch agent MUST own exactly one Git worktree and exactly one
   session branch: `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`.
2. Two writing agents MUST NOT share a working tree or an index; sharing the
   append-only object database is permitted.
3. Session ownership MUST be machine-readable and sufficient to determine
   session ID, task/campaign ID, worktree, session branch, base SHA, creation
   time, ownership state and integration state.
4. Ownership metadata MUST be regenerable local state and MUST NOT persist a
   machine-specific absolute path in durable project truth.
5. The system MUST distinguish the canonical main worktree, an active owned
   session worktree, an inactive/stale worktree, and an unknown/unowned
   worktree. Unknown MUST fail closed for write operations requiring ownership.
6. A second claim against a live owner MUST be refused; a claim against a
   non-live owner MUST require an explicit adoption and MUST NOT delete work.
7. `git ls-files -v` MUST report no `skip-worktree` (`S`/`s`) tag and no
   assume-unchanged (lowercase) tag, in EVERY registered worktree, because
   indexes are per-worktree. An unrecognized tag MUST fail closed.
8. `$GIT_COMMON_DIR/info/exclude` MUST contain zero effective patterns beyond a
   committed allowlist. Comment and blank lines MUST be normalized away before
   comparison. Unauthorized drift MUST be detected mechanically, not only
   documented.
9. `$GIT_COMMON_DIR/hooks` MUST contain only regular `*.sample` files and
   `core.hooksPath` MUST be unset. Nightwatch MUST NOT install or execute a
   repository-local Git hook.
10. Worktree metadata MUST be validated: malformed registrations, missing or
    symlinked directories, duplicate session identity, duplicate live task
    claims, missing owner metadata, a worktree claiming another session's
    ownership, and use of the canonical checkout as an implementation session
    MUST fail closed. Prunable registrations MUST be reported for owner
    attention and MUST NOT be pruned silently.
11. If any owned session worktree is live, the canonical checkout MUST be
    clean; otherwise validation MUST fail.
12. Every tracked-file deletion measured against the session base — committed,
    staged or unstaged — MUST be declared under `## Declared Deletions` in the
    active task `SPEC.md`, or validation MUST fail. A file created and deleted
    within one session produces no net deletion and MUST NOT require a
    declaration.
13. Unsafe cross-session use of `git clean -fd`, broad `git restore`, broad
    `git checkout -- <path>`, destructive reset, and `git stash` MUST be
    prohibited in `AGENTS.md`, and their effects MUST be detectable by the
    mechanical invariants. Enforcement MUST NOT rely on shell-history
    inspection.
14. Integration MUST be fast-forward-only onto canonical `main`, serialized at
    the canonical ref, and MUST NOT force-push, rebase or amend another
    session's commits, or discard a newer `origin/main`.
15. A stale base MUST be detected. Reconciliation MUST merge without
    rewriting, and MUST abort rather than silently resolve a conflict.
16. Integration MUST verify that canonical `main` equals the integrated head
    after pushing.
17. If a main-integration lease is not implemented, the analysis MUST be
    recorded. A lease MUST NOT substitute for worktree isolation.
18. `npm run agent:check` MUST fail closed on every hygiene violation class and
    on undeclared tracked deletions, and the executable quality gate MUST
    contain one required `WORKSPACE_INTEGRITY` group.
19. The normal agent bootstrap MUST be able to answer: am I in an owned
    implementation worktree; which task owns it; what SHA did it start from;
    has shared Git state drifted; is my base stale; may I integrate; is
    canonical `main` safe; are there stale worktrees needing owner attention.
20. Diagnostics MUST be categorical, deterministic, privacy-safe, free of
    secrets and actionable, and MUST NOT dump unnecessary environment or
    absolute-path data into the durable JSON surface.
21. A deterministic adversarial matrix MUST reproduce each observed hazard
    class on disposable synthetic repositories only, proving both the failure
    and the repaired green state.
22. The canonical pre-C-01 eligibility-census baseline MUST be recorded once at
    a pinned clean SHA using local/source-only reads, with no DEV, NEXT or
    production contact.
23. C-00 MUST grant no new product or runtime authority and MUST NOT weaken an
    existing validator to pass.
