# Task State

## Identity

Task ID: phase-2a-controlled-observation
Phase: 2A
Status: IN_PROGRESS
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 952be215a0d65843e2fb7f8d15e0c28a7d7b142a
Last validated implementation SHA: 952be215a0d65843e2fb7f8d15e0c28a7d7b142a
Branch: main
Last checkpoint: 2026-08-11 — the exact guarded authenticated retry run
`nightwatch-20260811T012811Z-9045` passed the pre-real-run gate 13/13. Its
sanitized evidence shows successful document and critical asset responses, but
does not prove application execution, auth-state effectiveness, router start,
or deployment identity. The final path was `/ripple/`, the document was
complete, and the source-backed post-mount
`DIV.q-layout-container.layout` shell was absent. `routeStableMs` remained
`0` and `stabilityReached` was `false`; replay was correctly NOT RUN. The run
recorded zero denied or unknown destinations, zero proxy violations, zero hard
failures, and zero fatal page errors. The external DEV storage-state path and
contents remain outside Nightwatch.

## Objective

Safely observe one explicitly selected authenticated Ripple `dev` or `next`
session using passive actions, mandatory proxy/browser containment, minimized
evidence, and a single fresh-context replay.

## Current Milestone

Milestone ID: M7 — First controlled authenticated landing observation
Status: IN_PROGRESS
What is now established: M6 passed against the exact DEV Ripple target
`https://appdev.alphaus.cloud/ripple/`. The exact guarded authenticated retry
`nightwatch-20260811T012811Z-9045` passed all 13 pre-real-run checks and
reached the approved DEV origin. Its final path was `/ripple/`; the document
was complete, but the post-mount `DIV.q-layout-container.layout` shell was
absent after the full bounded readiness window. `targetConfirmed` was `true`,
`routeStable` was `true` at the final sample, `routeStableMs` was `0`, and
`stabilityReached` was `false`. The run stopped before replay as required. The
source/framework repair remains authoritative: `#app` is only the Vue
pre-mount target, and the rendered shell remains the readiness marker. This
shell-absent result is now the remaining runtime/deployment/bootstrap branch;
the selector and readiness contract must not be weakened.

Historical M7 safety review remains recorded below: the exact source-supported
Pylon host and reviewed browser-background hosts remain locally blocked,
non-fatal only under their exact classifications, and no new host is approved.
Sanitized local evidence recovered five outer-proxy `deny` events classified
as `external` for the newly observed hosts `android.clients.google.com`,
`update.googleapis.com`, and `redirector.gvt1.com`. The exact monitor
subreason was `UNKNOWN_DESTINATION`. Human review is now complete and the
following disposition is checkpointed:

- `android.clients.google.com` → exact local block,
  `BROWSER_BACKGROUND_GOOGLE`, non-fatal when successfully contained;
- `update.googleapis.com` → exact local block,
  `BROWSER_BACKGROUND_UPDATE`, non-fatal when successfully contained;
- `redirector.gvt1.com` → exact local block,
  `BROWSER_BACKGROUND_DOWNLOAD`, non-fatal when successfully contained.

None is network-allowlisted or permitted to reach upstream. Zero wildcards
were added. HUMAN_WAIT may continue when one of these exact requests is
successfully blocked and sanitized expected-containment evidence is recorded.
Any new or related hostname remains `UNKNOWN_DESTINATION`, blocked, and fatal.
The latest human run then failed at HUMAN_WAIT with
`SAFETY_MONITOR_FAILED / OTHER / oracle / malformed-json`; its exact sanitized
source and repair are checkpointed below. The user has confirmed a later
successful guarded DEV auth capture. The external state remains outside
Nightwatch and uninspected. M7 remains IN_PROGRESS; no real retry or replay is
authorized in this repair session.

## M7 Readiness Contract Review and Repair

### Current Ripple source evidence

Repository: `REPOSITORIES/mobingilabs/ripple-ui`.

- Checked-out branch: `dev`.
- Checked-out SHA: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`.
- Locally available current reference: `origin/dev` at
  `0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2`.
- Relationship: checked-out `dev` is behind `origin/dev` by 17 commits; the
  worktree has unrelated local deletions under
  `openspec/changes/add-reserveshield-export-report/` and an untracked
  `AGENTS.md`.
- The 17-commit delta is limited to translation/invoice/settings files and
  has no changes to bootstrap, `public/index.html`, `src/main.js`,
  `src/router.js`, `src/App.vue`, or build/runtime mounting files. No
  pull/fetch/checkout/reset/rebase/stash/clean/modification occurred.

Source contract:

1. `src/router.js` sets the router base to `/ripple/`.
2. The dashboard route is `/dashboard` with alias `/` and `requiresAuth`.
3. The `beforeEach` guard redirects authenticated `/` or `/login` to
   `/dashboard`; the authenticated browser URL is therefore
   `/ripple/dashboard`.
4. At current `origin/dev`, `public/index.html:35` declares
   `<div id="app"></div>` and `src/main.js:48,324` mounts Vue with
   `}).$mount('#app')`.
5. The shell owns the mount and layout; dashboard content is rendered below
   the shell and may select a dashboard MFE via feature flags. No customer
   text or financial value is needed for readiness.

Classification: `CURRENT_SOURCE_STILL_USES_APP`. The exact source-backed root
contract remains `#app` in the top-level document; no newer source proved a
different selector.

### Exact causal analysis

- `targetConfirmed=false`: pre-repair code compared the final pathname for
  exact equality with configured `/ripple/`. The actual sanitized final path
  was `/ripple/dashboard`, so this predicate failed solely because the
  authenticated landing route is a source-proven sub-route. The repair keeps
  exact origin/host policy and accepts only `/ripple/` or a path beneath the
  configured Ripple namespace.
- `appRootPresent=false`: the previous observer used the retained
  `context.page` Page object, queried the top-level main-frame document with
  `page.evaluate`, and checked `document.querySelector('#app')` after the
  direct `goto(..., { waitUntil: 'domcontentloaded' })` returned. No iframe
  or alternate Page was queried, and no DOM/body content was recorded. The
  sanitized runtime result was false because that query found no matching
  element at the sampled final document. Current `origin/dev` proves the
  selector, but not the runtime reason for its absence; deployment/source
  divergence versus timing or shell mount failure remains unresolved without
  prohibited content inspection. No selector weakening was made.
- `stabilityReached=false`: pre-repair `waitForStability` required zero active
  network requests plus 750 ms of silence for 15 seconds. It did not depend on
  `targetConfirmed` or `appRootPresent`, so the three old booleans were not
  three independent product failures: target mismatch was independent, while
  the old stability timeout was a generic network-idle result. The repaired
  authenticated contract uses `document.readyState === complete`, source
  `#app` presence, and unchanged route for 750 ms; target confirmation is
  still independent, and missing `#app` is an explicit upstream prerequisite
  for structural stability.

The malformed-JSON response anomaly remains `GENUINE_PROTOCOL_ANOMALY` with
subcause unresolved. It is not a readiness blocker, and no response body was
inspected or persisted.

The diagnostic repair remains metadata-only. Future failed retries record the
approved origin/path, top-level-page flag, Playwright frame count, main-frame
evaluation frame, exact `#app` selector, main/child-frame root counts,
document-ready-state, body presence/child count, first/last bounded sample
timing, direct-navigation state, page-closed state, main-frame navigation
count, fatal page-error count, route-stable boolean and milliseconds, and a
sanitized diagnosis. A complete main document with a body but no main-frame
root is reported as
`SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED`; it is never promoted to a
product bug or used to weaken readiness. The source contract, target
confirmation, app-root presence, and stability result remain independent.

### Repair checkpoint

Initial implementation SHA: `ed337d75966f8af20130df32e084459da74dff50`.

Follow-up implementation SHA: `4e74d56394b3971a5a1cc4ef14a8db3b2ea9b8e1`.

Files changed:

- `src/products/ripple/readiness.ts` — source-backed target namespace,
  origin, `#app`, and structural readiness helpers.
- `src/browser/observers/stability.ts` — structural Ripple stability wait;
  generic network-idle wait remains available to other existing workflows;
  structural stability restarts after a route/root/document readiness
  interruption.
- `tests/manual/phase2a-authenticated.ts` — bounded final target semantics,
  source-backed shell sampling, structural stability, and readiness verdict.
- `tests/unit/rippleReadiness.test.ts` — synthetic contract/readiness matrix
  and causal tests.

The repair preserves HTTPS, exact DEV host policy, production denial,
unknown-host denial, auth-host handling, local blocking, metadata-first
privacy, and the no-body/no-DOM persistence boundary. It does not approve
arbitrary paths on `appdev.alphaus.cloud`.

The follow-up does not alter target, app-root, network, proxy, or privacy
policy. It only prevents a previously accumulated route-stability interval
from being reused after the source-backed shell disappears or the document is
not complete.

### M7 current-source and readiness-diagnostics checkpoint — 2026-08-10 — `3b52b58`

The required read-only source comparison used the locally available
`origin/dev` ref; no Git network operation was performed. The checked-out
Ripple SHA is `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`, branch `dev`, and the
current local `origin/dev` SHA is `0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2`,
with the checkout 17 commits behind. The delta changes only translation,
invoice, and settings files. It does not change application bootstrap,
`public/index.html`, Vue mounting, router/base path, dashboard route,
authentication redirect, shell/root component, or build/runtime mounting.

Historical classification: `CURRENT_SOURCE_STILL_USES_APP`. The exact
bootstrap contract is `public/index.html:35` `<div id="app"></div>` and
`src/main.js:48,324` `}).$mount('#app')`, at `origin/dev`
`0bba40b7...`. The 2026-08-11 framework review supersedes its use as a
post-mount invariant: the current classification is
`APP_IS_PREMOUNT_TARGET_ONLY`, with rendered shell
`DIV.q-layout-container.layout`. Route provenance remains
`src/router.js:273,325-328,1385-1409`: base `/ripple/`, authenticated
`/dashboard` route with `/` alias, and the authenticated redirect to
`/dashboard`.

Nightwatch implementation `3b52b58` recorded sanitized diagnostics from
the same `context.page` Page object and top-level main-frame evaluation used
by the observer, while also checking child frames only for structural shell
presence. It recorded origin/path, `documentReadyState`, `topLevelPage`,
`frameCount`, the historical `appRootSelector`, main/child root counts,
`bodyPresent`, safe `bodyChildCount`, evaluation frame/timing, whether the
root was queried before document completion, direct-navigation progress, page
closure, main-frame navigation count after Page capture, fatal page-error
count, first/last sample elapsed milliseconds, `routeStable`,
`routeStableMs`, and an explicit diagnosis. Its complete-document root absence
was the unresolved diagnosis under the superseded placeholder predicate. The
repaired structural stability requires complete document, exact rendered
shell, and an unchanged route for 750 ms, independent of target confirmation
and generic network idle.

Focused validation: `npx playwright test
tests/unit/rippleReadiness.test.ts --project=nightwatch` => **16 passed, 0
failed**; `npx tsc --noEmit` => PASS; full `npx playwright test --reporter=line`
=> **175 passed, 0 failed**; `npm run agent:check` => PASS with only the
expected stale-baseline warning before this state checkpoint; `git diff
--check` => PASS. No real authenticated request, replay, production traffic,
mutation, DB query, storage-state read, or Alphaus repository modification
occurred. Replay remains NOT RUN and M7 remains IN_PROGRESS.

### M7 authenticated DEV root-absent retry — 2026-08-10 — `nightwatch-20260810T140122Z-02d9`

The exact command from the resume recipe was run without `--ui-url`. The
strict pre-real-run gate passed **13/13** checks before browser/context
creation. Exactly one guarded first observation ran; because it was
unsuccessful, Nightwatch wrote a sanitized `replay-not-run` comparison and did
not create a fresh replay context.

Sanitized readiness diagnostics:

| Diagnostic | Result |
|---|---|
| Final origin/path | `https://appdev.alphaus.cloud` / `/ripple/dashboard` |
| Target confirmed | `true` |
| Document ready state | `complete` |
| Top-level/main-frame | `true` / `top-level-main-frame` |
| Frame count / iframe count | `1` / `0` |
| Evaluation | succeeded in the top-level main frame |
| App-root selector/presence | `#app` / `false` |
| App-root frame count | `0` |
| Body presence/child count | `true` / `11` |
| Route stability | `true` final sample; `0ms` continuous ready interval |
| Navigation in progress | `false` |
| Page closed | `false` |
| Fatal page errors | `0` |
| First sample | `interactive`, root absent, `11254ms` |
| Final sample | `complete`, root absent, `26310ms` |
| Bounded readiness wait | full configured `15000ms` window elapsed |
| Stability reached/navigation failed | `false` / `false` |
| Diagnosis | `SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED` |

`targetConfirmed`, `appRootPresent`, and `stabilityReached` remain independent.
The evidence supports only `UNRESOLVED`: the correct top-level document was
evaluated after completion and through the full bounded window, but the source
root never appeared. This does not distinguish bootstrap timing from shell
bootstrap failure or deployment/source divergence without prohibited
DOM/content inspection. Do not change `#app` or weaken readiness.

Sanitized runtime safety result: 4 expected destinations, 7 blocked
expected-containment groups, 0 new-but-verified, 0 unresolved; proxy counts
3 allowed, 9 telemetry-blocked, 1 browser-background-blocked, 0 denied,
0 unknown, and 0 violations. Production attempts, mutations, DB queries, and
deliberate endpoint replays were 0. The known malformed-JSON anomaly recurred
twice for the already recorded `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>`
metadata contract (HTTP 200, declared `application/json`, observed
`invalid-json`); bodies were not inspected or persisted. It remained an oracle
anomaly and did not set the safety-failure state.

Category-level privacy review passed for credentials/tokens/JWTs,
cookies/storage-state material, user/customer/account identity, raw
request/response bodies, financial values, and screenshots/traces/DOM dumps.
The external storage state remained outside Nightwatch and uninspected.
Final validation passed: `npx tsc --noEmit`; `npx playwright test` (**175
passed, 0 failed**); `npm run agent:check` (PASS with the expected approved
checkpoint-advance warning); and `git diff --check`.

