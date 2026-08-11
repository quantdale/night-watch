# Active Task

Task ID: phase-2a-controlled-observation
Phase: 2A
Title: First Controlled Authenticated Ripple Dev/Next Observation
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2a-controlled-observation
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 4763108645871e6aabe908dba3ec142443ffa95e
Last validated implementation SHA: 47937abb9134e0fbfb5a3e0e224d3e10cc8337eb
Current milestone: M7 — First controlled authenticated landing observation (BLOCKED)
Last checkpoint: 2026-08-11 (resume) — auth replay classified INEFFECTIVE; prior
"product routing" conclusion refuted.

The resume session drove the routing/auth ambiguity to an evidence-backed
conclusion:

- **Phase A** — Nightwatch's prior `requiredTokenPresent` / `requiredTokenNonEmpty`
  / `aggregateSemanticValidity=VALID` are context-only: they read the external
  storage-state FILE (`inspectStorageStateKeySemantics`/`Presence`), not the
  browser page. Verdict `AUTH_DIAGNOSTIC_CONTEXT_ONLY`.
- **Phase D** — real capture `mo_access_token` cookie is domain/path-applicable,
  non-httpOnly, non-secure, sameSite Lax (would be page-visible IF unexpired),
  but its `expires=2026-08-10T18:53:39Z` is in the past. Local Playwright/Chrome
  reproduction proves an expired storageState cookie is ABSENT from
  `document.cookie` (live/session cookies are present). Ripple's guard reads via
  js-cookie `document.cookie`, so the expired token is invisible to it.
- **Phase B/C** — actual vue-router 3.5.1 synthetic repro: base `/ripple/` root
  path `/` matches `["/login"]` (alias `''`); guard (router.js:1385-1413): root
  `/` WITH token → `next('/dashboard')`; root `/` WITHOUT token → fall-through →
  `auth-layout`. So authenticated `/ripple/` DOES reach the dashboard; the
  observed auth-layout reflects an unauthenticated (expired-token) session.
- **Phase F/G/H** — intent is correct for authenticated sessions; no product bug
  (`ROOT_ALIAS_COLLISION_BUG` refuted). `/ripple/dashboard` is a safe passive
  observation target, but a truthful authenticated observation needs a fresh
  non-expired capture.

Nightwatch repair (Phase J): added `inspectStorageStateCookiePageReadability`
(booleans only) + 7 focused unit tests; wired into the authenticated runner as
`authTokenPageReadability` (real capture reports `expired=true`,
`pageReadable=false`). Validation: `npx tsc --noEmit` PASS; full suite **237
passed, 0 failed**; `git diff --check` PASS.

BLOCKER (external/human): no truthful authenticated observation or replay is
possible until a human re-captures fresh auth state via
`npm run auth:capture -- --env=dev --output=<fresh-path>` (MFA login). Readiness
was NOT weakened; no product bug was filed; Phase 2B was NOT begun; no real-run
budget was spent this resume.

Next action: await a fresh human-provided external auth capture, then re-run the
authenticated observation (and, if earned, the explicit `/ripple/dashboard`
observation + fresh-context replay). Do not begin Phase 2B.