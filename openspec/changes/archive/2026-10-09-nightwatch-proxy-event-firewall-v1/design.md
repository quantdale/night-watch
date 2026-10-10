## Context

`ProxyEvent` is structurally typed, but `appendProxyEvent` serializes the
runtime value directly. The proxy server writes before `RunRecorder` projects
a sanitized subset, so the raw log needs its own closed boundary. The current
writer census only discovers recorder/artifact-root paths.

## Goals / Non-Goals

**Goals:** exact runtime schema, bounded safe values, owner-only durable raw
append, explicit writer census coverage, and unchanged summary reads.

**Non-Goals:** proxy policy/resolver redesign, full run-evidence journaling, or
external traffic.

## Decisions

### Reject unknown raw fields

Use an exact key allowlist and validate required/optional fields, enums,
numeric bounds, timestamps, and control-character-free bounded strings. Throw a
categorical `PROXY_EVENT_SCHEMA_INVALID` before opening/writing.

### Treat the log as a distinct proxy writer

Register `src/proxy/events.ts` as `PROXY_EVENT_WRITER`; teach discovery to
recognize `logPath` writes. Do not claim it is an authenticated run bundle.

### Preserve reader compatibility

Accepted events retain the existing ProxyEvent shape and summary projection;
malformed historical lines remain ignored by the fail-closed reader.

## Risks / Trade-offs

Exact validation may reject previously tolerated malformed runtime values,
which is intentional. Owner-only initialization can affect test fixtures that
expect default modes; update them to assert the stronger contract.

## Migration Plan

1. Add failing validator/census tests.
2. Implement schema/owner-only append and registry discovery.
3. Run mutation probes and required gates.
4. Record residual broader evidence architecture separately.

## Open Questions

None.
