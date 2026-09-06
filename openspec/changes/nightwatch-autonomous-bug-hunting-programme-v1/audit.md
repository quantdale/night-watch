# Audit — autonomous bug-hunting programme

Inspected before freeze:

- `src/core/campaign/` — deterministic Phase 7 orchestrator with
  checkpoint/budget/work items. Not a frontier reasoner loop. Reuse
  checkpoint storage patterns; do not overload this into LLM control.
- `src/core/aiReview/` — bounded end-stage reviewer with
  `AiReviewSession`, local/loopback providers, immutable private
  artifacts. Hardening forbids non-aiReview runtime from invoking it.
  Must stay semantically an end-stage reviewer.
- `src/core/systemMap/model.ts` — FACT_CATEGORIES
  SOURCE_FACT/DEPLOYMENT_FACT/RUNTIME_FACT/OBSERVATION/INFERENCE and
  technical node kinds. Domain overlay must not silently mutate these.
- `src/core/alphausHandoff/types.ts` — already carries
  `humanReviewRequired: true`, `externalPublication: 'PROHIBITED'`,
  `autoFile: false`. Autonomous dossiers must preserve that authority.
- `src/core/policy/ownerScope.ts` — unknown operations fail closed.
  Autonomous loop needs an explicit allowed class.
- `src/core/oops/process.ts` — existing no-`shell:true` spawn pattern
  for CLI reasoner to follow.
- C-00 session tooling is the only worktree mutation surface.

Gap: no AgentRuntime, no provider-neutral ReasonerDriver, no Bug Atlas,
no historical leakage-isolated benchmark, no typed agent tool protocol.
