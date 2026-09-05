# EXECUTION PROMPT — Owner-Local Review Persistence & Dossier Identity Enrichment

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-owner-local-review-persistence-v1
OpenSpec: openspec/changes/nightwatch-owner-local-review-persistence-v1/
Planned-From: 47c00883461fe689393d35e275b51eac0b78ed15
Target Branch: main
Predecessor Task ID: nightwatch-reviewer-surface-and-intel-scale-v1
Predecessor Status: COMPLETE

## Mission

Repair the predecessor campaign's contradictory terminal safety accounting
and make that contradiction structurally impossible. Make the certified
local review lifecycle durable through an owner-local, private, atomic,
no-replace, binding-keyed review store built on the repository's existing
private-artifact publication primitive. Integrate a narrow local review
write authority and a page-bounded persisted read path into the Control
Center reviewer surface. Propagate the expectation and semantic-contract
identities that already exist upstream on v2 dossiers into the dossier
projection and the finding intelligence, deriving nothing and loosening no
classification rule. Certify durability, atomicity, immutability,
concurrency, crash consistency, corruption fail-closure, privacy, scale,
fresh-install and documentation truth.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source, tests, schemas, contracts, CLI,
  owner-local private review persistence and its APIs,
  review CLI/UI controls and Control Center local routes,
  atomic file/storage implementation,
  finding dossier metadata and finding intelligence integration,
  schema/version work and local migration/rebuild tooling,
  synthetic and local fixtures, crash/concurrency/mutation/property
  testing, .agent continuity tooling and hardening rules,
  documentation, OpenSpec, lifecycle state, diagnostics,
  commits, pushes, clean-clone certification

REAL PRODUCTION CONTACT:            NOT AUTHORIZED
NEXT / DEV EXECUTION:               NOT AUTHORIZED
C-12 / C-13 / C-14 LIVE EXECUTION:  NOT AUTHORIZED
C-08b:                              NOT AUTHORIZED
C-07 DEV:                           NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:    NOT AUTHORIZED
EXTERNAL FILING:                    NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:           NOT AUTHORIZED
SIBLING WRITES:                     NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:       NOT AUTHORIZED
```

## Ordered workstreams

1. M0 — predecessor safety-event truth repair and its structural check.
2. M1 — review store core over the existing no-replace primitive.
3. M2 — dossier expectation / semantic-contract identity propagation.
4. M3 — Control Center narrow write authority, page-bounded read path, UI.
5. M4 — occurrence-complete store-boundary hardening, each rule proven to
   bite by mutating the guarded artifact.
6. M5 — seeded property suite, >= 20 crash injections, concurrency matrix,
   >= 25 mutations with zero unexplained survivors.
7. M6 — scale at 1k/5k/10k across 0%/10%/50%/100% reviewed.
8. M7 — browser persistence workflow (>= 30 passes) and server restart proof.
9. M8 — documentation, OpenSpec, `.agent` state, campaign REPORT,
   full regression, `gate:local`, `gate:clean` with proven fresh install.

## Constraints

The review lifecycle in `src/core/findingReview/` is not redesigned;
`verifyReviewCurrent` remains the only binding validator. The pairwise
relationship classifier is not rewritten for asymptotics. No database is
introduced. Stale review history is never deleted automatically. A local
decision never acquires organizational authority: every persisted receipt
carries `organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`, and no path may
exist from the review store to Slack, Leslie or Pondr. Identity is carried,
never derived: absent upstream identity stays `null` / UNKNOWN.

## Validation

`typecheck`, `hardening:check`, `agent:check`, `project:check`,
`handoff:check`, focused review-store / reviewer / findingIntel / dossier /
privacy suites, Control Center and browser lanes, scale measurement,
determinism, property tests, mutation campaign, full regression,
`gate:local`, `gate:clean`.

## Acceptance and completion gates

As enumerated in the campaign brief section 59: persistence, authority,
reviewer, identity and quality criteria all satisfied, with mutation
survivors zero, a truthful documentation set, and a clean workspace.

## Git and reporting

C-00 governs. All implementation in the owned session worktree
`session/nightwatch-owner-local-review-pe-bef49826`. Integrate by verified
fast-forward push; never force-push. At close: `HEAD == origin/main`,
canonical clean, one worktree, no live session, no campaign branch.
