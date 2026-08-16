# Nightwatch Safety Model

Normative reference for every safety guarantee Nightwatch makes. Phase 0/1/1.1/1.2,
private local evidence triage, Phase 7 deterministic campaigns, and Phase
7B/7B.1/7B.1.1/7B.1.2/7B.2.1/7B.3 bounded private AI review assistance,
Phase 8A evaluated self-development sandbox safety, Phase 8A.1/8A.1.1
trusted evaluation provenance/replay/eligibility safety, Phase 8B
controlled source adoption sandbox safety, and Phase 8B.0.1
sandbox promotion-readiness closeout safety.
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

### Permanent owner scope freeze

The infrastructure and data layer is permanently out of scope for the active
Nightwatch roadmap. The executable owner policy in
`src/core/policy/ownerScope.ts` is authoritative and fails closed with
`OWNER_POLICY_BLOCKED` before any operation in these classes can run:

- GCP/GKE/Kubernetes, `kubectl`, Cloud Asset, deployment, logging,
  Artifact Registry, and service-account archaeology;
- AWS STS/IAM/runtime-role/account/infrastructure discovery;
- DynamoDB, BigQuery, Spanner, production SQL, and datastore metadata;
- deployment-configuration lookup, infrastructure-owner requests, or any
  external disclosure/publication.

This is `FROZEN_BY_OWNER` with reason
`INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`. It is an intentional boundary,
not a completion claim, implementation failure, or pending handoff. Historical
Phase 6 evidence and generic local safety models remain preserved, while real
datastore execution is quarantined behind the same policy gate.

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

### Protocol-oracle severity is separate from safety severity

Protocol/product findings such as `malformed-json` and `malformed-ndjson` are
recorded as sanitized oracle anomalies with response metadata only: origin,
path, method, status, content type, expected/observed protocol, and the
endpoint classification available to the observer. They are not containment
violations. Ordinary passive runs may still fail their configured oracle
verdict, but the direct authentication-state workflow does not use an oracle
finding as a safety-monitor failure. It continues to post-login verification,
where an unusable authenticated landing fails as `POST_LOGIN_NOT_CONFIRMED`.

The following remain hard safety failures in every workflow: production or
unknown destination attempts, containment bypasses, proxy liveness/process
loss, browser/guard/lifecycle failures, prohibited mutations, sensitive
artifact leakage, and equivalent policy violations. A malformed protocol
response does not weaken any of those controls.

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

## 14. DEV credential refresh and MCP boundary

Automatic authentication is a narrowly authorized DEV control-plane action,
not a product mutation. The designated account's username/password is stored
only in the external owner-only-file class (`$HOME/.nightwatch/secrets/` on
this host), with a private directory and atomic owner-only file write. The
interactive `npm run auth:configure` command accepts no credential arguments
or environment values and disables terminal echo. The provider API is
auth-only; exploration, planning, evidence, and change-intelligence code do
not receive the plaintext credential.

The refresh order is mandatory:

```text
exact DEV target + allowlist + production deny + proxy health
  + browser containment + authenticated privacy policy
→ source-backed login controls ready
→ retrieve credential
→ one username/password submission
→ human MFA wait if required
→ page-visible auth/readiness verification
→ temporary storage state validation in a fresh guarded context
→ atomic replacement of the previous external capture
```

An existing valid state is reused before this refresh path. A rejected
credential stops without retry. MFA is never bypassed. Login failures produce
only sanitized categories. Authentication is recorded as
`AUTH_SESSION_CREATION` with `productStateMutation=false`; the Phase 4
`mutations=0` invariant continues to mean prohibited product-state changes.

The discovered Chrome DevTools MCP server is `mcp__chrome_devtools` with 29
tools. MCP is optional and subordinate to Nightwatch's production deny,
canonical `OutboundPolicy`, mandatory proxy, semantic mutation/UNKNOWN
tripwire, approved action catalog, and browser containment. The current
architecture does not prove a dedicated Nightwatch-owned loopback CDP
attachment, so real authenticated attachment is disabled by safety. MCP does
not receive credentials, cannot attach to a personal browser, and cannot
replace primary Playwright evidence. Authenticated screenshots, heap
snapshots, broad DOM snapshots/evaluations, raw request inspection, and raw
console/customer text persistence remain prohibited.

## 15. Verification / test mapping

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
| DEV credential provider | `tests/unit/devCredentialProvider.test.ts` — external-only location, owner-only permissions, missing/unsafe state, safe metadata, and no credential CLI arguments |
| DEV login safety ordering | `tests/unit/devLoginSecurity.test.ts` — source-backed synthetic form, production-target rejection before provider retrieval, and synthetic MCP policy |
| Atomic refreshed auth state | `tests/unit/storageState.test.ts` — validated pending replacement and failed pending preservation |

---

## 16. Phase 7B/7B.1/7B.1.1/7B.1.2/7B.2/7B.3 bounded AI review safety

Phase 7B is an optional post-processing branch over sanitized deterministic
evidence. It is not a campaign stage, oracle, action planner, browser/API
client, credential consumer, database/infrastructure adapter, publication
connector, Git writer, or self-development loop.

The only accepted provider classes are `SYNTHETIC_LOCAL` and
`LOOPBACK_LOCAL`. The synthetic provider is required for acceptance and CI.
The loopback adapter requires an explicit `http:` endpoint at `localhost`,
`127.0.0.1`, or `::1`, the fixed model path, bounded input/output and timeout,
no credentials or arbitrary headers, no proxy, no redirect following, no
tools/functions, and no remote fallback. No cloud AI dependency, API key,
model download, or real model canary is required.

