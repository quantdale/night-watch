# NIGHTWATCH PHASE 2B — THREE DETERMINISTIC READ-ONLY RIPPLE JOURNEYS COMPLETE

Status: `COMPLETE` after the Nightwatch-only documentation closure commit.
Phase 2C and all later phases were not started.

## 1–8. Baseline, freshness, inventory, and rejection

1. **Starting Nightwatch SHA:** `ec4c14376923ffbe12356dd180218eb09cf4f75f`.
2. **Final implementation SHA:** `78e5d1f049064e594f99ed7e600ecffb081d6b23`.
   This contains the Phase 2B contract/engine, semantic observer integration,
   gated serial runner, synthetic coverage, and bounded fixed-ID resume
   selector. Later commits are documentation-only continuity descendants.
3. **Final checkpoint SHA:**
   `1b6e7a5ad2d0566aca84a370caa6989e71573f57`, the cross-journey/final-review
   checkpoint immediately before closure documentation.
4. **Final clean HEAD:** the terminal Nightwatch-only closure descendant of
   the checkpoint above; verified with `git status --short` after closure.
   The exact terminal hash is reported in the final handoff message.
5. **Phase 2A reconciliation:** `a6d7c8ba` is the final validated Phase 2A
   implementation, `9bf2c459` is its validation/checkpoint commit, and
   `ec4c143` is the clean documentation terminal HEAD. Documentation-only
   descendants do not represent implementation drift. Phase 2A remains
   closed. Its auth lesson, `/ripple/` → `/ripple/dashboard` diagnosis,
   Vue `#app` pre-mount meaning, `.q-layout-container.layout` shell,
   cancellation taxonomy, historical malformed JSON status, and historical
   production-contact caveat remain preserved.
6. **Ripple source freshness:** Ripple UI was inspected at local `dev` SHA
   `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`; local `origin/dev` was
   `e46b8ed6...`, 0 ahead/21 behind, with selected files unchanged in the
   tracking ref. Ripple API was inspected at `master` SHA `27bb007...`, equal
   to its local tracking ref. No fetch, pull, checkout, reset, stash, clean,
   or source modification was performed; local source is not silently claimed
   to equal deployment.
7. **Candidate inventory:** ten candidates were recorded in `CANDIDATES.md`
   before execution. C02 payer exchange, C03 common exchange, and C04 account
   inventory were `STRONG_CANDIDATE` and selected.
8. **Rejected candidates:**

   | Candidate | Decision | Reason |
   |---|---|---|
   | C01 dashboard | `REJECT_DUPLICATE_COVERAGE` / unknown fan-out | Phase 2A already proves the shell and the dashboard boot set was not narrowly proven. |
   | C05 billing-group inventory | `USABLE_WITH_CONSTRAINTS`, not selected | Legacy/MFE feature branching and extra bootstrap reads reduce determinism. |
   | C06 Cost Drift | `REJECT_OTHER` | DEV handler is unimplemented; POST read-shaped semantics and historical malformed JSON remain unresolved. |
   | C07 invoice list/detail | `REJECT_UNKNOWN_SEMANTICS` / mutation risk | MFE/legacy siblings include calculation, finalization, adjustment, and export. |
   | C08 project inventory | `REJECT_UNKNOWN_SEMANTICS` | End-to-end GET proof was incomplete and mutation controls coexist. |
   | C09 activity/export | `REJECT_MUTATION_RISK` | Export/job persistence is never presumed read-only. |
   | C10 billing-group detail | `REJECT_MUTATION_RISK` / unknown | Mixed settings/resource tree and customer-specific detail state. |

## 9–14. Journey 1 — payer exchange-rate read

9. **Name/purpose:** `ripple-payer-exchange-read`; review payer-level exchange
   rates by vendor/month without changing settings. It is the lowest-risk,
   clearest behavioral read beyond shell readiness.
10. **Source/read-only proof:** Ripple UI router and
    `ExchangeRate_v2/PayerExchangeRate/index.vue` invoke
    `exchangeRatePayer_v2.js`'s `GET /v2/payer/exchange_rate/{month}`.
    Ripple API `Routing.yaml` maps the route to
    `ExchangeRate::getAccountExchangeForMonth`, which reads payer metadata and
    list values to assemble a response. The exact registry rule is
    `GET /m/ripple/v2/payer/exchange_rate/YYYY-MM` → `KNOWN_READ`.
    The adjacent POST maps to `saveAccountExchangeForMonth` and table updates,
    so it is `KNOWN_MUTATION`, blocked, and never triggered.
