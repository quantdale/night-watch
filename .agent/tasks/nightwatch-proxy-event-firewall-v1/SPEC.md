# Proxy event firewall v1

## Task purpose

Close the reproduced raw proxy event-log persistence gap: the outer proxy
writes its configured event log before `RunRecorder`'s later sanitized
projection, and the authenticated writer census does not currently claim that
writer. Enforce a closed, owner-safe raw event contract without claiming the
proxy log is an authenticated run bundle.

## Established starting state

- Task ID: `nightwatch-proxy-event-firewall-v1`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Starting SHA: `ea0b7110efa1065b470efb57f2cd3ff5136a9fa0`
- Session branch: `session/nightwatch-successor-campaign-en-628d8bb9`
- Prior child work: shard/census/run-evidence children are preserved as
  BLOCKED/deferred with classified broad-gate residuals.
- Reproduction: `src/proxy/server.ts` calls `appendProxyEvent` directly before
  `RunRecorder.syncProxyViolations` projects it; `src/proxy/events.ts` writes
  the supplied object without a closed runtime-key/value check, and the
  authenticated writer census does not claim `src/proxy/events.ts`.
- Scope is local/synthetic; no real proxy target or authenticated run.

## Required deliverables

- Strict runtime validation and owner-only atomic append for raw proxy events.
- Exact closed key/value contract with no unknown or private fields.
- Writer census registration/discovery for the raw event-log publisher.
- Focused positive/negative/mutation tests proving raw data cannot bypass the
  boundary and existing proxy summary behavior remains compatible.

## Explicit non-goals

No redesign of proxy policy, resolver, L6, browser containment, production
traffic, real credentials, customer data, or publication. Do not relabel the
runtime event log as a complete authenticated evidence bundle.

## Safety constraints

Local synthetic event objects/files only; preserve no-raw-secret diagnostics and
current unauthenticated proxy behavior.

## Declared Deletions

None.

## Acceptance criteria

- Unknown keys, invalid enums/types, control characters, and unsafe values are
  rejected before any append byte is written.
- Accepted raw events are owner-only and readable by existing proxy summary
  projection.
- Census discovers/claims the raw event writer and fails closed on registry
  drift.
- Focused tests, typecheck, hardening, and milestone validation are recorded.
