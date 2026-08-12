# NIGHTWATCH PHASE 3 — CHANGE-DIRECTED JOURNEY SELECTION COMPLETE

Status: `COMPLETE` pending the final Nightwatch-only documentation commit.

Phase 3 adds deterministic source-change intelligence for the existing trusted
Ripple canaries. It does not add journeys, browser actions, fuzzing, AI
selection, datastore checks, deployment inference, or commit-to-bug
correlation.

## 1. Closure identity

- Starting SHA: `427f10295ae2037d09741de98ebea9210f14f85a`.
- Final implementation SHA: `8d72ec9159cba450e4e9d763d0f9e9d0ba7a493b`.
- Final checkpoint SHA: the final Nightwatch-only closure checkpoint recorded
  by Git after this report is committed.
- Final clean HEAD: recorded by the final `git rev-parse HEAD` closure check.
- Phase 4 was not started.

## 2. Phase 2C reconciliation

The inherited closure was independently reconciled before Phase 3 task
creation. The chain is:

| Phase | Validated implementation | Checkpoint | Terminal clean HEAD | Semantics |
| --- | --- | --- | --- | --- |
| 2A | `a6d7c8b` | `9bf2c459` | `ec4c143` | `SYNCED` |
| 2B | `78e5d1f` | `1b6e7a5` | `1760e594` | `SYNCED` |
| 2C | `efc03de2f7396a96baaca485894df300ddcc4ce0` | `0f894d96bc384e402f4199ac6255ecb3948781c6` | `427f10295ae2037d09741de98ebea9210f14f85a` | `CHECKPOINT_ADVANCE`, documentation-only terminal descendant |

`efc03de2` is the Phase 2C implementation; `0f894d9` is the validated
completion checkpoint; `427f1029` is the terminal clean documentation/closure
HEAD. No prior phase was reopened or refactored. The Phase 2C seven-context
matrix, zero-safety-event vector, privacy PASS, `nightwatch.evidence.phase2c.v1`
schema, J1/J2/J3 bounded comparison, `e731ba4` cancellation-classification
repair, and separate unresolved malformed-JSON status reconcile with the
durable reports. The inherited full suite was `263 passed`.

## 3. In-scope repositories and freshness

The scope was routed from `.github/codebase-index.md` and then source-verified.
All entries are `READ_ONLY_ONLY=true`; no fetch, checkout, reset, stash, clean,
install, or write was performed in an Alphaus repository.