11. **Contract:** start/end route `/payer-exchange-rate-v2`; global shell
    `.q-layout-container.layout`; journey markers `.__ExchangeRate` and
    `.__ExchangeRateDataTable`; steps `payer-navigate` and
    `payer-structural-checkpoint`; required rule
    `ripple.payer-exchange.read`; no intentional UNKNOWN endpoints; navigation
    timeout 30s and structural timeout 15s; no controls, forms, details,
    exports, or mutation methods; strict route/marker/read/auth/oracle/privacy/
    safety invariants; timing, ordering, passive-unknown, and background counts
    are bounded variance.
12. **First run:**
    `nightwatch-20260812T011302Z-3ff2-j1-first` — PASS; route and shell/table
    markers true, required read observed, route stability 767 ms, oracle,
    safety, and privacy PASS.
13. **Replay:**
    `nightwatch-20260812T011302Z-3ff2-j1-replay` — PASS in a fresh browser
    context; route stability 831 ms; auth and all strict invariants matched.
14. **Variance:** comparison
    `artifacts/nightwatch-20260812T011302Z-3ff2-j1-first-comparison/` passed
    with an empty strict mismatch set. Only `route-stability-timing` and
    `passive-unknown-count` were classified as bounded variance, alongside
    expected request-count/background variance.

## 15–20. Journey 2 — common exchange-rate read

15. **Name/purpose:** `ripple-common-exchange-read`; review common-fee exchange
    rates by vendor/month without changing settings. It is distinct from payer
    scope and uses a separate v2 component/API/backend read.
16. **Source/read-only proof:** Ripple UI's
    `ExchangeRate_v2/GlobalExchangeRate/index.vue` and
    `exchangeRateGlobal.js` invoke `GET /exchange_rate/global/{vendor}`.
    Ripple API maps it to `ExchangeRate::getCommonExchangeRate`, which
    validates the vendor and reads currency/master-table data to assemble the
    response. The exact registry rule is
    `GET /m/ripple/exchange_rate/global/{aws|azure}` → `KNOWN_READ`.
    The adjacent POST maps to `setCommonExchangeRate`/`createItem`, so it is
    `KNOWN_MUTATION`, blocked, and never triggered.
17. **Contract:** start/end route `/global-exchange-rate-v2`; global shell
    `.q-layout-container.layout`; marker `.__GlobalExchangeRateDataTable`;
    steps `common-navigate` and `common-structural-checkpoint`; required rule
    `ripple.common-exchange.read`; no intentional UNKNOWN; 30s/15s timeouts;
    no vendor mutation, form, detail, export, or arbitrary script; same strict
    and bounded replay contract as Journey 1.
18. **Initial first observation:**
    `nightwatch-20260812T011302Z-3ff2-j2-first` — intentionally stopped and
    recorded as FAIL before replay. The route, shell, table, read, auth, safety,
    and privacy checkpoints passed, but one allowed DEV font response returned
    HTTP 502, producing the generic `unexpected-status` and `console-error`
    oracle categories. No production, unknown-destination, mutation, DB, or
    privacy event occurred.
19. **Bounded completion pair:** the one bounded diagnostic first observation
    `nightwatch-20260812T012232Z-2fc7-j2-first` and fresh replay
    `nightwatch-20260812T012232Z-2fc7-j2-replay` both PASS. The same contract,
    target, registry, selectors, and actions were used; route stability was
    818 ms/826 ms. No code or oracle weakening occurred, and no third replay
    was run.
20. **Variance:** comparison
    `artifacts/nightwatch-20260812T012232Z-2fc7-j2-first-comparison/` passed
    with an empty strict mismatch set. Only route-stability timing and passive-
    unknown/request-count variance were expected. The original font anomaly
    did not recur and remains the separate L0 candidate
    `PB2-J2-L0-DEV-FONT-502`, not a claimed product bug.

## 21–26. Journey 3 — account inventory

21. **Name/purpose:** `ripple-account-inventory`; review registered cloud
    accounts and billing-group/payer association. This is inventory behavior,
    not another exchange/dashboard tab.
22. **Source/read-only proof:** Ripple UI `AccountManagement.vue` fixes the
    source default vendor to AWS and dispatches the two reviewed list reads:
    `GET /m/blue/billing/v1/billinggroups` and
    `GET /m/ripple/accts?vendor=aws`. Blue billing list handling maps to
    `ListBillingGroups`/Ouchan read helpers; Ripple API maps account GET to
    `Account::getAccountVendor`, which reads/cache-assembles the response.
    The exact registry rules are `ripple.billing-groups.read` and
    `ripple.account-inventory.read`, both `KNOWN_READ`. Account POST/PUT/DELETE
    and billing-group POST are adjacent `KNOWN_MUTATION` rules and were never
    triggered.
23. **Contract:** start/end route `/accounts`; global shell
    `.q-layout-container.layout`; marker `.__CustomDataTable`; steps
    `account-navigate` and `account-structural-checkpoint`; required read rules
    `ripple.billing-groups.read` and `ripple.account-inventory.read`; no row,
    detail, vendor-change, search, form, edit, create, delete, rate, or export
    action; 30s/15s timeouts; same strict and bounded replay contract.
