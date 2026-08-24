# Phase 25 Acceptance Matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| A01 | main topology synchronized at start/finish | Git records | IN_PROGRESS |
| A02 | no traversal/symlink escape | source-boundary matrix: 7 passed | PASS |
| A03 | exact supported Git HEAD shapes; unsafe forms fail closed | Git-shape matrix: 7 passed | PASS |
| A04 | bounded scan paths/files/bytes/languages | inventory suite: 10 passed | PASS |
| A05 | deterministic inventory | repeated exact scans byte-identical | PASS |
| A06 | existing analyzers reused | Phase20 cone + surface adapter | PASS |
| A07 | proof soundness incl. TS ranges | 19-test analyzer cone | PASS |
| A08 | route/operation descriptors | 2-test static route/source-only matrix | PASS |
| A09 | request/response contract identities | 3-test handler/schema contract matrix | PASS |
| A10 | exact cross-file joins | exact/missing/multiple join matrix | PASS |
| A11 | evidence-backed read-only classification | static GET/POST mutation matrix | PASS |
| A12 | source evidence graph lineage | additive graph nodes/edges + determinism test | PASS |
| A13 | shape-aware drift | Phase20+25 drift matrix | PASS |
| A14 | incremental invalidation | 2-snapshot source report + Phase24 ledger tests; unrelated file remains CURRENT and relevant same-SHA evidence invalidates replay/dossier | PASS |
| A15 | direct Phase 24 integration | surface-to-Phase24 eligibility matrix | PASS |
| A16 | runtime-bound/source-only/ambiguous states | runtime/source correlation matrix | PASS |
| A17 | semantic lifecycle projection | explicit descriptor lifecycle and lifecycle-count report | PASS |
| A18 | explainable deterministic priority | Phase25 review queue factors + Phase24 rank/score preservation | PASS |
| A19 | local JSON/human operator UX | source operator command surface + environment rejection test | PASS |
| A20 | no raw-source/privacy leakage | privacy rejection and persisted-DTO sentinel assertions | PASS |
| A21 | broad adversarial corpus | route-family/duplicate/dynamic/privacy/unsupported matrix | PASS |
| A22 | content-aware cache misses | dirty same-SHA/config/analyzer key and bounded eviction matrix | PASS |
| A23 | offline source-to-portfolio E2E | Phase25 synthetic campaign 29/29 | PASS |
| A24 | Phase 9–25 compatibility | first post-change attempt: 1,844 passed, 1 canonical skip, 2 dirty-tree selfdev failures; clean rerun pending | IN_PROGRESS |
| A25 | no duplicate authoritative tests | gate inventory: 141 unique files, 0 duplicate executions | PASS |
| A26 | typecheck | `npm run typecheck`: PASS | PASS |
| A27 | hardening | `npm run hardening:check`: PASS | PASS |
| A28 | synthetic campaign | `npm run campaign:synthetic`: 29 passed, 0 failed | PASS |
| A29 | owner provenance | `npm run test:owner-provenance` | NOT_STARTED |
| A30 | agent continuity | `npm run agent:check` | NOT_STARTED |
| A31 | project truth | `npm run project:check` | NOT_STARTED |
| A32 | clean Node 20 gate | `npm run gate:clean` | NOT_STARTED |
| A33 | canonical full regression | fresh run | NOT_STARTED |
| A34 | isolated full regression | topology-correct run | NOT_STARTED |
| A35 | exact parity | enumeration/skip identity | NOT_STARTED |
| A36 | one exact-head Actions observation | external record | NOT_STARTED |
| A37 | prohibited-operation counts zero | safety report | IN_PROGRESS |
| A38 | clean synchronized main | Git closure | NOT_STARTED |
