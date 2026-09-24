## ADDED Requirements

### Requirement: Live-source tests classify source authority before measurement

A test that measures approved real-source repositories SHALL first classify every required checkout through the confined sibling-source boundary as `CURRENT`, `STALE`, or `UNAVAILABLE` by comparing the exact read-only Git HEAD with the existing approved source SHA.

#### Scenario: Every required checkout is current
- **WHEN** each required checkout exists and its HEAD equals the approved SHA
- **THEN** the state is `CURRENT` and the live measurement may execute

#### Scenario: A required checkout is stale
- **WHEN** a required checkout exists but its HEAD differs from the approved SHA
- **THEN** the state is `STALE` and no historical live measurement is claimed

#### Scenario: A required checkout is unavailable
- **WHEN** a required checkout or readable Git HEAD is absent
- **THEN** the state is `UNAVAILABLE` and deterministic fallback proof runs without a live-source claim

### Requirement: Stale and unavailable states retain meaningful coverage

An affected test SHALL execute a synthetic or disposable source proof when live state is not `CURRENT`. It SHALL NOT use `test.skip`, update a source pin, accept zero as a substitute for the historical count, or relabel changed source as the approved snapshot.

#### Scenario: C-02 historical ripple-api count with changed source
- **WHEN** the approved ripple-api SHA is not current
- **THEN** the live count assertion is not executed, the stale/unavailable state is asserted, and the file's existing synthetic admission/no-eviction controls remain required

#### Scenario: Cross-repository graph measurement with stale dependency
- **WHEN** the frontend checkout is current but an approved backend dependency is stale
- **THEN** the cross-repository live graph measurement is not claimed and deterministic graph controls remain required

### Requirement: CLI and expectation parsing do not require ambient live source

Tests for argument parsing, malformed-ID refusal, or expectation source-state resolution SHALL use a deterministic Git-backed fixture or a stale-state control rather than discovering authority from the developer's current checkout.

#### Scenario: Explain-surface argument parsing
- **WHEN** the test runs without Alphaus sibling repositories
- **THEN** a disposable Git-backed source provides the exact operation identity and all argument-order/refusal assertions still execute

#### Scenario: Expectation source state
- **WHEN** the live checkout is absent or stale
- **THEN** the test proves unavailable/stale classification and fixture derivation rather than expecting a pinned live SHA

### Requirement: Read-only immutability is run-local

A test claiming that a canonical sibling is unchanged by an operation SHALL compare the same checkout identity immediately before and after that operation. It SHALL not substitute equality to a historical approved SHA for before/after immutability.

#### Scenario: Historical SHA has advanced
- **WHEN** the canonical checkout is unchanged during the test but no longer equals an old campaign pin
- **THEN** the before/after immutability assertion passes while currentness remains a separate classification

### Requirement: Source pins and Alphaus repositories remain untouched

The hermeticity repair SHALL change only Nightwatch test/continuity surfaces. It SHALL NOT update approved source SHAs or write to an Alphaus repository.

#### Scenario: Validated campaign
- **WHEN** the repair completes
- **THEN** source pins are byte-unchanged and sibling repository dirty counts are not increased by Nightwatch
