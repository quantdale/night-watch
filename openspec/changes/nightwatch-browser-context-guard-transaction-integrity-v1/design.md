## Context

Context creation currently crosses the resource boundary at `browser.newContext()` and `context.newPage()`, then performs multiple awaited and synchronous setup operations. Any later throw escapes without closing what was already created. A proxy poll interval starts before network and Fetch guards finish. The `context.on('page')` callback installs a new page's Fetch guard with `void installFetchGuard(...)`; it neither gates navigation nor handles rejection. Normal `close()` clears the interval but does not await an in-flight health check or remove every owned listener.

## Goals / Non-Goals

**Goals:** all-or-nothing startup; no usable page before mandatory guard readiness; exact ownership and cleanup of every acquired resource; fail-closed popup admission; idempotent settled close; categorical lifecycle evidence; deterministic fault proof.

**Non-Goals:** redesign outbound policy, proxy attestation, L6, semantic admission, Playwright itself, or authorize real browsing.

## Decisions

### Represent startup as a monotonic transaction

Construction advances through bounded stages such as `CONTEXT_CREATED`, `INITIAL_PAGE_CREATED`, `POLICY_BOOTSTRAPPED`, `CONTEXT_GUARDS_READY`, `INITIAL_PAGE_GUARD_READY`, `OBSERVERS_READY`, and `READY`. Each acquisition registers an idempotent compensator before the next fallible step. A thrown, timed-out, disconnected, or canceled stage enters `ROLLING_BACK`; callers receive no context/page handle unless `READY` is durably represented in memory.

Rollback executes in reverse dependency order, aggregates only categorical cleanup failures, closes pages/context, stops tracing without publishing an authenticated trace, detaches listeners/sessions, clears timers, and waits for bounded in-flight work. A cleanup defect produces an explicit non-clean result rather than being swallowed.

### Gate every page generation

The context page event is not treated as authorization. Each page receives a generation identity and starts in `PENDING_GUARDS`. Navigation/effect authority remains paused until the exact page's CDP Fetch guard and mandatory observers attest ready. Failure or timeout closes that page, records one hard failure through an already-safe channel, and revokes the whole context where guard coverage cannot be proven.

The initial page uses the same admission path as popups. This removes the special case in which initial setup is awaited but later pages are fire-and-forget.

### Separate expected teardown from unexpected lifecycle loss

The coordinator owns one lifecycle state. Expected rollback/close suppresses false `CONTEXT_CLOSED`/`PAGE_CLOSED` alarms, while any disconnect or close before an admitted terminal transition records exactly one unexpected lifecycle failure. Concurrent close calls join one promise and never double-stop tracing or double-close resources.

### Make timer and listener ownership explicit

Intervals, event callbacks, CDP sessions, guard promises, and health checks are registered in an ownership table. Close first prevents new work, then cancels/settles owned work, synchronizes final proxy evidence, and releases browser resources. A late health result cannot record into a closed recorder or resurrect readiness.

## Risks / Trade-offs

- Pausing new pages may require a Playwright/CDP primitive that varies by browser; unsupported runtimes must refuse rather than briefly expose an unguarded page.
- Rollback can itself fail; bounded aggregation and an explicit incomplete-cleanup status preserve truth.
- More lifecycle coordination adds complexity; one state machine and common page-admission path avoid split ownership.

## Migration Plan

1. Add a pure lifecycle model, resource registry, safe categorical errors, and injected stage seams.
2. Move context construction behind the transaction and migrate the initial page.
3. Add the common page-admission barrier for popups/new pages.
4. Make close/rollback share one settled teardown path and update callers.
5. Add stage faults, popup races, listener/timer/session census, and mutation proof; then run required local gates.

Rollback never restores fire-and-forget page guards. An unsupported guard-admission primitive is a startup refusal.

## Open Questions

None. The exact pause mechanism is implementation-selected, but a page must not be usable or navigate before its mandatory guard is ready.
