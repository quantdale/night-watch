# Nightwatch Safety Model

Normative reference for every safety guarantee Nightwatch makes. Phase 0/1/1.1/1.2.
This document is the contract that `src/core/safety/*`, the browser harness,
and the self-tests must satisfy. Design input: `NIGHTWATCH_RECON_B.md`
(cited by ID, E1–E10); host facts verified against
`mobingilabs/ripple-ui src/config/common.js @ d80b161b`,
`alphauslabs/blue-sdk-ts conn/conn.ts:6-7`,
`alphauslabs/blue-sdk-go conn/conn.go:14-17`.

---

## 1. Supported environments

| Environment | Supported | Config file | Target UI |
|---|---|---|---|
| `local` | ✅ | `config/environments/local.json` | `http://127.0.0.1:7311` (built-in fixture app by default) |
| `dev` | ✅ | `config/environments/dev.json` | `https://appdev.alphaus.cloud` |
| `next` | ✅ | `config/environments/next.json` | `https://next.alphaus.cloud` |
| `production` | ❌ **NOT supported** | `config/environments/production.json` | — |

`production.json` exists only to document the rejected surface for humans
and for the safety kernel's tests. The environment loader rejects it: config
`name` must be one of `local | dev | next`, so the file can never be loaded
(D-4). The CLI (`bin/nightwatch.mjs`) exits 2 on a missing or unsupported
`--env`. The Playwright config's `NIGHTWATCH_ENV ??= 'local'` convenience
default applies to Nightwatch's own self-tests only — real scenario runs go
through the CLI, which requires `--env` (D-10).

Every environment shares one rule that overrides all others:
**runs are strictly read-only in every environment**, because dev/next
services share the production data plane (RECON_B E8).

### Historical Phase 1.1 production contact

Before the final Phase 1.1 raw-CDP Fetch guard was installed, intermediate
safety testing caused one unintended contact with the production host
`api.alphaus.cloud`. There was no intended production interaction, mutation,
or database query. The final Phase 1.1 implementation blocked the demonstrated
browser path; Phase 1.2 adds an independent L5 gate.

Retained local Nightwatch artifacts were inspected before implementation and
contain no matching event. Therefore the exact attempted URL/path, method,
whether credentials were attached, and whether a response was received are
all **UNKNOWN**. No new production request was made to investigate this note.

---

## 2. Fail-closed rules

The policy fails closed at every decision point. There is no default-allow
path.

| Condition | Verdict |
|---|---|
| Host not present in any table and not the selected env's allowlist | **DENY** |
| `NIGHTWATCH_ENV` missing / empty / not `local|dev|next` | **DENY** (startup) |
| Known production host (`api.alphaus.cloud`, `bluerpc.alphaus.cloud`, `blue.alphaus.cloud`, `login.alphaus.cloud`, `app.alphaus.cloud`, `service.mobingi.com`, `login.mobingi.com`, `app.mobingi.com`) | **DENY** |
| Any `*.run.app` (GCP Cloud Run) | **DENY** |
| Any `*.alphaus.cloud` / `*.mobingi.com` not explicitly allowlisted | **DENY** |
| `localhost` family when the selected env does not allowlist it | **DENY** |
| Ambiguous target (host classification inconsistent, unparseable URL, unexpected scheme) | **DENY** |
| Unexpected external host | **DENY** |
| Environment config missing, invalid JSON, shape-invalid, or `name` mismatch | **DENY** (startup) |
| Exact reviewed browser-background host | **BLOCK** (abort; recorded; not fatal) |
| Telemetry host | **BLOCK** (abort; recorded; not fatal) |
| Non-http(s) scheme (`data:`, `blob:`, `javascript:`, …) | **ALLOW** (internal; never leaves the browser) |

A **DENY** is a hard failure: the request is aborted before leaving the
browser, a `hard-failure` event is recorded, and the run fails.
`hard-failure` is always in `failOn` and cannot be turned off
(`src/core/environment/types.ts`).

---

## 3. Explicit host classifications

Host classification is **explicit table membership**, never substring
matching on "prod" (D-3; RECON_B E9 shows where string-magic env detection
goes wrong). Tables live in `src/core/safety/hosts.ts`; the per-environment
allowlists live in `config/environments/*.json` and are the **only** route
to `allow` for http(s) requests (an entry without a port matches any port).

