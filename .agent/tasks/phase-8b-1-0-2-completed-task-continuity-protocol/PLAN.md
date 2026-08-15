# Nightwatch Phase 8B.1.0.2 — Completed-Task Continuity Protocol & Historical Ledger Hardening — Plan

## Purpose

Make cross-file task-status contradictions (COMPLETE with live milestones,
WIP, active next actions, fill-after-push placeholders, duplicate structured
fields) mechanically invalid for every future active task, while keeping
legacy historical tasks readable. Introduce `nightwatch.agent-continuity.v2`,
a strict semantic layer over the EXISTING canonical fields/sections, a
history-audit mode, comprehensive tests, CI enforcement, and migrate the
current 8B.1 lineage to v2.

## Starting State

- Task ID: phase-8b-1-0-2-completed-task-continuity-protocol
- Starting SHA: 2e6c2cf08fd897427956834100175396e9a43e57
  (bootstrap CASE D: HEAD == origin/main == expected SHA; worktree clean).
- Current checker: `bin/agent-state.mjs` (534 lines; parseKeyValueFile uses
  first-occurrence semantics; heading checks; Git anchor checks; secret scan;
  classifySha; no status state machine, no section-content semantics).
- Existing test suite: `tests/unit/agent-state.test.ts` (530 lines,
  25+ tests) using a synthetic fixture helper `writeProtocol()` — IN_PROGRESS
  fixtures without any protocol marker.
- Pre-fix reproduction (M1, synthetic fixtures, current checker): 9/9
  impossible completed-task states ACCEPTED (exit 0) — PHASE_TEST_STATUS
  IN_PROGRESS; milestone "M17 pending"; WIP "M12 — run tests"; next action
  "continue M12 → M18"; snapshot "(filled at close)"; REPORT Status
  IN_PROGRESS; duplicate CI_STATUS PASS/PENDING; PLAN "M18: PENDING";
  REPORT Task ID mismatch.
- Known live defects to reconcile: 8B.1.0.1 STATE `PHASE_8B_1_0_1_STATUS:
  IN_PROGRESS (this task)`; STATE `CANONICAL_CATALOG_POST_DIGEST:
  (filled at close...)`; STATE ledger/final-CI and completion-snapshot
  fill-at-closure lines; REPORT items 53–56/74–76/81 "(filled after
  finalization push)"; 8B.1.0 STATE `## Current Milestone` still "M17 ...
  pending"; 8B.1.0 Files Changed row "29 tests".
- Templates exist: `.agent/templates/{SPEC,PLAN,STATE,REPORT}.template.md`.
- Hardening registry: `bin/hardening-check.mjs` (check functions + fail()).

## Scope

- New pure protocol module `bin/agent-continuity-protocol.mjs`
  (parseKeyValuesWithLocations, parseMarkdownSections, normalizeTaskStatus,
  derivePhaseStatusKey, placeholder scanner, state-machine validators).
- `bin/agent-state.mjs`: keep Git/filesystem authority; add strict v2
  validation of the ACTIVE task; add `--audit-history`; keep read-only.
- `tests/unit/agent-state.test.ts`: upgrade fixture to v2 (IN_PROGRESS base),
  add COMPLETE/BLOCKED helpers and the full required matrix.
- `package.json`: add `agent:audit`.
- `.github/workflows/hardening.yml`: add "Completed-task continuity audit"
  step.
- `bin/hardening-check.mjs`: add static continuity-integrity assertions.
- `AGENTS.md`, `.agent/README.md`, `.agent/PLANS.md`, templates: v2 rules.
- Migrate `.agent/ACTIVE_TASK.md` and the four lineage task dirs to v2.

## Non-Goals

- No mass migration of older Phase 1–8 tasks (legacy v1 remains).
- No new dependencies; no NLP/fuzzy prose understanding.
- No checker writes to the filesystem.
- No selfDev/portfolio/contract/ownerScope/promotion source changes.
- No weakening of existing Git anchor, implementation-role, secret,
  changed-path, or deprecated-field validations.