| Repository | Branch / checked-out SHA | Tracking SHA | Ahead/behind | Worktree / freshness |
| --- | --- | --- | --- | --- |
| `mobingilabs/ripple-ui` | `dev` / `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | `origin/dev` `e46b8ed6540b647574bdb96ec59eca42fc8acdef` | `0/21` | pre-existing deleted OpenSpec files and untracked `AGENTS.md`; stale checkout, local tracking only |
| `mobingilabs/ripple-api` | `master` / `27bb007ad0c798800b6bd3b29760c966422966e7` | `origin/master` same | `0/0` | pre-existing untracked `AGENTS.md`; local tracking only |
| `mobingilabs/ouchan` | `master` / `565f00a87fb7616cc23c45d4ffeabee38a41c65f` | `origin/master` `16910fc9969e86558828cb0f273eeabae81fcce3` | `0/25` | pre-existing tracked edits/deletions/untracked files; stale checkout, local tracking only |
| `alphauslabs/blueapi` | `main` / `691422e5dc81afd263d064986fb50fcb3ea432a9` | `origin/main` same | `0/2` | pre-existing untracked `AGENTS.md` and submodule state; local tracking only |
| `alphauslabs/blue-sdk-go` | `main` / `8883ee3d3a073352626c8c35e20e9fc5ed765373` | `origin/main` same | `0/1` | pre-existing untracked `AGENTS.md`; local tracking only |
| `alphauslabs/grpc-chunk-parser` | `main` / `66802f281698dfcf0903f0a117d4637fce3fd945` | `origin/main` same | `0/0` | clean; local tracking only |

Reviewed and excluded from this concrete canary graph: `alphauslabs/alupi`,
`ripple-ui-dashboard`, `ripple-ui-cost-finalization`, `blueinternal`,
`blue-sdk-ts`, and `mobingilabs/protobuf`. Their exclusion is source-backed in
`REPOSITORY_SCOPE.md`, not based on repository names alone. Remote freshness was
not confirmed; deployment identity remains `DEPLOYMENT_STATUS_UNRESOLVED`.

## 4. Change window and baseline model

- Default window: explicit per-repository `base SHA -> checked-out HEAD`, with
  merge-base and range semantics persisted. Same base/head is a valid empty
  window; no whole-history or vague time window is used.
- Sources are distinct: `COMMITTED_UPSTREAM_CHANGE`, `LOCAL_COMMITTED_CHANGE`,
  and `DIRTY_WORKTREE_CHANGE`. Dirty state is excluded by default and is only
  available through explicit `LOCAL_DEVELOPMENT_SHADOW_MODE`.
- Initial records are `BOOTSTRAP_BASELINE`, never an implicit claim that source
  history was exercised. Accepted success advances covered baselines to head;
  failed, blocked, or not-run dispositions create `PENDING_CHANGESET` and do
  not advance.
- Baseline schema: `nightwatch.baseline.phase3.v1`. Writes use temp-file plus
  atomic rename and the focused suite verifies round-trip replacement and
  pending behavior.
- The implementation does not yet schedule overnight runs; it supplies the
  safe state transition that a later scheduler must use.

## 5. Change-intelligence architecture

- Schema: `nightwatch.change-intelligence.phase3.v1`.
- Selector: `nightwatch.selector.phase3.v1`.
- Dependency map: `nightwatch.ripple-dependency-map.v1`.
- Changeset identity is derived from selector version, repo baselines, and
  changed files; generated time does not change selection or its digest.
- Collection, impact analysis, and selection are separate pure layers. Git
  invocation uses argument arrays and validates object IDs; commit messages are
  metadata only and never primary impact evidence.
- Evidence is sanitized metadata: repository, SHA, status, path, optional
  symbols, edge ID, reason code, confidence, risk, and references. Whole
  patches, customer data, credentials, auth state, raw bodies, and screenshots
  are not persisted.

## 6. Canary dependency maps

J1 — payer exchange-rate read:

- Route `/payer-exchange-rate-v2` in legacy `ripple-ui`.
- Payer page/DataTable and `src/vuex/api/exchangeRatePayer_v2.js` GET.
- `ripple-api` `Routing.yaml` to `ExchangeRate.php::getAccountExchangeForMonth`.
- Shared router/auth guard, authenticated layout, Axios transport, and Vuex
  registration are mapped as shared edges.

J2 — common exchange-rate read:

- Route `/global-exchange-rate-v2` in legacy `ripple-ui`.
- Global page/DataTable and `src/vuex/api/exchangeRateGlobal.js` GET.
- `ripple-api` `Routing.yaml` to `ExchangeRate.php::getCommonExchangeRate`.
- Same proven shared router/auth/layout/transport/state edges as J1; no Blue
  contract edge was invented.

J3 — account inventory:

- Route `/accounts`, Account Management page/DataTable, `accounts.js`,
  `billingGroups.js`, and `admin.js` stream/parser callsite.
- Ripple `GET /accts` to `Account.php::getAccountVendor`.
- Blue streamed `GET /billing/v1/billinggroups` through
  `grpc-chunk-parser::parseGrpcData`, `ouchan` `billingd`/`billingsvc`, and
  the generated `blue-sdk-go/billing/v1` client.
- `blueapi/billing/v1/billing.proto` `Billing.ListBillingGroups` is the proven
  contract edge.

Shared dependency edges include router/auth, default layout, Axios transport,
global Vuex registration, shared table, API route configuration, and J3's
stream parser. Curated direct component/route/API/backend edges carry source
SHA and `phase2c.v1` contract provenance. Generated client and proto evidence
is deduplicated as one logical J3 surface.

## 7. Classification, confidence, risk, and priority

Implemented impact classes include direct journey/component, route, API client,
backend handler, shared auth/router/layout/transport/state, contract,
transitive dependency, test/doc-only, unrelated, and unknown impact.

Confidence is independent of risk: `HIGH` for direct source-backed component,
call, handler, route, or contract edges; `MEDIUM` for proven shared/transitive
edges; `LOW`/`UNKNOWN` only for weak/unresolved evidence. Risk classes cover
auth/permissions, routing, data fetch, cost/financial semantics, exchange
rate, account inventory, shared UI shell, API transport, proto/contract, error
handling, resource loading, and test/doc-only.

Priority is deterministic: P0 shared/auth/routing/transport safety surfaces,
P1 direct journey/API/backend/contract surfaces, P2 strong transitive edges,
and P3 conservative fallback. Ties are stable by risk rank and journey order;
diff size is not the dominant risk signal.

## 8. Selection and negative-selection safety

Each result contains changeset ID, repo baselines, changed repos/files/statuses,
impact reasons, selected journeys, priority order, confidence, risk classes,
non-selected journeys/reasons, fallback, unresolved impact, and deterministic
digest.

- A direct isolated J1/J2 fixture selects only that journey and explicitly
  explains the other two as reviewed non-dependencies.
- Shared router/auth/layout/transport changes select all three at P0.
- A proven J3 backend/proto/parser change selects J3 without requiring a UI
  diff.
- An unknown relevant runtime path, stale map, or unresolved high-risk source
  invokes visible `UNKNOWN_FALLBACK` and selects all three.
- Zero selection is allowed only for proven docs/test/CI or an empty explicit
  committed range. Unknown runtime impact can never produce silent zero.
- Runtime/build config, package manifests, Docker/Make inputs, asset rules, and
  CSS are not suppressed as CI-only. Without a source-backed edge they fail
  safe to all three. Only `.github`/`.circleci`, documentation, and proven
  test/fixture paths receive non-runtime suppression.
- Rename/delete records preserve `previousPath` and match the base tombstone.

## 9. Historical backtests and fixtures

Durable fixtures are in `tests/fixtures/change-intelligence/representative-
changesets.json`. They cover isolated J1, isolated J2, J3 backend, shared
router, docs-only, unknown runtime, rename, and J3 contract paths.

The seven blind historical ranges and independently source-traced ground truth
are recorded in `BACKTEST_LEDGER.md`:

1. `ripple-ui 2fe4e7d4..3af97821`: shared exchange surface plus unresolved
   runtime companions — safe all-canary fallback.
2. `ripple-ui 9756da44..afaff489`: J2 client plus unresolved companions — safe
   all-canary fallback.
3. `ouchan 2ae24351..6aea1f0f`: backend-only `ListBillingGroups` — J3 true
   positive.
4. `ripple-ui 64ddee40..6c013139`: shared router/auth — all-three P0 true
   positive.
5. `ripple-ui b05ec86d..cb430dfb`: README only — correct zero selection.
6. `ripple-ui 6d425d4f..15609bbe`: runtime package manifest — visible fallback;
   ground truth remains unresolved, not falsely labeled precise.
7. `ripple-ui 34242571..0aa7e2f4`: account paths plus rename/delete tombstones
   — conservative fallback with preserved rename evidence.

Counts: 2 true-positive selections, 0 material false positives, 0 false
negatives, 4 conservative fallbacks, 1 correct non-selection, and 1 unresolved
ground-truth case. Direct isolated historical J1/J2 ranges were unavailable;
fixtures cover isolation without fabricating history.

## 10. Adversarial and shadow review

`ADVERSARIAL_REVIEW.md` records independent checks for dynamic routes/imports,
barrels/stores, API wrappers, generated clients, MFE boundaries, deleted and
renamed paths, runtime configuration, CSS, mocks, docs, tests, and duplicate
edges. The first implementation's broad CI suppression was repaired in
`8d72ec9` and regression-tested. No material load-bearing false negative or
removable false positive remains.

Current shadow command: `npm run change:shadow`.

- Changeset: `cs-a42938b70eb71fbcc1896fc9`.
- Six explicit `HEAD -> HEAD` ranges, zero committed changed files.
- 82 dirty files observed and excluded; no local dirty work was treated as
  deployed or nightly source.
- Selected: none.
- Priority: none.
- Fallback: false.
- J1/J2/J3 non-selection: explicit empty-range `NON_RUNTIME_ONLY` reasons.
- Freshness: `LOCAL_TRACKING_REF_ONLY`; deployment unresolved.
- Review class: `PHASE_3_SHADOW_SELECTION_ACCEPTED` and
  `ZERO_SELECTION_CONFIRMED`.

No DEV execution or replay was performed because the current committed window
is empty. This is explicitly permitted by the frozen SPEC. A passing selected
journey would not have proven non-selected relevance; source review/backtests
remain the completeness evidence.

## 11. Safety, privacy, and repository integrity

Phase 3 production attempts: `0`.

| Safety accounting | Result |
| --- | --- |
| Proxy violations | 0 |
| Unknown destinations | 0 |
| Unknown approvals | 0 |
| Mutations | 0 |
| Database queries | 0 |
| Action-caused UNKNOWN | 0 |

No Phase 3 authenticated context was launched. Inherited Phase 2C safety and
privacy remain unchanged. Pure selection artifacts contain no tokens, cookies,
auth state, customer names, account IDs, costs, raw bodies, DOM, screenshots,
or authenticated traces. Existing Nightwatch redaction/privacy tests remain
green.

The six Alphaus repository HEAD SHAs and status summaries after validation are
identical to the pre-existing M1 ledger; only Nightwatch was changed. No
Alphaus worktree was cleaned, overwritten, committed, or otherwise mutated.

## 12. Defects and validation

Nightwatch defects found and repaired:

1. Dirty porcelain `??` paths were initially classified as `modify`; the Git
   collector now records them as `add`.
2. Runtime/build config and CSS were initially too close to CI suppression; the
   selector now classifies only proven CI directories as non-runtime and uses
   conservative fallback for unresolved runtime/config/style changes.

No Alphaus product anomaly was inferred, and no change was attributed as a bug
root cause. The Phase 2C shared comparator defect remains documented as a
closed prior-phase defect.

Validation results:

- `npx tsc --noEmit`: PASS.
- `npx playwright test`: PASS, `291 passed`.
- Focused selector/collector/baseline/backtest command: PASS, `28 passed`.
- `npm run change:shadow`: PASS, empty shadow accepted.
- `npm run agent:check`: PASS with the expected approved-document
  `CHECKPOINT_ADVANCE` warning.
- `git diff --check`: PASS before final closure commit; rerun at closure.
- Privacy/redaction and inherited safety tests: PASS as part of the full suite.

## 13. Architecture and adversarial answers

1. Commit messages were not primary evidence: PASS.
2. Stale local source was not silently substituted: PASS; behind state is
   visible and map SHA checks fail safe.
3. Dirty work was excluded from committed selection: PASS.
4. Rename/delete dependencies were preserved: PASS.
5. The selector does not always select all three: PASS; isolated fixtures,
   J3 backend, docs-only, and empty shadow discriminate.
6. Unknown relevant impact cannot yield zero: PASS.
7. CSS/config are conservative rather than suppressed: PASS.
8. Docs/tests/CI-only changes can justify zero: PASS.
9. Diff size is secondary: PASS.
10. Confidence and risk are separate: PASS.
11. Historical ground truth was independent source tracing: PASS.
12. No historical commit hash is special-cased: PASS.
13. Backend-only changes can select J3: PASS.
14. Shared auth/router can select all: PASS.
15. Non-selected reasoning is persisted: PASS.
16. Repo baselines are explicit and reproducible: PASS.
17. Failed/blocked/not-run runs cannot advance baseline: PASS.
18. Network is not required for pure selection: PASS.
19. Selection is deterministic: PASS.
20. No Alphaus repository was modified: PASS.
21. Phase 2 safety was not weakened: PASS.
22. No bug-root-cause correlation was added: PASS.
23. No fuzzing or AI selection was added: PASS.
24. Phase 4 was not started: PASS.
25. A fresh context can resume from `STATE.md`, `PLAN.md`, the scope/map docs,
    ledger, and shadow evidence: PASS.

The architecture accepts future ranges without adding code for a specific
commit. New journeys/products can add contracts and edges without changing the
pure collector/selector core; Wave/Aqua/Octo maps remain out of scope.

## 14. Acceptance verdict and next task

Phase 3 acceptance: `PASS`.

All frozen acceptance gates are satisfied: prior closure reconciled, native
task present, six-repository source scope and freshness recorded, versioned
maps and selection implemented, negative selection explainable, unknown
fallback visible, zero-selection justified, baselines safe, historical
backtests and adversarial review complete, shadow accepted, no live execution
needed for an empty current range, safety/privacy clean, Alphaus repositories
unchanged, and full validation green.

Recommended next task only: `PHASE 4 — SEEDED / MODEL-BASED EXPLORATION`.
Do not start it as part of this closure.