### M7 post-mount shell contract repair — 2026-08-11

The required read-only Ripple source/framework review classifies the prior
`#app` readiness assumption as `APP_IS_PREMOUNT_TARGET_ONLY`:

- `REPOSITORIES/mobingilabs/ripple-ui/package-lock.json` resolves Vue
  `2.6.12` and Quasar `1.15.4`.
- `src/main.js:2,48-52,324` imports `App`, renders it with `render: h => h(App)`,
  and calls `vm.$mount('#app')`.
- The local Vue `2.6.12` runtime/source path uses `$mount()` with the real
  element patch. A non-hydrating render creates the vnode and removes the old
  mount element.
- `src/App.vue:1-5` selects `default-layout` for authenticated routes; the
  authenticated route records use that default because they do not set another
  layout.
- `src/layouts/DefaultLayout.vue:1-2` supplies Quasar `q-layout` with
  `container` and static class `layout`. Quasar `1.15.4`'s QLayout returns an
  outer `DIV` with static class `q-layout-container`, and Vue class inheritance
  preserves `layout`, producing `DIV.q-layout-container.layout`.

Local browser regression evidence uses the exact Vue `2.6.12` UMD runtime with
the synthetic pre-bootstrap document `<body><div id="app"></div></body>`:
the runtime reports Vue `2.6.12`, `bootstrapMountTargetPresent=false`, and
`renderedShellPresent=true` for `DIV.q-layout-container.layout`. A separate
regression proves the placeholder alone never satisfies readiness.

Nightwatch terminology and behavior now distinguish:

| Contract | Value | Readiness role |
|---|---|---|
| bootstrap mount selector | `#app` | diagnostic only; pre-mount target |
| post-mount shell selector | `.q-layout-container.layout` | source-backed readiness marker |
| post-mount shell present | `renderedShellPresent` | required for structural readiness |

The repaired predicate is: approved authenticated Ripple route, complete
document, rendered shell present, unchanged route continuously for `750ms`,
and no fatal lifecycle/safety failure. Benign recurring network activity does
not reset it; the malformed-json oracle remains independent. In the latest
real run, `#app` absence is therefore expected and does not prove deployment
divergence. Its `routeStable=true`, `routeStableMs=0` result was causal: the
route was unchanged, but the old `#app`-based structural predicate never
started the interval. The repaired shell was not authenticated-retried here.

Files changed in this repair: `package.json`, `package-lock.json`,
`src/products/ripple/readiness.ts`, `src/browser/observers/stability.ts`,
`tests/manual/phase2a-authenticated.ts`, and
`tests/unit/rippleReadiness.test.ts`. Replay remains NOT RUN and M7 remains
IN_PROGRESS.

## Current Oracle Failure Checkpoint

Real failure: run `nightwatch-20260810T052211Z-cdd4` reached the verified
`https://appdev.alphaus.cloud/ripple/` target and failed during HUMAN_WAIT with
`SAFETY_MONITOR_FAILED`, `monitor-reason: OTHER`, `guard-type: oracle`, and
`event-category: malformed-json`. Cleanup passed; this historical run did not
produce an external auth state.

Exact recoverable sanitized source metadata:

- timestamp: `2026-08-10T05:23:12.976Z` and `2026-08-10T05:23:16.201Z`;
- method: `POST`;
- origin/path: `https://apidev.alphaus.cloud` and
  `/m/blue/cost/v1/<ID>`;
- status: `200`;
- Content-Type: `application/json`;
- Content-Length: unavailable in historical sanitized evidence;
- oracle/parser: plain JSON protocol oracle / `checkJsonBody`;
- expected protocol: `json`;
- observed protocol: `invalid-json`;
- endpoint classification: `UNKNOWN` (no path-level semantic registry entry;
  method alone is insufficient to infer `KNOWN_MUTATION`);
- response classification: JSON-declared response, observed invalid JSON.

Classification: `GENUINE_PROTOCOL_ANOMALY` at the observed protocol-contract
layer, not `FALSE_POSITIVE_ORACLE`. HTML, non-JSON text, NDJSON/streaming,
redirect, 204/empty, and failed/incomplete body captures were not the
historical parser input. The server-versus-truncated-transport subcause is
not recoverable without forbidden response content or unavailable historical
Content-Length, so it is not guessed.

Parser/oracle root cause: the historical observer correctly ran the plain JSON
parser for a complete-capture candidate whose response declared
`application/json`; it emitted `malformed-json` as an `error` oracle. The
monitor then treated any configured oracle in `failOn` as the shared fatal
`failed` state, and the direct runner converted that state to
`SAFETY_MONITOR_FAILED / OTHER`. The termination was therefore a
monitor-severity defect, not a containment violation.

Repair: safety hard failures and oracle failures are now separate monitor
states. Auth capture checks `safetyFailed`, while ordinary passive runs retain
their configured oracle-failure verdict. Plain JSON parsing is narrow to
explicit JSON (or absent Content-Type with unambiguous JSON shape), complete
body captures, non-redirect, non-204/205 responses; NDJSON/JSON-seq/streaming
uses the streaming oracle, HTML/text is not parsed, and sanitized anomaly
metadata preserves category and protocol details without response content.
No containment rule, host classification, endpoint allowlist, or mutation
policy was weakened.

## Completed Milestones

- M0 — COMPLETE. Reconciled HEAD `3a2712185250cd4e3591ee4037b28e06e8a0417e`
  as a clean approved continuity-only descendant of Phase 1.3 implementation
  SHA `1994eaca9f8b67cf7d31cdffd66ebdc600379c90`; created this task's
  SPEC/PLAN/STATE/REPORT and routed ACTIVE_TASK before implementation.
  Validation: `git status --short --branch` was clean on `main`; no Alphaus
  repository or external environment was contacted.
- M1 — COMPLETE. Updated `bin/agent-state.mjs` to record and classify the
  `Last validated implementation SHA` as `SYNCED`, approved continuity-only
  `CHECKPOINT_ADVANCE`, or `STALE`; added a narrow approved-path allowlist and
  synthetic tests for committed/uncommitted implementation drift and
  non-ancestor SHA values. Updated `.agent` docs/templates for the semantics.
  Validation: `npx playwright test tests/unit/agent-state.test.ts` => **12
  passed, 0 failed**; `npx tsc --noEmit` => PASS; `npm run agent:check` => PASS
  with the expected visible `STALE` warning for uncommitted implementation
  changes; `git diff --check` => PASS.
- M2 — COMPLETE. Added explicit `apiHosts`/`authHosts` to the verified `dev`,
  `next`, and local environment configs plus `observe:preflight`. The command
  requires exactly one supported real environment, uses the configured URL or
  a same-host explicit URL, rejects query/fragments/credentials and production
  hosts, and verifies API/auth hosts are allowlisted. Validation: `npx
  playwright test tests/unit/target-preflight.test.ts tests/unit/safety.test.ts`
  => **24 passed, 0 failed**; `npm run observe:preflight -- --env=dev` => PASS;
  `npx tsc --noEmit` => PASS. No DNS/TCP/browser/auth activity occurred.
- M3 — COMPLETE. Added recorder-level irreversible authenticated metadata-first
  mode, authenticated URL path placeholdering/query removal, screenshot
  suppression, category-only console/page/network failures, and synthetic
  privacy tests. Context enables the mode after external storage-state
  validation and before browser activity; trace suppression remains enforced.
  Validation: `npx playwright test tests/unit/evidence.test.ts
  tests/unit/redaction.test.ts tests/smoke/authenticated.smoke.ts` => **22
  passed, 0 failed**; `npx tsc --noEmit` => PASS. The synthetic storage state
  and fixture were local-only; no real auth state or Alphaus environment was
  used.
- M4 — COMPLETE. Added `auth:capture` plus guarded manual capture controls,
  external output-path validation, verified UI host check, and structural
  post-write validation. The final real interaction architecture is recorded
  in M7 below because the original worker-based helper could not own the
  parent TTY. Validation: `npx playwright test tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts`
  => **15 passed, 0 failed**; `npx tsc --noEmit` => PASS; `npm run
  auth:capture -- --help` => PASS; unsafe relative output rejected before any
  browser launch. No real browser or auth state was used.
- M5 — COMPLETE. Added a reusable fail-closed pre-real-run gate, explicit
  browser containment contract, dedicated gate CLI/config, and focused tests.
  The gate checks exactly one real environment, UI/API/auth agreement, the
  canonical policy canary and production denial, loopback proxy binding/health
  and policy version, external structurally valid storage state, all browser
  containment flags, authenticated metadata-first evidence, passive/action
  registry state, and read-only repository freshness. It never creates an
  authenticated context. Validation: `npx playwright test
  tests/unit/realRunGate.test.ts --project=nightwatch` => **6 passed, 0
  failed**; `npx tsc --noEmit` => PASS; `git diff --check` => PASS; dev
  preflight => PASS with no DNS/TCP/browser activity. The gate CLI rejection
  smoke showed precise failures for a missing external state and undocumented
  task changes while the loopback proxy was healthy; no target was contacted.

## Work In Progress

Continuity, evidence minimization, manual capture, and the pre-real-run safety
gate are complete. The corrected canary reached `/ripple/` with HTTP 200 and
passed after the source-backed Pylon classification. Earlier Ripple checkout
source verification at
`mobingilabs/ripple-ui` `dev` `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
proved the exact host is an asynchronous optional support/chat widget; no
direct Pylon references were found in the named Ripple MFE/shared UI repos.
Nightwatch now blocks only that exact host as
`OPTIONAL_THIRD_PARTY_SUPPORT`; related Pylon names remain fail-closed
unknowns. The passing run was `nightwatch-20260809T110122Z-4d4d`: 3 expected,
0 new-but-verified, 8 blocked, 0 unresolved; 0 production attempts and 0
proxy violations.

The current auth-capture blocker was an architecture error, not a credential
or provenance problem: `tests/manual/auth-capture.ts` checked
`process.stdin.isTTY` inside a Playwright Test worker. The parent command had a
real TTY, but the worker's stdin was non-TTY, so it stopped with
`USER_ACTION_REQUIRED` before headed browser launch. No human interaction could
occur and the external state was never created.

At implementation SHA `963128f4772db6e6c790cdc8cbb464c382cad8df`, the real test
path was gone. The human result proves that the parent CLI and headed browser
did launch, but does not identify the later exception because that version
collapsed every post-launch error into one generic line.

The exact source-proven failure is therefore the missing post-launch
observability and verification contract, not a proven synthetic-target leak:
the old runner navigated without checking the resulting sanitized URL,
printed a hard-coded ready message, accepted ENTER without a post-login
readiness check, and only then attempted state write/validation/cleanup. Its
catch block discarded the stage and error category. The new runner reports
PREFLIGHT, PROXY_START, PROXY_HEALTH, BROWSER_LAUNCH, GUARD_INSTALL,
TARGET_NAVIGATION, TARGET_VERIFICATION, HUMAN_WAIT,
POST_LOGIN_VERIFICATION, STORAGE_STATE_WRITE, PROVENANCE_WRITE,
STATE_VALIDATION, and CLEANUP, with origin/path only on URL diagnostics.

Local source and synthetic execution prove the `testing...` page was not the
Nightwatch synthetic fixture: real CLI mode accepts only `dev|next`, resolves
the selected environment directly to
`https://appdev.alphaus.cloud/ripple/`, does not use the synthetic Playwright
config, and rejects synthetic completion unless `testOnly && local`. No
Nightwatch fixture contains or serves that page text. The exact remote page
content cannot be identified without a forbidden real request; the repaired
rerun's TARGET_VERIFICATION output will identify only the safe origin/path.
The local synthetic direct-runner test passed with a temporary external state
and no fake-secret artifact leakage. No authenticated observation or real auth
state has been created by Codex.

### Current real failure and repair

Real failure: `HUMAN_WAIT / SAFETY_MONITOR_FAILED` in sanitized run
`nightwatch-20260810T034113Z-02f7`. The historical subreason is recoverable as
`UNKNOWN_DESTINATION`: `RunRecorder.syncProxyViolations()` observed five
outer-proxy `deny` events while HUMAN_WAIT was active for the newly observed
external Chrome destinations `android.clients.google.com`,
`update.googleapis.com`, and `redirector.gvt1.com`. The proxy remained alive;
there was no proxy health failure, browser disconnect, context closure, page
closure, guard alarm, or Pylon/expected-telemetry fatality in the evidence.

Root cause: the direct runner converted any `monitor.failed` state to the
single `SAFETY_MONITOR_FAILED` reason. A second Nightwatch defect allowed a
console error caused by an exact policy-blocked telemetry request to enter the
generic `console-error` fail-on path. The new-host proxy denials themselves
remain legitimate fail-closed safety events and were not suppressed.

Repair: first-cause sanitized safety-monitor taxonomy and metadata now flow
from the monitor through HUMAN_WAIT/POST_LOGIN_VERIFICATION stage diagnostics
to the parent CLI. The CLI prints only reason code, host, origin/path,
classification, decision, guard, lifecycle, and event category. Exact blocked
telemetry console effects are classified as expected containment only when the
same host was already blocked by policy; exact Pylon behavior is unchanged.
No containment rule was weakened.

### M7 authenticated target-plumbing repair checkpoint — 2026-08-10 — `868b639`

Failing checkpoint: `75d877c`.

Failure: the first `observe:authenticated` attempt stopped safely at the
pre-real-run gate's `target-agreement` check before browser creation, context
creation, or authenticated target navigation. The other 12 gate checks passed.

Exact root cause: `bin/observe-authenticated.mjs` converted an absent
`--ui-url` option into `NIGHTWATCH_UI_URL: ''` in both child-process
environments. The existing gate uses a nullish fallback to the selected
environment's canonical `uiBaseUrl`, so the empty string bypassed that fallback
and was rejected by strict target agreement.

