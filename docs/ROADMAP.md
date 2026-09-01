# Nightwatch Roadmap

Phase plan for Nightwatch, a private, local, autonomous bug-hunting
framework for Alphaus products. Every phase lists its goal, key
deliverables, explicit non-goals/exclusions, and dependencies. Phases 4–8
reference capabilities defined in `NIGHTWATCH_RECON_B.md` (cited by ID);
their scope is bounded by the mission's DO-NOT-IMPLEMENT list — production
writes are never in scope in any phase.

Cross-cutting rule for every phase: **read-only over Alphaus repos and the
data plane** unless a phase explicitly whitelists a mutation class against a
sandbox MSP (RECON_B §8), and every code-derived assumption carries
provenance (repo @ SHA, D-12).

## Cross-cutting planner/executor truth (current)

The local campaign lifecycle is guarded by the versioned handoff header in
`.agent/EXECUTION_PROMPT.md`. READY planning state remains distinct from
active continuity-v2 task state; IN_PROGRESS, BLOCKED, and COMPLETE bind to
the active campaign task. `npm run handoff:check` validates the exact OpenSpec
route, tracked regular files, Git baseline/branch, and task binding. The
strict project-state v2 block admits only owned or mechanically derived
fields, including separate promotion lifecycle and effective-authority
values. The required quality gate runs handoff truth once before project and
agent continuity; this adds no product, data, infrastructure, or external
execution authority.

---

## Phase 0/1 — Scaffold, safety kernel, passive Ripple observer

**Goal.** Stand up the safety kernel and a minimal runnable pipeline that
proves the fail-closed model end to end: a passive Ripple journey against a
fully offline fixture, with policy-enforced request inspection, redacted
deterministic evidence, and self-tests proving every safety guarantee.

**Key deliverables.**

- Fail-closed environment selection (`src/core/environment`); config files
  for `local`/`dev`/`next` with provenance-labeled allowlists;
  `production.json` as the documented rejected surface.
- Safety kernel: explicit host tables, `OutboundPolicy.decide` rule chain,
  startup canary (zero network), passive action policy
  (`RIPPLE_MUTATION_PATTERNS`), `RedactionLayer`.
- Read-only repo snapshotter (`src/core/repositories/snapshotter.ts`).
- Playwright harness: browser context (system Chrome via channel),
  `context.route('**/*')` request inspection, console/pageerror/requestfailed
  observers, stability wait.
- Generic passive protocol oracles (uncaught page errors, console errors,
  unexpected failed requests, unexpected production/unknown-host requests,
  malformed JSON/NDJSON, navigation failure, stability timeout).
- Evidence recorder: `artifacts/<run-id>/{manifest.json, events.jsonl,
  network.jsonl, console.jsonl, repositories.json, summary.json,
  screenshots/}`, injected clock, run-id override.
- Ripple product config (candidate passive routes) and
  `scenarios/ripple/local.smoke.ts` against the built-in fixture app.
- Self-tests: `tests/unit` (policy, redaction, action policy, environment,
  snapshot read-only, determinism) and `tests/smoke` (offline scenario,
  planted-secret absence, reproducible run, offline canary).

**Non-goals / exclusions.** `production` environment; any mutation; real
dev/next journeys; authenticated runs with tracing; API/oops subprocesses;
data oracles; generative exploration; AI assistance; autonomous
self-development.

**Dependencies.** None (foundation). Verified grounding: RECON_B §4 E1–E10
(hazard table) and the host provenance cited in `docs/SAFETY_MODEL.md` §3.

---

## Phase 1.1 — Safety hardening: browser containment layers (complete)

**Goal.** Close every gap between "the policy decides" and "nothing leaves
the browser" across the full surface a real browser exposes — WebSockets,
workers, redirects, downloads, popups, EventSource — and make
authenticated runs safe by construction. Empirically verified on
Playwright 1.62.1 + system Chrome. Explicit exclusion: **no real dev/next
sessions** in this phase.

**Key deliverables.**

- Containment layers L0–L4 in the browser harness
  (`src/browser/context.ts`,
  `src/browser/observers/networkObserver.ts`,
  `src/browser/network/fetchGuard.ts`): raw-CDP `Fetch.enable` guard
  per page (L0 — pauses every request incl. redirect follow-ups,
  fails denied/telemetry URLs before network I/O), `context.route('**/*')`
  (L1),
  `context.routeWebSocket('**/*')` (L2), `serviceWorkers: 'block'` +
  Service Worker / SharedWorker API stubs + `serviceworker` alarm (L3),
  unrouted-request detection (150 ms grace, `blockedUrls` dedupe) +
  download record/cancel (L4).
- WebSocket policy with semantics identical to HTTP (`ws:`/`wss:` in
  `NETWORK_PROTOCOLS`); telemetry WS closed, not failed; denied WS closed
  - hard failure before communication.
- Storage-state secret rules — fail-closed validation
  (`src/browser/fixtures/storageState.ts`: absolute path, external
  location, readable regular file, ≤ 5 MB, `{cookies, origins}` shape) —
  and `.gitignore` hardening with auth/session filename patterns.
- Authenticated trace policy: traces always off with auth state; the
  manifest records `trace.enabled=false` + reason.
- Network-surface regression suite: `tests/smoke/safety.smoke.ts`,
  `tests/smoke/authenticated.smoke.ts`, `tests/unit/storageState.test.ts`,
  WebSocket policy tests in `tests/unit/safety.test.ts`.
- Recon archive: `docs/recon/README.md` — RECON_B present; RECON_A/C/D
  handoff summaries (originals still to be located).
- Second containment layer (L5) design: allowlist filtering proxy / Docker
  network isolation — design only in 1.1 (D-22, SAFETY_MODEL §13).

**Non-goals / exclusions.** Real dev/next sessions (Phase 2, gated on
the complete Phase 1.2 acceptance report); any change to the mutation boundary (Phase 1 blocked classes stay
blocked); `production`; authenticated traces.

**Dependencies.** Phase 0/1 harness and safety kernel. Verified grounding:
empirical containment verification on Playwright 1.62.1 + system Chrome
(documented in `docs/SAFETY_MODEL.md` §9–§11) and DECISIONS D-15–D-22.

---

## Phase 1.2 — Out-of-process egress containment (complete)

**Goal.** Add an independent local L5 egress boundary so a browser escape
must defeat both the Playwright safety kernel and the outer proxy before any
external destination can receive a connection. The completed resolved-egress
hardening makes hostname authorization necessary but insufficient: every
allowlisted hostname must produce a bounded, policy-acceptable complete
resolved-address set, and every protocol must dial the exact admitted numeric
destination. Phase 2 product testing is not part of this phase.

**Key deliverables.**

- Fail-closed loopback proxy in `src/proxy/server.ts`: normal HTTP forward
  traffic, HTTPS/WSS CONNECT, and WebSocket HTTP Upgrade; denied/unknown and
  malformed destinations are rejected before resolution/TCP; no TLS MITM.
- Pure numeric IPv4/IPv6 address classification and a bounded internal
  resolver seam (`src/proxy/addressPolicy.ts`, `src/proxy/resolver.ts`): local
  admits only exact `127.0.0.1`/`::1`; `dev`/`next` external targets require
  global-unicast answers; the complete set is checked before selection, with
  malformed, mixed, empty, oversized, mapped, and unsafe answers denied.
- Shared exact-address binding for HTTP, CONNECT, and WebSocket Upgrade:
  numeric address/family is passed to the connector, original Host/authority
  semantics are retained, and no uncontrolled second DNS resolution occurs.
- `src/proxy/policyAdapter.ts` delegates to the canonical
  `OutboundPolicy.decide()`; browser HTTP/WS consumers use named adapters and
  the policy-consistency matrix fails on drift.
- Playwright global setup starts and health-checks the proxy; browser launch
  receives an explicit proxy and `--proxy-bypass-list=<-loopback>`; no
  environment-variable-only or continue-without-proxy path exists.
- Sanitized proxy events, per-run `proxy.jsonl`, manifest
  `networkContainment`, and schema-v2 `summary.json.proxy` aggregates;
  policy authorization, resolution, connection, and coverage are separate;
  containment violations and event-write failures are hard failures while
  telemetry is blocked-not-failed.
- Runtime state and the real-run gate require the containment, resolved-address,
  and exact-binding identities; old or malformed state cannot authorize a run.
- Synthetic A/B loopback fixtures prove allowed A works and denied B receives
  zero connections through HTTP, redirect, popup, SharedWorker, Service
  Worker, WebSocket, and CONNECT paths.
- Chromium non-HTTP review: QUIC disabled, non-proxied WebRTC UDP disabled,
  background/speculative options applied where supported; DNS prefetch remains
  explicitly **UNRESOLVED**.

**Non-goals / exclusions.** No real Alphaus session, dev/next product
testing, production contact, database query, mutation, privileged firewall,
root requirement, system-wide proxy change, TLS MITM, or full container.

**Acceptance evidence.** `tests/unit/proxy.test.ts` and
`tests/smoke/proxy.smoke.ts`, plus all pre-existing Phase 1/1.1 suites. The
future L6 container/network namespace remains a prerequisite for broader
non-browser subprocess coverage.

---

## Phase 1.3 — Durable agent continuity / execution-state protocol (complete)

**Goal.** Make long-running Nightwatch development recoverable across fresh
sessions, context compaction, interruption, and agent restart without relying
on conversational/model memory.

**Key deliverables.**

- Permanent `AGENTS.md` contract for bootstrap, source precedence,
  no-rediscovery, repository boundaries, checkpoints, validation, recovery,
  scope, secrets, and completion handoff.
- Two-level memory protocol: project memory under `docs/`; active task memory
  under `.agent/`, routed by `ACTIVE_TASK.md` and checkpointed in `STATE.md`.
- Living ExecPlan contract, current Phase 1.3 SPEC/PLAN/STATE/REPORT, and
  reusable templates for future tasks.
- Small local `npm run agent:check` validator with synthetic tests for valid,
  missing, malformed, mismatched, stale, incomplete, and secret-like state.

**Non-goals / exclusions.** No real Alphaus environment or product testing,
database access, production mutation, autonomous exploration, Phase 2 work,
DeepSeek, oops integration, change-directed selection, or Docker L6
containment. No Alphaus repository is modified.

**Dependencies.** Phase 1.2 handoff and the existing local TypeScript/
Playwright test toolchain. The protocol is documentation-first; the validator
is only a deterministic consistency guard.

**Acceptance evidence.** The Phase 1.3 task report, `npm run agent:check`, the
validator unit tests, and the unchanged full Nightwatch regression suite.

---

## Phase 2 — Deterministic browser journeys against real Ripple

**Goal.** Extend the Phase 1 harness from the fixture to real local/dev/next
Ripple deployments with deterministic, read-only, configurable journeys.

**Key deliverables.**

- Real-app journey configs per environment (`--ui-url` against local dev
  servers; dev/next against the allowlisted hosts).
- Route re-verification: the candidate route list in
  `src/products/ripple/config.ts` is currently fixture-relative; Phase 2
  re-verifies exact ripple-ui route paths against the real app
  (`ripple-ui @ d80b161b` and later).
- Journey surface from the Phase 0/1 candidates: dashboard, invoice list,
  invoice detail, billing-group list (detail views only — settings forms
  remain out of scope).
- Session/cookie hygiene hardening: no cookie injection; storage-state
  path-only loading; authenticated runs keep traces off.
- Env-variable injection for MFEs under test (`VITE_BLUEAPI_BASE_URL` /
  `BLUE_API_BASE_URL`, fail-closed, fail-no-prod) — the request policy
  backstops it (RECON_B E2 mitigation).

**Non-goals / exclusions.** Mutations (all Phase 1 blocked classes remain
blocked); login/auth-flow automation; tracing with auth state; production.

**Prerequisite gate.** The Phase 1.2 L5 proxy must remain mandatory and green
before the first real dev/next session. The browser-internal stack alone
(L0–L4) is not sufficient. A future L6 restricted container/network
namespace is additionally required before Nightwatch controls non-browser
subprocesses such as `oops` or CLIs.

**Dependencies.** Phase 0/1 + 1.1 harness, safety kernel, snapshotter
(journey runs record repo state for later correlation); the `docs/recon/`
archive as input (RECON_A/C/D originals still to be located — only
handoff summaries are archived; locate and archive the originals before
finalizing Phase 2 journey scope).

### Phase 2A — Controlled authenticated landing observation (complete)

Phase 2A closed on 2026-08-12. It used the canonical DEV Ripple entry,
fresh human authentication, boolean-only page-readable auth proof, the strict
13/13 gate, one passive first observation, and one completely fresh-context
replay. Both runs naturally resolved to `/ripple/dashboard`, rendered the
source-backed QLayout shell, and maintained the required 750 ms structural
stability interval. The first run stabilized at 834 ms and the replay at
766 ms.

The existing proxy, browser guards, passive-action registry, metadata-first
evidence policy, trace-off policy, and production/unknown fail-closed rules
remained unchanged. Both runs had zero production attempts, proxy violations,
unresolved destinations, unknown approvals, mutations, and DB queries. The
sanitized comparison records non-fatal request/timing variation and a
reviewed blocked browser-background event; it does not change the shared
authenticated route/readiness/safety result. No third replay was performed.

### Phase 2B — Three deterministic read-only Ripple journeys (deferred)

This is the recommended next task. It was not started as part of Phase 2A.

---

## Phase 3 — Change intelligence

**Goal.** Make Nightwatch aware of the code it is testing: repo freshness,
provenance of every code-derived assumption, and change-directed scenario
generation.

**Key deliverables.**

- Freshness canary on the snapshotter: ahead/behind vs upstream feeds
  warnings ("`ouchan` local HEAD is 19 commits behind origin/master") and
  triggers re-verification of assumptions before use (RECON_B §3 — the
  canary everything depends on).
- Code-derived assumption registry: every host fact, route path, and
  behavior table cites repo @ SHA (D-12), with a checker that re-verifies
  citations against current HEADs and flags drift.
- Change-directed scenario generation: diff a tracked repo (e.g. ripple-ui
  commit) → select/extend affected candidate routes and oracle checks.
- Static env-lint sweep: scan Alphaus repos for newly added
  `https://api.alphaus.cloud` / `*.run.app` references without an adjacent
  env-switch (RECON_B §4 mitigation; 4 sites known today).

**Non-goals / exclusions.** Auto-updating repos or fetching on Nightwatch's
behalf (snapshotter stays read-only; fetch is a manual, explicit step);
producing findings (still a Phase 5+ ladder matter).

**Dependencies.** Phase 2 journeys (change direction needs a journey
surface); snapshotter.

---

## Phase 4 — Generative / model exploration (bounded)

**Goal.** Generate requests from contracts, not from the UI: schema-validated
messages constructed from blueapi/blueinternal protos, run only against a
dedicated sandbox MSP in dev/next, behind the isolation gate.

**Key deliverables.**

- Contract-driven request builder from proto JSON (RECON_B §5: Blue API
  protos, `apidocs.swagger.json` 462 paths).
- NDJSON stream client for Connect/REST surfaces (envelope assertions per
  RECON_B §5/H8).
- Bounded mutation whitelist per scenario with mandatory read-back (S1);
  create/list/get/update/delete chains only against the sandbox MSP — never
  prod or seed data (RECON_B §8).
- Schema validation before anything hits the wire (malformed requests
  eliminated locally).

**Non-goals / exclusions.** Unbounded fuzzing; any request toward
production or prod-side tables; internal gRPC surfaces (`tucpd`, `iamd`,
`import-curs` — RECON_B §8, HIGH risk, NEVER auto).

**Dependencies.** Phase 2/3; `alphauslabs/blueapi` protos (local `protos/`
submodule must be initialized — RECON_B §2.2).

---

## Phase 5 — API/oops integration and the confirmation ladder

**Goal.** Turn observations into confirmed findings using out-of-band
replay and the L0–L5 confirmation ladder from RECON_B §11.

**Key deliverables.**

- Go subprocess runner: `bluectl`, `tucp`, `iam` with hard requirements —
  explicit `--env dev|next`, `RunEnv != "prod"` verified before dial
  (E5/E9), no default flags trusted.
- `bluectl --raw-input` replay of captured request sequences (RECON_B §5).
- Ladder enforcement: L1 deterministic replay, L2 repeated (≥3) replay
  with varied sessions, L3 API/state contradiction, L4 read-only datastore
  probe (narrow PK/SK only), L5 source/change correlation (needs Phase 3
  freshness). Bar for tracking: ≥L2; bar for filing: ≥L3 (RECON_B §11).
- Evidence bundle generator matching RECON_B §12 (trigger log, network
  capture, replay verification, probe outputs, contract evidence, ladder
  level).

**Non-goals / exclusions.** Any prod dial; internal-service mutations
(tucp invoice start `--force`, iamd authorize, import-curs — NEVER auto);
writing to the tracker (still human-gated).

**Dependencies.** Phase 3 freshness (L5 correlation); Phase 4 contract
surface (replay sources).

---

## Phase 6 — Read-only data oracles (FROZEN BY OWNER; HISTORICAL ONLY)

**Historical intent (not an active goal).** Add the strongest oracle class:
store-vs-store equality checks that could prove "actual wrong" at L3–L4
(RECON_B §1.2, §6.2–6.3). The owner has frozen this entire infrastructure and
data-layer expansion; the implementation is retained only for local synthetic
compatibility and historical traceability.

**Key deliverables.**

- Oracle catalog implementation for code-supported invariants (RECON_B §7):
  REPORTS ≡ BQ `tu_` mirror equality (I-TU3), `awsdaily2` vs
  `awsdaily2_snapshots` settled-month equality (I-TU4), `ripple_insight` vs
  `RIPPLE_INVOICES` totals (S3/T1), invoice header vs detail chunks (I-INV2),
  RIPPLE_INVOICES_PREVIEW dead-threshold (I-TU5), FX dirty-data probes
  (I-FX2).
- Execution only through the read-only wrappers (`alphaus-tools/bin/`
  `bq-ro`, `dynamo-ro`, `spanner-ro` or their MCP equivalents), narrow
  PK/SK queries only; the do-not-scan tables (REPORTS, RIPPLE_FEES,
  RIPPLE_INVOICES, TAGS, UNBLENDED_EXPORT) are never scanned.

**Non-goals / exclusions.** Any write path; scans of large tables; schema
migrations; oracles for UNRESOLVED invariants (RECON_B §14) until code
evidence exists.

**Dependencies.** Phase 5 ladder (data probes are L4 evidence); Phase 3
freshness; wrapper availability.

**Owner decision (2026-08-13).** `PHASE_6_STATUS: FROZEN_BY_OWNER` because
`INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`. The prior runtime/datastore
mapping blocker is superseded by owner scope; this is not complete, failed, or
waiting for an external handoff. Phase 6 types, validators, comparators,
privacy models, source lineage, catalogs, and synthetic tests remain useful
local abstractions and are preserved. Real datastore execution and all L4
claims are permanently out of scope. The six-query historical budget remains
unused. Nightwatch must not request deployment metadata or perform GCP/GKE,
Kubernetes, AWS infrastructure, DynamoDB, BigQuery, Spanner, production SQL,
or datastore metadata investigation.

The Phase 6 real-query path is quarantined by executable owner policy and
returns `OWNER_POLICY_BLOCKED` before an external invocation. No external
action is required to advance the roadmap.

## Private evidence minimization + autonomous triage (active)

**Goal.** Turn a long local DEV browser/API run into the smallest reproducible,
sanitized, useful bug dossier without infrastructure access or another human
in the loop.

**Key deliverables.**

- Deterministic bounded subsequence minimization over only original safe action
  IDs, with explicit `1-MINIMAL`/`BOUNDED_MINIMAL` guarantees and real-DEV
  replay budgets.
