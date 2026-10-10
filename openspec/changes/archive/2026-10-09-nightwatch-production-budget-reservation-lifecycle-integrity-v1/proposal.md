## Why

The production run gate reserves request/concurrency budget at `G_BUDGET_RESERVATION` before later circuit-breaker and final kill-switch decisions. When either later gate denies, or grant consumption loses a race, the function returns without settling the reservation. With a concurrency limit of one, one pre-dispatch denial can leave the ledger permanently full. Conversely, `ProductionBudgetLedger.settle` does not authenticate the reservation object or enforce a one-way lifecycle: fabricated, foreign, or repeated settlement can decrement generic in-flight state and charge outcomes against the wrong request.

This code is currently exercised only through local/mock qualification and production execution is not authorized, but the retained production authority path cannot safely distinguish quota admission, dispatch, cancellation, and completion.

## What Changes

- Mint exact ledger-bound reservation capabilities and track them through a closed lifecycle.
- Separate request-quota charging from concurrency occupancy and define the policy for every pre-dispatch denial.
- Make the final kill-switch/grant-consumption/dispatch transition atomic from the ledger's perspective.
- Require exactly-once settlement of the matching dispatched reservation; reject copied, foreign, fabricated, cancelled, or repeated tokens without mutation.
- Add denial-after-reservation, grant race, double-settlement, foreign-token, exception, and concurrency recovery tests.

## Capabilities

### New Capabilities

- `production-budget-reservation-lifecycle-integrity`: Defines authenticated reservations, explicit pre-dispatch release, atomic dispatch admission, and exactly-once outcome settlement.

### Modified Capabilities

None.

## Impact

- Affects `src/core/prodObserve/{productionRunGate,productionBudgetLedger,productionObserver}.ts` and their qualification fixtures.
- Preserves deny-by-default production policy and does not authorize a production run.