The input boundary reuses `nightwatch.ai-ready-evidence.private.v1` and
accepts bug drafting only at L2/L3. Exact-key runtime validators reject raw
data-shaped fields, secret/PII sentinels, non-PASS privacy, nonzero safety,
transient uncertainty, malformed input, invented references, and digest
tampering before provider invocation. Output validators reject unknown keys,
control fields, tool/shell/code/mutation/publication/Phase 6 language,
invented references, immutable-fact changes, oversized/malformed output, and
secret/PII sentinels. Errors contain only safe class/size/digest metadata.

Validated artifacts are explicitly `AI_GENERATED_UNREVIEWED`, carry visible AI
provenance, retain deterministic facts copied from input, and are written as
owner-only private companions outside Git. Phase 7B.2.1 makes their final
immutable publication one-shot: a complete READY envelope is written and
fsynced in a same-directory 0600 `wx` temporary, published with atomic
no-replace `fs.linkSync`, followed by temporary cleanup and containing
directory fsync. There is no rename/copy/unlink replacement fallback. Exact
duplicates may be idempotent at the artifact service layer; conflicting,
corrupt, or unsafe state fails closed.
The v2 generated schemas are immutable model artifacts; the v1 status-bearing
schemas are read-compatible only and never trusted as current owner authority
without a matching record. Human approval is a separate exact-key v2 record
bound to artifact ID, artifact kind/schema, full artifact digest, deterministic
review ID, `reviewerClass=OWNER`, and `publication=PROHIBITED`.

`AiReviewSession` is the only supported provider-execution authority. Candidate
and oracle attempt maxima are owner-request bounds; `providerCalls` is exactly
the number of attempts to enter a registered provider handler. The final
boundary calculates monotonic remaining runtime, rejects expiry and shared-cap
exhaustion, computes the effective timeout, creates cancellation context,
increments once, and enters the handler immediately in the same synchronous
stack. Invalid/locality failures and final-deadline expiry consume no provider
call; handler-entry throws, provider errors, rejected output, and
private-storage failures after entry consume the call and are not refunded.
Bug approval does not admit evidence or publish it. Oracle approval means only
`APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`; no registry, manifest, action,
source, request, or callback can be changed. Effective approval is derived from
the artifact, validated record, digest match, and current input; input
digest/snapshot changes make old artifacts `STALE`.

Phase 7B.2 adds only a private owner-review CLI over already-persisted
artifacts. `bin/ai-owner-review.mjs` accepts one exact `bug` or `oracle` ID and
only `show`, `status`, `decide`, and help. It imports a provider-free service;
there is no path to `AiReviewSession`, any provider, browser/API execution,
campaign execution, network, Git, directory enumeration, or publication.
`show` and `status` are read-only. `decide` requires a TTY, a fixed A/R/S/Q
choice, and an exact second confirmation token. A wrong token, empty input,
Q, or interrupt produces no review record.

The read/render service is separate from the internal `ownerDecision.ts`
writer, which is not exported by `src/core/aiReview/index.ts`. The raw
unconfirmed decision helper is private. Only `bin/ai-owner-review.mjs` loads
the confirmed writer, and only after the TTY gate, fixed menu, exact second
confirmation, and displayed artifact digest are in hand. The writer creates
only one v2 review through `createHumanReviewRecord()` and
`AiReviewArtifactStore.writeHumanReview()`, which uses the same atomic
no-replace primitive. It re-reads the record and checks review ID, artifact ID,
full artifact digest, decision, owner reviewer class, and publication
prohibition before applying the existing projection. A competing valid review
observes the winner as `AI_REVIEW_ALREADY_REVIEWED`; the AI artifact stays
immutable and deterministic evidence, campaign result, catalog, and
executable/publication boundaries do not change. V1 artifacts remain
show/status-compatible and read-only for new decisions.

Terminal output is a plain-text security boundary. Untrusted AI lines are
sanitized for ESC/ANSI, OSC/OSC52, C0/C1 controls, carriage return, backspace,
and Unicode bidi controls, then prefixed `[AI]`; deterministic fields and the
fixed decision boundary use `[SYSTEM]`. The display says
`SNAPSHOT_ONLY_NOT_REEVALUATED`, so owner review of an exact artifact snapshot
is never presented as current product verification or root-cause verification.

Phase 7B.3 is a separately invoked, one-shot local-model integration canary.
Its only input is a repository-defined synthetic L2 fixture and its only
operation is `BUG_CANDIDATE`. The controller creates no artifact store, makes
no oracle request, permits no retry, and keeps the validated v2 draft in
memory only long enough to produce sanitized metadata. The canonical loopback
provider remains unchanged: explicit loopback host, explicit port, fixed chat
path, no credentials, no redirects, no proxy, bounded request/response/time,
`stream:false`, no tools/functions, and no cloud fallback. A runtime/model
absence or unsafe/ambiguous endpoint is `NOT_RUN`, not an excuse to install or
download anything. A successful canary proves protocol compatibility only; it
does not promote evidence, create owner provenance, contact a product
environment, or authorize Phase 8.

The session runtime budget is separate from wall-clock artifact metadata. Its
default authority is Node's monotonic `performance.now()` in milliseconds;
tests may inject a monotonic synthetic clock. A single remaining-runtime
calculation is evaluated from the construction-time session anchor. At actual
provider entry the effective timeout is the minimum of the requested timeout,
the 5-second per-call policy cap, and the remaining aggregate session time.
The private handler receives an `AbortSignal`; when that bounded deadline fires
the session actively aborts the transport and settles the operation once. The
loopback adapter destroys its local HTTP request on abort, and the synthetic
PENDING fixture removes its resolver. This is a bounded cancellation deadline,
not a mathematically exact real-time OS guarantee.

The deterministic Phase 7 campaign is validated independently with AI absent;
there is no campaign-to-provider hook. Current safety acceptance requires zero
DEV/NEXT/production contacts, product mutations, database/infrastructure
queries, external publication, external AI calls, AI tool executions, and AI
source modifications. Phase 6 remains permanently `FROZEN_BY_OWNER`, and
Phase 8A remains a separate declarative evaluation companion.

