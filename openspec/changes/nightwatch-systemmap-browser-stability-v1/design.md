# Design — C-15c browser spec stale-UI race hardening

## Root cause

The System Map view fetches each disclosure level asynchronously; the
`map-authority` footer and breadcrumb crumbs commit before (or
independent of) the member list. Two journey steps pressed arrow keys
gated only on level-identical signals:

- 6d pressed three ArrowDowns gated on the `Product: ripple` crumb. After
  the query-clearing Escapes trigger an L2 refetch, the crumb is instant
  but members may still load; arrows then move nowhere and the service
  heading never appears.
- 6e pressed ArrowRight gated on `map-authority`, whose text is identical
  across levels and views. After drilling L3→L4, the press can be
  processed against the pre-drill L3 member list (256 sorted nodes):
  `at(op-0)=0 → next=op-1`. Selection then points outside the L4 view,
  the detail panel stays empty, and the consumer heading can never
  appear. Fiber-probe evidence: `selectedNodeId: "op:op-1"` with trail
  `l4:op:op-0` and L4 data ready.

## Why test-only

Unit suites prove the projection emits the consumer node; L4 traffic
logs prove the server answers correctly in every run; the selection
model degrades gracefully (empty detail, wrap-around). The product is
sound — the test acted early.

## Change shape

Two additive Playwright assertions (+ comments) in the one spec file.
The L4 gate uses level-specific signals only: the op-0 breadcrumb crumb
(proves navigation committed) and the consumer member button (proves the
exact right data committed). No timeouts changed, no skips, no force
flags changed.