| Class | Hosts | Provenance |
|---|---|---|
| **production** | `api.alphaus.cloud` | ripple-ui `src/config/common.js @ d80b161b` (prod branches, lines 50–107); RECON_B E2 |
| | `bluerpc.alphaus.cloud` | blue-sdk-ts `conn/conn.ts:6` (`DEFAULT_BLUE_RPC_HOST="https://bluerpc.alphaus.cloud:8443"`); RECON_B E1 |
| | `blue.alphaus.cloud` | blue-sdk-go `conn/conn.go:14-17` (`BlueEndpoint="blue.alphaus.cloud:443"`); RECON_B E1 |
| | `login.alphaus.cloud` | blue-sdk-ts `conn/conn.ts:7`; ripple-ui common.js prod login branch; RECON_B E1, §2.3 |
| | `app.alphaus.cloud` | ripple-ui common.js @ d80b161b (prod app branch, lines 34–37); RECON_B E2 |
| | `service.mobingi.com` | ripple-ui common.js @ d80b161b (mobingi prod API branch, lines 100–103) |
| | `login.mobingi.com` | production.json `knownProductionHosts` (code-verified list) |
| | `app.mobingi.com` | ripple-ui common.js @ d80b161b (mobingi prod app branch, lines 40–42) |
| **production-class (rule)** | `*.run.app` | GCP Cloud Run services; RECON_B E6 (ouchan testclient binaries default to `…-prod-…run.app`), E7 |
| **dev** | `appdev.alphaus.cloud`, `apidev.alphaus.cloud`, `logindev.alphaus.cloud` | ripple-ui common.js @ d80b161b (dev branches); allowed only in `dev` env |
| | `servicedev.mobingi.com`, `appdev.mobingi.com` | ripple-ui common.js @ d80b161b (mobingi dev branch); allowed only in `dev` env |
| **next** | `next.alphaus.cloud`, `apinext.alphaus.cloud`, `loginnext.alphaus.cloud` | ripple-ui common.js @ d80b161b (next branches); allowed only in `next` env |
| **local** | `127.0.0.1`, `localhost`, `[::1]` | `local.json`; allowed only in `local` env |
| **unknown-alphaus** | any other `*.alphaus.cloud`, `*.mobingi.com` | deny — treated as hostile |
| **external** | everything else | deny |
| **static** | `fonts.googleapis.com`, `fonts.gstatic.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `unpkg.com` | `dev.json` / `next.json` `staticAssetHosts`; `local.json` has none |
| **telemetry** | `sentry.io` + `*.sentry.io`, `browser.sentry-cdn.com`, `google-analytics.com` + `*.google-analytics.com`, `googletagmanager.com` + `*.googletagmanager.com`, `mixpanel.com` + `*.mixpanel.com`, `cdn.mxpnl.com`, `amplitude.com` + `*.amplitude.com`, `segment.io` + `*.segment.io`, `intercom.io` + `*.intercom.io` | `telemetryHosts` in all three configs; wildcard = suffix match |
| **browser background** | `android.clients.google.com`, `update.googleapis.com`, `redirector.gvt1.com` | exact `browserBackgroundHosts` entries in all supported configs; no wildcard; local block only |
| **internal** | non-http(s) schemes | allowed; cannot leave the browser |

Classification nuance: a host's **class** (dev/next/local) does not grant
access. Access comes only from the **selected environment's allowlist**.
`apidev.alphaus.cloud` in a `next` run is an unknown Alphaus host → deny.

---

## 4. Known Alphaus environment hazards (RECON_B §4 E1–E10)

Reconnaissance proved that application-level environment selection cannot be
trusted. Every mechanism below is a way a local/dev/next run can touch
production; all are inert today but all are gated at request level.

| # | Hazard | Evidence | Nightwatch response |
|---|---|---|---|
| E1 | SDK default endpoints are **production** when env not set | blue-sdk-ts `conn/conn.ts:6-7`; blue-sdk-go `conn/conn.go:14-17` | `bluerpc.alphaus.cloud`, `blue.alphaus.cloud`, `login.alphaus.cloud` are deny-class; any SDK instantiated with defaults dies at the first request |
| E2 | UIs hardcode prod URLs (commitment MFEs) | `ui-commitment-inventory/src/services/commitmentInventoryService.ts:8-12`, `ui-commitment-manager/src/lib/http.ts:7-12,83`, `ui-commitment-planner/src/services/fetchPurchasePlanById.ts:76` | `api.alphaus.cloud` deny-class; env injection (`VITE_BLUEAPI_BASE_URL`/`BLUE_API_BASE_URL`) is a Phase 2+ concern, the request policy already backstops it |
| E3 | Legacy UI hostname→env fallback: localhost→local, unknown hostname→dev | `ripple-ui/src/axios.config.js:15-20`, common.js:52-96 | Nightwatch implements **no** hostname fallback; unknown → deny |
| E4 | aqua-ui has production as its only base | `aqua-ui/src/config/index.js:13` | deny-class; aqua is not a Phase 1 target |
| E5 | CLIs default `--env` to production | `iam/main.go:84`, `tucp/main.go:44-49`; host tables in `iam/params/params.go:4-6`, `tucp/params/params.go:3-5` | No CLI subprocesses in Phase 1; Phase 5 requires explicit `--env dev/next` + `RunEnv != "prod"` verification before dial |
| E6 | ouchan testclient binaries default to prod `*.run.app` | `ouchan/cloudrun/*/testclient/main.go:29-31` | `*.run.app` deny-class at request level |
| E7 | prod audience/params in raw Go services; a test helper maps dev/next → prod URL | `ouchan/pkg/marketplace/marketplace.go:17`, `genhostd/main.go:50-56`, `oopstester/gotests/helpers/url.go:117-134` | covered by the `*.run.app` + allowlist rules; the policy never consults app code |
| E8 | dev/next services **share the production data plane** (read and write prod DynamoDB/Spanner) | `PIPELINE_MAP.md:136344-347`, `DB_SCHEMA_REFERENCE.md:130-140` | **runs are read-only in every environment**; mutation-class interactions are blocked at the action policy (next section) |
| E9 | next-env detection is string-magic | `bluectl/pkg/grpcconn/conn.go:24-30` ("next" iff AuthUrl contains `"next"`) | no string matching anywhere in Nightwatch policy (D-3) |
| E10 | branch→env CI mapping for legacy deployments | `ouchan/services/ripple-api-micro/Makefile:15-51`, `wavereport/Makefile:15-58` | CI-controlled; outside Nightwatch's policy surface; documented for Phase 3 change intelligence |

Additional hazard (RECON_B §13.6): **cookie-based env resolution** —
ripple-ui's `app_type`/`api_type` cookies can redirect a "local" UI to
production. Nightwatch never injects cookies; storage state is loaded by
path only and is never written to the localhost target.

### Why env-vars alone are insufficient

Environment variables are developer-controlled strings that any of the above
mechanisms can bypass: a hardcoded URL, a cookie, an SDK default, a flag
default. Nightwatch does not try to make the app behave — it inspects the
request **after** the app has decided to send it, and stops it before it
leaves the browser. The policy's only inputs are the request URL and the
selected environment config; no application configuration inside Alphaus
repos is ever trusted (D-2).

---

## 5. Blocked behaviors (Phase 1)

Journeys are passive by construction. `src/core/safety/actions.ts` classifies
every scenario step via `RIPPLE_MUTATION_PATTERNS`; `assertPassiveAction`
rejects anything that matches, and **anything not provably passive is
skipped and recorded — never executed**.

Blocked behavior classes (Phase 1):

- create / edit / save / delete
- finalize / calculate / recalculate
- token generate / revoke
- commitment purchase / apply
- registration
- settings mutation

The two policies are complementary and must not be confused:

- the **action policy** prevents mutation-class *interactions* from being
  attempted (the primary guard — a mutation request to an allowlisted dev
  host would otherwise pass the outbound policy);
- the **outbound policy** is the backstop that catches any request the app
  makes on its own (hardcoded URLs, SDK defaults, cookie-driven redirects)
  to anything outside the allowed surface.

There is no "dry-run" mutation in Phase 1: the confirmation ladder (RECON_B
§11, L0–L5) and mutation whitelists belong to Phase 5+, and only against a
sandbox MSP per RECON_B §8.

---

## 6. Redaction model

Every piece of evidence — network lines, console lines, events, URLs,
bodies — passes through a shared `RedactionLayer`
(`src/core/safety/redaction.ts`) **before persistence**. The layer performs
no I/O; callers apply it, and the recorder shares one instance per run so
runtime-registered secrets propagate to all outputs.

1. **Runtime-registered secrets** — `addSecret(value)` registers an exact
   value (e.g. an `Authorization` header value observed on a request); every
   future redaction scrubs it. Values shorter than 4 characters are ignored
   to avoid over-redaction.
2. **Sensitive headers** — always redacted, by name:
   `authorization`, `proxy-authorization`, `cookie`, `set-cookie`,
   `x-api-key`, `x-user`, `x-rbac-filter`, `x-auth-token`, `x-access-token`,
   `x-refresh-token`, `x-id-token`, `x-csrf-token`, `x-csrf`, `x-auth`.
   (`X-User`/`X-Rbac-Filter` are the gateway-injected auth headers from
   RECON_B §2.3 — they carry base64 user and RBAC policy data.)
3. **Sensitive query parameters** — values redacted by name:
   `token`, `access_token`, `refresh_token`, `id_token`, `api_key`,
   `apikey`, `key`, `secret`, `signature`, `sig`, `password`, `passwd`,
   `auth`, `code`, `state`, `session`; plus URL userinfo (`user:pass@host`).
4. **Secret shapes in bodies and free text** — `Bearer <token>`, JWTs
   (three base64url segments), AWS access key ids (`AKIA…`), PEM private
   key blocks, and JSON secret fields (`"access_token": …`, `"password": …`,
   etc.).

Hard rules:

- No credentials in git: `.env` is gitignored and never committed; `.env.example`
  contains placeholders only.
- No credentials in artifacts: `artifacts/` is gitignored; evidence is
  redacted before the recorder writes it; the recorder's own tests assert a
  planted secret never appears in output.
- No credentials in screenshots/logs: screenshots are captured only on
  failure; tracing is **disabled whenever authenticated storage state is in
  use** (traces can contain request headers and cookies). `NIGHTWATCH_TRACE`
  defaults to off.
- Authenticated state is referenced by **file path only**
  (`NIGHTWATCH_STORAGE_STATE`), never inline (D-13).

---

## 7. Telemetry handling

Telemetry/analytics hosts are classified explicitly per environment
(sentry, mixpanel, intercom, Google Analytics/GTM, Amplitude, Segment —
plus their CDN subdomains). Chromium's observed control-plane hosts
`accounts.google.com` and `www.google.com` are also explicit telemetry-class
entries in all supported environment configs. Requests to them are:

1. **blocked** — aborted at the route handler before leaving the browser
   (sentry.io spans, analytics beacons, etc. never fire);
2. **recorded** — a `telemetry` event is written with the redacted URL;
3. **not failing** — telemetry is expected noise in real UIs; failing on it
   would make dev/next journeys unusable (D-5).

Blocking telemetry is a deliberate choice over letting it through redacted:
telemetry beacons still carry identifying data (session ids, page paths) and
should simply never leave the machine.

---

## 8. Canary

Before any browser launches, the startup canary
(`src/core/safety/canary.ts` — `runCanary`, `defaultCanaryChecks`,
`assertCanary`) asserts that the safety tables behave as specified. It
performs **zero network I/O**: no sockets, no DNS, no HTTP — pure policy
logic over in-memory tables and functions.

The canary checks, at minimum:

- environment selection rejects missing, unsupported, and `production`
  values; config validation rejects missing/invalid/mismatched files;
- every `KNOWN_PRODUCTION_HOSTS` entry → `deny` in every environment;
- `*.run.app`, unknown `*.alphaus.cloud`, `*.mobingi.com`, and unexpected
  external hosts → `deny`;
- each environment's allowlist hosts → `allow` **only** in that environment;
- localhost family → `allow` in `local`, `deny` elsewhere;
- exact browser-background hosts → `block-browser-background` and never `allow`/`deny`;
- telemetry hosts → `block-telemetry` (and never `allow`/`deny`);
- non-http schemes → `allow` as `internal`;
- redaction: a registered fake secret is absent from every redacted output
  form; sensitive headers/query params/shapes redact;
- the passive action policy rejects known mutation patterns and accepts the
  declared passive routes.

If any check fails, the run aborts at startup with a `hard-failure` —
before a single request could be made.

---

## 9. Browser containment layers (Phase 1.1) plus outer L5 (Phase 1.2)

The Phase 0/1 outbound policy is enforced inside the browser by a layered
containment stack, all derived from the single `OutboundPolicy.decide()`
(`src/core/safety/outboundPolicy.ts`). No layer may weaken policy; lower
layers only add early abort and detection for paths Playwright routing
does not see. Build order: `createNightwatchContext()`
(`src/browser/context.ts`); route/WS handlers in
`src/browser/observers/networkObserver.ts`.

| Layer | Mechanism | Role | Status |
|---|---|---|---|
| **L0** | raw-CDP Fetch guard per page (`src/browser/network/fetchGuard.ts` `installFetchGuard`): a CDP `Fetch.enable` session pauses EVERY request on the page target — including redirect follow-ups that Playwright routing never re-enters — and resolves each pause with the same `OutboundPolicy` decision (`deny`/any local block → `Fetch.failRequest`; `allow` → `continueRequest`) | browser-internal abort of denied/blocked requests **before** network I/O — the only abort layer for redirect follow-ups; evidence recorded exactly once via the shared `blockedUrls` set | backstop, never authoritative |
| **L1** | `context.route('**/*')` (`networkObserver.ts` `handleRoute`) | every ordinary HTTP(S) request — pages, frames, iframes, dedicated workers, EventSource, cross-origin downloads, popups (context-wide) — inspected before it leaves the browser: `allow` → continue; any explicit local block → abort (recorded, not fatal); `deny` → abort + hard failure | authoritative |
| **L2** | `context.routeWebSocket('**/*')` (`networkObserver.ts` `handleWebSocket`) | WebSocket creation governed with **identical** policy semantics: `allow` → `connectToServer()`; telemetry → `close()` (blocked, not fatal); production/unknown → `close()` + hard failure before any communication | authoritative |
| **L3** | `serviceWorkers: 'block'` + init script stubbing the Service Worker API and the `SharedWorker` constructor + `serviceworker` hard-failure alarm (`src/browser/context.ts` `containmentInitScript`, alarm handler) | service-worker fetches (never visible to Playwright routing) and shared-worker fetches (empirically verified to bypass routing) cannot exist; any SW that still registers fires a hard failure | native block + evidence |
| **L4** | unrouted-request detection (150 ms grace, dedupe via `blockedUrls`) + download record/cancel (`networkObserver.ts` `onRequestObserved`; `src/browser/context.ts` `onDownload`) | redirect follow-ups and download-manager traffic that escape routing are detected and recorded as hard failures; downloads are cancelled — the violation cannot escape evidence or the run verdict | detection + evidence |
| **L5** | mandatory local proxy (`src/proxy/server.ts`) started by `tests/globalSetup.ts`; explicit Chromium `launchOptions.proxy`; parser/policy adapter in `src/proxy/policyAdapter.ts` | governs HTTP forward traffic, HTTPS/WSS CONNECT, and HTTP Upgrade before DNS/TCP; denied/unknown destinations are rejected locally; sanitized events feed `proxy.jsonl` and `summary.json.proxy` | implemented; Docker namespace remains future L6 |