Phase 7B/7B.1/7B.1.1/7B.1.2/7B.2/7B.2.1/7B.3 mapping: `tests/unit/aiReview.test.ts` covers DTOs, eligibility,
privacy/safety, references, immutable facts, synthetic failure modes,
prompt-injection/hallucination, invocation budgets, accounting, concurrency,
human review, staleness, forgery/corruption, owner scope, and oracle isolation;
`tests/unit/aiReviewLoopback.test.ts` covers endpoint class, request privacy,
redirect, response-size, and timeout containment; the focused provider matrix
also covers the stepped final-deadline edge, positive exposure, synchronous
throw, locality, cap, timeout, malformed output, storage failure, and active
cancellation. `tests/unit/agent-state.test.ts` covers same-value documentation
role forgery, direct claimed-commit role proof, STARTING_SHA lineage, carried-
forward anchors, merge ambiguity, drift, and live Git authority;
`tests/unit/privateArtifactAtomic.test.ts`, `tests/unit/aiOwnerReview.test.ts`,
and `tests/unit/aiReview.test.ts` cover the 91-test atomic/no-replace,
cross-process, exact-ID, terminal-sanitization, double-confirmation,
read-back, legacy, immutability, no-provider, and corrupt/symlink fixture
matrix; private CI runs that matrix independently. Full local validation passed
523/523 Playwright tests and the isolated clone passed the deterministic
acceptance checks. `bin/hardening-check.mjs` enforces the source-level
no-capability, no-replacement, and single-call-graph boundaries for both the AI
execution surface and the owner-review CLI. `tests/unit/aiLocalCanary.test.ts`
covers the fixed fixture/privacy adversary, strict CLI and endpoint matrix,
loopback request shape, one-call/no-retry controller behavior, failure
classification, no persistence, and sanitized output.

## 17. Phase 8A evaluated self-development sandbox safety

Phase 8A is evaluation authority only. Its trust model is

```
untrusted synthetic declarative proposal
        ↓
exact-key candidate DTO
        ↓
deterministic scope/safety/privacy/budget validation
        ↓
allowlisted local synthetic fixture/actions/assertions
        ↓
deterministic execution, duplicate, regression, and coverage gates
        ↓
private sanitized result → STOP
```

The only candidate schema is
`nightwatch.selfdev-candidate.private.v1`; the only kind is
`SYNTHETIC_REGRESSION_CASE`; and the only proposer class is
`SYNTHETIC_DETERMINISTIC`. The candidate is data, not code. Runtime exact-key
validation rejects unknown fields, code/source/patch/diff/file/path/command/
shell/script/URL/endpoint/prompt/model/tool/function/Git/output-path fields,
control characters, oversized values, unsafe fixture IDs, unknown actions,
unknown assertions, arbitrary expressions, fake coverage, and nonzero safety
vectors before fixture execution. No `eval`, `Function`, callback, source
patch, executable oracle, or generated oracle registration exists.

Only fixed `LOCAL_SYNTHETIC` fixtures run. Budgets are 3 candidates per
session, 8 actions and 8 assertions per candidate, 30 seconds per candidate,
and 120 seconds per session. Collections are bounded and deterministic;
semantic identity excludes timestamps, paths, and random values. Duplicate
and coverage results come from registered structural evidence, never from an
AI score or candidate claim.

Every evaluation uses
`nightwatch.selfdev-evaluation.private.v1`, carries
`adoptionStatus=NOT_AUTHORIZED_PHASE_8A`, `publication=PROHIBITED`, and
explicitly reports zero DEV/NEXT/production contacts, product mutations,
database/infrastructure queries, external AI/model calls, publication, Git
writes, Nightwatch runtime source writes, and Alphaus writes. A passing result
is `EVALUATED_PASS_NOT_ADOPTED`; there is no `AUTO_APPROVED`, `AUTO_ADOPTED`,
or `AUTO_COMMITTED` class.

The synthetic CLI has no network, browser, auth, database, infrastructure,
model, child-process, Git, or repository-source-write capability. Private
results, if persisted, use the hardened owner-only immutable store under the
separate `self-development` namespace and never enter campaign findings,
morning briefs, AI owner-review drafts, or public publication. Phase 8B source
adoption is not implemented and cannot be triggered by a passing candidate.

Phase 8A validation at implementation checkpoint
`d2a2978ede7c29d04e95f1625a736ce7c26004f9` passed typecheck, hardening, the
23-test focused matrix, the 546-test current suite, the isolated deterministic
checkout, and the existing AI/canary/provenance/agent-state/campaign gates.

## 18. Phase 8A.1 trusted evaluation provenance and replay safety

Phase 8A.1 adds integrity authority, not adoption authority. The v2 trust
chain is:

```text
clean local Nightwatch source
  → fixed sourceBundleDigest + evaluator contractDigest
  → real local Git HEAD and one session baseline
  → bounded replay descriptor
  → ordered stateful deterministic replay
  → semantic result-state and candidate/evaluation binding
  → content-addressed immutable v2 session
  → derived read-only trust assessment
  → stop
```

The session ID is recomputed from canonical semantic fields with the ID
omitted; a syntactically valid caller-supplied ID cannot select a filename or
pass validation. The evaluator state machine rejects enum-valid but impossible
tuples even when evaluation and session digests are recomputed. Replay
regenerates the exact bounded synthetic sequence in array order using a
constant injected monotonic clock and compares canonical evaluation bytes,
including execution fingerprint, coverage, candidate binding, baseline, and
zero-side-effect fields.

The authoritative source set is fixed in trusted code and includes the
self-development core, provenance/runtime boundary, policy inputs, wrappers,
package manifests, and lockfile. Its digest is length-prefixed over ordered
relative paths and exact bytes. `contractDigest` is a separate digest of the
declared schemas, registries, budgets, policies, state-machine version, and
replay algorithm; neither digest substitutes for the other. Documentation and
task files are outside this source set, so a clean documentation descendant
may remain source-equivalent while source drift fails closed.

