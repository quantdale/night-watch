## Why

The network observer starts `response.body()` and races that promise against a timeout. Losing the race does not cancel or join the body read, so the observer can report timeout while an unowned response acquisition remains alive. Its one-million-character limit is applied only after Playwright has materialized the complete `Buffer`; it is not an acquisition bound. Large, compressed, chunked, or stalled responses can therefore consume memory or retain background work beyond the declared observation budget and potentially past journey/context teardown.

The existing recorder correctly classifies many downstream capture failures as incomplete, but classification after unbounded acquisition does not enforce containment.

## What Changes

- Enforce body byte/time/work budgets before and during acquisition rather than after full buffering.
- Preflight trustworthy content length while treating missing, compressed, inconsistent, and chunked lengths as untrusted.
- Give every body acquisition an owner, cancellation/abort path, terminal join, and context-generation identity.
- Make journey/context settlement wait for terminal acquisition cleanup or fail closed and destroy the owning context.
- Record categorical incomplete evidence without retaining raw body data or error text.
- Add oversized, compressed expansion, chunked, never-ending, late-resolution, cancellation-race, and teardown tests.

## Capabilities

### New Capabilities

- `browser-response-acquisition-integrity`: Defines bounded streaming/capture, cancellation ownership, teardown joining, and safe incomplete evidence for response bodies.

### Modified Capabilities

None.

## Impact

- Affects `src/browser/{networkObserver,responseCapture,pageObserver,documentLifecycle}.ts` and contained synthetic browser fixtures.
- Does not contact an external target or expand browser authority.