L0 pattern generation is per environment (`buildCdpBlockPatterns`): every
known production host and all `*.run.app` are always listed (exact
patterns); full-domain wildcards `*://*.alphaus.cloud/*` and
Chrome pauses a request for EVERY session that enabled the Fetch domain,
so the guard responds to every pause it receives (verified: a session
that never responds stalls the request). Because the guard and L1 make
identical policy decisions, their races are benign — whichever resolves
a pause first, the outcome is the same, and evidence is recorded once
via the shared `blockedUrls` set.

Trace policy is part of the stack contract: Playwright traces can embed
request headers, cookies, bodies, and console content and **cannot be
sanitized before persistence**, so authenticated runs always have traces
disabled — even against an explicit `NIGHTWATCH_TRACE=on` (§12).

---

## 10. Network surface audit

Every outbound surface a Chromium-based browser exposes, the layer(s)
that govern it, how the claim was verified, and any residual gap.
Empirical claims were verified on Playwright 1.62.1 with system Chrome
(`channel: 'chrome'`).

| Surface | Governed by | How verified | Residual gap |
|---|---|---|---|
| Ordinary HTTP(S) — pages, main frames | L1 | unit: `decide()` policy tests in `tests/unit/safety.test.ts`; smoke: `tests/smoke/safety.smoke.ts` | none |
| Iframes | L1 | smoke: `tests/smoke/safety.smoke.ts` (route coverage) | none |
| Redirects (302 etc. follow-up requests) | L0 (abort) + L4 (detection + hard failure) | empirical: a follow-up does **not** re-enter the route handler; L0 abort verified (`ERR_ABORTED`); smoke: `tests/smoke/safety.smoke.ts` | follow-up may complete in rare Chrome classifications before the abort — mitigated by L0 + L4 hard failure (§11) |
| Popups / new pages | L1 + L2 + L0 + all observers, auto-wired on `context.on('page')` | empirical: `page.route` would miss popup first requests — `context.route` is context-wide; smoke: `tests/smoke/safety.smoke.ts` | none |
| Dedicated workers | L1 (worker fetches are routed) | empirical: dedicated-worker fetches enter the route handler | none (no blocking needed) |
| Shared workers | L3 (constructor blocked via init script) | empirical: a shared-worker fetch to a real host bypasses routing entirely — blocking creation is the only client-side containment; smoke: `tests/smoke/safety.smoke.ts` | none in 1.1 (worker cannot be constructed) |
| Service Workers | L3 (`serviceWorkers: 'block'` + API stub + alarm) | empirical: blocking prevents SW script fetch and worker creation; smoke: `tests/smoke/safety.smoke.ts` | `register()` may resolve without creating a worker — stub rejects + emits console marker (§11) |
| WebSockets | L2 (`context.routeWebSocket('**/*')`) | unit: WebSocket policy tests in `tests/unit/safety.test.ts` (`ws:`/`wss:` in `NETWORK_PROTOCOLS`, `isNetworkUrl`); smoke: a closed-without-connect WS surfaces as `onclose(code 0)` in the page | none |
| EventSource / SSE | L1 | empirical: EventSource requests enter the route handler; smoke: `tests/smoke/safety.smoke.ts` | none |
| Downloads | L1 (cross-origin) + L4 (record + cancel) | empirical: cross-origin downloads are routed and denied; smoke: `tests/smoke/safety.smoke.ts` | same-origin downloads bypass routing — benign by construction (§11) |
| Browser background/speculative traffic | L5 proxy; explicit Chrome launch flags; the three exact reviewed hosts are browser-background classes and blocked locally | local Chromium run with system Chrome; proxy/browser evidence records local containment without upstream contact | DNS prefetch itself is not visible to the proxy (**UNRESOLVED**); future container closes the process-level gap |
| QUIC / HTTP3 | `--disable-quic` | installed Chrome launch command and local proxy tests | none observed in this configuration |
| WebRTC/STUN/TURN non-proxied UDP | `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` | installed Chrome launch command; no UDP fixture path is permitted | browser feature is disabled for non-proxied UDP; proxied TURN is not exercised |

