## ADDED Requirements

### Requirement: Context startup is atomic

The system SHALL model every browser-context startup stage and acquired resource in one transaction. It SHALL return usable handles only after every mandatory containment guard, observer, proxy binding, trace decision, and initial-page guard is ready. Failure at any earlier stage SHALL run bounded reverse-order rollback and return a categorical non-success.

#### Scenario: A setup stage throws after context creation
- **WHEN** any stage from page creation through initial Fetch-guard installation fails
- **THEN** no usable handle is returned and every acquired context, page, session, listener, timer, and trace resource is closed or reported as incompletely cleaned

#### Scenario: Recorder setup fails
- **WHEN** manifest or proxy-evidence configuration fails after browser resources exist
- **THEN** startup rolls back and cannot leave an authenticated page live without evidence ownership

### Requirement: Every page is guard-admitted before use

The system SHALL assign each initial, popup, and newly created page an exact generation and keep it unusable until its mandatory per-page guard and observers attest ready. Guard failure, timeout, or generation replacement SHALL close the page and produce a hard non-clean lifecycle result.

#### Scenario: Popup navigates immediately
- **WHEN** a popup or new page attempts navigation in the same turn that creates it
- **THEN** no request effect occurs before that exact page generation's guard readiness

#### Scenario: Page guard promise rejects
- **WHEN** per-page guard installation rejects
- **THEN** the rejection is handled, the page is closed, the context is revoked when coverage is uncertain, and the run cannot remain clean

### Requirement: Teardown settles all owned asynchronous work

Close and rollback SHALL be idempotent, share one lifecycle coordinator, prevent new work, remove owned listeners, clear timers, cancel or await bounded health/guard work, synchronize final evidence, and close browser resources exactly once.

#### Scenario: Close races an in-flight proxy health check
- **WHEN** teardown begins while a health check is pending
- **THEN** the check cannot write after teardown, revive readiness, or leave the event loop live

#### Scenario: Multiple callers close concurrently
- **WHEN** close is invoked more than once
- **THEN** all callers join one terminal result and no resource is double-released

### Requirement: Lifecycle failure truth is exact

The system SHALL distinguish expected rollback/close events from unexpected browser, context, and page loss. It SHALL emit exactly one safe hard failure for unexpected loss and SHALL surface any rollback-cleanup uncertainty without raw host errors or private values.

#### Scenario: Context closes during startup
- **WHEN** the context closes before readiness and teardown was not initiated by the coordinator
- **THEN** startup fails with one unexpected lifecycle classification and completes rollback

#### Scenario: Coordinator closes the context
- **WHEN** rollback or normal close triggers Playwright close events
- **THEN** those expected events do not create a false independent lifecycle failure

### Requirement: Tests prove zero leaked authority

The system SHALL inject failure at every construction and teardown stage, race popups/navigation/disconnect/close, and measure contexts, pages, CDP sessions, timers, listeners, traces, and pending promises after settlement. Mutations removing any barrier or compensator SHALL be detected.

#### Scenario: Fault matrix completes
- **WHEN** each stage is failed before and after its resource acquisition point
- **THEN** the test observes no usable page, no external request, and zero unaccounted live resources
