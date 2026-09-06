# PLAN — nightwatch-autonomous-agent-runtime-v1 (Lane A)

1. `src/core/agentRuntime/types.ts` — tool-executor port, runtime options,
   run result, `AgentRuntimeError`, `AgentCheckpointError`.
2. `src/core/agentRuntime/checkpoint.ts` — cursor codec, secret scan,
   `createCheckpoint` / `parseCheckpoint` (fail-closed).
3. `src/core/agentRuntime/runtime.ts` — `AgentRuntime`:
   owner-policy gate, phase-cycling loop, reasoner invocation + protocol
   re-validation, intent application, budget accounting, dedupe/no-progress,
   cancel/pause/resume, checkpoint/resume.
4. `src/core/agentRuntime/index.ts` — re-exports.
5. `tests/unit/agentRuntime.test.ts` — focused suite for every acceptance
   bullet (stub reasoner drivers + stub tool executors only).
6. Typecheck + focused tests, then commit on the session branch.
