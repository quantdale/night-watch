# Nightwatch Architecture

Status: Phase 0/1. This document describes the architecture as built so far
(the scaffold, safety contracts, and configuration surface) and the planned
contracts of modules currently being implemented in parallel. Planned modules
are marked *in flight*; nothing below claims they are finished. The safety
model is normative and load-bearing — read `docs/SAFETY_MODEL.md` alongside
this document.

Design input: `NIGHTWATCH_RECON_B.md` (the full-stack oracle map,
`investigations/nightwatch_recon_b/`). Facts cited from it use its IDs
(E1–E10, L0–L5, §1–§14).

---

## 1. Purpose and goals

Nightwatch is a private, local, autonomous bug-hunting framework for Alphaus
products. It observes real browser journeys against Ripple (Phase 1) and,
in later phases, other products, then answers: **"is this sequence correct?"**
— where correctness is defined as deterministic, machine-checkable assertions
over the (request → response → persisted state) triple (RECON_B §1).

Phase 0/1 goals:

1. **Fail closed by default.** No production request can pass the outbound
   policy; unknown targets are denied; unselected environments are denied.
2. **Strictly read-only.** Phase 1 journeys perform no mutations; Nightwatch
   never writes to any Alphaus repository.
3. **Evidence-backed.** Every run produces a self-contained, redacted,
   deterministic artifact bundle under `artifacts/<run-id>/`.
4. **Self-tested.** Nightwatch's own unit and smoke tests prove the safety
   guarantees (see `docs/SAFETY_MODEL.md` §9).

The platform reality that motivates the architecture (RECON_B §4, E1–E10):
application-level environment selection (SDK defaults, CLI flags, UI cookies,
hardcoded URLs) is *not* a boundary — most Alphaus clients default to
production. The only invariant point is the request itself as it leaves the
browser. Hence the architecture is built around request-level policy.

---

## 2. Module map

| Module | Responsibility | Status |
|---|---|---|
| `src/core/environment/` | Fail-closed environment selection (`assertSupportedEnvironment`, `selectEnvironment`, `loadEnvironmentConfig`, shape validation). `production` is never selectable. | implemented |
| `src/core/safety/types.ts` | Shared safety contracts: `HostClass`, `Verdict`, `OutboundDecision`. | implemented |
| `src/core/safety/redaction.ts` | `RedactionLayer`: sensitive-header list, sensitive query params, secret-shape patterns (Bearer/JWT/AWS key/PEM/JSON secret fields), runtime secret registry. No I/O. | implemented |
| `src/core/safety/hosts.ts` | Explicit host classification tables: `KNOWN_PRODUCTION_HOSTS`, `DEV_HOSTS`, `NEXT_HOSTS`, `CLOUD_RUN_SUFFIX` (`.run.app`), `ALPHAUS_DOMAINS` (`alphaus.cloud`, `mobingi.com`). | *in flight* |
| `src/core/safety/outboundPolicy.ts` | `OutboundPolicy.decide(rawUrl): OutboundDecision`. Rule order: non-http → internal allow; env allowlist → allow; static asset list → allow; telemetry list → block-telemetry; known production → deny; `*.run.app` → deny; unknown `*.alphaus.cloud` → deny; `*.mobingi.com` → deny; localhost when not allowlisted → deny; else external deny. Pure logic, no I/O. | *in flight* |
| `src/core/safety/canary.ts` | Startup policy canary (`runCanary`, `defaultCanaryChecks`, `assertCanary`): asserts the policy/redaction/action tables behave as specified. Pure policy logic, zero network I/O. | *in flight* |
| `src/core/safety/actions.ts` | Passive action policy: `assertPassiveAction`, `classifyRippleAction`, `RIPPLE_MUTATION_PATTERNS`. Gates every journey step. | *in flight* |
| `src/core/evidence/types.ts` | Event contracts: `RunEvent`, `RunEventType`, `RunSummary`, `RepoSnapshotRecord`. | implemented |
| `src/core/evidence/runRecorder.ts` | `RunRecorder`: writes `artifacts/<run-id>/{manifest.json, events.jsonl, network.jsonl, console.jsonl, repositories.json, summary.json, screenshots/}`; shared `RedactionLayer`; injected clock for determinism; monotonic event sequencing. | *in flight* |
| `src/core/repositories/snapshotter.ts` | Read-only git snapshot collector: branch, HEAD SHA, upstream, ahead/behind, dirty state, last commit, timestamp. Never mutates a repo. | *in flight* |
| `src/browser/context/` | Playwright browser-context factory: system Chrome via `channel`, storage-state by path, tracing decision (disabled when authenticated state is in use), installs the request-inspection route. | *in flight* |
| `src/browser/observers/` | Console, page-error, and request-failed observers emitting redacted `RunEvent`s. | *in flight* |
| `src/browser/network/` | Request inspection: every request → `OutboundPolicy.decide` → verdict handling (allow / deny+abort+hard-failure / block-telemetry+abort), redacted request/response recording. | *in flight* |
| `src/browser/fixtures/` | Built-in fixture app for the default `local` scenario (`http://127.0.0.1:7311`): serves the candidate passive routes with deterministic responses; zero external network. | *in flight* |
| `src/oracles/protocol/passiveChecks.ts` | Generic passive protocol oracles: uncaught page errors, console errors, unexpected failed requests, unexpected production/unknown-host requests, malformed JSON, malformed NDJSON, navigation failure, stability timeout. | *in flight* |
| `src/products/ripple/config.ts` | Ripple product config: candidate passive routes (dashboard, invoice list/detail, billing-group list/detail). | implemented |
| `scenarios/ripple/` | Runnable Phase 1 scenarios; `local.smoke.ts` targets the fixture app by default. | *in flight* |
| `config/environments/` | Per-environment allowlists and labels with provenance: `local.json`, `dev.json`, `next.json`; `production.json` documents the rejected surface only. | implemented |
| `bin/nightwatch.mjs` | Fail-closed CLI: `--env` required (missing/unsupported → exit 2), forwards to the Playwright runner. | implemented |
| `tests/` | Nightwatch's own unit tests (`tests/unit`) and smoke tests (`tests/smoke`). | *in flight* |
| `artifacts/` | Run evidence output. Gitignored; evidence is never committed. | scaffold |

