## Why

Lane C `executeAgentTool` claims missing fixtures fail closed. That is true for source, system-map, evidence, and oracle adapters. `QUERY_BUG_ATLAS` and `QUERY_SYSTEM_ATLAS` do the opposite: absent fixtures are replaced with `bugAtlasFixtureCorpus()` and `createSyntheticSystemAtlasOverlay()`, and successful results are labeled `HISTORICAL_RECORD` / `DOCUMENTATION`.

The W7 local-investigation session already refuses this pattern (`ADAPTER_UNAVAILABLE`, never a synthetic answer). The Lane C missing-fixture test only covers `INSPECT_SOURCE_SURFACE`, so the atlas fallbacks are untested and reachable by any `executeAgentTool` caller without fixtures, including hunt-mode and autonomy integration wiring.

A reasoner can therefore observe fixture bugs/concepts as if they were owner-local historical records.

## What Changes

- Make every Lane C adapter fail closed when its required fixture is absent; inventing a corpus or overlay is forbidden.
- Keep synthetic corpora as explicit test fixtures supplied by the caller, never as runtime defaults.
- Align Lane C with the W7 session rule without merging the two executors.
- Add missing-fixture atlas regressions and a catalog-total adapter inventory so a new fallback cannot hide behind source-only coverage.

## Capabilities

### New Capabilities

- `agent-tool-fixture-fallback-integrity`: Defines fail-closed fixture admission for agent-tool adapters.

### Modified Capabilities

None.

## Impact

- Affects `src/core/agentTools/runtime.ts` and `tests/unit/agentTools.test.ts`.
- Does not change W7 session behavior, authorize DEV tools, or load owner-local atlas snapshots during planning.