- No canonical promotion activity.

## Safety Constraints

- Checker and audit remain deterministic, local, read-only, network-free.
- Git commands remain read-only (rev-parse, cat-file, merge-base, diff,
  diff-tree, rev-list, status, ls-files).
- Task-directory symlinks skipped/rejected (no traversal outside
  `.agent/tasks`).
- Canonical catalog byte-identical and empty
  (ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334).
- selfDev contractDigest unchanged (no selfDev source edits).
- No secrets in task files; existing secret scan kept.
- Fast-forward pushes only; stop if origin/main advances.

## Architecture / Approach

- `bin/agent-continuity-protocol.mjs` — pure ESM module, no fs/git:
  - `parseKeyValuesWithLocations(text)` → records {key, value, line,
    occurrenceIndex}; canonical-key classification (known human fields +
    UPPER_SNAKE pattern); duplicate detection.
  - `parseMarkdownSections(text)` → H2 section name → body line ranges,
    with fenced-code line tracking.
  - `normalizeTaskStatus(value)` → NONE/IN_PROGRESS/BLOCKED/COMPLETE
    (parenthetical suffixes stripped).
  - `derivePhaseStatusKey(phase)` → PHASE_<TOKEN>_STATUS.
  - `scanClosurePlaceholders(lines, scope)` → sentinel matches.
  - `validateTaskV2({active, state, plan, report, dir})` → diagnostics with
    machine-stable codes, relative paths and line numbers.
  - `auditTaskDirectory(...)` for history mode.
- `bin/agent-state.mjs` — existing repo/Git checks unchanged; then:
  - non-NONE ACTIVE → protocol required + strict v2 validation;
  - history audit of all `.agent/tasks/*` (v2 strict, legacy summarized);
  - output diagnostics + counts; exit codes.
- State machines per authorization §21/§35/§36 with the §43 diagnostic codes.
- Terminal matchers: small explicit token sets, prefix-based, with
  nonterminal-word exclusion; no prose comprehension.
- Placeholder scope: structured value lines, numbered bold report fields,
  listed live sections; excluded: fenced code, blockquotes, table rows,
  Decision Log/Discoveries/Deferred narrative.
- Test matrix in `tests/unit/agent-state.test.ts` with fixture helpers
  (v2 IN_PROGRESS base; setCompleteV2/setBlockedV2; mutation helpers for
  fields, sections, duplicates, placeholders, plan milestones).

## Milestones

- M0 bootstrap + task creation — DONE (CASE D; SPEC/PLAN/STATE/REPORT
  created with v2 marker; ACTIVE_TASK updated).
- M1 pre-fix synthetic reproductions — DONE (9/9 gaps accepted; ledger in
  STATE).
- M2 protocol/diagnostic design — DONE (state machines, diagnostic codes,
  placeholder scope, audit contract; Decision Log).
- M3 parser refactor + duplicate detection — DONE.
- M4 section parser + placeholder scope — DONE.
- M5 COMPLETE state machine — DONE.
- M6 BLOCKED / IN_PROGRESS state machines — DONE.
- M7 cross-file status/phase/anchor validation — DONE.
- M8 agent:audit history mode — DONE.
- M9 comprehensive test matrix — DONE (97 tests).
- M10 AGENTS/templates/.agent docs + package script + CI step + hardening
  check — DONE.
- M11 migrate 8B.1 / 8B.1.0 / 8B.1.0.1 lineage to v2 — DONE (4/4 zero
  strict errors).
- M12 self-host active v2 task (IN_PROGRESS mode) — DONE (PASS).
- M13 focused regression (agent-state, typecheck, hardening, audit) —
  DONE (all PASS).
- M14 full repository regression (Phase 8 lineage matrices, provenance,
  campaign) — DONE (162/1, 91, 27, 98).
