# Nightwatch Phase 2A — First Controlled Authenticated Ripple Dev/Next Observation

## Purpose

Extend Nightwatch from local containment validation to one tightly bounded real
non-production Ripple observation. The result must establish runtime evidence
that the explicit target, proxy, browser guards, auth state, passive semantics,
and privacy controls agree in practice.

## Starting State

- Task ID: `phase-2a-controlled-observation`
- Starting Nightwatch SHA: `3a2712185250cd4e3591ee4037b28e06e8a0417e`
- Relevant architecture: TypeScript/Node/Playwright with raw-CDP/browser
  guards, mandatory loopback proxy, shared `OutboundPolicy`, local fixtures,
  evidence recorder, protocol oracles, and `.agent` continuity state.
- Dependencies: Node/npm, existing Playwright/TypeScript toolchain, explicit
  current Ripple deployment configuration if a real URL is not already in
  Nightwatch config, and a human-led external storage-state path if login is
  required.
- Established facts not to rediscover: Phase 1/1.1/1.2 safety results, the
  Ripple/backend recon handoff, the historical production contact, and the
  Phase 1.3 continuity handoff reconciliation recorded in SPEC/STATE.

## Scope

The continuity semantic repair, explicit target contract, privacy controls,
manual auth-state workflow, preflight/gates, one unauthenticated canary, one
authenticated landing observation, one replay, sanitized manifest/oracles,
artifact review, and durable sanitized documentation.

## Non-Goals

All user-specified Phase 2A out-of-scope work: mutations, databases, fuzzing,
random or generative exploration, DeepSeek/oops, production, broad recon,
Phase 2B+, and container/L6 implementation.

## Safety Constraints

- Never select `prod`, contact a production hostname, or learn/allow hosts from
  runtime traffic. New required infrastructure is `UNCLASSIFIED_REQUIRED_HOST`
  and stops the run pending narrow human approval.
- Exactly one environment (`dev` or `next`) is selected for a run. The URL,
  config, API policy, and auth-state provenance must agree.
- Real browser traffic always uses the mandatory loopback proxy plus all
  existing containment layers; fail closed on proxy loss, policy ambiguity,
  unknown semantic calls, or production attempts.
- Auth state is external, validated, never printed/copied, and never stored in
  Nightwatch source, `.agent`, `artifacts/`, or test output. Authenticated
  traces/screenshots/bodies/storage/DOM are disabled unless explicitly proven
  safe (the default is disabled).
- No DB tools, Alphaus writes, credentials automation, or deliberate clicks
  beyond direct navigation and deterministic readiness observation.

## Architecture / Approach

1. Reconcile the Phase 1.3 state against Git, create this task before code,
   and checkpoint.
2. Repair the validator with a recorded `Last validated implementation SHA`.
   A same-HEAD state is `SYNCED`; a descendant is `CHECKPOINT_ADVANCE` only
   when every intervening commit/diff path is approved continuity/documentation
   state; implementation/source/test/config drift is `STALE`. State is never
   rewritten by the checker.
3. Add a real-target config/preflight layer that requires one explicit `dev` or
   `next` environment and an explicit verified UI URL. Keep production denied.
4. Make evidence mode explicit and metadata-first. Centralize path/query,
   headers, body, storage, DOM, screenshot, and trace sanitization so real
   authenticated output cannot accidentally use the local synthetic recorder
   defaults. Use synthetic identifiers/secrets in focused tests.
5. Add a manual headed auth capture command that reuses the proxy and guards,
   validates an absolute external output path, and never logs values. If human
   login/MFA cannot happen in this session, checkpoint and return the exact
   `USER_ACTION_REQUIRED` command.
6. Run preflight and the safety gate before any real browser navigation. Run
   the optional unauthenticated canary first, classify all destinations without
   dynamic allowlisting, then stop on unresolved required hosts.
7. With a validated external state, observe only the configured landing route,
   classify passive network calls via a narrow semantic registry, and repeat
   once in a fresh context. Record sanitized metadata, manifest categories, and
   generic passive oracles.
8. Inspect all authenticated artifacts for forbidden data, update only
   sanitized runtime facts with run/date provenance, then run full validation,
   complete the task state/report, and commit the handoff.

## Milestones

### M0 — Reconcile Phase 1.3 and create the active task

- Objective: route the fresh session into this task before implementation.
- Files/areas: `.agent/ACTIVE_TASK.md`, new task `SPEC/PLAN/STATE/REPORT`.
- Implementation actions: verify clean HEAD and approved Phase 1.3 descendant;
  create frozen intent, living plan, first waypoint, and report placeholder.
- Acceptance criteria: active task is `IN_PROGRESS`, all four files exist,
  state records the exact next action, and no product code changed.
- Validation commands: `git status --short --branch`; `git rev-parse HEAD`;
  `npm run agent:check`; `git diff --check`.
- Status: COMPLETE

### M1 — Repair checkpoint SHA semantics

- Objective: distinguish synchronized state, approved continuity-only
  checkpoint advancement, and stale implementation state.
- Files/areas: `bin/agent-state.mjs`, focused validator tests, `.agent` docs or
  templates where `Current SHA` semantics are described.
- Implementation actions: record/describe `Last validated implementation SHA`;
  inspect ancestor commits and changed paths; approve only continuity/task
  documentation paths; retain warnings/errors for source/test/config drift.
- Acceptance criteria: no silent state rewrite, no arbitrary descendant pass,
  implementation changes remain detectable, focused tests cover all verdicts.
