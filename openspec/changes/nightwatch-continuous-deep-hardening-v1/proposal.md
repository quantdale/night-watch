## Why

Post-acceptance hardening proved truth reconciliation and single-run reliability, but deferred the deep lifecycle work that proves autonomous stability: repeated-run resource leaks, cache staleness, containment after code changes, and deterministic recovery from interruption.

## What Changes

- Soak 3× synthetic with fd/tmp/cache/artifact snapshots
- Cache 12-case matrix (same/changed SHA/content, dep, analyzer, interrupted/malformed/duplicate/stale)
- L6 requalification via `l6Containment` plus manual proxy checks
- Replay/resume chaos 8-case via fault injection
- Auth 9-case via storageState fixtures
- Fuzz/property ≥20 cases for parsers/canonicalizers
- Dead-code delete, deps audit, `gate:clean` Node20, isolated parity, final DEV requalification

## Capabilities

### New Capabilities

- `continuous-deep-hardening`: Soak, cache, chaos, auth, fuzz deep hardening beyond prior post-acceptance

### Modified Capabilities

- `post-acceptance-hardening`: Prior deferred items now implemented
