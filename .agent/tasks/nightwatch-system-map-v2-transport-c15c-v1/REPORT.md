# REPORT — C-15c System Map V2 HTTP Transport + Complete Operator UI

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Status: IN_PROGRESS

## Requirement ledger

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | V2 routes parse; v1 untouched | MET | Router truth table in STATE.md |
| 2 | Unknown level/query rejected | MET | `l5` → unknown; `/query/made-up` → unknown |
| 3 | Traversal and unsafe focus rejected | MET | `../etc` rejected; `CONTROL_CENTER_PATH_REJECTED` on unsafe focus |
| 4 | Focus discipline | MET | L1+focus → null; L2/L3/L4 without focus → null |
| 5 | GET/HEAD only | PENDING | M5 suite |
| 6 | Both authorities NONE everywhere | PARTIAL | Verified at L1; full sweep in M5 |
| 7 | ProjectionBound survives with nulls intact | MET | `MUTATION_CAPABLE_ROUTES` bound in SPEC.md |
| 8 | UI renders unknown as "unknown" | IMPLEMENTED | `BoundNote`; test in M5 |
| 9 | UNMEASURED labelled as unmeasured | IMPLEMENTED | measurement banner; test in M5 |
| 10 | Full operator navigation | IMPLEMENTED | `SystemMapView`; browser matrix in M6 |
| 11 | Deterministic layout | MET | repeated-call digest equality |
| 12 | C-10 prod-store exclusion preserved | PENDING | M7 |
| 13 | Suite registered in both manifests | PENDING | M5 |

## Outcome

Not yet complete. This section is written at closure, from measurement.
