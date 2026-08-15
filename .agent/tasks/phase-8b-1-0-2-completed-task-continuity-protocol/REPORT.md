# Nightwatch Phase 8B.1.0.2 — Completed-Task Continuity Protocol & Historical Ledger Hardening — Report

Task ID: phase-8b-1-0-2-completed-task-continuity-protocol
Phase: 8B.1.0.2 — Completed-Task Continuity Protocol & Historical Ledger Hardening
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Report (authorization §196 format — filled as evidence lands)

1. **Starting SHA**: `2e6c2cf08fd897427956834100175396e9a43e57`
2. **Bootstrap classification**: CASE D — HEAD == origin/main == expected
   SHA; worktree clean; branch main; private remote confirmed.
3. **Pre-fix reproduction matrix**: 9/9 impossible completed-task states
   accepted by the current checker (exit 0 each) — see STATE.md M1.
4. **Current checker root cause**: first-occurrence key-value parser,
   heading-only section validation, no task-status state machine.
5. **Protocol version**: `nightwatch.agent-continuity.v2`
   (CONTINUITY_PROTOCOL_VERSION, required in ACTIVE_TASK + STATE).
6. **Protocol activation rule**: every non-NONE active task must declare v2
   (ACTIVE_TASK_PROTOCOL_REQUIRED); REPORT/PLAN inherit from STATE and must
   match if repeated.
7. **Legacy compatibility rule**: historical tasks without the marker are
   LEGACY_CONTINUITY_V1; readable; summarized warnings only in agent:check /
   agent:audit.
8. **Active task strictness rule**: ACTIVE is always strict v2; a later docs
   edit cannot corrupt a closed v2 task without CI noticing (all-v2 history
   audited).
9. **History audit rule**: `agent:audit` walks `.agent/tasks/*` safely
   (symlink rejection), classifies each task, validates all v2 tasks, reports
   legacy warnings and counts; v2 errors are fatal.
10. **Parser architecture**: pure module `bin/agent-continuity-protocol.mjs`
    — parseKeyValuesWithLocations (key, all occurrences, line numbers,
    values), canonical-key classification, duplicate detection.
11. **Duplicate-field policy**: exact-key duplicates of canonical structured
    fields are v2 errors even when values are identical
    (DUPLICATE_CONTINUITY_FIELD with line numbers); table rows, numbered
    report fields, prose colons and repeated list items are not structured
    keys.
12. **Section parser architecture**: deterministic H2 section parser with
    body line ranges and fenced-code tracking (no Markdown package).
13. **Structured report-field parser**: top-level `Key: value`, numbered
    bold `N. **Key**: value`, and bare `**Key**: value` forms feed
    placeholder/duplicate checks.
14. **Status normalization**: NONE/IN_PROGRESS/BLOCKED/COMPLETE with
    parenthetical suffix stripping for comparison.
