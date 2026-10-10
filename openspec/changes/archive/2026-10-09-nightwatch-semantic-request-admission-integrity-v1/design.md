## Context

`networkObserver` blocks exact `KNOWN_MUTATION` rules and unknown requests observed while a non-navigation journey intent is active. It explicitly continues unknown API requests during navigation or with no active intent. The journey engine clears intent after a fixed 250 ms sleep, before its later observation-settlement barrier. The CDP Fetch guard, which alone sees some redirect follow-ups, applies only hostname policy. These independent choices let an unproven product request leave the browser and let causality change merely because a callback fired later.

## Goals / Non-Goals

**Goals:** pre-effect read-only authority; exact registry/currentness binding; causal lifetime through settlement and redirects; total HTTP/WS/CDP/proxy enforcement; bounded source-proven initialization exceptions; categorical safe evidence.

**Non-Goals:** inferring safety from HTTP verbs, blocking static assets, authorizing new product operations, contacting DEV, or implementing now.

## Decisions

### Product API egress requires an immutable admission handle

An admitted handle binds environment, exact scheme/host/port, normalized method, source-proven route template, semantic rule and proof identity, source snapshot/currentness, request class, and generation. `KNOWN_READ` is admissible; mutation, unknown, stale, ambiguous, mismatched, or unbound requests are refused before effect. Concrete parameter values do not enter durable evidence.

### Initialization is an explicit finite capability

Navigation does not make unknown traffic passive. Any indispensable bootstrap request must be separately enumerated, mechanically proven read-only, provenance/currentness-bound, count/budget-limited, and scoped to one navigation generation. Unclassified startup traffic is refused, not retrospectively renamed.

### Causality ends at deterministic settlement, not a timer

Every approved action/navigation creates a unique generation. Requests inherit that generation through initiator information, redirects, frames/workers, and bounded async settlement. A delayed request cannot become passive because a fixed sleep expired. Ambiguous or cross-generation causality fails closed.

### Every transport layer consumes the same decision

The authoritative browser route produces the admission handle. CDP redirect handling and WebSocket creation require the same immutable decision or independently recompute from the same registry/currentness snapshot. L5 receives a bounded capability identity for product API requests and refuses host-only authorization when semantic binding is required. Layer disagreement is a hard containment event.

### Totality is machine checked

Hardening discovers all request-continuation, redirect, WebSocket, API relay, and proxy tunnel sites. Mutation tests remove semantic checks, shorten generation lifetime, relabel unknown traffic, stale proof, or bypass a layer; each must be detected.

## Risks / Trade-offs

- Previously tolerated bootstrap traffic can fail until its read-only proof is admitted; this is the intended fail-closed migration.
- Chromium initiator metadata may be incomplete. Ambiguity must refuse or use an explicitly bounded navigation generation, never grant ambient authority.
- HTTPS CONNECT cannot inspect inner routes, so browser-to-proxy capability binding requires an authenticated local control association rather than TLS interception.

## Migration Plan

1. Census all product egress and define handle/exemption/generation schemas.
2. Bind source-proven endpoint registry and currentness to pre-effect decisions.
3. Implement deterministic generation settlement and redirect propagation.
4. Enforce across browser/CDP/WS/proxy layers and remove passive-unknown allow.
5. Add adversarial and mutation proof; update safety truth.

## Open Questions

None. Unknown semantic state cannot be read-only authority.
