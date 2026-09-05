# Nightwatch Architecture Decisions

Decision record for Nightwatch (Phase 0/1). Each entry states the decision,
its rationale (grounded in `NIGHTWATCH_RECON_B.md` facts, cited by ID),
the consequences, and the phases where it applies. Decisions are accepted
unless marked superseded; changing one requires a new entry, not an edit.

## D-34 — Private canonical GitHub remote with validated direct-to-main checkpoints

**Decision.** Nightwatch's canonical writable Git root is
`/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`, with private
remote `origin` at `https://github.com/quantdale/night-watch.git` and canonical
branch `main`. Development sessions use a direct-to-main workflow only for
validated durable checkpoints: complete the scoped unit, run its required
validation and privacy checks, inspect the diff, commit locally, push
`origin main`, and verify local `HEAD == origin/main`. Normal development never
force-pushes and stops to reconcile if the remote advances.

The parent workspace is intentionally not a Git repository and its retired
accidental metadata is not restored. This source-review remote does not change
the private-runtime boundary: the campaign runtime never commits or pushes,
and real findings, credentials, storage state, and authenticated evidence
remain owner-only outside GitHub.

**Rationale.** A private canonical source remote gives the owner a durable,
directly inspectable checkpoint without turning runtime evidence into a shared
artifact or publication channel. Explicit push verification prevents a local
checkout from being mistaken for the reviewable state.

**Consequences.** Current project and active-task state record
`REMOTE_STATUS=PRIVATE_REMOTE_CONFIRMED`, `REMOTE=origin`,
`REMOTE_REPOSITORY=quantdale/night-watch`, `REMOTE_BRANCH=main`, the canonical
Nightwatch root, and the retired parent-workspace Git status. Historical
reports retain earlier `NO_REMOTE` observations when they are clearly
temporal; private artifact policy may still report no remote destination for
runtime findings.

**Phase applicability.** Phase 7 development checkpoints and all later
Nightwatch source-development sessions.

---

## D-33 — Campaign manifests freeze the executable surface

**Decision.** A private campaign is identified by a stable manifest digest over
its mode, committed-only source snapshots/window, Phase 3 selection and
lineage, seeds, version fingerprints, budget, privacy policy, and optional
reproduction target. The manifest is written before execution and is immutable
for that campaign. Resume checks the manifest fingerprint and current
Nightwatch/catalog/model versions; drift stops the campaign rather than mixing
evidence from incompatible runtimes.

**Rationale.** An unattended campaign must be recoverable without relying on
process memory, wall-clock identity, filesystem order, or silently changing
coverage after a source/catalog update. A stable frozen input is the boundary
between one evidence set and the next campaign.

**Consequences.** Logical ledger writes and checkpoints are exactly-once;
browser/API work is at-least-once-safe and interrupted work is explicitly
`REPLAY_REQUIRED`. The campaign may stop as
`CAMPAIGN_VERSION_DRIFT` and requires a new compatible manifest. Dirty source
files remain observations only and never become deployment proof.

**Phase applicability.** Phase 7 and all later private campaign orchestration.

## D-29 — Owner-frozen infrastructure/data boundary

**Decision.** Nightwatch is permanently confined to local source intelligence,
contained DEV browser/API testing, deterministic replay, failure minimization,
sanitized evidence, and private local triage. Phase 6 real infrastructure and
datastore work is `FROZEN_BY_OWNER` because
`INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

**Rationale.** Application-level debugging provides the intended competitive
value without expanding operational or disclosure risk. The previous Phase 6
runtime-to-datastore blocker is intentionally superseded rather than handed
off to coworkers or infrastructure owners.

**Consequences.** `src/core/policy/ownerScope.ts` blocks GCP/GKE/Kubernetes,
AWS infrastructure, deployment configuration, DynamoDB/BigQuery/Spanner/
production SQL, datastore metadata discovery, external-team requests, and
external publication before an executor callback. Existing Phase 6 code and
history remain available for local synthetic compatibility; its real invoker
returns `OWNER_POLICY_BLOCKED`. L4 is recorded as
`OUT_OF_SCOPE_BY_OWNER`, never as missing work.

**Phase applicability.** All current and future phases unless the owner makes
an explicit new scope decision.

---

## D-30 — Private local evidence is the terminal output

**Decision.** Nightwatch produces owner-only local dossiers and summaries. It
does not automatically post to Slack, create GitHub/Jira/Linear issues or PRs,
send email, write shared Drive/Notion/docs, upload evidence, or generate
customer-facing responses.

**Rationale.** Nightwatch is a private local project and findings may contain
competitive or internal engineering information. Human review outside the
autonomous loop is required for any later disclosure.

**Consequences.** The default artifact root is `$HOME/.nightwatch/findings/`,
owner-only with atomic writes. A dossier is `INCOMPLETE` until packaging
finishes; private remote status is audited before any storage decision, and a
repository with no remote is classified `NO_REMOTE`.

**Phase applicability.** All current and future phases.

---

## D-31 — Deterministic minimization is subsequence-only replay

**Decision.** Failure minimization can execute only action IDs already present
in the original source-approved safe sequence. It never generates an action or
widens the safe-action catalog. Real DEV minimization is bounded at one fresh
exact replay plus four reduced candidates by default.

**Rationale.** Minimization must reduce evidence without becoming a second
exploration engine or a path to arbitrary controls. Exact fingerprint equality
is required to call a candidate reproducing the same anomaly.

**Consequences.** The reducer reports `1-MINIMAL` only after a complete
one-deletion proof; otherwise it reports `BOUNDED_MINIMAL` or budget exhaustion.
Invalid preconditions are not product failures.

**Phase applicability.** Private evidence minimization and later local triage.

---

## D-32 — Deterministic evidence outranks AI

**Decision.** AI-ready packages are deterministic evidence projections only.
Any future local/private model may summarize, rank, hypothesize, or suggest
source locations, but may not decide failure, override safety/oracles, invent
results, or trigger external access.

**Consequences.** The current task adds no LLM integration; dossier validity,
oracle outcome, safety counters, and privacy remain Nightwatch-owned.

**Phase applicability.** Private evidence minimization and later AI review.

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
recorder never receives storage-state content. The approved direct human
capture workflow may replace an existing external output path only by writing
to a temporary sibling, validating that new file, and atomically renaming it;
ordinary output-path validation still rejects pre-existing paths.

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

---

## D-29 — Reviewed Chromium background hosts are exact local blocks

**Decision.** `android.clients.google.com`, `update.googleapis.com`, and
`redirector.gvt1.com` are represented by separate exact
`BROWSER_BACKGROUND_GOOGLE`, `BROWSER_BACKGROUND_UPDATE`, and
`BROWSER_BACKGROUND_DOWNLOAD` classifications. The browser guard and outer
proxy abort them before upstream contact; successful containment is recorded
as sanitized, non-fatal expected containment. They are not telemetry and are
not allowlisted.

**Rationale.** Human safety review identified these exact Chromium/Google
browser-background destinations as expected attempts during the guarded DEV
capture. The approved disposition is “known expected browser-background
traffic that Nightwatch intentionally blocks,” not permission to contact them.

**Consequences.** No wildcard or related-host approval exists. `clients.google.com`,
`edgedl.me.gvt1.com`, `redirector.gvt2.com`, and any other new destination
remain UNKNOWN and fail closed until separately reviewed. The policy version
advances so stale proxy runtime state cannot be reused.

**Phase applicability.** Phase 2A and later browser phases.

## D-30 — Authentication capture separates oracle anomalies from safety failures

**Decision.** `RunMonitor` retains configured oracle failures for ordinary
passive-run verdicts but exposes `safetyFailed` separately. The direct
authentication capture runner stops HUMAN_WAIT only for safety/containment,
browser, lifecycle, or equivalent hard failures. A protocol anomaly such as
`malformed-json` remains evidence and proceeds to post-login verification.

**Rationale.** Auth-state acquisition is not bug-free page certification. A
product response can be malformed without representing a containment breach;
terminating the human login flow as `SAFETY_MONITOR_FAILED` loses that
distinction and prevents the correct post-login outcome from being reported.

**Applicability guard.** JSON parsing runs only for complete bodies with an
explicit JSON content type (or an absent content type with an unambiguous
single-JSON shape). HTML/text, NDJSON/JSON-seq/streaming, redirects, empty
204/205 responses, and incomplete captures are not sent through the plain JSON
parser. No endpoint or host is broadly suppressed.

**Phase applicability.** Phase 2A authentication capture and later workflows
that reuse the monitor contract.

## D-31 — Designated DEV credential refresh is external, narrow, and subordinate to Nightwatch safety

**Decision.** Automatic login is permitted only for the designated DEV test
account and only after the exact DEV UI target, DEV auth/API host allowlist,
production deny canary, healthy loopback proxy, browser containment contract,
and authenticated metadata-only evidence policy all pass. A valid external
storage state is reused first. A missing, expired, or semantically invalid
state is refreshed through the source-backed Ripple username/password controls
with one bounded submission, then validated in a fresh guarded context and
atomically replaced.

The credential provider is auth-only and stores the record outside the
workspace at the owner-only-file storage class under the operator's local
Nightwatch namespace. OS keychain facilities were not available in the
validated environment, so the provider uses a `0700` directory and `0600`
atomic file writes. The interactive configuration command accepts no secret
arguments or environment values and disables terminal echo for both fields.
No username/password value is returned in metadata, evidence, task state,
logs, exceptions, or browser/MCP records.

Chrome DevTools MCP remains optional and subordinate. Its discovered capability
is recorded as server `mcp__chrome_devtools` with 29 tools, but real
authenticated attachment is disabled unless a dedicated Nightwatch-owned
loopback CDP architecture proves the proxy, production deny, unknown-host,
WebSocket, privacy, and lifecycle facts. MCP never receives credential-bearing
arguments; Nightwatch/Playwright remains the sole executor.

**Threat-model mitigations.**

| threat | mitigation |
| --- | --- |
| `SECRET_IN_SOURCE`, `SECRET_IN_GIT`, task/docs/fixtures | only fake synthetic values appear in tests; the real record is external and never serialized into Nightwatch |
| `SECRET_IN_SHELL_HISTORY`, `SECRET_IN_PROCESS_ARGS` | hidden TTY prompts; configuration accepts no credential flags, and the provider does not read credential environment variables |
| `SECRET_IN_MCP_TRANSCRIPT` | `MCP_SECRET_INPUT_ALLOWED=false`; login is in-process Playwright and no MCP fill/type/evaluate call receives the secret |
| `SECRET_IN_CONSOLE`, `SECRET_IN_NETWORK_EVIDENCE`, `SECRET_IN_EXCEPTION` | the credential is not passed to recorder/event data; authenticated metadata-only recording, redaction, and sanitized failure codes are used |
| `SECRET_IN_STORAGE_STATE_REPORTING` | only safe state diagnostics and capture IDs are reported; storage contents remain external and are never copied to evidence |
| production or non-DEV retrieval/use | exact DEV target and environment checks happen before provider access; production hosts are denied by both policy and preflight canary |
| MCP personal-browser attachment or containment bypass | no personal profile is attachable; real attachment is disabled without a dedicated Nightwatch profile, loopback binding, lifecycle ownership, and proxy proof |
| MCP arbitrary control, DOM, screenshot, heap, or raw-body leak | Nightwatch remains primary executor; catalog IDs are authoritative; authenticated screenshot, heap, snapshot, broad script, and raw request inspection are prohibited |
| account lockout | exactly one credential submission per refresh; rejected login stops with a sanitized code and is never retried automatically |
| MFA bypass | MFA selectors cause `HUMAN_MFA_WAIT`; only the human completion callback may continue, with no OTP retrieval or bypass |

**Consequences.** Authentication session establishment is recorded as
`AUTH_SESSION_CREATION` with `productStateMutation=false`; it is a narrowly
authorized control-plane exception and does not widen Phase 4's passive
product-action catalog. If safe MCP attachment cannot be proven, Phase 4
continues through Playwright without MCP.

**Phase applicability.** Phase 4 DEV auth refresh and later workflows that
reuse the same boundary.

## D-33 — Phase 7B AI is a private review assistant, never an authority

**Decision.** Phase 7B consumes only the existing sanitized deterministic
`nightwatch.ai-ready-evidence.private.v1` projection and emits owner-only
companion artifacts. Runtime validators, not model instructions, enforce exact
schemas, privacy/safety vectors, bounded references, immutable deterministic
facts, L2/L3 eligibility, and explicit `AI_GENERATED_UNREVIEWED` status.
Human review is a separate digest-bound record. Approval means only that the
owner finds the text useful; it does not admit a finding, verify a cause,
change evidence level or campaign state, execute an action, publish, or alter
Nightwatch source.

The two products are the versioned private bug draft and conceptual oracle
suggestion. Oracle approval can only produce
`APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`; no registry, manifest, action
catalog, generated code, request, or callback is reachable from the artifact.

**Rationale.** Model hallucination, prompt injection, unsupported causal
language, and arbitrary output must remain harmless untrusted data. Keeping the
deterministic evidence path one-way preserves Nightwatch's existing oracle,
safety, privacy, owner-scope, and campaign authority.

**Consequences.** The provider interface has no tools, filesystem, shell,
browser, API, database, infrastructure, MCP, or Git capability. The required
provider is synthetic local; the optional adapter accepts only an explicit
loopback endpoint with bounded transport and no cloud fallback. Runtime AI
artifacts use the existing owner-only private store outside Git.

**Phase applicability.** Phase 7B and all later work that consumes AI review
artifacts. Phase 8 remains a separate, unstarted task.

## D-34 — AI owner-scope operations are explicit and narrowly local

**Decision.** The owner policy permits only `AI_REVIEW_LOCAL` and
`AI_ORACLE_SUGGESTION_LOCAL` for Phase 7B. Unknown AI operation classes and
all product, datastore, infrastructure, publication, team-coordination,
self-edit, and external-provider classes fail closed with
`OWNER_POLICY_BLOCKED` before any executor callback.

**Rationale.** Adding a broad AI or agent operation would create an accidental
owner-policy bypass and blur the permanent Phase 6 freeze.

**Consequences.** Phase 7 campaign commands remain independent of AI review;
no AI provider is a campaign dependency or safety decision-maker.

**Phase applicability.** Phase 7B.

## D-35 — Phase 7B.1 provider exposure has one mandatory session authority

**Decision.** `AiReviewSession` is the only supported runtime authority that
can expose a provider. Candidate and oracle request attempts are reserved
synchronously at the owner boundary; actual provider exposure is reserved
synchronously immediately before the one private registered-handler boundary
and shares a three-call session cap. The public index and direct pipeline
module do not export raw review functions or provider methods. A new session is
an explicit new owner invocation; no process-global counter or automatic
session factory is added.

**Rationale.** A wrapper cannot enforce a safety budget if callers can choose a
raw primitive instead. Separating attempt accounting from provider exposure
also keeps invalid input bounded without misreporting an uncalled provider.

**Consequences.** Invalid, disabled, and non-local requests consume their
request-attempt budget but leave `providerCalls` at zero. Timeout, unavailable,
malformed, schema-invalid, and storage-failed calls after handler entry consume
the provider-call unit and are never refunded. The source hardening check
rejects a second call path or runtime session factory.

**Phase applicability.** Phase 7B.1 and later AI review consumers.

## D-36 — AI artifacts are immutable v2 material with companion owner provenance

**Decision.** Generated bug drafts and oracle suggestions use v2 schemas with
stored status `AI_GENERATED_UNREVIEWED`; owner decisions are separate exact-key
v2 records containing deterministic review identity, artifact ID/kind/schema,
full artifact digest, owner reviewer class, and publication prohibition. A
validated effective-state projection combines artifact, one matching record,
and current deterministic input. One terminal decision is allowed per exact
artifact; conflicting decisions fail closed. Owner `SUPERSEDE` and input-driven
`STALE` remain distinct reasons. Historical v1 artifacts are readable only as
explicit legacy data and their status never proves approval without a matching
validated record.

**Rationale.** Approval represented by an editable artifact enum is not
auditable provenance. Keeping model identity and owner identity separate makes
forgery, corruption, digest mismatch, stale input, and conflicting decisions
deterministically visible without rewriting history.

**Consequences.** Storage writes generated artifacts and review records as
separate owner-only files; renderers consume effective projection rather than
artifact status. Bug approval remains a draft and oracle approval remains
manual implementation review only. No deterministic evidence, catalog,
campaign, execution, publication, source, or Phase 6 authority changes.

**Phase applicability.** Phase 7B.1 and later AI review consumers.

## D-37 — Aggregate AI runtime authority is monotonic and actively cancellable

**Decision.** `AiReviewSession` uses a monotonic millisecond clock for runtime
budgeting (`performance.now()` by default; an injected clock remains available
for deterministic tests). The session calculates remaining runtime from its
construction-time anchor and caps every provider operation at the minimum of
the requested timeout, the policy per-call timeout, and that remaining time.
The private provider handler receives an `AbortSignal`; the operation timer
actively aborts the handler transport, and completion/abort races settle once
with timers cleared. Loopback HTTP destroys its request on abort and the
synthetic pending fixture removes its resolver.

**Rationale.** Rejecting an outer promise does not stop an underlying request.
An absolute monotonic session deadline prevents a near-expiry provider call
from receiving a fresh per-call extension while active cancellation makes the
runtime bound meaningful for local transports.

**Consequences.** Wall-clock dates remain artifact metadata only. Timeout and
cancellation after provider-boundary entry consume the shared provider-call
unit. Nightwatch claims a bounded cancellation deadline, not a mathematically
exact real-time OS guarantee.

**Phase applicability.** Phase 7B.1.1 and later local AI review consumers.

## D-38 — Git continuity records stable anchors; live HEAD is discovered

**Decision.** Durable task/project state records stable historical roles:
`LAST_VALIDATED_IMPLEMENTATION_SHA` and
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` identify the validated substantive baseline;
`LAST_DOCUMENTATION_CHECKPOINT_SHA`, when present, identifies an approved
documentation descendant. `git rev-parse HEAD` and the local remote ref supply
live state. `Current SHA`, `CURRENT_LOCAL_HEAD`, `CURRENT_REMOTE_HEAD`, and
`LAST_PUSHED_SHA` are deprecated compatibility history only and never require
equality with live HEAD. The validator must not self-heal state or require a
file to predict the SHA of its containing commit.

**Rationale.** A documentation/status commit after implementation is expected.
Requiring the implementation field to equal current HEAD makes the field
self-referential and encourages documentation commits to be mislabelled as
validated implementation. Git is the only non-recursive authority for what
HEAD is now; durable files should state what behavior was validated.

**Consequences.** Documentation-only descendants classify as
`CHECKPOINT_ADVANCE` and preserve the implementation anchor. A documentation
SHA cannot occupy the implementation role, checkpoint ancestry is validated,
and a `COMPLETE` task fails closure if source/test/config or other unapproved
paths changed after its implementation anchor. Historical task files remain
read-compatible without rewriting their reports.

**Phase applicability.** Phase 7B.1.1 and all later Nightwatch development.

## D-39 — Provider accounting is committed at the final exposure boundary

**Decision.** `providerCalls` means an actual attempt to enter a registered
provider handler. Final admission calculates the monotonic remaining session
runtime, rejects expiry and the shared cap, computes the effective timeout,
creates the cancellation context, increments the counter once, and enters the
private handler immediately in the same synchronous stack. There is no await or
second pre-handler check between the increment and entry. Locality/registration
failure and final-deadline expiry therefore leave the counter at zero, while a
synchronous handler throw counts because the handler was entered. Timeout,
malformed/schema-invalid output, and storage failure after entry consume the
call without refund.

**Rationale.** A reservation before final deadline admission can report a
provider exposure that never occurred. Colocating the increment with the
registered-handler call makes the counter describe the semantic event it names
and preserves the shared three-call cap under synchronous JavaScript
interleaving.

**Phase applicability.** Phase 7B.1.2 and all later local AI review consumers.

## D-40 — New implementation anchors must prove the claimed commit's own role

**Decision.** When a task advances `LAST_VALIDATED_IMPLEMENTATION_SHA` beyond
`STARTING_SHA`, `bin/agent-state.mjs` validates that the claimed commit is a
descendant and inspects its own changed paths with read-only `git diff-tree`
semantics. A commit changing only the approved documentation/continuity
allowlist is `INVALID_IMPLEMENTATION_ROLE`; ambiguous merge attribution and
unrelated lineages fail closed. A carried-forward implementation anchor that
predates or equals `STARTING_SHA` remains valid for documentation-only work.
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` remains equal to the validated implementation
anchor for new implementation checkpoints, while documentation descendants
remain a separate role. Live HEAD continues to come from Git and is never
serialized self-referentially.

**Rationale.** Range-only checks allow a docs commit after a real source commit
to masquerade as the implementation checkpoint, including when validated and
substantive fields are forged to the same docs SHA. Direct claimed-commit role
proof closes that bypass without rejecting legitimate docs descendants or
historical carried-forward anchors.

**Phase applicability.** Phase 7B.1.2 and all later Nightwatch development.

## D-41 — Owner review is a terminal, snapshot-bound human interface

**Decision.** Phase 7B.2 exposes persisted AI artifacts only through
`npm run ai:owner-review` with exact-ID `show`, `status`, and TTY-gated
`decide` commands. The CLI imports no AI execution/provider path, performs no
network, Git, publication, browser/API, campaign, or directory-enumeration
operation, and accepts no decision through argv, environment, file, or pipe.
`decide` uses a fixed A/R/S/Q menu plus an exact second confirmation token;
only an unreviewed v2 artifact may receive one new digest-bound companion
review, created by `createHumanReviewRecord()` and written by the hardened
private store. The artifact remains immutable. Existing reviews are terminal;
v1 artifacts are read-only historical/unverified state. Terminal output is
plain text with explicit sanitization and `[AI]`/`[SYSTEM]` separation, and
the displayed freshness is `SNAPSHOT_ONLY_NOT_REEVALUATED`.

**Rationale.** The owner must be able to inspect and record provenance without
turning AI prose into execution, verification, publication, or current-state
authority. A fixed prompt boundary, two deliberate actions, digest read-back,
and exact identity checks preserve the distinction between “the owner reviewed
this artifact” and “the product finding is verified.”

**Consequences.** Bug approval projects only `OWNER_APPROVED_DRAFT`; oracle
approval projects only `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`. Rejection
and supersession remain companion review states. Evidence level, campaign
result, catalog, source, executable, publication, and Phase 8 state do not
change. Free-form notes, export, bulk listing, current-input reevaluation, and
real artifacts remain deferred.

**Phase applicability.** Phase 7B.2 and all later consumers of private AI
review artifacts.

## D-42 — Immutable AI publication is create-if-absent and owner decisions have one tracked runtime writer

**Decision.** Phase 7B.2.1 publishes every semantically immutable AI artifact
(bug draft, oracle suggestion, and human-review record) as one complete READY
envelope. The private store creates a random same-directory temporary with
`wx`/0600, writes and fsyncs the full payload, publishes it with POSIX
`fs.linkSync(temp, destination)` so an existing destination cannot be replaced,
unlinks only the temporary name, and fsyncs the containing directory. `EEXIST`
is an immutable conflict; unsupported no-replace behavior fails closed. The
older replacement-capable `writeJson`/`writeIncomplete` paths remain only for
non-immutable workflows.

The general AI-review index exports no owner-decision writer or human-record
constructor. `ownerDecision.ts` is an internal module with a private raw
helper; its confirmed entry requires the exact decision token and displayed
artifact digest. Only `bin/ai-owner-review.mjs` may load it in tracked runtime
source, after the existing TTY, fixed A/R/S/Q, and exact second-confirmation
boundary. Storage conflict handling strictly reads back a valid winner,
returns idempotency for exact duplicates, and reports conflicting decisions or
artifact bytes without overwriting.

**Rationale.** Read-before-write is not a filesystem exclusion primitive, and
rename-over-existing violates immutable provenance under competing processes.
Separating read/render from the sole interactive runtime writer prevents an
automated tracked path from manufacturing OWNER provenance while preserving
the existing digest-bound read-back and terminal-safety model.

**Phase applicability.** Phase 7B.2.1 and all later private AI artifact
consumers. Phase 8 remains a separate, unstarted task.

## D-43 — Phase 7B.3 local-model integration is one-shot and non-authoritative

**Decision.** The Phase 7B.3 canary is a separate, explicitly invoked
synthetic integration check over the existing `LoopbackAiReviewProvider`. Its
controller owns one fixed L2 `BUG_CANDIDATE` input, one fresh
`AiReviewSession`, one maximum provider exposure, zero oracle suggestions, and
zero retries. It validates the model response and v2 draft in memory without
an `AiReviewArtifactStore`, returns only sanitized metadata, and discards all
model prose. The CLI accepts only a strict loopback endpoint, strict model
identifier, and bounded timeout; it cannot accept prompt/evidence text, read
private findings, invoke product/browser/campaign/auth paths, call tools, use
cloud fallback, install/download a runtime/model, publish, or write Git.

**Rationale.** A real local response can test transport and hostile-output
compatibility without creating a new authority path. Keeping the model call
last, bounded, synthetic, and non-persistent makes runtime/model absence a
valid `NOT_RUN` result rather than a reason to weaken safety controls.

**Consequences.** CI remains deterministic and uses only the existing local
HTTP fixture. A safe real run requires independent proof of an already-present
runtime/model and an exact allowed loopback endpoint; otherwise the canary is
`LOCAL_MODEL_CANARY_NOT_RUN / LOCAL_RUNTIME_NOT_AVAILABLE`. A PASS, FAIL, or
NOT_RUN result does not promote evidence, create owner provenance, or
authorize Phase 8. The first bounded discovery for this milestone found no
compatible local runtime/model, so no real provider call was made.

**Phase applicability.** Phase 7B.3 and later local AI review canaries. Phase
8 remains a separate, unstarted task.

## D-44 — Phase 8A is declarative evaluation authority without adoption authority

**Decision.** The owner-authorized first slice of Phase 8 is a separate
self-development companion subsystem, not an extension of AI review or the
campaign runtime. Phase 8A accepts only the exact-key
`nightwatch.selfdev-candidate.private.v1` schema and the
`SYNTHETIC_REGRESSION_CASE` data kind. The sole proposer is
`SYNTHETIC_DETERMINISTIC`; candidates may reference only fixed local synthetic
fixtures, safe structural action IDs, deterministic assertion IDs, bounded
coverage metadata, and sanitized source references. Candidate identity is a
canonical SHA-256 of stable semantics and excludes timestamps, filesystem
paths, and randomness.

The deterministic evaluator owns schema, scope, privacy, safety, duplicate,
budget, execution, regression, and computed coverage truth. It produces the
strict `nightwatch.selfdev-evaluation.private.v1` result and may persist only a
sanitized owner-only private artifact under the separate `self-development`
namespace. A passing case is `EVALUATED_PASS_NOT_ADOPTED` with
`adoptionStatus=NOT_AUTHORIZED_PHASE_8A` and `publication=PROHIBITED`.
There is no adopter, source writer, Git runtime authority, model provider,
product/browser/API path, database/infrastructure path, publication path, or
oracle registration path. Phase 8B controlled source adoption remains a
separate future authorization and is not started by a passing evaluation.

**Rationale.** Phase 8 must begin with a measurable evaluation boundary while
preserving Nightwatch's read-only-by-default contract. A data-only candidate
class makes the trust boundary explicit and lets deterministic tests exercise
identity, duplicate, coverage, safety, privacy, and no-side-effect behavior
without accepting generated code or patches.

**Consequences.** The bounded synthetic session is limited to 3 candidates, 8
actions, 8 assertions, 30 seconds per candidate, and 120 seconds total. The
evaluation result is companion evidence only: it cannot alter deterministic
evidence, campaign admission, source relevance, fault boundaries, existing
oracle truth, owner-review drafts, Git state, or Phase 8 status. Runtime
safety-vector counters for product/data/infrastructure/AI/publication/Git/
source/Alphaus activity remain explicit zeroes. The implementation checkpoint
is `d2a2978ede7c29d04e95f1625a736ce7c26004f9`.

**Phase applicability.** Phase 8A and any later phase that consumes its
evaluation results. Phase 8 remains `IN_PROGRESS`; Phase 8B is `NOT_STARTED`.

## D-45 — Phase 8A.1 v2 provenance is content-bound and replay-authoritative

**Decision.** Phase 8A.1 adds prospective
`nightwatch.selfdev-evaluation.private.v2` and
`nightwatch.selfdev-session.private.v2` records. A v2 session ID is
recomputed from canonical semantic fields with the ID omitted. A single
canonical result-state invariant rejects enum-valid but impossible evaluator
tuples, and exact candidate ID/digest/kind/base binding is required. The
session carries only a bounded synthetic replay descriptor; the deterministic
proposal sequence is regenerated in array order through one fresh stateful
evaluator using a constant injected monotonic replay clock. Canonical bytes of
each evaluation must match, so recomputed digests alone are not trust.

The v2 provenance block contains a real local Git HEAD, a fixed-code-defined
source bundle digest, a separate evaluator contract digest, an explicit
algorithm version, clean-source state, and normalized Node version. The source
bundle uses length-prefixed relative paths and exact bytes. Only the narrow
provenance boundary may execute fixed no-shell read-only Git metadata commands
for HEAD, cleanliness, fixed-path untracked state, and ancestry. No runtime Git
mutation, source write, network, product, data, infrastructure, model, or
publication authority is added.

Legacy v1 artifacts remain readable where supported but are permanently
`LEGACY_UNVERIFIED_NOT_ELIGIBLE`, are not replay-trusted, and are never
auto-migrated or rewritten. Exact-base and source-equivalent documentation
descendant status are derived at verification time; source/contract drift,
dirty authoritative source, unrelated baselines, and provenance unavailability
fail closed. A successful assessment remains
`NOT_AUTHORIZED_PHASE_8A`/`PROHIBITED` and is only
`INTEGRITY_VERIFIED_FOR_FUTURE_REVIEW`, never approval or adoption.

**Rationale.** A syntactically valid ID or recomputed evaluation hash proves
only internal consistency. The future consumer needs a deterministic answer
about source state, semantic possibility, candidate binding, and ordered
reproducibility without retaining unsafe raw proposals or granting adoption
authority. Dual source/contract provenance and replay provide those claims
within the local threat model, while excluding a malicious machine owner who
rewrites source, artifacts, and verifier together.

**Consequences.** Normal synthetic persistence requires a nonzero locally
attested HEAD, strict pre-write validation, replay, immutable no-replace
storage, and exact read-back. `selfdev:verify` accepts one exact artifact ID
and is read-only; no latest/list/path/adoption/patch modes exist. Documentation
commits can remain source-equivalent when authoritative bytes are unchanged.
Phase 8A.1 closes provenance prerequisites for future design review but does
not start Phase 8B.

**Phase applicability.** Phase 8A.1 and any future read-only consumer of its
v2 integrity assessment. Phase 8 remains `IN_PROGRESS`; Phase 8B is
`NOT_STARTED`.

## D-46 — Artifact integrity and future-review candidate eligibility are separate authorities

**Decision.** Phase 8A.1's trust assessment
(`assessSelfDevArtifactIntegrity`) answers only artifact/provenance/replay
integrity; it does not and must not mean "contains an eligible candidate." A
replay-valid, source-attested `VERIFIED_EXACT_BASE` (or
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`) artifact with zero pass candidates is
genuinely trust-valid but future-review ineligible. The pre-fix
`isFutureReviewPrerequisitePass` conflated these by ignoring `replayStatus`
and `passCandidateCount`; a synthetic reproduction proved this as a true
positive before the fix landed.

