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
does not infer a product cause from duplicate document loads. At this
implementation checkpoint the latest real run was
`nightwatch-20260811T061449Z-1fff-first`; the superseding real result is
recorded at the end of this report and replay remains NOT RUN.

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
    performed or persisted. The latest real observation is recorded in the
    superseding section below.
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

## Latest M7 Real Observation — `nightwatch-20260811T072928Z-d840-first`

Status: **NIGHTWATCH PHASE 2A — POST-MOUNT RUNTIME DIAGNOSTIC RESULT**.
The exact authenticated command was run once. The pre-real-run gate was
**13/13 PASS** before browser/context creation. The first observation failed
the unchanged readiness contract, so replay was not run, no third pass was
attempted, no repair was made, and Phase 2B remains deferred.

### Sanitized result

- Final origin/path: `https://appdev.alphaus.cloud` / `/ripple/`.
- Auth: storage state loaded before navigation `true`; DEV provenance matched
  `true`; required token key present `true`; `api_type` and `app_type` keys
  present `true`. The real observer is presence-only, so token non-empty,
  DEV-value match, Ripple-value match, and aggregate semantic validity remain
  `UNRESOLVED` rather than exposing values. Auth-host navigation `false`;
  source-defined unauthenticated branch `false`; source-defined authenticated
  branch `false`; auth replay effectiveness `UNRESOLVED`.
- Documents: two main-frame `GET 200 text/html` loads, both `/ripple/`, no
  redirect chains. Load 1 initiator `other`, replacement `false`, request /
  response about `+252/+471 ms`; load 2 initiator `reload`, source path
  `/ripple/`, replacement `true`, request/response about `+3712/+4641 ms`.
  The second load is `SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD` because the
  fixed Ripple source-reload signal was captured before its request. The prior
  run's `RELOAD_CAUSE_UNRESOLVED` classification remains unchanged for that
  earlier artifact.
- `#app`: seen `true` at `239 ms`, removed `true` at `3174 ms`; the later
  document also saw/removed it at approximately `972/5326 ms`. This earns
  `VUE_INITIAL_PATCH_OBSERVED`, not final readiness.
- Replacement: `replacementNodeType=element`; bounded safe tag unavailable;
  loading/default-layout/QLayout match booleans all `false`.
- Root branch: `LOADING_BRANCH_ACTIVE=false`,
  `DYNAMIC_LAYOUT_BRANCH_ACTIVE=false`, `routeMetaLayoutPresent=UNKNOWN`,
  primary classification **`POST_MOUNT_ROOT_UNKNOWN`**. The observed
  `unknown-element` replacement did not identify a source-approved branch.
- Layout: dynamic layout selected `false`/not observed, DefaultLayout `false`,
  QLayout `false`, rendered shell `false`, shell first-seen `null`.
- Route: browser pathname `/ripple/`; initial route resolution,
  dashboard-route semantic activity, and dashboard-component checkpoint are
  `UNRESOLVED` because the source-proven `/` alias permits this pathname but
  no route/component evidence was observed. Router initialization is
  `NOT_DIRECTLY_OBSERVABLE`. History transitions were all zero
  (`pushState`, `replaceState`, `popstate`, hash/go), with no pathname
  transitions. No login navigation or navigation cancellation was observed;
  cancellation is not directly observable.
- Resources: application entry and runtime/vendor completed; scripts
  `112/107`, chunks `108/103`, styles `6/6`. Five allowlisted chunk requests
  were `not-completed` at cleanup with no status/content type,
  `criticalResourceFailureCount=5`, `wrongContentFailureCount=0`. This is an
  independent `CRITICAL_ASSET_LOAD_FAILURE` diagnostic, not proof of root
  causality.
- Runtime: exceptions `0`, unhandled rejections `0`, product console errors
  `0`, CSP violations `0`, observer-hook health PASS. Four resource-error
  events were expected containment effects.
