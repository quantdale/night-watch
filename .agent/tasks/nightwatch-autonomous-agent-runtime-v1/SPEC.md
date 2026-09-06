# SPEC — nightwatch-autonomous-agent-runtime-v1 (Lane A)

Provider-neutral `AgentRuntime` over the frozen `src/core/agentProtocol/` types.

## Loop

`PLAN → OBSERVE → ANALYZE → HYPOTHESIZE → VERIFY → TRIAGE → REPLAN → PLAN …`
One reasoner turn per phase; phase advances after each completed turn.

## Ports (interfaces only, injected)

- `ReasonerDriver` — imported from the frozen protocol. The reasoner only
  returns typed intents; it never executes anything privileged.
- `AgentToolExecutor` — Lane A port (`execute(call): Promise<result>`).
  No CLI spawn, no tool implementation here (Lane C owns tools).

## Requirements

- Campaign state, hypotheses, action intents/results, evidence refs,
  candidate proposals, termination states, budget use.
- `assertOwnerPolicyAllows('AUTONOMOUS_AGENT_LOCAL')` before the loop.
- Every reasoner response re-validated with `validateReasonerTurnResponse`
  (fail-closed: unknown/unsafe/malformed never executes).
- Repeated-action dedupe via `detectRepeatedAction` (skip re-execution,
  record `DEDUPED_REPEAT`).
- No-progress termination via `detectNoProgress`.
- Budget exhaustion (`classifyBudgetExhaustion`) → terminate
  `BUDGET_EXHAUSTED` with checkpoint, never a success reason.
- External + intent-driven `cancel` / `pause` / `resume`.
- Checkpointing: serializable `AgentCheckpoint`, secret-free by construction
  (only digests/refs/ids stored) plus a fail-closed secret scan.
- Resume is idempotent: `resumeCursor` continues the turn counter, logged
  actions are never re-executed.
- Corrupt checkpoints fail closed (`AgentCheckpointError`).
- No module-global mutable state: concurrent campaigns are isolated.