- Validation commands: `npx playwright test tests/unit/agent-state.test.ts`;
  `npm run agent:check`; `git diff --check`.
- Status: COMPLETE

### M2 — Establish explicit real-target configuration and preflight

- Objective: select exactly one verified `dev` or `next` target without URL
  guessing and without requiring authentication.
- Files/areas: existing environment config/loader/CLI, new preflight command and
  focused tests, sanitized docs as appropriate.
- Implementation actions: require `--env=dev|next`, explicit or verified UI
  URL, aligned environment/API/auth host policy, and permanent production deny.
  Use only narrow known Ripple config verification if the URL is absent.
- Acceptance criteria: local synthetic tests prove dev/next agreement, missing
  or ambiguous URLs abort, prod/both-env selection aborts, and preflight has no
  browser storage-state requirement.
- Validation commands: focused Phase 2A preflight tests; `npm run observe:preflight
  -- --env=... --ui-url=...` with a synthetic/approved target only.
- Status: COMPLETE. The approved dev UI origin is
  `https://appdev.alphaus.cloud`, the Ripple application path is `/ripple/`,
  and the exact configured target is `https://appdev.alphaus.cloud/ripple/`.
  Same-host explicit overrides must use that exact path. The correction and
  path guards are checkpointed at `76bd7df`; host allowlists and production
  policy are unchanged.

### M3 — Enforce authenticated evidence minimization

- Objective: make real authenticated runs metadata-first by default.
- Files/areas: recorder/manifest/network/oracle code, config, focused privacy
  tests, `.gitignore` if required.
- Implementation actions: redact auth/cookie/token/body/query/storage/DOM,
  fingerprint sensitive path IDs, disable screenshots/traces, and keep real
  artifacts local-only. Use synthetic fake customer identifiers and secrets.
- Acceptance criteria: forbidden synthetic values do not persist in any real-run
  evidence path; allowed metadata remains; trace/screenshots/bodies/storage are
  absent or explicitly disabled.
- Validation commands: focused Phase 2A evidence privacy tests; `git diff --check`.
- Status: COMPLETE

### M4 — Provide manual external auth-state acquisition

- Objective: let a human log in without Nightwatch/Codex receiving credentials.
- Files/areas: auth capture CLI, storage-state validation/path safety, tests,
  docs/command help.
- Implementation actions: headed browser uses the same proxy/guards and only
  approved auth/UI hosts; require absolute user-owned output outside repo and
  artifacts; validate shape/permissions; never print/copy values; traces off.
- Acceptance criteria: unsafe paths and invalid states fail closed; capture
  command is resumable with `USER_ACTION_REQUIRED`; no automated credential
  entry or secret output exists.
- Validation commands: focused capture/path tests; `npm run auth:capture --
  --help`; synthetic validation only unless human action is available.
- Status: COMPLETE

### M5 — Pass the pre-real-run safety gate

- Objective: prove every required safety condition before any real auth load.
- Files/areas: gate command/checklist and tests; task STATE evidence.
- Implementation actions: check repository scope, proxy health/policy version,
  browser flags/guards, exact env/host agreement, external valid state,
  evidence settings, passive registry, and read-only repo freshness snapshot.
- Acceptance criteria: any failed item prevents opening the authenticated real
  target and returns a precise failure.
- Validation commands: focused gate tests and preflight output; no real auth
  navigation until PASS.
- Status: COMPLETE

### M6 — Run the unauthenticated real connectivity canary

- Objective: observe only the explicit target before loading storage state.
- Files/areas: canary runner, destination manifest, run-local metadata.
- Implementation actions: navigate directly to the configured URL, inventory
  sanitized host/protocol/purpose/policy/count, and stop on production,
  unknown, or `UNCLASSIFIED_REQUIRED_HOST` contact.
- Acceptance criteria: acceptable login/access-denied/shell outcomes are
  recorded; no links or credentials are followed; no runtime host is silently
  allowed or added to config.
- Validation commands: real-run gate/canary command if preflight PASS; inspect
  sanitized local manifest and STATE checkpoint.
- Status: COMPLETE — the corrected canary reached the approved `/ripple/`
  target with HTTP 200, and the exact source-supported optional support host
  was blocked locally with zero unresolved destinations. No auth capture or
  authenticated observation has begun.

#### M6 approval checkpoint — 2026-08-09

The user explicitly approved **NON-NETWORK BLOCKING** for the Chromium
background/control-plane hosts `clients2.google.com` and
`safebrowsingohttpgateway.googleapis.com`. This is a classification as
explicitly blocked telemetry/control-plane traffic, not an outbound allowlist
grant: DNS/TCP/HTTP/HTTPS access remains prohibited, and both the browser and
outer proxy must continue aborting locally. Once represented by the existing
sanitized telemetry-blocked evidence path, attempts to these two named hosts
are non-fatal. No other unknown hostname is covered; any such appearance must
stop the canary for separate review.

Exact continuation: run `npm run observe:canary -- --env=dev` after this
checkpoint. Do not load storage state or begin authenticated observation until
all preflight and canary gates pass.

#### M6 result — 2026-08-09

`npm run observe:canary -- --env=dev` completed with `PASS` for run
`nightwatch-20260809T080408Z-7b9e`. Preflight and all 13 pre-real-run gate
checks passed before direct navigation. The sanitized destination manifest
recorded 1 expected `appdev.alphaus.cloud` UI destination, 4 blocked telemetry
destinations (`accounts.google.com`, `www.google.com`, and the two approved
Chromium background hosts), and 0 unresolved destinations. The proxy recorded
1 allowed, 4 telemetry-blocked, 0 denied, and 0 violations. No storage state,
credentials, screenshots, traces, request/response bodies, or production
connection were used. The UI response was HTTP 404 and emitted one generic
console-error oracle; the canary summary still passed and no authenticated
observation was started.