- Stable sanitized anomaly clustering and duplicate suppression; browser/API
  differential; Phase 3 direct/shared/transitive source-change candidates;
  conservative app-layer fault-boundary and categorical confidence models.
- Versioned `nightwatch.bug-dossier.private.v1` dossiers, human reproduction
  recipes, deterministic AI-ready packages, overnight summaries, morning
  briefs, and a durable Nightwatch false-positive catalog.
- Owner-only atomic local storage outside the repository by default. No
  automatic Slack, GitHub, Jira, Linear, email, Drive, Notion, upload, PR, or
  customer response path.

**Non-goals / exclusions.** All infrastructure/deployment/cloud/datastore
work, production or staging testing, mutations, arbitrary exploration,
credential persistence, authenticated screenshots/traces, LLM execution, and
external disclosure.

**Dependencies.** Closed Phase 2C/3/4/5 evidence contracts and existing
Playwright/proxy/safe-action containment. No coworker, platform-owner,
deployment-owner, SRE, or database-owner handoff is required.

**Task route.** `.agent/tasks/private-evidence-minimization-and-triage/`.

---

## Phase 7 — Private autonomous nightly campaigns (complete; historical auth block preserved; DEV auth ready)

Phase 7 coordinates the existing trusted selector, journey, safe exploration,
restricted API, replay/oracle, clustering, bounded minimization, private
dossier, and morning-brief primitives under
`nightwatch.campaign.private.v1`. It is local, private, DEV-only, read-only at
product level, deterministic, checkpointed, and fail-closed. Its explicit
modes are `CHANGE_DIRECTED`, `BASELINE_HEALTH`, `COVERAGE_EXPANSION`,
`REPRODUCTION_ONLY`, and `LOCAL_SYNTHETIC`.

The implementation and synthetic matrix are complete. The single historical
bounded real campaign created an owner-only manifest/checkpoint but stopped at
`PARTIAL_AUTH_BLOCKED` before product work because the designated external DEV
auth state was not page-valid and guarded MFA refresh could not complete. No
alternative credentials were used and that manifest is immutable. The same
existing guarded auth system later completed one bounded refresh with no MFA
step, and fresh page-valid DEV status passed. The real launcher now requires a
two-step `--prepare-only` manifest/checkpoint freeze followed by an explicit
`--resume-campaign=<id>` execution, so the readiness state can be pushed before
product work. The final current-version manifest was frozen at ordinal zero;
the earlier provisional manifest was never executed. The old auth-blocked
manifest was never resumed across a Nightwatch source-version change. The one
permitted current campaign completed all 9 work items, recorded 7 sanitized
observations across 4 clusters, admitted no product finding, and finalized at
the bounded `BUDGET_EXHAUSTED` stop with a READY no-findings brief. Full
validation and architecture/adversarial review passed. Phase 6 remains
permanently
`FROZEN_BY_OWNER`/`OUT_OF_SCOPE_BY_OWNER`.

## Phase 7B — Bounded private AI review assistance (complete)

**Goal.** Use an optional local model as a *review assistant*, not a
decision-maker, over already-sanitized deterministic evidence. Phase 7B is
complete as a private, offline-first companion-artifact boundary.

**Key deliverables.**

- Strict runtime input/output DTOs reuse the existing
  `nightwatch.ai-ready-evidence.private.v1` package and admit bug drafts only
  for L2/L3 evidence.
- A deterministic synthetic provider covers valid, malformed, oversized,
  prompt-injection, hallucination, privacy, timeout, and control-request
  cases. The optional adapter accepts only an explicit HTTP loopback endpoint,
  with bounded request/response/timeout and no credentials, redirects, proxy,
  tools, or cloud fallback.
- Bug drafts use `nightwatch.ai-bug-draft.private.v1`; oracle suggestions use
  `nightwatch.ai-oracle-suggestion.private.v1`; human decisions use
  `nightwatch.ai-human-review.private.v1`. All are owner-only private
  companion artifacts with visible AI provenance and human-review gating.
- Phase 3 change input is structural (paths, relations, journey/API links,
  source relevance, snapshots, and coverage classes), not a source dump or
  arbitrary diff. Oracle suggestions are conceptual and cannot register,
  execute, or generate an oracle.
- Offline `hardening:check`, CI, campaign-isolation, oracle-isolation,
  staleness, reference-integrity, privacy, owner-scope, loopback, and full
  Playwright validation preserve deterministic Nightwatch authority.

**Non-goals / exclusions.** Autonomous filing (L3+ gate stays); model-driven
mutation choices; unbounded exploration budgets; cloud providers; real model
downloads; campaign auto-hooks; product/browser/API/database/infrastructure
operations; publication; Git writes; source modification; and Phase 8.

**Dependencies.** The private deterministic dossier layer above; any future AI
remains a review assistant and never an oracle. No Phase 6 datastore work is a
prerequisite or recommendation. Runtime AI artifacts remain outside Git under
the owner-only private findings store.

---

## Phase 7B.1 — AI review authority hardening (complete)

This narrow descendant preserves historical Phase 7B as `COMPLETE` while
closing its implementation-review findings. The validated implementation
checkpoint is `40e59ecf6209dac7ef88ac2af0bcef781562a837`.

**Key deliverables.**

- `AiReviewSession` is the single supported provider-execution authority;
  raw low-level functions, direct provider methods, campaign hooks, and
  automatic session factories are absent. Offline hardening checks the public
  exports and source-derived provider call graph.
- Candidate/oracle request attempts remain independently bounded at three;
  actual provider exposure is a shared three-call budget reserved
  synchronously immediately before the private handler boundary. Invalid,
  disabled, and non-local requests consume attempts but not provider calls;
  provider failures and output/storage rejection after entry consume calls.
- Generated bug/oracle artifacts use immutable v2 unreviewed-only schemas.
  Separate exact-key owner review records carry deterministic identity,
  artifact schema and full-artifact digest binding, owner provenance, and
  publication prohibition. Effective approval requires the record, digest
  match, and fresh deterministic input; forged status, changed artifacts,
  mismatched records, conflicts, stale input, corruption, and unverified v1
  status cannot create current approval.
- Synthetic/loopback tests cover direct bypass, mixed/concurrent budgets,
  accounting, provider failures, model self-approval, renderer/storage
  authority, review provenance, legacy compatibility, and oracle/catalog
  isolation. Current focused matrix is 54/54; synthetic campaign is 27/27;
  full Playwright is 453/453.

**Non-goals / exclusions.** No owner review CLI, real model, cloud provider,
real campaign, auth capture, product traffic, database/infrastructure work,
publication, source modification by AI, or Phase 8 functionality.

### Phase 7B.1.1 — Runtime deadline and continuity semantics closeout (complete)

This narrow local/static/synthetic hardening descendant is complete; it was not
a new AI capability milestone and was not Phase 8. It closes the aggregate provider-work
deadline gap with a monotonic construction-time session budget, effective
remaining-time caps, active `AbortSignal` cancellation through the private
provider boundary, loopback transport destruction, and synthetic PENDING
cleanup. It also replaces self-referential task SHA semantics with stable
validated implementation/substantive/documentation anchors while live local
and remote HEAD come from Git.

Validation passed for the monotonic deadline, active provider cancellation,
loopback/synthetic cleanup, continuity ancestry/role semantics, full local
tests, and an isolated clean checkout. The task remains synthetic/loopback-
fixture-only: no real model, product traffic, campaign, authentication,
database, infrastructure, publication, owner-review CLI, or Phase 8 work was
used. Phase 7B.1 remains a complete historical predecessor and Phase 8 remains
`NOT_STARTED`.

### Phase 7B.1.2 — Final integrity closeout (complete)

This final local/static/synthetic descendant closed the remaining provider-call
accounting and continuity-role gaps without adding AI capability. The stable
implementation/substantive checkpoint is
`257cc294850344149fd4c5b657beeff07e511c91`.

**Key deliverables.**

- The provider boundary performs final monotonic runtime and shared-cap
  admission, then increments `providerCalls` immediately before the private
  registered-handler call in the same synchronous stack. A final deadline
  expiry cannot consume a call; handler-entry failures consume it and are not
  refunded.
- The read-only continuity validator proves the role of the claimed commit
  itself, validates `STARTING_SHA` ancestry and ACTIVE_TASK/STATE agreement,
  rejects same-value documentation role forgery and ambiguous merge claims,
  and preserves carried-forward implementation anchors.
- Private hardening CI independently executes the serialized synthetic
  agent-state matrix with full Git history and read-only contents permission.

**Validation.** AI/loopback `64/64`, continuity `32/32`, synthetic campaign
`27/27`, full Playwright `481/481`, typecheck, hardening, privacy, agent check,
diff check, isolated clean checkout, and the exact final GitHub Actions run
passed. Phase 7B.1 remains historical `COMPLETE`, Phase 6 remains
`FROZEN_BY_OWNER`, and Phase 8 remains `NOT_STARTED`.

## Phase 7B.2 — Private owner-review CLI (complete)

This narrow local/static/synthetic milestone adds a human-gated terminal
interface over immutable Phase 7B v2 artifacts. It does not increase AI
authority and is not Phase 8. The validated implementation/substantive
checkpoint is `b26e6c30c1ae08e668ed718eea53d6f799bead59`; documentation is a
separate checkpoint descendant.

**Key deliverables.**

- `npm run ai:owner-review` supports only exact-ID `show`, concise `status`,
  interactive `decide`, and help for `bug` and `oracle` artifacts. It never
  enumerates the private findings root and has no raw JSON, export, editor,
  pager, clipboard, provider, model, root, network, Git, or publication mode.
- A provider-free owner-review service validates persisted artifact and review
  identities, renders deterministic metadata separately from sanitized
  `[AI]` prose, marks the display
  `SNAPSHOT_ONLY_NOT_REEVALUATED`, and uses the existing digest/projection
  primitives.
- `decide` requires a TTY, uses a fixed A/R/S/Q menu and exact second token,
  writes one digest-bound v2 companion record through the existing factory and
  hardened private store, re-reads and validates the record, and never mutates
  the AI artifact or deterministic evidence.
- Bug approval is `OWNER_APPROVED_DRAFT`; oracle approval is
  `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW` only. Rejection is
  `OWNER_REJECTED`; supersession is `SUPERSEDED`. Existing reviews are
  terminal, v1 is read-only/historical, and malformed state fails closed.
- Plain-text terminal sanitization neutralizes ANSI/OSC/C0/C1/CR/backspace and
  bidi controls. The fixed system decision boundary follows all AI content;
  prose cannot select a decision or impersonate the prompt.

**Validation.** The focused owner-review suite is `16/16`; the predecessor
AI/loopback/private-triage/owner-policy slice is `83/83`; the synthetic
campaign is `27/27`; the final local Playwright suite is `497/497`; the
full-history isolated checkout passes `npm ci --ignore-scripts`, typecheck,
hardening, owner/AI/loopback `80/80`, agent-state `32/32`, campaign `27/27`,
and `agent:check`. No real model/provider, product traffic, database,
infrastructure, publication, credential, customer value, or real AI artifact
was used. Phase 7B.1.2 remains `COMPLETE` and Phase 8 remains `NOT_STARTED`.

## Phase 7B.2.1 — Atomic owner provenance closeout (complete)

This narrow local/static/synthetic descendant preserves Phase 7B.2 as a
historical complete predecessor and closes its immutable-file race and public
owner-decision write-authority gaps. It is not Phase 8 and adds no AI feature.
The validated implementation/substantive checkpoint is
`3916594f6e947f7f4665b23751c1d3ec03f5928b`.

**Key deliverables.**

- `writeImmutableJson()` uses complete fsynced same-directory `wx`/0600
  temporaries and `fs.linkSync(temp, destination)` create-if-absent
  publication. `EEXIST` is immutable conflict; unsupported no-replace
  primitives fail closed; no replacement rename/copy/unlink fallback exists.
- Bug drafts, oracle suggestions, and human reviews use one-shot READY
  immutable publication. Exact duplicates remain idempotent at their service
  layer, different same-ID bytes cannot replace the first winner, and corrupt
  or symlink state is not self-healed.
- `ownerDecision.ts` is internal and absent from the public AI-review index;
  the raw writer is private. Only the explicit owner-review CLI reaches the
  confirmed writer after TTY, fixed A/R/S/Q selection, exact second
  confirmation, and displayed digest validation. Help remains `--help`/`-h`;
  commands remain `show`, `status`, and `decide`.
- Hardening checks enforce the no-replace primitive, immutable AI paths, and
  the unique tracked runtime call graph. CI runs the 91-test atomic/provenance
  matrix with `contents: read` and no secrets.

**Validation.** The focused atomic/provenance matrix passed `91/91`; the full
current Playwright suite passed `513/513`; the synthetic campaign passed
`27/27`; typecheck, hardening, agent-state, whitespace/privacy review, and the
isolated clean checkout (`npm ci --ignore-scripts` plus the deterministic
acceptance commands) passed. No model, product traffic, database,
infrastructure, publication, credential, customer value, or real AI artifact
was used. Phase 6 remains `FROZEN_BY_OWNER`; Phase 7B.2 remains `COMPLETE`;
Phase 8 remains `NOT_STARTED`.

---

## Phase 7B.3 — Single bounded local-model canary (harness complete; real canary not run)

This narrow milestone adds a future owner-invoked integration canary over the
already-hardened Phase 7B loopback provider. It is not Phase 8 and does not
change the review-assistant authority boundary. The harness accepts only one
fixed synthetic L2 `BUG_CANDIDATE` fixture, a strictly validated model
identifier, and an explicit canonical loopback chat-completions endpoint. A
fresh `AiReviewSession` makes at most one provider call, with no oracle,
retry, artifact store, owner review, tool/function calling, cloud fallback,
product/browser/campaign path, or publication path. The model output is
validated in memory and only sanitized metadata is exposed.

The fixture version is
`nightwatch.local-model-canary-input.private.v1`; its digest is
`sha256:34db4fb404008607b0ab4980155b17d7e36540107fec5163888803ae997263c6`.
Deterministic tests cover argument and endpoint rejection, fixture privacy,
loopback request shape, one-call accounting, timeout/failure classes, no
retry, no persistence, and sanitized output. The implementation checkpoint
`5e7bad758efa7e5d87610c8b7878f6690bb0b821` passed exact deterministic CI run
`31807365893`, including the dedicated synthetic canary step, and the
full-history clean checkout passed.

The real canary was `LOCAL_MODEL_CANARY_NOT_RUN / LOCAL_RUNTIME_NOT_AVAILABLE`:
narrow local discovery found no supported runtime executable, no independently
identifiable compatible preexisting runtime/model, and no explicit endpoint/
model configuration. No installation or download was attempted and no model
request was made. A future run remains separately owner-authorized and must
repeat the exact runtime/model gate; a passing canary would prove only local
protocol compatibility and would not authorize Phase 8.

---

## Phase 8 — Evaluated self-development (in progress)

Phase 8 is now `IN_PROGRESS` under the owner authorization recorded for this
session: `PROCEED WITH THE NEXT PHASE.` That authorization starts Phase 8A
only. It does not authorize real-model self-development, source adoption,
automatic Git operations, Alphaus changes, product traffic, data or
infrastructure access, publication, or any later Phase 8 capability.

### Phase 8A — Evaluated self-development sandbox foundation (complete)

Phase 8A establishes evaluation authority without mutation authority. The
implemented boundary is:

```
synthetic declarative proposal
        ↓
strict exact-key candidate DTO
        ↓
allowlisted local fixture/actions/assertions
        ↓
deterministic validation, duplicate, coverage, safety, privacy, and execution gates
        ↓
private immutable evaluation artifact
        ↓
STOP — no adopter exists
```

The only candidate schema is
`nightwatch.selfdev-candidate.private.v1`; the only candidate kind is
`SYNTHETIC_REGRESSION_CASE`, a bounded data object. The corresponding result
schema is `nightwatch.selfdev-evaluation.private.v1`. Unknown fields, code,
patches, diffs, file paths, commands, URLs, models, prompts, Git requests,
unsafe fixtures, unknown actions, unknown assertions, and privacy/safety
escalations fail closed before execution. No expression interpreter, `eval`,
callback, executable oracle, source writer, Git runtime path, model provider,
browser/product path, database/infrastructure path, or publication path is
present.

The sole proposer class is `SYNTHETIC_DETERMINISTIC`. The session is capped at
3 candidates, 8 actions and 8 assertions per candidate, 30 seconds per
candidate, and 120 seconds total. Candidate identity is a canonical SHA-256
of stable semantic fields and excludes timestamps, filesystem paths, and
random values. Duplicate detection and coverage delta use fixed registries;
candidate claims do not supply evaluation truth. A passing case is classified
`EVALUATED_PASS_NOT_ADOPTED` with
`adoptionStatus=NOT_AUTHORIZED_PHASE_8A` and `publication=PROHIBITED`.

The synthetic CLI is `npm run selfdev:synthetic`. Runtime persistence, when
enabled, uses the existing owner-only immutable private store in a separate
`self-development` namespace outside Git. The synthetic A/B/C matrix produced
one valid new edge, one `REJECTED_DUPLICATE`, and one `REJECTED_SAFETY`; all
safety-vector counters were zero. The implementation checkpoint is
`d2a2978ede7c29d04e95f1625a736ce7c26004f9`, with local full Playwright
validation `546/546` and an isolated full-history deterministic checkout
passing typecheck, hardening, Phase 8A `23/23`, AI/canary/provenance `106/106`,
agent-state `32/32`, and synthetic campaign `27/27`. Exact documentation
checkpoint CI run `31814440021` passed at head
`1869031f810e629647bb7df40d840db83f12d865`; its job executed and passed the
named Phase 8A synthetic self-development evaluation matrix. The final live
documentation descendant is verified separately from Git after push.

Phase 8A remains strictly separate from Phase 7B AI review and cannot change
evidence level, campaign results, anomaly admission, source relevance, fault
boundaries, existing oracle truth, or owner-review drafts.

### Phase 8A.1 — Trusted evaluation provenance + replay integrity closeout (complete)

Phase 8A.1 closes the provenance prerequisites required before any future
controlled adoption design review. It introduces prospective v2 session and
evaluation schemas with recomputed content identity, a canonical semantic
result-state machine, candidate/evaluation/baseline cross-binding, a bounded
ordered replay descriptor, and exact replay comparison. The session records
only safe replay metadata; rejected raw proposal payloads are not retained.

Local trust is dual-bound to a fixed authoritative source bundle and a
separate evaluator contract digest. A narrow no-shell provenance boundary may
read only fixed local Git metadata and fixed source bytes; it has zero Git
mutation authority. Persisted v2 requires a real nonzero HEAD, clean
authoritative source, immutable no-replace storage, strict read-back, and
replay. Exact-base and source-equivalent documentation-descendant statuses
are derived at verification time; source/contract drift, dirty source,
unrelated bases, and legacy v1 records fail closed or remain unverified.

The read-only verifier is `npm run selfdev:verify -- --artifact-id
<exact-session-id>`. The validated implementation checkpoint is
`4602fac417746a30927fc19f8e4ca48ab9143cac`; local and isolated validation
passed 562/562 full tests, 39 focused Phase 8A/8A.1 tests, 91/91
owner/provenance tests, and 27/27 synthetic campaign tests. The acceptance
artifact verified `VERIFIED_EXACT_BASE` with replay `PASS`; it remains
`NOT_AUTHORIZED_PHASE_8A` and cannot produce a patch or source mutation.
Phase 8A.1 is complete, Phase 8 remains `IN_PROGRESS`, and Phase 8B remains
`NOT_STARTED`.

### Phase 8A.1.1 — Future review eligibility gate closeout (complete)

