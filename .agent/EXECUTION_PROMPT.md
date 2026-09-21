# EXECUTION PROMPT — Session mutation authority binding (NW-AUD-006)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-session-mutation-authority-binding-v1
OpenSpec: openspec/changes/nightwatch-session-mutation-authority-binding-v1/
Planned-From: caab10e91b8d81f2b98597b3c6974db89638ae6c
Target Branch: main
Predecessor Task ID: nightwatch-exhaustive-repository-audit-proposals-v1
Predecessor Status: COMPLETE

## Mission

Implement and validate the strict-valid remediation change
`nightwatch-session-mutation-authority-binding-v1`: bind every mutating C-00
lifecycle command to the invoking checkout and executing CLI, require explicit
public session/HEAD expectations, admit continuity coherence, serialize
ownership-record transitions with a bounded lock and revision
compare-and-swap, restrict command roles, admit integration authority before
network access, and prove the cross-session and race boundaries non-vacuously.

## Scope

`bin/nightwatch-session.mjs`, the bounded pure admission core
`bin/lib/session-authority.mjs`, C-00 focused tests, the hardening rule and
probe registry, operator documentation and recipes, and the active
task/OpenSpec continuity records.

## Ordered workstreams

1. M1 — invocation/script binding and exact public expectations.
2. M2 — active-task/STATE continuity admission.
3. M3 — transition lock, canonical revision CAS, durable transition, recovery.
4. M4 — canonical-only start/remove and pre-network integration authority.
5. M5 — adversarial/race/probe proof, documentation, full validation and
   integration.

## Constraints

LOCAL / DETERMINISTIC only, plus the existing explicit fast-forward
integration push. No Alphaus contact, authenticated runtime, database or
data-plane access, cloud or infrastructure operation, sibling repository
mutation, external publication, force push, or history rewrite. Other live
sessions are never touched. The cooperative confused-deputy boundary is
stated as such and no hostile same-user isolation is claimed.

## Validation

Focused C-00 suites (`workspaceIsolation`, `sessionMutationAuthority`),
`npm run typecheck`, `npm run typecheck:bin` (reporting lane), `npm run
hardening:check`, `npm run hardening:rules`, `npm run workspace:check`,
`npm run agent:check`, `npm run handoff:check`, `npm run project:check`,
`openspec validate --strict`, `npm run campaign:synthetic`, and the
applicable `npm run gate:local` groups on the committed checkpoint.

## Acceptance / completion gates

- Every delta-spec scenario holds and the adversarial matrix proves refusal
  before effects with byte-for-byte protected state and zero fetch/push
  callbacks.
- The hardening rule and probes HC-090…HC-098 detect each control; removal is
  non-vacuous and bytes restore exactly.
- The change is integrated through the documented C-00 lifecycle; the active
  task closes with a truthful completion snapshot; project truth reflects the
  new checkpoint.
