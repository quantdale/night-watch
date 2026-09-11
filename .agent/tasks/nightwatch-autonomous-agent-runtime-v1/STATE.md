# STATE — nightwatch-autonomous-agent-runtime-v1 (Lane A)

Complete. Implementation + focused suite green, typecheck clean.

Files:
- src/core/agentRuntime/types.ts (ports: AgentToolExecutor, deps, result)
- src/core/agentRuntime/checkpoint.ts (cursor codec, secret scan, fail-closed parse)
- src/core/agentRuntime/runtime.ts (AgentRuntime loop)
- src/core/agentRuntime/index.ts (barrel)
- tests/unit/agentRuntime.test.ts (15 tests)

Behavior: phase-cycling loop with owner-policy gate, protocol re-validation,
dedupe, no-progress, budget-checkpoint, pause/resume/cancel, secret-free
checkpoints, idempotent resume, campaign isolation.
LEGACY_V1_DISPOSITION: PERMANENTLY_HISTORICAL — Lane A agent-runtime record; runtime landed and no live claim or dependent task remains.
