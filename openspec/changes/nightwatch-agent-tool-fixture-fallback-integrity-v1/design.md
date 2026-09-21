## Context

`INSPECT_SOURCE_SURFACE` returns `ADAPTER_UNAVAILABLE` without surfaces. Atlas adapters default to repository-owned synthetic data and still return `ok: true`. W7 session comments document that fixture fallbacks were deliberately not restored on the live investigation path.

## Goals / Non-Goals

**Goals:** total no-invention rule for Lane C; tests per adapter; keep caller-supplied fixtures valid.

**Non-Goals:** deleting synthetic corpora, changing W7 providers, or executing atlas snapshot I/O.

## Decisions

### Absence is unavailability

If `fixtures.bugAtlas` or `fixtures.systemAtlas` is missing, the adapter SHALL fail `ADAPTER_UNAVAILABLE` and SHALL NOT call `createBugAtlasStore(bugAtlasFixtureCorpus())` or `createSyntheticSystemAtlasOverlay()`.

### Labels cannot launder defaults

A successful atlas result MAY use `HISTORICAL_RECORD` / `DOCUMENTATION` only for caller-supplied fixtures. Default synthetic data SHALL NOT inherit those sources.

### Inventory is the test denominator

Every catalog tool with a fixture dependency SHALL have a missing-fixture case. A source-only test SHALL NOT count as total coverage.

### Keep executors separate

W7 session remains the owner-local provider path. Lane C remains the pure fixture executor. Both MUST refuse invention; neither copies the other's backing store.

## Risks / Trade-offs

Callers that relied on implicit fixture corpora must pass them explicitly. That is the intended honesty.

## Migration Plan

1. Remove atlas default constructors from adapters.
2. Extend the missing-fixture test to every fixture-backed tool id.
3. Keep hunt-mode/autonomy tests supplying explicit fixtures where they need atlas hits.
4. Run agent-tool suites without owner-local stores or network.

## Open Questions

None. The source-only fail-closed test already states the intended rule.
