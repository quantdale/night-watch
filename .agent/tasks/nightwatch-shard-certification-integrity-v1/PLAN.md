# Shard certification integrity v1

## Purpose

Make shard execution truth machine-readable and fail closed so an all-skipped
or unknown-execution invocation cannot masquerade as a successful regression.

## Starting State

- Task ID: `nightwatch-shard-certification-integrity-v1`
- Starting Nightwatch SHA: `78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Relevant source: `bin/run-shards.mjs`, `playwright.config.ts`,
  `src/core/validation/`, focused shard tests.
- Reproduction: all-skipped file exits 0/PASS with null counts coerced to zero;
  true zero-test exits 1/TEST_FAILURE; normal 9-test control exits 0/PASS.
- Dependencies: existing shard planner, timing reporter, execution classes,
  validation universe, and synthetic local Playwright configuration.

## Scope

Runner receipt production/parsing, bounded reporter output, focused tests,
hardening/schema declarations if required, and continuity/OpenSpec records.

## Non-Goals

No change to product test semantics, no external/runtime execution, no browser
or credential work, no full release claim by default.

## Safety Constraints

Local synthetic Playwright only; no external target; one writer; preserve
current coverage and exclusivity proofs.

## Architecture / Approach

Add a small pure execution-receipt schema/classifier and a Playwright reporter
that writes an atomic, bounded receipt per shard. The runner supplies a unique
receipt path through the child environment, reads and strictly validates it
after the child exits, and derives pass/fail from the receipt. Text summaries
remain operator diagnostics only. Missing/ambiguous receipts are non-pass.
Add pure classifier tests, runner integration tests, all-skipped/zero-test
controls, and mutations that remove the executed/unknown guards.

## Milestones

### M1 — Contract and failing regressions

- Objective: freeze receipt schema/classifier and add non-vacuous failing tests.
- Files/areas: new validation module/reporter, `bin/run-shards.mjs`, focused
  shard tests.
- Implementation actions: reproduce current behavior and define categorical
  outcomes.
- Acceptance criteria: tests fail against the current implementation for the
  intended reasons.
- Validation commands: focused Playwright suite.
- **Status:** COMPLETE

### M2 — Root-cause implementation

- Objective: replace text-derived authority with strict machine receipt.
- Files/areas: runner, reporter, schema/classifier, config declarations.
- Implementation actions: implement bounded receipt and fail-closed result.
- Acceptance criteria: all-skipped/zero/unknown fail; mixed pass/skip passes;
  existing coverage/exclusivity remains.
- Validation commands: focused tests and `npm run gate:dev`.
- **Status:** COMPLETE

### M3 — Adversarial validation and checkpoint

- Objective: mutation-test guards and perform campaign review.
- Files/areas: focused tests/hardening and task state.
- Implementation actions: mutate executed/unknown/atomic receipt guards; fix
  siblings only when evidence supports propagation.
- Acceptance criteria: mutations detected; milestone gate green; no safety
  counter regression.
- Validation commands: `npm run gate:milestone`, targeted lint/type checks.
- **Status:** BLOCKED

### M4 — Close and reassess

- Objective: reconcile OpenSpec/task truth, checkpoint, and select successor.
- Files/areas: reports, active route, project continuity.
- Implementation actions: record exact receipts and reassess B/other findings.
- Acceptance criteria: no false COMPLETE claim; next campaign is evidence-led.
- Validation commands: required continuity checks and one justified release
  grouping if applicable.
- Status: NOT_STARTED

## Validation Strategy

Use focused tests during design, `gate:dev` for implementation, and
`gate:milestone` at the campaign checkpoint. Do not repeatedly run full
certification for this bounded change.

## Decision Log

- 2026-09-24 — Select this campaign before run-evidence transaction work:
  reproduced release-evidence false green, smaller implementation surface, and
  lower risk than the larger recorder redesign.
- 2026-09-24 — Treat true zero-test-to-PASS as disproven under current
  Playwright, while retaining the reproduced all-skipped and null-count defects.

## Discoveries

- Human summary parsing cannot distinguish absent counts from zero.
- Legitimate skipped tests must remain allowed when at least one test executes.
- Reporter output must be bounded and strict; best-effort telemetry is not
  sufficient for an execution authority.

## Deferred Work

Run-evidence transaction integrity, child-process census indirection, popup L0
readiness, proxy raw-event persistence, and credential-use binding remain
successor candidates.

## Completion Criteria

The runner cannot emit a successful result for zero executed, all-skipped, or
unknown/malformed execution; legitimate mixed outcomes remain correct; focused
validation passes; the broad milestone lane's baseline/source-drift residual
is explicitly classified; all receipts and residuals are truthful.