Only `src/core/provenance/localGit.ts` may invoke Git at runtime, and only
with fixed no-shell read-only metadata operations: `rev-parse --show-toplevel`,
`rev-parse HEAD`, unstaged/staged `diff --quiet`, bounded fixed-path
`ls-files --others --exclude-standard`, and `merge-base --is-ancestor`.
There is no fetch, remote, checkout, reset, clean, add, commit, push, apply,
config mutation, or arbitrary argv/path forwarding. Dirty, staged, untracked,
non-Git, unavailable, non-ancestor, and zero-base conditions fail closed.

Persisted v2 artifacts require locally computed nonzero provenance, strict
validation, replay before write, immutable no-replace storage, exact-ID read,
and read-back replay. The verify CLI derives status and never writes an
assessment. Legacy v1 remains readable-only and unverified. A successful
assessment still reports `adoptionStatus=NOT_AUTHORIZED_PHASE_8A`,
`publication=PROHIBITED`, and zero source/Git-write/external-call counters.
The threat model excludes a malicious machine owner who rewrites source,
artifacts, and verifier together; no secret signing key is introduced.

## 19. Phase 8B controlled source adoption sandbox safety

Phase 8B adds exactly one new authority: translating one exact, current-
source-eligible declarative regression candidate into one deterministic
tracked-source postimage, applied and executed only inside a disposable
owner-private source mirror. The chain is:

```text
exact v2 session artifact + current local source provenance
  → assessFutureReviewEligibility(...) [reused verbatim from Phase 8A.1.1]
  → exact eligible candidate + matching EVALUATED_PASS_NOT_ADOPTED evaluation
  → base-independent adopted-case derivation (coverage re-derived, never trusted)
  → canonical on-disk catalog check + content-addressed immutable plan
  → TOCTOU revalidation (source bundle / contract / target preimage digests)
  → disposable owner-private source mirror (fixed authoritative path set only)
  → exactly one atomic write to the fixed target + exactly-one-file diff check
  → bounded serial cache-isolated load of the MODIFIED sandbox evaluator
  → four metamorphic probes
  → sanitized immutable private result
  → sandbox cleanup
  → canonical checkout proven byte-for-byte unchanged
  → STOP
```

There is deliberately no canonical source write step and no Git commit/push
step. `src/core/selfDevSandbox/` is a boundary distinct from the pure
`src/core/selfDev/` trust/evaluation domain (goal: keep the evaluation
domain free of filesystem-mutation authority). The only candidate source
remains the existing Phase 8A/8A.1/8A.1.1 deterministic pipeline; there is
no new proposer, no AI/model input, and no free-form patch/diff/path/
command field at any boundary.

The adopted-case catalog (`nightwatch.selfdev-adopted-case.v1`) is split
across a trusted schema module (`adoptedCases.ts`) and a strictly data-only
generated file (`adoptedCaseCatalog.generated.ts`) — the only file the
sandbox executor may ever rewrite, and only inside the disposable mirror.
Adopted-case identity is base-independent (excludes base SHA, current HEAD,
timestamps, and sandbox paths); coverage classes are always re-derived from
the fixed action registry via the same resolver the evaluator itself uses,
never trusted from a caller- or catalog-supplied field. The live catalog is
embedded directly in the evaluator contract manifest, so an adoption changes
`contractDigest`; both new catalog files and the entire
`src/core/selfDevSandbox/` module are members of `SELFDEV_AUTHORITATIVE_PATHS`,
so they change `sourceBundleDigest` too.

The planner is pure and deterministic: no filesystem mutation occurs during
planning. It requires `assessFutureReviewEligibility(...).eligible === true`
and the exact requested candidate ID to be present in that result's
`candidates`; a caller cannot supply a raw candidate object, bypass the
eligibility gate, or select an ambiguous evaluation binding (exactly one
matching `EVALUATED_PASS_NOT_ADOPTED` evaluation with a positive, re-derived
coverage-delta subset is required). An already-adopted entry (by ID or by
equivalent fingerprint) or a full catalog fails closed before any digest
computation; a non-canonical on-disk catalog fails closed before any plan is
produced. The plan itself binds a fixed, code-defined target path
(`src/core/selfDev/adoptedCaseCatalog.generated.ts`) that neither the
candidate, the artifact, nor the CLI can override, and is content-addressed
excluding its own ID, storage path, and any timestamp. `run` re-derives and
compares current source-bundle/contract/target-preimage digests against the
plan before any sandbox mutation; a documentation-only descendant (changed
HEAD, unchanged source/contract/target) remains runnable, while genuine
source drift, a newly-dirty tree, or a meanwhile-adopted duplicate fails
closed as `PLAN_STALE`/`ALREADY_ADOPTED`.

