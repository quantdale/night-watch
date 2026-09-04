# Proposal — C-15c browser spec stale-UI race hardening

Add two member-readiness gates to `tests/browser/systemMapV2.browser.ts`
so keyboard navigation never acts on a stale committed render:

1. Step 6d: wait for L2 members (`services/ripple` node button) after the
   query-clearing Escapes, before the three ArrowDowns.
2. Step 6e: after drilling into the operation, wait for L4-op-0-specific
   UI (the `Operation: GET /v1/op-0` breadcrumb crumb AND the consumer
   member button) before the ArrowRight that selects the consumer.

No product-code change. No assertion removed or relaxed. The gates codify
the test's own existing pattern ("arrows need members, not crumbs").