The corrected `isFutureReviewPrerequisitePass` requires `replayStatus ===
'PASS'`, a runtime-validated genuine positive-integer `passCandidateCount`
(`Number.isInteger(value) && value > 0`, not merely a non-zero check and not
only a TypeScript compile-time guarantee), matching
`sourceBundleMatch`/`contractDigestMatch`, and intact
`adoptionStatus`/`publication`/zero-counter invariants — defensive checks
against a hand-forged assessment DTO whose `trustStatus` string disagrees
with its own match/authority fields. The new canonical
`assessFutureReviewEligibility(value, current)` is the one
source-currentness-aware future-review candidate gate: `current` is a
required parameter, so a caller cannot obtain an eligibility verdict while
skipping current-source trust by calling the existing replay-only
`verifiedPassCandidates` instead. It always derives its own assessment,
applies the corrected prerequisite, and — only on pass — regenerates
candidates via replay and cross-checks the regenerated count against the
assessment's `passCandidateCount`, failing closed on any disagreement rather
than reconciling it (no `Math.min()`, no trusting one side).

**Rationale.** A future Phase 8B design needs one unambiguous entry gate that
cannot be satisfied by artifact authenticity alone. Keeping
`VERIFIED_EXACT_BASE`/`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` semantics
unchanged (rather than redefining them to require a positive pass count)
preserves the existing Phase 8A.1 trust boundary while adding a distinct,
narrower eligibility layer on top of it.

**Consequences.** `verifiedPassCandidates` (`replay.ts`) keeps its existing
signature — it has no runtime callers and existing deterministic replay tests
depend on it — with its replay-only, non-source-currentness-aware scope now
documented explicitly so it is not mistaken for the future-review authority.
No new persisted schema or contract-version constant was introduced:
`trust.ts` is already a member of `SELFDEV_AUTHORITATIVE_PATHS`, so any
eligibility-logic change already advances `sourceBundleDigest` without a
separate version field; `contractDigest` is unchanged because the declared
evaluator/schema/budget/registry contract itself did not change. The
validated implementation checkpoint is
`d33a8c1cc062b435a7b2bc4f69567286dd56ebb4`.

**Phase applicability.** Phase 8A.1.1 and any future Phase 8B design that
consumes a future-review eligibility verdict. Phase 8 remains `IN_PROGRESS`;
Phase 8B is `NOT_STARTED`.

## D-47 — Sandbox-confined source adoption is a distinct, narrower authority than evaluation or provenance