The sandbox mirror copies only the fixed authoritative path set into a
fresh 0700 directory under a fixed sandbox base outside the repository, the
parent workspace, and the private-findings root; every copy step rejects
symlinks and verifies the mirror's pre-mutation digest matches canonical
exactly before any write. Since Phase 8B.0.1, the sandbox base itself is
established by `ensurePrivateSandboxBase()`: the code-defined base path
(`$HOME/.nightwatch/selfdev-sandboxes`) and its pathname chain are validated
component-wise (lstat-first; symlink and non-directory components fail
closed; ownership validated where uid semantics exist; unsafe permission
state on the base fails closed with no chmod repair) BEFORE any chmod,
mkdir beneath, mkdtemp, file creation, or cleanup; missing directories are
created only beneath a previously validated parent, non-recursively, with
mode 0700, and immediately revalidated. The private parent reuses the
established private-artifact convention (a validated non-symlink
owner-matched directory is tightened to 0700, never loosened); `$HOME` and
arbitrary ancestors are never chmodded or created. Sandbox instances are
realpath-contained beneath the validated base and disjoint from the
canonical repository, the parent workspace, and the findings root. Exactly
one atomic write targets the approved
file; a post-write diff against canonical bytes must show exactly that one
path changed, or the run fails closed as `UNEXPECTED_CHANGED_FILE`. Cleanup
only ever removes a directory this module itself created beneath the fixed
sandbox base, verified by realpath strict-child comparison and lstat
immediately before deletion — any doubt returns `FAIL` and deletes nothing;
a residual directory is preferred to unsafe recursive deletion. The
TypeScript module loader is bounded to exact
absolute files beneath the resolved sandbox root (path-escape attempts throw
`SELFDEV_SANDBOX_LOADER_PATH_ESCAPE`), requires only the already-installed
local `typescript` package as a bare specifier, and is process-global-state
serial (a concurrent load attempt throws `SELFDEV_SANDBOX_LOADER_BUSY`); it
clears stale and newly-loaded module-cache entries under the sandbox root
before and after every load, so independent sandbox runs never leak or
inherit each other's state. Since Phase 8B.0.1 the serial lock is released
on EVERY exit path, including an early anchor/compiler-resolution failure.

The executor then evaluates the MODIFIED sandbox source directly — loading
the sandbox's own `contract.ts`, `evaluator.ts`, and `adoptedCases.ts` and
constructing a fresh `SelfDevEvaluator` seeded from the sandbox catalog's
own exported fingerprints/coverage — rather than simulating the postimage
in canonical code. Four metamorphic probes, built from the adopted case's
own base-independent semantics via a small trusted-code simulation of the
fixed action registry (never the evaluator under test), prove: the same
regression semantics under a different valid base SHA become
`REJECTED_DUPLICATE`; a same-coverage assertion variant also remains
non-new; a genuinely different coverage-adding action sequence still
evaluates `EVALUATED_PASS_NOT_ADOPTED`; and an unsafe candidate (nonzero
safety vector) remains `REJECTED_SAFETY` regardless of adoption state. The
post-mutation contract digest is required to differ from the pre-mutation
one, or the run fails closed as `SANDBOX_CONTRACT_NOT_CHANGED`.

Since Phase 8B.0.1, a claimed verified result means ALL FIVE proof fields —
preAdoption, postEquivalent, postVariantCoverage, nonOverreach, and
unsafeRegression — ran and passed: `NOT_RUN` is never an acceptable
verified state, and `FAIL` is never either. The executor cannot produce a
verified result when no bounded non-overreach probe exists
(`NON_OVERREACH_PROBE_UNAVAILABLE`) or when a probe ran and failed
(`NON_OVERREACH_REGRESSION`).

Sanitized results (`nightwatch.selfdev-adoption-sandbox-result.private.v1`)
never contain raw source, a patch/diff, or a sandbox filesystem path.
`sandboxSourceWrites`, `canonicalSourceWrites`, `runtimeGitWrites`, and
`externalCalls` are explicit counters; a claimed
`SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` result requires
`canonicalSourceWrites=0`, `runtimeGitWrites=0`, `externalCalls=0`,
`sandboxSourceWrites=1`, exactly one changed file equal to the fixed target,
differing pre/post source-bundle/contract/target digests, all five
metamorphic proofs exactly `PASS` (preAdoption, postEquivalent,
postVariantCoverage, nonOverreach, unsafeRegression — since Phase 8B.0.1
there is no `NOT_RUN` allowance on any proof), and successful
cleanup — enforced as a semantic invariant gate that a recomputed result ID
cannot satisfy for an impossible tuple (mirroring the Phase 8A.1.1 forgery-
resistance pattern from D-46). Plan and result records use the same
immutable, exact-ID, no-replace private storage primitive as every other
Phase 8A/8A.1 artifact, under a distinct `selfdev-adoption` namespace with
separate `plans`/`results` subdirectories; there is no list/enumeration/
latest lookup. Since Phase 8B.0.1 the plan and result `strategyClass` must
equal exactly `SELFDEV_ADOPTION_STRATEGY_CLASS`
(`DECLARATIVE_REGRESSION_CATALOG_PROMOTION`) — the single production
adoption strategy — checked at runtime before any identity recomputation, so
an unknown strategy cannot be legalized by recomputing a content-addressed
ID; plans additionally cross-bind `plan.strategyClass ===
plan.adoptedCase.strategyClass`. Failure records are truthful provenance:
`sandboxSourceWrites` tracks the actual executed effect (0 before the single
allowed write, 1 immediately after its success) on success and failure
alike, bounded to integer 0..1, with the canonical/Git/external counters
always 0.

The narrow CLI (`bin/selfdev-adopt-sandbox.mjs`) exposes only exact-ID
`inspect`, `plan`, and `run` subcommands; `run` requires the fixed
confirmation token `SANDBOX_ONLY` and no alternative (`--yes`, `--force`,
`true`, or any other string) is accepted. There is no `--path`, `--file`,
`--source`, `--code`, `--patch`, `--diff`, `--repo`, `--root`,
`--sandbox-root`, `--target`, `--command`, `--shell`, `--model`, `--prompt`,
`--url`, `--endpoint`, `--latest`, `--all`, `--apply`, `--commit`, `--push`,
or `--publish` option, and no `apply`/`promote`/`commit`/`merge`/`install`
command. A new narrow owner-policy operation
`SELF_DEVELOPMENT_SANDBOX_ADOPTION` authorizes only this sandbox-confined
write path; an unknown `SELF_DEVELOPMENT_CANONICAL_ADOPTION` operation
continues to fail closed like any other unrecognized operation string.
`bin/hardening-check.mjs` gained `checkPhase8BSandboxBoundary`, which
verifies authoritative-source-manifest coverage of every new file, scans
for forbidden imports/capabilities (network, child_process, AI review,
campaign, browser, database/infrastructure, Git mutation verbs) across
`src/core/selfDevSandbox/`, and proves via a call-graph scan that only the
CLI and the sandbox module itself can reach the sandbox source-write
executor.

`SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` means only that the deterministic
source transformation produced the expected behavior in a private
disposable source mirror. It does not mean canonical-applied, owner-
approved-for-canonical-mutation, Git-commit-authorized, or Git-push-
authorized. The real local acceptance exercise, performed against the
documentation-inclusive descendant
`36495b4df2c013d671a4983cd7991e1aecd9a25e` of the validated implementation
checkpoint `f04bb928890b8d730665b24cfd303386608b2a5a`,
confirmed the canonical adopted-case catalog file, its digest, and
`git status --short` were byte-for-byte unchanged immediately before and
after one full plan-and-run cycle; the disposable sandbox mirror directory
was removed by cleanup and no residue remained under the fixed sandbox
base. Zero DEV/NEXT/production contacts, product mutations, database/
infrastructure queries, external AI/model calls, or publication occurred at
any point. Phase 8B.1 — Owner-Gated Canonical Promotion — was at that time
a separate, `NOT_STARTED`, `NOT_AUTHORIZED` future task; this phase's plan
and result identities were designed to be consumable by that future gate
without re-deriving adoption semantics, and Phase 8B.1-R1 later consumed
them (see the Phase 8B.1-R1 safety update below).

### Phase 8B.1.0 safety update — bounded portfolio and explicit test baselines

Phase 8B.1.0 (see DECISIONS D-49) closed the structural blocker that
stopped the first real Phase 8B.1 promotion, with no safety-model
relaxation:

- The proposal portfolio is a small bounded set of trusted declarative
  descriptors (EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE) with registry-derived
  coverage and fingerprints; novelty selection is pure and deterministic and
  never depends on `baseNightwatchSha`, `seed`, `createdAt`, `candidateId`,
  time, randomness, or network. No new action capability, no callback, no
  candidate-controlled behavior, no production catalog-bypass switch, no
  `--variant`/`--empty-baseline` options.
- Portfolio exhaustion (both variants adopted) is a healthy terminal
  condition: sessions complete normally with zero pass candidates and
  `futureReviewEligible false`; the system does not manufacture fake novelty.
- Test baselines are explicit and isolated: temporary source fixtures render
  EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE catalogs via the real renderer,
  and the full selfDev stack is loaded coherently from each fixture. Tests
  never mutate the imported catalog array, never monkey-patch, never use an
  env-var bypass, and never let evaluation and replay disagree about the
  adopted state.
- At Phase 8B.1.0 the real canonical adopted-case catalog stayed EMPTY and
  one-entry/exhausted states existed only in temporary fixtures (superseded
  by the Phase 8B.1-R1 safety update below). The historically spent Phase 8B.1
  approval remains consumed; no new approval, no promotion retry at that
  checkpoint.

### Phase 8B.1-R1 safety update — owner-gated canonical promotion executed; authority partition clarified

Phase 8B.1-R1 (see DECISIONS D-49 lineage; R1 report in `.agent/tasks/`) ran
the ONE authorized fresh canonical promotion end to end under continuity
protocol v2, with no safety-model relaxation:

- The canonical promotion authority is a distinct, separately owner-gated
  capability (`SELF_DEVELOPMENT_CANONICAL_ADOPTION`): fresh session → fresh
  sandbox proof → one-entry future-state rehearsal → one promotion intent →
  one fresh one-shot approval (`CANONICAL_ONE_FILE_ONLY`, consumed exactly
  once) → one APPLY (exactly one file: the generated adopted-case catalog)
  → fresh-process verify (`CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`) →
  development-session commit. Runtime code never commits, pushes, or
  publishes (`runtimeGitCommit NOT_AUTHORIZED`); the approval is permanently
  spent and cannot be reused.
- The adopted-case catalog became exactly one canonical entry (variant A);
  the portfolio is NOT exhausted — variant B (EXPAND_THEN_COLLAPSE) is
  AVAILABLE_NOT_ADOPTED while promotion authority remains NONE. Candidate
  availability never implies promotion authorization.
- Canonical Nightwatch source promotion is NOT an Alphaus/product mutation:
  it changes only this private repository's generated declarative catalog,
  inside the owner-gated chain above. All browser/product/DB/infrastructure/
  publication boundaries are unchanged.
- Phase 8B.1-R1.1 (project-memory & canonical-source truth hardening)
  corrected the generated-source provenance comment (renderer + regenerated
  catalog) to state the two-writer partition explicitly — Phase 8B sandbox
  mirror-only writes OR Phase 8B.1 owner-gated canonical promotion, never a
  generic runtime self-modification authority — and introduced the read-only
  `nightwatch.project-state.v1` truth check. The historical R1 verification
  remains exact historical evidence; current source after R1.1 is a later
  validated state (strict provenance, not weakened).

### Phase 8B.0.1 closeout safety update