24. **First run:**
    `nightwatch-20260812T012634Z-3d33-j3-first` — PASS; route `/accounts`,
    shell and inventory marker true, both required reads observed, route
    stability 818 ms, oracle/safety/privacy PASS.
25. **Replay:**
    `nightwatch-20260812T012634Z-3d33-j3-replay` — PASS in a fresh browser
    context; route stability 823 ms; strict invariants matched.
26. **Variance:** comparison
    `artifacts/nightwatch-20260812T012634Z-3d33-j3-first-comparison/` passed
    with an empty strict mismatch set. Only route-stability timing and passive-
    unknown/request-count variance occurred.

## 27–35. Engine, registry, oracles, and bug candidates

27. **Journey-engine architecture:** `JourneyDefinition`, constrained
    `JourneyStep`, structural markers, semantic expectations, metadata-only
    `JourneyEvidence`, and `ReplayComparison` are shared types. The single
    `runDeclarativeJourney` executor supports approved navigation, safe
    interaction, selection, detail, and structural checkpoint action types.
    `observeOnce` is the single real boot path for both first runs and replays;
    every replay creates a new context. No `journey1.ts`/`journey2.ts`/
    `journey3.ts` duplication exists. A fourth Ripple journey is a new
    source-backed definition/registry contract plus selectors, not new runner
    logic.
28. **Semantic endpoint registry:** added an explicit, per-environment,
    exact-host registry for four approved read rules and their adjacent
    mutation rules. It is passed explicitly to the shared context; the global
    default remains empty. Unmatched API traffic stays UNKNOWN. No dynamic
    blessing or wildcard host was added.
29. **Mutation tripwire:** known mutations are rejected before network I/O;
    causal attribution is tracked by step ID/action type. Synthetic mutation
    and action-caused-UNKNOWN fixtures fail closed. All seven real contexts
    recorded `mutations=0` and `action-caused UNKNOWN=0`.
30. **Passive UNKNOWN:** unreviewed bootstrap/initialization traffic was
    recorded as `PASSIVE_UNKNOWN_OBSERVED` only. Passive counts were J1 6/7,
    original J2 6, diagnostic J2 6/10, and J3 8/7. These counts are bounded
    variance and were never dynamically approved or intentionally replayed.
31. **Action-caused UNKNOWN:** zero in every real context; no intentional
    UNKNOWN endpoint was required by any contract.
32. **Generic oracles:** successful contexts had PASS. The original J2 font
    response produced `unexpected-status` and `console-error` only; its body
    was not inspected. Synthetic tests cover status/content-type/malformed
    JSON, runtime/rejection/CSP, structural, route, cancellation, and asset
    categories with Phase 2A severity separation.
33. **Journey-specific oracles:** each pair required its approved route class,
    global shell, fixed component marker(s), required read rule set, auth
    validity, zero mutation/action-unknown status, and PASS oracle/privacy.
    No cost, account name, customer label, exact financial value, or raw row
    assertion was used.
34. **Bug candidates:** only `PB2-J2-L0-DEV-FONT-502`, reproduction level L0:
    one observation, not reproduced in the permitted diagnostic first context
    or replay. It is retained as a non-blocking anomaly candidate; no product
    bug or L1/L2 claim is made. The local telemetry containment omission was a
    Nightwatch defect found before real execution and repaired in `a2bde6a`.
35. **Historical malformed JSON:** the Phase 2A natural observation remains
    `POST https://apidev.alphaus.cloud/m/blue/cost/v1/`, HTTP 200 JSON with
    invalid JSON, classified `GENUINE_PROTOCOL_ANOMALY` with unresolved
    subcause. Cost Drift was rejected and this endpoint was not deliberately
    replayed; it did not recur in the selected journeys.

## 36–46. Auth, privacy, safety, and repairs

36. **Auth validity:** all seven real contexts passed boolean structural,
    DEV-provenance, domain/path, token applicability, and live page-readability
    checks. The external
    `$HOME/.nightwatch/auth/ripple-dev-state.json` was used only by the guarded
    workflow, never printed, copied, dumped, committed, or persisted in
    evidence. Auth expiry was not confused with product behavior.
37. **Privacy review:** 52 sanitized JSON/text files across seven real-run
    directories and three comparison directories were scanned: 0 non-safe
    forbidden-field values, 0 secret-like values, 0 trace files, and 0
    screenshots. Evidence contains fixed IDs/classes, booleans, enums, counts,
    and bounded timings only. No credentials, Authorization/cookies/tokens,
    storage-state contents, customer/account values, costs, request/response
    bodies, DOM, text, screenshots, or authenticated traces were persisted.
