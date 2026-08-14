# Nightwatch — CURRENT STATE

> Durable memory for the next agent/session. Last updated: **2026-08-14** at
> the Nightwatch Phase 7B.1.1 runtime/continuity closeout. Phase 0–5 are complete;
> Phase 6 is frozen by owner; Phase 7, Hardening Campaign I/I.1, and Phase 7B
> are complete. Phase 8 remains unstarted.

---

## What exists now

Phase 0/1, Phase 1.1 (browser safety hardening), and Phase 1.2 (outer egress
containment) are complete. Nightwatch lives in
`REPOSITORIES/nightwatch/` as its own private Git repository with the
canonical `origin` remote. It reads the Alphaus repos under
`REPOSITORIES/alphauslabs` and `REPOSITORIES/mobingilabs` strictly read-only.

## Current Git topology

| Field | Current value |
|---|---|
| `REMOTE_STATUS` | `PRIVATE_REMOTE_CONFIRMED` |
| `REMOTE` | `origin` |
| `REMOTE_REPOSITORY` | `quantdale/night-watch` |
| `REMOTE_BRANCH` | `main` |
| `CANONICAL_GIT_ROOT` | `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch` |
| `PARENT_WORKSPACE_GIT` | `RETIRED` — `/home/dalepalaca/go/src/alphaus-main` is not a Git repository |
| `LAST_VALIDATED_IMPLEMENTATION_SHA` | `198f26ca79803c1bedac9aa08a71ecbd542ee804` (stable validated Phase 7B.1.1 substantive implementation anchor) |
| `PHASE_7B_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA` | `40e59ecf6209dac7ef88ac2af0bcef781562a837` (historical Phase 7B.1 substantive anchor) |
| `LIVE_HEAD_AUTHORITY` | `GIT` — discover local `HEAD` and `origin/main` with read-only Git commands; do not persist a current-head field in the file that records it |

This private development remote contains Nightwatch source, tests, schemas,
synthetic fixtures, and sanitized continuity state only. Real runtime
credentials, storage state, authenticated evidence, customer values, and
private findings remain outside GitHub under the owner-only local storage
policy.

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
synthetic secret-like values, stable implementation/documentation SHA roles,
ancestry, and live Git drift. It reports `SYNCED`, `CHECKPOINT_ADVANCE`, or
`STALE_IMPLEMENTATION_BASELINE` without rewriting state. Deprecated `Current
SHA`/persisted current-head fields are compatibility data only; Git supplies
live HEAD. Phase 1.3 validation is local and synthetic only; no real Alphaus
environment, product session, database query, or mutation is part of this
phase.

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
phases. Phase 6 local architecture and validation are preserved, but its
native task is intentionally `FROZEN_BY_OWNER`:
`.agent/tasks/phase-6-readonly-data-evidence-cross-layer-oracles/`.

## Phase 6 owner freeze / active roadmap boundary

`PHASE_6_STATUS: FROZEN_BY_OWNER`.

