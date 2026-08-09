# Nightwatch Architecture Decisions

Decision record for Nightwatch (Phase 0/1). Each entry states the decision,
its rationale (grounded in `NIGHTWATCH_RECON_B.md` facts, cited by ID),
the consequences, and the phases where it applies. Decisions are accepted
unless marked superseded; changing one requires a new entry, not an edit.

---

## D-1 — Playwright Test as the single runner for unit, smoke, and scenario suites

**Decision.** All Nightwatch code — unit tests, smoke tests, and runnable
scenarios — runs through the Playwright Test runner (`@playwright/test`
1.62.1, `testMatch` covering `tests/**` and `scenarios/**/*.smoke.ts`).

**Rationale.** One test tool instead of two (no Vitest/Jest + ts-jest side
stack); Playwright transpiles TypeScript in-process; the browser harness and
the tests share config, fixtures, and the `channel`/browser plumbing; a
scenario is just another test file, so journey steps get the same
expectation/timeout machinery. `package.json` keeps a single devDependency
set.

**Consequences.** Nightwatch's own tests and its scenarios are one surface
(`npm test` runs everything); scenario runs are wrapped by
`bin/nightwatch.mjs` for fail-closed env handling; workers are serialized
(`workers: 1`, `fullyParallel: false`) so policy state and fixture servers
never race.

**Phase applicability.** All.

---

## D-2 — Fail-closed outbound policy independent of application configuration

**Decision.** The outbound-request policy (`OutboundPolicy.decide`) takes
only the request URL and the selected environment config. No application
configuration inside Alphaus repos (ripple-ui cookies, SDK defaults, CLI
flags, VITE_* envs) is ever trusted.

**Rationale.** RECON_B §4 E1–E10: SDK default endpoints are production
(E1); UIs hardcode prod URLs (E2, E4); CLIs default to prod (E5); ouchan
testclients default to prod run.app (E6); raw Go services carry prod
defaults (E7); cookies can redirect a "local" UI to prod (RECON_B §13.6).
Environment variables are developer-controlled strings and every one of
these mechanisms bypasses them. The only invariant point is the request
leaving the browser.

**Consequences.** The browser harness must inspect **every** request
(`context.route('**/*')`); the policy lives in `src/core/safety/` with no
knowledge of product internals; "make the app behave" fixes (env injection,
DNS pinning) are Phase 2+ supplements, never the boundary.

**Phase applicability.** 0/1 and all later phases (the boundary never
moves).

---

## D-3 — Explicit host classification tables, no substring "prod" matching

**Decision.** Hosts are classified by membership in explicit, provenance-
carrying tables (`KNOWN_PRODUCTION_HOSTS`, `DEV_HOSTS`, `NEXT_HOSTS`,
`CLOUD_RUN_SUFFIX`, `ALPHAUS_DOMAINS`). No classification ever uses
substring matching on "prod".

**Rationale.** RECON_B E9 documents real string-magic env detection
(`bluectl` treats an endpoint as next iff its AuthUrl contains `"next"`) —
fragile and silent. Substring "prod" matching would both over-match
(legitimate `prod-` run.app names) and under-match (`service.mobingi.com`
carries no "prod" at all). Tables are auditable: every entry has a source
(repo @ SHA) and a test.

**Consequences.** Adding a host is a reviewable change (table + provenance
note + policy test); freshness of the tables becomes a Phase 3 concern
(change intelligence re-verifies citations); the `*.run.app` rule is
explicitly a suffix rule, not a substring rule.

**Phase applicability.** 0/1 and all later phases.

---

## D-4 — Allowlist-only environments; `production.json` documents the rejected surface

**Decision.** Only `local`, `dev`, `next` are selectable. The production
config file exists solely to document the known-production host list and
the denial rationale; the loader rejects it by name validation.

**Rationale.** Fail-closed by construction: a file that cannot be loaded
cannot be mis-selected. The known-production list still needs one auditable
home for humans and for the canary/tests to assert against
(SAFETY_MODEL §2).

