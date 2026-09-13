# concurrency-workspace-hardening Specification

## Purpose

Two Nightwatch agents shared one working tree and one index during the production-observability planning campaign and corrupted repository-global Git state, destroying in-progress evidence (`T-48`, OBSERVED). The independent review classified the missing response as `MA-13` and required campaign `C-00 — concurrency and workspace hardening` before any substantial parallel implementation of the master roadmap.

## Requirements
### Requirement: one writing agent per worktree and session branch

A writing Nightwatch agent MUST own exactly one Git worktree and exactly one
session branch: `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`.

#### Scenario: a writing agent owns a worktree and session branch

- **WHEN** a writing Nightwatch agent owns a worktree and a session branch
- **THEN** it MUST own exactly one Git worktree and exactly one session branch:
  `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`

### Requirement: no shared working tree or index

Two writing agents MUST NOT share a working tree or an index; sharing the
append-only object database is permitted.

#### Scenario: two writing agents operate concurrently

- **WHEN** two writing agents operate concurrently
- **THEN** they MUST NOT share a working tree or an index, while sharing the
  append-only object database is permitted

### Requirement: machine-readable session ownership

Session ownership MUST be machine-readable and sufficient to determine
session ID, task/campaign ID, worktree, session branch, base SHA, creation
time, ownership state and integration state.

#### Scenario: session ownership metadata is read

- **WHEN** session ownership metadata is read
- **THEN** it MUST be machine-readable and sufficient to determine session ID,
  task/campaign ID, worktree, session branch, base SHA, creation time, ownership
  state and integration state

### Requirement: regenerable ownership metadata

Ownership metadata MUST be regenerable local state and MUST NOT persist a
machine-specific absolute path in durable project truth.

#### Scenario: ownership metadata is persisted

- **WHEN** ownership metadata is persisted
- **THEN** it MUST be regenerable local state and MUST NOT persist a
  machine-specific absolute path in durable project truth

### Requirement: worktree classes distinguished

The system MUST distinguish the canonical main worktree, an active owned
session worktree, an inactive/stale worktree, and an unknown/unowned
worktree. Unknown MUST fail closed for write operations requiring ownership.

#### Scenario: a worktree is classified

- **WHEN** a worktree is classified for a write operation
- **THEN** the system MUST distinguish the canonical main worktree, an active
  owned session worktree, an inactive/stale worktree, and an unknown/unowned
  worktree, and unknown/unowned MUST fail closed for write operations requiring
  ownership

### Requirement: claims against an owner

A second claim against a live owner MUST be refused; a claim against a
non-live owner MUST require an explicit adoption and MUST NOT delete work.

#### Scenario: a claim targets a live or non-live owner

- **WHEN** a claim is attempted against a live owner or a non-live owner
- **THEN** the claim against a live owner MUST be refused, and the claim against
  a non-live owner MUST require an explicit adoption and MUST NOT delete work

### Requirement: clean index tags in every worktree

`git ls-files -v` MUST report no `skip-worktree` (`S`/`s`) tag and no
assume-unchanged (lowercase) tag, in EVERY registered worktree, because
indexes are per-worktree. An unrecognized tag MUST fail closed.

#### Scenario: an index tag is found in a registered worktree

- **WHEN** `git ls-files -v` reports an `S`/`s` tag, an assume-unchanged
  (lowercase) tag, or an unrecognized tag in ANY registered worktree
- **THEN** validation MUST fail closed, because indexes are per-worktree

### Requirement: shared exclude holds no unauthorized patterns

`$GIT_COMMON_DIR/info/exclude` MUST contain zero effective patterns beyond a
committed allowlist. Comment and blank lines MUST be normalized away before
comparison. Unauthorized drift MUST be detected mechanically, not only
documented.

#### Scenario: the shared exclude file drifts

- **WHEN** `$GIT_COMMON_DIR/info/exclude` is compared against the committed
  allowlist
