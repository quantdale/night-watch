# Task State

## Identity

Task ID: nightwatch-c10-provenance-truth-closure-v1
Phase: C10_PROVENANCE_TRUTH_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
Branch: session/nightwatch-c10-provenance-truth--ba3470bc
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
LAST_VALIDATED_IMPLEMENTATION_SHA: e0e3728ed273eabbc51c50bbc63889c8fb1257fc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e0e3728ed273eabbc51c50bbc63889c8fb1257fc
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_C10_PROVENANCE_TRUTH_CLOSURE_V1_STATUS: IN_PROGRESS

## Objective

Bind the C-10 production privacy vocabularies mechanically to genuine source
evidence, and reconcile repository project-state truth, so C-11 `PROD_OBSERVE`
may rely on C-10 as a real prerequisite rather than on a self-asserted
provenance label.

## Current Milestone

M0 — campaign records and activation.

## Verified Starting Truth

Discovered independently before any file was modified:

| Fact | Verified value | How |
| --- | --- | --- |
| Repository | `quantdale/night-watch` | `git remote -v` |
| `origin/main` | `cb631cc4af3c3572f4cbf78da04a8265075fbfa5` | `git fetch` + `rev-parse` |
| Local HEAD | identical to `origin/main`; tree clean | `git status --porcelain` empty |
| Worktrees | canonical only, on `main` | `git worktree list` |
| Prior active task | `nightwatch-production-privacy-firewall-c10-v1`, COMPLETE | `.agent/ACTIVE_TASK.md` |
| C-10 substantive implementation | `23523cc743c77b2250738caa980c218dab8671bb` | ancestor of HEAD |
| Final exact-head CI | run `33601265465` at `cb631cc`, `success` | GitHub API, read-only |
| Final exact-head job | `100155266632` "Executable quality gate", `success` | GitHub API, read-only |
| Node major | 20 | gate receipt in run log |
| Required groups | all eleven PASS | gate receipt in run log |
| `SYNTHETIC_CAMPAIGN` | 221 total / 221 passed / 0 failed | gate receipt |
| Receipt digest | `receipt:sha256:f38b272bec3a37464257e194` | gate receipt |

The prompt's §0 expectations matched reality exactly. No rebase of the campaign
plan was required.

### Delta against repository documents

Two repository documents were BEHIND this verified truth at campaign start,
which is the A9/A11 defect this campaign repairs:

- `.agent/ACTIVE_TASK.md` named run `33600603779` / job `100153229914` at
  `1234daf` with receipt `receipt:sha256:aecae84fb070b89734a6efc0` — a real
  but superseded run.
- `docs/CURRENT_STATE.md` named run `33590645175` / job `100123768379` at
  `b99ce4e` with receipt `receipt:sha256:120582acb7bb971190a3a05d`, and held
  all five live anchors at `b99ce4e`.

`b99ce4e`, `23523cc` and `1234daf` are all ancestors of `cb631cc`, so the
staleness is ancestor substitution rather than divergence — precisely the class
A10 must learn to detect.

## Completed Milestones

None terminal yet.

## Work In Progress

M0 — campaign records and activation. Task `SPEC.md`, `PLAN.md`, `STATE.md`,
`REPORT.md` and the OpenSpec change (`audit.md`, `proposal.md`, `design.md`,
`tasks.md`, `specs/production-provenance-authority/spec.md`) are written and
tracked. `.agent/EXECUTION_PROMPT.md` is rewritten with
`Planned-From: cb631cc` and `.agent/ACTIVE_TASK.md` is routed to this task.

Remaining in M0: route the `docs/CURRENT_STATE.md` live-state block to this
task, then obtain `handoff:check` PASS and `agent:check` PASS.

## Exact Next Action

Update the `LIVE_STATE_PROTOCOL_VERSION` block in `docs/CURRENT_STATE.md` so
`LIVE_TASK_ID` is `nightwatch-c10-provenance-truth-closure-v1`, `LIVE_PHASE`
is `C10_PROVENANCE_TRUTH_CLOSURE_V1`, `LIVE_TASK_STATUS` is `IN_PROGRESS`,
`LIVE_NEXT_ACTION_STATE` is `CONTINUE` and `LIVE_COMPLETION_CLAIM` is
`IN_PROGRESS`, while leaving `LIVE_PROJECT_COMPLETION_STATUS`
(`OPERATIONALLY_ACCEPTED`) and `LIVE_PROJECT_VERDICT_EFFECT` (`PRESERVE`)
intact. Then run `npm run handoff:check` and `npm run agent:check` and close
M0.