M6 acceptance is COMPLETE. Any other hostname appearing in a later run remains
fail-closed and requires separate review.

#### Corrected target checkpoint — 2026-08-09 — `76bd7df`

The approved Phase 2A target correction is recorded as configuration, not as a
host-policy change:

- Environment: `dev`
- Approved UI origin: `https://appdev.alphaus.cloud`
- Approved Ripple application path: `/ripple/`
- Correct Phase 2A UI URL: `https://appdev.alphaus.cloud/ripple/`

The `dev` allowlist is unchanged. The corrected configuration and path-agreement
guards passed focused target, gate, safety, type, and whitespace validation;
the corrected real no-auth canary then stopped on a new unclassified host as
recorded below.

#### Corrected canary result — 2026-08-09 — `nightwatch-20260809T103326Z-5feb`

The corrected target was reached safely, but M6 is **USER_ACTION_REQUIRED**:

- Final sanitized URL/path: `https://appdev.alphaus.cloud/ripple/`.
- UI document HTTP status: `200`; no redirect chain was observed.
- Destination counts: 3 expected, 0 new-but-verified, 7 blocked telemetry,
  1 unresolved.
- Blocked telemetry in the sanitized destination manifest: `www.google.com`
  (6 browser requests), `accounts.google.com` (4), `clients2.google.com` (1),
  `safebrowsingohttpgateway.googleapis.com` (1), `api-js.mixpanel.com` (1),
  `o446571.ingest.sentry.io` (1), and `widget.intercom.io` (1). The outer
  proxy recorded 6 telemetry-block events (5 for `www.google.com`, 1 for
  `accounts.google.com`); the remaining telemetry was blocked by the browser
  guard before reaching the proxy. All were blocked locally as non-fatal
  telemetry; no dynamic allowlist entry was made.
- Unresolved/new host: `widget.usepylon.com`, external/unknown, denied by the
  browser Fetch guard before upstream contact; it appeared twice in the
  sanitized destination manifest and is the blocking fact.
- Proxy counts: 3 allowed, 6 telemetry-blocked, 0 denied, 0 unknown,
  0 proxy violations. Production attempts: 0.
- Passive oracles: two category-only `console-error` entries occurred near the
  denied third-party widget activity; they are classified as safety-blocked
  third-party behavior, not as an authenticated/unauthenticated product bug.
  The run remains stopped because the new host is unresolved.
- No storage state, credentials, DB access, mutation, screenshot, trace, or
  production connection was used.

#### Pylon source verification and policy checkpoint — 2026-08-09

The narrow check was limited to the current Ripple shell and directly named
Ripple MFE/shared UI repositories. At `mobingilabs/ripple-ui`, branch `dev`,
source SHA `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` (the Pylon integration was
introduced by `a31d1349258c58886bfb1813fb1b9dd3f66c3395`), matches are limited to
the shell bootstrap/config files `src/main.js` and `src/pylon.js` plus the
environment app-id settings. The directly named MFE/shared UI repositories had
no Pylon matches.

`src/main.js:69-98` creates an asynchronous third-party script tag and does not
await its load or use its result to boot Vue. Core initialization proceeds via
the token/user/RBAC/preferences/status path at `src/main.js:207-223`; the only
later Pylon operation is the widget-settings assignment at `src/main.js:225-226`.
`src/pylon.js:3-22` describes chat settings and derives email/display-name
context from the authenticated user object. No token or identity value was
copied into Nightwatch state or artifacts. This proves support/chat-only,
non-critical behavior; blocking can remove/degrade support chat but cannot
prevent core Ripple boot based on the current source.

Nightwatch now classifies only the exact hostname `widget.usepylon.com` as
`OPTIONAL_THIRD_PARTY_SUPPORT`, with `block-optional-support`, no allowlist
entry, local browser/proxy blocking, non-fatal expected severity, and a
distinct sanitized manifest/event category. Related or future Pylon hostnames
remain unknown and fail closed.

The corrected canary rerun passed. Do not dynamically approve any hostname.
If any hostname other than exact `widget.usepylon.com` appears in a later run,
stop and checkpoint again.

#### M6 canary pass — 2026-08-09 — `nightwatch-20260809T110122Z-4d4d`

The corrected command `npm run observe:canary -- --env=dev` passed against
`https://appdev.alphaus.cloud/ripple/`:

- HTTP status `200`; final path `/ripple/`; no redirect.
- Destination groups: 3 expected, 0 new-but-verified, 8 blocked, 0 unresolved.
- Expected: `appdev.alphaus.cloud`, `fonts.googleapis.com`, and
  `fonts.gstatic.com` (one request each).
- Blocked telemetry groups: 7 — `accounts.google.com` (4),
  `api-js.mixpanel.com` (1), `clients2.google.com` (1),
  `o446571.ingest.sentry.io` (1),
  `safebrowsingohttpgateway.googleapis.com` (1), `widget.intercom.io` (1),
  and `www.google.com` (6). The manifest's telemetry attempt count is 15;
  the proxy recorded 7 telemetry-block events because the browser guard
  blocked some attempts before proxy contact.
- Optional support group: `widget.usepylon.com` (1 manifest request),
  `OPTIONAL_THIRD_PARTY_SUPPORT`, `block-optional-support`,
  `optional-support-chat`; blocked by the browser Fetch guard before proxy
  contact. It is not allowlisted and is not unresolved.