Old behavior: no CLI override produced `NIGHTWATCH_UI_URL=''`, which reached
the gate as a misleading explicit target and failed with `UI target must be an
explicit HTTPS host matching the selected verified environment`.

Repair: the authenticated runner now parses the option boundary separately,
removes any inherited ambient `NIGHTWATCH_UI_URL` when no CLI override was
supplied, and omits the variable entirely. The gate therefore resolves the
selected environment's existing canonical target. An explicit non-empty
override is forwarded unchanged for strict gate validation; an explicit blank
override is rejected at the CLI boundary and never reaches the gate. The gate
itself and target-agreement semantics were not changed.

Canonical resolved DEV target: `https://appdev.alphaus.cloud/ripple/`.

Focused synthetic validation: runner-boundary and strict gate tests passed
**11/11**; the actual wrapper with a conflicting ambient UI variable reported
`target-agreement: PASS` and stopped only on synthetic missing-state/current
worktree facts. `npx tsc --noEmit` passed. The first full-suite attempt had
unrelated transient proxy/flaky-test failures; a fresh rerun passed **159/159**.
No real authenticated state was opened, printed, copied, or modified; no
browser/context or authenticated target navigation occurred.

### M7 first authenticated observation checkpoint — 2026-08-10 — `de97`

The exact authenticated command was run without `--ui-url`. Its pre-real-run
gate passed all 13 required checks before browser/context creation. The first
guarded authenticated context then navigated directly to the canonical DEV
target and closed normally. Because the first observation was unsuccessful,
the runner prohibited the fresh-context replay as required.

Sanitized run: `nightwatch-20260810T092636Z-de97-first`. Destination manifest:
4 expected, 0 new-but-verified, 7 blocked expected-containment groups, and 0
unresolved. Proxy summary: 3 allowed, 9 telemetry-blocked, 1
browser-background-blocked, 0 denied, 0 unknown, and 0 violations. Production
attempts were 0. The final origin was `https://appdev.alphaus.cloud`; the
final path was `/ripple/dashboard`. Readiness was
`targetConfirmed=false`, `titlePresent=true`, `documentReadyState=complete`,
`appRootPresent=false`, `stabilityReached=false`, and `navigationFailed=false`.
The sanitized comparison records `replay-not-run`.

The known protocol anomaly recurred twice and was recorded without response
content: `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>`, HTTP 200,
`application/json`, expected `json`, observed `invalid-json`, endpoint
classification `UNKNOWN`. This remained an oracle anomaly, not a safety
failure. Encountered API initialization calls remained metadata-only
`UNKNOWN`; no endpoint was deliberately triggered or replayed. The first
observation is unsuccessful at the authenticated shell/readiness stage; this
does not classify the product behavior as a bug. No fresh-context replay or
third pass is authorized.

## Exact Next Action

Current next action: M7 remains IN_PROGRESS after the rendered-shell-absent
branch. Existing sanitized evidence is insufficient to distinguish auth-state
replay ineffectiveness, JavaScript execution failure, router bootstrap failure,
or deployment/source divergence. The new diagnostics are ready for exactly one
fresh authorized authenticated observation; do not execute it in this repair
session. Do not replay or begin Phase 2B. The exact external auth-state path
remains outside Nightwatch and its contents remain uninspected.

The latest real gate result was **13/13 PASS**. The latest observation ended at
`/ripple/` with `document.readyState=complete`, body child count `8`,
`renderedShellPresent=false`, `routeStableMs=0`, and
`stabilityReached=false`; replay was correctly prohibited. The known malformed
JSON response remains independent metadata-only
`GENUINE_PROTOCOL_ANOMALY` evidence with unresolved subcause and was not
observed in this run. Safety totals remained zero for unresolved destinations,
proxy violations, production attempts, mutations, and DB queries.

Current source evidence is the locally available `origin/dev` ref at
`0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2`. The checked-out Ripple worktree
remains `dev` at `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`, exactly 17 commits
behind `origin/dev`, with unrelated local deletions and an untracked
`AGENTS.md`; no checkout, reset, pull, rebase, stash, clean, or modification
occurred. The 17-commit delta touches only translation/invoice/settings files;
it does not touch `public/index.html`, `src/main.js`, `src/router.js`,
`src/App.vue`, or build/runtime mounting files.

Classification: `APP_IS_PREMOUNT_TARGET_ONLY`. At `origin/dev`,
`public/index.html:35` declares `<div id="app"></div>`, and
`src/main.js:48,324` constructs the Vue root and calls `}).$mount('#app')`.
The current source-backed post-mount shell contract is
`DIV.q-layout-container.layout`, derived from `src/App.vue:1-5`,
`src/layouts/DefaultLayout.vue:1-2`, and Quasar `QLayout` `container` behavior.
The current source-backed route contract remains `src/router.js:273`
(`base: '/ripple/'`), `:325-328` (`/dashboard`, alias `/`, `requiresAuth`),
and `:1385-1409` (authenticated `/` or `/login` redirects to `/dashboard`).
The exact reviewed app-root contract is therefore `#app` in the top-level
document; it was not replaced with a runtime-invented selector.

Checkpointed implementation: `701748ed516d83aa09b88e6e2a9875cec726142c`.
Target-path
repair is COMPLETE; generic network-idle repair is COMPLETE; the post-mount
shell contract is source-backed and exact. The next retry will record
sanitized `origin`, `path`, `documentReadyState`, `topLevelPage`, `frameCount`,
`bootstrapMountSelector`, `bootstrapMountTargetPresent`,
`renderedShellSelector`, `renderedShellPresent`, `bodyPresent`, optional safe
`bodyChildCount`, `routeStable`, `routeStableMs`, `navigationInProgress`,
`pageClosed`, and `fatalPageErrorCount`, plus source reference, evaluation
timing/frame, Page-reference navigation count, child-frame shell count, and a
sanitized diagnosis. It does not record innerHTML, outerHTML, DOM dumps, text,
IDs, costs, bodies, storage, or identity. Replay is NOT RUN.

The corrected unauthenticated canary already passed:
`npm run observe:canary -- --env=dev`, run
`nightwatch-20260809T110122Z-4d4d`, against
`https://appdev.alphaus.cloud/ripple/`. Do not rerun it in this handoff.

The human safety review is complete and checkpointed. The exact guarded retry
command for a human, from an interactive terminal, is:

```bash
mkdir -p "$HOME/.nightwatch/auth"
npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Complete login/MFA manually in the headed browser, press ENTER in the
interactive terminal, and keep the storage state outside the workspace. Never
paste the file contents, credentials, tokens, or user identity into Nightwatch.

The external auth state is now **USER-CONFIRMED PRESENT** at
`$HOME/.nightwatch/auth/ripple-dev-state.json`. This checkpoint records only
the path and capture result; the file was not opened, printed, copied, or
persisted in Nightwatch.

Human interaction remains confined to the repaired parent CLI:

```bash
mkdir -p "$HOME/.nightwatch/auth"
npm run auth:capture -- \
  --env=dev \
  --output="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

The terminal must be interactive. After the preflight PASS, headed Chrome will
open through the mandatory proxy. The expected initial URL is exactly
`https://appdev.alphaus.cloud/ripple/`; a legitimate login redirect may show
the exact configured DEV auth host `logindev.alphaus.cloud` with a sanitized
path. A localhost, synthetic fixture, production, or unknown origin must
produce `TARGET_VERIFICATION` failure and must not print the ready message.
The human completes DEV login/MFA, waits for authenticated Ripple to be back on
the approved `appdev.alphaus.cloud/ripple/` path, presses ENTER in that same
terminal, and lets the CLI write and validate the external state. Do not
execute this login from an agent session and do not expose the file contents.

Expected sanitized stage sequence:

```text
PREFLIGHT, PROXY_START, PROXY_HEALTH, BROWSER_LAUNCH, GUARD_INSTALL,
TARGET_NAVIGATION, TARGET_VERIFICATION, HUMAN_WAIT,
POST_LOGIN_VERIFICATION, STORAGE_STATE_WRITE, PROVENANCE_WRITE,
STATE_VALIDATION, CLEANUP
```

The ready message appears only after TARGET_VERIFICATION PASS. If ENTER is
pressed before the approved authenticated Ripple landing is structurally
confirmed, the command must fail at `POST_LOGIN_VERIFICATION` with reason
`POST_LOGIN_NOT_CONFIRMED` and must not write state.

Exact fresh-session resume instruction after capture:

```bash
cd /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
npm run observe:gate -- --env=dev --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

The gate is local-only and must pass before any authenticated target
navigation. Existing sanitized all-144-repository snapshot comparisons found
no Alphaus snapshot or undocumented-repository condition. Do not run the
retry in this repair session. In the fresh session, do not begin Phase 2B or
approve any new hostname. If another hostname is unresolved, stop and
checkpoint.

Existence/non-empty verification, without reading the file:

```bash
test -s "$HOME/.nightwatch/auth/ripple-dev-state.json" && echo 'external auth state exists and is non-empty'
```

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route fresh session to Phase 2A | Added/updated |
| `.agent/tasks/phase-2a-controlled-observation/SPEC.md` | Frozen task intent | Added |
| `.agent/tasks/phase-2a-controlled-observation/PLAN.md` | Living milestones and validation | Added |
| `.agent/tasks/phase-2a-controlled-observation/STATE.md` | M0 checkpoint and next action | Added |
| `.agent/tasks/phase-2a-controlled-observation/REPORT.md` | Final handoff placeholder | Added |
| `bin/agent-state.mjs` | SHA baseline classification and approved checkpoint paths | Modified |
| `tests/unit/agent-state.test.ts` | Synthetic SHA semantic coverage | Modified |
| `.agent/README.md`, `.agent/PLANS.md`, `.agent/templates/STATE.template.md` | Document SHA semantics | Modified |
| `src/core/environment/types.ts`, `src/core/environment/index.ts` | Explicit API/auth config fields | Modified |
| `config/environments/*.json` | Verified real-target/API/auth host contract | Modified |
| `bin/observe-preflight.mjs`, `package.json` | No-network real-target preflight command | Added/modified |
| `tests/unit/target-preflight.test.ts` | Preflight fail-closed coverage | Added |
| `src/core/safety/redaction.ts`, `src/core/evidence/runRecorder.ts` | Authenticated metadata-only persistence | Modified |
| `src/browser/context.ts`, observers, Ripple journey/fetch guard | Apply minimized URL/text/error evidence | Modified |
| `tests/unit/evidence.test.ts`, `tests/unit/redaction.test.ts` | Synthetic privacy coverage | Modified |
| `tests/smoke/authenticated.smoke.ts` | Assert header/body-free authenticated evidence | Modified |
| `src/browser/fixtures/storageState.ts`, `tests/unit/storageState.test.ts` | External capture output validation | Modified |
| `bin/auth-capture.mjs`, `src/auth/directRunner.ts`, `playwright.config.ts`, `src/browser/contract.ts`, `src/browser/context.ts` | Parent-CLI Playwright Library API capture with canonical guarded context/proxy | Added/modified |
| `tests/manual/auth-capture.ts`, `playwright.capture.config.ts` | Removed competing Playwright Test worker capture path/config | Removed |
| `tests/unit/authCaptureLauncher.test.ts` | Regression: parent CLI has no Playwright Test discovery/worker stdin dependency | Modified |
| `playwright.capture.synthetic.config.ts`, `tests/manual/auth-capture.synthetic.ts` | Local-only synthetic direct-runner validation with test-only completion | Modified |
| `src/auth/stages.ts`, `tests/unit/authCaptureStages.test.ts` | Sanitized lifecycle stages, target verification, post-login readiness, and injected local failure coverage | Added |
| `src/browser/fixtures/fixtureServer.ts` | Synthetic login and authenticated destination fixture pages | Modified |
| `tsconfig.json` | Include the synthetic capture config in typechecking | Modified |
| `src/browser/contract.ts`, `playwright.config.ts`, `playwright.gate.config.ts` | Shared authenticated browser containment contract and isolated gate harness | Added/modified |
| `src/core/safety/realRunGate.ts`, `bin/observe-gate.mjs`, `tests/manual/observe-gate.ts`, `tests/unit/realRunGate.test.ts`, `package.json` | Fail-closed local pre-real-run gate and CLI | Added/modified |
| `tsconfig.json` | Typecheck dedicated gate config | Modified |
| `src/core/evidence/destinationManifest.ts`, `tests/unit/destinationManifest.test.ts` | Sanitized host-level runtime destination manifest | Added |
| `bin/observe-canary.mjs`, `playwright.canary.config.ts`, `tests/manual/phase2a-canary.ts`, `package.json` | Opt-in no-auth direct-navigation canary | Added/modified |
| `config/environments/dev.json`, `config/environments/next.json`, `tests/unit/safety.test.ts` | Explicit non-network block classification for approved Chromium background hosts | Modified |
| `config/environments/local.json`, `config/environments/dev.json`, `config/environments/next.json`, `src/core/environment/*`, `src/core/safety/*`, `src/proxy/*` | Exact optional support policy classification and fail-closed related-host behavior | Modified |
| `src/browser/network/fetchGuard.ts`, `src/browser/observers/networkObserver.ts`, `src/browser/observers/consoleObserver.ts`, `src/browser/observers/containmentEffect.ts`, `src/browser/context.ts` | Local blocking evidence and causal expected-containment console attribution | Modified/added |
| `src/core/evidence/destinationManifest.ts`, `src/core/evidence/types.ts`, `tests/unit/destinationManifest.test.ts`, `tests/unit/containmentEffect.test.ts`, `tests/unit/proxy.test.ts` | Distinct sanitized reporting and regression coverage | Modified/added |
| `src/state/run.ts`, `src/auth/stages.ts`, `src/auth/directRunner.ts`, `bin/auth-capture.mjs` | First-cause sanitized HUMAN_WAIT monitor taxonomy and CLI diagnostics | Modified |
| `src/browser/context.ts`, `src/browser/network/fetchGuard.ts`, `src/browser/observers/networkObserver.ts`, `src/browser/observers/containmentEffect.ts` | Proxy/lifecycle monitor evidence and exact expected telemetry console attribution | Modified |
| `tests/unit/monitor.test.ts`, `tests/unit/authCaptureStages.test.ts`, `tests/manual/auth-capture.synthetic.ts` | Local taxonomy, liveness, lifecycle, blocked-traffic, and multi-poll HUMAN_WAIT coverage | Added/modified |
| `bin/observe-authenticated.mjs`, `bin/observe-authenticated-config.mjs` | Preserve absent UI-override semantics between the authenticated CLI and gate; reject explicit blank overrides | Added/modified |
| `tests/unit/observeAuthenticatedRunner.test.ts`, `tests/unit/realRunGate.test.ts` | Synthetic runner-boundary and strict target-agreement regression coverage | Added/modified |
| `package.json`, `package-lock.json` | Pin local Vue `2.6.12` for the framework-semantic regression | Modified |
| `src/products/ripple/readiness.ts` | Distinguish the pre-mount `#app` target from the rendered `DIV.q-layout-container.layout` shell | Modified |
| `src/browser/observers/stability.ts` | Require rendered-shell structural readiness and reset the 750ms interval when it is absent | Modified |
| `tests/manual/phase2a-authenticated.ts` | Record sanitized bootstrap-target and post-mount rendered-shell diagnostics | Modified |
| `tests/unit/rippleReadiness.test.ts` | Vue 2.6.12 mount replacement and 20-case readiness/stability regression matrix | Modified |

### Phase 2A post-mount shell repair validation — 2026-08-11

Command: `npx tsc --noEmit`

Result: **PASS**. The repaired readiness and observer types compile with the
explicit bootstrap/rendered-shell terminology.

Command: `npx playwright test tests/unit/rippleReadiness.test.ts --project=nightwatch`

Result: **PASS; 20 passed, 0 failed**. Coverage includes the actual Vue
`2.6.12` `$mount('#app')` replacement fixture, pre-mount-placeholder-only
rejection, approved `/ripple/dashboard` target plus shell, delayed shell
appearance, 750ms continuous stability, route reset, missing shell, unrelated
path, production/unknown denial, recurring network activity, malformed-json
independence, and arbitrary body children without the rendered shell.

No real authenticated observation, replay, Alphaus request, production
traffic, mutation, database query, or external storage-state read occurred.

Command: `npx playwright test --reporter=line`

Result: **PASS; 179 passed, 0 failed**. The full suite used only local fixture,
loopback, and synthetic traffic; the opt-in authenticated observer was not
discovered. No authenticated target navigation occurred.

### Browser-background disposition implementation — `efe96bd37d33d6042038bb996a9f8cdbe6963992`

The canonical environment policy now classifies only the three reviewed exact
hosts as `BROWSER_BACKGROUND_GOOGLE`, `BROWSER_BACKGROUND_UPDATE`, and
`BROWSER_BACKGROUND_DOWNLOAD`. Policy, browser Fetch/console/network
containment, proxy summaries/events, sanitized destination manifests, and
monitor liveness all preserve the separate semantic classes. Focused tests
cover exact blocking, zero upstream connections, browser blocking, non-fatal
HUMAN_WAIT continuation, sanitized evidence, and fatal unknown/related-host
canaries. No wildcard or allowlist entry was added.

## Validation Ledger

Command: `npx playwright test tests/unit/rippleReadiness.test.ts tests/unit/observeAuthenticatedRunner.test.ts tests/unit/realRunGate.test.ts --project=nightwatch`
Result: **PASS; 24 passed, 0 failed**. Added coverage confirms source-backed
route semantics, exact host/path safety, `#app`-only structural readiness,
benign recurring traffic, route changes, fatal state, malformed-JSON
separation, target/app-root causal independence, and a fresh continuous
stability window after shell loss.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: **PASS** at implementation SHA
`4e74d56394b3971a5a1cc4ef14a8db3b2ea9b8e1`.
When: 2026-08-10

Command: `npx playwright test`
Result: **PASS; 172 passed, 0 failed**. The full suite used only local
synthetic/loopback traffic and did not discover the opt-in authenticated
observer. No real Alphaus request occurred during this repair.
When: 2026-08-10

Command: `npm run agent:check` and `git diff --check`
Result: **PASS**. `agent:check` passed with the expected stale-baseline
warning before this checkpoint was recorded; whitespace validation passed.
When: 2026-08-10

Command: `npx playwright test tests/unit/rippleReadiness.test.ts tests/unit/observeAuthenticatedRunner.test.ts tests/unit/realRunGate.test.ts --project=nightwatch`
Result: **PASS; 21 passed, 0 failed**. The synthetic matrix covers the
source-proven `/ripple/` entry, `/ripple/dashboard` landing, another Ripple
sub-route, unrelated same-host paths, auth-host redirects, production and
unknown policy denial, source-backed `#app` structure, route changes,
disappearing root, fatal page/browser state, blocked telemetry/Pylon/background
traffic, malformed-JSON separation, and target/app-root causal independence.
No browser target or external state was used.
When: 2026-08-10

Command: `npx playwright test tests/unit/rippleReadiness.test.ts
--project=nightwatch`
Result: **PASS; 16 passed, 0 failed**. Added coverage proves the exact
current-source reference, wrong-selector rejection, early document timing,
wrong-frame/unavailable-document/unresolved-divergence diagnoses, route-change
progress, shell interruption reset, recurring-network independence, and
malformed-oracle separation.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: **PASS** at implementation SHA `3b52b58`.
When: 2026-08-10

Command: `npx playwright test --reporter=line`
Result: **PASS; 175 passed, 0 failed**. The suite used only local fixture,
loopback, and synthetic traffic; the opt-in authenticated observer was not
discovered.
When: 2026-08-10

Command: `npm run agent:check` and `git diff --check`
Result: **PASS**. The agent check showed the expected stale-baseline warning
while the implementation commit preceded this documentation checkpoint;
whitespace validation passed.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: **PASS** at implementation SHA
`ed337d75966f8af20130df32e084459da74dff50`.
When: 2026-08-10

Command: `npx playwright test`
Result: **PASS; 171 passed, 0 failed**. The ordinary suite used only local
synthetic/loopback traffic and did not discover the opt-in authenticated
observer. No real Alphaus request occurred during the repair.
When: 2026-08-10

Command: `npm run agent:check` and `git diff --check`
Result: **PASS**. Before the implementation checkpoint, agent-check reported
the expected stale-baseline warning; after implementation and state updates it
must report only the approved documentation checkpoint advance. Whitespace
validation passed.
When: 2026-08-10

Command: `npm run observe:authenticated -- --env=dev --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"`
Result: **USER_ACTION_REQUIRED / STOP AFTER FIRST PASS**. The local
pre-real-run gate passed all 13 checks. The first guarded authenticated
observation reached the approved DEV origin and closed its context, but the
sanitized readiness result was unsuccessful: final path `/ripple/dashboard`,
`targetConfirmed=false` against the configured `/ripple/` path,
`stabilityReached=false`, and `appRootPresent=false`. Replay was prohibited by
the runner. Run ID: `nightwatch-20260810T092636Z-de97-first`; comparison
records `replay-not-run`. Destination summary was 4 expected, 7 blocked, 0
new-but-verified, 0 unresolved; proxy violations and production attempts were
0. The known malformed-JSON anomaly recurred twice as metadata-only evidence
for `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>` with HTTP 200 and
`application/json`; it remained an oracle anomaly, not a safety failure. No
body content was inspected or persisted.
When: 2026-08-10

Command: category-level privacy review of the generated first-pass and
comparison artifacts
Result: **PASS**. The reviewed artifact files contained no credential-like
values, authorization/token/JWT material, cookie or Set-Cookie material,
storage-state material, user email/display-name values, raw account/resource
IDs, raw request/response bodies, or financial values. Screenshots, traces, and
DOM dumps were absent. Review used counts/category results only; no secret
value was printed. The external storage-state file was not opened.
When: 2026-08-10

Command: `npx tsc --noEmit`, `npx playwright test`, `npm run agent:check`,
and `git diff --check`
Result: **PASS**. TypeScript passed; the ordinary local/synthetic Playwright
suite passed **159/159**; the continuity validator passed with the expected
approved state-only `CHECKPOINT_ADVANCE` warning from implementation SHA
`868b639fb6a5374bea6af99e70e570f398e3e448` to the documentation checkpoint;
and whitespace validation passed. The ordinary suite does not discover the
real authenticated observation test, so no additional authenticated target
navigation occurred.
When: 2026-08-10

Command: `npm run observe:gate -- --env=dev --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"`
Result: **USER_ACTION_REQUIRED / STOP**; the local pre-real-run gate exited
non-zero before authenticated context creation or target navigation.
When: 2026-08-09
Relevant failure/output summary: all environment, target, API/auth contract,
production-deny, proxy, browser-containment, authenticated-evidence, and
passive-action checks passed. Exact sanitized blockers were
`authentication-state: external storage state is missing, invalid, or has
mismatched provenance` and `repository-freshness: repository freshness
snapshot is missing/invalid or contains undocumented changes`. The supplied
storage-state path was used only as a path; its contents were not inspected,
printed, copied, summarized, or persisted. No authenticated observation was
attempted.

Command: `git status --short --branch` and `git rev-parse HEAD`
Result: PASS; clean `main` at the reconciled starting SHA before task-state
files were created.
When: 2026-08-09
Relevant failure/output summary: HEAD is the expected Phase 1.3 handoff; the
only prior descendant changes are approved continuity/documentation state files.

Command: Phase 1.3 handoff inspection
Result: PASS; `git diff 1994eaca..3a271218 --name-status` shows only
`.agent/ACTIVE_TASK.md`, Phase 1.3 `STATE.md`, and Phase 1.3 `REPORT.md`.
When: 2026-08-09
Relevant failure/output summary: no implementation/source/test/config drift.

Command: `npm run agent:check` after M1 implementation
Result: PASS with one expected `STALE` warning; the validator detects the
uncommitted implementation/test changes after the recorded baseline without
rewriting state.
When: 2026-08-09
Relevant failure/output summary: warning is intentional until this milestone's
implementation is committed/checkpointed; no invariant error occurred.

Command: `git diff --check`
Result: PASS; no whitespace errors.
When: 2026-08-09
Relevant failure/output summary: task-state setup is cleanly formatted.

Command: `npx playwright test tests/unit/target-preflight.test.ts tests/unit/safety.test.ts`
Result: PASS; 24 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: configured dev/next targets pass; production,
duplicate selection, unknown/mismatched hosts, and sensitive URL forms fail closed.

Command: `npm run observe:preflight -- --env=dev`
Result: PASS; output is sanitized metadata only and explicitly states no
DNS/TCP/browser activity and that authentication is not required.
When: 2026-08-09
Relevant failure/output summary: target `appdev.alphaus.cloud` and explicit
API/auth host sets validated from local config; no network was attempted.

Command: `npx tsc --noEmit`
Result: PASS; no TypeScript errors after environment contract changes.
When: 2026-08-09
Relevant failure/output summary: none.

Command: `npx playwright test tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts`
Result: PASS; 15 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: external non-existing JSON output accepted;
relative, in-workspace, and overwrite paths rejected; target preflight remains
no-network.

Command: `npm run auth:capture -- --help`
Result: PASS; printed only safe usage/manual-auth instructions.
When: 2026-08-09
Relevant failure/output summary: no browser or target contact.

Command: `npm run auth:capture -- --env=dev --output=relative.json`
Result: PASS-as-rejection; exited 2 before preflight/browser launch because the
output path was not absolute.
When: 2026-08-09
Relevant failure/output summary: no file was created and no secret was printed.

Command: `npx playwright test tests/unit/evidence.test.ts tests/unit/redaction.test.ts tests/smoke/authenticated.smoke.ts`
Result: PASS; 22 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: synthetic auth state never entered artifacts;
headers/bodies/query values/path IDs were absent or minimized; screenshot was
not created; trace remained absent.

Command: `npx playwright test tests/unit/realRunGate.test.ts --project=nightwatch`
Result: PASS; 6 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: pure contract checks and a loopback-only
runtime proxy-health check passed. Synthetic state used fake values only; no
Alphaus DNS/TCP/browser activity occurred.

Command: `npx tsc --noEmit` and `git diff --check` after M5
Result: PASS.
When: 2026-08-09
Relevant failure/output summary: the dedicated gate config is included in the
typecheck; no whitespace errors.

Command: `npm run observe:preflight -- --env=dev`
Result: PASS; verified `appdev.alphaus.cloud`, API/auth host contracts, and
explicit production denial; output states no DNS/TCP/browser activity.
When: 2026-08-09
Relevant failure/output summary: no authentication state was required and no
real environment was contacted.

Command: `npm run observe:gate -- --help`
Result: PASS; printed the safe local-only gate usage.
When: 2026-08-09
Relevant failure/output summary: no browser context or selected target was
opened.

Command: `NIGHTWATCH_TRACKED_REPOS=nightwatch npm run observe:gate -- --env=dev --storage-state=/tmp/nightwatch-phase-2a-missing-state.json`
Result: PASS-as-rejection; the command exited non-zero with precise
`authentication-state` and `repository-freshness` failures while the local
proxy checks passed.
When: 2026-08-09
Relevant failure/output summary: missing external state was not opened or
printed; no target was contacted. The initial manual-test discovery issue was
repaired with a dedicated `playwright.gate.config.ts` before this validation.

Command: `npx playwright test tests/unit/destinationManifest.test.ts tests/unit/realRunGate.test.ts --project=nightwatch`
Result: PASS; 9 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: manifest category separation, no-query
serialization, explicit verified-host handling, authenticated-gate state
requirements, and unauthenticated-canary state absence all passed locally.

Command: `npx playwright test --config=playwright.canary.config.ts --list --project=nightwatch`
Result: PASS; exactly one dedicated canary test was discovered.
When: 2026-08-09
Relevant failure/output summary: no browser or target activity was performed.

Command: first `npm run observe:canary -- --env=dev` attempt
Result: PASS-as-safe-rejection; no-network preflight passed, then the wrapper
stopped with `No tests found` before browser launch because the canary test file
was missing from the implementation checkpoint.
When: 2026-08-09
Relevant failure/output summary: no real target was contacted. The missing
test was added, dedicated discovery passed, and a new implementation
checkpoint was created before retrying.

Command: second `npm run observe:canary -- --env=dev` attempt
Result: PASS-as-safe-rejection; no-network preflight passed, the loopback proxy
and all browser/evidence/action checks passed, then the pre-auth gate stopped
before navigation because the Alphaus repository snapshot contained
pre-existing dirty worktrees.
When: 2026-08-09
Relevant failure/output summary: the Nightwatch tree was clean and the
sanitized `repositories.json` recorded the baseline dirty entries; no real
Ripple page or target request was made. The gate was repaired to require a
valid read-only Alphaus snapshot rather than an incorrectly strict clean-tree
condition.

Command: third `npm run observe:canary -- --env=dev` attempt; run ID
`nightwatch-20260809T075124Z-cf0a`
Result: REAL RUNTIME OBSERVATION completed the explicit dev preflight and
pre-auth gate, reached `appdev.alphaus.cloud` once through the loopback proxy,
and stopped with a failed canary verdict because two Chromium background
destinations were unresolved.
When: 2026-08-09
Relevant failure/output summary: sanitized manifest recorded 1 expected UI
host, 2 telemetry-blocked Google hosts, and unresolved denied
`clients2.google.com` plus `safebrowsingohttpgateway.googleapis.com`. Proxy
summary was 1 allowed, 5 telemetry-blocked, 0 denied, 0 violations. The UI
response was HTTP 404 with a generic console-error oracle. No storage state,
credentials, screenshots, traces, request bodies, or production upstream
connections were used. The run stopped as required; no allowlist was changed.

Command: local post-failure hardening checks
Result: PASS; Safe Browsing/background launch restrictions and dedicated
canary/gate test discovery were updated; `npx tsc --noEmit`, `git diff --check`,
and focused destination/gate tests remained green. No retry was made before
the implementation checkpoint `f5c4abb6dac6044961763e76ad4fd3f4310b2f33`.
When: 2026-08-09
Relevant failure/output summary: dedicated configs each discover exactly one
manual test; no additional real target activity occurred during the fix.

Command: `npx playwright test tests/unit/safety.test.ts --project=nightwatch`,
`npx tsc --noEmit`, and `git diff --check` after the approved block
classification
Result: PASS; **21 safety tests passed**, typecheck passed, and no whitespace
errors were reported. The two approved hosts are explicitly present only in
`dev`/`next` `telemetryHosts`, absent from `allowedHosts`, and policy decisions
are `block-telemetry`.
When: 2026-08-09
Relevant failure/output summary: no browser, DNS, TCP, or target activity was
performed by this validation.

Command: `npm run observe:canary -- --env=dev`
Result: PASS; run ID `nightwatch-20260809T080408Z-7b9e` passed no-network
preflight, the full pre-auth gate, and the direct unauthenticated canary. The
sanitized manifest recorded 1 expected UI host, 4 blocked telemetry hosts, 0
new-but-verified hosts, and 0 unresolved hosts. The proxy summary was 1
allowed, 4 telemetry-blocked, 0 denied, and 0 violations. No storage state was
loaded and no authenticated observation was started.
When: 2026-08-09
Relevant failure/output summary: selected UI returned HTTP 404 and produced
one generic `console-error` oracle; `summary.json.passed` remained true. No
production destination, unknown destination, DNS/TCP violation, request body,
credential, screenshot, or trace was recorded.

Command: sanitized privacy review of
`artifacts/nightwatch-20260809T080408Z-7b9e`
Result: PASS; artifact directory contained only the expected sanitized JSONL
and JSON files, with zero bearer-token, JWT-like, cookie/authorization, or
request/response-body pattern hits; trace and screenshot outputs were absent.
When: 2026-08-09
Relevant failure/output summary: artifacts remain local/ignored and contain no
auth state or customer data.

Command: fourth `npm run observe:canary -- --env=dev` attempt; run ID
`nightwatch-20260809T075359Z-0a6d`
Result: USER_ACTION_REQUIRED; the fresh run passed preflight and the full
pre-auth gate, reached only the selected dev UI host through the proxy, and
again stopped on the same two unresolved Chromium background destinations.
When: 2026-08-09
Relevant failure/output summary: Safe Browsing launch restrictions did not
eliminate the attempts. The sanitized manifest again recorded 1 expected UI
host, 2 telemetry-blocked hosts, and unresolved denied
`clients2.google.com` and `safebrowsingohttpgateway.googleapis.com`; no
authenticated state or production upstream connection occurred.

Command: `npx playwright test`
Result: PASS; 121 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: the ordinary suite exercised only local
fixtures and unit tests; the opt-in manual canary was not included.

Command: authenticated-artifact privacy review for real canary runs
`nightwatch-20260809T075124Z-cf0a` and `nightwatch-20260809T075359Z-0a6d`
Result: PASS for persisted-secret checks. Both artifacts had 0 bearer-token,
JWT-like, cookie, authorization-header, request/response-body, trace, or
screenshot hits. A broad customer-domain keyword check matched only generic
policy/schema words in `manifest.json`/`repositories.json`, not customer
values; no real sensitive value was printed or added to this state.
When: 2026-08-09
Relevant failure/output summary: artifacts remain ignored/local-only and no
storage-state file was used.

Command: narrow Ripple routing/build configuration review for the M6 404
Result: TARGET_URL_CORRECTION_REQUIRED. Nightwatch `config/environments/dev.json`
currently selects `https://appdev.alphaus.cloud` without a path. The already-
known Ripple source defines the Vue Router base as
`process.env.VUE_APP_PUBLIC_PATH || '/ripple/'` (`src/router.js`), and
`vue.config.js` selects `/ripple/` for development, next, and production builds.
The router's unauthenticated login route and authenticated dashboard alias are
therefore under that base. The exact corrected dev target is
`https://appdev.alphaus.cloud/ripple/`. No browser, DNS, TCP, auth, or allowlist
change was performed during this review.
When: 2026-08-09
Relevant failure/output summary: the configured host root is not the intended
Ripple document route; do not begin manual auth capture until the explicit path
is corrected and the no-auth preflight/canary is rerun.

Command: corrected target guard validation
Result: PASS; `npx playwright test tests/unit/target-preflight.test.ts tests/unit/realRunGate.test.ts tests/unit/safety.test.ts --project=nightwatch` => **32 passed, 0 failed**; `npx tsc --noEmit` => PASS; `git diff --check` => PASS. The configured target is exactly `https://appdev.alphaus.cloud/ripple/`; same-host root-path overrides fail closed; no browser, DNS, TCP, auth, or allowlist activity occurred.
When: 2026-08-09
Relevant failure/output summary: production deny policy and the two explicitly blocked Chromium telemetry destinations remain unchanged.

Command: `npm run observe:canary -- --env=dev`
Result: USER_ACTION_REQUIRED; run ID `nightwatch-20260809T103326Z-5feb` passed
the no-network preflight and all 13 pre-real-run checks, reached
`https://appdev.alphaus.cloud/ripple/`, and received HTTP 200. The final
sanitized URL remained `/ripple/` with no redirect chain. The destination
manifest recorded 3 expected, 0 new-but-verified, 7 blocked telemetry, and 1
unresolved destination. New unclassified blocker: `widget.usepylon.com`
appeared twice, was denied by the browser Fetch guard, and produced no proxy
upstream violation. Proxy summary: 3 allowed, 6 telemetry-blocked, 0 denied,
0 unknown, 0 violations; production attempts: 0. No storage state, auth,
credentials, DB access, mutation, screenshot, or trace was used.
When: 2026-08-09
Relevant failure/output summary: two category-only console-error oracles were
observed near the blocked third-party widget and are classified as
safety-blocked third-party behavior, not as an auth-state or product bug.

Command: final local validation and scope checks
Result: PASS; `npx tsc --noEmit` => PASS; `npx playwright test` => **122 passed,
0 failed**; `npm run agent:check` => PASS with the expected approved
state-only `CHECKPOINT_ADVANCE` warning; `git diff --check` => PASS.
The canary-start Alphaus snapshot comparison checked all 144 repositories with
0 HEAD or dirty-file-count mismatches. The expected external auth-state path
`$HOME/.nightwatch/auth/ripple-dev-state.json` is absent and
`NIGHTWATCH_STORAGE_STATE` is unset; no auth state is loaded.
When: 2026-08-09
Relevant failure/output summary: the Nightwatch tree is clean after the stop
checkpoint; the workspace root and Alphaus repositories retain only their
pre-existing user changes, and no Alphaus repository was modified by this
task.

Command: narrow Ripple Pylon source verification plus focused implementation
tests
Result: PASS; current `mobingilabs/ripple-ui` branch `dev` at source SHA
`d80b161b684d9153c7e5acaa65ae1752d93d8ba9` proves an asynchronous optional
chat-widget integration in `src/main.js`/`src/pylon.js`; directly named Ripple
MFE/shared UI repositories have no Pylon matches. `npx playwright test
tests/unit/safety.test.ts tests/unit/proxy.test.ts
tests/unit/destinationManifest.test.ts tests/unit/containmentEffect.test.ts
--project=nightwatch` => **30 passed, 0 failed**; `npx tsc --noEmit` => PASS;
`git diff --check` => PASS. No Alphaus source was modified.

Command: `git commit -m "fix: classify optional Pylon support containment"`
Result: PASS; implementation, focused tests, and task checkpoint committed at
`46f5817b5c2a8180affb1c0a5edc7454480a34ad`; Nightwatch tree clean afterward.
When: 2026-08-09
Relevant failure/output summary: no Alphaus repository or workspace-root file
was included in the Nightwatch commit.

Command: corrected `npm run observe:canary -- --env=dev`
Result: PASS; run ID `nightwatch-20260809T110122Z-4d4d` passed preflight, all
13 pre-real-run checks, and direct unauthenticated navigation to
`https://appdev.alphaus.cloud/ripple/`. HTTP status was `200`, final path was
`/ripple/`, and no redirect occurred. The sanitized destination manifest
recorded 3 expected, 0 new-but-verified, 8 blocked, and 0 unresolved groups.
The exact Pylon group was one `OPTIONAL_THIRD_PARTY_SUPPORT` block with
`block-optional-support`; related hosts were not approved. Proxy summary was
3 allowed, 7 telemetry-blocked, 0 optional-support-blocked, 0 denied, 0
unknown, and 0 violations. Production attempts: 0. The browser Fetch guard
blocked Pylon before proxy/upstream contact. No storage state, auth,
credentials, DB access, mutation, screenshot, or trace was used.
When: 2026-08-09
Relevant failure/output summary: Pylon console effects were recorded as
`EXPECTED_CONTAINMENT_EFFECT`; unrelated console errors remained normal
oracle events. The artifact's sanitized evidence contains no identity values
or credentials.

Command: final Phase 2A handoff validation and read-only scope checks
Result: PASS; `npx tsc --noEmit` passed; `npx playwright test` => **126
passed, 0 failed**; `npm run agent:check` passed with the expected approved
state-only `CHECKPOINT_ADVANCE` warning; and `git diff --check` passed. The
canary repository snapshot comparison covered all 144 Alphaus repositories
with 0 HEAD or dirty-file-count mismatches. The canary artifact secret scan
found 0 credential-like patterns and Pylon URLs were sanitized to the
`<ID>` placeholder. The external auth-state path is absent,
`NIGHTWATCH_STORAGE_STATE` is unset, and `proxy.jsonl` contains no Pylon
event. No Alphaus repository was modified.
When: 2026-08-09
Relevant failure/output summary: the Nightwatch tree contains only the three
documented handoff-state changes before the checkpoint commit; no authenticated
observation was executed.

Command: `npx playwright test --config=playwright.capture.config.ts tests/manual/auth-capture.ts --project=nightwatch --list`
Result: PASS; exactly one intended manual capture test was discovered.
When: 2026-08-09
Relevant failure/output summary: no browser or target activity occurred.

Command: `npx playwright test tests/manual/auth-capture.ts --project=nightwatch --list`
Result: EXPECTED FAILURE REPRODUCED; the default config listed zero tests and
returned Playwright's `No tests found` error.
When: 2026-08-09
Relevant failure/output summary: this proves the exact root cause was default
`testMatch` filtering, not a missing file, cwd, or path-construction problem.

Command: `npx playwright test tests/unit/authCaptureLauncher.test.ts tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts tests/unit/realRunGate.test.ts --project=nightwatch`
Result: PASS; **23 passed, 0 failed**.
When: 2026-08-09
Relevant failure/output summary: discovery, external output-path validation,
no-network preflight contracts, and local gate contracts passed.

Command: `NIGHTWATCH_ENV=local NIGHTWATCH_STORAGE_STATE='' npx playwright test --config=playwright.capture.synthetic.config.ts tests/manual/auth-capture.synthetic.ts --project=nightwatch --headed --repeat-each=3`
Result: PASS; **3 passed, 0 failed**.
When: 2026-08-09
Relevant failure/output summary: the synthetic login and authenticated
destination executed through the guarded loopback proxy/context; a temporary
external storage state was structurally validated, provenance/evidence policy
was created, fake login values were absent from Nightwatch artifacts, and
production plus a separate unknown host remained denied. The exact observed
system-Chrome control-plane host `redirector.gvt1.com` was blocked locally as
non-fatal telemetry only in the in-memory synthetic policy; no real environment
config or allowlist was changed.

Command: `npx playwright test`
Result: PASS; **127 passed, 0 failed**.
When: 2026-08-09
Relevant failure/output summary: the ordinary suite remained local/synthetic;
the human capture helper was not executed.

Command: `npx tsc --noEmit`, `npm run observe:preflight -- --env=dev`,
`npm run auth:capture -- --help`, and `git diff --check`
Result: PASS. The DEV preflight reported the approved
`https://appdev.alphaus.cloud/ripple/` target and explicitly performed no
DNS/TCP/browser activity; auth help performed no browser activity; typecheck
and whitespace checks were clean.
When: 2026-08-09
Relevant failure/output summary: existence-only verification reported the real
external state path as MISSING. No real Alphaus request, production request,
DB query, mutation, credential handling, or real storage-state creation
occurred.

Command: direct-runner implementation checkpoint
Result: PASS; implementation committed at
`963128f4772db6e6c790cdc8cbb464c382cad8df`.
When: 2026-08-10
Relevant failure/output summary: the old real Playwright Test helper and
dedicated real-capture config were removed. `bin/auth-capture.mjs` now owns
the parent TTY and invokes the direct Playwright Library API runner. No target,
credential, MFA, database, mutation, or external auth state was used.

Command: `NIGHTWATCH_ENV=local NIGHTWATCH_STORAGE_STATE='' npx playwright test --config=playwright.capture.synthetic.config.ts tests/manual/auth-capture.synthetic.ts --project=nightwatch --reporter=list`
Result: PASS; **1 passed, 0 failed**.
When: 2026-08-10
Relevant failure/output summary: direct runner launched Chrome, used an
ephemeral mandatory loopback proxy, reached the local approved fixture,
completed through the explicit synthetic test-only callback, wrote and
structurally validated temporary external state, recorded compatible sanitized
provenance, retained authenticated trace-off/metadata-first evidence, and
kept fake credentials out of artifacts. Direct target validation denied the
production and unknown synthetic destinations. No Alphaus traffic occurred.

Command: `npx playwright test tests/unit/authCaptureLauncher.test.ts tests/unit/storageState.test.ts --project=nightwatch --reporter=list`
Result: PASS; **12 passed, 0 failed**.
When: 2026-08-10
Relevant failure/output summary: regression proves the launcher has no
Playwright Test discovery or worker-stdin path, and existing external output
path protections remain green.

Command: `npm run auth:capture -- --env=dev --output=/tmp/nightwatch-auth-capture-cli-probe-20260810.json`
Result: PASS-as-safe-rejection; no-TTY parent probe printed PASS preflight,
loaded the direct runner, and stopped with `USER_ACTION_REQUIRED` before
browser launch. The output state did not exist.
When: 2026-08-10
Relevant failure/output summary: this verified the TTY check is in the parent
CLI. It made no Alphaus request and created no auth state.

Command: `npm run auth:capture -- --help`
Result: PASS; safe usage/manual-interaction text only; no browser or network.
When: 2026-08-10

Command: `npx tsc --noEmit`; `npx playwright test`; `git diff --check`
Result: PASS; typecheck passed, ordinary suite **127 passed, 0 failed**, and
no whitespace errors were reported.
When: 2026-08-10
Relevant failure/output summary: the ordinary suite contains no real capture
test; all traffic was local synthetic/test traffic. The focused direct-runner
test is recorded separately above.

Command: human execution of the repaired direct auth-capture command
Result: **POST-LAUNCH FAILURE OBSERVED**; the no-network preflight passed with
target `https://appdev.alphaus.cloud/ripple/`, the approved UI host and API/
auth host lists, and explicit production denial. A headed Chrome window opened.
The human saw a page resembling `testing...`; the command then ended with the
old generic failure and no successful sanitized state. This run occurred
outside Codex; no credentials, MFA values, state contents, or artifacts were
provided to Nightwatch/Codex.
When: 2026-08-10
Relevant failure/output summary: the old implementation had no stage reporter,
did not verify `page.url()` before its ready message, and caught all
post-launch errors as one generic line. The exact old failing stage is not
recoverable from that output.

Command: source and synthetic isolation review plus new stage regression
Result: PASS. Real CLI mode accepts only `dev|next`, resolves the canonical
DEV target from the selected config, does not load the synthetic Playwright
config, ignores ambient `NIGHTWATCH_UI_URL` for runner target selection, and
rejects synthetic completion unless `testOnly && local`. No Nightwatch source
contains or serves `testing...`. Synthetic tests prove real-mode loopback
rejection and stage-specific sanitized origin/path mismatch output.
When: 2026-08-10

Command: `NIGHTWATCH_ENV=local NIGHTWATCH_STORAGE_STATE='' npx playwright test --config=playwright.capture.synthetic.config.ts tests/manual/auth-capture.synthetic.ts --project=nightwatch --reporter=list`
Result: PASS; **1 passed, 0 failed**. The successful synthetic direct lifecycle
covered proxy start/health, browser launch, guard install, navigation and URL
verification, explicit test completion, post-login structural readiness,
state write, provenance write, validation, and cleanup. The run used loopback
fixture traffic and temporary state only; no Alphaus traffic occurred.
When: 2026-08-10

Command: `npx playwright test tests/unit/authCaptureStages.test.ts tests/unit/authCaptureLauncher.test.ts --project=nightwatch --reporter=list`
Result: PASS; **6 passed, 0 failed**. Coverage includes canonical DEV versus
synthetic target resolution, target mismatch, navigation failure, human-wait
failure, storage-write failure, state-validation failure, post-login
not-confirmed, parent-TTY isolation, cleanup, and absence of injected
synthetic secret-like text from stage diagnostics.
When: 2026-08-10

Command: no-TTY direct CLI probe and `node --check bin/auth-capture.mjs`
Result: PASS-as-safe-rejection; the CLI printed PREFLIGHT START/PASS, then
rejected before browser launch with `USER_ACTION_REQUIRED`; no output state
was created. JavaScript syntax validation passed.
When: 2026-08-10

Command: `npx tsc --noEmit && npx playwright test`
Result: PASS; typecheck passed and the full suite passed **132/132**. The
ordinary suite used only local/synthetic fixtures; no authenticated real
observation was run.
When: 2026-08-10

Command: `git diff --check`
Result: PASS; implementation checkpoint committed at
`af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef`.
When: 2026-08-10

Command: final checkpoint validation — `npm run agent:check`,
`npx tsc --noEmit`, `git diff --check`, and clean-tree check
Result: PASS. `agent:check` reported the expected approved state-only
`CHECKPOINT_ADVANCE` warning from implementation SHA `af3c3a7` to task-state
HEAD `9ee48446178ec507ba39a6cf39d8c04a4148e8df`; no source/test/config drift
was reported. The Nightwatch tree is clean. The existence-only auth-state
check reports missing or empty; no state contents were inspected.
When: 2026-08-10

Command: sanitized failed-capture evidence inspection
Result: PASS; run `nightwatch-20260810T034113Z-02f7` reached the approved DEV
target and failed during HUMAN_WAIT after five outer-proxy `deny` events for
new external Chrome destinations. The exact recovered monitor subreason is
`UNKNOWN_DESTINATION`; proxy liveness remained healthy. No bodies, headers,
cookies, tokens, credentials, or storage state were inspected.
When: 2026-08-10

Command: `npx playwright test tests/unit/authCaptureStages.test.ts tests/unit/monitor.test.ts --project=nightwatch`
Result: PASS; **11 passed, 0 failed**. Coverage includes liveness,
unknown/production destination, approved auth-host, page lifecycle, and the
sanitized monitor taxonomy.
When: 2026-08-10

Command: `npx playwright test --config=playwright.capture.synthetic.config.ts --project=nightwatch tests/manual/auth-capture.synthetic.ts`
Result: PASS; **1 passed, 0 failed**. HUMAN_WAIT exercised at least three
controlled proxy-health polls; expected telemetry and exact Pylon support
blocks remained non-fatal, and synthetic external state writing/validation
passed.
When: 2026-08-10

Command: `npx tsc --noEmit` and `git diff --check`
Result: PASS; implementation checkpoint
`342584c2be349924399af281bf18cfb9029dc3ba`.
When: 2026-08-10

Command: focused Phase 2A policy/monitor/direct-runner tests
`npx playwright test tests/unit/safety.test.ts tests/unit/proxy.test.ts
tests/unit/containmentEffect.test.ts tests/unit/destinationManifest.test.ts
tests/unit/monitor.test.ts tests/unit/authCaptureStages.test.ts --project=nightwatch`
Result: PASS; **47 passed, 0 failed**. Coverage proves each exact reviewed
host has its separate semantic classification, `BLOCK` policy, no upstream
proxy connection, browser containment, non-fatal expected containment during
HUMAN_WAIT, sanitized evidence, and no UNKNOWN classification. Related and
structurally similar unapproved hosts remain UNKNOWN and fatal; existing
telemetry, Pylon, unknown, and production behavior remains covered.
When: 2026-08-10

Command: `npx playwright test --config=playwright.capture.synthetic.config.ts`
Result: PASS; **1 passed, 0 failed**. The direct runner exercised local
HUMAN_WAIT continuation with the exact browser-background blocks and no
external upstream traffic.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: PASS; implementation SHA
`efe96bd37d33d6042038bb996a9f8cdbe6963992`.
When: 2026-08-10

Command: `npx playwright test`
Result: PASS; **144 passed, 0 failed**. The full suite used local/synthetic
traffic only; no authenticated observation was run. Exact Google background
requests in synthetic coverage were contained locally and did not establish
upstream connections.
When: 2026-08-10

Command: implementation review and `git diff --check`
Result: PASS; no Alphaus repository was modified, no real Alphaus traffic,
Google upstream contact, production traffic, database query, mutation,
credential use, or auth state generation occurred in this implementation
session. The implementation commit is
`efe96bd37d33d6042038bb996a9f8cdbe6963992`.
When: 2026-08-10

Command: implementation commit `6443baf` validation
Result: PASS; `npx playwright test tests/unit/passiveChecks.test.ts
tests/unit/monitor.test.ts tests/unit/authCaptureStages.test.ts --project=nightwatch`
=> **20 passed, 0 failed**; `npx playwright test
--config=playwright.capture.synthetic.config.ts` => **1 passed, 0 failed**;
`npx playwright test --reporter=line` => **153 passed, 0 failed**;
`npx tsc --noEmit` => PASS; `git diff --check` => PASS. All traffic was local
fixture traffic only; no authenticated real observation ran.
When: 2026-08-10

Command: `npx playwright test tests/unit/passiveChecks.test.ts
tests/unit/monitor.test.ts tests/unit/authCaptureStages.test.ts --project=nightwatch`
Result: PASS; **20 passed, 0 failed**. Coverage proves valid/invalid JSON,
HTML/text non-applicability, NDJSON streaming separation, 204/empty handling,
redirect handling, incomplete-capture handling, oracle/safety separation,
non-fatal HUMAN_WAIT continuation with sanitized anomaly evidence and state
write, plus fatal production/unknown destination and proxy-liveness behavior.
All traffic was local fixture traffic only.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: PASS; the oracle applicability and safety-severity repair typechecks.
When: 2026-08-10

Command: `npx playwright test tests/unit/observeAuthenticatedRunner.test.ts tests/unit/realRunGate.test.ts --project=nightwatch`
Result: PASS; **11 passed, 0 failed**. Synthetic runner-boundary coverage proves
that the normal `--env=dev --storage-state=...` argument shape omits
`NIGHTWATCH_UI_URL`, resolves the canonical DEV target, preserves an explicit
canonical override, and rejects an explicit blank override. Strict gate cases
reject NEXT, production, HTTP, unknown-host, and blank targets.
When: 2026-08-10

Command: `env NIGHTWATCH_UI_URL=https://next.alphaus.cloud/ NIGHTWATCH_TRACKED_REPOS=nightwatch npm run observe:authenticated -- --env=dev --storage-state=/tmp/nightwatch-synthetic-missing-state.json`
Result: PASS-as-safe-rejection; the actual authenticated wrapper's local gate
reported `target-agreement: PASS` and stopped before browser/context creation
because the synthetic state path was missing and the current implementation
worktree was not yet documented. The conflicting ambient UI variable did not
override the canonical DEV target. No target was contacted.
When: 2026-08-10

Command: `npx tsc --noEmit`
Result: PASS at implementation SHA `868b639fb6a5374bea6af99e70e570f398e3e448`.
When: 2026-08-10

Command: first `npx playwright test`
Result: PASS-as-retry-required; one local proxy-start failure and one existing
redaction test failure occurred in the first run; the redaction test passed on
retry. No target or authenticated activity occurred.
When: 2026-08-10

Command: fresh `npx playwright test`
Result: PASS; **159 passed, 0 failed**. The suite used local/synthetic traffic
only; no authenticated observation was run.
When: 2026-08-10

Command: implementation commit and `git diff --check`
Result: PASS; implementation SHA is
`868b639fb6a5374bea6af99e70e570f398e3e448`. Only Nightwatch files changed;
no Alphaus repository, real Alphaus endpoint, database, mutation, storage
state, or authenticated browser navigation was used.
When: 2026-08-10

## Decisions Made During This Task

Decision: Use exactly one task directory, `phase-2a-controlled-observation`,
and set its starting baseline to current HEAD `3a271218...`.
Reason: the Phase 1.3 task is complete and the requested work must have a new
active task with no continuity ambiguity.
Evidence/constraint: Nightwatch AGENTS.md requires fresh work to route through
new SPEC/PLAN/STATE/REPORT files before implementation.

Decision: Keep `Current SHA` as a compatibility alias and add explicit `Last
validated implementation SHA` fields.
Reason: preserve the Phase 1.3 routing shape while making the baseline meaning
unambiguous and allowing the validator to distinguish approved checkpoint
advances from implementation drift.
Evidence/constraint: a state-file update necessarily creates a descendant
commit; exact HEAD equality alone cannot safely prove implementation freshness.

Decision: Keep the verified config `uiBaseUrl` as the default real target and
require any explicit override to use the same host, with explicit API/auth host
arrays in the selected config.
Reason: the user task forbids URL guessing and requires config/URL/policy
agreement; a host override would weaken that contract.
Evidence/constraint: current Nightwatch configs already contain the verified
Ripple dev/next browser hosts; preflight is intentionally no-network.

Decision: Make authenticated evidence minimization a recorder-level second
guard, not only a caller convention.
Reason: real page/network observers can encounter sensitive values in multiple
paths; metadata-first persistence must remain true if a caller forgets a
redaction step.
Evidence/constraint: real authenticated artifacts may contain customer/account
data, headers, bodies, storage, or console text; recorder strips those classes
and focused tests use synthetic values only.

Decision: Make manual capture fail before browser creation when stdin is not an
interactive terminal.
Reason: the current agent must not open a real target and then discover that a
human cannot complete login/MFA; the safe continuation is an exact user action.
Evidence/constraint: the task permits stopping with `USER_ACTION_REQUIRED` and
forbids obtaining credentials another way.

Decision: Keep the pre-real-run evaluator pure and collect only local proxy and
storage facts in its runtime wrapper; invoke the gate through a dedicated
Playwright config that excludes it from the ordinary suite.
Reason: the gate must be reusable before any authenticated context is created,
while the global setup can still provide the mandatory loopback proxy health
check without contacting the selected target.
Evidence/constraint: M5 requires precise fail-closed checks and prohibits real
authenticated navigation until every check passes.

Decision: Treat pre-existing Alphaus repository dirt as snapshot data, not a
gate failure, while retaining the Nightwatch-tree clean/documented-change
requirement.
Reason: the task requires a read-only freshness snapshot of Alphaus repos and
unchanged repositories, but only explicitly constrains the Nightwatch working
tree to be clean or documented.
Evidence/constraint: the first real-canary attempt proved several Alphaus
clones already had local changes; Nightwatch performed no writes to them.

Decision: Classify `clients2.google.com` and
`safebrowsingohttpgateway.googleapis.com` as explicit blocked telemetry/control
plane destinations for dev/next, without adding either to an outbound
allowlist.
Reason: the user approved non-network blocking after repeated Chromium
background attempts; local browser/proxy containment must continue to prevent
DNS/TCP/HTTP/HTTPS access while allowing sanitized non-fatal telemetry
evidence.
Evidence/constraint: any other unknown hostname remains fail-closed and must
receive separate review.

Decision: Classify only `widget.usepylon.com` as optional third-party support.
Reason: the current Ripple shell source proves an asynchronous chat-widget
integration that receives authenticated user context but is not awaited or
needed for core Vue boot.
Evidence/constraint: `mobingilabs/ripple-ui` `dev` at
`d80b161b684d9153c7e5acaa65ae1752d93d8ba9`, `src/main.js:69-98,207-226`,
`src/pylon.js:3-22`; no Pylon matches in directly named Ripple MFE/shared UI
repositories. Consequence: exact-host non-fatal blocking with distinct
sanitized evidence; no wildcard or related-host approval.

Decision: Move real auth capture out of Playwright Test and into the parent
Node CLI using the Playwright Library API.
Reason: Playwright Test workers do not inherit the parent terminal's TTY stdin;
the old helper therefore stopped at `process.stdin.isTTY` before opening the
headed browser. Human interaction must remain owned by the interactive parent.
Evidence/constraint: the direct runner starts the canonical proxy, launches
Chrome, creates `createNightwatchContext`, waits through a parent callback, and
writes only the validated external state path. The normal CLI exposes no
synthetic completion mode.

Decision: Keep the synthetic completion signal in local Playwright coverage
only and isolate its proxy runtime on an ephemeral loopback port.
Reason: automated tests need deterministic completion without human input and
must not collide with Playwright global setup or resemble a real capture mode.
Evidence/constraint: `synthetic-test-only` is rejected unless the runner is
explicitly marked test-only and the environment is local; the real CLI passes
only `human-parent-cli`.

Decision: Treat the human's `testing...` observation as unclassified page
content until sanitized target verification identifies its origin/path.
Reason: the old runner printed readiness without checking `page.url()` and
then discarded every post-launch exception; local source contains no such
fixture page and the session must not make a second real request to infer its
content.
Evidence/constraint: the real CLI resolves only the selected `dev|next`
config, while synthetic target selection is explicit local test injection.

Decision: Require structural post-login readiness before storage-state write.
Reason: ENTER alone is not evidence that the browser returned from the
approved auth host to Ripple; saving state in that condition would create an
untrusted artifact.
Evidence/constraint: existing Phase 2A canary semantics already record the
sanitized final URL and non-empty-title structural signal. Real mode now
requires the configured Ripple host/path family and title presence, while
synthetic mode uses only the loopback fixture path.

Decision: Keep the newly observed Chrome destinations fatal and unresolved.
Reason: the current approved non-fatal policy covers only the existing exact
Chrome telemetry hosts and `widget.usepylon.com`; broadening third-party
suppression would weaken containment. The real evidence shows these hosts were
denied before upstream contact, so review can occur without another request.
Evidence/constraint: M7 requires a separate human disposition for any new
hostname; no allowlist or production policy was changed.

Decision: Report the first sanitized monitor cause at HUMAN_WAIT and
POST_LOGIN_VERIFICATION while preserving the generic stage failure.
Reason: the generic `SAFETY_MONITOR_FAILED` contract remains safe, but the
human needs a safe subreason and host/classification to distinguish a proxy,
policy, lifecycle, or monitor failure. Query strings, fragments, bodies,
headers, credentials, and storage values remain excluded.

Decision: Apply the human-reviewed disposition as three exact local-block
browser-background classes, separate from `TELEMETRY` and
`OPTIONAL_THIRD_PARTY_SUPPORT`.
Reason: the approved hosts are known expected browser-background traffic that
Nightwatch intentionally blocks, not hosts safe to contact and not generic
telemetry. Each class therefore returns `BLOCK`, establishes zero upstream
connections, is blocked by the browser guard, records sanitized
`EXPECTED_CONTAINMENT_EFFECT`, and is non-fatal only after successful
containment during HUMAN_WAIT.
Evidence/constraint: the exact approved set is
`android.clients.google.com`, `update.googleapis.com`, and
`redirector.gvt1.com`; no wildcard or related-host approval is permitted.
Any new, sibling, or production hostname remains fail-closed and fatal.

Decision: Classify Ripple `#app` as `APP_IS_PREMOUNT_TARGET_ONLY` and use
`DIV.q-layout-container.layout` as the post-mount shell marker.
Reason: Ripple's locked Vue `2.6.12` runtime replaces a non-hydrating real
element passed to `$mount()` with the rendered vnode. Current source renders
`App` through `DefaultLayout`, and the QLayout container has a stable static
shell class independent of customer/account data.
Evidence/constraint: `public/index.html:35`, `src/main.js:2,48-52,324`,
`src/App.vue:1-5`, `src/layouts/DefaultLayout.vue:1-2`, lockfile versions, the
local Vue 2.6.12 browser regression, and the offline Vue/QLayout source review.
The bootstrap selector remains diagnostic only; no generic body-presence
fallback is permitted.

Decision: Keep the 750ms structural stability interval unchanged and start it
only after the rendered shell and complete document are present.
Reason: the prior real `routeStableMs=0` was caused by the old `#app` predicate
never becoming ready; the route itself remained stable. Benign recurring
network activity and the malformed-json oracle remain independent signals.

## Discoveries

- The Phase 1.3 final handoff commit is a continuity-only checkpoint advance,
  not an implementation change.
- The direct-runner implementation is checkpointed at
  `963128f4772db6e6c790cdc8cbb464c382cad8df`; the follow-up task-state commit
  is an approved continuity/documentation checkpoint.
- The existing config had verified UI URLs but no separate API/auth host
  contract; M2 now records those sets explicitly without changing runtime
  allowlist behavior.
- Standard local evidence retains its Phase 1 redaction behavior; only an
  authenticated recorder switches to the stricter metadata-first policy.
- Codex did not invoke manual capture and received no real target contents,
  credentials, MFA codes, or storage state. The human invoked the command
  externally, reached headed Chrome, and reported the post-launch failure;
  no successful state was supplied to this repository/session.
- The original `No tests found` discovery defect was real but insufficient: a
  dedicated config would still leave human interaction inside a worker. The
  worker-based real capture path and config are now removed entirely.
- Narrow Ripple routing/build evidence resolves the M6 404 as a target-path
  correction: the deployed app base is `/ripple/`, while Nightwatch configured
  the host root. The corrected dev URL is
  `https://appdev.alphaus.cloud/ripple/`.
- The current Ripple shell source proves `widget.usepylon.com` is optional
  support/chat, and its settings are populated only after authenticated user
  data is loaded; no identity value was copied into Nightwatch state.
- The exact Pylon host is now separate from telemetry in policy, browser
  evidence, proxy summaries, and destination manifests. Related Pylon hosts
  remain unknown and fail closed.
- The decisive root cause was TTY ownership: Playwright Test exposed a
  non-TTY worker stdin even when the npm parent was launched from a real
  terminal. The parent CLI now owns `readline` and the ENTER confirmation.
- The synthetic direct-runner regression uses only a loopback auth fixture,
  ephemeral proxy, and temporary `/tmp` state path. It does not exercise human
  login, credentials, MFA, or any Alphaus host.
- The human's first repaired invocation proves preflight and browser launch,
  but its old generic catch makes the exact later stage unrecoverable. The
  repaired invocation will distinguish navigation, target verification, wait,
  post-login, write, provenance, validation, and cleanup without raw errors.
- The visible `testing...` page is not served by the Nightwatch fixture and
  cannot be explained as synthetic leakage from the real CLI. Its remote
  origin/path is intentionally unresolved until a sanitized target report is
  produced; no real request was made by Codex to investigate it.
- Synthetic failure injection proved partial state written by a failed
  write/validation path is removed because the file was created by that
  failed attempt and is never treated as trusted state.
- Sanitized evidence recovered the actual HUMAN_WAIT cause: five outer-proxy
  denials for new external Chrome destinations. This is not proxy liveness,
  browser lifecycle, Pylon, expected telemetry, or an authentication-state
  validation failure.
- The first synthetic realistic-duration HUMAN_WAIT exposed and then
  confirmed a Nightwatch defect in console attribution: an exact configured
  telemetry block could raise `console-error`. Exact-host telemetry
  attribution now records expected containment without setting `monitor.failed`.
- The browser-background disposition implementation is checkpointed at
  `efe96bd37d33d6042038bb996a9f8cdbe6963992`; M7 remains IN_PROGRESS and the
  real external storage state is user-confirmed present at the external path,
  with contents intentionally uninspected.
- The three exact human-reviewed browser-background hosts are now separate
  semantic classes and remain network-denied. Related hosts remain UNKNOWN;
  no wildcard was introduced.
- The latest real human failure is recoverable as run
  `nightwatch-20260810T052211Z-cdd4`: two `application/json`/HTTP 200
  `malformed-json` oracle events for sanitized path
  `/m/blue/cost/v1/<ID>` caused HUMAN_WAIT termination through the shared
  monitor failed bit. The endpoint remains `UNKNOWN` because no path-level
  semantic registry entry exists and method alone is insufficient.
- The parser was applicable, so the event is a genuine protocol anomaly rather
  than a false-positive applicability error; the server-versus-transport
  subcause is unresolved because body and historical Content-Length are not
  available. Termination was a monitor-severity defect.
- The repair records metadata-only `ORACLE_ANOMALY`, separates `safetyFailed`
  from `oracleFailed`, and leaves production/unknown/containment/liveness
  failures fatal. The first authenticated observation later recorded the same
  anomaly without making it a safety failure; the external auth state remains
  outside Nightwatch.
- The checked-out Ripple source remains branch `dev`, SHA
  `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`, but current local `origin/dev`
  is `0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2` and is 17 commits ahead.
  The narrow delta contains no readiness-relevant bootstrap/router/root/build
  changes. Current-source classification is therefore
  `CURRENT_SOURCE_STILL_USES_APP`.
- Source comparison proves `/ripple/dashboard` is the authenticated landing
  route, while `#app` remains the exact current source-backed shell mount.
  The readiness repair changed target semantics and SPA stability, not the
  app-root selector; implementation `3b52b58` adds only sanitized structural
  diagnostics around that unchanged contract.
- The new synthetic matrix covers all ten requested readiness cases, including
  wrong selector, early loading, child-frame root, route changes, recurring
  network activity, and malformed-oracle independence. Persistent root absence
  remains unresolved rather than being labeled a shell bug.
- Structural stability no longer waits for zero network activity in the M7
  authenticated observer. It requires complete document readiness, `#app`,
  and a route that remains unchanged for 750 ms; target confirmation is
  independent, while missing `#app` is an upstream stability prerequisite.
- The source/framework review supersedes that last readiness wording:
  `#app` is the pre-mount target, while the rendered shell is
  `DIV.q-layout-container.layout`. The local Vue 2.6.12 regression confirms
  the target disappears after mount and the shell remains present. The old
  real-run `#app` absence therefore cannot be used to infer deployment
  divergence.

## Blockers

The authenticated preflight gate was historically run before the external
state was available and stopped before authenticated context creation or
target navigation. That historical gate blocker was:

- `authentication-state: external storage state is missing, invalid, or has mismatched provenance`

The prior repository-freshness result was caused by the two uncommitted
task-state paths in the Nightwatch working tree; the read-only Alphaus
snapshot was not found invalid, and no undocumented Alphaus repository
condition was found. The storage-state file was not opened for inspection,
printed, copied, or persisted by Nightwatch/Codex. That gate result is
historical and is not the current blocker. Phase 2A remains `IN_PROGRESS`; M7
cannot advance until the unsuccessful authenticated readiness result is
resolved and checkpointed.

The implementation has no known containment blocker. The human safety review
of the newly observed external Chrome destinations is cleared by the
exact disposition checkpoint at implementation SHA
`efe96bd37d33d6042038bb996a9f8cdbe6963992`. The three reviewed hosts remain
network-denied local blocks with separate browser-background classifications;
no wildcard or related-host approval was added. The current blocker is the
unsuccessful authenticated readiness result recorded above; no replay or
Phase 2B journey may start.

The readiness contract repair and sanitized diagnostic improvements are now
implemented and locally validated at `3b52b58`; the initial source-comparison
repair is retained at `ed337d75966f8af20130df32e084459da74dff50` and the
stability-continuity follow-up at `4e74d56394b3971a5a1cc4ef14a8db3b2ea9b8e1`.
The
remaining M7 boundary is intentional: this repair session must not perform the
fresh real retry or replay. A fresh interactive session must use the exact
retry command in the Resume Recipe, inspect only sanitized results, and stop
again if any new destination or source-contract mismatch appears.

The prior host-classification `USER_ACTION_REQUIRED` blocker is cleared by the
user's explicit approval on 2026-08-09. The approved disposition remains
**NON-NETWORK BLOCK** for the two Chromium background/control-plane
destinations `clients2.google.com` and `safebrowsingohttpgateway.googleapis.com`:

- no DNS, TCP, HTTP, or HTTPS access;
- no outbound allowlist entry;
- browser and outer-proxy containment continue blocking locally;
- sanitized blocked-telemetry evidence is allowed and non-fatal;
- every other previously unknown hostname remains unresolved, denied, and
  requires separate review.

The Pylon classification blocker is cleared by the human disposition and the
narrow source check. The browser-background classification blocker is also
cleared by the exact-host disposition above. The corrected canary passed as run
`nightwatch-20260809T110122Z-4d4d`, with zero unresolved destinations,
production attempts, and proxy violations. The current blocker is human
action: M7 requires a valid external Playwright storage-state path without
exposing its contents and a passing pre-real-run gate. If any hostname other
than the exact reviewed browser-background hosts or exact `widget.usepylon.com`
appears unresolved, stop and checkpoint; related browser-background hosts are
not covered by this disposition.

## Safety Events

NONE during Phase 2A setup. The historical Phase 1.1 `api.alphaus.cloud` event
remains documented with unknown path, method, credential attachment, and
response; no production investigation is being attempted.

M6 safety event: the first permitted real dev canary reached only the selected
UI host and the outer proxy recorded no denied upstream connection. Chromium
attempted two unclassified external background destinations; browser policy
denied them before upstream contact, the sanitized manifest recorded them as
unresolved, and the run stopped. No production destination or authenticated
request occurred.

M6 corrected-canary safety event: before classification, `widget.usepylon.com`
was an unclassified external destination attempted twice by the page. The
browser Fetch guard denied it before upstream contact; the outer proxy recorded
0 denied and 0 violations. The sanitized manifest recorded one unresolved
destination and the run stopped. The source-backed policy now blocks the exact
host as optional support; no production destination, auth state, credential, DB
access, or mutation occurred.

M6 corrected-canary pass: run `nightwatch-20260809T110122Z-4d4d` reached the
approved DEV Ripple path with HTTP 200 and final `/ripple/`. The manifest
recorded 3 expected, 0 new-but-verified, 8 blocked, and 0 unresolved groups.
The exact Pylon attempt was represented as sanitized optional-support evidence;
the proxy recorded no Pylon event and no Pylon upstream connection. Production
attempts, proxy violations, database access, mutation, auth state, and
credentials were absent.

M7 direct-runner validation safety event: NONE. The synthetic runner used only
loopback fixture traffic and blocked synthetic production/unknown policy
probes before any network path. No real Alphaus, production, database,
credential, MFA, mutation, or external auth-state activity occurred.

M7 real capture safety event: the outer proxy correctly denied five attempts to
new external destinations while HUMAN_WAIT was active. The browser/proxy
containment prevented upstream connection. Human review then approved exact
local blocks only: `android.clients.google.com` as
`BROWSER_BACKGROUND_GOOGLE`, `update.googleapis.com` as
`BROWSER_BACKGROUND_UPDATE`, and `redirector.gvt1.com` as
`BROWSER_BACKGROUND_DOWNLOAD`. These remain network-denied and are non-fatal
only when successfully contained with sanitized expected-containment
evidence. Related or new hosts remain UNKNOWN, blocked, and fatal; no wildcard
or allowlist entry was added.

M7 real capture oracle event: run `nightwatch-20260810T052211Z-cdd4` recorded
two sanitized `malformed-json` anomalies during HUMAN_WAIT for the DEV API
origin/path listed above. The historical observer did not persist
Content-Length, response content, headers, cookies, tokens, or storage state.
The event was a protocol anomaly, not a containment violation. The repaired
auth workflow records it and continues to post-login verification; the
external auth state remains outside Nightwatch.

M7 implementation safety event: none. The policy, proxy, browser guard, and
monitor regression coverage used local/synthetic requests only. No Google
upstream, Alphaus, production, database, credential, mutation, or auth-state
activity occurred in this Codex session.

M7 readiness-repair safety event: NONE. The repair used only current local
source inspection, Nightwatch source edits, synthetic values, and loopback
test traffic. No real Alphaus request, authenticated observation, replay,
production traffic, database query, mutation, or external state read/write
occurred in this repair session.

M7 first authenticated observation result: no safety event occurred. The gate
passed all 13 checks; observed destinations were expected or explicitly
blocked; the proxy recorded zero denied/unknown destinations and zero
violations; and production attempts, mutations, DB queries, and deliberate
endpoint replays were zero. The run was unsuccessful at authenticated
readiness: the approved DEV origin reached `/ripple/dashboard`, the old
observer's bootstrap-target check reported `#app` absent, and stability timed
out. The known malformed-JSON protocol anomaly recurred twice as metadata-only
evidence. The old bootstrap-target classification is superseded by the
post-mount shell repair; no fresh real observation was run here.

M7 authenticated rendered-shell-absent retry: run
`nightwatch-20260811T012811Z-9045` was executed with the exact required
authenticated command and external storage-state path. The pre-real-run gate
passed **13/13** before browser/context creation. One fresh first observation
then ran through direct landing navigation only; replay was not created.

Sanitized readiness result:

- final origin/path: `https://appdev.alphaus.cloud` / `/ripple/`
- `targetConfirmed`: `true`
- `document.readyState`: `complete`
- top-level/main frame: `true` / `top-level-main-frame`
- frame count / iframe count: `1` / `0`
- body present / child count: `true` / `8`
- rendered shell selector: `DIV.q-layout-container.layout`
- `renderedShellPresent`: `false`
- `routeStable`: `true` at the final sample
- `routeStableMs`: `0`
- `stabilityReached`: `false`
- navigation in progress / page closed: `false` / `false`
- fatal page-error count: `0`
- diagnosis: `SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED`

The full bounded readiness window elapsed without the source-backed rendered
shell. This is the required rendered-shell-absent branch. Do not change the
selector, substitute `#app`, weaken stability, or run replay. The remaining
work is runtime/deployment/bootstrap investigation only.

Sanitized safety and oracle result:

- destination manifest: `3` expected, `0` new-but-verified, `7` blocked,
  `0` unresolved;
- proxy: `0` denied, `0` unknown, `0` violations;
- production attempts / mutations / DB queries: `0` / `0` / `0`;
- oracle categories: `EXPECTED_CONTAINMENT_EFFECT`,
  `RIPPLE_READINESS_NOT_CONFIRMED`, `STABILITY_TIMEOUT`;
- safety event categories: expected local telemetry/browser-background/
  optional-support containment only; no fatal safety event;
- malformed-json recurrence: not observed in this run; the known prior
  `ORACLE_ANOMALY` / `GENUINE_PROTOCOL_ANOMALY` classification remains
  unchanged and its response body remains uninspected.

The external auth state remained outside Nightwatch and uninspected. No
authenticated trace, screenshot, request body, response body, DOM dump, or
storage-state content was persisted by the run. M7 remains `IN_PROGRESS`.

## M7 Bootstrap Evidence and Diagnostic Checkpoint — 2026-08-11

### Existing sanitized evidence from `nightwatch-20260811T012811Z-9045`

The artifact pair was inspected before adding instrumentation. No response or
request bodies, cookies, tokens, storage-state contents, customer/account
values, DOM contents, screenshots, or traces were read.

- The first navigation requested `GET https://appdev.alphaus.cloud/ripple/`;
  the document response was `200 text/html`. A second document load of the same
  sanitized path also completed `200 text/html`; no auth-host redirect or login
  destination appeared.
- The source/build-supported app entry
  `/ripple/static/js/app.a064df06.js` and runtime/vendor entry
  `/ripple/static/js/chunk-vendors.2de9b14a.js` were each requested and
  completed twice with `200 text/javascript`.
- All `112` observed JavaScript responses were `200 text/javascript`. The
  application and vendor CSS responses completed with `200 text/css` (the
  complete response structure also contained only `200` statuses for the
  observed HTML, CSS, JavaScript, font, image, and SVG categories).
- The six `requestfailed` events were expected local containment effects; no
  critical application asset had a non-2xx response, failed request, or
  wrong observed content type. No HTML fallback was observed for an application
  script URL.
- The authenticated event sequence recorded `storageStateLoaded=true` and
  `environment=dev` before the landing navigation. The gate and storage-state
  validator establish structural loading/provenance, but the metadata-only
  run did not expose cookie/storage categories or values. There was no
  auth-related response status or login redirect, so auth replay effectiveness
  remains **UNKNOWN**; it is not classified ineffective solely because the
  path stayed at `/ripple/`.
- The historical observers recorded no `pageerror`, no non-containment
  console error, and no fatal page error. They did not separately capture
  unhandled rejections, CSP violations, resource error events, module/chunk
  load errors, or router transitions. The two document loads and
  `mainFrameNavigationCount=2` remain unexplained by safe evidence.
- Read-only Ripple source/config agrees with the observed `/ripple/static/`
  build base and the established Vue/Quasar shell contract. No safe evidence
  proves a deployment/source divergence; that category remains **UNRESOLVED**.
- The blocked hosts are the established telemetry, optional Pylon support,
  and reviewed browser-background categories. No evidence shows that any
  blocked dependency is required for Ripple bootstrap; containment is
  unchanged and no destination was allowed.

Product/bootstrap classification from existing evidence: **OTHER / UNRESOLVED**.
The evidence exposes an **OBSERVER_BLIND_SPOT** in the old observer coverage,
which is a Nightwatch diagnostic gap rather than proof of the product root
cause.

### Sanitized diagnostic repair

Implementation commit: `952be215a0d65843e2fb7f8d15e0c28a7d7b142a`.

The opt-in authenticated observer now installs before application scripts and
records only fixed categories for unhandled rejection, CSP violation, script
or stylesheet resource-error events, runtime error events, and history route
transition attempts. Network metadata now carries sanitized resource type,
status, content type, completion, policy decision/classification, and
request/response/failure ordering. Page and console failures retain only safe
origin/path and optional line/column metadata. The Ripple diagnostic summary
records document/entry/vendor completion, script/style/chunk/module failure
counts, runtime/console/CSP/rejection counts, route transition status,
authenticated-route status, structural shell/readiness booleans, observer
coverage, and sanitized host/path metadata for failed critical resources only.
It never records resource bodies, arbitrary URLs/query strings, DOM, text,
storage, or identity.

The synthetic matrix covers document/entry success, entry 404, JavaScript URL
returning HTML, page exception, unhandled rejection, CSP block, base-route
router non-start, `/ripple/dashboard` redirect and shell success, ineffective
auth state, optional blocked resource, required blocked resource, and document
without application bootstrap. A specific regression also proves that a shell
at `/ripple/` is not authenticated readiness.

Validation after implementation: focused bootstrap/hooks/readiness tests
**35 passed, 0 failed**; full `npx playwright test` **194 passed, 0 failed**;
`npx tsc --noEmit` PASS; staged `git diff --check` PASS. The pre-check before
the task-state checkpoint reported only the expected stale-baseline warning;
the final checker must be rerun after this state is committed.

No real Alphaus request was initiated in this diagnostic repair session. No
replay, production traffic, mutation, database query, auth-state read, body
inspection, or Alphaus repository modification occurred. M7 remains
`IN_PROGRESS`; replay remains **NOT RUN**.

## Deferred / Follow-Up

- Phase 2B deterministic read-only Ripple journeys and all later phases.
- M7 cannot advance to replay until the authenticated target/readiness result
  is resolved and checkpointed. Phase 2B remains deferred.

## Resume Recipe

1. Read this STATE, then SPEC and PLAN if context is uncertain.
2. Verify `git status --short --branch` and `git rev-parse HEAD`.
3. Do not rerun the already-passed canary. The exact disposition for the three
   reviewed hosts is checkpointed: local block, separate browser-background
   classification, and non-fatal only after successful containment. No
   network allowlist or wildcard exists.
4. The external auth state is already user-confirmed present at the recorded
   path; its contents remain out of scope.
5. The exact authenticated retry `nightwatch-20260811T012811Z-9045` is the
   latest real run. It passed the 13/13 gate, ended at `/ripple/` with a
   complete document but no `DIV.q-layout-container.layout`, and recorded
   `routeStableMs=0`. Replay remains prohibited.
6. Treat the result as the unresolved runtime/deployment/bootstrap branch. Do
   not inspect DOM/content, change the selector, weaken readiness, rerun the
   canary, replay, or begin Phase 2B.
7. If a fresh authorized real retry is approved in a later session, use exactly:
   `npm run observe:authenticated -- --env=dev
   --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"`
   and inspect only the resulting sanitized bootstrap diagnostics.
8. This task remains `IN_PROGRESS`; the external storage-state path and its
   contents remain outside Nightwatch and uninspected.

## Completion Snapshot

Populate only when complete. If human input is required, record the exact
command and set `Status: IN_PROGRESS` with `USER_ACTION_REQUIRED` in the
current milestone/next action instead.