**Consequences.** `production.json` is structurally unloadable (`name`
must match `local|dev|next` → `EnvironmentSelectionError`); tests assert
this; the production surface is maintained in one place and mirrored into
the policy's deny rules.

**Phase applicability.** 0/1 and all later phases (production never becomes
runnable).

---

## D-5 — Every request inspected; telemetry blocked-but-not-failed, everything else fail-closed

**Decision.** `context.route('**/*')` inspects every request. Verdicts:
`allow` (continue), `deny` (abort + always-fatal `hard-failure`),
`block-telemetry` (abort + recorded `telemetry` event, not fatal).

**Rationale.** Real UIs emit telemetry (sentry, mixpanel, intercom, GA,
Amplitude, Segment); failing a dev/next journey on a beacon would make the
tool unusable. But beacons still carry identifying data, so they are
aborted, not passed through redacted. Everything else fails closed because
any unexpected request is either hostile (RECON_B §4) or evidence of an app
bug worth failing on.

**Consequences.** Telemetry host lists must be explicit per environment;
`hard-failure` is hard-coded into `failOn` and cannot be disabled; the
request/response recording distinguishes verdicts via
`blockedByPolicy`/`verdict`/`reason`.

**Phase applicability.** 0/1 and all later phases.

---

## D-6 — Redaction layer before persistence; runtime secret registry; traces disabled with auth state

**Decision.** A shared `RedactionLayer` is applied by every observer
**before** the recorder persists anything. Secrets observed at runtime are
registered via `addSecret` and scrubbed everywhere after. Tracing is
disabled whenever authenticated storage state is in use (traces can contain
request headers and cookies).

**Rationale.** Evidence must be shareable without a leak review; the
gateway-injected auth headers (`X-User`, `X-Rbac-Filter` — RECON_B §2.3)
and per-call tokens are exactly the values that appear in network evidence.
A layer applied at persistence time cannot know runtime secrets unless the
recorder is fed them — hence the registry. Traces are the one artifact
format that captures raw headers wholesale, so auth state and traces are
mutually exclusive by construction.

**Consequences.** All text entering `event()` is already redacted; the
recorder shares one layer instance per run; `NIGHTWATCH_TRACE` defaults to
off; screenshots are failure-only under the same authenticated-state guard.

**Phase applicability.** 0/1 and all later phases.

---

## D-7 — Evidence as JSONL + manifest + summary; deterministic via injected clock and run-id override

**Decision.** The recorder writes `events.jsonl` (canonical), filtered
`network.jsonl`/`console.jsonl`, `manifest.json`, `summary.json`, and
`repositories.json` under `artifacts/<run-id>/`. Timestamps come from an
injected clock; `NIGHTWATCH_RUN_ID` overrides the run id.

**Rationale.** JSONL is append-friendly (events are produced incrementally,
crash-tolerant), stream-safe, and grep-able. Deterministic runs make
evidence diffable — the primary regression-detection mechanism — and
reproducible tests (two runs with fixed run-id and clock must produce
identical `events.jsonl`).

**Consequences.** `RunEvent.seq` is recorder-assigned monotonic; summary
counts are derived, never freeform; run-identity fields (`nightwatchSha`,
environment, product, scenario) live in manifest/summary so artifacts are
self-describing.

**Phase applicability.** 0/1 and all later phases.

---

## D-8 — Repo snapshots read-only; stat-cache nuance documented; working tree not authoritative

**Decision.** The snapshotter records branch, HEAD SHA, upstream,
ahead/behind, dirty state, last commit, and timestamp using read-only git
commands only. It never fetches, checks out, or writes git config.

**Rationale.** Nightwatch must never mutate the repos it watches. RECON_B
§3 shows local checkouts drift (ouchan 19 behind origin/master; ripple-ui
17 ahead of origin/dev) — the snapshot is evidence of **state at run time**,
not proof of freshness. `git status` may rely on the index stat cache, so
dirty counts are a hint, not a forensic truth; conclusions derived from a
snapshot must be re-verified against the cited SHA (D-12, Phase 3).

