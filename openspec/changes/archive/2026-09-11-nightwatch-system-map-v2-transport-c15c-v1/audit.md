# Audit — C-15c

Read-only at `0b62247c512b960715348b637ac99bf68a9f3b49`. No environment was
contacted: production 0, NEXT 0, DEV 0.

## Preconditions

| Condition | State |
|---|---|
| C-15b COMPLETE | yes, closed at `cdfe9d7` |
| R-12 COMPLETE | yes, CI run `33784345028` |
| C-05 COMPLETE | yes, CI run `33796281169` |
| C-08 COMPLETE | yes, CI run `33801673312` |
| C-09 COMPLETE | yes, CI run `33806627149` |
| C-16 COMPLETE | yes, CI run `33811693944` |
| C-07 COMPLETE | yes, CI run `33817429249` |

## What C-15b left in place

The model, the bounded projections and the layered layout exist and are
deterministic. They had no transport, and the Control Center UI had no view
that consumed them.

## Measured, before any transport was written

1,851 operations. `operationPopulationTotal` is `null` — the true population is
unknown, and every bound derived from it inherits that unknowability.

L1 renders 1 node and 0 edges inside a 64/128 bound. The layout digest is
identical across repeated calls. Both authority fields read `NONE`.

## The prod-store question

The map is built from source facts. `OBSERVED_PRODUCTION_PATHS` is empty and
`UNMEASURED` precisely because no production observation exists to draw on.
C-10's production-store exclusion is therefore not merely unbroken by this
change — it is visible in the output as an absence the UI is required to name.
