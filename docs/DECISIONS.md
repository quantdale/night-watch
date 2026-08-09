# Nightwatch Architecture Decisions

Decision record for Nightwatch (Phase 0/1). Each entry states the decision,
its rationale (grounded in `NIGHTWATCH_RECON_B.md` facts, cited by ID),
the consequences, and the phases where it applies. Decisions are accepted
unless marked superseded; changing one requires a new entry, not an edit.

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
