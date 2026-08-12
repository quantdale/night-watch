# Nightwatch Phase 2C — Replay + Oracle Verification

## Purpose

Audit and harden the shared replay, oracle, evidence, comparison, and failure
attribution model, then verify it with a bounded serial repetition matrix over
the three existing Phase 2B Ripple canaries.

## Starting State

- Task ID: `phase-2c-replay-oracle-verification`
- Starting Nightwatch SHA: `1760e594419cabdcec12f6506cabe3aa242331c4`
- Validated implementation baseline: `78e5d1f049064e594f99ed7e600ecffb081d6b23`
- Completion checkpoint: `1b6e7a5ad2d0566aca84a370caa6989e71573f57`
- Phase 2A/2B safety, auth, evidence, semantic registry, declarative engine,
  three journey contracts, and serial runner are established inputs.
- External auth is outside the repository and must be checked by booleans
  before each real context; no auth value may be printed or inspected.

## Scope

Recovery and closure audit; native Phase 2C task creation; journey contract and
oracle/replay inventory; replay isolation and comparator hardening; generic and
journey-specific oracle audit; false-positive/false-negative catalogs;
sanitized fingerprint, causality, variance, and admission model; synthetic
failure/golden fixtures; pre-real gate; six serial real contexts; differential
analysis; safety/privacy/adversarial review; final validation and closure.

## Non-Goals

Phase 3/change intelligence, new journeys/actions, datastore work, product
fixes, mutation, production, fuzzing, AI diagnosis, intentional reproduction
of historical anomalies, and broad source archaeology.

## Safety Constraints

- Modify Nightwatch only; all Alphaus repositories remain read-only.
- Preserve the canonical fail-closed proxy/browser/OutboundPolicy/auth and
  metadata-first privacy kernel.
- No new host approval, production attempt, mutation, datastore query,
  intentional UNKNOWN action, body/DOM/trace/screenshot persistence, or stale
  auth run.
- Serial base matrix is exactly J1-C1, J1-C2, J2-C1, J2-C2, J3-C1, J3-C2.
- Stop remaining real execution on any safety/privacy/auth integrity event.
- At most one diagnostic real context may follow each proven Nightwatch defect,
  under a new matrix version and after full local revalidation.

## Architecture / Approach

1. Reconcile Phase 2A/2B closure with Git and record the terminal/implementation
   SHA meanings in STATE; do not reopen Phase 2B.
2. Freeze the Phase 2B journey set and compute a durable contract/digest
   representation before implementation and before the real matrix.
3. Inventory actual current generic/journey oracles, replay lifecycle,
   resource status taxonomy, request/route normalization, evidence schema,
   auth gate, comparator, and current test coverage. Classify risks from source
   and tests.
4. Implement only shared hardening: versioned result dimensions, sanitized
   fingerprints, causality/failure attribution, robust resource/content/JSON
   classifications, fresh-context isolation, comparator normalization, and
   golden synthetic fixtures. Never weaken strict safety or journey behavior.
5. Run the comprehensive synthetic matrix and full local validation. Perform
   the pre-real adversarial review and checkpoint exact matrix/oracle/contract
   versions and next commands.
6. Validate auth and safety immediately before each serial fresh context. Run
   the six-context matrix without concurrency or unbounded retry. Checkpoint
   evidence after each journey pair.
7. Compare Phase 2B plus Phase 2C evidence dimension by dimension; assign
   anomaly fingerprints, attribution, admission levels, and conservative J2
   status. Preserve anomalies that do not affect journey PASS.
8. Complete privacy, architecture, self-review, final validation, task docs,
   active-task closure, and a Nightwatch-only clean commit. Do not create a
   Phase 3 task.

## Milestones

### M0 — Recovery and Phase 2A/2B closure audit

- Objective: independently reconcile durable task state, Git history, terminal
  cleanliness, SHA semantics, canary IDs, and historical anomaly facts.
- Files/areas: `.agent/ACTIVE_TASK.md`, Phase 2A/2B task docs, Git metadata.
- Implementation actions: record implementation/checkpoint/terminal meanings;
  confirm Alphaus repos are not touched; preserve Phase 2B closure.
- Acceptance criteria: no closure contradiction remains and exact next action
  is task creation.
- Validation commands: `git status --short --branch`; `git log`; `npm run agent:check`; `git diff --check`.
- Status: COMPLETE

### M1 — Native task creation and frozen contract audit

- Objective: create the task and freeze the three Phase 2B definitions,
  matrix scope, schema intent, and acceptance before implementation/DEV.
- Files/areas: this task's `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`,
  `ACTIVE_TASK.md`, Phase 2B `JOURNEYS.md`, executable contracts.
- Implementation actions: record contract/source/digest inputs and no-change
  assumptions; do not select or alter journeys.
- Acceptance criteria: task is active, four docs exist, frozen canary set and
  six-context budget are explicit, and STATE has a recoverable next action.
- Validation commands: `npm run agent:check`; `git diff --check`.
- Status: COMPLETE

### M2 — Replay/oracle/evidence architecture audit

- Objective: inspect current implementation and produce durable inventories
  and risk classifications before coding.
- Files/areas: `src/core/journeys/`, `src/core/evidence/`,
  `src/browser/observers/`, `src/oracles/`, network/context/policy modules,
  current unit tests, Phase 2B artifacts.
- Implementation actions: document isolation, auth reuse, definition freeze,
  comparison, resource lifecycle, content/JSON/runtime/structural/route/auth
  oracles, normalization, privacy, false positives/negatives, and coverage.
