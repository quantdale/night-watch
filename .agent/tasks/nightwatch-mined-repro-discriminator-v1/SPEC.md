# SPEC — nightwatch-mined-repro-discriminator-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-mined-repro-discriminator-v1 (campaign R-repro)
Base: d2aa960c2491817c70cd36f422b0e20c58dcc80d

## Mission

Give mined historical benchmark cases a REAL, mechanically-proven
reproduction. Today `reproductionCount` is 0 for all live mined cases
because `definedCase.preFix.discriminator` is `null` for mined cases, so
`RERUN_SAFE_REPRODUCTION` in `src/core/benchmark/hunt.ts`
(`createPreFixViewExecutor`) returns `NOT_AVAILABLE`.

## Owned paths (only these may be created/modified)

- `src/core/benchmark/containedTestReplay.ts` (new)
- `src/core/benchmark/minedCases.ts`
- `src/core/benchmark/case.ts`
- `src/core/benchmark/hunt.ts`
- `src/core/benchmark/index.ts`
- `src/core/benchmark/huntDossier.ts`
- `tests/unit/containedTestReplay.test.ts` (new)
- `.agent/tasks/nightwatch-mined-repro-discriminator-v1/**`

## Frozen interfaces (must not change shape)

- `src/core/agentProtocol/**` (`AgentBudgetPolicy`, `AgentBudgetUsage`,
  `classifyBudgetExhaustion`, `AGENT_BUDGET_CEILINGS`, termination reasons).
- `AgentToolResult.resultClass` values used by the scorer: `REPRODUCED`,
  `NOT_REPRODUCED`, `NOT_AVAILABLE`.
- `src/core/benchmark/hunt.ts` counts `reproductionCount` as action-log
  entries with `toolId === 'RERUN_SAFE_REPRODUCTION'` and
  `resultClass === 'REPRODUCED'`.

## Design

1. `containedTestReplay.ts`: deterministic, bounded, read-only-to-siblings
   replay engine. Materializes two temp trees under `os.tmpdir()` with
   read-only git plumbing only; runs one Go test package per tree offline
   (`GOFLAGS=-mod=vendor`, `GOPROXY=off`, `GOTOOLCHAIN=local`,
   `GOCACHE`/`HOME` inside the temp dir); `shell: false` argv arrays, hard
   timeout with process-group kill, capped output. Verdicts: `REPRODUCED`
   (pre FAIL + post PASS, the only reproduction), `NOT_REPRODUCED`
   (pre passes), `INCONCLUSIVE` (both fail / post blocked / timeout),
   `ENVIRONMENT_BLOCKED` (pre could not execute). Temp trees removed in
   `finally`; the sibling repo is never written.
2. Mined-case discriminator wiring: mined cases carry a hidden
   `MinedTestReplayDescriptor` (repository id, fix SHA, hidden test path,
   package dir) on `DefinedBenchmarkCase`, never in the visible context.
   `RERUN_SAFE_REPRODUCTION` executes it and returns `REPRODUCED` /
   `NOT_REPRODUCED` / `NOT_AVAILABLE` (`INCONCLUSIVE` maps to
   `NOT_REPRODUCED`, `ENVIRONMENT_BLOCKED` maps to `NOT_AVAILABLE`).
3. Leak rule and anti-inflation rule documented in REPORT.md and enforced
   by tests.

## Acceptance

- `npm run typecheck` PASS, `npm run hardening:check` PASS.
- Targeted playwright files PASS with no test deleted or weakened.
- Real ouchan replay executed once; true verdict recorded in REPORT.md.
- Sibling repo proven unmutated (`status --porcelain`, `worktree list`).
- Conventional Commit on the session branch; worktree clean; NOT integrated.

## Declared Deletions

None. No tracked file is deleted by this task. (A temporary scratch
playwright spec used for the one real ouchan replay is created and deleted
inside this session — no net deletion — and is never committed.)
