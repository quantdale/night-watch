# Nightwatch — CURRENT STATE

> Durable memory for the next agent/session. Last updated: **2026-08-13** at
> the Phase 6 fresh-session checkpoint. Phase 4 and Phase 5 are complete;
> Phase 6 is active.

---

## What exists now

Phase 0/1, Phase 1.1 (browser safety hardening), and Phase 1.2 (outer egress
containment) are complete. Nightwatch lives in
`REPOSITORIES/nightwatch/` as its own git repository (no remote). It reads the
Alphaus repos under `REPOSITORIES/alphauslabs` and `REPOSITORIES/mobingilabs`
strictly read-only.

### Phase 1.3 additions — durable agent continuity

Nightwatch now has a two-level durable memory protocol. Project memory remains
under `docs/` and answers “what is Nightwatch today?”; active execution memory
is routed through `.agent/ACTIVE_TASK.md` and stored under
`.agent/tasks/<task-id>/`. `AGENTS.md` is the concise permanent operating
contract. `SPEC.md` is frozen intent, `PLAN.md` is a living execution plan,
`STATE.md` is the current waypoint, and `REPORT.md` is the completed-task
handoff. The protocol explicitly supports fresh-session and context-compaction
recovery without conversational/model memory.

`bin/agent-state.mjs`, exposed as `npm run agent:check`, performs a local
consistency check for required files/headings, active status, task identity,
synthetic secret-like values, and current-SHA drift. It reports stale SHA
state without rewriting it. Phase 1.3 validation is local and synthetic only;
no real Alphaus environment, product session, database query, or mutation is
part of this phase.

### Phase 1.1 additions (this update)

| Area | What |
|---|---|
| Containment stack | L0 raw-CDP Fetch guard (`src/browser/network/fetchGuard.ts`) — pauses EVERY request incl. redirect follow-ups, fails denied/local-block URLs before network I/O; L1 `context.route('**/*')`; L2 `context.routeWebSocket('**/*')` (awaited — was unawaited, a real gap); L3 `serviceWorkers:'block'` + SW API stub + SharedWorker stub + `serviceworker` hard-failure alarm; L4 unrouted-request detection + download record/cancel |
| Policy | `ws:`/`wss:` are network schemes (`NETWORK_PROTOCOLS`) — WebSocket policy identical to HTTP; `isNetworkUrl()` helper |
| Storage state | Hardened secret handling: absolute path, external to repo+workspace, shape `{cookies, origins}`, ≤5MB, fail closed; explicit `storageStatePath` now validated too (was bypassed); `.gitignore` auth patterns |
| Traces | Authenticated runs ALWAYS disable Playwright traces (even `NIGHTWATCH_TRACE=on`); manifest records `trace.enabled=false` + reason via `addManifestEntry` |
| Outer containment | Mandatory loopback L5 forward proxy (`src/proxy/server.ts`) is started by Playwright global setup, health-checked, and passed explicitly to Chromium; HTTP and CONNECT/upgrade destinations are classified before DNS/TCP; no TLS MITM; sanitized `proxy.jsonl` plus `summary.json.proxy` aggregates |
| Policy consumers | `OutboundPolicy.decide()` is the only semantic policy source; named browser HTTP/WS consumers and `src/proxy/policyAdapter.ts` delegate to it; policy version is recorded in the manifest |
| Chromium egress configuration | Loopback proxy bypass removed with `--proxy-bypass-list=<-loopback>`; QUIC disabled; non-proxied WebRTC UDP disabled; background/speculative Chrome channels disabled where supported; observed Chrome Google control-plane preconnects are explicit telemetry and blocked locally |
| Fixtures | `safety` variant with `window.__nw` driver (SW/WS/SSE/popup/redirect/download/worker probes), RFC 6455 WS echo endpoint, SSE, redirect endpoints (prod target = `random.mobingi.com` — production-class AND DNS-unresolvable, zero real contact) |
| Tests | `tests/smoke/safety.smoke.ts` (23 network-surface cases), `tests/smoke/authenticated.smoke.ts` (2), `tests/unit/storageState.test.ts` (10), WS policy unit tests (8), manifest entry test |
| Docs | `docs/SAFETY_MODEL.md` (layers L0–L5, surface audit §10, residual gaps §11, auth sessions §12, second-layer design §13), `docs/DECISIONS.md` D-15–D-28, `docs/ROADMAP.md` Phase 1.2 + Phase 1.3 + Phase 2 L5 gate, `docs/recon/README.md` (handoff summaries), and `.agent/` continuity protocol |

