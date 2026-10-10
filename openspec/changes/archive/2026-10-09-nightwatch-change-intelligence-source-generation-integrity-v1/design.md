## Context

The selector computes staleness from `repoDefinition.sourceMapSha !== edge.sourceMapSha || repoDefinition.checkedOutSha !== repoDefinition.sourceMapSha`. Those are all pinned configuration values. The actual `changeset.repoBaselines` are copied into the result but never consulted. The manual real campaign builds ranges from tracking SHA to checkout HEAD, while map pins may be older; any dependency changes between map SHA and range base are invisible to the selector.

## Goals / Non-Goals

**Goals:** exact changeset admission; one baseline per repo; map-to-range continuity; fail-safe mixed-generation behavior; current-caller tests.

**Non-Goals:** regenerate maps automatically, query remotes, infer deployment, change canary definitions, or strengthen the currently unreachable baseline-advance helper.

## Decisions

### Parse and recompute the ChangeSet

Selection accepts unknown input through one exact parser. It validates versions, SHA/path/status vocabularies, array bounds/order/uniqueness, changed-repo/baseline/file coherence, dirty-window relations, and recomputes `changesetId`. Typed structural objects are not trusted.

### Prove the map-to-head interval

For each changed repository, selection requires either: (a) the change interval begins at the dependency map's authored SHA and reaches the exact head; or (b) a canonical map-generation receipt proves the map was re-derived at the exact range baseline. A static expected checkout pin is not an observation of either fact.

### Fail closed per selection generation

All edge reasons in one selection bind map generation, repository baseline/head, changed-file digest, and selector version. Missing baselines, duplicate repo ranges, skipped intervals, mixed map generations, or stale receipts set `fallbackTriggered` and select the full bounded canary set.

### Preserve both sides of a rename

Old and new paths are classified separately. The rename is non-runtime only if both endpoints are independently proven non-runtime. If either endpoint is runtime, both remain available to exact/prefix edge matching and unresolved runtime fallback. A destination suffix cannot erase the source dependency.

### Keep execution acceptance separate

Baseline advancement has no current non-test caller. It remains explicitly non-authoritative until a future task binds it to a validated campaign disposition; this change does not manufacture that reachability.

## Risks / Trade-offs

Real change-directed campaigns may conservatively select all canaries until map/range continuity is supplied. That is the intended fail-safe behavior.

## Migration Plan

1. Inventory all ChangeSet producers, combiners, selectors, and campaign/portfolio consumers.
2. Add exact parsing, canonical identity, and unique repo-baseline rules.
3. Add map-generation receipts and interval-continuity checks.
4. Route real/manual/shadow/backtest callers through the authoritative path.
5. Add adversarial tests and run change-intelligence, campaign-local, portfolio, hardening, local/clean, and full gates without sibling access.

## Open Questions

None. Static pins cannot attest a live change interval.
