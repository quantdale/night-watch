# Phase 25 Acceptance Matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| A01 | main topology synchronized at start/finish | Git records | IN_PROGRESS |
| A02 | no traversal/symlink escape | source-boundary matrix: 7 passed | PASS |
| A03 | exact supported Git HEAD shapes; unsafe forms fail closed | Git-shape matrix: 7 passed | PASS |
| A04 | bounded scan paths/files/bytes/languages | inventory suite: 10 passed | PASS |
| A05 | deterministic inventory | repeated exact scans byte-identical | PASS |
| A06 | existing analyzers reused | integration/hardening | NOT_STARTED |
| A07 | proof soundness incl. TS ranges | analyzer matrix | NOT_STARTED |
| A08 | route/operation descriptors | route corpus | NOT_STARTED |
| A09 | request/response contract identities | contract corpus | NOT_STARTED |
| A10 | exact cross-file joins | join corpus | NOT_STARTED |
| A11 | evidence-backed read-only classification | mutation corpus | NOT_STARTED |
| A12 | source evidence graph lineage | graph tests | NOT_STARTED |
| A13 | shape-aware drift | drift matrix | NOT_STARTED |
| A14 | incremental invalidation | ledger tests | NOT_STARTED |
| A15 | direct Phase 24 integration | bridge tests | NOT_STARTED |
| A16 | runtime-bound/source-only/ambiguous states | correlation tests | NOT_STARTED |
| A17 | semantic lifecycle projection | coverage tests | NOT_STARTED |
| A18 | explainable deterministic priority | review tests | NOT_STARTED |
| A19 | local JSON/human operator UX | CLI tests | NOT_STARTED |
| A20 | no raw-source/privacy leakage | sentinel suite | NOT_STARTED |
| A21 | broad adversarial corpus | corpus inventory | NOT_STARTED |
| A22 | content-aware cache misses | cache tests | NOT_STARTED |
| A23 | offline source-to-portfolio E2E | synthetic campaign | NOT_STARTED |
| A24 | Phase 9–25 compatibility | semantic compat | NOT_STARTED |
| A25 | no duplicate authoritative tests | gate inventory | NOT_STARTED |
| A26 | typecheck | `npm run typecheck`: PASS | PASS |
| A27 | hardening | `npm run hardening:check`: PASS | PASS |
| A28 | synthetic campaign | `npm run campaign:synthetic` | NOT_STARTED |
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
