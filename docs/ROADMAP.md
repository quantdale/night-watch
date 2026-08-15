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
  + hard failure before communication.
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
external destination can receive a connection. Phase 2 product testing is not
part of this phase.

**Key deliverables.**

- Fail-closed loopback proxy in `src/proxy/server.ts`: normal HTTP forward
  traffic, HTTPS/WSS CONNECT, and WebSocket HTTP Upgrade; denied/unknown and
  malformed destinations are rejected before DNS/TCP; no TLS MITM.
- `src/proxy/policyAdapter.ts` delegates to the canonical
  `OutboundPolicy.decide()`; browser HTTP/WS consumers use named adapters and
  the policy-consistency matrix fails on drift.
- Playwright global setup starts and health-checks the proxy; browser launch
  receives an explicit proxy and `--proxy-bypass-list=<-loopback>`; no
  environment-variable-only or continue-without-proxy path exists.
- Sanitized proxy events, per-run `proxy.jsonl`, manifest
  `networkContainment`, and `summary.json.proxy` aggregates; denied proxy
  traffic is a fatal run violation while telemetry is blocked-not-failed.
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

---

## Never in scope (any phase)

- `production` as a runnable environment (D-4).
- Writes to production data (E8 data-plane sharing makes env isolation
  impossible; only sandbox-MSP mutations, Phase 4+ whitelisted, are ever
  considered).
- Any mechanism that bypasses request-level inspection (D-2).
- Credentials in the repository or artifacts (D-13).