- Destinations/safety: `3` expected, `7` blocked, `0` new-but-verified,
  `0` unresolved; proxy `2 allowed`, `8 telemetry-blocked`, `0 optional-
  support-blocked`, `1 browser-background-blocked`, `0 denied`, `0 unknown`,
  `0 violations`. Production attempts `0`, proxy violations `0`, mutations
  `0`, DB queries `0`, unknown approvals `0`.
- Oracles: `EXPECTED_CONTAINMENT_EFFECT`,
  `RIPPLE_READINESS_NOT_CONFIRMED`, and `STABILITY_TIMEOUT`. The known
  malformed-JSON anomaly did not recur.
- Readiness: `targetConfirmed=true`, `documentComplete=true`,
  `renderedShellPresent=false`, final route-stable sample `true` but
  `routeStableMs=0`, `stabilityReached=false`, and no fatal lifecycle/page
  error. The unchanged 750 ms readiness contract therefore failed.

### Causal boundary and privacy

The evidence proves Vue removed `#app`, produced an element outside the
approved root vocabulary, captured a Ripple source reload signal before the
second document, and left five allowed chunk requests incomplete at cleanup.
It does not prove whether those incomplete requests caused the unknown root,
nor does it establish a route-meta selection, direct router state, auth
effectiveness, or deployment/source divergence. No speculative cause or repair
is reported.

Category-level privacy review: **PASS**. The authenticated privacy regression
passed **2/2**. The new artifact directory contains only sanitized JSON/JSONL
metadata; no credentials, tokens, cookies, storage-state contents, identity,
customer/account values, raw headers/bodies, DOM/text, query/fragment URLs,
screenshots, or traces were persisted. The external state remains outside
Nightwatch and was not printed, dumped, or copied.

### Validation

- `npx tsc --noEmit`: **PASS**.
- `npx playwright test`: **218 passed, 0 failed**.
- Authenticated privacy regression: **2 passed, 0 failed**.
- `npm run agent:check`: **PASS** with the expected approved
  `CHECKPOINT_ADVANCE` warning from implementation `c771048` to documentation
  checkpoint `83e21c2`.
- `git diff --check`: **PASS**.
- Nightwatch changes are limited to task-state documentation; the Ripple
  worktree retains only its previously documented pre-existing changes.
- Production attempts, proxy violations, mutations, DB queries, and unknown
  destination approvals: `0`.

M7 remains `IN_PROGRESS`; M10 replay is **NOT RUN**; no readiness-contract,
selector, alias, destination-policy, or implementation change was made.

---

# NIGHTWATCH PHASE 2A — POST-MOUNT ROOT CAUSE FOUND (PRODUCT ROUTING CONDITION)

Status: IN_PROGRESS / M7. Two controlled real authenticated DEV observations
ran this session (goal-mode). Both passed the pre-real-run gate 13/13 and
executed safely; both failed the unchanged readiness contract; replay was
correctly NOT run. The readiness failure is now fully attributed to a real
product routing condition, not a Nightwatch defect.

## What the repairs established (Phase F/G/I)

This session completed a comprehensive Phase 2A health audit and repair round:

- **D1/D2** — canceled/unterminated/chunk resources no longer drive
  CRITICAL_ASSET_LOAD_FAILURE. The d840 five-chunk false positive is resolved:
  replayed through the fixed classifier it now reports `OTHER_UNRESOLVED` with
  0 failures and 5 unterminated (not failed) chunks.
- **D3** — post-mount replacement correctly selects the Vue root (DIV) even
  when #app is the last child and Vue inserts-then-removes in separate
  mutations.
- **D5** — `BROWSER_RETRY` no longer over-claims causation from timing.
- **D8** — boolean-only auth bootstrap semantic checks added; real run reports
  aggregate auth state `VALID` (token non-empty, api_type=dev, app_type=alphaus).
- Regression suite grew to 230 passing tests; `npx tsc --noEmit`, full suite,
  agent:check, diff --check all PASS; self-review clean.

## Real-run evidence (run B `nightwatch-20260811T151945Z-8f18-first`)

