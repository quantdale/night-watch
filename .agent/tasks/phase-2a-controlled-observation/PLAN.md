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
- Status: IN_PROGRESS — CORRECTED_TARGET_CHECKPOINT_PENDING. The approved dev
  UI origin is `https://appdev.alphaus.cloud`, the Ripple application path is
  `/ripple/`, and the exact configured target is
  `https://appdev.alphaus.cloud/ripple/`. Same-host explicit overrides must
  use that exact path. Checkpoint this correction, then rerun the no-auth
  preflight/canary before resuming M7; do not change host allowlists.

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
- Status: COMPLETE

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

#### Corrected target checkpoint — 2026-08-09

The approved Phase 2A target correction is recorded as configuration, not as a
host-policy change:

- Environment: `dev`
- Approved UI origin: `https://appdev.alphaus.cloud`
- Approved Ripple application path: `/ripple/`
- Correct Phase 2A UI URL: `https://appdev.alphaus.cloud/ripple/`

The `dev` allowlist is unchanged. The corrected configuration and path-agreement
guards passed focused target, gate, safety, type, and whitespace validation;
the corrected real no-auth canary is the exact next action.

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
- Status: BLOCKED pending M2 target correction, then USER_ACTION_REQUIRED for a
  valid externally supplied Playwright storage-state path; no authentication
  state is present in this session and no credentials may be provided to
  Nightwatch.

### M8 — Produce the destination manifest

- Objective: establish the actual browser-runtime host contract.
- Files/areas: sanitized manifest/report generation and tests.
- Implementation actions: classify contacted/attempted hosts as EXPECTED,
  NEW_BUT_VERIFIED, BLOCKED, or UNRESOLVED with environment, rule, purpose,
  verdict, and count; omit sensitive query values.
- Acceptance criteria: no dynamic allowlist mutation; every destination has a
  deterministic category and unresolved items stop or remain explicit.
- Validation commands: focused manifest tests; real-run artifact inspection.
- Status: NOT_STARTED

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
- Status: NOT_STARTED

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