- **THEN** comment and blank lines MUST be normalized away before comparison,
  zero effective patterns beyond the committed allowlist MUST be present, and
  unauthorized drift MUST be detected mechanically rather than only documented

### Requirement: no repository-local Git hooks

`$GIT_COMMON_DIR/hooks` MUST contain only regular `*.sample` files and
`core.hooksPath` MUST be unset. Nightwatch MUST NOT install or execute a
repository-local Git hook.

#### Scenario: shared hooks state is inspected

- **WHEN** `$GIT_COMMON_DIR/hooks` and `core.hooksPath` are inspected
- **THEN** `$GIT_COMMON_DIR/hooks` MUST contain only regular `*.sample` files,
  `core.hooksPath` MUST be unset, and Nightwatch MUST NOT install or execute a
  repository-local Git hook

### Requirement: worktree metadata validation

Worktree metadata MUST be validated: malformed registrations, missing or
symlinked directories, duplicate session identity, duplicate live task
claims, missing owner metadata, a worktree claiming another session's
ownership, and use of the canonical checkout as an implementation session
MUST fail closed. Prunable registrations MUST be reported for owner
attention and MUST NOT be pruned silently.

#### Scenario: worktree metadata is validated

- **WHEN** worktree metadata shows a malformed registration, a missing or
  symlinked directory, duplicate session identity, duplicate live task claims,
  missing owner metadata, a worktree claiming another session's ownership, or use
  of the canonical checkout as an implementation session
- **THEN** validation MUST fail closed, and prunable registrations MUST be
  reported for owner attention and MUST NOT be pruned silently

### Requirement: canonical checkout cleanliness with live sessions

If any owned session worktree is live, the canonical checkout MUST be
clean; otherwise validation MUST fail.

#### Scenario: an owned session worktree is live

- **WHEN** any owned session worktree is live
- **THEN** the canonical checkout MUST be clean, otherwise validation MUST fail

### Requirement: tracked-file deletions are declared

Every tracked-file deletion measured against the session base — committed,
staged or unstaged — MUST be declared under `## Declared Deletions` in the
active task `SPEC.md`, or validation MUST fail. A file created and deleted
within one session produces no net deletion and MUST NOT require a
declaration.

#### Scenario: a tracked-file deletion is undeclared

- **WHEN** a tracked-file deletion measured against the session base — committed,
  staged or unstaged — is not declared under `## Declared Deletions` in the
  active task `SPEC.md`
- **THEN** validation MUST fail, while a file created and deleted within one
  session produces no net deletion and MUST NOT require a declaration

### Requirement: unsafe cross-session operations prohibited

Unsafe cross-session use of `git clean -fd`, broad `git restore`, broad
`git checkout -- <path>`, destructive reset, and `git stash` MUST be
prohibited in `AGENTS.md`, and their effects MUST be detectable by the
mechanical invariants. Enforcement MUST NOT rely on shell-history
inspection.

#### Scenario: unsafe cross-session effects are present

- **WHEN** the effects of unsafe cross-session `git clean -fd`, broad
  `git restore`, broad `git checkout -- <path>`, destructive reset, or
  `git stash` are present
- **THEN** they MUST be detectable by the mechanical invariants, the operations
  MUST be prohibited in `AGENTS.md`, and enforcement MUST NOT rely on
  shell-history inspection

### Requirement: fast-forward-only integration

Integration MUST be fast-forward-only onto canonical `main`, serialized at
the canonical ref, and MUST NOT force-push, rebase or amend another
session's commits, or discard a newer `origin/main`.

#### Scenario: integration onto canonical main occurs

- **WHEN** integration onto canonical `main` occurs
- **THEN** it MUST be fast-forward-only, serialized at the canonical ref, and
  MUST NOT force-push, rebase or amend another session's commits, or discard a
  newer `origin/main`

### Requirement: stale base reconciliation