**Consequences.** The snapshot is a fact record feeding `repositories.json`;
freshness warnings (ahead/behind) surface in the summary; Phase 3 adds
re-verification before code-derived assumptions are used; L5 correlation
(RECON_B §11) requires a fresh fetch by a human, never an automatic one.

**Phase applicability.** 0/1 (collector), 3+ (freshness consumers).

---

## D-9 — Default local scenario targets a built-in fixture app; real local targets opt in via `--ui-url`

**Decision.** With `NIGHTWATCH_UI_URL` unset, the `local` environment serves
a built-in fixture app at `http://127.0.0.1:7311` (zero external network).
Real local targets require `--ui-url`, and the URL's host must still pass
the `local` allowlist.

**Rationale.** The default run must be safe and credential-free by
construction — no dev traffic, no cookies, no network beyond loopback —
while real local testing stays one flag away. The allowlist requirement
keeps the opt-in honest: `--ui-url` cannot smuggle in a non-local host.

**Consequences.** The fixture must emulate the candidate passive route
surface (dashboard, invoices, billing groups) with deterministic responses;
the smoke suite runs fully offline; `local.json` allows only
`127.0.0.1`/`localhost`/`[::1]`.

**Phase applicability.** 0/1 (fixture), 2 (real local/dev/next journeys
reuse the same `--ui-url` + allowlist path).

---

## D-10 — Self-tests default to `local`; the CLI requires `--env` (fail-closed)

**Decision.** `playwright.config.ts` sets `process.env.NIGHTWATCH_ENV ??=
'local'` for the test-suite convenience path. `bin/nightwatch.mjs` refuses
to run without an explicit supported `--env` (exit 2).

**Rationale.** Nightwatch's own tests must run with zero environment
plumbing; scenario runs, by contrast, must be deliberate — a scenario is
the thing that can touch the network. Two entry points with different
strictness, each documented at its definition site.

**Consequences.** `npm test`/`npm run typecheck` work out of the box; any
scenario run goes through the CLI and names its environment; the config
header documents why the default exists.

**Phase applicability.** 0/1 and all later phases.

---

## D-11 — Phase 1 journeys passive-only; mutation classification via `RIPPLE_MUTATION_PATTERNS`

**Decision.** Every journey step passes `assertPassiveAction`. Mutations —
create/edit/save/delete, finalize/calculate/recalculate, token
generate/revoke, commitment purchase/apply, registration, settings
mutation, and anything not provably passive — are never executed; they are
skipped and recorded.

**Rationale.** RECON_B E8: dev/next services share the production data
plane, so *no* write can be proven safe by environment choice alone. The
action policy is the primary mutation guard (a mutation request to an
allowlisted dev host would otherwise pass the outbound policy); the outbound
policy is the backstop for app-initiated traffic (D-2).

**Consequences.** `classifyRippleAction` labels steps `passive`/`mutation`;
unproven interactions are skipped-with-record, never attempted; later
phases relax only via explicit sandbox-MSP whitelists with read-back
(RECON_B §8, roadmap Phases 4–5).

**Phase applicability.** 0/1 (strict), 4+ (whitelisted sandbox mutations).

---

## D-12 — Provenance recording for every code-derived Alphaus assumption

**Decision.** Every host fact, route path, and behavior table Nightwatch
relies on cites its source as repo @ SHA (e.g. `ripple-ui src/config/common.js
@ d80b161b`; `blue-sdk-ts conn/conn.ts:6-7`; `blue-sdk-go conn/conn.go:14-17`;
RECON_B E1–E10). Provenance lives in config `label` fields and in
`src/core/safety/hosts.ts` comments.

**Rationale.** Code-derived assumptions rot silently; RECON_B §3 documents
real drift in the workspace (ouchan −19, ripple-ui +17). A cited SHA can be
re-verified mechanically; an uncited claim cannot. Provenance also feeds
Phase 3's change intelligence (diff a repo → re-check every assumption it
grounds).

**Consequences.** Config labels carry provenance strings; the host tables
are the single auditable source (D-3); the canary re-asserts the tables
against their own tests; Phase 3 adds drift detection.

**Phase applicability.** 0/1 (recording), 3+ (verification and
change-directed use).

