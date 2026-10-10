## Why

Authenticated browser startup trusts proxy runtime-state fields read from disk and a health request that accepts any HTTP 204 response on the recorded loopback port. The state does not identify a live proxy instance or its owning lease/process, so a stale file and a reused/impersonated loopback listener can satisfy preflight while traffic is routed through something that never enforced Nightwatch policy.

## What Changes

- Add a versioned per-start proxy instance identity bound to the owned port lease, runtime state, health protocol, event log, environment, policy versions, and live process.
- Replace the unauthenticated constant-204 probe with a bounded challenge/response whose exact instance facts are checked by every preflight and liveness poll.
- Publish runtime state and event-log endpoints through owner-only, symlink-safe, crash-consistent files; stale state is quarantined or refused, never silently trusted.
- Bind browser configuration and `RunRecorder` event consumption to the same attested instance, including process death/restart and state/event-log substitution.
- Add fake loopback service, stale port reuse, state swap, lease mismatch, crash, concurrent suite, and privacy/mutation tests.

## Capabilities

### New Capabilities

- `proxy-runtime-instance-attestation`: Defines exact live-instance identity, health challenge semantics, lease/process/state/event binding, safe publication, revocation, and adversarial validation for the mandatory outer proxy.

### Modified Capabilities

None.

## Impact

- Affects `src/proxy/{server,runtime,types,portLease,events}.ts`, `tests/globalSetup.ts`, direct auth proxy startup, real-run gates, browser context liveness, run recording, and proxy tests.
- Preserves hostname/resolved-address/exact-binding policy semantics; this change proves the running server is the instance that owns those identities.
- No external network, authenticated target, privileged firewall, production contact, or broader proxy authority is introduced.