Phase 8A.1.1 closes the confirmed gap between "this artifact is authentic/
current/replay-valid" and "this artifact contains at least one candidate
eligible to enter a future controlled review/adoption design." Those were
proven distinct: a replay-valid, source-attested `VERIFIED_EXACT_BASE`
artifact built from an ordinary zero-pass proposer fixture had
`passCandidateCount = 0` yet still satisfied the pre-fix
`isFutureReviewPrerequisitePass`.

`isFutureReviewPrerequisitePass` now additionally requires `replayStatus ===
'PASS'`, a runtime-validated genuine positive-integer `passCandidateCount`,
matching `sourceBundleMatch`/`contractDigestMatch`, and intact no-authority
invariants. The new canonical `assessFutureReviewEligibility(value, current)`
is the one source-currentness-aware future-review candidate gate: it always
derives its own assessment (`current` is required, so a caller cannot skip
current-source trust) and cross-checks replay-regenerated candidates against
the assessment's pass count, failing closed on disagreement. Trust semantics
(`VERIFIED_EXACT_BASE`/`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`) are unchanged;
a zero-pass artifact remains genuinely trust-valid but is now correctly
future-review ineligible. No new persisted schema or contract version was
needed, since `trust.ts` is already part of the authoritative source bundle.

The validated implementation checkpoint is
`d33a8c1cc062b435a7b2bc4f69567286dd56ebb4`. Validation passed 577/577 full
Playwright tests (15 new focused eligibility tests), typecheck, hardening, an
isolated full-history clone, and 27/27 synthetic campaign tests. Exact CI run
`31847511710` passed, executing the dedicated eligibility-matrix step. The new
v2 acceptance artifact verified `VERIFIED_EXACT_BASE`, replay `PASS`, and
`eligible: true` with one regenerated candidate; no historical artifact was
rewritten. Phase 8 remains `IN_PROGRESS`; Phase 8B remains `NOT_STARTED`.

### Phase 8B — Controlled source adoption sandbox (complete)

Phase 8B proves Nightwatch can translate one exact, current-source-eligible
declarative regression candidate into one deterministic tracked-source
adoption, apply it only inside a disposable owner-private source mirror,
execute the modified sandbox evaluator, and metamorphically prove the effect
— while the canonical checkout remains byte-for-byte untouched. Canonical
source promotion is explicitly deferred to a future, separately authorized
task (Phase 8B.1 — Owner-Gated Canonical Promotion, `NOT_STARTED`).

A strict, versioned, data-only adopted-case catalog
(`nightwatch.selfdev-adopted-case.v1`) is split across a trusted schema
module (`src/core/selfDev/adoptedCases.ts`) and a pure-data generated file
(`src/core/selfDev/adoptedCaseCatalog.generated.ts`, the sole sandbox
mutation target) that starts and remains empty in canonical source. Adopted-
case identity is base-independent (fixture/actions/assertions/coverage/
strategy only); coverage is always re-derived from the fixed action
registry, never trusted from a supplied field. The evaluator seeds its
baseline duplicate/coverage state from the catalog at construction time with
zero behavior change while the catalog is empty; the catalog's live contents
are embedded directly in the evaluator contract manifest, so adopting an
entry changes `contractDigest` automatically.

A pure, deterministic planner
(`src/core/selfDevSandbox/planner.ts`) consumes only
`assessFutureReviewEligibility` output, requires a matching
`EVALUATED_PASS_NOT_ADOPTED` evaluation with positive re-derived coverage
overlap, rejects an already-adopted or full catalog, and requires the
on-disk catalog to match its own canonical renderer output before producing
a content-addressed `nightwatch.selfdev-adoption-plan.private.v1` bound to
the fixed, code-defined target path. Plans are stored immutably (exact-ID,
no-replace) and TOCTOU-revalidated against current source/contract/target-
preimage digests before any sandbox mutation; a documentation-only
descendant remains runnable, while genuine source drift or a duplicate
catalog entry fails closed.

The sandbox executor (`src/core/selfDevSandbox/sandboxExecutor.ts`) mirrors
only the fixed authoritative source set into a disposable owner-private
0700 root outside the repository, verifies the mirror's pre-mutation digest
matches canonical, performs exactly one atomic target write, verifies
exactly one file differs from canonical, then loads and executes the
*modified* sandbox evaluator through a bounded, serial, cache-isolated local
TypeScript loader (`sandboxLoader.ts`) confined to the sandbox root. Four
metamorphic probes prove the adoption's effect: the same regression
semantics under a different valid base SHA become `REJECTED_DUPLICATE`; a
same-coverage assertion variant also remains non-new; a genuinely different
coverage-adding action sequence still evaluates
`EVALUATED_PASS_NOT_ADOPTED`; an unsafe candidate remains `REJECTED_SAFETY`.
The disposable mirror is always cleaned up afterward, confined to a fixed
sandbox base directory. Sanitized results
(`nightwatch.selfdev-adoption-sandbox-result.private.v1`) carry
`sandboxSourceWrites=1`, `canonicalSourceWrites=0`, `runtimeGitWrites=0`,
`externalCalls=0`, and `adoptionStatus=SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`
— never canonical-apply or publication authority — with a validated
semantic invariant gate that rejects an impossible tuple even if a caller
recomputes the result ID.

The narrow CLI `npm run selfdev:adopt-sandbox -- inspect|plan|run` is
exact-ID only (no latest/list/path/patch/model option) and `run` requires
the fixed confirmation token `SANDBOX_ONLY`; there is no
apply/commit/push/promote/merge/install command anywhere. A new narrow
owner-policy operation `SELF_DEVELOPMENT_SANDBOX_ADOPTION` authorizes
sandbox-only writes; `SELF_DEVELOPMENT_CANONICAL_ADOPTION` remains unknown
and fails closed. Hardening gained `checkPhase8BSandboxBoundary`
(authoritative-source coverage, forbidden-capability/import scan, and
call-graph containment proving only the CLI and the sandbox module itself
can reach the sandbox source-write executor).

The validated implementation checkpoint is
`f04bb928890b8d730665b24cfd303386608b2a5a`. Local and isolated-clean-
checkout validation both passed the full suite (`611` total: `608` passed
plus `3` environment-conditional skips in the isolated clone, `611` passed
in the local dev checkout), 90/90 focused Phase 8A/8A.1/8A.1.1/8B tests,
typecheck, hardening, 27/27 synthetic campaign, and `git diff --check`.
Exact CI run `31853612222` passed at the documentation-inclusive descendant
`36495b4df2c013d671a4983cd7991e1aecd9a25e` (which changes no authoritative
source beyond the validated checkpoint), executing the dedicated "Phase 8B
controlled source adoption sandbox matrix" step. The real acceptance run
was performed against that same descendant. The fresh v2 acceptance
artifact is
`session:sha256:27dbbd7f94e360af7e9fc564e9cdabf45d3d9ae5c67e84eccc676f78f047ac46`,
bound to the validated checkpoint, `VERIFIED_EXACT_BASE` with replay `PASS`,
`eligible: true`, one candidate. The one real local acceptance plan/run —
`adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`
and
`adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`
— verified `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` with all four
metamorphic probes `PASS`, `cleanupStatus: PASS`, and confirmed the
canonical adopted-case catalog, its digest, and `git status` were
byte-for-byte unchanged before and after. Phase 8 remains `IN_PROGRESS`;
canonical candidate promotion remains `NOT_STARTED`/`NOT_AUTHORIZED`.

### Phase 8B.0.1 — Sandbox promotion-readiness closeout (complete)

Phase 8B.0.1 closed the four promotion-readiness integrity defects found
after Phase 8B's sandbox-only acceptance (each reproduced pre-fix as a
runtime `TRUE_POSITIVE`) and re-ran the sandbox-only acceptance on the fixed
implementation. See `docs/DECISIONS.md` D-48 for the full decision.

- **Sandbox base pre-validation (Defect A).** `ensurePrivateSandboxBase()`
  validates the pathname chain component-wise BEFORE any mutation (lstat-
  first; symlink/non-directory components fail closed; missing directories
  created only beneath validated parents, 0700, immediately revalidated).
  The base fails closed on open mode or wrong owner with no repair; the
  private parent reuses the established private-artifact tightening
  convention (never loosened); `$HOME`/ancestors are never chmodded or
  created. Instances are realpath-contained beneath the validated base and
  disjoint from the canonical repo, parent workspace, and findings root;
  cleanup requires strict child containment (any doubt → FAIL, nothing
  deleted); copy failures clean the partial mirror. No `--sandbox-root`
  option; test-only module-level override not exported from the boundary
  index.
- **Adoption strategy binding (Defect B).** Plan and result `strategyClass`
  must equal `SELFDEV_ADOPTION_STRATEGY_CLASS` exactly, checked before any
  identity recomputation (a forged strategy + recomputed plan/result ID now
  fails `PLAN_STRATEGY_INVALID`/`RESULT_STRATEGY_INVALID`); plans
  cross-bind `plan.strategyClass === plan.adoptedCase.strategyClass`
  (`PLAN_STRATEGY_MISMATCH`); the type is the literal
  `SelfDevAdoptionStrategyClass`. The strategy version stays bound through
  the contract manifest into `contractDigest` (no cosmetic field).
- **Complete verified-result metamorphic invariants (Defect C).** A verified
  result requires all five probes exactly `PASS`; `NOT_RUN`/`FAIL` per field
  is rejected even with a recomputed resultId. The executor fails closed with
  `NON_OVERREACH_PROBE_UNAVAILABLE` (no bounded probe) or
  `NON_OVERREACH_REGRESSION` (probe ran and failed) — never a verified
  result.
- **Truthful failure-path write accounting (Defect D).** `sandboxSourceWrites`
  tracks the actual executed effect (0 before the single allowed write, 1
  immediately after its success); every result carries the true value;
  validation bounds 0..1; success requires exactly 1; canonical/Git/external
  counters remain ALWAYS 0.
- **Additional finding (fixed).** The sandbox loader's serial lock is
  released on every exit path (an early anchor-resolution throw previously
  wedged all later sandbox loads).

Coverage: new `tests/unit/selfDevSandboxConfinement.test.ts` (matrix A–J),
strategy-binding tests in `selfDevAdoptionPlan.test.ts`, and strategy/
invariant/accounting/executor tests in `selfDevAdoptionSandbox.test.ts`;
hardening gained `checkPhase8B01CloseoutIntegrity`; the workflow gained the
dedicated "Phase 8B.0.1 sandbox promotion-readiness closeout matrix" step.

