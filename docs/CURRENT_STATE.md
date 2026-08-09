# Nightwatch — CURRENT STATE

> Durable memory for the next agent/session. Last updated: **2026-08-09** by the
> Phase 0/1 implementation agent, after the final acceptance run.
> Nightwatch HEAD at last update: `79bc9f2` (root commit `4888d2e`).

---

## What exists now

Phase 0/1 complete. Nightwatch lives in `REPOSITORIES/nightwatch/` as its own
git repository (initialized 2026-08-09, no remote). It reads the Alphaus repos
under `REPOSITORIES/alphauslabs` and `REPOSITORIES/mobingilabs` strictly
read-only and never touches them otherwise.

### Layout (48 files committed)

```
nightwatch/
  package.json  tsconfig.json  playwright.config.ts  .env.example  README.md
  bin/nightwatch.mjs              # CLI: --env=local|dev|next (fail-closed), --ui-url, --scenario
  config/environments/           # local.json, dev.json, next.json, production.json (reference only)
  src/core/environment/          # fail-closed env selection + config loading/validation
  src/core/safety/               # types, hosts, outboundPolicy, canary, actions, redaction
  src/core/evidence/             # types, runRecorder (artifacts/<run-id>)
  src/core/repositories/         # snapshotter (read-only git collector)
  src/browser/                   # context (harness), observers (network/console/page/stability), fixtures (storageState, fixtureServer)
  src/oracles/protocol/          # passiveChecks (status/json/ndjson)
  src/products/ripple/           # config (candidate routes), actions (mutation table), journeys
  src/state/run.ts               # RunMonitor (hard failures + issues + failOn)
  scenarios/ripple/local.smoke.ts  # Phase 1 runnable scenario
  tests/unit/                    # 37 unit tests (safety 12, redaction 6, evidence 11, snapshotter 8)
  tests/smoke/                   # 2 smoke tests (passive evidence contract, negative policy/oracle)
  docs/                          # ARCHITECTURE, SAFETY_MODEL, CURRENT_STATE, ROADMAP, DECISIONS
  artifacts/                     # run evidence (gitignored; .gitkeep only)
```

## What works (verified, with commands)

| Capability | Evidence |
|---|---|
| Typecheck | `npx tsc --noEmit` → 0 errors (strict + noUncheckedIndexedAccess) |
| Nightwatch self-tests | `npx playwright test` → **40 passed** (37 unit + 2 smoke + 1 scenario, ~9s, system Chrome via `channel: 'chrome'`) |
| CLI fail-closed | `node bin/nightwatch.mjs` (no env) → exit 2; `--env=prod` → exit 2; `--env=local` runs |
| Production hosts blocked | `tests/unit/safety.test.ts` — all 8 known prod hosts + `bluerpc.alphaus.cloud:8443` + `*.run.app` denied in every env |
| Unknown hosts fail closed | `random-host-xyz.alphaus.cloud` → deny 'unknown-alphaus'; `example.invalid` → deny 'external' |
| Dev/next allowlist | `apidev.alphaus.cloud` allowed only in dev env; `apinext.*` only in next; localhost only in local |
| Startup canary | scenario runs `runCanary`/`assertCanary` before any navigation (pure policy logic, zero network I/O) — e.g. 25 checks passed in the acceptance run |
| Request inspection | `context.route('**/*')` → policy verdict per request; deny = abort + hard failure; telemetry = abort + record (never fails); verified in `tests/smoke/negative.smoke.ts` |
| Redaction | `tests/unit/redaction.test.ts` + smoke assertions; every artifact dir shows `"authorization": "[REDACTED]"`; zero `FAKE_SECRET_TOKEN_12345` occurrences across all evidence files |
| Repo snapshot | acceptance run: **144 repos** (52 alphauslabs + 92 mobingilabs, nightwatch excluded), 0 errors, 21 dirty (pre-existing); fields: path/branch/headSha/upstream/aheadBehind/dirty/dirtyFileCount/lastCommit/timestamp/ok |
| Snapshot read-only | `tests/unit/snapshotter.test.ts` (repo state byte-identical before/after) + live check: 7 sample repos (`ouchan`, `ripple-ui`, `ripple-api`, `invoice-ui`, `blueapi`, `blue-sdk-ts`, `blue-sdk-go`) byte-identical before/after an acceptance run |
| Evidence artifacts | `artifacts/<run-id>/`: manifest.json, repositories.json, events.jsonl, network.jsonl, console.jsonl, summary.json, trace.zip, screenshots/dashboard.png |
| Reproducibility | `tests/unit/evidence.test.ts` — same run id + injected clock → byte-identical artifacts |
| Passive journey | `scenarios/ripple/local.smoke.ts` — navigates dashboard + invoice list against the built-in offline fixture (or `--ui-url`), all actions classified passive via `assertPassiveAction` |

