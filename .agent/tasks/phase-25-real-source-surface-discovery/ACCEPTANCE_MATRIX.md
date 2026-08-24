# Phase 25 Acceptance Matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| A01 | main topology synchronized at start/finish | start `7beb186`; current local/remote continuity head `3e69c85`; main only | PASS |
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
| A24 | Phase 9–25 compatibility | clean receipt: 1,847 total, 1,846 passed, 1 canonical skip, 0 failed, 135 files | PASS |
| A25 | no duplicate authoritative tests | gate inventory: 141 unique files, 0 duplicate executions | PASS |
| A26 | typecheck | `npm run typecheck`: PASS | PASS |
| A27 | hardening | `npm run hardening:check`: PASS | PASS |
| A28 | synthetic campaign | `npm run campaign:synthetic`: 29 passed, 0 failed | PASS |
| A29 | owner provenance | `npm run test:owner-provenance`: 91 passed, 0 failed | PASS |
| A30 | agent continuity | `npm run agent:check`: 0 strict v2 errors at synchronized closure | PASS |
| A31 | project truth | `npm run project:check`: PASS at synchronized closure | PASS |
| A32 | clean Node 20 gate | `npm run gate:clean`: `clean-receipt:sha256:2d3290a0bb2a62b9c8c469b3`, gate `receipt:sha256:ffe8578b987391306d863d96`, clean before/after, sibling writes 0 | PASS |
| A33 | canonical full regression | 2,407 enumerated / 2,403 passed / 4 skipped / 0 failed | PASS |
| A34 | isolated full regression | topology-correct clone: 2,407 / 2,403 / 4 / 0 | PASS |
| A35 | exact parity | exact four skip identities matched | PASS |
| A36 | one exact-head Actions observation | run `32741057138`, job `97475353760`, zero steps, `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` | PASS |
| A37 | prohibited-operation counts zero | local/source campaign safety ledger; all prohibited counts remain zero | PASS |
| A38 | clean synchronized main | final main-only closure requires `HEAD == origin/main` and clean tree | PASS |
