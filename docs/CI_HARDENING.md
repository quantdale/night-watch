# Private CI boundary

Nightwatch's private GitHub workflow is a thin, read-only executor of the
versioned `nightwatch.quality-gate.v1` definition. It grants only
`contents: read`, checks out the full history on `ubuntu-latest`, installs
Node 20 dependencies with `npm ci --ignore-scripts`, and invokes exactly
`npm run gate:ci`. It does not carry a phase-by-phase test matrix.

The fixed serial runner is shared by `gate:local`, `gate:ci`, and the
disposable `gate:clean` path. Its required groups cover gate-definition
integrity, static/type checks, hardening, project truth, agent continuity,
the Phase 9–23 compatibility cone, owner provenance, the synthetic campaign,
and patch integrity. It emits bounded
`nightwatch.quality-gate-receipt.v1` data containing safe counts, digests,
group results, and exact source identity, never raw logs or environment data.

`bin/hardening-check.mjs` mechanically proves workflow/gate parity. It rejects
gate bypass or partial replacement, direct Playwright commands in the
workflow, authenticated product execution, DEV/NEXT/production references,
datastore or infrastructure operations, private evidence uploads, and
permission broadening. The external observer classifies a required Actions
run with `steps=[]` as
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, never as a test failure and never as
pre-DEV authority. A local or clean green result cannot substitute for an
executed green run at the exact acceptance head.

The workflow intentionally does not prove authenticated browser behavior,
storage-state validity, real DEV or NEXT target behavior, production behavior,
infrastructure or datastore behavior, private finding retention, or owner-only
local filesystem permissions. Those remain local synthetic/static checks and
owner-controlled operations. The only possible real product operation is the
single separately authorized, serial DEV launcher after the exact-head
pre-DEV receipt reaches `READY_FOR_DEV`; CI itself never contacts a product.