38–43. **Exact safety accounting:** counts are ordered
    `production attempts / proxy violations / unknown destinations /
    unknown approvals / known mutations / DB queries`. Every real run was
    `0 / 0 / 0 / 0 / 0 / 0`:

    | Real context | Counts |
    |---|---|
    | `nightwatch-20260812T011302Z-3ff2-j1-first` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T011302Z-3ff2-j1-replay` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T011302Z-3ff2-j2-first` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T012232Z-2fc7-j2-first` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T012232Z-2fc7-j2-replay` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T012634Z-3d33-j3-first` | `0 / 0 / 0 / 0 / 0 / 0` |
    | `nightwatch-20260812T012634Z-3d33-j3-replay` | `0 / 0 / 0 / 0 / 0 / 0` |
    | **Total** | **`0 / 0 / 0 / 0 / 0 / 0`** |

    Expected blocked telemetry/optional-support/browser-background traffic was
    reported separately and never counted as a safety violation.
44. **Safety events:** NONE. No production attempt, proxy violation,
    unknown destination/approval, mutation, or DB query occurred. Synthetic
    blocked cases were loopback-only regression tests.
45. **Nightwatch defects discovered:** one local exact Chromium telemetry
    containment omission was found during pre-real validation. No defect was
    found in real journey execution. The original J2 font 502 was not treated
    as a Nightwatch defect without reproduction.
46. **Nightwatch defects repaired:** `a2bde6a` added only the two reviewed
    exact local telemetry hosts; it did not widen production, API, or unknown
    host policy. `78e5d1f` added a bounded fixed-ID resume selector after the
    J2 stop so successful earlier pairs were not rerun; it changed no contract,
    endpoint, action, oracle, or safety policy.

## 47–56. Validation, review, and verdict

47. **Synthetic tests:** the focused endpoint/engine suite is **12 passed**.
    It exercises the real classifier, declarative executor, semantic observer,
    mutation tripwire, metadata recorder, privacy path, and replay comparator
    for normal reads, passive UNKNOWN, route/selector failures, mutation,
    action UNKNOWN, runtime/malformed metadata/cancellation, auth expiry and
    unreadability, production/unknown hosts, fake secrets, replay variance,
    and structural divergence. The full local suite is **251 passed**.
48. **Full Playwright:** `NIGHTWATCH_ENV=local npx playwright test
    --project=nightwatch --workers=1` — **251 passed** in 1.0m.
49. **TypeScript:** `npx tsc --noEmit` — PASS.
50. **Agent check:** `npm run agent:check` — PASS with the expected
    `CHECKPOINT_ADVANCE` warning for approved task-document descendants.
51. **Diff check:** `git diff --check` — PASS.
52. **Final architecture review:** PASS. Auth/gate/proxy/context setup,
    semantic registry, evidence writer, mutation tripwire, structural oracles,
    and replay comparator are shared. There are no policy forks or uniquely
    tuned journey timeouts. A fourth journey is configuration/contract work
    plus source proof, not bespoke runner work.
53. **Final adversarial self-review:** PASS. No hidden mutation, intentional
    UNKNOWN, method-only POST classification, customer-specific selector,
    stale-auth misdiagnosis, reused replay context, ignored strict divergence,
    post-failure timeout weakening, new destination, privacy leak, Alphaus
    modification, or Phase 2C leakage was found. The three journeys are
    materially different, tests exercise real code, bug confidence is
    conservative, and the durable state has an exact resume recipe.
54. **Remaining non-blocking findings:** the single L0 non-reproduced DEV font
    502; passive UNKNOWN bootstrap traffic; the recorded local source/deploy
    freshness caveat; and the historical unresolved malformed-JSON anomaly.
    Existing dirty entries in Ripple/API/Ouchan were pre-existing and were
    preserved exactly.
55. **Phase 2B acceptance verdict:** PASS. Exactly three source-backed
    semantically read-only customer journeys have durable contracts, reusable
    execution/replay infrastructure, synthetic coverage, successful fresh
    replay pairs, zero real safety/data-plane/privacy violations, and complete
    local validation. The J2 initial transient oracle stop is preserved as L0
    evidence; its single bounded diagnostic pair passed without weakening the
    contract. Nightwatch is clean and recoverable after the closure commit.
56. **Recommended next task only:** Phase 2C is the next planned task, but it
    was not started here. No next task was created or activated.

## Closure boundary

Only Nightwatch was modified. Ripple UI, Ripple API, and Ouchan were inspected
read-only; their pre-existing worktree changes remain untouched. The external
auth state remains outside Git. No datastore queries, production traffic,
mutations, exports, fuzzing, random exploration, AI planning, authenticated
traces, or later-phase functionality were introduced.
