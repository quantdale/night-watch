# EXECUTION PROMPT — Review Operations, History Intelligence & Human-Filing Completion

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-review-operations-history-filing-v1
OpenSpec: openspec/changes/nightwatch-review-operations-history-filing-v1/
Planned-From: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Target Branch: main
Predecessor Task ID: nightwatch-owner-local-review-persistence-v1
Predecessor Status: COMPLETE

## Mission

Make the certified owner-local review store operationally useful over time and
at scale. Deliver a structurally read-only inventory, a deterministic
per-finding review history across artifact generations, a review-state-aware
human filing report with a production-local generation path, and real
historical identity in the finding history that recurrence and defect-class
analysis rest on. Repair the predecessor terminal report's implementation
anchor and make a live-authority marker standing in for a stable historical
anchor mechanically impossible. Invent no retention policy and perform no
destructive review-store operation.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source, tests, schemas, contracts,
  owner-local review-store READ functionality and existing
  review write functionality where needed,
  review inventory, review history, review diagnostics,
  Control Center UI and local read routes, repository-native CLI,
  human filing report integration,
  finding-history identity propagation and finding intelligence,
  synthetic corpora, benchmarks, property/mutation/crash/corruption tests,
  documentation, OpenSpec, .agent continuity, hardening,
  commits, pushes, clean-clone certification

AUTOMATIC DELETION / RETENTION / ARCHIVAL:  NOT AUTHORIZED
REAL PRODUCTION CONTACT:                    NOT AUTHORIZED
NEXT / DEV EXECUTION:                       NOT AUTHORIZED
C-12 / C-13 / C-14 LIVE EXECUTION:          NOT AUTHORIZED
C-08b:                                      NOT AUTHORIZED
C-07 DEV:                                   NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:            NOT AUTHORIZED
EXTERNAL FILING:                            NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:                   NOT AUTHORIZED
SIBLING WRITES:                             NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:               NOT AUTHORIZED
```

## Ordered workstreams

1. M0 — campaign open.
2. M1 — DEF-RO-1: terminal implementation-anchor repair and its rule.
3. M2 — read-only enumeration primitive and the inventory core.
4. M3 — the per-finding review history core.
5. M4 — historical identity propagation and DEF-RO-2, the vacuous
   regression-candidate lineage guard.
6. M5 — review-state-aware human filing report and its production path.
7. M6 — the `nightwatch-review` CLI.
8. M7 — Control Center contracts, adapter, authority, routes and view.
9. M8 — the review-operations hardening rule, proven to bite.
10. M9 — determinism, order-independence, concurrency, corruption, property
    tests and the privacy red team.
11. M10 — scale at 10k / 25k / 50k with fresh-process measurement.
12. M11 — the mutation campaign, >= 30 mutations, zero unexplained survivors.
13. M12 — browser qualification, >= 30 loops.
14. M13 — documentation, REPORT, full regression, `gate:local`, `gate:clean`.

## Constraints

The review store's schema, identity, file-name shape and no-replace
publication primitive are not redesigned. `verifyReviewCurrent` remains the
only binding validator. The inventory holds a read-only store handle, so a
destructive operation is structurally unavailable. Unknown store entries are
never opened and never named in output. No recurrence or relationship rule is
loosened; only tightenings that the rules' own stated requirements already
imply are permitted. A local decision never acquires organizational authority.
A derived index is introduced only if measurement proves directory scans
inadequate.

## Validation

`typecheck`, `hardening:check`, `agent:check`, `project:check`,
`handoff:check`, the review-store / inventory / history / reviewer /
findingIntel / filing-report / privacy suites, Control Center and browser
lanes, determinism and order-independence, property tests, the corruption
corpus, the concurrency matrix, the mutation campaign, scale measurement,
full regression, `gate:local`, `gate:clean` with a proven fresh install.

## Acceptance and completion gates

As enumerated in the campaign brief section 57: inventory, history, filing,
scale, safety and verification criteria all satisfied, with zero unexplained
mutation survivors, zero destructive review-store operations, a truthful
documentation set and a clean workspace.

## Git and reporting

C-00 governs. All implementation in the owned session worktree
`session/nightwatch-review-operations-his-7431812c`. Integrate by verified
fast-forward push; never force-push. At close: `HEAD == origin/main`,
canonical clean, one worktree, no live session, no campaign branch.
