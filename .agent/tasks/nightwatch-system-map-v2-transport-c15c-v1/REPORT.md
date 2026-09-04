# REPORT — C-15c System Map V2 HTTP Transport + Complete Operator UI

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Phase: SYSTEM_MAP_V2_TRANSPORT_C15C_V1
Status: COMPLETE
Starting SHA: `0b62247c512b960715348b637ac99bf68a9f3b49`
Substantive implementation anchor: `82e3a49da77e5e0d8b451697bad58f9af5aaa4e5`
Live HEAD authority: GIT

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | V2 routes parse; v1 untouched | PASS | Router truth table in `tests/unit/c15cSystemMapTransport.test.ts`; `/api/v1/source/graph` routes unaffected; exact route segments |
| 2 | Unknown level/query rejected | PASS | `l5` and `/query/made-up` parse to `unknown` and return 404; no nearest-match guessing |
| 3 | Traversal and unsafe focus rejected | PASS | `../etc` and non-safe IDs rejected with `CONTROL_CENTER_PATH_REJECTED` |
| 4 | Focus discipline enforced | PASS | L1 with focus returns null (404); L2/L3/L4 without focus returns null (404) |
| 5 | GET/HEAD only; mutating verbs refused | PASS | Only GET/HEAD dispatched; POST/PUT/PATCH/DELETE structurally forbidden and tested in case 4 |
| 6 | Both authorities NONE everywhere | PASS | Every level and query response carries `executionAuthority: 'NONE'` and `mutationAuthority: 'NONE'` |
| 7 | ProjectionBound survives with nulls intact | PASS | Case 16 asserts `MUTATION_CAPABLE_ROUTES` has `total: null`, `dropped: null`, `remainingUnknown: true`; no coercion |
| 8 | UI renders unknown bounds as "unknown" | PASS | UI displays `1000 shown / unknown total` and `remainder unknown`; zero is never fabricated |
| 9 | UNMEASURED labelled as unmeasured | PASS | `OBSERVED_PRODUCTION_PATHS` renders warning banner distinguishing unmeasured absence from clean result |
| 10 | Full operator navigation | PASS | Browser matrix in `tests/browser/systemMapV2.browser.ts` tests L1→L2 drill, escape back, breadcrumb return, 8 queries, pan/zoom, keyboard drive |
| 11 | Deterministic server layout | PASS | Layout digest and graph digest identical across repeated calls; positions on every node |
| 12 | C-10 prod-store exclusion preserved | PASS | System Map has zero access to production findings storage; structurally checked by hardening |
| 13 | Suite registered in both manifests | PASS | Registered in `config/campaign-certification.v1.json` and `config/synthetic-campaign.v1.json`; 27 unit tests pass |
| 14 | Scale and performance measured | PASS | Test 27 measures full transport pipeline at 1,000 nodes / 2,000 edges executing in <5s and serializing in <1s |
| 15 | Quality gates green; siblingWrites 0 | PASS | `gate:local` PASS (`receipt:sha256:4e6b059312e2281785e38400`), `gate:clean` PASS (`clean-receipt:sha256:6c14424bbbeb876dbd3c6d95`), siblingWrites 0 |

## Outcome

Campaign C-15c delivers the complete V2 HTTP transport and Control Center operator UI for System Map V2.
All progressive disclosure levels (L1–L4) and all eight operator queries are exposed over read-only HTTP endpoints under `/api/v2/system-map/`.
The UI requests only the active disclosure level, eliminating whole-company browser cache leaks.
Null bounds and unmeasured states remain honest across the wire and in the UI.
All 27 transport unit tests, 2 browser tests, synthetic campaign (916/916), semantic compatibility (2,033/2,020/13/0), and full local and clean checkout quality gates pass with zero failures and zero sibling writes.
