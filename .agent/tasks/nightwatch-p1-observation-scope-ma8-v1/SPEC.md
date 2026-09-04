# MA-8 / F-13 P1 Observation-Scope Prerequisite

## Task purpose

Implement and certify the missing P1-specific observation-scope admission
architecture (MA-8 / F-13, canonical requirement E-16), so that a future C-12
P1 passive production observation is architecturally executable with
**zero requests attributable to Nightwatch** — without Nightwatch itself
creating the production subject or issuing production traffic.

Observable outcome: a versioned P1 observation-scope admission chain that
admits only an operator-provided already-existing subject inside an explicit
bounded window, a mechanical network-attribution model distinguishing
`OPERATOR_PREEXISTING` / `APPLICATION_AUTONOMOUS` / `NIGHTWATCH_ATTRIBUTABLE` /
`UNKNOWN` traffic with `UNKNOWN` failing closed, a machine-enforced passive
capability cone that cannot import or invoke active-production machinery, and
terminal session classification that makes vacuous PASS impossible.

## Established starting state

- Task ID: `nightwatch-p1-observation-scope-ma8-v1`
- Starting SHA: `0195a39e60e82b80439ec10ad5a36453804fe030`
- Predecessor: `nightwatch-overnight-reliability-r13-v1`, `COMPLETE`.
- E-16 is canonical: `docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md`
  line 1345 (`design.md §5.5` — precise P1 definition, L6 exemption,
  observation-scope admission chain, MUST FIX BEFORE PRODUCTION).
- C-11 (`nightwatch-prod-observe-safety-kernel-c11-v1`, `COMPLETE`) deferred P1
  per F-13; its eighteen-gate `productionRunGate` gates Nightwatch-issued
  requests and never naturally executes for a P1 session that issues none.
- Exact-head CI inspected once at campaign start: run `33841467907` shows the
  known external signature (`runner_id = 0`, empty runner name, zero steps) —
  `EXTERNAL BLOCKER — NO RUNNER / ZERO STEPS`, not a product failure.

```
IMPLEMENTATION AUTHORIZED:
  MA-8 / F-13 P1 observation-scope prerequisite only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

## Required deliverables

- A versioned named P1 observation-scope admission chain (`nightwatch.p1-observation-scope.v1`),
  digested, with every gate individually falsifiable and denial codes that no
  gate can borrow from another.
- Fresh one-shot expiring owner authorization scoped to the exact P1 campaign
  and stage, consumed exactly once; stale, replayed, wrong-campaign,
  wrong-stage, and wrong-implementation-SHA authorizations deny.
- An explicit P1 subject model: operator-created already-existing subject only;
  Nightwatch must not create authenticated production state; missing or
  ambiguous subject denies.
- External-only P1 scope configuration: exact admitted host (no wildcard, no
  deny-table inversion, no guessed host), bounded observation window with a
  monotonic deadline, private evidence destination; absence denies.
- A mechanical attribution model over observed requests with the four classes
  above; `NIGHTWATCH_ATTRIBUTABLE > 0` or `UNKNOWN > 0` can never yield P1 PASS.
- A machine-enforced passive capability cone: P1 observer code must not import
  the active production executor, replay executor, navigation/fetch/click/type
  primitives, DEV/NEXT campaign execution, or mutation-capable browser actions.
  Structural (import-graph/hardening) enforcement preferred over comments.
- Mandatory privacy projection before persisted observation evidence exists;
  planted-sentinel proof that raw values, credentials, URL parameters, console
  output, errors, screenshots, traces, and profiles cannot leak.
- Kill switch checked at P1 admission AND during observation; window expiry
  terminates; interrupted state cannot resume on stale authority.
- Terminal session classification distinguishing at least `NO_SUBJECT`,
  `NO_QUALIFYING_OBSERVATION`, `ATTRIBUTION_UNKNOWN`,
  `OBSERVATION_WINDOW_EMPTY`, and `PASSIVE_OBSERVATION_COMPLETE`; zero samples
  remain `BLOCKED — NO QUALIFYING PRODUCTION OBSERVATIONS`, never PASS.
- An explicit L6/containment reconciliation: either the P1-specific invariant
  (option B) documented as a deliberate architecture decision with
  threat-model coverage, or the requirement marked BLOCKED. No silent waiver.
- Deterministic seeded property/state-machine tests over gate/state
  transitions with recorded seeds.
- A local-only mock browser/proxy integration fixture modelling the
  operator-already-loaded page; no fixture points at a real production host.
- Hardening rules for every P1 invariant, each proved non-vacuous by mutation.
- Registration of every new P1 suite in the authoritative gate manifests.
- Reconciled OpenSpec change, threat-model note, decisions, current-state docs,
  task state, and campaign report. C-12 stays uncompleted.

## Explicit non-goals

- C-12 P1 real production observation is NOT executed or begun.
- No real production, DEV, NEXT, or C-08b contact of any kind.
- No credential, auth-state, cookie, session, token, or browser profile is
  created, requested, read, or persisted.
- No production host, customer identifier, or credential material committed;
  fixtures use unmistakably synthetic/local values only.
- No repository-owned production allowlist; no production host added anywhere
  in-repo.
- C-10 privacy algebra, C-10.5 provenance binding, and the C-11 request chain
  are consumed, not modified or weakened.
- No sibling-repository writes; siblings are read only.

## Safety constraints

- All fixtures are loopback/local-only. No external DNS, no real Alphaus host.
- Synthetic sentinels only; no real customer identifier in any test or record.
- No force push, history rewrite, destructive reset, `skip-worktree`,
  `assume-unchanged`, hidden Git configuration, or repository-local hook.
- No test deletion, `test.skip`, runner retry, or timeout inflation as a
  correctness fix. No hardening, privacy, C-06, C-10, C-10.5, or C-11 rule
  weakened.
- Implementation happens only in the owned session worktree
  `session/nightwatch-p1-observation-scope--3bd1d83d`.

## Acceptance criteria

- P1 observation-scope chain implemented; every gate individually falsifiable;
  each negative case denies before any production-capable action exists.
- P1 cone cannot navigate, reload-to-establish, click, type, submit, fetch/XHR,
  use replay, call the active production executor, promote to P2, start
  DEV/NEXT, or create authenticated state — proved structurally where possible.
- Attribution fixtures classify known non-Nightwatch, Nightwatch-caused, and
  ambiguous traffic correctly; ambiguous fails closed.
- Privacy sentinels never persist; kill switch and window expiry terminate.
- Property tests green at pinned seeds; mutation probes all bite (0 survivors).
- Zero real production, DEV, NEXT, or C-08b contact; zero credentials;
  `siblingWrites = 0`.
- All P1 suites gate-registered; canonical regression zero failures; no new
  skipped tests; `gate:local` PASS; clean Node 20 gate PASS.
- `C-12 WAS NOT EXECUTED BY THIS CAMPAIGN.`

## Declared Deletions

None. This task deletes no tracked file.
