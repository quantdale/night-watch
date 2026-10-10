## Why

The Phase-5 relay listens on a random loopback port and validates a source operation ID in both URL and `X-Nightwatch-Operation-Id`. That header is not a secret or per-instance capability: it is copied from the generated scenario and catalog. Any local process able to discover the port can invoke any generation-eligible known-read operation while the relay is alive; each request reacquires DEV authorization headers and can repeat or race the authenticated read without a total/session/per-operation execution budget. The observations map overwrites by operation ID, so repeated calls also erase cardinality/history.

L6 bounds the contained child relay channel to eight calls, but the Phase-5 parent loopback listener itself has no caller binding or shared budget. Existing tests prove method/header/query/operation semantics but do not test an ungranted local caller, token replay, concurrent duplicate calls, budget exhaustion, or exact observation cardinality.

## What Changes

- Issue an opaque, per-relay invocation capability bound to relay instance, approved scenario/process/session, exact operation, source/catalog/environment/auth generations, expiry, and budget.
- Require atomic capability consumption before credential acquisition or upstream work; the public operation ID remains descriptive, not authority.
- Enforce total, per-operation, concurrency, and response-settlement bounds across every relay entry path, including L6/manual/native adapters.
- Preserve an append-only bounded invocation ledger so repeated/racing requests cannot overwrite observation truth.
- Revoke capabilities and drain/cancel bounded in-flight work on close, auth/source/instance drift, or safety/evidence failure.
- Add local-process adversarial tests for discovery, forgery/replay, races, exhaustion, close, and mutation without real network contact.

## Capabilities

### New Capabilities

- `phase5-relay-invocation-authority`: Defines exact caller/operation capability, atomic budget consumption, invocation-ledger truth, revocation/close semantics, and local adversarial proof for Phase-5 relay execution.

### Modified Capabilities

None.

## Impact

- Affects `src/api/phase5/{relay,generator,restrictedProfile,types}.ts`, L6/OOPS/manual callers, campaign integration, and Phase-5 tests.
- Preserves known-read, destination, redirect, body-elision, deadline, and owner policies; no new operation becomes executable.
- Complements semantic request admission and L6 qualification. It owns who may invoke a live relay and how many effects one authority grants.
- Implementation proof uses loopback synthetic fetchers only and grants no DEV/production contact.