A stale base MUST be detected. Reconciliation MUST merge without
rewriting, and MUST abort rather than silently resolve a conflict.

#### Scenario: a stale base is detected

- **WHEN** a stale base is detected and reconciled
- **THEN** reconciliation MUST merge without rewriting and MUST abort rather than
  silently resolve a conflict

### Requirement: post-push canonical main verification

Integration MUST verify that canonical `main` equals the integrated head
after pushing.

#### Scenario: integration has pushed

- **WHEN** integration has pushed to canonical `main`
- **THEN** it MUST verify that canonical `main` equals the integrated head after
  pushing

### Requirement: main-integration lease analysis

If a main-integration lease is not implemented, the analysis MUST be
recorded. A lease MUST NOT substitute for worktree isolation.

#### Scenario: a main-integration lease is not implemented

- **WHEN** a main-integration lease is not implemented
- **THEN** the analysis MUST be recorded, and a lease MUST NOT substitute for
  worktree isolation

### Requirement: agent:check hygiene enforcement

`npm run agent:check` MUST fail closed on every hygiene violation class and
on undeclared tracked deletions, and the executable quality gate MUST
contain one required `WORKSPACE_INTEGRITY` group.

#### Scenario: agent:check encounters a violation

- **WHEN** `npm run agent:check` encounters a hygiene violation class or an
  undeclared tracked deletion
- **THEN** it MUST fail closed, and the executable quality gate MUST contain one
  required `WORKSPACE_INTEGRITY` group

### Requirement: bootstrap ownership and safety answers

The normal agent bootstrap MUST be able to answer: am I in an owned
implementation worktree; which task owns it; what SHA did it start from;
has shared Git state drifted; is my base stale; may I integrate; is
canonical `main` safe; are there stale worktrees needing owner attention.

#### Scenario: the normal agent bootstrap runs

- **WHEN** the normal agent bootstrap runs
- **THEN** it MUST be able to answer: am I in an owned implementation worktree;
  which task owns it; what SHA did it start from; has shared Git state drifted;
  is my base stale; may I integrate; is canonical `main` safe; are there stale
  worktrees needing owner attention

### Requirement: diagnostics properties

Diagnostics MUST be categorical, deterministic, privacy-safe, free of
secrets and actionable, and MUST NOT dump unnecessary environment or
absolute-path data into the durable JSON surface.

#### Scenario: diagnostics are emitted

- **WHEN** diagnostics are emitted
- **THEN** they MUST be categorical, deterministic, privacy-safe, free of secrets
  and actionable, and MUST NOT dump unnecessary environment or absolute-path data
  into the durable JSON surface

### Requirement: adversarial matrix reproduces hazards

A deterministic adversarial matrix MUST reproduce each observed hazard
class on disposable synthetic repositories only, proving both the failure
and the repaired green state.

#### Scenario: the adversarial matrix runs

- **WHEN** the deterministic adversarial matrix runs
- **THEN** it MUST reproduce each observed hazard class on disposable synthetic
  repositories only, proving both the failure and the repaired green state

### Requirement: pre-C-01 eligibility-census baseline

The canonical pre-C-01 eligibility-census baseline MUST be recorded once at
a pinned clean SHA using local/source-only reads, with no DEV, NEXT or
production contact.

#### Scenario: the pre-C-01 eligibility-census baseline is recorded

- **WHEN** the canonical pre-C-01 eligibility-census baseline is recorded
- **THEN** it MUST be recorded once at a pinned clean SHA using local/source-only
  reads, with no DEV, NEXT or production contact

### Requirement: no new authority and no weakened validators

C-00 MUST grant no new product or runtime authority and MUST NOT weaken an
existing validator to pass.

#### Scenario: C-00 is implemented

- **WHEN** C-00 is implemented
- **THEN** it MUST grant no new product or runtime authority and MUST NOT weaken
  an existing validator to pass

