# Nightwatch Phase 9B — Contained DEV Semantic Acceptance

## Task purpose

Execute the owner-authorized Phase 9B contained DEV semantic acceptance:
`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` (Phase
`9B-CONTAINED-DEV-SEMANTIC-ACCEPTANCE`).

Prove the final Phase 9B bridge exactly once, against canonical DEV only:

```
REAL CURRENT SOURCE CONTRACT
  -> MECHANICALLY ADMITTED EXPECTATION (ripple.common-exchange.read)
  -> EXACT APPROVED KNOWN_READ JOURNEY (ripple-common-exchange-read)
  -> CANONICAL CONTAINED DEV (https://appdev.alphaus.cloud/ripple/)
  -> EPHEMERAL RAW RESPONSE
  -> SAFE SEMANTIC PROJECTION
  -> EXPLICIT EVALUATION RECEIPT
  -> PASS | REPRODUCIBLE ANOMALY | FAIL-CLOSED NON-PASS STATE
```

Deliverables: strict-v2 task records; read-only remote source-freshness gate
(ripple-api/ripple-ui remote branch heads; no sibling mutation); source-
freshness branch F1/F2 (existing snapshot or disposable /tmp checkout +
re-derivation; drift -> exact BLOCK tokens); smallest typed
`NightwatchContextOptions.semanticOracle?` wiring into
`createNetworkObserver`; dedicated opt-in launcher
`bin/phase9b-real.mjs` + `playwright.phase9b.config.ts` +
`tests/manual/phase9b-contained-dev-semantic.ts` (fixed
ripple-common-exchange-read journey, first + ONE fresh-context replay, no
journey selector); one-shot gate `NIGHTWATCH_PHASE_9B_REAL=1`; pre-dev
metadata-only readiness gate (21-item local harness matrix + A-F source
freshness unit matrix, fixture-backed, CI-safe); substantive implementation
checkpoint pushed fast-forward with exact green CI BEFORE any product
contact; ONE canonical-DEV journey pair; safe semantic evaluation receipts
(expectationId/targetId/outcome/source repo+SHA+path/evidence digest/
projection digests/invariant counts/finding count/journey+step); decisive
evaluation rule (invariantPassCount > 0 or ANOMALY; NOT_APPLICABLE-only,
NO_EXPECTATION, zero receipts are NOT proven); deterministic replay semantic
summary; post-run structural privacy audit; docs/continuity closure with
terminal tokens (COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED PASS |
PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH | BLOCKED NOT_PROVEN + exact
blocker); final exact CI; 85-item final report; STOP.

One acceptance execution = first observation + one fresh-context replay.
No second journey, no fallback, no third attempt, no campaign:real, no
exploratory clicking, no arbitrary navigation, no new endpoint authority.

## Authorization

- Authorization class: `PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`
- Phase: `9B-CONTAINED-DEV-SEMANTIC-ACCEPTANCE`
- Protocol: `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`
- Permitted: minimum Nightwatch source wiring; local/synthetic tests for that
  wiring; one source-bearing Nightwatch implementation checkpoint; exact
  green CI before any product contact; ONE bounded canonical-DEV semantic
  acceptance execution (ONE approved journey x FIRST observation + ONE
  fresh-context replay); read-only source freshness checks; safe semantic
  evaluation receipts; private/local sanitized acceptance evidence;
  Nightwatch docs/continuity closure; normal Nightwatch development
  commits/pushes.
- Forbidden: a second journey; automatic fallback; a third attempt;
  exploratory clicking; arbitrary navigation; new endpoint authority; NEXT;
  production; product mutation; POST/PUT/PATCH/DELETE; DynamoDB/BigQuery/
  Spanner; GCP/GKE/Kubernetes; AWS runtime/IAM archaeology; deployment
  binding; Phase 6 resurrection; screenshots; authenticated Playwright
  traces; DOM snapshots; arbitrary DOM/text extraction; raw request/response
  persistence; raw customer-value persistence; external/local AI models; AI
  oracle authority; Alphaus repository writes; selfDev; sandbox adoption;
  canonical promotion; approval creation; APPLY; catalog mutation;
  variant-B adoption; publication.