- Proxy: 3 allowed, 7 telemetry-blocked, 0 optional-support-blocked,
  0 denied, 0 unknown, 0 violations. Production attempts: 0.
- No storage state, authentication, credentials, database access, mutation,
  screenshot, trace, or Pylon upstream connection occurred. Pylon console
  effects were recorded as `EXPECTED_CONTAINMENT_EFFECT`; unrelated console
  errors remained normal oracle events.

M6 acceptance is COMPLETE. Proceed only to the manual external auth-state
handoff; do not execute the authenticated observation in this session.

### M7 — Observe the first authenticated Ripple landing page

- Objective: perform one tiny passive authenticated observation.
- Files/areas: runner/context setup, semantic endpoint registry, evidence and
  oracle integration.
- Implementation actions: fresh context with external state; direct landing
  route; deterministic readiness wait; observe URL/title/stable structure,
  network metadata, console/page errors, and MFE loading. Block mutations and
  unknown semantic actions.
- Acceptance criteria: first observation is proven passive, contained, and
  sanitized; no deliberate click/form/action or database access occurs.
- Validation commands: real-run command under gate; inspect run manifest,
  oracle output, and STATE checkpoint.
- Status: IN_PROGRESS — the exact authenticated command passed all 13
  pre-real-run checks and completed its first guarded landing observation, but
  stopped before replay because sanitized readiness reported the approved DEV
  origin with `/ripple/dashboard`, `appRootPresent=false`, and
  `stabilityReached=false`. The current local `origin/dev` source comparison
  proves `#app` remains the exact root marker; Nightwatch now records bounded
  structural diagnostics without weakening readiness. No real retry, replay,
  production attempt, mutation, or DB query is authorized in this repair
  session.

#### M7 observation-runner implementation checkpoint — 2026-08-10 — `cdeff50`

Added the opt-in `observe:authenticated` command and dedicated Playwright
configuration. It runs the local safety gate immediately before a test that
creates one guarded context, directly navigates only to the exact verified
Ripple landing URL, waits for deterministic stability, records sanitized shell
readiness/network/console/page-error/oracle metadata, closes the context, and
repeats exactly once with a fresh context and the same external state path.
Screenshots and traces are disabled. The semantic registry contains no
unreviewed API rules, so encountered API initialization calls are recorded as
`UNKNOWN`; exact reviewed `KNOWN_MUTATION` rules, if added later with
provenance, are blocked before network I/O.

Local validation: `npx tsc --noEmit` PASS; focused endpoint semantic and gate
tests **9 passed, 0 failed**; `npm run observe:authenticated -- --help` PASS.
No real target navigation occurred during implementation validation.

#### M7 handoff preparation

The human must create the external parent directory, then run from an
interactive terminal:

```bash
mkdir -p "$HOME/.nightwatch/auth"
npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

The headed browser opens only the approved DEV Ripple path. The human
completes login/MFA in that browser and presses ENTER in the same terminal;
Nightwatch does not read, print, copy, or receive credential values. The
storage-state file remains outside the workspace at the exact path above.
Do not execute authenticated observation until a fresh session has rerun the
local gate with that path and it passes.

#### M7 direct-runner repair checkpoint — 2026-08-10 — `963128f`

The previous repair fixed Playwright discovery, but the real human capture then
failed inside `tests/manual/auth-capture.ts` because
`process.stdin.isTTY === false` in the Playwright Test worker. The parent
`npm run auth:capture` process had an interactive terminal, but Playwright did
not preserve that TTY on the worker stdin; the headed browser therefore never
opened and no state file could be created.

The real manual test path and dedicated real-capture config were removed. The
parent `bin/auth-capture.mjs` now performs safe path checks and no-network
preflight, loads the canonical TypeScript safety modules, starts and health
checks the mandatory loopback proxy, launches headed Chrome through the
Playwright Library API, creates `createNightwatchContext`, and owns the
readline ENTER wait. The runner writes storage state directly through
`context.storageState()` to the validated external path, validates the shape,
records sanitized capture provenance in the run manifest, and closes browser
and proxy cleanly. The normal CLI has no synthetic completion switch.

`tests/manual/auth-capture.synthetic.ts` is now local-only direct-runner
coverage. Its test-only completion callback uses a loopback auth fixture and
ephemeral proxy, verifies browser/proxy/guard provenance, production and
unknown-host denial, external state validation, and absence of fake secrets in
artifacts. `tests/unit/authCaptureLauncher.test.ts` proves the CLI no longer
invokes Playwright Test, no longer has a competing worker test, and retains
the parent TTY check.

M7 remains `USER_ACTION_REQUIRED`; the real external state is still missing.

#### M7 post-launch repair checkpoint — 2026-08-10 — `af3c3a7`

The human executed the repaired parent CLI. The no-network preflight passed for
the canonical target `https://appdev.alphaus.cloud/ripple/`, and a headed
Chrome window opened. The terminal then emitted only the old generic failure
after the human saw a page resembling `testing...`; because the old runner
collapsed every post-launch exception into one message, the exact failing
stage cannot be recovered from that run.

Local source and synthetic execution prove this was not synthetic fixture
selection: normal capture accepts only `dev|next`, resolves the selected
environment directly, ignores ambient `NIGHTWATCH_UI_URL` for runner target
selection, and rejects synthetic completion unless `testOnly && local`. The
synthetic fixture is reachable only from the dedicated test config. No
Nightwatch source contains or serves a `testing...` page. The human-visible
page therefore cannot be attributed to the local fixture from this session;
its exact remote content remains intentionally unobserved.

