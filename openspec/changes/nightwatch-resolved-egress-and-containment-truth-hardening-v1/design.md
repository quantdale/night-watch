# Design: Resolved Egress Binding and Containment Truth

Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1

## Design goals

The design strengthens L5 without pretending to be L6.

Current:

URL hostname
-> OutboundPolicy hostname decision
-> proxy target containing hostname
-> Node implicit DNS
-> socket

Target:

URL hostname
-> OutboundPolicy hostname decision
-> owned resolver
-> complete resolved-address-set validation
-> selected exact validated numeric address
-> exact-address dial
-> sanitized resolution/transport evidence

A hostname-policy deny exits before the resolver.

## Component A — one owned resolver seam

Introduce one proxy-owned resolution abstraction used by forward HTTP, CONNECT, and WebSocket Upgrade.

The abstraction must:

- accept only an already hostname-policy-allowed ProxyTarget
- return a bounded list of normalized numeric addresses with family metadata
- reject empty, malformed, oversized, duplicate-pathological, or unsupported-family answers
- be injectable in tests so acceptance requires zero external DNS
- never expose arbitrary resolver callbacks from product/page/candidate input
- never read environment variables to create alternate resolver authority
- keep real runtime resolver construction internal to the proxy
- provide categorical errors rather than raw resolver diagnostics to durable evidence

IP-literal targets must not be sent through unnecessary name resolution. They still pass the resolved-address policy.

For localhost in local mode, prefer exact canonical handling that cannot be redirected by an external DNS answer. If the executor uses OS localhost resolution, every returned address must still satisfy the exact local address policy.

## Component B — resolved-address policy

Create a pure, independently tested address classifier/policy.

Minimum address classes to reason about explicitly:

IPv4:
- unspecified
- loopback
- private RFC1918
- link-local
- carrier-grade NAT/shared space
- documentation
- benchmark/testing
- multicast
- broadcast/reserved/special-use
- globally routable unicast

IPv6:
- unspecified
- loopback
- link-local
- unique-local
- multicast
- documentation
- IPv4-mapped forms
- reserved/special-use
- globally routable unicast

Do not use string-prefix approximations that misclassify binary address boundaries. Use a bounded parser/classifier with exact tests at range edges.

Required policy baseline:

### local

Allowed transport destinations:
- 127.0.0.1
- ::1

A hostname such as localhost may resolve to either/both exact canonical loopbacks. Other 127/8 aliases are not automatically equivalent to the repository's configured local authority unless the owning config explicitly says so.

### dev / next / external static assets

The hostname must first be explicitly allowed by the existing environment hostname policy.

Resolved addresses must then be globally routable unicast under the classifier. Unsafe/special-use classes fail closed.

Do not invent Alphaus CIDRs and do not query live DNS to build a list.

If repository evidence proves the real environment requires a non-global class, do not weaken the classifier ad hoc. Record a blocked future explicit-address-policy configuration requirement for owner review.

### answer-set semantics

Validate the entire resolver answer set before dialing.

Conservative default:
- any malformed answer => deny
- any unsafe/disallowed answer => deny the destination
- empty set => resolution failure
- all answers policy-acceptable => eligible to select an address

Do not silently discard an unsafe member and continue with a safe member; that would hide resolver ambiguity.

Canonicalize duplicate equivalent addresses for bounded reasoning, but preserve enough deterministic metadata for tests.

## Component C — exact-address binding

After resolution policy passes, the upstream network primitive must receive the selected numeric address, not the hostname.

Forward HTTP:
- preserve original approved Host header
- prevent http.request from performing a second implicit lookup
- bind connection creation to the validated numeric address/family
- preserve current HTTP-only forward-proxy semantics

CONNECT:
- dial validated numeric address directly
- retain original hostname:port only as tunnel authority/evidence identity
- TLS remains end-to-end between browser and origin; no MITM

WebSocket Upgrade:
- same exact-address dial rule
- preserve Host header / original target authority
- no duplicate resolver implementation

If address selection needs retries across multiple already-validated answers, it must be bounded and must never re-resolve the hostname inside the same attempt. Record the exact algorithm and tests. No unbounded failover loop.

## Component D — bounded resolution and dial lifecycle

The current server has no explicit resolved-egress lifecycle contract.

Add conservative bounds for:

- maximum answer count
- normalized address length
- resolver completion
- connect completion
- retries/alternate-address attempts, if any

Do not claim cancellation guarantees the underlying OS API cannot provide. A logical timeout may fail the request/run while a non-cancellable OS lookup settles later; document that distinction if applicable.

No request may hang the proxy indefinitely because a resolver or socket never completes.

## Component E — truthful sanitized proxy evidence

Preserve the existing privacy boundary.

Evidence may contain bounded categorical metadata such as:

- original approved hostname
- port
- protocol
- hostname policy verdict/class
- resolution outcome
- address family
- address class
- answer count
- exact-address-binding version
- connect outcome category
- safe rule/reason ID

Do not persist:

- raw headers
- cookies
- authorization
- request/response bodies
- query strings
- credentials/tokens
- resolver stack traces
- unbounded OS errors
- customer data

