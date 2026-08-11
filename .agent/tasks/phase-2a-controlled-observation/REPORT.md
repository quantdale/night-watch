# NIGHTWATCH PHASE 2A — AUTHENTICATED BOOTSTRAP DIAGNOSTIC RESULT

Status: `IN_PROGRESS` / M7. The first instrumented authenticated observation
failed the unchanged readiness contract. Replay was not run, no speculative
repair was made, and Phase 2B remains deferred.

The authoritative current checkpoint is the superseding
`POST-MOUNT ROUTER DIAGNOSTICS READY` section at the end of this file. Earlier
run sections are retained as historical M7 evidence.

## Diagnostic implementation checkpoint

Implementation checkpoint: `c771048fc1cdad04807a72c2b77e687a3139077b`.
This is a code-and-documentation handoff, not a new real observation. The
source-traced observer records sanitized main-frame document lifecycle,
redirect/initiator metadata, fixed page bootstrap categories, pre-mount target
and post-mount shell transitions, route history, presence-only auth-state
contract facts, bounded progress classifications, and explicit deployment
fingerprint unavailability. It preserves the existing readiness contract and
does not infer a product cause from duplicate document loads. The latest real
run remains `nightwatch-20260811T061449Z-1fff-first`; replay remains NOT RUN.

Local validation for the implementation was TypeScript PASS, focused diagnostic
tests **37/37** (with a final hardening subset **23/23**), and full Playwright
suite **205/205**. No new real request, replay, Alphaus mutation, DB query, or
storage-state value inspection occurred.

## Run and gate

- Starting checkpoint SHA: `d08b153b52c64d5bd0925d905df08414c4f9a396`.
- Implementation baseline: `9b8f7403726afb3749609400d0cbbcec9ce80b5e`.
- Run: `nightwatch-20260811T032906Z-3fd5-first`.
- Pre-real-run gate: **13/13 PASS**, before browser/context creation.
- Observation mode: one passive direct landing navigation in a guarded DEV
  context; no clicks, forms, exploration, endpoint replay, or database access.

## Auth context

- External storage state loaded before navigation: `true`.
- Provenance matched selected `dev`: `true`; the gate reported structural
  validity and environment compatibility.
- Login/auth-host redirect observed: `false`.
- Authentication-related HTTP status category: no auth-host response or
  auth-related status was safely observable; both document responses were
  `200 text/html`.
- Auth replay effectiveness: **UNRESOLVED**. Loading/provenance succeeded,
  but effective authenticated session behavior was not proven and was not
  called ineffective merely because the route stayed at `/ripple/`.
- No cookie names/values, tokens, localStorage values, identity, or account
  data were read or persisted.

## Document and navigation

- Initial sanitized origin/path: `https://appdev.alphaus.cloud` / `/ripple/`.
- Final sanitized origin/path: `https://appdev.alphaus.cloud` / `/ripple/`.
- Document load count: `2`; both completed with `200 text/html`.
- Route transition count/sequence: `0` / `[]`.
- `/ripple/dashboard` reached: `false`.
- Navigation in progress: `false`; `navigationFailed=false`.
- Page remained open during final sampling and the context closed normally
  after the observation.

## Application assets and bootstrap diagnostics

- `applicationEntryObserved/completed`: `true` / `true`.
- Scripts: `112` requested, `112` successful, `0` failed.
- Chunks: `108` requested, `108` successful, `0` failed; modules: `0`.
- Styles: `6` requested, `6` successful, `0` failed.
- Critical resource failures: `0`; wrong-content-type script failures: `0`;
  failed critical-resource list: empty. All observed JavaScript responses
  were `200 text/javascript`; no HTML fallback was observed for a script.
- CSP resource blocks: `0`.
- Four resource-load error events were recorded, all as expected local policy
  containment effects; none was a critical application asset.
- Observer-hook health: PASS for unhandled rejection, CSP, resource failure,
  history route transition, and request-failure metadata hooks.

## Runtime execution

- Runtime exceptions: `0`; categories/fingerprints: none.
- Unhandled rejections: `0`; categories/fingerprints: none.
- Console errors: `0`; console output was limited to safe category metadata.
- CSP violation count: `0`.
- Router/bootstrap signal: `routerBootstrap=unknown`; no concrete
  router/bootstrap error or route transition was observed.

## Structural readiness

- `document.readyState=complete`.
- Body present: `true`; safe body-child count: `8`.
- Source-backed shell: `DIV.q-layout-container.layout`; present: `false`.
- `targetConfirmed=true`.
- `routeStable=true` at the final sample; `routeStableMs=0`.
- `stabilityReached=false` after the full bounded wait.
- Fatal lifecycle/page-error count: `0`; `pageClosed=false` during sampling.