The repair adds sanitized diagnostics and target verification before the ready
message, allows only the selected UI host or exact configured DEV/NEXT auth
host during the initial navigation, keeps the parent readline lifecycle, and
requires an approved Ripple landing plus non-empty title after ENTER before
state write. Synthetic execution covers successful completion and injected
navigation, target-mismatch, wait, write, validation, and post-login failures;
all safety layers remain unchanged.

Status remains `IN_PROGRESS`: no real auth state was produced. The exact
browser-background disposition is now applied; do not begin authenticated
observation or Phase 2B until the human separately completes the guarded auth
capture and the fresh pre-real-run gate passes.

#### M7 browser-background disposition checkpoint — 2026-08-10 — `efe96bd`

Human safety review is complete. Nightwatch now applies exact local blocks,
with zero proxy upstream connections and browser-guard blocking, to:

- `android.clients.google.com` → `BROWSER_BACKGROUND_GOOGLE`;
- `update.googleapis.com` → `BROWSER_BACKGROUND_UPDATE`;
- `redirector.gvt1.com` → `BROWSER_BACKGROUND_DOWNLOAD`.

The three classes are distinct from `TELEMETRY` and
`OPTIONAL_THIRD_PARTY_SUPPORT`. Successful containment is recorded as
sanitized expected containment and is non-fatal during HUMAN_WAIT. A new,
sibling, related, or production hostname remains fail-closed; related hosts
remain `UNKNOWN_DESTINATION` and fatal. No network allowlist entry and zero
wildcards were introduced.

Focused policy/monitor/direct-runner coverage passed **47/47**; synthetic
direct-runner coverage passed **1/1**; `npx tsc --noEmit` passed; and the full
Playwright suite passed **144/144**. No real auth or authenticated observation
was run by Codex. M7 remains `IN_PROGRESS` pending the human-provided
external state.

#### M7 malformed-json oracle checkpoint — 2026-08-10 — `6443baf`

The new human capture run `nightwatch-20260810T052211Z-cdd4` passed PREFLIGHT,
proxy start/health, headed browser launch, guard install, target navigation, and
target verification, then failed at HUMAN_WAIT with
`SAFETY_MONITOR_FAILED`, `monitor-reason: OTHER`, `guard-type: oracle`, and
`event-category: malformed-json`. Sanitized evidence recovers two records for
`POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>` at
`2026-08-10T05:23:12.976Z` and `2026-08-10T05:23:16.201Z`; both responses were
HTTP `200` with `Content-Type: application/json`. Content-Length was not
persisted by the historical observer and is therefore unavailable. The
endpoint classification is `UNKNOWN`: Nightwatch had no path-level semantic
registry entry, and HTTP POST alone is insufficient to label it mutation.

The parser was applicable because the response declared JSON and body capture
succeeded; this is a genuine protocol anomaly at the observed contract layer,
not an HTML/redirect/NDJSON/empty-response false positive. The underlying
server-versus-transport cause cannot be distinguished from sanitized history,
because response content and historical Content-Length are unavailable. The
fatal behavior was a monitor-severity defect: `recordIssue()` folded the
configured oracle into the shared `failed` bit, and the direct runner mapped
that bit to `SAFETY_MONITOR_FAILED / OTHER`.

The repair keeps ordinary passive-run oracle failure semantics, adds a
safety-only monitor state for auth capture, narrows parser applicability for
HTML/text, NDJSON/JSON-seq/streaming, redirects, 204/205/empty, and incomplete
bodies, and records metadata-only `ORACLE_ANOMALY` fields. Synthetic coverage
proves anomaly continuation and state write, while production/unknown
destinations and proxy liveness remain fatal. Implementation is committed at
`6443baf`; the final task-state checkpoint remains separate. M7 remains
IN_PROGRESS; no real auth state exists and no authenticated observation may
begin.

#### M7 safety-monitor repair checkpoint — 2026-08-10 — `342584c`

The real run's sanitized evidence was recovered at
`artifacts/nightwatch-20260810T034113Z-02f7`. HUMAN_WAIT ended with the old
generic `SAFETY_MONITOR_FAILED`, but the evidence shows five outer-proxy
denials classified as `external` / `deny` for the newly observed hosts
`android.clients.google.com`, `update.googleapis.com`, and
`redirector.gvt1.com`. The exact monitor subreason is
`UNKNOWN_DESTINATION`; proxy liveness stayed healthy, and neither the exact
optional-support Pylon block nor configured telemetry blocks caused the fatal
state. These new hosts remain fail-closed and are not allowlisted.

Nightwatch now carries a sanitized first-cause monitor taxonomy through the
direct runner and parent CLI, including proxy liveness/process state,
browser/context/page lifecycle, guard alarms, unknown/production destinations,
WebSocket/worker policy, unrouted requests, and monitor-internal errors. An
exact-host attribution path also keeps console effects from configured
telemetry blocks non-fatal, matching the existing Pylon containment behavior.
Synthetic coverage exercises a multi-poll HUMAN_WAIT, expected telemetry and
Pylon blocks, injected liveness failure, unknown and production destinations,
approved DEV auth-host navigation, page closure, successful state writing,
and the full reason taxonomy.

M7 remains `IN_PROGRESS`. Human review is required before retrying because the
new external destinations are not among the already approved non-fatal
telemetry hosts. Do not broadly suppress them or begin authenticated
observation.

#### M7 authenticated target-plumbing repair checkpoint — 2026-08-10 — `868b639`

