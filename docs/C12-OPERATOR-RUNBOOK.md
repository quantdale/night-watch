# C-12 Operator Runbook — P1 Passive Production Observation Readiness

Status: `OPERATOR-READY-PENDING-EXTERNAL` — repository-side prerequisites are
implemented (MA-8/F-13 complete, AH-1 preflight available); every external
prerequisite below remains REQUIRED before any C-12 authorization is useful.

C-12 execution is NOT authorized by this runbook. This document describes what
must exist first. When all prerequisites are satisfied AND a fresh
C-12-specific owner authorization is granted, a future campaign may begin.
MA-8 authorization does not transfer.

## Prerequisite ledger

| # | Prerequisite | State | Satisfied by |
|---|---|---|---|
| 1 | MA-8/F-13 implementation complete and bound to the exact current SHA | SATISFIED (repository-side) | `nightwatch.p1-observation-scope.v1` at the implementation anchor recorded in `.agent/tasks/nightwatch-p1-observation-scope-ma8-v1/REPORT.md`; re-verify with `npm run gate:local` at the pinned SHA |
| 2 | PQ qualification evidence bound to that implementation | EXTERNAL_REQUIRED | PQ receipt digest over the exact implementation SHA; inspected, never consumed, by preflight |
| 3 | Operator-provided already-loaded production subject | EXTERNAL_REQUIRED | An operator-created, already-existing authenticated production subject. Nightwatch must not create it, authenticate it, navigate it into existence, reload it, or acquire credentials for it. Provenance must be `OPERATOR_CREATED`; `NIGHTWATCH_CREATED` and `UNKNOWN` deny |
| 4 | Admitted external P1 production configuration values | EXTERNAL_REQUIRED | Exact host, bounded window, private destination, armed kill switch — template below. Never committed to Git |
| 5 | Production host / deployment truth (C-08b) | BLOCKED | C-08b remains organizationally blocked. Inferred deployment facts never satisfy this row |
| 6 | Fresh C-12-specific owner authorization | EXTERNAL_REQUIRED | One-shot, C-12-scoped. MA-8 authorization does not transfer. Preflight inspects the descriptor; it never consumes the authorization |
| 7 | Explicit bounded observation window | EXTERNAL_REQUIRED (values) | Start/end ISO timestamps within the P1 cap (900,000 ms); expired or oversized windows block |
| 8 | Full traffic attribution capability | EXTERNAL_REQUIRED (binding) | `ATTRIBUTING_PROXY` bound. Successful C-12 requires `NIGHTWATCH_ATTRIBUTABLE = 0` **and** `UNKNOWN = 0` alongside actual qualifying observations |
| 9 | Approved private evidence destination | EXTERNAL_REQUIRED | Operator-approved private path-like descriptor. Never a URL; never committed |
| 10 | Kill switch / teardown procedure | SATISFIED (mechanism) + EXTERNAL (arming) | Fail-closed kill switch ships in MA-8 (`killSwitch.ts`); the operator arms it per-run and owns the teardown procedure below |

## Local rehearsal vs live readiness (FC-1)

`src/core/c12Rehearsal/` runs a complete P1 session offline against mock
edges. It exercises the **production-intended core** — `evaluateP1ObservationScope`,
`attachP1ObservationSession`, `issueP1ObserveGrant`, the real attribution
tally, kill switch, and teardown — with only the external edges mocked, and
is pinned to the unresolvable `.invalid` fixture namespace.

It proves the implementation. It proves nothing about production.

| Layer | State |
| --- | --- |
| MA-8/F-13 implementation | certified (repository-side) |
| C-12 local preflight evaluator | certified |
| C-12 synthetic offline rehearsal | `LOCAL_REHEARSAL_PASS` |
| Operator production subject | EXTERNAL — not held |
| Admitted production config | EXTERNAL — not held |
| Deployment truth (C-08b) | EXTERNAL — blocked |
| Live C-12 authorization | NOT INHERITED — never conferred by rehearsal |
| Live C-12 execution | NOT PERFORMED |