Phase 8B.0.1 (see DECISIONS D-48) strengthened the four trust boundaries of
this section and re-ran the real acceptance on the fixed implementation. The
sandbox base is now validated before any mutation (component-wise
lstat-first pathname chain; symlink/non-directory/owner/mode fail closed;
create-only-beneath-validated-parent with immediate revalidation; no chmod
of an unvalidated pathname or of `$HOME`/ancestors), instances are
realpath-contained and disjoint from the canonical repo, parent workspace,
and findings root, and cleanup requires strict realpath child containment.
Plan/result `strategyClass` is bound to the exact single strategy constant
before identity recomputation. A verified result requires all five
metamorphic proofs exactly `PASS` (`NOT_RUN` and `FAIL` rejected per field),
with `NON_OVERREACH_PROBE_UNAVAILABLE` and `NON_OVERREACH_REGRESSION` as
distinct executor failure classes. `sandboxSourceWrites` truthfully records
the actual executed effect (0 before the single allowed write, 1 after) on
success and failure alike, bounded 0..1. The fresh acceptance on the fixed
implementation — session
`session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`
(`VERIFIED_EXACT_BASE`, replay `PASS`), plan
`adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`,
result
`adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`
— verified `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` with all five probes
`PASS`, `sandboxSourceWrites=1`, zero canonical/Git/external counters,
`cleanupStatus=PASS`, and a byte-identical empty canonical catalog before and
after with a clean `git status`; the sandbox base contained no residue.
Zero DEV/NEXT/production contacts, product mutations, database/
infrastructure queries, external AI/model calls, or publication occurred.
The residual race assumption is unchanged: the implementation protects
against preexisting symlinked bases/parents, ordinary path confusion,
accidental symlink configuration, and symlink-target mutation before
detection — NOT against a malicious machine owner who can rewrite the
filesystem and source/verifier concurrently.


## 20. Phase 9/9A.1 semantic oracle and real-source admission safety

Phase 9 (D-54) and Phase 9A.1 (D-55) add deterministic semantic evaluation
to the read-only observation plane. Safety properties:

- Raw customer scalars never cross the projection boundary (opaque tokens/
  refs in an ephemeral in-memory context only; never persisted). Semantic
  findings, fingerprints, evaluation receipts, the observer ledger, and
  dossier evidence carry safe metadata only (sentinel matrix: zero leaks
  incl. derived forms and absolute private paths).
- Real-source expectations are admitted ONLY through the mechanical bridge:
  data-only recipe + fixed bounded syntax-aware extraction + deterministic
  source-evidence digest + approved read-only target + exact current source
  snapshot. Alphaus repositories are never annotated, executed, or
  modified; the extractor never runs application code, child processes, or
  network access. A provenance label alone grants no semantic authority;
  expectations are never silently re-bound to a new SHA.
- Every semantic evaluation yields a safe receipt
  (`nightwatch.semantic-evaluation-receipt.v1`); NO_EXPECTATION, SOURCE_
  STALE, SOURCE_UNAVAILABLE, NOT_APPLICABLE and INTERNAL_ERROR are never
  PASS; zero findings never proves PASS.
- Semantic-hook failures are never silent: safe INTERNAL_ERROR receipts are
  recorded; a privacy-contract violation escalates as a hard failure
  (reason `semantic-privacy-contract-violation`) through the existing
  monitor/safety architecture and can never become findings:[] / PASS /
  NOT_APPLICABLE.
- The Phase 9A.1 cores are statically guarded (hardening): no
  eval/child-process/fs/network/DB/AI/selfDev/persistence authority; the
  only sibling-source access is the read-only path-confined
  `src/core/source/siblingSource.ts`.
- Contained DEV semantic acceptance (Phase 9B) requires a separate owner
  authorization; the Phase 9B acceptance task (D-56) was authorized and
  executed once (see §21); the Phase 9B-R1 auth-refreshed retry (D-57)
  completed VERIFIED (see §22); any further DEV semantic acceptance
  requires a fresh owner authorization.

## 21. Phase 9B contained DEV semantic acceptance safety

The Phase 9B acceptance task (D-56) executed the ONE owner-authorized
contained DEV journey pair through a dedicated gated launcher. Safety
properties (all proven in the 2026-08-16 execution, which stopped
fail-closed at the pre-browser auth gate):

- **No shortcut context**: the full L0-L5 containment stack is unchanged
  (CDP Fetch guard, route + WebSocket policy, SW/SharedWorker blocking,
  unrouted-request detection, mandatory loopback proxy; QUIC and non-proxied
  WebRTC disabled; authenticated traces and screenshots always off). The
  Phase 9B runner reuses `createNightwatchContext`; there is no separate
  Phase 9B browser path.
- **No silent semantic authority**: the semantic oracle is an explicit
  caller option (`NightwatchContextOptions.semanticOracle?`); no global
  default, no environment-variable-created authority, no automatic
  expectation registry; the acceptance resolver exposes ONLY
  `ripple.common-exchange.read`, bound to the freshness-approved exact
  source snapshot.
- **Pre-browser metadata-only readiness gate** (`src/core/phase9b/
  preflight.ts`, 13 checks): nightwatch HEAD clean, exact-head
  implementation CI green, source freshness PASS, real expectation
  derived=1/current=1, target DEV-reachable + KNOWN_READ, mutation steps 0,
  auth structural PASS, proxy healthy, canonical DEV target exact,
  traces/screenshots off. ANY failure -> NO DEV CONTACT; the 2026-08-16 run
  proved the gate: it stopped on an expired DEV auth cookie before any
  browser context existed (zero DEV contact, zero artifacts).
- **Source freshness is remote, not local**: a local checkout HEAD is never
  automatically "current". Remote branch heads are established read-only
  (`gh api`) and classified (A-F); on advance, a disposable /tmp mirror at
  the exact remote SHA + fresh mechanical derivation are required; drift ->
  exact `PHASE_9B_BLOCKED_*` tokens. Canonical Alphaus sibling checkouts
  are never fetched/checked-out/reset/cleaned.
- **One pair, no retry**: exactly one FIRST + one fresh-context REPLAY per
  authorization; no second journey, no fallback, no third attempt, no
  campaign; auth between passes is re-gated; the launcher never re-runs
  itself.
- **Raw bodies stay ephemeral**: transient in-memory JSON text feeds the
  semantic projection only; receipts/findings/ledgers/reports carry safe
  metadata; a post-run structural audit (schema/key-level, never a dump)
  is part of the runner; evidence stays owner-local
  (`artifacts/<run-id>/`, mode 0700, gitignored).
- **The Phase 9B pure core** (`src/core/phase9b/`) is statically guarded
  (hardening): no network/fs/child-process/eval/persistence authority; the
  runner collects facts and injects them.

