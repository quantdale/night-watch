# Nightwatch Phase 9B — Contained DEV Semantic Acceptance

## Purpose

After this task, Nightwatch can prove one final bridge: a real-source-derived
and mechanically admitted semantic expectation evaluated against one exact
approved KNOWN_READ journey on canonical contained DEV, producing safe
semantic evaluation receipts for a FIRST observation and ONE fresh-context
replay, with zero mutation/privacy violation and truthful terminal closure —
or an exact fail-closed BLOCKED state. The observable capability is the
`npm run phase9b:real` gated launcher plus the pre-dev readiness gate.

## Starting State

- Task ID: `phase-9b-contained-dev-semantic-acceptance`; Starting SHA
  `62ec80426035e979b563135d858bdc1438d84fb4` (CASE D); validated Phase 9A.1
  implementation `cfc2aaa65227b2caf26d2d51533bf32ecc489028`.
- Phase 9A.1 delivered: recipes v1 registry (`REAL_SOURCE_EXPECTATION_RECIPES`,
  4 recipes, 3 DEV-reachable), admission bridge (`deriveRealSourceExpectations`),
  atomic resolver (`createRealSourceResolver` -> expectation + snapshot,
  RESOLVED/SOURCE_STALE/SOURCE_UNAVAILABLE/NO_EXPECTATION), safe receipts v1
  (nine outcomes, `semanticEvaluations()` ledger in
  `createNetworkObserver`, `semanticOracle?` option already exists on the
  observer), sibling read-only access (`src/core/source/siblingSource.ts`),
  real-run gate (`runRealRunGate`), Phase 2B journey machinery
  (`RIPPLE_JOURNEY_DEFINITIONS`, `buildRippleJourneyEndpointRegistry`,
  `runDeclarativeJourney`, auth readability checks, replay comparison).
- Known gap to close: `createNightwatchContext()` does NOT expose a
  semantic-oracle option to real runners (no `semanticOracle` on
  `NightwatchContextOptions`); no Phase 9B launcher; no pre-dev readiness
  gate; no freshness gate.
- Canonical DEV target `https://appdev.alphaus.cloud/ripple/`; external auth
  `$HOME/.nightwatch/auth/ripple-dev-state.json` (structural gate only).
- Sibling local HEADs: ripple-api 27bb007a (admitted), ripple-ui d80b161b
  (reviewed) — both with pre-existing recorded dirt.

## Scope

- `src/browser/context.ts`: add optional `semanticOracle?` to
  `NightwatchContextOptions`; pass to `createNetworkObserver`.
- New `src/core/phase9b/`:
  - `freshness.ts` — pure source-freshness classification (F1 use existing
    snapshot / F2 disposable re-derivation / BLOCK tokens) driven by facts
    (remote SHA, reviewed SHA, relevant-file diffs, derivation result);
    orchestrated, network/fs parts injected by the runner.
  - `preflight.ts` — pure pre-dev readiness gate evaluator (metadata-only
    checks: nightwatch HEAD clean, exact implementation CI green, source
    freshness PASS, real expectation derived=1/current=1, DEV-reachable,
    KNOWN_READ, mutation step count 0, auth structural PASS, proxy healthy,
    canonical target exact, traces/screenshots false).
  - `summary.ts` — normalized safe per-pass semantic summary (counts per
    outcome, decisive evaluation count, resolved expectation count) + replay
    summary comparison (expectationId/targetId/source SHA/evidence digest/
    outcome/invariant counts/finding fingerprints; never raw values,
    never receiptId equality).
  - `launcherArgs.ts` — pure parser for `bin/phase9b-real.mjs` (only
    `--env=dev`, `--storage-state=`, `--help`; fixed journey; rejects
    unknown args, non-dev env, journey/URL selectors).
- New runner: `tests/manual/phase9b-contained-dev-semantic.ts` (fixed
  `ripple-common-exchange-read`; reuses runRealRunGate, createNightwatchContext,
  runDeclarativeJourney, endpoint registry, auth readability, replay
  comparison, proxy/safety accounting; wires the resolver restricted to
  `ripple.common-exchange.read`; first + ONE replay; semantic acceptance
  assertions per SPEC §24-§36).
- New launcher/config: `bin/phase9b-real.mjs` (gate child + run child;
  `NIGHTWATCH_PHASE_9B_REAL=1`), `playwright.phase9b.config.ts`, package
  script `phase9b:real`.
- Tests: `tests/unit/phase9bHarness.test.ts` (21-item matrix),
  `tests/unit/phase9bFreshness.test.ts` (A-F matrix), launcher-args tests,
  context wiring test (observer-level + option plumbing).
- Hardening + CI: `bin/hardening-check.mjs` Phase 9B core purity guards;
  `.github/workflows/hardening.yml` Phase 9B harness matrix step.
- Docs: task records, ACTIVE_TASK, docs closure (D-56) at the end.

## Non-Goals

No new journey; no fallback; no third pass; no campaign; no exploratory
clicking; no arbitrary navigation; no new endpoint authority; no NEXT/
production; no mutation; no DB/infra; no deployment binding; no screenshots/
traces/DOM; no raw persistence; no AI; no selfDev/promotion/catalog;
no variant-B adoption; no Alphaus writes; no publication; no semantic core
changes without a proven defect; no raw values in any output.

## Safety Constraints

- Alphaus siblings: read-only remote metadata (`gh api` / `git ls-remote`)
  + read-only local HEAD/file reads; never mutate; disposable mirror only in
  /tmp at the exact remote SHA, deleted after evidence capture.
- Full L0-L5 containment unchanged; no Phase 9B shortcut context.
- Raw bodies transient in-memory only; receipts/ledgers/reports carry safe
  metadata only; structural privacy audit post-run (schema/key level, no
  dumps).