Reason: `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

The previous `M7 BLOCKED` state was an infrastructure/data mapping blocker.
The owner decision supersedes it: `OWNER_DECISION_SUPERSEDES_BLOCKER`,
`PHASE_6_FROZEN`, `NO_EXTERNAL_ACTION_REQUIRED`. This is not complete, failed,
handoff-blocked, or abandoned. Phase 6 implementation/history remains intact,
but real D1/D2/D3 datastore execution is permanently owner-policy blocked;
the six-query historical budget remains 0 used / 6 remaining.

Nightwatch must not request deployment metadata or investigate GCP/GKE,
Kubernetes, AWS infrastructure, DynamoDB, BigQuery, Spanner, production SQL,
or datastore metadata. The active task is
`.agent/tasks/private-evidence-minimization-and-triage/` and requires no
external team dependency.

Real findings remain owner-only local artifacts under the private storage
policy. No Slack, GitHub/Jira/Linear, email, shared Drive/Notion/docs, upload,
or customer-facing response is automatic. Chrome DevTools MCP remains
optional and subordinate to Playwright containment.

## Phase 6 — read-only data evidence (local architecture; blocked before live data)

Phase 6 has versioned typed query plans, DynamoDB/BigQuery/Spanner validators
and thin adapters, metadata-only normalization, cross-layer comparison,
source-to-store lineage, Phase 3 staleness integration, Phase 5 API linkage,
and synthetic adversarial coverage. The focused Phase 5 + Phase 6 suite passed
23/23 and the full Playwright suite passed 342/342; TypeScript, agent-check,
and diff-check passed. The 2026-08-13 continuation also repaired the narrow
agent-state allowlist for the sanitized Phase 6 runtime-binding checkpoint and
covered it with a regression test; stable-anchor semantics remain `SYNCED`,
`CHECKPOINT_ADVANCE`, and `STALE_IMPLEMENTATION_BASELINE`, with live HEAD from
Git.

The former real data gate remains preserved as historical evidence:
`PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED`. No datastore auth probe,
query, scan, or write ran in the owner-freeze decision, and no live datastore
verification is claimed. Historical Phase 6 artifacts retain their prior
implementation and investigation record; the active roadmap must not refresh
deployment metadata, repeat infrastructure archaeology, request a handoff, or
reopen the gate. The owner decision makes that path permanently out of scope.

## Private evidence minimization + autonomous triage (completed prerequisite)

The completed prerequisite task was `.agent/tasks/private-evidence-minimization-and-triage/`.
Its local implementation checkpoint is
`ea434b57fc132c6544c4527cbaa494cb8412db92`. It adds the executable
`FROZEN_BY_OWNER` scope gate, owner-only atomic artifact storage, bounded
original-sequence minimization, stable sanitized clustering/deduplication,
browser/API differential, source relevance, conservative application-layer
fault boundaries, deterministic private dossiers/recipes, AI-ready data-only
packages, and overnight/morning summaries. L4 is recorded as
`OUT_OF_SCOPE_BY_OWNER`; no datastore branch exists in the active stack.

Validation at this checkpoint: TypeScript PASS; focused policy/Phase 6/triage
tests 25/25 PASS; full Playwright 358/358 PASS; no real DEV minimization was
needed because no natural anomaly was admitted. Bounded AI assistance remains
deferred and any future model remains prohibited from acting as an oracle.

## Phase 7 — Private autonomous nightly campaigns (complete; historical auth block preserved; DEV auth ready)

The native task is `.agent/tasks/phase-7-private-autonomous-nightly-campaigns/`.
The campaign schema is `nightwatch.campaign.private.v1` and the orchestrator
is `nightwatch.orchestrator.private.v1`. It coordinates the existing Phase
3 selector, Phase 4 safe exploration envelopes, Phase 5 restricted API
scenarios, Phase 2C replay/oracle evidence, and private triage/minimization.
Campaign modes are explicit: `CHANGE_DIRECTED`, `BASELINE_HEALTH`,
`COVERAGE_EXPANSION`, `REPRODUCTION_ONLY`, and `LOCAL_SYNTHETIC`.

Manifest identity is a stable digest over mode, committed-only source
snapshots/window, selected lineage, seed set, version fingerprints, budget,
privacy policy, and (when present) the reproduction target. A frozen manifest
is checkpointed atomically before execution and after each major work unit.
The runtime checks Nightwatch source/catalog/model versions before resuming and
between work items; drift stops the campaign as `CAMPAIGN_VERSION_DRIFT`.

The initial real profile is deliberately bounded: J1/J2/J3 trusted canaries,
one linked envelope/seed each, one linked read-only API scenario each, a
15-minute ceiling, bounded replay/minimization budgets, and at most three
promoted clusters. Ordering is deterministic: journeys, APIs, exploration,
then admitted-cluster reproduction/minimization. Failure storms stop duplicate
spending and are summarized as a shared DEV degradation.

Synthetic acceptance passed deterministic selection, baseline/fallback,
lineage, budget/time ceilings, interruption recovery, duplicate clustering,
failure-storm suppression, reproduction, bounded minimization, dossiers,
morning briefs, privacy, and owner-policy tripwires. The one historical real
campaign created owner-only local artifacts with campaign ID
`campaign:sha256:ed4520e8fa7c3a9d2b1481f5`, selected `CHANGE_DIRECTED` J1/J2/J3
under the Phase 3 conservative fallback, and stopped at `AUTH_BLOCKED` before
any journey, exploration, API, or product observation. Its manifest/checkpoint
is immutable and is not silently resumed after the Nightwatch version changed.

The existing guarded designated-DEV auth system subsequently completed one
bounded refresh with no MFA step. Current sanitized status is
`AUTH_STATUS=VALID`, `AUTH_ENV=DEV`, `PAGE_VALID=true`, `MFA_USED=false`, with
capture ID `nightwatch-20260813T151556Z-3210`. Structural, provenance,
freshness, page-readability, authenticated-shell, metadata-only privacy, and
atomic-replacement checks passed. The final current manifest was frozen in
owner-only local state at checkpoint ordinal 0 before product execution.

The current launcher requires an explicit two-step real workflow:
`--prepare-only` validates the guarded auth/safety gate and writes a fresh
owner-only manifest plus ordinal-zero checkpoint without invoking an executor;
the sanitized `PHASE_7_NEW_REAL_CAMPAIGN_READY` state is then pushed before
`--resume-campaign=<id>` may execute the frozen campaign exactly once.
The final campaign was `campaign:sha256:aaf0cb8019c08c00132e71fb` with
manifest fingerprint `manifest:sha256:f30e691c334222281608ab01` and
implementation source SHA `b95b06dab3fe60208d412ea9811c0c36c399ed9b`.
An earlier provisional manifest was never executed and is retained only as
owner-only local superseded state.

The one permitted real run completed all 9 work items in deterministic order,
recorded 7 sanitized observations across 4 clusters and 1 candidate, admitted
0 findings/dossiers, and finalized safely as `PARTIAL_BUDGET_EXHAUSTED` with
`BUDGET_EXHAUSTED`. The owner-only morning brief is `READY` with headline
`NO ADMITTED PRODUCT ANOMALIES`.

Real campaign safety vector: production attempts 0, proxy violations 0,
unknown destinations 0, unknown approvals 0, product mutations 0,
action-caused `UNKNOWN` 0, database queries 0, infrastructure queries 0, and
external publication attempts 0. Privacy is `PASS`; no credentials, cookies,
tokens, customer values, raw bodies, DOM, screenshots, or authenticated traces
were persisted. Phase 6 remains permanently
`FROZEN_BY_OWNER`, with L4 `OUT_OF_SCOPE_BY_OWNER`.

The source repository now has a verified private canonical remote:
`origin` → `quantdale/night-watch`, branch `main`. This changes only the
development checkpoint/review path; runtime findings remain local and are
never pushed or published.

## Phase 7B — Bounded private AI review assistance (complete)

The native task is `.agent/tasks/phase-7b-bounded-ai-review-assistance/`.
Phase 7B adds an optional, owner-invoked review-assistance layer over the
existing deterministic `nightwatch.ai-ready-evidence.private.v1` projection.
The model receives only strict sanitized structural DTOs and returns opaque
data that must pass exact-key runtime validation before it can become a
private companion artifact.

The bug-draft product is `nightwatch.ai-bug-draft.private.v1` and admits only
L2/L3 candidates. It preserves deterministic candidate identity, evidence
level, source relevance, browser/API differential, fault boundary, safety,
privacy, and unresolved deployment status; AI prose is visibly labeled
`AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED`. The oracle product is
`nightwatch.ai-oracle-suggestion.private.v1`; it contains only conceptual
deterministic-check suggestions and `executable=false`. Owner approval of an
oracle suggestion means `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW` only and
does not modify a registry, campaign manifest, action catalog, source file, or
request path. Human review records use
`nightwatch.ai-human-review.private.v1` and are digest-bound.

The required provider is deterministic synthetic local. The optional provider
is explicit HTTP loopback only (`localhost`, `127.0.0.1`, or `::1`) with fixed
path, bounded bytes/time, no credentials, redirects, proxy, tools, shell,
browser/API/database/infrastructure access, or remote fallback. No cloud AI
SDK, credential, model download, or real model canary is required. Runtime AI
artifacts use the existing owner-only atomic private store outside Git; raw
prompts, raw responses, real findings, and transcripts are not persisted.

The Phase 7 campaign remains deterministic and does not invoke AI. Phase 6
remains `FROZEN_BY_OWNER` with L4 `OUT_OF_SCOPE_BY_OWNER`; Phase 8 autonomous
self-development was not started. Full validation passed with 469/469
Playwright tests, including the Phase 7B.1.1 synthetic and loopback matrix, plus
TypeScript, hardening, synthetic campaign, owner-scope, and Phase 6 checks.

## Phase 7B.1 — AI review authority hardening (complete)

Phase 7B.1 is the narrow hardening descendant of historical Phase 7B. It does
not broaden AI capability and does not rewrite the Phase 7B task report. The
validated implementation checkpoint is
`40e59ecf6209dac7ef88ac2af0bcef781562a837`.

- `AiReviewSession` is the only supported provider-execution authority. Raw
  low-level review functions and provider methods are no longer exported;
  source hardening checks the single private provider boundary and forbids
  campaign/runtime execution imports or automatic session factories.
- `candidateReviewAttempts` and `oracleSuggestionAttempts` are bounded owner
  request attempts, including invalid/disabled/non-local attempts.
  `providerCalls` is the actual synchronously reserved provider-boundary
  exposure, shared across both products and never refunded after entry.
- Generated artifacts use v2 unreviewed-only schemas:
  `nightwatch.ai-bug-draft.private.v2` and
  `nightwatch.ai-oracle-suggestion.private.v2`. Owner decisions are separate
  exact-key `nightwatch.ai-human-review.private.v2` records with deterministic
  review identity, owner/publication constraints, artifact schema binding, and
  full-artifact digest binding.
- Effective review state is projected from artifact, validated review record,
  matching digest, and current deterministic input. A status field alone
  cannot prove approval. Bug approval remains a draft; oracle approval remains
  manual implementation review only. Rejection, owner supersede, input-driven
  staleness, conflicts, corruption, and legacy v1 status are distinct and
  fail closed or remain explicitly unverified.
- Phase 7 campaign behavior, deterministic evidence, action/oracle catalogs,
  safety/privacy vectors, owner scope, Phase 6 freeze, and publication/source
  boundaries are unchanged. Phase 8 remains unstarted.

The historical 7B/7B.1 AI/loopback matrix was 54/54; the Phase 7B.1.1
AI/loopback matrix passes 60/60; the synthetic campaign passes 27/27; the
full Playwright suite passes 469/469; TypeScript,
hardening, agent-state, privacy review, and diff checks pass. No real model,
cloud provider, product traffic, database/infrastructure operation, or real
AI artifact was used.

## Phase 7B.1.1 — Runtime deadline and continuity semantics closeout (complete)

This narrow local/static/synthetic hardening descendant closed the aggregate
provider-work deadline gap with monotonic construction-time budgeting,
remaining-time caps, active `AbortSignal` cancellation through the private
provider boundary, loopback transport destruction, and synthetic PENDING
cleanup. It also replaced self-referential task SHA semantics with stable
validated implementation/substantive/documentation anchors while live local
and remote HEAD come from Git.

The stable implementation checkpoint is
`198f26ca79803c1bedac9aa08a71ecbd542ee804`; final documentation descendants
remain documentation and their containing SHA is discovered from Git rather
than embedded in the files that record it. Runtime and continuity validation
passed, with no real model, product traffic, campaign, authentication,
database, infrastructure, publication, or owner-review CLI activity. Phase
7B.1 remains a complete historical predecessor and Phase 8 remains
`NOT_STARTED`.

## Hardening Campaign I / I.1 — current durable closure

### Hardening Campaign I

`Hardening Campaign I: COMPLETE`.

- Hardening implementation checkpoint:
  `78cd8d60f6a743985d5b0eae2560f6d06c40dbe4`.
- Hardening closure documentation head before this I.1 task:
  `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- `REMOTE_CI_STATUS=CONFIRMED_PASS_AT_HARDENING_CLOSURE` for
  `ba5b518736281f48640982fcbdb6c874bc3e3123`. The historical Hardening I
  report's pending-CI wording remains accurate for the time it was written.

