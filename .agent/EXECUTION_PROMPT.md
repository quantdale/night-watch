# EXECUTION PROMPT — Priority audit remediation sequence (umbrella)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-priority-audit-remediation-sequence-v1
OpenSpec: openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/
Planned-From: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
Target Branch: main
Predecessor Task ID: nightwatch-session-mutation-authority-binding-v1
Predecessor Status: COMPLETE

## Mission

Under one owner-authorized C-00 session, serially implement and certify five
already-planned audit remediations — NW-AUD-010, NW-AUD-014, NW-AUD-019,
NW-AUD-018, NW-AUD-020 — each proven against live source with focused
regression and adversarial/mutation proof, then run one cross-phase audit and
one full certification, close C-00 with `HEAD == origin/main`, enumerate the
remaining audit backlog without starting it, and stop.

## Scope

Nightwatch source, tests, hardening, schemas, synthetic fixtures, umbrella and
per-remediation OpenSpec/task continuity, and the C-00 lifecycle from the
owned worktree `session/nightwatch-priority-audit-remedi-0e17af9c`. Each
remediation retains its own OpenSpec identity; planning-only task STATEs are
not rewritten as implementation history.

## Ordered workstreams

1. M0 — campaign bootstrap: umbrella continuity, handoff admission, checks
   green, bootstrap commit.
2. M1 — Phase 1 NW-AUD-010 release evidence lineage integrity.
3. M2 — Phase 2 NW-AUD-014 child-process boundary totality.
4. M3 — Phase 3 NW-AUD-019 private payload structural screening.
5. M4 — Phase 4 NW-AUD-018 authenticated evidence minimization.
6. M5 — Phase 5 NW-AUD-020 semantic request admission.
7. M6 — cross-phase integration audit, single full certification, honest
   OpenSpec/task closure, C-00 integrate/release/remove, terminal report and
   stop.

## Constraints

LOCAL / OFFLINE / SYNTHETIC only, plus the explicit fast-forward integration
push. No Alphaus DEV/NEXT/production contact, authenticated product
execution, customer data, real credentials, database/data-plane or cloud
access, sibling repository mutation, external publication, force push, or
history rewrite. Serial implementation; read-only recon may be parallel;
one writer. No remediation beyond the five named.

## Validation

Focused suites and `npm run gate:dev` during edits; relevant focused suites
and `npm run gate:milestone` at each phase checkpoint; full certification
once after Phase 5 and the cross-phase audit (`npm run typecheck`,
`typecheck:bin`, `hardening:check`, `hardening:rules`, `agent:check`,
`handoff:check`, `project:check`, `workspace:check`, `session:check`,
`validation:universe`, strict OpenSpec for all six changes, `npm test`,
`gate:local`, `gate:clean`, plus affected synthetic/UI/browser lanes).

## Acceptance / completion gates

- Every phase admission gate holds with evidence before the next phase
  starts; no skipped phase; no fabricated success.
- Cross-phase interaction audit passes; single full certification passes
  without hidden skips or inflated timeouts.
- All five remediation OpenSpec checklists reconciled from evidence; umbrella
  report sections A–N complete; safety counts zero; remaining audit backlog
  enumerated and not started.
- C-00 integrate with exact expectations, `HEAD == origin/main`, session
  released and removed, terminal routing correct; verdict exactly COMPLETE
  (or honest PARTIAL — BLOCKED / FAILED).
