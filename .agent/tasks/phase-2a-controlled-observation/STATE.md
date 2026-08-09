# Task State

## Identity

Task ID: phase-2a-controlled-observation
Phase: 2A
Status: IN_PROGRESS
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 76bd7dfae59cb01c922a71e45a22d6534011bf1b
Last validated implementation SHA: 76bd7dfae59cb01c922a71e45a22d6534011bf1b
Branch: main
Last checkpoint: 2026-08-09 — corrected canary `nightwatch-20260809T103326Z-5feb` reached `/ripple/` with HTTP 200 but stopped on new unclassified host `widget.usepylon.com`; no auth state loaded.

## Objective

Safely observe one explicitly selected authenticated Ripple `dev` or `next`
session using passive actions, mandatory proxy/browser containment, minimized
evidence, and a single fresh-context replay.

## Current Milestone

Milestone ID: M6 — Run the unauthenticated real connectivity canary
Status: USER_ACTION_REQUIRED
What is being attempted: The corrected target is checkpointed in the `dev`
configuration and path-agreement guards. The approved UI origin is
`https://appdev.alphaus.cloud`; the approved Ripple application path is
`/ripple/`; the exact Phase 2A UI URL is
`https://appdev.alphaus.cloud/ripple/`. The document returned HTTP 200 and
final URL `/ripple/`, but the browser encountered new unclassified external
host `widget.usepylon.com` and denied it before upstream contact. The host
allowlist and production policy are unchanged. No storage state was loaded and
no auth capture was started.

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
- M4 — COMPLETE. Added `auth:capture` plus guarded manual Playwright helper,
  external output-path validation, interactive-terminal check, verified UI
  host check, and structural post-write validation. The capture recorder starts
  in authenticated metadata mode and trace-off, while the existing global
  setup starts the mandatory proxy and browser guards. Validation: `npx
  playwright test tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts`
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
gate are complete. The prior canary reached the configured dev host at the
wrong root path and returned HTTP 404; the corrected canary reached `/ripple/`
with HTTP 200 but stopped on new unclassified host `widget.usepylon.com`.
Narrow current Ripple source/config evidence proves the intended base path is
`/ripple/`; the approved correction is configured and guarded. No
authenticated observation or auth capture has occurred.

## Exact Next Action

USER_ACTION_REQUIRED — review the exact unresolved host `widget.usepylon.com`
from corrected canary run `nightwatch-20260809T103326Z-5feb`. Do not dynamically
approve it, retry the canary, load storage state, or start auth capture until a
human disposition is recorded.

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
| `bin/auth-capture.mjs`, `tests/manual/auth-capture.ts`, `package.json`, `playwright.config.ts` | Human-only guarded capture workflow | Added/modified |
| `src/browser/contract.ts`, `playwright.config.ts`, `playwright.gate.config.ts` | Shared authenticated browser containment contract and isolated gate harness | Added/modified |
| `src/core/safety/realRunGate.ts`, `bin/observe-gate.mjs`, `tests/manual/observe-gate.ts`, `tests/unit/realRunGate.test.ts`, `package.json` | Fail-closed local pre-real-run gate and CLI | Added/modified |
| `tsconfig.json` | Typecheck dedicated gate config | Modified |
| `src/core/evidence/destinationManifest.ts`, `tests/unit/destinationManifest.test.ts` | Sanitized host-level runtime destination manifest | Added |
| `bin/observe-canary.mjs`, `playwright.canary.config.ts`, `tests/manual/phase2a-canary.ts`, `package.json` | Opt-in no-auth direct-navigation canary | Added/modified |
| `config/environments/dev.json`, `config/environments/next.json`, `tests/unit/safety.test.ts` | Explicit non-network block classification for approved Chromium background hosts | Modified |

## Validation Ledger

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

## Discoveries

- The Phase 1.3 final handoff commit is a continuity-only checkpoint advance,
  not an implementation change.
- The current working tree correctly produces `STALE` because M1 implementation
  and focused-test changes are not yet committed; the warning is not suppressed.
- The existing config had verified UI URLs but no separate API/auth host
  contract; M2 now records those sets explicitly without changing runtime
  allowlist behavior.
- Standard local evidence retains its Phase 1 redaction behavior; only an
  authenticated recorder switches to the stricter metadata-first policy.
- Manual capture has not been invoked; no real target, credential, MFA code, or
  storage state exists in this repository/session.
- The gate CLI initially found no manual test because manual helpers are
  excluded from the ordinary Playwright match; a dedicated gate config now
  keeps that helper explicit and out of the full suite.
- Narrow Ripple routing/build evidence resolves the M6 404 as a target-path
  correction: the deployed app base is `/ripple/`, while Nightwatch configured
  the host root. The corrected dev URL is
  `https://appdev.alphaus.cloud/ripple/`.

## Blockers

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

Current blocker: `USER_ACTION_REQUIRED` for the new unclassified external host
`widget.usepylon.com` encountered by corrected canary run
`nightwatch-20260809T103326Z-5feb`. It was denied locally by the browser Fetch
guard before upstream contact. Do not dynamically approve the host, retry the
canary, perform auth capture, or begin authenticated navigation until a human
disposition is recorded. After the blocker is resolved, M7 still requires a
valid external Playwright storage-state path without exposing its contents and
a passing pre-real-run gate.

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

M6 corrected-canary safety event: `widget.usepylon.com` was a new unclassified
external destination attempted twice by the page. The browser Fetch guard
denied it before upstream contact; the outer proxy recorded 0 denied and 0
violations. The sanitized manifest recorded one unresolved destination and the
run stopped. No production destination, auth state, credential, DB access, or
mutation occurred.

## Deferred / Follow-Up

- Phase 2B deterministic read-only Ripple journeys and all later phases.
- Real dev/next observation cannot begin until explicit target, auth state, and
  every required safety gate pass.

## Resume Recipe

1. Read this STATE, then SPEC and PLAN if context is uncertain.
2. Verify `git status --short --branch` and `git rev-parse HEAD`.
3. Resolve the `widget.usepylon.com` USER_ACTION_REQUIRED blocker without
   dynamic approval; do not retry or load auth state before that disposition.
4. After the canary is allowed to proceed, provide only a safe external
   storage-state path for M7; never provide its contents or credentials.
5. Run the authenticated command only after the pre-real-run gate passes; use
   a direct landing navigation, then exactly one fresh-context replay.
6. Update STATE with exact sanitized runtime results and checkpoint before M8.

## Completion Snapshot

Populate only when complete. If human input is required, record the exact
command and set `Status: IN_PROGRESS` with `USER_ACTION_REQUIRED` in the
current milestone/next action instead.