Main hardening results were:

- strict manifest fingerprint reconstruction;
- strict checkpoint validation;
- atomic budget accounting;
- bounded reproduction reserve;
- explicit child environment allowlisting;
- stable private filesystem roots;
- no-symlink / owner-only boundaries;
- canonical config provenance;
- DEV-only automated credential execution;
- Oops byte-digest provenance;
- truthful morning brief semantics;
- complete Playwright TypeScript config coverage;
- offline hardening check;
- private read-only GitHub Actions.

### Hardening Campaign I.1

`Nightwatch Codebase Hardening Campaign I.1: COMPLETE`.

The confirmed defect was checkpoint integrity only. It was not evidence of
production reachability, budget overrun, mutation, credential exposure, or a
product bug. The old predicate accepted `PARTIAL_BUDGET_EXHAUSTED` plus
`BUDGET_EXHAUSTED` when any remaining dimension was zero and its used key was
present. Because the bounded real profile intentionally sets
`maxExplorationContexts=0`, an unused ordinal-zero checkpoint could satisfy
that condition.

The fix requires a generic dimension to prove `policy limit > 0`,
`used == policy limit`, and `remaining == 0`; the existing exact arithmetic
invariant remains enforced for every dimension. No exact exhaustion-cause
field existed in the current checkpoint schema, so no schema migration was
introduced.

The validated I.1 implementation checkpoint is
`5de817764a4d58eaa1a5c0109464667f552cda5e`. Regression coverage proves the
zero-limit false-positive rejects before executor work with the sanitized
reason `BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION`, a legitimate
positive-cap exhaustion checkpoint is accepted, and mixed disabled-plus-
genuinely-exhausted dimensions are accepted. Current local validation is
399/399 Playwright tests, TypeScript PASS, hardening check PASS, synthetic
campaign PASS, agent-state PASS, and diff check PASS.

The first documentation checkpoint passed the private read-only workflow
(`Nightwatch hardening`, run `31758018614`, head
`801c307f77c27f33e4612462fffd08c4cf60fc60`). A final completion-state
documentation-only descendant is intentionally not self-referenced in this
file; its exact local/remote equality and workflow result are recorded in the
I.1 task handoff and completion response after verification.

## Environment (machine facts)

- Node v22.22.1, npm 10.9.4, Playwright Test 1.62.1, TypeScript 5.x, git 2.43.0
- System Google Chrome at `/opt/google/chrome/chrome` via `channel: 'chrome'` (fallback: `npx playwright install chromium` + remove `channel` from `playwright.config.ts`)
