# NW-AUD-020 implementation-grade census — `nightwatch-semantic-request-admission-integrity-v1`

Repo (read-only): `/home/dalepalaca/.nightwatch/worktrees/nightwatch-priority-audit-remedi-0e17af9c`
HEAD at census: `24098097` (clean tree; no git mutations run; no files modified in the worktree).

## 1. Planning artifacts read

- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/proposal.md`, `design.md`, `tasks.md`, `specs/semantic-request-admission-integrity/spec.md` — planning-only change; tasks.md explicitly strikes all implementation items as out of scope.
- `.agent/tasks/nightwatch-semantic-request-admission-integrity-v1/{SPEC,PLAN,STATE,REPORT}.md` — Status COMPLETE, terminal planning task, `Exact Next Action: STOP`, starting/validated SHA `34517c9b…`.
- Umbrella sequencing: `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/{audit,tasks,design}.md` — Phase 5 = NW-AUD-020, executed last (010 → 014 → 019 → 018 → 020), tasks.md §6 items 6.1–6.3 all unchecked.

## 2. Live cited findings (file:line)

### 2.1 Unknown API requests allowed as `PASSIVE_UNKNOWN_OBSERVED`

| # | Finding | Cite | Severity |
|---|---|---|---|
| F1 | Disposition computed: unknown + (navigation intent OR return-to-anchor intent OR **no intent at all**) ⇒ `PASSIVE_UNKNOWN_OBSERVED`; only non-navigation active intent yields `ACTION_CAUSED_UNKNOWN`. This is the single point where navigation/startup/post-timer unknown traffic is relabeled passive. | `src/browser/observers/networkObserver.ts:272-284` (ternary at 278-284) | High (the defect) |
| F2 | The `allow` branch continues every allowed-host request regardless of passive disposition — only `KNOWN_MUTATION` (470) and `ACTION_CAUSED_UNKNOWN` (502) abort; everything else reaches `route.continue()` at 547. Passive unknown therefore crosses network I/O with no pre-effect authority. | `src/browser/observers/networkObserver.ts:447-547` (continue at 547; ws-skip continue at 441) | High |
| F3 | No-intent (startup/bootstrap/late) traffic: `action === null` branch of F1. Journey safety verdict also ignores passive count: `safetyStatus` fails only on `mutationCount`/`actionUnknownCount`. | `src/browser/observers/networkObserver.ts:282`; `src/core/journeys/engine.ts:501` | High |
| F4 | Post-action-intent path (journey engine): intent ends after fixed `sleep(ACTION_SETTLE_MS)` (250 ms) inside the action `finally`, **before** `waitForRequiredNetwork` and before the 10 s observation settlement barrier — a delayed unknown then becomes passive via `action === null`. | `src/core/journeys/engine.ts:346` (sleep), `:350` (endJourneyIntent), `:474-477` (settle `quietMs:500, timeoutMs:10_000`) | High |
| F5 | Exploration post-action path differs: intent held until expected reads settle (up to 30 s) or failure, then `endJourneyIntent` in `finally` — but `NAVIGATE_APPROVED_ROUTE`/`RETURN_TO_ANCHOR` kinds are still passive via F1. Asymmetric causality model vs engine (250 ms). | `src/products/ripple/explorationRuntime.ts:211` (begin), `:241` (150 ms wait), `:261` (end) | Medium |
| F6 | Evidence-only intent binding: per-request intent is snapshotted into a `WeakMap` **after** the allow decision — used for capture/evidence, never for admission. | `src/browser/observers/networkObserver.ts:510-514` | Info |

### 2.2 Action-intent timer semantics

- Constant `ACTION_SETTLE_MS = 250` with justification comment ("bounded lifecycle grace period, not a retry"): `src/core/journeys/engine.ts:33-37`.
- Applied only for non-navigation click/select steps: `src/core/journeys/engine.ts:346`; navigation steps hold intent through goto+stability+required-network (`:274` begin … `:316` end) but unknown during navigation is passive anyway (F1).
- What expires: the observer singleton `journeyIntent {stepId, actionType}`; `endJourneyIntent` nulls it (`src/browser/observers/networkObserver.ts:1261-1263`). `beginJourneyIntent` is fail-closed against concurrent actions (`:1255-1259` throws "a journey action is already active").
- Second timer: `OBSERVATION_GRACE_MS = 150` (`networkObserver.ts:79`) — only for the L4 unrouted-**host-deny** detector, not semantic.
- Journey contract also requires `routeStableMs >= 750` (`engine.ts:110-112`).

### 2.3 Redirect enforcement & host-only fallback

| Layer | Behavior | Cite |
|---|---|---|
| Playwright route (L1) | Does **not** re-intercept redirect follow-ups (empirically, Playwright 1.62.1). | `src/browser/network/fetchGuard.ts:4-7`; `src/browser/context.ts:6-7,23` |
| CDP Fetch guard (L0) | `Fetch.enable {urlPattern:'*'}` per page; `Fetch.requestPaused` handler destructures **only `p.request.url`** and calls `decideBrowserHttp` — host policy only; method/path/semantic match never consulted, so a redirect follow-up to a same-host unknown/mutation route continues. | `src/browser/network/fetchGuard.ts:75` (enable), `:89` (handler), `:94` (url only), `:99` (decide), `:101` (`Fetch.continueRequest`), `:187` (`Fetch.failRequest`) |
| L4 unrouted detector | `page.on('request')` records hard failure only when `decideBrowserHttp` verdict is `deny` — passive/unknown API traffic passes silently. | `src/browser/observers/networkObserver.ts:1183-1221` (check at 1185-1188) |
| Phase-5 API relay | `fetch(..., redirect:'manual')` + `callWithRedirectPolicy`: blocks any cross-origin redirect, and in `dev` mode any cross-path redirect; allowed same-origin+same-path redirect is followed once. Host authority via `OutboundPolicy.decide` + `requiredHostClass==='DEV_API'` — no endpoint-registry semantics. | `src/api/phase5/relay.ts:133-137` (policy), `:144-148` (manual redirect), `:200-231` (redirect policy, block at 214/220/226/228, approved at 230) |
| Smoke proof of host-only CDP path | `tests/smoke/safety.smoke.ts:374-480` exercises redirect-ok/prod/unknown — all decided by host class. Fixtures: `src/browser/fixtures/fixtureServer.ts:277-293`. | — |

### 2.4 Transport enforcement layers — where semantic authority is computed vs inherited

| # | Layer | File:line | Authority |
|---|---|---|---|
| L0 | CDP Fetch guard | `src/browser/network/fetchGuard.ts:75,89-101,187`; installed per page + popup: `src/browser/context.ts:454,468-479` | **Inherited host-only** (`decideBrowserHttp` → `policy.decide`) |
| L1 | Playwright `context.route('**/*')` | `src/browser/observers/networkObserver.ts:432-666` (`handleRoute`), install `:1236` | **Only place semantic authority is computed** (F1/F2; `matchEndpoint` at `:446-450`) |
| L2 | `context.routeWebSocket('**/*')` | `networkObserver.ts:669-733` (`handleWebSocket`, allow→`connectToServer()` at 686), install `:1237` | **Inherited host-only** — no endpoint/semantic match exists for WS at all |
| L3 | Service workers | `src/browser/context.ts:259` (`serviceWorkers:'block'`), alarm `:297-315` | N/A (blocked) |
| L4 | Unrouted-request detector + downloads | `networkObserver.ts:1183-1221`; `src/browser/context.ts:485-520` | Inherited host-only |
| L5 | Local outbound proxy | `src/proxy/policyAdapter.ts:88-106` (`classifyProxyUrl`), `:109-146` (`classifyProxyConnect`), `:149-163` (forward request); enforced `src/proxy/server.ts:343-346` (HTTP), `:434-437` (CONNECT), `:508-512` (WS upgrade) | **Inherited host/address-only** (`policy.decide`); `ruleId` at `policyAdapter.ts:30-48` is a reason-string label, not a semantic rule |
| Relay | Phase-5 API relay | `src/api/phase5/relay.ts:133-137`, `:297`, `:399-400` | Inherited host-class + catalog operation identity (`requiredHostClass`), not endpoint-registry semantics |
| — | Policy consumers (single source) | `src/core/safety/policyConsumers.ts:9-16` — both HTTP and WS consumers are thin wrappers over `policy.decide` | Host/address classification only; comment claims "one semantic source of truth" but that truth is host policy |

Downloads/watch: only `route.continue` call sites in all of `src/` are `networkObserver.ts:441,547` (verified exhaustive grep). `Fetch.requestPaused` exists only in `fetchGuard.ts`.

### 2.5 Structures an admission handle would bind

- **Endpoint registry**: `EndpointSemanticRule {id, host, method, path?|pathPattern?, classification, provenance}` — `src/core/safety/endpointSemantics.ts:14-25`; default registry intentionally empty `:28`; match returns `{ruleId, classification}` (`:84-103`); path pattern must be fully anchored `^…$` (`:56-68`); non-API host ⇒ `null`, API host without rule ⇒ `UNKNOWN` with `ruleId:'unreviewed-api-endpoint'` (`:97-101`).
- **Source proof today**: free-form `provenance: string` on rules — no SHA/currentness binding in the type. Journey contracts carry `sourceSha: RIPPLE_PHASE_2B_SOURCE_SHA` (`src/products/ripple/journeyContracts.ts:29,163,217,268`); registry builder `buildRippleJourneyEndpointRegistry` (`:344`) supplies reviewed rules (`rule()` helper `:327-338`). Wiring: `src/browser/context.ts:85` (`endpointRegistry?`), `:329` (`endpointMatcher`).
- **Semantic ledger / receipt shapes**: `SemanticRequestDisposition`/`SemanticRequestObservation` (`networkObserver.ts:189-201`); bounded semantic-evaluation receipts `MAX_SEMANTIC_EVALUATION_LEDGER=512` (`:73`); Phase-22 privacy receipts — these are the closest existing "admission receipt" analogues.
- **Navigation bootstrap handling**: none exists — bootstrap/startup unknown traffic is simply labeled passive (F1/F3). Bootstrap diagnostics hooks are resource-only (`src/browser/context.ts:53,82-83,294`; `src/browser/observers/bootstrapHooks`). Journey `validateDefinition` requires `unknownEndpoints.length === 0` (`engine.ts:104-106`) — contract-level, not request-level.
- **Generation/frames/popups/workers**: no generation concept exists. Frames + dedicated workers covered only because L1 is context-wide (`networkObserver.ts:7-10`); popups auto-wire page handlers (`:1240`) and a fresh CDP guard (`context.ts:468-479`); service workers blocked (`context.ts:259`). Concurrency is a single singleton intent that throws on overlap (`networkObserver.ts:1255-1259`) — a generation model must preserve or supersede this fail-closed behavior.

## 3. Drift since planning

- `git log/diff 34517c9b..HEAD` over all cited surfaces (`src/browser/**`, `src/core/journeys/**`, `src/core/safety/**`, `src/proxy/**`, `src/api/phase5/**`) is **empty** — zero drift; the defect is byte-identical to the planning evidence. HEAD advanced to `24098097` only via NW-AUD-019/014/018-planning commits on other files.
- NW-AUD-018 implementation (Phase 4) is **not yet done** (umbrella tasks.md §5 all unchecked) — 020 will land after it, so its primitives (authenticated writer firewall / route identity) should exist by Phase 5.

## 4. Dependency overlap with NW-AUD-018 (evidence minimization for admission receipts)

- Cross-phase audit is mandatory: "018 vs 020 (admission receipts satisfy minimization without concrete route parameters)" — `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/design.md:82-83`.
- 018 live defect files: `src/core/safety/redaction.ts`, `src/core/evidence/runRecorder.ts` (authenticated URL reducer preserves lowercase identifier segments; writer bypasses) — `audit.md:20`.
- Concrete overlap points: the admission handle/receipt must carry only categorical identity (ruleId/class/generation), never URL path/query values — this leans on 018's fixed authenticated sanitizer for any recorder persistence. Existing precedent already categorical: `ACTION_CAUSED_UNKNOWN` hard-failure records placeholder URL `https://semantic-endpoint.invalid/` (`networkObserver.ts:320`) and `EndpointSemanticMatch` deliberately returns rule identity only, "URL paths and query values are never returned to callers for persistence" (`endpointSemantics.ts:79-83`).
- Sequencing constraint: Phase 4 → Phase 5 order in `tasks.md §5/§6`; Phase 3 primitives (structural screening, NW-AUD-019) are reused by 018, which 020 receipts then consume.

## 5. Likely affected tests (exact paths)

Behavior-encoding (will need rewrite when passive allow is removed):
- `tests/unit/journeyEngine.test.ts` — `:125` "distinguishes passive UNKNOWN", `:129` asserts `passiveUnknownCount > 0`; `:135` late-response attribution; `:169` unknown-caused not blessed; fixture registry at `:81`.
- `tests/unit/exploration.test.ts` — disposition/safety summaries (passive vs action-caused).
- `tests/unit/networkObserverSettlement.test.ts` — intent/settlement interplay.
- `tests/unit/observerSemanticLedger.test.ts`, `tests/unit/semanticIntegration.test.ts`, `tests/unit/endpointSemantics.test.ts`, `tests/unit/c07DerivedSemantics.test.ts`.
- `tests/smoke/safety.smoke.ts` (`:374-480` redirect matrix) and fixture-based smoke: `tests/smoke/passive-run.smoke.ts`, `tests/smoke/negative.smoke.ts`, `tests/smoke/authenticated.smoke.ts`.
- Proxy/transport: `tests/unit/proxy.test.ts`, `tests/unit/proxyResolvedProtocols.test.ts`, `tests/unit/addressPolicy.test.ts`, `tests/unit/proxyPortLeaseStress.test.ts`, `tests/unit/l6Containment.test.ts`, `tests/unit/monitor.test.ts` (Fetch-guard evidence), `tests/unit/containmentEffect.test.ts`, `tests/unit/resolvedEgressHardening.test.ts`.
- Relay: `tests/unit/nw05RelayDeadline.test.ts`, `tests/unit/phase5Api.test.ts`, `tests/unit/phase5Fixture.test.ts`.
- Harness consumers of `createNetworkObserver`: `tests/unit/phase9a1GapReproduction.test.ts`, `tests/unit/phase9bHarness.test.ts`, `tests/unit/phase10bHarness.test.ts`.
- Manual (real-campaign, not run locally): `tests/manual/phase{2b,2c,4,7,9b,10b}-*.ts` — all wire `buildRippleJourneyEndpointRegistry`.

Fixtures:
- `src/browser/fixtures/fixtureServer.ts` — page-load unknown fetches `:53-56,93`; redirect probes `/api/safety/redirect-{ok,prod,unknown,telemetry}` `:277-293` (hosts `random.mobingi.com`, `random-host-xyz.alphaus.cloud`, `sentry.example.invalid`).
- `src/browser/fixtures/journeyFixtureServer.ts` — `passive-bootstrap` unknown `:99,176`; `action-unknown` on click `:58,184`; known-mutation POST `:56`; privacy-read/known reads `:78,95-98`.
- `src/core/exploration/syntheticFixture.ts` — synthetic exploration runtime with `fixture.unknown` action (`tests/unit/exploration.test.ts:250-254`).
- `.invalid` sentinel: `https://semantic-endpoint.invalid/` (`networkObserver.ts:320`); loopback: proxy tests + relay `local` mode `127.0.0.1` (`relay.ts:134`), fixture servers on `127.0.0.1`.

## 6. Implementation risks

1. **Navigation breakage on day one**: removing `PASSIVE_UNKNOWN_OBSERVED` allow (F1/F2) refuses all unenumerated startup traffic until finite initialization exemptions (tasks 2.2) are proven — acknowledged in design Risks, but the exemption list must be derived from the very fixtures above (`passive-bootstrap`, page-load fetches) or local journeys go red.
2. **WS layer has zero semantic authority** — L2 allows any allowed-host WebSocket with no endpoint match (`networkObserver.ts:669-686`); binding WS to an admission handle needs a WS route-template story that does not exist in the registry (`EndpointSemanticRule` is HTTP method/path shaped).
3. **CDP handler ignores method** — `fetchGuard.ts:94` reads only URL; method-drift detection cannot be added at L0 without touching the pause payload; a layer-disagreement event (spec requirement) must compare against L1's richer decision, but L1 never sees redirect follow-ups — i.e. redirect re-admission needs a semantic match computed inside fetchGuard from a shared snapshot.
4. **No existing totality/hardening discovery**: no hardening rule enumerates `route.continue`/`Fetch.continueRequest`/`connectToServer`/proxy-allow sites (`bin/lib/hardening/rules/process-and-network.mjs` is NW-AUD-014's manual-list file). Task 4.3's mutation/hardening census is greenfield and is the load-bearing non-vacuity gate.
5. **Two divergent causality models** (engine 250 ms vs exploration 30 s held intent, F4/F5) — one generation abstraction must unify both without weakening exploration's stronger hold.
6. **Intent singleton vs generations**: `beginJourneyIntent` throws on overlap (`networkObserver.ts:1255-1259`); concurrent-generation spec scenario ("two action generations overlap ⇒ refusal") must not silently convert that throw into permissive behavior.
7. **CONNECT opacity**: proxy CONNECT (`server.ts:434-437`) sees only `host:port` — design already requires an authenticated local control association; without it, L5 can only ever be host-authority for HTTPS tunnels.
8. **Phase-order coupling**: receipts/minimization depend on Phase 4 (018) landing first; landing 020 earlier would re-persist unminimized URL material through new admission evidence paths.

## 7. Potential sibling defects (discovered, adjacent to NW-AUD-020)

- **S1 (High)**: `handleWebSocket` allow path performs no endpoint/semantic classification — API WebSocket egress to an allowed host bypasses the semantic layer entirely (`networkObserver.ts:669-686`).
- **S2 (Medium)**: CDP guard ignores `p.request.method` (and resource type/initiator) — even a same-host `KNOWN_MUTATION` redirect follow-up would `continueRequest` because semantic check lives only in L1 (`fetchGuard.ts:94-101` vs `networkObserver.ts:470`).
- **S3 (Medium)**: L4 unrouted detector treats "not host-denied" as fine — a semantic-only block (mutation/ ACTION_CAUSED abort) never feeds `blockedUrls` (`networkObserver.ts:470-499,502-505` abort without `blockedUrls.add`), so if a route handler abort raced with `page.on('request')`, L4's silence is correct today only because L4 checks host verdicts; the invariant is coincidental, not structural.
- **S4 (Low)**: `matchEndpoint` fallback `ruleId:'legacy-classifier'` (`networkObserver.ts:~266`) would mislabel future classifier-only wiring as registry-proven — an admission handle keyed on `ruleId` must reject this sentinel.
- **S5 (Low)**: `policyAllowsTarget` in local mode trusts any `127.0.0.1` http target without operation/path binding (`relay.ts:134`) — fine for fixtures, but a semantic admission scheme must keep local and dev branches under the same receipt discipline.

## Review findings

- No blockers to the parent task: all six census items answered with live file:line evidence; planning artifacts consistent with live source; zero drift on cited surfaces since planning SHA `34517c9b`.
- One correction of a common assumption: the 250 ms timer applies **only to the journey engine's non-navigation steps** (`engine.ts:346`); navigation unknown traffic is passive *by action-type*, and exploration holds intent much longer (`explorationRuntime.ts:261`) — the defect is broader than "a 250 ms window" and narrower than "all post-action traffic".

## Residual risks

- Test counts/line numbers are from the current checkout; Phase 4 (NW-AUD-018) and later phases may move adjacent files before Phase 5 starts (cited 020 surfaces themselves have no drift).
- Manual `tests/manual/*` real-campaign files were census-read only via grep, not fully read.
- No commands beyond read-only `ls/grep/sed/wc/git log|diff|status` were run; no test execution performed (read-only mandate).