# EXECUTION PROMPT — W11 autonomous yield proof

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-autonomous-yield-proof-w11-v1
OpenSpec: openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/
Planned-From: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Target Branch: main
Predecessor Task ID: nightwatch-certification-closure-and-validation-integrity-v1
Predecessor Status: COMPLETE

## Mission

Use the mature W7-W10 Nightwatch stack to answer two questions with evidence,
and to close Production Completion Group 12:

1. Can Nightwatch achieve strict historical `EXACT_REDISCOVERY` under leak-free
   conditions?
2. Can Nightwatch discover and mechanically admit a previously unknown defect
   from the current owner-local source universe without fabrication?

A zero-yield answer is acceptable. A fabricated defect is not. This is an
execution and measurement wave: it exercises the system and repairs it only
where execution proves a concrete defect.

## Scope

`.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/**`,
`openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/**`, the W11
evaluation and measurement harnesses, repository-local implementation needed to
truthfully execute and measure Group 12, the Group 12 ledger in
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`,
Nightwatch docs, the governed `README.md` and `docs/CURRENT_STATE.md` yield
surfaces, and commits/pushes/integration from one owned C-00 session worktree.

## Ordered workstreams

1. M0 preflight — provider, toolchain, repository and corpus census; freeze a
   non-vacuous reachability threshold. COMPLETE except the recorded verdict.
2. M1 — commit the frozen historical evaluation definition BEFORE the first
   provider evaluation; prove a widened resume fails closed.
3. M2 — run the strict historical `EXACT_REDISCOVERY` arm; record per-case
   disposition, reason and hidden-target distance; include negative controls;
   classify `ENVIRONMENT_BLOCKED` and exclude it from both sides of every rate.
4. M3 — classify misses into bounded categories; separate model-efficacy
   results from harness defects without overfitting.
5. M4 — freeze the unknown-defect campaign definition at a committed SHA.
6. M5 — execute the owner-local unknown-yield campaign through the ordinary
   `nightwatch-agent campaign run` path under host-owned `--repository` scope.
7. M6 — derive yield accounting mechanically; state every denominator.
8. M7 — leakage and anti-cheating audit, proven live with canaries.
9. M8 — adversarial and resilience checks of the W7-W10 invariants.
10. M9 — repair only evidence-found Nightwatch defects.
11. M10 — close Group 12, publish the measured yield, validate, integrate,
    release.

## Constraints

LOCAL / OWNER-LOCAL only. No Alphaus DEV, NEXT or production contact; no
authenticated runtime use; no database or data-plane access; no browser
journeys against real environments. Sibling repositories are READ ONLY with
identity checked before and after reproduction; no sibling dependency
installation. Provider network egress ONLY through the existing configured
reasoner CLI — that is not authorization for Nightwatch or product traffic to
any Alphaus environment. No Slack / Leslie / Pondr / Notion writes, no issue or
PR creation, no external publication, no force push, no history rewrite, no
weakening of admission criteria, no growing an exemption list to pass. Hidden
historical ground truth must never reach the reasoner; leakage aborts yield
publication. Do not rewrite W7-W10 architecture for aesthetic reasons.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity.

## Validation

`npm run typecheck`, `npm run typecheck:bin`, `npm run hardening:check`,
`npm run hardening:rules`, `npm run agent:check`, `npm run handoff:check`,
`npm run project:check`, `npm run workspace:check`, `npm run session:check`,
`npm run validation:universe`, focused autonomous/runtime/memory/reproduction/
admission suites, historical efficacy and rediscovery suites, current-source
reproduction suites, campaign resume/budget/scope suites, leakage suites,
`npm run gate:local`, `npm test`, `npm run gate:clean` if available, and strict
OpenSpec validation of this change.

## Acceptance and completion gates

W11 is COMPLETE when: preflight is frozen and passed; each arm's definition was
committed before it ran; the strict historical EXACT run completed with
per-case dispositions; leakage is 0 and proven live; false-positive accounting
is explicit; `ENVIRONMENT_BLOCKED` is handled correctly; the unknown-yield
campaign was frozen before execution and executed broadly; mechanical
reproduction and admission are unchanged; yield metrics are mechanically
derived with stated denominators; current-source findings including zero are
stated truthfully; any previously-unknown claim is evidence-bounded; Group 12
12.1-12.12 truthfully close; `gate:local` and `npm test` PASS; required
OpenSpec validation PASSES; the clean gate passes or is honestly recorded as
unavailable; the work is integrated with `HEAD == origin/main`; and the session
is released and removed with no sibling writes, no DEV/NEXT/production contact,
no leakage and no fabricated finding.

At least one bug is NOT a condition of success. A campaign that searches
correctly and finds zero defects is COMPLETE; one that manufactures a defect is
not.

## Git and reporting

Integrate through the Nightwatch session lifecycle from the owned worktree by
fast-forward push. Inspect status, diff and untracked files before every push;
ensure no campaign temp artifacts are tracked, no hidden corpus truth enters
reasoner-visible runtime data, siblings are unchanged and no credentials
appear. If `origin/main` advances, stop and reconcile through the session CLI;
never force push.