- Gate 13/13 PASS; auth aggregate `VALID`.
- All 112 scripts + 108 chunks completed; 0 failures, 0 unterminated.
- `#app` seen@136ms, removed@1765ms → VUE_INITIAL_PATCH.
- Post-mount replacement: `DIV`, `rootBranch=auth-layout` (`matchesAuthLayout=true`,
  `.__AuthLayout`).
- No route transitions; pathname stays `/ripple/`; `renderedShellPresent=false`.
- Safety: 0 hard failures, 0 proxy violations, 0 deny, 0 unknown, 0 mutations,
  0 DB queries. Replay NOT run (first observation failed — correct).

## Root cause

The Ripple DEV deployment at `/ripple/` renders the **`auth-layout`** root
(`.__AuthLayout`), not the authenticated **`default-layout`** dashboard shell
(`DIV.q-layout-container.layout`). In the checked-out Ripple router
(`src/router.js`), base is `/ripple/`; `/login` has `alias: ''` (→ `/ripple/`,
`requiresAuth:false`) and `/dashboard` has `alias: '/'` (→ `/ripple/`,
`requiresAuth:true`). `/login` is registered before `/dashboard`, so a literal
`/ripple/` URL resolves to the login/auth route and renders `auth-layout`. The
dashboard shell never appears, so the readiness contract (which requires that
shell) is correctly not met.

## Why this is a product condition, not Nightwatch

Nightwatch's post-mount observer now correctly identified the rendered root as
a DIV `auth-layout`. The readiness contract requires the dashboard shell; the
DEV app genuinely does not render it at `/ripple/`. Weakening the contract to
accept `auth-layout` would falsely claim dashboard readiness and is prohibited.

## Blocker

Phase 2A cannot reach readiness/completion against the current DEV `/ripple/`
deployment because the app renders the auth layout, not the dashboard shell. A
product-side decision is required (whether authenticated `/ripple/` should
resolve to the dashboard), or an explicit instruction to target
`/ripple/dashboard` instead. Nightwatch is healthy and validated; Phase 2B is
not begun.

## Validation

`npx tsc --noEmit` PASS; `npx playwright test` 230/230 PASS; `npm run
agent:check` PASS (approved CHECKPOINT_ADVANCE); `git diff --check` PASS;
self-review clean. No Alphaus repo modified; no production/DB/mutation/auth-state
access. Production attempts for the controlled run(s): 0.

---

# NIGHTWATCH PHASE 2A — AUTH REPLAY INEFFECTIVE (supersedes PRODUCT ROUTING CONDITION)

Status: this resume session re-discriminated the prior "PRODUCT ROUTING
CONDITION" conclusion and refutes it. The root-route auth-layout symptom is
caused by **ineffective auth replay** (the external auth capture is expired),
not by a Ripple product routing bug. Phase 2A cannot complete until a fresh,
non-expired external auth capture is provided by a human.

## Previous Goal-Mode audit (Phase A)

- Prior `requiredTokenPresent=true`, `requiredTokenNonEmpty=true`, and
  `aggregateSemanticValidity=VALID` were computed by
  `inspectStorageStateKeySemantics`/`inspectStorageStateKeyPresence`, which read
  the external `NIGHTWATCH_STORAGE_STATE` **file on disk** (cookie name + value
  in a local variable; booleans returned). They prove only "the capture file
  records these cookie rows" — NOT that Ripple page JS can read `mo_access_token`.
- Verdict: **`AUTH_DIAGNOSTIC_CONTEXT_ONLY`**. The prior aggregate "VALID" was a
  context-only artifact and did not discriminate auth replay effectiveness.

## Browser-visibility (Phase D/E) — context metadata + live-browser proof