---

## D-13 — No credentials in the repository; storage state referenced by path only

**Decision.** Credentials are never stored in the repo. Authenticated
state, when used, is loaded from a file path via
`NIGHTWATCH_STORAGE_STATE` (e.g. a `playwright codegen --save-storage`
output located outside the repo) or not at all; `.env` is gitignored;
`.env.example` holds placeholders only.

**Rationale.** The repository is private but artifacts are meant to be
shareable and evidence must stay credential-free (D-6). Path indirection
keeps the secret's lifecycle (creation, rotation, deletion) outside
Nightwatch entirely, and makes "no credentials in git/artifacts" a
structural property instead of a discipline.

**Consequences.** UNAUTHENTICATED is the default and is clearly marked in
evidence; authenticated runs require a pre-made storage-state file and
automatically disable tracing (D-6); a planted-secret smoke test proves
nothing leaks into artifacts.

**Phase applicability.** 0/1 and all later phases.

---

## D-14 — System Chrome via `channel`, no bundled browser download

**Decision.** The Playwright project drives the system Google Chrome
(`channel: 'chrome'`). Fallback (documented in `playwright.config.ts` and
README): `npx playwright install chromium` and remove the `channel` line.

**Rationale.** Avoids a ~150 MB browser download and its update drift;
system Chrome tracks OS security updates; the channel switch is a
one-line, documented fallback for machines without Chrome. Playwright's own
trace/screenshot/video capture is disabled in config because Nightwatch
manages its own evidence (D-7).

**Consequences.** Chrome must be present on dev machines/CI; browser
version differences across machines are possible and are recorded in
evidence via the browser field; the fallback path keeps the tool
installable anywhere.

**Phase applicability.** 0/1 and all later phases.

---

## D-15 — Service workers blocked natively; init-script stub adds evidence; alarm hard-fails any registration

**Decision.** Browser contexts are created with `serviceWorkers: 'block'`
(Playwright-native). An init script additionally stubs the Service Worker
API — `register()` rejects, `getRegistrations()`/`getRegistration()`
return empty, `ready` never settles — and emits a
`console.warn('[nightwatch] service-worker-blocked')` marker; any
`serviceworker` event that fires despite blocking is recorded as a hard
failure (`src/browser/context.ts` `containmentInitScript`, alarm handler).

**Rationale.** Service-worker-controlled fetches are not visible to
`context.route` interception — Playwright's documented recommendation is
`serviceWorkers: 'block'`. The native block is the guarantee; the stub
makes the block observable (app registration paths reject; evidence via
the console marker) and covers the empirically verified case where
`register()` resolves without creating a worker; the alarm turns any
actual registration into a hard failure so a containment violation can
never pass silently.

**Consequences.** `containmentInitScript` runs on every page via
`addInitScript`; SW-dependent features never work in Nightwatch runs
(acceptable — no Phase 1/2 journey needs them); evidence carries the
`service-worker-blocked` console marker.

**Phase applicability.** 1.1 and all later phases.

---

## D-16 — WebSocket policy via `context.routeWebSocket` with semantics identical to HTTP

**Decision.** `context.routeWebSocket('**/*')` governs WebSocket creation
with the **same** `OutboundPolicy.decide()` semantics as HTTP:
`allow` → `connectToServer()`; `block-telemetry` → `close()` (blocked,
recorded, not fatal); `deny` → `close()` + hard failure before any
communication. `ws:`/`wss:` are added to `NETWORK_PROTOCOLS`
(`src/core/safety/outboundPolicy.ts`) so the rule chain and
`isNetworkUrl` classify them exactly like http(s).

**Rationale.** A WebSocket is an outbound network connection carrying the
same data plane as HTTP; a policy weaker than the HTTP policy would be a
hole in the containment model. Telemetry WS are closed rather than
connected (blocked-not-failed, consistent with D-5); production/unknown
WS are closed and fail the run before meaningful communication.

**Consequences.** `handleWebSocket` in `src/browser/observers/networkObserver.ts`
mirrors `handleRoute` verdicts; a closed-without-connect WS surfaces to
the page as `onclose(code 0)`; unit tests cover ws/wss classification for
allow/deny/telemetry per environment (`tests/unit/safety.test.ts`).