**Decision.** Phase 8B adds exactly one new authority: translating one
exact, current-source-eligible declarative regression candidate into one
deterministic tracked-source postimage, applied and executed only inside a
disposable owner-private source mirror, never in the canonical checkout.
This authority is deliberately split from the pure `src/core/selfDev/`
trust/evaluation domain into a distinct `src/core/selfDevSandbox/` boundary,
matching the project's established pattern of narrow, separately-scrutinized
authority modules (e.g. Phase 7B.2.1's unexported `ownerDecision.ts`).

The adopted-case catalog itself is split across two files rather than one:
`src/core/selfDev/adoptedCases.ts` (trusted schema/validation/identity/
renderer logic) and `src/core/selfDev/adoptedCaseCatalog.generated.ts` (the
actual sandbox mutation target — pure data, a single array literal with no
imports, functions, or expressions beyond literals). This is a deliberate
deviation from a single-file design: it lets hardening enforce data-only-
ness on a small, easily-audited generated file while the schema/validation
module remains normal trusted source that is never itself rewritten by the
sandbox executor.

Adopted-case identity (`adoptedCaseId`) is computed only from
base-independent regression semantics — schema version, fixture ID, action
IDs, sorted assertion IDs, re-derived coverage classes, and strategy class —
explicitly excluding any base Nightwatch SHA, current Git HEAD, timestamp,
sandbox path, or private artifact ID, so an adoption survives a future
Nightwatch commit and duplicate detection works across a changed base SHA.
Coverage classes are always re-derived from the fixed action registry via
the same resolver the evaluator itself uses; they are never trusted from a
caller- or catalog-supplied field, closing a class of corruption where a
hand-edited catalog entry could claim coverage its actions don't actually
produce. The adopted catalog's live contents are embedded directly in the
evaluator contract manifest (`SELFDEV_CONTRACT_MANIFEST`), so adopting an
entry changes `contractDigest` automatically with no separate contract-
manifest version bump needed — the same reasoning as D-46: the manifest's
fixed shape already covers newly bound fields under its existing version
constant, and `sourceBundleDigest` already advances automatically because
every new Phase 8B file (both `src/core/selfDev/adoptedCase*.ts` and all of
`src/core/selfDevSandbox/*.ts`) is a member of `SELFDEV_AUTHORITATIVE_PATHS`.

The planner is pure and deterministic: it consumes only
`assessFutureReviewEligibility` output (never a caller-supplied candidate or
a replay-only helper), requires exactly one matching
`EVALUATED_PASS_NOT_ADOPTED` evaluation whose recorded coverage delta is a
subset of the candidate's re-derived coverage, and requires the on-disk
catalog file to byte-match its own canonical renderer output before
producing a content-addressed plan bound to a single code-defined target
path that neither the candidate nor the CLI can override. Plans are
TOCTOU-revalidated against current source-bundle/contract/target-preimage
digests immediately before any sandbox mutation — not HEAD SHA equality, so
a documentation-only descendant remains runnable while genuine source drift
fails closed, mirroring the `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`
reasoning from Phase 8A.1.

The sandbox executor mirrors only the fixed authoritative source set into a
disposable owner-private 0700 directory outside the repository, verifies
its pre-mutation digest matches canonical exactly, performs exactly one
atomic write to the approved target, verifies exactly one path differs from
canonical afterward, and only then loads and executes the *modified*
sandbox evaluator through a bounded, serial (process-global require-hook
state), cache-isolated local TypeScript loader confined by
`fs.realpathSync` comparison to the sandbox root — never the canonical
checkout. Four metamorphic probes, constructed from the adopted case's own
semantics via a small trusted-code simulation of the fixed action registry
(not the sandbox-loaded evaluator, which is what's being tested), prove: a
same-semantics candidate under a different valid base SHA becomes
`REJECTED_DUPLICATE`; a same-coverage assertion variant also remains
non-new; a genuinely different coverage-adding action sequence still
evaluates `EVALUATED_PASS_NOT_ADOPTED`; an unsafe candidate remains
`REJECTED_SAFETY`. Sanitized results carry a validated semantic invariant
gate — a `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` claim with nonzero
canonical writes, equal pre/post digests, or a still-passing duplicate probe
is rejected even after recomputing the result ID, closing the same class of
forgery risk D-46 closed for trust assessments.

**Rationale.** Canonical source promotion is a categorically higher-risk
capability than anything Phase 8A/8A.1/8A.1.1 introduced, so its blast
radius must be provably confined before any future phase considers granting
canonical write authority. Splitting the sandbox-mutation boundary from the
pure evaluation domain, keeping the mutable catalog file strictly
data-only, deriving identity/coverage instead of trusting supplied values,
and proving the effect through the actual modified sandbox source (not a
canonical-code simulation of what the postimage "should" do) are all
choices that keep this phase's real authority — one bounded, disposable,
cleaned-up filesystem write plus a bounded in-process module load — as
small and auditable as the capability it grants.

**Consequences.** A new narrow owner-policy operation
`SELF_DEVELOPMENT_SANDBOX_ADOPTION` authorizes only sandbox-confined writes;
`SELF_DEVELOPMENT_CANONICAL_ADOPTION` was deliberately never added to the
allowlist and fails closed like any unknown operation. Hardening gained
`checkPhase8BSandboxBoundary`, including call-graph containment proving only
the CLI (`bin/selfdev-adopt-sandbox.mjs`) and the sandbox module itself can
reach the sandbox source-write executor. No canonical source write
authority, Git commit/push authority, AI/model authority, product/database/
infrastructure authority, or publication authority exists anywhere in this
boundary. The validated implementation checkpoint is
`f04bb928890b8d730665b24cfd303386608b2a5a`; the real local acceptance run
was performed against the documentation-inclusive descendant
`36495b4df2c013d671a4983cd7991e1aecd9a25e` (plan `adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`,
result `adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`)
confirmed the canonical adopted-case catalog, its digest, and `git status`
were byte-for-byte unchanged before and after.

**Phase applicability.** Phase 8B and any future Phase 8B.1 (Owner-Gated
Canonical Promotion) design, which remains `NOT_STARTED`/`NOT_AUTHORIZED`
and must consume this phase's plan/result identity rather than re-deriving
adoption semantics. Phase 8 remains `IN_PROGRESS`.

## D-48 — Promotion readiness requires validate-before-mutate sandbox bases, one bound strategy, complete verified probes, and truthful write accounting

**Decision.** Phase 8B.0.1 hardened the four trust boundaries a future
canonical-promotion design would consume, after each was reproduced as a
runtime `TRUE_POSITIVE` against the Phase 8B implementation.

1. **Sandbox base pre-validation.** The sandbox base is established by one
   internal routine, `ensurePrivateSandboxBase()`, which validates the whole
   pathname chain component-wise (lstat-first) before ANY mutation: symlink
   components and non-directory components fail closed; ownership is
   validated where the platform exposes uid semantics; the base fails closed
   on group/world-accessible mode with no chmod repair; a missing directory
   is created only beneath a previously validated parent, non-recursively,
   with mode 0700, and immediately revalidated. The established
   private-artifact convention (validate non-symlink owner-matched directory,
   then tighten to 0700, never loosen) is reused for the private parent
   (`.nightwatch`), which Nightwatch's own recursive mkdir historically
   created at 0755; `$HOME` and arbitrary ancestors are never chmodded or
   created. Sandbox instances are realpath-contained beneath the validated
   base and disjoint from the canonical repository, the parent workspace, and
   the findings root; cleanup requires strict realpath child containment and
   lstat before recursive removal — any doubt returns FAIL and deletes
   nothing (a residual directory is preferred to unsafe recursive deletion).
   The base location stays code-defined (`$HOME/.nightwatch/selfdev-sandboxes`);
   there is no `--sandbox-root` option; tests inject a module-level override
   that is not exported from the boundary index.
2. **Single adoption strategy binding.** Plan and result `strategyClass`
   must equal the exact constant `SELFDEV_ADOPTION_STRATEGY_CLASS`
   (`DECLARATIVE_REGRESSION_CATALOG_PROMOTION`) at runtime, checked before
   any identity recomputation, so a forged object cannot change the strategy,
   recompute its content-addressed ID, and pass validation. Plans additionally
   cross-bind `plan.strategyClass === plan.adoptedCase.strategyClass`
   (`PLAN_STRATEGY_MISMATCH`), and the TypeScript type is the literal
   `SelfDevAdoptionStrategyClass`. The strategy version
   (`nightwatch.selfdev-adoption-strategy.v1`) is deliberately NOT added to
   plan/result records: it is already bound through the contract manifest
   (`adoptionStrategyVersion`/`adoptionStrategyClass` in
   `SELFDEV_CONTRACT_MANIFEST`) into `contractDigest`, which plans and results
   carry and TOCTOU-revalidate; adding a field would be cosmetic. There is
   exactly one production adoption strategy; no generic dispatch exists.
3. **Complete verified-result metamorphic invariants.** A claimed
   `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` result requires ALL FIVE probes
   exactly `PASS` — preAdoption, postEquivalent, postVariantCoverage,
   nonOverreach, unsafeRegression. `NOT_RUN` and `FAIL` are invalid per field
   even with a recomputed resultId. The executor distinguishes
   `NON_OVERREACH_PROBE_UNAVAILABLE` (no bounded new-coverage probe exists)
   from `NON_OVERREACH_REGRESSION` (a probe ran and failed) and can never
   produce a verified result when either occurs.
4. **Truthful failure-path write accounting.** `sandboxSourceWrites` tracks
   the ACTUAL executed effect: 0 before the single allowed target write, 1
   immediately after its success; every result — success or failure —
   carries the true value; validation bounds it to integer 0..1, success
   requires exactly 1, and `canonicalSourceWrites`/`runtimeGitWrites`/
   `externalCalls` remain ALWAYS 0. A failure result may truthfully say
   `sandboxSourceWrites = 1` with `sandboxVerificationStatus = FAIL`; that is
   accurate provenance, not a safety violation.

A fifth, narrowly-scoped finding in the same boundary was fixed: the sandbox
loader's serial-execution lock is now released on every exit path (an early
anchor-resolution throw previously wedged every later sandbox load).

**Rationale.** Phase 8B already proved one sandbox-confined adoption can be
verified end-to-end; the residual risk for a future canonical-promotion
design was in the EVIDENCE CHAIN, not the capability: an unvalidated base
could be mutated through a symlink before rejection; an unknown strategy
could be legalized by recomputing an ID; "verified" could mean a missing
proof; and failure metadata could deny writes that actually happened. Each
gap was reproducible pre-fix, each closes with runtime validation plus
behavioral tests, and the real acceptance re-ran on the fixed implementation.

**Consequences.** The canonical generated catalog remains empty and
byte-identical; no canonical promotion authority, runtime Git authority, or
new owner-policy capability was added. Hardening gained
`checkPhase8B01CloseoutIntegrity` and the workflow gained a dedicated
"Phase 8B.0.1 sandbox promotion-readiness closeout matrix" step. The
validated implementation checkpoint is
`c4537ab5e3e96859c7c472ac47c3143a15b20c26`; the fresh sandbox-only acceptance
on the current implementation (session
`session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`,
plan `adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`,
result
`adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`)
verified `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` with all five probes
`PASS`, `sandboxSourceWrites: 1`, zero canonical/Git/external counters, and a
byte-identical empty canonical catalog before and after. Phase 8B.1 remains
`NOT_STARTED`/`NOT_AUTHORIZED`, now `READY_FOR_SEPARATE_DESIGN_REVIEW`.

## D-49 — Bounded proposal portfolio, explicit test baselines, and the Phase 8B.1.0 compatibility repair

**Problem.** The first real Phase 8B.1 canonical promotion (prepare →
approve → apply → verify all succeeded) was reverted because committing it
would have permanently broken the full regression suite: the deterministic
proposer had exactly ONE semantically-distinct valid candidate
(`selfdev.synthetic.expand-summary`), the controller/replay seed every fresh
in-process evaluator from the LIVE adopted catalog, and ~50 assertions across
8 historical test files (Phase 8A/8A.1/8A.1.1/8B/8B.1) implicitly assumed the
live catalog is always empty and a fresh PASS always exists. Two separate
assumptions were false once adoption became real: "the one synthetic
expansion candidate will always be new", and "the checked-out live adopted
catalog is always empty".

**Decision (production).** Introduce a small bounded deterministic proposal
portfolio (`nightwatch.selfdev-synthetic-portfolio.v1` in
`src/core/selfDev/portfolio.ts`): EXPAND_SUMMARY (historical semantics,
unchanged) and EXPAND_THEN_COLLAPSE (expand then collapse; final state ready,
terminal transition READ_ONLY_COLLAPSE), in a frozen fixed order, with
coverage and equivalent fingerprints DERIVED at module load from the trusted
action registry and the shared fingerprint computation — never free data.
One pure selector, `selectNextSyntheticProposalVariant`, returns the first
variant whose fingerprint is not adopted AND whose coverage adds at least one
class beyond baseline+adopted; it takes no base SHA/seed/time/random input, so
identity novelty can never masquerade as semantic novelty. The controller
resolves the omitted/`VALID_MATRIX` alias to a CONCRETE replay fixture
(`VALID_MATRIX_EXPAND` / `VALID_MATRIX_EXPAND_COLLAPSE`) before persisting
the descriptor; the direct proposer's `VALID_MATRIX` stays the historical
fixed expansion matrix, and historical descriptors replay exactly. When both
variants are adopted the portfolio is EXHAUSTED: the default session still
completes normally with `passCandidateCount 0` / `futureReviewEligible false`
and a bounded diagnostic matrix — a valid terminal state, never an error,
never fake novelty.

**Decision (contract).** The manifest SHAPE gains a load-bearing semantic
sub-manifest (portfolio membership/order + selection algorithm version), so
`SELFDEV_CONTRACT_MANIFEST_VERSION` is deliberately advanced from
`nightwatch.selfdev-contract.private.v1` to
`nightwatch.selfdev-contract.private.v2`. Evidence: v1 had been extended
without a bump while the contract was still being built out (8B/8B.0.1), but
this task changes deterministic PROPOSAL semantics, so the version must move;
the version string is part of the manifest and therefore of `contractDigest`.
The replay-algorithm version is NOT bumped (replay still regenerates the exact
recorded concrete fixture and evaluates it exactly); candidate/session/
evaluation/replay-descriptor schemas are unchanged (two new enum values are a
compatible extension). `contractDigest` changed from
`sha256:91b45f10...` (v1, empty catalog) to `sha256:0336723f...` (v2, empty
catalog) by construction.

**Decision (metamorphic probes).** The shared non-overreach probe's
expectation is now exact relative to baseline+adopted coverage: a sequence
that adds genuinely new coverage must still evaluate
`EVALUATED_PASS_NOT_ADOPTED`; a sequence whose only extra classes are already
baseline/adopted (the registry-saturated terminal state — adopting the second
portfolio member) must be `REJECTED_DUPLICATE`. This keeps the historical
single-candidate acceptance unchanged while making the terminal member's
sandbox/promotion verification truthful. The executor's
`NON_OVERREACH_REGRESSION` / `NON_OVERREACH_PROBE_UNAVAILABLE` failure paths
remain reachable end-to-end.

**Decision (test baselines).** Tests must state which adopted-catalog state
they prove. `tests/helpers/selfDevSourceFixture.ts` renders EMPTY /
EXPAND_ONLY / EXPAND_AND_COLLAPSE into committed temporary source repos via
the real Phase 8B renderer/validators (never the live checkout's bytes);
`tests/helpers/selfDevStack.ts` loads the full selfDev stack (controller,
replay, trust/eligibility, localGit provenance, planner, sandbox executor,
promotion) from ONE fixture source root through the existing cache-isolated
loader, so evaluation, replay, contract/source digests, eligibility, and the
planner/sandbox/promotion chain all agree on one explicit catalog state
regardless of the checkout the test process runs in — one coherent dependency
instead of three unrelated mocks. No production catalog-bypass switch, no
env-var bypass, no monkey patching, no mutation of imported global arrays.
The B-only adopted corner is interpreted as EXHAUSTED (A's coverage is fully
subsumed by B's, so claiming A novel would violate the coverage-delta rule).

**Consequences.** Pre-fix reproduction: one adopted entry → 47 failed / 58
passed in the previously affected suites (the rendered one-entry catalog
byte-matches the historical applied postimage `sha256:fa7b71d4...`).
Post-fix: all affected suites green in the real (empty) checkout, in a
one-entry isolated full-history checkout (159 passed), and in an exhausted
A+B isolated checkout (160 passed). Full Playwright 682 passed / 1 skipped
(2 dirty-tree-only CLI failures pass on any clean tree); owner provenance 91;
AI regressions 98; campaign synthetic 27; typecheck, hardening (incl.
`checkPhase8B10PortfolioIntegrity`), diff check, agent-state, and privacy
scan all pass. Exact CI green at `e02aebeb42b2b95995dc20f4123dade866ed71cd`
with the dedicated "Phase 8B.1.0 catalog-aware proposal compatibility matrix"
step. Phase 8B.1.0 = COMPLETE; Phase 8B.1 stays BLOCKED with
`READY_FOR_FRESH_OWNER_AUTHORIZATION` — the historical one-shot approval
remains spent (read-only re-verified) and no promotion was retried. The real
canonical catalog remains EMPTY (digest `sha256:ffe3d635...` unchanged).

## D-50 — Project-memory live authority de-duplication and generated catalog lifecycle comment correction

**Problem.** Two independent live-truth defects surfaced after Phase 8B.1-R1:

1. `docs/CURRENT_STATE.md` carried generic project-level rows
   `LAST_VALIDATED_IMPLEMENTATION_SHA: 4602fac...` and
   `LAST_DOCUMENTATION_CHECKPOINT_SHA: 488b4e...` — Phase 8A.1-era anchors
   presented as current project authority. They naturally drifted because the
   same facts are already authoritatively owned by two stronger live systems:
   Git (live HEAD) and the strict `nightwatch.agent-continuity.v2` task
   continuity checker (current validated/substantive/documentation
   checkpoints per task). CURRENT_STATE is a project SNAPSHOT; duplicating
   live checkpoint authority inside it guarantees future drift (the duplicate
   is what went stale, not the values — replacing the two hashes would have
   recreated the same failure mechanism later).
2. The generated adopted-case catalog's header (produced by
   `renderAdoptedCatalogSource()` in `src/core/selfDev/adoptedCases.ts`)
   stated the file is the one the "Phase 8B sandbox adoption executor is
   permitted to rewrite, and only ever inside a disposable private source
   mirror — never in this canonical checkout at runtime." That was Phase 8B
   truth, but Phase 8B.1 added a distinct owner-gated canonical-promotion
   authority that legitimately rewrites the exact canonical target before the
   development session commits it. The generated file therefore described an
   obsolete authority model (sandbox-only) while a second legitimate writer
   already existed.

**Decision (project memory).** Introduce the versioned project-memory
protocol `nightwatch.project-state.v1` (separate from
`nightwatch.agent-continuity.v2`; continuity v2 answers "is this TASK
internally truthful", project-state v1 answers "do CURRENT project-level
facts agree with mechanically derivable source and authority"):

- CURRENT_STATE's generic live anchor rows are REMOVED; their Phase 8A.1
  provenance is preserved in explicitly historical phase-qualified rows
  (`PHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA`,
  `PHASE_8A_1_HISTORICAL_DOCUMENTATION_CHECKPOINT_SHA`), matching the
  established `PHASE_7B_1_HISTORICAL_*` convention.
- A machine-checked structured truth block in CURRENT_STATE holds only facts
  with deterministic sources: protocol version, authority markers
  (`LIVE_HEAD_AUTHORITY: GIT`, `CURRENT_TASK_AUTHORITY` /
  `VALIDATED_IMPLEMENTATION_AUTHORITY: .agent/ACTIVE_TASK.md`), canonical
  catalog target/count/digest/strategy, current phase statuses
  (`PHASE_8_STATUS: IN_PROGRESS`,
  `PHASE_8B_1_STATUS: COMPLETE_VIA_SUCCESSFUL_RETRY_R1`),
  `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`, and
  `NEXT_PROMOTION_AUTHORITY: NONE`. No self-referential live SHA is ever
  stored; live HEAD is discovered from Git.
- New deterministic read-only checker `bin/project-state-check.mjs`
  (`npm run project:check`) validates the block against the real
  `validateAdoptedCatalog` / `renderAdoptedCatalogSource` / real portfolio
  selector, requires `.agent/ACTIVE_TASK.md` to exist AND continuity v2 to
  pass, requires a clean checkout, and REJECTS reintroduction of competing
  generic live implementation/documentation anchor keys inside the v1 block
  (`PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY` /
  `PROJECT_STATE_DUPLICATE_DOCUMENTATION_AUTHORITY`) — the direct regression
  guard for this defect. Historical phase-qualified fields remain valid.
  CI runs it as the dedicated "Project-memory truth check" step.
- Availability never implies authorization: `NEXT_PORTFOLIO_MEMBER:
  AVAILABLE_NOT_ADOPTED` (variant B exists as a candidate) coexists with
  `NEXT_PROMOTION_AUTHORITY: NONE`; the checker enforces the latter exactly.

**Decision (generated catalog lifecycle).** The renderer header AND the
regenerated `adoptedCaseCatalog.generated.ts` now state the exact
Phase 8B + Phase 8B.1 authority model: (A) the Phase 8B sandbox adoption
executor may rewrite the target only inside a disposable private source
mirror; (B) the Phase 8B.1 canonical-promotion executor may rewrite the
exact canonical target only after the complete owner-gated promotion
evidence/approval chain, with the development session committing the
promoted result; (C) ordinary development must never hand-edit the generated
file — it is produced only through the deterministic renderer; (D) no
generic self-modification authority exists — runtime code never writes
canonical source and no candidate ever writes source. The obsolete
sandbox-only sentence ("never in this canonical checkout at runtime") is
removed from all live renderer text and rejected by hardening if
reintroduced.

**Consequences.** The one-entry catalog was regenerated through the trusted
renderer: deep semantic equality PASS (adoptedCaseId
`adopted-case:sha256:90248aae...`, equivalentFingerprint
`sha256:6a322450...`, actions/assertions/coverage/strategy unchanged; count
exactly 1); raw file digest changed from `sha256:fa7b71d4...` to
`sha256:401b2c67...` (generated header bytes only); `sourceBundleDigest`
changes by construction; `contractDigest` unchanged
(`sha256:d8012fae...`) — evaluator/adoption semantics untouched. Promotion
currentness semantics were NOT weakened: the historical R1 verification
stays exact historical evidence; a regression test proves an authoritative
source change after `CANONICAL_PROMOTION_COMMITTED_EXACT` yields strict
`CANONICAL_PROMOTION_SOURCE_MISMATCH` for the old verification, never a
"semantically close" reclassification. CURRENT_STATE, ROADMAP, ARCHITECTURE,
SAFETY_MODEL, and AGENTS were updated to the de-duplicated authority model;
historical phase records and decisions were preserved unchanged.

## D-51 — Canonical runtime mutation authority terminology

**Problem.** D-50's corrected header text still contained one false absolute:
"no generic self-modification authority exists — runtime code never writes
canonical source and no candidate ever writes source." The
canonical-promotion executor IS runtime code and may legitimately perform the
bounded canonical target write, so "runtime code never writes canonical
source" contradicts the two-writer partition stated in the same header
(`renderAdoptedCatalogSource()` in `src/core/selfDev/adoptedCases.ts` and the
regenerated `adoptedCaseCatalog.generated.ts`, Phase 8B.1-R1.1.1).

**Decision (terminology).** "Runtime source mutation" is NOT globally
prohibited inside Nightwatch. The exact authority model is:

- generic runtime code cannot write canonical source — no generic runtime
  source-writing interface exists;
- candidates never directly write source;
- the Phase 8B sandbox executor may write the fixed target only inside a
  disposable private source mirror;
- the Phase 8B.1 canonical-promotion executor is the ONLY runtime authority
  that may perform the bounded canonical target write, and only after the
  complete owner-gated promotion evidence/approval chain;
- runtime promotion code never commits or pushes Git — the development
  session performs the later verified Git commit.

The renderer header and the module-level header now state exactly this
boundary; the regenerated one-entry catalog carries the same truthful header
(bytes-only change: raw digest `sha256:401b2c67...` ->
`sha256:bd35b934...`; deep semantic equality PASS; `contractDigest`
`sha256:d8012fae...` unchanged). Deterministic regression tests
(`tests/unit/selfDevAdoptionCatalog.test.ts`) assert the positive invariant
AND reject the false absolutes ("runtime code never writes canonical
source", "runtime never mutates canonical source", "canonical source is
never written at runtime", "no runtime path can write canonical source", and
equivalents); `bin/hardening-check.mjs` rejects reintroduction with
`PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT` in the live renderer and the
current generated target.

**Consequences.** D-50 remains the historical R1.1 decision record and is
preserved verbatim (including its quoted phrase); D-51 supersedes the false
absolute as of Phase 8B.1-R1.1.1. Promotion currentness semantics unchanged:
the historical R1 verification stays exact historical evidence, and a later
authoritative source change keeps yielding strict
`CANONICAL_PROMOTION_SOURCE_MISMATCH`.

## D-52 — Phase 8 next-architecture design review: close Phase 8; freeze the canonical-promotion research boundary

**Decision.** After the first canonical owner-gated self-development
adoption (Phase 8B.1-R1, commit `24fc437`; catalog count 1; variant B
AVAILABLE_NOT_ADOPTED; promotion authority NONE), the evidence-based
next-architecture selection is **CLOSE_PHASE_8**: Phase 8's objective — one
owner-authorized canonical self-development promotion with a complete
source-bound evidence chain, plus continuation — is fulfilled with live
evidence. No further Phase 8 implementation is recommended. Variant B
remains available but unadopted; promotion authority remains NONE. The
canonical-promotion machinery is preserved intact for any future concrete
need. The full analysis is in
`docs/ARCHITECTURE.md` (Phase 8 next-architecture design review section;
design review
`phase-8-next-architecture-design-review`, authorization
`PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`).

**Rationale.** The promotion chain is generic and cardinality-agnostic;
catalog states 0/1/2 and EXHAUSTED are fixture-proven; CI contains no
hard-coded count assumption; a second adoption of variant B would close
only operational evidence gaps (live ceremony, live status-pin transition)
at the cost of a fresh authorization, ceremony, and a source change, while
adding zero bug-hunting value (B is a structural canary — a synthetic
regression case over the local fixture state machine, not a production
finding capability). Nightwatch's purpose is Alphaus bug hunting; the next
investment belongs in the campaign/oracle/triage space, not in more
self-development promotion machinery. Closure itself requires a separate
authorized task because `bin/project-state-check.mjs:172-174` hard-pins
`PHASE_8_STATUS: IN_PROGRESS` and `PHASE_8B_1_STATUS:
COMPLETE_VIA_SUCCESSFUL_RETRY_R1` (a source change), so the design review
records the design and stops.

**Alternatives.** REPEATABLE_OWNER_GATED_ADOPTION (Option B) is
VIABLE_LATER: the chain already supports it generically; it should be
executed only for a real candidate with bug-hunting value under a fresh
owner authorization per adoption (each with a fresh one-shot approval, one
APPLY, no auto-loop, future-state rehearsal, STOP). Option C (owner review
queue) and Option D (portfolio expansion) are DEFERRED: the queue is
meaningless for a 2-member portfolio, and expansion belongs after closure
with real bug-hunting semantics. Option E (first-class rollback machinery)
is REJECTED: the development-session Git-restore model covers every
failure scenario (proven in the original 8B.1 BLOCKED attempt), and a
runtime revert would mirror the canonical write authority the model
deliberately excludes. Option F (autonomous canonical promotion) is
REJECTED_BY_DESIGN: it replaces per-adoption owner approval with standing
runtime authority, violating the AGENTS.md principle of explicit owner
authority for irreversible canonical promotion, the one-shot-approval and
no-auto-loop principles, and the candidate-availability ≠
promotion-authorization separation; it would also create generic
self-modification authority that D-51 rules out.

**Owner authority boundary.** Unchanged: owner-gated chain L3-L6
(intent/approval/APPLY/commit) per adoption; `NEXT_PROMOTION_AUTHORITY:
NONE` machine-enforced; one-shot approvals; no runtime Git mutation. This
review grants NO promotion authority and NO implementation authority; the
proposed closure task
("Phase 8 Final Closure & Phase 9 Roadmap Selection",
`PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`) requires separate owner
authorization.

**Consequences.** `PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8`; Phase 8
closure PROPOSED (not executed — the project-state pins make it a source
change); ROADMAP records the design with DESIGNED / NOT_STARTED /
NOT_AUTHORIZED markers; the machine-checked truth block is unchanged
(count 1, B available, authority NONE). Variant B adoption, portfolio
expansion, and any promotion remain separate-authorization-only.

## D-53 — Phase 8 complete; Phase 9 roadmap selected

**Decision.** Phase 8 is declared COMPLETE by the authorized closure task
(`phase-8-final-closure-phase-9-roadmap-selection`, Phase 8-CLOSURE,
authorization `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`, 2026-08-15),
executing the D-52 recommendation `CLOSE_PHASE_8`:
`PHASE_8_STATUS: COMPLETE` (project-state pin + machine-checked truth block - regression matrix + hardening), the canonical-promotion research boundary
is closed, and the next bug-hunting investment is selected:
`PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH` — **Phase 9 —
Deterministic Semantic Oracle Depth** — with an implementation-ready
future-task spec in `docs/design/PHASE_9_ROADMAP.md`.
`PHASE_9_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED`;
`PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.

**Rationale.** Phase 8's objective — one owner-authorized canonical
self-development promotion with a complete source-bound evidence chain,
plus continuation — is fulfilled with live evidence (R1 at `24fc437`,
`CANONICAL_PROMOTION_COMMITTED_EXACT`, post-commit sessions select B) and
its four completion criteria reconfirmed PASS from current source/docs:
(1) owner-gated canonical promotion proven live; (2) continuation after
adoption proven; (3) current-source truth hardened (continuity v2 +
project-state v1 + catalog integrity + authority wording, all
machine-enforced and CI-green); (4) no unresolved Phase-8 safety blocker
(authority NONE). One canonical adoption suffices to prove the research
goal; variant B (EXPAND_THEN_COLLAPSE) is a structural canary with zero
bug-hunting value, so its adoption would be ceremony evidence without new
capability. The Phase 9 selection is evidence-backed: the current primary
bug-hunting bottleneck is insufficient semantic oracle depth — the
deterministic oracle set is protocol/structural only (zero DOMAIN, zero
RELATIONAL, zero value-level TEMPORAL/CROSS-SURFACE oracles), every real
campaign from Phase 2A through Phase 7 produced zero admitted findings,
and the historical browser budget-starvation finding was already repaired
by Hardening Campaign I/I.1 (feasibility reproduction reserve, atomic
budget accounting, exploration suppressed in the real profile). Raising
P(detection) of semantic defects on the existing surface (3 journeys + 3
API operations) multiplies useful yield more than more executions of
shallow oracles (P9-A), post-hoc triage polishing (P9-C), class-level
differential wiring (P9-D), selection narrowing among 3 journeys (P9-E),
premature breadth (P9-F), or a second self-development adoption (P9-G,
DEFER per D-52).

**Alternatives.** P9-A (campaign yield/budget intelligence) VIABLE_LATER;
P9-C (triage confidence) and P9-D (differential expansion)
NEXT_AFTER_PHASE_9; P9-E (source-change-driven selection)
NEXT_AFTER_PHASE_9; P9-F (multi-product expansion) REJECT as premature
until Phase 9 shows measurable yield on Ripple; P9-G (second canonical
adoption) DEFER unless a real bug-hunting-value candidate exists.

**Owner authority boundary.** Unchanged and load-bearing:
`NEXT_PROMOTION_AUTHORITY: NONE` machine-enforced; `PHASE_8_STATUS:
COMPLETE` grants NO promotion authority — closing the research phase is not
standing authorization to use the machinery later. The canonical-promotion
machinery is retained intact; future use requires a concrete
bug-hunting-value candidate + fresh owner authorization + fresh
current-source evidence + fresh one-shot approval + one bounded APPLY.
Phase 8 is COMPLETE, not FROZEN. The Phase 9 implementation task requires a
separate owner authorization (`PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`);
none is granted here.

**Consequences.** Phase 8 = COMPLETE; Phase 8 closure = COMPLETE; Phase 9 =
DESIGNED / NOT_STARTED / NOT_AUTHORIZED. `docs/design/PHASE_9_ROADMAP.md`
is the durable Phase 9 design document (the docs/design single-level
Markdown checkpoint allowlist makes it a legitimate documentation
checkpoint). Project-state protocol stays `nightwatch.project-state.v1`;
catalog count 1 and digest `sha256:bd35b934...` unchanged; variant B
AVAILABLE_NOT_ADOPTED; promotion authority NONE. No Phase-8C status was
invented. D-52 remains the historical design-review record, not rewritten.

## D-54 — Phase 9 deterministic semantic oracle depth implemented (local/synthetic)

**Decision.** The owner-authorized Phase 9 implementation task
(`phase-9-deterministic-semantic-oracle-depth`, authorization class
`PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`, 2026-08-16) implemented the
selected direction `PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH` —
**Phase 9 — Deterministic Semantic Oracle Depth** — for the LOCAL/SYNTHETIC
stage and closed under `nightwatch.agent-continuity.v2`. The architecture:
ephemeral raw observation -> bounded in-memory sanitized semantic projection
(shape/count/type/opaque identity tokens/numeric relation refs; raw customer
scalars never cross the boundary) -> declarative source-backed expectation +
cross-step invariant oracles over a fixed vocabulary -> safe semantic
findings (`nightwatch.semantic-oracle-finding.v1`) -> the EXISTING
campaign/admission/triage/dossier pipeline, with additive sanitized
`semanticEvidence` in dossiers. Measured results on the fixed synthetic
corpus: 5/5 required seeded semantic bug classes detected (HTTP-200 error
envelope, list/detail identity mismatch, stale state after transition,
aggregate total relation mismatch, cardinality relation mismatch); 0 false
positives on 10 benign cases; 0 sentinel leaks across projections, findings,
fingerprints, recorder events, campaign checkpoints, dossiers, briefs,
artifacts, and failure-path errors (including derived forms and absolute
private paths); projection serialization byte-identical across repeated
runs; baseline protocol-only detection 0/5 vs Phase 9 semantic 5/5; five
seeded classes admitted through the real synthetic campaign orchestrator
into 5 sanitized semantic dossiers; paired baseline campaign admits none.
Full regression green (896 passed / 1 skipped / 0 failed locally; 893 / 4 /
0 in the isolated full-history checkout); exact implementation CI
31929017844 success at exact head `e74185bf7b83783c2b7421e675ea2d3bb9053482`
including the dedicated "Phase 9 deterministic semantic oracle depth matrix"
step; catalog byte-identical `sha256:bd35b934...` (count 1);
`PHASE_8_STATUS: COMPLETE`; `NEXT_PROMOTION_AUTHORITY: NONE`.

**Rationale.** The semantic projection privacy boundary is load-bearing:
string values project as type + presence + empty/nonempty class + opaque
encounter token; numbers as opaque refs into an ephemeral context that is
never serialized; numeric relations emit facts only (MATCH/MISMATCH/
NOT_APPLICABLE/INVALID_INPUT + bounded operandCount), never raw amounts.
Expectations are declarative data contracts validated strictly, bound to
source provenance (repo @ SHA) with fail-closed staleness; the source
adapter is one static-text interface shared by the synthetic fixture and
real read-only checkouts (never executes application code). The real-source
canary proved provenance binding against the live `mobingilabs/ripple-api`
checkout (`27bb007a...` == Phase 5 catalog SHA) with
`REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED` — real domain expectations
are not invented. Integration is additive: the Phase 5 protocol oracle and
its DTO are untouched (composed protocol/semantic evaluation, protocol
failure short-circuits); the network observer gains a narrowly typed hook
(transient raw text -> safe findings only); campaign budget/admission/
promotion authority and triage authority are unchanged; dossier schema is
extended additively (protocol-only dossiers unchanged).

**Alternatives.** P9-A (budget intelligence) VIABLE_LATER; P9-C (triage
confidence / minimization replay) and P9-D (value-level differential)
NEXT_AFTER_PHASE_9; P9-E (source-change selection) NEXT_AFTER_PHASE_9;
P9-F (multi-product) REJECT (premature); P9-G (second canonical adoption)
DEFER per D-52/D-53.

**Owner authority boundary.** Unchanged and load-bearing: Phase 8 COMPLETE
grants no promotion authority; `NEXT_PROMOTION_AUTHORITY: NONE`
machine-enforced; catalog byte-identical; variant B AVAILABLE_NOT_ADOPTED.
Phase 9 core remains deterministic; AI stays downstream-only and
non-authoritative (hardening-guarded). Phase 6 remains
`FROZEN_BY_OWNER` / `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE` — no Phase
6 surface was used or revived. No DEV/NEXT/production execution occurred;
no product mutation; no Alphaus writes; no publication.

**Consequences.** Phase 9 = `COMPLETE_LOCAL_SYNTHETIC`
(`PHASE_9_ORACLE_DEPTH_STATUS: COMPLETE`). `PHASE_9_DEV_ACCEPTANCE:
RECOMMENDED_SEPARATE_AUTHORIZATION` — a contained DEV acceptance run would
provide material evidence the local/synthetic stage cannot: real response
shape variety, real source-freshness drift, and end-to-end browser-observed
semantic findings on the real product surface; it requires a separate
narrow Phase 9B authorization and is NOT executed here. Project-state
protocol stays `nightwatch.project-state.v1` (no new machine fields);
roadmap/design records updated; D-53 remains the historical selection
record, not rewritten.

## D-55 — Phase 9A.1 real-source expectation admission & semantic evaluation observability (local/source-only/synthetic)

**Decision.** The owner-authorized Phase 9A.1 readiness task
(`phase-9a-1-real-source-expectation-admission`, authorization class
`PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`, 2026-08-16, starting SHA
`91a64e597bc0b28653fe53bf46e291126963baa5`, substantive implementation
`cfc2aaa65227b2caf26d2d51533bf32ecc489028`, exact implementation CI
31932079316, 29/29 steps green incl. the dedicated "Phase 9A.1 real-source
expectation admission matrix" step) closed the Phase 9B readiness gaps
locally and decided `PHASE_9B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`.
The three pre-fix gaps were reproduced first: Gap A (real Alphaus source
yields zero derived expectations — the annotation-only source adapter
recorded `REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED` with blockCount 0 /
expectations 0 against the live checkout); Gap B (NO_EXPECTATION was
indistinguishable from PASS — both returned the identical `{findings: []}`
with no receipt); Gap C (a throwing semantic hook inside the network
observer was silent — the observer continued and no semantic-evaluation
evidence existed anywhere).

**What was built (local/source-only/synthetic).** A Nightwatch-owned
real-source expectation admission bridge that requires NO Alphaus
annotations: versioned data-only recipes
(`nightwatch.real-source-expectation-recipe.v1`) describing how to
mechanically derive one expectation from a read-only source snapshot; a
fixed bounded syntax-aware PHP extractor vocabulary
(`PHP_FUNCTION_LIST_ROW_KEYS` PUSH/ASSIGN, `PHP_FUNCTION_RETURNS_LIST_OF_
BUILDER`, `PHP_ROUTE_GET_BINDING`) that tokenizes source text but never
executes application code and never uses unbounded regex as semantic
authority; a deterministic source-evidence digest (`ev:sha256:<24>` over the
NORMALIZED source structure used to derive — never the whole repository);
strict recipe validation/registry gates (approved read-only targets only,
one recipe per target, mutation/unknown targets rejected); and an atomic
expectation + source-snapshot resolver with fail-closed currentness (exact
SHA + re-extracted evidence digest; stale/unavailable/evidence-changed are
never PASS and never silently re-bound). Four expectations were mechanically
derived and admitted from the live `mobingilabs/ripple-api` checkout
(`27bb007ad0c798800b6bd3b29760c966422966e7` == Phase 5 catalog SHA):
`ripple.common-exchange.read` (item keys month + exchange_rate), `ripple.
payer-exchange.read` (id + vendor + name + exchange_rate), `ripple.account-
inventory.read` (15 literal keys), `ripple.billing-group-exchange.read`
(4 literal keys) — each asserting the source-established top-level JSON
array (catching the HTTP-200-error-envelope class) plus per-item literal
field presence; 3 of the 4 are DEV-reachable through reviewed journey
ruleIds (payer-exchange, common-exchange, account-inventory).
`ripple.billing-groups-legacy.read` was REJECTED (AMBIGUOUS: conditional
keys + blob-typed fields); the gRPC `ripple.billing-groups.read` is
statically feasible via proto but not observable by the current JSON
observer (deferred).

**Semantic evaluation observability.** New safe receipts
(`nightwatch.semantic-evaluation-receipt.v1`) with the nine-outcome
vocabulary (PASS / ANOMALY / NOT_APPLICABLE / NO_EXPECTATION /
EXPECTATION_SOURCE_STALE / EXPECTATION_SOURCE_UNAVAILABLE / INVALID_INPUT /
PROJECTION_LIMIT_EXCEEDED / INTERNAL_ERROR); NO_EXPECTATION, SOURCE_STALE,
SOURCE_UNAVAILABLE, NOT_APPLICABLE and INTERNAL_ERROR are NEVER PASS; the
semantic hook now returns receipt + findings; the network observer keeps a
bounded sanitized evaluation ledger (`semanticEvaluations()`, cap 512,
overflow explicit via `semanticEvaluationLedgerOverflow()`); semantic-hook
failures are never silent (safe INTERNAL_ERROR receipts); a privacy-contract
violation escalates through the existing safety architecture
(`monitor.recordHardFailure`, reason `semantic-privacy-contract-violation`)
and can never become findings:[] / PASS / NOT_APPLICABLE. The Phase 5
composed stage exposes receipt outcomes (additive; the protocol oracle is
untouched). The forbidden shortcut "synthetic expectation + real SHA
relabeling" is rejected by the resolver
(`REAL_SOURCE_EXPECTATION_PROOF_MISSING` semantics: no registered recipe,
no evidence digest, or digest mismatch -> SOURCE_STALE, never RESOLVED).

**Measured results.** Focused Phase 9 + 9A.1 matrix 212 passed; full
regression 994 passed / 1 skipped (pre-existing environment-conditional) /
0 failed; isolated full-history checkout at the implementation SHA green
(typecheck, hardening, 199 focused matrix tests, campaign synthetic 27,
agent:check/audit, project:check, catalog integrity, full Playwright, git
diff --check); owner-local live canary: 4 derived / 4 current / 0 stale /
3 DEV-reachable; conforming synthetic body per admitted real expectation ->
PASS receipt x4; mutated synthetic body (2xx error-envelope object) ->
ANOMALY receipt x4 (proving the bridge changes semantic behavior, not just
provenance metadata); sentinel leakage 0 across receipts, findings, ledger,
recorder events, and failure paths. Catalog byte-identical
`sha256:bd35b934...` (count 1); `PHASE_8_STATUS: COMPLETE`; B
AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`.

**Rationale.** Phase 9 proved Nightwatch can detect semantic defects safely;
Phase 9A.1 proves Nightwatch knows WHAT real-product semantic contract it is
entitled to evaluate, and can prove that authority from current source. The
boundary is now explicit: SYNTHETIC EXPECTATION is valid for synthetic tests
only; REAL SOURCE SHA is provenance only; neither alone grants real semantic
truth. Only real source + deterministic source evidence + mechanically
verified derivation + approved read-only target + current source snapshot =
admitted real-product expectation. A later Phase 9B DEV acceptance is valid
only when EXPECTATION RESOLVED + SEMANTIC EVALUATION RECEIPT EXISTS + OUTCOME
IS EXPLICIT + ZERO PRIVACY/SAFETY FAILURE — zero findings by itself proves
nothing.

**Alternatives.** Requiring Alphaus annotations (rejected: Alphaus repos
remain read-only; `@nightwatch-contract` stays a synthetic-fixture
mechanism); generic parsers/AI extractors (rejected: fixed vocabulary only,
no unbounded regex-as-authority, no AI oracle authority); silently
re-binding expectations to new SHAs (rejected: fresh derivation/re-admission
required); skipping the receipts and inferring PASS from zero findings
(rejected: NO_EXPECTATION/STALE/N-A/INTERNAL_ERROR are explicit outcomes).

**Owner authority boundary.** Phase 8 COMPLETE grants no promotion
authority; `NEXT_PROMOTION_AUTHORITY: NONE` machine-enforced; catalog
byte-identical; variant B AVAILABLE_NOT_ADOPTED. Phase 9A.1 performed zero
DEV/NEXT/production contact, zero authenticated journeys, zero real API
traffic, zero product mutations, zero DB/infra queries, zero AI/model
calls, zero Alphaus writes, zero publication. `PHASE_9B_STATUS:
DESIGNED_NOT_STARTED_NOT_AUTHORIZED` — the Phase 9B future-task spec
(`docs/design/PHASE_9B_TASK_SPEC.md`, authorization class
`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`) is design only and NOT
executed here.

**Consequences.** `PHASE_9A_1_STATUS: COMPLETE`;
`PHASE_9B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`; the Phase 9B
roadmap wording is corrected (real-source-derived AND admitted expectations
bound to their exact current source snapshots — synthetic expectations are
test fixtures only); project-state protocol stays `nightwatch.project-state.
v1` (no new machine fields); AGENTS.md gains the Phase 9A.1 permanent rule;
D-54 remains the Phase 9 implementation record, not rewritten.

## D-56 — Phase 9B contained DEV semantic acceptance: harness proven, DEV acceptance BLOCKED at the pre-browser auth gate (NOT_PROVEN)

**Decision.** The owner-authorized Phase 9B task
(`phase-9b-contained-dev-semantic-acceptance`, authorization class
`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, 2026-08-16, starting SHA
`62ec80426035e979b563135d858bdc1438d84fb4`, substantive implementation
`cdfdf314839fd782a962e4096b68b32641a93db2`, exact implementation CI
31934803846, 29/29 steps green incl. the dedicated "Phase 9B contained DEV
semantic acceptance harness matrix" step) built and validated the complete
contained DEV semantic acceptance harness, then executed the ONE authorized
acceptance pair through the gated launcher. The run stopped fail-closed at
the pre-browser metadata-only readiness gate:

```text
PHASE_9B: BLOCKED
PHASE_9B_DEV_RESULT: NOT_PROVEN
PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED
```

**What was built.** The smallest typed wiring the Phase 9A.1 machinery
needed: `NightwatchContextOptions.semanticOracle?` now passes the admitted
real-source resolver into `createNetworkObserver` (no global default, no
environment-variable-created semantic authority). A pure Phase 9B core
(`src/core/phase9b/`): the source-freshness classifier (A-F verdicts:
USE_REVIEWED_SNAPSHOT / REDERIVE_FRESH_SNAPSHOT / BLOCK with the exact
`PHASE_9B_BLOCKED_*` tokens), the metadata-only pre-dev readiness gate
(13 checks; ANY failure -> NO DEV CONTACT), and normalized safe pass
summaries with a one-pass acceptance gate (decisive = invariantPassCount >
0 or ANOMALY; NOT_APPLICABLE-only, NO_EXPECTATION, zero receipts are never
proven) plus a normalized first/replay comparison (never raw values, never
receiptId equality). A dedicated gated launcher (`bin/phase9b-real.mjs` +
pure arg parser: only `--env=dev` and `--storage-state`; no journey
selector, no URL override; one-shot `NIGHTWATCH_PHASE_9B_REAL=1`) driving
`tests/manual/phase9b-contained-dev-semantic.ts` — the fixed
`ripple-common-exchange-read` journey pair (FIRST + ONE fresh-context
replay) through the existing Phase 2B machinery with the semantic oracle
wired. Unit matrices: source-freshness A-F (12) + 21-item harness matrix
(22) = 34 passed; hardening guards + a CI matrix step that is
LOCAL/SYNTHETIC ONLY (CI never contacts DEV; truthful workflow comment).

**Source freshness (read-only, no sibling mutation).** Remote branch heads
via `gh api`: ripple-api `master` `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`
(advanced from reviewed `27bb007ad0c798800b6bd3b29760c966422966e7`) and
ripple-ui `dev` `818ce2da19a25b31d715221c8cde30aae837fd77` (advanced from
reviewed `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`). F2 branch: disposable
mirrors at the exact remote SHAs under /tmp (gh api tarballs + synthetic
pinned git ref; canonical sibling checkouts untouched, still pinned at the
reviewed SHAs with their recorded pre-existing dirt). Exact-range
inspection: `ExchangeRate.php` + `Routing.yaml` byte-identical;
`GlobalExchangeRate/index.vue` + `exchangeRateGlobal.js` byte-identical;
router.js `/global-exchange-rate-v2` route block identical (only
settings-MFE/commitment routes moved). The expectation was therefore bound
to the FRESH exact snapshot `169df39d` (never the stale reviewed SHA),
with a fresh mechanical derivation: 4 derived / 0 failures; selected
`ripple.common-exchange.read` evidence digest
`ev:sha256:608265368c9a086f43c94e5c`; the resolver restricted to that one
target returned RESOLVED.

**Measured results.** typecheck/hardening PASS; Phase 9 matrix 102;
Phase 9A.1 + 9B matrices 131; journey/observer/auth/proxy/containment 75;
campaign synthetic 27; owner-provenance 91; agent:check/audit PASS;
project:check + catalog integrity dirty-only PASS; full regression 1026
passed / 1 skipped / 2 failed where the only 2 failures were the documented
dirty-tree fail-closed gates (`SELFDEV_AUTHORITATIVE_SOURCE_DIRTY`); at the
isolated full-history checkout (cdfdf31, clean tree) 1017 passed / 4
environment-conditional skips / 0 failed. Exact implementation CI
31934803846: completed, success, exact head SHA, 29/29 steps green.

**Execution outcome.** The gated launcher ran exactly once
(`NIGHTWATCH_PHASE_9B_CI_RUN_ID=31934803846 --env=dev
--storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`). The
pre-dev readiness gate PASSED: nightwatch HEAD clean (cdfdf31), exact-head
implementation CI green, source freshness REDERIVE_FRESH_SNAPSHOT @
169df39d, derived expectation 1, resolver RESOLVED 1, target DEV-reachable - KNOWN_READ, mutation steps 0, proxy healthy, canonical DEV target exact,
traces/screenshots off. The auth structural gate FAILED: the external DEV
storage state's `mo_access_token` cookie is EXPIRED (boolean-only
diagnostics: validateStorageStateFile PASS; token present/non-empty,
api_type dev, app_type alphaus, domain/path applicable — all true;
`expired: true`). The test raised `Phase9bPreflightError` BEFORE any
browser context; zero DEV contact; zero artifacts; the acceptance is NOT
proven.

**Rationale.** The fail-closed design worked exactly as intended: with an
expired session the runner refuses to touch the product before opening a
browser. The authorization contains exactly one acceptance pair; the
launcher exited; automatic retry is forbidden; auth refresh
(`npm run auth:capture`) is a HUMAN-led flow the agent must not perform
interactively. Terminal tokens: `PHASE_9B: BLOCKED`,
`PHASE_9B_DEV_RESULT: NOT_PROVEN`,
`PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED`; `PHASE_9_STATUS` stays
`COMPLETE_LOCAL_SYNTHETIC`; NEXT ACTION STOP.

**Alternatives.** Weakening or bypassing the auth gate (rejected: the gate
is the contract); letting the agent recapture auth interactively (rejected:
auth:capture is human-led); treating "no browser contact" as a successful
acceptance (rejected: zero receipts never proves PASS); re-running the
launcher under the same authorization (rejected: one pair per
authorization, no automatic retry).

**Consequences.** The Phase 9B harness is implemented, validated and
CI-proven; the DEV semantic acceptance remains unproven pending a fresh
human-authenticated DEV session and a fresh owner authorization for one
more pair. Catalog byte-identical `sha256:bd35b934...` (count 1);
`PHASE_8_STATUS: COMPLETE`; B AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY:
NONE`. Zero product contact, zero mutations, zero DB/infra, zero AI, zero
Alphaus writes, zero publication.

## D-57 — Phase 9B-R1 auth-refreshed contained DEV semantic acceptance: VERIFIED (PASS)

**Decision.** The owner granted the fresh, independent retry
(`PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`) after a
human-led DEV auth refresh. The R1 task
(`phase-9b-r1-auth-refreshed-dev-semantic-acceptance`, 2026-08-16, starting
SHA `05def7abf92818c7de48fba658579397b236def7`) ran the ALREADY-VALIDATED
Phase 9B harness (`cdfdf314839fd782a962e4096b68b32641a93db2`, exact
implementation CI 31934803846) with ZERO source changes, invoked the gated
launcher exactly ONCE, and achieved the clean acceptance branch:

```text
PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9B_R1_DEV_RESULT: PASS
PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED
PHASE_9_STATUS: COMPLETE
```

**Gates (all PASS before any DEV contact).** Harness source byte-identical
between cdfdf31 and HEAD; R1 docs checkpoint `f88b6f1` pushed fast-forward
with exact green CI 31938800275 (29/29 steps incl. the Phase 9B harness
matrix step); fresh remote heads re-discovered read-only (ripple-api master
`169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`, ripple-ui dev
`818ce2da19a25b31d715221c8cde30aae837fd77` — unchanged from the prior fresh
snapshots; disposable /tmp mirrors verified at the exact SHAs); the runner
re-derived the selected expectation from the exact current snapshot
(REDERIVE_FRESH_SNAPSHOT, derivationOk true, approvedSha 169df39d) and
required the restricted resolver (ONLY `ripple.common-exchange.read`) to
return RESOLVED immediately before browser launch; the human-refreshed
external auth state passed all structural/boolean gates
(validateStorageStateFile PASS; mo_access_token present + non-empty;
api_type dev; app_type alphaus; cookie pageReadable=true, expired=false —
boolean-only diagnostics, no secret output, no auth:capture in-session);
exact-head CI gate PASS; proxy/containment unchanged (L0-L5; traces/
screenshots/raw-body persistence/customer DOM OFF; mutation registry ON;
canonical DEV target exact).

**Execution (ONE invocation).** `npm run phase9b:real -- --env=dev
--storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json` with
`NIGHTWATCH_PHASE_9B_CI_RUN_ID=31938800275`, LAUNCHER-EXIT=0,
test-results/.last-run.json passed. FIRST: resolvedExpectationCount 1,
receiptCount 1, PASS 1, ANOMALY 0, NOT_APPLICABLE 0, decisiveEvaluationCount
1, invariantPassCount 3, safety all zero. REPLAY (fresh BrowserContext):
identical counts. Semantic replay comparison deterministic (same
expectationId `ripple.common-exchange.read.real-source-shape`, targetId
`ripple.common-exchange.read`, source SHA 169df39d, evidence digest
`ev:sha256:608265368c9a086f43c94e5c`, outcome/invariant counts, empty
finding fingerprints); journey replay deterministic. Zero NO_EXPECTATION /
SOURCE_STALE / SOURCE_UNAVAILABLE / INVALID_INPUT / PROJECTION_LIMIT_
EXCEEDED / INTERNAL_ERROR in both passes. Product contact accounting:
launcherInvocations 1, browserContextsCreated 2, devObservationPasses 2,
completedJourneyPairs 1.

**Audit.** Structural privacy audit PASS: run dirs contain only
console/events/manifest/network/proxy/repositories/summary files (mode
0700); no screenshots, no trace files, no storage-state copies, no media;
recorder manifests show trace disabled (authenticated), live page auth
readability VALID for both passes; zero semantic-oracle events (no
findings, no internal errors); both recorders finalized passed=true.
Siblings pinned and unchanged (pre-existing dirt only); Nightwatch
worktree clean. Safety vector zero across production/NEXT/mutations/
unknown destinations/proxy violations/DB/infra/screenshots/traces/raw
persistence/AI/Alphaus writes/publication/selfDev/promotion/catalog/B
adoption; runtime Git writes only the R1 checkpoint f88b6f1 and the final
docs closure.

**Rationale.** The bridge is now proven end-to-end on canonical contained
DEV: real current source contract -> mechanically admitted expectation ->
exact approved KNOWN_READ journey -> canonical DEV -> ephemeral raw
response -> safe semantic projection -> explicit evaluation receipt (PASS,
decisive, deterministic across FIRST + replay), with zero mutation, zero
privacy violation, zero silent semantic failure. This does NOT mean all
Ripple semantics are correct — it means one real source-derived expectation
was successfully evaluated against canonical contained DEV with the
privacy/safety contract intact. The original Phase 9B authorization stays
spent and its task stays BLOCKED historical (D-56, not reopened).

**Alternatives.** Re-running without fresh source truth (rejected: remote
heads must be re-discovered and the contract re-derived); accepting
NOT_APPLICABLE-only or zero receipts (rejected: decisive PASS required);
retrying on any failure (rejected: one invocation per authorization);
patching the harness after the run (rejected: no post-hoc fixes).

**Consequences.** `PHASE_9B_R1_STATUS: COMPLETE`; `PHASE_9_STATUS:
COMPLETE`; `PHASE_9B_STATUS` remains BLOCKED historical; catalog
byte-identical `sha256:bd35b934...` (count 1); `PHASE_8_STATUS: COMPLETE`;
B AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`. Next project
step: a fresh roadmap/design review for the next bug-hunting bottleneck.
D-56 remains the original Phase 9B record, not rewritten.

## D-58 — Post-Phase-9 next bug-hunting architecture: DEEPER_REAL_SOURCE_SEMANTICS (Phase 10, designed, NOT authorized)

**Decision.** After the terminal Phase 9 (`COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED` / PASS, D-57), the post-Phase-9 design review (`post-phase-9-next-architecture-design-review`, Phase `POST-9-DESIGN`, authorization `POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, starting SHA `aba46a9af1a1021ae58a1253f93fda297391576e`, 2026-08-16) recomputed the bug-yield bottleneck from current source and selected:

```text
PHASE_9_STATUS: COMPLETE (terminal)
CURRENT_PRIMARY_POST_PHASE9_BOTTLENECK:
  INSUFFICIENT_REAL_SEMANTIC_DEPTH
POST_PHASE_9_NEXT_ARCHITECTURE:
  DEEPER_REAL_SOURCE_SEMANTICS
NEXT_PHASE: PHASE_10
NEXT_PHASE_TITLE: Phase 10 — Deeper Real-Source Semantic Contracts
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
NEXT_AFTER: HIGH_CONFIDENCE_SEMANTIC_TRIAGE, REAL_SEMANTIC_COVERAGE_EXPANSION
VIABLE_LATER: BROWSER_API_SEMANTIC_DIFFERENTIAL, CAMPAIGN_SEMANTIC_YIELD_INTELLIGENCE
DEFER: SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION, MULTI_PRODUCT_EXPANSION, SELF_DEVELOPMENT_2ND_ADOPTION
```

**Rationale.** Phase 9 proved the semantic mechanism end-to-end (safe
projection, source-backed admission, receipts, contained DEV acceptance)
but the real contracts it is applied to are shape-only: all 4 admitted
real-source expectations derive exactly root `TYPE_MATCH ARRAY` +
`FIELD_PRESENT` per item key (`src/oracles/expectations/admission.ts:135-145`);
real-DEV-accepted count is 1; L3+ invariant count is 0/4. The yield model
`surfaces × P(defect) × P(detection) × P(actionable)` shows P(detection)
was the zero term and remains the term with the most headroom: rows
(coverage) are capped at ~4-5 operations by the approved read-only
surface, while columns (depth) have provable headroom — the ripple-api
source at the pinned SHA mechanically establishes item-level types
(`(object)` cast at `ExchangeRate.php:92-94`), a finite currency enum
(`CURRENCY_RANGE_VALIDATE` at `ExchangeRate.php:29-37`), and permission
lists (`['aws','azure','gcp']` at `ExchangeRate.php:40`), none of which
the current 3-kind extractor vocabulary can express. Deeper invariants
raise P(detection) per unit of contained execution on the already-accepted
surface and close the dependency map's named `COST_FINANCIAL_SEMANTICS`
gap. The old Phase 9 runner-up (triage confidence) was NOT retained as
primary: triage improves P(actionable) and creates no detections, and zero
real anomalies have ever been observed; it remains NEXT_AFTER, together
with a recorded follow-up finding (real minimization can certify a false
1-MINIMAL via the stub-replay wrapper, `orchestrator.ts:799-802` +
`phase7-real-campaign.ts:360-366` — documented in
`docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md` Appendix F; NOT fixed by
this review).

**Alternatives.** Coverage expansion (A) adds at most ~1-2 rows with the
same shallow columns; differential (C) creates a genuinely new L5 class but
needs browser-side projection + adapter pairing with no natural evidence;
selection (D) and yield intelligence (E) cannot create detections on a
3-operation surface; multi-product (G) is premature with zero real
findings; selfDev (H) has no bug-hunting value (variant B remains a
structural canary). All rejected for primary selection by evidence, not by
ranking.

**Consequences.** Phase 10 is DESIGNED, NOT STARTED, NOT AUTHORIZED.
Implementation requires a fresh owner authorization
(`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`, Phase 10A local/synthetic;
optional later `PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` for one
contained DEV acceptance of the enriched common-exchange expectation).
Phase 9 remains terminal COMPLETE; Phase 6 remains FROZEN_BY_OWNER; AI
remains non-authoritative; catalog byte-identical `sha256:bd35b934...`
(count 1); `PHASE_8_STATUS: COMPLETE`; B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`. Design record:
`docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md`; roadmap/current-state
updated by the same task.

## D-59 — Phase 10A: Deeper Real-Source Semantic Contracts (implemented, local/synthetic COMPLETE)

**Decision.** The owner authorized Phase 10A
(`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`, pasted prompt, 2026-08-16,
starting SHA `c3393ce54ef53d10451da2465d0327a0796bcf4f`). Phase 10A
implemented deeper real-source semantic contracts on the existing approved
read-only targets, LOCAL / SOURCE-ONLY / SYNTHETIC ONLY:

```text
PHASE_10_DEEPER_SEMANTIC: COMPLETE
PHASE_10A_STATUS: COMPLETE
PHASE_9_STATUS: COMPLETE (unchanged)
DEV validation: NOT_RUN
PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
```

**Current-source evidence (re-verified, NOT D-58's historical reading).**
Read-only remote metadata (git ls-remote, 2026-08-16) established
mobingilabs/ripple-api master == `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`;
the canonical sibling checkout stays at the Phase 5 pin `27bb007a`
(untouched); derivation used a disposable /tmp snapshot at 169df39d.
`src/App/Handler/ExchangeRate.php` is byte-identical across the two SHAs.
Mechanical verdicts: common-exchange `exchange_rate` is ALWAYS a JSON
OBJECT — the empty case is `(object)`-cast to `{}` (the D-58 "ARRAY when
empty" claim is REFUTED by the actual cast direction; the cast fires on
EMPTY, not on populated); payer-exchange `exchange_rate` is OBJECT-or-ARRAY
(`[]` when no rates, no cast). Finite output-key sets are NOT mechanically
provable for either target: output keys are runtime-driven
(`support_currency` metadata + data-derived variable variables);
`CURRENCY_RANGE_VALIDATE` is write-path validation only ⇒
`SOURCE_ENUM_FLOW_UNPROVEN` (no finite-key invariant, no class-constant
extractor, no OBJECT_KEYS_SUBSET_OF — nothing is admitted beyond what the
current source flow proves).

**Contract/versioning.** Recipe schema
`nightwatch.real-source-expectation-recipe.v2` for common-exchange +
payer-exchange (itemFieldTypeContracts + the fixed bounded
`PHP_ITEM_FIELD_TYPE_FLOW` extractor: `EMPTY_CAST_OBJECT` ⇒ ['OBJECT'];
`EMPTY_ARRAY_OR_STRING_KEYS` ⇒ ['ARRAY','OBJECT']; anything else
`TYPE_FLOW_AMBIGUOUS`); v1 stays byte-meaning-stable for
account-inventory + billing-group-exchange; the retired v1 recipes are
archived data-only under `corpus/phase10/historical/`. New invariant kind
`TYPE_IN_SET` (fixed, bounded: 1..6 known ProjectionNodeType values, no
duplicates, canonical sort; missing path / empty-uninspected parent ⇒
NOT_APPLICABLE; observed ∈ set ⇒ PASS; outside ⇒ VIOLATED). Semantic
expectation DTO stays `nightwatch.semantic-expectation.v1` (envelope
unchanged; vocabulary additive). New deep expectation IDs
`ripple.common-exchange.read.real-source-deep` /
`ripple.payer-exchange.read.real-source-deep`; the historical
`...real-source-shape` IDs stay historical-only (Phase 9B-R1 evidence
remains truthful at its old checkpoint). Derivation version v2
(`nightwatch.real-source-expectation-derivation.v2`); the normalized
type-flow extraction participates in the ev:sha256 evidence digest; the
digest canonical form fails closed on unknown extraction kinds and both
extraction loops (admission + resolver) fail closed on unknown extractor
kinds.

**Proof.** Corpus `corpus/phase10/**`: 4 seeded deep defects (common
STRING; common uncast empty ARRAY; payer NUMBER; payer STRING) — the
historical shape-only baseline detects 0/4, the enriched expectations
detect 4/4; 10 benign cases, 0 false positives (incl. the payer valid
empty-ARRAY union representation — PASS, never a type violation);
sentinel sweep + unknown-key probe: 0 leaks; derivation determinism 3
repeats / 0 mismatches; source-currentness matrix A–E + §44 mutation
canaries all fail closed; synthetic campaign: enriched expectations →
safe TYPE_CONTRADICTED findings → existing orchestrator → triage →
dossiers with semanticEvidence, paired baseline zero semantic evidence.
Owner-local canary at the CURRENT snapshot 169df39d: 4 recipes derived /
0 failures / depth distribution [2,2,3,3] (L3+ = 2/4). Full regression:
1137 passed / 1 skipped (pre-existing environment-conditional) / 0 failed;
exact implementation CI 31946005458 green 32/32 at `6cef0c45`; fresh
clean-checkout acceptance green.

**Consequences.** Phase 10 is implemented LOCAL/SYNTHETIC;
`PHASE_10_DEEPER_SEMANTIC: COMPLETE`; deeper contracts are NOT
DEV-validated. Any Phase 10B contained DEV acceptance (ONE existing
common-exchange journey pair with the enriched expectation, via the
validated Phase 9B harness pattern; `tests/manual/phase9b-contained-dev-semantic.ts`
must be repointed to the deep expectation ID) requires a separate owner
authorization (`PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`);
`PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`. Phase 9
remains terminal COMPLETE; Phase 6 remains FROZEN_BY_OWNER; AI remains
non-authoritative; catalog byte-identical `sha256:bd35b934...` (count 1);
`PHASE_8_STATUS: COMPLETE`; B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`. Implementation/acceptance record:
`docs/design/PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md`; task records under
`.agent/tasks/phase-10-deeper-real-source-semantic-contracts/`.

## D-60 — Phase 10B contained DEV deep-semantic acceptance complete (2026-08-17)

**Status: ACCEPTED (executed).** Authorization:
`PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` (owner-pasted prompt;
starting SHA `87917377`; CASE D). One contained DEV deep-semantic
acceptance of the CURRENT real-source v2 deep expectation
`ripple.common-exchange.read.real-source-deep` through the fixed
`ripple-common-exchange-read` journey (`ripple.common-exchange.read`,
KNOWN_READ): FIRST + ONE fresh-context REPLAY, exactly ONE launcher
invocation (`npm run phase10b:real -- --env=dev --storage-state=...`,
exit 0), after local/synthetic validation + exact pre-DEV CI
(31957667198 success at the substantive checkpoint `658ca11`).

**Contract.** Fresh remote source discovery (twice: preflight + §17
immediately before the launcher): mobingilabs/ripple-api master
`169df39d…` and mobingilabs/ripple-ui dev `818ce2da…` — both unchanged
from Phase 10A (zero drift); disposable read-only snapshot; fresh v2
derivation PASS at the exact snapshot; evidence digest
`ev:sha256:1447fe1342d804528a062b73`; resolver RESOLVED; deep invariant
`TYPE_MATCH [0, exchange_rate] OBJECT` present; expectedInvariantTotal 4.

**Result.** FIRST and REPLAY both: 1 resolved expectation / 1 receipt /
PASS / invariantTotal 4 / invariantPassCount 4 / invariantNaCount 0 /
invariantViolationCount 0 / findingCount 0; deep invariant decisively
observed (zero N/A); semantic + journey replay deterministic; safety
vector all zero (production 0, NEXT 0, mutations 0, unknown destinations
0, proxy hard violations 0, DB 0, infra 0, screenshots 0, authenticated
traces 0, raw persistence 0, AI 0, Alphaus writes 0); privacy structural
audit PASS; sibling task-caused changes 0.

**Consequences.** `PHASE_10B_STATUS: COMPLETE`;
`PHASE_10B: COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED`;
`PHASE_10B_DEV_RESULT: PASS`; `DEEP_INVARIANT_DEV_VALIDATION: VERIFIED`;
`PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED`; `PHASE_10_STATUS: COMPLETE`;
NEXT ACTION STOP (next architecture requires a separate post-Phase-10
design review). Phase 9/9A.1/9B/8 statuses unchanged; catalog
byte-identical `sha256:bd35b934…` (count 1); B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`; Phase 6 remains FROZEN_BY_OWNER; AI
remains non-authoritative. The historical Phase 9B harness
(`...real-source-shape`) was preserved byte-identical (D-57 evidence
untouched); the deep identity is distinct; no receipt-schema change.
Acceptance record: `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`; task records
under `.agent/tasks/phase-10b-contained-dev-deep-semantic-acceptance/`.

## D-61 — Post-Phase-10 next bug-hunting architecture: BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION (Phase 11, designed, NOT authorized)

**Status: ACCEPTED (design only).** Authorization:
`POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY` (owner-pasted prompt;
starting SHA `1d7dd6cb6525195e59602e106f50306859a7998d`; CASE D). The
post-Phase-10 design review recomputed the useful-bug-yield bottleneck
from CURRENT source after the terminal Phase 10 (10A local/synthetic
COMPLETE, D-59; 10B contained DEV deep-semantic acceptance
VERIFIED/PASS/NONE_OBSERVED, D-60).

**Phase 10 terminal proof.** 4 admitted real-source recipes (2 v2 + 2 v1),
depth distribution [2,2,3,3] (L1 0, L2 2, L3+ 2); baseline shape-only
detects 0/4 seeded deep defects, enriched v2 detects 4/4; 10B common-exchange
deep acceptance PASS (4/4/0/0/0, deterministic); real semantic anomalies
observed: 0 (NONE_OBSERVED). Phase 10 increased SEMANTIC DEPTH on existing
real targets but left collection BREADTH at item-0-only for every admitted
contract (residual limitation documented: Phase 10A record section 12).

**Item-0 coverage audit (source-verified, synthetically proven).** End-to-end
trace: recipe blueprint `itemIndex: 0` (registry.ts, all 4 recipes) ->
admission builds single-index paths `[String(itemIndex), field]` ->
invariant path `resolvePathWithAmbiguity` resolves exactly ONE numeric
segment -> evaluator single-node verdict. The projector retains up to 128
items with full safe metadata (`maxArrayItemsInspected: 128`,
`DEFAULT_PROJECTION_LIMITS`); the limitation is architectural at the
invariant evaluation layer (single-node evaluation + single-index path
semantics), NOT projection. A synthetic proof (throwaway test, deleted
after run) confirmed: row-1 invalid => PASS (FIELD_PRESENT/TYPE_MATCH/
TYPE_IN_SET all item-0-only); row-57 invalid => PASS (within 128 bound);
row-200 invalid => PASS (beyond bound, uninspected tail); row-57 missing
field => PASS; payer row-1 TYPE_IN_SET violation => PASS; row-0 invalid =>
ANOMALY (positive control). Classification:
`CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP`. Real exchange-rate responses are
multi-row arrays; a defect in a later month's row would be missed.

**Real minimization gap.** `invalidReducedReplay()` (phase7-real-campaign.ts:
360-366) returns INVALID for every reduced sequence; orchestrator wrapper
(orchestrator.ts:799-802) forces FRESH_EXACT_REPLAY -> REPRODUCES while
every REDUCED_CANDIDATE -> INVALID; minimizeFailure terminates with
`1-MINIMAL` guarantee having replayed ZERO genuine reduced candidates.
Classification: `CURRENT` (matches D-58 finding #1, unfixed).
`CONFIRMED_REAL_MINIMIZATION_REPLAY_GAP`.

**Differential.** 0 viable paired observations today (journey opFamily !=
API opFamily; journey candidates api:null; no browser-side semantic
projection).

**Yield model.** `surfaces x P(defect) x P(detection) x P(actionable)`.
P(detection) is the most suppressive multiplier — Phase 10 raised depth but
collection breadth stayed at item-0-only for all 4 contracts. P(actionable)
is latent (zero real anomalies). Triage (D-58 NEXT_AFTER) NOT auto-selected:
creates zero detections, latent until a natural anomaly.

**Selected.**

```text
CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK: COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP
POST_PHASE_10_NEXT_ARCHITECTURE: BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION
NEXT_PHASE: PHASE_11 — Bounded Collection-Wide Semantic Evaluation
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
```

10 scored options (20 criteria, 1-5, 5 favorable): A (collection-wide) 90;
B (triage) 74; D (coverage expansion) 71; F (source-selection) 70; E
(relational) 68; G (campaign yield) 66; H (payer canary) 65; C
(differential) 61; J (selfDev) 52; I (multi-product) 46. Load-bearing: A
scores 5 on criteria 2 (every inspected row), 3 (P(detection) directly),
5 (yield), 20 (closes Phase 10's documented residual limitation). B scores
5 on 4 (P(actionable)) but latent; C scores 4 on 1 (new L5 class) but
0 viable pairs; D capped rows.

NEXT_AFTER: HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE (B), followed by
REAL_SEMANTIC_SURFACE_EXPANSION (D). VIABLE_LATER: BROWSER_API_SEMANTIC_
DIFFERENTIAL (C), SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE (G). DEFER:
SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION (F), DEEPER_RELATIONAL_SEMANTICS
(E), MULTI_PRODUCT_EXPANSION (I), SELF_DEVELOPMENT_2ND_ADOPTION (J),
SECOND_DEEP_DEV_CANARY (H, fold into optional Phase 11B).

**Consequences.** Phase 11 designed, NOT started, NOT authorized.
Implementation requires a fresh owner authorization
(`PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY` for the
local/synthetic Phase 11A; optional later
`PHASE_11B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` for one contained DEV
acceptance of the collection-wide coverage). Phase 10/9/8 statuses
unchanged; catalog byte-identical `sha256:bd35b934...` (count 1);
B AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`; Phase 6
FROZEN_BY_OWNER; AI non-authoritative. Design record:
`docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md`; task records under
`.agent/tasks/post-phase-10-next-architecture-design-review/`.

## D-62 — Phase 12A: combine the two NEXT_AFTER investments into one LOCAL/SOURCE-ONLY productivity pack

**Selected** (2026-08-19, Phase 12A, authorization
`PHASE_12_SEMANTIC_TRIAGE_AND_COVERAGE_LOCAL_ONLY`, starting SHA
`cc0ea71a64d06b84b73d396f1c01311513aefe2c`, implementation SHA
`4730c4e3c0f2d5c27864b5966bdf9c8c86bba6c4`).

**Context.** The post-Phase-10 architecture (D-61) and the roadmap named two
NEXT_AFTER investments that are both LOCAL/SOURCE-ONLY feasible after
Phase 11: HIGH_CONFIDENCE_SEMANTIC_TRIAGE and REAL_SEMANTIC_COVERAGE_
EXPANSION. Both share the same sanitized semantic-evidence pipeline and
neither requires DEV/NEXT/production. The real Phase 7 campaign adapter
still supplies `invalidReducedReplay()` to journey/exploration/API
candidates (D-58 finding #1), so real reduced replay currently cannot
succeed even though the deterministic minimizer exists.

**Decision.** Combine the two NEXT_AFTER investments into one cohesive
Phase 12A productivity task (Workstreams A–F). Do not wait for GitHub
Actions billing restoration to perform authorized local/source work. Keep
Phase 11B separate and NOT_AUTHORIZED. Do not expand any endpoint/target/transport
or AI/model authority.

**Architecture chosen.**

- **A. Replay/minimization** — strict data-only replay-plan DTO
  `nightwatch.triage-replay-plan.private.v1` (order-preserving subsequence,
  unknown-field rejection, deterministic `rp:sha256` identity). Synthetic
  journey/exploration/API replay adapters wrap the existing bounded
  `minimizer.ts` via validated plans. The real runner's always-invalid
  `invalidReducedReplay()` baseline is permanently reproduced before any
  improvement. No new endpoint/transport authority.
- **B. Confidence/dossier** — versioned semantic triage-evidence DTO
  (`nightwatch.semantic-triage-evidence.private.v1`, safe fields only,
  missing-evidence vocabulary) and categorical confidence: HIGH is blocked
  by PARTIAL_COVERAGE / stale / unavailable / non-reproduced / nonzero
  safety / nonzero privacy / known false positive. Dossier v2
  (`bug-dossier.private.v2`) adds a READY predicate derived from evidence
  (never writer-optimistic); v1 remains readable.
- **C. Clustering** — semantic cluster identity is bound to the evidence
  digest + derivation version, NOT the source SHA; row ordinal and
  violating-count are excluded so unrelated SHA movement with identical
  normalized evidence does not fragment the class, and changed
  evidence/derivation semantics do not silently merge. Protocol-only
  clustering is untouched.
- **D. Coverage inventory** — fresh ripple-api master re-resolved via
  `git ls-remote` to `e026c85522d201724033f024456da3efa17fe07a`, used as a
  disposable snapshot outside the canonical siblings. 6 approved read-only
  targets inventoried; 4 historical+collection expectations rederived; 0
  mechanically provable depth uplifts, each with a precise independent
  blocker: TYPE_FLOW_AMBIGUOUS (account-inventory /
  billing-group-exchange), AMBIGUOUS_CONDITIONAL_BLOB, and
  GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT. A zero-addition result is
  accepted as correct.
- **E. Backtest** — one fixed permanent `corpus/phase12` (27 fixtures) and a
  pure deterministic harness. On the replay-gap corpus,
  `phase12Minimized > baselineMinimized` (baseline minimization is 0 under
  `invalidReducedReplay`); false-positive / partial-coverage / stale-source /
  different-fingerprint / privacy-leak / determinism-mismatch floors are all
  zero; 3× determinism repeat yields 0 mismatches (full raw counts in the
  task REPORT).
- **F. Hardening/regression** — pure-core import-boundary + authority-set
  guards (`bin/hardening-check.mjs`), a Phase 12 local/synthetic CI matrix
  row, `tsconfig.json` corpus include, triage/semantic re-exports, and the
  full canonical + topology-correct isolated Playwright regression.

**Result.** Phase 12A implementation is complete and locally validated on a
clean 4730c4e tree: typecheck PASS; hardening PASS; canonical complete
Playwright 1365 passed / 4 skipped / 0 failed; topology-correct isolated
clone (fresh `git clone --local` + `npm ci --ignore-scripts`) 1365 / 4 / 0;
Phase 12 focused matrices 127 passed; Phase 9/10/11 compatibility 487
passed; campaign:synthetic 27 passed; agent:check PASS. GitHub Actions
remains externally billing/spending-limit blocked before job execution
(run 32269149776 — "The job was not started because recent account payments
have failed or your spending limit needs to be increased."), so the task
terminates as local-validated / BLOCKED_EXTERNAL_CI, NOT CI-verified
COMPLETE. No CI-success claim is made.

**Consequences.** The two ROADMAP NEXT_AFTER investments are now
implemented-local (marked in ROADMAP/CURRENT_STATE as
VERIFIED_LOCAL_NOT_CI_VERIFIED). No authority expansion occurred: catalog
count 1 (digest `sha256:bd35b934...`), B AVAILABLE_NOT_ADOPTED, promotion
authority NONE, Phase 6 FROZEN_BY_OWNER, AI non-authoritative. Phase 11B
remains NOT_AUTHORIZED. Any real Phase 12 replay/triage runtime validation
requires future separate owner authorization. Design record:
`docs/design/PHASE_12_SEMANTIC_YIELD_AND_TRIAGE.md`; task records under
`.agent/tasks/phase-12-semantic-yield-high-confidence-triage/`.

## D-63 — Phase 13I: Residual Runtime Completion & Integrated Shadow Proof (implemented, local/source-only)

**Selected** (2026-08-20, Phase 13I, authorization
`PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`, starting SHA
`8c1cf09f5d33d10a2e7540b6bb9589814a95735c`, implementation SHA
`186122f96741c57f5d5fdf4cca3ec1e9328a9f30`).

**Context.** Phase 13H correctly terminalized BLOCKED with four residual local gaps: (1) orchestrator still routed every candidate through protocol `clusterAnomalies`/`triageAnomaly`, (2) the real Phase-7 adapter still certified FAILURE from structural validation without an executor, (3) no permanent integrated Phase-13 corpus/shadow proof existed, and (4) version-drift/resume matrices were not exhaustively proven. The campaign replay stack still supplied `invalidReducedReplay()` for reduced candidates while the deterministic minimizer existed.

**Decision.** Close all residual local/source gaps as one integrated surface, then prove the resulting architecture with a permanent synthetic shadow campaign and the full local regression stack. No DEV.

**Architecture chosen.**

- **A. Semantic campaign routing** — strict versioned DTO
  `nightwatch.campaign-semantic-evidence.v1`
  (`src/core/campaign/campaignSemanticEvidence.ts`) carrying only safe
  categorical/control identity (bundle scb:sha256, bundleVersion,
  target/expectation/sourceRepo SAFE_ID, sourceSha 40-hex, evidenceDigest
  ev:sha256, derivation/admission generic version, resolver/currentness/receipt
  categorical states, fingerprint fp:sha256, invariant inv:sha256).
  Sentinel/certification (REPRODUCED/HIGH/READY/SAFE) rejected, unknown fields
  rejected, raw values absent. `CampaignAnomalyCandidate.campaignSemanticEvidence`
  routes semantic candidates through
  `semanticContractIdentity`/`semanticClusterKey`/`clusterSemanticObservations`
  (binding expectation+target+invariant+repo+evidenceDigest+derivation,
  ignoring ordinal/count/timestamp/SHA movement when digest+derivation
  unchanged, splitting on digest/derivation/target/expectation/invariant).
  Protocol-only candidates retain historical `clusterAnomalies()` with a distinct
  `sc:sha256` vs `cluster:sha256` namespace (D13 no-collision).
  Persisted candidate and checkpoint ledger validators allowlist and strictly
  validate the new field.
- **C. Replay-plan-V2 real-adapter binding** — all structural-only FAILURE
  certification removed from `tests/manual/phase7-real-campaign.ts`. Every
  supported replay path builds/validates `TriageReplayPlanV2`
  (`createTriageReplayPlanV2` + `validateReplayPlanV2`), maps the minimizer
  retained sequence to unambiguous occurrence ordinals (duplicate IDs: retain
  first vs second are distinct planIds; ambiguous duplicate → INVALID
  fail-closed via occurrence-embedding count), calls
  `executeReplayPlanV2(plan, injectedExecutor)` — only the injected executor
  result may return FAILURE (different fingerprint → PASS normalization, throw →
  INVALID). API exactly one fixed operation; journey reduced remains
  `PRECONDITION_DIVERGENCE` (no subset executor invented); no product
  execution in this task.
- **D. Ledger/drift** — `CampaignDossierRecord.dossierVersion` optional
  (v1/v2 both accepted, READY ↔ bugCandidates enforcement, v2 readback routes
  through `parseBugDossierV2`; historical v1 compat preserved). The 8
  manifest version fields (triageReplayPlanVersion/V2/semanticTriageEvidence/
  dossierV2/semanticCluster/semanticBundle/semanticReceipt/
  semanticExpectationDerivation) are already bound and fail closed before
  executor callbacks; frozen bundle cannot auto-rebind on source movement.
- **E. Permanent shadow** — `corpus/phase13` (42 synthetic fixtures:
  11 replay, 16 semantic truth, 3 protocol, 12 drift) +
  `src/core/phase13/shadow.ts` (`nightwatch.phase13.shadow.v1`, pure,
  synthetic executors only, deterministic canonical `stableJson`, 3× 0
  mismatches) + `tests/unit/phase13Shadow.test.ts` (26 tests). All floors 0:
  false reproduction / structural-only certification / false READY / false
  HIGH / PARTIAL false READY / stale-unavailable false READY / unsafe-private
  false READY / cluster fragmentation / cross-contract merge / drift miss /
  privacy leaks / authority expansion.
- **F. Hardening/regression** — existing pure-core boundaries remain PASS;
  no new endpoint/target/network/DB/Phase-6/AI authority added.

**Result.** Phase 13I implementation is locally validated:
typecheck PASS; hardening:check PASS; canonical complete Playwright
1391 passed / 4 skipped / 0 failed (workers=1); topology-correct isolated
clone (topology = sibling REPOSITORIES layout, `npm ci`, full Playwright)
1391/4/0; Phase 13I focused 26 passed; campaign:synthetic 27; owner-provenance
91; Phase 12 compat 76; Phase 9/10/11 compat verified via above; fresh-source
canary 40 (registry mirrors Phase-5 KNOWN_READ, ≥1 live sibling derive,
fixture-backed parity, G01 remote `e026c855…` fresh, G02 disposable snapshot
matches, G03 canonical sibling byte-identical 0 writes); catalog 1
(`sha256:bd35b934...`); agent:check PASS (no strict errors), project:check
dirty pre-push only (clean post-push pending docs closure).
GitHub Actions remains externally billing/spending-limit blocked before job
execution on the validated implementation head `186122f` (run 32325943234 —
"The job was not started because recent account payments have failed or your
spending limit needs to be increased."), so the task is
`BLOCKED_EXTERNAL_CI` locally verified, NOT CI-verified COMPLETE. No
CI-success claim is made. The isolated `--local` clone without siblings
fails 7/8 changeIntelligenceBacktest with the identical fatal as before
(topology without siblings cannot verify those commits) — this is
topology-expected, not a code regression; canonical 8/8 PASS validates it;
full topology-correct clone with sibling symlinks fully proves 1391/4/0.

**Consequences.** Phase 13 residual runtime gaps are closed local/source-only.
Promotion is now dual-path (explicit routing, contract-identity clustering for
semantic vs historical protocol). The real-adapter boundary is occurrence-bound
with injected executors. The integrated `corpus/phase13` synthetic shadow
campaign proves all composed semantics deterministically with synthetic
executors. No authority expansion: catalog count 1, B AVAILABLE_NOT_ADOPTED,
promotion NONE, Phase 6 FROZEN_BY_OWNER, AI non-authoritative.
Phase 11B/13B remain NOT_AUTHORIZED. Any real runtime validation of the
promotion/replay stack requires a fresh contained-DEV authorization.
Design record: `docs/design/PHASE_13I_RESIDUAL_RUNTIME_COMPLETION.md`;
task records under
`.agent/tasks/phase-13i-residual-runtime-completion-shadow-proof/`.

## D-64 — Phase 15P: Parallel 16-Agent Implementation Campaign (implemented, local/source-only)

**Selected** (2026-08-21, authorization
`PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY`, starting SHA
`e07630238d314f48718b1ca9fce2dc9ee31317eb`, final implementation SHA
`42c5a7e1ab3f438a9c82688f2eee645d3c548d64`).

**Decision.** Replace the four-session Phase-15 execution shape with one
parallel campaign: a single parent integrator owning canonical main plus up
to sixteen specialized sub-agents working in isolated local Git worktrees
(`/tmp/nightwatch-swarm-*`, branches `swarm/aNN-*`, never pushed). Each
sub-agent owned a disjoint dependency cone, delivered the structured handoff
contract, and the parent reviewed every diff before cherry-picking in
dependency waves (foundation → campaign runtime → triage/operational →
convergence → rehearsal), validating after each wave and pushing durable
checkpoints fast-forward.

**Material architecture outcomes.** (1) One composed contract lifecycle model
with mechanically enforced historical-ID stability; (2) converged semantic
result/reason vocabulary with total adapters and strict unknown-value
rejection; (3) source-contract movement classification with fail-closed
currentness ceilings; (4) cross-field schema coherence + historical reader
ownership table; (5) load-bearing candidate-lifecycle gates (GATE_BLOCK) with
terminal-closure sweeps; (6) branded validated-plan replay executor seam;
(7) truthful minimality evidence (unexercised deletions can no longer back
MINIMALITY_PROVEN); (8) deterministic clustering tiebreakers, declared-gap
confidence ceilings, strengthened dossier-v2 READY; (9) resume-drift
classifiers with set-idempotent unresolved ledger; (10) shared readiness API

- `status:local`; (11) artifact-validation facade over ten durable kinds;
(12) project snapshot manifest with five-way classified diff; (13)
privacy/authority bounding of durable error surfaces; (14) 78-class
adversarial corpus with determinism ×3; (15) version-convergence guard suite;
(16) 10-variant release-candidate rehearsal that exposed and fixed one real
seam defect (checkpoint vs candidateLifecycle reason-code validator
divergence).

**Rejected alternatives.** Executing the four sessions sequentially
(rejected: owner directive supersedes execution shape only); allowing
sub-agents to commit to canonical main directly (rejected: integration
authority must stay singular); resolving the single wave-2 conflict by
newer-wins (rejected: resolved semantically keeping both A05 gate-closure and
A09 ledger-idempotence behaviors).

**Consequences.** Terminal state IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING;
the integrated hardening campaign is REQUIRED_NEXT under its own owner token
(`PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY`) with HARDENING_HANDOFF.md as its
bootstrap input. No DEV/real-campaign/production/data-plane/infra/AI/selfDev/
promotion authority was exercised; Phase 11B and Phase 13B remain
NOT_AUTHORIZED. CI remained externally billing-blocked throughout (zero-step
failures); local/source evidence is the only acceptance until Actions executes.

## D-65 — Phase 15H: Whole-System Integrated Hardening Terminal Classification (BLOCKED_EXTERNAL_CI; mass implementation VERIFIED_LOCAL_NOT_CI_VERIFIED)

**Context.** The Phase-15P 105-file mass-bulk round (D-64 continuation,
base `abc9bf9…` -> `c2640cb08…`) was intentionally unvalidated by owner
direction. Phase 15H ran under
`PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY` (2026-08-22) as a
repair-and-proof campaign: compile first, every failure became hardening
evidence (narrow reproducer -> root cause -> source fix -> permanent
regression -> narrow recheck -> broader gate), never weakening assertions.

**Decision.**

1. The earned validated hardening anchor is `06ea7ca62b1d5c8770d42622d4655e942ec68336`
   — every local gate was executed against exactly that tree while HEAD ==
   origin/main and the worktree was clean. It supersedes the carried-forward
   bootstrap anchor `7695b87c61890cabfe110e3d147a076c1b1ecea1`.
2. Hardening repaired real source defects, not just tests: DEF-01..DEF-13,
   including DEF-06 (a genuine orchestrator bug: checkpoint state spread
   carried stale interrupted-work/retry entries into later checkpoints;
   fixed writer-side with the fail-closed integrity validator kept strictly
   intact) and DEF-12 (SELFDEV_AUTHORITATIVE_PATHS not transitively closed
   after A13 shared-module imports; every selfDev fixture mirror born
   broken). Stale pins moved only onto mechanically proven current truth.
3. Local acceptance is fully earned: canonical complete Playwright workers=1
   2063 passed / 0 failed / 4 skipped exactly matched the topology-correct
   isolated run (2063/0/4) after an evidenced 8-failure missing-sibling-
   topology attempt was reproduced and repaired with read-only symlinks;
   adversarial quality floors all zero across >=3 deterministic repeats.
   Git-level ground truth: the mass round deleted ZERO files; its de-export
   surface (147 removed exports / 55 files) has zero surviving external
   references.
4. Terminal classification is `PHASE_15H_STATUS: BLOCKED_EXTERNAL_CI` with
   `PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_NOT_CI_VERIFIED`: Actions
   run 32554139535 for the exact validated SHA completed in ~1 second with
   ZERO steps executed under the account billing/spending-limit condition
   (inspected once via authenticated API; log blob absent; no retry-loop).
   CI green is NOT claimed anywhere.

**Rejected alternatives.** Labeling `06ea7ca` validated before the full
gates ran (rejected: anchors are earned by evidence, not by commit
existence); retrying or re-triggering the blocked workflow (rejected:
known external condition, single inspection policy); explaining away the
isolated-run count delta as benign topology variance (rejected: reproduced
the topology and proved exact equality instead); restoring dead code from
A15 (rejected: only DEF-01's one live caller justified restoration).

**Consequences.** Nightwatch's whole-system state is locally verified end to
end; upgrading to CI-verified requires only that the owner resolve the
billing condition and a separately scoped verification task inspect a real
Actions execution for this lineage. No DEV/real-campaign/production/
data-plane/infra/AI/selfDev-promotion authority was exercised; catalog
count/digest unchanged; promotion authority NONE; Phase 6 remains
FROZEN_BY_OWNER; Phase 11B and Phase 13B remain NOT_AUTHORIZED.
NEXT ACTION: STOP.

## D-67 — Phase 16C: Portfolio Runtime Binding & Real Approved Universe (single-executor seam; implemented local/source/synthetic)

**Context.** Phase 16B proved `BLOCKED_RUNTIME_BINDING_MISSING`: the hardened
Phase-16A portfolio plan and inert DEV handoff had no consumer in the existing
Phase-7 real-campaign runtime, no authorization gate, no launcher input, no
real-universe builder, and no unit-to-budget mapping. Phase 16C executed under
`PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY` (LOCAL/SOURCE/SYNTHETIC only;
zero DEV contact).

**Decision.**

1. ONE canonical runtime-profile module (`src/core/campaign/runtimeProfile.ts`)
   now owns the previously duplicated linkage knowledge
   (journey<->envelope<->operation<->seed); selection.ts and the real adapter
   derive from it, eliminating the shadow registries.
2. The real approved universe is DERIVED from canonical registries with a pure
   builder; synthetic fixture identities cannot enter it; exploration members
   are represented explicitly as runtime-restricted while the bounded profile
   keeps maxExplorationContexts=0.
3. Portfolio binding is a schema-OPTIONAL manifest field included in
   campaignId + manifestFingerprint via conditional spread: load-bearing drift
   invalidates resume before executor use, while every historical manifest
   recomputes byte-identically. CampaignVersionFingerprint shape is untouched.
4. Budget mapping v1 is monotone-restrictive (elementwise min against the
   approved bounded profile); units are scheduling data, never authority; a
   three-API plan is honestly infeasible under reserve arithmetic and fails
   closed rather than silently dropping the reproduction reserve.
5. Authorization is consumed at admission and again before resume/executor
   construction; it permits consumption only and never rewrites plan identity,
   members, budgets, order, or safety policy. The handoff remains
   executable:false everywhere.
6. One opt-in launcher input pair feeds prepare AND re-verifies resume; legacy
   invocation surfaces are unchanged; no second executor exists.

**Consequences.** A separately authorized Phase 16D contained DEV acceptance
may consume this seam ONLY after the dedicated Phase-16CH exhaustive hardening.
All ten Phase-16C quality floors measured zero; focused/moderate packs green;
canonical/isolated whole-repo regressions remain owned by Phase-16CH. Phase 6
FROZEN_BY_OWNER; Phases 11B/13B NOT_AUTHORIZED; promotion authority NONE.
DEV WAS NOT EXECUTED.

## D-68 — Phase 16CH: Portfolio Runtime-Binding Hardening Terminal Classification

**Context.** Phase 16C supplied the first local/source/synthetic path from an
inert portfolio handoff into the existing prepare/resume runtime. Phase 16CH
was explicitly authorized to harden that seam before any contained DEV retry.

**Decision.** Keep the Phase-16C authority and serialization boundaries fixed,
repair only reproduced defects, and close the hardening task as local-green
with an external-CI-blocked terminal classification. DEF-01 was a real
reserve double-counting bug in the feasibility guard; the narrow repair strips
the embedded reserve, clamps to the approved profile, and applies the reserve
once. DEF-02 was a real privacy defect in external unknown-field diagnostics;
the narrow repair masks unsafe field names while preserving bounded safe-token
diagnostics and never echoing values.

**Evidence.** The Phase-16CH corpus contains 171 deterministic scenarios with
three byte-identical runs and all thirteen quality floors zero. Affected
compatibility passed 172/0, campaign synthetic 27/0, and owner provenance
91/0. Canonical and topology-correct isolated full Playwright both passed
2,232 / skipped 4 / failed 0 with exact skip parity. The validated checkpoint
is `794b32df443ae8c9a520182ef97b7a2c9985ba82`; catalog identity and promotion
authority were unchanged.

**CI and consequences.** Actions run `32624917568` / job `97158631282` for
the validated checkpoint completed as failure with zero steps under the
standing billing/spending condition. CI green is not claimed and the run was
not retried. The truthful tokens are
`PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` and
`PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED`. Phase 16D,
Phase 11B, Phase 13B and Phase 6 expansion remain unauthorized/frozen as
specified by the permanent owner scope. Future engineering requires a new
local/source/synthetic task.

## D-69 — Phase 17: source-aware portfolio ranking and occurrence-honest evidence

**Context.** A fresh post-Phase-16CH audit found that the deterministic Phase
3 change selector and Phase 16 portfolio allocator had no pure connection;
change and source-correlation identities used ordinary JSON serialization;
baseline reads trusted a type assertion; duplicate diagnostics could echo a
hostile value; and the public minimization result could not distinguish
repeated action occurrences even though the reducer's internal ledger could.

**Decision.** Add a pure `src/core/portfolio/changeImpact.ts` overlay that
consumes only an existing `SelectionResult` and an approved portfolio, then
feeds effective scores and bounded reason tokens into the canonical allocator.
Explicit journey linkage is mandatory. Direct/shared/transitive evidence may
receive bounded lifts; fallback, stale, unknown, irrelevant, and unlinked
members receive no positive source lift. A global fallback degrades
direct-looking partial evidence to the fallback disposition. Paths, source
explanations, URLs, raw values, and deployment claims never cross the bridge.
Canonical stable JSON is used for change/correlation identity after optional
undefined normalization. Baseline documents are strict, bounded,
own-property-only, canonical-order and status/reference-consistent. Shared
diagnostics use a bounded privacy projection. Historical minimization result
serialization stays unchanged, while ambiguous repeated-action minimality
evidence fails closed rather than guessing an occurrence.

**Evidence and consequences.** The implementation is local/source/synthetic
only at checkpoint `17486ff13de9b8588a9ab5273c8eff882bda9036`. The reusable
Phase 17 corpus covers nine direct/shared/transitive/irrelevant/ambiguous/
deleted/renamed/stale/simultaneous cases; the focused matrix is 26/0 and the
affected compatibility cone is 142/0. Typecheck, hardening, synthetic
campaign, owner provenance, continuity, and project checks are locally green
at the checkpoint. No DEV/NEXT/production contact, data/infra operation,
sibling write, publication, credential handling, or real finding persistence
occurred. Full canonical and isolated regressions remain required before
terminal closure. Phase 16D remains separately unauthorized; Phase 6 remains
`FROZEN_BY_OWNER`; Phase 11B/13B remain unauthorized.

## D-70 — Phase 17 integrated closure and privacy false-positive repair

**Context.** The first full Phase 17 canonical regression found seven shared
Phase 15P readiness failures after the new identity-shaped diagnostic detector
classified the legitimate product target `ripple-account-inventory.read` as
an account identifier. This was a compatibility defect in the new privacy
boundary, not an environment mismatch.

**Decision.** Preserve fail-closed identity redaction for account/customer-like
identifier values, but require an identifier-shaped value after the identity
label. Product route vocabulary remains valid. Add a permanent positive control
for the legitimate target and retain the hostile numeric/uppercase identity
controls; do not weaken the existing sentinel, secret, URL, or email guards.

**Evidence and consequences.** The repair is included in implementation
checkpoint `482ed51814ce8e8f7d67de7edc9a98786240430c`. The readiness/rehearsal
plus Phase 17 repair matrix passed 52/0; affected compatibility passed 142/0;
canonical and topology-correct isolated full regressions both passed 2259 /
skipped 4 / failed 0 with exact parity. Actions run `32628613509` / job
`97167784939` completed with zero steps under the external billing/spending
block, so the result is local complete / external-CI-blocked, not CI green.
No authority, source scope, product environment, sibling write, or data-plane
operation was added.

## D-71 — Phase 18 semantic contract depth, replay fidelity, and confidence

Phase 18 is a LOCAL / SOURCE / SYNTHETIC-only development wave. The semantic
pipeline now admits bounded source/fixture-backed business-behavior contracts
for aggregate/detail, cross-step state, pagination/window, empty-state,
lifecycle, sanitized cross-surface, and HTTP-200 application-error behavior.
Each class has deterministic positive and benign controls. Semantic evidence
remains abstract and privacy-safe; raw values never enter findings, replay,
clusters, dossiers, diagnostics, or continuity records.

The same semantic finding identity is load-bearing through occurrence-bound
replay and actual synthetic minimization. Repeated action IDs without
occurrence context are ambiguous; infrastructure failure, precondition
divergence, semantic divergence, stale source, and invalid replay are distinct
outcomes. Currentness, safety, privacy, determinism, and provenance gates can
degrade confidence, so aggregate replay or cluster counts cannot create HIGH
confidence or prove minimality. Phase 17 source-impact evidence contributes
bounded semantic-coverage reasons only and grants no execution authority.

Local closure evidence is canonical/isolated exact parity at 2,281 passed,
4 skipped, 0 failed out of 2,285 in each run. Actions run `32637996369` / job
`97190524900` for the pushed head executed zero steps under the standing
billing/spending restriction; it is a separate blocked fact and is never
inferred from local green results. This phase adds no DEV,
NEXT, production, authenticated, data-plane, cloud/infra, sibling-write,
publication, AI, or promotion authority.

## D-72 — Phase 19 integrated campaign intelligence and bug-yield expansion

Phase 19 composes the existing Phase 9–18 authorities into an explicit local
bug-yield loop instead of adding another disconnected campaign framework:
source/change impact feeds behavior-level contracts and a deterministic plan;
staged coverage feeds explainable bounded priority; sanitized outcomes feed
yield accounting; replay V4, minimization V2, stability, clustering,
confidence V2, and dossier V3 preserve evidence truth and reduce owner noise.

The versioned DTOs are metadata-only and fail closed on stale, unsupported,
missing, ambiguous, or privacy-unsafe evidence. Priority can explain why a
candidate was selected or excluded, but cannot bypass owner policy, semantic
authority, source currentness, or execution safety. The bounded cache is keyed
by complete sanitized inputs and currentness so source changes cannot reuse
stale impact/coverage results.

The product boundary is a generic read-only adapter; Ripple remains the only
real registered product, and a second adapter is synthetic-only. The corpus
adds 31 data-driven adversarial cases. Local canonical and topology-correct
isolated regressions both enumerated 2,297 with 2,293 passed, 4 skipped, and
0 failed, with exact skip parity. This decision adds no DEV/NEXT/production,
cloud/data/infrastructure, sibling-write, publication, AI, or
self-development authority and preserves
FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE.

## D-73 — Phase 20 semantic coverage saturation and cross-surface differential detection

**Context.** Phase 19 already provided deterministic change impact, staged
coverage, campaign planning, replay, minimization, clustering, confidence,
and dossier authorities, but its mechanically justified behavior universe was
still narrow and equivalent browser/API or representation contradictions were
not first-class capabilities.

**Decision.** Add the bounded `src/core/semanticCoverage/**` composition layer:
multi-language source contract discovery with explicit rejection, provenance-
bound admission/currentness/drift, a source-to-dossier contract graph,
relational contracts, declared surface equivalence, metamorphic relations,
safe semantic observation features, contract-derived synthetic fixtures and
mutants, mutation-style detection measurement, Phase 19 gap ranking and
campaign composition, source-keyed caches, dossier v4 evidence, and local
operator views. Keep the graph and gap report additive to the existing Phase
19 coverage/planner authority. Wrong enum remains unapplicable when the safe
projection cannot prove membership; no raw value is introduced to inflate a
detection score.

**Evidence and consequences.** The local/source/synthetic implementation is
checkpointed at `c58684046d66b2a68234a06c62dea889829d4110`. Six synthetic source
artifacts produce 22 candidates (21 mechanically provable/admitted, 1
unsupported-syntax rejection); the graph has 157 nodes, 151 edges, and 86
gaps; 13 relational kinds are represented by 12 records; one browser/API
equivalence pair and three metamorphic relations are exercised. Measurement
generates 34 mutants, 32 applicable/detected, 0 surviving, 31 benign controls,
and 0 benign false positives. The corpus has 88 adversarial cases across 15
families with six benign controls. Focused Phase 20/auth tests pass 27/27;
Phase 9–20 compatibility passes 1,275/1,275; campaign synthetic 27/27;
owner provenance 91/91; typecheck and hardening pass; canonical and
topology-correct isolated full regressions both pass 2,309 / skip 4 / fail 0
out of 2,313 with exact skip identity parity.

**Safety.** The phase is LOCAL / SOURCE / SYNTHETIC only and adds no
DEV/NEXT/production, cloud/data/infrastructure, sibling-write, publication,
AI, self-development, or execution authority. A full-run timing defect in
the synthetic auth-monitor test was repaired by explicit reviewed background
classification and synchronization of the injected health failure; no
production policy was broadened. External CI remains a separate post-push
fact and is not inferred from local evidence. The validated checkpoint was
pushed as `6e4fdebe74bd34e81d9d3f320154488973b46d12`; the one required Actions
inspection timed out at the GitHub API before returning run data, so no current
run/job/steps identifiers are available, CI remains blocked/unobservable, and
no retry or green claim was made.

## D-74 — Phase 22 contained DEV semantic calibration remains blocked before contact

**Context.** The terminal Phase 19–21 semantic graph is saturated locally and
source-derived, but its truth against a real product surface required a fresh,
strictly bounded DEV authorization. Phase 22 supplied that authorization while
retaining the permanent owner freeze and all existing safety gates.

**Decision.** Add only an authority-inert readiness and acceptance bridge:
real-source eligibility/currentness and deterministic re-derivation,
immutable six-target manifest planning, Preflight V2, a second category-only
privacy firewall, collection/membership/differential classification,
Replay V4, calibration/confidence, Dossier V6, owner-local operator commands,
and an exact synthetic dry run. The sole real launcher remains serial,
manifest-bound, DEV-only, read-only, and capped at one FIRST plus one replay
per target. No dynamic discovery, raw evidence, mutation, NEXT/production,
datastore, infrastructure, sibling write, publication, AI authority, or source
relabeling is permitted.

**Evidence and consequences.** Six candidates were considered against fresh
Ripple source `85e400a8b32fc23c05464033a2a6d5fff2a2890c`; three collection
targets were frozen in manifest ID
`manifest:sha256:3c0d357a25328212f7011d1d`, with digest
`manifest:sha256:978c0e63310ea4f80d918cda`. The no-contact dry run passed with
three FIRST plans, three replay plans, six contexts, and zero external
contact. The stronger executable CI gate then blocked terminal Phase 22 before
DEV: Actions run `32681204267`, job `97298112036`, failed with `steps=[]`, and
failed-log retrieval timed out. No DEV launcher or auth-state read occurred.
Local compatibility, canonical/isolated parity, hardening, provenance,
project, and privacy gates remain green as recorded in the task report. A
future phase requires a fresh authorization, exact green CI, fresh source and
auth checks, and a fresh manifest; this decision grants no standing DEV
authority beyond the blocked Phase 22 attempt.

## D-75 — Phase 23 uses one executable quality gate and preserves external CI authority

**Context.** Phase 22's local/source/synthetic bridge was complete but could
not authorize DEV because its Actions run returned `steps=[]`. The older
workflow also duplicated historical test matrices and omitted the current
Phase 19–22 acceptance cone.

**Decision.** Make `nightwatch.quality-gate.v1` the sole current acceptance
definition. A fixed serial command registry drives local, CI, clean-checkout,
and pre-DEV modes and emits safe versioned receipts. The workflow only
bootstraps Ubuntu/Node20, installs without lifecycle scripts, and invokes
`npm run gate:ci`; offline parity hardening rejects bypass, authenticated
product execution, private uploads, and permission expansion. Test inventory
is explicit so accidental duplicate execution cannot grow with new phases.
Port leases are owned and bounded within Nightwatch test infrastructure.

**Evidence and consequences.** The old inventory is 32 steps / 30 run
commands / 55 unique files / 5 duplicate executions; the current gate has
nine required groups and 130 unique compatibility files with no accidental
duplicates. At validated implementation checkpoint
`98ce2faa3eaf1282a0e61cbd37ec2c9895ac5b9b`, Phase 9–23 compatibility is 1,806
total / 1,805 passed / 1 skipped / 0 failed; the CI-mode receipt is
`receipt:sha256:25e36d5165d745db5f5e6ac6`; the Node20 clean receipt is
`clean-receipt:sha256:d7cbb1f53f164ac1cd58e31d`; and canonical/isolated full
execution is 2,364 enumerated / 2,360 passed / 4 skipped / 0 failed with
exact parity. A fresh source snapshot at `27bb007ad0c798800b6bd3b29760c966422966e7`
produced manifest `manifest:sha256:2ae3ab3c7c34f0946f9244a9`, deterministic
digest `manifest:sha256:b35da8634bf4b64dc56351a4`, and a no-contact dry run.
The exact current-head Actions run `32709452878` / job `97377543621` matched
the implementation head but had `steps=[]`; the classifier returned
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. Pre-DEV V3 is
`BLOCKED_EXTERNAL_CI`, so DEV observations are zero and no auth state was
read. Local green never substitutes for external CI authority.

## D-76 — Phase 24 deepens local triage without expanding DEV authority

**Context.** Phase 23 supplied a unified local/clean/CI quality gate but the
exact-head Actions execution remained blocked before steps. The next useful
investment was local autonomous triage depth, not external billing diagnosis
or repeated CI attempts.

**Decision.** Add a deterministic, source-derived Phase 24 layer for bounded
candidate portfolio analysis, explicit eligibility/exclusion reasons,
source-change invalidation, stable prioritization, manifest v3 identity,
no-contact rehearsal, twelve semantic oracle classes, five exact
cross-candidate relations, replay/minimization v3, sanitized dossier and
owner/component routing, privacy sentinels, readiness diagnostics, exact-head
CI classification, and proxy interruption tests. Keep all cores additive and
authority-inert: no filesystem/network/process/database/AI/self-development or
persistence authority, no synthetic-to-real relabeling, no people inference,
and no weakening of the existing Phase 22/23 DEV gate.

**Evidence and consequences.** The implementation checkpoint is
`cec14ac8e1b189aed96a1b8488381083951411f6`. The local nine-group gate passed
with receipt `receipt:sha256:c6da9a1edf31f47ac1b14d19`; the Node20 clean gate
passed with receipt `clean-receipt:sha256:719495ba80a55e351d8f24fb`;
compatibility is 1,824 total / 1,823 passed / 1 skipped / 0 failed, synthetic
28/28, and owner provenance 91/91. The final Actions observation was run
`32723603497` / job `97419996717` at the exact implementation SHA, but the
required job had zero executed steps and was classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. It is not green CI. No DEV launcher or
auth-state read occurred, all contact/mutation/publication counts are zero,
and the owner-frozen infrastructure/data layer remains out of scope.

## D-77 — Phase 27 adds only exact bounded response-flow proof

**Context.** Phase 26 materially expanded direct PHP response coverage but
left unresolved families involving helper/resource/DTO boundaries. A fresh
six-repository census found no current route with an exact mechanically
observable helper/resource/DTO join; the remaining patterns were dominated by
oversized lexical values, variables, branches, property/service chains, and
dynamic or unsupported behavior.

**Decision.** Add the versioned
`nightwatch.real-source-response-flow.v1` resolver as a small source-only
proof layer. It indexes only approved current PHP declarations and resolves
same-class `$this` calls, same-file `self` calls, exact unnamespaced static
calls, and same-file named functions at depth two or less. It requires exact
declaration identity, current content, branch-complete returns, common
terminal response shape, dependency lineage, and deterministic proof IDs.
Cycles, ambiguity, dynamic dispatch, imports without exact resolution,
inheritance, traits, interfaces, magic, factories, reflection, `eval`,
framework behavior, and opaque resource/DTO behavior remain categorical
exclusions. Existing Phase 26 analyzers and vocabulary remain authoritative;
Phase 24 remains the sole portfolio authority.

**Evidence and consequences.** The fresh inventory remained 1,732 considered /
1,092 read / 1,078 admitted / 654 rejected / 12,449,877 bytes across six
approved repositories. Bounded lexical hardening raised response contracts — `responseContracts` = surfaces with `responseProof === 'PROVEN'` at `src/core/source/eligibilityCensus.ts:728` and `src/core/source/surfaces.ts`, measured over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 for whole-population 58 of 223 under C-01 —
from 62 to 83 and semantic observations from 138 to 175 without changing
joins, mutation/read-only proof, or Phase 24 eligibility. The new flow layer
attempted 13 current patterns, proved 0, rejected 13, and observed no exact
current helper/resource/DTO join. Synthetic controls prove the supported
family and adversarial controls prove fail-closed ambiguity/currentness,
privacy, determinism, path, branch, cycle, and depth behavior. Local and
topology-correct isolated full regressions both pass 2,440 / 4 skipped / 0
failed. Actions run `32800403605`, job `97659975725`, matched the pushed
implementation anchor but returned `steps=[]`; the external classification is
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not green CI. No DEV, auth, product,
data, infrastructure, sibling-write, publication, or promotion authority was
created.

## D-78 — Phase 28 hardens source-gap intelligence without admitting producer flow

**Context.** Phase 27 left a meaningful population of variable returns,
branch-dependent handlers, dynamic dispatch, and oversized lexical cases. The
campaign brief identified bounded local producer/alias flow as the preferred
candidate, but required a fresh current-source census before adding any new
authority.

**Decision.** Keep Phase 28 hardening-first. The fixed admission gate requires
current approved-source examples, exact producer/consumer binding,
branch-complete proof, exact current dependencies, no PHP execution or
framework/container inference, deterministic invalidation, path confinement,
adversarial falsification, and raw-source-free persistence. The fresh census
found zero strict single-assignment direct-literal producer candidates, so
`LOCAL_PRODUCER_ALIAS_FLOW` is not admitted. Variable producers, property and
service chains, namespaces/imports, inheritance/traits/interfaces, factories,
resources/DTOs, dynamic dispatch, and generic PHP data flow remain
categorical exclusions.

Phase 28 instead adds bounded taxonomy v3 and its deterministic delta to the
existing source/invalidation surfaces; preserves exact resolver rejection
reasons; separates source-byte, token, declaration-index, return-site, and
resolved-declaration exhaustion; and exposes advisory performance metrics only
through the existing `source-gaps`/`surfaces` operator views. Timing is excluded
from deterministic discovery identity. The response-flow, source graph, cache,
review, lifecycle, semantic, and Phase 24 authorities remain unchanged.

**Evidence and consequences.** The current six-repository snapshot is
`srcsnapshot:sha256:04ff583971865f335902f5ad`: 1,732 considered / 1,092 read /
1,078 admitted / 654 rejected / 12,449,877 bytes; 128 operations; 83 response
contracts; 175 semantic observations; 13 flow attempts, 0 proved, 13 — historical measurement over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 for whole-population 58 of 223 under C-01 —
rejected; and Phase 24 3 eligible / 125 excluded. Taxonomy v3 reports 45
proof-gap surfaces and 325 rejected diagnostics with deterministic digest
`source-gap-taxonomy:sha256:7adf9ef4eee0788461b34494`. Synthetic and relevant
regression suites remain zero-false-positive and privacy-safe. This decision
adds no DEV/NEXT/production, data, cloud, infrastructure, sibling-write,
publication, AI, or canonical-promotion authority.

## D-79 — Repair exact response-flow declaration binding before expanding coverage

**Context.** After Phase 28, a fresh census through the confined read-only
source boundary reproduced the six approved repositories, their current SHAs,
the exact Phase 28 inventory, and the same 13 rejected response-flow attempts.
No newly admissible producer, alias, dispatch, helper, resource, DTO, or other
source-intelligence family was present. The integrated audit nevertheless
reproduced two concrete false-positive admissions in the existing resolver:
same-class `$this` binding crossed file boundaries, and a named static call
accepted a non-static target.

**Decision.** Harden the existing exact resolver narrowly before considering
new proof families. Same-class `$this` and `self` calls must bind to the
originating confined file, exact class, and expected source SHA. Named static
calls must bind to a unique public, static, non-namespaced, supported target
with the same source binding. Root and dependency declarations with incomplete,
ambiguous, or stale identity fail closed. Bump the response-flow analyzer
identity from v1 to v2 so source-surface caches invalidate pre-hardening
results. Keep the public sanitized declaration shape, graph/review/lifecycle
semantics, Phase 24 authority, owner scope, and all source-only boundaries
unchanged.

**Evidence and consequences.** The repair was validated at
`1570547db9069c2a19d4c42c3e27e496ff1b5f01`. Source coverage and proof counts
remain unchanged: 128 operations, 83 response contracts, 175 semantic
observations, 118 proven joins, 10 rejected joins, 13 flow attempts with zero — historical over pre-C-01 128 cap at analyzer v3 (validated at `1570547db9069c2a19d4c42c3e27e496ff1b5f01`); see D-105 —
proofs, and Phase 24 at 3 eligible / 125 excluded. The two reproduced false
positives now reject deterministically; a supported same-file positive remains
proven. The taxonomy digest changed only for the analyzer-version change.

**Validation and safety.** Focused hardening 5/5, dependency cone 72/72,
synthetic 54/54, owner provenance 91/91, all local/clean quality gates, and
canonical/topology-correct isolated full suites (2,443 passed / 16 skipped / 0
failed out of 2,459, exact skip parity) are green. External CI was not run and
is not claimed green. No PHP execution, raw source persistence, credentials,
customer data, product contact, DEV/NEXT/production activity, datastore/cloud/
infrastructure operation, publication, or authority expansion occurred.

**Rejected alternatives.** A new producer/alias or dispatch family was not
justified by current source evidence. Broad TOCTOU or cache-schema redesign
was not the smallest reproduced defect and remains deferred pending fresh
evidence. No Phase 29 is preselected.

## D-80 — read-only eligibility proof expansion remains zero-admission

**Context.** The fresh source census required by the read-only eligibility
campaign reproduced six current approved repositories, 1,732 files
considered / 1,092 read / 1,078 admitted / 654 rejected / 12,449,877 bytes,
128 operations, 127 route proofs, 127 request contracts, 83 response
contracts, 175 semantic observations, 118 proven joins / 10 rejected joins,
47 mutation-capable operations, 5 independently proven read-only operations, — historical over pre-C-01 128 cap at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 —
and Phase 24 at 3 eligible / 125 excluded. Read-only-method-only was present
on 76 surfaces, but every one also carried another source or Phase 24 blocker.
The previous response-flow family remained exhausted at 13 attempts / 0
proven / 13 rejected.

**Decision.** Admit no new read-only proof family. The bounded candidate census
keeps direct pure-return syntax, exact declaration-cone attempts, the existing
known-read registry, and GET-only as a negative control in an additive,
investigation-only projection. Pure response syntax is not read evidence;
names, comments, route semantics, HTTP GET, and absence of an obvious write
are not authority. The existing source inventory, mutability classification,
semantic graph, replay contracts, Phase 24 selector, campaign ranking,
Control Center projections, owner policy, and safety gates remain the sole
authorities.

**Evidence and consequences.** Direct pure-return handlers produced zero
strict current candidates. Exact bounded declaration cones produced 13
attempts and zero complete proofs, rejected for 9 dynamic-dispatch cases, 3
unsupported-helper cases, and 1 incomplete branch. The existing five-entry
known-read registry remained complete and current; GET-only produced zero read
evidence. The eligibility digest is
`source-eligibility-census:sha256:902c5712c885adefa6ded945`; the candidate
digest is `source-readonly-candidate-census:sha256:88c370e8523e03e06e52a3d9`;
the taxonomy contains 45 proof-gap surfaces and 325 rejected diagnostics.
No operation moved from read-only-method-only to proven read-only, projectable,
or Phase 24 eligible.

**Validation and safety.** The local nine-group gate passed with receipt
`receipt:sha256:de8867e0064f7eb9fd1ffe7a`; the Node20 disposable clean gate
passed with receipt `clean-receipt:sha256:b5c17633d147ac65a53140cd`;
synthetic campaign was 64/64; owner provenance was 91/91; and canonical and
topology-correct isolated complete Playwright both passed 2,505 / 16 skipped /
0 failed out of 2,521. One first isolated journey-fixture failure was
reproduced 5/5 as passing and the complete rerun was green; no assertion was
weakened. External CI was not run. DEV/NEXT/production contact, auth reads,
product mutations, data/infrastructure work, sibling writes, publication,
runtime AI, and canonical promotion counts remain zero. No successor is
selected; any future direction requires a fresh census and authorization.

## D-81 — source-to-campaign proof-chain census remains additive with zero unlock

**Context.** The successor campaign began from live `main` and a fresh
approved-source snapshot. The v2 census measures twelve ordered stages across
128 operations and records source currentness, first and secondary blockers,
runtime/replay/dossier compatibility, unsupported constructs, and bounded
costs. Its digest is
`source-eligibility-census:sha256:1a71425620210ac5fa6af6c4`.

**Decision.** Keep the census as one additive projection over the existing
source descriptor, mutability/read-only authority, semantic/replay/dossier
contracts, campaign projections, and Phase-24 selector. Do not admit a new
response, semantic, runtime-binding, join, or bridge authority unless a future
fresh source snapshot mechanically proves the complete identity and currentness
chain. Names, comments, GET, partial ASTs, successful synthetic execution,
runtime guesses, and model interpretation remain non-authoritative. The
Control Center may expose bounded proof-chain diagnostics but remains a view,
not a policy engine.

**Evidence and consequences.** The current result is 83 response-contract
surfaces, 83 semantic-contract surfaces / 175 observations, 5 exact runtime — historical measurement over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 for whole-population 58 of 223 under C-01 —
bindings, 5 replay-proven surfaces, 128 dossier-compatible candidates, and
Phase 24 at 3 eligible / 125 excluded. First blockers are 44 response, 37
mutability, 43 read-only, 1 route, and 3 complete. No surface was newly
eligible. Outcome B is the truthful result.

**Validation and safety.** Local and Node20 clean gates passed; canonical and
topology-correct isolated Playwright both passed 2,508 / 16 skipped / 0 failed
out of 2,524 with exact parity. A bounded synthetic cancellation-fixture
timing repair was required by full-suite hardening; no product assertion or
safety rule changed. Exact-head GitHub Actions run `32956612882` completed
with failure; its sole job `98139552089` completed with failure and zero steps,
so CI is not validation evidence. No DEV/NEXT/production, auth, data,
infrastructure, sibling-write, publication, runtime-AI, or promotion operation
occurred.

## D-82 — repair source-proof reachability and lexical authority before any coverage unlock

**Context.** A fresh successor audit reproduced an authority-bearing PHP
implicit-fallthrough false proof, static route matches from comments and
strings, and PHP handler multiplicity from fake declaration text. These seams
could contaminate response/semantic proofs or exact joins even though the
existing Phase-24 selector remained conservative.

**Decision.** Harden only the owning proof families. Require a bounded,
mechanically complete PHP direct-return shape and advance the real-source
response analyzer identity from v3 to v4. Use one bounded static tokenizer for
TS/JS/Go route matching and exact declaration counting, preserving valid
receiver/method identity and rejecting malformed or non-code lexical regions.
Treat post-scan content-digest mismatch as SOURCE_STALE across joins and keep
runtime source-version drift distinct. Do not admit a new proof family or
generalize dynamic dispatch, runtime binding, GET-only read evidence, or fuzzy
symbol inference.

**Evidence and consequences.** The implementation checkpoint is
`15fe2c108d6b044f4e0b3a99d2b83e7feb81c157`. The fresh snapshot remains
`srcsnapshot:sha256:04ff583971865f335902f5ad`; discovery is
`source-surface-discovery:sha256:906830010ed198639d3c7b91`; eligibility is
`source-eligibility-census:sha256:2f97b732e0472df347f695a1`; and the
investigation-only candidate census is
`source-readonly-candidate-census:sha256:c54347c14d4d1e5f95f18660`. The
result is 128 operations, 127 route proofs, 43 response-contract surfaces,
53 semantic observations, 118 proven / 10 rejected joins, and Phase 24 at — this `43` is `responseContracts` = surfaces with `responseProof === 'PROVEN'` at analyzer v4 (post-hardening, commit `15fe2c1`, discovery `source-surface-discovery:sha256:906830010ed198639d3c7b91`, snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`) measured over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`; 43+9+76=128 is the cap); first honest whole-population under C-01 at same snapshot is `58` of `223` (`source-surface-discovery:sha256:21de18a23a387d7b816db3c0`); see D-105 —
3 eligible / 125 excluded. Forty unsound response/semantic transitions were
removed; operation identity drift is zero; the family disposition is
`NO_SAFE_NEW_FAMILY`.

**Validation and safety.** Focused source hardening passed 74/74; semantic
compatibility passed 1,901/1,888/13/0; owner provenance passed 91; synthetic
campaign passed 66; local and fresh Node20 clean gates passed all nine groups;
the closure-document local gate passed all nine groups with receipt
`receipt:sha256:c92ef378c757194871718953`; and the final tracked-file audit
reviewed 1,320/1,320 regular files. No product, auth, data, cloud,
infrastructure, sibling-write, publication, runtime-AI, or
canonical-promotion operation occurred. The one exact-head Actions observation
matched pushed head `b4c6b715f90de5814ec8e939b1d255c36f32db5c` as run
`33031299302` / job `98384195570`; it completed with failure and `steps=[]`,
so it is external non-evidence under the zero-step billing/platform
classification and is not a CI-green claim. Terminal continuity also required
the narrow checkpoint-policy repair in `3be590b`, which recognizes only
`openspec/changes/<change>/tasks.md` as a planning-only OpenSpec checkpoint;
the repair passed the local and Node20 clean gates without changing source
discovery or campaign authority.

## D-83 — harden durable artifact boundaries and make findings currentness conservative

**Context.** The strict artifact facade accepted malformed persisted dossier
v1/v2 values through TypeScript-only assumptions, and both the Control Center
findings authority and adapter could upgrade a mixed current-plus-stale or
current-plus-unknown source set to `CURRENT`.

**Decision.** Put bounded runtime validation for dossier v1/v2 at the owning
validator/facade seam, reusing existing semantic authorities and rejecting
unsafe prototypes, unknown frozen-schema keys, malformed nested records,
privacy sentinels, and invalid cross-field states with categorical failures.
Use one shared pure currentness reducer whose precedence is empty/malformed or
unknown → `SOURCE_UNAVAILABLE`, stale tracking reference → `SOURCE_STALE`,
and all non-empty current-class members → `CURRENT`. Keep causal relevance and
confidence separate from source freshness. Retain the facade identity
`nightwatch.artifact-validation.private.v1` because no load-bearing consumer
uses it as a versioned cache or currentness contract.

**Evidence and consequences.** The source implementation anchor is
`01f2ac0608931b83aed0b5c948ed3a4471de7e01`; the validated
implementation/test checkpoint is
`c3d69039d4f2a9969118d877b432c6b4a2f5d09c`; the final documentation
checkpoint is `d2c606c26f598626f24dd94a11cb7fad18887607`. All `40` v1 and `50` v2
reproduced dossier mutations are rejected by both owning and facade paths;
the bounded facade audit rejects `55/55` mutations across `14/14` registered
kinds. The local and clean Node20 gates pass all nine groups with semantic
compatibility `1,903/1,890/13/0`, owner provenance `91`, and synthetic
campaign `66`; final local receipt is `receipt:sha256:b26864ec34f00438044c1076`
and final clean Node20 gate/clean receipts are
`receipt:sha256:186a15aed5e9dbbd9c95ab1d` /
`clean-receipt:sha256:d9c6c98dd7a83b0bab0a40d6`. Canonical serial Playwright
passes `2,548/2,564` in `4.5m`, skips `16`, and fails `0`. External CI was not
observed and is not claimed green. No DEV/NEXT/production, auth, data,
infrastructure, publication, AI, or sibling write operation occurred; no
successor is selected.

## D-84 — make hostname authorization necessary but insufficient for L5 egress

**Context.** The original Phase 1.2 proxy stopped denied destinations before
DNS/TCP, but an allowlisted hostname still reached Node's hostname-valued
upstream primitive without a Nightwatch-owned resolved-address admission
decision. That left the boundary unable to prove that every answer was
acceptable, that the connector used the validated destination, or that
resolution and connection lifecycle evidence described what actually
happened.

**Decision.** Preserve the hostname policy identity
`phase-2a-browser-background-policy-v1` and add one pure numeric
IPv4/IPv6 classifier plus one bounded internal resolver/admission seam. The
resolver is reachable only after hostname authorization; the complete answer
set is validated before deterministic selection. Local admits only exact
`127.0.0.1`/`::1`, while `dev`/`next` external targets require global-unicast
answers. Mixed, malformed, empty, oversized, unsupported-family, mapped, and
otherwise unsafe sets fail closed. HTTP, CONNECT, and WebSocket Upgrade share
the helper, dial the exact numeric address/family, and retain original
Host/authority semantics without a second uncontrolled lookup. Egress
identity is explicit in runtime state and the real-run gate, while the
versioned proxy summary separates policy authorization, resolution,
connection, coverage, and containment violations. Event-log write failure is
also fail-closed: the proxy becomes unhealthy, later traffic is blocked, and
any upstream created before the failed lifecycle write is torn down.

**Evidence and consequences.** The validated implementation checkpoint is
`3db48ed7d35a0a816ef1a801c86a1d14ddf60b27`. The identities are
`nightwatch.proxy-containment.v2`,
`phase-1.2-resolved-address-policy-v1`, and
`phase-1.2-exact-address-binding-v1`; the durable proxy summary is
`nightwatch.proxy-summary.v2`. The exact browser residual remains
`BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL`, and no L6 or real-product
acceptance is implied. The final local gate passed all nine groups with
receipt `receipt:sha256:b026f83f2ac58f755df3040f`; the clean Node20 gate passed
with receipt `receipt:sha256:27e9c6f587319e83ea916581` and clean receipt
`clean-receipt:sha256:5cb6b793a968504bf936f4f9`. Semantic compatibility was
`1,903/1,890/13/0`, owner provenance `91`, synthetic campaign `66`, and the
canonical serial regression was `2,573 passed / 16 skipped / 0 failed` out of
`2,589`. Control Center UI typecheck, tests, build, built-browser checks, and
local visual verification passed. External CI was not observed as green; a
zero-step or absent external run remains non-evidence under the standing
platform/billing policy. The exact-head observation was run `33055137454` /
job `98459927981`, matched head `41cf3ac986515faaf15a6610bc588ec2d57fb0bd`,
and completed with `failure` and `steps=[]`; it is classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence, and not CI green.
No DEV/NEXT/production, auth, data, cloud,
infrastructure, sibling-write, publication, runtime-AI, or force-push
operation occurred.

**Rejected alternatives.** Hostname-only socket dialing was rejected because
it provides no resolved-address authority. Allowing any one safe answer from
a mixed set was rejected because unsafe alternates could still be selected by
the OS. Browser-only interception, system DNS/hosts changes, privileged
firewalls, Docker/network namespaces, TLS MITM, and live Alphaus DNS were
outside this local/source/synthetic scope. Raw IPs and resolver diagnostics
were rejected from durable evidence to preserve the privacy boundary.

## D-85 — make planner handoff and project snapshot truth explicit

**Context.** The executor prompt and active task could describe different
completed campaigns without a shared machine check, and the project-state v1
block accepted stale fields while its PASS payload collapsed promotion
lifecycle and effective authority into one ambiguous key.

**Decision.** Add the pure, versioned
`nightwatch.planner-executor-handoff.v1` header parser and a bounded,
read-only `npm run handoff:check` route checker. READY binds to the named
terminal predecessor; IN_PROGRESS, BLOCKED, and COMPLETE bind to the active
continuity-v2 campaign task. Require the exact OpenSpec route, tracked regular
components, `main`, and an ancestor Planned-From. Make project-state v2 an
explicit owned-key schema, move stale Phase-15 session fields out of the
machine block, and expose `PROMOTION_AUTHORIZATION_LIFECYCLE` separately from
`EFFECTIVE_NEXT_PROMOTION_AUTHORITY`.

**Consequences.** `HANDOFF_TRUTH` is a required quality-gate group executed
once before project truth. Checkers remain local, deterministic, bounded,
shell-disabled for fixed child processes, and unable to fetch, mutate Git,
contact products, access data/infrastructure, or emit task/source bodies.
Existing SHA-role continuity rules remain authoritative; docs-only planning
and closure descendants cannot become implementation checkpoints. Historical
v1 task and decision records remain readable and are not bulk-migrated.

## D-86 — final assurance remains blocked at the proven L6 boundary

**Context.** The final assurance campaign reproduced a retry-free browser
background classification seam and the release-critical restricted-OOPS
binary-absence skip. It also rechecked the process/DNS containment residual
without using privileged or external operations.

**Decision.** Classify the exact `www.gstatic.com` CONNECT as local telemetry
only, preserving the destination allowlist and browser-background blocking
semantics. Remove the stale WebSocket retry/polling workaround, qualify
restricted OOPS with the tracked deterministic local substitute, and retain a
versioned `UNPROVEN/BLOCKED` L6 capability. Authenticated OOPS must fail before
workspace or child creation until safe rootless direct DNS/TCP/UDP denial,
complete lifecycle isolation and browser speculative-DNS closure are proven.

**Consequences.** The implementation checkpoint
`72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b` passes the available local safety,
semantic, provenance, campaign, UI, canonical and topology-correct isolated
qualification with exact skip parity. The terminal result is
`PROJECT_NOT_COMPLETE_BLOCKED`; no local green result can override the L6
boundary. The closure local and fresh Node 20 clean quality gates both passed
all 10 groups (receipts are recorded in the task STATE). Fresh owner
authorization is required before any future L6 work. The one exact-head
Actions run `33139304292` / job `98746329861` executed zero steps and is
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK` external non-evidence; no retry was made.

## D-87 — rootless L6 uses a namespace-local relay and explicit release truth

**Context.** D-86 correctly stopped completion because Bubblewrap namespace
creation alone did not prove direct DNS/TCP/UDP denial or reachability of the
parent relay. The old OOPS launcher still spawned in the parent namespace, and
the project state did not distinguish a blocked terminal P1 from an executed
release checkpoint or CI observation.

**Decision.** Use an unprivileged Bubblewrap user/PID/network namespace with
`--as-pid-1`, `--die-with-parent`, no external interface, a minimal read-only
root view and the exact invoking Node runtime. A namespace-local bounded
HTTP/upgrade adapter crosses only a read-only-mounted AF_UNIX framed channel;
the parent forwards OOPS requests to the existing Phase-5/L5 authority and
never accepts raw socket-forward instructions. The versioned capability
`nightwatch.process-network-containment.v1` is READY only after synthetic
direct DNS/TCP/UDP/HTTP/HTTPS, IPv6/mapped-address, descendant, browser
speculative/background, HTTP/WebSocket relay and cleanup proofs. Authenticated
OOPS performs this readiness check before any target workspace or child spawn.

**Release truth.** Add release fields to the machine-checked project block:
`PROJECT_COMPLETION_STATUS` follows the active continuity task, while
`LIVE_HEAD_SHA`/`FINAL_DOCUMENTATION_SHA` are Git-discovered markers and
substantive/local/clean/CI observed/CI executed SHA roles are separate.
`NO_STEPS_EXTERNAL_NON_EVIDENCE` requires an observed SHA and no executed SHA;
CI-certified completion requires an exact executed passing SHA. A BLOCKED task
cannot project a complete release status. Handoff predecessors may be
`COMPLETE` or `BLOCKED`, so an authorized successor can repair a blocked
campaign without relabeling its history.

**Consequences.** The old L6 residual and authenticated-OOPS disablement are
replaced by a proven local capability on hosts where the complete qualification
passes; unsupported hosts remain categorical and fail closed. L5 remains a
separate browser/proxy authority. Vite/Vitest are pinned to patched versions;
the root Vue 2 dependency remains a documented dev-only legacy compatibility
fixture with one low advisory and no compatible non-major fix. (The
2026-09-05 removal recorded here as superseding this consequence was itself
reversed the same day: the dependency was not unused. See D-118.) Final release
status and exact validation/CI SHAs remain pending until the successor's full
local, clean, isolated and external-evidence checks complete.

## D-88 — final completion is local/clean certified when exact CI is non-evidence

**Context.** The successor campaign completed the rootless L6 proof and all
repository-owned qualification, but the exact release-checkpoint Actions run
failed before runner provisioning with no executed steps.

**Decision.** Select `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` for release
checkpoint `2576c5751d33bb40046246e8fcf57c7cc5c30a57`, with substantive
implementation `e278da19f5fbc62107528033716f271cbb64e1de`. Bind local and
clean validation to that release checkpoint, record the exact CI observation
as `NO_STEPS_EXTERNAL_NON_EVIDENCE`, and never project it as CI execution or
PASS. Preserve the historical D-86 blocked campaign and all planning branches
as history; no branch deletion is required or authorized by this closure.

**Consequences.** L6 is proven locally through the rootless namespace, bounded
AF_UNIX relay and adversarial matrix; authenticated OOPS is enabled only after
fresh `READY` qualification and fails closed on capability loss. Canonical and
topology-correct isolated suites are green with exact skip parity, local and
Node 20 clean gates are green, and the current project state is terminal and
mechanically checkable. GitHub Actions remains an external follow-up until a
runner-provisioned exact release-checkpoint run exists.

## D-89 — local/clean certification is not operational acceptance

**Context.** Campaign `nightwatch-final-completion-and-l6-containment-v1`
truthfully closed as `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`. A successor
owner campaign must determine whether Nightwatch works against the approved
DEV system. Project-state v2 previously paired COMPLETE active tasks with
whatever valid completion token was declared, which would let a still-pending
operational campaign keep projecting local-clean complete if ACTIVE stayed
COMPLETE.

**Decision.** Keep `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` and
`PROJECT_COMPLETE_AND_CI_CERTIFIED` valid only for COMPLETE historical
local/CI records. Add operational tokens
`IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` (IN_PROGRESS),
`OPERATIONAL_ACCEPTANCE_BLOCKED` (BLOCKED), and
`OPERATIONALLY_ACCEPTED` / `REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN` /
`OPERATIONAL_ACCEPTANCE_FAILED` (COMPLETE). Pairing is fail-closed through
`COMPLETION_BY_ACTIVE_STATUS`. Do not weaken prior blocked-versus-complete
or CI-execution rules.

**Consequences.** The live project may not be described as finished while
operational acceptance is pending. Historical local-clean certification stays
mechanically valid as history. Unknown status tokens still fail closed.

## D-90 — Exact observed DEV Chrome control-plane traffic remains a local block

**Context.** During the owner-authenticated DEV storage-state capture on
2026-08-30, the guarded outer proxy observed repeated exact CONNECT attempts
to `www.gstatic.com`. The host had already been classified as local telemetry
after a prior canonical-suite observation, but the DEV environment config did
not carry that exact classification. The capture therefore failed closed as
`external-default-deny` during the human wait, before storage-state
replacement.

**Decision.** Add only the exact `www.gstatic.com` host to the DEV
`telemetryHosts` table. It remains neither an environment allowlist entry nor
a wildcard/browser-background rule. The outer proxy continues to block it
before resolution/TCP, records non-fatal telemetry containment, and preserves
the default-deny behavior for the same host in unobserved environments and
for related hosts.

**Evidence and consequences.** The sanitized direct-capture artifact recorded
`https-connect`, host `www.gstatic.com`, `external-default-deny`,
`resolution=not-attempted`, and `connection=not-attempted`; no credential,
storage-state bytes, or upstream connection entered Nightwatch evidence. A
regression test proves local/DEV classify the exact host as `block-telemetry`
and `next` continues to deny it. The guarded auth capture must be retried from
the human wait boundary after this validated repair; no prior external state
is replaced by this failure. This change grants no production, NEXT, product,
mutation, data, infrastructure, or publication authority.

## D-91 — Fresh journey replay must distinguish duplicate reads from semantic drift

**Context.** The first successful real Phase 2C run on 2026-08-30 returned
exit 0 even though the account-inventory fresh-context comparison reported
`passed=false` with `semantic-request-ledger`. Sanitized evidence showed the
same two approved `KNOWN_READ` rule keys repeated during ordinary application
rehydration, plus passive unknown initialization variance; route, structure,
auth, safety, and oracle outcomes were otherwise PASS. The manual runner
recorded the comparison but did not assert it, creating a false-success path.

**Decision.** Compare the strict semantic ledger as a set of equivalent
metadata keys, not an occurrence-sensitive multiset. Preserve rule ID,
classification, disposition, method, step, and action in each key, so any
semantic-family, method, mutation, or action-caused-unknown change remains a
strict divergence. Existing bounded request-count variance records duplicate
read multiplicity. Phase 2C now persists its comparison before asserting
`comparison.passed`, so a genuine strict replay divergence fails the command
instead of being reported as success.

**Evidence and consequences.** A permanent unit regression covers duplicate
approved reads as bounded variance while existing semantic-divergence tests
remain strict. The focused journey/replay matrix passed `21/21`, with
typecheck and hardening green. The real Phase 2C matrix must be rerun against
the current pushed checkpoint; the prior run remains historical evidence of
the defect and is not retroactively relabeled.

## D-92 — Terminal campaign failures must close pending work and expose a safe next action

**Context.** The first real campaign resume on 2026-08-30 executed two
journeys, then received a bounded common-journey `RUNTIME_FAILURE` from the
real adapter. The orchestrator persisted that failed outcome as `COMPLETED`,
left later work pending in a terminal checkpoint, and retained the initial
`nextExactAction`. The owner wrapper then exited 0 because it asserted only
safety and privacy counters, even though the checkpoint reported
`PARTIAL_RUNTIME_INFRA_FAILURE` / `PREFLIGHT_FAILED`.

**Decision.** A `RUNTIME_FAILURE` or `INCOMPLETE` execution result is a
blocked terminal work-item record with a safe reason code; all not-yet-run
work is explicitly skipped before terminal persistence. Checkpoint generation
derives the next action from current ledger state, preserves an explicit
replay action only for resumable interruptions, and uses a fixed inspection
action for terminal campaigns. The real campaign test succeeds only for
`COMPLETE_CLEAN`, `COMPLETE_WITH_FINDINGS`, or valid bounded-budget terminals;
partial auth, safety, runtime, owner-policy, or interruption outcomes return
nonzero.

**Evidence and consequences.** The synthetic campaign/checkpoint/resume
regression passed `37/37` with typecheck and hardening green. This preserves
the established policy that runtime-infrastructure failures are not resumed
automatically, while making the persisted owner next action and process exit
truthful. A fresh DEV campaign is required; the prior terminal checkpoint is
retained as private historical evidence and is not rewritten.

## D-93 — Bounded Phase 4 failures and aggregate timeout are never success

**Context.** The current-checkpoint real Phase 4 run reached the six-seed
matrix but hit the Playwright default 120-second aggregate test timeout. Its
partial sanitized matrix also showed seed terminations of `RUNTIME_FAILURE`
and `SAFETY_BLOCK` while the per-seed recorder marked them passed because it
checked only zero safety counters and excluded `RUN_INCOMPLETE`. This could
hide a failed exploration behind a successful owner-facing matrix.

**Decision.** Phase 4 uses the existing bounded child limit of 15 minutes for
the aggregate six-seed Playwright test, while each exploration retains its
own 120-second engine budget. Only `BUDGET_EXHAUSTED`, `SAFE_FRONTIER_EXHAUSTED`,
and `MODEL_TERMINAL_STATE` are successful exploration terminations; runtime,
safety, auth, route, oracle, and interruption terminations fail the real
command even with zeroed derived safety counters. The matrix persists each
attempt before the explicit failure is raised.

**Evidence and consequences.** The pure termination classifier and existing
failed-action regression cover the boundary; a fresh real Phase 4 run is
required to validate the timeout repair against DEV. No budget, action
catalog, safety policy, or external authority is widened.

## D-94 — Ripple Phase 4 must use the source-backed Quasar option surface

**Context.** The first truthful Phase 4 DEV rerun failed on the approved
`p4.j1.vendor-local.azure` action with zero safety events. Playwright debug
evidence showed that the real Quasar 1 QSelect opened successfully, but its
menu entries had no `option` ARIA role; the role-based locator therefore
returned zero matches. The local tracking source confirms that this control
is the shared `Selector` component and its options are rendered as QSelect
items.

**Decision.** Locate the opened menu through the bounded visible `.q-menu`
surface and its `.q-item` entries, matching only the fixed source-proven
option labels. Wait for the menu surface before inspecting entries. Preserve
unique-count checks and fail closed on missing or ambiguous entries; do not
use force-clicks, arbitrary text, customer-derived selectors, or value
injection. Runtime failures are represented by a closed safe failure-code
vocabulary rather than raw Playwright text.

**Evidence and consequences.** A browser-backed unit fixture reproduces a
Quasar-style menu item without an option role and passes through the runtime
path. The next clean real Phase 4 run must prove the fix against DEV and
remain subject to the existing safety and successful-termination gates. No
new target, request family, mutation, or external authority is admitted.

## D-95 — Phase 4 availability must inspect the mapped QSelect selection

**Context.** After D-94, the real Phase 4 E1 seeds completed successfully,
but E2 selected the already-active AWS vendor and waited for a new common
exchange read that the product correctly did not issue. The sanitized state
record showed both AWS and Azure as available even though the common-exchange
page had initialized its default vendor. This is because the source-backed
shared Selector uses Quasar 1 `use-input=false`: its input is empty while the
mapped selected label is rendered in the field body.

**Decision.** Determine selector availability from both the input value and
the exact fixed source labels rendered inside the QSelect field. An action
whose requested source option is already selected is unavailable and is not
clicked; the planner may choose another approved option or a terminal safe
edge. The same check is applied at execution as a defensive fail-closed
precondition.

**Evidence and consequences.** A browser-backed unit fixture now models an
empty QSelect input with a rendered AWS label and proves AWS is excluded
while Azure remains executable. The next real Phase 4 run must show E2
vendor selection causing the approved read or fail with an explicit bounded
failure; no request, mutation, or authority is widened.

## D-96 — QSelect option matching must be exact within the opened menu

**Context.** The next real Phase 4 run correctly excluded the active AWS
vendor and reached the payer status selector, but the `Set` action was
classified `APPROVED_OPTION_NOT_UNIQUE`. The opened Quasar menu contained
both the source labels `Set` and `Not Set`; substring matching treated the
latter as a second `Set` match.

**Decision.** Match fixed source option labels with an anchored,
whitespace-tolerant pattern against `.q-item` text inside the visible menu.
Keep the uniqueness gate and reject zero or multiple exact matches. No
customer text, arbitrary selector, force-click, or option-value injection is
allowed.

**Evidence and consequences.** A browser-backed regression fixture with both
overlapping status labels now passes the exact `Set` action. The next real
Phase 4 run must validate the result against DEV and continue to enforce the
existing read, route, safety, and termination contracts.

## D-97 — Finalize journey and exploration verdicts only after response oracles settle

**Context.** A real DEV account-inventory run exposed a lifecycle race: the
Playwright `response` listener starts asynchronous body capture and protocol
oracle evaluation, while the observer decremented its active-request count
before that work completed. Structural journey readiness and required-request
presence could therefore produce a successful journey/exploration result
before a later `malformed-json` oracle was recorded. The same gap could make a
late oracle failure invisible to exact replay acceptance.

**Decision.** Track response handlers separately from in-flight requests and
keep request accounting correct for both completed and failed requests. Add a
bounded observation-settlement barrier requiring zero pending response handlers
and a quiet interval (active in-flight requests are intentionally not required
to be zero). Declarative journey evidence must settle before computing its
final oracle/pass fields; Phase 4 exploration and exact replay must settle
again after runtime work and require a clean monitor before recording success.
A settlement timeout or configured oracle failure is recorded as a
non-successful bounded outcome; no raw response body or browser error text is
exposed.

**Amendment 2026-08-30.** Initial barrier required zero active requests,
zero pending handlers, and quiet. Real payer-exchange validation showed the
payer page continues benign polling after journey steps, so requiring zero
active would time out even when no pending oracle work remains. The barrier
was relaxed to zero pending + quiet only (active is ignored because any
in-flight request will become a pending handler upon response). Local
settlement regressions were updated and the payer journey now settles correctly
while still guaranteeing that a malformed-json handler cannot be missed.

**Evidence and consequences.** Local timing, journey, exploration, and
observer regressions cover the barrier and the existing metadata-only oracle
boundary remains intact. The real Phase 2C and Phase 4 matrices must be rerun
from the clean checkpoint; any surviving malformed-response event remains
DEV/product evidence and must not be suppressed or reclassified as a
Nightwatch pass.

## D-98 — Project-verdict preservation requires explicit task semantics

**Context.** The project-state checker had been allowing an active task whose
name began with `nightwatch-` to preserve `OPERATIONALLY_ACCEPTED`, with
historical exceptions layered on top. Continuity parsing also treated status
words in explanatory prose as milestone state. Both behaviors made
authorization and recovery depend on conventions outside the semantic state
model.

**Decision.** Active tasks must declare one bounded verdict effect:
`PRESERVE`, `REEVALUATE`, or `SUPERSEDE`. The project checker consumes that
field and rejects missing, malformed, duplicate, or semantically mismatched
effects. Active task, task STATE, execution prompt, and the bounded live-state
snapshot cross-check explicit task/phase/status/effect/next-action/completion
fields. Milestone status is recognized only in the structured location and
format defined by the continuity protocol; narrative status vocabulary is
inert.

**Evidence and consequences.** Negative state matrices cover accepted
preservation, requalification, premature acceptance, malformed/duplicate
fields, task-name independence, and contradictory live documentation. The
current hardening task uses `PRESERVE`, so the existing operational verdict is
unchanged. Historical task records remain readable and are not mass-migrated.

## D-99 — Auth-blocked real requalification is a categorical limitation

**Context.** The post-acceptance reliability campaign required repeated real
DEV observation, but the owner-managed storage state passed structural checks
and then failed authenticated-session validation before browser-context
creation. Treating that path as a retry pass or a product result would make
the final reliability claim false.

**Decision.** Record the auth boundary as `HUMAN_AUTH_ACTION_REQUIRED` with
zero actual product observations, preserve the prior accepted evidence as
historical, and stop without automatic credential refresh or bypass. Local
replay, state, campaign, clean-install, and isolated-topology evidence may
close the locally authorized hardening scope, but a fresh DEV reliability rate
requires new owner-managed authentication and a separately authorized
successor.

**Evidence and consequences.** The guarded continuation had one initial
repository-freshness block while documentation was dirty and one subsequent
auth-blocked attempt after all local safety gates passed. No credentials,
raw responses, or customer values were persisted. `OPERATIONALLY_ACCEPTED`
remains preserved and no DEV outcome is overclaimed.

## D-100 — Replay-budget repair is locally complete but DEV confirmation stays blocked at auth

**Context.** The completed DEV soak admitted eight fresh product candidates but
all four replay queues stopped before executor entry because collection consumed
the journey-context budget. The successor reproduced that boundary, added a
finite real-scale browser reserve and durable campaign/cluster reservation
ledger, and passed its complete local and clean Node 20 validation cone. The
exact implementation head was observed by Actions once, but the sole job
failed with `steps=[]` before any workflow step.

**Decision.** Keep the replay repair as the validated local implementation at
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`. Classify Actions run
`33446473458` / job `99666610250` as
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK` external non-evidence. Treat guarded DEV
confirmation as `BLOCKED` until the designated external auth state is
page-readable. Do not use alternate credentials, predecessor checkpoints,
historical candidates, stale manifests, extra retries, or broader contact.

**Evidence and consequences.** One no-refresh prepare-only check returned
`AUTH_NETWORK_FAILURE`; one guarded refresh attempt returned
`AUTH_STATE_REPLACEMENT_FAILED`. No fresh campaign manifest, candidate, replay,
minimization, or dossier was produced. The project snapshot therefore uses
`OPERATIONAL_ACCEPTANCE_BLOCKED` with `LIVE_NEXT_ACTION_STATE: STOP`; prior
operational acceptance remains historical context and is not silently relabeled
as a fresh DEV result.

## D-101 — Concurrent Nightwatch agents never share a working tree or an index

**Context.** During the production-observability planning campaign a second
Nightwatch session, sharing the single canonical working tree and index, set
`skip-worktree` on `docs/ROADMAP.md`, added the planning change directory to
`.git/info/exclude`, and deleted the first agent's in-progress `audit.md`. The
independent second-reviewer architecture review recorded the hazard as `T-48`
(OBSERVED), classified the missing response as `MA-13`, and required campaign
`C-00 — concurrency and workspace hardening` as
`MUST FIX BEFORE IMPLEMENTATION`, first on the revised critical path
`C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 → C-12 → C-13 → C-14`.

**Decision.** Adopt isolation over cooperation. The enforced invariant is
`ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`: a writing agent
owns one `git worktree` on one `session/<name>` branch, claimed by an
ownership record in that worktree's private Git directory. Agents share only
the append-only object database. Ownership is regenerable local state, never
durable project truth, and stores no machine-specific absolute path. Unknown,
malformed, duplicated, contradictory and unowned states have no write
authority and fail closed.

**Evidence and consequences.** `bin/workspace-integrity.mjs` (read-only) and
`bin/nightwatch-session.mjs` (the only mutating surface) implement the model;
`bin/agent-state.mjs`, `npm run workspace:check` and the required
`WORKSPACE_INTEGRITY` quality-gate group enforce it in `gate:local`,
`gate:ci` and `gate:clean`. `tests/unit/workspaceIsolation.test.ts` reproduces
every observed hazard class on disposable synthetic repositories and proves
both the failure and the repaired green state. The continuity-v2 model is
unaffected because it records SHAs, not checkout state; `LIVE_HEAD_AUTHORITY:
GIT` becomes more correct, not less.

## D-102 — Index flags are per-worktree; shared-state hygiene needs both surfaces

**Context.** Independent review §11 item 2 states that
`skip-worktree`/`assume-unchanged` bits "live in the shared common directory"
and prescribes an invariant that `git ls-files -v` "reports no lowercase
status letters". Both statements are mechanically wrong, and the C-00 audit's
first design inherited the first one.

**Decision.** Record the measured correction and implement the corrected
invariants. Empirically, a linked worktree has its own index: setting
`skip-worktree` in a linked worktree reports `S` there and `H` in the main
worktree. Only `info/exclude`, `hooks` and `config` are shared. And in
`git ls-files -v`, a lowercase tag means assume-unchanged while `S`
(uppercase) means skip-worktree — so rejecting only lowercase letters would
have missed the exact bit set during the observed incident.

**Evidence and consequences.** C-00 therefore checks BOTH surfaces: the shared
common directory once, and the index of EVERY registered worktree. The index
invariant is "no lowercase tag and no `S`/`s` tag". The review text and the
original audit are preserved unedited as historical evidence; this decision is
the correction of record. Isolation reduces, but does not remove, the
index-flag hazard: the canonical checkout's index remains shared by every
agent who works there, which is one reason the canonical checkout is not a
valid implementation workspace.

## D-103 — No main-integration lease; the remote ref compare-and-swap is the serializer

**Context.** M6 of the C-00 campaign asked whether a lease should guard the one
genuinely shared operation, updating canonical `main`. The review ranks leases
as "the fallback, not the mechanism".

**Decision.** Implement no lease. Integration is
`git push origin HEAD:refs/heads/main` from the session worktree. The remote
ref update is already an atomic compare-and-swap: a losing writer receives a
non-fast-forward rejection and must reconcile, which is exactly the behaviour
a correct lease would produce, without a file that leaks when an agent dies.
Pushing the session branch instead of checking `main` out also means
integration never mutates another worktree's index or checkout — the precise
class of damage C-00 exists to remove.

**Evidence and consequences.** A local lease would add expiry, ownership,
adoption and stale-recovery semantics while strengthening nothing Git already
guarantees, and it would risk being mistaken for implementation authority. The
residual — two sessions pushing within the same instant — is handled: the
second push is rejected, that session reconciles by merging `origin/main` into
its own branch (never rebasing), revalidates, and pushes again. Nothing is
lost and nothing is rewritten. Reconciliation refuses to resolve a conflict:
it aborts the merge and reports `SESSION_RECONCILE_CONFLICT`.

## D-104 — A declared-deletion gate is the enforceable core of file ownership

**Context.** The review requires that "a session may delete only files it
created in that session or files explicitly declared in its task scope". A
general per-file ownership index would turn Nightwatch into an SCM.

**Decision.** Enforce the rule with one deterministic query. Deletions are
`git diff --diff-filter=D --name-only <base>` against the session base (or the
canonical merge base outside a session), which covers committed, staged and
unstaged tracked-file deletions at once. Every deleted path must appear under
`## Declared Deletions` in the active task `SPEC.md`; otherwise validation
fails with `WORKSPACE_UNDECLARED_TRACKED_DELETION`.

**Evidence and consequences.** This satisfies both clauses of the rule without
an ownership index: a file created *and* deleted inside one session produces
no net deletion against the session base, so the only observable net deletions
are of files that existed at the base — which are by construction not
session-created and must therefore be declared. The prohibitions on
`git clean -fd`, broad `git restore`/`git checkout -- <path>`, destructive
reset and cross-session `git stash` remain agent behavioural rules recorded in
`AGENTS.md`; their *effects* are caught by this gate, the hygiene invariants,
and the rule that the canonical checkout must be clean while a session is
live.

## D-105 — truncation truth: 83 vs 43 vs 58 are one metric over two caps

**Context.** Durable docs recorded two different `responseContracts` counts for one identical source snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad` over the silently capped discovery pipeline. `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/audit.md:166` records `43 (UNPROVEN 9, UNSUPPORTED 76)` — 43+9+76=128 exactly, which is the pre-C-01 projection cap `MAX_DISCOVERED_OPERATIONS = 128` (`src/core/source/surfaces.ts:59` pre-C-01, `59` `routeOperationsTruncated` silently dropped, never surfaced), not the real population. `docs/CURRENT_STATE.md:2505-2506`, `docs/ARCHITECTURE.md:1860`, `docs/ROADMAP.md:2418` and the phase tables repeated that `43` (and the earlier `83` at `docs/CURRENT_STATE.md:78,82,83,148,2342,2458`, `docs/ARCHITECTURE.md:1765,1824`, `docs/ROADMAP.md:2234,2257,2325,2372`, `docs/DECISIONS.md:3196,3238,3271,3295,3356`) as if it were whole-population truth. The metric in all cases is one metric, not two: `responseContracts` = count of surfaces with `surface.contract.responseProof === 'PROVEN'`, defined identically at `src/core/source/eligibilityCensus.ts:728` (census summary) and in the discovery counters produced by `src/core/source/surfaces.ts`.

**Decision.** Keep historical, phase-qualified records intact but make them unambiguously historical: every `83` or `43` `responseContracts` phase measurement is the same metric at a phase-qualified analyzer checkpoint over the pre-C-01 128-operation projection cap; only the post-C-01 whole-population measurement is current truth. Specifically `83` was that metric under response-analyzer v3, before the soundness hardening at commit `15fe2c1` (bounded PHP direct-return shape + mechanically complete branch requirement), measured over the silently capped 128-operation projection at the same snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`. `43` was the same metric after that hardening (analyzer v4) at the same snapshot and the same 128 cap. Both numbers were measured over a silently truncated population: the pre-C-01 discovery core silently capped projection at 128 operations and the audit's `43 (UNPROVEN 9, UNSUPPORTED 76)` sums to that cap. C-01 removed that silent cap (`MAX_PROJECTED_OPERATIONS = 4096`, per-repository fair round-robin projection, explicit `SourceOperationProjectionCompleteness` at `src/core/source/surfaceTypes.ts` and `src/core/source/surfaces.ts:69,858-910`, with `coverageStateForCompleteness` reporting `TRUNCATED`/`UNKNOWN`/`PROVEN`).

**Evidence and consequences.** The first honest whole-population measurement over all 223 discovered `ripple-api` operations at the same snapshot, taken in this worktree with `node bin/nightwatch-intelligence.mjs source-gaps` (C-01), is `routeOperationsFound: 223`, `routeOperationsTruncated: 0`, `responseContracts: 58`, `requestContracts: 222`, `routeProofs: 222`, `semanticContracts: 90`, `joinsAttempted: 223`, `joinsProven: 207`, discovery digest `source-surface-discovery:sha256:21de18a23a387d7b816db3c0` (verified from the C-01 session worktree; the earlier C-01 digest `source-surface-discovery:sha256:fb553ea66d4cc98b29294565` is the same 223-operation population measured before the inventory-completeness contract entered the snapshot digest, not a different measurement). This reconciles `audit.md:166` and `:439` and `docs/CURRENT_STATE.md:2505-2506`: historical `83` (v3, capped) and `43` (v4, capped) remain valid at their own SHA and analyzer identity; current truth is `58` of `223` under C-01. No analyzer semantics were changed to force the numbers to agree. Coverage/completeness remains reporting only (`coverageAuthorityEffect` may `DENY` but never `GRANT`; `src/core/source/completeness.ts`). All durable docs that previously presented `128` as a discovery result now carry the explicit cap note and reference this decision.

**Rejected alternatives.** Silently rewriting history to `58` everywhere was rejected per `AGENTS.md` documentation-truth discipline (historical phase-qualified anchors stay valid at their own SHA; only `CURRENT`-truth statements get corrected). Changing analyzer semantics to make the numbers agree was rejected.


## D-106 — a generated artifact is source evidence, qualified and deny-only

**Context.** `alphauslabs/blueapi/openapiv2/apidocs.swagger.json` is a
committed, generated mirror of the protobuf surface: 462 paths, 591 verb-bound
operations, 1,179 `definitions`, regenerated only when somebody runs the
generator. C-02a admits it. Two wrong answers were available. Treating it as
ordinary `SOURCE_FACT` would let a stale mirror silently authorize behaviour
the protos no longer describe. Demoting it below `SOURCE_FACT` would be
equally untrue: the file is committed, exact, and mechanically parseable, and
the independent review measured it at 591 of ~595 verb-bound RPCs with full
path, verb, `operationId` and response schema.

**Decision.** Class it `SOURCE_FACT` with a `GENERATED_ARTIFACT` qualifier and
keep three facts structurally separate in
`src/core/source/generatedArtifact.ts`:

1. the evidence qualifier — a pure function of repository plus first path
   segment over one frozen table;
2. generation currency against the proto surface —
   `CURRENT | STALE | UNKNOWN`, derived only from an explicit corroboration
   record carrying its own snapshot SHA;
3. the production-admission effect —
   `DENIED | NOT_DENIED_BY_EVIDENCE_CLASS`, a type with no `GRANTED` member.

Absence of a corroborator is `UNKNOWN`, never `CURRENT`. A snapshot mismatch,
a duplicate record and a malformed count are all `UNKNOWN` too. Only a single
corroboration at the same SHA with a matching operation count yields
`CURRENT`. `GENERATED_ARTIFACT` without a `DIRECT_SOURCE` witness is `DENIED`
with `GENERATED_ARTIFACT_SOLE_EVIDENCE` *even when currency is provably
`CURRENT`* — currency and sole-basis are independent denials.

**Evidence and consequences.** C-02b owns the proto surface, so
`PROTO_SURFACE_CORROBORATIONS` is empty and all 591 generated surfaces report
`UNKNOWN` currency and a `DENIED` production admission today. The measured
divergence the review recorded (get 185 vs 187, delete 60 vs 61, post 253 vs
254) is exactly what the `STALE` branch exists to catch once C-02b lands. The
whole-population census moved from 223 to 814 operations
(223 Ripple + 591 blueapi, zero dropped, zero deduplicated) with
`responseContracts` 58 → 649; 970 response contracts are bound through
in-document `definitions` with 0 unresolved. A side effect worth recording:
a generated Swagger document declares no handler symbol, so all 591 operations
carry an `UNSUPPORTED_REFERENCE` `ROUTE_HANDLER` join and `JOIN_GRAPH`
replaces `RESPONSE_CONTRACT` as the top-ranked proof-gap family (607 vs 165
gap surfaces).

**Rejected alternatives.** A single scalar "trust score" fusing class,
currency and admission effect was rejected: it would have made the deny-only
property unprovable. Weakening `responseEvidence`'s `handlerState === 'PROVEN'`
requirement so generated operations could reuse the analyzer path was rejected
in favour of a separate, explicitly labelled `OPENAPI_RESPONSE_DEFINITION`
proof path. Adding `blueinternal/openapiv2` alongside it was rejected: that is
a REPOSITORY admission and belongs to C-05.

## D-107 — read-only proof is rooted at the resolved pipeline, and the count is reported

**Decision.** `PROVEN_READ_ONLY` is earned, per route, from the route's FULLY
RESOLVED middleware pipeline PLUS its handler, through a bounded effect
closure classified by a versioned data-only effect-kind vocabulary, and
requires at least one DECLARATION witness AND at least one EFFECT witness.
Membership in the eleven-row `PHASE5_API_CATALOG` grants nothing. The
resulting population is REPORTED, per repository and per effect kind; it is
never a threshold.

**Why.** The previous classifier (`surfaces.ts:186-192`) reduced the question
to "GET plus a `KNOWN_READ` catalog row", decided at parse time before any
handler, middleware or join had been read. D-79 already reproduced two
false-positive admissions from exactly that surface. The independent review's
F-01 then measured the deeper defect: Ripple attaches its middleware per route
group, so the pipeline is outside every handler closure, and
`MarketplaceSubscriptionMiddleware.__invoke` carries no method guard and
performs an outbound call on every request. A handler-rooted proof declares
such a route read-only while the request leaves the analysable region.

**Evidence and consequences.** Measured over the approved universe, the
`READ_ONLY_PROVEN` population fell from **5 to 0** across 814 operations with
zero truncation. All five were catalog-granted and two of them are the D-79
admissions. Of 223 `ripple-api` operations, 222 are now decided
`MUTATION_CAPABLE` — 79 disqualified solely by an outbound call, 72 by a data
write, 71 by a cache write — and exactly one route (`get:/version`, the only
route that opts out of `x-header`) is declared in the class form and so
resolves no handler join at all. 6,114 distinct unclassified callee identities
were reached; every proof that touches one is denied with
`CALLEE_CLASSIFICATION_INCOMPLETE`, so callee-classification coverage is a
measured, reported, promotion-blocking fact rather than an assumption. The 591
`alphauslabs/blueapi` operations have no effect analyzer at all and remain
single-witness: C-02a's generated-artifact route evidence grants no effect
proof.

A closure disqualified ONLY by an outbound call projects to
`CONDITIONAL_MUTATION`, not `PROVEN_MUTATION_CAPABLE`. Nightwatch proved the
request leaves the analysable region; it did not prove a write, and both
values deny identically downstream.

**Rejected alternatives.** Falling back to handler-only analysis when a
pipeline cannot be resolved was rejected — that is precisely the F-01 defect.
Binding `$this` across files to raise the count was rejected — that is
precisely the D-79 defect. Retaining the catalog as a corroborating witness
was rejected: a human judgement is not an independent witness to the source it
paraphrases. Treating an identifier the vocabulary does not name as a read was
rejected in favour of `UNCLASSIFIED`, so removing a write identifier can only
make closures ambiguous, never proven. A numeric `≥ 200` acceptance floor was
rejected outright: every mechanism that reduces the count is a mechanism an
implementer under quota is incentivised to weaken.

## D-108 — GitHub Actions now executes the gate, and that changes the CI verdict class

Exact-head run `33572572053` at `c3fed38abd281e8648c039ac3befe8034c13e868` is
the first Actions run that bootstrapped the runner and executed repository
code: checkout, Node 20 setup and `npm ci --ignore-scripts` all passed, and
`npm run gate:ci` ran to completion and emitted
`receipt:sha256:1a55a1e307541c094dcbfb3f`.

Decision: a run that reaches and executes the gate is EXECUTED CI, and a real
executed test failure is recorded as `CI_STATUS: EXECUTED_FAIL`. It is not
filed under the zero-step billing/platform classification of D-88.

The older zero-step runs (`33446473458`, `33361000650`, `32956612882`) remain
true statements about the runs they describe and are preserved verbatim. What
changed is that the zero-step classification stopped being the LIVE state
while remaining an accurate historical record. Live state and history are
different claims and are now kept separately.

Consequence: `PROJECT_STATE_CI_EVIDENCE_STALE` fails project-state validation
when the CI-evidence SHA is a strict ancestor of
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`. An observation taken before the baseline
advanced says nothing about the baseline in force now, and leaving it in place
is exactly how a stale classification outlives the run it described. Ancestry
is mechanically derivable offline, so this needs no GitHub contact.

## D-109 — a host capability is not a repository invariant

Both exact-head CI failures had the same shape: a test asserted a property of
the developer's machine as though it were a property of this repository. The
sibling Alphaus source root (`DEFAULT_SIBLING_ROOT`, an absolute path) and the
Bubblewrap binary are host-provided INPUTS that a checkout is not entitled to
assume. In both cases the PRODUCTION path was already correct and already
fail-closed; only the tests were wrong.

Decision: where a capability is host-provided, its suite asserts the
full-strength behaviour where the capability is present AND the fail-closed
behaviour where it is absent. The discriminator must be a value the system
under test reports — `l6ContainmentAvailability()`, the census operator's own
per-repository `SOURCE_UNAVAILABLE` status — never an environment variable and
never a host path probe. Nothing is skipped in either topology.

This is strictly stronger than what it replaces. Before this campaign nothing
asserted that an absent sibling root yields no census and no proven population,
or that an unavailable containment envelope is uniformly unproven and is
REFUSED by `assertL6RuntimeCapability`. Rejected alternatives: `test.skip` on
the runner (suppression, and it would hide a future regression permanently),
and installing Bubblewrap in the workflow (it would not remove the need for the
invariant, and it would make apt availability and the Ubuntu 24.04
unprivileged-userns policy inputs to CI greenness).

Because availability may legitimately differ, the receipt records WHICH lane
ran, and the gate REQUIRES the proven lane in `local`, `clean` and `predev`.
Availability is never authority: clearing the precondition grants nothing, and
proof still comes only from qualification plus assertion.

## D-110 — the clean gate cannot certify runner topology

`bin/quality-gate-clean.mjs` clones into `os.tmpdir()` and then runs the gate on
the SAME HOST. The sibling source root, `$HOME` and the Bubblewrap binary are
all still present, so it measures CHECKOUT CLEANLINESS, not environment
topology. That is why C-06 was certified green both locally and clean at
`7ce2cf9` and still failed on GitHub.

Decision: local and clean certification remain valid for what they measure and
are not weakened, but neither is evidence about runner topology. Exact-head
GitHub execution is the only authority for that class, which makes the
executable CI baseline a first-class deliverable rather than a nice-to-have.

A CI-topology clean gate — one that reproduces runner shape rather than
same-host cleanliness — is recorded as deferred follow-up work, not built here.

## D-111 — receipt diagnostics are allowlisted, and an unreached test is not a skipped test

The CI receipt could not say which two cases failed. `parseSafeDetails` keyed on
exactly one schema, so no Playwright-backed group could contribute detail at
all, and `parseCounts` had no pattern for Playwright's "did not run" output. The
receipt therefore reported 121 passed and 2 failed of a 128-test campaign, with
`skipped: null`, and five cases silently vanished from an authoritative record.

Decision: cases that were never reached are their own bucket, `didNotRun`,
never folded into `skipped`. A serial suite whose first case fails cascades the
rest into it, so conflating the two is precisely how coverage disappears
without trace.

Decision: `bin/lib/gate-receipt.mjs` is the only path by which anything a child
printed may reach a receipt, and its contract is ALLOWLISTING, not redaction.
Only integers, tracked `tests/**` paths with a line number, and fixed enum
tokens have any representation; a malformed value is DROPPED rather than
sanitized. Source contents, assertion values, secrets, customer data, raw
response bodies, environment values, credentials and arbitrary child stderr
cannot pass through by accident, and no raw output is ever persisted.

## D-112 — the production privacy boundary is an allowlisted structural projection, and object key names are data

The existing boundary is a denylist: `RedactionLayer` scrubs known-sensitive
headers, query parameters and registered secret values after observation (D-6),
and `assertPrivatePayload` sentinel-screens at the store. That is adequate for
DEV fixtures and wrong in KIND for production, where the sensitive material is
ordinary-looking business values — an account id, an invoice number, a cost
figure, a company name. A denylist cannot enumerate those.

Decision (C-10): the primary production boundary is an allowlisted structural
projection whose persistence API cannot accept a raw value. Redaction remains
defence in depth and is never the primary boundary. An `UNKNOWN` privacy
classification DENIES persistence.

Decision (F-14): an object KEY LITERAL is data, not metadata. In this domain
objects are routinely keyed by AWS account id, MSP id, billing-group id, payer
id or company name — Nightwatch's own `EMPTY_ARRAY_OR_STRING_KEYS` extractor
exists because dynamic string keys occur in Ripple responses. A key literal may
cross the production boundary ONLY as a proven member of a source-proven finite
key vocabulary carrying a provenance class and an `ev:sha256` provenance
digest. A syntactically ordinary field name is NOT proof, and a regular
expression over key names is never accepted as proof. An unproven key
contributes bounded cardinality and its value's structure only — never the
literal, and never a digest derived from it, because a digest over an
enumerable domain (a 12-digit account id, a `YYYYMM` period) is invertible by
enumeration and is not anonymization.

Decision: the Phase 9 DEV projection `nightwatch.semantic-projection.v1` is
RETAINED UNCHANGED as the DEV projection. It is load-bearing for Phase
9/9A.1/10/10A admission, `semanticStateEquals`, path-based expectations,
`TYPE_IN_SET` and the PHP row-key contracts. C-10 adds the versioned production
sibling `nightwatch.production-projection.v1` rather than rewriting it, and
re-scopes the DEV key-literal allowance in place as explicitly DEV-only.

## D-113 — two digest families, and no durable value digest at all

`design.md §6.2/§6.4` of the production-observability master plan specify a
digest "salted per-campaign, never persisted", while `§9.4` requires
cross-campaign structural comparison for new-deployment detection. Independent
review F-15 (with MA-11 and UA-11) identifies this as a direct internal
contradiction: both cannot hold with one family.

Decision: the master-plan text is SUPERSEDED, not silently contradicted. Per
the AGENTS.md precedence rule the disagreement is recorded here and in the C-10
OpenSpec change rather than reconciled in silence.

Decision: `prodstruct:sha256:<24>` is the STRUCTURAL family — computed only from
privacy-approved structural information (node types, shape, cardinality,
key-provenance classification and source-proven key literals), unsalted,
deterministic, stable across runs and environments, comparable across
campaigns, and persistable. It is safe precisely because the canonical bytes it
hashes contain no value and no unproven key literal. A NUMBER serializes as
type alone, so a monetary amount is indistinguishable from a count.

Decision: NO durable value-derived digest exists in the production persistence
contract. Nothing in C-10 required durable value correlation, so the concept is
REMOVED rather than invented, and the policy object records
`durableValueDigest: 'ABSENT'`. Correlation within one in-memory analysis uses
encounter-ORDER tokens that are never persisted and never digested, so there is
no salt to persist and no low-entropy value hash to invert. The two concepts
are type-distinct and the persistence firewall refuses the DEV `proj:sha256:`
family by name.

## D-114 — the production store is a separate root, and the Control Center is structurally excluded from it

`createFindingsAuthority()` defaults to `.nightwatch/findings`, so a separate
production store is not read today. Independent review F-18: that is correct by
ACCIDENT, not by construction. The Control Center is a localhost HTTP server
reachable by any local process, and `Host`/`Origin` validation is not an
authorization boundary against local software.

Decision: production findings live in `$HOME/.nightwatch/prod-findings/` — a
separate namespace with its own policy identity, mode 0700 directories and 0600
files, symlink refusal at every path component, repository and workspace
exclusion, atomic writes and bounded file counts. The DEV findings root is
never reused.

Decision: the Control Center findings authority may NEVER resolve the
production store, enforced by RESOLVED PATH EQUIVALENCE — `realpath` followed
by containment tested in both directions, so neither the production root nor
any ancestor of it can be handed to the authority — applied on every
construction route INCLUDING the test-only seam, so a seam cannot become
production authority. A hardening rule prevents reintroduction. Normal DEV
findings continue to work unchanged.

Decision: production page console text may never persist; the production cone
emits categorical console events with no field a page-provided string could
occupy. Production screenshots and Playwright traces are contract failures: the
versioned policy object cannot be constructed with either enabled. Policy
differences between DEV and production live in that one fail-closed capability
object, never as environment checks scattered through the code.

Decision (F-16): future request-parameter values are owner-supplied and stored
external-only; Nightwatch state holds an OPAQUE HANDLE and never the value, and
retained URL identity is a route template. C-10 supplies the privacy model,
validators and synthetic proof ONLY, and deliberately creates no production
request execution path.

Decision (DEF-C10-5): a retained route identity is a PROVEN MEMBER of a
source-proven finite route vocabulary, never a shape-matched string. Validating
`routeTemplate` with a regex alone accepted `GET /v1/accounts/481516234299`,
because a literal path segment and an account id are syntactically identical —
the same "regex is not proof" failure D-112 rules out for object keys. The
shape regex is retained only as a precondition on vocabulary contents.
Membership is enforced at construction, at the durable write (the store holds
the vocabulary; the firewall holds none and so verifies only that provenance
was recorded), and in the post-hoc persistence audit. Unlike a dynamic key a
route has no safe structural reduction, so unproven provenance denies
persistence outright.

C-10 completing does NOT authorize production observation. It creates the
privacy prerequisite for the later production kernel; the critical path remains
C-11 → C-12 → C-13 → C-14.

## D-115 — P1 observes an already-existing subject under its own scope chain, and L6 is replaced by a stated passive-cone invariant

Independent review F-13: C-11's request-issuance gates never execute for a P1
session that issues no request, "P1 issues no requests" (UA-8) is false for an
authenticated SPA, and an operator's already-loaded page cannot be placed in a
fresh rootless network namespace (T-13/RG-18). Canonical requirement E-16.

Decision: P1 authority is established by `nightwatch.p1-observation-scope.v1`,
a fifteen-gate NAMED ordered chain that admits observing an already-existing
subject without granting authority to create that subject or generate traffic.
The authorization class is `P1_OBSERVE` (distinct from C-11's `PROD_OBSERVE`),
the stage is pinned to `P1`, grants are one-shot and bound to the campaign,
the implementation SHA, and the PQ receipt digest, and the scope configuration
is external-only with an exact admitted host, a bounded window, and a private
evidence destination. The cone is `src/core/prodObserveP1/`, a sibling of the
C-11 cone; both directions of F-12 hold, so small pattern duplication replaces
imports between them.

Decision: the acceptance criterion is ZERO REQUESTS ATTRIBUTABLE TO NIGHTWATCH
with every observed request counted, not "Nightwatch's request builder was
unused". Attribution is four-class (`OPERATOR_PREEXISTING`,
`APPLICATION_AUTONOMOUS`, `NIGHTWATCH_ATTRIBUTABLE`, `UNKNOWN`) from
mechanical evidence; `NIGHTWATCH_ATTRIBUTABLE > 0` yields
`NIGHTWATCH_TRAFFIC_DETECTED`, `UNKNOWN > 0` yields `ATTRIBUTION_UNKNOWN`, and
zero samples remain blocked, never passing.

Decision (L6 option B): the network-namespace containment cannot apply to a
subject Nightwatch did not create, and declaring it "not applicable" silently
would be a waiver. The replacement invariant, recorded here deliberately with
its threat-model coverage, is: the cone cannot initiate traffic (no network
imports, import-graph proven) + cannot mutate the page (no actuation imports,
proven) + every observed request is counted and attributed + unknown fails
closed + scope/window/host are bounded + projection is mandatory. There is no
Nightwatch-originated egress to contain; what is contained instead is
authority (admission), causality (attribution), and evidence (projection). If
a future review shows this insufficient, the requirement returns to BLOCKED.

MA-8 completing does NOT authorize production observation. It creates the
architectural prerequisite the blocked C-12 attempt exposed; the critical path
remains C-11 → MA-8/F-13 → external/operator prerequisites → C-12 → C-13 →
C-14, with C-08b organizationally blocked throughout.

## D-116 — the finding handoff is a projection of the canonical dossier, and organizational classifications are recommendations or UNKNOWN

**Decision.** The Alphaus-compatible human-review artifact
(`nightwatch.alphaus-finding-handoff.v1`) is produced by pure projection
from the canonical `BugDossier`, never by a parallel finding model. Facts
are dossier-derived through closed vocabularies; severity, catch stage,
source, team, and report-type outputs are `{value, basis, provenance}`
recommendations or `UNKNOWN`. Team is type-level UNKNOWN at v1 and code
owner has no representation, because Nightwatch owns no evidence source for
either. Authority metadata is literal-typed so weakening breaks compilation.
No bounty-scoring field exists anywhere in the cone, enforced by test and by
`checkAlphausHandoffBoundary`.

**Rationale.** The dossier already carries sanitized facts, reproduction,
confidence, and privacy vectors; a second model would drift from it and
double the privacy surface. Organizational authority (final severity,
duplicate/genuine verdicts, team accounting, bounty arithmetic) belongs to
Leslie/human sign-off; Nightwatch's contribution is evidence with explicit
provenance, including the Slack-derived (pilot-sensitive, non-canonical)
Alphaus context recorded in
`docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md`, which must never harden into
claimed canonical policy.

**Consequences.** `src/core/alphausHandoff/` stays import-isolated (no
network/process/filesystem, browser, campaign, auth, P1, or C-11 edges; no
submission-connector or scoring capability patterns). Draft text is
sentinel-scanned in full, including fields the projection drops. The
16-probe mutation campaign (AH1-M01..M16, 0 survivors) and seeded property
suites are permanent.

**Phase applicability.** AH-1 and all later finding-handoff consumers.

## D-117 — C-12 readiness is evaluated locally from presented facts, and synthetic READY never implies live readiness

**Decision.** `nightwatch.c12-readiness.v1` evaluates ten BLOCKED_* codes
purely from caller-supplied descriptors with an injected clock: no browser,
no DNS/HTTP, no credential access, no authorization consumption. All
blockers report in one pass. INFERRED deployment facts block with an
explicit never-sufficient basis. The `bin/c12-preflight.mjs` CLI compiles
the cone fresh per run and prints only the report (exit 0 READY / 2
BLOCKED / 1 error). A synthetic READY proves the evaluator, never the
machine; the states `IMPLEMENTATION_REHEARSAL_PASS`,
`LIVE_PREREQUISITES_SATISFIED`, and `C12_AUTHORIZED` are distinct and must
never collapse.

**Rationale.** The four external prerequisites MA-8 named (operator subject,
admitted config, C-08b facts, runner provisioning) plus PQ binding,
authorization freshness, attribution, destination approval, and kill-switch
state must be checkable without touching production — otherwise the next
agent needs another exploratory campaign to begin safely, or worse, probes
production to answer "are we ready". The preflight cone duplicates two P1
literals rather than importing P1 machinery (MA-8 reverse-isolation),
pinned by unit test.

**Consequences.** `src/core/c12Readiness/` carries the same isolation rule
as D-116. The operator runbook (`docs/C12-OPERATOR-RUNBOOK.md`) owns the
prerequisite ledger and the placeholder-only checklist; real values are
never committed. C-12 remains NOT authorized and NOT begun.

**Phase applicability.** AH-1; any future C-12 authorization consumes this
contract but does not inherit AH-1 authority.

## D-118 — a dependency a test resolves is used, and stale node_modules is not evidence

**Context.** Campaign `nightwatch-unused-dep-removal-v1` removed the `vue`
devDependency as the sole dependency-audit finding, reporting "zero
references" and `npm audit` clean. The reference scan looked only for
import/`from` specifiers. `tests/unit/rippleReadiness.test.ts` reaches Vue
through `require.resolve('vue/dist/vue.js')`, which that scan did not see.
The break stayed invisible because the canonical checkout's `node_modules`
still held the removed package; the reported green regression and "clean
gate PASS" both ran against that residue. A fresh `npm ci` fails with
`Cannot find module 'vue/dist/vue.js'` (DEF-FC-03).

**Decision.** Restore `vue@2.6.12` as a devDependency at its exact prior
version. The test it serves is not incidental: it proves against real Vue
2.6.12 that mounting replaces the `#app` bootstrap target with the rendered
`.q-layout-container.layout` shell — the source-backed structural premise
of the entire Ripple readiness contract. Substituting a hand-written stub
would make that test assert only its own fixture.

**Rationale.** "Unused" is a claim about the whole reachable graph, not
about one syntactic form. A dependency that tracked source resolves at run
time is used by definition. Reaching zero advisories by deleting a package
the suite needs trades a real capability for a reporting number.

**Consequences.** The low-severity Vue 2 `parseHTML` ReDoS advisory
(GHSA-5j4c-8p2g-v4jx) returns and is accepted: the package is dev-only,
loaded in an offline Playwright page, and parses only a fixed local render
function — no untrusted HTML reaches it, and the only non-major fix is Vue
3, a breaking change to the fixture's whole point. `npm audit` therefore
reports 1 low advisory, not 0; any report claiming 0 is stale.
`checkDeclaredDependencyResolvability()` in `bin/hardening-check.mjs` now
fails closed when tracked source resolves an undeclared package, covering
`require.resolve`, dynamic `import()`, and `from` alike.

**Phase applicability.** FC-1 and every later dependency audit.

## D-119 — the review store is a schema over the existing no-replace primitive, not new storage

The campaign brief described a preferred atomicity: prepare bytes, validate,
write a temporary, fsync, atomic no-replace rename, verify. The repository
already had something stronger.
`PrivateArtifactStore.writeImmutableJson` publishes by `link(2)`, which is
atomic and fails `EEXIST` WITHOUT replacing, and it maps a filesystem that
cannot do that to `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` rather than
quietly falling back to a replacing rename.

So `src/core/reviewStore/` adds a schema, an identity and a read policy, and
opens no file itself. A second storage pattern would have been a second thing
to audit, a second set of crash semantics, and a second place for the
no-replace guarantee to be lost.

The same primitive is the concurrency arbiter, which is why there is no
read-then-write existence check anywhere in the store. Such a check is exactly
what a competing writer races.

## D-120 — a review is keyed by its binding, so a regenerated artifact never overwrites history

The review identity is the digest of the COMPLETE binding, not of the finding
id. A regenerated dossier changes `dossierDigest`, therefore the identity,
therefore the file. The earlier generation is never overwritten and remains
readable as STALE.

Keying on the finding id would have been simpler and wrong: a finding
reviewed, regenerated and reviewed again would have silently lost its first
receipt — the exact evidence a later reviewer would want.

Nothing is deleted automatically. A stale review is historical evidence, not
garbage, and the read path preferring current state is not a licence to remove
what it did not prefer.

## D-121 — discovery is a derived, recomputed key, and there is no index

A file name encodes a digest of the finding id purely so one directory listing
can serve a whole reviewer page. It is recomputed on every read and the
envelope is validated independently, so a renamed or forged name cannot make
bytes authoritative, and a read additionally refuses an envelope that belongs
to a different finding.

The consequence is that there is no index: nothing to corrupt, nothing to
rebuild, no staleness to detect. `§18`'s question — index or filesystem —
answered by measuring rather than by preference.

A second consequence is that path traversal is structurally impossible rather
than defended against. Every name the store produces is hex, so a path-shaped
finding id — which the lifecycle's id vocabulary legitimately permits — never
reaches the filesystem as a path. Narrowing that vocabulary would have been a
change to review semantics this cone does not own.

## D-122 — dossier identity is carried, and no dossier schema changes

The expectation and semantic-contract identities the reviewer surface reported
as absent already existed: `SemanticTriageEvidence.expectationId` and
`.invariantDefinitionId`, mechanically established through the Phase 9A.1
admission bridge and privacy-validated at construction. The Control Center
projection simply dropped them.

So this is propagation, and no versioned dossier contract is touched. v2
carries the identity; v1 does not and keeps `null`; `null` still means
UNKNOWN. Nothing is derived from prose, and nothing is inferred from severity,
route, title or fingerprint.

The projection applies BOTH the safe-id pattern and the canonical sentinel
screen, because either alone is insufficient: the id pattern accepts
`CUSTOMER_SENTINEL`, which is a valid identifier shape and an invalid thing to
project, and the sentinel screen accepts a path-shaped value. The projection
can only drop an identity, never invent or repair one.

No classifier rule was loosened to benefit from this. Measured on a permanent
synthetic corpus, duplicate suggestions — the strongest claim the surface
makes — were unchanged at 146, while 74 `RELATED_FINDING` refined to
`SHARED_DEFECT_CLASS` and 37 `PROBABLE_DUPLICATE` to `EXACT_SAME_FINDING`.
The most valuable effect is in the counterevidence direction: a pair sharing a
fingerprint but carrying different expectations moved from "I do not know" to
"these genuinely differ".

## D-123 — the read and write paths derive the review binding from ONE seam

`createControlCenterServices` builds the reviewer collector and the review
write handler together, over a single authority-snapshot read.

This is not a style preference. The first implementation built them
separately, and the write handler read the campaign snapshot raw while the
read path took it through validation with a fallback to an unavailable
snapshot. Both halves were individually correct. Together they could derive a
different campaign id for the same state — and since the campaign id is part
of the binding, EVERY write would then be refused as `BINDING_MISMATCH`, with
the reviewer given no way to tell that the refusal came from the server
disagreeing with itself.

No unit test found it, because each half was right. The browser workflow found
it on its first run. Deriving the binding context twice is now structurally
impossible rather than merely discouraged, and hardening refuses a collector
that reaches a binding digest primitive of its own.

## D-124 — a hardening rule is not evidence; the rule failing on a real mutation is

Three consecutive campaigns produced the same defect shape: a check exists and
does not prove what it claims. DEF-FC-04 read structured fields while the
prose beside them drifted. R-12 enforced registration through six hand-written
loops, three of which were never written. The `includes(literal)` trap passed
because one safe occurrence existed while another line went unsafe.

So every rule added for the review-store boundary is paired with a mutation of
the REAL guarded file, running the REAL check, asserting the SPECIFIC failure,
and restoring the exact bytes. The harness found two defects in its own
campaign before it was finished: one rule reported the WRONG violation because
its body-extraction anchor was fragile, and one mutation SURVIVED correctly
because it only added an unused import — which caused the rule to be widened
and the mutation split in two.

The behavioural mutation campaign is kept separate from the structural one on
the same reasoning: a guard only a regex notices disappears the moment
someone rewrites the code in a shape the regex does not recognize.

## D-125 — a persistence regression guard is a call count, not a latency bound

Measuring the served reviewer page at 1k/5k/10k against 0/10/50/100% reviewed
stores found a real regression: the page lookup grew with the STORE rather
than with the page, because the store directory was listed once per finding.
At 10,000 reviews a fifty-row page spent 325 ms scanning half a million
directory entries — the exact shape the predecessor's page-scoping removed
from the intelligence path, reintroduced through persistence. One
request-scoped listing brought it to 3.45 ms.

The durable guard against its return is deliberately NOT a latency bound. A
latency bound on a shared machine is a flake generator, and a flake that gets
retried away is worse than no bound at all. It is a deterministic assertion
that a forty-row page costs exactly ONE directory read, with a control proving
the same page costs eight without the listing so the assertion cannot pass
vacuously.