---

## 11. Known residual gaps (Phase 1.2)

Accepted, documented residuals. None weakens the fail-closed verdict —
each is either detected and failed, or benign by construction:

1. **Redirect follow-ups: prevented by the Fetch guard (L0) in the
   common case.** Playwright does not re-enter the route handler for a
   302 follow-up; the raw-CDP Fetch guard fails the follow-up request
   (`Fetch.failRequest`) before network I/O, and the L4 detector records
   a hard failure if any follow-up is merely observed. The guard is
   installed per page at creation; a follow-up racing an in-flight guard
   install is detected (L4) rather than prevented — full guarantee
   across every page lifecycle is deferred to the second containment
   layer (L5).
2. **Same-origin downloads bypass routing.** The `download` event is
   still recorded and the download cancelled; the request is benign by
   construction because same-origin means the host is in the environment
   allowlist.
3. **DNS prefetch/resolver activity is unresolved at the browser process
   boundary.** The proxy does not resolve denied/unknown destinations and
   only calls `net.connect` after an allow decision, but DNS activity that
   Chromium performs speculatively is not a proxy event. This is why Phase
   1.2 does not claim complete network isolation and why the future L6
   container/network namespace remains planned.
4. **`serviceWorker.register()` may resolve under `serviceWorkers:
   'block'`.** No worker is created (verified), but the promise
   resolution itself is outside Playwright's control; the init-script
   stub makes the app's registration path reject and emits a console
   marker so evidence exists, and any actual `serviceworker` event fires
   a hard-failure alarm.