## What works (verified)

| Capability | Evidence |
|---|---|
| Previous self-test suite | Phase 1.2 handoff at `ea2d327f54269c101123c2660a456e69dd319735` with `npx tsc --noEmit` PASS and `npx playwright test` **93 passed**; Phase 1.3 full validation is recorded below |
| Typecheck | `npx tsc --noEmit` → 0 errors |
| Service workers | `serviceWorkers:'block'` + stub: `register()` rejects, console marker recorded, SW script never fetched (`server.requests()` clean), no `serviceworker` event |
| WebSockets | allowed localhost WS connects + echoes (server counts upgrade); `wss://api.alphaus.cloud:8443` closed pre-connect + hard failure; unknown WS hard-fails; telemetry WS closed, run stays green |
| Popups | `window.open` popups inherit context policy (allowed loads fixture; prod/unknown → hard failure) |
| Redirects | allowed→allowed follows; allowed→`random.mobingi.com` (production-class) follow-up **failed by the Fetch guard before network** (`net::ERR_BLOCKED_BY_CLIENT`), evidence shows initial allowed + target denied; telemetry redirect blocked, no hard failure |
| Workers | dedicated-worker fetches routed + denied correctly; SharedWorker construction blocked (fetches would bypass routing) |
| EventSource/SSE | passes through route gate; client abort (`ERR_ABORTED`) classified benign (was a spurious issue) |
| Downloads | cross-origin download to denied host denied + cancelled; same-origin benign-by-construction |
| Telemetry / browser background | HTTP + WS telemetry and the three exact reviewed browser-background hosts are blocked-not-failed; related hosts remain fail-closed unknowns |
| Redaction | Authorization/Cookie/JWT fake secrets appear nowhere in artifacts; headers/URLs show `[REDACTED]` |
| Authenticated runs | fake storage-state secrets never enter artifacts; `trace.zip` absent; manifest documents trace reason; missing/misplaced/malformed storage state fails closed at context creation |
| Auth capture oracle handling | Protocol anomalies are recorded as sanitized `ORACLE_ANOMALY` evidence; safety/containment failures remain separate hard failures, and auth capture continues to post-login verification |
| No prod/DB/mutation | policy unit tests + canary; all Phase 1.2 browser tests use loopback fixtures and denied local alias `127.0.0.2`; production/unknown CONNECT tests stop at the proxy and never resolve or dial the destination |

## Phase 1.1 harness bugs found & fixed (by the test suite)

1. **Unawaited `routeWebSocket`/`route` registration** — left a window without WS interception and dropped-promise rejections on context close → both registrations now awaited before navigation.
2. **CDP `Network.setBlockedURLs` (old L0) removed** — empirically preempted route-level evidence for subresources while NOT blocking navigation follow-ups; replaced by the raw-CDP Fetch guard which pauses everything (incl. follow-ups) and makes the same policy decision.
3. **Explicit `storageStatePath` bypassed validation** — now goes through `validateStorageStateFile` like the env-var path.
4. **Spurious `malformed-json` on unreadable bodies** — body oracles run only when capture succeeded.
5. **SSE/abort misclassification** — `text/event-stream` excluded from NDJSON oracle; `net::ERR_ABORTED`/`ERR_BLOCKED_BY_CLIENT`/`inspector` classified as benign client/policy aborts (were spurious `request-failed` issues).
6. **Protocol anomalies were misclassified as safety failures** — `malformed-json` was included in ordinary `failOn` handling and the direct auth runner treated the shared failed bit as `SAFETY_MONITOR_FAILED`; safety failures and oracle failures are now tracked separately, while normal passive runs retain oracle-failure status.

## Historical Phase 1.1 safety event

