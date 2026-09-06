# PLAN — nightwatch-agent-tool-protocol-v1 (Lane C)

1. Claim session task (C-00 adopt). Done first.
2. Read frozen protocol (`tools.ts`, `validate.ts`, `reasoner.ts`,
   `untrusted.ts`), owner-scope policy, reuse engines (lexical,
   projections, differential, replayPlan), test conventions. Read-only.
3. Implement `src/core/agentTools/`:
   - `types.ts` — intent/context/fixture/result types (imports protocol
     types, never forks them).
   - `sanitize.ts` — secret redaction + byte cap + `UntrustedEnvelope`
     wrapping + injection scan.
   - `runtime.ts` — `executeAgentTool` gate pipeline + per-tool adapters.
   - `index.ts` — re-exports.
4. Write `tests/unit/agentTools.test.ts` covering the acceptance list.
5. Run focused suite + `typecheck`. No project-wide suites, no formatters.
6. Write `REPORT.md`, commit on session branch, yield HEAD SHA + results.
