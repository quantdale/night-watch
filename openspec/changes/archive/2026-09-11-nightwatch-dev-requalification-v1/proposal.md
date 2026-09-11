## Why

The prior reliability campaign could not measure a fresh real-DEV rate because
the owner-managed authentication state had expired. Authentication has now
been refreshed through the guarded human-led capture path, so Nightwatch can
close that evidence gap with a bounded, serial, read-only requalification
without reopening the completed hardening task.

## What Changes

- Create a successor task dedicated to fresh real-DEV requalification evidence.
- Run the approved Phase 2C, Phase 4, Phase 5, campaign, and replay paths
  serially within existing safety and owner scope boundaries.
- Preserve every sanitized outcome category, including clean, replay
  divergence, product variation, auth, environment, and framework results.
- Report an actual reliability rate only from completed observations; retries
  remain separate observations and never relabel an earlier divergence.
- Reconcile any new product anomaly or Nightwatch defect into the existing
  private evidence and defect protocols.

## Capabilities

### New Capabilities

- `bounded-dev-requalification`: bounded owner-authorized DEV observation,
  replay, and sanitized evidence accounting.

### Modified Capabilities

- None.

## Impact

- Affects only Nightwatch task continuity records, private owner-local runtime
  evidence, and the existing guarded DEV read-only launchers.
- No Alphaus sibling repository, product data, infrastructure, production
  environment, or external publication is modified.
- No application API or persisted repository implementation contract changes
  are planned unless a concrete Nightwatch defect is discovered and separately
  regression-covered.
