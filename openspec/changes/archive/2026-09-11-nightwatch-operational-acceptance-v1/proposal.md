## Why

Nightwatch's previous campaign certified local/synthetic/clean-checkout
implementation. That is not operational acceptance. The owner still needs a
truthful answer: does the current system perform its intended real-world
workflow against the approved DEV target?

## What Changes

- Clean Git topology to one canonical clone and one `main` branch locally and
  remotely.
- Reclassify project completion so historical
  `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` remains a local-clean record and
  cannot be projected as operational completion while acceptance is pending.
- Execute the existing serial DEV launchers and owner workflow without
  weakening safety.
- Record one of four operational verdicts with sanitized evidence.

## Capabilities

### New Capabilities

- `operational-acceptance`: Distinct operational-acceptance statuses, DEV
  owner-workflow evidence, and fail-closed pairing with active-task status.

### Modified Capabilities

- `final-release-certification`: Historical local-clean complete remains
  valid as a COMPLETE-only local/synthetic record and is no longer treated as
  the current finished-project projection while operational acceptance is
  pending.