The failing checkpoint was `75d877c`: `observe:authenticated` passed the empty
string `NIGHTWATCH_UI_URL` override to the existing strict gate when the CLI
did not receive `--ui-url`. The gate correctly rejected that value at
`target-agreement` before browser/context creation or target navigation.

The runner now omits the UI override field when absent, removes any inherited
ambient UI override, and lets the gate resolve the canonical selected
environment target. For `dev`, that target remains the single existing source
of truth: `https://appdev.alphaus.cloud/ripple/`. Explicit non-empty overrides
are still passed to strict validation; explicit blank values are rejected at
the CLI boundary. No gate, allowlist, production-deny, proxy, browser, or
authenticated-evidence behavior changed.

Focused runner/gate coverage passed **11/11**; the actual wrapper reported
`target-agreement: PASS` with a synthetic state path and no target contact;
`npx tsc --noEmit` passed; and a fresh ordinary suite passed **159/159**.
M7 remains `IN_PROGRESS`; do not run the real authenticated observation in
this repair session and do not begin Phase 2B.

#### M7 first authenticated observation checkpoint — 2026-08-10 — `de97`

The exact authenticated command passed the strict pre-real-run gate with all
13 checks PASS. The first fresh authenticated context navigated directly to
the canonical DEV target and closed normally. The runner correctly prohibited
the fresh-context replay because the first result was unsuccessful.

Sanitized first-pass result: run
`nightwatch-20260810T092636Z-de97-first`; 4 expected destination groups, 7
blocked expected-containment groups, 0 new-but-verified, 0 unresolved, 0
proxy violations, and 0 production attempts. The approved final origin was
`https://appdev.alphaus.cloud`; the final path was `/ripple/dashboard`.
Readiness was `targetConfirmed=false`, `titlePresent=true`,
`documentReadyState=complete`, `appRootPresent=false`,
`stabilityReached=false`, and `navigationFailed=false`. The sanitized
comparison records `replay-not-run`.

The known oracle recurred twice as metadata-only `malformed-json`: `POST
https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>`, HTTP 200,
`application/json`, expected `json`, observed `invalid-json`, semantic
classification `UNKNOWN`. It did not set the safety-failure state. Other
encountered API initialization calls were observed only as `UNKNOWN`; no
endpoint was deliberately invoked or replayed. This pass is unsuccessful at
the authenticated shell/readiness stage and is not a product-bug verdict.
No replay or third observation is authorized from this checkpoint.

#### M7 authenticated readiness contract repair checkpoint — 2026-08-10 — `ed337d7`

Current Ripple source evidence was re-established narrowly at
`REPOSITORIES/mobingilabs/ripple-ui`, branch `dev`, exact HEAD
`d80b161b684d9153c7e5acaa65ae1752d93d8ba9`. This is the same source SHA used
by the existing Nightwatch source snapshot, so there is no source-HEAD drift
relative to the prior evidence. The Ripple worktree has unrelated local
deletions and an untracked `AGENTS.md`, and the branch is 17 commits behind
its upstream; no pull, checkout, reset, stash, clean, or modification was
performed. The relevant routing/bootstrap/root files are clean.

The source proves `vue-router` uses `/ripple/` as its base, the dashboard route
is `/dashboard` with alias `/`, and the authenticated router guard redirects
`/` or `/login` with a token to `/dashboard`. Therefore the browser's final
`/ripple/dashboard` is the canonical authenticated landing route, and the
previous exact-path check was incorrect. Target confirmation now requires the
configured origin exactly and the source-proven `/ripple/` path namespace; it
does not accept the host root, production/unknown origins, or unrelated paths.

The source proves the shell mount is `#app`: `public/index.html` declares the
element and `src/main.js` calls `vm.$mount('#app')`. Nightwatch's selector was
therefore source-correct and was not replaced with customer text or a page
label. The real observation's `appRootPresent=false` means the sanitized
runtime query found no `#app` in the sampled final document. The source does
not prove whether that was deployment variation or timing, and no DOM/body
inspection was performed; it remains a readiness review fact, not a Ripple
bug classification.

The old `stabilityReached=false` was produced independently by generic
`waitForStability`: it required zero active requests and 750 ms of network
silence for up to 15 seconds. It did not read target or app-root signals, so
target mismatch did not mechanically cause the old stability result. The
authenticated observer now uses source-backed structural stability: document
ready state `complete`, `#app` present, and the browser route unchanged for
750 ms, with fatal safety/page failures stopping it. It deliberately ignores
benign recurring reads and locally blocked telemetry/Pylon/browser-background
traffic. In the repaired contract, missing `#app` is an upstream prerequisite
failure for structural stability; target confirmation remains independent.

Implementation `ed337d75966f8af20130df32e084459da74dff50` changed only the
authenticated readiness path and local synthetic coverage. Focused readiness,
runner-boundary, and gate tests passed **21/21** when run together; the new
readiness matrix is **12/12**. TypeScript passed, the ordinary local suite
passed **171/171**, and no opt-in authenticated test was discovered. The
known `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>` HTTP 200
`application/json` invalid-JSON anomaly remains metadata-only oracle evidence
and is not used as a readiness or safety failure.

M7 remains IN_PROGRESS. Do not run the real retry or replay from this repair
session.

#### M7 stability continuity follow-up — 2026-08-10 — `4e74d56`

The structural Ripple stability timer now starts only after a continuously
ready shell sample. If the route changes, the document is not complete, or
the source-backed `#app` root disappears, the timer is reset; a later ready
sample must establish a new 750 ms window. This is a narrow correction to the
stability contract and does not change target confirmation, host policy,
proxy containment, app-root selection, privacy, or oracle severity.

