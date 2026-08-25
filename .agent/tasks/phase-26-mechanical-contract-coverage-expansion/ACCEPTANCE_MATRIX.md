# Phase 26 Acceptance Matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| A01 | main topology at start and finish | Start and terminal Git checks: branch `main`, upstream `origin/main`, synchronized clean tree | PASS |
| A02 | fresh approved-source proof-gap census | Six-repository scan: 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected | PASS |
| A03 | response extraction uplift | Response contracts 25 → 62; lifecycle `DISCOVERED` 103 → 66 | PASS |
| A04 | semantic extraction uplift | Semantic observations 25 → 138 through existing vocabulary; no new behavior class | PASS |
| A05 | invalid and ambiguous analyzer controls | 28 Phase26 focused tests and 16-case data-driven adversarial matrix | PASS |
| A06 | exact joins fail closed | 128 attempted / 118 proven / 10 rejected; no fuzzy helper resolution | PASS |
| A07 | currentness and dirty same-SHA safety | Phase25 currentness/cache tests plus Phase26 relevant invalidation tests | PASS |
| A08 | deterministic graph/proof identity | Repeatability, evidence-digest, graph, and descriptor determinism tests | PASS |
| A09 | drift/invalidation completeness | Relevant response/semantic change invalidates dependent replay/dossier; unrelated file stays stable | PASS |
| A10 | Phase24 sole candidate authority | Existing Phase24 portfolio: 3 eligible / 125 excluded; no parallel planner | PASS |
| A11 | lifecycle/runtime separation | Final lifecycle 66/59/3 and explicit runtime/source review states | PASS |
| A12 | safe operator proof-gap explanations | Review v2 rows expose bounded proof gaps, analyzers, and missing proof only | PASS |
| A13 | no raw source/private persistence | Privacy/adversarial tests and diff audit; raw-source count 0 | PASS |
| A14 | cache identity completeness | Cache key includes content/snapshot, config, extractor, and real-source analyzer-set identity | PASS |
| A15 | repeatability | Stable source-surface digest `source-surface-discovery:sha256:68ec78c9e1d85faca36e52ce` | PASS |
| A16 | source-to-triage synthetic campaign | `npm run campaign:synthetic`: 30 passed | PASS |
| A17 | zero known false-positive admissions | Direct/alias/branch negative controls; 28 focused tests, zero known false positives | PASS |
| A18 | typecheck | `npm run typecheck` | PASS |
| A19 | hardening | `npm run hardening:check` | PASS |
| A20 | compatibility / inventory | Compatibility 1,874 total / 1,873 passed / 1 skipped / 0 failed; inventory 146 unique / 0 duplicates | PASS |
| A21 | synthetic campaign | `npm run campaign:synthetic`: 30 passed | PASS |
| A22 | owner provenance | `npm run test:owner-provenance`: 91 passed | PASS |
| A23 | continuity and project truth | `agent:check` strict errors 0; `agent:audit` strict errors 0; `project:check` PASS | PASS |
| A24 | clean Node20 qualification | Clean receipt `clean-receipt:sha256:3119a0ff4ebcfdf0903f0a`; clean before/after; sibling writes 0 | PASS |
| A25 | canonical full regression | 2,435 enumerated / 2,431 passed / 4 skipped / 0 failed | PASS |
| A26 | topology-correct isolated full regression | Detached clone plus six detached sibling checkouts: 2,435 / 2,431 / 4 / 0 | PASS |
| A27 | exact canonical/isolated parity | Exact enumeration and four skip identities matched | PASS |
| A28 | exact-head Actions observation | Run `32783079546`, job `97609144140`, exact head, zero steps, `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` | PASS |
| A29 | prohibited-operation counts remain zero | DEV/NEXT/prod/auth/product/data/infra/writes/publication/raw-private/AI all 0 | PASS |
| A30 | final report/task closure and synchronized main | REPORT, HANDOFF, PLAN, STATE, ACTIVE_TASK, durable docs, final pushed closure | PASS |
