# Run-evidence transaction successor v1

## Purpose

Make the run recorder fail closed on same-run mixing and durable evidence
divergence, preventing false terminal summaries while keeping the change
bounded and synthetic-testable.

## Starting State

- Task ID: `nightwatch-run-evidence-transaction-successor-v1`
- Starting Nightwatch SHA: `a215f8e971b82796b9d278dd362f8b200d5ec9e3`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Relevant source: `src/core/evidence/runRecorder.ts`,
  `tests/unit/evidence.test.ts`, and existing private-artifact publication
  primitives.
- Reproduction: same-run reuse loses manifest updates, duplicates sequence 0,
  memory/disk event counts diverge, and a torn tail can still yield PASS.
- Dependencies: prior authenticated minimization and current evidence reader;
  prior shard/census children are independent blocked records.

## Scope

Run-directory exclusivity, durable append acknowledgement, durable-event
reconciliation, non-clean failure latch, focused tests, and continuity/OpenSpec
records.

## Non-Goals

Full journal/recovery redesign, historical migration, real environment,
observer-wide authority changes, or external evidence publication.

## Safety Constraints

Local synthetic runs only; no credentials/customer values/network; preserve
owner-only modes and atomic JSON publication.

## Architecture / Approach

Reserve the run directory with non-recursive exclusive creation after ensuring
the artifacts root exists. Keep appendFileSync compatibility for existing
hardening contracts but fsync the descriptor before acknowledging an event.
Track a private integrity latch around primary/view/in-memory writes. Before
finalization, parse and validate the complete durable JSONL stream, compare
sequence/count with in-memory state, and refuse terminal publication on any
mismatch or torn line. Derive summary counts from validated durable records.
Expose categorical errors without raw values. Add fault-injection tests using
synthetic files and normal replay controls; leave arbitrary historical recovery
as an explicit residual.

## Milestones

### M1 — Reproduction and invariant contract

- Objective: encode same-run, split-write, torn-tail, and normal controls.
- Files/areas: task evidence, `evidence.test.ts`, source reading.
- Implementation actions: add failing regressions before source changes.
- Acceptance criteria: current code reproduces each claimed failure.
- Validation commands: focused evidence suite.
- **Status:** COMPLETE

### M2 — Exclusive identity and durable truth

- Objective: implement exclusive run directory and non-clean latch.
- Files/areas: `runRecorder.ts`, focused tests.
- Implementation actions: atomic directory admission, fsync append, durable
  validation before finalization.
- Acceptance criteria: same-run/mirror/torn/mismatch cases fail closed; normal
  path remains green.
- Validation commands: focused evidence suite and typecheck.
- **Status:** COMPLETE

### M3 — Adversarial validation and checkpoint

- Objective: test crash boundaries, mutations, and reader compatibility.
- Files/areas: hardening/tests/task state.
- Implementation actions: inject append/mirror/directory failures; remove each
  guard in temporary mutations and prove detection.
- Acceptance criteria: no false PASS; residuals explicit.
- Validation commands: `gate:dev`, `gate:milestone`.
- **Status:** BLOCKED

### M4 — Close and reassess

- Objective: reconcile truth and select the next campaign.
- Files/areas: reports/OpenSpec/active route.
- Implementation actions: classify broad-gate residual and reassess popup/proxy
  or credential candidates.
- Acceptance criteria: no false COMPLETE claim.
- Validation commands: continuity checks and justified release grouping.
- **Status:** NOT_STARTED

## Validation Strategy

Use synthetic evidence tests during implementation, focused static checks, and
mutation probes. Run broad lanes at the checkpoint and classify baseline
source-drift failures without weakening unrelated tests.

## Decision Log

- 2026-09-24 — Select after shard/census children: the recorder reproduction
  has direct false-summary impact and a bounded fail-closed root-cause slice.
- 2026-09-24 — Implementation uses exclusive directory creation, fsync-backed
  append acknowledgement, a failure latch, and durable JSONL reconciliation;
  arbitrary historical crash recovery remains explicitly out of scope.

## Discoveries

- Existing `publishJson` is atomic per file but not a bundle transaction.
- Current hardening rules pin `fs.appendFileSync`; retain that primitive while
  adding an fsync acknowledgement rather than broad rule churn.

## Deferred Work

Full journal recovery, observer failure latching beyond recorder scope,
popup L0 readiness, proxy persistence, and credential binding remain later.

## Completion Criteria

No same-run mixing, no terminal PASS after detected durable divergence, normal
recorder behavior preserved, and all residuals honestly classified.
