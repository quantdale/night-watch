## ADDED Requirements

### Requirement: Deferred DEV-lane redesigns are mechanically quarantined
A DEV-lane precondition registry SHALL list every deferred contained-DEV
redesign. Every contained-DEV launcher SHALL read the registry before any
effect, and SHALL refuse with `DEV_LANE_PRECONDITION_OPEN` unless the registry
is empty or the owner supplies a one-shot acceptance token that cites a
DECISIONS entry.

#### Scenario: Registry non-empty
- **WHEN** `campaign:real -- --env=dev` starts while the registry lists
  NW-AUD-026
- **THEN** it refuses before creating a browser, proxy or network connection

#### Scenario: Token without a decision reference
- **WHEN** an acceptance token cites no existing DECISIONS entry
- **THEN** the launcher refuses

### Requirement: Credential use is bound to the element it acts on
DEV auto-login SHALL resolve the bound login controls once, act through those
exact element handles, verify connection, form identity and action within the
same evaluation immediately before each secret-bearing effect, and mark the
binding used on its first effect.

#### Scenario: Control swapped between fill and submit
- **WHEN** the password control is replaced after the username fill
- **THEN** the credential is not typed into the replacement and the refresh
  fails AUTH_FORM_BINDING_STALE

### Requirement: Auth capability and sidecar publish as one unit
The storage state and its lifecycle sidecar SHALL be published as one
transactional unit, both for automatic refresh and for direct capture.

#### Scenario: Automatic refresh
- **WHEN** an automatic DEV refresh replaces the storage state
- **THEN** the next preflight reads a matching sidecar and does not report
  UNKNOWN_AGE

### Requirement: Proxy effects follow durable evidence
For allowed destinations, the proxy SHALL durably append a prepared record
before piping HTTP, answering CONNECT or forwarding an Upgrade, and exactly
one terminal record afterwards. The reader SHALL treat a prepared record with
no terminal record as incomplete, and a malformed line as a failure.

#### Scenario: Evidence append fails
- **WHEN** appending the prepared record fails for an allowed destination
- **THEN** no upstream connection is opened

### Requirement: Browser contexts set up and tear down transactionally
Context creation SHALL roll back every completed setup stage on failure,
including clearing the proxy-health interval. A popup SHALL NOT issue network
requests before its guard is ready: requests with no page mapping SHALL be held
until pending guards settle, or popups SHALL be denied by policy. Close SHALL
join in-flight body acquisitions.

#### Scenario: Popup first-navigation redirect
- **WHEN** a popup's first navigation redirects
- **THEN** the redirect target is admitted or refused by the same guard as
  any page request, with zero unguarded upstream contact

#### Scenario: Setup stage throws
- **WHEN** a later setup stage throws after the health interval started
- **THEN** the interval is cleared and the context is closed

### Requirement: Run evidence identities are generation-unique
Real campaign run IDs SHALL include a campaign or generation identity, so a
repeat campaign never collides with an earlier run directory. A corrupt run
manifest SHALL fail closed, and the network and console mirrors SHALL be
checked against `events.jsonl` at finalize. Observers SHALL latch failures as
non-clean. Download cancellation SHALL run in a `finally` block.

#### Scenario: Repeat phase7 campaign
- **WHEN** the same work items run in a second campaign into the same runs
  root
- **THEN** both campaigns write distinct run directories without
  RUN_EVIDENCE_DIRECTORY_EXISTS

#### Scenario: Corrupt manifest
- **WHEN** manifest.json fails to parse
- **THEN** the recorder fails with RUN_EVIDENCE_MANIFEST_INVALID instead of
  resetting it

### Requirement: Relay and response acquisition are bounded and attributable
The Phase-5 relay SHALL require a per-invocation unguessable credential beyond
the public operation ID, enforce a relay-wide budget, and refuse to overwrite
an observation. Response body acquisition SHALL be cancelled or joined when it
loses its timeout race, and SHALL be bounded during acquisition, not only
after it.

#### Scenario: Replayed operation ID
- **WHEN** a local process repeats a request with a known operation ID but no
  invocation credential
- **THEN** the relay refuses it without any authenticated read

### Requirement: Child processes inherit only declared environments
Every child process outside the contained envelope SHALL receive an explicit
environment built from a declared allowlist. Sync calls SHALL declare a
timeout and an output bound. The child-process census SHALL fail closed on
dynamic import, createRequire, string-built specifiers and namespace
destructuring it cannot resolve.

#### Scenario: Dynamic import of child_process
- **WHEN** a module obtains `spawn` through `await import('node:child_process')`
- **THEN** the census records it, or fails with an unresolved-import finding
