## Why

The proxy writes a configured raw event log before the recorder's later
sanitized projection. The event type is compile-time constrained but the raw
writer has no closed runtime key/value firewall, and the authenticated writer
census does not claim `src/proxy/events.ts`. A future JavaScript caller could
persist unknown fields before the recorder sees them.

## What Changes

- Validate exact ProxyEvent shape and bounds before every raw append.
- Initialize/append the runtime log with owner-only permissions and durability.
- Register and discover the raw proxy writer in the census.
- Add synthetic unknown-field, enum, control-character, and mutation tests.

## Capabilities

### New Capabilities

- `proxy-event-firewall-integrity`: Defines raw proxy event persistence
  validation, privacy-safe ownership, and census coverage.

### Modified Capabilities

None.

## Impact

- Affected code: `src/proxy/events.ts`, `bin/lib/authenticatedWriterCensus.mjs`,
  focused tests, and continuity/OpenSpec records.
- Local/synthetic only; no external target or authenticated run.