---

## 3. Run lifecycle

A Nightwatch run proceeds through the following stages:

1. **Environment selection** (`src/core/environment`). `bin/nightwatch.mjs`
   requires `--env=local|dev|next`; missing or unsupported → exit 2. The
   config file must exist, match its `name`, and pass shape validation;
   any failure → `EnvironmentSelectionError` (deny). `production` is not
   selectable (D-4).
2. **Startup canary** (`src/core/safety/canary.ts`). Before any browser is
   launched, the policy, redaction, and action tables are asserted against
   their expected behavior (production hosts deny, unknown Alphaus hosts
   deny, allowlist hosts allow, telemetry blocks, secrets redact, mutations
   reject). Zero network I/O: the canary is pure in-memory logic.
3. **Repository snapshot** (`src/core/repositories/snapshotter.ts`). Every
   tracked repo under `NIGHTWATCH_REPOS_ROOT` (default: the parent of the
   nightwatch directory, i.e. `REPOSITORIES/`) is snapshotted read-only:
   branch, HEAD SHA, upstream, ahead/behind, dirty count, last commit,
   timestamp. Written to `repositories.json`. The snapshot is evidence of
   *state*, not proof of *freshness* (RECON_B §3: local checkouts drift —
   e.g. `ouchan` was 19 commits behind origin/master; re-verify before
   trusting code-derived assumptions, per D-8/D-12).
4. **Browser context with request inspection** (`src/browser/context`,
   `src/browser/network`). A Chromium context (system Chrome via `channel:
   'chrome'`) is created; `context.route('**/*')` is installed *before* any
   page loads so that **every** request passes through the policy. Optional
   `NIGHTWATCH_STORAGE_STATE` (path only) loads authenticated state; when it
   is present, tracing is disabled and the run is marked authenticated.
   Otherwise the run is clearly marked UNAUTHENTICATED.
5. **Journey actions (all passive)** (`scenarios/*`, `src/core/safety/actions.ts`).
   The scenario walks the product's candidate routes. Every step passes
   `assertPassiveAction`; anything that cannot be proven passive is skipped
   and recorded, never executed (D-11). Observers (`console`, `pageerror`,
   `requestfailed`) run for the whole journey; the harness waits for
   stability before each assertion point (network quiet + no pending
   requests; persistent instability → `stability-timeout` oracle).
6. **Evidence finalize** (`src/core/evidence/runRecorder.ts`). The recorder
   closes the run: final `events.jsonl`/`network.jsonl`/`console.jsonl`
   flush, `summary.json` (counts, severity counts, hard failures,
   screenshots, `nightwatchSha`), `manifest.json` (artifact index and run
   identity), optional `trace.zip` and failure screenshots. A hard failure
   (denied outbound request) always fails the run and is recorded.

---

## 4. Request inspection pipeline

The pipeline is the safety architecture's core. It has exactly one input —
a request about to leave the browser — and one source of authority — the
selected environment's config plus the static classification tables.

```
browser request (navigation / fetch / XHR / asset)
        │
        ▼
context.route('**/*')  ──►  normalize host (lowercase, strip port)
        │
        ▼
OutboundPolicy.decide(rawUrl)          [rule order, see §2 / SAFETY_MODEL §3]
        │
        ├── internal (non-http scheme: data:, blob:, javascript:) ──► ALLOW
        ├── env allowlist match            ──► ALLOW
        ├── static asset list match        ──► ALLOW
        ├── telemetry list match           ──► BLOCK-TELEMETRY  (abort; recorded; not fatal)
        ├── known production               ──► DENY  (abort + hard-failure; always fatal)
        ├── *.run.app                      ──► DENY  (abort + hard-failure)
        ├── unknown *.alphaus.cloud        ──► DENY  (abort + hard-failure)
        ├── *.mobingi.com                  ──► DENY  (abort + hard-failure)
        ├── localhost (not allowlisted)    ──► DENY  (abort + hard-failure)
        └── anything else                  ──► DENY  (abort + hard-failure)
```

