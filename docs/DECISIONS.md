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
|---|---|
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
`36495b4df2c013d671a4983cd7991e1aecd9a25e`; the real local acceptance run
(plan `adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`,
result `adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`)
confirmed the canonical adopted-case catalog, its digest, and `git status`
were byte-for-byte unchanged before and after.

**Phase applicability.** Phase 8B and any future Phase 8B.1 (Owner-Gated
Canonical Promotion) design, which remains `NOT_STARTED`/`NOT_AUTHORIZED`
and must consume this phase's plan/result identity rather than re-deriving
adoption semantics. Phase 8 remains `IN_PROGRESS`.
