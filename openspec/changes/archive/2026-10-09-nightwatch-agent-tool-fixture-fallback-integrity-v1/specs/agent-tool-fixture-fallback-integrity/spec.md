## ADDED Requirements

### Requirement: Missing fixtures never invent answers

Every Lane C adapter SHALL fail closed with `ADAPTER_UNAVAILABLE` when its required fixture is absent.

#### Scenario: QUERY_BUG_ATLAS without bugAtlas
- **WHEN** `executeAgentTool` is called with `QUERY_BUG_ATLAS` and no `fixtures.bugAtlas`
- **THEN** the result is not ok, class is `ADAPTER_UNAVAILABLE`, and no fixture corpus record is returned

#### Scenario: QUERY_SYSTEM_ATLAS without systemAtlas
- **WHEN** `executeAgentTool` is called with `QUERY_SYSTEM_ATLAS` and no `fixtures.systemAtlas`
- **THEN** the result is not ok, class is `ADAPTER_UNAVAILABLE`, and no synthetic overlay record is returned

### Requirement: Caller-supplied fixtures remain valid

An explicit fixture SHALL still be queryable. Synthetic corpora MAY be passed by tests as that fixture; they SHALL NOT be installed as defaults.

#### Scenario: Test supplies the fixture corpus
- **WHEN** the caller sets `fixtures.bugAtlas` to a store built from `bugAtlasFixtureCorpus()`
- **THEN** matching terms may return those records as caller-supplied data

### Requirement: Source labels follow supplied fixtures

Successful atlas results SHALL NOT claim `HISTORICAL_RECORD` or `DOCUMENTATION` for adapter-defaulted synthetic data, because adapter-defaulted synthetic data is forbidden.

#### Scenario: Default overlay is removed
- **WHEN** mutation restores `fixtures?.systemAtlas ?? createSyntheticSystemAtlasOverlay()`
- **THEN** the focused fixture-fallback suite fails

### Requirement: Missing-fixture coverage is total

The missing-fixture suite SHALL include every catalog tool that reads a fixture field. Covering only `INSPECT_SOURCE_SURFACE` SHALL NOT satisfy the requirement.

#### Scenario: A new fixture-backed tool is added
- **WHEN** a catalog adapter reads an optional fixture with a default constructor
- **THEN** the inventory test fails until a missing-fixture case exists
