# REPORT — nightwatch-agent-tool-protocol-v1 (Lane C)

- TASK ID: nightwatch-agent-tool-protocol-v1
- WORKTREE: /home/dalepalaca/.nightwatch/worktrees/nightwatch-agent-tool-protocol-v-1858226c
- BRANCH: session/nightwatch-agent-tool-protocol-v-1858226c
- HEAD SHA: 55e49a5873e0eea3e95c2229f98a6c785aac732d

## Files changed
- src/core/agentTools/types.ts (new) — intent/context/fixture/result types.
- src/core/agentTools/sanitize.ts (new) — secret redaction, byte cap,
  UNTRUSTED envelopes, injection scan.
- src/core/agentTools/runtime.ts (new) — executeAgentTool gate pipeline +
  13 per-tool adapters delegating to lexical / projections / differential /
  replay-plan engines.
- src/core/agentTools/index.ts (new) — public surface.
- tests/unit/agentTools.test.ts (new) — 16 acceptance tests.
- .agent/tasks/nightwatch-agent-tool-protocol-v1/{SPEC,PLAN,STATE,REPORT}.md

## Tests run (exact)
- npx playwright test tests/unit/agentTools.test.ts --project=nightwatch --workers=1 → 16 passed.
- npx playwright test tests/unit/agentProtocol.test.ts --project=nightwatch --workers=1 → 14 passed (untouched, sanity).
- npm run typecheck → clean, exit 0.
- node bin/hardening-check.mjs → 1 pre-existing error unrelated to this
  lane (docs/CURRENT_STATE.md header date predates its last change;
  forbidden file, not touched — fails identically on base).

## Ownership violations
None. No edits to src/core/agentProtocol/**, src/core/aiReview/**,
global docs, other lanes, or package-lock.json.

## Blockers / extra-lane needs
None. Atlas tools return honest LANE_NOT_INTEGRATED pending lanes D/E;
DEV observation tools fail closed without a contained DEV harness.

## Acceptance coverage
unknown tool → UNKNOWN_TOOL · non-CALL_TOOL → UNSAFE_INTENT · DEV tools →
UNAUTHORIZED_ENVIRONMENT under LOCAL-only auth (even when the payload
claims DEV) · inspect/query success on synthetic fixtures via real engines
· injection payload cannot change tool id (flagged, tool unchanged) ·
mutation NONE on all 13 tools × all paths · Bearer secret redacted ·
differential UI_FAILURE_API_PASS with rootCauseClaim NONE · route proof
echoes stored fields only · replay validated, NOT_EXECUTED · finding
proposal requires evidence, grants no authority · oracle miss and missing
fixtures fail closed.