**Phase applicability.** 1.1 and all later phases.

---

## D-17 — Redirect containment: Fetch-guard prevention + detect-and-fail

**Decision.** Redirect follow-up requests — which Playwright routing does
not re-enter (empirically verified: a 302's follow-up does not pass
through the route handler) — are governed by the L0 raw-CDP Fetch guard
(`src/browser/network/fetchGuard.ts`): a per-page `Fetch.enable` session
pauses every request (including follow-ups) and fails denied/telemetry
URLs with `Fetch.failRequest` BEFORE network I/O, recording evidence
once via the shared `blockedUrls` set (deduped against the L1 route
handler, which makes identical decisions). The L4 unrouted-request
detector remains as the detection backstop (any observed deny-class
request not governed within a 150 ms grace becomes a hard failure).
Evidence distinguishes the initial request (allowed) from the target
(denied). Chrome waits for every Fetch-enabled session to respond
(verified), so the guard always resolves its pauses.

**Rationale.** Playwright's route API cannot intercept follow-ups; a raw
CDP Fetch session can. An earlier attempt with `Network.setBlockedURLs`
was removed after empirical testing showed it preempted route-level
evidence for subresources while NOT blocking navigations — the Fetch
guard blocks both and never races L1 to a different decision.

**Consequences.** `onRequestObserved` in
`src/browser/observers/networkObserver.ts`; route handlers record into
`blockedUrls` synchronously so the grace timer never double-reports;
`onDownload` extends the same logic to downloads; residual gap documented
in SAFETY_MODEL §11.

**Phase applicability.** 1.1 (detect-and-fail), 2+ (prevention via L5).

---

## D-18 — Shared workers blocked at construction; dedicated workers remain allowed

**Decision.** The `SharedWorker` constructor is stubbed in the init
script: construction throws and emits a
`console.warn('[nightwatch] shared-worker-blocked')` marker. Dedicated
workers are left untouched.

**Rationale.** Empirically verified: a shared worker's fetch to a real
host bypasses Playwright routing entirely — there is no client-side
interception point after construction, so blocking creation is the only
containment. Dedicated-worker fetches were verified to enter the route
handler, so no blocking is needed. Fail-closed asymmetry: unverified
surfaces are blocked; verified surfaces are allowed.

**Consequences.** Shared-worker-dependent features never work in
Nightwatch runs; evidence carries the `shared-worker-blocked` console
marker; SAFETY_MODEL §10 lists both surfaces with their verification.

**Phase applicability.** 1.1 and all later phases.

---

## D-19 — Downloads: recorded and cancelled; cross-origin routed, same-origin benign

**Decision.** Every `download` event is recorded (redacted URL + policy
verdict) and the download is cancelled. Cross-origin download requests
are governed by L1 routing (denied per policy). Same-origin downloads can
bypass routing but are benign by construction — same origin means the
host is in the environment allowlist. A denied download URL that bypassed
routing is added to `blockedUrls` and hard-fails the run.

**Rationale.** Download-manager traffic is one of the browser paths
Playwright routing does not reliably see; the `download` event is the
authoritative observation point. Recorded-and-cancelled keeps evidence
complete without depending on the request path.

**Consequences.** `onDownload` in `src/browser/context.ts`; denied
downloads contribute `hard-failure` events (`path: 'download-cancel'`);
same-origin downloads appear as `warn`-level `download` events only.

**Phase applicability.** 1.1 and all later phases.

---

## D-20 — Storage-state secret rules: fail-closed validation, never read into evidence

**Decision.** `NIGHTWATCH_STORAGE_STATE`, when set, must satisfy all of:
absolute path; existing regular file; readable; located outside the
Nightwatch repo **and** outside the Alphaus workspace (`REPOSITORIES/`);
≤ 5 MB; JSON with the Playwright storage-state shape
`{ cookies: [], origins: [] }`. Any violation throws at startup
(`src/browser/fixtures/storageState.ts` `validateStorageStateFile`).
Nightwatch validates the shape but never reads cookie values into
evidence; `.gitignore` is hardened with auth/session filename patterns.