---

## 12. Authenticated sessions

Authenticated runs (a `NIGHTWATCH_STORAGE_STATE` file present) carry
secret material; two rules make them safe by construction.

### Trace policy — always off for authenticated runs

Playwright traces can embed request headers, cookies, request/response
bodies, and console content, and **cannot be sanitized before
persistence**. Therefore:

- traces are **always disabled** when authenticated storage state is in
  use — even an explicit `NIGHTWATCH_TRACE=on` cannot enable them
  (fail-safe; `src/browser/context.ts`);
- the manifest records the decision: `addManifestEntry('trace',
  { enabled: false, reason: … })` (`src/core/evidence/runRecorder.ts`),
  so every artifact self-describes why no trace exists;
- Nightwatch's own redacted network/event evidence (D-7) is the
  substitute for the trace.

This is an explicit security decision (D-21), hardening D-6, not a
temporary accident.

### Storage-state secret rules

`NIGHTWATCH_STORAGE_STATE` points at a Playwright storage-state JSON
file. The file is secret material: never committed, never copied into
`artifacts/`, never printed or logged, never included in summaries —
Nightwatch only ever passes the path to Playwright
(`src/browser/fixtures/storageState.ts`). Validation is fail-closed at
startup — any violation throws and the run aborts:

1. the path must be **absolute**;
2. the file must **exist**, be a **regular file**, and be **readable**;
3. the file must live **outside the Nightwatch repo and outside the
   Alphaus workspace** (`REPOSITORIES/`) — user-owned, outside source
   control;
