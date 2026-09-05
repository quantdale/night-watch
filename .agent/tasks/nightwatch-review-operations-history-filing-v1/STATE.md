# Task State

## Identity

Task ID: nightwatch-review-operations-history-filing-v1
Phase: REVIEW_OPERATIONS_HISTORY_FILING_V1
Status: IN_PROGRESS
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last substantive checkpoint SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-review-operations-his-7431812c
Last checkpoint: M11 — 34 review-ops mutations, 31 detected, 3 declared, 0 unexplained; DEF-RO-4 closed
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REVIEW_OPERATIONS_HISTORY_FILING_V1_STATUS: IN_PROGRESS

## Objective

Make the owner-local review store operationally visible and its history
auditable across artifact generations; make the human filing report
review-state aware with a production-local generation path; propagate real
historical identity into finding history and repair the vacuous
regression-candidate lineage guard; repair the predecessor terminal report's
implementation anchor. No production, NEXT, DEV or live C-12 contact; no
retention policy; no destructive review-store operation.

## Current Milestone

Milestone ID: M12
Milestone status: IN_PROGRESS
What is being attempted: browser qualification of the review-operations view,
history drill-down and filing report.

## Completed Milestones

- M11: mutation campaign. `bin/review-operations-mutation-campaign.mjs`:
  34 introduced, 31 detected, 3 survived (2 CONTROL + 1 EQUIVALENT, each
  declared), 0 unexplained survivors, restore drift NONE. Brief items 17 and
  18 have no mutation and the receipt says why: no derived index was built,
  because measurement showed directory scans linear and adequate at 50k.
  RO-B-32 was predicted EQUIVALENT and DETECTED; it is reclassified
  BEHAVIOURAL with the misprediction recorded rather than relabelled away.
  With the 28 structural mutations in
  `tests/unit/reviewOperationsHardening.test.ts`, 62 mutations total.
  DEF-RO-4 closed — see `## Safety Events`.
- M10: scale. `bin/review-operations-scale.mjs`, one fresh OS process per
  size. At 10k/25k/50k reviews: disk 15.8/39.5/79.0 MiB at a flat 1657 B per
  review; discovery 26/80/142 ms; shallow inventory 26/79/163 ms; deep
  inventory 443/1112/2185 ms; one finding's history 12/23/45 ms; the 50-row
  reviewer page WITH the store wired 224/372/609 ms; wire payload flat at
  ~26 KB; peak RSS 110/154/179 MiB. Every curve linear in store size, so no
  derived index was built. Found and fixed a quadratic filing-report path
  (613 ms at 500 findings, ~15 s at the 2500 pairwise limit) by scoping
  intelligence to the one finding the report is about; guarded by call shape,
  not by a latency bound.
- M9: determinism across fresh processes, four TZ/locale combinations and
  three enumeration permutations; concurrency including a 2/4/8/16-way
  same-binding race and an inventory interleaved with 60 publishes; 15
  corruption classes each planted in all three traversal positions; a ten-
  class privacy red team across four surfaces.
- M8: `checkReviewOperationsBoundary()` with 28 mutations proving it bites.
  Two survived the first run: one exposed a safe-occurrence gap in the rule
  itself, the other was a badly aimed mutation. The new declaration-parity
  conjunct found three real omissions in
  `bin/agent-continuity-protocol.d.mts` on its first run.
- M7: Control Center review-operations view, three read routes, and the
  navigation test rewritten to derive the view set from `VIEW_DEFINITIONS`
  instead of counting to nine.
- M6: `bin/nightwatch-review.mjs` with `bin/lib/review-cli.mjs`.
- M5: review-state-aware filing report and `buildFilingReport`.
- M4: historical identity propagation and DEF-RO-2.
- M2/M3: `listEntries()`, the inventory core and the history core.
- M1: DEF-RO-1 closed, and DEF-RO-3 with it. `inspectTerminalImplementationAnchor`
  in `bin/agent-continuity-protocol.mjs` refuses a live-authority marker, a
  closure placeholder, or a SHA contradicting `LAST_VALIDATED_IMPLEMENTATION_SHA`
  in a terminal COMPLETE REPORT, scanning only the report's own identity
  region. Two iterations were needed and both were found by running the rule
  over the 128 recorded task directories rather than by reasoning about it:
  scanning the whole document read Phase 16H's quotation of its PREDECESSOR's
  anchor as a self-claim, and copying the safety-events scanner's
  skip-fenced-content behaviour would have inspected two of the twelve
  REPORTs carrying the field and passed the other ten silently. Bounding the
  scan to "before the second level-2 heading, fences included" separates all
  eleven self-claims from the one predecessor reference with no carve-outs.
  Repairs: RP-1's REPORT anchor `DISCOVER_FROM_GIT` → `1ec3ae0` (DEF-RO-1);
  AH-1's REPORT anchor `4c263e1` → `46e241a` (DEF-RO-3 — the header lagged
  the DEF-AH1-9 advance that STATE and ACTIVE_TASK both carried; the history
  of the advance is preserved in the header rather than erased).
  `tests/unit/terminalAnchorTruth.test.ts` 11/11, including a corpus sweep
  that asserts it inspected at least ten real documents. `agent:audit`
  strict_errors 0 across 128 tasks.