Raw resolved IP persistence is not necessary to prove the invariant. If the executor believes it is necessary, it must first prove that the existing privacy contract permits it; otherwise use categorical metadata or an opaque digest with a clear threat model.

Clarify semantics of ProxySummary.allowed. Preferred outcome is to preserve backward compatibility only if the field is explicitly defined as hostname-policy authorization. Add separate bounded outcome counts for resolutionDenied/resolutionFailed/connected/connectFailed as needed. If changing field meaning, version the schema and every consumer.

A resolution-policy denial must become a hard containment failure in RunRecorder/RunMonitor just like an outer-proxy deny. It must not be downgraded to an ordinary request failure.

## Component F — containment runtime identity

OUTBOUND_POLICY_VERSION identifies hostname decision semantics. Do not overload it unless those semantics themselves change.

Add or deliberately evolve a proxy containment identity that proves:

- hostname policy version
- resolved-address policy version
- exact-address-binding behavior version

ProxyRuntimeState parsing must reject an older/malformed identity.

realRunGate must require the current containment identity before any authenticated browser context can be created.

tests/globalSetup and any direct runner must publish the same current identity.

No compatibility fallback may let an old hostname-only runtime state pass a new real-run gate.

## Component G — browser-process DNS residual qualification

Existing browser hardening already includes:

- mandatory local proxy
- proxy bypass disabled for loopback
- QUIC disabled
- non-proxied WebRTC UDP disabled
- background networking disabled
- network hints disabled
- fetching hints at navigation start disabled
- service/shared worker containment

Do not add random Chrome flags based on folklore.

The executor may investigate an additional browser resolver restriction only when ALL are true:

1. experiment uses local/synthetic fixture domains and no external DNS/network
2. proxy remains mandatory
3. allowed synthetic HTTP/HTTPS behavior still works
4. denied destinations still produce zero upstream connections
5. Chrome/system behavior is observed mechanically, not inferred from flag spelling
6. the result is stable enough for a regression test

If those conditions cannot be met, keep docs explicit:
BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL.

Do not implement Docker, namespaces, root firewalling, or host DNS changes.

## Component H — synthetic reproduction architecture

Tests need an injectable resolver owned by startOutboundProxy options, but only for tests/direct local fixtures.

Recommended shape:

- production/default constructor creates the internal system resolver
- tests may pass a Resolver interface implementation
- interface returns only address records, never sockets or arbitrary callbacks
- the resolver cannot override hostname policy
- the resolver cannot select event paths or mutate environment config
- the server applies all validation regardless of resolver source

Required synthetic fixtures:

1. allowed.test -> 127.0.0.1 safe local control
2. allowed.test -> 127.0.0.2 unsafe local alias control
3. mixed safe/unsafe
4. ::1 positive local IPv6
5. IPv4-mapped IPv6 edge cases
6. invalid family/address
7. empty answers
8. thrown/rejected resolver
9. never-settling resolver bounded by timeout
10. proof that denied.test never invokes resolver

No test may depend on public DNS.

## Component I — protocol parity

HTTP forward, CONNECT, and ws Upgrade currently have separate connection code. The new resolution policy must not fork into three subtly different implementations.

Factor the smallest shared unit that owns:

- resolution
- answer-set validation
- address selection
- exact-address connection parameters
- categorical result

Protocol handlers may differ in framing but not in destination safety semantics.

Add differential tests over the same synthetic target/resolver matrix.

## Component J — policy and version drift

Expected intentional changes may include:

- proxy containment runtime version
- resolved-address policy identity
- ProxyEvent / ProxySummary schema if expanded
- real-run-gate expected contract
- test fixtures and docs

Do not change without evidence:

- environment names
- existing hostname allowlists
- known production hostname tables
- source analyzer identities
- semantic contract identities
- dossier schema versions
- replay/minimization/campaign authority
- Control Center command/read-only boundary
- self-development authority

Every changed identity must be listed in REPORT.md with reason and consumers.

## Component K — performance

Resolution occurs only after hostname approval and before outbound connect.

Measure focused proxy synthetic runtime before/after. Avoid:

- global unbounded DNS caches
- unbounded answer sets
- recursive retries
- per-request process spawning
- disk persistence for resolver state

A small bounded in-memory cache is not needed for correctness and should not be added unless measurements justify it. Fresh per-connection resolution is easier to reason about.

## Acceptance architecture

Before implementation capture:

- current git/tree census
- current proxy tests
- current safety tests
- current smoke containment tests
- typecheck/hardening
- current proxy/runtime version identities
- current skip inventory

After implementation prove:

- all mandatory resolver matrix tests
- exact-address binding for all protocols
- zero resolver call for hostname deny
- zero upstream connection for resolution deny
- runtime-state version mismatch failure
- run-recorder hard failure for resolution deny
- no privacy leakage
- browser launch containment unchanged or stronger
- full local quality gate
- clean Node20 gate
- canonical serial regression
- current continuity/project checks

External CI remains separately classified. A zero-step Actions result is not green evidence.
