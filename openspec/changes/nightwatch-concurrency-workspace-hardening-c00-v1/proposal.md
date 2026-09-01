# Proposal — Concurrency and Workspace Hardening (C-00)

## Why

Two Nightwatch agents shared one working tree and one index during the
production-observability planning campaign and corrupted repository-global Git
state, destroying in-progress evidence (`T-48`, OBSERVED). The independent
review classified the missing response as `MA-13` and required campaign
`C-00 — concurrency and workspace hardening` before any substantial parallel
implementation of the master roadmap.

Every lock-and-cooperate scheme is weaker than removing the sharing.

## Change

Establish a mechanically enforced model:

> one writing agent owns one Git worktree and one session branch.

Agents may share the append-only object database; they must not share a
working tree or an index. Because `git worktree` does not isolate
`info/exclude`, index flags or hooks, add deterministic hygiene invariants over
the shared common Git directory, a declared-deletion gate for tracked-file
deletions, and a fast-forward-only integration protocol.

The implementation is a thin deterministic policy layer over Git's native
isolation semantics — no daemon, no lock service, no network coordination, no
database, no hidden mutable global state.

## Expected result

- `npm run session:status` answers, categorically and privacy-safely: am I in
  an owned implementation worktree, which task owns it, what SHA did it start
  from, has shared Git state drifted, is my base stale, may I integrate, is
  canonical `main` safe, and are there stale worktrees needing owner
  attention.
- `npm run agent:check` fails closed on `skip-worktree`/`assume-unchanged`
  bits, unauthorized `.git/info/exclude` drift, unexpected hooks, unsafe or
  unowned worktree metadata, duplicate ownership, and undeclared tracked-file
  deletions.
- The executable quality gate gains one required group,
  `WORKSPACE_INTEGRITY`, so the invariant runs in `gate:local`, `gate:ci` and
  `gate:clean`.
- A deterministic adversarial matrix (A–L) reproduces every observed hazard
  class on disposable synthetic repositories and proves both the failure and
  the repaired green state.
- A pinned pre-C-01 eligibility-census baseline is recorded at a clean SHA
  (`F-32`).

## Non-goals

C-00 grants no new product or runtime authority. It does not implement C-01 or
any later production-observability campaign, does not change the 128-operation
cap, does not admit OpenAPI, does not touch DEV/NEXT/production policy, does
not contact any environment, and does not modify sibling company repositories.
