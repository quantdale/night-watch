# process-network-containment Specification

## Purpose
TBD - created by archiving change nightwatch-final-completion-and-l6-containment-v1. Update Purpose after archive.
## Requirements
### Requirement: versioned categorical L6 capability
Nightwatch SHALL expose a versioned process/network containment capability
whose safe categorical state distinguishes `SUPPORTED`, `UNAVAILABLE`,
`STARTUP_FAILED`, `RELAY_UNAVAILABLE`, `DNS_ESCAPE_UNPROVEN`,
`PROCESS_TREE_UNPROVEN`, `READY`, and `FAILED_CLOSED` (or an explicitly
documented equivalent). The capability SHALL never contain raw credentials,
customer values, request bodies or unsafe network detail.

#### Scenario: unsupported host is visible and fail-closed
- **WHEN** a required namespace primitive or proof is unavailable
- **THEN** the capability is non-ready, authenticated OOPS is rejected before
  workspace creation or target spawn, and the receipt identifies only the
  categorical blocker

#### Scenario: ready capability is complete
- **WHEN** startup, relay handshake, direct DNS/TCP/UDP denial, approved relay
  flow, process-tree and cleanup proofs all pass
- **THEN** the capability is `READY` with a stable versioned identity and can
  be consumed as a prerequisite by an authenticated operation

### Requirement: rootless network boundary
A contained target and every descendant SHALL execute without root or
privileged host network administration in a network namespace with no path to
an external interface. Communication to the approved parent authority SHALL
use only an explicitly provisioned AF_UNIX transport and a bounded protocol.

#### Scenario: direct network escape attempts are denied
- **WHEN** a contained target or descendant attempts libc/system DNS, Node DNS,
  UDP DNS, TCP DNS, arbitrary TCP, arbitrary UDP, HTTP or HTTPS directly
- **THEN** the attempt cannot reach a host/external interface and the
  qualification records a safe denied result

#### Scenario: approved relay flow succeeds
- **WHEN** a contained target sends an allowed synthetic loopback request via
  the namespace-local proxy and AF_UNIX relay
- **THEN** the parent authority applies the existing policy and the request
  succeeds only when the exact synthetic destination is allowed

#### Scenario: alternate local and address forms are denied
- **WHEN** a contained target tries an unauthorized localhost port, IPv6,
  IPv4-mapped IPv6, literal IP, hostname, mixed DNS answer or rebinding-like
  answer
- **THEN** no direct path bypasses the approved relay and the operation fails
  closed when policy cannot prove the destination safe

### Requirement: browser speculative-network containment
Browser, browser helper, background and speculative activity SHALL execute
inside the same L6 envelope. DNS prefetch, preconnect, background services,
helper networking and Chromium subprocesses SHALL have no direct external
interface and any proxy traffic SHALL traverse the approved relay.

#### Scenario: speculative traffic cannot escape
- **WHEN** a contained browser performs DNS prefetch, preconnect, background
  service activity or helper-subprocess network work
- **THEN** direct activity is denied by the namespace and relay activity is
  classified by the existing policy without raw evidence disclosure

#### Scenario: browser startup failure is not downgraded
- **WHEN** the browser cannot launch with the required L6 binding
- **THEN** readiness is failed closed and no authenticated browser operation
  is reported as contained

### Requirement: descendant and lifecycle containment
The L6 supervisor SHALL bind direct children, grandchildren and recursively
spawned descendants to the namespace and process-group lifecycle. Relay death,
parent death, target crash/restart and browser restart SHALL be observed and
teardown SHALL terminate the complete contained process tree with bounded
cleanup.

#### Scenario: descendant escape attempt is denied
- **WHEN** a child spawns a grandchild that attempts direct DNS, TCP or UDP
- **THEN** the grandchild remains in the same failed/direct-denial boundary and
  cannot use a host network interface

#### Scenario: relay loss fails closed
- **WHEN** the parent relay exits or the inherited transport breaks while an
  operation is active
- **THEN** readiness is revoked, the operation fails closed, and no new target
  or browser work is started

#### Scenario: cleanup removes the complete tree
- **WHEN** an operation completes, times out, crashes or its parent dies
- **THEN** the supervisor terminates the process group, closes relay handles,
  removes owner-only temporary state and reports cleanup success only after
  no contained descendant remains

### Requirement: authenticated OOPS readiness gate
Authenticated/non-browser OOPS SHALL execute only after a current `READY`
capability has been verified for the exact runtime envelope. Workspace
creation, child spawn and evidence commitment SHALL occur after readiness, and
loss of readiness SHALL fail the operation closed.

#### Scenario: blocked capability prevents side effects
- **WHEN** an authenticated OOPS call is made with a non-ready capability
- **THEN** it fails before workspace creation, binary spawn, relay request or
  durable finding/evidence write

#### Scenario: authenticated OOPS remains privacy-safe
- **WHEN** a ready contained OOPS completes or fails
- **THEN** output is bounded and sanitized, credentials are not inherited,
  raw response values do not enter durable evidence, and teardown is verified

