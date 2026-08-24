# Phase 25 Report

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Status: IN_PROGRESS
Repository: `quantdale/night-watch`
Branch: `main`
Starting SHA: `7beb18689cf2cd50d1d5383b34f51c2789cd0a54`
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Interim handoff

Phase 25 is active. M0 bootstrap and the prerequisite defect audit are
complete. The next durable unit is M1 source-boundary and Git currentness
hardening. Final implementation, metrics, tests, CI observation, and safety
counts will be recorded at terminal closure.

## M1 checkpoint evidence

M1 hardened `src/core/source/siblingSource.ts` so approved source reads use
structural containment, component-by-component symlink rejection,
`O_NOFOLLOW`, regular-file checks, and bounded reads. Git currentness now
supports exact loose refs, exact packed refs, detached HEAD, and safe in-root
`.git` indirection; malformed, ambiguous, symlinked, or unsafe shapes fail
closed.

Validation: the Phase 25 source-boundary matrix passed 7/7; the Phase 23
quality-gate compatibility tests plus Phase 25 matrix passed 13/13;
`npm run typecheck`, `npm run hardening:check`, and
`npm run quality-gate:spec` passed; `git diff --check` passed. Phase 25 was
registered in the authoritative semantic compatibility range 9–25.

## Safety

At bootstrap: DEV 0, NEXT 0, production 0, auth-state reads 0, product
mutations 0, database/datastore/cloud/infra operations 0, Alphaus writes 0,
publications/messages 0, raw private persistence 0, AI calls 0.
