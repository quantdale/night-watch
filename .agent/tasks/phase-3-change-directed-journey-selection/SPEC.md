# Nightwatch Phase 3 — Change-Directed Journey Selection

Status: `FROZEN_INTENT`

## Task purpose

Build a deterministic, explainable change-intelligence layer that turns
source changes in the evidence-backed Ripple repository scope into a safe
selection and priority order for the existing Phase 2C canaries:

`J1` payer exchange-rate read, `J2` common exchange-rate read, and `J3`
account inventory.

The selector answers change relevance, not failure root cause. It must say
what source changed, which existing canary may exercise that behavior, why the
mapping is trusted, what risk is present, and why another canary was not
selected. It must never claim that a source commit was deployed or caused a
product defect without separate deployment or investigation evidence.

## Established starting state

- Task ID: `phase-3-change-directed-journey-selection`.
- Starting Nightwatch SHA: `427f10295ae2037d09741de98ebea9210f14f85a`.
- Inherited validated Phase 2C implementation: `efc03de2f7396a96baaca485894df300ddcc4ce0`.
- Inherited Phase 2C checkpoint: `0f894d96bc384e402f4199ac6255ecb3948781c6`.
- Phase 2C terminal clean documentation/closure HEAD is the starting SHA and
  is an approved documentation-only descendant of the implementation.
- Phase 2A, 2B, and 2C remain closed. Their contracts, evidence, safety
  kernel, replay/oracle model, and real-run results are inputs, not targets for
  discretionary refactoring.
- Existing tests pass at the starting state: TypeScript, full Playwright
  (`263 passed`), agent continuity check, and whitespace check.

## Scope

### Product and repository scope

The initial routing candidates are the current Ripple cluster:

- `mobingilabs/ripple-ui` — legacy Ripple shell and source-backed routes.
- `alphauslabs/alupi` — MFE host/monorepo, included only where an existing
  canary crosses a mapped app or shared package.
- `alphauslabs/ripple-ui-dashboard` — dashboard MFE, only if a canary uses it.
- `alphauslabs/ripple-ui-cost-finalization` — cost-finalization MFE, only if a
  canary uses it.
- `mobingilabs/ripple-api` — API source, only for proven canary endpoints.
- `mobingilabs/ouchan` — backend termination point, only for proven handlers or
  shared services used by a canary.
- Blue API/protobuf/SDK repositories only when source tracing proves that a
  selected canary depends on the changed contract or generated client.

The final in-scope set is an evidence-backed artifact, not a repository-name
assumption. Unrelated Alphaus repositories are out of scope. Nightwatch is the
only repository that may be modified.

### Change intelligence

Implement separate pure stages:

1. read-only Git metadata and a reproducible change window;
2. sanitized changed-file/change-symbol representation;
3. versioned canary dependency map with source SHA provenance;
4. impact graph and confidence/risk classification;
5. deterministic selection, ranking, negative explanations, and fallback;
6. baseline-state transitions that cannot advance after failed or blocked
   execution.

The first implementation may use a hybrid of curated source-proven journey
edges and modest mechanical import/route/API dependency extraction. It must
not become a language server, fuzzing system, LLM planner, datastore oracle,
or new customer journey engine.

## Non-goals

- modifying, fetching, resetting, stashing, cleaning, or committing any
  Alphaus repository;
- production or datastore access, product mutations, credential handling, or
  customer evidence;
- random exploration, fuzzing, autonomous repair, AI/LLM-based selection, or
  commit-to-bug root-cause correlation;
- replacing or expanding the three trusted canaries;
- claiming deployment identity from source Git state alone;
- requiring network access for pure selection or unit tests;
- beginning Phase 4.

## Frozen terminology and versions

- Change-intelligence evidence schema: `nightwatch.change-intelligence.phase3.v1`.
- Dependency-map schema: `nightwatch.dependency-map.phase3.v1`.
- Selector model: `nightwatch.selector.phase3.v1`.
- Existing journey contract lineage: `nightwatch.journey.phase2c.v1`.
- Source change labels: `COMMITTED_UPSTREAM_CHANGE`,
  `LOCAL_COMMITTED_CHANGE`, and `DIRTY_WORKTREE_CHANGE`.
- Source-only impact terminology: `SOURCE_CHANGE`,
  `SOURCE_IMPACT_CANDIDATE`, and `DEPLOYMENT_STATUS_UNRESOLVED`.

## Change-window and freshness contract

The default reproducible window is an explicit per-repository
`verifiedBaselineSha -> checkedOutHeadSha` range. A repository record must
include its branch, checked-out SHA, tracking ref/SHA when locally available,
ahead/behind counts, dirty state, merge-base where relevant, range semantics,
and freshness source. Dirty files are excluded from committed/nightly
selection unless an explicit local-development shadow mode is requested; they
remain a separately labeled signal.

A bootstrap baseline is not evidence that historical source was tested. A
baseline can become `VERIFIED_BASELINE` only after an accepted selected-run
disposition. Failed, blocked, stale, conflicting, or unresolved runs retain a
`PENDING_CHANGESET` and cannot advance past the source range. Baseline writes,
if implemented, must be atomic and recoverable.

