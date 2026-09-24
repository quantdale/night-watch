# Proxy event firewall v1

## Purpose

Make the raw proxy event log a closed, owner-safe persistence boundary and
bring its writer under the authenticated writer census.

## Starting State

- Task ID: `nightwatch-proxy-event-firewall-v1`
- Starting SHA: `ea0b7110efa1065b470efb57f2cd3ff5136a9fa0`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Source: `src/proxy/events.ts`, `src/proxy/server.ts`,
  `bin/lib/authenticatedWriterCensus.mjs`, and privacy hardening.
- Reproduction: raw append occurs before recorder projection and is not
  claimed by the writer registry.
- Dependencies: existing ProxyEvent/ProxySummary readers, exact L6 identity, and
  authenticated writer census.

## Scope

Raw event schema validator, private append initialization, writer-census
registration/discovery, focused tests, and continuity/OpenSpec records.

## Non-Goals

No proxy semantic policy or resolver redesign, no external traffic, no full
authenticated bundle redesign.

## Safety Constraints

Synthetic local event files only; no credentials/customer values; preserve
existing summary parsing and privacy.

## Architecture / Approach

Validate `ProxyEvent` as unknown input against an exact key set, required
fields, enums, bounds, and safe strings. Normalize only accepted values; append
through owner-only descriptor/fsync/rename-safe handling (or an equivalent
private append primitive). Register `src/proxy/events.ts` as a distinct
`PROXY_EVENT_WRITER` and teach discovery to recognize `logPath` writes. Add
negative tests for unknown/private fields and mutation probes for validator and
census refusal.

## Milestones

### M1 — Reproduction and contract

- Objective: reproduce raw append/census gap and freeze exact schema.
- Files/areas: proxy events, writer census, focused tests.
- Implementation actions: add failing unknown-field/census tests.
- Acceptance criteria: current raw writer is demonstrably outside firewall.
- Validation commands: focused proxy/census tests.
- **Status:** COMPLETE

### M2 — Raw firewall implementation

- Objective: validate and privately append accepted events; register writer.
- Files/areas: `events.ts`, census, hardening.
- Implementation actions: implement closed validator and writer discovery.
- Acceptance criteria: no unknown/private bytes; summary compatibility.
- Validation commands: focused tests, typecheck, hardening.
- **Status:** COMPLETE

### M3 — Adversarial validation and checkpoint

- Objective: mutation-test validator/census and run milestone lanes.
- Files/areas: tests/state/OpenSpec.
- Implementation actions: remove each guard in temporary mutations; classify
  broad source-intelligence residual.
- Acceptance criteria: mutations detected; no false PASS.
- Validation commands: `gate:dev`, `gate:milestone`.
- **Status:** IN_PROGRESS

### M4 — Close and reassess

- Objective: reconcile truth and choose the next local candidate.
- Files/areas: reports/continuity.
- Implementation actions: record residuals and reassess credential/other gaps.
- Acceptance criteria: no false completion claim.
- Validation commands: continuity checks.
- Status: NOT_STARTED

## Validation Strategy

Use synthetic proxy event fixtures and focused privacy/census tests, then
mutation probes and milestone gates. Do not contact external targets.

## Decision Log

- 2026-09-24 — Select after popup L0 prototype was disproven as insufficient;
  raw proxy persistence has a narrower, directly testable local boundary.

## Discoveries

- `ProxyEvent` is structurally typed at compile time but JavaScript callers
  can add unknown runtime fields.
- The raw event log is runtime scratch, so it must be explicitly scoped as a
  proxy-event writer rather than silently treated as a run recorder.

## Deferred Work

Full run-evidence journal, lower-level popup target admission, and credential
binding remain later.

## Completion Criteria

Raw proxy persistence is closed/owner-safe, census-covered, mutation-proven,
and focused/milestone evidence is recorded.
