# Task State

STATE — nightwatch-repository-hardening-implementation-v1

## Identity

Task ID: nightwatch-repository-hardening-implementation-v1
Phase: REPOSITORY_HARDENING_IMPLEMENTATION_V1
Status: IN_PROGRESS
Campaign: nightwatch-repository-hardening-implementation-v1
Starting SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
Last validated implementation SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
Last substantive checkpoint SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
Live HEAD authority: GIT
Branch: session/nightwatch-repository-hardening--e7b9be89
Last checkpoint: M1 / NW-06 complete and validated — prospective worktree admission, proof-gated rollback and post-creation verification, with 9 regressions of which 8 fail against the pre-repair code
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
LAST_VALIDATED_IMPLEMENTATION_SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
LIVE_COMPLETION_CLAIM: NONE
PHASE_REPOSITORY_HARDENING_IMPLEMENTATION_V1_STATUS: IN_PROGRESS

## Objective

Execute the fourteen open findings of
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` (NW-01 through NW-14) in the
plan's dependency order, then certify the repository-level definition of done
at one integrated candidate checkpoint. NW-15 is closed by the W10 owner and
is consumed, not re-executed.

## Current Milestone

Milestone ID: M2
Milestone status: IN_PROGRESS
What is being attempted: NW-01 — close the reasoner-facing protocol
vocabularies against prototype inheritance and coercion, so an inherited or
unknown discriminant is rejected before it has any effect.

## Completed Milestones

- **M0 COMPLETE** — live execution truth established. `origin/main` and the
  canonical checkout are both `0ac7b3d037b5059f670eca715fc30adaf58e7334`
  (the canonical checkout was 16 commits behind at session open and was
  fast-forwarded, never reset). Workspace verdict PASS with four registered
  worktrees: canonical `CANONICAL_MAINTENANCE`, the bug-hunting programme's
  live `OWNED_SESSION`, the integrated W10 `STALE_SESSION` awaiting an owner
  release, and this task's `OWNED_SESSION`
  `nightwatch-repository-hardening--e7b9be89` claimed as session
  `sess-62fcc8aaf9fb` on base `0ac7b3d`. W10/NW-15 verified COMPLETE at
  implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192` and documentation
  `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`. SPEC, PLAN, STATE and REPORT
  written; `ACTIVE_TASK.md` routed to this campaign.
- **M1 COMPLETE (NW-06)** — `admitProspectiveWorktree` models the candidate
  registration against the same `maxWorktrees` policy the
  `WORKSPACE_WORKTREE_METADATA` invariant uses, and `commandStart` calls it
  before any mutation, refusing with
  `SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY`. `--allow-drift` does not
  bypass it. Creation is now transactional: a proof-gated rollback removes
  only the just-created worktree and branch after path, branch, HEAD and
  branch tip are each proven unchanged and the tree is clean, otherwise
  reporting `SESSION_START_ROLLBACK_INCOMPLETE`. The handed-over registration
  is verified against the same model afterwards, which is what holds the
  bound in the inherently non-atomic multi-process case. Nine cases added to
  `tests/unit/workspaceIsolation.test.ts`; 8 of 9 fail against the pre-repair
  code (the ninth is the below-bound admit control) and the concurrent case
  reproduced the defect with 4 registrations against a bound of 3. All 48
  cases in that file pass after the repair.

## Work In Progress

M2 / NW-01 in this session worktree. No other lane is dispatched.

## Findings register progress

| ID | Milestone | Status |
| --- | --- | --- |
| NW-06 | M1 | CLOSED — repaired, 9 regressions, 8 proven failing pre-repair |
| NW-01 | M2 | IN PROGRESS |
| NW-02 | M3 | NOT STARTED |
| NW-03 | M4 | NOT STARTED |
| NW-13 | M5 | NOT STARTED |
| NW-04 | M6 | NOT STARTED |
| NW-05 | M7 | NOT STARTED |
| NW-12 | M8 | NOT STARTED |
| NW-09 | M9 | NOT STARTED |
| NW-10 | M9 | NOT STARTED |
| NW-11 | M9 | NOT STARTED |
| NW-08 | M10 | NOT STARTED |
| NW-14 | M11 | NOT STARTED |
| NW-07 | M12 | NOT STARTED |
| NW-15 | — | CLOSED BY W10 OWNER — consumed, out of scope |

## Exact Next Action

1. Probe the live NW-01 evidence before changing anything: confirm that
   `Object.fromEntries` membership maps in `src/core/agentProtocol/validate.ts`
   accept `constructor`, `__proto__` and `toString` for intent, termination
   reason, severity, environment and confidence, and that
   `lookupAgentTool('constructor')` still returns an inherited function.
2. Freeze the closure primitive — own-key membership plus exhaustive dispatch
   — and apply it to `validate.ts`, `tools.ts` and
   `src/core/autonomousFinding/dossier.ts`, removing default branches that
   reinterpret an unknown discriminant.
3. Prove valid persisted protocol inputs still load, so the closure is not a
   compatibility break.
