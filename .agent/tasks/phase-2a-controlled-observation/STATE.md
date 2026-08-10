# Task State

## Identity

Task ID: phase-2a-controlled-observation
Phase: 2A
Status: IN_PROGRESS
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef
Last validated implementation SHA: af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef
Branch: main
Last checkpoint: 2026-08-10 — repaired post-launch target verification and
stage diagnostics at implementation SHA `af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef`.
The human reached headed Chrome, but the old run's generic failure did not
identify its post-launch stage; the real external storage state remains
missing.

## Objective

Safely observe one explicitly selected authenticated Ripple `dev` or `next`
session using passive actions, mandatory proxy/browser containment, minimized
evidence, and a single fresh-context replay.

## Current Milestone

Milestone ID: M7 — Manual login required before authenticated observation
Status: USER_ACTION_REQUIRED
What is being attempted: M6 passed against the exact DEV Ripple target
`https://appdev.alphaus.cloud/ripple/`. The document returned HTTP 200 with
final path `/ripple/`; three expected destination groups and eight blocked
groups were recorded, with zero unresolved destinations. The exact
source-supported Pylon host remains locally blocked as distinct,
non-fatal `OPTIONAL_THIRD_PARTY_SUPPORT`; it is not allowlisted and did not
reach the proxy or upstream. No storage state was loaded by this session. The
human then executed the repaired parent CLI: preflight passed for the exact
canonical target, headed Chrome opened, the visible page resembled
`testing...`, and the command ended with the old generic sanitized failure.
No successful state was established. The next step is a human-led rerun with
stage diagnostics only.

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
passed after the source-backed Pylon classification. Narrow current Ripple
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

## Exact Next Action

The corrected unauthenticated canary already passed:
`npm run observe:canary -- --env=dev`, run
`nightwatch-20260809T110122Z-4d4d`, against
`https://appdev.alphaus.cloud/ripple/`. Do not rerun it in this handoff.

Exact next action for the human:

```bash
mkdir -p "$HOME/.nightwatch/auth"
npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Complete login/MFA manually in the headed browser, press ENTER in the
interactive terminal, and keep the storage state outside the workspace. Never
paste the file contents, credentials, tokens, or user identity into Nightwatch.

The real external auth state is still **MISSING** at
`$HOME/.nightwatch/auth/ripple-dev-state.json`; this session performed only an
existence check and did not inspect, print, copy, or persist its contents.

Exact next action is human interaction in the repaired parent CLI:

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

The gate is local-only and must pass before any authenticated target navigation.
The requested gate was run and stopped before authenticated context creation
or target navigation. Its authentication blocker was the missing external
storage state. Its repository-freshness result was caused by the two
uncommitted task-state checkpoint paths being treated as undocumented by the
gate; existing sanitized all-144-repository snapshot comparisons found no
Alphaus snapshot or undocumented-repository condition. This checkpoint
commits those paths, so no snapshot regeneration is needed before manual auth
capture. After capture, rerun this exact gate in a fresh session without
exposing storage-state contents. Do not begin authenticated observation,
Phase 2B, or approve any new hostname. If another hostname is unresolved,
stop and checkpoint.

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

## Validation Ledger

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

## Blockers

The authenticated preflight gate was run exactly as planned after the Git
reconciliation and stopped before authenticated context creation or target
navigation. The external state remains missing; the exact sanitized gate
blocker was:

- `authentication-state: external storage state is missing, invalid, or has mismatched provenance`

The prior repository-freshness result was caused by the two uncommitted
task-state paths in the Nightwatch working tree; the read-only Alphaus
snapshot was not found invalid, and no undocumented Alphaus repository
condition was found. The storage-state file was not opened for inspection,
printed, copied, or persisted by Nightwatch/Codex. That gate result is not the
current capture architecture blocker. Phase 2A remains `IN_PROGRESS`; M7
cannot advance until the human completes the external capture and the same
gate passes.

The repaired implementation has no remaining code blocker. The current
blocker is exactly the required human action: run the parent CLI from an
interactive terminal, complete DEV login/MFA in the headed browser, press
ENTER, and leave the state outside the workspace.

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
narrow source check. The corrected canary passed as run
`nightwatch-20260809T110122Z-4d4d`, with zero unresolved destinations,
production attempts, and proxy violations. The current blocker is human
action: M7 requires a valid external Playwright storage-state path without
exposing its contents and a passing pre-real-run gate. If any hostname other
than exact `widget.usepylon.com` appears unresolved, stop and checkpoint.

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

## Deferred / Follow-Up

- Phase 2B deterministic read-only Ripple journeys and all later phases.
- Real dev/next observation cannot begin until explicit target, auth state, and
  every required safety gate pass.

## Resume Recipe

1. Read this STATE, then SPEC and PLAN if context is uncertain.
2. Verify `git status --short --branch` and `git rev-parse HEAD`.
3. Do not rerun the already-passed canary. The exact next human action is the
   parent-CLI capture command in `## Exact Next Action`.
4. In a fresh session after capture, run the exact `observe:gate` command shown
   there without exposing state contents; it must PASS before navigation.
5. Run the authenticated observation only after that gate passes; use a direct
   landing navigation, then exactly one fresh-context replay.
6. Update STATE with exact sanitized runtime results and checkpoint before M8.

## Completion Snapshot

Populate only when complete. If human input is required, record the exact
command and set `Status: IN_PROGRESS` with `USER_ACTION_REQUIRED` in the
current milestone/next action instead.
