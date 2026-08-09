# Nightwatch Safety Model

Normative reference for every safety guarantee Nightwatch makes. Phase 0/1.
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
plus their CDN subdomains). Requests to them are:

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
- telemetry hosts → `block-telemetry` (and never `allow`/`deny`);
- non-http schemes → `allow` as `internal`;
- redaction: a registered fake secret is absent from every redacted output
  form; sensitive headers/query params/shapes redact;
- the passive action policy rejects known mutation patterns and accepts the
  declared passive routes.

If any check fails, the run aborts at startup with a `hard-failure` —
before a single request could be made.

---

## 9. Verification / test mapping

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

---

*End of SAFETY_MODEL. Normative for Phase 0/1; changes require a DECISIONS
entry and a test update.*