- Acceptance criteria: every current oracle and replay dimension has a
  verdict (`HEALTHY`, `QUESTIONABLE`, `FALSE_POSITIVE_RISK`,
  `FALSE_NEGATIVE_RISK`, or `UNRESOLVED`) with evidence and next action.
- Validation commands: focused existing tests and static source audit; no DEV.
- Status: COMPLETE

### M3 — Shared model hardening and golden fixtures

- Objective: implement only proven shared defects and explicit Phase 2C
  evidence/fingerprint/attribution/comparator capabilities.
- Files/areas: shared journey/evidence/oracle/observer/replay modules and
  local fixture/test infrastructure.
- Implementation actions: preserve compatibility/version old artifacts;
  add generic reusable result dimensions and synthetic golden regressions;
  avoid journey-specific engine forks.
- Acceptance criteria: comprehensive failure matrix exercises real code and
  no safety/privacy contract is weakened.
- Validation commands: focused synthetic matrix; `npx tsc --noEmit`.
- Status: COMPLETE

### M4 — Pre-real validation and adversarial self-review

- Objective: establish a clean, validated, frozen matrix checkpoint before
  contacting DEV.
- Files/areas: task STATE/PLAN, implementation diff, test results.
- Implementation actions: run full local checks, privacy scans, active-task
  check, inspect Alphaus statuses read-only, answer the pre-real review, and
  record exact versions/next commands.
- Acceptance criteria: TypeScript, Playwright, agent check, diff check pass;
  contract/oracle/matrix versions are frozen; no blocker remains.
- Validation commands: `npx tsc --noEmit`; `npx playwright test`;
  `npm run agent:check`; `git diff --check`; `git status --short`.
- Status: COMPLETE

### M5 — Bounded serial Phase 2C real matrix

- Objective: obtain six additional independently attributable fresh-context
  observations under the frozen model.
- Files/areas: ignored run artifacts and task STATE/REPORT ledgers.
- Implementation actions: preflight auth/safety before every context; execute
  J1-C1/J1-C2, J2-C1/J2-C2, J3-C1/J3-C2 serially; checkpoint after each pair.
- Acceptance criteria: base budget is respected, stop conditions are enforced,
  each result is metadata-only, and no safety/privacy event occurs.
- Validation commands: approved real-run launcher only; no parallelism,
  exploratory reruns, or anomaly chasing.
- Status: COMPLETE

### M6 — Differential analysis and failure attribution

- Objective: analyze Phase 2B plus Phase 2C evidence without over-promoting
  anomalies or hiding passing-run secondary signals.
- Files/areas: task ledgers, sanitized artifacts/comparisons, replay model,
  fingerprint/admission reports.
- Implementation actions: compare strict/variance/oracle/safety/auth/privacy
  dimensions; classify J2 font event and malformed JSON; produce candidates,
  transients, rejected/refuted findings, and false-positive/negative review.
- Acceptance criteria: exact frequencies and fingerprints are preserved;
  causal confidence is explicit; no body/DOM/data-store work is performed.
- Validation commands: local report/check scripts and privacy scan.
- Status: COMPLETE

### M7 — Final privacy, architecture, adversarial review, and validation

- Objective: prove reusable cross-journey behavior and a clean handoff.
- Files/areas: source diff, task docs, evidence, tests, Alphaus status.
- Implementation actions: answer all final adversarial questions, verify schema
  compatibility, safety totals, no Phase 3 leakage, and run full validation.
- Acceptance criteria: all SPEC criteria pass; only Nightwatch changed; tree
  is clean after closure commit; ACTIVE_TASK is complete.
- Validation commands: `npx tsc --noEmit`; `npx playwright test`;
  `npm run agent:check`; `git diff --check`; `git status --short`.
- Status: COMPLETE

## Validation Strategy

Use existing focused tests first, then synthetic oracle/replay/fingerprint/
privacy tests, then full local TypeScript/Playwright/continuity/whitespace
checks. Real execution is permitted only after the pre-real checkpoint and
uses the existing opt-in serial runner with a boolean auth gate. All results
are recorded as sanitized metadata; no datastore or product source mutation
is permitted.

## Decision Log

- 2026-08-12 — Decision: retain the Phase 2B implementation/checkpoint/
  terminal SHA distinction; reason: the existing validator and closure docs
  define `SYNCED`, `CHECKPOINT_ADVANCE`, and `STALE`; consequence: Phase 2C
  starts from clean terminal HEAD while `78e5d1f` remains the code baseline.
- 2026-08-12 — Decision: freeze exactly J1/J2/J3 and six additional contexts
  before implementation and real execution; reason: this phase measures
  replay/oracle reliability, not journey discovery or load; consequence: no
  new route/action or unbounded retry can enter the matrix.
- 2026-08-12 — Decision: keep J2's font 502 at L0 until exact fingerprint
  reproduction; reason: Phase 2B recorded one event and a non-reproducing
  bounded diagnostic pair; consequence: no baseline exception is added.

## Discoveries

- Closure audit found the Phase 2B terminal tree clean and its descendants
  after the implementation baseline limited to approved `.agent` continuity
  documentation.

## Deferred Work

- Phase 3 change-directed selection and all later autonomous functionality.
- Datastore/API-independent oracles, fuzzing, AI diagnosis, product fixes,
  full minimization, and production-grade statistical benchmarking.

## Completion Criteria

The task is complete only when every criterion in `SPEC.md` is evidenced in
STATE/REPORT, the six-context base matrix is complete or a declared safety/
auth/oracle blocker is reported, all final validations pass, and Nightwatch is
clean with no Phase 3 task started. These conditions are satisfied; Phase 2C
is closed and the recommended next task only is `PHASE 3 — CHANGE-DIRECTED
JOURNEY SELECTION`.