- M15 isolated checkout validation — DONE (full Playwright 747/4/0 at
  52a7c17; all gates PASS).
- M16 substantive commit/push + exact CI (with completed-task audit step) —
  DONE (52a7c17; CI 31883287041 success, all 23 steps).
- M17 final task closure under v2 (COMPLETE self-host) — DONE.
- M18 final docs commit (migrated records + final task docs) — DONE.
- M19 final exact CI + audit — DONE (verified in handoff).
- M20 final verification + report + STOP — DONE.

## Validation Strategy

- Focused: `npx playwright test tests/unit/agent-state.test.ts
  --project=nightwatch --workers=1`; `npm run typecheck`;
  `npm run hardening:check`; `npm run agent:check`; `npm run agent:audit`.
- Pre/post migration audit baselines (task count, v2 count, legacy count,
  strict errors, legacy warnings).
- Phase 8 lineage matrices (8A, 8A.1, 8A.1.1, 8B, 8B.0.1, 8B.1, 8B.1.0)
  unchanged; `npm run test:owner-provenance`; `npm run campaign:synthetic`.
- Full unfiltered Playwright from a clean isolated mirror workspace
  (`/tmp/nw-ws3/nightwatch` + read-only sibling mirrors), 0 failed.
- `git diff --check`; catalog digest pre/post; contractDigest unchanged
  (no selfDev source edits).
- Exact GitHub CI per commit with per-step inspection.

## Decision Log

- D-1 (2026-08-15): Factor pure protocol logic into
  `bin/agent-continuity-protocol.mjs`; keep Git/fs authority in
  `bin/agent-state.mjs`. Reason: keep the checker boundary reviewable;
  pure module unit-testable without repos.
- D-2: Duplicate canonical structured keys are v2 errors even when values
  are identical. Reason: two definitions are ambiguous for future edits;
  §41. Table rows, numbered report fields, prose colons and repeated list
  items are not structured keys.
- D-3: Placeholder scanning excludes fenced code, blockquotes and table
  rows; includes structured value lines, numbered bold report fields and the
  listed live sections. Reason: avoids false positives on historical quotes
  and drift tables while catching real unresolved finalization fields.
- D-4: Terminal matchers are small explicit prefix sets plus
  nonterminal-word exclusion (no NLP). Reason: §22/§44.
- D-5: ACTIVE task (non-NONE) must declare v2; historical inactive legacy
  tasks remain v1 warnings. Reason: forward enforcement without mass
  migration.
- D-6: agent:audit validates every v2 task directory (closed tasks stay
  protected); legacy tasks get summarized warnings only.
- D-7: COMPLETE REPORT requires top-level `Status: COMPLETE`; BLOCKED and
  IN_PROGRESS reports are optional but must not claim COMPLETE.
- D-8: The new task STATE keeps the repository's existing required heading
  set; v2 adds semantic checks, not new required fields beyond the protocol
  marker (no redundant parallel status system).
- (Populated as implementation proceeds.)

## Discoveries

- M1: current checker accepts 9/9 impossible states; root cause =
  first-occurrence key parser + no section-content semantics + no state
  machine.
- (Populated as implementation proceeds.)

## Deferred Work

- Optional per-task legacy v1 migration for older phases (only if a future
  task directly depends on them).
- Optional `--verbose` audit output.
- LEGACY_HIGH_SEVERITY findings (if any) recorded, not auto-repaired.

## Completion Criteria

- v2 protocol active; ACTIVE task cannot evade v2; legacy compatible.
- agent:check + agent:audit green on the migrated lineage with zero v2
  errors; current task self-hosts IN_PROGRESS and COMPLETE.
- Full test matrix green; full Playwright 0 failed; exact CI green incl.
  the completed-task audit step.
- Catalog byte-identical empty; contractDigest unchanged; no promotion.
- Final verdict PHASE_8B_1_0_2_COMPLETE; NEXT ACTION STOP.