4. the file must be **≤ 5 MB**;
5. the content must parse as JSON with the Playwright storage-state
   shape `{ cookies: [], origins: [] }`.

Nightwatch validates the **shape** but never reads cookie values into
evidence (unit: `tests/unit/storageState.test.ts`). `.gitignore` is
hardened with auth/session filename patterns so state files cannot be
committed by accident: `*.storage-state.json`, `*.storage-state`,
`storage-state*.json`, `storageState*.json`, `auth-state*.json`,
`auth*.json`, `session*.json`, `*.cookies.json`, `cookies*.json`,
`*credentials*.json`, `credentials/`, `.secrets/`, `*.token`,
`*.tokens.json` (`.gitignore`).

---

## 13. L5 outer proxy and future L6 container

The browser-internal stack (L0–L4) cannot see everything. Phase 1.2 moves
the egress gate outside the browser:

- **Local allowlist proxy (implemented).** `server.ts` handles normal
  forward-proxy HTTP, CONNECT tunnelling for HTTPS/WSS, and WebSocket HTTP
  Upgrade. `policyAdapter.ts` rejects malformed authorities and delegates
  all semantic decisions to `OutboundPolicy`. A denied/unknown destination
  is answered locally before DNS or TCP. TLS is never intercepted.
- **Mandatory browser integration (implemented).** Playwright global setup
  starts the proxy on loopback, performs a health check, writes runtime state,
  and fails the run if bind/health fails. The context repeats the health gate
  and polls liveness during execution; a mid-run proxy loss is a fatal
  hard-failure even if no later browser request occurs. Chromium receives an
  explicit proxy launch option; `--proxy-bypass-list=<-loopback>` is required
  because the installed Chrome otherwise treats loopback specially.