## Acceptance run (final, deterministic id)

`NIGHTWATCH_RUN_ID=acceptance-20260809 npm run scenario -- --env=local`
→ artifacts dir: `artifacts/acceptance-20260809/`
- summary.json: passed=true, 43 events (14 request / 14 response / 2 telemetry /
  2 console / 2 navigation / 1 screenshot / others), 0 hard failures
- manifest.json: runId, timestamp, environment=local, product=ripple,
  browser=chromium, scenario=ripple-local-passive, nightwatchSha=4888d2e…
- repositories.json: 144 repos, 0 errors (e.g. `mobingilabs/ouchan` master
  `565f00a8` upstream origin/master behind 19, dirty 71 — matches RECON_B §3
  freshness, minus its 'ahead' rows which moved to behind)

## What is incomplete / known gaps

1. **RECON_A, RECON_C, RECON_D are not in the workspace** — only
   `investigations/nightwatch_recon_b/NIGHTWATCH_RECON_B.md`. Design inputs
   beyond B came from the mission brief. Locate A/C/D before Phase 2.
2. **dev/next real-env runs not executed** — no allowlisted dev/next UI URL
   was available; only policy logic and canary cover those envs. First real
   run must set `--env=dev` + `--ui-url` of an allowlisted origin (or extend
   `config/environments/dev.json`/`next.json` allowlists with review).
3. **Authenticated runs untested** — `NIGHTWATCH_STORAGE_STATE` path plumbing
   exists (fail-closed: throws when the file is missing) but no real storage
   state file was exercised; traces auto-disable in that mode.
4. **Ripple route paths are placeholders** — candidate route paths (`/`,
   `/invoices`, `/billing-groups`) are fixture-relative; exact ripple-ui route
   paths must be re-verified against `mobingilabs/ripple-ui` in Phase 2.
5. **NDJSON oracle is baseline** — per-line JSON parse + envelope
   `{"result": ...}` awareness only; limiter/batch-count assertions (RECON_B
   H8) and trailer semantics are Phase 2+.
6. **`git status` stat-cache nuance** — snapshotter runs read-only git
   commands; `git status` may refresh `.git/index` stat metadata (benign,
   documented in `src/core/repositories/snapshotter.ts` + DECISIONS.md).
7. **Two extra event captures**: console.log from the fixture page (so
   console.jsonl is always produced) and a `request` event for denied URLs
   (so the negative test can assert the deny verdict) — both intentional,
   see DECISIONS.md.

## Last successful checks (2026-08-09)

- `npx tsc --noEmit` — PASS
- `npx playwright test` — 40 passed (8.7s)
- `NIGHTWATCH_RUN_ID=acceptance-20260809 npm run scenario -- --env=local` — 1 passed; artifacts verified
- Sample Alphaus repos byte-identical before/after the run — PASS
- CLI: no-env exit 2, `--env=prod` exit 2 — PASS

## Environment (machine facts)

- Node v22.22.1, npm 10.9.4, Playwright Test 1.62.1, TypeScript 5.x (devDeps
  pinned in package.json), git 2.43.0
- System Google Chrome at `/opt/google/chrome/chrome` — driven via
  `channel: 'chrome'` (no bundled browser download). Fallback if absent:
  `npx playwright install chromium` + remove `channel` from
  `playwright.config.ts`.