Verdict handling in `src/browser/network`:

- **allow** — the request proceeds (`route.continue()`). The request is
  recorded (method, redacted URL, redacted headers, resource type); on
  response, status, content type, and a redacted, size-capped body for
  JSON-ish content types are recorded.
- **deny** — the request is aborted (`route.abort()`) before it leaves the
  browser. A `hard-failure` event is raised; `hard-failure` is always in
  `failOn` and cannot be disabled. The run fails.
- **block-telemetry** — the request is aborted; a `telemetry` event is
  recorded. It is deliberately **not** fatal (real UIs emit telemetry; a
  dev/next journey must still be usable — D-5).

Everything that is persisted passes through the shared `RedactionLayer`
before the recorder writes it (D-6). The `blockedByPolicy`/`verdict`/`reason`
fields on request events document the policy's decision; `reason` strings are
constructed to be safe to persist (no secrets).

---

## 5. Determinism and injected clock

Evidence must be reproducible, because diffing evidence across runs is how
regressions are detected:

- The `RunRecorder` receives an **injected clock** (a `now()` function); run
  timestamps are derived from it, never from wall-clock reads inside the
  recorder.
- `NIGHTWATCH_RUN_ID` overrides the run id (tests use it to make runs
  addressable and comparable).
- `RunEvent.seq` is a monotonic sequence assigned by the recorder, so event
  order is well-defined even when JSONL lines carry identical timestamps.
- `summary.json` aggregates counts by event type and severity, hard
  failures, and the screenshots taken — a compact fingerprint of the run.

The snapshotter's `timestamp` and the run's `startedAt`/`endedAt` are the
only wall-clock-dependent fields; the injected clock covers run-internal
events (D-7).

---

## 6. External toolchain

| Component | Choice | Notes |
|---|---|---|
| Runtime | Node ≥ 20 (developed on Node 22) | `engines: ">=20"` in `package.json` |
| Test runner | Playwright Test (`@playwright/test` 1.62.1) | Single runner for unit, smoke, and scenario suites (D-1); TS transpile built-in |
| Language | TypeScript 5.7, strict, `noUncheckedIndexedAccess` | `tsc --noEmit` via `npm run typecheck` |
| Browser | System Google Chrome via `channel: 'chrome'` | No bundled download by default (D-14); fallback: `npx playwright install chromium` + remove the `channel` line |
| Config | JSON per environment under `config/environments/` | Shape-validated at load; `resolveJsonModule` |
| Runner | `bin/nightwatch.mjs` (Node ESM) | Wraps the Playwright CLI with fail-closed env handling |

No runtime dependencies beyond Playwright; all packages are devDependencies
(`@playwright/test`, `typescript`, `@types/node`).

---

## 7. Boundaries

- Nightwatch may **read** repos under `REPOSITORIES/alphauslabs` and
  `REPOSITORIES/mobingilabs` (for snapshots, provenance, and later change
  intelligence) but never edits, commits to, or installs into them.
- All implementation changes live under `REPOSITORIES/nightwatch/`.
- Evidence never leaves the machine by default; artifacts are gitignored
  (`artifacts/*`, `.env`, `test-results/`, `dist/`).
- Credentials are never stored in the repository. Authenticated state is
  referenced by file path (`NIGHTWATCH_STORAGE_STATE`) or not at all
  (D-13); the default is a clearly-marked UNAUTHENTICATED run.
- The snapshotter runs read-only git commands only (`status --porcelain`,
  `rev-parse`, `log`, `for-each-ref`); it never fetches, checks out, or
  writes config (D-8).

---

## 8. Deliberately NOT in Phase 1

The mission's DO-NOT-IMPLEMENT list for Phase 1 — kept explicit so later
phases claim each item deliberately (see `docs/ROADMAP.md`):

- **`production` as a supported environment.** Never. `production.json`
  exists only to document the rejected surface (D-4).
- **Any mutation.** create/edit/save/delete, finalize/calculate/recalculate,
  token generate/revoke, commitment purchase/apply, registration, settings
  mutation, and anything not provably passive — skipped, never executed
  (SAFETY_MODEL §5).
- **Authenticated traffic with traces on.** Tracing is disabled whenever
  storage state is in use.
- **API/oops integration** — Go subprocesses, `bluectl` raw-input replay,
  the L0–L5 confirmation ladder. Phase 5.
- **Read-only data oracles** — store-vs-store equality checks, narrow
  PK/SK queries. Phase 6.
- **Generative/model exploration** — contract-driven request generation.
  Phase 4.
- **Change intelligence** — freshness-driven re-verification and
  change-directed scenario generation. Phase 3.
- **AI assistance and autonomous self-development.** Phases 7–8.
- **Anything resembling production writes**, prod experiments, or large
  datastore scans (the do-not-scan tables from
  `DOCUMENTATIONS/docs/DB_SCHEMA_REFERENCE.md` are out of reach until the
  narrow-query oracles of Phase 6).