During intermediate Phase 1.1 safety testing, before the final raw-CDP Fetch
guard was installed, one unintended production contact occurred at the
`api.alphaus.cloud` host. No intended production interaction, production
mutation, or database query occurred. The final Phase 1.1 implementation
blocked the demonstrated browser path; Phase 1.2 adds the independent outer
gate specifically so a browser/harness escape must defeat both layers.

Retained local Nightwatch artifacts were inspected before Phase 1.2. They do
not contain a matching production event, so the evidence-supported fields are:

| Field | Value |
|---|---|
| Attempted URL | **UNKNOWN** (host recorded as `api.alphaus.cloud`; exact path unavailable) |
| Method | **UNKNOWN** |
| Credentials attached | **UNKNOWN** |
| Response received | **UNKNOWN** |

No new request was made to production to investigate this historical event.

## Known residual gaps (Phase 1.2)

- A redirect follow-up racing an in-flight Fetch-guard install on a brand-new popup could complete before detection — detected (L4) but not prevented; closed by the second containment layer (see `docs/SAFETY_MODEL.md` §11/§13).
- HTTP/HTTPS/WS/WSS browser traffic is under L5. QUIC is disabled and WebRTC
  non-proxied UDP is disabled by the verified Chromium launch flag. Chromium
  control-plane preconnects to `accounts.google.com`/`www.google.com` were
  observed locally and are classified as explicit telemetry, then blocked by
  the proxy before upstream connection.
- DNS prefetch/resolver activity is not itself visible as a proxy event:
  **UNRESOLVED**. The proxy performs no DNS for denied/unknown targets and
  only resolves after an allow decision; a future restricted container is
  still required for complete process/network-namespace isolation.
- `serviceWorker.register()` may resolve under `serviceWorkers:'block'` (no worker is created — verified; the stub makes it reject for app-level evidence).
- Before Phase 2A, real dev/next sessions had not run; that historical
  statement is superseded by the completed Phase 2A record below. Authenticated
  traces remain disabled and real state remains external-only.

## Last successful checks (2026-08-09)

- `npx tsc --noEmit` — PASS
- `npx playwright test --project=nightwatch` — **93 passed, 0 failed**
- Focused Phase 1.2 proxy tests — 9 passed (3 unit/parser + 6 browser/sink tests)
- `NIGHTWATCH_RUN_ID=acceptance-11 npm run scenario -- --env=local` — 1 passed; artifacts in `artifacts/acceptance-11/` (passed=true, 0 hard failures, manifest carries `trace` decision)
- Sample Alphaus repos (ouchan, ripple-ui, ripple-api, invoice-ui, blueapi, blue-sdk-ts, blue-sdk-go) byte-identical before/after — PASS
- No production contact: all denied targets DNS-unresolvable or aborted pre-network; no DB tool used in session
- Phase 1.3 validator unit suite — `npx playwright test tests/unit/agent-state.test.ts` → **8 passed, 0 failed**
- Phase 1.3 full suite — `npx playwright test` → **101 passed, 0 failed**
- Phase 1.3 continuity check — `npm run agent:check` → PASS; no stale-SHA warning before the implementation commit

## Phase 2A — controlled authenticated DEV observation (complete)

The bounded Phase 2A task completed on 2026-08-12 using the canonical
`https://appdev.alphaus.cloud/ripple/` entry and a fresh human-authenticated
external Playwright state. The capture proved page-JavaScript auth visibility
with boolean-only diagnostics; no credential, cookie, token, DOM, body,
identity, screenshot, or trace material entered Nightwatch.

- Fresh capture: `nightwatch-20260811T183030Z-c652`; provenance matched `dev`.
- First run: `nightwatch-20260811T190009Z-efce-first`; final route
  `/ripple/dashboard`, QLayout shell present, `READY`, route stability `834 ms`.
- Fresh-context replay: `nightwatch-20260811T190009Z-efce-replay`; same final
  route and shell, `READY`, route stability `766 ms`.
- Auth replay: `CONFIRMED` in both runs; the prior expired capture remains a
  historical `AUTH_REPLAY_INEFFECTIVE` diagnosis, not a current-state claim.
