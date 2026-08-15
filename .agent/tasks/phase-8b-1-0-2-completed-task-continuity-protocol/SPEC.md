# Nightwatch Phase 8B.1.0.2 — Completed-Task Continuity Protocol & Historical Ledger Hardening

Task ID: `phase-8b-1-0-2-completed-task-continuity-protocol`
Phase: 8B.1.0.2 — Completed-Task Continuity Protocol & Historical Ledger Hardening
Status: IN_PROGRESS
Starting SHA: 2e6c2cf08fd897427956834100175396e9a43e57
Authorization class: PHASE_8B_1_0_2_CONTINUITY_PROTOCOL_HARDENING_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Owner authorization (frozen)

This authorization covers ONLY the continuity subsystem:

- repairing the remaining known Phase 8B.1.0 / 8B.1.0.1 ledger contradictions;
- designing and implementing a versioned continuity protocol
  (`nightwatch.agent-continuity.v2`);
- strengthening `bin/agent-state.mjs` or a narrowly factored equivalent;
- adding comprehensive agent-state tests;
- adding a history-audit command;
- updating task templates / agent-continuity documentation;
- updating CI to run the strict continuity audit;
- migrating the CURRENT Phase 8B.1 lineage (8B.1, 8B.1.0, 8B.1.0.1, 8B.1.0.2)
  to the strict protocol where supported by actual durable evidence;
- running all relevant regression suites;
- committing and pushing validated Nightwatch changes.

It does NOT authorize: another Phase 8B.1 promotion, canonical promotion
prepare/approve/apply, creating a new canonical-promotion approval,
resetting/reusing/deleting the spent approval, writing a real adopted case,
changing the bounded proposal portfolio, adding a third self-development
candidate, changing self-development evaluator semantics, product/DEV/NEXT/
production access, DB or infrastructure work, AI/model execution, Alphaus
repository writes, or external publication. The real canonical adopted-case
catalog MUST remain empty.

## Systemic defect being fixed

The repository-native continuity checker validates syntax, Git anchors and
some checkpoint semantics, but it does NOT enforce a coherent TASK STATUS
STATE MACHINE across the durable recovery files (ACTIVE_TASK → STATE → PLAN →
REPORT). States such as `Status: COMPLETE` coexisting with
`PHASE_<...>_STATUS: IN_PROGRESS`, `Current milestone: M17 pending`,
`Work In Progress: M12`, `Exact Next Action: continue...`,
`(filled after push)` placeholders are accepted with exit 0 (pre-fix
reproduction: 9/9 impossible states accepted). The fix makes those
contradictions mechanically invalid for all v2 tasks.

## Protocol semantics (frozen intent)

- Version marker `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`
  required in ACTIVE_TASK and matching STATE for every non-NONE active task.
- COMPLETE is a cross-file semantic state: ACTIVE/STATE/report status agree;
  current phase-specific status normalizes COMPLETE; current milestone
  terminal; WIP empty; next action terminal; resume recipe terminal; report
  COMPLETE; completion snapshot complete; no unresolved closure placeholders;
  PLAN live milestones closed; no contradictory duplicate structured fields;
  valid implementation/docs anchors.
- BLOCKED must be actually blocked: Blockers section non-NONE; next action
  STOP or a concrete unblock condition; no false COMPLETE claim.
- IN_PROGRESS must be actually active: milestone and next action present;
  no false COMPLETE claim.
- Duplicate canonical structured keys are errors in v2 (even with identical
  values) — `DUPLICATE_CONTINUITY_FIELD` with line numbers.
- Future-value placeholders (e.g. `(filled after push)`, `(filled at close)`)
  are rejected in COMPLETE live/final fields; `DISCOVER_FROM_GIT` and
  `LIVE_HEAD_AUTHORITY: GIT` are intentional authority markers, not
  placeholders.
- No self-referential finalization: tracked documents record only SHAs/run
  IDs already known before the document commit; live HEAD is Git authority;
  live CI is GitHub Actions for the live head.
- Legacy tasks without the v2 marker remain readable historical records
  (`LEGACY_CONTINUITY_V1`); only the current active task is strict-required,
  and `agent:audit` validates every v2 task (including closed ones) while
  reporting legacy tasks as summarized warnings.

## Non-goals

- NO mass migration of every older Phase 1–8 task.
- NO weakening of existing SHA/checkpoint/secret/changed-path validations.
- NO new external dependencies (no Markdown/YAML/schema packages).
- NO checker filesystem writes; read-only audit.
- NO selfDev evaluator/portfolio/contract semantic changes
  (contractDigest must remain unchanged).
- NO canonical promotion activity of any kind.

## Completion criteria

- v2 protocol implemented; active tasks cannot evade it
  (ACTIVE_TASK_PROTOCOL_REQUIRED).
- agent:check strict-validates ACTIVE task + all v2 history tasks; fails on
  any v2 semantic contradiction; legacy tasks warnings only.
- agent:audit (`node bin/agent-state.mjs --audit-history`) reports task
  inventory, protocol classification, counts, and v2 errors.
- Comprehensive agent-state test matrix (happy/negative/duplicate/
  placeholder/false-positive/blocked/in-progress/legacy/history-corruption).
- The four current-lineage tasks (8B.1 BLOCKED, 8B.1.0 COMPLETE, 8B.1.0.1
  COMPLETE, 8B.1.0.2 COMPLETE) pass strict v2 with zero errors; the
  8B.1.0.1 fill-after-push placeholders replaced with actual historical
  values; 8B.1.0 stale M17 milestone and 29-test row corrected.
- Self-hosting: this task passes v2 in IN_PROGRESS and final COMPLETE modes.
- Full regression green; exact CI green with a "Completed-task continuity
  audit" step; canonical catalog byte-identical and empty; Phase 8B.1 retry
  NOT started.
- Final verdict: PHASE_8B_1_0_2_COMPLETE; next action STOP.