## 22. Phase 9B-R1 auth-refreshed retry safety (verified acceptance)

The Phase 9B-R1 retry (D-57, 2026-08-16) ran the same harness (zero source
changes) with a human-refreshed DEV session and achieved the clean
acceptance branch. Safety properties proven by the execution:

- **One invocation, two fresh contexts, zero violations**: exactly one
  launcher invocation created exactly two browser contexts (FIRST + REPLAY)
  and completed one journey pair; production attempts, NEXT contacts,
  KNOWN_MUTATION requests, ACTION_CAUSED_UNKNOWN requests, unknown
  destinations, proxy hard violations, DB/infra queries, screenshots,
  authenticated traces, and raw-body persistence were all zero in both
  passes; both recorders finalized passed=true.
- **Auth gating held end-to-end**: the structural/boolean precheck
  (expired=false) and the runner's own per-context auth validation
  (structural + live page readability) both passed; live page auth
  readability was VALID in both passes.
- **Freshness held**: remote heads re-discovered read-only and the selected
  expectation re-derived at the exact approved snapshot; resolver RESOLVED
  immediately before browser launch; no stale-SHA fallback.
- **Privacy audit PASS**: bounded structural/schema checks over the run
  evidence found no screenshots, no trace files, no storage-state copies,
  no media, no raw semantic scalars; receipts carried safe metadata only;
  evidence stayed owner-local (artifacts/<run-id>/, mode 0700,
  gitignored); no publication.
- **No post-hoc patching**: after the launcher invocation the Nightwatch
  implementation was not modified; the closure is docs-only.
- A clean PASS produced zero semantic-oracle recorder events (PASS receipts
  live in the observer's in-memory ledger, reduced to the safe acceptance
  summary) — consistent with the design, not a silent failure.

## 23. Phase 10A deeper real-source semantic contracts safety

The Phase 10A implementation (D-59) is LOCAL / SOURCE-ONLY / SYNTHETIC
ONLY; it adds TRUTH to the existing authority, not new authority. Safety
properties:

- **Zero new authority**: no DEV/NEXT/production contact, no new
  endpoints/journeys, no recipe re-targeting, no campaign/triage core
  change, no projection schema change, no Phase 6/AI/selfDev/promotion/
  catalog activity. The approved read-only target list and DEV-reachable
  list are byte-identical to Phase 9A.1 (asserted by the canary matrix).
- **Current-source discipline**: source truth is re-established read-only
  (git ls-remote; disposable /tmp snapshot at the current master
  `169df39d…`); the canonical sibling checkout is never fetched/checked-
  out/reset/cleaned. `ExchangeRate.php` byte-identical across the pins.
- **No stronger-than-source claims**: the D-58 "ARRAY when empty" reading
  is refuted by the actual cast direction (empty case casts to `{}` ⇒
  common-exchange `exchange_rate` OBJECT); payer-exchange OBJECT|ARRAY is
  proven; finite output-key sets are NOT mechanically provable
  (`SOURCE_ENUM_FLOW_UNPROVEN`) so NO finite-key invariant, NO
  class-constant extractor, NO `OBJECT_KEYS_SUBSET_OF` were admitted —
  a weaker proven invariant beats a stronger guessed one.
- **Extractor purity**: the new `PHP_ITEM_FIELD_TYPE_FLOW` extractor is
  fixed and bounded (token patterns only; `EMPTY_CAST_OBJECT` /
  `EMPTY_ARRAY_OR_STRING_KEYS`; anything else `TYPE_FLOW_AMBIGUOUS`); it
  never executes PHP/application code, never spawns processes, never
  touches the network or filesystem; the evidence digest canonical form
  and both extraction loops fail closed on unknown kinds (hardening
  guards `checkPhase10DeeperContractPurity` + `checkPhase10IntegrationSeams`).
- **Invariant purity**: `TYPE_IN_SET` consumes safe projections and
  declarative contracts only; missing paths and empty/uninspected parent
  arrays are NOT_APPLICABLE (ambiguity is never an anomaly); the valid
  empty-ARRAY representation of the payer OBJECT|ARRAY union PASSes —
  the Phase 10 design never introduces that false positive.
- **Privacy**: raw runtime values never enter contracts (only
  source-defined type vocabulary); the sentinel sweep + unknown-key probe
  assert zero leaks across projection serialization, digests, findings,
  fingerprints, receipts, campaign checkpoints, and dossier evidence;
  unexpected key text is never echoed downstream.
- **Identity truthfulness**: deep expectation IDs (`...real-source-deep`)
  are new; the historical `...real-source-shape` IDs remain historical-only
  (archived v1 recipes); Phase 9B-R1's PASS remains truthful at its old
  checkpoint; no expectation is silently re-bound.
- **Currentness fail-closed**: SHA change, deep-evidence change, unsupported
  new pattern, or unavailable source each fail closed (SOURCE_STALE /
  SOURCE_UNAVAILABLE / derivation failure); no auto-rebinding.

---

*End of SAFETY_MODEL. Normative for Phase 0/1/1.1/1.2, private local triage,
Phase 4 authentication/MCP, Phase 7 campaigns, Phase 7B/7B.1/7B.1.1/7B.1.2/7B.2/7B.2.1/7B.3 AI review,
and Phase 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1/8B.1.0 self-development evaluation,
controlled source adoption sandbox, and owner-gated canonical promotion;
Phase 9 deterministic semantic oracle depth; Phase 9A.1 real-source
expectation admission & semantic evaluation observability; Phase 9B
contained DEV semantic acceptance harness (implemented; acceptance BLOCKED
at the pre-browser auth gate); Phase 9B-R1 auth-refreshed retry
(COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED / PASS); and Phase 10A deeper
real-source semantic contracts (COMPLETE_LOCAL_SYNTHETIC; Phase 10B
separately authorized); changes require a
DECISIONS entry and a test update.*