- Both runs used the mandatory proxy/browser containment and passive-only
  observation. Production attempts, proxy violations, unresolved/unknown
  destinations, unknown approvals, mutations, and DB queries were all zero.
- The comparator recorded bounded non-fatal timing/request-count variance and
  one already-reviewed locally blocked browser-background attempt in the first
  run. Both runs had zero failed critical resources, zero runtime exceptions,
  and passed the same authenticated shell/readiness contract; no third replay
  was run.
- Privacy review passed for both sanitized artifact sets; authenticated traces
  and screenshots were absent. Full TypeScript, Playwright, agent continuity,
  and whitespace validation passed at task closure.

## Phase 4 — seeded/model-based exploration (complete)

The frozen Phase 4 task `phase-4-seeded-model-based-exploration` completed its
six-context DEV corpus on 2026-08-12. The fixed E1/J1, E2/J2, and E3/J3 seed
ledger ran serially in fresh contexts with the source-backed safe-action
catalog, deterministic model, mandatory proxy, production deny, mutation and
UNKNOWN tripwires, and metadata-first authenticated evidence. Production
attempts, proxy violations, unknown destinations/approvals, product mutations,
action-caused UNKNOWNs, and DB queries were all zero.

The designated DEV account was configured once through `npm run auth:configure`
using hidden input. The credential provider is an auth-only external
owner-only-file mechanism under the operator's local Nightwatch namespace;
credential contents remain outside Git, task state, argv, logs, evidence, and
MCP. Valid external auth state is reused first; one bounded guarded refresh
successfully established the current external state and replaced it atomically.

Chrome DevTools MCP discovery is durable as `mcp__chrome_devtools` with 29
tools, but real authenticated attachment remains disabled because the
loopback endpoint was unavailable and a dedicated contained browser ownership
path was not proven. Playwright remains the sole executor and MCP is optional.
The Phase 4 closure report and full run ledger are in
`.agent/tasks/phase-4-seeded-model-based-exploration/REPORT.md`.

Phase 2B, Phase 2C, Phase 3, Phase 4, and Phase 5 are completed predecessor
phases. Phase 6 local architecture and validation are complete, but its native
task is blocked under the explicit runtime/data environment gate:
`.agent/tasks/phase-6-readonly-data-evidence-cross-layer-oracles/`.

## Phase 6 — read-only data evidence (local architecture; blocked before live data)

Phase 6 has versioned typed query plans, DynamoDB/BigQuery/Spanner validators
and thin adapters, metadata-only normalization, cross-layer comparison,
source-to-store lineage, Phase 3 staleness integration, Phase 5 API linkage,
and synthetic adversarial coverage. The focused Phase 5 + Phase 6 suite passed
23/23 and the full Playwright suite passed 342/342; TypeScript, agent-check,
and diff-check passed. The 2026-08-13 continuation also repaired the narrow
agent-state allowlist for the sanitized Phase 6 runtime-binding checkpoint and
covered it with a regression test; SHA semantics remain `SYNCED`,
`CHECKPOINT_ADVANCE`, and `STALE`.

The real data gate remains closed as
`PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED`: current configuration and
source evidence do not prove which datastore environment the selected DEV API
runtime reads or establish a designated Nightwatch scope. No datastore auth
probe, query, scan, or write ran, and no live datastore verification is
claimed. The 2026-08-12 deployment/source re-audit confirms the DEV
`ripple-api-micro` image/branch path and deployment-provided AWS configuration
slots. Explicit read-only GKE metadata now confirms the live
`ripple-api-micro` Pod → ReplicaSet → Deployment chain, image digest, default
ServiceAccount, and Secret reference names in `mochi-dev-pong`/`labs-169405`.
GCR/Cloud Build/GitHub/source checks did not expose effective Secret-backed
`API_ENV`/AWS binding or designated scope, so the data environment remains
unresolved and no datastore query is authorized. Phase 7 has not started.

## Environment (machine facts)

- Node v22.22.1, npm 10.9.4, Playwright Test 1.62.1, TypeScript 5.x, git 2.43.0
- System Google Chrome at `/opt/google/chrome/chrome` via `channel: 'chrome'` (fallback: `npx playwright install chromium` + remove `channel` from `playwright.config.ts`)
