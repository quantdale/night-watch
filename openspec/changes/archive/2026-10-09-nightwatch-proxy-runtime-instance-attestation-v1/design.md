## Context

`ProxyRuntimeState` contains a loopback address/port, environment, four static contract versions, and an event-log path. `readProxyRuntimeState` validates those self-asserted fields. `checkProxyHealth` then sends `GET /__nightwatch_health` and accepts status 204; the server returns 204 for that path without a challenge. No runtime field binds the state file to a port-lease token, process/start identity, server-generated nonce, or event-log generation. Static policy versions prevent an old schema from passing, but do not prove that the listener answering the port is the Nightwatch instance that wrote the state.

An accidental stale file plus port reuse can therefore yield false readiness. A same-user process that can replace scratch state can deliberately point authenticated Chromium at a permissive local forwarder. Because Chromium sends all configured proxy traffic through that listener, static state validation is not a containment proof.

## Goals / Non-Goals

**Goals:** exact per-start identity; state/lease/process/event coherence; active challenge response; revocation; safe state publication; final launch and ongoing liveness binding; deterministic local adversarial proof.

**Non-Goals:** TLS interception, authenticating remote clients, defending against root/kernel compromise, changing destination policy, replacing L6, or running a real browser target during implementation proof.

## Decisions

### Generate one instance identity inside the server startup transaction

After acquiring the port lease and before state publication, generate a high-entropy instance ID and bind it to lease token digest, listener address/port, process ID plus process-start observation, environment, policy identities, event-log generation, and startup instant. Raw lease tokens are never persisted in evidence. The server receives this identity directly, not by rereading a mutable state file.

Alternative rejected: rely on PID alone; PID reuse and stale state defeat it. Alternative rejected: add another static version field; it proves code/schema, not liveness or instance equality.

### Use a nonce challenge, not a constant status

Health requests carry a fresh bounded nonce and expected instance ID over the loopback connection. The server returns a strict signed/MACed or capability-bound response covering nonce, instance, environment, and policy identities. The verifier checks exact keys/lengths, freshness, and response bytes. Keys/capabilities live only in owner-only runtime control state/environment and are never forwarded to Chromium, evidence, or child processes that do not need health authority.

This does not claim protection from root. Against accidental/stale listeners it is decisive; against the repository's same-user scratch threat it requires owner-only no-follow files plus minimal capability distribution.

### Treat runtime control files as a transaction

Create the event log and state in an owner-only runtime directory allocated without following links. Use exclusive creation, descriptor-based validation, fsync, atomic rename/pointer publication, and directory sync. State includes the exact event-log identity. Existing state is never truncated/followed blindly; startup either proves and removes a stale owned generation or refuses.

### Bind both admission and observation

`requireProxyRuntime` returns an attested instance handle, not plain parsed JSON. Browser launch/configuration, real-run gate, recorder, and liveness polling retain the same handle. Any process exit, health mismatch, state replacement, event-log replacement, lease loss, or instance change records a hard containment failure and stops the run. A newly started proxy requires a new admission; it cannot inherit the old handle.

### Keep the health surface local and non-oracular

Malformed, missing, or replayed challenges receive a uniform local refusal. Responses contain no raw path, lease token, process environment, addresses beyond the already-local endpoint, or customer/auth data. Health attempts never invoke DNS/upstream connections or append ordinary request evidence.

## Risks / Trade-offs

- [Capability distribution adds secret-like local state] → use a dedicated short-lived health capability, owner-only storage, redaction sentinels, and pass it only to verifier processes.
- [Cross-process Playwright setup/workers complicate ownership] → make handoff explicit and exact, validate lease/instance on adoption, and revoke at global teardown.
- [Runtime file recovery can delete another live suite's control state] → generation/lease ownership and liveness must be proven before cleanup; ambiguity refuses.
- [Frequent challenge checks add small overhead] → use a bounded loopback message with existing poll cadence and no upstream I/O.

## Migration Plan

1. Add strict instance/state/health schemas and local fake-service tests while retaining old startup behind a failing compatibility test.
2. Make server startup own lease, control directory, event log, listener, instance identity, and state publication as one transaction.
3. Convert global setup/direct capture and all readers to attested handles; reject legacy state.
4. Bind recorder/liveness/cleanup, add process-crash and concurrent-suite recovery.
5. Run synthetic containment qualification, full gates, and document the new runtime identity.

Rollback stops all runs and removes only proven-owned new control generations; legacy unauthenticated health is not an allowed fallback.

## Open Questions

None. The exact MAC primitive may use standard-library crypto, but a constant/echo-only response is insufficient if mutable state can supply both expected and observed values.