- M0: campaign opened. OpenSpec change
  `nightwatch-review-operations-history-filing-v1` with audit, proposal,
  design, tasks and one delta spec; `.agent` task SPEC/PLAN/STATE;
  `.agent/EXECUTION_PROMPT.md` rebound; `.agent/ACTIVE_TASK.md` routing block
  bound to this campaign and to session worktree
  `session/nightwatch-review-operations-his-7431812c`.

## Work In Progress

M12.

## Safety Events

ONE workspace-integrity event. Recorded here in full because the campaign
report must not default this field to NONE.

- `WORKSPACE_MUTATION_HARNESS_RESIDUE` (2026-09-05). While syntax-checking
  `bin/review-operations-mutation-campaign.mjs`, the module was imported in a
  background shell and killed after two seconds. Importing runs `main()`, so
  the harness applied its first mutation — a one-line guard in
  `src/core/reviewStore/inventory.ts` that skips corruption once a valid
  artifact has been counted — and the kill pre-empted the `finally` that
  restores. The next `git add -A` swept that line into commit `6eb2a0b`.
  Detected by the campaign's own `ANCHOR_NOT_UNIQUE` report on the next run
  (`occurrences=0`, because the mutation was already applied), confirmed with
  `git log -S`, and reverted in `c9edef9`.
  - Blast radius: one line, one file, inside the session worktree. Nothing
    was pushed. `git diff 2a05a0d 6eb2a0b` confirms the only source change.
  - No authorization boundary was crossed: no production, NEXT or DEV
    contact, no external publication, no credential access, no sibling
    write, no force push, no history rewrite, and no review artifact was
    deleted or modified.
  - It exposed a real defect (DEF-RO-4) rather than only a process slip: the
    mutation SURVIVED thirty-three passing tests, because every corruption
    test corrupted the first file in sorted traversal order and the guard
    therefore never fired.
  - Rules adopted: never execute a mutation harness to check its syntax
    (`node -c` only), and never `git add -A` after a killed harness run.

## Blockers

None.

## Exact Next Action

Extend the Control Center browser lane to cover the review-operations view,
the history drill-down, a stale generation, a current generation, the filing
report, refresh and a server restart, for at least 30 loops.

## Files Changed

- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`
- `.agent/tasks/nightwatch-review-operations-history-filing-v1/{SPEC,PLAN,STATE,REPORT}.md`
- `openspec/changes/nightwatch-review-operations-history-filing-v1/**`

## Validation Ledger

- M0: `agent:check` PASS (2 warnings), `handoff:check` PASS,
  `hardening:check` PASS, `project:check` PASS.
- M1: `agent:audit` strict_errors 0 / 128 tasks (2 real hits before repair),
  `tests/unit/terminalAnchorTruth.test.ts` 11 passed,
  `hardening:check` PASS, `agent:check` PASS.

## Decisions Made During This Task

See `PLAN.md` `## Decision Log` (D-RO-1 .. D-RO-7).

## Discoveries

- The section-8 `DISCOVER_FROM_GIT` question resolves per field, not
  wholesale. `Live HEAD` and `origin/main` are the documented live-authority
  convention (`AGENTS.md:337`, `bin/agent-state.mjs:545`,
  `bin/project-state-check.mjs:123,289`, both `.agent/templates`).
  `Implementation anchor` is not: it is a stable historical anchor, its value
  was already recorded as `LAST_VALIDATED_IMPLEMENTATION_SHA:
  1ec3ae02c7942e95fc124664409adb65a8eec334` before the REPORT was committed at
  `d1ebde9`, and eight of the eleven REPORTs carrying the field record a
  concrete SHA. Allocated DEF-RO-1.
- `reviewerAuthority.ts` fabricates `sourceSha: '0'.repeat(40)` in two places.
  Allocated as part of M4; the honest value already exists as
  `CONTROL_CENTER_REVIEW_NO_SOURCE`.
- `classifyRecurrence`'s regression branch guards on
  `latest.sourceSha !== undefined`, which `assertHistoryEntry` has already
  proven true. Allocated DEF-RO-2.

- `renderHumanFilingReport()` has no production caller: `grep` across
  `src/`, `bin/`, `ui/` finds it only in `src/core/findingReview/` and two
  test files. "Wire the persisted review state into the production-local
  report path" therefore requires building that path, not editing it.
- `PrivateArtifactStore.readJson` calls `ensureOwnerDirectory` — `mkdir` plus
  `chmod` — whenever the handle is not read-only. An inventory built on a
  writable handle would mutate the store root's metadata on every run.

## Deferred / Follow-Up

- A review-store envelope v2 carrying per-generation semantic identity.
- Any retention, archival or pruning policy.

## Resume Recipe

Read this file, then `PLAN.md` milestones, then continue from Exact Next
Action inside the session worktree
`session/nightwatch-review-operations-his-7431812c`.

## Completion Snapshot

Not complete.