## Files Changed

| Path | Change |
| --- | --- |
| `.agent/ACTIVE_TASK.md` | routed to this campaign |
| `.agent/EXECUTION_PROMPT.md` | rewritten for this campaign, `Planned-From: cb631cc` |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/SPEC.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/PLAN.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/STATE.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/REPORT.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/audit.md` | new, carries the recorded A2 reproduction |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/proposal.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/design.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/tasks.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/specs/production-provenance-authority/spec.md` | new |

## Validation Ledger

| Check | Result | Notes |
| --- | --- | --- |
| Git/CI starting-truth verification | PASS | read-only; every §0 expectation confirmed |
| A2 forgery reproduction | REPRODUCED | four distinct failures captured in `audit.md` |
| `handoff:check` | PENDING | run at M0 close |
| `agent:check` | PENDING | run at M0 close |

## Decisions Made During This Task

- **Verify §0 before trusting it.** The prompt's CI expectations disagreed with
  both `ACTIVE_TASK.md` and the `CURRENT_STATE` narrative. Resolved read-only
  through the GitHub API: run `33601265465` / job `100155266632` at `cb631cc`
  with receipt `receipt:sha256:f38b272bec3a37464257e194` is real and green, so
  the prompt is correct and both repository documents are behind. A9 and A11
  therefore transcribe verified values, and the two stale documents are the
  defect rather than the prompt.
- **Runtime brand over type brand.** A6 requires that serialized JSON cannot
  become a trusted capability by matching shape. `Object.freeze` plus shape
  validation — all C-10 had — cannot express that, and a TypeScript brand is
  erased at runtime. A module-private `WeakSet` keyed on object identity is
  pure, so it is cone-legal, and it fails closed across any serialization
  boundary.
- **No digest parameter at all.** Validating a supplied digest against a
  recomputation only proves internal consistency: a caller who supplies both
  members and digest supplies a self-consistent pair. The mint therefore
  exposes no digest parameter, making the forgery inexpressible rather than
  merely detectable.

## Discoveries

- The A2 weakness is real and wider than the brief assumed: there is no
  non-test producer of either vocabulary anywhere in `src/` or `bin/`, so every
  `SOURCE_PROVEN_*` claim in the shipped system originated from a test fixture.
  C-10 built and tested the consumption side of the boundary; the minting side
  was never built.
- `routeVocabulary.ts`'s own header asserts that "the provenance digest binds
  this set to that source". No code performed that binding — the comment
  described an intent the implementation never had, which is plausibly how the
  gap survived review.
- The `CURRENT_STATE` drift is broader than the five fields A9 names: the
  "Exact-head CI is green" narrative section also still described run
  `33590645175` at `b99ce4e`.
- `node:crypto` is already the one node builtin the C-10 cone may import, so
  computing provenance identity inside the cone is legal under the existing
  Workstream E isolation rule and needs no gate change.

## Blockers

None.

## Safety Events

None. Safety ledger:

| Item | Value |
| --- | --- |
| Real production contact | 0 |
| Real DEV contact | 0 |
| Real NEXT contact | 0 |
| Credential / auth-state inspection | 0 |
| Sibling repository writes | 0 |
| External publication | 0 |
| Real customer identifiers used | 0 (synthetic sentinels only) |
| Implementation in canonical checkout | 0 |

## Deferred / Follow-Up

C-11 `PROD_OBSERVE` (Stage B) is deliberately not started in this task and is
hard-gated behind the Stage-A completion gate.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-c10-provenance-truth--ba3470bc`
2. `node bin/nightwatch-session.mjs status` — confirm the session worktree is
   owned and the canonical checkout is untouched.
3. Read this file's `## Exact Next Action`, then `PLAN.md` `## Milestones` for
   the first non-terminal milestone.
4. Implement → validate → record results here → advance.

## Completion Snapshot

Not complete. Stage A is complete only when every item of the A15 gate holds;
if any item fails, Stage A is reported incomplete and C-11 is not started.