4. Add the prototype/coercion probe matrix as a focused regression and verify
   it fails against the pre-repair code.

## Files Changed

| Path | Purpose | Status |
| --- | --- | --- |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/SPEC.md` | frozen intent | CREATED |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/PLAN.md` | living execution plan | CREATED |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/STATE.md` | continuity waypoint | IN_PROGRESS |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/REPORT.md` | evidence ledger | INITIAL |
| `.agent/ACTIVE_TASK.md` | campaign routing | UPDATED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff prompt | REPLACED |
| `openspec/changes/nightwatch-repository-hardening-implementation-v1/**` | frozen OpenSpec change | CREATED |
| `bin/workspace-integrity.mjs` | `admitProspectiveWorktree` prospective admission | MODIFIED |
| `bin/nightwatch-session.mjs` | pre-mutation admission, proof-gated rollback, post-creation verification, narrow fault seam | MODIFIED |
| `tests/unit/workspaceIsolation.test.ts` | nine NW-06 cases; fixture policy override; session env injection | MODIFIED |
| `AGENTS.md` | C-00 admission and rollback behaviour | MODIFIED |
| `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` | document status and NW-06 resolution evidence | MODIFIED |

## Validation Ledger

M0: `npm run session:status` PASS (`WORKSPACE_INTEGRITY_SATISFIED`, self
`OWNED_SESSION`, clean, base CURRENT). `npm run agent:check` PASS with 3
warnings, all pre-existing: the stale-implementation-baseline notice against
the inherited W10 anchor, 31 legacy v1 task records, and the integrated W10
session worktree awaiting an owner release. `npm run handoff:check` PASS,
receipt campaign `nightwatch-repository-hardening-implementation-v1`,
planned-from `0ac7b3d`. `npm run workspace:check` PASS.

M1: `tests/unit/workspaceIsolation.test.ts` — 48 passed / 0 failed after the
repair. Pre-repair measurement of the same nine new cases: 8 failed, 1 passed
(the below-bound admit control). `node --check` over all 64 tracked
`bin/*.mjs`: PASS. `npm run hardening:check` PASS. `npm run workspace:check`
and `npm run session:check` PASS.

Accepted predecessor certification, not re-run here:

- W10 `gate:local` and clean-clone receipts recorded in the W10 REPORT;
- W10 full `npm test` and focused suite counts recorded in the W10 REPORT.

The inherited validated baseline is the certified W10 implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`. No repair of this campaign has been validated yet.

## Decisions Made During This Task

Decision: open this work as its own campaign task, not a W11 wave.
Reason: the bug-hunting programme's authorization class and frozen records
cover autonomous yield; these findings are repository-wide hardening.

Decision: consume NW-15 instead of executing it.
Reason: W10 closed and certified under its own owner.

Decision: follow the plan's dependency order rather than priority alone.
Reason: NW-03, NW-04 and NW-09 consume the NW-02 path authority, and
NW-10/NW-11 consume frozen NW-09 DTOs.

Decision: do not release or remove the stale W10 session worktree.
Reason: C-00 forbids altering another session; capacity is not constrained at
four of eight.

## Discoveries

Discovery: NW-06 reproduces in live source exactly as the review recorded.
Evidence: `commandStart` in `bin/nightwatch-session.mjs` inspects current
topology, and `checkWorktreeMetadata` at `bin/workspace-integrity.mjs:437`
tests `worktrees.length > maxWorktrees` over already-registered worktrees
only. The candidate registration is never modelled, and the same function
returns on a failed ownership-record write with the branch and worktree
already created.

Discovery: the prospective admission alone cannot hold the worktree bound.
Evidence: three concurrent `start` invocations at a bound of 3 with 2
registered all passed admission and produced 4 registrations against the
pre-repair code. Admission is per-process and `git worktree add` is not
serialized against it, so the invariant is actually held by the
post-creation verification plus rollback. The concurrent case is therefore a
required regression, not an optional one.

Discovery: the canonical checkout was 16 commits behind `origin/main` at
session open, because `nightwatch-session.mjs integrate` advances the remote
ref and leaves the local `main` ref behind. It was fast-forwarded before any
truth was read from it.

## Blockers

None.

## Safety Events

NONE.

## Deferred / Follow-Up

- Strict `EXACT_REDISCOVERY`, unknown-defect yield and parent-programme
  completion remain separate and unproven.
- DEV / NEXT / production, cloud and datastore work remain out of scope.
- Release of the integrated W10 session worktree is an owner decision.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and this task's SPEC, PLAN, STATE, REPORT.
2. Read `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` sections 4, 6 and 7.
3. Discover live Git, worktree and session truth; claim this session with
   `claim --task nightwatch-repository-hardening-implementation-v1 --adopt`
   if its holder is no longer live.
4. Continue from `## Exact Next Action`. Do not reopen W0-W10.

## Completion Snapshot

Not complete. Populate only after M0-M13 and full certification close
truthfully.
