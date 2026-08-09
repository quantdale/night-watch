# Nightwatch — CURRENT STATE

> Durable memory for the next agent/session. Last updated: **2026-08-09** by the
> Phase 1.1 (SAFETY HARDENING) implementation agent, after the final acceptance
> run. Nightwatch HEAD at last update: `HEAD~0` of this commit (see git log).

---

## What exists now

Phase 0/1 **and** Phase 1.1 (safety hardening) are complete. Nightwatch lives in
`REPOSITORIES/nightwatch/` as its own git repository (no remote). It reads the
Alphaus repos under `REPOSITORIES/alphauslabs` and `REPOSITORIES/mobingilabs`
strictly read-only.

### Phase 1.1 additions (this update)

| Area | What |
|---|---|
| Containment stack | L0 raw-CDP Fetch guard (`src/browser/network/fetchGuard.ts`) — pauses EVERY request incl. redirect follow-ups, fails denied/telemetry URLs before network I/O; L1 `context.route('**/*')`; L2 `context.routeWebSocket('**/*')` (awaited — was unawaited, a real gap); L3 `serviceWorkers:'block'` + SW API stub + SharedWorker stub + `serviceworker` hard-failure alarm; L4 unrouted-request detection + download record/cancel |
| Policy | `ws:`/`wss:` are network schemes (`NETWORK_PROTOCOLS`) — WebSocket policy identical to HTTP; `isNetworkUrl()` helper |
| Storage state | Hardened secret handling: absolute path, external to repo+workspace, shape `{cookies, origins}`, ≤5MB, fail closed; explicit `storageStatePath` now validated too (was bypassed); `.gitignore` auth patterns |
| Traces | Authenticated runs ALWAYS disable Playwright traces (even `NIGHTWATCH_TRACE=on`); manifest records `trace.enabled=false` + reason via `addManifestEntry` |
| Fixtures | `safety` variant with `window.__nw` driver (SW/WS/SSE/popup/redirect/download/worker probes), RFC 6455 WS echo endpoint, SSE, redirect endpoints (prod target = `random.mobingi.com` — production-class AND DNS-unresolvable, zero real contact) |
| Tests | `tests/smoke/safety.smoke.ts` (23 network-surface cases), `tests/smoke/authenticated.smoke.ts` (2), `tests/unit/storageState.test.ts` (10), WS policy unit tests (8), manifest entry test |
| Docs | `docs/SAFETY_MODEL.md` (layers L0–L5, surface audit §10, residual gaps §11, auth sessions §12, second-layer design §13), `docs/DECISIONS.md` D-15–D-22, `docs/ROADMAP.md` Phase 1.1 + Phase 2 L5 gate, `docs/recon/README.md` (handoff summaries) |

## What works (verified)

| Capability | Evidence |
|---|---|
| Full self-test suite | `npx playwright test` → **84 passed** (56 unit + 25 safety/auth smoke + 2 pre-existing smoke + 1 scenario); green on 4 consecutive runs |
| Typecheck | `npx tsc --noEmit` → 0 errors |
| Service workers | `serviceWorkers:'block'` + stub: `register()` rejects, console marker recorded, SW script never fetched (`server.requests()` clean), no `serviceworker` event |
| WebSockets | allowed localhost WS connects + echoes (server counts upgrade); `wss://api.alphaus.cloud:8443` closed pre-connect + hard failure; unknown WS hard-fails; telemetry WS closed, run stays green |
| Popups | `window.open` popups inherit context policy (allowed loads fixture; prod/unknown → hard failure) |
| Redirects | allowed→allowed follows; allowed→`random.mobingi.com` (production-class) follow-up **failed by the Fetch guard before network** (`net::ERR_BLOCKED_BY_CLIENT`), evidence shows initial allowed + target denied; telemetry redirect blocked, no hard failure |
| Workers | dedicated-worker fetches routed + denied correctly; SharedWorker construction blocked (fetches would bypass routing) |
| EventSource/SSE | passes through route gate; client abort (`ERR_ABORTED`) classified benign (was a spurious issue) |
| Downloads | cross-origin download to denied host denied + cancelled; same-origin benign-by-construction |
| Telemetry | HTTP + WS telemetry blocked-not-failed; run stays green (was flaky under the removed CDP blocklist) |
| Redaction | Authorization/Cookie/JWT fake secrets appear nowhere in artifacts; headers/URLs show `[REDACTED]` |
| Authenticated runs | fake storage-state secrets never enter artifacts; `trace.zip` absent; manifest documents trace reason; missing/misplaced/malformed storage state fails closed at context creation |
| No prod/DB/mutation | policy unit tests + canary; all browser tests use localhost fixtures + unresolvable hosts (`random-host-xyz.alphaus.cloud`, `*.mobingi.com` random subdomains, `*.invalid`) |

## Phase 1.1 harness bugs found & fixed (by the test suite)

1. **Unawaited `routeWebSocket`/`route` registration** — left a window without WS interception and dropped-promise rejections on context close → both registrations now awaited before navigation.
2. **CDP `Network.setBlockedURLs` (old L0) removed** — empirically preempted route-level evidence for subresources while NOT blocking navigation follow-ups; replaced by the raw-CDP Fetch guard which pauses everything (incl. follow-ups) and makes the same policy decision.
3. **Explicit `storageStatePath` bypassed validation** — now goes through `validateStorageStateFile` like the env-var path.
4. **Spurious `malformed-json` on unreadable bodies** — body oracles run only when capture succeeded.
5. **SSE/abort misclassification** — `text/event-stream` excluded from NDJSON oracle; `net::ERR_ABORTED`/`ERR_BLOCKED_BY_CLIENT`/`inspector` classified as benign client/policy aborts (were spurious `request-failed` issues).

## Known residual gaps (Phase 1.1)

- A redirect follow-up racing an in-flight Fetch-guard install on a brand-new popup could complete before detection — detected (L4) but not prevented; closed by the second containment layer (see `docs/SAFETY_MODEL.md` §11/§13).
- Browser-internal background telemetry (Chrome metrics/safe-browsing) not visible to Playwright; largely disabled by launch defaults; second layer addresses.
- `serviceWorker.register()` may resolve under `serviceWorkers:'block'` (no worker is created — verified; the stub makes it reject for app-level evidence).
- Real dev/next sessions still NOT run; authenticated runs exercised only with synthetic storage state.

## Last successful checks (2026-08-09)

- `npx tsc --noEmit` — PASS
- `npx playwright test` — 84 passed (4 consecutive runs)
- `NIGHTWATCH_RUN_ID=acceptance-11 npm run scenario -- --env=local` — 1 passed; artifacts in `artifacts/acceptance-11/` (passed=true, 0 hard failures, manifest carries `trace` decision)
- Sample Alphaus repos (ouchan, ripple-ui, ripple-api, invoice-ui, blueapi, blue-sdk-ts, blue-sdk-go) byte-identical before/after — PASS
- No production contact: all denied targets DNS-unresolvable or aborted pre-network; no DB tool used in session

## Environment (machine facts)

- Node v22.22.1, npm 10.9.4, Playwright Test 1.62.1, TypeScript 5.x, git 2.43.0
- System Google Chrome at `/opt/google/chrome/chrome` via `channel: 'chrome'` (fallback: `npx playwright install chromium` + remove `channel` from `playwright.config.ts`)