## Established starting state

- Task ID: `phase-9b-contained-dev-semantic-acceptance`
- Starting SHA (expected at authorization time):
  `62ec80426035e979b563135d858bdc1438d84fb4`
  (HEAD == origin/main == expected SHA; worktree clean — CASE D).
- Validated Phase 9A.1 implementation:
  `cfc2aaa65227b2caf26d2d51533bf32ecc489028` (LAST_VALIDATED_IMPLEMENTATION_SHA
  baseline).
- Phase 8 COMPLETE; Phase 9 `COMPLETE_LOCAL_SYNTHETIC`; Phase 9A.1 COMPLETE
  (D-54/D-55); Phase 9B `DESIGNED_NOT_STARTED_NOT_AUTHORIZED` before this
  authorization; `PHASE_9B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`.
- Catalog: count 1, digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`;
  variant B `AVAILABLE_NOT_ADOPTED`; `NEXT_PROMOTION_AUTHORITY: NONE`.
- Recipes: 4 (real-source); DEV-reachable: 3
  (`ripple.payer-exchange.read`, `ripple.common-exchange.read`,
  `ripple.account-inventory.read`).
- Local sibling checkouts: `mobingilabs/ripple-api @
  27bb007ad0c798800b6bd3b29760c966422966e7` (admitted source SHA) and
  `mobingilabs/ripple-ui @ d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
  (reviewed journey source SHA); both carry pre-existing dirt (recorded,
  never touched).
- Canonical DEV target: `https://appdev.alphaus.cloud/ripple/`; external
  auth state `$HOME/.nightwatch/auth/ripple-dev-state.json`.

## Scope

- New source: `src/core/phase9b/**` (pure pre-dev readiness gate evaluator +
  source-freshness classifier + normalized safe semantic pass summary +
  replay-summary comparison; no network/fs/persistence in the core), the
  Phase 9B runner `tests/manual/phase9b-contained-dev-semantic.ts`, launcher
  `bin/phase9b-real.mjs`, `playwright.phase9b.config.ts`.
- Changed source: `src/browser/context.ts` (optional
  `NightwatchContextOptions.semanticOracle?` passed to
  `createNetworkObserver({ semanticOracle })` — no global default, no
  env-created authority), `package.json` (`phase9b:real` script).
- Tests: `tests/unit/phase9bHarness.test.ts` (21-item local matrix),
  `tests/unit/phase9bFreshness.test.ts` (A-F source-freshness matrix),
  launcher-args unit tests; fixture-backed only in CI.
- Hardening + CI: `bin/hardening-check.mjs` Phase 9B purity guards;
  `.github/workflows/hardening.yml` "Phase 9B contained DEV semantic
  acceptance harness matrix" step (LOCAL/SYNTHETIC ONLY; CI never contacts
  DEV; truthful comment).