- Real capture (`$HOME/.nightwatch/auth/ripple-dev-state.json`) `mo_access_token`
  cookie: `domain=appdev.alphaus.cloud`, `path=/ripple/`, `httpOnly=false`,
  `secure=false`, `sameSite=Lax` — i.e. it WOULD be exposed to `document.cookie`
  at the app origin IF unexpired. But its **`expires=2026-08-10T18:53:39Z` is in
  the past** (now 2026-08-11); `api_type`/`app_type` expired 2026-08-10T18:07:26Z.
- Local Playwright/Chrome reproduction (no real network): an **expired** cookie
  injected via storageState is ABSENT from `document.cookie`; a live/session
  cookie is PRESENT. Ripple's guard uses `js-cookie` `Cookies.get`, which reads
  `document.cookie`; an expired token is therefore invisible to the guard.
- Classification: **`AUTH_REPLAY_INEFFECTIVE`**. Context contains the expired
  token; the page cannot read it; the source-defined unauthenticated branch
  (auth-layout) is positively observed.

## Exact router semantics (Phase B/C) — actual vue-router 3.5.1 synthetic repro

- Base `/ripple/`; base-relative root path is `/`; matches `["/login"]` via its
  `alias: ''` (layout `auth`, requiresAuth false). `/login` is registered before
  `/dashboard` (`alias: '/'`).
- Guard (src/router.js:1385-1413):
  - root `/` **with token** → `(to.path==='/'||'/login') && token` →
    `next('/dashboard')`. Authenticated `/ripple/` DOES reach the dashboard.
  - root `/` **without token** → requiresAuth branch false + `/`-token branch
    false → fall-through `next()` → renders `auth-layout`.
- Conclusion: an authenticated root visit does NOT render an auth layout; it is
  redirected to `/dashboard`. The observed auth-layout reflects an
  unauthenticated (expired-token) session. `ROOT_ALIAS_COLLISION_BUG` refuted.

## Product intent (Phase F/G)

- Source intent is unambiguous: guard branch5 redirects authenticated root to
  `/dashboard`; `Header.vue:74` and `afterEach` (router.js:1438-1446) route the
  authenticated landing to `/dashboard`. No Ripple Router unit tests exist. The
  routing contract is correct for authenticated sessions; no product bug is
  indicated.

## Explicit /ripple/dashboard target (Phase H)

- From source, `/ripple/dashboard` exists, `requiresAuth=true`, is a
  GET/navigation-only passive observation (no mutation). Classification:
  **`EXPLICIT_DASHBOARD_TARGET_APPROVED_FOR_PASSIVE_OBSERVATION`** — but a truthful
  authenticated observation requires a valid (non-expired) capture, which is not
  present.

## Nightwatch repair (Phase J)

- Added `inspectStorageStateCookiePageReadability` (booleans only: present,
  domainApplicable, pathApplicable, httpOnly, secure, expired, pageReadable) and
  wired it into the authenticated runner's reporting as `authTokenPageReadability`.
  Against the real capture it correctly reports `expired=true, pageReadable=false`.
- Added 7 focused unit tests (22 storage-state tests total). `npx tsc --noEmit`
  PASS.

## Real observations (Phase L/M/N)

- NOT run this resume. Phase L: when browser-visible auth is FALSE, STOP
  root-route product diagnosis and classify `AUTH_REPLAY_INEFFECTIVE`. Phase M
  (dashboard observation) is gated on "browser-visible auth is valid", which is
  false with the expired capture. Running anything with the stale capture would
  only re-render auth-layout and would not be a truthful authenticated
  observation. No real-run budget was spent this resume.

## Blocker

A genuine external/human blocker: the external auth capture is **expired** and
must be re-created by a human login/MFA via
`npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"`
(a fresh output path). Until then, no truthful authenticated observation or
replay is possible. Readiness is NOT weakened; no product bug is filed; Phase 2B
is not begun.

## Validation

`npx tsc --noEmit` PASS; storage-state focused tests **22/22 PASS**; full
`npx playwright test` and `npm run agent:check`/`git diff --check` run next after
STATE/REPORT checkpoint. No Alphaus repo modified; no production/DB/mutation/
auth-value access. Production attempts for this resume: 0.
