# Autonomous Bug-Hunting Programme

## Purpose

A locally executable autonomous investigator that selects a surface,
observes, hypothesizes, discriminates, reproduces or disproves, and emits
a human-review dossier — without weakening Nightwatch authority.

## Starting State

- Task ID: `nightwatch-autonomous-bug-hunting-programme-v1`
- Starting Nightwatch SHA: `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`
- Relevant architecture: deterministic campaign orchestrator, aiReview
  end-stage reviewer, systemMap v2, findingIntel, alphausHandoff.
- Dependencies: C-00 session isolation; owner-scope freeze.
- Established facts that must not be rediscovered: Phase 19 campaign
  intelligence is deterministic, not a frontier reasoner loop.

## Scope

Protocol freeze, AgentRuntime, CLI reasoner, agent tools, Bug Atlas,
System Atlas overlay, historical benchmark, finding dossiers, adversarial
proof, local endurance, documentation, certification.

## Non-Goals

aiReview takeover; DEV contact; external filing; Obscura; touching the
stale review-operations worktree.

## Safety Constraints

Typed intents only. Fail closed on unknown/unsafe/unauthorized actions.
No secrets in checkpoints. No sibling writes.

## Architecture / Approach

Shared freeze in `src/core/agentProtocol/`. Lanes implement:

| Lane | Paths | Notes |
| --- | --- | --- |
| A | `src/core/agentRuntime/**` | Includes lifecycle/budget/observability (H merged) |
| B | `src/core/reasoner/**` | CLI ReasonerDriver, fake CLI in tests |
| C | `src/core/agentTools/**` | Typed ops over existing engines |
| D | `src/core/bugAtlas/**` | Read-only historical intelligence |
| E | `src/core/systemAtlas/**` | Domain overlay; do not mutate systemMap kinds |
| F | `src/core/benchmark/**` | Leakage-isolated replay harness |
| G | `src/core/autonomousFinding/**` | Dossier projection onto existing handoff |

Global files remain orchestrator-owned during parallel waves.

## Milestones

Reconciled 2026-09-09 under NW-07 of
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`. These statuses had lagged
this task's own `STATE.md` since the W0 checkpoint: the PLAN still read W0
IN_PROGRESS and W1-W5 NOT_STARTED while the STATE recorded W0-W10 complete
and certified, so a fresh reader following the PLAN would have restarted work
that had already shipped.

Each status below is taken from this task's `STATE.md` "Completed
Milestones" and its recorded certification. Nothing here asserts a completion
the STATE did not already record, and no historical SHA, receipt or wave
narrative is rewritten.

### W0 — Protocol freeze

- Objective: shared contracts, programme state, DAG.
- Files/areas: `src/core/agentProtocol/**`, owner scope, task state, OpenSpec.
- Status: COMPLETE

### W1 — Independent lanes

- Objective: implement A–G against frozen contracts.
- Status: COMPLETE

### W2 — Integration

- Objective: reconcile, integrate, cross-subsystem tests.
- Status: COMPLETE

### W3 — Adversarial autonomous proof

- Objective: seeded positive + false anomaly + required fail-closed cases.
- Status: COMPLETE

### W4 — Historical rediscovery

- Objective: run harness on real bugs if accessible, else fixture-classified.
- Status: COMPLETE

### W5 — Local endurance and certification

- Objective: bounded local campaigns, gates, clean clone, final report.
- Status: COMPLETE

### W6-W10 — successor waves, each with its own task directory

- Objective: the waves opened after this PLAN was written. Each has its own
  SPEC/PLAN/STATE/REPORT and its own certification; this row exists so the
  PLAN does not appear to end at W5 while the STATE reports through W10.
- Terminal wave: `nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
  (W10), COMPLETE at implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`
  and documentation `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`.
- Status: COMPLETE

## Validation Strategy

Targeted suites per lane. Integration and final certification use
typecheck, hardening, agent/handoff/project/workspace checks, focused
then full regression, gate:local, gate:clean.

## Decision Log

- 2026-09-07 — Merge programme Lane H into Lane A; overlapping runtime
  concerns would fork checkpoint/budget authority.
- 2026-09-07 — System Atlas is an overlay, not a mutation of
  `SYSTEM_MAP_NODE_KINDS`, to keep C-15b contracts stable.
- 2026-09-07 — Do not touch stale review-operations session.

## Discoveries

- Canonical HEAD `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` == origin/main.
- Stale owned-but-not-live session at
  `/home/dalepalaca/.nightwatch/worktrees/nightwatch-review-operations-his-7431812c`.

## Deferred Work

- Real DEV/NEXT unknown-bug yield until independently authorized.
- Communication evidence in System Atlas until Slack is authorized.

## Completion Criteria

All locally executable programme bars met and certified. Real-world yield
stated honestly as UNPROVEN if DEV remains unauthorized.
