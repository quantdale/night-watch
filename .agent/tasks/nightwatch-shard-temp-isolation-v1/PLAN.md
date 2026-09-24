# Shard temp isolation v1

## Purpose

Repair the validation runner's cross-process temp namespace defect without changing product execution or shard authority.

## Starting State

- Task ID: `nightwatch-shard-temp-isolation-v1`
- Starting SHA: `f41c6cc3c9e9e6a50f271acbd58ddb19b5afd6aa`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Source: `bin/run-shards.mjs`, `bin/child-environment.mjs`, `tests/unit/validationShardPlan.test.ts`, and the recorded `gate:dev` failure artifacts.
- Dependencies: existing explicit child environment, shard receipt authority, and ignored `.tmp-nightwatch` layout.

## Scope

`bin/lib/shard-child-environment.mjs`, generated bin declarations, `bin/run-shards.mjs`, focused shard tests, OpenSpec, and continuity records.

## Non-Goals

No source-drift test rewriting, product/runtime source changes, new dependencies, global `/tmp` cleanup, or external execution.

## Safety Constraints

Local, deterministic, synthetic. One writer in the owned session. Preserve the credential child and twelve live-source drift failures as separate evidence.

## Architecture / Approach

Build the child environment through the existing allowlist, then overwrite standard platform temp keys with a computed per-shard path. Derive that path from a `mkdtemp` run root and a closed shard identity. Prove actual process behavior with fresh Node subprocesses. Remove only the invocation-owned root after execution.

## Milestones

### M0 — Contract and continuity

- Objective: record the exact reproduced failure, scope, and selected successor.
- Acceptance: strict OpenSpec and continuity-v2 task agree with the clean baseline.
- Status: COMPLETE

### M1 — Environment boundary and runner integration

- Objective: implement validated per-shard temp paths and bounded scratch lifecycle.
- Files/areas: shard environment module, declarations, `run-shards.mjs`.
- Acceptance: serial, concurrent, and exclusive modes pass distinct absolute paths and preserve existing env rules.
- Status: IN_PROGRESS

### M2 — Adversarial and focused validation

- Objective: prove process-level isolation, malformed-input refusal, and replay the prior failure.
- Files/areas: `validationShardPlan.test.ts` and synthetic task evidence.
- Acceptance: fresh Node processes observe different `os.tmpdir()`; focused suites pass.
- Status: NOT_STARTED

### M3 — Checkpoint and reassessment

- Objective: run development/milestone lanes, classify independent residuals, and reconcile continuity.
- Acceptance: exact evidence recorded; no cross-shard temp race; source drift remains separately classified.
- Status: NOT_STARTED

## Validation Strategy

Use process-level unit coverage first, then existing shard integration tests, credential/source children as unaffected, `gate:dev`, and `gate:milestone`. Run full certification only at a later release grouping.

## Decision Log

- 2026-09-25 — Select after credential gate: the new failure is high-confidence, executable, validation-critical, and lower risk than rewriting live-source tests.

## Deferred Work

- Hermetic or snapshot-pinned handling for the twelve live-source drift failures.
- Lower-level popup target admission design.

## Completion Criteria

Per-shard temp namespaces are mechanically distinct, existing boundaries remain green, the observed cross-shard race is absent, and every independent residual is explicit.
