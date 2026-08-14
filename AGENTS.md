# Nightwatch Agent Contract

This repository is a private, read-only-by-default bug-hunting framework. All
implementation changes belong here. Do not contact a real Alphaus environment,
query a database, mutate production data, or modify Alphaus repositories as
part of normal development.

## Canonical Git topology and checkpoint policy

The canonical writable Git root is
`/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`. Its canonical
remote is the private `origin`
(`https://github.com/quantdale/night-watch.git`) on `main`. The parent
workspace is intentionally not a Git repository; do not restore its retired
`.git` metadata or use the preserved accidental-Git backup.

Nightwatch development sessions may commit and push only validated durable
checkpoints from this repository to `origin main`. Before each push, validate
the scoped work, inspect the diff and privacy surface, and verify local
`HEAD == origin/main` after the push. If `origin/main` advances or a push is
rejected, stop and reconcile; never force-push. The campaign runtime never
commits, pushes, or publishes runtime findings. Real findings remain in the
owner-only local store outside GitHub.

## Session bootstrap

Before substantial work:

1. Confirm the current directory is inside this Nightwatch Git repository.
2. Read this file.
3. Read `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, and `docs/ROADMAP.md`. Read `docs/ARCHITECTURE.md`
   when architecture is relevant.
4. Read `.agent/ACTIVE_TASK.md`.
5. For an `IN_PROGRESS` task, read its `SPEC.md`, `PLAN.md`, and `STATE.md`
   in that order, then resume from `STATE.md`.

Do not restart investigation or planning merely because the conversation is
fresh. The active task files are the execution memory.

## Authority and scope

When sources disagree, use this precedence:

`current tests/runtime evidence` > `current implementation` >
`active task STATE/PLAN` > `durable docs/decisions` > `recon handoffs` >
`assumptions`.

Record disagreements, prefer the stronger/current evidence, and update the
stale durable document. Never silently reconcile contradictions.

Do not broadly rediscover established facts: do not rescan Alphaus repos,
repeat Recon A/B/C/D, re-audit Nightwatch architecture, reread unrelated
files, or rerun completed experiments by default. Re-verify only when the
active task requires it, implementation depends on it, repository freshness
may invalidate it, or current evidence contradicts it; use the narrowest
decisive check.

Nightwatch may read Alphaus repositories only when explicitly required and
must never modify them. Preserve the existing fail-closed, read-only safety
model. No credentials, auth state, bearer tokens, cookies, customer data, or
other secrets may enter source, artifacts, or `.agent` files. Safe path
references are allowed; tests use synthetic fake values only.

## Permanent owner scope freeze

Nightwatch is a private local project. The active roadmap is confined to local
source intelligence, contained DEV browser/API testing, deterministic replay,
failure minimization, sanitized evidence, and private local triage. The owner
decision is executable in `src/core/policy/ownerScope.ts`:
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

Nightwatch must not autonomously execute or request GCP/GKE/Kubernetes/cloud
deployment archaeology, AWS infrastructure/IAM/STS/runtime-role discovery,
DynamoDB/BigQuery/Spanner/production SQL or datastore metadata operations,
deployment-owner handoffs, or external publication. Unknown operation classes
fail closed with `OWNER_POLICY_BLOCKED` before an executor callback. Existing
Phase 6 types and synthetic adapters are preserved for compatibility, while
real data execution is quarantined behind that owner gate.

Real findings belong in owner-only local state (default
`$HOME/.nightwatch/findings/`), never in a shared connector, message system,
remote repository, or Alphaus repository. Chrome DevTools MCP remains optional
and subordinate to Playwright containment; it never receives credentials or
raw authenticated evidence.

Phase 7 campaign commands are local and bounded: `npm run campaign:synthetic`
executes the repository-owned deterministic fixture matrix, while
`npm run campaign:real -- --env=dev` is an explicit opt-in for one guarded
DEV campaign and requires the external owner-only storage state. The real
launcher is serial, fail-closed, and never runs in production, publishes
findings, or performs infrastructure/data operations.

## Task and checkpoint discipline

Any multi-milestone, long-running, architecture-changing, safety-sensitive,
or compaction-prone task uses `.agent/tasks/<task-id>/` with `SPEC.md`,
`PLAN.md`, `STATE.md`, and `REPORT.md`. `PLAN.md` is living; `SPEC.md` is
frozen intent; `STATE.md` is the concise operational waypoint; `REPORT.md` is
the final handoff. Project docs under `docs/` describe what Nightwatch is and
must not become minute-by-minute logs.

Update `STATE.md` after each milestone, design decision, unexpected constraint,
significant validation, safety event, before a substantially different
subproblem, before ending a session, and whenever context may be compacted or
lost. Checkpoint often enough that losing the conversation costs at most one
small unit of work.

Durable Git continuity records stable historical anchors, not a prediction of
the commit that contains the record. `LAST_VALIDATED_IMPLEMENTATION_SHA` names
the substantive implementation that passed validation;
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` names that closure anchor, and
`LAST_DOCUMENTATION_CHECKPOINT_SHA` may name an approved documentation
descendant. Live local and remote HEAD are discovered from Git. `Current SHA`,
`CURRENT_LOCAL_HEAD`, `CURRENT_REMOTE_HEAD`, and `LAST_PUSHED_SHA` are legacy
historical compatibility fields only and must never be compared as persisted
live authority. Documentation-only descendants remain checkpoint advances and
must not be relabeled as implementation commits.

For every milestone: implement, run its defined validation, repair failures,
record the exact result in `STATE.md`, then advance. If required validation
fails, stop accumulating unrelated changes and repair it first. Keep discoveries
outside scope under `Deferred / Follow-Up`.

## Recovery

If context may have been compacted or certainty is lost: stop editing; read
`.agent/ACTIVE_TASK.md`, then the task `SPEC.md`, `PLAN.md`, and `STATE.md`;
inspect `git status`/diff; reconcile state with the working tree; run the
smallest decisive validation; update `STATE.md`; and continue its `Exact Next
Action`. The working tree and tests outrank remembered conversation.

A fresh session loads project state and the active task, verifies Git state,
and resumes the exact next action. It does not begin with broad repository
exploration.

When complete, run all acceptance checks, update plan statuses, fill the state
completion snapshot and `REPORT.md`, update project docs when appropriate, set
`ACTIVE_TASK.md` to `COMPLETE` or `NONE`, commit within Nightwatch, and leave a
clean tree unless an exception is explicitly recorded.
