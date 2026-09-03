# Task State

## Identity

Task ID: nightwatch-certification-truth-r12-v1
Phase: CERTIFICATION_TRUTH_R12_V1
Status: IN_PROGRESS
Starting SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last validated implementation SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last substantive checkpoint SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-certification-truth-r-cd8904c5
Last checkpoint: baseline measured in the canonical checkout at cdfe9d7 — 238 suites on disk, 173 registered across the two authoritative manifests, 65 unregistered, of which 6 are campaign certification suites (C-01 x4, C-02a, C-06); the 56 C-02a + C-06 cases pass locally with siblings present
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_VALIDATED_IMPLEMENTATION_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Make the authoritative gate actually run every campaign certification suite,
enforce that as a totality rather than a per-campaign courtesy, and reconcile
the project-truth documents to the completion the repository reached.

## Current Milestone

M2 — register the six unregistered certification suites in their correct
authoritative lane.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured baseline.

## Work In Progress

M2 — adding the six unregistered certification suites to
`config/synthetic-campaign.v1.json`, the lane every existing campaign
certification suite already uses.

## Exact Next Action

Add these six paths to `files` in `config/synthetic-campaign.v1.json`:
`tests/unit/sourceOperationCompleteness.test.ts`,
`tests/unit/sourceInventoryCompleteness.test.ts`,
`tests/unit/cacheCurrentness.test.ts`,
`tests/unit/callScopedSourceRead.test.ts`,
`tests/unit/c02aOpenApiAdmission.test.ts`,
`tests/unit/c06PhpReadOnlyProof.test.ts`. Then run
`npm run campaign:synthetic` and record the receipt's file count, totals and
skip count in the Validation Ledger.

## Files Changed

- `.agent/ACTIVE_TASK.md` — routed to R-12
- `.agent/EXECUTION_PROMPT.md` — R-12 handoff header
- `.agent/tasks/nightwatch-certification-truth-r12-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-certification-truth-r12-v1/**` — new change

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS, `WORKSPACE_INTEGRITY_SATISFIED` |
| C-02a + C-06 suites at cdfe9d7 (canonical, siblings present) | 56 passed / 0 skipped / 0 failed |
| Registration census at cdfe9d7 | 238 on disk, 173 registered, 65 unregistered, 6 of them campaign certification suites |
| Campaign ledger census | 11 campaign task directories, all COMPLETE |

## Decisions Made During This Task

- Register C-02a as-is; its one real-source block already self-skips and the
  synthetic runner records the skip truthfully. No fabricated counterpart, and
  no claim of real-source execution in CI.
- Derive registry completeness from the campaign task ledger under
  `.agent/tasks/`, not from test filenames — §17 forbids a filename-only
  heuristic where stronger campaign metadata exists, and a filename rule would
  miss all four C-01 suites anyway.
- Delete the four hand-written registration loops rather than keep them beside
  the new registry; two authorities for one rule is what produced this debt.

## Measured Baseline

Three of the eleven required gate groups execute tests; none runs the full
canonical regression. Consequently the six suites below have never executed in
`gate:local`, `gate:clean` or CI:

| Campaign | Suite | Sibling-dependent |
|---|---|---|
| C-01 | `tests/unit/sourceOperationCompleteness.test.ts` | no |
| C-01 | `tests/unit/sourceInventoryCompleteness.test.ts` | no |
| C-01 | `tests/unit/cacheCurrentness.test.ts` | no |
| C-01 | `tests/unit/callScopedSourceRead.test.ts` | no |
| C-02a | `tests/unit/c02aOpenApiAdmission.test.ts` | one block, self-skipping |
| C-06 | `tests/unit/c06PhpReadOnlyProof.test.ts` | no |

C-02a + C-06 measured locally at cdfe9d7: 56 passed, 0 skipped, 0 failed
(siblings present).

## Discoveries

- C-01's four certification suites are unregistered as well; C-15b's recorded
  debt understated itself by four suites.
- `docs/CURRENT_STATE.md`'s checkpoint prose table has a malformed row —
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` carries six cells in a five-column
  table, concatenating a C-11 "Why" with an R-11 "Why".

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

C-15c owns the System Map V2 HTTP transport. C-16 owns the G-16 / EIG
ownership resolution the master ledger still lists as unowned.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-8. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-certification-truth-r-cd8904c5`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
