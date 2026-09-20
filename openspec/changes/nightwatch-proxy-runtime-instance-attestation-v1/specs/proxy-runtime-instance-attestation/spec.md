## ADDED Requirements

### Requirement: proxy startup creates one exact live-instance identity
Each outer-proxy start SHALL create a fresh versioned identity bound to its owned port lease, listener address/port, process-start identity, environment, policy/containment/resolution/binding versions, event-log generation, and startup transaction. A prior instance identity MUST NOT authorize a replacement listener.

#### Scenario: proxy restarts on the same port
- **WHEN** a proxy exits and another proxy starts on the same loopback port
- **THEN** the new instance has a different identity and the old runtime handle is revoked

#### Scenario: lease and state disagree
- **WHEN** state names a port/process/lease generation that is not the live owned lease
- **THEN** admission refuses before browser or authenticated effects

### Requirement: health is an active instance challenge
Health verification SHALL send a fresh bounded challenge and SHALL accept only a strict response cryptographically or capability-bound to the expected live instance and challenge. HTTP status alone, echoed mutable state, static versions, PID alone, and port reachability MUST NOT establish health.

#### Scenario: unrelated service returns 204
- **WHEN** a non-Nightwatch loopback service occupies the recorded port and returns HTTP 204 at the health path
- **THEN** proxy admission and liveness checks fail

#### Scenario: response is replayed
- **WHEN** a valid response from an earlier nonce or proxy generation is replayed
- **THEN** verification fails without disclosing the expected capability

#### Scenario: challenge succeeds
- **WHEN** the exact live server answers a fresh challenge with matching instance/environment/policy facts
- **THEN** an attested runtime handle is returned for that instance only

### Requirement: runtime control state is safely and durably published
State, health capability material, and event logs SHALL live in a private no-follow runtime generation with exclusive creation, strict ownership/mode/type checks, atomic publication, file and directory durability, bounded contents, and cleanup limited to proven-owned generations.

#### Scenario: a state or event path is a symlink
- **WHEN** any ancestor or leaf is a symlink or changes identity during startup
- **THEN** startup refuses without truncating, following, or deleting the target

#### Scenario: publication is interrupted
- **WHEN** startup stops at any create/write/fsync/rename/listen/state-publication boundary
- **THEN** no consumer can admit the incomplete generation
- **AND** restart preserves live foreign generations and recovers only proven stale owned state

### Requirement: browser and evidence stay bound to one attested instance
Real-run gate, browser proxy configuration, event reader, recorder, process-liveness check, and periodic health polling SHALL share one immutable attested handle. A changed state file, event log, lease, process, listener, or instance response SHALL be a hard containment failure, not a transparent rebind.

#### Scenario: state swaps after preflight
- **WHEN** runtime state is replaced between gate success and browser launch
- **THEN** final admission refuses and no browser context is created

#### Scenario: instance changes during a run
- **WHEN** the admitted proxy exits or another listener replaces it
- **THEN** the run records a categorical hard containment failure, stops new work, and tears down the browser/process boundary

#### Scenario: event log is substituted
- **WHEN** the event-log file/generation no longer matches the attested instance
- **THEN** evidence synchronization fails closed and the run cannot report clean containment

### Requirement: handoff and revocation are explicit across processes
Any Playwright setup/worker or launcher handoff SHALL transfer only the minimal instance-verification capability through an explicit classified channel, validate its source/ownership/freshness, and revoke it during bounded teardown. Ambient inheritance SHALL NOT confer proxy authority.

#### Scenario: worker has address but no attestation capability
- **WHEN** a child receives the proxy URL/state path without the exact current verification capability
- **THEN** it cannot admit the proxy as healthy

#### Scenario: global teardown completes
- **WHEN** the owning suite closes the proxy
- **THEN** listener, lease, verification capability, runtime state, and event generation are revoked/removed only if still owned

### Requirement: adversarial proof is local, bounded, and privacy-safe
The implementation SHALL test fake services, stale/reused ports, PID reuse simulation, state/lease/event swaps, replayed challenges, concurrent suites, crash boundaries, symlink/permission attacks, capability leakage, process death, and cleanup using local synthetic fixtures only.

#### Scenario: acceptance campaign runs
- **WHEN** the change is proposed for integration
- **THEN** focused proxy/real-run/browser/liveness tests, typecheck, hardening, mutation probes, containment qualification, continuity/workspace/project checks, local/clean/topology gates, and full regression pass
- **AND** challenge/state/evidence output contains no raw token, credential, cookie, customer value, arbitrary path, or unsafe OS diagnostic