- Pre-dev gates hard: freshness, exact CI green, RESOLVED, auth, proxy,
  exact target; any fail -> NO DEV CONTACT.
- Hard semantic outcomes on the selected target -> NOT_PROVEN, never PASS.
- Auth: boolean/structural validation only.
- Phase 9B core: no network/fs/persistence/eval/child-process authority.

## Architecture / Approach

1. Wire `NightwatchContextOptions.semanticOracle?` -> `createNetworkObserver`
   (one-line pass-through; type re-exported from networkObserver).
2. Pure `src/core/phase9b/` modules (freshness classifier, preflight
   evaluator, pass summary + comparison, launcher args parser) — fully unit-
   testable without browser/fs/network; runner injects facts (remote SHAs
   via `gh api`/`git ls-remote`, disposable-checkout diffs via git in /tmp,
   derivation via `deriveRealSourceExpectation`).
3. Freshness flow: remote SHA query -> F1 (remote == reviewed: use existing
   sibling snapshot; no DEV before resolver RESOLVED) | F2 (remote advanced:
   disposable checkout at remote SHA, exact-range diff for
   `ExchangeRate.php` + `Routing.yaml` (api) and journey callsite/route/page
   paths (ui); re-derivation required; contract drift or UI drift -> BLOCK
   with exact token) | remote unavailable -> BLOCK.
4. Preflight: build resolver restricted to `ripple.common-exchange.read`
   from a fresh derivation against the freshness-approved snapshot; assert
   evidence digest present, SHA == approved, targetId exact, RESOLVED;
   run the metadata-only gate; only then a browser context.
5. Runner: fixed journey pair via the existing Phase 2B machinery with the
   semantic oracle wired; collect `semanticEvaluations()` per pass; build
   normalized summaries; decisive rule (invariantPassCount > 0 or ANOMALY);
   replay determinism comparison; safety counters; structural privacy audit.
6. Terminal: PASS / PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH / BLOCKED with
   exact token; docs closure; final CI; STOP.

## Milestones

- M0 — Task records + ACTIVE_TASK (IN_PROGRESS). Acceptance: `agent:check`
  passes for the new task. Status: NOT_STARTED.
- M1 — Wiring + Phase 9B core modules + launcher + config + runner source.
  Acceptance: typecheck + hardening PASS. Status: NOT_STARTED.
- M2 — Unit matrices (21-item harness + A-F freshness + launcher args +
  wiring). Acceptance: focused matrix green. Status: NOT_STARTED.
- M3 — CI matrix step. Acceptance: workflow edit, no DEV references.
  Status: NOT_STARTED.
- M4 — Local validation: typecheck, hardening, Phase 9/9A.1/9B matrices,
  journey/observer/auth/proxy tests, campaign synthetic, owner-provenance,
  agent:check/audit, project:check, catalog integrity, git diff --check,
  full `npx playwright test --project=nightwatch --workers=1` clean, isolated
  full-history checkout. Status: NOT_STARTED.
- M5 — Substantive implementation checkpoint + push + exact green CI
  (incl. Phase 9B harness matrix). Status: NOT_STARTED.
- M6 — Pre-DEV final rechecks (freshness, auth, resolver RESOLVED) + ONE
  canonical-DEV journey pair (first + replay) via the gated launcher.
  Status: NOT_STARTED.
- M7 — Post-run privacy audit + safety vector + sibling integrity check.
  Status: NOT_STARTED.
- M8 — Docs/continuity closure (D-56) + final CI + 85-item report + STOP.
  Status: NOT_STARTED.

## Validation Strategy

- Unit: `tests/unit/phase9bHarness.test.ts`, `tests/unit/phase9bFreshness.test.ts`,
  launcher-args tests — fixture/local only, CI-safe (no GitHub dependency:
  synthetic remote/local SHA fixtures).
- Local: `npm run typecheck`, `npm run hardening:check`, focused Phase 9 +
  9A.1 + new 9B matrices, `npm run campaign:synthetic`,
  `npm run test:owner-provenance`, `npm run agent:check`, `npm run agent:audit`,
  `npm run project:check`, `node bin/selfdev-catalog-integrity.mjs`,
  `git diff --check`, full `npx playwright test --project=nightwatch
  --workers=1` (0 failures; only established environment-conditional skips),
  isolated full-history checkout at the substantive SHA.
- Exact CI: `gh run watch` the exact implementation SHA; require success
  including the new Phase 9B matrix step and all existing steps.
- Pre-DEV: metadata-only readiness gate; source-freshness recheck; auth
  structural recheck; resolver RESOLVED immediately before launch.
- Post-DEV: normalized first/replay summary comparison; safety counters;
  structural privacy audit; sibling `git status --short` unchanged.

## Decision Log

- (expected) D-56: Phase 9B result record — filled at closure with the real
  verdict tokens and evidence summary.

## Discoveries

- `createNetworkObserver` already accepts `semanticOracle?: SemanticResponseOracle`
  and evaluates only complete 2xx JSON bodies on matched endpoints; the only
  missing wiring is the context option pass-through.
- Receipts are deterministic (receiptId from canonical safe fields); replay
  comparison will still compare normalized fields, never raw values.

## Deferred Work

- Any reproducible product semantic mismatch -> separate read-only anomaly
  investigation task (no root-cause inside this task).
- Source-to-deployment identity proof (Phase 6 boundary; not this task).

## Completion Criteria

Terminal record under continuity v2 with one of the exact tokens, truthful
evidence in STATE/REPORT, docs closure committed, exact final CI green,
NEXT ACTION STOP, and the 85-item final report delivered. No second real run.
