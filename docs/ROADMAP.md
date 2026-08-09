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

## Phase 6 — Read-only data oracles

**Goal.** Add the strongest oracle class: store-vs-store equality checks
that can prove "actual wrong" at L3–L4 (RECON_B §1.2, §6.2–6.3).

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

---

## Phase 7 — Bounded AI assistance

**Goal.** Use a model as a *review assistant*, not a decision-maker:
triaging candidate bugs (L2+) into drafts and generating oracle-check
candidates from contract diffs — all human-reviewed.

**Key deliverables.**

- Candidate triage: cluster L2+ observations, draft bug descriptions with
  the RECON_B §12 bundle attached.
- Contract-diff → oracle-suggestion pipeline over Phase 3 change data.
- Review workflow: every AI-produced artifact is labeled AI-generated and
  requires human sign-off before any filing.

**Non-goals / exclusions.** Autonomous filing (L3+ gate stays); model-driven
mutation choices; unbounded exploration budgets.

**Dependencies.** Phase 5/6 pipelines (the evidence they produce is the
assistant's input).

---

## Phase 8 — Evaluated autonomous self-development (with guardrails)

**Goal.** Nightwatch extends itself: generating scenarios and tests for
its own suite, evaluated before adoption — while the read-only boundary
over Alphaus repos is absolute.

**Key deliverables.**

- Self-development loop confined to `REPOSITORIES/nightwatch/`: candidate
  scenarios/tests/oracles proposed by the system, run through the full
  self-test + canary gate, adopted only when green.
- Evaluation harness: safety guarantees (SAFETY_MODEL §14) re-run on every
  candidate; any candidate that weakens a guarantee is rejected.
- Budget and blast-radius limits: bounded generation budget per session;
  changes are additive; rollback via git.

**Non-goals / exclusions.** Editing any Alphaus repository; weakening or
bypassing the safety kernel; production; unmeasured autonomy.

**Dependencies.** Phase 7 assistance; a stable Phase 0/1 self-test suite as
the evaluation gate.

---

## Never in scope (any phase)

- `production` as a runnable environment (D-4).
- Writes to production data (E8 data-plane sharing makes env isolation
  impossible; only sandbox-MSP mutations, Phase 4+ whitelisted, are ever
  considered).
- Any mechanism that bypasses request-level inspection (D-2).
- Credentials in the repository or artifacts (D-13).