Every rehearsal receipt, on every scenario including the passing one, carries
`liveAuthorization: 'NOT_CONFERRED_SYNTHETIC_ONLY'`. The states
`LOCAL_REHEARSAL_PASS`, `LIVE_PREREQUISITES_SATISFIED`, and `C12_AUTHORIZED`
are distinct and must never collapse into one another. A hardening rule
rejects any rehearsal-cone assignment of a different live-authorization
value, and a unit test asserts the disclaimer on every receipt-producing
path — a safe literal surviving on one return path must not license an
unsafe one on another.

Only the clean passive scenario reaches `LOCAL_REHEARSAL_PASS`. Nightwatch
traffic, UNKNOWN attribution, zero qualifying events, and an engaged kill
switch each fall short of PASS rather than passing with a caveat.

Run it through the unit lane:

```bash
npx playwright test tests/unit/c12LocalRehearsal.test.ts --project=nightwatch
```

## Preflight (local-only, zero production contact)


```bash
# Advisory only. Opens no browser, performs no DNS/HTTP, reads no
# credential, consumes no authorization, echoes no input values.
# Exit status: 0 READY · 2 BLOCKED · 1 invalid usage/unreadable descriptor.
npm run c12:preflight -- --input <EXTERNAL_DESCRIPTOR_PATH>
```

Contract: `nightwatch.c12-readiness.v1` (`src/core/c12Readiness/`). The CLI
compiles the pure evaluator fresh on every run and prints only the
readiness report. `READY` requires every prerequisite proven from explicitly
presented facts; anything missing or inferred reports `BLOCKED` with all
applicable `BLOCKED_*` codes in one pass. A `READY` over a synthetic fixture
proves the evaluator works; it never proves the real machine is ready. The
real current machine legitimately remains blocked until the
EXTERNAL_REQUIRED rows above are filled.

## Operator handoff template

Copy, fill outside Git, never commit. Angle brackets are placeholders, not values.

```text
C-12 OPERATOR CHECKLIST (fill outside Git; do not commit)

[ ] P1 implementation SHA:        <IMPLEMENTATION_SHA>
[ ] PQ receipt digest:            <PQ_RECEIPT>
[ ] Already-existing subject:     <ALREADY_EXISTING_SUBJECT_HANDLE>
      provenance: OPERATOR_CREATED (verified by operator, not by Nightwatch)
[ ] P1 scope config (external path): <P1_SCOPE_CONFIG_EXTERNAL_PATH>
      exact host:                 <EXACT_PRODUCTION_HOST>
      window start (ISO):         <WINDOW_START_ISO>
      window end (ISO):           <WINDOW_END_ISO>
      evidence destination:       <PRIVATE_EVIDENCE_DESTINATION>
      kill switch:                ARMED
[ ] C-08b deployment fact:        <PROVEN_DEPLOYMENT_FACT_REF> (PROVEN only)
[ ] Owner authorization:          <OWNER_AUTHORIZATION> (fresh, C-12-scoped)
[ ] Attribution binding:          ATTRIBUTING_PROXY
[ ] Preflight result:             READY (library evaluation over the above)

Do NOT send these values to Git. Do NOT commit them. Do NOT paste real
production hosts, credentials, cookies, IDs, or auth material into issues,
chats, or shared docs. The scope config lives at an external path with
owner-only permissions (cf. F-09 external-only rule).
```

## Teardown / kill-switch procedure

1. The operator engages the kill switch. The P1 observer checks it at entry,
   pre-attach, and every poll; an engaged switch stops the session within one
   gate check — no operator reliance on process timing.
2. Verify terminal classification is not a vacuous PASS: a session with zero
   qualifying observations or any `UNKNOWN` attribution cannot report
   `PASSIVE_OBSERVATION_COMPLETE`.
3. Evidence remains at the approved private destination only; no raw values
   persist (C-10 firewall re-validates at every durable write).
4. Record the session outcome, grants consumed/revoked, and the PQ receipt in
   the campaign report. Revoke unconsumed one-shot grants.

## What this runbook does not do

It does not authorize C-12, C-13, or C-14. It does not create operator
subjects, populate production configuration, contact production, or weaken
MA-8. The previous C-12 attempt under passive-only authorization ended
`BLOCKED` with zero qualifying sessions and zero production contact; that
outcome is preserved as evidence, not rewritten as failure (see CURRENT_STATE
historical record).