15. **Phase-status key derivation**: Phase "8B.1.0.2" →
    PHASE_8B_1_0_2_STATUS (uppercase, non-alphanumerics → `_`, collapse,
    PHASE_/ _STATUS); only the exact derived key is bound to task status
    (parent PHASE_8_STATUS never treated as the task's own).
16. **COMPLETE invariants**: full cross-file terminal-state contract (see
    SPEC/PLAN) with the §21 checks; diagnostics per §43.
17. **BLOCKED invariants**: Blockers non-NONE; next action STOP or concrete
    unblock; no false COMPLETE; phase binding BLOCKED.
18. **IN_PROGRESS invariants**: milestone + next action present; no false
    COMPLETE; WIP may be NONE between milestones.
19. **Placeholder sentinel contract**: `(filled at close|closure|after
    push|after finalization push)`, `(record after CI)`, TBD,
    TO_BE_FILLED, FILL_AT_CLOSE, PLACEHOLDER, `<FINAL_SHA>`, `<CI_RUN>`,
    `TODO: final`, `PENDING (final)`, `UNKNOWN_AT_CLOSE` — rejected in v2
    COMPLETE live/final fields.
20. **Placeholder scan scope**: structured value lines, numbered bold final
    fields, Validation Ledger, Completion Snapshot, listed live sections.
21. **Code-fence / historical-prose false-positive handling**: fenced code,
    blockquotes and table rows excluded; Decision Log/Discoveries/Deferred
    narrative excluded.
22. **Non-self-referential SHA rule**: only known SHAs are recorded;
    live head is `LIVE_HEAD_AUTHORITY: GIT` / `DISCOVER_FROM_GIT`.
23. **Non-self-referential CI rule**: `FINAL_CI_AUTHORITY:
    GITHUB_ACTIONS_FOR_LIVE_HEAD` (authority marker, not a placeholder);
    the chat report states the actual run ID after completion.
24. **DISCOVER_FROM_GIT behavior**: intentional authority marker, never a
    placeholder error.
25. **REPORT completion rule**: required for v2 COMPLETE with top-level
    Status COMPLETE (COMPLETE_REPORT_MISSING / _STATUS_MISMATCH /
    _STATUS_MISSING).
26. **PLAN milestone completion rule**: COMPLETE tasks require the
    `## Milestones` section free of PENDING/IN_PROGRESS/NOT_STARTED/TODO
    for their own milestones.
27. **Completion Snapshot rule**: non-empty, contains a positive terminal
    token, no unresolved sentinel.
28. **Resume Recipe rule**: no live resume instructions for COMPLETE tasks;
    terminal indication required.
29. **New diagnostic codes**: ACTIVE_TASK_PROTOCOL_REQUIRED,
    PROTOCOL_VERSION_MISMATCH, UNSUPPORTED_PROTOCOL_VERSION,
    TASK_STATUS_MISMATCH, TASK_ID_MISMATCH, TASK_PHASE_MISMATCH,
    CURRENT_PHASE_STATUS_MISMATCH, DUPLICATE_CONTINUITY_FIELD,
    COMPLETE_MILESTONE_NONTERMINAL, COMPLETE_HAS_WORK_IN_PROGRESS,
    COMPLETE_NEXT_ACTION_NONTERMINAL, COMPLETE_RESUME_RECIPE_NONTERMINAL,
    COMPLETE_REPORT_MISSING, COMPLETE_REPORT_STATUS_MISMATCH,
    COMPLETE_REPORT_STATUS_MISSING, COMPLETE_SNAPSHOT_INCOMPLETE,
    COMPLETE_UNRESOLVED_PLACEHOLDER, COMPLETE_PLAN_MILESTONE_PENDING,
    BLOCKED_WITHOUT_BLOCKER, BLOCKED_REPORT_FALSE_COMPLETE,
    BLOCKED_STATUS_MISMATCH, IN_PROGRESS_REPORT_FALSE_COMPLETE,
    IN_PROGRESS_NEXT_ACTION_TERMINAL, IN_PROGRESS_PHASE_STATUS_COMPLETE,
    DUPLICATE_REPORT_FIELD, CONTINUITY_ANCHOR_MISMATCH,
    TASK_DIRECTORY_SYMLINK_REJECTED, LEGACY_TASK_NOT_STRICTLY_VALIDATED,
    LEGACY_HIGH_SEVERITY_CONTINUITY_FINDING.
30. **agent:audit command**: `npm run agent:audit` →
    `node bin/agent-state.mjs --audit-history`.
31. **agent:check new behavior**: existing Git/heading/secret checks +
    strict v2 ACTIVE validation + all-v2 history audit + legacy summary.
32–121. **Closure evidence fields** (history/migration evidence, test
matrices, implementation anchors, CI runs, regression results, digests,
safety vector, final Git state, verdicts): recorded at task closure before
this report is marked COMPLETE. The v2 placeholder rule forbids future-value
sentinels in COMPLETE state; this IN_PROGRESS report intentionally contains
none.