## Classification

Exact classification: **OTHER / UNRESOLVED**.

The evidence rules out a concrete critical-asset load failure, JavaScript
bootstrap exception, unhandled bootstrap rejection, CSP bootstrap failure,
and observed router transition failure. It does not establish ineffective
auth replay, deployment/source divergence, or causation by expected blocked
telemetry/support/browser-background traffic. The new observer hooks were
installed and healthy, so `OBSERVER_BLIND_SPOT` is not earned. No speculative
fix is supported by this run.

## Destinations and endpoint semantics

- Destination manifest: `3` expected, `0` new-but-verified, `7` blocked,
  `0` unresolved.
- Proxy: `2` allowed, `9` telemetry-blocked, `0` optional-support-blocked,
  `1` browser-background-blocked, `0` denied, `0` unknown, `0` violations.
- Endpoint semantic classifications: none recorded in this passive landing;
  no endpoint was deliberately invoked or replayed.
- Oracle categories: `EXPECTED_CONTAINMENT_EFFECT`,
  `RIPPLE_READINESS_NOT_CONFIRMED`, and `STABILITY_TIMEOUT`.
- The known `POST https://apidev.alphaus.cloud/m/blue/cost/v1/` malformed-JSON
  anomaly did **not** recur in this run. Its prior
  `GENUINE_PROTOCOL_ANOMALY` classification and unresolved subcause remain
  unchanged; no response body was inspected.

## Safety and privacy

- Production attempts: `0`.
- Proxy violations: `0`.
- Unknown destinations silently approved: `0`.
- Mutations: `0`.
- DB queries: `0`.
- Privacy review: **PASS** at category level for credentials/tokens/JWTs,
  authorization/cookie material, user/customer/account identifiers, raw
  request/response bodies, financial values, DOM/text dumps,
  screenshots/traces, and auth-state material. No screenshot or trace was
  created, no authenticated artifact was tracked, and the external storage
  state remained outside Nightwatch.

## Validation

- `npx tsc --noEmit`: **PASS**.
- `npx playwright test`: **194 passed, 0 failed**; this was the ordinary
  local/synthetic suite and did not run another real authenticated observation.
- `npm run agent:check`: **PASS** with the expected one approved
  `CHECKPOINT_ADVANCE` warning from implementation baseline `952be215` to
  documentation checkpoint `d08b153`.
- `git diff --check`: **PASS**.
- Alphaus source status remained the previously documented pre-existing Ripple
  worktree state; no Alphaus repository was modified by this task.
- The real-run artifact pair contained only sanitized JSON/JSONL metadata;
  binary screenshot/trace files were absent, and no artifact was tracked.

This diagnostic result is a truthful M7 checkpoint, not a product bug verdict.

## Exact next action

Keep the task `IN_PROGRESS`. Do not run replay, a third pass, a canary, a
speculative repair, or Phase 2B. A later session must receive an explicit
decision before any new real observation; if authorized, it must use the
existing exact authenticated command and inspect only sanitized diagnostics.

---

# NIGHTWATCH PHASE 2A — POST-MOUNT ROUTER DIAGNOSTICS READY

This superseding M7 report is based on implementation
`c771048fc1cdad04807a72c2b77e687a3139077b`. It does not claim a product root
cause because the latest real artifact predates the replacement-node hook.

1. App.vue post-`$mount` graph: `main.js` injects store/router/i18n and renders
   `App`; `App.vue` renders `.loading-div` when Vuex `loading` is true,
   otherwise the dynamic `(route.meta.layout || 'default') + '-layout'` with a
   `router-view`. `default-layout` is globally registered to
   `DefaultLayout`; its QLayout root is `DIV.q-layout-container.layout`.
   `auth-layout` is `.__AuthLayout`; `error-layout` delegates directly to a
   router-view and has no stable own root.
2. Router mode: `history`, base `/ripple/`. Existing history primitive
   monitoring is correct: `pushState`, `replaceState`, `popstate`, with
   hash/go metadata harmlessly covered; query strings and fragments are never
   persisted.
3. Initial `/` flow: `/dashboard` is the authenticated route with `/` alias.
   A token-present dashboard alias normally takes the authenticated
   `beforeEach` branch and calls `next()`; source does not prove an
   unconditional `/ripple/` browser URL redirect to `/ripple/dashboard`.
   Token-present `/login` explicitly redirects to `/dashboard`; `afterEach`
   may push `/dashboard` only when the synchronous permission helper returns
   false.
