## Why

Nightwatch claims that unknown or mutation-capable product operations cannot be deliberately executed, but the browser gate currently allows every request to an allowlisted API host unless an exact rule already labels it `KNOWN_MUTATION` or the request begins inside a short non-navigation action-intent window. An unclassified request emitted during navigation/startup is allowed as `PASSIVE_UNKNOWN_OBSERVED`; a request emitted after the fixed 250 ms action window receives the same passive label even when an approved action scheduled it. Redirect follow-ups that bypass the Playwright route are checked only by host at the CDP backstop. The current distinction therefore describes observation timing, not pre-effect read-only authority.

## What Changes

- Make source/provenance-bound request admission—not post-hoc semantic labeling—the prerequisite for product API egress.
- Replace ambient short-lived intent with a request-generation/causal capability that remains active through bounded settlement and redirect chains.
- Refuse `UNKNOWN`, stale, unmatched, method-drifted, redirect-expanded, and late action-caused API requests before network I/O unless an exact separately reviewed initialization exemption proves read-only behavior.
- Bind the browser route, CDP redirect backstop, WebSocket path, and L5 proxy to the same admission handle so a lower layer cannot downgrade semantic refusal to host-only allow.
- Add adversarial delayed-request, redirect, navigation-startup, concurrent-action, stale-registry, and mutation/non-vacuity tests.

## Capabilities

### New Capabilities

- semantic-request-admission-integrity: Defines pre-effect semantic egress authority, bounded initialization exemptions, causal request generations, cross-layer enforcement, and non-vacuous validation.

### Modified Capabilities

None.

## Impact

- Affects endpoint semantics, journey intent/settlement, browser HTTP/CDP/WebSocket guards, proxy request capabilities, real-run preflight, hardening rules, and safety tests.
- Preserves host/address containment and the approved read journeys while removing timing-based passive authority.
- Creates no implementation, real request, credential use, Alphaus access, or owner-policy expansion in this planning change.
