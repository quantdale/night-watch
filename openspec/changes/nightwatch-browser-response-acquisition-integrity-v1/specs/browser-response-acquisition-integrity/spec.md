## ADDED Requirements

### Requirement: Response acquisition is bounded before allocation

The browser observer SHALL enforce finite byte, time, and aggregate-work budgets before and during response-body acquisition. A post-buffer length check SHALL NOT be treated as an acquisition bound.

#### Scenario: Body exceeds the byte budget
- **WHEN** a response streams more bytes than the configured maximum
- **THEN** acquisition stops at the boundary, partial bytes are discarded, and the observation is categorically incomplete

#### Scenario: Browser adapter exposes only whole-buffer reads
- **WHEN** the adapter cannot bound or cancel allocation
- **THEN** body inspection fails closed rather than invoking the unsafe read

### Requirement: Length metadata never replaces live accounting

Declared content length SHALL be used only for early refusal. Missing, compressed, chunked, malformed, or inconsistent length metadata SHALL remain subject to actual byte accounting.

#### Scenario: Compressed body expands beyond the limit
- **WHEN** the declared wire length is small but decoded content exceeds the acquisition budget
- **THEN** capture aborts at the applicable bounded layer and no semantic hook receives the body

### Requirement: Timeout cancels and joins work

A response timeout SHALL actively abort its acquisition and SHALL NOT return terminal journey success until the operation has reached a bounded terminal cleanup state.

#### Scenario: Body promise resolves after timeout
- **WHEN** an acquisition loses the deadline race and later attempts to resolve
- **THEN** it cannot publish bytes, invoke semantic hooks, or outlive terminal cleanup

### Requirement: Acquisitions belong to a context generation

Every acquisition SHALL be registered to the exact request and browser-context generation before it starts. Context teardown SHALL abort and join all registered acquisitions or fail closed with forced contained context destruction.

#### Scenario: Context closes during chunked response
- **WHEN** teardown begins while body acquisition is active
- **THEN** the acquisition reaches `ABORTED_TEARDOWN`, no background work remains, and the journey is non-successful/incomplete

### Requirement: Incomplete evidence is privacy-safe

Failed, refused, timed-out, or aborted acquisition SHALL retain only bounded categorical metadata and safe size counters. Raw or partial bodies and arbitrary thrown messages SHALL NOT persist or enter findings.

#### Scenario: Failure text contains response content
- **WHEN** an adapter throws a payload-derived message
- **THEN** the recorded reason uses a stable safe category without echoing the message

### Requirement: Acquisition containment has adversarial proof

Contained tests SHALL cover exact-limit and one-over bodies, compressed expansion, chunked/no-length, never-ending streams, late resolution, repeated abort, page/context closure, and mutations removing cancellation or joins.

#### Scenario: Timeout abort is removed
- **WHEN** mutation restores wait-only timeout behavior
- **THEN** the resource-lifecycle suite detects the surviving acquisition and fails