- **Sanitized evidence (implemented).** Proxy events contain only timestamp,
  run label, protocol, host, port, classification, decision, rule, and safe
  reason. Authorization, Cookie, Proxy-Authorization, bodies, query strings,
  and tokens are never persisted. Denied proxy events are fatal; telemetry is
  blocked without failing; aggregate counts are in `summary.json.proxy`.
- **Future L6 container (planned).** Browser and Nightwatch subprocesses will
  run inside a restricted container/network namespace whose default-deny
  egress permits only the Nightwatch proxy. This later covers Playwright,
  `oops`, CLIs, and model/API integrations.

Explicitly out of scope for Phase 1.2: no TLS MITM, no privileged firewall
rules, no root requirements, no production/dev/next session, and no Docker
implementation.

---

## 14. Verification / test mapping

Nightwatch's own self-tests prove each guarantee. Mapping of guarantee →
test (all under `tests/unit` unless noted):

| Guarantee | How proven |
|---|---|
| Production hosts rejected | Unit: `decide()` on every `KNOWN_PRODUCTION_HOSTS` entry in every environment → `deny`; `production.json` cannot be selected (`EnvironmentSelectionError`); `--env=production` → CLI exit 2 |
| Unknown hosts rejected | Unit: generated `*.run.app`, `*.alphaus.cloud`-unknown, `*.mobingi.com`-unknown, and external hosts → `deny` |
| Dev allowed in dev only | Unit: each `dev.json` allowlist host → `allow` in `dev`, `deny` in `local` and `next`; same for `next.json`; localhost `allow` in `local` only |
| Redaction | Unit: registered secret absent from `redactText`/`redactUrl`/`redactHeaders`; sensitive header names → `[REDACTED]`; query-param values → `[REDACTED]`; Bearer/JWT/AWS-key/PEM/JSON-secret shapes redacted |
| Snapshot read-only | Unit: snapshotter driven through an injected git runner that records every command → only read-only commands issued; repo working trees byte-unchanged before/after (D-8) |
| No fake secret in evidence | Smoke: run the local scenario with a planted secret (fixture issues a fake `Authorization` header) → grep all artifacts for the secret → absent |
| Mutation rejected | Unit: `assertPassiveAction` rejects every `RIPPLE_MUTATION_PATTERNS` class (create/edit/save/delete, finalize/calculate/recalculate, token generate/revoke, commitment purchase/apply, registration, settings); `classifyRippleAction` labels them `mutation`; declared passive routes pass |
| Reproducible run | Smoke: two runs with fixed `NIGHTWATCH_RUN_ID` and injected clock produce identical `events.jsonl` |
| Missing env denied | Unit: `selectEnvironment(undefined)` throws; CLI without `--env` exits 2 |
| Canary is offline | Smoke: canary completes without any network call (harness fails on any fetch attempt) |
| Containment layers L0–L4 | Smoke: `tests/smoke/safety.smoke.ts` — route coverage across the surface audit (§10: popups, dedicated/shared/service workers, EventSource, downloads), redirect follow-up prevention via the Fetch guard, WebSocket close semantics |
| Authenticated runs | Smoke: `tests/smoke/authenticated.smoke.ts` — storage state passes validation; traces forced off; manifest records `trace.enabled=false` + reason |
| Storage-state secret rules | Unit: `tests/unit/storageState.test.ts` — every fail-closed rule (absolute path, external location, regular readable file, ≤ 5 MB, `{cookies, origins}` shape) throws on violation |
| WebSocket policy | Unit: WebSocket describe block in `tests/unit/safety.test.ts` — `ws:`/`wss:` classified as network schemes; allow only via env allowlist; production/unknown deny; telemetry block-not-deny; `isNetworkUrl` classification |
| L5 parser and policy consistency | `tests/unit/proxy.test.ts` — browser HTTP/WS helpers, direct policy, proxy URL/CONNECT adapter decisions, casing, trailing dot, userinfo, invalid ports, production and unknown destinations |
| L5 upstream zero-connection evidence | `tests/smoke/proxy.smoke.ts` — allowed A (`127.0.0.1`) succeeds; denied B (`127.0.0.2`) receives zero TCP connections for direct HTTP, redirect, immediate popup, SharedWorker, Service Worker, and WebSocket attempts |
| L5 defense in depth | `tests/smoke/proxy.smoke.ts` — outer-only redirect records proxy DENY and sink count 0; normal Nightwatch context independently records browser hard failure for the same destination |
| Proxy failure modes | `tests/unit/proxy.test.ts` — unavailable startup health, close-during-run health state, malformed CONNECT, invalid hostname/port, IPv4/IPv6 forms, casing, trailing dot, embedded credentials, and unexpected port; context liveness polling converts a mid-run loss to a hard failure |

---

*End of SAFETY_MODEL. Normative for Phase 0/1/1.1/1.2; changes require a DECISIONS
entry and a test update.*