Focused readiness/gate/runner tests passed **24/24**; `npx tsc --noEmit`
passed; the full local Playwright suite passed **172/172**; `npm run
agent:check` and `git diff --check` passed. No real authenticated observation,
replay, Alphaus traffic, production traffic, mutation, or DB query occurred.
M7 remains IN_PROGRESS and the retry remains deferred to a fresh session.

#### M7 current-source and readiness-diagnostics checkpoint — 2026-08-10 — `3b52b58`

The checked-out Ripple worktree is `dev` at
`d80b161b684d9153c7e5acaa65ae1752d93d8ba9`; the locally available
`origin/dev` is `0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2`, and the checkout is
17 commits behind. Read-only comparison of only readiness-relevant paths
classified the result as `CURRENT_SOURCE_STILL_USES_APP`: the delta changes
translation/invoice/settings files only, while `origin/dev`
`public/index.html:35` and `src/main.js:48,324` retain `<div id="app">` and
`}).$mount('#app')`; `src/router.js` retains `/ripple/`, `/dashboard`, and
the authenticated redirect contract. No Ripple file was modified.

Nightwatch now records sanitized origin/path, document-ready-state,
top-level-page/frame/root/body structural counts, exact selector and source
reference, main-frame evaluation/timing, whether evaluation preceded complete
document readiness, direct-navigation/Page-reference facts, page closure,
fatal page-error count, bounded route stability, and a diagnosis that leaves
complete-document root absence unresolved between shell mount failure and
deployment/source divergence. The target, app-root, and stability signals
remain independent; generic network idle remains outside M7 readiness.

Focused readiness tests are **16/16**; full local Playwright validation is
**175/175**; `npx tsc --noEmit`, `npm run agent:check`, and `git diff --check`
pass (agent-check has only the expected pre-checkpoint stale-baseline warning).
No real authenticated request, replay, production traffic, mutation, database
query, storage-state read, or Alphaus repository modification occurred. M7
remains IN_PROGRESS and the retry is deferred to a fresh session.

### M8 — Produce the destination manifest

- Objective: establish the actual browser-runtime host contract.
- Files/areas: sanitized manifest/report generation and tests.
- Implementation actions: classify contacted/attempted hosts as EXPECTED,
  NEW_BUT_VERIFIED, BLOCKED, or UNRESOLVED with environment, rule, purpose,
  verdict, and count; omit sensitive query values.
- Acceptance criteria: no dynamic allowlist mutation; every destination has a
  deterministic category and unresolved items stop or remain explicit.
- Validation commands: focused manifest tests; real-run artifact inspection.
- Status: NOT_STARTED — remains gated on the manual external state and M7
  observation; no destination approval may be inferred from the canary.

### M9 — Run passive first-observation oracles

- Objective: report generic safety/protocol/runtime failures only.
- Files/areas: existing protocol oracles and Phase 2A integration.
- Implementation actions: evaluate production/unknown destination, proxy,
  crash/exception/console/network/navigation, malformed recognized JSON/NDJSON,
  MFE load, permanent loading, auth invalidation, and cross-environment redirect
  signals. Do not assert business numbers or query a datastore.
- Acceptance criteria: oracle verdicts are deterministic, generic, and clearly
  separated from visual oddities or business findings.
- Validation commands: focused oracle tests and real-run oracle report.
- Status: NOT_STARTED

### M10 — Repeat once in a fresh context

- Objective: prove basic landing observation repeatability.
- Files/areas: runner/replay comparison and report.
- Implementation actions: close first context, create a fresh context with the
  same external state, repeat the exact direct landing observation once, and
  compare sanitized structural/network behavior.
- Acceptance criteria: replay completes or records a precise failure/difference;
  no third/random exploration pass and no automatic bug label.
- Validation commands: real-run replay command and sanitized comparison review.
- Status: NOT_STARTED

### M11 — Review authenticated artifact privacy

- Objective: ensure the run did not persist sensitive data.
- Files/areas: run-local artifacts and review checklist/report.
- Implementation actions: inspect for bearer/JWT/cookies/email/customer/account/
  MSP/company IDs, bodies, storage, screenshots, traces; remove unsafe local
  artifacts only within the established artifact safety model and rerun with a
  fresh ID if needed.
- Acceptance criteria: no sensitive persistence; any safety event is factual,
  sanitized, and Phase 2A fails until fixed and rerun.
- Validation commands: targeted artifact scan/review; `git status --short`.
- Status: NOT_STARTED

### M12 — Document the actual sanitized runtime contract

