# Audit — Concurrency and Workspace Hardening (C-00)

## Observed incident (historical, already repaired)

During the production-observability planning campaign a second Nightwatch
session, sharing the single canonical working tree and index, performed three
distinct hostile-by-accident operations:

- `skip-worktree` was set on `docs/ROADMAP.md`;
- the planning change directory was added to `.git/info/exclude`;
- the first agent's in-progress `audit.md` was **deleted**.

The damage was repaired inside the planning campaign. The independent
second-reviewer architecture review recorded the hazard as `T-48` (OBSERVED),
classified the missing response as `MA-13`, and required campaign `C-00` as
`MUST FIX BEFORE IMPLEMENTATION` (review §11, §10 F-26, revised critical path
`C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 → C-12 → C-13 → C-14`).

## Verified current state at the C-00 starting checkpoint

Measured read-only at `2517c26a019bbf8aa53008cd57658b917cc79bea`
(`main`, clean, `HEAD == origin/main`):

- `git ls-files -v` — zero non-`H` entries: no `skip-worktree`, no
  `assume-unchanged`.
- `.git/info/exclude` — pristine Git template content; zero effective
  patterns.
- `.git/hooks` — 14 entries, all `*.sample`; `core.hooksPath` unset.
- `git worktree list --porcelain` — exactly one worktree (the canonical
  checkout on `main`).

The first explorer's repair is therefore complete and C-00 starts from a
clean state. C-00 exists to make that state *mechanically enforced* instead of
*incidentally true*.

## Why the existing validators did not catch it

The repository already owns strong deterministic validation
(`agent:check`, `project:check`, `handoff:check`, `hardening:check`,
`gate:local`, `gate:clean`), but every one of those checks reads **tracked
content and Git history**. The incident lived entirely in *repository-global
Git state that is invisible to tracked content*:

| Incident element | Where it lives | Visible to a pre-C-00 validator |
|---|---|---|
| `skip-worktree` bit | shared index metadata | no |
| `assume-unchanged` bit | shared index metadata | no |
| `.git/info/exclude` entry | shared common Git dir | no |
| non-sample hook | shared common Git dir | no |
| cross-session file deletion | working tree | only as an ordinary diff, with no ownership semantics |

`git worktree` isolates `HEAD`, the index and the checkout, but it explicitly
does **not** isolate `info/exclude`, index flags or hooks: those live in the
shared common directory. Isolation alone is therefore insufficient, and
hygiene invariants alone are insufficient. C-00 needs both.

## Correction to the review's index-flag wording

Review §11 item 2 says the invariant is "`git ls-files -v` reports no
lowercase status letters (no `skip-worktree`, no `assume-unchanged`)".

That is mechanically incomplete. In `git ls-files -v`:

- lowercase tag letters mean **assume-unchanged**;
- `S` (uppercase) means **skip-worktree**;
- `s` means skip-worktree **and** assume-unchanged.

A checker that rejects only lowercase letters would have missed the exact bit
set during the observed incident. C-00 implements the corrected invariant:
**no lowercase tag letter and no `S`/`s` tag** — i.e. every tracked entry must
report `H`, or the unavoidable transient `M`/`R`/`C`/`K`/`?` states that carry
no hidden-state semantics. The review text is preserved as historical
evidence; this correction is recorded in the C-00 design and in
`docs/DECISIONS.md`.

## What C-00 must add

1. One writing agent = one worktree = one session identity, with
   machine-readable ownership metadata that is regenerable and never persists
   machine-specific absolute paths in tracked project truth.
2. Deterministic repository-global hygiene invariants over the shared common
   Git directory, wired into the existing `agent:check` and the executable
   quality gate.
3. A bounded destructive-operation policy whose enforceable core is a
   declared-deletion gate over tracked-file deletions.
4. A fast-forward-only, never-force-push integration protocol that is
   serialized at the canonical `main` ref.
5. Adversarial tests that reproduce each observed hazard class on disposable
   synthetic repositories.
