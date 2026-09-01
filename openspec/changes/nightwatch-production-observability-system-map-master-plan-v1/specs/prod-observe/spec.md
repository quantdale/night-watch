# Requirements — PROD_OBSERVE production observation

Planning-only requirement delta. No requirement below is authorized for
implementation; each is claimed by a named campaign in `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` §2.

## ADDED Requirements

### Requirement: Production is a separate program, not a fourth environment
`SUPPORTED_ENVIRONMENTS` MUST remain `['local','dev','next']` and
`config/environments/production.json` MUST remain structurally unloadable.
Production observation MUST be a distinct authorization class, configuration
namespace, policy object and launcher that cannot execute a DEV or NEXT
campaign, and which the DEV launcher cannot enter.

#### Scenario: The existing loader never learns about production
- **WHEN** any DEV or NEXT campaign is prepared or resumed
- **THEN** the environment loader SHALL reject `production` exactly as it does today
- **AND** no production host SHALL become allowable through the DEV/NEXT allowlist

#### Scenario: The production launcher cannot run a DEV campaign
- **WHEN** the production launcher is invoked with a DEV campaign manifest
- **THEN** it SHALL refuse before any browser, proxy or network object is created

### Requirement: A production request requires eleven ordered fail-closed gates
Every production request MUST pass, in order: owner authorization token; mode;
observer identity attestation; source snapshot currentness; two-witness
read-only proof; per-route production admission; host allowlist plus
resolved-address admission; read-method-and-no-body; budget availability;
closed circuit breaker; attached privacy firewall; absent kill switch. An
`UNKNOWN` at any gate SHALL be a failure.

#### Scenario: Unknown classification is refused
- **WHEN** a candidate route's read-only classification is `UNKNOWN`, `AMBIGUOUS`, `READ_ONLY_METHOD_ONLY` or `READ_ONLY_SINGLE_WITNESS`
- **THEN** the request SHALL NOT be issued and the campaign SHALL record a categorical refusal reason

#### Scenario: A GET binding alone is insufficient
- **WHEN** a route declares `get:` in source but its effect closure cannot be proven free of the write vocabulary
- **THEN** the route SHALL NOT be admitted for production observation

### Requirement: Production observation is read-only by construction
No mutation verb, request body, create-then-delete pattern, transaction-abort
pattern, or "safe" test entity SHALL exist anywhere in the production execution
cone. WebSockets, downloads and service workers SHALL be denied outright in
production, more strictly than in DEV.

#### Scenario: No mutation verb can reach the request builder
- **WHEN** the hardening check inspects the production cone
- **THEN** it SHALL fail if any `POST`, `PUT`, `PATCH` or `DELETE` literal can reach the production request builder

#### Scenario: A WebSocket upgrade in production is fatal
- **WHEN** a page attempts a WebSocket upgrade during a production observation
- **THEN** the attempt SHALL be denied and recorded as a safety event that terminates the campaign

### Requirement: Production execution is bounded, breakable and killable
The production campaign MUST enforce a global request budget, a per-service
budget, a per-route budget, serial execution, a minimum inter-request interval,
circuit breakers on consecutive server errors and on any `429`/`503`, and a
single-command kill switch checked before every request. Budget MUST be
reserved before execution and never refunded.

#### Scenario: Interruption cannot double-spend budget
- **WHEN** a campaign is interrupted after budget reservation and resumed
- **THEN** the resumed campaign SHALL observe the reserved-and-consumed state and SHALL NOT re-issue the request

#### Scenario: A rate-limit response stops everything
- **WHEN** any production response is `429` or `503`
- **THEN** the global circuit breaker SHALL open and no further production request SHALL be issued in that campaign

#### Scenario: The kill switch stops a running campaign
- **WHEN** the kill switch is engaged during a running production campaign
- **THEN** the campaign SHALL stop at or before the next gate check without issuing another request

### Requirement: Production capability advances only through owner-gated stages
The progression `P0 → PQ → P1 → P2 → P3 → P4` MUST be enforced. Each transition
MUST require a fresh one-shot, scoped, expiring owner token, and MUST require
the machine-checked evidence listed in `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` §4. Any safety event,
privacy event or unexplained production error SHALL demote the capability to
P0.

#### Scenario: A consumed token cannot be replayed
- **WHEN** an owner token that has already authorized a transition is presented again
- **THEN** it SHALL be refused as already consumed

#### Scenario: Qualification precedes contact
- **WHEN** P1 is requested without a PQ receipt bound to the exact current implementation SHA
- **THEN** the request SHALL be refused

### Requirement: The observer identity class is recorded and gates P4
Every production run MUST record `observerIdentityClass` as one of
`ORG_ENFORCED_READ_ONLY`, `ORDINARY_USER` or `UNKNOWN`. P4 SHALL require
`ORG_ENFORCED_READ_ONLY`. P2 and P3 MUST NOT depend on RBAC for their safety
argument; RBAC is defence in depth only.

#### Scenario: Unknown identity class blocks production
- **WHEN** `observerIdentityClass` is `UNKNOWN`
- **THEN** no production request SHALL be issued
