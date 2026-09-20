## Context

Inbound relay admission checks GET, empty query/body, a catalog operation path, and a matching public operation-ID header. These establish request shape and semantic eligibility but not caller authority. The listener is loopback rather than a permissioned Unix socket, and the generated OOPS profile necessarily reveals the operation label. Each accepted request may call `authHeaders()` and the upstream fetcher. Observations are stored in `Map<operationId, RelayObservation>`, so later calls replace earlier evidence.

## Goals / Non-Goals

**Goals:** exact live-relay caller authority; atomic effect budgets; single/replay semantics; append-only invocation truth; revocation and close settlement; parity across callers; privacy-safe errors and synthetic adversarial proof.

**Non-Goals:** change the API catalog, permit mutations/unknown operations, expose upstream bodies, broaden environments, replace L6, or execute real DEV operations during implementation.

## Decisions

### Treat operation ID as identity, not authority

Relay start mints an unpredictable instance generation and an opaque invocation-capability issuer scoped to the admitted controller. A capability binds instance, caller/process or namespace/control-channel identity, exact operation, source/catalog/environment/auth generation, issue/expiry, and an explicit call budget. It is transferred to the intended adapter through a permissioned channel and never persisted or logged.

The HTTP request carries a one-use invocation proof derived from that capability. A plain operation header, guessed token, wrong caller/channel, wrong instance/operation, expired/revoked proof, or replay is rejected before `authHeaders`, target resolution, DNS, fetcher, or other upstream effect.

### Consume authority atomically before effects

Validation and budget reservation are one serialized state transition. Per-operation, per-scenario, total, concurrent, redirect, and response-settlement bounds are checked before effect. A reserved invocation reaches exactly one terminal state. Failed credential acquisition or transport still consumes the attempt unless a narrowly defined pre-effect cancellation can be proven; ambiguity never refunds authority.

### Preserve every attempt in a bounded ledger

The relay records an ordered invocation ledger keyed by immutable invocation identity, not a last-value map. It includes safe categorical admission/outcome, operation ID, budget state, redirect/oracle class, and evidence completeness. Capacity is checked before accepting another capability. Readers can select an expected invocation but cannot lose duplicates or races.

### Revoke and close deterministically

Relay close stops admission, revokes unused proofs, waits for or aborts bounded in-flight work, seals the ledger, and then closes the listener. Auth/source/catalog/environment/instance or containment drift revokes authority immediately. A late callback cannot consume or record against a closed generation.

## Risks / Trade-offs

- Passing opaque proof into a contained child needs a narrow channel; reuse the L6 permissioned control pattern rather than environment/log/file publication.
- One-use proof can complicate OOPS retries; retries must be explicitly budgeted and receive distinct invocation identities.
- Loopback remains transport, not trust. Unsupported secure caller binding fails closed.

## Migration Plan

1. Add relay generation/capability/budget/ledger schemas and a pure state model.
2. Bind start/close and synthetic/native callers; then bind restricted OOPS through its permissioned control channel.
3. Move auth/target/upstream work behind atomic consumption and replace last-value observations.
4. Add local sibling-process/race/replay/close/fault/mutation suites.
5. Run Phase-5/L6/campaign local gates and update architecture/safety truth.

Rollback disables authenticated relay use rather than restoring public operation-ID authority.

## Open Questions

None. Exact transport mechanics may differ for native and L6 callers, but both require the same minted invocation authority and shared budget ledger.