**Rationale.** Storage state is secret material (cookies from a real
login). Fail-closed location rules keep the secret's lifecycle outside
Nightwatch entirely (hardens D-13) and make "no credentials in
git/artifacts" a structural property; the size cap and shape check reject
garbage and misconfiguration at the earliest possible point — startup.

**Consequences.** `tests/unit/storageState.test.ts` covers every rule;
authenticated runs are impossible without a compliant external file; the
recorder never receives storage-state content.

**Phase applicability.** 1.1 and all later phases.

---

## D-21 — Authenticated traces always disabled; manifest records why

**Decision.** When authenticated storage state is in use, Playwright
tracing is **ALWAYS** disabled — even an explicit `NIGHTWATCH_TRACE=on`
cannot enable it (fail-safe). The manifest records
`trace.enabled = false` plus the reason via `addManifestEntry`
(`src/core/evidence/runRecorder.ts`); Nightwatch's own redacted
network/event evidence is preserved instead. This is an explicit
**security decision**, not a temporary accident.

**Rationale.** Playwright traces can embed request headers, cookies,
request/response bodies, and console content and cannot be sanitized
before persistence — no redaction layer can guarantee a trace artifact is
clean. The only correct policy is mutual exclusion of traces and auth
state. This hardens D-6 (which made the disable conditional on the trace
flag) into an absolute rule.

**Consequences.** `src/browser/context.ts` computes
`traceOn = traceRequested && auth === null`; authenticated runs emit an
`env` event explaining the forced-off decision; artifacts self-describe
via the manifest entry.

**Phase applicability.** 1.1 and all later phases.

---

## D-22 — Second containment layer deferred by design (Phase 2 prerequisite; superseded by D-23)

**Decision.** A second containment layer (L5) is designed but **not
implemented** in Phase 1.1: a local allowlist filtering proxy applying
the same allowlist semantics as `OutboundPolicy` (Chrome launched with
`--proxy-server=http://127.0.0.1:<port>`), or Docker network isolation
with default-deny egress for the future nightly runner. No iptables, no
root requirements in 1.1. The proxy would also govern future non-browser
tools (oops/CLI subprocesses) by forcing them through the same egress
gate.

**Rationale.** Browser-internal telemetry (Chrome metrics/safe-browsing)
is not visible to Playwright routing and is only mitigated by launch
defaults. Real dev/next sessions (Phase 2) raise the stakes, so the
second layer becomes a Phase 2 prerequisite gate rather than a 1.1 scope
item — keeping 1.1 free of root/network-admin complexity while the
browser-internal stack is proven.

**Consequences.** Phase 2 cannot start real dev/next sessions until L5
lands; SAFETY_MODEL §13 documents the design; ROADMAP Phase 2 carries the
gate.

**Phase applicability.** 2+ (implementation); design documented in 1.1.

---

## D-23 — L5 is a mandatory loopback proxy, explicitly configured at launch

**Decision.** Phase 1.2 implements L5 as a small Nightwatch-owned forward
proxy in `src/proxy/`. Playwright global setup starts it on loopback, performs
a health check, and writes runtime state. Chromium receives an explicit
`launchOptions.proxy` value; `HTTP_PROXY`/`HTTPS_PROXY` environment variables
are not a containment mechanism. Startup or health failure aborts controlled
browser execution; there is no continue-without-proxy path.

**Rationale.** The Phase 1.1 browser layers depend on code executing inside
Playwright. A separate local process boundary must remain active even if a
popup, redirect, worker, browser background channel, or future subprocess
escapes those handlers. Loopback-only binding needs no root, firewall rule, or
system-wide proxy change.

**Consequences.** The installed Chrome receives
`--proxy-bypass-list=<-loopback>` because loopback is otherwise special-cased;
the A/B sink test is the empirical proof. The proxy is required for all
Nightwatch browser runs and future browser integrations.

**Phase applicability.** 1.2 and all later browser phases.

---

