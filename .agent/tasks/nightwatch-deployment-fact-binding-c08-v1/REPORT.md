# C-08 Deployment-Fact Binding — Report

- Starting SHA: `43cff07af2fe2c943ca62154ad01f185602a41d9`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Task objective: give every source operation an explicit deployment-binding
  classification, so that not knowing where something runs is a recorded fact
  naming the missing hop rather than an absent field.
- Safety events: NONE
- Remaining blockers: none for C-08; C-08b is blocked on organizational access.
- Recommended next phase/task: C-09 spec-derived expectations.

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Every operation carries a deployment-binding record | NOT_STARTED | — |
| 2 | No silent absence; totality enforced by regression | NOT_STARTED | — |
| 3 | Every `DEPLOYMENT_FACT` traces to deployment evidence; forbidden bases probed | NOT_STARTED | — |
| 4 | U-1 and U-2 explicit UNKNOWNs with their blocker, never inferred | NOT_STARTED | — |
| 5 | Evidence identity complete; changed artifact yields STALE | NOT_STARTED | — |
| 6 | C-03 topology consumed, not rewritten | NOT_STARTED | — |
| 7 | No execution or request authority, proven by probe | NOT_STARTED | — |
| 8 | Zero runtime contact | NOT_STARTED | — |
| 9 | Regression, local, clean and exact-head CI green; siblingWrites 0; released | NOT_STARTED | — |

## Defects

None recorded yet.

Status: IN_PROGRESS
