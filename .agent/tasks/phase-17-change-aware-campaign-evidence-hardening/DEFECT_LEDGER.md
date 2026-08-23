# Phase 17 Defect Ledger

| ID | Reproducer | Root cause | Repair | Status |
| --- | --- | --- | --- | --- |
| DEF-17-01 | ChangeSet/ChangedFile property-order permutation | change-intelligence identity uses ordinary `JSON.stringify` | use canonical stable serialization for change identity/correlation and omit undefined optional fields | REPAIRED |
| DEF-17-02 | Malformed baseline JSON accepted by `readBaseline` | JSON parse is cast directly to `BaselineState` | strict versioned baseline parser with safe categorical errors, canonical order, and reference consistency | REPAIRED |
| DEF-17-03 | Duplicate hostile string passed to `assertUniqueStrings` | error concatenates the rejected value verbatim | bounded safe diagnostic projection with identity/URL redaction | REPAIRED |
| DEF-17-04 | Repeated action ID in minimization survivor | evidence reconstruction matches string sequences without occurrence identity | fail closed on ambiguous deletion evidence; preserve historical result bytes | REPAIRED |
| DEF-17-05 | Required parser field inherited from a hostile prototype | `assertExactKeys` used `in` for required-field presence | require own required properties before trusting a runtime document | REPAIRED |
| DEF-17-06 | Legitimate account-named target rejected by privacy boundary | identity detector treated every `account-...` token as an account identifier | require identifier-shaped value after identity label; preserve route vocabulary and add regression | REPAIRED |
| GAP-17-01 | Change selector and portfolio allocator are not connected | portfolio score has no source-selection overlay | pure source-impact overlay and reusable change-aware allocation | CLOSED |

Historical Phase 16CH DEF-01/DEF-02 remain closed in their original ledger;
this ledger records only new Phase 17 work.
