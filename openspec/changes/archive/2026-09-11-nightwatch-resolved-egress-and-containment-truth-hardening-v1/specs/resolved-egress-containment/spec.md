# Resolved Egress Containment Specification

Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1

## Scope

This specification governs the Nightwatch L5 outbound proxy path from an already classified hostname to target resolution, resolved-address admission, exact socket destination, proxy evidence, and real-run containment identity.

It is additive to the existing OutboundPolicy hostname rules. It does not authorize L6 container/network-namespace implementation.

## ADDED Requirements

### Requirement: hostname authorization is not socket authorization

An OutboundPolicy allow verdict SHALL be necessary but SHALL NOT by itself authorize a TCP destination.

#### Scenario: allowlisted hostname

- GIVEN a syntactically valid proxy target
- AND OutboundPolicy returns allow for the original hostname/port
- WHEN the proxy prepares an upstream connection
- THEN the target SHALL pass through the Nightwatch-owned resolution boundary
- AND every returned numeric address SHALL pass the selected resolved-address policy
- AND no upstream socket SHALL be created before that policy passes.

#### Scenario: hostname policy deny

- GIVEN OutboundPolicy returns deny or any local block verdict
- WHEN the proxy handles the target
- THEN target DNS resolution SHALL NOT be invoked
- AND no upstream socket SHALL be created
- AND existing policy/block evidence semantics SHALL be preserved.

### Requirement: resolution is bounded and structurally validated

The proxy SHALL accept only a bounded, normalized resolver result.

#### Scenario: empty result

- WHEN an allowed hostname resolves to zero usable addresses
- THEN the proxy SHALL fail closed
- AND no upstream socket SHALL be created
- AND the failure SHALL be represented by a sanitized categorical resolution outcome.

#### Scenario: malformed result

- WHEN any resolver member has an unsupported family, invalid numeric address, impossible metadata, or exceeds a fixed bound
- THEN the destination SHALL fail closed
- AND malformed data SHALL NOT be copied verbatim into durable evidence.

#### Scenario: too many answers

- WHEN the answer count exceeds the fixed resolver bound
- THEN the destination SHALL fail closed rather than truncating into an apparently safe subset.

#### Scenario: resolver failure

- WHEN the resolver returns an error or fails the campaign's bounded completion rule
- THEN the request/tunnel SHALL fail closed
- AND the suite/proxy SHALL not hang indefinitely
- AND raw OS resolver diagnostics SHALL not become durable evidence.

### Requirement: local resolved-address policy is exact

The local environment SHALL not treat every loopback alias as equivalent authority.

#### Scenario: exact IPv4 loopback

- GIVEN an allowlisted local synthetic hostname
- AND the resolver returns 127.0.0.1
- THEN the address MAY be admitted.

#### Scenario: exact IPv6 loopback

- GIVEN an allowlisted local synthetic hostname
- AND the resolver returns ::1
- THEN the address MAY be admitted.

#### Scenario: alternate 127/8 loopback

- GIVEN an allowlisted local synthetic hostname
- AND the resolver returns 127.0.0.2 or another non-authorized loopback alias
- THEN the destination SHALL fail closed unless the owning environment contract explicitly authorizes that exact address
- AND the synthetic campaign SHALL not broaden the local config merely to make the test pass.

### Requirement: external resolved-address policy rejects special-use destinations

For dev/next/static external hostname classes, the additional resolved-address gate SHALL reject non-global/special-use address classes by default.

#### Scenario: RFC1918 / unique-local

- WHEN an otherwise allowlisted external hostname resolves to a private IPv4 or IPv6 unique-local address
- THEN the destination SHALL fail closed absent an explicit owner-reviewed address contract.

#### Scenario: link-local / unspecified / multicast / reserved

- WHEN an allowlisted external hostname resolves to link-local, unspecified, multicast, documentation, benchmark, reserved, or another standards-defined special-use class
- THEN the destination SHALL fail closed.

#### Scenario: globally routable unicast

- WHEN an allowlisted external hostname resolves only to valid globally routable unicast addresses
- THEN the resolved-address gate MAY admit the answer set.

The executor SHALL NOT discover or invent Alphaus CIDR allowlists through live DNS or product contact.

### Requirement: mixed resolver answers fail closed

