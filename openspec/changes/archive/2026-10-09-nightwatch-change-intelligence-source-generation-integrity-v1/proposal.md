## Why

Change-directed selection calls a dependency edge stale only when pinned registry values disagree with each other. It never compares the edge/map SHA to the `ChangeSet` baseline or head for the repository being selected. Because the static `checkedOutSha`, `sourceMapSha`, and edge SHA normally match, a real campaign can apply a dependency map authored for an old source generation to a later diff and confidently select only one canary instead of triggering conservative fallback. `selectJourneys` also accepts a structural `ChangeSet` without exact validation or changeset-ID recomputation. Its rename classifier joins old/new paths and labels the whole change docs/test-only if either endpoint matches, so moving a runtime dependency into docs/CI is suppressed before previous-path edge matching.

## What Changes

- Add one exact bounded `ChangeSet` parser that validates repository/file/path/status/cardinality coherence and recomputes canonical identity.
- Bind every changed file to exactly one repository baseline and one dependency-map generation.
- Treat an edge as current only when the complete source interval since its authored SHA is represented, or a fresh map-generation receipt proves re-derivation at the exact baseline.
- Make missing, duplicate, divergent, mixed, or unproven generations trigger all-canary fallback rather than selective confidence.
- Classify both rename endpoints independently; a change is non-runtime only when both sides are proven non-runtime, and any runtime endpoint participates in dependency/fallback analysis.
- Add moved-baseline, skipped-interval, forged-ID, duplicate-baseline, mixed-generation, runtime-to-docs/CI rename, and real-caller regressions.

## Capabilities

### New Capabilities

- `change-intelligence-source-generation-integrity`: Defines exact source-generation authority for change-directed journey selection.

### Modified Capabilities

None.

## Impact

- Affects change-intelligence types/collector/combiner/selector/map, Phase 7 real context, shadow reporting, portfolio/campaign consumers, and focused backtests.
- Does not read sibling repositories during planning or grant campaign execution authority.
