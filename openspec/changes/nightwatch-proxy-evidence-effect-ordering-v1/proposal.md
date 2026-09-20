## Why

The mandatory outer proxy starts an allowed upstream effect before it durably appends the corresponding evidence. HTTP requests are piped before `record()` completes, CONNECT sends success and joins both sockets before recording, and Upgrade writes the upstream handshake and starts piping before recording. If the append fails, the proxy disables later work, but the current request may already have reached its destination without durable evidence.

The existing event-log failure test uses a host that destination policy denies, so its zero-connection result does not prove evidence-before-effect ordering for an allowed destination. This is distinct from proxy runtime instance attestation: instance attestation proves which proxy is alive, while this change proves that each admitted effect has a durable, correctly ordered audit record.

## What Changes

- Introduce a versioned per-request evidence transaction with durable `PREPARED`, terminal `COMMITTED` or `ABORTED`, and crash-visible `INCOMPLETE` interpretation.
- Require successful preparation, validation, durability, and correlation before DNS resolution, upstream socket creation, CONNECT success, Upgrade response forwarding, or request-body piping.
- Complete or abort the exact prepared record after the effect outcome without erasing ambiguous/crash-interrupted attempts.
- Apply the same protocol to HTTP, CONNECT, and Upgrade paths, including concurrent requests and bounded-log exhaustion.
- Add injected allowed-destination append/fsync/transition failures that assert zero upstream connections when preparation fails and truthful incomplete evidence when a post-effect transition cannot finish.

## Capabilities

### New Capabilities

- `proxy-evidence-effect-ordering`: Defines the durable request journal, pre-effect preparation barrier, outcome transitions, crash semantics, transport symmetry, privacy bounds, and adversarial proof for proxy evidence.

### Modified Capabilities

None.

## Impact

- Affects `src/proxy/{server,events,types}.ts`, proxy startup/runtime integration, record readers, run evidence synchronization, and proxy tests.
- Depends on the private per-instance event generation planned by `nightwatch-proxy-runtime-instance-attestation-v1`, but does not duplicate live-instance identity or health attestation.
- Preserves existing destination, resolution, binding, and owner-scope policy; it grants no new request authority.
- No external target, authenticated browser, cloud/data operation, or production contact is authorized for implementation proof.