## D-24 — One semantic policy source; proxy parsing is fail-closed

**Decision.** `OutboundPolicy.decide()` remains the only host/verdict
authority. Browser HTTP, browser WebSocket, and proxy policy consumers all
delegate to it. `src/proxy/policyAdapter.ts` only parses absolute URLs and
CONNECT authorities; malformed input, embedded credentials, trailing-dot
hostnames, invalid IPv4/IPv6 forms, missing ports, and unexpected ports reject
before DNS or TCP.

**Rationale.** Separate proxy host lists would drift from L0–L2 and make a
browser/proxy disagreement possible. Raw-authority rejection prevents WHATWG
URL canonicalization from turning a hostile spelling into an allow decision.

**Consequences.** `OUTBOUND_POLICY_VERSION` is recorded in the manifest;
`tests/unit/proxy.test.ts` compares direct policy, browser HTTP/WS consumers,
and proxy decisions across the full destination matrix.

**Phase applicability.** 1.2 and all later phases.

---

## D-25 — Proxy controls egress, not encrypted content

**Decision.** HTTP is forwarded only after policy classification. HTTPS/WSS
uses CONNECT tunnelling and WebSocket uses HTTP Upgrade where Chromium uses
that path. Nightwatch does not implement TLS MITM. Proxy evidence records only
sanitized destination metadata; browser L0–L4 evidence remains responsible for
request/response details.

**Rationale.** The required independent boundary is destination egress
control. TLS interception would increase secret exposure and create a second
certificate/security system without improving the allowlist decision.

**Phase applicability.** 1.2 and all later phases.

---

## D-26 — Non-HTTP browser channels are disabled or explicitly bounded

**Decision.** Nightwatch launches installed Chrome with `--disable-quic` and
`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`. Background and
speculative networking switches are enabled where supported by this Chrome
build. The observed Chrome control-plane hosts `accounts.google.com` and
`www.google.com` are explicit telemetry entries and are blocked locally by
L5. DNS prefetch visibility remains documented as **UNRESOLVED**.

**Rationale.** An HTTP CONNECT proxy cannot govern UDP QUIC or non-proxied
WebRTC. The conservative execution configuration removes those unnecessary
channels without claiming complete process isolation.

**Phase applicability.** 1.2; future L6 container supersedes residual DNS
and process-level concerns.

---

## D-27 — Historical Phase 1.1 production contact is recorded without inference

**Decision.** Documentation records one unintended intermediate-test contact
with `api.alphaus.cloud`, no intended production interaction, no mutation, and
no database query. Retained local artifacts did not identify the exact URL,
method, credential attachment, or response status, so those fields remain
`UNKNOWN`. Nightwatch makes no new production request to reconstruct them.

**Rationale.** Safety history must be accurate and auditable; replacing an
uncertain fact with a reassuring claim would be misleading.

**Phase applicability.** 1.2 and all later phases.

---

## D-28 — Stable project guidance and changing execution state are separate

**Decision.** `AGENTS.md` contains stable repository operating instructions
only. Task-specific and changing execution state lives under
`.agent/tasks/<task-id>/`; `.agent/ACTIVE_TASK.md` is the small routing file,
and `STATE.md` is the current operational waypoint. Project docs under
`docs/` remain durable project memory rather than minute-by-minute logs.

**Rationale.** Fresh sessions, interruptions, and context compaction cannot
depend on conversational/model memory. Separating the layers keeps durable
architecture and decisions readable while preserving the exact work-in-
progress, validation ledger, and next action needed to resume safely.
Current tests/runtime evidence and the working tree outrank task state, durable
docs, recon handoffs, and assumptions; contradictions are recorded and stale
documents are updated rather than silently reconciled.

**Consequences.** Every substantial task uses SPEC/PLAN/STATE/REPORT, updates
STATE at checkpoints, and completes with a report and handoff. The optional
`npm run agent:check` validator checks structure and reports current-SHA drift;
it never rewrites state. A fresh agent routes through ACTIVE_TASK and resumes
STATE instead of rediscovering the repository.

**Phase applicability.** 1.3 and all later phases.
