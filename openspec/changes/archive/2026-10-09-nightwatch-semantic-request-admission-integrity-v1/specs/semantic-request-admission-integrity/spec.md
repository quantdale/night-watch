## ADDED Requirements

### Requirement: Product API requests require pre-effect semantic authority
Every product API request SHALL carry an immutable admission bound to the exact environment, scheme/host/port, normalized method, source-proven route template, semantic rule/proof identity, current source snapshot, and request generation before any browser, relay, or proxy layer permits network I/O. Only mechanically proven current read operations SHALL be admitted. Mutation, unknown, ambiguous, stale, mismatched, or unbound requests SHALL fail closed.

#### Scenario: Unknown initialization request is emitted
- **WHEN** page startup emits an API request with no current source-proven read rule
- **THEN** every transport layer refuses it before upstream connection and records only a categorical refusal

#### Scenario: Exact proven read is emitted
- **WHEN** method, route template, host, source proof, currentness, and generation match one admitted read
- **THEN** the same immutable admission authorizes the bounded request across all layers

### Requirement: Initialization exceptions are finite and proven
Navigation or absence of an active UI action SHALL NOT grant passive authority. An indispensable initialization request MAY proceed only through an explicit versioned finite exemption that is mechanically proven read-only, provenance/currentness-bound, environment/route/method exact, budgeted, and scoped to one navigation generation.

#### Scenario: Navigation produces unclassified traffic
- **WHEN** an API request appears during navigation but lacks an admitted initialization exemption
- **THEN** it is refused rather than labeled `PASSIVE_UNKNOWN_OBSERVED`

### Requirement: Request causality survives bounded asynchronous settlement
Approved actions and navigations SHALL create unique request generations whose authority remains active until deterministic bounded settlement. Delayed callbacks, redirects, frames, popups, and workers SHALL retain the initiating generation or fail closed when attribution is ambiguous. A fixed sleep or wall-clock threshold SHALL NOT convert action-caused traffic into passive traffic.

#### Scenario: Approved action schedules a late unknown request
- **WHEN** the request begins after the former 250 ms action window but before generation settlement
- **THEN** it remains action-caused and is refused before network I/O

#### Scenario: Two action generations overlap
- **WHEN** a request cannot be uniquely assigned to one live admitted generation
- **THEN** ambiguity is a hard refusal and neither generation is credited

### Requirement: Redirect and lower-layer enforcement cannot weaken admission
Playwright HTTP routing, CDP Fetch redirect handling, WebSocket creation, API relays, and L5 proxy/tunnel paths SHALL consume the same admission identity or independently derive an identical decision from the same immutable inputs. A missing, stale, changed, or disagreeing decision SHALL abort before effect. Redirects SHALL be re-admitted for their exact destination/method/generation.

#### Scenario: Allowed read redirects to same-host unknown route
- **WHEN** a follow-up bypasses the ordinary Playwright route but lacks semantic admission
- **THEN** CDP/proxy enforcement blocks it despite hostname allowlisting

### Requirement: Admission enforcement is total and non-vacuous
Hardening SHALL discover every product-egress continuation and bind it to one admission consumer. Tests SHALL cover current reads plus unknown/mutation/stale/ambiguous routes, delayed and concurrent causality, redirect status/method matrices, initialization exemptions, popup/frame/worker/WS traffic, and mutations that remove or weaken any layer.

#### Scenario: New request continuation uses host policy only
- **WHEN** a new call site can continue product traffic without semantic admission
- **THEN** the census/hardening gate fails before release