If any resolver answer is disallowed or malformed, the entire destination SHALL fail closed.

#### Scenario: safe and unsafe members coexist

- GIVEN one resolver answer is policy-acceptable
- AND another resolver answer is disallowed or malformed
- THEN the entire destination SHALL fail closed
- AND the proxy SHALL NOT silently discard the unsafe member and dial the safe member.

### Requirement: exact approved numeric address is the socket destination

The upstream socket SHALL connect to an accepted numeric address rather than let Node perform a second uncontrolled hostname resolution.

#### Scenario: forward HTTP

- GIVEN hostname policy and resolved-address policy both pass
- WHEN the proxy creates the upstream HTTP connection
- THEN the socket lookup/connection SHALL be bound to an accepted numeric address
- AND Node SHALL NOT be allowed to perform a second uncontrolled hostname resolution
- AND the original approved hostname SHALL remain the HTTP Host semantic identity.

#### Scenario: CONNECT

- GIVEN hostname policy and resolved-address policy both pass
- WHEN the proxy opens the CONNECT upstream
- THEN net/TCP SHALL receive the accepted numeric address
- AND the original hostname:port SHALL remain the CONNECT/TLS authority identity
- AND TLS SHALL remain end-to-end without MITM.

#### Scenario: WebSocket Upgrade

- GIVEN hostname policy and resolved-address policy both pass
- WHEN the proxy opens an upstream WebSocket TCP connection
- THEN the exact-address binding SHALL be identical in safety semantics to CONNECT/HTTP
- AND the original Host authority SHALL be preserved.

### Requirement: protocol handlers share one destination-safety authority

Forward HTTP, CONNECT, and WebSocket Upgrade SHALL share one destination-safety authority.

#### Scenario: same target matrix

- GIVEN the same policy, resolver answers, and environment
- WHEN exercised as forward HTTP, CONNECT, and WebSocket Upgrade
- THEN address admission SHALL be identical
- AND protocol-specific framing SHALL NOT create an alternate resolver policy.

### Requirement: address selection is bounded

Address selection and failover SHALL be bounded and SHALL NOT re-resolve the hostname during a connection attempt.

#### Scenario: multiple accepted addresses

- GIVEN every resolver member is acceptable
- THEN address selection/failover, if implemented, SHALL be bounded
- AND SHALL NOT re-resolve the hostname during that connection attempt
- AND the algorithm SHALL have deterministic synthetic tests
- AND an unbounded retry loop SHALL NOT exist.

### Requirement: containment failures are hard failures

A resolved-address policy denial SHALL be recorded as a hard containment failure and SHALL NOT be downgraded to a benign request failure.

#### Scenario: resolved-address policy denial

- WHEN hostname policy allowed but resolved-address policy denies
- THEN the run SHALL record a hard containment failure
- AND no upstream socket SHALL connect
- AND the result SHALL not be downgraded to a benign request failure.

#### Scenario: resolver/runtime contract mismatch

- WHEN a browser run sees proxy runtime state that lacks the current resolved-egress binding identity
- THEN real-run preflight SHALL fail before authenticated browser creation.

### Requirement: proxy evidence distinguishes authority from outcome

Durable proxy evidence SHALL distinguish hostname policy authorization from actual upstream connection outcome.

#### Scenario: hostname allowed but resolution fails

- WHEN the hostname policy returns allow
- AND resolution returns no acceptable destination
- THEN durable proxy evidence SHALL make the resolution failure visible categorically
- AND SHALL NOT imply that an upstream connection succeeded.

#### Scenario: successful socket binding

- WHEN an upstream connection is actually established
- THEN evidence/summary MAY record a connected outcome separately from hostname policy authorization.

#### Scenario: backward-compatible allowed count

- IF ProxySummary.allowed is retained
- THEN its semantics SHALL be explicitly defined as policy authorization rather than successful connection
- AND separate outcome fields SHALL prevent operator ambiguity.

### Requirement: proxy evidence remains privacy-safe

Durable evidence SHALL store only bounded safe categories or reason IDs and SHALL NOT persist raw resolver diagnostics.

#### Scenario: resolution failure contains sensitive diagnostic text

