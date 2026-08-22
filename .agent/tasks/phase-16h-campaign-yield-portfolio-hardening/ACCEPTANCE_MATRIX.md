# ACCEPTANCE MATRIX — Phase 16H

Every PASS must map to a command/test executed after Phase 16A's implementation anchor or after the relevant hardening fix.

| ID | Surface | Required proof |
|---|---|---|
| A01 | Bootstrap | clean live Git; predecessor SHAs reproduced; token recorded before mutation |
| A02 | DTO strictness | malformed/missing/unknown/duplicate/unapproved portfolio inputs fail closed |
| A03 | Identity | identical normalized input -> byte-identical portfolio/plan identities |
| A04 | Input permutation | semantic score/order/allocation stable under member-order permutation |
| B01 | Stale evidence | stale source never improves rank or readiness |
| B02 | Unavailable evidence | unavailable source never improves rank or readiness |
| B03 | Duplicate pressure | increased duplicate pressure never raises novelty-derived score |
| B04 | Blocker dominance | owner/authority blocker always dominates positive scoring |
| B05 | Tie breaking | equal scores have deterministic documented ordering |
| B06 | Component bounds | every score component remains within source-defined bounds |
| C01 | Total budget | sum allocations <= total budget for all adversarial cases |
| C02 | Blocked allocation | blocked member allocation == 0 |
| C03 | Floors/caps | configured per-member floor/cap honored without violating total budget |
| C04 | Reserve | exploration reserve bounded by total budget and cannot bypass blockers |
| C05 | Starvation | starvation protection cannot bypass stale/unavailable/authority gates |
| C06 | Edge budgets | zero/one/exact-fit/oversubscribed/all-blocked/all-stale portfolios deterministic |
| C07 | Retry policy | retry ceilings/checkpoint policy bounded and coherent |
| D01 | Yield arithmetic | no NaN/Infinity/negative counts or invalid division |
| D02 | Empty yield | empty input yields explicit zero/empty semantics, never fabricated uplift |
| D03 | Duplicate-heavy yield | duplicate metrics mechanically coherent |
| D04 | Privacy | no raw customer/auth/product values in yield artifacts/digests/errors |
| D05 | Claim boundary | simulator/report never labels synthetic proxy improvement as real-world yield |
| E01 | Manifest parser | strict malformed/unknown/version-invalid manifest handling |
| E02 | Manifest coherence | ordering/budgets/reasons/currentness/owner requirements internally coherent |
| E03 | Runtime inertness | manifest existence cannot grant runtime authority |
| E04 | Identity/version | version movement load-bearing where required; unchanged normalized input stable |
| F01 | Replan unchanged | unchanged normalized source/evidence -> canonical reuse classification |
| F02 | SHA-only movement | unchanged normalized evidence does not create false novelty/replan |
| F03 | Compatible movement | compatible change follows documented reprioritize/reuse semantics |
| F04 | Breaking movement | breaking evidence invalidates/replans fail-closed |
| F05 | Derivation change | derivation-version movement cannot silently reuse stale semantics |
| F06 | Authority change | authority movement invalidates/replans before execution |
| F07 | Stale/unavailable | stale/unavailable cannot produce reusable executable plan |
| F08 | Ambiguous/provable | ambiguous/provable transitions classified deterministically |
| F09 | Registry removal | target removal from approved universe invalidates safely |
| G01 | Simulator purity | no product/network/browser authority exercised |
| G02 | Simulator determinism | >=3 identical runs byte-identical |
| G03 | Baseline errors | empty/malformed baseline fails explicitly |
| H01 | CLI inspect | deterministic sanitized success + malformed failure behavior |
| H02 | CLI explain-score | deterministic sanitized output |
| H03 | CLI plan | deterministic sanitized output |
| H04 | CLI compare-plan | stable no-drift/drift classification |
| H05 | CLI shadow-simulate | deterministic synthetic-only output |
| H06 | CLI dev-handoff | inert data-only handoff with separate token requirement |
| H07 | CLI no persistence | no unintended durable writes |
| I01 | Handoff executable flag | `executable:false` mechanically pinned |
| I02 | Handoff env restriction | DEV_ONLY_NEVER_PRODUCTION or canonical equivalent pinned |
| I03 | Handoff auth | separate runtime authorization token required |
| I04 | Handoff obligations | owner policy + containment + checkpoint/resume + no-prod obligations present |
| I05 | Handoff privacy | no credentials/auth state/raw values embedded |
| J01 | Corpus floor | >=80 deterministic Phase-16H adversarial scenario cases |
| J02 | Determinism floor | determinismMismatchCount = 0 |
| J03 | Privacy floor | privacyLeakCount = 0 |
| J04 | Currentness floor | falseCurrentCount = 0 |
| J05 | Authority floor | authorityEscapeCount = 0 |
| J06 | Allocation floor | blockedMemberBudgetCount = 0; budgetOverflowCount = 0 |
| J07 | Novelty floor | falseNoveltyIncreaseCount = 0 |
| J08 | Replan floor | invalidReplanReuseCount = 0 |
| J09 | Claim floor | realYieldClaimCount = 0 |
| J10 | Handoff floor | executableHandoffCount = 0 |
| K01 | Focused suites | all Phase-16H / Phase-16A focused tests zero failed |
| K02 | Phase 12-16 compatibility | affected compatibility zero failed |
| K03 | campaign:synthetic | PASS with raw counts |
| K04 | owner-provenance | PASS with raw counts |
| L01 | Canonical full | complete Playwright workers=1 zero failed; skips inventoried |
| L02 | Isolated full | topology-correct complete Playwright workers=1 zero failed |
| L03 | Count parity | canonical/isolated counts equal or every difference mechanically explained |
| M01 | Typecheck | PASS |
| M02 | hardening:check | PASS |
| M03 | agent:check | PASS |
| M04 | agent:audit | strict errors = 0 |
| M05 | project:check | PASS |
| M06 | Catalog | count/digest unchanged; promotion authority NONE |
| M07 | diff check | PASS |
| M08 | Safety boundary | Phase 6 frozen; 11B/13B unauthorized; no DEV/real campaign/Alphaus writes |
| N01 | Validated SHA | earned only after all local gates green |
| N02 | Actions truth | exact validated SHA run/job/steps inspected once |
| N03 | Closure | REPORT/STATE/ACTIVE_TASK truthful; HEAD==origin/main; worktree clean |

No single synthetic score improvement or shadow-simulator uplift is an acceptance proof of real bug-yield improvement.