## Mapping and selection contract

Each impact edge records repository, source SHA, source path/symbol, target
journey, edge kind, reason code, provenance, dependency-map version, journey
contract version, confidence, risk classes, and whether the edge is stale or
conflicting. Evidence precedence is direct source dependency, current journey
contract, route/API callsite, proven backend handler, import graph, path
heuristic, then commit message. Commit text is context only.

Impact confidence and risk are independent:

- `HIGH`: direct journey component/route/API/backend dependency;
- `MEDIUM`: source-backed shared or transitive dependency;
- `LOW`: heuristic-only plausible relationship;
- `UNKNOWN`: relevant runtime source without a defensible mapping.

Risk classes include auth/permissions, routing, data fetch, financial/cost
semantics, exchange rate, account inventory, shared shell/layout, transport,
contract/proto, error handling, resource/build, and test/doc-only. Diff size is
secondary metadata, never the dominant risk factor.

The selector must produce a stable changeset ID derived from repository IDs,
base/head SHAs, map/contract versions, and selector version. It must return
changed repositories/files, impact edges, selected journeys, deterministic
priority, reasons, confidence, risk, all non-selected journeys with reasons,
unresolved impact, and visible fallback state.

- A clearly proven non-runtime docs/test-only change may return zero with
  `ZERO_SELECTION_JUSTIFIED`.
- An unknown or relevant runtime change may never silently return zero; it
  invokes visible `FALLBACK_ALL_CANARIES` (or an equally conservative policy
  proven by tests).
- Shared auth, router, bootstrap, layout, transport, state initialization,
  high-risk unresolved configuration, or conflicting high-risk evidence selects
  all three when source tracing proves shared scope.
- Clear isolated source dependencies must discriminate, so the default result
  is not always all three.
- Priority is deterministic: shared/auth/safety-critical first, then direct
  journey/API/backend, then strong transitive, then conservative fallback;
  ties use stable journey IDs.

## Required validation before completion

Acceptance is frozen before observing selector results:

1. Phase 2A/2B/2C closure and SHA semantics are independently reconciled.
2. The final in-scope repository ledger proves role, canary dependency,
   current branch/SHA, tracking freshness, ahead/behind, dirty state, and
   read-only status.
3. Change windows, source-change labels, bootstrap/provenance semantics, and
   stale-map detection are implemented and tested offline.
4. J1/J2/J3 dependency contracts cover direct UI, routes, state, API client,
   backend, shared, and proven contract edges without invented dependencies.
5. File/path, import/component/route, API/client, backend-only, shared-core,
   config/resource, add/rename/delete, and multi-repository impacts work.
6. Confidence, risk, reason codes, stable ordering, deterministic identity,
   negative explanations, duplicate-edge deduplication, and conflict evidence
   are represented in the result schema.
7. Unknown relevant runtime impact falls back conservatively; only proven
   non-runtime changes can justify zero selection.
8. Atomic baseline behavior is tested for accepted, failed, blocked, stale,
   and crashed/partial update cases.
9. Durable fixtures and independent historical source-tracing backtests cover
   at least two direct journey cases where available, shared impact, correct
   non-selection, unknown fallback, rename/delete, and backend-only impact.
   Ground truth is established independently before comparison; unresolved
   history remains explicitly unresolved.
10. Adversarial false-negative and false-positive reviews inspect dynamic
    imports/routes, barrels, stores, wrappers, generated clients, MFE
    boundaries, config/build/resource changes, dead code, docs, tests, and
    isolated styles.
11. Current repositories receive a read-only shadow selection with no
    automatic DEV invocation. A meaningful current range may use only the
    already-proven selected journey runner after all gates pass; an empty
    current range does not require live execution.
12. Pure selection has no network dependency and is deterministic across
    repeated runs. Evidence is sanitized and contains no credentials,
    customer data, bodies, raw patches, or unnecessary source copies.
13. Full required validation passes: `npx tsc --noEmit`,
    `npx playwright test`, `npm run agent:check`, `git diff --check`, focused
    Phase 3 tests, and Alphaus before/after integrity review.
14. Final adversarial review passes all applicable Phase 3 safety questions;
    no Alphaus repository changed; Nightwatch is clean and Phase 4 is not
    started.

## Safe optional real execution

Real execution is not required when the current source range is empty or the
shadow result is not independently reviewable. If used, it must occur only in
DEV through the established Phase 2B/2C engine, with current auth validation,
fresh contexts/replay, no new actions, and lineage:

`CHANGESET_ID -> SELECTION_RESULT -> JOURNEY_RUN_ID -> JOURNEY_RESULT`.

The established safety vector must remain zero: production attempts, proxy
violations, unknown destinations, unknown approvals, mutations, DB queries,
and action-caused UNKNOWN. A safety, privacy, auth, or destination failure
stops further real execution and does not invalidate pure selection artifacts.

## Completion boundary

Phase 3 is complete only after the frozen acceptance criteria, implementation,
backtests, shadow review, validation, privacy/safety review, final reports,
and Nightwatch-only closure commit are complete. The next task may be
recommended as Phase 4, but Phase 4 must not be created or started here.
