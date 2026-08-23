# Phase 20 Acceptance Matrix

| ID | Capability | Required evidence | Status |
|---|---|---|---|
| A01 | Deterministic discovery inventory | Versioned DTO, bounded ordering, provenance, proof/rejection states | PASS — 22 synthetic candidates, deterministic ordering/digest, 21 mechanically provable and 1 explicit rejection |
| A02 | Expanded mechanical analyzers | Precise source patterns, exact rejection reasons, unknown-syntax fail-closed tests | PASS — fixed PHP + TypeScript/JavaScript + Go + OpenAPI analyzers; focused Phase 20 cone green |
| A03 | Relational contracts | Versioned bounded relational vocabulary and source-proof validation | PASS — 13 admitted source-backed relation contracts with aggregate, count, set, presence, ordering, pagination, normalization, identity, and mapping coverage |
| A04 | Contract graph | Deterministic source→evidence→contract→expectation→surface→scenario→oracle→replay→minimizer→dossier graph | PASS — versioned graph nodes/edges/gap ranking with lifecycle focused tests |
| A05 | Cross-surface differential | Explicit equivalence contracts and all outcome classes | PASS — explicit browser/API equivalence with exact, semantic, expected-difference, violation, not-applicable, stale, incompatible, authority, and internal outcomes |
| A06 | Metamorphic semantics | Versioned provenance-backed relations and seeded violations/benign controls | PASS — seven bounded relation kinds with deterministic holds/violation/benign controls |
| A07 | Phase 19 coverage integration | Gap ranking and campaign composition use the existing coverage/planner authority | PASS — semantic gap reasons augment `buildCampaignCoverageReport`/`buildCampaignPlan`; no competing selector |
| A08 | Synthetic generation | Contract-derived bounded fixtures and mutants, no fuzzing | PASS — 33 bounded mutants plus baseline/benign controls across source contracts, relations, differential pairs, and metamorphic relations |
| A09 | Mutation measurement | Generated/applicable/detected/survived/replay/minimized/high-confidence metrics | PASS — 33 generated / 30 applicable / 30 detected / 0 surviving / 0 benign false positives; replay, minimized, and high-confidence detections 30 each |
| A10 | Drift/re-derivation | Affected-only invalidation and semantic-change classification | PASS — exact evidence/SHA comparison and removal/semantic re-derivation tests |
| A11 | Projection depth/privacy | New safe derived properties and adversarial privacy tests | PASS — bounded type/presence/cardinality/order/set/relation features; hostile field/prototype and sentinel tests |
| A12 | Synthetic product model | Multi-surface shared/divergent/relational/pagination corpus | PASS — synthetic-only browser/API/replay surfaces with shared/divergent contracts, grouping, filtering, totals, pagination, drift, duplicate/flaky classes |
| A13 | Campaign auto-composition | Deterministic bounded plans with authority/currentness gates | PASS — `campaign` preview composes graph gaps, coverage facts, mutations, and Phase 19 plan with frozen owner scope |
| A14 | Dossier/operator depth | Contract chain, violation relation, gap/mutation/replay/minimality evidence | PASS — dossier v4 plus local `contracts`, `gaps`, `plan`, `coverage`, `campaign`, and `explain` views |
| A15 | Adversarial corpus | Substantially beyond Phase 19 with zero benign/privacy regressions | PASS — 88 data-driven cases across 15 families; benign controls 6; privacy/benign floors zero |
| A16 | Scaling protections | Source-keyed bounded caches and invalidation tests | PASS — bounded 16-entry inventory/graph caches; exact-source hit and changed-source miss tests |
| A17 | Compatibility and safety | Phase 9–19 cone, typecheck, hardening, continuity, project, canonical/isolated parity | PENDING |

No acceptance row may close with a TODO placeholder.
