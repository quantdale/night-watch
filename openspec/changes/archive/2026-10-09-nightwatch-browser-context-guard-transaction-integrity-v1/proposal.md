## Why

`createNightwatchContext` creates a BrowserContext and page before a long sequence of fallible setup steps: tracing, manifest/proxy recording, bootstrap scripts, route/WebSocket policy installation, observers, and the per-page CDP Fetch guard. There is no enclosing rollback transaction, so failure after context creation can leave a context, page, listener, trace, or proxy-health interval alive. New pages are also exposed immediately while their Fetch guard is installed through an unawaited promise whose rejection is not converted to a hard failure.

The context-wide route policy reduces the immediate egress risk, but it does not prove the stronger lifecycle contract that no usable page exists before every mandatory guard is ready and that partial construction leaves zero live resources. Existing tests cover URL validation before `newContext` and successful setup; they do not inject failure at each construction stage or race a popup/navigation against guard installation.

## What Changes

- Make browser/context construction an explicit staged transaction with a reverse-order rollback ledger from the first created resource.
- Withhold usable page/context authority until all mandatory containment, observer, trace-policy, proxy, and per-page guard stages attest ready.
- Introduce per-page admission for popups and new pages: pause or close them until the page guard is ready, and fail the run on installation failure.
- Own and deterministically remove listeners, timers, traces, sessions, and in-flight health work on rollback and close; make close idempotent and await settlement.
- Add stage-by-stage failure injection, popup/navigation races, disconnect/close races, and zero-resource-leak assertions.

## Capabilities

### New Capabilities

- `browser-context-guard-transaction-integrity`: Defines atomic browser-context startup, per-page readiness admission, deterministic teardown, lifecycle-failure truth, and adversarial resource-leak proof.

### Modified Capabilities

None.

## Impact

- Affects `src/browser/context.ts`, Fetch-guard installation, observer registration, browser lifecycle integration, and focused browser/context tests.
- Complements proxy instance attestation and L6 containment; it does not replace their identity or network guarantees.
- Preserves the existing environment, destination, read-only, credential, and owner-scope policies.
- Implementation proof remains local/synthetic and grants no DEV, production, cloud, datastore, or external-publication authority.
