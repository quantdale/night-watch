## Why

The canonical shard runner currently derives execution counts from human
Playwright text. Nullable counts are summed with JavaScript arithmetic, so an
all-skipped shard can exit zero, report `PASS`, and turn unknown values into
zero totals. A normal mixed pass/skip run must remain valid, but the runner
needs a machine-readable execution authority before release evidence can trust
its result.

## What Changes

- Add a bounded, atomic per-shard execution receipt produced by a dedicated
  Playwright reporter.
- Add a strict receipt schema/parser/classifier that preserves unknown state
  and rejects zero-executed, all-skipped, malformed, or internally
  inconsistent receipts.
- Make `run-shards.mjs` use the receipt for pass/fail and count reporting;
  retain human text only for diagnostics.
- Add focused normal/all-skipped/zero-test/unknown/mutation coverage.

## Capabilities

### New Capabilities

- `shard-certification-integrity`: Defines machine-readable shard execution
  accounting and fail-closed result classification.

### Modified Capabilities

None.

## Impact

- Affected code: `bin/run-shards.mjs`, a bounded Playwright reporter, pure
  validation receipt code, and focused shard tests.
- No product runtime, network, credential, data, or external authority changes.