The validated implementation checkpoint is
`c4537ab5e3e96859c7c472ac47c3143a15b20c26` (continuity commit
`0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9` records the anchors). Local
validation: typecheck, hardening, focused matrix (110 passed/1 skip plus two
dirty-worktree CLI tests that pass 7/7 at a clean tree), full Playwright 633
passed / 1 environment-conditional skip (634 total), owner provenance 91, AI
regressions 98, agent-state 32, campaign:synthetic 27, `git diff --check`
clean; isolated full-history clean checkout green. Exact CI run
`31857751099` at `0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9` — completed/
success with the dedicated 8B.0.1 step and the agent-state check verified
individually. The fresh acceptance on the current implementation
(session `session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`,
`VERIFIED_EXACT_BASE`, replay `PASS`, one candidate; plan
`adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`;
result
`adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`)
verified `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` with all five probes
`PASS`, `sandboxSourceWrites: 1`, zero canonical/Git/external counters,
`cleanupStatus: PASS`, and the canonical catalog byte-identical (digest
`sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
still empty) before and after with a clean `git status`. New
`sourceBundleDigest`: `sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`;
`contractDigest` unchanged at
`sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`
(source-provenance hardening, not an evaluator-contract change).

### Phase 8B.1.0 — Catalog-aware synthetic proposal & test-baseline compatibility (complete)

Phase 8B.1.0 (COMPLETE) removed the structural blocker that stopped the
first real Phase 8B.1 promotion from being committed: the deterministic
proposer's single semantically-distinct candidate became a permanent
duplicate once adopted, breaking ~50 historical assertions across 8 test
files that implicitly assumed an always-empty live adopted catalog and an
always-fresh PASS. The fix (both sides):

- **Production** — bounded deterministic proposal portfolio
  (`nightwatch.selfdev-synthetic-portfolio.v1`, `src/core/selfDev/portfolio.ts`):
  EXPAND_SUMMARY and EXPAND_THEN_COLLAPSE in frozen order; pure
  `selectNextSyntheticProposalVariant` (fingerprint-not-adopted AND
  coverage-delta>0 vs baseline+adopted; no base/seed/time/random input);
  controller resolves the default alias to a concrete replay fixture;
  EXHAUSTED (A+B adopted) is a valid terminal state (0 PASS, not eligible,
  session succeeds normally). Contract manifest deliberately advanced to
  `nightwatch.selfdev-contract.private.v2`, binding the portfolio, its order,
  and the selection-algorithm version.
- **Tests** — explicit adopted-catalog baselines (EMPTY / EXPAND_ONLY /
  EXPAND_AND_COLLAPSE) rendered via the real renderer into temp source repos
  (`tests/helpers/selfDevSourceFixture.ts`) with the full selfDev stack loaded
  coherently from each fixture (`tests/helpers/selfDevStack.ts`); all eight
  affected historical test files refactored; new 30-test portfolio matrix.

Validation: pre-fix reproduction 47 failed / 58 passed under a one-entry
checkout; post-fix green in the real checkout, a one-entry isolated
full-history checkout (159 passed), and an exhausted A+B isolated checkout
(160 passed); exact CI green with the dedicated 8B.1.0 matrix step. Phase
8B.1 remains `BLOCKED` (historical attempt and spent approval preserved);
retry readiness: `READY_FOR_FRESH_OWNER_AUTHORIZATION` (a separate owner
authorization is required; no promotion was retried). The canonical adopted
case catalog remains EMPTY.

### Phase 8B.1.0.2 — Completed-task continuity protocol & historical ledger hardening (complete)

Phase 8B.1.0.2 (COMPLETE) made completed-task contradictions mechanically
invalid: the repository-native continuity checker now enforces the
`nightwatch.agent-continuity.v2` cross-file status state machine
(ACTIVE/STATE/REPORT status agreement, current-phase status binding,
terminal milestone/WIP/next-action/resume semantics for COMPLETE, real
blockers for BLOCKED, real activity for IN_PROGRESS, duplicate structured
field rejection, closure-placeholder rejection, non-self-referential
finalization with Git/GitHub-Actions live authority), audits every v2 task
directory (`npm run agent:audit`, CI "Completed-task continuity audit"
step), and keeps legacy v1 tasks readable as warnings. The pre-fix checker
accepted 9/9 impossible states (COMPLETE with IN_PROGRESS phase status,
stale milestones, WIP, active next actions, fill-after-push placeholders,
duplicate fields, pending plan milestones); post-fix 0/9. The 8B.1 lineage
(8B.1 BLOCKED, 8B.1.0 COMPLETE, 8B.1.0.1 COMPLETE, 8B.1.0.2 COMPLETE) is
migrated to strict v2 with zero errors; 24 older tasks remain legacy v1.
Validated implementation SHA 52a7c173 (exact CI 31883287041 success);
full clean Playwright 747 passed / 4 skipped / 0 failed. Phase 8B.1 remains
`BLOCKED` / `RETRY_NOT_STARTED`; retry readiness:
`READY_FOR_SEPARATE_FRESH_OWNER_AUTHORIZATION` (separate fresh owner
authorization required; no promotion retried; catalog EMPTY).

### Phase 8B.1-R1 — Owner-gated canonical promotion retry (complete)

Phase 8B.1-R1 (COMPLETE) performed the ONE authorized fresh canonical
promotion retry under continuity protocol v2, after a catalog-aware CI
transition:

- **Catalog-aware CI transition (readiness commit `a319849`).** The two
  empty-only operational gates (workflow "Phase 8B.1.0 checkout cleanliness
  (real catalog must stay empty)" and the `checkPhase8B10PortfolioIntegrity`
  empty-only assertion) were replaced by the cardinality-agnostic
  catalog-integrity invariant: the real catalog may legitimately hold
  0..64 entries as long as it validates under `validateAdoptedCatalog`,
  byte-matches `renderAdoptedCatalogSource`, stays pure declarative data,
  and the checkout is clean. New read-only
  `bin/selfdev-catalog-integrity.mjs` (reuses the established
  validator/renderer; zero writes) runs from the "Phase 8B.1 catalog
  integrity / checkout cleanliness" workflow step; hardening asserts pure
  data shape, bin reuse, and workflow invocation; 4 focused tests added.
  Exact CI 31886682576 green incl. the new step at EMPTY; catalog unchanged.
- **Fresh chain at the frozen base `a319849`:** fresh v2 session
  (`session:sha256:72da8503...`, VERIFIED_EXACT_BASE, replay PASS, candidate
  A / EXPAND_SUMMARY), sandbox plan `4f79e22f...` + verified result
  `e9d1d9bf...` (SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED, five probes PASS,
  writes 1/0/0/0).
- **One-entry future-state rehearsal** (disposable clone, exact postimage
  committed locally, never pushed): full Playwright 751/4/0; CI-equivalent
  gates PASS incl. catalog integrity at count 1; the fresh session in that
  checkout SELECTS EXPAND_THEN_COLLAPSE (B) — the historical structural
  blocker is resolved.
- **Exactly one promotion** `7542c947...`, **one fresh approval**
  `e065f088...` (old approval `17c97035...` stays spent), **one APPLY**
  (APPLIED; one file; digest exact), fresh-process verify
  `527a42fd...` (`CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`, four probes
  PASS), post-apply regression green (2 documented dirty-tree-only CLI
  failures only), **canonical commit `24fc437`** (exactly the one catalog
  file), exact CI 31887666112 green incl. catalog integrity at COUNT 1,
  currentness `CANONICAL_PROMOTION_COMMITTED_EXACT`.
- **Post-commit continuation proof:** fresh session at the committed HEAD
  selects B (passCount 1, replay PASS); read-only B eligibility proven;
  post-commit isolated full-history checkout at `24fc437` full Playwright
  751/4/0.

Phase 8B.1 = `COMPLETE VIA SUCCESSFUL RETRY R1`; original attempt remains the
truthful BLOCKED/CLOSED historical record with its spent approval. Canonical
catalog count = 1 (variant A); variant B AVAILABLE_NOT_ADOPTED; portfolio NOT
exhausted. Next action: STOP — no second approval/APPLY, no B adoption
(separate authorization required).

### Phase 8B.1-R1.1 — Project-memory & canonical-source truth hardening (complete)

Phase 8B.1-R1.1 (COMPLETE) hardened project-level durable truth without
changing adoption/evaluator semantics:

- **Generated catalog authority header corrected.** The renderer
  (`renderAdoptedCatalogSource` in `src/core/selfDev/adoptedCases.ts`) and
  the regenerated one-entry `adoptedCaseCatalog.generated.ts` now describe
  the real two-writer authority partition: Phase 8B sandbox adoption may
  rewrite the target only inside a disposable private source mirror; the
  Phase 8B.1 canonical-promotion executor may rewrite the exact canonical
  target only after the complete owner-gated promotion evidence/approval
  chain (development session commits; runtime never commits Git). Ordinary
  development never hand-edits the generated file; no
  generic self-modification authority exists. The obsolete sandbox-only
  sentence is gone from live renderer text. Regeneration through the trusted
  renderer preserved deep semantic equality (adoptedCaseId
  `90248aae...`, fingerprint `6a322450...` unchanged; count 1); raw digest
  `fa7b71d4...` → `401b2c67...` (header bytes only); `sourceBundleDigest`
  changed; `contractDigest` unchanged (`d8012fae...`).
- **Project-state v1 (`nightwatch.project-state.v1`).** New read-only
  `npm run project:check` (`bin/project-state-check.mjs`) validates a
  machine-checked truth block in CURRENT_STATE (authority markers, catalog
  target/count/digest/strategy via the real validator/renderer, portfolio
  projection via the real selector, phase statuses, promotion authority
  NONE) and rejects competing generic live anchors. CI gained the dedicated
  "Project-memory truth check" step; 25 focused tests added.
- **Duplicate live authority removed.** CURRENT_STATE no longer carries
  generic `LAST_VALIDATED_IMPLEMENTATION_SHA` /
  `LAST_DOCUMENTATION_CHECKPOINT_SHA` rows; live HEAD comes from Git and the
  current implementation checkpoint from ACTIVE_TASK under continuity v2;
  the Phase 8A.1 anchors are preserved as explicitly historical
  phase-qualified fields.
- **Currentness strictness preserved.** A regression test proves an
  authoritative source change after `CANONICAL_PROMOTION_COMMITTED_EXACT`
  reports strict `CANONICAL_PROMOTION_SOURCE_MISMATCH` for the old
  verification — the historical R1 evidence stays historical; current source
  is a later validated state.

Phase 8B.1 remains `COMPLETE VIA SUCCESSFUL RETRY R1`; Phase 8 stays
`IN_PROGRESS`. Canonical catalog count = 1; variant B AVAILABLE_NOT_ADOPTED;
promotion authority NONE. The next architecture is now DESIGNED, not
implemented — see the design review record below. No Phase 8C exists.

### Phase 8 design review — next architecture (design complete; closure executed separately)

The next-architecture design review (`phase-8-next-architecture-design-review`,
Phase 8-DESIGN, authorization `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`,
2026-08-15) selected:

```
PHASE_8_NEXT_ARCHITECTURE:
  CLOSE_PHASE_8
SECONDARY_LATER_OPTION:
  REPEATABLE_OWNER_GATED_ADOPTION (VIABLE_LATER)
REJECTED:
  AUTONOMOUS_PROMOTION (BY_DESIGN) / RUNTIME_ROLLBACK_MACHINERY
DEFERRED:
  OWNER_REVIEW_QUEUE / PORTFOLIO_EXPANSION
```

Phase 8's objective — one owner-authorized canonical self-development
promotion with a complete source-bound evidence chain, plus continuation —
is fulfilled with live evidence (R1 at `24fc437`, committed currentness
`CANONICAL_PROMOTION_COMMITTED_EXACT`, post-commit sessions select B).
Further Phase 8 promotion machinery (B adoption, queue, expansion,
rollback) re-demonstrates fixture-proven states or adds authority without
bug-hunting value; Nightwatch's next investment belongs in the
campaign/oracle/triage space. Variant B remains AVAILABLE_NOT_ADOPTED;
promotion authority NONE; candidate availability never implies
authorization. The full analysis is in
`docs/ARCHITECTURE.md` (Phase 8 next-architecture design review section); the
decision record is D-52;
the machine-checked truth block is unchanged (count 1, B available,
authority NONE).

**Phase 8 closure is COMPLETE.** The authorized closure task
(`phase-8-final-closure-phase-9-roadmap-selection`,
`PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`) flipped `PHASE_8_STATUS` to
COMPLETE (project-state pin + machine block + regression matrix +
hardening), extended the continuity docs/design/*.md checkpoint allowlist
narrowly (with negative tests), froze the canonical-promotion research
boundary (machinery retained; authority stays NONE), and selected the next
bug-hunting investment:

```
PHASE_8_STATUS:
  COMPLETE
PHASE_8_CLOSURE:
  COMPLETE
PHASE_9_STATUS:
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED
PHASE_9_DIRECTION:
  DETERMINISTIC_ORACLE_DEPTH
PHASE_9_TITLE:
  Phase 9 — Deterministic Semantic Oracle Depth
PHASE_9_IMPLEMENTATION_AUTHORITY:
  NOT_GRANTED
```

The Phase 9 design (evidence-backed bottleneck, option matrix, selected
architecture, implementation-ready future-task spec) is recorded in
`docs/design/PHASE_9_ROADMAP.md`; decision record D-53. Phase 9 is NOT
started and NOT authorized. Variant B remains AVAILABLE_NOT_ADOPTED;
promotion authority NONE; catalog count 1 (digest `sha256:bd35b934...`).
No Phase-8C status was invented; no catalog byte changed.

---

## Phase 9 — Deterministic Semantic Oracle Depth (local/synthetic implementation complete)

**Status:** `COMPLETE_LOCAL_SYNTHETIC` (2026-08-16). The owner-authorized
implementation task (`phase-9-deterministic-semantic-oracle-depth`,
authorization `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`) implemented the
deterministic semantic oracle depth architecture and closed under
continuity v2. See `docs/design/PHASE_9_ROADMAP.md` §17 (implementation
record) and D-54.

**What was built (local/synthetic only):**

- **Semantic projection layer** (`src/oracles/projections/**`,
  `nightwatch.semantic-projection.v1`): ephemeral raw observations project
  to safe DTOs — field paths, types, presence, nullability, shape, bounded
  counts, opaque encounter identity tokens (`entity#0001`) and numeric refs
  (`numeric#0001`) via an in-memory `ProjectionContext` (never serialized),
  canonical byte-identical serialization + `proj:sha256:` digests, hard
  bounds (depth/fields/array items/nodes/identities/numerics/bytes), and
  hostile-input fail-closed (cycles, throwing getters, prototype keys,
  non-JSON scalars, NaN/Infinity). Fixed-point numeric relations emit
  relation facts only — raw amounts never persist.
- **Source-backed expectations** (`src/oracles/expectations/**`,
  `nightwatch.semantic-expectation.v1`): declarative contracts only (no
  callbacks/expressions), strict validation (unknown fields, duplicate IDs,
  path traversal, prototype segments, unbounded relations, malformed
  provenance), provenance bound to repo @ SHA with fail-closed staleness
  (`EXPECTATION_SOURCE_STALE` / `_UNAVAILABLE`), and ONE static source
  adapter shared by the synthetic fixture corpus
  (`corpus/phase9/source-fixture`) and real read-only Alphaus checkouts
  (never executes application code). Real-source canary: provenance binding
  proven against the live `mobingilabs/ripple-api` checkout
  (`27bb007ad0c798800b6bd3b29760c966422966e7` == Phase 5 catalog SHA);
  `REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED` (the annotation pattern is
  absent in real source — no invented real product semantics).
- **Deterministic oracles** (`src/oracles/invariants/**`,
  `src/oracles/semantic/**`): fixed invariant vocabulary (FIELD_PRESENT/
  ABSENT, TYPE_MATCH, CARDINALITY_MATCH, ENVELOPE_CLASS, IDENTITY_EQUAL,
  IDENTITY_PRESENT_IN_COLLECTION, NUMERIC_SUM_RELATION, COUNT_RELATION,
  SHAPE_CHANGED); safe finding DTO (`nightwatch.semantic-oracle-finding.v1`)
  with categorical fingerprints from safe metadata only; fail-closed
  classification order (source unavailable/stale, projection limit,
  invalid input, N/A, PASS, ANOMALY).
- **Seeded corpus + false-positive control** (`corpus/phase9/**`): five
  required semantic bug classes (HTTP-200 error envelope, list/detail
  identity mismatch, stale state after transition, aggregate total
  relation mismatch, cardinality relation mismatch) + benign counterparts.
  Fixed fixture evaluation report: 5/5 seeded detected, 0 false positives
  on 10 benign cases, precision 1, recall 1. Baseline comparison:
  protocol-only detection 0/5 (proven at M1); Phase 9 semantic 5/5.
- **Privacy proof**: sentinel matrix (15 tests) plants all five sentinel
  classes in every raw-value location and sweeps projections, findings,
  fingerprints, recorder events, campaign checkpoints, dossiers, briefs,
  artifacts, and failure-path error messages — zero leaks, including
  derived forms (lower/upper/URL-encoded/escaped/prefix/last-four/raw
  amount) and absolute private paths.
- **Pipeline integration**: Phase 5 composed protocol/semantic stage
  (protocol failure short-circuits; `ORACLE_PASS` is not semantic PASS);
  network-observer semantic hook (transient raw text -> safe findings
  only); semantic findings flow through the EXISTING campaign orchestrator
  -> admission -> reproduction -> minimization -> triage -> dossier chain
  (no test-only bypass); dossiers carry additive sanitized
  `semanticEvidence` (`nightwatch.semantic-dossier-evidence.v1`,
  backward compatible; protocol-only dossiers unchanged). Campaign proof:
  five seeded classes admitted and reaching dossiers across two synthetic
  runs (5 semantic dossiers); paired baseline (semantic channel absent)
  admits none.
- **Hardening + CI**: `bin/hardening-check.mjs` Phase 9 semantic-core
  purity (no AI/selfDev/Phase6/infra/transport/persistence/campaign
  imports; no process/network/persistence capability) + integration-seam
  guards; dedicated CI matrix step "Phase 9 deterministic semantic oracle
  depth matrix" (exact implementation CI run 31929017844, 29/29 steps
  green).

**Phase 9B (DEV acceptance):** not executed; disposition recorded in
`docs/design/PHASE_9_ROADMAP.md` §17 and D-54. Phase 8 remains COMPLETE;
variant B AVAILABLE_NOT_ADOPTED; promotion authority NONE; catalog count 1
(digest `sha256:bd35b934...`) — byte-identical through the task. Phase 6
remains frozen; AI remains non-authoritative.

---

## Phase 9A.1 — Real-Source Expectation Admission & Semantic Evaluation Observability (complete, local/source-only/synthetic)

**Status:** `PHASE_9A_1_STATUS: COMPLETE` (2026-08-16). The owner-authorized
readiness task (`phase-9a-1-real-source-expectation-admission`,
authorization `PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`) closed the
three Phase 9B readiness gaps and decided
`PHASE_9B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`. See
`docs/design/PHASE_9_ROADMAP.md` §18 (implementation record), D-55, and the
Phase 9B future-task spec `docs/design/PHASE_9B_TASK_SPEC.md` (design only,
NOT_AUTHORIZED).

**What was built (local/source-only/synthetic):**

- **Real-source expectation admission bridge**
  (`src/oracles/expectations/recipes/**`, `.../extract/**`,
  `.../admission.ts`): versioned data-only recipes
  (`nightwatch.real-source-expectation-recipe.v1`) + a fixed bounded
  syntax-aware PHP extractor vocabulary (PUSH/ASSIGN row-literal keys,
  builder-list returns, Routing.yaml route bindings — tokenized, never
  executed, no regex-as-authority) + deterministic source-evidence digests
  (`ev:sha256:<24>` over the normalized source structure used to derive) +
  strict recipe validation and a fixed registry gated to approved read-only
  targets. 4 expectations admitted from the live `mobingilabs/ripple-api @
  27bb007a` checkout (common-exchange, payer-exchange, account-inventory,
  billing-group-exchange; 3 DEV-reachable); no Alphaus annotations required;
  billing-groups-legacy rejected (AMBIGUOUS), gRPC billing-groups deferred.
- **Atomic resolution + fail-closed currentness** (`.../resolver.ts`):
  expectation + its exact source snapshot resolve together; freshness
  matrix A-F (exact SHA current; different SHA stale; repo/path missing
  unavailable; evidence structure changed stale; unrelated change current);
  per-expectation snapshot binding with multi-repo swap rejection; the
  synthetic-rebinding shortcut (synthetic expectation + real SHA) is
  REJECTED (`REAL_SOURCE_EXPECTATION_PROOF_MISSING` semantics).
- **Safe semantic evaluation receipts**
  (`src/oracles/semantic/receipts.ts`, `nightwatch.semantic-evaluation-
  receipt.v1`): nine-outcome vocabulary; NO_EXPECTATION/STALE/UNAVAILABLE/
  N-A/INTERNAL_ERROR are never PASS; hook returns receipt + findings;
  bounded observer ledger `semanticEvaluations()` (cap 512, explicit
  overflow); no-silent-failure (INTERNAL_ERROR receipts); privacy-contract
  violations escalate via the existing safety architecture; Phase 5
  composed stage exposes receipts (additive; protocol oracle untouched).
- **Proof**: focused Phase 9 + 9A.1 matrix 212 passed; full regression 994
  passed / 1 skipped / 0 failed; isolated full-history checkout green;
  live canary 4 derived / 4 current / 0 stale; conforming synthetic bodies
  -> PASS x4; mutated synthetic bodies -> ANOMALY x4; sentinel leaks 0.

**Phase 9B:** `DESIGNED_NOT_STARTED_NOT_AUTHORIZED`; acceptance contract —
EXPECTATION RESOLVED + SEMANTIC EVALUATION RECEIPT EXISTS + OUTCOME IS
EXPLICIT + ZERO PRIVACY/SAFETY FAILURE; zero anomalies is valid healthy
evidence; zero expectations/receipts, stale source, or internal errors mean
NOT PROVEN.

## Phase 9B — Contained DEV Semantic Acceptance (harness implemented + validated; DEV acceptance BLOCKED at the pre-browser auth gate)

**Status:** `PHASE_9B_STATUS: BLOCKED` / `PHASE_9B_DEV_RESULT: NOT_PROVEN` /
`PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` (2026-08-16).
The owner-authorized task (`phase-9b-contained-dev-semantic-acceptance`,
authorization `PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, starting
SHA `62ec80426035e979b563135d858bdc1438d84fb4`) built and validated the
complete contained DEV semantic acceptance harness and executed the ONE
authorized acceptance pair through the gated launcher; the run stopped
fail-closed at the pre-browser readiness gate. See
`docs/design/PHASE_9_ROADMAP.md` §19 (implementation record), D-56, and the
task records under `.agent/tasks/phase-9b-contained-dev-semantic-acceptance/`.

**What was built (validated locally + exact CI):**

- **Wiring** — `NightwatchContextOptions.semanticOracle?` passes the
  admitted real-source resolver into `createNetworkObserver`; no global
  default, no env-created semantic authority.
- **Pure Phase 9B core** (`src/core/phase9b/`) — source-freshness classifier
  (A-F; F2 REDERIVE_FRESH_SNAPSHOT binds to the fresh exact remote
  snapshot), metadata-only pre-dev readiness gate (13 checks; ANY failure ->
  NO DEV CONTACT), normalized safe pass summaries + one-pass acceptance gate
  (decisive = invariantPassCount > 0 or ANOMALY) + replay comparison.
- **Gated launcher + runner** — `bin/phase9b-real.mjs` (`--env=dev` +
  `--storage-state` only, one-shot `NIGHTWATCH_PHASE_9B_REAL=1`) driving
  `tests/manual/phase9b-contained-dev-semantic.ts`: the fixed
  `ripple-common-exchange-read` pair (FIRST + ONE fresh-context replay)
  through the existing Phase 2B machinery; expectation
  `ripple.common-exchange.read.real-source-shape` exposed ONLY.
- **Proof** — unit matrices 34 passed; hardening PASS; Phase 9 matrix 102;
  Phase 9A.1 + 9B matrices 131; full regression 1026/1/2 dirty-tree (only
  documented dirty-gate failures); isolated clean checkout 1017/4/0; exact
  implementation CI 31934803846 success at `cdfdf31` (29/29 steps incl. the
  Phase 9B harness matrix step).

**Source freshness (read-only):** ripple-api master `169df39d` and ripple-ui
dev `818ce2da` advanced; relevant contract + journey source mechanically
unchanged -> F2; fresh derivation at `169df39d` (selected digest
`ev:sha256:608265368c9a086f43c94e5c`); restricted resolver RESOLVED;
disposable /tmp mirrors only; canonical sibling checkouts untouched.

**Execution:** the one launcher run passed source freshness, derivation,
resolver RESOLVED, exact-head CI, proxy, and target checks, then FAILED the
auth structural gate — the external DEV storage-state `mo_access_token`
cookie is EXPIRED (boolean-only diagnostics). No browser context was
created; zero DEV contact; zero artifacts; DEV semantic acceptance NOT
proven. Retry required a human-led `npm run auth:capture` refresh plus a
fresh owner authorization.

## Phase 9B-R1 — Auth-Refreshed Contained DEV Semantic Acceptance Retry (complete, PASS)

**Status:** `PHASE_9B_R1_STATUS: COMPLETE` /
`PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED` /
`PHASE_9B_R1_DEV_RESULT: PASS` / `PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED`
/ `PHASE_9_STATUS: COMPLETE` (2026-08-16). The fresh owner authorization
(`PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, D-57) after the
owner's human-led auth refresh ran the ALREADY-VALIDATED Phase 9B harness
(`cdfdf314839fd782a962e4096b68b32641a93db2`, exact implementation CI
31934803846) with ZERO source changes. See
`docs/design/PHASE_9_ROADMAP.md` §20 (implementation record), D-57, and the
task records under `.agent/tasks/phase-9b-r1-auth-refreshed-dev-semantic-
acceptance/`.

- **Gates**: harness source byte-identical between cdfdf31 and HEAD; R1
  docs checkpoint `f88b6f1` with exact green CI 31938800275 (29/29 steps
  incl. the Phase 9B harness matrix step); fresh remote heads re-discovered
  read-only (ripple-api master `169df39d…`, ripple-ui dev `818ce2da…` —
  unchanged; disposable /tmp mirrors verified at the exact SHAs); runner
  re-derived the selected expectation at the exact current snapshot
  (REDERIVE_FRESH_SNAPSHOT, derivationOk true) and required resolver
  RESOLVED before browser launch; human-refreshed auth state passed all
  structural/boolean gates (cookie pageReadable=true, expired=false; no
  auth:capture in-session); exact-head CI gate PASS; containment unchanged.
- **Execution (ONE invocation)**: `npm run phase9b:real` with
  `NIGHTWATCH_PHASE_9B_CI_RUN_ID=31938800275`, LAUNCHER-EXIT=0. FIRST and
  REPLAY both decisive PASS (resolved 1, receipts 1, PASS 1, ANOMALY 0,
  NOT_APPLICABLE 0, decisive 1, invariants passed 3, safety all zero);
  semantic + journey replay deterministic; zero hard semantic outcomes.
  Expectation `ripple.common-exchange.read.real-source-shape` @
  ripple-api `169df39d` (evidence digest
  `ev:sha256:608265368c9a086f43c94e5c`).
- **Audit**: structural privacy audit PASS (no screenshots/traces/
  storage-state copies/media; trace disabled; live auth readability VALID
  both passes; zero semantic-oracle events); siblings pinned and unchanged;
  worktree clean. Product contact accounting: launcherInvocations 1 /
  browserContextsCreated 2 / devObservationPasses 2 / completedJourneyPairs
  1.
- **Next step**: a fresh roadmap/design review for the next bug-hunting
  bottleneck (Phase 9 complete; no next phase implementation in R1).

## Post-Phase-9 design review — next bug-hunting architecture (design complete; implementation NOT authorized)

The post-Phase-9 design review (`post-phase-9-next-architecture-design-review`,
Phase `POST-9-DESIGN`, authorization
`POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, 2026-08-16, starting
SHA `aba46a9a`) recomputed the bug-yield bottleneck from current source
(NOT the old Phase 9 runner-up ranking) and selected:

```
PHASE_9_STATUS: COMPLETE (terminal; 9B-R1 VERIFIED/PASS, D-57)
CURRENT_PRIMARY_POST_PHASE9_BOTTLENECK:
  INSUFFICIENT_REAL_SEMANTIC_DEPTH
POST_PHASE_9_NEXT_ARCHITECTURE:
  DEEPER_REAL_SOURCE_SEMANTICS
NEXT_PHASE: PHASE_10 — Deeper Real-Source Semantic Contracts
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
```

Evidence basis: all 4 admitted real-source expectations are shape-only
(root TYPE_MATCH ARRAY + FIELD_PRESENT per item key; `admission.ts:135-145`);
real-DEV-accepted count 1; L3+ invariant count 0/4; coverage rows capped at
~4-5 operations by the approved read-only surface while depth has provable
headroom in the pinned ripple-api source ((object) cast,
`CURRENCY_RANGE_VALIDATE`, vendor permission lists); P(detection) is the
term with the most headroom in `surfaces × P(defect) × P(detection) ×
P(actionable)`. NEXT_AFTER: HIGH_CONFIDENCE_SEMANTIC_TRIAGE (incl.
follow-up finding #1 — real minimization false-1-MINIMAL certification
risk, `orchestrator.ts:799-802` + `phase7-real-campaign.ts:360-366`) and
REAL_SEMANTIC_COVERAGE_EXPANSION; VIABLE_LATER: BROWSER_API_SEMANTIC_
DIFFERENTIAL and CAMPAIGN_SEMANTIC_YIELD_INTELLIGENCE; DEFER:
SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION, MULTI_PRODUCT_EXPANSION,
SELF_DEVELOPMENT_2ND_ADOPTION. Decision D-58; full analysis in
`docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md`. Phase 10 is NOT started
and NOT authorized; no implementation authority granted; variant B remains
AVAILABLE_NOT_ADOPTED; promotion authority NONE; catalog count 1 (digest
`sha256:bd35b934...`); Phase 6 remains FROZEN_BY_OWNER; AI remains
non-authoritative.

## Phase 10 — Deeper Real-Source Semantic Contracts (Phase 10A complete, local/synthetic; Phase 10B DEV acceptance complete)

**Status:** `PHASE_10_DEEPER_SEMANTIC: COMPLETE` /
`PHASE_10A_STATUS: COMPLETE` / `PHASE_10B_STATUS: COMPLETE` /
`PHASE_10B: COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED` /
`PHASE_10B_DEV_RESULT: PASS` / `DEEP_INVARIANT_DEV_VALIDATION: VERIFIED` /
`PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED` / `PHASE_10_STATUS: COMPLETE`
(2026-08-17, D-60). Phase 10A implementation record:
`docs/design/PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md`, D-59, and
`.agent/tasks/phase-10-deeper-real-source-semantic-contracts/`; Phase 10B
acceptance record: `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`, D-60, and
`.agent/tasks/phase-10b-contained-dev-deep-semantic-acceptance/`.

- **Current-source re-verification**: read-only remote metadata →
  mobingilabs/ripple-api master `169df39d…` (canonical checkout untouched
  at the Phase 5 pin `27bb007a`; disposable /tmp snapshot used).
  `ExchangeRate.php` byte-identical across the SHAs. Common-exchange
  `exchange_rate` is ALWAYS a JSON OBJECT (the empty case is `(object)`-cast
  to `{}` — D-58's "ARRAY when empty" claim refuted by the actual cast
  direction); payer-exchange `exchange_rate` is OBJECT-or-ARRAY (`[]` when
  no rates). Finite output-key sets are NOT mechanically provable
  (`SOURCE_ENUM_FLOW_UNPROVEN` — `CURRENCY_RANGE_VALIDATE` is write-path
  validation only) ⇒ no finite-key invariant, no class-constant extractor.
- **Machinery**: recipe schema v2
  (`nightwatch.real-source-expectation-recipe.v2`) for common-exchange +
  payer-exchange with item-level field type contracts proven by the fixed
  bounded `PHP_ITEM_FIELD_TYPE_FLOW` extractor (EMPTY_CAST_OBJECT ⇒ OBJECT;
  EMPTY_ARRAY_OR_STRING_KEYS ⇒ OBJECT|ARRAY; else TYPE_FLOW_AMBIGUOUS); new
  fixed invariant `TYPE_IN_SET`; common uses the existing `TYPE_MATCH
  OBJECT`; deep expectation IDs `...real-source-deep` (the historical
  `...real-source-shape` IDs stay historical-only via archived v1 recipes
  under `corpus/phase10/historical/`); semantic expectation DTO stays v1
  (vocabulary additive); evidence digest binds the type-flow evidence and
  fails closed on unknown extraction kinds; admission + resolver fail
  closed on unknown extractor kinds.
- **Proof (synthetic)**: 4 seeded deep defects — baseline shape-only
  detects 0/4, enriched detects 4/4; benign 10 cases / 0 false positives
  (incl. the payer valid empty-ARRAY union representation); sentinel sweep
  - unknown-key probe 0 leaks; derivation determinism 3 repeats / 0
  mismatches; source currentness matrix A–E + §44 mutation canaries fail
  closed; synthetic campaign/dossier integration with baseline zero
  semantic evidence; owner-local canary at the current snapshot 169df39d:
  4/4 derived, depths [2,2,3,3] (L3+ = 2/4).
- **Validation**: typecheck/hardening PASS; focused Phase 9+9A.1+9B+10
  matrix 342 passed; full Playwright 1137 passed / 1 skipped (pre-existing
  environment-conditional) / 0 failed; exact implementation CI
  31946005458 green 32/32 at `6cef0c45`; fresh clean-checkout acceptance
  green; catalog byte-identical `bd35b934...` (count 1); agent:check/audit
  strict 0; project:check PASS at clean tree.
- **Boundaries**: NO DEV/NEXT/production; no new endpoints/journeys; no
  campaign/triage core change; no finite-key contracts; no projection
  schema change; no Phase 6/AI/selfDev/promotion/catalog; the real
  minimization false-1-MINIMAL follow-up finding (#1) stays with
  HIGH_CONFIDENCE_SEMANTIC_TRIAGE (NEXT_AFTER).
- **Next**: STOP. Phase 10B contained DEV acceptance was EXECUTED
  (2026-08-17, D-60): ONE common-exchange journey pair, the enriched deep
  expectation `ripple.common-exchange.read.real-source-deep` re-derived at
  the fresh snapshot (digest `ev:sha256:1447fe1342d804528a062b73`),
  FIRST + fresh-context REPLAY both clean deep PASS (4/4/0/0/0,
  deterministic), zero safety events; see
  `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`. NEXT ACTION remains STOP —
  next architecture requires a separate post-Phase-10 design review.

## Post-Phase-10 design review — next bug-hunting architecture (design complete; implementation NOT authorized)

`POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS: COMPLETE` (2026-08-16). The
owner-authorized design review (`post-phase-10-next-architecture-design-review`,
Phase `POST-10-DESIGN`, authorization
`POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, starting SHA
`1d7dd6cb6525195e59602e106f50306859a7998d`) recomputed the useful-bug-yield
bottleneck from current source after the terminal Phase 10 and selected the
next bug-hunting investment (D-61; full analysis in
`docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md`):

```
PHASE_10_STATUS: COMPLETE (terminal; 10B VERIFIED/PASS/NONE_OBSERVED, D-60)
CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK:
  COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP
POST_PHASE_10_NEXT_ARCHITECTURE:
  BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION
NEXT_PHASE: PHASE_11 — Bounded Collection-Wide Semantic Evaluation
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
```

Evidence basis (source-verified, not lore): all 4 admitted real-source
contracts are collection-style (top-level ARRAY of row objects). Item-level
invariants evaluate only item 0 (blueprint itemIndex:0 in all 4 registry
recipes; admission builds single-index paths; invariant evaluator resolves
exactly one numeric node; projection retains up to 128 items but nothing
consumes more than one). A synthetic proof (throwaway test, deleted after
the run) confirmed: a defect at row 1, 57, or 200 of a multi-row response
is invisible (PASS) for FIELD_PRESENT, TYPE_MATCH, and TYPE_IN_SET, while
row-0 violations are detected (ANOMALY). The real minimization gap
(invalidReducedReplay stub) remains CURRENT (D-58 finding #1, unfixed).
Differential has 0 viable pairs. Coverage expansion is capped at ~4-5
shallow targets. P(detection) is the dominant term with the most headroom;
collection-wide evaluation directly raises it on the existing real L3+
contracts. Triage (D-58 NEXT_AFTER) NOT auto-selected: creates zero
detections, latent until a natural anomaly exists.

NEXT_AFTER: HIGH_CONFIDENCE_SEMANTIC_TRIAGE, REAL_SEMANTIC_COVERAGE_
EXPANSION; VIABLE_LATER: BROWSER_API_SEMANTIC_DIFFERENTIAL,
SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE; DEFER: SOURCE_CHANGE_GUIDED_
SEMANTIC_SELECTION, DEEPER_RELATIONAL_SEMANTICS, MULTI_PRODUCT_EXPANSION,
SELF_DEVELOPMENT_2ND_ADOPTION, SECOND_DEEP_DEV_CANARY.

Phase 11 is DESIGNED, NOT STARTED, NOT AUTHORIZED. Implementation requires
a fresh owner authorization (`PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_
ONLY` for the local/synthetic Phase 11A; optional later
`PHASE_11B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` for one contained DEV
acceptance of the collection-wide coverage). Machine-checked truth block
unchanged: catalog count 1 (digest `sha256:bd35b934...`),
variant B AVAILABLE_NOT_ADOPTED, promotion authority NONE,
`PHASE_8_STATUS: COMPLETE`. Phase 6 remains FROZEN_BY_OWNER; AI remains
non-authoritative.

## Phase 12 — Semantic Yield & High-Confidence Triage (Phase 12A complete-local, CI-blocked)

**Status:** `PHASE_12A_STATUS: BLOCKED_EXTERNAL_CI` /
`PHASE_12_REAL_REPLAY: VERIFIED_LOCAL_NOT_CI_VERIFIED` /
`PHASE_12_HIGH_CONFIDENCE_TRIAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED` /
`PHASE_12_REAL_SOURCE_COVERAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED` /
`PHASE_12_YIELD_BACKTEST: VERIFIED_LOCAL_NOT_CI_VERIFIED` (2026-08-19, D-62,
implementation SHA `4730c4e3c0f2d5c27864b5966bdf9c8c86bba6c4`). The two
ROADMAP NEXT_AFTER investments — HIGH_CONFIDENCE_SEMANTIC_TRIAGE and
REAL_SEMANTIC_COVERAGE_EXPANSION — are now implemented-local. Task record:
`docs/design/PHASE_12_SEMANTIC_YIELD_AND_TRIAGE.md`, D-62, and
`.agent/tasks/phase-12-semantic-yield-high-confidence-triage/`.

- **Workstreams A–F** implemented and locally verified on a clean `4730c4e`
  tree: replay-plan strict DTO + synthetic journey/exploration/API adapters
  around the existing bounded minimizer; semantic triage-evidence DTO +
  categorical HIGH-confidence blocking + dossier v2 READY predicate; semantic
  cluster identity bound to evidence digest + derivation (not source SHA);
  fresh-current-source coverage inventory (ripple-api master
  `e026c85522d201724033f024456da3efa17fe07a`, disposable snapshot) over 6
  approved read-only targets with 0 mechanically provable uplifts and precise
  independent blockers; fixed `corpus/phase12` 27-fixture backtest proving
  `phase12Minimized(16) > baselineMinimized(0)` with all quality floors 0 and
  3× determinism 0 mismatches; hardened pure-core boundaries + Phase 12
  local/synthetic CI matrix row.
- **Reproduced gap**: the real Phase 7 adapter's `invalidReducedReplay()`
  baseline is permanently reproduced (`baselineInvalidReplay=23` / 27,
  `baselineMinimized=0`); Phase 12 closes the replay-plan/minimization wiring
  for synthetic/local use without new endpoint/transport authority.
- **Validation (clean 4730c4e)**: typecheck PASS; hardening:check PASS;
  canonical complete Playwright 1365 passed / 4 skipped / 0 failed;
  topology-correct isolated clone (fresh `git clone --local` + `npm ci`) 1365 /
  4 / 0; Phase 12 focused 127 passed; Phase 9/10/11 compatibility 257 passed;
  campaign:synthetic 27 passed; agent:check PASS.
- **Boundaries**: NO DEV/NEXT/production; no new endpoints/journeys/targets;
  no campaign/triage core change beyond Workstreams A–F; no Phase 6/AI/
  selfDev/promotion/catalog mutation; catalog count 1 (digest
  `sha256:bd35b934…`); Phase 6 remains FROZEN_BY_OWNER; AI remains
  non-authoritative.
- **External CI**: GitHub Actions remains externally billing/spending-limit
  blocked before job execution (run 32269149776 — "The job was not started
  because recent account payments have failed or your spending limit needs to
  be increased."). The task terminates as BLOCKED_EXTERNAL_CI, NOT
  CI-verified COMPLETE. No CI-success claim is made.
- **Next**: STOP. Phase 11B DEV acceptance remains separately NOT_AUTHORIZED.
  Any real Phase 12 replay/triage runtime validation requires future separate
  owner authorization.

## Phase 13I — Residual Runtime Completion & Integrated Shadow Proof (implemented-local, CI-blocked)

**Status:** `PHASE_13I_STATUS: BLOCKED_EXTERNAL_CI` /
`PHASE_13_SEMANTIC_PROMOTION: VERIFIED_LOCAL_NOT_CI_VERIFIED` /
`PHASE_13_REPLAY_V2_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED` /
`PHASE_13_SHADOW_CAMPAIGN: VERIFIED_LOCAL_NOT_CI_VERIFIED` (2026-08-20, D-63,
implementation SHA `186122f96741c57f5d5fdf4cca3ec1e9328a9f30`). Phase 13H's four
residual local gaps (semantic routing, structural FAILURE certification at the
real adapter, shadow corpus, version-drift proof) are now closed local/
source-only. Task record:
`docs/design/PHASE_13I_RESIDUAL_RUNTIME_COMPLETION.md`, D-63, and
`.agent/tasks/phase-13i-residual-runtime-completion-shadow-proof/`.

- **Dual routing** — CandidateSemanticEvidence-gated orchestrator:
  `CampaignSemanticEvidence` (`nightwatch.campaign-semantic-evidence.v1`,
  safe categorical-only, unknown/sentinel/certification rejected) routes
  semantic candidates through `semanticClusterKey`/`semanticContractIdentity`
  (expectation+target+invariant+repo+evidenceDigest+derivation binding,
  ignoring ordinal/count/timestamp/SHA movement, splitting on
  digest/derivation/target/expectation/invariant) with distinct
  `sc:sha256` namespace (D13 no-collision); protocol-only retains
  historical `clusterAnomalies()`. Persisted candidate + checkpoint ledger
  validators allowlist the new field; v1 historical compat preserved,
  v2 readback routes through `parseBugDossierV2`.
- **Replay V2** — Real-adapter Phase-7 campaign is occurrence-bound: every
  replay builds/validates `TriageReplayPlanV2`, maps retained actions to
  unambiguous occurrence ordinals (duplicate action IDs: retain first vs second
  distinct planIds; reordered/invented → rejected; ambiguous duplicate →
  INVALID fail-closed), calls `executeReplayPlanV2(plan, injectedExecutor)` —
  only the injected executor may return FAILURE (different fingerprint → PASS,
  throw → INVALID). API exactly one fixed operation; journey reduced remains
  `PRECONDITION_DIVERGENCE`; no product execution.
- **Shadow** — `corpus/phase13` (42 synthetic fixtures: 11 replay, 16 semantic
  truth, 3 protocol, 12 drift; synthetic-only, privacy sentinels excluded from
  durable evidence) + `src/core/phase13/shadow.ts`
  (`nightwatch.phase13.shadow.v1`, pure, synthetic executors only,
  `stableJson` deterministic key, 3× 0 mismatches) + `tests/unit/phase13Shadow.test.ts`
  (26 tests). All floors 0: false reproduction / structural-only certification /
  false READY / false HIGH / PARTIAL false READY / stale-unavailable false READY /
  unsafe-private false READY / cluster fragmentation / cross-contract merge /
  drift miss / privacy leaks / authority expansion.
- **Ledger/drift** — `CampaignDossierRecord.dossierVersion` optional (v1/v2
  both accepted, READY ↔ bugCandidates enforced); 8-field manifest drift
  already bound and fail-closed before executor; frozen bundle cannot auto-rebind;
  morning brief never overstates unresolved semantic evidence.
- **Validation (clean 186122f)**: typecheck PASS; hardening PASS; canonical
  complete Playwright 1391/4/0 (workers=1); topology-correct isolated clone
  (sibling-symlink layout, `npm ci`, full Playwright) 1391/4/0; Phase 13I focused
  26; campaign:synthetic 27; owner-provenance 91; Phase 12 compat 76; fresh-source
  40 (G01 remote `e026c855…` fresh, G02 disposable matches, G03 canonical 0 writes);
  catalog 1 (`sha256:bd35b934...`); agent:check PASS; project:check dirty
  pre-push only.
- **External CI**: GitHub Actions externally billing/spending-limit blocked
  before job execution on `186122f` (run 32325943234 — job not started —
  billing/spending-limit). NOT CI-verified COMPLETE; local-validated
  `BLOCKED_EXTERNAL_CI`.
- **Next**: STOP. Phase 11B/13B remain separately NOT_AUTHORIZED. Any real
  promotion/replay runtime validation requires a future contained-DEV authorization.

## Phase 14A — Mechanical Real-Source Contract Expansion (implemented-local, CI-blocked)

**Status:** `PHASE_14A_STATUS: BLOCKED_EXTERNAL_CI` /
`PHASE_14_MECHANICAL_SOURCE_EXPANSION: VERIFIED_LOCAL_NOT_CI_VERIFIED` (2026-08-20,
implementation SHA `16d4ebe6c94582cf2402cfe117a19ce559fa58d2`, atop `6507df6…`).
A versioned, deterministic, bounded mechanical-contract analyzer
(`nightwatch.mechanical-contract-analyzer.v1`,
`src/oracles/expectations/extract/analyzer.ts`) was added with an additive
non-mutating `analyzerProbe` layer in `coverageInventory.ts`. The six existing
approved read-only targets were re-evaluated against the fresh disposable
ripple-api snapshot `e026c855…`; the historical Phase-12 blockers
(`TYPE_FLOW_AMBIGUOUS` ×2, `AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`,
`GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`) were reproduced and preserved, and **0
real-source uplifts** were admitted (ambiguous source remains ambiguous). The
synthetic corpus (`corpus/phase14`, 30 fixtures) proves 12 positive / 16
rejection classes with all floors 0 (false-admission, privacy-leak,
stale-false-current, unsupported-false-proof, determinism-mismatch). Full
local/source acceptance is green: typecheck PASS, `hardening:check` PASS,
canonical Playwright `1454 passed / 4 skipped / 0 failed`, `agent:check` /
`agent:audit` 0 strict errors, `project:check` clean, `git diff --check` clean.
Task record: `docs/design/PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION.md` and
`.agent/tasks/phase-14-mechanical-source-contract-expansion/`.

- **External CI**: GitHub Actions remains externally billing/spending-limit
  blocked before job execution (known condition). NOT CI-verified; local-validated
  `BLOCKED_EXTERNAL_CI`.
- **Next**: STOP. Phase 11B/13B remain separately NOT_AUTHORIZED. Any real
  campaign / promotion runtime validation requires a future contained authorization.

## Phase 15P — Parallel Local Project Completion (implemented-local, CI-blocked)

Executed 2026-08-21 under `PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY`
(D-64): one parent integrator plus sixteen specialized sub-agents (A01–A16) in
isolated local worktrees replaced the four-session execution shape. Sessions
1–2 of the four-session program were already complete on main; the remaining
Sessions 3–4 architectural backlog was absorbed into assignments A10–A16.
All sixteen assignments integrated focused-green across four dependency waves
plus the A16 final seam (final implementation SHA `42c5a7e1ab3f438a9c82688f2eee645d3c548d64`;
73-file changed manifest in the Phase-15P HARDENING_HANDOFF). New local/source
architecture: contract lifecycle model, converged semantic vocabulary,
source-contract movement classifier, schema-coherence hardening + historical
reader table, load-bearing candidate lifecycle gates (GATE_BLOCK), branded
validated-plan replay seam, truthful minimality evidence, noise-immune
clustering + confidence ceilings + strengthened dossier-v2 READY,
resume-drift classifiers + idempotent unresolved ledger, local readiness API
(`nightwatch.local-readiness.v1` + `status:local` CLI), artifact validation
facade, project snapshot + classified diff, privacy/authority bounding,
78-class adversarial corpus, compatibility convergence guards, and a
10-variant synthetic release-candidate rehearsal (deterministic ×3).
Terminal state: IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING;
`PHASE_15_INTEGRATED_HARDENING` REQUIRED_NEXT under its own owner token.
NOT CI verified (external billing block persists), NOT DEV accepted, NOT
production ready; Phase 11B and Phase 13B remain NOT_AUTHORIZED.

## Phase 15H — Whole-System Integrated Hardening (terminal: BLOCKED_EXTERNAL_CI)

Executed 2026-08-22 under `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`
(D-65) over the 105-file Phase-15P mass-bulk round (base `abc9bf9…` ->
`c2640cb08…`, 17 commits, intentionally unvalidated by owner direction until
hardened). Repair-and-proof discipline throughout: compiler first — initial
`npm run typecheck` recorded 26 errors / 13 files, all repaired in source as
DEF-01..DEF-13 (notably DEF-06, a real orchestrator stale-bookkeeping
carryover bug fixed writer-side with the integrity validator kept strictly
fail-closed; and DEF-12, the SELFDEV_AUTHORITATIVE_PATHS transitive-closure
gap that left every selfDev fixture mirror unresolvable). Assertions were
never weakened to recover green; stale pins moved only onto mechanically
proven current truth.

Local acceptance evidence (all on earned hardening SHA
`06ea7ca62b1d5c8770d42622d4655e942ec68336`): typecheck PASS;
hardening:check PASS; focused contract sweep 367 passed / 0 failed;
adversarial corpus executable (66 definitions, deterministic builders/
executors, >=3 repeats) with every quality floor zero (floor batch at
closure: 121 passed / 0 failed); campaign:synthetic 27/0 and
owner-provenance 91/0 twice; complete unit sweep 1955/0/4 across phase
families 1–15; canonical complete Playwright workers=1 **2063 passed /
0 failed / 4 skipped** (exit 0) with all four skips inventoried as
pre-existing environment guards; topology-correct isolated run (fresh clone,
`npm ci`, `NIGHTWATCH_PROXY_PORT=19123`, read-only sibling symlinks
reproducing the required REPOSITORIES layout after an evidenced 8-failure
topology-missing attempt) **exact-matched canonical at 2063/0/4**. A15
deletion/de-export sweep: zero Git-level file deletions in the whole mass
round; 147 removed exports / 55 files with zero surviving external
references; 2996/2996 relative specifiers resolve; trust roots 46/46
transitively closed; one deliberate restoration (DEF-01). Privacy/authority
review clean; catalog count/digest unchanged; promotion authority NONE.

CI truth: Actions run 32554139535 for the exact validated SHA completed in
~1 second with ZERO steps executed (job 96985562679; log blob absent;
annotation = account billing/spending-limit block), inspected once without
retry-looping. Terminal state:
`PHASE_15H_STATUS: BLOCKED_EXTERNAL_CI`,
`PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_NOT_CI_VERIFIED`. NOT DEV
accepted, NOT production ready; Phase 11B and Phase 13B remain
NOT_AUTHORIZED. NEXT ACTION: STOP.

## Phase 16CH — portfolio runtime-binding hardening (terminal: BLOCKED_EXTERNAL_CI)

Phase 16CH closed the remaining local hardening obligation for the Phase-16C
portfolio runtime-binding seam under
`PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`. DEF-01 repaired
reserve-feasibility arithmetic without relaxing the documented three-API
rejection boundary; DEF-02 sanitized unsafe external field-name diagnostics.
The permanent regressions, 171-case adversarial corpus, x3 determinism proof,
affected compatibility cone, campaign synthetic run and owner-provenance run
are recorded in the task report.

Canonical complete Playwright and a topology-correct isolated clone both
passed 2,232 tests, skipped the same four environment-conditional tests, and
failed zero tests. The isolated clone used `npm ci`, read-only aggregate
sibling symlinks and a distinct `NIGHTWATCH_PROXY_PORT=19123`. Catalog identity
and promotion authority were unchanged. Actions run 32624917568 / job
97158631282 executed zero steps under the standing billing/spending block, so
the terminal state is local-green / `BLOCKED_EXTERNAL_CI`, not CI-green.

Phase 16D remains a separately owner-gated, unauthorized contained-DEV
decision. The next development program must remain LOCAL / SOURCE / SYNTHETIC
and must be routed through a new task after a fresh repository audit.

## Phase 17 — change-aware campaign and evidence hardening (terminal local; CI externally blocked)

Phase 17 was the local/source/synthetic development program under
`PHASE_17_LOCAL_SOURCE_SYNTHETIC_CAMPAIGN_INTELLIGENCE_AND_EVIDENCE_HARDENING`.
Implementation checkpoint `482ed51814ce8e8f7d67de7edc9a98786240430c` adds:

- a pure source-impact overlay from Phase 3 `SelectionResult` into the
  approved Phase 16 portfolio allocator, with explicit direct/shared/
  transitive/fallback/stale/irrelevant/unlinked dispositions and deterministic
  sanitized reasons;
- canonical change/correlation identity across property-order permutations
  and omitted optional fields;
- strict baseline document admission with bounded identities, safe provenance,
  own-field checks, canonical order, duplicate rejection, and status/reference
  consistency;
- privacy-safe duplicate diagnostics and occurrence-honest replay evidence
  that refuses to promote repeated-action ambiguity to proven minimality;
- a reusable nine-case source-change corpus and repeated-run byte-stability
  proofs;
- a narrowed privacy identity detector after the integrated regression found
  that broad account vocabulary rejected the legitimate
  `ripple-account-inventory.read` target.

The terminal local evidence is typecheck PASS, hardening PASS, Phase 17
focused 27/0, readiness/rehearsal repair matrix 52/0, affected compatibility
142/0, synthetic campaign 27/0, owner provenance 91/0, canonical full
2259/0/4, and topology-correct isolated full 2259/0/4 with exact parity. The
isolated clone used `npm ci`, read-only aggregate sibling symlinks, and
`NIGHTWATCH_PROXY_PORT=19123`; its Nightwatch tree was clean. Actions run
32628613509 / job 97167784939 executed zero steps under the standing
external billing/spending block, so this is not a CI-green claim.
This phase grants no DEV/NEXT/production, data/infra, sibling-write,
publication, AI/selfDev/promotion, or Phase 16D authority. Phase 6 remains
`FROZEN_BY_OWNER` and Phase 11B/13B remain unauthorized.

## Never in scope (any phase)

- `production` as a runnable environment (D-4).
- Writes to production data (E8 data-plane sharing makes env isolation
  impossible; only sandbox-MSP mutations, Phase 4+ whitelisted, are ever
  considered).
- Any mechanism that bypasses request-level inspection (D-2).
- Credentials in the repository or artifacts (D-13).

## Phase 18 — semantic contract depth, replay fidelity, and confidence-aware triage

Phase 18 extends the existing semantic path rather than creating a parallel
oracle. It adds eight bounded business-behavior anomaly classes with benign
controls, explicit source currentness, sanitized observation contracts,
occurrence-bound replay V3, deterministic synthetic semantic minimization,
replay outcome taxonomy, confidence degradation, semantic clustering, source
impact × semantic coverage reasons, and richer sanitized owner dossiers.

The permanent local corpus repeats semantic, replay, minimization, confidence,
privacy, parser, and authority cases deterministically. Required quality
floors are zero, and canonical and topology-correct isolated full regressions
have exact parity at 2,281 passed / 4 skipped / 0 failed. Actions run
`32637996369` / job `97190524900` executed zero steps under the standing
billing/spending restriction, so external CI is blocked rather than green.
Phase 18 remains
strictly LOCAL / SOURCE / SYNTHETIC; real-product acceptance, DEV/NEXT/
production contact, data or infrastructure work, sibling writes, publication,
AI authority, promotion, and raw evidence persistence remain out of scope.

## Phase 19 — autonomous bug-yield expansion and integrated campaign intelligence

Phase 19 is the current local/source/synthetic implementation wave. It turns
the established Phase 9–18 mechanisms into one explicit deterministic loop:

source/change impact → affected behavior/contracts → prioritized campaign plan
→ semantic/protocol execution → replay → minimization → stability/confidence
→ clustering → owner dossier → yield and coverage learning.

The additive campaign-intelligence package provides versioned plan, impact,
coverage, yield, replay V4, minimization V2, nondeterminism, cluster V2,
confidence V2, and dossier V3 DTOs. Priority is an explainable bounded model
with reason codes and hard safety/currentness/authority exclusions. Coverage
is staged rather than Boolean, and yield attribution identifies productive
scenarios and oracle families. The source impact report expresses affected
contracts, expectations, scenarios, stale/re-derivation needs, and coverage
gaps, so planning is behavior-aware rather than filename-only.

Replay divergence, minimality proof strength, instability, duplicate identity,
confidence degradation, diagnostic remediation, and owner next actions are
explicit and privacy-safe. A generic product adapter boundary is proven by a
synthetic-only second-product fixture; the real registry remains Ripple-only.
The data-driven Phase 19 corpus has 31 adversarial cases.

Local evidence at the implementation checkpoint is focused 12/0, affected
cone 414/0, synthetic campaign 27/0, owner provenance 91/0, and canonical
full 2,293 passed / 4 skipped / 0 failed out of 2,297. The established
topology-correct isolated clone has exactly the same enumeration and skip
inventory. No Phase 19 capability grants DEV/NEXT/production, cloud/data/
infrastructure, sibling-write, publication, AI, or self-development authority.

## Phase 20 — semantic coverage saturation and cross-surface differential detection

Phase 20 is the terminal local/source/synthetic implementation wave. It composes
Phase 19 campaign intelligence with a deterministic source-derived contract
inventory, explicit admission/currentness states, a source-evidence graph,
relational and cross-surface semantic oracles, metamorphic relations, bounded
synthetic mutants, and owner-safe explanation depth.

The synthetic corpus discovers 22 candidates from 6 bounded source artifacts;
21 are mechanically provable/admitted and 1 is rejected with
`UNSUPPORTED_SYNTAX`. The graph has 157 nodes, 151 edges, and 86 lifecycle
gaps. It contains 13 relational kinds represented by 12 records, one declared
browser/API equivalence pair, and three metamorphic fixture relations. The
mutation measurement generated 34 mutants, 32 applicable and detected, 0
surviving, 31 benign controls, and 0 benign false positives. The adversarial
matrix has 88 cases in 15 families, including 6 benign controls.

The Phase 19 planner now consumes semantic gap reasons and composes bounded
preview campaigns without gaining execution authority. Local operator views
cover contracts, gaps, coverage, campaign preview, findings, and explain.
Source-keyed caches are bounded to 16 entries and invalidate on source identity
changes. The repaired synthetic auth-monitor seam now synchronizes injected
health failure and reviewed browser-background classification, preserving the
existing safety policy.

Local closure evidence at implementation checkpoint
`c58684046d66b2a68234a06c62dea889829d4110` is typecheck PASS, hardening PASS,
focused Phase 20/auth 27/27, Phase 9–20 compatibility 1,275/1,275,
`campaign:synthetic` 27/27, owner provenance 91/91, and canonical plus
topology-correct isolated full suites 2,309 passed / 4 skipped / 0 failed out
of 2,313 with exact enumeration and skip identity parity. Phase 20 remains
LOCAL / SOURCE / SYNTHETIC and does not add DEV/NEXT/production, data,
infrastructure, sibling-write, publication, AI, self-development, or
execution authority. The validated implementation checkpoint is
`c58684046d66b2a68234a06c62dea889829d4110`; synchronized checkpoint
`6e4fdebe74bd34e81d9d3f320154488973b46d12` is on `origin/main`. The one
post-push Actions inspection timed out before returning run data, so external
CI remains blocked/unobservable and is not called green.

## Phase 21 — semantic gap closure, privacy-safe membership, and differential replay saturation

Phase 21 is the terminal local/source/synthetic closure wave for the measured
Phase 20 graph. It preserves the 86-gap baseline and adds a versioned closure
ledger, bounded privacy-safe finite-set membership, explicit differential
pair/alignment evidence, contract-bound replay equivalence, dependency-aware
minimization, scenario binding synthesis, quality levels, graph normalization,
dossier V5, operator gap views, and a deterministic gap-driven campaign loop.

The final synthetic graph is 239 nodes / 233 edges / 3 residual gaps. The
ledger preserves all 86 baseline identities: 83 are obsolete after graph
rebuild, 0 are actionable, and 3 remain irreducible for explicit source-proof
reasons. Differential discovery grows from one explicit pair to 22 candidate
rows / 21 admitted pairs; replay gaps fall 18 -> 0 and minimization gaps
15 -> 0. Membership measurement is 46 generated / 46 applicable / 46 detected
/ 0 surviving with 33 benign controls / 0 benign false positives. The
integrated campaign is 67 generated / 67 applicable / 67 detected / 0
surviving with 54 benign controls / 0 benign false positives and 67 replayed,
minimized, high-confidence detections. Four of seven metamorphic kinds are
exercised; three remain source-proof `NOT_JUSTIFIED` boundaries. The expanded
corpus is 151 cases across 23 families.

Local validation is Phase 9–21 compatibility 1,295/1,295, owner provenance
91/91, `campaign:synthetic` 27/27, typecheck/hardening PASS, and exact
canonical/topology-correct isolated parity at 2,333 enumerated / 2,329 passed
/ 4 skipped / 0 failed. The four skip identities are
`tests/unit/phase5Api.test.ts:197`, `:246`, `:280`, and
`tests/unit/selfDevSandboxConfinement.test.ts:147`. The implementation
checkpoint is `69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a`; external CI remains a
separate post-push observation. No DEV/NEXT/production, data/infra,
sibling-write, publication, AI, self-development, or execution authority is
added.
The one permitted Actions inspection observed run `32672981417` / job
`97276539731` for the pushed checkpoint; both concluded `failure` and the job
returned `steps=[]`, recorded as the external billing/spending restriction.
No retry was made and local validation is not called CI green.

## Phase 22 — contained DEV semantic calibration and bounded real-campaign acceptance

**Goal.** Establish a truthful, fail-closed bridge from the saturated Phase
19–21 semantic pipeline to a small read-only DEV acceptance campaign without
expanding Nightwatch into production, NEXT, mutation, datastore, infrastructure,
or publication scope.

**Delivered local/source/synthetic work.** Deterministic real-eligibility and
source-freshness classification, fresh read-only source re-derivation,
immutable `nightwatch.dev-semantic-acceptance-manifest.v1` planning with a
six-target maximum, Preflight V2 receipts, a second category-only observation
privacy firewall, collection projection and real differential classification,
Replay V4, synthetic-to-real calibration/confidence, Dossier V6, owner-local
operator commands, hostile privacy tests, and an exact no-contact dry run.

The final source snapshot was Ripple SHA
`85e400a8b32fc23c05464033a2a6d5fff2a2890c`. Six candidates were considered and
three collection targets were eligible and frozen:
`ripple.common-exchange.read`, `ripple.payer-exchange.read`, and
`ripple.account-inventory.read`. The manifest has safe ID
`manifest:sha256:3c0d357a25328212f7011d1d`, digest
`manifest:sha256:978c0e63310ea4f80d918cda`, three FIRST plans, three replay
plans, and six observation contexts. No eligible membership contract or real
differential pair was available.

**Terminal disposition.** `BLOCKED_BEFORE_DEV`. The stronger executable
pre-DEV CI gate failed before any browser/API contact: Actions run
`32681204267`, job `97298112036`, `steps=[]`; failed-log retrieval timed out.
No DEV launcher was invoked, no auth state was read, and all restricted safety
vector counts are zero. Local acceptance evidence is Phase 22 focused 7/7,
Phase 9–22 compatibility 1,302/1,302, synthetic campaign 27/27, owner
provenance 91/91, typecheck/hardening/project PASS, and canonical/isolated
2,336 passed / 4 skipped / 0 failed out of 2,340 with exact parity. A future
Phase 23 should first restore an exact green CI gate and revalidate owner-only
DEV authentication before creating a fresh manifest; bounded acceptance is
not product correctness certification.

## Phase 23 — executable CI gate recovery and bounded DEV decision

Phase 23 is terminal at `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`. It unifies local,
disposable clean-checkout, and GitHub Actions acceptance behind the versioned
`nightwatch.quality-gate.v1` definition, keeps CI serial and offline, measures
test duplication, and mechanically rejects workflow drift. The validated
implementation checkpoint is
`98ce2faa3eaf1282a0e61cbd37ec2c9895ac5b9b`; Node20 CI-mode and clean-checkout
receipts are green, with exact canonical/isolated parity at 2,364 enumerated /
2,360 passed / 4 skipped / 0 failed.

The exact current-head Actions run `32709452878` / job `97377543621` matched
that checkpoint but had `steps=[]`; the classifier returned
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. Pre-DEV V3 is
`BLOCKED_EXTERNAL_CI`, auth was not read, and DEV observations are zero. No
Phase 24 work should expand product surfaces, bypass CI, or revisit the
owner-frozen infrastructure/data layer. Any future attempt requires fresh
owner direction, a genuinely executed green exact-head gate, and a newly
derived manifest.

## Phase 24 — local autonomous triage depth and DEV-readiness acceleration

Phase 24 is terminal at `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`. Its scope was
local, source-derived, synthetic, deterministic, offline, and no-contact work
while GitHub Actions remained externally blocked. The implementation checkpoint
is `cec14ac8e1b189aed96a1b8488381083951411f6`.

Delivered capability includes:

- source snapshot analysis with exact identity/drift handling, explicit
  eligible/excluded reason details, source-change invalidation, and deterministic
  diversity-aware portfolio prioritization;
- manifest v3 binding source, candidates, eligibility, semantic/replay plans,
  environment, containment, owner policy, quality-gate identity, and operator
  state, with adversarial identity invalidation coverage;
- a no-contact rehearsal from manifest through candidate selection, policy,
  containment, browser/action planning, oracle/replay/dossier attachment, and
  teardown;
- twelve deterministic semantic oracle classes and five exact paired
  cross-candidate relations, all freshness/provenance bound;
- replay/minimization v3 with seven distinct divergence classifications and
  invariant-preserving synthetic minimization;
- structured sanitized dossier vNext, code/component/repository provenance
  with ambiguity states, privacy sentinels, explicit readiness blockers, and
  conservative exact-head CI classification;
- adversarial proxy lease coverage for ownership, stale children, rapid and
  parallel runs, symlink refusal, startup failure, SIGTERM, and SIGINT;
- eight distinct synthetic candidates, 28/28 synthetic campaign tests, and a
  clean Node20 reproducibility gate with no hidden auth/findings state.

Local certification passed: the shared nine-group gate passed with receipt
`receipt:sha256:c6da9a1edf31f47ac1b14d19`; Phase 9–24 compatibility is 1,824
total / 1,823 passed / 1 skipped / 0 failed, owner provenance is 91/91, and
the current inventory has 133 unique authoritative test files with zero
duplicate test-file executions. The disposable clean receipt is
`clean-receipt:sha256:719495ba80a55e351d8f24fb`. Phase 23's exact
canonical/isolated parity baseline remains 2,364 enumerated / 2,360 passed /
4 skipped / 0 failed; Phase 24 certified the changed compatibility cone and
clean checkout without duplicating that long regression.

The one final Actions observation was run `32723603497` / job `97419996717`
for the exact implementation SHA. It failed before executing any job step
(`steps=[]`) and was classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. This is
not green CI and does not indicate a Nightwatch code failure. No DEV launcher
or auth read occurred. Phase 25 should begin only after an actually executed
exact-head green gate, then repeat fresh source qualification, manifest,
containment, no-contact rehearsal, and the guarded DEV decision. Infrastructure
and data-layer work remain permanently frozen.

## Phase 25 — real-source surface discovery and source-boundary hardening

Phase 25 is terminal at `COMPLETE_LOCAL_SOURCE_EXPANSION`. It remained
LOCAL / READ-ONLY SOURCE / SYNTHETIC ONLY and did not invoke DEV, read auth,
contact a product, or touch data/infrastructure systems. The implementation
source-expansion checkpoint is `042300c7c59fd8218afabc761e31691139d0c657`;
the validated continuity implementation checkpoint is
`f5356f3d94973b5ffc95c60623bf027a2864bfb5`; the preceding compatibility
checkpoint is `3e69c857dd5409675b6c2d8d13b59cfc87232576`; the last known pushed
documentation checkpoint is `de4822ec8151a7de83c3f89ce325a003257077e6`.

Delivered capability includes:

- hardened no-follow sibling source access with exact supported Git HEAD
  resolution, `.git` shape rejection, regular-file and scan-budget bounds;
- fixed versioned scan configuration and deterministic inventory keyed by
  actual inspected content as well as source/config/analyzer identity;
- reuse of existing PHP, TypeScript/JavaScript, Go, OpenAPI, Phase 20, and
  Phase 24 proof machinery for bounded route, contract, join, graph, and
  read-only evidence;
- direct source-descriptor → Phase 24 candidate/portfolio/selector flow,
  shape-aware contract drift, incremental invalidation, review ranking,
  component/runtime correlation, bounded cache, and local JSON/human views;
- synthetic end-to-end proof from source snapshot through semantic evaluation,
  replay/dossier construction, and no-contact rehearsal.

The approved real-source smoke inspected one repository, `mobingilabs/ripple-api`
at SHA `27bb007ad0c798800b6bd3b29760c966422966e7`: 96 files considered, 95
admitted, 1 privacy rejection, 1,750,958 bytes read, 128 bounded operations,
127 route proofs, 25 response/semantic contracts, 118 proven joins, and 10
rejected joins. Existing-runtime correlation yielded three eligible
Phase 24 surfaces (billing-group exchange, payer exchange, and common exchange)
and no invented target; 125 surfaces remained excluded with explicit reasons.
The 6-repository approved universe remains the scan boundary.

Local certification passed: Phase 9–25 compatibility was 1,847 total / 1,846
passed / 1 skipped / 0 failed across 135 registered files; the authoritative
gate passed with receipt `receipt:sha256:5eaca4cc32395a1fe14506bd`; the Node20
clean gate passed with receipt `clean-receipt:sha256:1ba9cf9c64ee3ac582fd9edf`;
owner provenance was 91/91; the synthetic campaign was 29/29; the gate
inventory had 141 unique files and 0 duplicate executions; and fresh canonical
and topology-correct isolated full Playwright runs both passed 2,403 / skipped
4 / failed 0 out of 2,407 with identical skip identities.

The one exact-head Actions observation was run `32741057138` / job
`97475353760` at the pushed continuity head. The required job had zero steps,
so the truthful classification is `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not
green CI. No retry was made. Phase 26's highest-value remaining local/source
campaign is to expand mechanically proven response and semantic contract
coverage for the 125 currently excluded surfaces, beginning with the 103
response/semantic-proof gaps while retaining fail-closed ambiguity handling;
DEV acceptance remains a separate future authorization.

## Phase 26 — mechanical response and semantic contract coverage expansion

Phase 26 is terminal at `COMPLETE_LOCAL_SOURCE_EXPANSION`. It remained LOCAL /
READ-ONLY SOURCE / SYNTHETIC ONLY and preserved the Phase 25 source boundary,
existing semantic vocabulary, and Phase 24 portfolio authority.

The approved six-repository scan inspected 1,732 bounded files, read 1,092,
admitted 1,078, rejected 654, and inspected 12,449,877 bytes at exact current
source identities. It discovered 128 operations, proved 127 routes and 127
request contracts, and used strict PHP direct-return analyzers to raise
response contracts — `responseContracts` = surfaces with `responseProof === 'PROVEN'` at `src/core/source/eligibilityCensus.ts:728` and `src/core/source/surfaces.ts`, measured over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3; see D-105 for whole-population 58 of 223 under C-01 — from 25 to 62 and semantic contract observations from 25
to 138. Lifecycle coverage moved from 103 `DISCOVERED` to 66, with 59
`MECHANICALLY_PROVEN` and the same three `PROJECTABLE` surfaces. Phase 24
eligibility stayed at 3/128; the 125 exclusions remain explicit rather than
being relaxed.

The remaining response proof gaps are 8 dynamic-key/incomplete-branch cases,
22 incomplete-branch/unsupported-syntax cases, 26 unsupported-syntax cases,
9 missing-symbol cases, and 1 outside-scope case. Strict alias/branch negative
controls add no unsupported authority. Source evidence, diagnostics, graph
lineage, currentness, cache identity, invalidation, review explanations, and
the source-to-Phase24 synthetic campaign are all covered by the Phase 26
tests. No raw source is persisted.

Validated implementation is `bb3a41b735e5dece4170712075e44ccf4a02f716`; the
certification/documentation descendant is `b6d61a4ee7534e81af5819e87baef45e78dd81af`.
Local certification passed: typecheck, hardening, quality-gate spec, gate
inventory, owner provenance (91), synthetic campaign (30), agent continuity,
agent audit, project truth, the unified local gate (receipt
`receipt:sha256:5c6ae5ac430baf126e6b6299`), and the Node20 clean gate (receipt
`clean-receipt:sha256:3119a0ff4ebcfdf0903f0a`). Compatibility passed 1,873
with 1 skip and 0 failures across 139 files. Fresh canonical and
topology-correct isolated full Playwright runs both enumerated 2,435 tests,
passed 2,431, skipped the same four environment-conditional tests, and failed
zero. The exact-head Actions run `32783079546` / job `97609144140` matched the
implementation SHA but executed zero steps and is classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; it is not green CI and was not retried.

The highest-value Phase 27 campaign is a new bounded local/source pass for
exact PHP helper/resource/DTO response-flow joins covering the remaining
`return $this->...` and unresolved-symbol families. It should begin by proving
one named declaration and branch-complete flow at a time; fuzzy matching,
runtime execution, deployment inference, and Phase 24 authority changes remain
out of scope.

## Phase 27 — exact interprocedural response-flow intelligence

Phase 27 continued the roadmap as a local/source/synthetic-only campaign. Its
fresh census used the same six approved repositories and exact current SHAs as
Phase 26. It classified the remaining response gaps and found no current
route with an exact mechanically observable helper, resource, or DTO boundary.
The campaign therefore combined bounded oversized-string lexical hardening
with a conservative future-proof resolver rather than relaxing proof rules.

The resolver identity is
`nightwatch.real-source-response-flow.v1`. It resolves only exact named
same-class, same-file `self`, exact unnamespaced static, and same-file named
function calls at depth <=2. It requires current approved declarations,
branch-complete terminal returns, common existing response shape, dependency
lineage, cycle/ambiguity rejection, and deterministic content-bound identity.
Dynamic dispatch, fuzzy/import/inheritance/trait/interface resolution,
factories, framework behavior, opaque resource/DTO serializers, and runtime
execution remain excluded. The graph, cache, invalidation, review, lifecycle,
semantic materialization, and Phase 24 seams are additive integrations of the
existing authorities.

The lexical hardening raised current-source response contracts — `responseContracts` = surfaces with `responseProof === 'PROVEN'`, measured over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 for whole-population 58 of 223 under C-01 — from 62 to 83
and semantic observations from 138 to 175. Current-source operations/routes,
joins, mutation/read-only counts, and Phase 24 eligibility remained unchanged
at 128 / 127 / 118 proven + 10 rejected / 47 + 5 / 3 eligible + 125
excluded. The flow resolver attempted 13 unresolved current patterns and
proved none; no helper/resource/DTO join was manufactured. Lifecycle moved to
45 `DISCOVERED`, 80 `MECHANICALLY_PROVEN`, and 3 `PROJECTABLE`.

All local and clean Node20 gates passed. Canonical and topology-correct
isolated complete Playwright runs both enumerated 2,444 tests, passed 2,440,
skipped the same four environment-conditional tests, and failed zero. The
single exact-head Actions observation was run `32800403605` / job
`97659975725` at the pushed implementation anchor; it had `steps=[]` and is
classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. No retry was made. The
campaign remains local/source/synthetic only, and the next campaign must be
chosen from a fresh census rather than pre-decided coverage targets.

## Phase 28 — evidence-driven source-intelligence hardening

Phase 28 is a local/source/synthetic-only hardening campaign. It begins with a
fresh census of all six approved repositories and admits a new proof family
only when current source demonstrates an exact, branch-complete,
dependency-current, bounded, mechanically falsifiable pattern. The preferred
single-function local producer/alias candidate was investigated first and was
not admitted: the current source population contains zero strict
single-assignment direct-literal candidates, alongside 34 literal/control-flow,
16 multiple-assignment, 12 no-assignment, and 4 opaque variable-return cases.

The campaign adds taxonomy v3 over sanitized source/surface metadata,
categorical rejection-family and analyzer-version dimensions, bounded
source/token/declaration/return-site budgets, exact resolver resource reasons,
same-SHA dependency/currentness regressions, deterministic taxonomy deltas,
and advisory source-scan performance metrics. The existing graph, cache,
invalidation, review, operator, synthetic campaign, quality gate, lifecycle,
and Phase 24 seams remain the authorities; no parallel portfolio or source
debug surface was created.

The current approved-source census is 1,732 files considered / 1,092 read /
1,078 admitted / 654 rejected / 12,449,877 bytes, with 128 operations, 127
route proofs, 127 request contracts, 83 response contracts, 175 semantic — historical measurement over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`) at analyzer v3 (snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`); see D-105 for whole-population 58 of 223 under C-01 —
observations, 118 proven and 10 rejected joins, lifecycle 45/80/3, and Phase
24 at 3 eligible / 125 excluded. Response flow attempted 13, proved 0,
rejected 13, and resolved 0 current calls. The taxonomy reports 45 proof-gap
surfaces and 325 rejected diagnostics under
`nightwatch.real-source-gap-taxonomy.v3`; all new and existing negative
controls remain fail-closed.

Phase 28 has no DEV/NEXT/production, authenticated-browser, data-plane,
cloud/infra, sibling-write, publication, self-development-promotion, or AI
runtime authority. Final certification and the successor campaign are chosen
from the terminal measurements, not preselected here.

## Evidence-backed successor — exact response-flow declaration binding hardening

**Status:** `COMPLETE_LOCAL_NOT_CI_VERIFIED` at validated implementation
checkpoint `1570547db9069c2a19d4c42c3e27e496ff1b5f01` (2026-08-25). This is a
correctness hardening campaign selected after a fresh integrated audit, not a
preselected Phase 29.

The fresh census of all six approved repositories exactly reproduced the Phase
28 source snapshot and structural metrics: 1,732 files considered / 1,092
read / 1,078 admitted / 654 rejected / 12,449,877 bytes; 128 operations / 127
route proofs / 127 request contracts / 83 response contracts / 175 semantic — historical over pre-C-01 128 cap at analyzer v3; see D-105 —
observations / 118 proven joins / 10 rejected joins; lifecycle 45/80/3; Phase
24 3 eligible / 125 excluded; and response flow 13 attempts / 0 proven / 13
rejected / 0 resolved. No new producer-flow family or other excluded family
cleared the mechanical admission threshold.

The audit did reproduce two existing false-positive proof admissions: a
same-class `$this` call could cross file boundaries, and a named static call
could bind to a non-static method. The repair requires exact originating path,
repository/source SHA, class, visibility, staticness, supported class shape,
and namespace facts; ambiguous or stale declarations fail closed. The
response-flow identity is v2 so existing caches cannot reuse pre-hardening
results. Public sanitized DTOs and all Phase 24, graph, review, lifecycle,
privacy, and owner-scope authorities remain unchanged.

Focused and dependency-cone regressions, synthetic campaign, owner provenance,
all local/clean gates, and canonical/topology-correct isolated full suites
passed. Both full suites enumerated 2,459 tests, passed 2,443, skipped the
same 16 understood environment-conditional tests, and failed zero. External
CI was not run and is not claimed green. No successor is selected here; any
future campaign must begin with a new evidence census and authorization.

## Control Center V2 — authority integration and whole-repository hardening

The Control Center successor is complete as
`COMPLETE_LOCAL_READ_ONLY_SYNTHETIC`. It wires the existing local run,
approved-source, Phase 24/campaign, and owner-local findings authorities into
the V1 loopback server through bounded in-process readers and existing
allowlist adapters. It preserves explicit empty, stale, unavailable, blocked,
unknown, and error states; no second selector or persistence authority was
introduced.

The snapshot coordinator binds source/campaign/findings generations, coalesces
same-key reads, keeps failed refreshes explicit, and shuts down terminally.
SSE remains advisory notification-only. The server accepts only loopback,
read-only access and has no browser, child-process, network, Git-mutation,
sibling-write, or refresh side effect authority.

The built-server synthetic browser qualification proves non-empty Overview,
Safety, Runs, Execution, Campaign, Source, and Findings views, selected-run
stability across advisory refresh, no external requests, and no raw sentinel
leakage. The whole-repository audit found no Critical or High defect. A
low-risk hygiene ignored-output false-zero was repaired in the bounded
read-only report; generated-output retention remains owner-controlled and
observe-only.

Local certification passed: the affected Control Center/hygiene suite 48/48,
nested UI tests 11/11, built UI 257471 bytes with no external references,
built browser 1/1, semantic compatibility 1,870 passed / 13 skipped / 0 failed,
owner provenance 91/91, synthetic campaign 61/61, local gate receipt
`receipt:sha256:0418c067ad0839582ef21427`, Node20 clean receipt
`clean-receipt:sha256:8cc28a83b3c1a90629fba0ce`, and canonical serial Playwright
2,502 passed / 16 skipped / 0 failed out of 2,518. External CI was not run
and is not claimed green. Any future campaign requires a new authorization and
fresh evidence.

## Evidence-backed successor — read-only eligibility proof expansion

This local/source/synthetic campaign is terminal as
`COMPLETE_LOCAL_NOT_CI_VERIFIED` at validated implementation checkpoint
`1525951a0d65ed1a59b8678c03a886f433600d09`. It was selected from a fresh live
census rather than from sequential phase numbering. The current source did
not justify a new mechanically complete read-only proof family, so no new
proof schema, write-effect vocabulary, interprocedural authority, or Phase 24
selector was admitted.

The terminal six-repository inventory remains 1,732 files considered / 1,092
read / 1,078 admitted / 654 rejected / 12,449,877 bytes, with 128 operations,
127 routes, 127 request contracts, 83 response contracts, 175 semantic — historical over pre-C-01 128 cap at analyzer v3 (checkpoint `1525951a0d65ed1a59b8678c03a886f433600d09`); see D-105 —
observations, 118 proven joins / 10 rejected joins, 47 mutation-capable
operations, 5 independently proven read-only operations, lifecycle 45/80/3,
and Phase 24 at 3 eligible / 125 excluded. The additive eligibility census
digest is `source-eligibility-census:sha256:902c5712c885adefa6ded945`; the
investigation-only candidate digest is
`source-readonly-candidate-census:sha256:88c370e8523e03e06e52a3d9`; the gap
taxonomy reports 45 proof-gap surfaces and 325 rejected diagnostics. All 76
read-only-method-only surfaces carry another source or downstream blocker, so
read-only proof is not a sufficient unlock condition in this snapshot.

Candidate-family results are: direct pure-return handlers 0 strict current
examples; exact bounded cones 13 attempts / 0 complete, rejected for dynamic
dispatch, unsupported helper syntax, or incomplete branch coverage; the
five-entry known-read registry is the existing baseline; and GET-only is a
negative control with 0 read evidence. Naming, comments, route names, HTTP
GET, and absence of an obvious write remain non-authoritative.

All nine local quality-gate groups passed. Semantic compatibility was
1,884/1,871/13/0, owner provenance 91/91, synthetic campaign 64/64, local
receipt `receipt:sha256:de8867e0064f7eb9fd1ffe7a`, and Node20 clean receipt
`clean-receipt:sha256:b5c17633d147ac65a53140cd`. Canonical and
topology-correct isolated complete Playwright both enumerated 2,521 tests,
passed 2,505, skipped 16 environment-conditional tests, and failed zero. A
single first isolated journey-fixture failure was reproduced 5/5 as passing;
the complete isolated rerun was green and no assertion was weakened. External
CI was not run and is not claimed green. No prohibited contact, auth read,
mutation, data/infra operation, sibling write, publication, AI call, or
canonical promotion occurred.

No successor is selected here. Any future campaign must begin with a fresh
live Git and approved-source census and a separately authorized evidence-backed
direction.

## Evidence-backed successor — source-to-campaign proof-chain expansion

This local/source/synthetic campaign is terminal as
`COMPLETE_LOCAL_NOT_CI_VERIFIED` at validated implementation checkpoint
`74f28356fd615eb51b4842f40a49ed6fc269c68f`. It was selected from a fresh live
Git and approved-source census, not from sequential phase numbering.

The additive v2 census is
`source-eligibility-census:sha256:1a71425620210ac5fa6af6c4`, bound to source
snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`. It measures all twelve
ordered proof-chain stages, first and secondary blockers, source currentness,
repository/language distribution, unsupported constructs, runtime/replay/
dossier compatibility, and bounded structural cost. The result is 128
operations; 127 route proofs; 127 request contracts; 83 response contracts; — historical over pre-C-01 128 cap at analyzer v3 (checkpoint `74f28356fd615eb51b4842f40a49ed6fc269c68f`); see D-105 —
83 semantic-contract surfaces / 175 observations; 47 mutation-capable; 5
proven read-only; 118 proven / 10 rejected joins; 5 exact runtime bindings /
123 source-only; 5 replay-proven / 123 unproven; 128 dossier-compatible; and
Phase 24 at 3 eligible / 125 excluded. First blockers are 44 response,
37 mutability, 43 read-only, 1 route, and 3 complete.

The family audit rejected response-contract, semantic-contract,
runtime-binding, join-graph, and bridge expansion as insufficiently proven by
the current source. Semantic gaps are not independent of response gaps;
runtime source-only identities cannot authorize execution; joins and the
Phase-24 bridge reconcile with existing authorities. No new selector,
mutability registry, runtime adapter, persistence authority, or heuristic was
introduced. Control Center source-summary v2 exposes only bounded diagnostics.

Outcome B is therefore earned: proof-chain census infrastructure and operator
observability improved without a coverage unlock. The only reproduced defect
was a full-suite-only synthetic cancellation timing race; a 25 ms dispatch
delay before the fixture's intentional abort, against a 100 ms fixture
response, repaired it without weakening assertions or safety classification.

Final local evidence: quality definition digest
`sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`;
local gate `receipt:sha256:341bc43e00b9a2219bfb2082`; Node20 clean gate
`clean-receipt:sha256:ebe268bb7588be07ce88eb13` with gate receipt
`receipt:sha256:f174bce0224dacc42a1b6cf8`; semantic compatibility
1,884/1,871/13/0; owner provenance 91/91; synthetic campaign 66/66; and
canonical/topology-correct isolated Playwright 2,524 enumerated / 2,508
passed / 16 skipped / 0 failed with exact parity. Exact-head GitHub Actions
run `32956612882` completed with failure; its sole job `98139552089` completed
with failure and zero steps, so CI is not validation evidence. No successor is
selected; any future work requires a fresh census and separate authorization.

## Evidence-backed successor — source-proof soundness and static discovery hardening

This local/source/synthetic successor repairs three reproduced soundness
defects in the existing source-to-campaign chain: PHP direct-return
fall-through, raw-text static route discovery, and raw-text PHP declaration
counting. The bounded direct analyzer now requires reachable-exit completeness;
the static route boundary uses a non-executing lexical tokenizer; and all
cross-file proof joins remain content-digest-bound and fail closed when stale.
The response analyzer identity is v4. No new selector, proof family, or
promotion authority was added.

At implementation checkpoint
`15fe2c108d6b044f4e0b3a99d2b83e7feb81c157` (analyzer v4 post-hardening, commit `15fe2c1`; prior `83` was same metric `responseContracts` = surfaces with `responseProof === 'PROVEN'` at analyzer v3 pre-hardening), the fresh approved-source result — measured over the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`; 43+9+76=128 is the cap, not whole population), discovery `source-surface-discovery:sha256:906830010ed198639d3c7b91`, snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad` —
is 128 operations, 127 routes, 127 request contracts, 43 response-contract
surfaces, 53 semantic observations, 118 proven / 10 rejected joins, and
Phase 24 at 3 eligible / 125 excluded — historical capped measurement, not whole-population truth. The first honest whole-population measurement under C-01 at the same snapshot is `58` of `223` (`routeOperationsFound: 223`, `routeOperationsTruncated: 0`, `responseContracts: 58`, `source-surface-discovery:sha256:21de18a23a387d7b816db3c0`); see D-105. The eligibility digest is
`source-eligibility-census:sha256:2f97b732e0472df347f695a1`; the read-only
candidate census remains investigation-only at
`source-readonly-candidate-census:sha256:c54347c14d4d1e5f95f18660`. The exact
family disposition is `NO_SAFE_NEW_FAMILY`.

The focused 74-test cone, semantic compatibility 1,901/1,888/13/0, owner
provenance 91, synthetic campaign 66, local gate, and fresh Node20 clean gate
passed. The closure-document local gate passed all nine groups with receipt
`receipt:sha256:c92ef378c757194871718953`. Canonical enumeration is 2,555
tests in 209 files.

Documentation checkpoint `b4c6b715f90de5814ec8e939b1d255c36f32db5c` was pushed
without force. The one exact-head Actions observation matched that head as run
`33031299302`; its sole job `98384195570` (`Executable quality gate`) completed
with `failure` and `steps=[]`. This is external non-evidence under the
zero-step billing/platform classification, not a CI-green claim. No operation
moved from read-only-method-only to proven read-only, projectable, or Phase 24
eligible. Terminal continuity for this campaign is complete.

## Durable artifact and Control Center truth hardening

This campaign is terminal as `COMPLETE_LOCAL_NOT_CI_VERIFIED` at validated
implementation/test checkpoint `c3d69039d4f2a9969118d877b432c6b4a2f5d09c`
(source implementation anchor `01f2ac0608931b83aed0b5c948ed3a4471de7e01`)
with final documentation checkpoint `d2c606c26f598626f24dd94a11cb7fad18887607`.
It restores strict runtime acceptance for persisted dossier v1/v2 records and
converges Control Center findings currentness on one conservative reducer.

The bounded artifact audit accepted all `14/14` canonical registered-kind
fixtures and rejected all `55/55` nested mutations without input mutation.
The reproduced dossier false accepts were rejected by both owning validators
and the facade, while valid historical controls remain accepted. The findings
truth table is: empty/malformed/unknown → `SOURCE_UNAVAILABLE`; stale
tracking reference without unknown → `SOURCE_STALE`; all non-empty
current-class members → `CURRENT`. Authority, adapter, projected metadata,
and collector paths agree across permutations, duplicates, and the 256-member
bound. Control Center corruption, generation, refresh-failure, server, and
seven-view built browser behavior remain sanitized and fail closed.

Current-head local and clean Node20 quality gates passed all nine groups with
semantic compatibility `1,903/1,890/13/0`, owner provenance `91`, and
synthetic campaign `66`; final local receipt
`receipt:sha256:b26864ec34f00438044c1076`, clean gate
receipt `receipt:sha256:186a15aed5e9dbbd9c95ab1d`, and clean receipt
`clean-receipt:sha256:d9c6c98dd7a83b0bab0a40d6`. The final canonical serial
regression passed `2,548/2,564` in `4.5m`, skipped `16`, and failed `0`.
External CI was not observed because no current policy required an exact-head
observation; it is not claimed green. No successor is selected.

## Historical final assurance release-readiness campaign — terminal blocked

As of 2026-08-28, the final assurance task has completed its local/source/
synthetic audit and is terminally `PROJECT_NOT_COMPLETE_BLOCKED`. The
retry-free safety surface, deterministic restricted-OOPS substitute,
semantic/provenance/synthetic checks, Control Center UI qualification, exact
canonical suite and topology-correct isolated suite are green with identical
13-skip identity sets. The exact browser background telemetry seam is
classified narrowly and does not expand the allowlist.

The closure local gate passed all 10 groups with receipt
`receipt:sha256:9be40f964db15574714632d0`; the fresh Node 20 clean gate passed
all 10 groups with gate receipt `receipt:sha256:5a7f5dcf518189c23f315253` and
clean receipt `clean-receipt:sha256:cdd966a52941eb94363ca082`.

The one exact-head Actions observation for pushed head
`9f0f2d7c267d12a2ddd14c50eb5b916f0e9fc0d9` was run `33139304292` / job
`98746329861` and completed with `failure` and `steps=[]`; it is
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence. No retry was
made.

The remaining L6 process/DNS containment was explicitly unproven in that
predecessor because the parent relay was incompatible and browser speculative
DNS remained outside L5. Authenticated OOPS stayed fail-closed. The successor
below is the separately authorized route for a safe rootless proof; no real
environment, data layer, cloud/infrastructure, credential, sibling-write or
publication work is authorized.

## Historical final completion and L6 containment campaign — terminal local/clean certified

`nightwatch-final-completion-and-l6-containment-v1` was the successor route at
that checkpoint. It re-audited every current tracked path and implemented the smallest
rootless L6 envelope that can be mechanically proven: a no-external-interface
Bubblewrap namespace, minimal read-only root view, exact runtime binding,
namespace-local bounded HTTP/upgrade relay, and inherited AF_UNIX parent
transport. Direct DNS/TCP/UDP/HTTP/HTTPS, IPv6/mapped-address, descendant,
browser speculative/background, WebSocket and parent-death cases are synthetic
qualification requirements. Authenticated OOPS remains readiness-gated and
fails closed on any unsupported or lost containment state.

Fresh local, clean Node 20, canonical/isolated, UI and adversarial receipts
are complete. Release checkpoint `2576c5751d33bb40046246e8fcf57c7cc5c30a57`
contains substantive implementation `e278da19f5fbc62107528033716f271cbb64e1de`.
The canonical and topology-correct isolated suites each pass `2604` of
`2617`, with the same 13 justified environment skips and zero failures. The
local gate receipt is `receipt:sha256:94f8c00ea1f09d81a5973947`; the clean
Node 20 receipt is `clean-receipt:sha256:5459eedccc6e5c05eabf2786`; UI and
L6 adversarial matrices are green. GitHub Actions run `33190456115` / job
`98914301082` matched the release checkpoint but executed zero steps with no
runner (`runner_id=0`), so the truthful terminal outcome is
`PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`, not CI-certified.

That local/clean certification is historical. The successor campaign
`nightwatch-operational-acceptance-v1` first reached
`OPERATIONAL_ACCEPTANCE_BLOCKED` at `e615b3b` when guarded DEV probes stopped
at the safety/auth boundaries without valid owner capture. After
owner-authenticated capture at 2026-08-30 20:00 (valid until 2026-08-31 07:59
PST) and nine implementation repairs through `598e7fa92fb99786b2db847ace8c1fdf566d3c71`
(QSelect semantics, active detection, exact matching, anchor decision,
pending-only oracle settlement), the serial workflow completed as
`OPERATIONALLY_ACCEPTED` (phase2c clean matrix `151602`, phase5 PASS,
campaign `8224bb0e` COMPLETE_CLEAN with 5/5 and 0 anomalies; one real product
anomaly `GET /m/blue/billing/v1/billinggroups` malformed-json correctly
surfaced via Phase4 and attributed to DEV). The post-acceptance successor
`nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` is
COMPLETE at implementation `59c44e00b3a07765fcf4ce7fac3ce1b811ea15da` plus docs
`1bf286b` (handoff/hardening/project/agent/synthetic/owner/CC/gate local PASS;
fresh census 04ff5839 with 43/53 vs 83/175 soundness and NO_SAFE_NEW_FAMILY;
real DEV requalified b1debd41 5/5; perf N² Map).

## Final reproducibility and polish — terminal COMPLETE — 2026-08-31

The completed successor `nightwatch-final-reproducibility-polish-v1` closed the
remaining reproducibility evidence after post-acceptance hardening. The clean
Node 20 gate passed at implementation checkpoint `d12b1d7` with a fresh install,
no auth or owner-finding state, no sibling writes, and clean before/after
receipts. The `ONBOARDING.md` bootstrap and baseline path was verified.

Canonical and topology-correct isolated full suites matched exactly:
`2661` enumerated, `2648` passed, `13` identical environment skips, and `0`
failures. The isolated run used a fresh no-hardlink Nightwatch checkout plus
six detached approved-source clones under the expected repository topology;
aggregate sibling symlinks correctly failed closed under the no-follow source
reader. The local gate passed all `10` groups; the final local receipt was
`receipt:sha256:b6d2e61df1c7c5969fb895a7` and the final clean receipt was
`clean-receipt:sha256:7a00dd503f78cfb0f308d653` with nested gate receipt
`receipt:sha256:1d402605037d763913e301ae`.

Contained DEV requalification used the external owner-managed state with
headed mode and traces disabled. Phase 2C passed on a bounded retry, Phase 5
passed `1/1`, and fresh Phase 7 prepare/resume completed `5/5 COMPLETE_CLEAN`
with zero anomalies and zero safety counters. Phase 4 retained the known DEV
`billinggroups` malformed-JSON product anomaly as `FATAL_ORACLE`. Final task
reconciliation and acceptance validation completed with typecheck, hardening,
agent, project, handoff, history-audit, and Git hygiene passes. This successor
does not create a new operational verdict; future work requires a fresh
authorization.

## Post-acceptance reliability, yield, and state protocol — terminal COMPLETE — 2026-08-31

The successor `nightwatch-reliability-yield-and-state-protocol-v1` closed the
remaining locally actionable reliability and protocol weaknesses without
changing the project verdict. The delayed-response reproducer identified two
Nightwatch-owned defects: premature oracle settlement and response-time
mutable intent attribution. The observer/engine now tracks intentional
requests through a bounded settlement barrier and binds responses to the
originating request intent. Replay comparison canonicalizes only plain-object
key order, preserves array order/multiplicity, rejects unsupported/cyclic/
oversized evidence, and classifies unknown capture as a framework defect.

The current source census remains `NO_SAFE_NEW_FAMILY`. Yield improved through
deterministic proof-aware scheduling: 128 considered / 3 eligible / 3
selected, scores `953245 > 953140 > 953105`, zero selected redundancy, and
byte-identical repeated planner projections. The explicit state protocol now
uses bounded `PRESERVE`, `REEVALUATE`, and `SUPERSEDE` effects; task-name
prefixes and incidental status prose no longer authorize project truth.
Cache/property claims were strengthened to exercise their authoritative inputs
and invariants.

Final canonical and topology-correct isolated suites were exactly 2,690 total
/ 2,677 expected / 13 skipped / 0 failed or flaky, with identical skip
identities. The local and Node 20 clean gates passed all ten groups; Control
Center checks passed; isolated checkouts and all six detached source clones
remained clean. The current external DEV continuation was truthfully
auth-blocked before browser-context creation (`HUMAN_AUTH_ACTION_REQUIRED`),
so no new DEV reliability rate is claimed and prior accepted DEV evidence is
not relabeled. `OPERATIONALLY_ACCEPTED` remains preserved. A future fresh DEV
sample requires owner-managed authentication refresh and a separately
authorized successor.

The final pushed checkpoint was inspected once by Actions (run `33361000650`,
job `99392187476`) and failed before any job step (`steps=[]`); this remains
external non-evidence, while the local and clean gates are the authoritative
validation for this locally scoped successor.

## Bounded DEV requalification — COMPLETE — 2026-08-31

The owner-authorized successor `nightwatch-dev-requalification-v1` is
terminal COMPLETE. It repaired DVR-001 through DVR-012 and preserved
`OPERATIONALLY_ACCEPTED`. Final current-source campaign
`campaign:sha256:1054b8271440fc29f7fb5f21` ended truthfully as
`PARTIAL_RUNTIME_INFRA_FAILURE / PREFLIGHT_FAILED` with
`BODY_UNAVAILABLE`, zero product candidates/dossiers, zero safety counters,
privacy `PASS`, and no product finding. The outcome exposes residual capture
fragility and replay starvation, not a new product finding or Nightwatch
internal defect.

## DEV capture soak, replay, and yield — COMPLETE — 2026-08-31

Completed successor: `nightwatch-dev-soak-replay-yield-v1`.

This campaign measures residual capture instability over a larger bounded
serial DEV sample and attempts current-manifest replay/dossier closure only
when DVR-011 admission produces a fresh eligible candidate. It targets ten
Phase 2C invocations, five Phase 4 explorations, five Phase 5 cycles, and five
fresh Phase 7 campaigns unless a stop-worthy defect or auth/environment
boundary intervenes.

The campaign must repeatedly reach account-inventory where guarded runtime
conditions permit, quantify `BODY_READ_TIMEOUT`, `BODY_UNAVAILABLE`,
settlement/capture success and candidate conversion, and repair any
Nightwatch-owned Critical/High capture or replay defect before further real
execution. Historical replay fingerprints are evidence only and never
executable authority.

The project verdict remains `OPERATIONALLY_ACCEPTED` through
`PROJECT_VERDICT_EFFECT: PRESERVE`. Any genuinely invalidating evidence must
stop this task and use the explicit `REEVALUATE` protocol. Production, NEXT,
mutation, datastore, infrastructure, sibling writes, publication, credential
persistence, raw authenticated evidence, and containment weakening remain
unauthorized.


## Replay budget and dossier closure — COMPLETE (DEV confirmation starved) — 2026-09-01

Active successor: `nightwatch-replay-budget-and-dossier-closure-v1`.

The completed DEV soak admitted eight fresh strict product candidates across
four campaigns, but all four reproduction queues failed before executor entry
because the three collection journeys exhausted `journeyContexts=3/3`.

M2 is complete at
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`: the finite real-scale replay
reserve, durable reservation ledger, strict checkpoint validation, freshness
and eligibility gates, and interruption/resume behavior pass local and clean
Node20 validation. Exact-head Actions run `33446473458` / job `99666610250`
failed with `steps=[]` and no log, so CI is external non-evidence.

The owner completed one guarded headed capture for the designated DEV state;
post-login verification, atomic state/provenance writes, validation, and
cleanup passed without exposing secret values or storage-state contents.

The fresh current-source campaign
`campaign:sha256:37aca1e950ab804e3a6fd592` prepared and resumed successfully
with manifest `manifest:sha256:41cdedac2beff0d59125ee1a`, frozen to source
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`. It completed all five selected
read-only work items with `COMPLETE_CLEAN`, zero safety counters, and privacy
`PASS`.

It observed two protocol-only anomaly candidates and two clusters, but both
were rejected before candidate replay with
`REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`. No candidate replay reservation or
executor entry occurred; minimization, dossier, and product-finding counts
were zero. The two source-bound API items completed their ordinary
first-plus-fresh replay pairs, consuming two aggregate replay units distinct
from candidate attack replay.

The bounded terminal result is
`REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`. DVR-011 admission was not
weakened, no candidate was manufactured, and no product finding is claimed.
Safety counters remained zero and privacy was `PASS`. Final local and clean
Node20 quality gates passed at
`5383428710076ad8c645a86d7d282409d3642ba8`; the project verdict remains
`OPERATIONALLY_ACCEPTED` through `PROJECT_VERDICT_EFFECT: PRESERVE`.
No further DEV attempt is authorized for this task. No alternate credentials,
predecessor checkpoints, historical candidates, stale manifests,
production/NEXT contact, mutation, datastore, infrastructure, publication,
sibling write, or unbounded retry is authorized.

## Frontier planning baseline — production observability & whole-system map — 2026-09-01

`PLANNING_ONLY`. The owner-authorized broad planning audit
(`openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/`)
established a fresh whole-system architectural baseline before the next
roadmap change. It produced no implementation, no environment/allowlist/auth
change, no DEV/NEXT/production contact, and grants no new authority.

Canonical documents (change dir `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/`):

- `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` —
  gap matrix, 15 dependency-ordered campaigns, critical path, and the 20 hard
  production-readiness gates.
- `audit.md` — evidence baseline: Nightwatch as-built plus the 148-repository
  company census, every claim evidence-classed.
- `design.md` — target architecture: fact taxonomy, whole-system model,
  two-witness read-only proof, `PROD_OBSERVE`, privacy firewall, System Map V2,
  coverage ledgers, bug-hunting loop.
- `docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md` —
  34 hazards with prevention/detection/containment/evidence/recovery/test and
  five stated residuals.
- `tasks.md`, `specs/` — campaign checklist and requirement deltas.
- `docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md` — **independent second-reviewer architecture
  review** (`PLANNING_ONLY`, same change dir). Re-measured every load-bearing
  claim; confirmed the diagnosis and the `PROD_OBSERVE` architecture;
  corrected `B-6` (retracted), `B-8` (LOW → HIGH), `B-7`/`U-6`
  (`parseOpenApiRoutes` is reachable — `blueapi/openapiv2/apidocs.swagger.json`
  holds 591 operations and 1,179 definitions readable with **no new parser**);
  and found that `W-EFFECT_CLOSURE` is unsound as specified because it is
  rooted at the handler and misses a middleware that calls a production
  webhook on every GET. Adds campaigns C-00, C-02a, C-08b; adds hazards
  T-35…T-48 and residuals R-6…R-8; withdraws `≥ 200 READ_ONLY_PROVEN` as a
  pass/fail gate; requires `ORG_ENFORCED_READ_ONLY` before P2 rather than P4.

Load-bearing measured findings (live census at
`source-eligibility-census:sha256:2f97b732e0472df347f695a1`): all 128 discovered
operations come from `mobingilabs/ripple-api` alone via `Routing.yaml`;
`MAX_DISCOVERED_OPERATIONS = 128` silently drops 95 of that file's 223 route
keys; `alphauslabs/blueapi` is approved but unreadable because `.proto` is not
a scanned extension, hiding 599 HTTP-annotated RPCs; and `PROVEN_READ_ONLY`
resolves to membership in an 11-row hand-written catalog, which is why only
5 of 128 operations and 3 surfaces qualify — `128` is the pre-C-01 128-operation projection cap (`MAX_DISCOVERED_OPERATIONS = 128`), not the real population of `223` under C-01; see D-105 —.

Every campaign in the master plan remains `NOT_AUTHORIZED` until it receives
its own explicit one-shot owner authorization. Production remains unrunnable:
`SUPPORTED_ENVIRONMENTS` is unchanged and `config/environments/production.json`
remains structurally unloadable (D-4).

This plan is orthogonal to `docs/KIRO-CREW-INTEGRATION-MASTER-PLAN.md`, which
covers optional external agent orchestration. This one covers product
observability and system mapping; the two share no scope and neither depends
on the other.