- Docs: DECISIONS D-56 (expected); ROADMAP/CURRENT_STATE/ARCHITECTURE/
  SAFETY_MODEL/PHASE_9_ROADMAP Phase 9B records at closure; .agent/**
  terminal closure.

## Non-Goals

- No second journey; no automatic fallback journey; no third attempt; no
  campaign:real; no exploratory clicking or arbitrary navigation; no new
  endpoint authority; no NEXT/production contact; no product mutation; no
  POST/PUT/PATCH/DELETE; no DB/infra queries (Phase 6 freeze); no deployment
  binding discovery; no screenshots/authenticated traces/DOM snapshots; no
  raw request/response or raw customer-value persistence; no AI/model calls;
  no AI oracle authority; no Alphaus repository writes; no selfDev/catalog/
  promotion activity; no variant-B adoption; no publication; no source-to-
  deployment identity proof (explicit evidence boundary); no semantic core
  changes unless a direct defect is proven; no raw values in any report.

## Safety Constraints

- Fail-closed, read-only toward Alphaus. Sibling repositories: read-only
  remote queries (`gh api` / `git ls-remote`) and read-only local HEAD reads
  only; NO fetch/checkout/reset/pull/merge/rebase/clean inside canonical
  sibling checkouts; disposable source mirror allowed ONLY under /tmp.
- Full containment stack unchanged (L0 CDP Fetch guard, L1 route policy,
  L2 WebSocket policy, L3 SW/SharedWorker, L4 unrouted detection, L5
  mandatory loopback proxy; QUIC off; non-proxied WebRTC off; traces off;
  screenshots off; raw body persistence off). No Phase 9B shortcut context.
- Raw response text is transient, in-memory only; it never enters receipts,
  findings, dossiers, evidence files, terminal output, CI, or Git.
- The semantic oracle is explicitly provided by the Phase 9B runner only;
  no global default, no env-created semantic authority, no automatic
  expectation registry; the runner exposes ONLY
  `ripple.common-exchange.read` to this acceptance run.
- Auth file: structural/boolean validation only (exists, safe location,
  regular file, size bound, shape valid, token structurally present, page
  readability); never printed, copied, or summarized by secret fields.
- Pre-dev hard gates: source freshness; exact implementation CI green;
  resolver RESOLVED; auth valid; proxy healthy; canonical target exact.
- Hard failure outcomes (NO_EXPECTATION, SOURCE_STALE, SOURCE_UNAVAILABLE,
  INVALID_INPUT, PROJECTION_LIMIT_EXCEEDED, INTERNAL_ERROR on the selected
  target) mean `PHASE_9B_DEV_ACCEPTANCE_NOT_PROVEN`; never relabeled PASS.
- Any nonzero hard safety counter stops the run.
- Phase 9B core modules (freshness classifier, preflight evaluator, summary,
  launcher args) perform no network/fs/persistence/eval/child-process
  authority (hardening-guarded).

## Success criteria

One of the terminal tokens with truthful evidence:

- `PHASE_9B: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED`,
  `PHASE_9B_DEV_RESULT: PASS` — first + replay decisive PASS, deterministic
  replay summary, safety vector zero, privacy audit PASS.
- `PHASE_9B: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED`,
  `PHASE_9B_DEV_RESULT: PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH` — first +
  replay same safe anomaly category/fingerprint; mismatch kept
  UNDER_INVESTIGATION; private dossier stays local.
- `PHASE_9B: BLOCKED`, `PHASE_9B_DEV_RESULT: NOT_PROVEN` with an exact
  blocker token (e.g. `PHASE_9B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED`,
  `PHASE_9B_BLOCKED_REAL_SOURCE_CONTRACT_DRIFT`,
  `PHASE_9B_BLOCKED_JOURNEY_SOURCE_DRIFT`,
  `PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED`,
  `PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED`,
  `PHASE_9B_BLOCKED_NO_EVALUATION_RECEIPT`,
  `PHASE_9B_BLOCKED_SEMANTIC_INTERNAL_ERROR`,
  `PHASE_9B_BLOCKED_SEMANTIC_NONDETERMINISM`,
  `PHASE_9B_BLOCKED_PRIVACY`, `PHASE_9B_BLOCKED_CONTAINMENT`,
  `PHASE_9B_BLOCKED_IMPLEMENTATION_CI`).

Always: exactly one real acceptance pair or none; zero mutation; zero
production; zero DB/infra; zero raw customer-value persistence; zero silent
semantic failure; truthful report with the full external safety vector;
NEXT ACTION STOP.

## Stop conditions

Any pre-dev gate failure -> STOP with the exact blocker before any DEV
contact. Any safety/privacy violation -> STOP immediately. Source advanced
between freshness check and launch -> STOP. Auth invalid between first and
replay -> STOP (`PHASE_9B_BLOCKED_AUTH_EXPIRED`). Semantic nondeterminism
(first PASS / replay ANOMALY or materially different fingerprints) -> STOP
(`PHASE_9B_BLOCKED_SEMANTIC_NONDETERMINISM`). After the one launcher run:
STOP; a retry requires a fresh owner authorization.
