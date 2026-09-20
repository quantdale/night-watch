## Context

The proxy event writer appends newline-delimited evidence and throws on failure. The server catches that failure, marks evidence unhealthy, and rejects future requests. For an allowed current request, however, side effects start first: HTTP calls `request.pipe(upstreamRequest)`, CONNECT acknowledges and couples sockets, and Upgrade forwards the handshake/couples sockets before awaiting `record()`. A write, validation, or storage failure can therefore produce unrecorded current traffic.

The existing failure regression exercises `example.invalid`. Destination policy denies that hostname before any connection, so the test cannot distinguish correct evidence ordering from ordinary policy rejection. The durable claim that evidence failure is fail-closed is consequently stronger than the test and implementation.

## Goals / Non-Goals

**Goals:** make preparation evidence a mandatory precondition of every upstream effect; preserve crash ambiguity honestly; bind outcomes to exact requests; keep all transport paths symmetrical; prove the ordering with allowed local synthetic destinations; retain bounded and privacy-safe evidence.

**Non-Goals:** redesign destination policy, promise that every remote response byte is durably logged before delivery, provide distributed exactly-once semantics, protect against kernel/root compromise, or run a real target during implementation validation.

## Decisions

### Use a per-request state machine, not a best-effort append

Each admitted request receives a monotonically ordered, instance-bound correlation identity and a bounded privacy-safe preparation record. Its state is one of `PREPARED`, `COMMITTED`, or `ABORTED`. A preparation that lacks a verified terminal transition at read/recovery time is interpreted as `INCOMPLETE`; it is never omitted, rewritten as success, or treated as proof that no effect occurred.

The correlation identity binds proxy instance generation, request sequence, transport kind, safe method class, destination-policy identity, resolution/binding identities when available, and sanitized decision metadata. It does not include raw URL paths, query values, headers, bodies, cookies, credentials, or customer data.

### Make durable preparation the effect barrier

The proxy validates, appends, flushes, and confirms the `PREPARED` record before invoking any resolver, opening any upstream socket, sending CONNECT 200, forwarding an Upgrade handshake, or piping request bytes. A preparation failure categorically refuses the current request and leaves upstream connection count at zero.

Where a destination decision requires resolution, the protocol uses bounded stages: an initial intent preparation precedes resolution, and a durable decision amendment precedes the socket effect. Both stages share one correlation identity. The reader rejects missing, duplicated, reordered, or contradictory stages.

Alternative rejected: append after starting the upstream request and rely on immediate failure handling. It cannot retract bytes already sent. Alternative rejected: buffer only application bodies. CONNECT and Upgrade can create effects without an HTTP request body.

### Preserve outcome uncertainty after an effect

After the effect completes or fails, the proxy writes a terminal transition and flushes it. If that transition fails, the runtime stops new work and the prepared entry remains visibly `INCOMPLETE`. Recovery and reporting classify this as containment/evidence failure requiring owner review; they do not infer `COMMITTED`, `ABORTED`, or a clean run.

Terminal transitions are append-only and single-assignment. Duplicate, conflicting, unknown, or out-of-order transitions fail closed. Storage exhaustion and bounded-log limits are checked before accepting new preparations.

### Share one protocol across HTTP, CONNECT, and Upgrade

One transport-neutral coordinator owns sequencing and durability. Transport handlers may add bounded type-specific outcome fields, but cannot bypass preparation or independently claim success. Concurrent requests receive unique ordered correlations; durability acknowledgements cannot be borrowed between requests.

### Integrate with instance attestation without conflating concerns

The journal lives in the owner-only, symlink-safe event generation specified by proxy runtime instance attestation. Its header and each correlation bind the exact attested instance. Instance replacement revokes the journal generation. This change still owns the per-effect state machine and ordering proof; a healthy attested listener alone is not evidence that a request was durably prepared.

## Risks / Trade-offs

- [Durability before each effect adds latency] → batch only when every included preparation has an unambiguous durable acknowledgement before its own effect; measure local overhead and keep safety semantics invariant.
- [Crash recovery cannot know whether a prepared effect occurred] → preserve `INCOMPLETE` as a hard non-clean result instead of guessing.
- [Resolution itself may be considered an observable network effect] → preparation precedes resolver invocation; decision amendment precedes destination socket creation.
- [Journal growth can exhaust local storage] → enforce explicit size/count limits before admission and refuse new work on insufficient capacity.
- [Concurrent completion order differs from admission order] → correlate terminal records by immutable request identity while preserving a monotonic preparation sequence.

## Migration Plan

1. Add the journal schema, strict parser, injected durable-writer abstraction, and crash/replay model using local files only.
2. Add a shared request coordinator and migrate HTTP, CONNECT, and Upgrade paths individually behind tests that fail on any pre-record effect.
3. Bind the journal to the attested private proxy instance generation and update evidence consumers to surface `INCOMPLETE` categorically.
4. Add injected preparation/flush/terminal failures, concurrency, recovery, bounded-storage, mutation, and privacy tests.
5. Run focused proxy/containment suites and full required gates, then update durable safety and architecture truth.

Rollback refuses to start a proxy whose evidence schema is unsupported; it never falls back to post-effect best-effort recording.

## Open Questions

None. The concrete local durability primitive may be an fsynced append log or an equivalently proven append-only journal, but effect-before-preparation is not an acceptable optimization.