- Objective: preserve only reusable, non-customer runtime facts.
- Files/areas: `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
  `docs/DECISIONS.md`, `docs/ROADMAP.md`, or a scoped runtime manifest doc.
- Implementation actions: record verified hosts/protocols/semantic endpoint
  classifications with environment, verification date, source
  `REAL_RUNTIME_OBSERVATION`, run ID, and safe provenance. Do not record
  customer-specific values or alter config solely from runtime observation.
- Acceptance criteria: durable docs contain sanitized facts only and preserve
  the historical safety event and current scope boundaries.
- Validation commands: manual sanitized-doc review; `git diff --check`.
- Status: NOT_STARTED

### M13 — Final validation and handoff

- Objective: complete the Phase 2A report and clean committed handoff.
- Files/areas: task `PLAN/STATE/REPORT`, `ACTIVE_TASK`, Nightwatch docs.
- Implementation actions: run all full/focused checks, verify Alphaus repos are
  unchanged, confirm no auth state or real artifacts are tracked, update the
  acceptance matrix, set active task complete only after success, and commit.
- Acceptance criteria: every requested success criterion is PASS, or the task
  is truthfully checkpointed as `USER_ACTION_REQUIRED` with exact continuation
  instructions and remains `IN_PROGRESS`.
- Validation commands: `npx tsc --noEmit`; `npx playwright test`; `npm run
  agent:check`; `git diff --check`; focused Phase 2A tests; clean `git status`.
- Status: USER_ACTION_REQUIRED — handoff checkpoint is prepared and local
  validation is complete; authenticated observation and later milestones
  remain unstarted until the human supplies external state.

## Validation Strategy

Use narrow unit/CLI tests for each new safety or privacy behavior, then run the
full local typecheck and Playwright suite. Real work is gated in this order:
explicit preflight → safety gate → unauthenticated canary → single
authenticated landing observation → fresh-context replay → artifact review.
No real authenticated navigation occurs if any gate fails. Record exact command
outputs and sanitized run IDs in STATE/REPORT, never secrets or customer data.

## Decision Log

- 2026-08-09 — Use `phase-2a-controlled-observation` as a separate active task;
  reason: Phase 1.3 explicitly requires fresh task routing before Phase 2A.
- 2026-08-09 — Treat SHA state as a validated implementation baseline plus
  explicit approved continuity-only checkpoint advances; reason: updating task
  state necessarily changes HEAD, but arbitrary descendants must remain stale.
- 2026-08-09 — Require one exact `dev` or `next` target and metadata-first
  authenticated evidence; reason: application environment defaults and shared
  data planes cannot be trusted as containment or evidence minimization.
- 2026-08-09 — User-approved explicit non-network block for
  `clients2.google.com` and `safebrowsingohttpgateway.googleapis.com`; reason:
  Chromium background/control-plane attempts must remain locally denied and
  may be recorded as non-fatal sanitized telemetry, while all other unknown
  destinations remain fail-closed.
- 2026-08-10 — Apply the human-reviewed disposition as three exact local-block
  browser-background classes: `android.clients.google.com` as
  `BROWSER_BACKGROUND_GOOGLE`, `update.googleapis.com` as
  `BROWSER_BACKGROUND_UPDATE`, and `redirector.gvt1.com` as
  `BROWSER_BACKGROUND_DOWNLOAD`. Keep all three network-denied with zero
  upstream connections, separate from telemetry and optional support, and
  non-fatal only after successful containment during HUMAN_WAIT. Do not add
  wildcards or infer approval for sibling hosts; all other new destinations
  remain UNKNOWN and fatal.
- 2026-08-10 — Separate protocol/product oracle anomalies from safety-monitor
  failures during human auth capture. Preserve ordinary passive-run oracle
  verdicts, but require a direct safety/containment violation to stop HUMAN_WAIT;
  continue to post-login verification so auth failure is reported at the
  correct stage.
- 2026-08-10 — Treat `/ripple/` as the source-proven authenticated Ripple
  route namespace for final target confirmation, with exact configured-origin
  matching. The current source proves `/ripple/dashboard` is the canonical
  authenticated landing; accepting only the exact configured entry path was a
  Nightwatch mismatch.
- 2026-08-10 — Use structural Ripple stability for the authenticated observer:
  document complete, source-backed `#app` present, and unchanged route for
  750 ms. Do not require generic network-idle because benign recurring reads
  can continue after a SPA shell is ready; keep the generic wait for existing
  non-M7 workflows.
- 2026-08-10 — Classify the current root contract from the locally available
  `origin/dev` ref, not the 17-commit-behind checkout. Reason: the checkout is
  not current enough to establish current dev source truth by itself, while
  the local upstream ref is available for read-only object inspection.
  Evidence: `origin/dev` `0bba40b7...` still has `public/index.html:35` and
  `src/main.js:48,324` for `#app`, and the 17-commit delta contains no
  relevant bootstrap/router/root/build paths. Consequence: classification is
  `CURRENT_SOURCE_STILL_USES_APP`; no marker replacement is authorized.
- 2026-08-10 — Add structural diagnostics without changing the readiness
  contract. Reason: the previous `appRootPresent=false` result came from a
  main-frame `page.evaluate` query after direct navigation, but sanitized
  evidence could not distinguish stale source, wrong document/frame, early
  timing, or runtime shell/source divergence. Consequence: future failures
  preserve independent target/root/stability booleans and add only safe
  origin/path, frame/body counts, document state, bounded timing, lifecycle,
  route-stability, exact selector, source provenance, and an honest unresolved
  diagnosis; no DOM content or generic network-idle dependency is introduced.

## Discoveries

- Phase 1.3 handoff commit `3a27121` changed only three approved continuity
  state/report files after implementation SHA `1994eac`; no implementation
  drift was found.

## Deferred Work

- Phase 2B deterministic read-only Ripple journeys.
- Docker/L6 process/network namespace isolation and all later autonomous,
  datastore, fuzzing, AI-planning, and self-development phases.

## Completion Criteria

Phase 2A is complete only after the requested continuity repair, explicit
single-target preflight, auth minimization/capture controls, safety gate,
canary, first authenticated observation, one replay, manifest/oracles,
artifact privacy review, sanitized docs, full validations, acceptance matrix,
and clean committed handoff are complete. If a genuine human input is missing,
checkpoint all state and stop as `USER_ACTION_REQUIRED` without broad recon.
