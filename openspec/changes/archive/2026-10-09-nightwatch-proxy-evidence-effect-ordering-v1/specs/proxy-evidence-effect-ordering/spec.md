## ADDED Requirements

### Requirement: every upstream effect has a durable prepared identity
The proxy SHALL allocate an instance-bound, monotonically ordered, privacy-safe request correlation and SHALL durably append and validate its preparation before DNS resolution, upstream socket creation, request-body piping, CONNECT success, Upgrade response forwarding, or bidirectional stream coupling. A preparation failure MUST refuse the current request with zero upstream effects.

#### Scenario: allowed HTTP preparation append fails
- **WHEN** an allowed local synthetic HTTP request reaches the proxy and its preparation append or durability acknowledgement fails
- **THEN** the request is categorically refused and the allowed upstream server observes zero connections and zero bytes

#### Scenario: allowed CONNECT or Upgrade preparation fails
- **WHEN** preparation fails for an otherwise allowed CONNECT or Upgrade request
- **THEN** the proxy sends no success/upgrade acknowledgement, opens no upstream connection, and starts no pipe

#### Scenario: resolution is required
- **WHEN** destination admission requires DNS resolution and resolved-address validation
- **THEN** a durable intent stage precedes resolver invocation and a durable decision stage precedes upstream socket creation
- **AND** both stages bind one exact request correlation

### Requirement: request evidence is an append-only terminal state machine
Each prepared request SHALL receive at most one consistent terminal `COMMITTED` or `ABORTED` transition. A durable preparation without a verified terminal transition SHALL be reported as `INCOMPLETE`; absence, truncation, conflict, replay, or uncertainty MUST NOT be interpreted as clean completion or proof of no effect.

#### Scenario: terminal append fails after traffic begins
- **WHEN** the proxy has begun an effect and cannot durably append the terminal transition
- **THEN** the preparation remains `INCOMPLETE`, the runtime refuses new work, and run evidence reports a categorical non-clean failure

#### Scenario: terminal records conflict
- **WHEN** a request correlation has duplicate or contradictory terminal transitions
- **THEN** evidence validation fails closed and does not select a preferred outcome

#### Scenario: process crashes at a journal boundary
- **WHEN** the proxy stops after preparation but before a verified terminal transition
- **THEN** recovery preserves the entry as `INCOMPLETE` and requires owner-visible failure handling

### Requirement: HTTP, CONNECT, and Upgrade share one evidence barrier
All proxy transport paths SHALL use one transport-neutral preparation coordinator and SHALL NOT contain a legacy or fallback path that begins an effect without its own durable acknowledgement. Concurrent requests MUST have distinct correlations and MUST NOT reuse another request's acknowledgement.

#### Scenario: concurrent requests complete out of order
- **WHEN** multiple allowed requests are prepared in sequence and complete in a different order
- **THEN** each terminal transition resolves only its exact correlation and the preparation sequence remains unambiguous

#### Scenario: one transport path omits the coordinator
- **WHEN** a mutation bypasses the coordinator for HTTP, CONNECT, or Upgrade
- **THEN** focused structural and behavioral tests fail

### Requirement: the journal is private, bounded, and instance-bound
The journal SHALL use the owner-only, no-follow, crash-consistent event generation of the exact attested proxy instance. Headers and request records SHALL be strictly bounded and SHALL contain only classified safe identities; raw paths, queries, headers, bodies, cookies, credentials, customer values, lease/capability secrets, and unsafe OS diagnostics MUST NOT be written.

#### Scenario: journal instance differs from live proxy
- **WHEN** a reader or writer observes a journal generation that does not bind the current attested proxy instance
- **THEN** admission and evidence synchronization fail closed without rebinding

#### Scenario: capacity cannot guarantee preparation
- **WHEN** the configured evidence bound or local storage budget cannot accept and durably acknowledge another preparation
- **THEN** the new request is refused before resolution or connection

#### Scenario: sensitive input reaches evidence construction
- **WHEN** request input contains path, query, authorization, cookie, credential, or synthetic customer markers
- **THEN** persisted records contain none of those values and privacy sentinels remain clean

### Requirement: validation proves current-request ordering on allowed destinations
Acceptance SHALL use allowed local synthetic destinations and injectable writer faults to prove that preparation failure prevents the current effect. It SHALL separately prove post-effect terminal failure produces visible `INCOMPLETE` evidence, and SHALL cover crash boundaries, partial records, concurrency, capacity, transport symmetry, privacy, and registered ordering mutations.

#### Scenario: misleading denied-host regression is present
- **WHEN** a zero-connection test relies only on destination-policy denial
- **THEN** it does not satisfy the evidence-ordering acceptance requirement

#### Scenario: implementation is proposed for integration
- **WHEN** all change tasks are complete
- **THEN** focused proxy/evidence/containment suites, typecheck, hardening, mutation probes, continuity/workspace/project checks, local/clean/topology gates, and full regression pass without real target access
