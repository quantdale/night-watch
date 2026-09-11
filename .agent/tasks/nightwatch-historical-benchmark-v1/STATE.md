# STATE — nightwatch-historical-benchmark-v1 (Lane F, complete)

Ownership respected: only `src/core/benchmark/**`,
`tests/unit/benchmark.test.ts`, `.agent/tasks/nightwatch-historical-benchmark-v1/**`.
No edits to `src/core/agentProtocol/**`, `src/core/aiReview/**`,
`.agent/ACTIVE_TASK.md`, `package-lock.json`, or other lanes.

Real historical data: NOT used. Corpus is synthetic fixtures standing in per
contract; results are fixture replays, never historical claims.

Validation: typecheck clean, 16/16 focused tests pass, hardening:check PASS.
LEGACY_V1_DISPOSITION: PERMANENTLY_HISTORICAL — Lane F benchmark record; synthetic-fixture benchmark landed; historical only.