- WHEN an OS resolver/socket error contains arbitrary text
- THEN durable evidence SHALL store only bounded safe categories/reason IDs
- AND SHALL NOT persist raw stack traces, credentials, headers, cookies, bodies, query strings, or arbitrary resolver diagnostics.

#### Scenario: numeric destination metadata

- THEN raw resolved IP persistence is NOT required for compliance
- AND categorical address family/class SHALL be sufficient unless an existing privacy contract explicitly permits stronger metadata.

### Requirement: containment runtime identity is explicit

Proxy runtime state SHALL identify the current hostname policy and resolved-egress/exact-binding contract.

#### Scenario: new proxy starts

- THEN runtime state SHALL identify the current hostname policy and resolved-egress/exact-binding contract
- AND tests/globalSetup and direct runner paths SHALL agree.

#### Scenario: old runtime state

- GIVEN a syntactically valid old ProxyRuntimeState from the hostname-only implementation
- WHEN the new runtime/gate reads it
- THEN validation SHALL fail closed
- AND no compatibility fallback SHALL silently upgrade it.

### Requirement: existing browser transport restrictions remain mandatory

The existing mandatory browser transport restrictions SHALL remain in force.

#### Scenario: campaign implementation

- THEN the mandatory proxy configuration SHALL remain
- AND --proxy-bypass-list=<-loopback> SHALL remain
- AND QUIC SHALL remain disabled
- AND non-proxied WebRTC UDP SHALL remain disabled
- AND service/shared-worker containment SHALL remain
- AND existing background-networking restrictions SHALL not be weakened.

### Requirement: browser DNS residual is truthful

Documentation SHALL continue to state BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL while browser-process DNS confinement is unproven.

#### Scenario: no deterministic local proof can close speculative DNS

- WHEN the executor cannot mechanically prove browser-process DNS confinement without external network/DNS or privileged host changes
- THEN docs SHALL continue to state BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL
- AND the campaign SHALL NOT claim complete network isolation.

#### Scenario: additional Chromium resolver control is proposed

- THEN it SHALL be accepted only after a zero-external-contact synthetic qualification
- AND it SHALL preserve normal proxy-routed synthetic traffic
- AND it SHALL not be justified by flag naming alone.

### Requirement: no L6 authority is implied

This campaign SHALL NOT install or implement Docker, network namespaces, firewall, or root networking authority.

#### Scenario: executor encounters the documented future container plan

- THEN it SHALL NOT install or implement Docker/network namespaces/firewall/root networking in this campaign
- AND SHALL record that work as separately authorized future L6 scope.

### Requirement: no real environment DNS/contact is needed

All address answers SHALL come from injected deterministic fixtures or literal local addresses.

#### Scenario: resolver tests

- THEN all address answers SHALL come from injected deterministic fixtures or literal local addresses
- AND no test SHALL query live Alphaus DNS
- AND no DEV/NEXT/production/authenticated product contact SHALL occur.

### Requirement: no unrelated authority expansion

Unrelated authority SHALL remain unchanged unless a direct containment schema consumer requires a narrow compatibility update.

#### Scenario: campaign completion

- THEN source-proof, semantic, replay, dossier, campaign, self-development, publication, data, infrastructure, and Control Center command authority SHALL remain unchanged unless a direct containment schema consumer requires a narrow compatibility update.

### Requirement: full regression acceptance

The full regression acceptance set SHALL pass before implementation is declared complete.

#### Scenario: implementation is declared complete

- THEN focused proxy/resolution tests SHALL pass
- AND focused safety/real-run-gate/evidence tests SHALL pass
- AND local browser containment smoke SHALL pass
- AND typecheck/hardening/project/continuity checks SHALL pass
- AND the clean Node 20 gate SHALL pass
- AND canonical serial regression SHALL pass
- AND exact pass/skip/fail counts SHALL be reported
- AND no new unexplained skip SHALL exist
- AND no DEV/NEXT/production/auth/data/infra/publication/sibling-write/runtime-AI action SHALL have occurred.

### Requirement: external CI is reported separately

An externally blocked or zero-step CI result SHALL be reported separately and SHALL NOT be called green.

#### Scenario: GitHub Actions exact-head job executes zero steps

- THEN the result SHALL be classified as external billing/platform blocked
- AND SHALL NOT be called green
- AND workflow logic SHALL not be weakened solely to alter that result.