4. Initial guards/prerequisites: `mo_access_token` must be truthy/non-empty
   for protected routes. `rootUserOnly` routes depend on `store.state.rootUser`.
   `loadInitialData()` may await token setup, user, permissions, flags,
   preferences, status, analytics, and a permission check; selected failures
   route to login/access-denied and `finally` clears loading. No `beforeResolve`,
   `next(false)`, or dynamic route registration was found. The unguarded
   synchronous `analyzer.track` call is the only source-visible theoretical
   way for `beforeEach` to throw before calling `next`.
5. Semantic auth/bootstrap state: `mo_access_token` non-empty; present DEV
   `api_type` matches `dev`; present `app_type` matches Ripple/`alphaus`;
   absent environment cookies are allowed by the hostname fallback. Only
   booleans are permitted. Synthetic invalid-present coverage passed; no real
   storage value was read.
6. Silent router cancellation/stall: no explicit silent guard cancellation or
   missing `next` branch is source-proven. Pending `loadInitialData` promises
   can preserve the Loading branch because there is no timeout, but the old
   run did not prove a pending prerequisite. A clean Vue patch with no route
   evidence is now reported separately from script failure.
7. Ripple full-document reload paths: `public/index.html` stale-cache
   script/link error handler; `router.onError` chunk/CSS-load handler; user
   logout; user MFE retry; token-expiry full login navigation (not same-path
   reload). Nightwatch observe/readiness/bootstrap code has no reload trigger.
8. Corrected prior second-document classification:
   `RELOAD_CAUSE_UNRESOLVED`. The real run had two `200 text/html` documents,
   same pathname, initiator `reload`, and resource errors before the request,
   but no source-specific reload signal. It is not labeled
   `SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD`.
9. Source-approved replacement vocabulary: `element|comment|text|none|unknown`,
   bounded tags (`DIV`, `SPAN`, `P`, `SECTION`, `MAIN`, `ASIDE`, `HEADER`,
   `FOOTER`, `NAV`, `UL`, `LI`), and only the source-derived selectors
   `.loading-div`, `.__AuthLayout`, `.q-layout-container.layout`, and
   `.q-layout-container`. Arbitrary class names, text, HTML, attributes, and
   values are discarded.
10. New checkpoint diagnostics: `VUE_INITIAL_PATCH`, `ROOT_RENDER_BRANCH`,
    `ROUTER_INITIALIZED=NOT_DIRECTLY_OBSERVABLE`, `INITIAL_ROUTE_RESOLVED`,
    `DEFAULT_LAYOUT_RENDERED`, `Q_LAYOUT_RENDERED`, `DASHBOARD_ROUTE_ACTIVE`,
    and unchanged-route stability (`routeStableMs`, `stabilityReached`). A
    comment VNode is covered synthetically; current route definitions do not
    source-prove it for a normal branch.
11. Files changed: `src/browser/observers/bootstrapHooks.ts`,
    `src/products/ripple/bootstrapContract.ts`,
    `src/products/ripple/bootstrapDiagnostics.ts`,
    `src/products/ripple/lifecycleDiagnostics.ts`,
    `src/products/ripple/readiness.ts`, the authenticated runner, and focused
    unit tests including `tests/unit/ripplePostMountDiagnostics.test.ts`.
    No Ripple repository file changed.
12. Implementation SHA: `c771048fc1cdad04807a72c2b77e687a3139077b`.
13. Task checkpoint SHA: the clean documentation checkpoint commit at the
    final Nightwatch HEAD for this handoff (reported after commit); the code
    checkpoint is the implementation SHA above.
14. Focused tests: **22 passed** for post-mount/reload/privacy diagnostics.
15. Full validation: `npx tsc --noEmit` PASS; `npx playwright test` **218
    passed, 0 failed**; `git diff --check` PASS. `npm run agent:check` is run
    after the documentation checkpoint.
16. No real Alphaus traffic occurred in this source-trace/implementation
    session. No production traffic, replay, DB query, mutation, auth-state
    content read, credential read, body, DOM dump, screenshot, or trace was
    performed or persisted. The latest real run remains the handoff run above.
17. Exact fresh-session retry command (not executed):

```bash
npm run observe:authenticated -- \
  --env=dev \
  --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

M7 remains `IN_PROGRESS`; readiness remains exactly the approved authenticated
route plus complete document plus `DIV.q-layout-container.layout` plus
continuous stability of at least `750 ms` plus no fatal lifecycle failure.
Replay is **NOT RUN** and Phase 2B has not begun.
